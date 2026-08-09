import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '../../lib/supabase';
import { registerPublicCompany } from '../authService';
import { acceptInvitation } from '../invitationService';
import { recordAudit } from '../auditService';

// Mock dependencies
vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
    },
    rpc: vi.fn(),
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      single: vi.fn(),
      insert: vi.fn(),
      update: vi.fn().mockReturnThis(),
    })),
  },
}));

vi.mock('../auditService', () => ({
  recordAudit: vi.fn(),
}));

describe('Auth Security & Privilege Escalation Prevention', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('registerPublicCompany (Public Registration)', () => {
    it('should NOT include role or tenant_id in signUp metadata', async () => {
      // The trigger handle_new_user defaults to DRIVER + NULL tenant.
      // If we pass role or tenant_id here, it would be a privilege escalation vector.
      const mockAuthUser = { id: 'auth-123', email: 'test@example.com' };
      (supabase.auth.signUp as any).mockResolvedValue({
        data: { user: mockAuthUser },
        error: null,
      });

      (supabase.rpc as any).mockResolvedValue({
        data: {
          tenant_id: 't-123',
          company_id: 'c-123',
          subscription_id: 's-123',
        },
        error: null,
      });

      const payload = {
        email: 'test@example.com',
        password: 'ValidPassword1!',
        fullName: 'Test User',
        companyName: 'Test Company',
      };

      await registerPublicCompany(payload);

      // Verify signUp was called without role/tenant_id
      expect(supabase.auth.signUp).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({
            data: {
              full_name: 'Test User',
              company_name: 'Test Company',
              // Assert absence of role and tenant_id
            },
          }),
        })
      );
      
      const signUpCall = (supabase.auth.signUp as any).mock.calls[0][0];
      expect(signUpCall.options.data).not.toHaveProperty('role');
      expect(signUpCall.options.data).not.toHaveProperty('tenant_id');

      // Verify RPC was called to provision the tenant
      // We also know register_new_tenant now assigns TENANT_ADMIN on the server side
      expect(supabase.rpc).toHaveBeenCalledWith('register_new_tenant', {
        p_company_name: 'Test Company',
        p_full_name: 'Test User',
        p_email: 'test@example.com',
        p_region: 'North Africa',
      });
    });
  });

  describe('acceptInvitation (Invitation Flow)', () => {
    it('should NOT include role or tenant_id in signUp metadata', async () => {
      // Same security principle: the RPC function securely reads role/tenant from the invitations table.
      
      // We need to mock the invitation pre-validation fetch
      const mockInvite = {
        id: 'inv-123',
        tenant_id: 't-invite',
        company_id: 'c-invite',
        role: 'FINANCE',
        email: 'invitee@example.com',
        token: 'valid-token',
        expires_at: new Date(Date.now() + 86400000).toISOString(), // future
        accepted_at: null,
      };

      const selectMock = vi.fn().mockReturnThis();
      const eqMock = vi.fn().mockReturnThis();
      const isMock = vi.fn().mockReturnThis();
      const singleMock = vi.fn().mockResolvedValue({ data: mockInvite, error: null });

      (supabase.from as any).mockReturnValue({
        select: selectMock,
        eq: eqMock,
        is: isMock,
        single: singleMock,
      });

      const mockAuthUser = { id: 'auth-456' };
      (supabase.auth.signUp as any).mockResolvedValue({
        data: { user: mockAuthUser },
        error: null,
      });

      (supabase.rpc as any).mockResolvedValue({
        data: {
          tenant_id: 't-invite',
          role: 'FINANCE',
        },
        error: null,
      });

      const payload = {
        token: 'valid-token',
        password: 'ValidPassword1!',
        fullName: 'Invited User',
      };

      const result = await acceptInvitation(payload);

      // Verify signUp was called without role/tenant_id
      const signUpCall = (supabase.auth.signUp as any).mock.calls[0][0];
      expect(signUpCall.options.data).not.toHaveProperty('role');
      expect(signUpCall.options.data).not.toHaveProperty('tenant_id');

      // Verify RPC was called to atomically claim the token
      expect(supabase.rpc).toHaveBeenCalledWith('accept_tenant_invitation', {
        p_token: 'valid-token',
        p_full_name: 'Invited User',
        p_email: 'invitee@example.com',
      });

      // Verify returned profile has the securely resolved role
      expect(result.role).toBe('FINANCE');
      expect(result.tenant_id).toBe('t-invite');
    });
  });
});
