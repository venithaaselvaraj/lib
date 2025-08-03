import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Books API
export const booksAPI = {
  getAll: (params) => api.get('/books', { params }),
  getById: (id) => api.get(`/books/${id}`),
  create: (data) => api.post('/books', data),
  update: (id, data) => api.put(`/books/${id}`, data),
  delete: (id) => api.delete(`/books/${id}`),
  getGenres: () => api.get('/books/metadata/genres'),
};

// Members API
export const membersAPI = {
  getAll: (params) => api.get('/members', { params }),
  getById: (id) => api.get(`/members/${id}`),
  create: (data) => api.post('/members', data),
  update: (id, data) => api.put(`/members/${id}`, data),
  delete: (id) => api.delete(`/members/${id}`),
};

// Borrowing API
export const borrowingAPI = {
  getAll: (params) => api.get('/borrowing', { params }),
  borrow: (data) => api.post('/borrowing/borrow', data),
  return: (id, data) => api.post(`/borrowing/return/${id}`, data),
  renew: (id, data) => api.post(`/borrowing/renew/${id}`, data),
  getOverdue: () => api.get('/borrowing/overdue'),
};

// Dashboard API
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
  getTrends: () => api.get('/dashboard/trends'),
  getPopularBooks: (limit) => api.get('/dashboard/popular-books', { params: { limit } }),
  getGenreDistribution: () => api.get('/dashboard/genre-distribution'),
  getMemberActivity: () => api.get('/dashboard/member-activity'),
  getOverdueSummary: () => api.get('/dashboard/overdue-summary'),
};

export default api;