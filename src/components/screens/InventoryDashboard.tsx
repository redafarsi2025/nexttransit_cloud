import React, { useState } from 'react';
import { useFleet } from '../../context/FleetContext';
import { useLocalization } from '../../context/LocalizationContext';
import { KPIBadge } from '../common/KPIBadge';
import {
  Package,
  AlertTriangle,
  Clock,
  Truck,
  CheckCircle2,
  Boxes,
  ArrowRight,
  TrendingUp,
  QrCode,
  Radio,
  ScanLine,
  Search,
  Check,
} from 'lucide-react';

export const InventoryDashboard: React.FC = () => {
  const { inventory, projectedShortfallParts } = useFleet();
  const { t } = useLocalization();

  const [filterLowStock, setFilterLowStock] = useState<boolean>(false);
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);
  const [scannedTagInput, setScannedTagInput] = useState<string>('');
  const [scanResult, setScanResult] = useState<any | null>(null);

  const displayedInventory = filterLowStock
    ? inventory.filter((item) => item.quantity <= item.reorder_threshold)
    : inventory;

  const totalPartTypes = inventory.length;
  const lowStockCount = inventory.filter((item) => item.quantity <= item.reorder_threshold).length;
  const totalStockValue = inventory.reduce((sum, item) => sum + item.quantity * item.unit_cost, 0);

  const handleSimulateScan = (tagOrSku: string) => {
    setScannedTagInput(tagOrSku);
    const found = inventory.find(
      (item) =>
        item.sku.toLowerCase() === tagOrSku.toLowerCase() ||
        item.id.toLowerCase() === tagOrSku.toLowerCase() ||
        (item.rfid_tag_id && item.rfid_tag_id.toLowerCase() === tagOrSku.toLowerCase())
    ) || inventory[0];

    if (found) {
      setScanResult({
        part: found,
        rfid: found.rfid_tag_id || `RFID-${Math.floor(10000 + Math.random() * 90000)}-VALEO`,
        barcode: found.barcode || `3700${Math.floor(100000000 + Math.random() * 900000000)}`,
        bin: found.location_bin || `RACK-A${Math.floor(1 + Math.random() * 9)}-BIN-04`,
        status: 'In Stock',
        scannedAt: new Date().toLocaleTimeString(),
      });
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 text-xs font-bold uppercase tracking-wider mb-1">
            <Package className="h-4 w-4" /> {t('inventory.header_tag', {}, 'Logistics Controller View')}
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {t('inventory.header_title', {}, 'Inventory & Supply Chain Shortfall Projection')}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {t('inventory.header_desc', {}, 'Real-time warehouse stock tracking, SKU replenishment thresholds, and Rule R3 predictive shortfall calculations.')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setIsScannerOpen(true);
              handleSimulateScan(inventory[0]?.sku || 'TURBO-SENS-01');
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-slate-900 to-indigo-950 text-white font-bold text-xs rounded-xl hover:from-slate-800 hover:to-indigo-900 transition-all cursor-pointer shadow-sm border border-indigo-800/50"
          >
            <ScanLine className="w-4 h-4 text-indigo-400" />
            Scanner RFID / Code-Barres
          </button>
          <KPIBadge type="Calculated" formula="Unit Cost * On-Hand Inventory Quantity" />
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Total Stock Valuation</span>
            <KPIBadge type="Calculated" formula="Sum of (Qty * Unit Cost)" />
          </div>
          <div className="text-3xl font-black text-slate-900">
            ${totalStockValue.toLocaleString()}
          </div>
          <p className="text-xs text-slate-500">{totalPartTypes} unique active component SKUs</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Low Stock Alerts</span>
            <KPIBadge type="Calculated" formula="Qty <= Reorder Threshold" />
          </div>
          <div className="text-3xl font-black text-amber-600 flex items-center gap-2">
            <AlertTriangle className="h-6 w-6" /> {lowStockCount} SKUs
          </div>
          <p className="text-xs text-slate-500">Require supplier purchase orders</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Rule R5 Shortfall Risks</span>
            <KPIBadge
              type="Statistical estimate"
              formula="Upcoming Maintenance Demand > Warehouse Stock"
            />
          </div>
          <div className="text-3xl font-black text-rose-600 flex items-center gap-2">
            <Clock className="h-6 w-6" /> {projectedShortfallParts.length} Parts
          </div>
          <p className="text-xs text-slate-500">Lead time shortfall risk for scheduled routes</p>
        </div>
      </div>

      {/* R5 Shortfall Projection Banner Card */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-wider">
              <AlertTriangle className="h-4 w-4" /> Rule R5: Predictive Lead Time Shortfall Projection
            </div>
            <h2 className="text-lg font-bold text-white mt-1">
              Parts Shortfall Exposure Matrix
            </h2>
            <p className="text-xs text-slate-400">
              Cross-references upcoming vehicle maintenance intervals and active OBD fault repair requirements against warehouse lead times.
            </p>
          </div>
          <KPIBadge
            type="Statistical estimate"
            formula="Projected Demand = (Active Faults + Due Service) - Stock"
          />
        </div>

        {projectedShortfallParts.length === 0 ? (
          <div className="p-4 bg-slate-800/60 rounded-xl text-emerald-400 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" /> No parts shortfalls projected for the next 14 days of scheduled maintenance.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projectedShortfallParts.map((item, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-slate-800/90 border border-slate-700/80 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="font-bold text-sm text-white">{item.part.name}</div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">
                    SKU: {item.part.sku}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">
                      On-Hand Qty
                    </span>
                    <span className="font-bold text-amber-400">{item.part.quantity} units</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">
                      Forecast Demand
                    </span>
                    <span className="font-bold text-white">{item.projectedDemand} units</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">
                      Lead Time Risk
                    </span>
                    <span className="font-bold text-rose-400">{item.shortfallDays} days</span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-300 flex items-center gap-2">
                  <Truck className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                  <span>
                    Affects vehicles:{' '}
                    <span className="font-bold text-white">
                      {item.affectedVehicles.join(', ')}
                    </span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Warehouse Inventory Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Boxes className="h-4 w-4 text-indigo-600" />
              Warehouse Parts Stock Master
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Live quantities, unit costs, and compatible vehicle mappings.
            </p>
          </div>

          <button
            onClick={() => setFilterLowStock(!filterLowStock)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
              filterLowStock
                ? 'bg-amber-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            {filterLowStock ? 'Showing Low Stock Only' : 'Filter Low Stock SKUs'}
          </button>
        </div>

        <div className="overflow-x-auto border border-slate-100 rounded-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-3">SKU</th>
                <th className="p-3">Part Name</th>
                <th className="p-3">Category</th>
                <th className="p-3 text-center">On Hand</th>
                <th className="p-3 text-center">Reorder Threshold</th>
                <th className="p-3 text-right">Unit Cost</th>
                <th className="p-3 text-center">Lead Time</th>
                <th className="p-3">Compatible Vehicles</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {displayedInventory.map((item) => {
                const isLow = item.quantity <= item.reorder_threshold;

                return (
                  <tr
                    key={item.id}
                    className={`hover:bg-slate-50 transition ${
                      isLow ? 'bg-amber-50/40' : ''
                    }`}
                  >
                    <td className="p-3 font-mono font-bold text-slate-900">{item.sku}</td>
                    <td className="p-3 font-bold text-slate-900">{item.name}</td>
                    <td className="p-3 text-slate-500">{item.category}</td>
                    <td className="p-3 text-center">
                      <span
                        className={`px-2.5 py-1 rounded-full font-bold ${
                          isLow
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {item.quantity} units
                      </span>
                    </td>
                    <td className="p-3 text-center font-semibold text-slate-600">
                      {item.reorder_threshold} units
                    </td>
                    <td className="p-3 text-right font-bold text-slate-900">
                      ${item.unit_cost.toLocaleString()}
                    </td>
                    <td className="p-3 text-center text-slate-600">{item.lead_time_days} days</td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {item.compatible_vehicles.map((v, i) => (
                          <span
                            key={i}
                            className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-mono"
                          >
                            {v}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* RFID & Barcode Scanner Modal */}
      {isScannerOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 text-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-indigo-800 space-y-4">
            <div className="flex items-center justify-between border-b border-indigo-900 pb-3">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <ScanLine className="w-5 h-5 text-indigo-400 animate-pulse" /> Lecteur RFID & Code-Barres
              </h3>
              <button
                onClick={() => setIsScannerOpen(false)}
                className="text-slate-400 hover:text-white font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 bg-slate-950 rounded-xl border border-indigo-900/60 flex flex-col items-center justify-center space-y-3">
              <div className="w-20 h-20 rounded-2xl bg-indigo-950 border-2 border-indigo-500/50 flex items-center justify-center text-indigo-400 shadow-inner">
                <Radio className="w-10 h-10 animate-pulse" />
              </div>
              <p className="text-xs text-indigo-200 font-medium text-center">
                Approchez le tag RFID de la pièce ou pointez le pistolet laser vers le code-barres de la boîte.
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-300">
                Sélectionner ou saisir un Tag RFID / SKU
              </label>
              <div className="flex gap-2">
                <select
                  value={scannedTagInput}
                  onChange={(e) => handleSimulateScan(e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono font-bold text-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {inventory.map((item) => (
                    <option key={item.id} value={item.sku}>
                      {item.sku} — {item.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {scanResult && (
              <div className="p-4 bg-indigo-950/60 border border-indigo-500/40 rounded-xl space-y-2 text-xs">
                <div className="flex items-center justify-between border-b border-indigo-900/60 pb-2">
                  <span className="font-bold text-white text-sm">{scanResult.part.name}</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase border border-emerald-500/30">
                    {scanResult.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-indigo-200 font-mono text-[11px]">
                  <div>SKU: <strong className="text-white">{scanResult.part.sku}</strong></div>
                  <div>ID Tag RFID: <strong className="text-indigo-300">{scanResult.rfid}</strong></div>
                  <div>Code-Barres: <strong className="text-white">{scanResult.barcode}</strong></div>
                  <div>Emplacement Casier: <strong className="text-emerald-300">{scanResult.bin}</strong></div>
                </div>

                <div className="pt-2 text-[11px] text-slate-400 flex justify-between">
                  <span>Stock Physique: <strong className="text-white">{scanResult.part.quantity} unités</strong></span>
                  <span>Scanné à: {scanResult.scannedAt}</span>
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setIsScannerOpen(false)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                Fermer le Scanner
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
