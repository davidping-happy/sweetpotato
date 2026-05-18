(() => {
  const ADMIN_TOKEN_KEY = 'sweetpotato_admin_token';
  const API_BASE_STORAGE_KEY = 'sweetpotato_admin_api_base';
  const DEFAULT_API_BASE = window.location.origin.includes('localhost')
    ? 'http://localhost:3000'
    : 'https://sweetpotato-api.onrender.com';

  function normalizeValue(value) {
    return String(value || '').trim();
  }

  function normalizeApiBase(raw) {
    const val = normalizeValue(raw).replace(/\/+$/, '');
    return val || '';
  }

  function getApiBase() {
    const saved = localStorage.getItem(API_BASE_STORAGE_KEY);
    return normalizeApiBase(saved || DEFAULT_API_BASE);
  }

  function apiUrl(path) {
    const base = getApiBase();
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${base}${normalizedPath}`;
  }

  function getToken() {
    return normalizeValue(localStorage.getItem(ADMIN_TOKEN_KEY));
  }

  function setToken(token) {
    localStorage.setItem(ADMIN_TOKEN_KEY, normalizeValue(token));
  }

  async function requireAdminSession(options = {}) {
    const loginPath = options.loginPath || './admin-login.html';
    const redirectOnFail = options.redirectOnFail !== false;
    const token = getToken();
    if (!token) {
      if (redirectOnFail) window.location.replace(`${loginPath}?reason=unauthorized`);
      return null;
    }

    try {
      const res = await fetch(apiUrl('/api/admin/me'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        throw new Error(json.message || '登入已失效');
      }
      return { token, user: json.data || null };
    } catch (_) {
      localStorage.removeItem(ADMIN_TOKEN_KEY);
      if (redirectOnFail) {
        window.location.replace(`${loginPath}?reason=unauthorized`);
      }
      return null;
    }
  }

  async function signInWithPassword(email, password) {
    const res = await fetch(apiUrl('/api/admin/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: normalizeValue(email),
        password: String(password || ''),
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.success || !json.token) {
      return { data: null, error: { message: json.message || `HTTP ${res.status}` } };
    }
    setToken(json.token);
    return {
      data: { session: { access_token: json.token }, user: json.user || null },
      error: null,
    };
  }

  async function requestPasswordReset(email) {
    const res = await fetch(apiUrl('/api/admin/forgot-password'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: normalizeValue(email) }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.success) {
      return { data: null, error: { message: json.message || `HTTP ${res.status}` } };
    }
    return { data: { message: json.message }, error: null };
  }

  async function resetPasswordWithToken(token, password) {
    const res = await fetch(apiUrl('/api/admin/reset-password'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: normalizeValue(token),
        password: String(password || ''),
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.success) {
      return { data: null, error: { message: json.message || `HTTP ${res.status}` } };
    }
    return { data: { message: json.message, email: json.email }, error: null };
  }

  async function getAuthHeaders() {
    const token = getToken();
    if (!token) {
      return null;
    }
    return {
      Authorization: `Bearer ${token}`,
    };
  }

  async function signOut() {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    return {
      data: {
        session: null,
      },
      error: null,
    };
  }

  window.AdminAuth = {
    getApiBase,
    apiUrl,
    getToken,
    setToken,
    getAuthHeaders,
    requireAdminSession,
    signInWithPassword,
    requestPasswordReset,
    resetPasswordWithToken,
    signOut,
  };
})();
