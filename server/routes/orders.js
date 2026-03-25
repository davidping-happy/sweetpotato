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
    const productIds = items.map((item) => item.id || item.productId);
    if (productIds.length !== items.length || productIds.some((id) => !id)) {
      return res.status(400).json({ success: false, message: '商品資料格式不正確：缺少商品 id' });
    }

    const productMap = {};
    if (req.app.locals.db?.ready) {
      const products = await Product.find({ _id: { $in: productIds } });

      if (products.length !== productIds.length) {
        return res.status(400).json({ success: false, message: '部分商品 ID 不存在' });
      }

      products.forEach((p) => {
        productMap[p._id.toString()] = p;
      });
    } else {
      const fallback = req.app.locals.db?.fallbackProducts || [];
      fallback.forEach((p) => {
        productMap[p._id] = p;
      });

      const missing = productIds.filter((id) => !productMap[id]);
      if (missing.length > 0) {
        return res.status(400).json({ success: false, message: '部分商品 ID 不存在' });
      }
    }

    // --- 組合訂單商品並計算小計 ---
    let subtotal = 0;
    const orderItems = [];
    for (const item of items) {
      const productId = item.id || item.productId;
      const product = productMap[productId];
      if (!product) {
        return res.status(400).json({ success: false, message: '部分商品 ID 不存在' });
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
        createdAt: new Date(),
      };
      req.app.locals.db.fallbackOrders.push(order);
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
