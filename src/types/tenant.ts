export interface TenantCore {
  id: string;
  slug?: string;
  legal_name?: string;
  trade_name?: string;
  acronym?: string;
  legal_form?: string;
  capital_social?: number;
  date_creation?: string;
  date_activity_start?: string;
  country?: string;
  status?: string;
  currency?: string;
  timezone?: string;
  allocated_budget?: number;
  created_at?: string;
  updated_at?: string;
}

export interface TaxProfile {
  id: string;
  tenant_id: string;
  tax_regime: 'REAL' | 'REAL_SIMPLIFIED' | 'IFU' | 'SPECIAL' | 'OTHER';
  nif?: string;
  tax_article_number?: string;
  vat_subject: boolean;
  vat_status?: 'ACTIVE' | 'INACTIVE' | 'EXEMPT';
  ibs_subject: boolean;
  ifu_subject: boolean;
  tax_authority_type?: string;
  tax_authority_code?: string;
  tax_authority_name?: string;
  tax_registration_date?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CommercialRegistration {
  id: string;
  tenant_id: string;
  rc_number?: string;
  rc_date?: string;
  rc_status?: string;
  rc_authority?: string;
  created_at?: string;
  updated_at?: string;
}

export interface StatisticalProfile {
  id: string;
  tenant_id: string;
  nis?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SocialSecurityProfile {
  id: string;
  tenant_id: string;
  institution: 'CNAS' | 'CASNOS';
  registration_number?: string;
  employer_number?: string;
  affiliation_center?: string;
  status?: string;
  affiliation_date?: string;
  created_at?: string;
  updated_at?: string;
}

export interface BankAccount {
  id: string;
  tenant_id: string;
  bank_name: string;
  bank_code?: string;
  branch_code?: string;
  account_holder?: string;
  account_number?: string;
  rib?: string;
  currency: string;
  status?: string;
  is_primary: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Establishment {
  id: string;
  tenant_id: string;
  code?: string;
  name: string;
  type: 'HEAD_OFFICE' | 'AGENCY' | 'DEPOT' | 'WORKSHOP' | 'LOGISTICS_BASE' | 'OTHER';
  is_head_office: boolean;
  is_operational: boolean;
  address_line_1?: string;
  address_line_2?: string;
  district?: string;
  wilaya_id?: string;
  commune_id?: string;
  postal_code?: string;
  phone?: string;
  email?: string;
  nis?: string;
  nis_sequence?: string;
  rc_secondary_reference?: string;
  tax_article_number?: string;
  activity_status?: string;
  activity_start_date?: string;
  activity_end_date?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Activity {
  id: string;
  tenant_id: string;
  establishment_id?: string;
  activity_code?: string;
  activity_label?: string;
  activity_type: 'PRIMARY' | 'SECONDARY';
  is_primary: boolean;
  is_active: boolean;
  start_date?: string;
  end_date?: string;
  is_regulated: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface LegalRepresentative {
  id: string;
  tenant_id: string;
  person_id?: string;
  full_name: string;
  role: 'GERANT' | 'DIRECTOR_GENERAL' | 'PRESIDENT' | 'ADMINISTRATOR' | 'LEGAL_REPRESENTATIVE' | 'OTHER';
  start_date?: string;
  end_date?: string;
  is_current: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface RegulatoryDocument {
  id: string;
  tenant_id: string;
  establishment_id?: string;
  activity_id?: string;
  document_type: 'RC' | 'NIF' | 'NIS' | 'STATUTS' | 'CERTIFICAT_EXISTENCE' | 'ATTESTATION_FISCALE' | 'AGREMENT' | 'AUTORISATION' | 'LICENCE' | 'RIB' | 'CNAS' | 'CASNOS' | 'OTHER';
  document_name?: string;
  document_number?: string;
  issuing_authority?: string;
  issue_date?: string;
  expiry_date?: string;
  storage_path?: string;
  mime_type?: string;
  file_size?: number;
  verification_status: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'EXPIRED';
  uploaded_by?: string;
  uploaded_at?: string;
  verified_by?: string;
  verified_at?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

// Full Tenant Dossier representation for loading all at once
export interface TenantDossier {
  core: TenantCore;
  taxProfile?: TaxProfile;
  commercialRegistration?: CommercialRegistration;
  statisticalProfile?: StatisticalProfile;
  socialSecurityProfiles: SocialSecurityProfile[];
  bankAccounts: BankAccount[];
  establishments: Establishment[];
  activities: Activity[];
  legalRepresentatives: LegalRepresentative[];
  regulatoryDocuments: RegulatoryDocument[];
}
