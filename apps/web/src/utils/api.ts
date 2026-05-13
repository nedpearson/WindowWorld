const API_BASE = '/api';

async function request(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem('wwa_token');
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

export const api = {
  // Auth
  login: (email: string, password: string) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  me: () => request('/auth/me'),

  // Dashboard
  dashboardStats: () => request('/dashboard/stats'),
  dashboardRecent: () => request('/dashboard/recent'),

  // Customers
  getCustomers: () => request('/customers'),
  getCustomer: (id: string) => request(`/customers/${id}`),
  createCustomer: (data: any) => request('/customers', { method: 'POST', body: JSON.stringify(data) }),
  updateCustomer: (id: string, data: any) => request(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  searchCustomers: (q: string) => request(`/customers/search/${encodeURIComponent(q)}`),

  // Appointments
  getAppointments: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request(`/appointments${qs}`);
  },
  getAppointment: (id: string) => request(`/appointments/${id}`),
  createAppointment: (data: any) => request('/appointments', { method: 'POST', body: JSON.stringify(data) }),
  updateAppointment: (id: string, data: any) => request(`/appointments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAppointment: (id: string) => request(`/appointments/${id}`, { method: 'DELETE' }),
  recalculate: (id: string) => request(`/appointments/${id}/recalculate`, { method: 'POST' }),

  // Openings
  getOpenings: (appointmentId: string) => request(`/openings/appointment/${appointmentId}`),
  getOpening: (id: string) => request(`/openings/${id}`),
  createOpening: (data: any) => request('/openings', { method: 'POST', body: JSON.stringify(data) }),
  updateOpening: (id: string, data: any) => request(`/openings/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteOpening: (id: string) => request(`/openings/${id}`, { method: 'DELETE' }),

  // Pricing
  getPricingTables: () => request('/pricing/tables'),
  createPricingTable: (data: any) => request('/pricing/tables', { method: 'POST', body: JSON.stringify(data) }),
  updatePricingTable: (id: string, data: any) => request(`/pricing/tables/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePricingTable: (id: string) => request(`/pricing/tables/${id}`, { method: 'DELETE' }),
  createPricingItem: (data: any) => request('/pricing/items', { method: 'POST', body: JSON.stringify(data) }),
  updatePricingItem: (id: string, data: any) => request(`/pricing/items/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePricingItem: (id: string) => request(`/pricing/items/${id}`, { method: 'DELETE' }),
  priceLookup: (data: any) => request('/pricing/lookup', { method: 'POST', body: JSON.stringify(data) }),

  // House Map
  getHouseMap: (appointmentId: string) => request(`/house-maps/appointment/${appointmentId}`),
  addMarker: (data: any) => request('/house-maps/markers', { method: 'POST', body: JSON.stringify(data) }),
  updateMarker: (id: string, data: any) => request(`/house-maps/markers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteMarker: (id: string) => request(`/house-maps/markers/${id}`, { method: 'DELETE' }),

  // Exports
  exportJSON: (id: string) => request(`/exports/json/${id}`),
  exportCSV: (id: string) => fetch(`${API_BASE}/exports/csv/${id}`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('wwa_token') || ''}` }
  }).then(r => r.text()),
};
