/**
 * 建立 LINE Flex Message 商品輪播卡片（如 IKEA 聊天室商品卡）。
 * 每張卡片：商品圖、品名、描述、價格，加上「立即購買 / 看更多」按鈕連回 LIFF 商店。
 */

const BRAND_COLOR = '#C0683A';
const PRICE_COLOR = '#B23A2E';
const PLACEHOLDER_IMAGE = 'https://placehold.co/600x400/F3E9E0/C0683A?text=Sweet+Potato';

function safeImage(url) {
  const value = String(url || '').trim();
  if (/^https:\/\//i.test(value)) return value;
  return PLACEHOLDER_IMAGE;
}

function truncate(text, max) {
  const value = String(text || '').trim();
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}

function buildProductBubble(product, storeLink) {
  const name = truncate(product.name || '商品', 36);
  const desc = truncate(product.description || ' ', 50) || ' ';
  const price = Number(product.price || 0);
  const inStock = product.inStock !== false;

  return {
    type: 'bubble',
    size: 'kilo',
    hero: {
      type: 'image',
      url: safeImage(product.imageUrl),
      size: 'full',
      aspectRatio: '1.51:1',
      aspectMode: 'cover',
      action: { type: 'uri', label: name, uri: storeLink },
    },
    body: {
      type: 'box',
      layout: 'vertical',
      spacing: 'sm',
      contents: [
        {
          type: 'text',
          text: name,
          weight: 'bold',
          size: 'md',
          color: '#3A2A1E',
          wrap: true,
        },
        {
          type: 'text',
          text: desc,
          size: 'xs',
          color: '#8A7A6E',
          wrap: true,
          maxLines: 2,
        },
        {
          type: 'box',
          layout: 'baseline',
          contents: [
            { type: 'text', text: 'NT$', size: 'sm', color: PRICE_COLOR, flex: 0 },
            {
              type: 'text',
              text: String(price),
              size: 'xl',
              weight: 'bold',
              color: PRICE_COLOR,
              margin: 'xs',
            },
          ],
        },
      ],
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      spacing: 'sm',
      contents: [
        {
          type: 'button',
          style: 'primary',
          height: 'sm',
          color: inStock ? BRAND_COLOR : '#B0A89E',
          action: {
            type: 'uri',
            label: inStock ? '立即購買' : '查看商品',
            uri: storeLink,
          },
        },
      ],
    },
  };
}

function buildMoreBubble(storeLink) {
  return {
    type: 'bubble',
    size: 'kilo',
    body: {
      type: 'box',
      layout: 'vertical',
      justifyContent: 'center',
      alignItems: 'center',
      spacing: 'md',
      contents: [
        { type: 'text', text: '🍠', size: 'xxl', align: 'center' },
        {
          type: 'text',
          text: '看完整菜單',
          weight: 'bold',
          size: 'lg',
          align: 'center',
          color: '#3A2A1E',
        },
        {
          type: 'text',
          text: '在 LINE 內直接逛商店',
          size: 'xs',
          align: 'center',
          color: '#8A7A6E',
          wrap: true,
        },
      ],
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'button',
          style: 'primary',
          color: BRAND_COLOR,
          action: { type: 'uri', label: '進入商店', uri: storeLink },
        },
      ],
    },
  };
}

/**
 * @param {Array} products 商品陣列
 * @param {object} options { storeLink, altText }
 * @returns {object|null} LINE flex message 物件
 */
function buildProductCarousel(products, { storeLink, altText } = {}) {
  const list = Array.isArray(products) ? products.filter(Boolean) : [];
  if (!list.length) return null;

  // Flex carousel 上限 12 個 bubble，保留 1 個給「看更多」
  const bubbles = list.slice(0, 11).map((p) => buildProductBubble(p, storeLink));
  bubbles.push(buildMoreBubble(storeLink));

  return {
    type: 'flex',
    altText: altText || '🍠 磐石烤地瓜 — 精選商品',
    contents: {
      type: 'carousel',
      contents: bubbles,
    },
  };
}

/**
 * 魚中魚版型：聊天室裡一張「大張可點擊的促銷海報」，點整張圖即開啟 LIFF 商店。
 * @param {object} options { imageUrl, storeLink, altText, aspectRatio }
 */
function buildPromoBanner({ imageUrl, storeLink, altText, aspectRatio } = {}) {
  const url = safeImage(imageUrl);
  return {
    type: 'flex',
    altText: altText || '🍠 磐石烤地瓜 — 古早味烤地瓜節',
    contents: {
      type: 'bubble',
      size: 'giga',
      hero: {
        type: 'image',
        url,
        size: 'full',
        aspectRatio: aspectRatio || '1.51:1',
        aspectMode: 'cover',
        action: { type: 'uri', label: '線上訂購', uri: storeLink },
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: BRAND_COLOR,
            action: { type: 'uri', label: '🛒 立即線上訂購', uri: storeLink },
          },
        ],
      },
    },
  };
}

function buildTextMessage(text) {
  return { type: 'text', text: String(text || '') };
}

/**
 * 歡迎 / 引導訊息（含快速選單按鈕）。
 */
function buildWelcomeMessage(storeLink) {
  return {
    type: 'flex',
    altText: '🍠 歡迎光臨磐石烤地瓜',
    contents: {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        contents: [
          { type: 'text', text: '🍠 磐石烤地瓜', weight: 'bold', size: 'xl', color: BRAND_COLOR },
          {
            type: 'text',
            text: '炭火慢烤・古早味手作。輸入「菜單」即可看商品，或點下方按鈕在 LINE 內直接逛商店。',
            size: 'sm',
            color: '#6A5A4E',
            wrap: true,
          },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: BRAND_COLOR,
            action: { type: 'uri', label: '🛒 進入商店', uri: storeLink },
          },
          {
            type: 'button',
            style: 'secondary',
            height: 'sm',
            action: { type: 'message', label: '📋 看菜單', text: '菜單' },
          },
        ],
      },
    },
  };
}

module.exports = {
  buildProductCarousel,
  buildPromoBanner,
  buildTextMessage,
  buildWelcomeMessage,
};
