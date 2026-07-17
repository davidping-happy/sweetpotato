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
const siteSettingsRouter = require('./routes/siteSettings');
const { loadFallbackProductsFromFile } = require('./utils/productPersistence');

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

// Render / 反向代理環境：信任第一層 proxy，才能正確取得用戶端 IP（rate limit 用）
app.set('trust proxy', 1);

// CORS 白名單：預設允許 GitHub Pages 前台與本服務網域；其餘可由 ALLOWED_ORIGINS 增補。
// 注意：原生 App / 伺服器間請求不帶 Origin，一律放行（CORS 僅約束瀏覽器跨來源）。
const DEFAULT_ALLOWED_ORIGINS = [
  'https://davidping-happy.github.io',
  'https://sweetpotato-api.onrender.com',
];
function buildAllowedOrigins() {
  const fromEnv = String(process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim().replace(/\/+$/, ''))
    .filter(Boolean);
  const publicBase = String(process.env.PUBLIC_API_BASE_URL || '').trim().replace(/\/+$/, '');
  return new Set([
    ...DEFAULT_ALLOWED_ORIGINS,
    ...fromEnv,
    ...(publicBase ? [publicBase] : []),
  ]);
}
const allowedOrigins = buildAllowedOrigins();

app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true); // App / curl / 伺服器間
    if (allowedOrigins.has(origin)) return callback(null, true);
    if (/^https?:\/\/localhost(:\d+)?$/.test(origin)
      || /^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)) {
      return callback(null, true); // 本機開發
    }
    return callback(new Error(`CORS 拒絕來源：${origin}`));
  },
}));

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
app.use('/api/site-settings', siteSettingsRouter);

// ============ 健康檢查 ============
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: '磐石烤地瓜 API',
    timestamp: new Date().toISOString(),
    database: req.app.locals.db?.ready ? 'mongodb' : 'fallback',
    mongodbConnected: Boolean(req.app.locals.db?.ready),
    persistentStorage: isPersistentStorage(Boolean(req.app.locals.db?.ready)),
  });
});

// ============ 資料庫連線 & 啟動 ============

/**
 * 判斷儲存是否為「永久」：
 * - 有連上 MongoDB → 永久
 * - 或明確設定 DATA_PERSISTENT=true（例如 VPS + docker volume 掛在 data/）→ 永久
 */
function isPersistentStorage(dbReady) {
  if (dbReady) return true;
  return String(process.env.DATA_PERSISTENT || '').toLowerCase() === 'true';
}

/**
 * 若在正式環境（如 Render）但既沒有 MongoDB、也沒有永久磁碟，
 * 資料（訂單 / 管理員密碼 / 商品 / 店家設定）會在重啟後遺失，這裡大聲警告。
 */
function warnIfEphemeral(dbReady) {
  if (isPersistentStorage(dbReady)) return;
  const isProd = process.env.NODE_ENV === 'production';
  const banner = [
    '',
    '⚠️ ============================================================',
    '⚠️  資料儲存為「非永久（ephemeral）」模式！',
    '⚠️  目前未連上 MongoDB，資料存於 data/*.json。',
    '⚠️  在 Render 等平台，重啟 / 重新部署會清空 data/，導致：',
    '⚠️    訂單、已改的管理員密碼、商品、店家設定 全部遺失。',
    '⚠️  解法：於環境變數設定 MONGODB_URI（MongoDB Atlas 免費方案），',
    '⚠️        或改用 VPS + 永久磁碟並設定 DATA_PERSISTENT=true。',
    '⚠️  設定教學：docs/setup-mongodb-atlas.html',
    '⚠️ ============================================================',
    '',
  ].join('\n');
  if (isProd) {
    console.error(banner);
  } else {
    console.log(banner);
  }
}

async function connectMongo() {
  const mongoURI = String(process.env.MONGODB_URI || '').trim();
  if (!mongoURI) {
    console.log('ℹ️  未設定 MONGODB_URI，將使用 data/*.json 儲存（僅在有永久磁碟時才安全）');
    return false;
  }

  const masked = mongoURI.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@');
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      console.log(`🔗 連接 MongoDB（第 ${attempt}/${maxAttempts} 次）...`, masked);
      await mongoose.connect(mongoURI, { serverSelectionTimeoutMS: 10000 });
      console.log('✅ MongoDB 連線成功');
      return true;
    } catch (err) {
      console.error(`⚠️  MongoDB 連線失敗（第 ${attempt} 次）：${err.message}`);
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  }

  // 有設定 URI 卻連不上：在正式環境視為嚴重錯誤（避免把訂單寫進會被清空的檔案），
  // 直接結束程序讓平台重啟重試，而不是靜默降級。
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ 已設定 MONGODB_URI 但無法連線；為避免資料遺失，程序結束以便平台重試。');
    process.exit(1);
  }
  console.log('⚠️  開發環境：改用 data/*.json fallback 繼續執行。');
  return false;
}

async function startServer() {
  try {
    const dbReady = await connectMongo();
    app.locals.db.ready = dbReady;
    warnIfEphemeral(dbReady);

    // fallback 模式：若已有後台編輯過的商品檔，載入它（覆蓋 seed 預設）
    if (!dbReady) {
      const savedProducts = await loadFallbackProductsFromFile();
      if (savedProducts && savedProducts.length > 0) {
        app.locals.db.fallbackProducts = savedProducts;
        console.log(`🛍️  已載入後台編輯的 ${savedProducts.length} 筆商品（data/products.json）`);
      }
    }

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
