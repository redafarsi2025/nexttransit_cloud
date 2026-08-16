import { ReplayStore } from './SecurityStores';
import { RedisReplayStore } from './RedisStores';
import { WebhookSecurityPolicy } from './WebhookSecurityPolicy';

// Phase 2E: We use RedisReplayStore for distributed replay protection
const replayStore: ReplayStore = new RedisReplayStore();

export class ReplayProtection {
  /**
   * Validates if the timestamp falls within the allowed temporal window.
   */
  static isTimestampValid(timestampMs: number, policy: WebhookSecurityPolicy): boolean {
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
   * @returns true if allowed, false if REPLAY_DETECTED.
   */
  static async checkAndStoreEvent(eventId: string, policy: WebhookSecurityPolicy): Promise<boolean> {
    const allowed = await replayStore.storeIfNotExists(`replay:event:${eventId}`, policy.replayTtlMs);
    return allowed;
  }
}
