const jwt = require('jsonwebtoken');

const ADMIN_JWT_SECRET = String(process.env.ADMIN_JWT_SECRET || '').trim();

function requireAdminAuth(req, res, next) {
  if (!ADMIN_JWT_SECRET) {
    return res.status(500).json({
      success: false,
      message: '伺服器未設定 ADMIN_JWT_SECRET',
    });
  }

  const authHeader = String(req.headers.authorization || '');
  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ success: false, message: '缺少 Bearer token' });
  }

  try {
    const payload = jwt.verify(token, ADMIN_JWT_SECRET);
    req.adminUser = {
      email: payload.email,
      role: payload.role || 'admin',
    };
    return next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: `JWT 驗證失敗：${err.message}`,
    });
  }
}

module.exports = { requireAdminAuth };
