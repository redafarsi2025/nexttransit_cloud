const fs = require('fs');

let content = fs.readFileSync('src/context/FleetContext.tsx', 'utf-8');

const oldCloseWorkOrder = `  const closeWorkOrder = async (orderId: string, afterNotes: string) => {
    const woBefore = workOrders.find(w => w.id === orderId);
    const wo = workOrders.find(w => w.id === orderId);
    if (!wo) return;
    try {
      await syncCloseWorkOrderAtomic(orderId, afterNotes);
      
      if (woBefore) {
        recordAudit(
          'work_order',
          orderId,
          'STATUS_CHANGE',
          { status: woBefore.status, after_notes: woBefore.before_after_notes.after },
          { status: 'Closed', after_notes: afterNotes },
          currentUser?.id || 'sys',
          currentRole,
          activeTenantId
        );
      }
      
      setWorkOrders(prev => prev.map(w =>
        w.id === orderId ? { ...w, status: 'Closed', closed_date: new Date().toISOString(), before_after_notes: { ...w.before_after_notes, after: afterNotes } } : w
      ));

      setVehicles(prev => prev.map(v => {
        if (v.id === wo.vehicle_id) {
          return {
            ...v,
            status: 'Healthy',
            active_fault_codes: (v.active_fault_codes || []).filter(f => f.code !== wo.related_fault_code),
            status_reason: 'Cleared',
          };
        }
        return v;
      }));

    } catch (e) {
      console.error('Failed to close work order:', e);
    }
  };`;

const newCloseWorkOrder = `  const closeWorkOrder = async (orderId: string, afterNotes: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(\`/api/work-orders/\${orderId}/close\`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': \`Bearer \${session.access_token}\`
        },
        body: JSON.stringify({ afterNotes })
      });
      
      if (!response.ok) throw new Error('API Error');
      
      await loadData();
    } catch (e) {
      console.error('Failed to close work order via API:', e);
    }
  };`;

// Use a simpler string replace since there might be minor variations
const startIdx = content.indexOf('  const closeWorkOrder = async (orderId: string, afterNotes: string) => {');
if (startIdx !== -1) {
  const endIdx = content.indexOf('  };', startIdx) + 4;
  content = content.substring(0, startIdx) + newCloseWorkOrder + content.substring(endIdx);
  fs.writeFileSync('src/context/FleetContext.tsx', content);
  console.log('FleetContext.tsx patched closeWorkOrder successfully with substring.');
} else {
  console.log('Could not find closeWorkOrder');
}
