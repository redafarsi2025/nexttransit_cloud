import crypto from 'crypto';
import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { RateLimiter } from './RateLimiter';
import { getSecurityPolicyForProvider } from './WebhookSecurityPolicy';
import { logger } from '../../lib/logger';
import { securityRejectsTotal, securityServiceUnavailableTotal } from '../../lib/metrics';

export interface SecurityContext {
  gatewayId: string;
  provider: string;
  tenantId: string | null;
}

export interface WebhookAuthResult {
  authenticated: boolean;
  reason?: string;
  context?: SecurityContext;
}

export class WebhookSecurityService {
  constructor(private rateLimiter: RateLimiter = new RateLimiter()) {}

  /**
   * Main entry point for webhook security (Size, Auth, Rate Limit).
   * Note: Replay and Payload Validation happen later in the pipeline once the schema is known.
   */
  async authenticateAndRateLimit(
    provider: string,
    req: any
  ): Promise<WebhookAuthResult> {
    const policy = getSecurityPolicyForProvider(provider);
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';

    // 1. IP-Level Rate Limiting
    const ipDecision = await this.rateLimiter.checkIpLimit(ip, policy);
    if (!ipDecision.allowed) {
      if (ipDecision.reason === 'SERVICE_UNAVAILABLE') {
        securityServiceUnavailableTotal.inc({ provider });
      } else {
        securityRejectsTotal.inc({ provider, reason: ipDecision.reason });
      }
      logger.warn({ event: 'security_rate_limit_blocked', ip, reason: ipDecision.reason, provider }, 'IP rate limit blocked webhook');
      return { authenticated: false, reason: ipDecision.reason };
    }

    // 2. Extract Credentials (NEVER log these values)
    const authHeader = req.headers['authorization'] || req.headers['x-flespi-secret'] || req.headers['x-traccar-secret'];
    if (!authHeader) {
      securityRejectsTotal.inc({ provider, reason: 'MISSING_CREDENTIALS' });
      logger.warn({ event: 'security_validation_failed', reason: 'MISSING_CREDENTIALS', provider }, 'Missing credentials for webhook');
      return { authenticated: false, reason: 'MISSING_CREDENTIALS' };
    }

    // Determine the raw secret
    let rawSecret = authHeader;
    if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      rawSecret = authHeader.substring(7);
    } else if (typeof authHeader === 'string' && authHeader.startsWith('Basic ')) {
      rawSecret = authHeader.substring(6);
    }

    // 3. Authenticate Gateway
    // We hash the incoming secret to compare with the stored credential_hash
    const incomingHash = crypto.createHash('sha256').update(rawSecret).digest('hex');
    
    // Fetch active gateways for this provider. 
    // In a massive scale environment, we might want the gateway ID in the token, but for now we fetch by provider.
    const { data, error } = await supabaseAdmin
      .from('telematics_gateways')
      .select('id, credential_hash, tenant_id')
      .eq('provider', provider)
      .eq('is_active', true);
      
    const gateways = data as any[] | null;

    if (error || !gateways || gateways.length === 0) {
      if (error) {
        securityServiceUnavailableTotal.inc({ provider });
      } else {
        securityRejectsTotal.inc({ provider, reason: 'PROVIDER_DISABLED_OR_NO_GATEWAYS' });
      }
      logger.warn({ event: 'security_service_unavailable', error: error?.message, provider }, 'Database error or no active gateways');
      return { authenticated: false, reason: error ? 'SERVICE_UNAVAILABLE' : 'PROVIDER_DISABLED_OR_NO_GATEWAYS' };
    }

    let matchedGateway: any = null;
    const incomingHashBuffer = Buffer.from(incomingHash, 'hex');

    for (const gw of gateways) {
      try {
        const storedHashBuffer = Buffer.from(gw.credential_hash, 'hex');
        // Node.js side timing-safe comparison as strictly requested by user rules
        if (incomingHashBuffer.length === storedHashBuffer.length && crypto.timingSafeEqual(incomingHashBuffer, storedHashBuffer)) {
          matchedGateway = gw;
          break;
        }
      } catch (e) {
        // Ignore buffer length mismatch errors to prevent leaking information
      }
    }

    if (!matchedGateway) {
      securityRejectsTotal.inc({ provider, reason: 'INVALID_CREDENTIALS' });
      logger.warn({ event: 'security_validation_failed', reason: 'INVALID_CREDENTIALS', provider }, 'Invalid credentials for webhook');
      return { authenticated: false, reason: 'INVALID_CREDENTIALS' };
    }

    // 4. Gateway-Level Rate Limiting
    const gatewayDecision = await this.rateLimiter.checkGatewayLimit(matchedGateway.id, policy);
    if (!gatewayDecision.allowed) {
      if (gatewayDecision.reason === 'SERVICE_UNAVAILABLE') {
        securityServiceUnavailableTotal.inc({ provider });
      } else {
        securityRejectsTotal.inc({ provider, reason: gatewayDecision.reason });
      }
      logger.warn({ event: 'security_rate_limit_blocked', gatewayId: matchedGateway.id, reason: gatewayDecision.reason, provider }, 'Gateway rate limit blocked webhook');
      return { authenticated: false, reason: gatewayDecision.reason };
    }

    logger.info({ event: 'security_validation_success', gatewayId: matchedGateway.id, tenantId: matchedGateway.tenant_id, provider }, 'Webhook security validation successful');

    return {
      authenticated: true,
      context: {
        gatewayId: matchedGateway.id,
        provider: provider,
        tenantId: matchedGateway.tenant_id
      }
    };
  }
}
