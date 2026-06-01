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

module.exports = {
  FALLBACK_ORDERS_FILE,
  loadFallbackOrdersFromFile,
  saveFallbackOrdersToFile,
  syncFallbackOrders,
  appendFallbackOrder,
  migrateFallbackOrdersToMongo,
  toFallbackPlainOrder,
};
