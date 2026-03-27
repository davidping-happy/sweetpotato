const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, '數量至少為 1'],
  },
}, { _id: false });

const statusHistorySchema = new mongoose.Schema({
  from: {
    type: String,
    enum: ['pending', 'confirmed', 'shipped', 'completed', 'cancelled', 'created'],
    required: true,
  },
  to: {
    type: String,
    enum: ['pending', 'confirmed', 'shipped', 'completed', 'cancelled'],
    required: true,
  },
  changedBy: {
    type: String,
    required: true,
    trim: true,
  },
  changedAt: {
    type: Date,
    required: true,
    default: Date.now,
  },
}, { _id: false });

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  items: {
    type: [orderItemSchema],
    validate: {
      validator: (arr) => arr.length > 0,
      message: '訂單至少需包含一項商品',
    },
  },
  subtotal: {
    type: Number,
    required: true,
    min: 0,
  },
  shipping: {
    type: Number,
    required: true,
    default: 150,
  },
  total: {
    type: Number,
    required: true,
    min: 0,
  },
  customer: {
    name:    { type: String, required: [true, '顧客姓名為必填'] },
    email:   { type: String, default: '' },
    phone:   { type: String, required: [true, '電話號碼為必填'] },
    address: { type: String, required: [true, '寄送地址為必填'] },
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'shipped', 'completed', 'cancelled'],
    default: 'pending',
  },
  statusHistory: {
    type: [statusHistorySchema],
    default: [],
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Order', orderSchema);
