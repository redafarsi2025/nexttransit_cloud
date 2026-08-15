import { supabase } from '../lib/supabase';

const API_BASE = '/api/platform';

/**
 * Helper function to inject Supabase Auth Token into API requests.
 */
async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error || !session) {
    throw new Error('Not authenticated');
  }

  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `HTTP Error ${response.status}`);
  }

  return response.json();
}

export const adminApiService = {
  // Stats
  getPlatformStats: () => fetchWithAuth('/stats'),

  // Tenants
  getAllTenants: (page = 1, limit = 20) => fetchWithAuth(`/tenants?page=${page}&limit=${limit}`),
  getTenantDetails: (id: string) => fetchWithAuth(`/tenants/${id}`),
  suspendTenant: (id: string) => fetchWithAuth(`/tenants/${id}/suspend`, { method: 'POST' }),
  reactivateTenant: (id: string) => fetchWithAuth(`/tenants/${id}/reactivate`, { method: 'POST' }),

  // Users
  getAllUsers: (page = 1, limit = 20) => fetchWithAuth(`/users?page=${page}&limit=${limit}`),
  disableUser: (id: string) => fetchWithAuth(`/users/${id}/disable`, { method: 'POST' }),
  enableUser: (id: string) => fetchWithAuth(`/users/${id}/enable`, { method: 'POST' }),
  changeUserRole: (id: string, role: string) => fetchWithAuth(`/users/${id}/role`, { 
    method: 'POST', 
    body: JSON.stringify({ role }) 
  }),

  // Subscriptions
  getAllSubscriptions: (page = 1, limit = 20) => fetchWithAuth(`/subscriptions?page=${page}&limit=${limit}`),
  extendTrial: (id: string, days: number) => fetchWithAuth(`/subscriptions/${id}/extend-trial`, { 
    method: 'POST', 
    body: JSON.stringify({ days }) 
  }),
  changeSubscriptionPlan: (id: string, plan: string) => fetchWithAuth(`/subscriptions/${id}/change-plan`, { 
    method: 'POST', 
    body: JSON.stringify({ plan }) 
  }),

  // Audit
  getPlatformAuditLogs: (page = 1, limit = 20, tenantId?: string, action?: string) => {
    let url = `/audit-logs?page=${page}&limit=${limit}`;
    if (tenantId) url += `&tenantId=${tenantId}`;
    if (action) url += `&action=${action}`;
    return fetchWithAuth(url);
  },

  // Health
  getSystemHealth: () => fetchWithAuth('/health')
};
