const express = require('express');
const jwt = require('jsonwebtoken');
const { requireAdminAuth } = require('../middleware/requireAdminAuth');

const router = express.Router();

const ADMIN_EMAIL = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
const ADMIN_PASSWORD = String(process.env.ADMIN_PASSWORD || '');
const ADMIN_JWT_SECRET = String(process.env.ADMIN_JWT_SECRET || '').trim();

function hasRequiredConfig() {
  return Boolean(ADMIN_EMAIL && ADMIN_PASSWORD && ADMIN_JWT_SECRET);
}

router.post('/login', (req, res) => {
  if (!hasRequiredConfig()) {
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
  if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
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

router.get('/me', requireAdminAuth, (req, res) => {
  return res.json({
    success: true,
    data: req.adminUser,
  });
});

module.exports = router;
