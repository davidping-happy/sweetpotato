/**
 * 磐石烤地瓜 — 商品初始資料
 * 依據實際攤位照片標示的價格
 */
const IMAGE_CDN_BASE = 'https://cdn.jsdelivr.net/gh/davidping-happy/sweetpotato@main/';

const seedProducts = [
  {
    name: '黃金地瓜（1斤）',
    description: '嚴選在地黃金地瓜，香甜綿密。（每斤）',
    price: 100,
    category: '烤地瓜',
    inStock: true,
    imageUrl: `${IMAGE_CDN_BASE}photo/002.jpg`,
  },
  {
    name: '手作地瓜糖/酥（小盒）',
    description: '酥脆香甜，輕巧分享包裝。',
    price: 45,
    category: '零食',
    inStock: true,
    imageUrl: `${IMAGE_CDN_BASE}photo/005.png`,
  },
  {
    name: '手作地瓜糖/酥（大盒）',
    description: '份量更足，送禮自用都適合。',
    price: 65,
    category: '零食',
    inStock: true,
    imageUrl: `${IMAGE_CDN_BASE}photo/005.png`,
  },
  {
    name: '古早味茶葉蛋（1粒）',
    description: '慢熬入味，單顆方便選購。',
    price: 13,
    category: '蛋',
    inStock: true,
    imageUrl: `${IMAGE_CDN_BASE}photo/004.png`,
  },
  {
    name: '古早味茶葉蛋（2粒）',
    description: '雙顆優惠組合。',
    price: 25,
    category: '蛋',
    inStock: true,
    imageUrl: `${IMAGE_CDN_BASE}photo/004.png`,
  },
];

module.exports = seedProducts;
