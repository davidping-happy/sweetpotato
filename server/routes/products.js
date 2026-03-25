const express = require('express');
const Product = require('../models/Product');

const router = express.Router();

// GET /api/products — 取得所有商品（可選 ?category=烤地瓜 篩選）
router.get('/', async (req, res) => {
  try {
    if (!req.app.locals.db?.ready) {
      const fallback = req.app.locals.db?.fallbackProducts || [];
      const filtered = req.query.category ? fallback.filter(p => p.category === req.query.category) : fallback;
      return res.json({ success: true, data: filtered });
    }

    const filter = {};
    if (req.query.category) {
      filter.category = req.query.category;
    }
    const products = await Product.find(filter).sort({ createdAt: 1 });
    res.json({ success: true, data: products });
  } catch (err) {
    console.error('取得商品失敗:', err);
    res.status(500).json({ success: false, message: '伺服器錯誤' });
  }
});

// GET /api/products/:id — 取得單一商品
router.get('/:id', async (req, res) => {
  try {
    if (!req.app.locals.db?.ready) {
      const fallback = req.app.locals.db?.fallbackProducts || [];
      const product = fallback.find(p => p._id === req.params.id);
      if (!product) {
        return res.status(404).json({ success: false, message: '找不到該商品' });
      }
      return res.json({ success: true, data: product });
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: '找不到該商品' });
    }
    res.json({ success: true, data: product });
  } catch (err) {
    console.error('取得商品失敗:', err);
    res.status(500).json({ success: false, message: '伺服器錯誤' });
  }
});

module.exports = router;
