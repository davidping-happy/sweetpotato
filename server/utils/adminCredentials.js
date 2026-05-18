const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const DATA_DIR = path.join(__dirname, '..', 'data');
const AUTH_FILE = path.join(DATA_DIR, 'admin-auth.json');
const RESET_TTL_MS = 60 * 60 * 1000; // 1 hour
const BCRYPT_ROUNDS = 10;

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function readStore() {
  try {
    const raw = await fs.readFile(AUTH_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      email: normalizeEmail(parsed.email),
      passwordHash: String(parsed.passwordHash || ''),
      resetTokens: Array.isArray(parsed.resetTokens) ? parsed.resetTokens : [],
    };
  } catch {
    return { email: '', passwordHash: '', resetTokens: [] };
  }
}

async function writeStore(store) {
  await ensureDataDir();
  await fs.writeFile(AUTH_FILE, JSON.stringify(store, null, 2), 'utf8');
}

async function initFromEnvIfNeeded() {
  const envEmail = normalizeEmail(process.env.ADMIN_EMAIL);
  const envPassword = String(process.env.ADMIN_PASSWORD || '');
  if (!envEmail || !envPassword) {
    return null;
  }

  const store = await readStore();
  if (store.email && store.passwordHash) {
    return store;
  }

  const passwordHash = await bcrypt.hash(envPassword, BCRYPT_ROUNDS);
  const next = {
    email: envEmail,
    passwordHash,
    resetTokens: [],
  };
  await writeStore(next);
  return next;
}

async function getAdminEmail() {
  const store = await initFromEnvIfNeeded();
  return store?.email || normalizeEmail(process.env.ADMIN_EMAIL);
}

async function verifyPassword(email, password) {
  const store = await initFromEnvIfNeeded();
  if (!store?.email || !store.passwordHash) {
    return false;
  }
  if (normalizeEmail(email) !== store.email) {
    return false;
  }
  return bcrypt.compare(String(password || ''), store.passwordHash);
}

async function updatePassword(email, newPassword) {
  const store = await initFromEnvIfNeeded();
  const targetEmail = normalizeEmail(email);
  if (!store || store.email !== targetEmail) {
    throw new Error('找不到管理員帳號');
  }
  if (String(newPassword || '').length < 6) {
    throw new Error('新密碼至少 6 碼');
  }

  store.passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  store.resetTokens = [];
  await writeStore(store);
  return true;
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function createPasswordResetToken(email) {
  const store = await initFromEnvIfNeeded();
  const targetEmail = normalizeEmail(email);
  if (!store || store.email !== targetEmail) {
    return null;
  }

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + RESET_TTL_MS).toISOString();

  const now = Date.now();
  store.resetTokens = (store.resetTokens || []).filter((t) => new Date(t.expiresAt).getTime() > now);
  store.resetTokens.push({ tokenHash, expiresAt });
  await writeStore(store);

  return { rawToken, expiresAt };
}

async function resetPasswordWithToken(rawToken, newPassword) {
  const store = await initFromEnvIfNeeded();
  if (!store?.email || !store.passwordHash) {
    throw new Error('尚未設定管理員帳號');
  }
  if (String(newPassword || '').length < 6) {
    throw new Error('新密碼至少 6 碼');
  }

  const tokenHash = hashToken(String(rawToken || '').trim());
  const now = Date.now();
  const match = (store.resetTokens || []).find(
    (t) => t.tokenHash === tokenHash && new Date(t.expiresAt).getTime() > now,
  );
  if (!match) {
    throw new Error('重設連結無效或已過期');
  }

  store.passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  store.resetTokens = [];
  await writeStore(store);
  return { email: store.email };
}

module.exports = {
  getAdminEmail,
  verifyPassword,
  updatePassword,
  createPasswordResetToken,
  resetPasswordWithToken,
};
