const path = require('path');
const fs = require('fs/promises');

const DATA_DIR = process.env.ORDER_DATA_DIR
  ? path.resolve(process.env.ORDER_DATA_DIR)
  : path.join(__dirname, '..', 'data');
const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');

const VALID_CATEGORIES = ['烤地瓜', '零食', '蛋'];

let writeQueue = Promise.resolve();
function queueWrite(task) {
  writeQueue = writeQueue.then(task, task);
  return writeQueue;
}

async function loadFallbackProductsFromFile() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const raw = await fs.readFile(PRODUCTS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed.filter((p) => p && p._id && p.name);
  } catch {
    return null;
  }
}

async function saveFallbackProductsToFile(products) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${PRODUCTS_FILE}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(products, null, 2), 'utf8');
  await fs.rename(tmp, PRODUCTS_FILE);
}

function persistFallbackProducts(app) {
  return queueWrite(() => saveFallbackProductsToFile(app.locals.db.fallbackProducts || []));
}

function generateLocalId() {
  return `local-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

/**
 * 驗證並正規化商品輸入。partial=true 時僅驗證有提供的欄位（用於更新）。
 * 回傳 { ok, value?, message? }
 */
function validateProductInput(body, { partial = false } = {}) {
  const out = {};

  if (body.name !== undefined || !partial) {
    const name = String(body.name || '').trim();
    if (!name) return { ok: false, message: '商品名稱為必填' };
    out.name = name;
  }

  if (body.price !== undefined || !partial) {
    const price = Number(body.price);
    if (!Number.isFinite(price) || price < 0) {
      return { ok: false, message: '價格必須為 0 或正數' };
    }
    out.price = price;
  }

  if (body.category !== undefined || !partial) {
    const category = String(body.category || '').trim();
    if (!VALID_CATEGORIES.includes(category)) {
      return { ok: false, message: `分類必須是：${VALID_CATEGORIES.join('、')}` };
    }
    out.category = category;
  }

  if (body.description !== undefined) {
    out.description = String(body.description || '');
  } else if (!partial) {
    out.description = '';
  }

  if (body.imageUrl !== undefined) {
    out.imageUrl = String(body.imageUrl || '').trim();
  } else if (!partial) {
    out.imageUrl = '';
  }

  if (body.inStock !== undefined) {
    out.inStock = Boolean(body.inStock);
  } else if (!partial) {
    out.inStock = true;
  }

  return { ok: true, value: out };
}

module.exports = {
  PRODUCTS_FILE,
  VALID_CATEGORIES,
  loadFallbackProductsFromFile,
  saveFallbackProductsToFile,
  persistFallbackProducts,
  generateLocalId,
  validateProductInput,
};
