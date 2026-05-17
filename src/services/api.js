const API = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const getToken = () => localStorage.getItem('pc_token');

const headers = (extra = {}) => ({
  'Content-Type': 'application/json',
  ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
  ...extra,
});

const call = async (method, path, body = null) => {
  const opts = { method, headers: headers() };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${API}${path}`, opts);
  const data = await res.json().catch(() => ({ success: false, message: res.statusText }));
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
  return data;
};

// CSV download — uses window.location so the browser handles it natively
export const downloadCSV = (path) => {
  const token = getToken();
  window.open(`${API}${path}?token=${token}`, '_blank');
};

export const api = {
  // Auth
  login:    (u, p)    => call('POST', '/api/auth/login', { username: u, password: p }),
  register: (data)    => call('POST', '/api/auth/register', data),
  me:       ()        => call('GET',  '/api/auth/me'),
  getStaff: ()        => call('GET',  '/api/auth/staff'),

  // Products
  getProducts:    ()       => call('GET',  '/api/products'),
  getProduct:     (id)     => call('GET',  `/api/products/${id}`),
  createProduct:  (data)   => call('POST', '/api/products', data),
  updateProduct:  (id, d)  => call('PUT',  `/api/products/${id}`, d),
  deleteProduct:  (id)     => call('DELETE',`/api/products/${id}`),
  getCategories:  ()       => call('GET',  '/api/inventory/categories'),
  reorderProduct: (id, qty)=> call('POST', `/api/inventory/${id}/reorder`, { quantity: qty }),

  // Sales
  getSales:    (days = 30) => call('GET',  `/api/sales?days=${days}`),
  createSale:  (data)      => call('POST', '/api/sales', data),
  getSalesSummary: ()      => call('GET',  '/api/sales/summary'),

  // Analytics
  getSummary:  ()           => call('GET', '/api/analytics/summary'),
  getCharts:   (days = 30)  => call('GET', `/api/analytics/charts?days=${days}`),
  getCategories2: ()        => call('GET', '/api/analytics/categories'),
  getLowStock: ()           => call('GET', '/api/analytics/low-stock'),

  // Alerts
  getAlerts:      (s)  => call('GET', `/api/alerts${s ? `?status=${s}` : ''}`),
  completeAlert:  (id) => call('PUT', `/api/alerts/${id}/complete`),
  generateAlerts: ()   => call('POST','/api/alerts/generate'),

  // Reports (download)
  downloadInventory: () => downloadCSV('/api/reports/inventory'),
  downloadSales:     () => downloadCSV('/api/reports/sales'),
  downloadLowStock:  () => downloadCSV('/api/reports/low-stock'),

  // Settings
  getSettings:    ()     => call('GET', '/api/settings'),
  updateSettings: (data) => call('PUT', '/api/settings', data),
};

export default api;
