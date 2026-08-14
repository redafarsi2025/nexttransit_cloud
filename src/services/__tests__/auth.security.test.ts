import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '../../lib/supabase';
import { registerPublicCompany, loginUser, AuthEmailConfirmationError, AuthProvisioningError, ensureTenantProvisioned } from '../authService';
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
      const mockAuthUser = { id: 'auth-123', email: 'test@example.com' };
      (supabase.auth.signUp as any).mockResolvedValue({
        data: { user: mockAuthUser, session: { access_token: 'fake-token' } },
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

      (supabase.from as any).mockImplementation((table: string) => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockImplementation(() => {
          if (table === 'profiles') return Promise.resolve({ data: { id: 'auth-123', tenant_id: 't-123', company_id: 'c-123', email: 'test@example.com' }, error: null });
          if (table === 'tenants') return Promise.resolve({ data: { id: 't-123', company_id: 'c-123' }, error: null });
          if (table === 'companies') return Promise.resolve({ data: { id: 'c-123', name: 'Test Company' }, error: null });
          if (table === 'subscriptions') return Promise.resolve({ data: { id: 's-123', tenant_id: 't-123', company_id: 'c-123', plan: 'enterprise_trial', status: 'trial' }, error: null });
          return Promise.resolve({ data: null, error: null });
        })
      }));

      const payload = {
        email: 'test@example.com',
        password: 'ValidPassword1!',
        fullName: 'Test User',
        companyName: 'Test Company',
      };

      await registerPublicCompany(payload);

      expect(supabase.auth.signUp).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({
            data: {
              full_name: 'Test User',
              company_name: 'Test Company',
            },
          }),
        })
      );
      
      const signUpCall = (supabase.auth.signUp as any).mock.calls[0][0];
      expect(signUpCall.options.data).not.toHaveProperty('role');
      expect(signUpCall.options.data).not.toHaveProperty('tenant_id');

      expect(supabase.rpc).toHaveBeenCalledWith('provision_tenant', {
        p_company_name: 'Test Company',
        p_email: 'test@example.com',
      });
    });

    it('should throw AuthEmailConfirmationError and skip RPC if session is missing (email confirmation required)', async () => {
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
      
      expect(supabase.rpc).not.toHaveBeenCalled();
    });
  });

  describe('loginUser (Auto-repair Mechanism)', () => {
    it('should complete provisioning if tenant_id is null but company_name exists in metadata', async () => {
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

      let profileCallCount = 0;
      (supabase.from as any).mockImplementation((table: string) => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockImplementation(() => {
          if (table === 'profiles') {
            profileCallCount++;
            if (profileCallCount <= 2) {
              return Promise.resolve({ data: { id: 'auth-123', auth_user_id: 'auth-123', tenant_id: null, company_id: null, role: 'DRIVER', email: 'test@example.com' }, error: null });
            }
            return Promise.resolve({ data: { id: 'auth-123', auth_user_id: 'auth-123', tenant_id: 't-repaired', company_id: 'c-repaired', role: 'TENANT_ADMIN', email: 'test@example.com' }, error: null });
          }
          if (table === 'tenants') return Promise.resolve({ data: { id: 't-repaired', company_id: 'c-repaired' }, error: null });
          if (table === 'companies') return Promise.resolve({ data: { id: 'c-repaired', name: 'Stuck Company' }, error: null });
          if (table === 'subscriptions') return Promise.resolve({ data: { id: 's-repaired', tenant_id: 't-repaired', company_id: 'c-repaired', plan: 'enterprise_trial', status: 'trial' }, error: null });
          return Promise.resolve({ data: null, error: null });
        })
      }));

      (supabase.rpc as any).mockResolvedValue({
        data: { tenant_id: 't-repaired', company_id: 'c-repaired', subscription_id: 's-repaired', slug: 'stuck-company' },
        error: null,
      });

      const { profile } = await loginUser('test@example.com', 'ValidPassword1!');

      expect(supabase.rpc).toHaveBeenCalledWith('provision_tenant', {
        p_company_name: 'Stuck Company',
        p_email: 'test@example.com',
      });

      expect(profile.tenant_id).toBe('t-repaired');
      expect(profile.role).toBe('TENANT_ADMIN');
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

  describe('ensureTenantProvisioned (Integrity & Idempotence)', () => {
    it('Test G: auth.users exists but profile missing should return NEEDS_PROVISIONING', async () => {
      const singleMock = vi.fn().mockResolvedValue({ data: null, error: new Error('Not found') });
      (supabase.from as any).mockReturnValue({ select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: singleMock });
      
      const status = await ensureTenantProvisioned('auth-123', 'test@test.com', {});
      expect(status).toBe('NEEDS_PROVISIONING');
    });

    it('Test H1: profile.tenant_id pointe vers un tenant inexistant => INCONSISTENT (via rpc exception and PROVISIONING_FAILED in ensureTenantProvisioned)', async () => {
      const singleProfileMock = vi.fn().mockResolvedValue({ data: { id: 'auth-123', tenant_id: 't-1', company_id: 'c-1', email: 'test@test.com' }, error: null });
      const singleTenantMock = vi.fn().mockResolvedValue({ data: null, error: new Error('Tenant missing') });
      
      (supabase.from as any).mockImplementation((table: string) => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: table === 'profiles' ? singleProfileMock : singleTenantMock
      }));

      const status = await ensureTenantProvisioned('auth-123');
      expect(status).toBe('INCONSISTENT');
    });

    it('Test H2: profile.company_id != tenants.company_id => INCONSISTENT', async () => {
      const singleProfileMock = vi.fn().mockResolvedValue({ data: { id: 'auth-123', tenant_id: 't-1', company_id: 'c-1', email: 'test@test.com' }, error: null });
      const singleTenantMock = vi.fn().mockResolvedValue({ data: { id: 't-1', company_id: 'c-DIFFERENT' }, error: null });
      
      (supabase.from as any).mockImplementation((table: string) => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: table === 'profiles' ? singleProfileMock : singleTenantMock
      }));

      const status = await ensureTenantProvisioned('auth-123');
      expect(status).toBe('INCONSISTENT');
    });

    it('Test H3: company n\'existe pas => INCONSISTENT', async () => {
      const singleProfileMock = vi.fn().mockResolvedValue({ data: { id: 'auth-123', tenant_id: 't-1', company_id: 'c-1', email: 'test@test.com' }, error: null });
      const singleTenantMock = vi.fn().mockResolvedValue({ data: { id: 't-1', company_id: 'c-1' }, error: null });
      const singleCompanyMock = vi.fn().mockResolvedValue({ data: null, error: new Error('Company missing') });
      
      (supabase.from as any).mockImplementation((table: string) => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: table === 'profiles' ? singleProfileMock : table === 'tenants' ? singleTenantMock : singleCompanyMock
      }));

      const status = await ensureTenantProvisioned('auth-123');
      expect(status).toBe('INCONSISTENT');
    });

    it('Test H4: subscription existe mais mauvais company_id => INCONSISTENT via tentative réparation échouée', async () => {
      const singleProfileMock = vi.fn().mockResolvedValue({ data: { id: 'auth-123', tenant_id: 't-1', company_id: 'c-1', email: 'test@test.com' }, error: null });
      const singleTenantMock = vi.fn().mockResolvedValue({ data: { id: 't-1', company_id: 'c-1' }, error: null });
      const singleCompanyMock = vi.fn().mockResolvedValue({ data: { id: 'c-1', name: 'Acme' }, error: null });
      const singleSubMock = vi.fn().mockResolvedValue({ data: { id: 'sub-1', tenant_id: 't-1', company_id: 'c-WRONG', plan: 'enterprise_trial', status: 'trial' }, error: null });
      
      (supabase.from as any).mockImplementation((table: string) => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: table === 'profiles' ? singleProfileMock : table === 'tenants' ? singleTenantMock : table === 'companies' ? singleCompanyMock : singleSubMock
      }));
      (supabase.rpc as any).mockResolvedValue({ error: new Error('INCONSISTENT: subscription liée à une mauvaise company') });

      const status = await ensureTenantProvisioned('auth-123');
      expect(status).toBe('PROVISIONING_FAILED'); // Puisque ensureTenantProvisioned essaie de réparer mais que rpc échoue, il retourne PROVISIONING_FAILED (qui bloque).
    });

    it('Test H5: subscription absente => création => READY', async () => {
      const singleProfileMock = vi.fn().mockResolvedValue({ data: { id: 'auth-123', tenant_id: 't-1', company_id: 'c-1', email: 'test@test.com' }, error: null });
      const singleTenantMock = vi.fn().mockResolvedValue({ data: { id: 't-1', company_id: 'c-1' }, error: null });
      const singleCompanyMock = vi.fn().mockResolvedValue({ data: { id: 'c-1', name: 'Acme' }, error: null });
      // Première passe: absente. Seconde passe (après RPC): présente.
      const singleSubMock = vi.fn()
        .mockResolvedValueOnce({ data: null, error: new Error('Missing') })
        .mockResolvedValueOnce({ data: { id: 'sub-new', tenant_id: 't-1', company_id: 'c-1', plan: 'enterprise_trial', status: 'trial' }, error: null });
      
      (supabase.from as any).mockImplementation((table: string) => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: table === 'profiles' ? singleProfileMock : table === 'tenants' ? singleTenantMock : table === 'companies' ? singleCompanyMock : singleSubMock
      }));
      (supabase.rpc as any).mockResolvedValue({ data: {}, error: null }); // RPC succès

      const status = await ensureTenantProvisioned('auth-123');
      expect(status).toBe('READY');
      expect(supabase.rpc).toHaveBeenCalledWith('provision_tenant', expect.any(Object));
    });

    it('Test J: Should return READY if all FK and constraints match', async () => {
      const singleProfileMock = vi.fn().mockResolvedValue({ data: { id: 'auth-123', tenant_id: 't-1', company_id: 'c-1', email: 'test@test.com' }, error: null });
      const singleTenantMock = vi.fn().mockResolvedValue({ data: { id: 't-1', company_id: 'c-1' }, error: null });
      const singleCompanyMock = vi.fn().mockResolvedValue({ data: { id: 'c-1', name: 'Acme' }, error: null });
      const singleSubMock = vi.fn().mockResolvedValue({ data: { id: 'sub-1', tenant_id: 't-1', company_id: 'c-1', plan: 'enterprise_trial', status: 'trial' }, error: null });
      
      (supabase.from as any).mockImplementation((table: string) => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: table === 'profiles' ? singleProfileMock : table === 'tenants' ? singleTenantMock : table === 'companies' ? singleCompanyMock : singleSubMock
      }));

      const status = await ensureTenantProvisioned('auth-123');
      expect(status).toBe('READY');
    });
  });
});
