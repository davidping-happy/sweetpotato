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
const adminAuthRouter = require('./routes/adminAuth');
const lineAuthRouter = require('./routes/lineAuth');
const lineWebhookRouter = require('./routes/lineWebhook');
const newsletterRouter = require('./routes/newsletter');

const app = express();
const PORT = process.env.PORT || 3000;
const FALLBACK_DATA_DIR = path.join(__dirname, 'data');
const FALLBACK_NEWSLETTER_FILE = path.join(FALLBACK_DATA_DIR, 'newsletter-subscribers.json');
const {
  syncFallbackOrders,
  migrateFallbackOrdersToMongo,
  saveFallbackOrdersToFile,
} = require('./utils/orderPersistence');

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
  fallbackNewsletterSubscribers: [],
  saveFallbackOrders: async () => {},
  saveFallbackNewsletterSubscribers: async () => {},
};

async function saveFallbackNewsletterSubscribersToFile(subscribers) {
  try {
    await fs.mkdir(FALLBACK_DATA_DIR, { recursive: true });
    await fs.writeFile(FALLBACK_NEWSLETTER_FILE, JSON.stringify(subscribers, null, 2), 'utf8');
  } catch (err) {
    console.error('⚠️  寫入 fallback 電子報名單失敗:', err.message);
  }
}

async function loadFallbackNewsletterSubscribersFromFile() {
  try {
    await fs.mkdir(FALLBACK_DATA_DIR, { recursive: true });
    const raw = await fs.readFile(FALLBACK_NEWSLETTER_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

// ============ Middleware ============
app.use(cors());

// LINE webhook 必須在 express.json 之前掛載，以取得原始位元組做簽章驗證
app.use('/api/line/webhook', express.raw({ type: '*/*' }), lineWebhookRouter);

app.use(express.json({ limit: '10mb' }));

const { getPublicAppConfig } = require('./utils/publicAppConfig');

// ============ 公開設定（由環境變數提供，不含密鑰） ============
app.get('/api/config', (req, res) => {
  res.json(getPublicAppConfig(req));
});

app.get('/app-config.json', (req, res) => {
  const config = getPublicAppConfig(req);
  res.json({ apiBaseUrl: config.apiBaseUrl || '' });
});

// 靜態檔案：統一使用 docs 作為唯一前台來源
app.use(express.static(path.join(__dirname, '..', 'docs')));

// ============ API 路由 ============
app.use('/api/products', productsRouter);
app.use('/api/admin', adminAuthRouter);
app.use('/api/line', lineAuthRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/newsletter', newsletterRouter);

// ============ 健康檢查 ============
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: '磐石烤地瓜 API',
    timestamp: new Date().toISOString(),
    database: req.app.locals.db?.ready ? 'mongodb' : 'fallback',
    mongodbConnected: Boolean(req.app.locals.db?.ready),
  });
});

// ============ 資料庫連線 & 啟動 ============
async function connectMongo() {
  const mongoURI = String(process.env.MONGODB_URI || '').trim();
  if (!mongoURI) {
    console.log('ℹ️  未設定 MONGODB_URI，訂單將儲存於 data/orders.json（適合 VPS + 永久磁碟）');
    return false;
  }

  // 嘗試連接外部 MongoDB
  try {
    console.log('🔗 嘗試連接 MongoDB...', mongoURI.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@'));
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

    // 一律載入 fallback 訂單檔（Mongo 模式也會備份；無 Mongo 時為主要儲存）
    const loadedOrders = await syncFallbackOrders(app);
    app.locals.db.saveFallbackOrders = async () => {
      await syncFallbackOrders(app);
      await saveFallbackOrdersToFile(app.locals.db.fallbackOrders || []);
    };

    app.locals.db.fallbackNewsletterSubscribers = await loadFallbackNewsletterSubscribersFromFile();
    app.locals.db.saveFallbackNewsletterSubscribers = async () => {
      await saveFallbackNewsletterSubscribersToFile(app.locals.db.fallbackNewsletterSubscribers || []);
    };
    console.log(`🗂️  fallback 訂單已載入 ${loadedOrders.length} 筆`);
    console.log(`📰 fallback 電子報訂閱已載入 ${app.locals.db.fallbackNewsletterSubscribers.length} 筆`);

    if (dbReady) {
      await migrateFallbackOrdersToMongo();
      await syncFallbackOrders(app);
      // 自動 seed：若商品表為空則寫入初始資料
      const count = await Product.countDocuments();
      if (count === 0) {
        await Product.insertMany(seedProducts);
        console.log(`🌱 已自動寫入 ${seedProducts.length} 筆商品初始資料`);
      } else {
        console.log(`📦 目前有 ${count} 筆商品`);
        // 確保地瓜糖商品圖片與 seed 一致（修正資料庫中錯誤的 imageUrl）
        for (const seed of seedProducts) {
          if (!seed.name.includes('地瓜糖') || !seed.imageUrl) continue;
          const updated = await Product.updateOne(
            { name: seed.name },
            { $set: { imageUrl: seed.imageUrl } },
          );
          if (updated.modifiedCount > 0) {
            console.log(`🖼️ 已更新「${seed.name}」商品圖片`);
          }
        }
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
