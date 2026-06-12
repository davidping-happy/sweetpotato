#!/usr/bin/env node
/**
 * 主動推播「商品輪播卡片」給所有 LINE 好友（如 IKEA 聊天室商品卡）。
 *
 * 用法：
 *   node scripts/push-line-products.js            # 廣播給所有好友
 *   node scripts/push-line-products.js <userId>   # 只推給單一使用者
 *
 * 需先在 server/.env 設定 LINE_CHANNEL_ACCESS_TOKEN（建議也設 LINE_LIFF_ID）。
 * 注意：broadcast 有每月則數上限，請斟酌使用。
 */
(function loadEnv() {
  const path = require('path');
  const envPath = path.join(__dirname, '..', 'server', '.env');
  try {
    require('dotenv').config({ path: envPath });
  } catch {
    try {
      require(path.join(__dirname, '..', 'server', 'node_modules', 'dotenv')).config({ path: envPath });
    } catch {
      console.warn('⚠️  找不到 dotenv，將直接使用環境變數。');
    }
  }
})();
const { buildPromoBanner, buildTextMessage } = require('../server/utils/lineFlex');
const { getStoreLink, getPromoImageUrl, broadcastMessage, pushMessage, isMessagingConfigured } = require('../server/utils/lineMessaging');

async function main() {
  if (!isMessagingConfigured()) {
    console.error('❌ 未設定 LINE_CHANNEL_ACCESS_TOKEN，請先填入 server/.env。');
    process.exit(1);
  }

  const storeLink = getStoreLink();
  const banner = buildPromoBanner({
    imageUrl: getPromoImageUrl(),
    storeLink,
    altText: '🍠 磐石烤地瓜 — 古早味烤地瓜節',
  });

  const messages = [
    buildTextMessage('🍠 古早味烤地瓜節開跑！點下方海報即可在 LINE 內線上訂購 👇'),
    banner,
  ];

  const target = process.argv[2];
  const result = target
    ? await pushMessage(target, messages)
    : await broadcastMessage(messages);

  if (result.ok) {
    console.log(target ? `✅ 已推播給 ${target}` : '✅ 已廣播給所有好友');
  } else {
    console.error('❌ 推播失敗：', result.status, result.detail || result.reason || '');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('❌ 執行失敗：', err.message);
  process.exit(1);
});
