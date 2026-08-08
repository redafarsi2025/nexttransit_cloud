import React, { useState } from 'react';
import { useFleet } from '../../context/FleetContext';
import { useLocalization } from '../../context/LocalizationContext';
import { EdiSupplierPurchaseOrder } from '../../types';
import {
  Package,
  Send,
  Building2,
  CheckCircle2,
  Clock,
  Truck,
  Plus,
  FileCode,
  Sparkles,
  Search,
  ShoppingCart,
  ExternalLink,
  Code,
} from 'lucide-react';

export const EdiSuppliersView: React.FC = () => {
  const { inventory, ediOrders, addEdiPurchaseOrder, transmitEdiOrder } = useFleet();
  const { t } = useLocalization();

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedSupplier, setSelectedSupplier] = useState<string>('all');
  const [activeModal, setActiveModal] = useState<'create_po' | 'view_ack' | null>(null);
  const [selectedPo, setSelectedPo] = useState<EdiSupplierPurchaseOrder | null>(null);

  // New PO Form State
  const [newSupplierName, setNewSupplierName] = useState<EdiSupplierPurchaseOrder['supplier_name']>('Bosch Automotive');
  const [newProtocol, setNewProtocol] = useState<EdiSupplierPurchaseOrder['edi_protocol']>('EDIFACT ORDERS D96A');
  const [selectedPartId, setSelectedPartId] = useState<string>(inventory[0]?.id || '');
  const [orderQuantity, setOrderQuantity] = useState<number>(5);

  const filteredOrders = ediOrders.filter((po) => {
    const matchesSupplier = selectedSupplier === 'all' || po.supplier_name === selectedSupplier;
    const matchesSearch =
      po.po_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      po.supplier_name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSupplier && matchesSearch;
  });

  const handleCreatePoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetPart = inventory.find((i) => i.id === selectedPartId) || inventory[0];
    if (!targetPart) return;

    addEdiPurchaseOrder({
      po_number: `EDI-PO-${Date.now().toString().substring(6)}`,
      supplier_name: newSupplierName,
      edi_protocol: newProtocol,
      status: 'Draft',
      items: [
        {
          part_id: targetPart.id,
          part_sku: targetPart.sku,
          part_name: targetPart.name,
          quantity: Number(orderQuantity),
          unit_cost: targetPart.unit_cost,
        },
      ],
      total_amount: Number(orderQuantity) * targetPart.unit_cost,
    });

    setActiveModal(null);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-xl border border-indigo-900/60">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                Phase 3 • EDI & API Suppliers
              </span>
              <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Auto-Replenishment R3 Ready
              </span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">
              Approvisionnement Automatisé EDI & Passerelles Grossistes
            </h1>
            <p className="text-xs text-indigo-200/80 mt-1 max-w-2xl">
              Génération automatique des bons de commande (PO) et transmission directe par EDIFACT, REST API et ANSI X12 vers Bosch, Valeo, Michelin et Continental.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setActiveModal('create_po')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-black text-xs transition-all shadow-md cursor-pointer"
            >
              <ShoppingCart className="w-4 h-4 text-white" />
              Nouveau Bon de Commande EDI
            </button>
          </div>
        </div>
      </div>

      {/* Supplier Partners Row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { name: 'Bosch Automotive', protocol: 'EDIFACT D96A', status: 'Online REST/EDI' },
          { name: 'Valeo Fleet Parts', protocol: 'REST JSON API v2', status: 'Online REST/EDI' },
          { name: 'Michelin Pro', protocol: 'EDIFACT D96A', status: 'Online REST/EDI' },
          { name: 'Continental Tires', protocol: 'ANSI X12 850', status: 'Online REST/EDI' },
          { name: 'ZF Aftermarket', protocol: 'REST JSON API v2', status: 'Online REST/EDI' },
        ].map((sup, idx) => (
          <div
            key={idx}
            className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1 hover:border-indigo-300 transition-all"
          >
            <div className="flex items-center justify-between text-[10px] font-bold text-indigo-600">
              <Building2 className="w-3.5 h-3.5" />
              <span>{sup.protocol}</span>
            </div>
            <div className="text-xs font-black text-slate-900 truncate">{sup.name}</div>
            <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              {sup.status}
            </div>
          </div>
        ))}
      </div>

      {/* EDI Purchase Orders Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
            <FileCode className="w-4 h-4 text-indigo-600" /> Commandes Fournisseurs EDI & Suivi des Flux
          </h3>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Rechercher numéro PO ou fournisseur..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64"
              />
            </div>

            <select
              value={selectedSupplier}
              onChange={(e) => setSelectedSupplier(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="all">Tous les Fournisseurs</option>
              <option value="Bosch Automotive">Bosch Automotive</option>
              <option value="Valeo Fleet Parts">Valeo Fleet Parts</option>
              <option value="Michelin Pro">Michelin Pro</option>
              <option value="Continental Tires">Continental Tires</option>
              <option value="ZF Aftermarket">ZF Aftermarket</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 uppercase font-black tracking-wider text-[10px]">
                <th className="py-3 px-4">N° Commande (PO)</th>
                <th className="py-3 px-4">Fournisseur & Protocole</th>
                <th className="py-3 px-4">Articles & Quantités</th>
                <th className="py-3 px-4">Montant Total</th>
                <th className="py-3 px-4">Statut Flux EDI</th>
                <th className="py-3 px-4">Date Émission</th>
                <th className="py-3 px-4 text-right">Actions EDI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredOrders.map((po) => (
                <tr key={po.id} className="hover:bg-indigo-50/20 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-indigo-700">
                    {po.po_number}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-900">{po.supplier_name}</div>
                    <div className="text-[10px] font-mono text-slate-500">{po.edi_protocol}</div>
                  </td>
                  <td className="py-3.5 px-4 text-slate-800">
                    {po.items.map((it, idx) => (
                      <div key={idx} className="text-xs">
                        <strong className="text-slate-900">{it.quantity}x</strong> {it.part_name} ({it.part_sku})
                      </div>
                    ))}
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                    {po.total_amount.toLocaleString()} DA / $
                  </td>
                  <td className="py-3.5 px-4">
                    {po.status === 'Draft' && (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-slate-100 text-slate-700 border border-slate-300">
                        Brouillon
                      </span>
                    )}
                    {po.status === 'Transmitted EDI' && (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-indigo-100 text-indigo-800 border border-indigo-200">
                        Transmis EDI
                      </span>
                    )}
                    {po.status === 'Confirmed' && (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-purple-100 text-purple-800 border border-purple-200">
                        Confirmé
                      </span>
                    )}
                    {po.status === 'In Transit' && (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-800 border border-amber-200">
                        En Transit
                      </span>
                    )}
                    {po.status === 'Received' && (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                        Reçu & En Stock
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                    {po.created_at}
                  </td>
                  <td className="py-3.5 px-4 text-right space-x-2">
                    {po.status === 'Draft' ? (
                      <button
                        onClick={() => transmitEdiOrder(po.id)}
                        className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-[11px] transition-colors cursor-pointer shadow-2xs inline-flex items-center gap-1"
                      >
                        <Send className="w-3 h-3" /> Transmettre EDI
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setSelectedPo(po);
                          setActiveModal('view_ack');
                        }}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-bold text-[11px] transition-colors cursor-pointer border border-slate-300 inline-flex items-center gap-1"
                      >
                        <Code className="w-3 h-3 text-indigo-600" /> Inspecter Payload ACK
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create PO */}
      {activeModal === 'create_po' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-indigo-600" /> Générer un Bon de Commande EDI
              </h3>
              <button
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePoSubmit} className="space-y-4 text-xs font-medium text-slate-700">
              <div>
                <label className="block text-slate-800 font-bold mb-1">Fournisseur Grossiste</label>
                <select
                  value={newSupplierName}
                  onChange={(e) => setNewSupplierName(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                >
                  <option value="Bosch Automotive">Bosch Automotive</option>
                  <option value="Valeo Fleet Parts">Valeo Fleet Parts</option>
                  <option value="Michelin Pro">Michelin Pro</option>
                  <option value="Continental Tires">Continental Tires</option>
                  <option value="ZF Aftermarket">ZF Aftermarket</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-800 font-bold mb-1">Protocole EDI / API</label>
                <select
                  value={newProtocol}
                  onChange={(e) => setNewProtocol(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                >
                  <option value="EDIFACT ORDERS D96A">EDIFACT ORDERS D96A</option>
                  <option value="REST JSON API v2">REST JSON API v2</option>
                  <option value="ANSI X12 850">ANSI X12 850 (Purchase Order)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-800 font-bold mb-1">Pièce Sélectionnée dans le Catalogue Stock</label>
                <select
                  value={selectedPartId}
                  onChange={(e) => setSelectedPartId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                >
                  {inventory.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.sku}) • Stock: {item.quantity} • Prix: {item.unit_cost} DA / $
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-800 font-bold mb-1">Quantité à Commander</label>
                <input
                  type="number"
                  min="1"
                  value={orderQuantity}
                  onChange={(e) => setOrderQuantity(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold font-mono"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl cursor-pointer shadow-sm"
                >
                  Générer Bon de Commande
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: View ACK Payload */}
      {activeModal === 'view_ack' && selectedPo && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 text-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-indigo-800 space-y-4">
            <div className="flex items-center justify-between border-b border-indigo-900 pb-3">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Code className="w-4 h-4 text-indigo-400" /> Inspecteur de Payload EDI ACK ({selectedPo.po_number})
              </h3>
              <button
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-white font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Fournisseur:</span>
                <span className="font-bold text-indigo-300">{selectedPo.supplier_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Protocole:</span>
                <span className="font-mono text-emerald-400">{selectedPo.edi_protocol}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Horodatage Transmission:</span>
                <span className="font-mono text-white">{selectedPo.transmitted_at || selectedPo.created_at}</span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-mono text-indigo-300 uppercase font-bold mb-1">
                Réponse de la Passerelle Grossiste (ACK Payload)
              </label>
              <pre className="p-3 bg-slate-950 border border-indigo-900 rounded-xl text-[11px] font-mono text-emerald-300 whitespace-pre-wrap overflow-x-auto">
                {selectedPo.ack_payload || 'Transmis par EDI. Attente d\'accusé de réception fournisseur...'}
              </pre>
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                Fermer l'Inspecteur
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
