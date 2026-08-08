const fs = require('fs');
let code = fs.readFileSync('src/context/FleetContext_old.tsx', 'utf8');

// 1. Remove AuthContextType fields from FleetContextType
code = code.replace(/  currentRole: Role;\n/g, '');
code = code.replace(/  currentScreen: ScreenId;\n/g, '');
code = code.replace(/  isRoleSelectorOpen: boolean;\n/g, '');
code = code.replace(/  currentUser: User \| null;\n/g, '');
code = code.replace(/  userProfile: UserProfile \| null;\n/g, '');
code = code.replace(/  subscription: Subscription \| null;\n/g, '');
code = code.replace(/  syncStatus: 'online' \| 'offline' \| 'syncing' \| 'error';\n/g, '');
code = code.replace(/  refreshUserSession: \(\) => Promise<void>;\n/g, '');
code = code.replace(/  changeRole: \(role: Role, preferredScreen\?: ScreenId\) => void;\n/g, '');
code = code.replace(/  changeScreen: \(screen: ScreenId, shouldNavigate\?: boolean\) => void;\n/g, '');
code = code.replace(/  setIsRoleSelectorOpen: \(open: boolean\) => void;\n/g, '');

// 2. Remove TenantContextType fields from FleetContextType
code = code.replace(/  tenantConfigs: TenantConfig\[\];\n/g, '');
code = code.replace(/  activeTenantId: string;\n/g, '');
code = code.replace(/  activeTenant: TenantConfig;\n/g, '');
code = code.replace(/  updateTenantConfig: \(id: string, updated: Partial<TenantConfig>\) => void;\n/g, '');
code = code.replace(/  setActiveTenantId: \(id: string\) => void;\n/g, '');
code = code.replace(/  addTenantConfig: \(newTenant: Omit<TenantConfig, 'id' \| 'lastUpdated'>\) => string;\n/g, '');

// 3. Update the imports
code = code.replace(
  "import { fuelService, INITIAL_SEED_FUEL_LOGS } from '../services/fuelService';",
  "import { fuelService, INITIAL_SEED_FUEL_LOGS } from '../services/fuelService';\nimport { useAuth } from './AuthContext';\nimport { useTenant } from './TenantContext';"
);

// 4. In FleetProvider, remove the state for Auth and Tenant
// Also change the provider signature
code = code.replace(
  "export const FleetProvider: React.FC<{ children: ReactNode }> = ({ children }) => {",
  `export const FleetProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentRole, currentScreen, changeScreen, changeRole, setIsRoleSelectorOpen, isRoleSelectorOpen, currentUser, userProfile, subscription, syncStatus, setSyncStatus, refreshUserSession } = useAuth();
  const { tenantConfigs, activeTenantId, activeTenant, updateTenantConfig, setActiveTenantId, addTenantConfig } = useTenant();`
);

// We need to delete the useState blocks for auth and tenant.
const toDelete = [
  "const [currentRole, setCurrentRole] = useState<Role>('DIRECTOR');",
  "const [currentScreen, setCurrentScreen] = useState<ScreenId>('LANDING_PAGE');",
  "const [isRoleSelectorOpen, setIsRoleSelectorOpen] = useState<boolean>(false); // Start false so Landing Page shows clean first",
  "const [currentUser, setCurrentUser] = useState<User | null>(null);",
  "const [userProfile, setUserProfile] = useState<UserProfile | null>(null);",
  "const [subscription, setSubscription] = useState<Subscription | null>(null);",
  "const [syncStatus, setSyncStatus] = useState<'online' | 'offline' | 'syncing' | 'error'>('online');",
];

toDelete.forEach(s => {
  code = code.replace(s, "");
});

// Remove refreshUserSession definition
code = code.replace(/  const refreshUserSession = useCallback\(async \(\) => \{[\s\S]*?  \}, \[\]\);/m, '');
// Remove Tenant state definitions
code = code.replace(/  const \[tenantConfigs, setTenantConfigs\] = useState<TenantConfig\[\]>\([\s\S]*?  \);/m, '');
code = code.replace(/  const \[activeTenantId, setActiveTenantIdState\] = useState<string>\([\s\S]*?  \);/m, '');
code = code.replace(/  useEffect\(\(\) => \{\n    if \(userProfile\?\.tenant_id\) \{\n      setActiveTenantIdState\(userProfile\.tenant_id\);\n    \}\n  \}, \[userProfile\]\);/m, '');
code = code.replace(/  const activeTenant = useMemo\([\s\S]*?  \], \[tenantConfigs, activeTenantId\]\);/m, '');
code = code.replace(/  const updateTenantConfig = \([\s\S]*?    \);\n  \};/m, '');
code = code.replace(/  const setActiveTenantId = \(id: string\) => \{\n    setActiveTenantIdState\(id\);\n  \};/m, '');
code = code.replace(/  const addTenantConfig = \([\s\S]*?    return id;\n  \};/m, '');

// Also remove `changeRole` and `changeScreen` definitions
code = code.replace(/  const changeRole = useCallback\(\(role: Role, preferredScreen\?: ScreenId\) => \{\n    setCurrentRole\(role\);\n    if \(preferredScreen\) \{\n      setCurrentScreen\(preferredScreen\);\n    \}\n  \}, \[\]\);/m, '');
code = code.replace(/  const changeScreen = useCallback\(\(screen: ScreenId, shouldNavigate: boolean = true\) => \{\n    setCurrentScreen\(screen\);\n    \/\/ if \(shouldNavigate && screenToRouteMap\[screen\]\) \{\n    \/\/   navigate\(screenToRouteMap\[screen\]\);\n    \/\/ \}\n  \}, \[\]\);/m, '');

// Also remove `navigate` if we want, but let's keep it.

fs.writeFileSync('src/context/FleetContext.tsx', code, 'utf8');
