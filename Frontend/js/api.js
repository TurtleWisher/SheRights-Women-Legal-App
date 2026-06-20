// ─────────────────────────────────────────────
// API.JS — Central hub for all backend calls
// Every fetch request goes through this file.
// No other file talks to the backend directly.
// ─────────────────────────────────────────────

// Works both locally and in production automatically.
// The browser fills in the current domain for relative paths.
const BASE_URL = '/api';

// Retrieves the JWT token stored after login
// Returns null if the user is not logged in
function getToken() {
  return localStorage.getItem('sr-token');
}

// Saves the token after successful login
function saveToken(token) {
  localStorage.setItem('sr-token', token);
}

// Removes token on logout
function clearToken() {
  localStorage.removeItem('sr-token');
  localStorage.removeItem('sr-user');
}

// The core request function
// Every API call goes through here so we don't
// repeat headers and error handling in every file
async function request(endpoint, method = 'GET', body = null, auth = true) {
  const headers = { 'Content-Type': 'application/json' };

  // If auth is true, attach the JWT token
  // Without this header, protected routes return 401
  if (auth) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const config = { method, headers };
  if (body) config.body = JSON.stringify(body);

  const response = await fetch(`${BASE_URL}${endpoint}`, config);
  const data = await response.json();

  // If the server returns 401 (unauthorized), the token expired
  // Log the user out and send them back to login
  if (response.status === 401) {
    clearToken();
    window.location.href = '/auth.html';
    return;
  }

  return { ok: response.ok, status: response.status, data };
}

// ─── AUTH ─────────────────────────────────────
const Auth = {
  register: (payload) => request('/auth/register', 'POST', payload, false),
  login:    (payload) => request('/auth/login', 'POST', payload, false),
  me:       ()        => request('/auth/me', 'GET'),
};

// ─── CASES ────────────────────────────────────
const Cases = {
  getAll:       ()         => request('/cases'),
  getOne:       (id)       => request(`/cases/${id}`),
  file:         (payload)  => request('/cases', 'POST', payload),
  updateStatus: (id, data) => request(`/cases/${id}/status`, 'PATCH', data),
};

// ─── EVIDENCE ─────────────────────────────────
// Evidence uses FormData (file upload), not JSON
// So it doesn't go through the normal request() function
const Evidence = {
  upload: async (caseId, formData) => {
    const token = getToken();
    const response = await fetch(`${BASE_URL}/cases/${caseId}/evidence`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });
    const data = await response.json();
    return { ok: response.ok, data };
  },
  getAll: (caseId) => request(`/cases/${caseId}/evidence`),
};

// ─── LEARNING ─────────────────────────────────
const Learn = {
  getAll:       ()          => request('/learn'),
  getOne:       (id)        => request(`/learn/${id}`),
  start:        (id)        => request(`/learn/${id}/start`, 'POST'),
  submitQuiz:   (id, data)  => request(`/learn/${id}/submit`, 'POST', data),
  myProgress:   ()          => request('/learn/my-progress'),
};

// ─── REPORTS ──────────────────────────────────
const Reports = {
  submit:  (payload) => request('/reports', 'POST', payload),
  getMine: ()        => request('/reports/my'),
  getAll:  (filters) => {
    const params = new URLSearchParams(filters).toString();
    return request(`/reports?${params}`);
  },
};

// ─── CHAT ─────────────────────────────────────
const Chat = {
  createSession:  ()   => request('/chat/session', 'POST'),
  getSessions:    ()   => request('/chat/sessions'),
  getMessages:    (id) => request(`/chat/session/${id}`),
  closeSession:   (id) => request(`/chat/session/${id}/close`, 'PATCH'),
};