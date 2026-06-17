const path = require('path');
const fs = require('fs/promises');
const SiteSettings = require('../models/SiteSettings');

const DATA_DIR = process.env.ORDER_DATA_DIR
  ? path.resolve(process.env.ORDER_DATA_DIR)
  : path.join(__dirname, '..', 'data');
const SETTINGS_FILE = path.join(DATA_DIR, 'site-settings.json');

/**
 * 預設值 = 既有前端/App 寫死的內容，確保未編輯前行為不變。
 */
const DEFAULT_SETTINGS = {
  shop: {
    name: '磐石烤地瓜 - 番薯阿嬤',
    phone: '0953830409',
    email: 'sweetpotatograndmom@gmail.com',
    address: '高雄市左營區華夏路576號',
  },
  line: {
    officialId: '@437lnypi',
    addFriendUrl: 'https://line.me/R/ti/p/@437lnypi',
  },
  shipping: {
    fee: 150,
    freeThresholdQty: 20,
    freeThresholdKeyword: '黃金地瓜',
  },
  content: {
    heroTag: '傳承古早窯烤工藝',
    heroTitle: '番薯阿嬤的溫暖滋味',
    heroSubtitle: '炭火慢烤，每一口都是古早的人情味。',
    storyTitle: '守護一爐炭火的執著',
    storyBody:
      '在那座用了 20 多年的窯烤爐旁，我們依然堅持最古老的做法。阿嬤常說：「地瓜要好吃，急不得。」每一顆地瓜都承載著我們對土地的敬意。',
  },
};

let writeQueue = Promise.resolve();
function queueWrite(task) {
  writeQueue = writeQueue.then(task, task);
  return writeQueue;
}

function isObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

/**
 * 深層合併（只覆蓋有提供的欄位），用於套用預設與部分更新。
 */
function deepMerge(base, override) {
  const out = Array.isArray(base) ? [...base] : { ...base };
  if (!isObject(override)) return out;
  for (const [key, value] of Object.entries(override)) {
    if (value === undefined) continue;
    if (isObject(value) && isObject(out[key])) {
      out[key] = deepMerge(out[key], value);
    } else {
      out[key] = value;
    }
  }
  return out;
}

/**
 * 只挑出允許的欄位（防止寫入任意鍵），並做基本型別正規化。
 */
function sanitizePatch(patch) {
  const clean = {};
  if (isObject(patch.shop)) {
    clean.shop = {};
    for (const k of ['name', 'phone', 'email', 'address']) {
      if (patch.shop[k] !== undefined) clean.shop[k] = String(patch.shop[k]).trim();
    }
  }
  if (isObject(patch.line)) {
    clean.line = {};
    for (const k of ['officialId', 'addFriendUrl']) {
      if (patch.line[k] !== undefined) clean.line[k] = String(patch.line[k]).trim();
    }
  }
  if (isObject(patch.shipping)) {
    clean.shipping = {};
    if (patch.shipping.fee !== undefined) {
      clean.shipping.fee = Math.max(0, Number(patch.shipping.fee) || 0);
    }
    if (patch.shipping.freeThresholdQty !== undefined) {
      clean.shipping.freeThresholdQty = Math.max(0, Math.floor(Number(patch.shipping.freeThresholdQty) || 0));
    }
    if (patch.shipping.freeThresholdKeyword !== undefined) {
      clean.shipping.freeThresholdKeyword = String(patch.shipping.freeThresholdKeyword).trim();
    }
  }
  if (isObject(patch.content)) {
    clean.content = {};
    for (const k of ['heroTag', 'heroTitle', 'heroSubtitle', 'storyTitle', 'storyBody']) {
      if (patch.content[k] !== undefined) clean.content[k] = String(patch.content[k]);
    }
  }
  return clean;
}

async function loadFromFile() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const raw = await fs.readFile(SETTINGS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return isObject(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

async function saveToFile(settings) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${SETTINGS_FILE}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(settings, null, 2), 'utf8');
  await fs.rename(tmp, SETTINGS_FILE);
}

function stripMeta(doc) {
  if (!doc) return {};
  const plain = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  const { _id, __v, key, createdAt, updatedAt, ...rest } = plain;
  return rest;
}

/**
 * 讀取目前設定（預設值 + 已儲存的覆蓋）。永遠回傳完整結構。
 */
async function getSiteSettings(app) {
  let stored = {};
  if (app?.locals?.db?.ready) {
    try {
      const doc = await SiteSettings.findOne({ key: 'default' }).lean();
      if (doc) stored = stripMeta(doc);
    } catch (err) {
      console.error('讀取 SiteSettings (Mongo) 失敗:', err.message);
    }
  } else {
    stored = await loadFromFile();
  }
  return deepMerge(DEFAULT_SETTINGS, stored);
}

/**
 * 套用部分更新並儲存。回傳更新後的完整設定。
 */
async function updateSiteSettings(app, patch) {
  const clean = sanitizePatch(patch || {});
  const current = await getSiteSettings(app);
  const next = deepMerge(current, clean);

  if (app?.locals?.db?.ready) {
    await SiteSettings.findOneAndUpdate(
      { key: 'default' },
      { $set: { ...next, key: 'default' } },
      { upsert: true, new: true },
    );
  }
  // 一律也寫入檔案（fallback 主要儲存 / Mongo 模式下的備份）
  await queueWrite(() => saveToFile(next));
  return next;
}

module.exports = {
  DEFAULT_SETTINGS,
  getSiteSettings,
  updateSiteSettings,
  SETTINGS_FILE,
};
