const fs = require('fs');
let code = fs.readFileSync('src/components/screens/AuditLog.tsx', 'utf8');

code = code.replace(
  /<option value="cae_budget">CAE Budget Approvals<\/option>/g,
  `<option value="cae_budget">CAE Budget Approvals</option>
            <option value="fuel_log">Fuel Logs & Anomalies</option>
            <option value="incident">Driver Incidents</option>`
);

fs.writeFileSync('src/components/screens/AuditLog.tsx', code);
