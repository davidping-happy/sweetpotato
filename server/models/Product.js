const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, '商品名稱為必填'],
    trim: true,
  },
  description: {
    type: String,
    default: '',
  },
  price: {
    type: Number,
    required: [true, '商品價格為必填'],
    min: [0, '價格不可為負數'],
  },
  category: {
    type: String,
    required: true,
    enum: {
      values: ['烤地瓜', '零食', '蛋'],
      message: '分類必須是：烤地瓜、零食、蛋',
    },
  },
  inStock: {
    type: Boolean,
    default: true,
  },
  imageUrl: {
    type: String,
    default: '',
  },
}, {
  timestamps: true,  // 自動產生 createdAt / updatedAt
});

module.exports = mongoose.model('Product', productSchema);
