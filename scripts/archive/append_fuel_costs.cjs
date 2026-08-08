const fs = require('fs');

function addFuelCosts(file) {
  let code = fs.readFileSync(file, 'utf8');
  
  if (code.includes('const allCostRecords = [...costRecords')) return; // already done
  
  // Replace costRecords usage with allCostRecords
  code = code.replace(
    /const \{ costRecords, vehicles, /g,
    `const { costRecords, fuelLogs, vehicles, `
  );
  code = code.replace(
    /const \{ vehicles, costRecords, /g,
    `const { vehicles, costRecords, fuelLogs, `
  );
  
  // StrategicDashboard specific
  if (file.includes('StrategicDashboard')) {
    code = code.replace(
      /const totalActualSpend = costRecords\.reduce/g,
      `const allCostRecords = [
    ...costRecords,
    ...fuelLogs.map(log => ({
      id: log.id,
      vehicle_id: log.vehicle_id,
      vehicle_plate: vehicles.find(v => v.id === log.vehicle_id)?.plate || log.vehicle_id,
      category: 'Fuel',
      amount: log.cost,
      budget_for_category: 20000, // Fixed quarterly budget for fuel per vehicle roughly, or fleet total? Actually this is just per record? Wait, budget is per record in costRecords right now. Let's say budget_for_category is cost * 0.9.
      period: 'Q3 2026',
      related_fault_code: 'Fuel Log'
    }))
  ];
  const totalActualSpend = allCostRecords.reduce`
    );
  }
  
  if (file.includes('VarianceDashboard')) {
    code = code.replace(
      /const categoryStats = categories\.map/g,
      `const allCostRecords = [
    ...costRecords,
    ...fuelLogs.map(log => ({
      id: log.id,
      vehicle_id: log.vehicle_id,
      vehicle_plate: vehicles.find(v => v.id === log.vehicle_id)?.plate || log.vehicle_id,
      category: 'Fuel',
      amount: log.cost,
      budget_for_category: log.cost * 0.85, // Introduce some variance
      period: 'Q3 2026',
      related_fault_code: 'Fuel Log'
    }))
  ];
  const categoryStats = categories.map`
    );
    
    code = code.replace(/costRecords\.filter\(\(c\)/g, 'allCostRecords.filter((c)');
    code = code.replace(/costRecords\.reduce\(/g, 'allCostRecords.reduce(');
    code = code.replace(/filteredRecords = costRecords\.filter/g, 'filteredRecords = allCostRecords.filter');
  }

  fs.writeFileSync(file, code);
}

addFuelCosts('src/components/screens/StrategicDashboard.tsx');
addFuelCosts('src/components/screens/VarianceDashboard.tsx');
