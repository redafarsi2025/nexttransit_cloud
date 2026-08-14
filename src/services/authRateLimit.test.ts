import { describe, it, expect, beforeEach } from 'vitest';
import {
  checkRateLimit,
  checkRateLimitAsync,
  recordFailedLogin,
  clearRateLimit,
  validatePasswordPolicy,
} from './authService';

describe('Auth Service Persistent Rate Limiting & Password Policy', () => {
  const testEmail = 'lockout-test@nexttransit.io';

  beforeEach(() => {
    clearRateLimit(testEmail);
  });

  it('validates password policy correctly', () => {
    expect(validatePasswordPolicy('short1!').valid).toBe(false);
    expect(validatePasswordPolicy('password123').valid).toBe(false);
    expect(validatePasswordPolicy('ValidPass123!').valid).toBe(true);
  });

  it('locks out account after 5 consecutive failed login attempts', async () => {
    for (let i = 1; i <= 4; i++) {
      const res = await recordFailedLogin(testEmail);
      expect(res.locked).toBe(false);
      expect(res.remainingAttempts).toBe(5 - i);
    }

    const fifthAttempt = await recordFailedLogin(testEmail);
    expect(fifthAttempt.locked).toBe(true);
    expect(fifthAttempt.remainingAttempts).toBe(0);

    const status = checkRateLimit(testEmail);
    expect(status.locked).toBe(true);
    expect(status.remainingMinutes).toBeGreaterThan(0);
  });

  it('persists lockout state across service restart simulation', async () => {
    // 1. Trigger lockout
    for (let i = 0; i < 5; i++) {
      await recordFailedLogin(testEmail);
    }

    // 2. Simulate server restart by checking async state reader
    const status = await checkRateLimitAsync(testEmail);
    expect(status.locked).toBe(true);
  });
});
