/**
 * Infrastructure abstractions for Rate Limiting and Replay Protection.
 * Phase 2D uses Memory-based stores. Phase 2E will introduce Redis-based stores.
 */

// --- RATE LIMITING ---
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export interface RateLimitStore {
  /**
   * Checks and decrements the rate limit for a key.
   * @param key The distinct key (e.g., 'ip:127.0.0.1' or 'device:traccar:123')
   * @param limit Max number of requests allowed in the window.
   * @param windowMs Time window in milliseconds.
   */
  checkLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult>;
}

export class MemoryRateLimitStore implements RateLimitStore {
  private store = new Map<string, { count: number; resetAt: number }>();

  async checkLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
    const now = Date.now();
    let record = this.store.get(key);

    if (!record || record.resetAt <= now) {
      // Create new window or reset expired window
      record = { count: limit, resetAt: now + windowMs };
    }

    if (record.count > 0) {
      record.count -= 1;
      this.store.set(key, record);
      return { allowed: true, remaining: record.count, resetAt: record.resetAt };
    }

    return { allowed: false, remaining: 0, resetAt: record.resetAt };
  }

  // Periodic cleanup mechanism (since memory map won't auto-expire like Redis TTL)
  cleanup() {
    const now = Date.now();
    for (const [key, record] of this.store.entries()) {
      if (record.resetAt <= now) {
        this.store.delete(key);
      }
    }
  }
}

// --- REPLAY PROTECTION ---
export interface ReplayStore {
  /**
   * Attempts to store a unique event identifier.
   * @param key The unique event identifier (e.g. event_id or signature hash).
   * @param ttlMs Time to live in memory (usually matches the maxEventAgeMs).
   * @returns true if the key was stored successfully, false if it ALREADY EXISTS (Replay Detected).
   */
  storeIfNotExists(key: string, ttlMs: number): Promise<boolean>;
}

export class MemoryReplayStore implements ReplayStore {
  private store = new Map<string, number>();

  async storeIfNotExists(key: string, ttlMs: number): Promise<boolean> {
    const now = Date.now();
    const expiry = this.store.get(key);

    if (expiry && expiry > now) {
      // Exists and is not expired -> REPLAY DETECTED
      return false;
    }

    // Doesn't exist or expired -> Store it with new TTL
    this.store.set(key, now + ttlMs);
    return true;
  }

  cleanup() {
    const now = Date.now();
    for (const [key, expiry] of this.store.entries()) {
      if (expiry <= now) {
        this.store.delete(key);
      }
    }
  }
}
