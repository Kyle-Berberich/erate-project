import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const authStorage = localStorage.getItem('erate-auth-storage');
  if (authStorage) {
    const { state } = JSON.parse(authStorage);
    if (state?.token) {
      config.headers.Authorization = `Bearer ${state.token}`;
    }
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('erate-auth-storage');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (email: string, password: string, role?: string) =>
    api.post('/auth/register', { email, password, role }),
  getMe: () => api.get('/auth/me'),
};

// Applications API
export const applicationsApi = {
  getAll: (params?: any) => api.get('/applications', { params }),
  getOne: (id: string) => api.get(`/applications/${id}`),
  create: (data: any) => api.post('/applications', data),
  update: (id: string, data: any) => api.patch(`/applications/${id}`, data),
  delete: (id: string) => api.delete(`/applications/${id}`),
};

// Vendors API
export const vendorsApi = {
  getAll: (params?: any) => api.get('/vendors', { params }),
  getOne: (id: string) => api.get(`/vendors/${id}`),
  create: (data: any) => api.post('/vendors', data),
  update: (id: string, data: any) => api.patch(`/vendors/${id}`, data),
  delete: (id: string) => api.delete(`/vendors/${id}`),
};

// Compliance API
export const complianceApi = {
  getAll: (params?: any) => api.get('/compliance', { params }),
  getOne: (id: string) => api.get(`/compliance/${id}`),
  create: (data: any) => api.post('/compliance', data),
  update: (id: string, data: any) => api.patch(`/compliance/${id}`, data),
  delete: (id: string) => api.delete(`/compliance/${id}`),
};

// Projects API
export const projectsApi = {
  getAll: (params?: any) => api.get('/projects', { params }),
  getOne: (id: string) => api.get(`/projects/${id}`),
  create: (data: any) => api.post('/projects', data),
  update: (id: string, data: any) => api.patch(`/projects/${id}`, data),
  createMilestone: (projectId: string, data: any) =>
    api.post(`/projects/${projectId}/milestones`, data),
  createChecklistItem: (projectId: string, data: any) =>
    api.post(`/projects/${projectId}/checklist`, data),
};

// Dashboard API
export const dashboardApi = {
  getSummary: () => api.get('/dashboard/summary'),
  getFundingTimeline: () => api.get('/dashboard/funding-timeline'),
};

// Reports API
export const reportsApi = {
  getAll: (params?: any) => api.get('/reports', { params }),
  generate: (type: string, data: any) => api.post(`/reports/${type}`, data),
};
