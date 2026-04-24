(() => {
  function normalizeValue(value) {
    return String(value || '').trim();
  }

  function getConfigFromWindow() {
    const cfg = window.SWEETPOTATO_ADMIN_CONFIG || {};
    return {
      url: normalizeValue(cfg.supabaseUrl),
      anonKey: normalizeValue(cfg.supabaseAnonKey),
    };
  }

  function getClient() {
    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
      throw new Error('Supabase SDK 尚未載入');
    }
    const config = getConfigFromWindow();
    if (!config.url || !config.anonKey) {
      throw new Error('尚未設定 admin-config.js 的 Supabase URL / Anon Key');
    }
    return window.supabase.createClient(config.url, config.anonKey);
  }

  async function requireAdminSession(options = {}) {
    const loginPath = options.loginPath || './admin-login.html';
    const redirectOnFail = options.redirectOnFail !== false;
    let client;
    try {
      client = getClient();
    } catch (err) {
      if (redirectOnFail) {
        window.location.replace(`${loginPath}?reason=config`);
      }
      return null;
    }

    const { data, error } = await client.auth.getSession();
    if (error || !data?.session) {
      if (redirectOnFail) {
        window.location.replace(`${loginPath}?reason=unauthorized`);
      }
      return null;
    }
    return { client, session: data.session };
  }

  async function signInWithPassword(email, password) {
    const client = getClient();
    return client.auth.signInWithPassword({
      email: normalizeValue(email),
      password: String(password || ''),
    });
  }

  async function requestPasswordReset(email, redirectTo) {
    const client = getClient();
    return client.auth.resetPasswordForEmail(normalizeValue(email), {
      redirectTo: normalizeValue(redirectTo),
    });
  }

  async function updatePassword(newPassword) {
    const client = getClient();
    return client.auth.updateUser({ password: String(newPassword || '') });
  }

  async function signOut() {
    const client = getClient();
    return client.auth.signOut();
  }

  window.AdminAuth = {
    getConfigFromWindow,
    getClient,
    requireAdminSession,
    signInWithPassword,
    requestPasswordReset,
    updatePassword,
    signOut,
  };
})();
