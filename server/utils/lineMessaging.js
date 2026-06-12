const crypto = require('crypto');

const LINE_REPLY_URL = 'https://api.line.me/v2/bot/message/reply';
const LINE_PUSH_URL = 'https://api.line.me/v2/bot/message/push';
const LINE_BROADCAST_URL = 'https://api.line.me/v2/bot/message/broadcast';

function getChannelAccessToken() {
  return String(process.env.LINE_CHANNEL_ACCESS_TOKEN || '').trim();
}

function getChannelSecret() {
  return String(process.env.LINE_CHANNEL_SECRET || '').trim();
}

function isMessagingConfigured() {
  return Boolean(getChannelAccessToken());
}

/**
 * 取得 LIFF 連結；若未設定 LIFF 則退回一般網頁網址。
 * 在 LINE 聊天室中按 liff.line.me 連結會於 LINE 內建瀏覽器（LIFF）開啟，達成「在 LINE 內瀏覽網頁」。
 */
function getStoreLink() {
  const liffId = String(process.env.LINE_LIFF_ID || '').trim();
  if (liffId && /^[0-9]{6,12}-[a-zA-Z0-9_-]+$/.test(liffId)) {
    return `https://liff.line.me/${liffId}`;
  }
  return String(process.env.LINE_STOREFRONT_URL || 'https://davidping-happy.github.io/sweetpotato/docs/index.html').trim();
}

const DEFAULT_PROMO_IMAGE_URL = 'https://cdn.jsdelivr.net/gh/davidping-happy/sweetpotato@main/photo/promo-banner.jpg';

/**
 * 促銷大圖（魚中魚版型）的圖片網址，須為公開可存取的 HTTPS。
 * 預設走 jsDelivr CDN（與商品圖一致，需先把 photo/promo-banner.jpg 推上 GitHub）。
 */
function getPromoImageUrl() {
  return String(process.env.LINE_PROMO_IMAGE_URL || DEFAULT_PROMO_IMAGE_URL).trim();
}

/**
 * 驗證 LINE webhook 的 X-Line-Signature。
 * rawBody 必須是原始位元組（Buffer 或 string），不可是已被 JSON.parse 的物件。
 */
function verifySignature(rawBody, signature) {
  const secret = getChannelSecret();
  if (!secret) {
    // 未設定 channel secret：無法驗證，回傳 null 代表「略過驗證」
    return null;
  }
  const body = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(String(rawBody || ''), 'utf8');
  const expected = crypto.createHmac('sha256', secret).update(body).digest('base64');
  const provided = String(signature || '');
  if (expected.length !== provided.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
  } catch {
    return false;
  }
}

async function callLineApi(url, payload) {
  const token = getChannelAccessToken();
  if (!token) {
    return { ok: false, status: 0, reason: 'missing_channel_access_token' };
  }
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      console.error('LINE API 失敗:', url, res.status, detail);
      return { ok: false, status: res.status, detail };
    }
    return { ok: true, status: res.status };
  } catch (err) {
    console.error('LINE API 錯誤:', url, err.message);
    return { ok: false, status: 0, reason: err.message };
  }
}

function replyMessage(replyToken, messages) {
  const list = Array.isArray(messages) ? messages : [messages];
  return callLineApi(LINE_REPLY_URL, { replyToken, messages: list.slice(0, 5) });
}

function pushMessage(to, messages) {
  const list = Array.isArray(messages) ? messages : [messages];
  return callLineApi(LINE_PUSH_URL, { to, messages: list.slice(0, 5) });
}

function broadcastMessage(messages) {
  const list = Array.isArray(messages) ? messages : [messages];
  return callLineApi(LINE_BROADCAST_URL, { messages: list.slice(0, 5) });
}

module.exports = {
  getChannelAccessToken,
  getChannelSecret,
  isMessagingConfigured,
  getStoreLink,
  getPromoImageUrl,
  verifySignature,
  replyMessage,
  pushMessage,
  broadcastMessage,
};
