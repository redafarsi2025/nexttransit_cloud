import { supabase } from '../lib/supabase';
import {
  TenantCore,
  TaxProfile,
  CommercialRegistration,
  StatisticalProfile,
  SocialSecurityProfile,
  BankAccount,
  Establishment,
  Activity,
  LegalRepresentative,
  RegulatoryDocument,
  TenantDossier
} from '../types';

export class TenantLegalIdentityService {
  
  static async getTenantCore(tenantId: string): Promise<TenantCore | null> {
    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', tenantId)
      .maybeSingle();
    if (error) console.warn('Error fetching tenant core', error);
    return data;
  }

  static async getTaxProfile(tenantId: string): Promise<TaxProfile | null> {
    const { data, error } = await supabase
      .from('tax_profiles')
      .select('*')
      .eq('tenant_id', tenantId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  static async getCommercialRegistration(tenantId: string): Promise<CommercialRegistration | null> {
    const { data, error } = await supabase
      .from('commercial_registrations')
      .select('*')
      .eq('tenant_id', tenantId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  static async getStatisticalProfile(tenantId: string): Promise<StatisticalProfile | null> {
    const { data, error } = await supabase
      .from('statistical_profiles')
      .select('*')
      .eq('tenant_id', tenantId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  static async getSocialSecurityProfiles(tenantId: string): Promise<SocialSecurityProfile[]> {
    const { data, error } = await supabase
      .from('social_security_profiles')
      .select('*')
      .eq('tenant_id', tenantId);
    if (error) throw error;
    return data || [];
  }

  static async getBankAccounts(tenantId: string): Promise<BankAccount[]> {
    const { data, error } = await supabase
      .from('company_bank_accounts')
      .select('*')
      .eq('tenant_id', tenantId);
    if (error) throw error;
    return data || [];
  }

  static async getEstablishments(tenantId: string): Promise<Establishment[]> {
    const { data, error } = await supabase
      .from('establishments')
      .select('*')
      .eq('tenant_id', tenantId);
    if (error) throw error;
    return data || [];
  }

  static async getActivities(tenantId: string): Promise<Activity[]> {
    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .eq('tenant_id', tenantId);
    if (error) throw error;
    return data || [];
  }

  static async getLegalRepresentatives(tenantId: string): Promise<LegalRepresentative[]> {
    const { data, error } = await supabase
      .from('legal_representatives')
      .select('*')
      .eq('tenant_id', tenantId);
    if (error) throw error;
    return data || [];
  }

  static async getRegulatoryDocuments(tenantId: string): Promise<RegulatoryDocument[]> {
    const { data, error } = await supabase
      .from('regulatory_documents')
      .select('*')
      .eq('tenant_id', tenantId);
    if (error) throw error;
    return data || [];
  }

  // Load everything needed for a full dossier view
  static async loadFullDossier(tenantId: string): Promise<TenantDossier> {
    let [
      core,
      taxProfile,
      commercialRegistration,
      statisticalProfile,
      socialSecurityProfiles,
      bankAccounts,
      establishments,
      activities,
      legalRepresentatives,
      regulatoryDocuments
    ] = await Promise.all([
      this.getTenantCore(tenantId),
      this.getTaxProfile(tenantId),
      this.getCommercialRegistration(tenantId),
      this.getStatisticalProfile(tenantId),
      this.getSocialSecurityProfiles(tenantId),
      this.getBankAccounts(tenantId),
      this.getEstablishments(tenantId),
      this.getActivities(tenantId),
      this.getLegalRepresentatives(tenantId),
      this.getRegulatoryDocuments(tenantId)
    ]);

    if (!core) {
      throw new Error('TENANT_NOT_FOUND');
    }

    return {
      core,
      taxProfile: taxProfile || undefined,
      commercialRegistration: commercialRegistration || undefined,
      statisticalProfile: statisticalProfile || undefined,
      socialSecurityProfiles,
      bankAccounts,
      establishments,
      activities,
      legalRepresentatives,
      regulatoryDocuments
    };
  }

  // ==========================================
  // CRUD OPERATIONS FOR DOSSIER TABS
  // ==========================================

  // Establishments
  static async addEstablishment(establishment: Omit<Establishment, 'id' | 'created_at' | 'updated_at'>): Promise<Establishment> {
    const { data, error } = await supabase
      .from('establishments')
      .insert([establishment])
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  static async deleteEstablishment(id: string): Promise<void> {
    const { error } = await supabase.from('establishments').delete().eq('id', id);
    if (error) throw error;
  }

  // Social Security
  static async addSocialSecurityProfile(profile: Omit<SocialSecurityProfile, 'id' | 'created_at' | 'updated_at'>): Promise<SocialSecurityProfile> {
    const { data, error } = await supabase
      .from('social_security_profiles')
      .insert([profile])
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  static async deleteSocialSecurityProfile(id: string): Promise<void> {
    const { error } = await supabase.from('social_security_profiles').delete().eq('id', id);
    if (error) throw error;
  }

  // Bank Accounts
  static async addBankAccount(account: Omit<BankAccount, 'id' | 'created_at' | 'updated_at'>): Promise<BankAccount> {
    const { data, error } = await supabase
      .from('company_bank_accounts')
      .insert([account])
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  static async deleteBankAccount(id: string): Promise<void> {
    const { error } = await supabase.from('company_bank_accounts').delete().eq('id', id);
    if (error) throw error;
  }

  static async setPrimaryBankAccount(tenantId: string, accountId: string): Promise<void> {
    // Transaction-like approach: Reset all to false, then set one to true
    await supabase
      .from('company_bank_accounts')
      .update({ is_primary: false })
      .eq('tenant_id', tenantId);
      
    const { error } = await supabase
      .from('company_bank_accounts')
      .update({ is_primary: true })
      .eq('id', accountId);
      
    if (error) throw error;
  }

  // Legal Representatives
  static async addLegalRepresentative(rep: Omit<LegalRepresentative, 'id' | 'created_at' | 'updated_at'>): Promise<LegalRepresentative> {
    const { data, error } = await supabase
      .from('legal_representatives')
      .insert([rep])
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  static async deleteLegalRepresentative(id: string): Promise<void> {
    const { error } = await supabase.from('legal_representatives').delete().eq('id', id);
    if (error) throw error;
  }

  // ==========================================
  // UPDATE METHODS FOR INLINE-EDITABLE TABS
  // ==========================================

  /** Patch the core tenant row (table: tenants) */
  static async updateTenantCore(tenantId: string, updates: Partial<TenantCore>): Promise<void> {
    const { error } = await supabase
      .from('tenants')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', tenantId);
    if (error) throw error;
  }

  /** Upsert commercial registration (table: commercial_registrations) */
  static async upsertCommercialRegistration(
    tenantId: string,
    data: Partial<CommercialRegistration>
  ): Promise<void> {
    const { error } = await supabase
      .from('commercial_registrations')
      .upsert({ ...data, tenant_id: tenantId, updated_at: new Date().toISOString() }, { onConflict: 'tenant_id' });
    if (error) throw error;
  }

  /** Upsert statistical profile / NIS (table: statistical_profiles) */
  static async upsertStatisticalProfile(
    tenantId: string,
    data: Partial<StatisticalProfile>
  ): Promise<void> {
    const { error } = await supabase
      .from('statistical_profiles')
      .upsert({ ...data, tenant_id: tenantId, updated_at: new Date().toISOString() }, { onConflict: 'tenant_id' });
    if (error) throw error;
  }

  /** Upsert tax profile (table: tax_profiles) */
  static async upsertTaxProfile(
    tenantId: string,
    data: Partial<TaxProfile>
  ): Promise<void> {
    const { error } = await supabase
      .from('tax_profiles')
      .upsert({ ...data, tenant_id: tenantId, updated_at: new Date().toISOString() }, { onConflict: 'tenant_id' });
    if (error) throw error;
  }
}
