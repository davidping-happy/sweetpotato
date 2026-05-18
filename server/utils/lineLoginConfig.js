const DEFAULT_STOREFRONT_URL = 'https://davidping-happy.github.io/sweetpotato/docs/index.html';

function getLineLoginCredentials() {
  const channelId = String(process.env.LINE_LOGIN_CHANNEL_ID || '').trim();
  const channelSecret = String(process.env.LINE_LOGIN_CHANNEL_SECRET || '').trim();
  return { channelId, channelSecret };
}

function isLineLoginConfigured() {
  const { channelId, channelSecret } = getLineLoginCredentials();
  return Boolean(channelId && channelSecret);
}

function getLineLoginCallbackUrl(req) {
  const configured = String(process.env.LINE_LOGIN_CALLBACK_URL || '').trim();
  if (configured) return configured.replace(/\/+$/, '');
  const proto = String(req.headers['x-forwarded-proto'] || req.protocol || 'https').split(',')[0].trim();
  const hostname = String(req.headers['x-forwarded-host'] || req.get('host') || 'sweetpotato-api.onrender.com').trim();
  return `${proto}://${hostname}/api/line/login/callback`;
}

function getDefaultStorefrontUrl() {
  return String(process.env.LINE_STOREFRONT_URL || DEFAULT_STOREFRONT_URL).trim();
}

function isAllowedReturnUrl(rawUrl) {
  try {
    const url = new URL(String(rawUrl || '').trim());
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return false;
    const host = url.hostname.toLowerCase();
    const allowedHosts = [
      'davidping-happy.github.io',
      'localhost',
      '127.0.0.1',
    ];
    if (allowedHosts.includes(host)) return true;
    if (host.endsWith('.github.io')) return true;
    return false;
  } catch {
    return false;
  }
}

function getStaticCallbackUrl() {
  const configured = String(process.env.LINE_LOGIN_CALLBACK_URL || '').trim();
  if (configured) return configured.replace(/\/+$/, '');
  return 'https://sweetpotato-api.onrender.com/api/line/login/callback';
}

function getPublicLineConfig() {
  const configured = isLineLoginConfigured();
  let lineLoginConfigError = '';
  if (!configured) {
    lineLoginConfigError =
      '請在 LINE Developers 建立「LINE Login」類型 Channel，並於 Render 設定 LINE_LOGIN_CHANNEL_ID 與 LINE_LOGIN_CHANNEL_SECRET。';
  }

  return {
    lineLoginEnabled: configured,
    lineLoginConfigError,
    lineLoginCallbackUrl: getStaticCallbackUrl(),
    lineCustomerNotifyEnabled: Boolean(String(process.env.LINE_CHANNEL_ACCESS_TOKEN || '').trim()),
    lineBindMethod: 'login',
  };
}

module.exports = {
  getLineLoginCredentials,
  isLineLoginConfigured,
  getLineLoginCallbackUrl,
  getStaticCallbackUrl,
  getDefaultStorefrontUrl,
  isAllowedReturnUrl,
  getPublicLineConfig,
};
