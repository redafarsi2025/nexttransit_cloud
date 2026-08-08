import { ScreenId, Role } from '../types';

export function getRoleDefaultRoute(role: Role): string {
  switch (role) {
    case 'DRIVER':
      return '/driver';
    case 'MECHANIC':
      return '/mechanic';
    case 'FINANCE':
      return '/variance';
    case 'OPERATIONS':
      return '/inventory';
    case 'SUPER_ADMIN':
      return '/tenant-config';
    case 'DIRECTOR':
    case 'FLEET_MANAGER':
    case 'MAINTENANCE_MANAGER':
    default:
      return '/dashboard';
  }
}

export const routeToScreenMap: Record<string, ScreenId> = {
  '/': 'LANDING_PAGE',
  '/dashboard': 'STRATEGIC_DASHBOARD',
  '/variance': 'VARIANCE_DASHBOARD',
  '/vehicles': 'FLEET_HEALTH_GRID',
  '/inventory': 'INVENTORY_DASHBOARD',
  '/work-orders': 'WORK_ORDER_QUEUE',
  '/pm-schedules': 'PM_SCHEDULES',
  '/edi-suppliers': 'EDI_SUPPLIERS',
  '/conflicts': 'CONFLICT_ALERTS',
  '/cae': 'CAE_BUDGET_PRIORITIZATION',
  '/incidents': 'INCIDENT_REPORTS',
  '/mechanic': 'MECHANIC_MOBILE_QUEUE',
  '/driver': 'DRIVER_MOBILE_VIEW',
  '/tenant-config': 'TENANT_CONFIG',
  '/translation': 'TRANSLATION_CENTER',
  '/safety': 'SAFETY_PERFORMANCE',
  '/fuel': 'FUEL_LOGS',
  '/telemetry': 'TELEMETRY_STREAM',
  '/audit': 'AUDIT_LOG',
  '/invitations': 'INVITATIONS',
  '/billing': 'BILLING',
  '/api-docs': 'API_DOCS',
  '/forbidden': 'FORBIDDEN_403',
};

export const screenToRouteMap: Record<ScreenId, string> = {
  LANDING_PAGE: '/',
  STRATEGIC_DASHBOARD: '/dashboard',
  VARIANCE_DASHBOARD: '/variance',
  FLEET_HEALTH_GRID: '/vehicles',
  INVENTORY_DASHBOARD: '/inventory',
  WORK_ORDER_QUEUE: '/work-orders',
  PM_SCHEDULES: '/pm-schedules',
  EDI_SUPPLIERS: '/edi-suppliers',
  CONFLICT_ALERTS: '/conflicts',
  CAE_BUDGET_PRIORITIZATION: '/cae',
  INCIDENT_REPORTS: '/incidents',
  MECHANIC_MOBILE_QUEUE: '/mechanic',
  DRIVER_MOBILE_VIEW: '/driver',
  TENANT_CONFIG: '/tenant-config',
  TRANSLATION_CENTER: '/translation',
  SAFETY_PERFORMANCE: '/safety',
  FUEL_LOGS: '/fuel',
  TELEMETRY_STREAM: '/telemetry',
  AUDIT_LOG: '/audit',
  INVITATIONS: '/invitations',
  BILLING: '/billing',
  API_DOCS: '/api-docs',
  FORBIDDEN_403: '/forbidden',
};
