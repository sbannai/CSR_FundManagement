import axios from 'axios';

const BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({ baseURL: BASE, timeout: 30000 });

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('csr_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  r => r.data,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('csr_token');
      localStorage.removeItem('csr_user');
      window.location.href = '/';
    }
    return Promise.reject(new Error(err.response?.data?.error || err.message));
  }
);

// Upload helper
export const uploadFile = (url, formData, onProgress) => {
  const token = localStorage.getItem('csr_token');
  return axios.post(`${BASE}${url}`, formData, {
    headers: { Authorization: `Bearer ${token}` },
    onUploadProgress: e => onProgress && onProgress(Math.round((e.loaded * 100) / e.total)),
  }).then(r => r.data);
};

export const authAPI = {
  login:      d  => api.post('/auth/login', d),
  me:         () => api.get('/auth/me'),
  users:      () => api.get('/auth/users'),
  createUser: d  => api.post('/auth/users', d),
  updateUser: (id,d) => api.put(`/auth/users/${id}`, d),
  changePass: d  => api.put('/auth/password', d),
};

export const donorAPI = {
  list:       p  => api.get('/donors', { params: p }),
  get:        id => api.get(`/donors/${id}`),
  create:     d  => api.post('/donors', d),
  update:     (id,d) => api.put(`/donors/${id}`, d),
  delete:     id => api.delete(`/donors/${id}`),
  sendEmail:  (id,d) => api.post(`/donors/${id}/email`, d),
  uploadDoc:  (id,fd,prog) => uploadFile(`/donors/${id}/documents`, fd, prog),
};

export const branchAPI = {
  list:   p  => api.get('/branches', { params: p }),
  get:    id => api.get(`/branches/${id}`),
  create: d  => api.post('/branches', d),
  update: (id,d) => api.put(`/branches/${id}`, d),
  delete: id => api.delete(`/branches/${id}`),
};

export const proposalAPI = {
  list:    p  => api.get('/proposals', { params: p }),
  get:     id => api.get(`/proposals/${id}`),
  create:  d  => api.post('/proposals', d),
  update:  (id,d) => api.put(`/proposals/${id}`, d),
  submit:  id => api.patch(`/proposals/${id}/submit`),
  approve: (id,d) => api.patch(`/proposals/${id}/approve`, d),
  reject:  (id,d) => api.patch(`/proposals/${id}/reject`, d),
  uploadDoc:(id,fd,prog) => uploadFile(`/proposals/${id}/documents`, fd, prog),
};

export const allocationAPI = {
  list:   p  => api.get('/allocations', { params: p }),
  get:    id => api.get(`/allocations/${id}`),
  create: d  => api.post('/allocations', d),
  update: (id,d) => api.put(`/allocations/${id}`, d),
  setStatus:(id,status) => api.patch(`/allocations/${id}/status`, { status }),
};

export const utilizationAPI = {
  list:   p  => api.get('/utilizations', { params: p }),
  get:    id => api.get(`/utilizations/${id}`),
  create: (fd,prog) => uploadFile('/utilizations', fd, prog),
  verify: (id,d) => api.patch(`/utilizations/${id}/verify`, d),
  addBills:(id,fd,prog) => uploadFile(`/utilizations/${id}/bills`, fd, prog),
};

export const reportAPI = {
  dashboard:    () => api.get('/reports/dashboard'),
  fundFlow:     p  => api.get('/reports/fund-flow', { params: p }),
  branchSummary:() => api.get('/reports/branch-summary'),
  donorReport:  id => api.get(`/reports/donor-report/${id}`),
  communications:p => api.get('/reports/communications', { params: p }),
};

export default api;
