const express = require('express');
const Product = require('../models/Product');
const { requireAdminAuth } = require('../middleware/requireAdminAuth');
const {
  persistFallbackProducts,
  generateLocalId,
  validateProductInput,
} = require('../utils/productPersistence');

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

// ============ 以下為管理員專用（需 Bearer token） ============

// POST /api/products — 新增商品
router.post('/', requireAdminAuth, async (req, res) => {
  try {
    const result = validateProductInput(req.body || {}, { partial: false });
    if (!result.ok) {
      return res.status(400).json({ success: false, message: result.message });
    }

    if (req.app.locals.db?.ready) {
      const created = await Product.create(result.value);
      return res.status(201).json({ success: true, message: '商品已新增', data: created });
    }

    const product = { _id: generateLocalId(), ...result.value };
    req.app.locals.db.fallbackProducts = req.app.locals.db.fallbackProducts || [];
    req.app.locals.db.fallbackProducts.push(product);
    await persistFallbackProducts(req.app);
    return res.status(201).json({ success: true, message: '商品已新增', data: product });
  } catch (err) {
    console.error('新增商品失敗:', err);
    res.status(500).json({ success: false, message: err.message || '新增商品失敗' });
  }
});

// PUT /api/products/:id — 更新商品（部分欄位）
router.put('/:id', requireAdminAuth, async (req, res) => {
  try {
    const result = validateProductInput(req.body || {}, { partial: true });
    if (!result.ok) {
      return res.status(400).json({ success: false, message: result.message });
    }

    if (req.app.locals.db?.ready) {
      const updated = await Product.findByIdAndUpdate(
        req.params.id,
        { $set: result.value },
        { new: true, runValidators: true },
      );
      if (!updated) {
        return res.status(404).json({ success: false, message: '找不到該商品' });
      }
      return res.json({ success: true, message: '商品已更新', data: updated });
    }

    const list = req.app.locals.db.fallbackProducts || [];
    const idx = list.findIndex(p => p._id === req.params.id);
    if (idx < 0) {
      return res.status(404).json({ success: false, message: '找不到該商品' });
    }
    list[idx] = { ...list[idx], ...result.value };
    await persistFallbackProducts(req.app);
    return res.json({ success: true, message: '商品已更新', data: list[idx] });
  } catch (err) {
    console.error('更新商品失敗:', err);
    res.status(500).json({ success: false, message: err.message || '更新商品失敗' });
  }
});

// DELETE /api/products/:id — 刪除商品
router.delete('/:id', requireAdminAuth, async (req, res) => {
  try {
    if (req.app.locals.db?.ready) {
      const deleted = await Product.findByIdAndDelete(req.params.id);
      if (!deleted) {
        return res.status(404).json({ success: false, message: '找不到該商品' });
      }
      return res.json({ success: true, message: '商品已刪除' });
    }

    const list = req.app.locals.db.fallbackProducts || [];
    const idx = list.findIndex(p => p._id === req.params.id);
    if (idx < 0) {
      return res.status(404).json({ success: false, message: '找不到該商品' });
    }
    list.splice(idx, 1);
    await persistFallbackProducts(req.app);
    return res.json({ success: true, message: '商品已刪除' });
  } catch (err) {
    console.error('刪除商品失敗:', err);
    res.status(500).json({ success: false, message: err.message || '刪除商品失敗' });
  }
});

module.exports = router;
