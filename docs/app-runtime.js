(() => {
  let apiBase = '';
  let publicConfig = {};
  let initPromise = null;

  function normalizeApiBase(raw) {
    return String(raw || '').trim().replace(/\/+$/, '');
  }

  function isCoLocatedApiHost() {
    const host = window.location.hostname.toLowerCase();
    const port = window.location.port;
    if (host === 'localhost' || host === '127.0.0.1') {
      return port === '3000';
    }
    return host.endsWith('.onrender.com');
  }

  function getApiBase() {
    return apiBase;
  }

  function apiUrl(path) {
    const base = getApiBase();
    if (!base) {
      throw new Error('API 尚未初始化，請先呼叫 AppRuntime.init()');
    }
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${base}${normalizedPath}`;
  }

  function getPublicConfig() {
    return publicConfig;
  }

  async function loadLocalConfigFile() {
    const res = await fetch('./app-config.json', { cache: 'no-store' });
    if (!res.ok) {
      throw new Error('無法載入 app-config.json');
    }
    return res.json();
  }

  async function loadPublicConfigFromApi(base) {
    const res = await fetch(`${base}/api/config`, { cache: 'no-store' });
    if (!res.ok) {
      throw new Error(`無法載入 API 設定 (${res.status})`);
    }
    return res.json();
  }

  async function init() {
    if (initPromise) return initPromise;

    initPromise = (async () => {
      if (isCoLocatedApiHost()) {
        apiBase = normalizeApiBase(window.location.origin);
      } else {
        const localCfg = await loadLocalConfigFile();
        apiBase = normalizeApiBase(localCfg.apiBaseUrl);
      }

      if (!apiBase) {
        throw new Error('API base URL 未設定，請由部署環境提供 app-config.json');
      }

      publicConfig = await loadPublicConfigFromApi(apiBase);
      if (publicConfig.apiBaseUrl) {
        apiBase = normalizeApiBase(publicConfig.apiBaseUrl);
      }

      return { apiBase, publicConfig };
    })();

    return initPromise;
  }

  window.AppRuntime = {
    init,
    getApiBase,
    apiUrl,
    getPublicConfig,
  };
})();
