const express = require('express');
const crypto = require('crypto');
const {
  getLineLoginCredentials,
  isLineLoginConfigured,
  getLineLoginCallbackUrl,
  getDefaultStorefrontUrl,
  isAllowedReturnUrl,
} = require('../utils/lineLoginConfig');

const router = express.Router();

const oauthStates = new Map();
const STATE_TTL_MS = 10 * 60 * 1000;

function pruneStates() {
  const now = Date.now();
  for (const [key, value] of oauthStates.entries()) {
    if (!value || value.expiresAt <= now) oauthStates.delete(key);
  }
}

function buildRedirectUrl(baseUrl, params) {
  const url = new URL(baseUrl);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });
  return url.toString();
}

router.get('/login/start', (req, res) => {
  if (!isLineLoginConfigured()) {
    return res.status(503).json({
      success: false,
      message: 'LINE Login 尚未設定，請在 Render 設定 LINE_LOGIN_CHANNEL_ID / LINE_LOGIN_CHANNEL_SECRET',
    });
  }

  const returnUrlRaw = String(req.query.returnUrl || '').trim() || getDefaultStorefrontUrl();
  const returnUrl = isAllowedReturnUrl(returnUrlRaw) ? returnUrlRaw : getDefaultStorefrontUrl();

  const { channelId } = getLineLoginCredentials();
  const callbackUrl = getLineLoginCallbackUrl(req);
  const state = crypto.randomBytes(16).toString('hex');

  pruneStates();
  oauthStates.set(state, {
    returnUrl,
    expiresAt: Date.now() + STATE_TTL_MS,
  });

  const authorizeUrl = new URL('https://access.line.me/oauth2/v2.1/authorize');
  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set('client_id', channelId);
  authorizeUrl.searchParams.set('redirect_uri', callbackUrl);
  authorizeUrl.searchParams.set('state', state);
  authorizeUrl.searchParams.set('scope', 'profile openid');

  return res.redirect(authorizeUrl.toString());
});

router.get('/login/callback', async (req, res) => {
  const defaultReturn = getDefaultStorefrontUrl();
  const code = String(req.query.code || '').trim();
  const state = String(req.query.state || '').trim();
  const oauthError = String(req.query.error || '').trim();

  if (oauthError) {
    return res.redirect(buildRedirectUrl(defaultReturn, {
      lineBind: 'error',
      lineBindMessage: oauthError,
    }));
  }

  const saved = oauthStates.get(state);
  oauthStates.delete(state);
  const returnUrl = saved?.returnUrl && isAllowedReturnUrl(saved.returnUrl)
    ? saved.returnUrl
    : defaultReturn;

  if (!code || !saved || saved.expiresAt <= Date.now()) {
    return res.redirect(buildRedirectUrl(returnUrl, {
      lineBind: 'error',
      lineBindMessage: '登入逾時，請重新綁定',
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
      lineBindMessage: err.message || 'LINE 綁定失敗',
    }));
  }
});

module.exports = router;
