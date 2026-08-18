import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WebhookSecurityService } from '../../security/WebhookSecurityService';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { RateLimiter } from '../../security/RateLimiter';
import { ReplayProtection } from '../../security/ReplayProtection';
import { getSecurityPolicyForProvider } from '../../security/WebhookSecurityPolicy';
import { MemoryRateLimitStore, MemoryReplayStore } from '../../security/SecurityStores';
import crypto from 'crypto';
import { supabaseMock, setMockData, resetSupabaseMock } from '../../../../tests/setup/supabaseMock';

// Clear modules/mocks before running
vi.mock('../../../lib/supabaseAdmin', async () => {
  const { supabaseMock } = await import('../../../../tests/setup/supabaseMock');
  return { __esModule: true, supabaseAdmin: supabaseMock };
});

describe('Phase 2E: Webhook Security, Rate Limiting & Replay Protection', () => {
  let rateLimiter: RateLimiter;
  let replayProtection: ReplayProtection;
  let securityService: WebhookSecurityService;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    // DI setup using memory stores for tests
    rateLimiter = new RateLimiter(new MemoryRateLimitStore());
    replayProtection = new ReplayProtection(new MemoryReplayStore());
    securityService = new WebhookSecurityService(rateLimiter);
  });
  
  afterEach(() => {
    resetSupabaseMock();
  });

  describe('1. Authentication (Gateway Auth via DB)', () => {
    it('should reject if secret is missing (401)', async () => {
      const req = { ip: '127.0.0.1', headers: {} };
      const result = await securityService.authenticateAndRateLimit('traccar', req);
      expect(result.authenticated).toBe(false);
      expect(result.reason).toBe('MISSING_CREDENTIALS');
    });

    it('should reject if secret is incorrect (401)', async () => {
      const req = { ip: '127.0.0.1', headers: { authorization: 'Bearer wrong-secret' } };
      setMockData({ id: 'gw-1', credential_hash: 'abc' });

      const result = await securityService.authenticateAndRateLimit('traccar', req);
      expect(result.authenticated).toBe(false);
      expect(result.reason).toBe('INVALID_CREDENTIALS');
    });

    it('should accept if secret is correct and timing safe matches', async () => {
      const validSecret = 'super-secret-token';
      const validHash = crypto.createHash('sha256').update(validSecret).digest('hex');

      const req = { ip: '127.0.0.1', headers: { authorization: `Bearer ${validSecret}` } };
      
      setMockData({ id: 'gw-1', credential_hash: validHash, tenant_id: 'tenant-A' });

      // Override the actual memory store method via vi.spyOn just to ensure limits don't trigger
      vi.spyOn(rateLimiter, 'checkIpLimit').mockResolvedValue({ allowed: true });
      vi.spyOn(rateLimiter, 'checkGatewayLimit').mockResolvedValue({ allowed: true });

      const result = await securityService.authenticateAndRateLimit('traccar', req);
      expect(result.authenticated).toBe(true);
      expect(result.context?.gatewayId).toBe('gw-1');
      expect(result.context?.tenantId).toBe('tenant-A');
    });
  });

  describe('2. Rate Limiting (Memory Store)', () => {
    it('should block requests if IP rate limit exceeded (429)', async () => {
      // Simulate exceeding the limit
      vi.spyOn(rateLimiter, 'checkIpLimit').mockResolvedValue({ allowed: false, reason: 'RATE_LIMIT_EXCEEDED' });

      const req = { ip: '192.168.1.100', headers: {} };
      const result = await securityService.authenticateAndRateLimit('flespi', req);
      
      expect(result.authenticated).toBe(false);
      expect(result.reason).toBe('RATE_LIMIT_EXCEEDED');
    });
  });

  describe('3. Replay Protection (Temporal Window & Cache)', () => {
    it('should reject payload with timestamp too old', () => {
      const policy = getSecurityPolicyForProvider('traccar');
      const oldTimestamp = Date.now() - (25 * 60 * 60 * 1000);
      
      expect(replayProtection.isTimestampValid(oldTimestamp, policy)).toBe(false);
    });

    it('should reject payload with timestamp too far in future', () => {
      const policy = getSecurityPolicyForProvider('traccar');
      const futureTimestamp = Date.now() + (10 * 60 * 1000);
      
      expect(replayProtection.isTimestampValid(futureTimestamp, policy)).toBe(false);
    });

    it('should block immediate replay (same event_id within memory cache TTL)', async () => {
      const policy = getSecurityPolicyForProvider('flespi');
      const eventId = 'test-event-id-123';
      const tenantId = 't1';
      const provider = 'flespi';
      const deviceId = 'd1';

      // First call should succeed
      const decision1 = await replayProtection.checkAndStoreEvent(tenantId, provider, deviceId, eventId, policy);
      expect(decision1.allowed).toBe(true);

      // Second call immediately after should be blocked
      const decision2 = await replayProtection.checkAndStoreEvent(tenantId, provider, deviceId, eventId, policy);
      expect(decision2.allowed).toBe(false); // REPLAY DETECTED
      if (!decision2.allowed) {
        expect(decision2.reason).toBe('REPLAY_DETECTED');
      }
    });
  });
});
