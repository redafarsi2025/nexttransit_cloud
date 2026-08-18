import { RateLimitStore, SecurityDecision } from './SecurityStores';
import { RedisRateLimitStore } from './RedisStores';
import { WebhookSecurityPolicy } from './WebhookSecurityPolicy';

export class RateLimiter {
  constructor(private rateLimitStore: RateLimitStore = new RedisRateLimitStore()) {}

  async checkIpLimit(ip: string, policy: WebhookSecurityPolicy): Promise<SecurityDecision> {
    const result = await this.rateLimitStore.checkLimit(`nexttransit:security:ratelimit:ip:${ip}`, policy.rateLimits.ipLimit, policy.rateLimits.windowMs);
    return result.decision;
  }

  async checkGatewayLimit(gatewayId: string, policy: WebhookSecurityPolicy): Promise<SecurityDecision> {
    const result = await this.rateLimitStore.checkLimit(`nexttransit:security:ratelimit:gateway:${gatewayId}`, policy.rateLimits.gatewayLimit, policy.rateLimits.windowMs);
    return result.decision;
  }

  async checkDeviceLimit(provider: string, externalDeviceId: string, policy: WebhookSecurityPolicy): Promise<SecurityDecision> {
    const result = await this.rateLimitStore.checkLimit(`nexttransit:security:ratelimit:device:${provider}:${externalDeviceId}`, policy.rateLimits.deviceLimit, policy.rateLimits.windowMs);
    return result.decision;
  }

  async checkEndpointLimit(endpoint: string, policy: WebhookSecurityPolicy): Promise<SecurityDecision> {
    const result = await this.rateLimitStore.checkLimit(`nexttransit:security:ratelimit:endpoint:${endpoint}`, policy.rateLimits.ipLimit, policy.rateLimits.windowMs);
    return result.decision;
  }
}
