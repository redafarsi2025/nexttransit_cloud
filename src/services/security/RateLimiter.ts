import { RateLimitStore, MemoryRateLimitStore } from './SecurityStores';
import { WebhookSecurityPolicy } from './WebhookSecurityPolicy';

// We use the Memory store for Phase 2D. 
// In Phase 2E, this can be swapped with new RedisRateLimitStore().
const rateLimitStore: RateLimitStore = new MemoryRateLimitStore();

export class RateLimiter {
  static async checkIpLimit(ip: string, policy: WebhookSecurityPolicy): Promise<boolean> {
    const result = await rateLimitStore.checkLimit(`ratelimit:ip:${ip}`, policy.rateLimits.ipLimit, policy.rateLimits.windowMs);
    return result.allowed;
  }

  static async checkGatewayLimit(gatewayId: string, policy: WebhookSecurityPolicy): Promise<boolean> {
    const result = await rateLimitStore.checkLimit(`ratelimit:gateway:${gatewayId}`, policy.rateLimits.gatewayLimit, policy.rateLimits.windowMs);
    return result.allowed;
  }

  static async checkDeviceLimit(provider: string, externalDeviceId: string, policy: WebhookSecurityPolicy): Promise<boolean> {
    const result = await rateLimitStore.checkLimit(`ratelimit:device:${provider}:${externalDeviceId}`, policy.rateLimits.deviceLimit, policy.rateLimits.windowMs);
    return result.allowed;
  }

  static async checkEndpointLimit(endpoint: string, policy: WebhookSecurityPolicy): Promise<boolean> {
    // Basic IP-based limit per endpoint if needed, but for now we rely on IP / Gateway limits mainly.
    // Using IP limit as a fallback for the endpoint in general.
    const result = await rateLimitStore.checkLimit(`ratelimit:endpoint:${endpoint}`, policy.rateLimits.ipLimit, policy.rateLimits.windowMs);
    return result.allowed;
  }
}
