function normalizeBaseUrl(raw) {
  return String(raw || '').trim().replace(/\/+$/, '');
}

function getConfiguredPublicApiBaseUrl() {
  const configured = normalizeBaseUrl(process.env.PUBLIC_API_BASE_URL);
  if (configured) return configured;
  return normalizeBaseUrl(process.env.ADMIN_APP_URL);
}

function getPublicApiBaseUrlFromRequest(req) {
  const configured = getConfiguredPublicApiBaseUrl();
  if (configured) return configured;

  const proto = String(req.headers['x-forwarded-proto'] || req.protocol || 'https').split(',')[0].trim();
  const host = String(req.headers['x-forwarded-host'] || req.get('host') || '').trim();
  if (!host) return '';
  return normalizeBaseUrl(`${proto}://${host}`);
}

function getPublicAppConfig(req) {
  const { getPublicLineConfig } = require('./lineLoginConfig');
  const { getPublicLiffConfig } = require('./liffConfig');
  return {
    ...getPublicLineConfig(),
    ...getPublicLiffConfig(),
    apiBaseUrl: getPublicApiBaseUrlFromRequest(req),
  };
}

module.exports = {
  getConfiguredPublicApiBaseUrl,
  getPublicApiBaseUrlFromRequest,
  getPublicAppConfig,
};
