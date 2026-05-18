const nodemailer = require('nodemailer');
const { buildOrderEmailHTML } = require('./emailTemplate');

/**
 * 建立 Nodemailer transporter
 * 若環境變數未設定 SMTP，則使用 console 模擬輸出
 */
function createTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.log('⚠️  SMTP 未設定，郵件將以 console 模式輸出（不會實際寄送）');
    return null;
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: Number(SMTP_PORT) === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
}

let transporter = null;

/**
 * 寄送訂單確認郵件
 * @param {Object} order - Mongoose Order document
 */
async function sendOrderConfirmation(order) {
  if (!transporter) {
    transporter = createTransporter();
  }

  const html = buildOrderEmailHTML(order);
  const subject = `【磐石烤地瓜】訂單確認 — ${order.orderNumber}`;

  if (!order.customer?.email) {
    return { attempted: false, sent: false, reason: 'missing_customer_email' };
  }

  if (!transporter) {
    console.log('──────────────────────────────────');
    console.log('📧 模擬寄送訂單確認郵件');
    console.log(`   收件人: ${order.customer.email}`);
    console.log(`   主旨:   ${subject}`);
    console.log(`   訂單:   ${order.orderNumber} | NT$${order.total}`);
    console.log('──────────────────────────────────');
    return { attempted: true, sent: false, reason: 'smtp_not_configured' };
  }

  const mailOptions = {
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: order.customer.email,
    subject,
    html,
  };

  const info = await transporter.sendMail(mailOptions);
  console.log(`✅ 訂單確認郵件已寄送: ${info.messageId}`);
  return { attempted: true, sent: true, messageId: info.messageId };
}

/**
 * 寄送後台密碼重設郵件
 * @param {{ to: string, resetUrl: string }} params
 */
async function sendAdminPasswordResetEmail({ to, resetUrl }) {
  if (!to) {
    return { attempted: false, sent: false, reason: 'missing_email' };
  }

  if (!transporter) {
    transporter = createTransporter();
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

  if (!transporter) {
    console.log('──────────────────────────────────');
    console.log('📧 模擬寄送後台密碼重設郵件');
    console.log(`   收件人: ${to}`);
    console.log(`   重設連結: ${resetUrl}`);
    console.log('──────────────────────────────────');
    return { attempted: true, sent: false, reason: 'smtp_not_configured', resetUrl };
  }

  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject,
    html,
  });
  console.log(`✅ 後台密碼重設郵件已寄送: ${info.messageId}`);
  return { attempted: true, sent: true, messageId: info.messageId };
}

module.exports = { sendOrderConfirmation, sendAdminPasswordResetEmail };
