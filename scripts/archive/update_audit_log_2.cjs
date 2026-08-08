const fs = require('fs');
let code = fs.readFileSync('src/components/screens/AuditLog.tsx', 'utf8');

code = code.replace(
  /case 'cae_budget':\n        return '💰';/g,
  `case 'cae_budget':
        return '💰';
      case 'fuel_log':
        return '⛽';
      case 'incident':
        return '⚠️';`
);

fs.writeFileSync('src/components/screens/AuditLog.tsx', code);
