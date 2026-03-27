const express = require('express');
const Product = require('../models/Product');
const Order = require('../models/Order');
const { sendOrderConfirmation } = require('../utils/mailer');

const router = express.Router();

// ============ 工具函式 ============

/**
 * 生成訂單編號：PS-YYYYMMDD-隨機數
 * PS = Panshi 前綴，後接日期與隨機數
 */
function generateOrderNumber() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 1000);
  return `PS-${y}${m}${d}-${random}`;
}

/**
 * 運費計算：滿 1000 免運，否則運費 150
 */
function calculateShipping(subtotal) {
  return subtotal >= 1000 ? 0 : 150;
}

function normalizeProductName(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[（）]/g, (ch) => (ch === '（' ? '(' : ')'))
    .replace(/\s+/g, '')
    .replace(/[／]/g, '/');
}

function findProductByLooseName(rawName, productMapByName, normalizedProductMap) {
  if (!rawName) return null;

  const direct = productMapByName[rawName];
  if (direct) return direct;

  const normalizedInput = normalizeProductName(rawName);
  if (!normalizedInput) return null;

  const normalizedDirect = normalizedProductMap[normalizedInput];
  if (normalizedDirect) return normalizedDirect;

  // 舊版前端可能傳「手作地瓜糖/酥」而非「手作地瓜糖/酥（小盒）」：允許前綴比對
  const partial = Object.entries(normalizedProductMap).find(([key]) =>
    key.startsWith(normalizedInput) || normalizedInput.startsWith(key),
  );
  return partial ? partial[1] : null;
}

function formatOrderForList(order) {
  const latestHistory = Array.isArray(order.statusHistory) && order.statusHistory.length > 0
    ? order.statusHistory[order.statusHistory.length - 1]
    : null;
  const itemDetails = Array.isArray(order.items)
    ? order.items.map((item) => ({
      name: item.name,
      quantity: Number(item.quantity || 0),
      price: Number(item.price || 0),
    }))
    : [];
  return {
    orderNumber: order.orderNumber,
    status: order.status,
    customer: order.customer,
    itemDetails,
    itemsCount: Array.isArray(order.items)
      ? order.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0)
      : 0,
    subtotal: order.subtotal,
    shipping: order.shipping,
    total: order.total,
    createdAt: order.createdAt,
    lastStatusBy: latestHistory?.changedBy || '-',
    lastStatusAt: latestHistory?.changedAt || order.createdAt,
  };
}

function formatOrderDetail(order) {
  return {
    orderNumber: order.orderNumber,
    status: order.status,
    customer: order.customer,
    items: order.items,
    subtotal: order.subtotal,
    shipping: order.shipping,
    total: order.total,
    createdAt: order.createdAt,
    statusHistory: order.statusHistory || [],
  };
}

const ALLOWED_STATUSES = ['pending', 'confirmed', 'shipped', 'completed', 'cancelled'];
const STATUS_TRANSITIONS = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['shipped', 'cancelled'],
  shipped: ['completed'],
  completed: [],
  cancelled: [],
};

// ============ GET /api/orders ============
// 簡易後台查詢：支援 MongoDB 與 in-memory fallback 兩種模式
router.get('/', async (req, res) => {
  try {
    const limitRaw = Number(req.query.limit);
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(Math.floor(limitRaw), 200) : 50;

    if (req.app.locals.db?.ready) {
      const orders = await Order.find({})
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      return res.json({
        success: true,
        source: 'mongodb',
        count: orders.length,
        data: orders.map(formatOrderForList),
      });
    }

    const fallbackOrders = req.app.locals.db?.fallbackOrders || [];
    const sorted = [...fallbackOrders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, limit);
    return res.json({
      success: true,
      source: 'memory',
      count: sorted.length,
      data: sorted.map(formatOrderForList),
    });
  } catch (err) {
    console.error('查詢訂單失敗:', err);
    return res.status(500).json({ success: false, message: '查詢訂單失敗' });
  }
});

// ============ GET /api/orders/:orderNumber ============
router.get('/:orderNumber', async (req, res) => {
  try {
    const orderNumber = String(req.params.orderNumber || '').trim();
    if (!orderNumber) {
      return res.status(400).json({ success: false, message: '請提供有效的訂單編號' });
    }

    if (req.app.locals.db?.ready) {
      const order = await Order.findOne({ orderNumber }).lean();
      if (!order) {
        return res.status(404).json({ success: false, message: '查無此訂單' });
      }
      return res.json({ success: true, source: 'mongodb', data: formatOrderDetail(order) });
    }

    const fallbackOrders = req.app.locals.db?.fallbackOrders || [];
    const order = fallbackOrders.find((o) => o.orderNumber === orderNumber);
    if (!order) {
      return res.status(404).json({ success: false, message: '查無此訂單' });
    }
    return res.json({ success: true, source: 'memory', data: formatOrderDetail(order) });
  } catch (err) {
    console.error('查詢單筆訂單失敗:', err);
    return res.status(500).json({ success: false, message: '查詢單筆訂單失敗' });
  }
});

// ============ PATCH /api/orders/:orderNumber/status ============
router.patch('/:orderNumber/status', async (req, res) => {
  try {
    const orderNumber = String(req.params.orderNumber || '').trim();
    const status = String(req.body?.status || '').trim();
    const changedBy = String(req.body?.changedBy || 'admin').trim() || 'admin';

    if (!orderNumber) {
      return res.status(400).json({ success: false, message: '請提供有效的訂單編號' });
    }
    if (!ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `狀態不合法，僅支援：${ALLOWED_STATUSES.join(', ')}`,
      });
    }

    if (req.app.locals.db?.ready) {
      const existing = await Order.findOne({ orderNumber }).lean();
      if (!existing) {
        return res.status(404).json({ success: false, message: '查無此訂單' });
      }
      const currentStatus = existing.status;
      if (currentStatus === status) {
        return res.json({
          success: true,
          source: 'mongodb',
          message: `訂單 ${orderNumber} 狀態維持 ${status}`,
          data: formatOrderDetail(existing),
        });
      }

      const allowedNext = STATUS_TRANSITIONS[currentStatus] || [];
      if (!allowedNext.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `不允許狀態回退：${currentStatus} -> ${status}。可更新為：${allowedNext.join(', ') || '無'}`,
        });
      }

      const historyEntry = {
        from: currentStatus,
        to: status,
        changedBy,
        changedAt: new Date(),
      };
      const updated = await Order.findOneAndUpdate(
        { orderNumber },
        { status, $push: { statusHistory: historyEntry } },
        { new: true },
      ).lean();
      return res.json({
        success: true,
        source: 'mongodb',
        message: `訂單 ${orderNumber} 狀態已更新為 ${status}`,
        data: formatOrderDetail(updated),
      });
    }

    const fallbackOrders = req.app.locals.db?.fallbackOrders || [];
    const target = fallbackOrders.find((o) => o.orderNumber === orderNumber);
    if (!target) {
      return res.status(404).json({ success: false, message: '查無此訂單' });
    }
    const currentStatus = target.status;
    if (currentStatus === status) {
      return res.json({
        success: true,
        source: 'memory',
        message: `訂單 ${orderNumber} 狀態維持 ${status}`,
        data: formatOrderDetail(target),
      });
    }
    const allowedNext = STATUS_TRANSITIONS[currentStatus] || [];
    if (!allowedNext.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `不允許狀態回退：${currentStatus} -> ${status}。可更新為：${allowedNext.join(', ') || '無'}`,
      });
    }
    target.status = status;
    if (!Array.isArray(target.statusHistory)) {
      target.statusHistory = [];
    }
    target.statusHistory.push({
      from: currentStatus,
      to: status,
      changedBy,
      changedAt: new Date(),
    });
    await req.app.locals.db.saveFallbackOrders();
    return res.json({
      success: true,
      source: 'memory',
      message: `訂單 ${orderNumber} 狀態已更新為 ${status}`,
      data: formatOrderDetail(target),
    });
  } catch (err) {
    console.error('更新訂單狀態失敗:', err);
    return res.status(500).json({ success: false, message: '更新訂單狀態失敗' });
  }
});

// ============ POST /api/orders ============

router.post('/', async (req, res) => {
  try {
    const {
      items,
      subtotal: clientSubtotal,
      shipping: clientShipping,
      totalAmount,
      shopInfo,
      customer,
    } = req.body || {};

    // --- 驗證輸入 ---
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: '訂單至少需包含一項商品' });
    }
    if (!customer || !customer.name || !customer.email || !customer.phone || !customer.address) {
      return res.status(400).json({ success: false, message: '顧客資訊不完整（姓名、Email、電話、地址皆為必填）' });
    }
    const totalAmountProvided = totalAmount !== undefined;
    const totalAmountNum = totalAmountProvided ? Number(totalAmount) : undefined;
    if (totalAmountProvided && !Number.isFinite(totalAmountNum)) {
      return res.status(400).json({ success: false, message: 'totalAmount 必須為有效數字（或不要提供）' });
    }

    const clientSubtotalNum = clientSubtotal !== undefined ? Number(clientSubtotal) : undefined;
    const clientShippingNum = clientShipping !== undefined ? Number(clientShipping) : undefined;
    if (clientSubtotalNum !== undefined && !Number.isFinite(clientSubtotalNum)) {
      return res.status(400).json({ success: false, message: 'subtotal 必須為有效數字' });
    }
    if (clientShippingNum !== undefined && !Number.isFinite(clientShippingNum)) {
      return res.status(400).json({ success: false, message: 'shipping 必須為有效數字' });
    }

    // --- 查詢各商品正確價格（防前端竄改） ---
    // 允許前端傳 id/productId；若沒有 id，允許以 name 比對（避免舊前端漏傳 ID 時整筆失敗）
    const productMapById = {};
    const productMapByName = {};
    const normalizedProductMap = {};
    if (req.app.locals.db?.ready) {
      const products = await Product.find({}).lean();
      products.forEach((p) => {
        productMapById[String(p._id)] = p;
        productMapByName[p.name] = p;
        normalizedProductMap[normalizeProductName(p.name)] = p;
      });
    } else {
      const fallback = req.app.locals.db?.fallbackProducts || [];
      fallback.forEach((p) => {
        productMapById[String(p._id)] = p;
        productMapByName[p.name] = p;
        normalizedProductMap[normalizeProductName(p.name)] = p;
      });
    }

    // --- 組合訂單商品並計算小計 ---
    let subtotal = 0;
    const orderItems = [];
    for (const item of items) {
      const productId = item.id || item.productId;
      const product =
        (productId && productMapById[String(productId)])
        || findProductByLooseName(item.name, productMapByName, normalizedProductMap);
      if (!product) {
        return res.status(400).json({
          success: false,
          message: `找不到商品（id=${productId || 'N/A'}, name=${item.name || 'N/A'}）`,
        });
      }
      if (!product.inStock) {
        return res.status(400).json({ success: false, message: `商品「${product.name}」目前無庫存` });
      }

      const qtyNum = Number(item.quantity);
      if (!Number.isFinite(qtyNum) || qtyNum < 1) {
        return res.status(400).json({ success: false, message: '商品數量 quantity 必須為有效數字（>=1）' });
      }
      const qty = Math.max(1, Math.floor(qtyNum));
      const lineTotal = product.price * qty;
      subtotal += lineTotal;

      orderItems.push({
        productId: product._id,
        name: product.name,
        price: product.price,
        quantity: qty,
      });
    }

    // --- 計算運費與總金額 ---
    const shipping = calculateShipping(subtotal);
    const total = subtotal + shipping;

    // --- 金額驗證：totalAmount 與後端計算一致（若前端有提供才驗證） ---
    if (totalAmountProvided && Math.abs(totalAmountNum - total) > 0.01) {
      return res.status(400).json({
        success: false,
        message: `totalAmount 驗證失敗：前端=${totalAmountNum}，後端=${total}`,
      });
    }
    if (clientSubtotalNum !== undefined && Math.abs(clientSubtotalNum - subtotal) > 0.01) {
      return res.status(400).json({
        success: false,
        message: `subtotal 驗證失敗：前端=${clientSubtotalNum}，後端=${subtotal}`,
      });
    }
    if (clientShippingNum !== undefined && Math.abs(clientShippingNum - shipping) > 0.01) {
      return res.status(400).json({
        success: false,
        message: `shipping 驗證失敗：前端=${clientShippingNum}，後端=${shipping}`,
      });
    }

    // --- 生成唯一訂單編號（若有 DB 才做碰撞檢查） ---
    let orderNumber = generateOrderNumber();
    if (req.app.locals.db?.ready) {
      let attempts = 0;
      do {
        orderNumber = generateOrderNumber();
        const exists = await Order.findOne({ orderNumber });
        if (!exists) break;
        attempts++;
      } while (attempts < 10);
      if (!orderNumber) {
        return res.status(500).json({ success: false, message: '無法生成訂單編號' });
      }
    }

    // --- 儲存訂單 ---
    console.log('收到新訂單：', orderNumber);
    console.log('訂單 shopInfo：', shopInfo);
    console.log(
      '訂單內容：',
      JSON.stringify(
        {
          items: items,
          subtotal,
          shipping,
          totalAmount: totalAmountNum,
          computedTotal: total,
        },
        null,
        2,
      ),
    );

    let order;
    if (req.app.locals.db?.ready) {
      order = await Order.create({
        orderNumber,
        items: orderItems,
        subtotal,
        shipping,
        total,
        customer: {
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          address: customer.address,
        },
        status: 'pending',
        statusHistory: [{
          from: 'created',
          to: 'pending',
          changedBy: 'system',
          changedAt: new Date(),
        }],
      });
    } else {
      order = {
        orderNumber,
        items: orderItems,
        subtotal,
        shipping,
        total,
        customer: {
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          address: customer.address,
        },
        status: 'pending',
        statusHistory: [{
          from: 'created',
          to: 'pending',
          changedBy: 'system',
          changedAt: new Date(),
        }],
        createdAt: new Date(),
      };
      req.app.locals.db.fallbackOrders.push(order);
      await req.app.locals.db.saveFallbackOrders();
    }

    // --- 非同步寄送確認郵件（不阻塞回應） ---
    sendOrderConfirmation(order).catch((err) => {
      console.error('寄送訂單確認郵件失敗:', err.message);
    });

    // --- 回傳結果 ---
    res.status(201).json({
      success: true,
      message: '阿嬤收到您的訂單囉！我們會盡快準備。',
      orderId: orderNumber,
      data: {
        orderNumber: order.orderNumber,
        items: order.items,
        subtotal: order.subtotal,
        shipping: order.shipping,
        total: order.total,
        shippingNote: shipping === 0 ? '🎉 已達免運門檻！' : '滿 NT$1,000 即可享免運優惠',
        status: order.status,
        createdAt: order.createdAt,
      },
    });
  } catch (err) {
    console.error('建立訂單失敗:', err);
    res.status(500).json({ success: false, message: err.message || '伺服器錯誤' });
  }
});

module.exports = router;
