const express = require('express');
const NewsletterSubscriber = require('../models/NewsletterSubscriber');
const { sendNewsletterWelcomeEmail, sendNewsletterAdminNotification } = require('../utils/mailer');

const router = express.Router();

function normalizeEmail(raw) {
  return String(raw || '').trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function findFallbackSubscriber(fallbackSubscribers, email) {
  return fallbackSubscribers.find((item) => normalizeEmail(item.email) === email);
}

router.post('/subscribe', async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    if (!email) {
      return res.status(400).json({ success: false, message: '請輸入 Email' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ success: false, message: 'Email 格式不正確' });
    }

    let alreadySubscribed = false;

    if (req.app.locals.db?.ready) {
      const existing = await NewsletterSubscriber.findOne({ email }).lean();
      if (existing?.active) {
        alreadySubscribed = true;
      } else if (existing) {
        await NewsletterSubscriber.updateOne({ email }, { $set: { active: true, source: 'website' } });
      } else {
        await NewsletterSubscriber.create({ email, source: 'website', active: true });
      }
    } else {
      const fallbackSubscribers = req.app.locals.db?.fallbackNewsletterSubscribers || [];
      const existing = findFallbackSubscriber(fallbackSubscribers, email);
      if (existing?.active) {
        alreadySubscribed = true;
      } else if (existing) {
        existing.active = true;
        existing.source = 'website';
        existing.updatedAt = new Date().toISOString();
      } else {
        fallbackSubscribers.push({
          email,
          source: 'website',
          active: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
      if (req.app.locals.db?.saveFallbackNewsletterSubscribers) {
        await req.app.locals.db.saveFallbackNewsletterSubscribers();
      }
    }

    const welcomeEmail = alreadySubscribed
      ? { attempted: false, sent: false, reason: 'already_subscribed' }
      : await sendNewsletterWelcomeEmail(email);
    const adminNotification = alreadySubscribed
      ? { attempted: false, sent: false, reason: 'already_subscribed' }
      : await sendNewsletterAdminNotification(email);

    return res.json({
      success: true,
      alreadySubscribed,
      message: alreadySubscribed
        ? '您已訂閱過電子報，感謝支持！'
        : '感謝訂閱！阿嬤的溫暖報即將送達 ❤️',
      notifications: {
        welcomeEmail,
        adminNotification,
      },
    });
  } catch (err) {
    if (err?.code === 11000) {
      return res.json({
        success: true,
        alreadySubscribed: true,
        message: '您已訂閱過電子報，感謝支持！',
      });
    }
    console.error('電子報訂閱失敗:', err);
    return res.status(500).json({ success: false, message: '訂閱失敗，請稍後再試' });
  }
});

module.exports = router;
