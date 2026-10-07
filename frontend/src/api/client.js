const API_BASE = '/api/v1';

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('qp_token');
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...options.headers,
    },
    ...options,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, config);

  if (response.status === 204) {
    return null;
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || data.message || 'API request failed');
  }
  return data;
}

export const api = {
  // Authentication & RBAC
  login: (payload) => request('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  register: (payload) => request('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  getMe: () => request('/auth/me'),
  getUsers: () => request('/auth/users'),
  updateUserStatus: (userId, payload) =>
    request(`/auth/users/${userId}/status`, { method: 'PUT', body: JSON.stringify(payload) }),

  // Subjects & Syllabus
  getSubjects: () => request('/subjects'),
  getSubjectDetail: (id) => request(`/subjects/${id}`),
  createSubject: (payload) => request('/subjects', { method: 'POST', body: JSON.stringify(payload) }),
  updateSubject: (id, payload) => request(`/subjects/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteSubject: (id) => request(`/subjects/${id}`, { method: 'DELETE' }),
  addUnit: (subjectId, payload) => request(`/subjects/${subjectId}/units`, { method: 'POST', body: JSON.stringify(payload) }),
  updateUnit: (subjectId, unitId, payload) => request(`/subjects/${subjectId}/units/${unitId}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteUnit: (subjectId, unitId) => request(`/subjects/${subjectId}/units/${unitId}`, { method: 'DELETE' }),
  addCO: (subjectId, payload) => request(`/subjects/${subjectId}/cos`, { method: 'POST', body: JSON.stringify(payload) }),
  updateCO: (subjectId, coId, payload) => request(`/subjects/${subjectId}/cos/${coId}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteCO: (subjectId, coId) => request(`/subjects/${subjectId}/cos/${coId}`, { method: 'DELETE' }),

  // Question Bank
  getQuestions: (params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') query.append(k, v);
    });
    return request(`/questions?${query.toString()}`);
  },
  createQuestion: (payload) => request('/questions', { method: 'POST', body: JSON.stringify(payload) }),
  updateQuestion: (id, payload) => request(`/questions/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteQuestion: (id) => request(`/questions/${id}`, { method: 'DELETE' }),
  batchDeleteQuestions: (questionIds) =>
    request('/questions/batch-delete', { method: 'POST', body: JSON.stringify({ question_ids: questionIds }) }),
  batchAssignQuestions: (payload) =>
    request('/questions/batch-assign', { method: 'POST', body: JSON.stringify(payload) }),
  bulkImport: (payload) => request('/questions/bulk-import', { method: 'POST', body: JSON.stringify(payload) }),
  uploadDocumentFile: async (subjectId, file) => {
    const token = localStorage.getItem('qp_token');
    const formData = new FormData();
    formData.append('subject_id', subjectId);
    formData.append('file', file);
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const res = await fetch(`${API_BASE}/questions/upload-file`, {
      method: 'POST',
      headers,
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || data.message || 'File upload failed');
    return data;
  },
  getRepositoryStats: (subjectId) => request(`/questions/stats/${subjectId}`),

  // NLP Engine & Generative AI Synthesizer
  classifyQuestion: (questionText, subjectId) =>
    request('/nlp/classify', {
      method: 'POST',
      body: JSON.stringify({ question_text: questionText, subject_id: subjectId }),
    }),
  validateApiKey: (apiKey) =>
    request('/nlp/validate-api-key', {
      method: 'POST',
      body: JSON.stringify({ api_key: apiKey }),
    }),
  synthesizeQuestions: (payload) =>
    request('/nlp/synthesize', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  synthesizeFromDocument: async (formData) => {
    const token = localStorage.getItem('qp_token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const res = await fetch(`${API_BASE}/nlp/synthesize-from-document`, {
      method: 'POST',
      headers,
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || data.message || 'Document question synthesis failed');
    return data;
  },

  // Paper Generator & PDF Export
  listPapers: () => request('/papers'),
  getPaper: (id) => request(`/papers/${id}`),
  generatePaper: (payload) => request('/papers/generate', { method: 'POST', body: JSON.stringify(payload) }),
  getSwapCandidates: (paperId, questionId) => request(`/papers/${paperId}/swap-candidates/${questionId}`),
  swapQuestion: (payload) => request('/papers/swap', { method: 'POST', body: JSON.stringify(payload) }),
  getDownloadPdfUrl: (paperId) => `${API_BASE}/papers/${paperId}/download-pdf`,
};
