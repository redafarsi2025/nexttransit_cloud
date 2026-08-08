const fs = require('fs');

let content = fs.readFileSync('src/context/FleetContext.tsx', 'utf-8');

const oldCloseWorkOrder = `  const closeWorkOrder = async (workOrderId: string, afterNotes: string) => {
    try {
      const success = await syncCloseWorkOrderAtomic(workOrderId, afterNotes);
      if (success) {
        setWorkOrders(prev =>
          prev.map(wo => {
            if (wo.id === workOrderId) {
              return {
                ...wo,
                status: 'Closed',
                before_after_notes: { ...wo.before_after_notes, after: afterNotes }
              };
            }
            return wo;
          })
        );
      }
    } catch (e) {
      console.error('Failed to close work order:', e);
    }
  };`;

const newCloseWorkOrder = `  const closeWorkOrder = async (workOrderId: string, afterNotes: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(\`/api/work-orders/\${workOrderId}/close\`, {
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

content = content.replace(oldCloseWorkOrder, newCloseWorkOrder);

fs.writeFileSync('src/context/FleetContext.tsx', content);
console.log('FleetContext.tsx patched closeWorkOrder successfully.');
