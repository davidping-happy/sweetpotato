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

  // 若無 SMTP 設定，以 console 模擬
  if (!transporter) {
    console.log('──────────────────────────────────');
    console.log('📧 模擬寄送訂單確認郵件');
    console.log(`   收件人: ${order.customer.email}`);
    console.log(`   主旨:   ${subject}`);
    console.log(`   訂單:   ${order.orderNumber} | NT$${order.total}`);
    console.log('──────────────────────────────────');
    return;
  }

  const mailOptions = {
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: order.customer.email,
    subject,
    html,
  };

  const info = await transporter.sendMail(mailOptions);
  console.log(`✅ 訂單確認郵件已寄送: ${info.messageId}`);
}

module.exports = { sendOrderConfirmation };
