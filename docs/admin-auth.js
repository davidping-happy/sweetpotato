(() => {
  const SUPABASE_URL_KEY = 'sweetpotato_supabase_url';
  const SUPABASE_ANON_KEY = 'sweetpotato_supabase_anon_key';

  function normalizeValue(value) {
    return String(value || '').trim();
  }

  function getStoredConfig() {
    return {
      url: normalizeValue(localStorage.getItem(SUPABASE_URL_KEY)),
      anonKey: normalizeValue(localStorage.getItem(SUPABASE_ANON_KEY)),
    };
  }

  function saveConfig(url, anonKey) {
    localStorage.setItem(SUPABASE_URL_KEY, normalizeValue(url));
    localStorage.setItem(SUPABASE_ANON_KEY, normalizeValue(anonKey));
  }

  function getClient() {
    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
      throw new Error('Supabase SDK 尚未載入');
    }
    const config = getStoredConfig();
    if (!config.url || !config.anonKey) {
      throw new Error('尚未設定 Supabase URL / Anon Key');
    }
    return window.supabase.createClient(config.url, config.anonKey);
  }

  async function requireAdminSession(options = {}) {
    const loginPath = options.loginPath || './admin-login.html';
    let client;
    try {
      client = getClient();
    } catch (err) {
      window.location.replace(`${loginPath}?reason=config`);
      return null;
    }

    const { data, error } = await client.auth.getSession();
    if (error || !data?.session) {
      window.location.replace(`${loginPath}?reason=unauthorized`);
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

  async function signOut() {
    const client = getClient();
    return client.auth.signOut();
  }

  window.AdminAuth = {
    SUPABASE_URL_KEY,
    SUPABASE_ANON_KEY,
    getStoredConfig,
    saveConfig,
    getClient,
    requireAdminSession,
    signInWithPassword,
    signOut,
  };
})();
