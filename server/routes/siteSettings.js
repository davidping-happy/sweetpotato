const express = require('express');
const { getSiteSettings, updateSiteSettings } = require('../utils/siteSettings');
const { requireAdminAuth } = require('../middleware/requireAdminAuth');

const router = express.Router();

// GET /api/site-settings — 公開：App / 網站讀取店家設定
router.get('/', async (req, res) => {
  try {
    const settings = await getSiteSettings(req.app);
    res.json({ success: true, data: settings });
  } catch (err) {
    console.error('取得店家設定失敗:', err);
    res.status(500).json({ success: false, message: '取得店家設定失敗' });
  }
});

// PUT /api/site-settings — 管理員：更新店家設定（部分更新）
router.put('/', requireAdminAuth, async (req, res) => {
  try {
    const updated = await updateSiteSettings(req.app, req.body || {});
    res.json({ success: true, message: '店家設定已更新', data: updated });
  } catch (err) {
    console.error('更新店家設定失敗:', err);
    res.status(500).json({ success: false, message: err.message || '更新店家設定失敗' });
  }
});

module.exports = router;
