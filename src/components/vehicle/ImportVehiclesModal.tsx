import React, { useState, useRef } from 'react';
import { X, UploadCloud, AlertTriangle, FileSpreadsheet, Download, CheckCircle2 } from 'lucide-react';
import { Vehicle, VehicleClassification, VehicleStatus } from '../../types';
import { useLocalization } from '../../context/LocalizationContext';

// We import papaparse. Assume installed via npm install papaparse
import Papa from 'papaparse';

interface ImportVehiclesModalProps {
  onClose: () => void;
  onImport: (vehicles: Omit<Vehicle, 'id' | 'active_fault_codes' | 'maintenance_history'>[]) => Promise<{ error: string | null }>;
}

export const ImportVehiclesModal: React.FC<ImportVehiclesModalProps> = ({ onClose, onImport }) => {
  const { t } = useLocalization();
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadTemplate = () => {
    // Template with headers and one sample row
    const headers = ['plate', 'name', 'vin', 'classification', 'status', 'mileage'];
    const sample = ['16-01234-A', 'Transit-024', 'VF1BB0J0H12345678', 'Standard', 'Healthy', '15000'];
    const csvContent = [headers.join(','), sample.join(',')].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'nexttransit_vehicles_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    parseFile(selected);
  };

  const parseFile = (fileToParse: File) => {
    setErrors([]);
    setParsedData([]);
    
    Papa.parse(fileToParse, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length) {
          setErrors(results.errors.map(err => `Ligne ${err.row}: ${err.message}`));
          return;
        }
        
        // Validation
        const validData: any[] = [];
        const validationErrors: string[] = [];
        
        results.data.forEach((row: any, index) => {
          if (!row.plate || !row.plate.trim()) {
            validationErrors.push(`Ligne ${index + 2}: L'immatriculation (plate) est obligatoire.`);
          } else if (!row.name || !row.name.trim()) {
            validationErrors.push(`Ligne ${index + 2}: Le nom (name) est obligatoire pour ${row.plate}.`);
          } else {
            validData.push({
              plate: String(row.plate).trim().toUpperCase(),
              name: String(row.name).trim(),
              vin: row.vin ? String(row.vin).trim().toUpperCase() : undefined,
              classification: (row.classification === 'Keystone' ? 'Keystone' : 'Standard') as VehicleClassification,
              status: (['Healthy', 'Attention', 'Critical'].includes(row.status) ? row.status : 'Healthy') as VehicleStatus,
              mileage: parseInt(row.mileage) || 0,
            });
          }
        });

        if (validationErrors.length) {
          setErrors(validationErrors);
        } else {
          setParsedData(validData);
        }
      },
      error: (error: any) => {
        setErrors([`Erreur de lecture : ${error.message}`]);
      }
    });
  };

  const handleImport = async () => {
    if (!parsedData.length) return;
    setIsImporting(true);

    const payload = parsedData.map(row => ({
      plate: row.plate,
      name: row.name,
      vin: row.vin,
      classification: row.classification,
      status: row.status,
      lifecycle_status: 'IN_SERVICE' as const,
      status_reason: 'Importé en masse depuis un fichier',
      mileage: row.mileage,
      next_service_mileage: row.mileage + 15000,
      next_service_date: '',
      scheduled_use_days: 30,
      fault_score: 100,
      compliance_score: 100,
      freshness_score: 0,
      last_check_date: new Date().toISOString().split('T')[0],
      classification_weight: row.classification === 'Keystone' ? 1.5 : 1.0,
      delay_multiplier: row.classification === 'Keystone' ? 2.2 : 1.4,
    }));

    const { error } = await onImport(payload);
    setIsImporting(false);

    if (error) {
      setErrors([`Erreur d'importation serveur: ${error}`]);
    } else {
      onClose();
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="bg-white/10 p-2 rounded-xl">
              <FileSpreadsheet className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-black text-white">Importer des Véhicules</h2>
              <p className="text-xs text-slate-300">Modèle CSV requis</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          
          {/* Download Template */}
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-indigo-900">Modèle de fichier CSV</p>
              <p className="text-xs text-indigo-700 mt-0.5">Téléchargez le modèle avec les colonnes exactes.</p>
            </div>
            <button
              onClick={handleDownloadTemplate}
              className="px-3 py-1.5 bg-white border border-indigo-200 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-50 flex items-center gap-1.5 transition cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              Télécharger
            </button>
          </div>

          {/* Upload Zone */}
          <div 
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition ${
              file ? 'border-indigo-300 bg-indigo-50/50' : 'border-slate-200 hover:border-indigo-400 hover:bg-slate-50'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".csv"
              className="hidden"
            />
            <UploadCloud className={`h-8 w-8 mx-auto mb-3 ${file ? 'text-indigo-500' : 'text-slate-400'}`} />
            <p className="text-sm font-bold text-slate-700">
              {file ? file.name : "Cliquez pour sélectionner un fichier CSV"}
            </p>
            <p className="text-xs text-slate-500 mt-1">Colonnes requises: plate, name · optionnelles: vin, classification, status, mileage</p>
          </div>

          {/* Errors */}
          {errors.length > 0 && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
              <div className="flex items-center gap-2 text-rose-800 font-bold text-sm mb-2">
                <AlertTriangle className="h-4 w-4" /> Erreurs détectées
              </div>
              <ul className="list-disc list-inside text-xs text-rose-700 space-y-1">
                {errors.slice(0, 5).map((err, i) => <li key={i}>{err}</li>)}
                {errors.length > 5 && <li>...et {errors.length - 5} autres erreurs</li>}
              </ul>
            </div>
          )}

          {/* Success Preview */}
          {parsedData.length > 0 && errors.length === 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                <CheckCircle2 className="h-4 w-4" />
                {parsedData.length} véhicules prêts à être importés
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition cursor-pointer"
          >
            Annuler
          </button>
          <button
            onClick={handleImport}
            disabled={isImporting || parsedData.length === 0 || errors.length > 0}
            className="px-5 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl transition flex items-center gap-2 cursor-pointer"
          >
            {isImporting ? "Importation..." : "Confirmer l'import"}
          </button>
        </div>
      </div>
    </>
  );
};
