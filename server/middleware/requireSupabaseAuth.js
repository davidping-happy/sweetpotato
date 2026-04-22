const { createRemoteJWKSet, jwtVerify } = require('jose');

const SUPABASE_URL = String(process.env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
const SUPABASE_JWT_AUDIENCE = String(process.env.SUPABASE_JWT_AUDIENCE || 'authenticated').trim();
const issuer = SUPABASE_URL ? `${SUPABASE_URL}/auth/v1` : '';
const jwks = SUPABASE_URL ? createRemoteJWKSet(new URL(`${SUPABASE_URL}/auth/v1/.well-known/jwks.json`)) : null;

async function requireSupabaseAuth(req, res, next) {
  try {
    if (!SUPABASE_URL || !jwks) {
      return res.status(500).json({
        success: false,
        message: '伺服器未設定 Supabase Auth（缺少 SUPABASE_URL）',
      });
    }

    const authHeader = String(req.headers.authorization || '');
    const [scheme, token] = authHeader.split(' ');
    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({ success: false, message: '缺少 Bearer token' });
    }

    const { payload } = await jwtVerify(token, jwks, {
      issuer,
      audience: SUPABASE_JWT_AUDIENCE,
    });

    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      claims: payload,
    };
    return next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: `JWT 驗證失敗：${err.message}`,
    });
  }
}

module.exports = { requireSupabaseAuth };
