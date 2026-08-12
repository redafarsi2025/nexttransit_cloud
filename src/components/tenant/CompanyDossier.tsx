import React, { useState, useEffect } from 'react';
import { TenantLegalIdentityService } from '../../services/tenantLegalIdentityService';
import { TenantDossier } from '../../types';
import {
  Building2,
  Briefcase,
  Calculator,
  Building,
  ShieldCheck,
  CreditCard,
  Users,
  FileText
} from 'lucide-react';
import { CompanyIdentityTab } from './tabs/CompanyIdentityTab';
import { CommercialActivityTab } from './tabs/CommercialActivityTab';
import { TaxProfileTab } from './tabs/TaxProfileTab';
import { EstablishmentsTab } from './tabs/EstablishmentsTab';
import { SocialSecurityTab } from './tabs/SocialSecurityTab';
import { BankAccountsTab } from './tabs/BankAccountsTab';
import { GovernanceTab } from './tabs/GovernanceTab';
import { RegulatoryDocumentsTab } from './tabs/RegulatoryDocumentsTab';

export const CompanyDossier: React.FC<{ tenantId: string }> = ({ tenantId }) => {
  const [activeTab, setActiveTab] = useState<string>('IDENTITY');
  const [dossier, setDossier] = useState<TenantDossier | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [errorType, setErrorType] = useState<string | null>(null);

  const fetchDossier = async () => {
    setIsLoading(true);
    setErrorType(null);
    try {
      const data = await TenantLegalIdentityService.loadFullDossier(tenantId);
      setDossier(data);
    } catch (error: any) {
      console.error('Error fetching dossier:', error);
      if (error.message === 'TENANT_NOT_FOUND') {
        setErrorType('NOT_FOUND');
      } else {
        setErrorType('GENERIC');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (tenantId) {
      fetchDossier();
    }
  }, [tenantId]);

  const handleInitializeDossier = async () => {
    try {
      // In a real production flow, this might be handled by the onboarding wizard
      // Here we provide a safety hatch to insert a dummy core tenant record if missing.
      // However, inserting into 'tenants' requires a valid 'company_id' which we might not have.
      // So we'll trigger an alert for the user.
      alert("En production, le tenant doit être créé via l'assistant d'inscription global. Veuillez d'abord finaliser l'inscription de l'entreprise.");
    } catch (err) {
      console.error(err);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-slate-500">Chargement du dossier entreprise...</div>;
  }

  if (errorType === 'NOT_FOUND') {
    return (
      <div className="p-8 text-center bg-slate-50 rounded-lg border border-slate-200 border-dashed">
        <Building className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h4 className="text-lg font-bold text-slate-800 mb-2">Dossier introuvable</h4>
        <p className="text-slate-500 text-sm mb-6 max-w-md mx-auto">
          Ce profil d'entreprise n'existe pas dans la base de données ou vous n'avez pas les droits d'accès nécessaires.
        </p>
        <button 
           onClick={handleInitializeDossier}
           className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
        >
          Initialiser le dossier de l'entreprise
        </button>
      </div>
    );
  }

  if (!dossier || errorType === 'GENERIC') {
    return <div className="p-8 text-center text-red-500">Erreur critique lors du chargement du dossier.</div>;
  }

  const tabs = [
    { id: 'IDENTITY', label: 'Identité', icon: Building2 },
    { id: 'COMMERCIAL', label: 'Registre Commerce', icon: Briefcase },
    { id: 'TAX', label: 'Fiscalité', icon: Calculator },
    { id: 'ESTABLISHMENTS', label: 'Établissements', icon: Building },
    { id: 'SOCIAL', label: 'Sécurité Sociale', icon: ShieldCheck },
    { id: 'BANK', label: 'Banques', icon: CreditCard },
    { id: 'GOVERNANCE', label: 'Gouvernance', icon: Users },
    { id: 'DOCS', label: 'Documents', icon: FileText },
  ];

  return (
    <div className="flex flex-col space-y-6">
      <div className="flex space-x-2 border-b border-slate-200 dark:border-slate-700 overflow-x-auto pb-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-t-lg transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-indigo-50 text-indigo-600 border-b-2 border-indigo-600 font-medium dark:bg-indigo-900/30 dark:text-indigo-400'
                : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="mt-4">
        {activeTab === 'IDENTITY' && (
          <CompanyIdentityTab 
            data={dossier.core} 
            onUpdate={() => {}} 
          />
        )}
        {activeTab === 'COMMERCIAL' && (
          <CommercialActivityTab 
            rcData={dossier.commercialRegistration} 
            nisData={dossier.statisticalProfile} 
            onUpdateRC={() => {}} 
            onUpdateNIS={() => {}} 
          />
        )}
        {activeTab === 'TAX' && (
          <TaxProfileTab 
            data={dossier.taxProfile} 
            onUpdate={() => {}} 
          />
        )}
        {activeTab === 'ESTABLISHMENTS' && (
          <EstablishmentsTab 
            establishments={dossier.establishments} 
            tenantId={tenantId}
            onRefresh={fetchDossier}
          />
        )}
        {activeTab === 'SOCIAL' && (
          <SocialSecurityTab 
            profiles={dossier.socialSecurityProfiles} 
            tenantId={tenantId}
            onRefresh={fetchDossier}
          />
        )}
        {activeTab === 'BANK' && (
          <BankAccountsTab 
            accounts={dossier.bankAccounts} 
            tenantId={tenantId}
            onRefresh={fetchDossier}
          />
        )}
        {activeTab === 'GOVERNANCE' && (
          <GovernanceTab 
            representatives={dossier.legalRepresentatives} 
            tenantId={tenantId}
            onRefresh={fetchDossier}
          />
        )}
        {activeTab === 'DOCS' && (
          <RegulatoryDocumentsTab 
            documents={dossier.regulatoryDocuments} 
          />
        )}
      </div>
    </div>
  );
};
