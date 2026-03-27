/**
 * 磐石烤地瓜 — 商品初始資料
 * 依據實際攤位照片標示的價格
 */
const IMAGE_CDN_BASE = 'https://cdn.jsdelivr.net/gh/davidping-happy/sweetpotato@main/';

const seedProducts = [
  {
    name: '台農57號黃金地瓜',
    description: '嚴選在地優質地瓜，炭火慢烤，糖蜜流溢，肉質鬆軟綿密。',
    price: 100,
    category: '烤地瓜',
    inStock: true,
    imageUrl: `${IMAGE_CDN_BASE}photo/002.jpg`,
  },
  {
    name: '手作地瓜糖（小盒）',
    description: '酥脆地瓜片與蜜地瓜，把家鄉的溫暖帶走，追劇旅遊的最佳良伴。',
    price: 45,
    category: '零食',
    inStock: true,
    imageUrl: `${IMAGE_CDN_BASE}photo/005.png`,
  },
  {
    name: '手作地瓜糖（大盒）',
    description: '酥脆地瓜片與蜜地瓜，把家鄉的溫暖帶走，追劇旅遊的最佳良伴。',
    price: 65,
    category: '零食',
    inStock: true,
    imageUrl: `${IMAGE_CDN_BASE}photo/005.png`,
  },
  {
    name: '古早味茶葉蛋（1粒）',
    description: '慢熬24小時，五香漢方藥材入味，每一口都透著溫潤香氣。',
    price: 13,
    category: '蛋',
    inStock: true,
    imageUrl: `${IMAGE_CDN_BASE}photo/004.png`,
  },
  {
    name: '古早味茶葉蛋（2粒）',
    description: '慢熬24小時，五香漢方藥材入味，每一口都透著溫潤香氣。',
    price: 25,
    category: '蛋',
    inStock: true,
    imageUrl: `${IMAGE_CDN_BASE}photo/004.png`,
  },
];

module.exports = seedProducts;
