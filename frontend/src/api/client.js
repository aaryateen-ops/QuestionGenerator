const API_BASE = '/api/v1';

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('qp_token');
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...options.headers,
    },
  };

  const response = await fetch(`${API_BASE}${endpoint}`, config);

  if (response.status === 204) {
    return null;
  }

  let data;
  try { data = await response.json(); }
  catch { throw new Error('The server returned an unreadable response. Check the connection and retry.'); }
  if (!response.ok) {
    const detail = typeof data.detail === 'string' ? data.detail : null;
    const error = new Error(data.message || detail || 'Check your input and try again.');
    error.status = response.status;
    error.code = data.error_code;
    throw error;
  }
  return data;
}

export const api = {
  // Authentication & RBAC
  login: (payload) => request('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  register: (payload) => request('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  getMe: () => request('/auth/me'),
  getUsers: () => request('/auth/users'),
  getRuntimeConfig: () => request('/auth/config'),
  createUser: payload => request('/auth/users', { method: 'POST', body: JSON.stringify(payload) }),
  getUserSubjects: userId => request(`/auth/users/${userId}/subjects`),
  setUserSubjects: (userId, subjectIds) => request(`/auth/users/${userId}/subjects`, { method: 'PUT', body: JSON.stringify({ subject_ids: subjectIds }) }),
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
  getQuestionPage: (params = {}, signal) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => { if (value !== undefined && value !== null && value !== '') query.set(key, value); });
    return request(`/questions/page?${query}`, { signal });
  },
  getQuestionHistory: questionId => request(`/questions/${questionId}/history`),
  reviewQuestion: (questionId, payload) => request(`/questions/${questionId}/review`, { method: 'POST', body: JSON.stringify(payload) }),
  batchReviewQuestions: (questionIds, payload) => request('/questions/batch-review', { method: 'POST', body: JSON.stringify({ question_ids: questionIds, ...payload }) }),
  checkQuestionDuplicates: payload => request('/questions/check-duplicates', { method: 'POST', body: JSON.stringify(payload) }),
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
  scanQuestionImage: async (formData, signal) => {
    const token = localStorage.getItem('qp_token');
    const res = await fetch(`${API_BASE}/nlp/scan-image`, {
      method: 'POST', body: formData, signal,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    let data;
    try { data = await res.json(); }
    catch { throw new Error('Image scanning returned an invalid response. Please try again.'); }
    if (!res.ok) {
      const detail = typeof data.detail === 'string' ? data.detail : null;
      throw new Error(data.message || detail || 'Image scanning failed. Check your photo and scan settings.');
    }
    return data;
  },

  // Paper Generator & PDF Export
  listPapers: () => request('/papers'),
  getPaper: (id) => request(`/papers/${id}`),
  getPaperQuality: id => request(`/papers/${id}/quality`),
  generatePaper: (payload) => request('/papers/generate', { method: 'POST', body: JSON.stringify(payload) }),
  getSwapCandidates: (paperId, questionId) => request(`/papers/${paperId}/swap-candidates/${questionId}`),
  swapQuestion: (payload) => request('/papers/swap', { method: 'POST', body: JSON.stringify(payload) }),
  getDownloadPdfUrl: (paperId) => `${API_BASE}/papers/${paperId}/download-pdf`,
  downloadPaperPdf: async (paperId, paperCode) => {
    const token = localStorage.getItem('qp_token');
    const response = await fetch(`${API_BASE}/papers/${paperId}/download-pdf`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.message || data.detail || 'Unable to download this examination paper.');
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(paperCode || 'Examination').replace(/[^a-z0-9_-]/gi, '_')}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
};
