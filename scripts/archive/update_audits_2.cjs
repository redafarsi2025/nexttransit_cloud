const fs = require('fs');

let code = fs.readFileSync('src/context/FleetContext.tsx', 'utf8');

// For addFuelLog
code = code.replace(
  /const newLog = await fuelService\.addFuelLog\(\{/m,
  `recordAudit(
      'fuel_log',
      logInput.vehicle_id,
      'CREATE',
      {},
      { liters: logInput.liters, cost: logInput.cost, odometer: logInput.odometer_km },
      currentUser?.id || 'sys',
      currentRole,
      activeTenantId
    );
    const newLog = await fuelService.addFuelLog({`
);

fs.writeFileSync('src/context/FleetContext.tsx', code);
