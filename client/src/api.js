import { t } from 'i18next';

const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json() : null;
  if (!res.ok) {
    const error = new Error(data?.error || t('errors.requestFailed', { status: res.status }));
    error.status = res.status;
    throw error;
  }
  return data;
}

export const api = {
  getDestinations: () => request('/destinations'),
  getCategories: () => request('/categories'),
  getPackages: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v));
    return request('/packages' + (qs.toString() ? `?${qs}` : ''));
  },
  getPackage: (id) => request(`/packages/${id}`),
  compare: (ids) => request(`/compare?ids=${ids.join(',')}`),
  getTestimonials: () => request('/testimonials'),

  me: () => request('/auth/me'),
  login: (email, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (name, email, password) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) }),
  logout: () => request('/auth/logout', { method: 'POST' }),

  createBooking: (payload) =>
    request('/bookings', { method: 'POST', body: JSON.stringify(payload) }),
  myBookings: () => request('/bookings/mine'),

  sendContact: (payload) =>
    request('/contact', { method: 'POST', body: JSON.stringify(payload) }),

  adminBookings: () => request('/admin/bookings'),
  adminUpdateBooking: (id, status) =>
    request(`/admin/bookings/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  adminStats: () => request('/admin/stats'),

  getConfig: () => request('/config'),
  getSite: () => request('/site'),
  getCurrencies: () => request('/currencies'),
  setCurrency: (code) => request('/currency', { method: 'PUT', body: JSON.stringify({ code }) }),

  getBlog: () => request('/blog'),
  getFaqs: () => request('/faqs'),

  updateBooking: (id, payload) =>
    request(`/bookings/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  cancelBooking: (id) => request(`/bookings/${id}/cancel`, { method: 'POST' }),

  adminUsers: () => request('/admin/users'),
  adminSetUserActive: (id, is_active) =>
    request(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify({ is_active }) }),
  adminMessages: () => request('/admin/messages'),

  adminCurrencies: () => request('/admin/currencies'),
  adminAddCurrency: (data) => request('/admin/currencies', { method: 'POST', body: JSON.stringify(data) }),
  adminUpdateCurrency: (code, enabled) =>
    request(`/admin/currencies/${code}`, { method: 'PATCH', body: JSON.stringify({ enabled }) }),
  adminDeleteCurrency: (code) => request(`/admin/currencies/${code}`, { method: 'DELETE' }),
  adminRefreshRates: () => request('/admin/currencies/refresh', { method: 'POST' }),
  adminSite: () => request('/admin/site'),
  adminSaveSite: (data) => request('/admin/site', { method: 'PUT', body: JSON.stringify(data) }),

  // packages, destinations, testimonials, blog and faqs all work the same way
  adminCreate: (resource, data) =>
    request(`/admin/${resource}`, { method: 'POST', body: JSON.stringify(data) }),
  adminUpdate: (resource, id, data) =>
    request(`/admin/${resource}/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  adminDelete: (resource, id) => request(`/admin/${resource}/${id}`, { method: 'DELETE' }),
};

export function formatCurrency(amount) {
  return t('price.lkr', { amount: Number(amount).toLocaleString('en-LK') });
}
