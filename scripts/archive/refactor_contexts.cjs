const fs = require('fs');
const path = require('path');

const authProps = new Set([
  'currentUser', 'userProfile', 'subscription', 'currentRole', 'currentScreen', 
  'isRoleSelectorOpen', 'syncStatus', 'refreshUserSession', 'changeRole', 
  'changeScreen', 'setIsRoleSelectorOpen', 'setSyncStatus'
]);

const tenantProps = new Set([
  'tenantConfigs', 'activeTenantId', 'activeTenant', 'updateTenantConfig', 
  'setActiveTenantId', 'addTenantConfig'
]);

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (!content.includes('useFleet')) return;

  const fleetMatch = content.match(/const\s+\{([^}]+)\}\s*=\s*useFleet\(\);/);
  if (!fleetMatch) return;

  const destructuredRaw = fleetMatch[1];
  const props = destructuredRaw.split(',').map(s => s.trim()).filter(s => s.length > 0);

  const fleetVars = [];
  const authVars = [];
  const tenantVars = [];

  props.forEach(p => {
    // some props might be aliased, e.g. activeTenant: tenant
    let baseProp = p.split(':')[0].trim();
    if (authProps.has(baseProp)) {
      authVars.push(p);
    } else if (tenantProps.has(baseProp)) {
      tenantVars.push(p);
    } else {
      fleetVars.push(p);
    }
  });

  if (authVars.length === 0 && tenantVars.length === 0) return; // No change needed

  let replacement = '';
  if (fleetVars.length > 0) replacement += `const { ${fleetVars.join(', ')} } = useFleet();\n  `;
  if (authVars.length > 0) replacement += `const { ${authVars.join(', ')} } = useAuth();\n  `;
  if (tenantVars.length > 0) replacement += `const { ${tenantVars.join(', ')} } = useTenant();\n  `;

  content = content.replace(fleetMatch[0], replacement.trimEnd());

  // Update imports
  const importLines = [];
  if (authVars.length > 0) importLines.push(`import { useAuth } from '../../context/AuthContext';`);
  if (tenantVars.length > 0) importLines.push(`import { useTenant } from '../../context/TenantContext';`);
  
  if (fleetVars.length === 0) {
    content = content.replace(/import\s*\{\s*useFleet\s*\}\s*from\s*'[^']+\/context\/FleetContext';/, importLines.join('\n'));
  } else {
    // Insert new imports after useFleet import
    content = content.replace(/(import\s*\{\s*useFleet\s*\}\s*from\s*'[^']+\/context\/FleetContext';)/, `$1\n${importLines.join('\n')}`);
  }

  // Handle path correction if not in components/screens (e.g. components/common)
  const depth = filePath.split('/').length - 2; 
  // src/components/screens/X.tsx -> depth 3. context is at src/context (depth 2)
  // this is a naive way, let's just replace '../../context' based on the original useFleet import
  
  let originalImport = content.match(/import\s*\{\s*useFleet\s*\}\s*from\s*'([^']+)';/);
  if (originalImport && (authVars.length > 0 || tenantVars.length > 0)) {
     const importPath = originalImport[1].replace('FleetContext', '');
     if (authVars.length > 0) {
        content = content.replace(/import\s*\{\s*useAuth\s*\}\s*from\s*'[^']+';/, `import { useAuth } from '${importPath}AuthContext';`);
     }
     if (tenantVars.length > 0) {
        content = content.replace(/import\s*\{\s*useTenant\s*\}\s*from\s*'[^']+';/, `import { useTenant } from '${importPath}TenantContext';`);
     }
  }

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Updated ${filePath}`);
}

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else if (fullPath.endsWith('.tsx')) {
      processFile(fullPath);
    }
  }
}

walk('src/components');
processFile('src/App.tsx');
