const mongoose = require('mongoose');

/**
 * 店家設定：單一文件（key='default'），存放可由後台編輯、
 * 並由 App / 網站同步讀取的資訊（聯絡方式、LINE、運費、文案）。
 */
const siteSettingsSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    default: 'default',
  },
  shop: {
    name: { type: String, default: '' },
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
    address: { type: String, default: '' },
  },
  line: {
    officialId: { type: String, default: '' },
    addFriendUrl: { type: String, default: '' },
  },
  shipping: {
    fee: { type: Number, default: 150 },
    freeThresholdQty: { type: Number, default: 20 },
    freeThresholdKeyword: { type: String, default: '黃金地瓜' },
  },
  content: {
    heroTag: { type: String, default: '' },
    heroTitle: { type: String, default: '' },
    heroSubtitle: { type: String, default: '' },
    storyTitle: { type: String, default: '' },
    storyBody: { type: String, default: '' },
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('SiteSettings', siteSettingsSchema);
