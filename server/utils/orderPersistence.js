const path = require('path');
const fs = require('fs/promises');
const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');

const FALLBACK_DATA_DIR = process.env.ORDER_DATA_DIR
  ? path.resolve(process.env.ORDER_DATA_DIR)
  : path.join(__dirname, '..', 'data');
const FALLBACK_ORDERS_FILE = path.join(FALLBACK_DATA_DIR, 'orders.json');

let fallbackWriteQueue = Promise.resolve();

function queueFallbackWrite(task) {
  fallbackWriteQueue = fallbackWriteQueue.then(task, task);
  return fallbackWriteQueue;
}

async function loadFallbackOrdersFromFile() {
  try {
    await fs.mkdir(FALLBACK_DATA_DIR, { recursive: true });
    const raw = await fs.readFile(FALLBACK_ORDERS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((o) => o && o.orderNumber);
  } catch {
    return [];
  }
}

async function saveFallbackOrdersToFile(orders) {
  await fs.mkdir(FALLBACK_DATA_DIR, { recursive: true });
  const tmpFile = `${FALLBACK_ORDERS_FILE}.${process.pid}.${Date.now()}.tmp`;
  const payload = JSON.stringify(orders, null, 2);
  await fs.writeFile(tmpFile, payload, 'utf8');
  await fs.rename(tmpFile, FALLBACK_ORDERS_FILE);
}

function mergeOrdersByNumber(...lists) {
  const map = new Map();
  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const order of list) {
      if (!order?.orderNumber) continue;
      map.set(order.orderNumber, order);
    }
  }
  return Array.from(map.values());
}

/**
 * 合併磁碟檔與記憶體中的 fallback 訂單，避免覆寫舊資料
 */
async function syncFallbackOrders(app) {
  const fromFile = await loadFallbackOrdersFromFile();
  const fromMemory = app.locals.db?.fallbackOrders || [];
  const merged = mergeOrdersByNumber(fromFile, fromMemory);
  app.locals.db.fallbackOrders = merged;
  return merged;
}

/**
 * 追加或更新一筆 fallback 訂單（先讀檔再寫入，避免洗掉舊訂單）
 */
async function appendFallbackOrder(app, order) {
  if (!order?.orderNumber) return;

  return queueFallbackWrite(async () => {
    await syncFallbackOrders(app);
    const list = app.locals.db.fallbackOrders;
    const idx = list.findIndex((o) => o.orderNumber === order.orderNumber);
    if (idx >= 0) list[idx] = order;
    else list.push(order);
    await saveFallbackOrdersToFile(list);
  });
}

async function resolveProductIdForMigration(item) {
  const rawId = item?.productId ? String(item.productId) : '';
  if (rawId && mongoose.Types.ObjectId.isValid(rawId) && !rawId.startsWith('local-')) {
    return new mongoose.Types.ObjectId(rawId);
  }

  const byName = await Product.findOne({ name: item.name }).select('_id').lean();
  if (byName?._id) return byName._id;

  const first = await Product.findOne({}).select('_id').lean();
  return first?._id || null;
}

async function migrateFallbackOrdersToMongo() {
  const fileOrders = await loadFallbackOrdersFromFile();
  if (!fileOrders.length) return 0;

  let imported = 0;
  for (const raw of fileOrders) {
    const exists = await Order.findOne({ orderNumber: raw.orderNumber }).select('_id').lean();
    if (exists) continue;

    const items = [];
    for (const item of raw.items || []) {
      const productId = await resolveProductIdForMigration(item);
      if (!productId) continue;
      items.push({
        productId,
        name: item.name,
        price: Number(item.price),
        quantity: Number(item.quantity),
      });
    }
    if (!items.length) continue;

    await Order.create({
      orderNumber: raw.orderNumber,
      items,
      subtotal: Number(raw.subtotal),
      shipping: Number(raw.shipping),
      total: Number(raw.total),
      customer: {
        name: raw.customer?.name || '',
        email: raw.customer?.email || '',
        phone: raw.customer?.phone || '',
        address: raw.customer?.address || '',
        lineUserId: raw.customer?.lineUserId || '',
      },
      status: raw.status || 'pending',
      statusHistory: Array.isArray(raw.statusHistory) && raw.statusHistory.length
        ? raw.statusHistory
        : [{
          from: 'created',
          to: raw.status || 'pending',
          changedBy: 'system',
          changedAt: raw.createdAt ? new Date(raw.createdAt) : new Date(),
        }],
      createdAt: raw.createdAt ? new Date(raw.createdAt) : undefined,
      updatedAt: raw.updatedAt ? new Date(raw.updatedAt) : undefined,
    });
    imported += 1;
  }

  if (imported > 0) {
    console.log(`📥 已將 ${imported} 筆 fallback 訂單匯入 MongoDB`);
  }
  return imported;
}

function toFallbackPlainOrder(order) {
  const plain = typeof order?.toObject === 'function' ? order.toObject() : { ...order };
  return {
    orderNumber: plain.orderNumber,
    items: (plain.items || []).map((item) => ({
      productId: item.productId ? String(item.productId) : '',
      name: item.name,
      price: Number(item.price),
      quantity: Number(item.quantity),
    })),
    subtotal: Number(plain.subtotal),
    shipping: Number(plain.shipping),
    total: Number(plain.total),
    customer: {
      name: plain.customer?.name || '',
      email: plain.customer?.email || '',
      phone: plain.customer?.phone || '',
      address: plain.customer?.address || '',
      lineUserId: plain.customer?.lineUserId || '',
    },
    status: plain.status || 'pending',
    statusHistory: plain.statusHistory || [],
    createdAt: plain.createdAt || new Date(),
    updatedAt: plain.updatedAt || plain.createdAt || new Date(),
  };
}

function normalizeImportedOrder(raw) {
  if (!raw || !raw.orderNumber) return null;
  const items = Array.isArray(raw.items) ? raw.items : [];
  return {
    orderNumber: String(raw.orderNumber),
    items: items.map((item) => ({
      productId: item.productId ? String(item.productId) : '',
      name: String(item.name || ''),
      price: Number(item.price) || 0,
      quantity: Number(item.quantity) || 0,
    })),
    subtotal: Number(raw.subtotal) || 0,
    shipping: Number(raw.shipping) || 0,
    total: Number(raw.total) || 0,
    customer: {
      name: raw.customer?.name || '',
      email: raw.customer?.email || '',
      phone: raw.customer?.phone || '',
      address: raw.customer?.address || '',
      lineUserId: raw.customer?.lineUserId || '',
    },
    status: raw.status || 'pending',
    statusHistory: Array.isArray(raw.statusHistory) ? raw.statusHistory : [],
    createdAt: raw.createdAt ? new Date(raw.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: raw.updatedAt ? new Date(raw.updatedAt).toISOString() : undefined,
  };
}

/**
 * 匯入一批訂單（合併，不覆蓋既有；以 orderNumber 為準）
 * 回傳 { imported, skipped, total }
 */
async function importOrders(app, incomingOrders) {
  const incoming = (Array.isArray(incomingOrders) ? incomingOrders : [])
    .map(normalizeImportedOrder)
    .filter(Boolean);

  if (!incoming.length) {
    return { imported: 0, skipped: 0, total: 0 };
  }

  let imported = 0;
  let skipped = 0;

  // 寫入 MongoDB（若已連線）
  if (app.locals.db?.ready) {
    for (const raw of incoming) {
      const exists = await Order.findOne({ orderNumber: raw.orderNumber }).select('_id').lean();
      if (exists) { skipped += 1; continue; }

      const items = [];
      for (const item of raw.items) {
        const productId = await resolveProductIdForMigration(item);
        if (!productId) continue;
        items.push({
          productId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        });
      }
      if (!items.length) { skipped += 1; continue; }

      await Order.create({
        orderNumber: raw.orderNumber,
        items,
        subtotal: raw.subtotal,
        shipping: raw.shipping,
        total: raw.total,
        customer: raw.customer,
        status: raw.status,
        statusHistory: raw.statusHistory.length
          ? raw.statusHistory
          : [{ from: 'created', to: raw.status, changedBy: 'import', changedAt: new Date(raw.createdAt) }],
        createdAt: new Date(raw.createdAt),
      });
      imported += 1;
    }
  }

  // 一律也寫入 fallback 檔（雙重備份）
  await queueFallbackWrite(async () => {
    await syncFallbackOrders(app);
    const list = app.locals.db.fallbackOrders;
    for (const raw of incoming) {
      const idx = list.findIndex((o) => o.orderNumber === raw.orderNumber);
      if (idx >= 0) {
        if (!app.locals.db?.ready) skipped += 1;
      } else {
        list.push(raw);
        if (!app.locals.db?.ready) imported += 1;
      }
    }
    await saveFallbackOrdersToFile(list);
  });

  return { imported, skipped, total: incoming.length };
}

/**
 * 讀取所有訂單（Mongo + fallback 合併），供匯出使用
 */
async function getAllOrders(app) {
  const all = new Map();

  if (app.locals.db?.ready) {
    const mongoOrders = await Order.find({}).sort({ createdAt: -1 }).lean();
    for (const o of mongoOrders) {
      all.set(o.orderNumber, toFallbackPlainOrder(o));
    }
  }

  await syncFallbackOrders(app);
  for (const o of app.locals.db.fallbackOrders || []) {
    if (!all.has(o.orderNumber)) all.set(o.orderNumber, o);
  }

  return Array.from(all.values())
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

module.exports = {
  FALLBACK_ORDERS_FILE,
  loadFallbackOrdersFromFile,
  saveFallbackOrdersToFile,
  syncFallbackOrders,
  appendFallbackOrder,
  migrateFallbackOrdersToMongo,
  toFallbackPlainOrder,
  importOrders,
  getAllOrders,
};
