import { ReplayStore, MemoryReplayStore } from './SecurityStores';
import { WebhookSecurityPolicy } from './WebhookSecurityPolicy';

// Memory store for Phase 2D. Will be replaced by Redis in Phase 2E.
const replayStore: ReplayStore = new MemoryReplayStore();

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
