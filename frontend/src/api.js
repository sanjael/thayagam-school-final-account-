export const BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://thayagam-school-final-account.onrender.com' : 'http://localhost:8000');
const BASE = BASE_URL;

async function request(path, options = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Request failed');
  return data;
}

export const api = {
  login: (username, password) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  getMe: () => request('/auth/me'),
  changePassword: (old_password, new_password) =>
    request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ old_password, new_password }),
    }),

  // User Management (admin only)
  getUsers: () => request('/users/'),
  createUser: (data) => request('/users/', { method: 'POST', body: JSON.stringify(data) }),
  toggleUser: (id) => request(`/users/${id}/toggle`, { method: 'PUT' }),
  resetUserPassword: (id) => request(`/users/${id}/reset-password`, { method: 'PUT' }),
  deleteUser: (id) => request(`/users/${id}`, { method: 'DELETE' }),

  // Dashboard summary
  getSummary: (academic_year) =>
    request(`/reports/summary${academic_year ? `?academic_year=${academic_year}` : ''}`),
  getStudentFeeBreakdown: (studentId) => request(`/reports/student-fee-breakdown/${studentId}`),

  // Classes
  getClasses: () => request('/classes/'),
  getClass: (id) => request(`/classes/${id}`),
  getClassFees: (id) => request(`/classes/${id}/fees`),
  createClass: (data) => request('/classes/', { method: 'POST', body: JSON.stringify(data) }),
  deleteClass: (id) => request(`/classes/${id}`, { method: 'DELETE' }),

  // Students
  getStudents: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/students/?${q}`);
  },
  getStudent: (id) => request(`/students/${id}`),
  createStudent: (data) => request('/students/', { method: 'POST', body: JSON.stringify(data) }),
  updateStudent: (id, data) => request(`/students/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteStudent: (id) => request(`/students/${id}`, { method: 'DELETE' }),

  // Fee Structure
  getFeeStructure: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/fee-structure/?${q}`);
  },
  createFeeStructure: (data) => request('/fee-structure/', { method: 'POST', body: JSON.stringify(data) }),
  deleteFeeStructure: (id) => request(`/fee-structure/${id}`, { method: 'DELETE' }),

  // Payments
  getPayments: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/payments/?${q}`);
  },
  createPayment: (data) => request('/payments/', { method: 'POST', body: JSON.stringify(data) }),
  cancelPayment: (paymentId, reason) => request(`/payments/${paymentId}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) }),
  getFeeStatus: (studentId, term, academicYear) =>
    request(`/payments/fee-status?student_id=${studentId}&term=${encodeURIComponent(term)}&academic_year=${encodeURIComponent(academicYear)}`),

  // Reports
  getPendingReport: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/reports/pending?${q}`);
  },
  getDayBook: (date) => request(`/reports/daybook${date ? `?date=${date}` : ''}`),
  getClassWiseReport: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/reports/class-wise?${q}`);
  },
  getTimeAnalytics: () => request('/reports/time-analytics'),
  getYearlyAnalytics: () => request('/reports/yearly-analytics'),
  getNotifications: () => request('/reports/notifications'),
  getCollectionTrend: (period) => request(`/reports/collection-trend?period=${period}`),
  getRecentPayments: (limit = 5) => request(`/reports/recent-payments?limit=${limit}`),

  // Audit Logs
  getAuditLogs: () => request('/audit-logs/'),

  // Settings
  getSettings: () => request('/settings/'),
  updateSettings: (data) => request('/settings/', { method: 'PUT', body: JSON.stringify(data) }),
  uploadLogo: (file) => {
    const token = localStorage.getItem('token');
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const form = new FormData();
    form.append('file', file);
    return fetch(`${BASE}/settings/logo`, {
      method: 'POST',
      headers,
      body: form,
    }).then(async (res) => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Upload failed');
      return data;
    });
  },

  // Receipt PDF URL
  receiptPdfUrl: (paymentId) => `${BASE}/receipts/${paymentId}/pdf`,

  // Van Fees
  getVanRiders: () => request('/van-fees/riders'),
  allocateVanRider: (student_id, monthly_fee) => request('/van-fees/riders', { method: 'POST', body: JSON.stringify({ student_id, monthly_fee }) }),
  deallocateVanRider: (student_id) => request(`/van-fees/riders/${student_id}`, { method: 'DELETE' }),
  payVanFee: (data) => request('/van-fees/pay', { method: 'POST', body: JSON.stringify(data) }),
  getVanPayments: (academic_year) => request(`/van-fees/payments${academic_year ? `?academic_year=${academic_year}` : ''}`),
  cancelVanPayment: (id) => request(`/van-fees/payments/${id}/cancel`, { method: 'PUT' }),
  getVanDuesReport: (academic_year) => request(`/van-fees/reports/dues${academic_year ? `?academic_year=${academic_year}` : ''}`),
};
