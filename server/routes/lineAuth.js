const express = require('express');
const crypto = require('crypto');
const {
  getLineLoginCredentials,
  isLineLoginConfigured,
  getLineLoginCallbackUrl,
  getDefaultStorefrontUrl,
  isAllowedReturnUrl,
  getStaticCallbackUrl,
} = require('../utils/lineLoginConfig');
const { saveOAuthState, consumeOAuthState } = require('../utils/lineOAuthState');

const router = express.Router();

// 記憶體備援（本機開發用）
const memoryStates = new Map();

function buildRedirectUrl(baseUrl, params) {
  const url = new URL(baseUrl);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });
  return url.toString();
}

function mapLineOAuthError(raw) {
  const msg = String(raw || '').trim();
  if (!msg) return 'LINE 登入失敗，請稍後再試';
  if (msg.includes('access_denied')) return '您已取消 LINE 登入';
  if (msg.includes('invalid_client') || msg.includes('invalid_request')) {
    return 'LINE Login 設定錯誤：請確認 Render 的 LINE_LOGIN_CHANNEL_ID / SECRET 來自「LINE Login」頻道（不是 Messaging API）';
  }
  if (msg.includes('redirect_uri') || msg.includes('callback')) {
    return `Callback URL 不符，請在 LINE Login 頻道設定為：${getStaticCallbackUrl()}`;
  }
  if (msg.includes('無法正常執行')) {
    return 'LINE 無法啟動登入：請確認已建立 LINE Login 頻道，且 Callback URL 完全一致';
  }
  return msg;
}

async function persistState(state, returnUrl) {
  const payload = { returnUrl, expiresAt: Date.now() + 10 * 60 * 1000 };
  memoryStates.set(state, payload);
  try {
    await saveOAuthState(state, payload);
  } catch (err) {
    console.error('LINE OAuth state 寫入檔案失敗:', err.message);
  }
}

async function loadState(state) {
  const fromMemory = memoryStates.get(state);
  if (fromMemory && fromMemory.expiresAt > Date.now()) {
    memoryStates.delete(state);
    return fromMemory;
  }
  try {
    return await consumeOAuthState(state);
  } catch (err) {
    console.error('LINE OAuth state 讀取失敗:', err.message);
    return null;
  }
}

router.get('/login/start', async (req, res) => {
  const defaultReturn = getDefaultStorefrontUrl();

  if (!isLineLoginConfigured()) {
    return res.redirect(buildRedirectUrl(defaultReturn, {
      lineBind: 'error',
      lineBindMessage: 'LINE Login 尚未設定（Render 需設定 LINE_LOGIN_CHANNEL_ID / SECRET）',
    }));
  }

  const returnUrlRaw = String(req.query.returnUrl || '').trim() || defaultReturn;
  let returnUrl;
  try {
    const parsed = new URL(returnUrlRaw);
    returnUrl = isAllowedReturnUrl(returnUrlRaw) ? parsed.toString() : defaultReturn;
  } catch {
    returnUrl = defaultReturn;
  }

  const { channelId } = getLineLoginCredentials();
  const callbackUrl = getLineLoginCallbackUrl(req);
  const state = crypto.randomBytes(16).toString('hex');

  await persistState(state, returnUrl);

  const authorizeUrl = new URL('https://access.line.me/oauth2/v2.1/authorize');
  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set('client_id', channelId);
  authorizeUrl.searchParams.set('redirect_uri', callbackUrl);
  authorizeUrl.searchParams.set('state', state);
  // 僅 profile：避免未啟用 OpenID Connect 時 LINE 顯示「無法正常執行」
  authorizeUrl.searchParams.set('scope', 'profile');

  console.log('LINE Login start:', { callbackUrl, returnUrl });

  return res.redirect(authorizeUrl.toString());
});

router.get('/login/callback', async (req, res) => {
  const defaultReturn = getDefaultStorefrontUrl();
  const code = String(req.query.code || '').trim();
  const state = String(req.query.state || '').trim();
  const oauthError = String(req.query.error || '').trim();
  const oauthDesc = String(req.query.error_description || '').trim();

  if (oauthError) {
    const message = mapLineOAuthError(oauthDesc || oauthError);
    return res.redirect(buildRedirectUrl(defaultReturn, {
      lineBind: 'error',
      lineBindMessage: message,
    }));
  }

  const saved = await loadState(state);
  const returnUrl = saved?.returnUrl && isAllowedReturnUrl(saved.returnUrl)
    ? saved.returnUrl
    : defaultReturn;

  if (!code || !saved) {
    return res.redirect(buildRedirectUrl(returnUrl, {
      lineBind: 'error',
      lineBindMessage: '登入逾時，請重新點「綁定 LINE 通知」',
    }));
  }

  if (!isLineLoginConfigured()) {
    return res.redirect(buildRedirectUrl(returnUrl, {
      lineBind: 'error',
      lineBindMessage: 'LINE Login 尚未設定',
    }));
  }

  const { channelId, channelSecret } = getLineLoginCredentials();
  const callbackUrl = getLineLoginCallbackUrl(req);

  try {
    const tokenRes = await fetch('https://api.line.me/oauth2/v2.1/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: callbackUrl,
        client_id: channelId,
        client_secret: channelSecret,
      }),
    });
    const tokenJson = await tokenRes.json().catch(() => ({}));
    if (!tokenRes.ok || !tokenJson.access_token) {
      throw new Error(tokenJson.error_description || tokenJson.error || `token HTTP ${tokenRes.status}`);
    }

    const profileRes = await fetch('https://api.line.me/v2/profile', {
      headers: { Authorization: `Bearer ${tokenJson.access_token}` },
    });
    const profile = await profileRes.json().catch(() => ({}));
    if (!profileRes.ok || !profile.userId) {
      throw new Error(profile.message || `profile HTTP ${profileRes.status}`);
    }

    return res.redirect(buildRedirectUrl(returnUrl, {
      lineBind: 'ok',
      lineUserId: profile.userId,
      lineName: profile.displayName || '',
    }));
  } catch (err) {
    console.error('LINE Login callback error:', err.message);
    return res.redirect(buildRedirectUrl(returnUrl, {
      lineBind: 'error',
      lineBindMessage: mapLineOAuthError(err.message),
    }));
  }
});

module.exports = router;
