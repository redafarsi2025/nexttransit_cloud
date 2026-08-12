import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '../../lib/supabase';
import { registerPublicCompany, loginUser, AuthEmailConfirmationError, AuthProvisioningError } from '../authService';
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
      // We also know provision_tenant now assigns TENANT_ADMIN on the server side
      expect(supabase.rpc).toHaveBeenCalledWith('provision_tenant', {
        p_company_name: 'Test Company',
        p_email: 'test@example.com',
      });
    });

    it('should throw AuthEmailConfirmationError and skip RPC if session is missing (email confirmation required)', async () => {
      // Mock signUp returning no session
      (supabase.auth.signUp as any).mockResolvedValue({
        data: { user: { id: 'auth-123' }, session: null },
        error: null,
      });

      const payload = {
        email: 'test@example.com',
        password: 'ValidPassword1!',
        fullName: 'Test User',
        companyName: 'Test Company',
      };

      await expect(registerPublicCompany(payload)).rejects.toThrow(AuthEmailConfirmationError);
      
      // Verify RPC was NOT called since provisioning cannot happen without session
      expect(supabase.rpc).not.toHaveBeenCalled();
    });
  });

  describe('loginUser (Auto-repair Mechanism)', () => {
    it('should complete provisioning if tenant_id is null but company_name exists in metadata', async () => {
      // 1. signInWithPassword succeeds
      (supabase.auth.signInWithPassword as any).mockResolvedValue({
        data: { 
          user: { 
            id: 'auth-123',
            user_metadata: { company_name: 'Stuck Company', full_name: 'Stuck User' }
          },
          session: { access_token: 'fake-token' }
        },
        error: null,
      });

      // 2. Fetch profile returns a profile with null tenant_id
      const selectMock = vi.fn().mockReturnThis();
      const eqMock = vi.fn().mockReturnThis();
      const singleMock = vi.fn().mockResolvedValueOnce({
        data: { id: 'usr-123', auth_user_id: 'auth-123', tenant_id: null, role: 'DRIVER', email: 'test@example.com' },
        error: null
      }).mockResolvedValueOnce({
        // Second call (refetch after repair)
        data: { id: 'usr-123', auth_user_id: 'auth-123', tenant_id: 't-repaired', role: 'FLEET_MANAGER', email: 'test@example.com' },
        error: null
      });

      (supabase.from as any).mockReturnValue({
        select: selectMock,
        eq: eqMock,
        single: singleMock,
      });

      // 3. RPC call succeeds for auto-repair
      (supabase.rpc as any).mockResolvedValue({
        data: null,
        error: null,
      });

      const { profile } = await loginUser('test@example.com', 'ValidPassword1!');

      // Verify RPC was called with metadata
      expect(supabase.rpc).toHaveBeenCalledWith('provision_tenant', {
        p_company_name: 'Stuck Company',
        p_email: 'test@example.com',
      });

      // Verify the returned profile is the repaired one
      expect(profile.tenant_id).toBe('t-repaired');
      expect(profile.role).toBe('FLEET_MANAGER');
    });

    it('should throw AuthProvisioningError if tenant_id is null and metadata is missing', async () => {
      (supabase.auth.signInWithPassword as any).mockResolvedValue({
        data: { 
          user: { 
            id: 'auth-123',
            user_metadata: {} // Missing company_name
          },
          session: { access_token: 'fake-token' }
        },
        error: null,
      });

      const selectMock = vi.fn().mockReturnThis();
      const eqMock = vi.fn().mockReturnThis();
      const singleMock = vi.fn().mockResolvedValue({
        data: { id: 'usr-123', auth_user_id: 'auth-123', tenant_id: null, role: 'DRIVER', email: 'test@example.com' },
        error: null
      });

      (supabase.from as any).mockReturnValue({
        select: selectMock,
        eq: eqMock,
        single: singleMock,
      });

      await expect(loginUser('test@example.com', 'ValidPassword1!')).rejects.toThrow(AuthProvisioningError);
      
      // Verify it didn't try to call RPC since data is missing
      expect(supabase.rpc).not.toHaveBeenCalled();
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
