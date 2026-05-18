const express = require('express');
const jwt = require('jsonwebtoken');
const { requireAdminAuth } = require('../middleware/requireAdminAuth');
const {
  getAdminEmail,
  verifyPassword,
  createPasswordResetToken,
  resetPasswordWithToken,
} = require('../utils/adminCredentials');
const { sendAdminPasswordResetEmail } = require('../utils/mailer');

const router = express.Router();

const ADMIN_JWT_SECRET = String(process.env.ADMIN_JWT_SECRET || '').trim();

function hasJwtConfig() {
  return Boolean(ADMIN_JWT_SECRET);
}

function hasAdminConfig() {
  const email = String(process.env.ADMIN_EMAIL || '').trim();
  const password = String(process.env.ADMIN_PASSWORD || '');
  return Boolean(email && password && ADMIN_JWT_SECRET);
}

function buildResetUrl(req, rawToken) {
  const configured = String(process.env.ADMIN_APP_URL || '').trim().replace(/\/+$/, '');
  const origin = String(req.headers.origin || '').trim().replace(/\/+$/, '');
  const base = configured || origin || '';
  const path = `/admin-login.html?reset=${encodeURIComponent(rawToken)}`;
  return base ? `${base}${path}` : path;
}

router.post('/login', async (req, res) => {
  if (!hasAdminConfig()) {
    return res.status(500).json({
      success: false,
      message: '伺服器未設定 ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_JWT_SECRET',
    });
  }

  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  if (!email || !password) {
    return res.status(400).json({ success: false, message: '請輸入 Email 與密碼' });
  }

  const ok = await verifyPassword(email, password);
  if (!ok) {
    return res.status(401).json({ success: false, message: '帳號或密碼錯誤' });
  }

  const token = jwt.sign(
    { email, role: 'admin' },
    ADMIN_JWT_SECRET,
    { expiresIn: '12h' },
  );
  return res.json({
    success: true,
    message: '登入成功',
    token,
    user: { email, role: 'admin' },
  });
});

router.post('/forgot-password', async (req, res) => {
  if (!hasAdminConfig()) {
    return res.status(500).json({
      success: false,
      message: '伺服器未設定管理員帳號',
    });
  }

  const email = String(req.body?.email || '').trim().toLowerCase();
  if (!email) {
    return res.status(400).json({ success: false, message: '請輸入 Email' });
  }

  const genericMessage =
    '若此 Email 為管理員帳號，我們已寄出重設密碼信件（連結 1 小時內有效）。請檢查收件匣與垃圾郵件。';

  try {
    const adminEmail = await getAdminEmail();
    if (adminEmail && email === adminEmail) {
      const issued = await createPasswordResetToken(email);
      if (issued?.rawToken) {
        const resetUrl = buildResetUrl(req, issued.rawToken);
        await sendAdminPasswordResetEmail({ to: email, resetUrl });
      }
    }
  } catch (err) {
    console.error('forgot-password error:', err.message);
  }

  return res.json({ success: true, message: genericMessage });
});

router.post('/reset-password', async (req, res) => {
  if (!hasJwtConfig()) {
    return res.status(500).json({
      success: false,
      message: '伺服器未設定 ADMIN_JWT_SECRET',
    });
  }

  const token = String(req.body?.token || '').trim();
  const password = String(req.body?.password || '');
  if (!token || !password) {
    return res.status(400).json({ success: false, message: '請提供重設 token 與新密碼' });
  }

  try {
    const result = await resetPasswordWithToken(token, password);
    return res.json({
      success: true,
      message: '密碼已重設，請使用新密碼登入',
      email: result.email,
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message || '重設密碼失敗',
    });
  }
});

router.get('/me', requireAdminAuth, (req, res) => {
  return res.json({
    success: true,
    data: req.adminUser,
  });
});

module.exports = router;
