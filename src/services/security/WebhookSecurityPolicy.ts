export interface WebhookSecurityPolicy {
  /** Maximum age of a webhook payload in milliseconds before it's rejected. */
  maxEventAgeMs: number;
  /** Maximum time a payload can be in the future before it's rejected. */
  maxFutureSkewMs: number;
  /** Time to keep the event ID in memory for strict anti-replay deduplication. */
  replayTtlMs: number;
  /** Rate limits configured per level for this provider/endpoint. */
  rateLimits: {
    ipLimit: number;
    gatewayLimit: number;
    deviceLimit: number;
    windowMs: number;
  };
}

export const DEFAULT_SECURITY_POLICY: WebhookSecurityPolicy = {
  maxEventAgeMs: 15 * 60 * 1000, // 15 minutes by default
  maxFutureSkewMs: 5 * 60 * 1000, // 5 minutes by default
  replayTtlMs: 15 * 60 * 1000, // Keep in memory cache for 15 minutes
  rateLimits: {
    ipLimit: 100, // 100 requests per IP per window
    gatewayLimit: 500, // 500 requests per Gateway per window
    deviceLimit: 10, // 10 requests per specific device per window
    windowMs: 1000, // 1 second window
  }
};

export const PROVIDER_SECURITY_POLICIES: Record<string, WebhookSecurityPolicy> = {
  'traccar': {
    ...DEFAULT_SECURITY_POLICY,
    // Traccar can sometimes send buffered offline payloads, we might want a longer window
    maxEventAgeMs: 24 * 60 * 60 * 1000, // 24 hours
    replayTtlMs: 24 * 60 * 60 * 1000, // 24 hours memory cache (watch memory usage without Redis!)
  },
  'flespi': {
    ...DEFAULT_SECURITY_POLICY,
  },
  'manual': {
    ...DEFAULT_SECURITY_POLICY,
    maxEventAgeMs: 7 * 24 * 60 * 60 * 1000, // 7 days allowed for manual entries
    rateLimits: {
      ...DEFAULT_SECURITY_POLICY.rateLimits,
      ipLimit: 50, // lower rate for manual
    }
  }
};

export function getSecurityPolicyForProvider(provider: string): WebhookSecurityPolicy {
  return PROVIDER_SECURITY_POLICIES[provider] || DEFAULT_SECURITY_POLICY;
}
