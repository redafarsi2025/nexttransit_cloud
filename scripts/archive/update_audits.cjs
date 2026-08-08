const fs = require('fs');

let code = fs.readFileSync('src/context/FleetContext.tsx', 'utf8');

// For logOBDFault
code = code.replace(
  /const logOBDFault = async \([\s\S]*?try \{/m,
  `const logOBDFault = async (
    vehicleId: string,
    fault: {
      code: string;
      name: string;
      severity: 'Critical' | 'Warning' | 'Info';
      required_part_id?: string;
      required_intervention: string;
    }
  ) => {
    const vehicleBefore = vehicles.find((v) => v.id === vehicleId);
    try {`
);
code = code.replace(
  /await syncLogOBDFaultToSupabase\(vehicleId, fault\);/,
  `await syncLogOBDFaultToSupabase(vehicleId, fault);
      const newStatus = fault.severity === 'Critical' ? 'Critical' : fault.severity === 'Warning' ? 'Attention' : (vehicleBefore?.status || 'Unknown');
      
      if (vehicleBefore) {
        recordAudit(
          'vehicle',
          vehicleId,
          'STATUS_CHANGE',
          { status: vehicleBefore.status, active_faults: vehicleBefore.active_fault_codes },
          { status: newStatus, added_fault: fault },
          currentUser?.id || 'sys',
          currentRole,
          activeTenantId
        );
      }`
);

// For createWorkOrder
code = code.replace(
  /const insertedWO = await syncCreateWorkOrderToSupabase\(newWO\);/,
  `const insertedWO = await syncCreateWorkOrderToSupabase(newWO);
      
      recordAudit(
        'work_order',
        insertedWO?.id || 'WO-NEW',
        'CREATE',
        {},
        { type: order.type, labor_hours: order.labor_hours, vehicle_id: order.vehicle_id },
        currentUser?.id || 'sys',
        currentRole,
        activeTenantId
      );`
);

// For closeWorkOrder
code = code.replace(
  /const closeWorkOrder = async \(orderId: string, afterNotes: string\) => \{/m,
  `const closeWorkOrder = async (orderId: string, afterNotes: string) => {
    const woBefore = workOrders.find(w => w.id === orderId);`
);
code = code.replace(
  /await syncCloseWorkOrderAtomic\(orderId, afterNotes\);/,
  `await syncCloseWorkOrderAtomic(orderId, afterNotes);
      
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
      }`
);

// For submitDriverIncident
code = code.replace(
  /const inserted = await syncSubmitDriverIncidentToSupabase\(/m,
  `recordAudit(
        'incident',
        vehicleId,
        'CREATE',
        {},
        { category, description },
        currentUser?.id || 'sys',
        currentRole,
        activeTenantId
      );
      const inserted = await syncSubmitDriverIncidentToSupabase(`
);

// For resolveConflict (activeTenantId passed to recordAudit)
code = code.replace(
  /currentUser\?\.id \|\| 'usr-fm-01',\n      currentRole\n    \);/m,
  `currentUser?.id || 'usr-fm-01',
      currentRole,
      activeTenantId
    );`
);

fs.writeFileSync('src/context/FleetContext.tsx', code);
