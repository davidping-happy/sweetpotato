const nodemailer = require('nodemailer');
const { buildOrderEmailHTML, buildOrderShopEmailHTML } = require('./emailTemplate');

let transporter = null;
let smtpVerified = false;
let smtpVerifyFailedReason = '';

function trimEnv(value) {
  return String(value || '').trim();
}

function normalizeSmtpError(err) {
  const msg = String(err?.message || 'send_failed');
  if (/invalid login|authentication|535|534|auth/i.test(msg)) return 'smtp_auth_failed';
  if (/certificate|TLS|ECONNREFUSED|ETIMEDOUT|ENOTFOUND/i.test(msg)) return 'smtp_connection_failed';
  return msg;
}

function createTransporter() {
  const host = trimEnv(process.env.SMTP_HOST);
  const user = trimEnv(process.env.SMTP_USER);
  const pass = trimEnv(process.env.SMTP_PASS).replace(/\s/g, '');

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user, pass },
  });
}

async function getVerifiedTransporter() {
  if (smtpVerifyFailedReason) {
    return { transporter: null, reason: smtpVerifyFailedReason };
  }

  if (!transporter) {
    transporter = createTransporter();
  }

  if (!transporter) {
    return { transporter: null, reason: 'smtp_not_configured' };
  }

  if (!smtpVerified) {
    try {
      await transporter.verify();
      smtpVerified = true;
      console.log('✅ SMTP 連線驗證成功');
    } catch (err) {
      smtpVerifyFailedReason = normalizeSmtpError(err);
      console.error('❌ SMTP 連線驗證失敗:', err.message);
      transporter = null;
      return { transporter: null, reason: smtpVerifyFailedReason };
    }
  }

  return { transporter, reason: '' };
}

/**
 * @param {{ to: string, subject: string, html: string, logLabel: string }} params
 */
async function deliverEmail({ to, subject, html, logLabel }) {
  const recipient = trimEnv(to);
  if (!recipient) {
    return { attempted: false, sent: false, reason: 'missing_recipient' };
  }

  const { transporter: activeTransporter, reason } = await getVerifiedTransporter();

  if (!activeTransporter) {
    console.log('──────────────────────────────────');
    console.log(`📧 模擬寄送：${logLabel}`);
    console.log(`   收件人: ${recipient}`);
    console.log(`   主旨:   ${subject}`);
    console.log('──────────────────────────────────');
    return {
      attempted: true,
      sent: false,
      reason: reason || 'smtp_not_configured',
      recipient,
    };
  }

  try {
    const info = await activeTransporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: recipient,
      subject,
      html,
    });
    console.log(`✅ ${logLabel} 已寄送: ${info.messageId} → ${recipient}`);
    return {
      attempted: true,
      sent: true,
      messageId: info.messageId,
      recipient,
    };
  } catch (err) {
    console.error(`❌ ${logLabel} 寄送失敗 (${recipient}):`, err.message);
    return {
      attempted: true,
      sent: false,
      reason: normalizeSmtpError(err),
      recipient,
    };
  }
}

function getShopNotifyEmail() {
  return trimEnv(process.env.SHOP_NOTIFY_EMAIL || 'sweetpotatograndmom@gmail.com');
}

/**
 * 寄送訂單確認郵件給客戶
 * @param {Object} order
 */
async function sendOrderConfirmation(order) {
  const customerEmail = trimEnv(order.customer?.email);
  if (!customerEmail) {
    return { attempted: false, sent: false, reason: 'missing_customer_email' };
  }

  const html = buildOrderEmailHTML(order);
  const subject = `【磐石烤地瓜】訂單確認 — ${order.orderNumber}`;

  return deliverEmail({
    to: customerEmail,
    subject,
    html,
    logLabel: '訂單確認郵件（客戶）',
  });
}

/**
 * 寄送新訂單通知給店家
 * @param {Object} order
 */
async function sendOrderShopNotification(order) {
  const shopEmail = getShopNotifyEmail();
  if (!shopEmail) {
    return { attempted: false, sent: false, reason: 'missing_shop_email' };
  }

  const html = buildOrderShopEmailHTML(order);
  const subject = `【磐石烤地瓜】新訂單 — ${order.orderNumber}`;

  return deliverEmail({
    to: shopEmail,
    subject,
    html,
    logLabel: '新訂單通知（店家）',
  });
}

/**
 * 寄送後台密碼重設郵件
 * @param {{ to: string, resetUrl: string }} params
 */
async function sendAdminPasswordResetEmail({ to, resetUrl }) {
  const recipient = trimEnv(to);
  if (!recipient) {
    return { attempted: false, sent: false, reason: 'missing_email' };
  }

  const subject = '【磐石烤地瓜】後台密碼重設';
  const html = [
    '<div style="font-family: Arial, sans-serif; color: #3a2e2a; line-height: 1.6;">',
    '<h2 style="color: #f28c28;">後台密碼重設</h2>',
    '<p>您好，我們收到後台管理員密碼重設請求。</p>',
    '<p>請在 <strong>1 小時內</strong> 點擊下方按鈕設定新密碼：</p>',
    '<p style="margin: 24px 0;">',
    `<a href="${resetUrl}" style="display:inline-block;padding:12px 20px;background:#f28c28;color:#fff;text-decoration:none;border-radius:8px;">重設後台密碼</a>`,
    '</p>',
    '<p style="font-size: 13px; color: #666;">若按鈕無法開啟，請複製以下連結到瀏覽器：</p>',
    `<p style="font-size: 13px; word-break: break-all;"><a href="${resetUrl}">${resetUrl}</a></p>`,
    '<p style="font-size: 13px; color: #888;">若您未申請重設，可忽略此信。</p>',
    '</div>',
  ].join('');

  const result = await deliverEmail({
    to: recipient,
    subject,
    html,
    logLabel: '後台密碼重設郵件',
  });

  if (!result.sent && result.reason === 'smtp_not_configured') {
    return { ...result, resetUrl };
  }
  return result;
}

async function sendNewsletterWelcomeEmail(email) {
  const recipient = trimEnv(email);
  if (!recipient) {
    return { attempted: false, sent: false, reason: 'missing_email' };
  }

  const subject = '【磐石烤地瓜】歡迎訂閱阿嬤的溫暖報';
  const html = [
    '<div style="font-family: Arial, sans-serif; color: #3a2e2a; line-height: 1.7; max-width: 560px;">',
    '<h2 style="color: #f28c28; margin: 0 0 12px;">歡迎訂閱阿嬤的溫暖報</h2>',
    '<p>感謝您訂閱磐石烤地瓜電子報。</p>',
    '<p>之後我們會不定期分享季節新品、優惠活動與地瓜小知識，讓您第一時間收到最新消息。</p>',
    '<p style="margin-top: 24px; color: #666; font-size: 13px;">',
    '若您並未申請訂閱，可忽略此信。<br/>',
    '磐石烤地瓜｜高雄市左營區華夏路576號<br/>',
    '0953830409｜sweetpotatograndmom@gmail.com',
    '</p>',
    '</div>',
  ].join('');

  return deliverEmail({
    to: recipient,
    subject,
    html,
    logLabel: '電子報歡迎信',
  });
}

async function sendNewsletterAdminNotification(email) {
  const subscriberEmail = trimEnv(email);
  const to = getShopNotifyEmail();
  if (!to || !subscriberEmail) {
    return { attempted: false, sent: false, reason: 'missing_email' };
  }

  const subject = '【磐石烤地瓜】新的電子報訂閱';
  const html = [
    '<div style="font-family: Arial, sans-serif; color: #3a2e2a; line-height: 1.7;">',
    '<h2 style="color: #f28c28;">新的電子報訂閱</h2>',
    `<p>Email：<strong>${subscriberEmail}</strong></p>`,
    `<p style="color:#666;font-size:13px;">訂閱時間：${new Date().toLocaleString('zh-TW')}</p>`,
    '</div>',
  ].join('');

  return deliverEmail({
    to,
    subject,
    html,
    logLabel: '電子報訂閱通知（店家）',
  });
}

module.exports = {
  sendOrderConfirmation,
  sendOrderShopNotification,
  sendAdminPasswordResetEmail,
  sendNewsletterWelcomeEmail,
  sendNewsletterAdminNotification,
};
