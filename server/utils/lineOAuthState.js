const fs = require('fs/promises');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const STATE_FILE = path.join(DATA_DIR, 'line-oauth-states.json');
const STATE_TTL_MS = 10 * 60 * 1000;

async function readStore() {
  try {
    const raw = await fs.readFile(STATE_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

async function writeStore(store) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(STATE_FILE, JSON.stringify(store, null, 2), 'utf8');
}

function pruneStore(store) {
  const now = Date.now();
  Object.keys(store).forEach((key) => {
    if (!store[key]?.expiresAt || store[key].expiresAt <= now) {
      delete store[key];
    }
  });
  return store;
}

async function saveOAuthState(state, payload) {
  const store = pruneStore(await readStore());
  store[state] = {
    returnUrl: payload.returnUrl,
    expiresAt: Date.now() + STATE_TTL_MS,
  };
  await writeStore(store);
}

async function consumeOAuthState(state) {
  const store = pruneStore(await readStore());
  const saved = store[state];
  delete store[state];
  await writeStore(store);
  if (!saved || saved.expiresAt <= Date.now()) return null;
  return saved;
}

module.exports = { saveOAuthState, consumeOAuthState };
