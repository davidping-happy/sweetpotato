const Product = require('../models/Product');

/**
 * 共用商品讀取：Mongo 連線可用時讀資料庫，否則讀 fallback（seed / data 檔）。
 * 供 /api/products 與 LINE webhook 共用，避免重複邏輯。
 */
async function loadProducts(app, { category, onlyInStock = false } = {}) {
  let products = [];

  if (app?.locals?.db?.ready) {
    const filter = {};
    if (category) filter.category = category;
    const docs = await Product.find(filter).sort({ createdAt: 1 }).lean();
    products = docs.map((p) => ({ ...p, _id: String(p._id) }));
  } else {
    const fallback = app?.locals?.db?.fallbackProducts || [];
    products = category ? fallback.filter((p) => p.category === category) : [...fallback];
  }

  if (onlyInStock) {
    products = products.filter((p) => p.inStock !== false);
  }

  return products;
}

module.exports = { loadProducts };
