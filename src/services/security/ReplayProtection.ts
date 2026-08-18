import { ReplayStore, SecurityDecision } from './SecurityStores';
import { RedisReplayStore } from './RedisStores';
import { WebhookSecurityPolicy } from './WebhookSecurityPolicy';

export class ReplayProtection {
  constructor(private replayStore: ReplayStore = new RedisReplayStore()) {}

  /**
   * Validates if the timestamp falls within the allowed temporal window.
   */
  isTimestampValid(timestampMs: number, policy: WebhookSecurityPolicy): boolean {
    const now = Date.now();
    const age = now - timestampMs;
    const futureSkew = timestampMs - now;

    if (age > policy.maxEventAgeMs) {
      return false; // Too old
    }

    if (futureSkew > policy.maxFutureSkewMs) {
      return false; // Too far in the future
    }

    return true;
  }

  /**
   * Attempts to store the event ID in cache to prevent duplicate processing.
   * @returns SecurityDecision
   */
  async checkAndStoreEvent(
    tenantId: string,
    provider: string,
    deviceId: string,
    eventId: string,
    policy: WebhookSecurityPolicy
  ): Promise<SecurityDecision> {
    const key = `nexttransit:security:replay:${tenantId}:${provider}:${deviceId}:${eventId}`;
    const decision = await this.replayStore.storeIfNotExists(key, policy.replayTtlMs);
    return decision;
  }
}
