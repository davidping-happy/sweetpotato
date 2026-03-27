require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs/promises');

const Product = require('./models/Product');
const seedProducts = require('./seed/products');
const productsRouter = require('./routes/products');
const ordersRouter = require('./routes/orders');

const app = express();
const PORT = process.env.PORT || 3000;
const FALLBACK_DATA_DIR = path.join(__dirname, 'data');
const FALLBACK_ORDERS_FILE = path.join(FALLBACK_DATA_DIR, 'orders.json');

// ====== DB fallback (no Mongo / no mongodb-memory-server) ======
const fallbackProducts = seedProducts.map((p, idx) => ({
  // React 與根目錄 index.html 都會用到 product 的 `_id`
  _id: `local-${idx + 1}`,
  ...p,
}));

app.locals.db = {
  ready: false,
  fallbackProducts,
  fallbackOrders: [],
  saveFallbackOrders: async () => {},
};

async function loadFallbackOrdersFromFile() {
  try {
    await fs.mkdir(FALLBACK_DATA_DIR, { recursive: true });
    const raw = await fs.readFile(FALLBACK_ORDERS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

async function saveFallbackOrdersToFile(orders) {
  try {
    await fs.mkdir(FALLBACK_DATA_DIR, { recursive: true });
    await fs.writeFile(FALLBACK_ORDERS_FILE, JSON.stringify(orders, null, 2), 'utf8');
  } catch (err) {
    console.error('⚠️  寫入 fallback 訂單檔失敗:', err.message);
  }
}

// ============ Middleware ============
app.use(cors());
app.use(express.json());

// 靜態檔案：統一使用 docs 作為唯一前台來源
app.use(express.static(path.join(__dirname, '..', 'docs')));

// ============ API 路由 ============
app.use('/api/products', productsRouter);
app.use('/api/orders', ordersRouter);

// ============ 健康檢查 ============
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: '磐石烤地瓜 API',
    timestamp: new Date().toISOString(),
  });
});

// ============ 資料庫連線 & 啟動 ============
async function connectMongo() {
  const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/panshi';

  // 嘗試連接外部 MongoDB
  try {
    console.log('🔗 嘗試連接 MongoDB...', mongoURI);
    await mongoose.connect(mongoURI, { serverSelectionTimeoutMS: 3000 });
    console.log('✅ MongoDB 連線成功');
    return true;
  } catch (err) {
    console.log('⚠️  外部 MongoDB 無法連線，切換至記憶體資料庫...');
  }

  // 重要：在你的環境中 mongodb-memory-server 會因限制而失敗（spawn EPERM），
  // 並可能造成後端程序中止。此處直接回傳 false，改用 server 內建的 in-memory fallback。
  return false;
}

async function startServer() {
  try {
    const dbReady = await connectMongo();
    app.locals.db.ready = dbReady;

    // memory fallback 模式：啟動時先載入已保存訂單，並提供保存函式
    if (!dbReady) {
      app.locals.db.fallbackOrders = await loadFallbackOrdersFromFile();
      app.locals.db.saveFallbackOrders = async () => {
        await saveFallbackOrdersToFile(app.locals.db.fallbackOrders || []);
      };
      console.log(`🗂️  fallback 訂單已載入 ${app.locals.db.fallbackOrders.length} 筆`);
    }

    if (dbReady) {
      // 自動 seed：若商品表為空則寫入初始資料
      const count = await Product.countDocuments();
      if (count === 0) {
        await Product.insertMany(seedProducts);
        console.log(`🌱 已自動寫入 ${seedProducts.length} 筆商品初始資料`);
      } else {
        console.log(`📦 目前有 ${count} 筆商品`);
      }
    }

    app.listen(PORT, () => {
      console.log('');
      console.log('╔══════════════════════════════════════════╗');
      console.log('║   🍠 磐石烤地瓜 API 啟動成功！            ║');
      console.log(`║   🌐 http://localhost:${PORT}              ║`);
      console.log(`║   📡 API: http://localhost:${PORT}/api      ║`);
      console.log('╚══════════════════════════════════════════╝');
      console.log('');
    });
  } catch (err) {
    console.error('❌ 伺服器啟動失敗:', err.message);
    process.exit(1);
  }
}

startServer();
