const fs = require('fs');

let content = fs.readFileSync('src/context/FleetContext.tsx', 'utf-8');

// 1. Replace logOBDFault
const oldLogOBDFault = `  const logOBDFault = async (
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
    try {
      const activeFault: ActiveFaultCode = {
        ...fault,
        logged_date: new Date().toISOString()
      };
      await syncLogOBDFaultToSupabase(vehicleId, fault);
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
      }
      
      setVehicles((prev) =>
        prev.map((v) => {
          if (v.id === vehicleId) {
            const newStatus = fault.severity === 'Critical' ? 'Critical' : fault.severity === 'Warning' ? 'Attention' : v.status;
            return {
              ...v,
              status: newStatus,
              active_fault_codes: [activeFault, ...(v.active_fault_codes || [])],
            };
          }
          return v;
        })
      );

      if (fault.severity === 'Critical') {
        addAlert({
          rule_id: 'R1',
          title: \`R1 Emergency Stop: Critical Fault on \${vehicleId}\`,
          description: \`Fault \${fault.code} logged. Vehicle status set to Critical. Dispatch immediate maintenance.\`,
          severity: 'critical',
          vehicle_id: vehicleId,
          part_id: fault.required_part_id,
        });
      }
    } catch (e) {
      console.error('Failed to log OBD fault to DB:', e);
    }
  };`;

const newLogOBDFault = `  const logOBDFault = async (
    vehicleId: string,
    fault: {
      code: string;
      name: string;
      severity: 'Critical' | 'Warning' | 'Info';
      required_part_id?: string;
      required_intervention: string;
    }
  ) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/maintenance/log-obd-fault', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': \`Bearer \${session.access_token}\`
        },
        body: JSON.stringify({ vehicleId, fault })
      });
      
      if (!response.ok) throw new Error('API Error');
      
      // Reload from DB to sync with backend
      await loadData();
    } catch (e) {
      console.error('Failed to log OBD fault via API:', e);
    }
  };`;

content = content.replace(oldLogOBDFault, newLogOBDFault);

// 2. Replace createWorkOrder
const oldCreateWorkOrder = `  const createWorkOrder = async (order: {
    vehicle_id: string;
    type: WorkOrder['type'];
    parts_used: { part_id: string; name: string; quantity: number; unit_cost: number }[];
    labor_hours: number;
    hourly_rate: number;
    before_notes: string;
    assigned_mechanic_id: string;
    assigned_mechanic_name: string;
    related_fault_code?: string;
  }) => {
    const vehicle = vehicles.find((v) => v.id === order.vehicle_id);
    if (!vehicle) return;

    const total_cost = (order.labor_hours * order.hourly_rate) +
      order.parts_used.reduce((sum, part) => sum + (part.quantity * part.unit_cost), 0);

    const newWO: Omit<WorkOrder, 'id'> = {
      vehicle_id: order.vehicle_id,
      vehicle_plate: vehicle.plate,
      type: order.type,
      status: 'Open',
      parts_used: order.parts_used,
      labor_hours: order.labor_hours,
      hourly_rate: order.hourly_rate,
      before_after_notes: { before: order.before_notes, after: '' },
      assigned_mechanic_id: order.assigned_mechanic_id,
      assigned_mechanic_name: order.assigned_mechanic_name,
      related_fault_code: order.related_fault_code,
      created_date: new Date().toISOString(),
      labor_cost: order.labor_hours * order.hourly_rate,
      total_cost
    };

    try {
      const savedWO = await syncCreateWorkOrderToSupabase(newWO);
      
      if (savedWO) {
        setWorkOrders((prev) => [savedWO, ...prev]);
        
        // R3: Simulate Inventory Deduction
        setInventory((prev) =>
          prev.map((item) => {
            const used = order.parts_used.find((p) => p.part_id === item.id);
            if (used) {
              const newQty = Math.max(0, item.quantity - used.quantity);
              if (newQty <= item.reorder_threshold) {
                addAlert({
                  rule_id: 'R3',
                  title: \`Low Stock Alert: \${item.name}\`,
                  description: \`Inventory for \${item.name} dropped to \${newQty}. Reorder threshold is \${item.reorder_threshold}.\`,
                  severity: 'warning',
                  part_id: item.id,
                });
              }
              return { ...item, quantity: newQty };
            }
            return item;
          })
        );
      }
    } catch (e) {
      console.error('Failed to create work order:', e);
    }
  };`;

const newCreateWorkOrder = `  const createWorkOrder = async (order: {
    vehicle_id: string;
    type: WorkOrder['type'];
    parts_used: { part_id: string; name: string; quantity: number; unit_cost: number }[];
    labor_hours: number;
    hourly_rate: number;
    before_notes: string;
    assigned_mechanic_id: string;
    assigned_mechanic_name: string;
    related_fault_code?: string;
  }) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const vehicle = vehicles.find((v) => v.id === order.vehicle_id);

      const response = await fetch('/api/work-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': \`Bearer \${session.access_token}\`
        },
        body: JSON.stringify({
          ...order,
          vehicle_plate: vehicle?.plate || '',
          status: 'Open',
          before_after_notes: { before: order.before_notes, after: '' },
          created_date: new Date().toISOString()
        })
      });
      
      if (!response.ok) throw new Error('API Error');
      
      await loadData();
    } catch (e) {
      console.error('Failed to create work order via API:', e);
    }
  };`;

content = content.replace(oldCreateWorkOrder, newCreateWorkOrder);

// 3. Replace submitDriverIncident
const oldSubmitDriverIncident = `  const submitDriverIncident = async (vehicleId: string, category: Incident['category'], description: string, reportedBy?: string) => {
    try {
      const newIncident: Omit<Incident, 'id'> = {
        vehicle_id: vehicleId,
        vehicle_plate: vehicles.find(v => v.id === vehicleId)?.plate || '',
        category,
        description,
        reported_by: reportedBy || 'Driver',
        status: 'Investigation',
        matched_to_fault: false,
        created_date: new Date().toISOString(),
      };
      const success = await syncSubmitDriverIncidentToSupabase(newIncident);

      if (success) {
        setIncidents(prev => [{ ...newIncident, id: \`INC-\${Date.now()}\` } as Incident, ...prev]);
      }

      addAlert({
        rule_id: 'R6',
        title: \`R6 Driver Incident Reported: \${vehicleId}\`,
        description: \`New incident reported: \${category}. No matching OBD fault detected yet. Investigation required.\`,
        severity: 'warning',
        vehicle_id: vehicleId,
      });

    } catch (e) {
      console.error('Failed to submit driver incident', e);
    }
  };`;

const newSubmitDriverIncident = `  const submitDriverIncident = async (vehicleId: string, category: Incident['category'], description: string, reportedBy?: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const vehiclePlate = vehicles.find(v => v.id === vehicleId)?.plate || '';

      const response = await fetch('/api/incidents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': \`Bearer \${session.access_token}\`
        },
        body: JSON.stringify({
          vehicle_id: vehicleId,
          vehicle_plate: vehiclePlate,
          category,
          description,
          reported_by: reportedBy || 'Driver',
          status: 'Investigation',
          matched_to_fault: false,
          created_date: new Date().toISOString()
        })
      });

      if (!response.ok) throw new Error('API Error');
      
      await loadData();
    } catch (e) {
      console.error('Failed to submit driver incident via API:', e);
    }
  };`;

content = content.replace(oldSubmitDriverIncident, newSubmitDriverIncident);

// 4. Replace addFuelLog
const oldAddFuelLog = `  const addFuelLog = async (log: Omit<FuelLog, 'id'>) => {
    try {
      const newLog = await fuelService.createFuelLog(log);
      if (newLog) {
        setFuelLogs(prev => [newLog, ...prev]);
      }
    } catch (e) {
      console.error('Error adding fuel log:', e);
    }
  };`;

const newAddFuelLog = `  const addFuelLog = async (log: Omit<FuelLog, 'id'>) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/fuel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': \`Bearer \${session.access_token}\`
        },
        body: JSON.stringify(log)
      });
      
      if (!response.ok) throw new Error('API Error');
      
      // Note: fuel logs currently aren't in loadData but we might want to refresh them elsewhere, 
      // or we can fetch them here. But for now, we'll let fuelService handle its own refresh or append.
      // Assuming loadData will be updated later to fetch fuel.
    } catch (e) {
      console.error('Failed to add fuel log via API:', e);
    }
  };`;

content = content.replace(oldAddFuelLog, newAddFuelLog);


fs.writeFileSync('src/context/FleetContext.tsx', content);
console.log('FleetContext.tsx patched successfully.');
