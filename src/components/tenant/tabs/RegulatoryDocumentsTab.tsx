import React from 'react';
import { RegulatoryDocument } from '../../../types';
import { FileText, Download, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

interface Props {
  documents: RegulatoryDocument[];
  isReadOnly?: boolean;
}

export const RegulatoryDocumentsTab: React.FC<Props> = ({ documents, isReadOnly }) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'VERIFIED': return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      case 'PENDING': return <Clock className="w-5 h-5 text-amber-500" />;
      case 'REJECTED': 
      case 'EXPIRED': return <AlertTriangle className="w-5 h-5 text-rose-500" />;
      default: return <FileText className="w-5 h-5 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center mb-6">
          <FileText className="w-5 h-5 mr-2 text-indigo-500" />
          Documents Réglementaires & Agréments
        </h3>
        {documents.length === 0 ? (
          <p className="text-slate-500 text-sm">Aucun document téléversé.</p>
        ) : (
          <div className="space-y-4">
            {documents.map(d => (
              <div key={d.id} className="p-4 border rounded-lg dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {getStatusIcon(d.verification_status)}
                  <div>
                    <span className="font-semibold text-slate-900 dark:text-white">{d.document_type}</span>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Expire le: {d.expiry_date || 'N/A'}</p>
                  </div>
                </div>
                <button className="p-2 text-slate-500 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors">
                  <Download className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
