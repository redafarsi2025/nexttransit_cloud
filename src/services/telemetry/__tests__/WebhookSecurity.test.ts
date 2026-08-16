import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WebhookSecurityService } from '../../security/WebhookSecurityService';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { RateLimiter } from '../../security/RateLimiter';
import { ReplayProtection } from '../../security/ReplayProtection';
import { getSecurityPolicyForProvider } from '../../security/WebhookSecurityPolicy';
import crypto from 'crypto';

// Clear modules/mocks before running
vi.mock('../../../lib/supabaseAdmin', () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn().mockReturnThis()
      }))
    }))
  }
}));

describe('Phase 2D: Webhook Security, Rate Limiting & Replay Protection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Authentication (Gateway Auth via DB)', () => {
    it('should reject if secret is missing (401)', async () => {
      const req = { ip: '127.0.0.1', headers: {} };
      const result = await WebhookSecurityService.authenticateAndRateLimit('traccar', req);
      expect(result.authenticated).toBe(false);
      expect(result.reason).toBe('MISSING_CREDENTIALS');
    });

    it('should reject if secret is incorrect (401)', async () => {
      const req = { ip: '127.0.0.1', headers: { authorization: 'Bearer wrong-secret' } };
      
      const supabaseQuery = vi.fn().mockResolvedValue({
        data: [{ id: 'gw-1', credential_hash: 'abc' }],
        error: null
      });
      // Mock the entire chain to reach the resolve point
      vi.mocked(supabaseAdmin.from).mockReturnValue({
        select: () => ({
          eq: () => ({
            eq: supabaseQuery
          })
        })
      } as any);

      const result = await WebhookSecurityService.authenticateAndRateLimit('traccar', req);
      expect(result.authenticated).toBe(false);
      expect(result.reason).toBe('INVALID_CREDENTIALS');
    });

    it('should accept if secret is correct and timing safe matches', async () => {
      const validSecret = 'super-secret-token';
      const validHash = crypto.createHash('sha256').update(validSecret).digest('hex');

      const req = { ip: '127.0.0.1', headers: { authorization: `Bearer ${validSecret}` } };
      
      const supabaseQuery = vi.fn().mockResolvedValue({
        data: [{ id: 'gw-1', credential_hash: validHash, tenant_id: 'tenant-A' }],
        error: null
      });

      vi.mocked(supabaseAdmin.from).mockReturnValue({
        select: () => ({
          eq: () => ({
            eq: supabaseQuery
          })
        })
      } as any);

      // Force IP ratelimit pass since it's stateful in memory across tests sometimes
      vi.spyOn(RateLimiter, 'checkIpLimit').mockResolvedValue(true);
      vi.spyOn(RateLimiter, 'checkGatewayLimit').mockResolvedValue(true);

      const result = await WebhookSecurityService.authenticateAndRateLimit('traccar', req);
      expect(result.authenticated).toBe(true);
      expect(result.context?.gatewayId).toBe('gw-1');
      expect(result.context?.tenantId).toBe('tenant-A');
    });
  });

  describe('2. Rate Limiting (Memory Store)', () => {
    it('should block requests if IP rate limit exceeded (429)', async () => {
      const policy = getSecurityPolicyForProvider('flespi');
      
      // Simulate exceeding the limit
      vi.spyOn(RateLimiter, 'checkIpLimit').mockResolvedValue(false);

      const req = { ip: '192.168.1.100', headers: {} };
      const result = await WebhookSecurityService.authenticateAndRateLimit('flespi', req);
      
      expect(result.authenticated).toBe(false);
      expect(result.reason).toBe('RATE_LIMIT_EXCEEDED');
    });
  });

  describe('3. Replay Protection (Temporal Window & Cache)', () => {
    it('should reject payload with timestamp too old', () => {
      const policy = getSecurityPolicyForProvider('traccar');
      // Set timestamp to 25 hours ago (policy max is 24 hours for traccar)
      const oldTimestamp = Date.now() - (25 * 60 * 60 * 1000);
      
      expect(ReplayProtection.isTimestampValid(oldTimestamp, policy)).toBe(false);
    });

    it('should reject payload with timestamp too far in future', () => {
      const policy = getSecurityPolicyForProvider('traccar');
      // Set timestamp to 10 minutes in the future (policy max is 5 minutes)
      const futureTimestamp = Date.now() + (10 * 60 * 1000);
      
      expect(ReplayProtection.isTimestampValid(futureTimestamp, policy)).toBe(false);
    });

    it('should block immediate replay (same event_id within memory cache TTL)', async () => {
      const policy = getSecurityPolicyForProvider('flespi');
      const eventId = 'test-event-id-123';

      // First call should succeed
      const allowed1 = await ReplayProtection.checkAndStoreEvent(eventId, policy);
      expect(allowed1).toBe(true);

      // Second call immediately after should be blocked
      const allowed2 = await ReplayProtection.checkAndStoreEvent(eventId, policy);
      expect(allowed2).toBe(false); // REPLAY DETECTED
    });
  });
});
