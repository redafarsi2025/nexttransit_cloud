import { supabase } from '../lib/supabase';
import { Company, TenantConfig } from '../types';

/**
 * Creates a company with its initial tenant workspace.
 * A company can own one or more tenants (supporting multi-site enterprise fleets).
 */
export async function createCompanyWithFirstTenant(
  companyName: string,
  tenantName: string,
  region: string = 'North Africa'
): Promise<{ company: Company; tenant: TenantConfig }> {
  const companyId = `cmp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const tenantId = `tnt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  const company: Company = {
    id: companyId,
    name: companyName,
    created_at: new Date().toISOString(),
  };

  const tenant: TenantConfig = {
    id: tenantId,
    societyName: tenantName,
    currency: 'USD ($)',
    currencySymbol: '$',
    operatingRegion: region,
    allocatedBudget: 500000,
    moneyUsed: 0,
    fiscalYear: 'FY2026',
    taxRegistrationId: `TAX-${Math.floor(Math.random() * 9000000 + 1000000)}-NX`,
    costCenterCode: `CC-FLEET-${Math.floor(Math.random() * 900 + 100)}`,
    defaultLaborRate: 85,
    emergencyApprovalThreshold: 5000,
    contactEmail: `admin@${companyName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
    contactPhone: '+213 21 00 00 00',
    billingAddress: 'Algiers Commercial Park, Sector 4, Algeria',
    autoSyncMoneyUsed: true,
    lastUpdated: new Date().toISOString().split('T')[0],
  };

  try {
    await supabase.from('companies').insert(company);
    await supabase.from('tenants').insert({
      id: tenantId,
      company_id: companyId,
      societyName: tenantName,
      operatingRegion: region,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Skipped DB insert for company/tenant creation in fallback mode:', err);
  }

  return { company, tenant };
}

/**
 * List all tenants owned by a company.
 */
export async function listTenantsForCompany(companyId: string): Promise<TenantConfig[]> {
  try {
    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .eq('company_id', companyId);

    if (!error && data && data.length > 0) {
      return data as TenantConfig[];
    }
  } catch (e) {
    console.warn('Fallback company tenants listing:', e);
  }

  return [];
}
