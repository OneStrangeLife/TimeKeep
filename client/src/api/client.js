const BASE = '/api';

function getToken() {
  return localStorage.getItem('tk_token');
}

async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    localStorage.removeItem('tk_token');
    window.location.href = '/login';
    return;
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export const api = {
  // Auth
  login: (username, password) => request('POST', '/auth/login', { username, password }),
  me: () => request('GET', '/auth/me'),

  // Clients
  getClients: () => request('GET', '/clients'),
  createClient: (name) => request('POST', '/clients', { name }),
  updateClient: (id, data) => request('PUT', `/clients/${id}`, data),
  deleteClient: (id) => request('DELETE', `/clients/${id}`),

  // Projects
  getProjects: (client_id) => request('GET', `/projects${client_id ? `?client_id=${client_id}` : ''}`),
  createProject: (client_id, name) => request('POST', '/projects', { client_id, name }),
  updateProject: (id, data) => request('PUT', `/projects/${id}`, data),
  deleteProject: (id) => request('DELETE', `/projects/${id}`),

  // Time entries
  getTimeEntries: (date, user_id) => {
    const params = new URLSearchParams();
    if (date) params.set('date', date);
    if (user_id) params.set('user_id', user_id);
    return request('GET', `/time-entries?${params}`);
  },
  createTimeEntry: (data) => request('POST', '/time-entries', data),
  updateTimeEntry: (id, data) => request('PUT', `/time-entries/${id}`, data),
  deleteTimeEntry: (id) => request('DELETE', `/time-entries/${id}`),
  purgeTimeEntries: (params) => request('POST', '/time-entries/purge', params),

  // Date history
  getDateHistory: () => request('GET', '/time-entries/history'),

  // Pay periods
  getPayPeriods: () => request('GET', '/pay-periods'),
  getPayPeriodForDate: (date) => request('GET', `/pay-periods/for-date?date=${date}`),
  generatePayPeriods: (year) => request('POST', '/pay-periods/generate', { year }),
  createPayPeriod: (data) => request('POST', '/pay-periods', data),
  updatePayPeriod: (id, data) => request('PUT', `/pay-periods/${id}`, data),
  deletePayPeriod: (id) => request('DELETE', `/pay-periods/${id}`),

  // Links
  getLinks: () => request('GET', '/links'),
  createLink: (data) => request('POST', '/links', data),
  updateLink: (id, data) => request('PUT', `/links/${id}`, data),
  deleteLink: (id) => request('DELETE', `/links/${id}`),

  // Users
  getUsers: () => request('GET', '/users'),
  createUser: (data) => request('POST', '/users', data),
  updateUser: (id, data) => request('PUT', `/users/${id}`, data),
  changePassword: (id, data) => request('PUT', `/users/${id}/password`, data),

  // Scripts
  getScripts: () => request('GET', '/scripts'),
  createScript: (data) => request('POST', '/scripts', data),
  updateScript: (id, data) => request('PUT', `/scripts/${id}`, data),
  deleteScript: (id) => request('DELETE', `/scripts/${id}`),

  // Info
  getInfo: () => request('GET', '/info'),

  // Reports
  getSummary: (params) => request('GET', `/reports/summary?${new URLSearchParams(params)}`),
  exportCsvUrl: (params) => `${BASE}/reports/export/csv?${new URLSearchParams(params)}&token=${getToken()}`,
  exportExcelUrl: (params) => `${BASE}/reports/export/excel?${new URLSearchParams(params)}&token=${getToken()}`,
  exportPrintUrl: (params) => `${BASE}/reports/export/print?${new URLSearchParams(params)}&token=${getToken()}`,
};
