const express = require('express');
const { loadProducts } = require('../utils/productCatalog');
const {
  verifySignature,
  replyMessage,
  isMessagingConfigured,
  getStoreLink,
  getPromoImageUrl,
} = require('../utils/lineMessaging');
const {
  buildPromoBanner,
  buildProductCarousel,
  buildTextMessage,
  buildWelcomeMessage,
} = require('../utils/lineFlex');

const router = express.Router();

// 顯示促銷大圖（魚中魚版型）的關鍵字
const MENU_KEYWORDS = ['菜單', '商品', '產品', '購買', '訂購', '地瓜', 'menu', 'shop', 'buy', '我要買', '有什麼', '優惠', '活動'];
// 顯示商品列表卡片（輪播）的關鍵字
const LIST_KEYWORDS = ['列表', '清單', '全部商品', '所有商品', 'list'];
const HELP_KEYWORDS = ['你好', '哈囉', 'hi', 'hello', '在嗎', '客服', '說明', 'help'];

function parseBody(rawBody) {
  try {
    const text = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody || '');
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
}

function matchKeyword(text, keywords) {
  const value = String(text || '').toLowerCase();
  return keywords.some((kw) => value.includes(kw.toLowerCase()));
}

async function handleTextEvent(event, app) {
  const text = event.message?.text || '';
  const storeLink = getStoreLink();

  // 魚中魚版型：回覆一張可點擊的促銷大圖，點擊即在 LINE 內開啟商店
  if (matchKeyword(text, MENU_KEYWORDS)) {
    const banner = buildPromoBanner({
      imageUrl: getPromoImageUrl(),
      storeLink,
      altText: '🍠 磐石烤地瓜 — 古早味烤地瓜節（點圖即可線上訂購）',
    });
    return replyMessage(event.replyToken, [
      buildTextMessage('🍠 古早味烤地瓜節開跑！點下方海報或按鈕，直接在 LINE 內逛商店下單 👇'),
      banner,
    ]);
  }

  // 想看完整商品列表時才回覆輪播卡片
  if (matchKeyword(text, LIST_KEYWORDS)) {
    const products = await loadProducts(app, { onlyInStock: false });
    const carousel = buildProductCarousel(products, {
      storeLink,
      altText: '🍠 磐石烤地瓜 — 全部商品',
    });
    if (carousel) {
      return replyMessage(event.replyToken, [
        buildTextMessage('🍠 以下是全部商品，點「立即購買」可直接在 LINE 內下單！'),
        carousel,
      ]);
    }
    return replyMessage(event.replyToken, buildTextMessage(`目前商品準備中，歡迎先逛逛商店：${storeLink}`));
  }

  if (matchKeyword(text, HELP_KEYWORDS)) {
    return replyMessage(event.replyToken, buildWelcomeMessage(storeLink));
  }

  // 預設回覆
  return replyMessage(event.replyToken, [
    buildTextMessage('歡迎光臨磐石烤地瓜 🍠\n輸入「菜單」即可瀏覽商品，或點下方按鈕在 LINE 內直接逛商店。'),
    buildWelcomeMessage(storeLink),
  ]);
}

async function handleEvent(event, app) {
  try {
    if (event.type === 'message' && event.message?.type === 'text') {
      return await handleTextEvent(event, app);
    }
    if (event.type === 'follow') {
      return await replyMessage(event.replyToken, buildWelcomeMessage(getStoreLink()));
    }
    if (event.type === 'message' && event.replyToken) {
      // 非文字訊息（貼圖、圖片等）
      return await replyMessage(event.replyToken, buildWelcomeMessage(getStoreLink()));
    }
  } catch (err) {
    console.error('LINE webhook 事件處理失敗:', err.message);
  }
  return null;
}

// POST /api/line/webhook — 由 server.js 以 express.raw 掛載，req.body 為 Buffer
router.post('/', async (req, res) => {
  // 一律先回 200，避免 LINE 因逾時重送（事件非同步處理）
  res.status(200).end();

  if (!isMessagingConfigured()) {
    console.warn('⚠️  收到 LINE webhook 但未設定 LINE_CHANNEL_ACCESS_TOKEN，略過。');
    return;
  }

  const signature = req.headers['x-line-signature'];
  const verified = verifySignature(req.body, signature);
  if (verified === false) {
    console.warn('⚠️  LINE webhook 簽章驗證失敗，已忽略此請求。');
    return;
  }
  if (verified === null) {
    console.warn('ℹ️  未設定 LINE_CHANNEL_SECRET，略過 webhook 簽章驗證（建議設定以提升安全性）。');
  }

  const body = parseBody(req.body);
  const events = Array.isArray(body.events) ? body.events : [];
  for (const event of events) {
    await handleEvent(event, req.app);
  }
});

// GET 方便瀏覽器/驗證 webhook 存活
router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    messagingConfigured: isMessagingConfigured(),
    hint: '請在 LINE Developers 的 Messaging API → Webhook URL 設為此網址，並開啟「Use webhook」。',
  });
});

module.exports = router;
