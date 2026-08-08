const fs = require('fs');

let code = fs.readFileSync('src/components/screens/VarianceDashboard.tsx', 'utf8');

code = code.replace(
  /related_fault_code: 'Fuel Log'\n    \}\)\)/g,
  `related_fault_code: 'Fuel Log',\n      work_order_id: undefined\n    }))`
);

fs.writeFileSync('src/components/screens/VarianceDashboard.tsx', code);

code = fs.readFileSync('src/components/screens/StrategicDashboard.tsx', 'utf8');

code = code.replace(
  /related_fault_code: 'Fuel Log'\n    \}\)\)/g,
  `related_fault_code: 'Fuel Log',\n      work_order_id: undefined\n    }))`
);

fs.writeFileSync('src/components/screens/StrategicDashboard.tsx', code);
