#!/usr/bin/env node
/**
 * 一鍵安裝 LINE 官方帳號「圖文選單 (Rich Menu)」。
 *
 * 用法：
 *   1. 在 server/.env 設定 LINE_CHANNEL_ACCESS_TOKEN（Messaging API 長期權杖）
 *      以及（建議）LINE_LIFF_ID，按鈕才會在 LINE 內建瀏覽器開啟商店。
 *   2. 準備一張圖文選單圖片（建議 2500x843，PNG/JPEG，<1MB）。
 *   3. 執行：
 *        node scripts/setup-line-richmenu.js [圖片路徑]
 *      未指定路徑時，預設使用 scripts/richmenu.png。
 *
 * 版面（2500 x 843，三等分）：
 *   ┌──────────────┬──────────────┬──────────────┐
 *   │   逛商店      │   看菜單      │   聯絡我們     │
 *   │ (開 LIFF)     │ (傳「菜單」)  │ (傳「客服」)   │
 *   └──────────────┴──────────────┴──────────────┘
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', 'server', '.env') });
const fs = require('fs');
const path = require('path');

const TOKEN = String(process.env.LINE_CHANNEL_ACCESS_TOKEN || '').trim();
const LIFF_ID = String(process.env.LINE_LIFF_ID || '').trim();
const STOREFRONT_URL = String(process.env.LINE_STOREFRONT_URL || 'https://davidping-happy.github.io/sweetpotato/docs/index.html').trim();

function storeLink() {
  if (LIFF_ID && /^[0-9]{6,12}-[a-zA-Z0-9_-]+$/.test(LIFF_ID)) {
    return `https://liff.line.me/${LIFF_ID}`;
  }
  return STOREFRONT_URL;
}

const RICH_MENU_SIZE = { width: 2500, height: 843 };

const richMenu = {
  size: RICH_MENU_SIZE,
  selected: true,
  name: '磐石烤地瓜主選單',
  chatBarText: '🍠 開啟選單',
  areas: [
    {
      bounds: { x: 0, y: 0, width: 833, height: 843 },
      action: { type: 'uri', label: '逛商店', uri: storeLink() },
    },
    {
      bounds: { x: 833, y: 0, width: 834, height: 843 },
      action: { type: 'message', label: '看菜單', text: '菜單' },
    },
    {
      bounds: { x: 1667, y: 0, width: 833, height: 843 },
      action: { type: 'message', label: '聯絡我們', text: '客服' },
    },
  ],
};

async function lineApi(method, url, { json, body, contentType } = {}) {
  const headers = { Authorization: `Bearer ${TOKEN}` };
  let payload;
  if (json) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(json);
  } else if (body) {
    headers['Content-Type'] = contentType;
    payload = body;
  }
  const res = await fetch(url, { method, headers, body: payload });
  const text = await res.text().catch(() => '');
  if (!res.ok) {
    throw new Error(`${method} ${url} → HTTP ${res.status} ${text}`);
  }
  return text ? JSON.parse(text) : {};
}

async function deleteExistingMenus() {
  const list = await lineApi('GET', 'https://api.line.me/v2/bot/richmenu/list');
  const menus = (list && list.richmenus) || [];
  for (const m of menus) {
    await lineApi('DELETE', `https://api.line.me/v2/bot/richmenu/${m.richMenuId}`);
    console.log(`🗑️  已刪除舊選單 ${m.richMenuId}`);
  }
}

async function main() {
  if (!TOKEN) {
    console.error('❌ 未設定 LINE_CHANNEL_ACCESS_TOKEN，請先在 server/.env 填入 Messaging API 長期權杖。');
    process.exit(1);
  }

  const defaultImage = ['richmenu.jpg', 'richmenu.png']
    .map((f) => path.join(__dirname, f))
    .find((p) => fs.existsSync(p)) || path.join(__dirname, 'richmenu.jpg');
  const imagePath = path.resolve(process.argv[2] || defaultImage);
  if (!fs.existsSync(imagePath)) {
    console.error(`❌ 找不到圖文選單圖片：${imagePath}`);
    console.error('   請提供圖片路徑：node scripts/setup-line-richmenu.js <圖片路徑>（建議 2500x843 PNG）');
    process.exit(1);
  }

  const imageBuffer = fs.readFileSync(imagePath);
  const ext = path.extname(imagePath).toLowerCase();
  const contentType = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png';

  console.log('🔗 商店連結：', storeLink());
  console.log('🧹 清除既有圖文選單...');
  await deleteExistingMenus();

  console.log('📐 建立圖文選單...');
  const created = await lineApi('POST', 'https://api.line.me/v2/bot/richmenu', { json: richMenu });
  const richMenuId = created.richMenuId;
  console.log('   richMenuId =', richMenuId);

  console.log('🖼️  上傳選單圖片...');
  await lineApi('POST', `https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`, {
    body: imageBuffer,
    contentType,
  });

  console.log('📌 設為預設選單（所有使用者）...');
  await lineApi('POST', `https://api.line.me/v2/bot/user/all/richmenu/${richMenuId}`);

  console.log('\n✅ 圖文選單安裝完成！打開你的 LINE 官方帳號聊天室即可看到底部選單。');
}

main().catch((err) => {
  console.error('❌ 安裝失敗：', err.message);
  process.exit(1);
});
