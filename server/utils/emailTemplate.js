/**
 * 訂單確認郵件 HTML 範本
 * 品牌色系：橘 #F28C28 / 棕 #5D4037 / 奶油底 #FFF9E6
 */
function buildOrderEmailHTML(order) {
  const itemsRows = order.items
    .map(
      (item) => `
      <tr>
        <td style="padding:12px 16px; border-bottom:1px solid #f0e6d6;">${item.name}</td>
        <td style="padding:12px 16px; border-bottom:1px solid #f0e6d6; text-align:center;">${item.quantity}</td>
        <td style="padding:12px 16px; border-bottom:1px solid #f0e6d6; text-align:right;">NT$${item.price}</td>
        <td style="padding:12px 16px; border-bottom:1px solid #f0e6d6; text-align:right; font-weight:bold;">NT$${item.price * item.quantity}</td>
      </tr>`
    )
    .join('');

  const shippingLabel = order.shipping === 0
    ? '<span style="color:#16a34a; font-weight:bold;">免運費 🎉</span>'
    : `NT$${order.shipping}`;

  return `
<!DOCTYPE html>
<html lang="zh-TW">
<head><meta charset="utf-8" /></head>
<body style="margin:0; padding:0; background-color:#FFF9E6; font-family:'Helvetica Neue',Arial,'PingFang TC','Microsoft JhengHei',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#FFF9E6; padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.06);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#F28C28,#e07b1f); padding:32px 40px; text-align:center;">
            <h1 style="margin:0; color:#ffffff; font-size:28px; letter-spacing:2px;">磐石烤地瓜</h1>
            <p style="margin:8px 0 0; color:rgba(255,255,255,0.85); font-size:14px;">番薯阿嬤的溫暖滋味</p>
          </td>
        </tr>

        <!-- Greeting -->
        <tr>
          <td style="padding:32px 40px 16px;">
            <h2 style="margin:0 0 8px; color:#5D4037; font-size:22px;">感謝您的訂購！ ❤️</h2>
            <p style="margin:0; color:#5D4037; font-size:15px; line-height:1.6;">
              ${order.customer.name} 您好，<br/>
              您的訂單已成功建立，以下是訂單明細：
            </p>
          </td>
        </tr>

        <!-- Order Number -->
        <tr>
          <td style="padding:0 40px 24px;">
            <table width="100%" style="background:#FFF9E6; border-radius:12px; padding:16px 20px;">
              <tr>
                <td style="color:#5D4037; font-size:13px;">訂單編號</td>
                <td style="color:#F28C28; font-size:20px; font-weight:bold; text-align:right; letter-spacing:1px;">${order.orderNumber}</td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Items Table -->
        <tr>
          <td style="padding:0 40px 24px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #f0e6d6; border-radius:12px; overflow:hidden;">
              <thead>
                <tr style="background:#FFF9E6;">
                  <th style="padding:12px 16px; text-align:left; color:#5D4037; font-size:13px; font-weight:600;">商品</th>
                  <th style="padding:12px 16px; text-align:center; color:#5D4037; font-size:13px; font-weight:600;">數量</th>
                  <th style="padding:12px 16px; text-align:right; color:#5D4037; font-size:13px; font-weight:600;">單價</th>
                  <th style="padding:12px 16px; text-align:right; color:#5D4037; font-size:13px; font-weight:600;">小計</th>
                </tr>
              </thead>
              <tbody>
                ${itemsRows}
              </tbody>
            </table>
          </td>
        </tr>

        <!-- Totals -->
        <tr>
          <td style="padding:0 40px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:8px 0; color:#5D4037; font-size:14px;">商品小計</td>
                <td style="padding:8px 0; text-align:right; color:#5D4037; font-size:14px;">NT$${order.subtotal}</td>
              </tr>
              <tr>
                <td style="padding:8px 0; color:#5D4037; font-size:14px;">運費</td>
                <td style="padding:8px 0; text-align:right; font-size:14px;">${shippingLabel}</td>
              </tr>
              <tr>
                <td colspan="2" style="border-top:2px solid #F28C28; padding-top:12px;"></td>
              </tr>
              <tr>
                <td style="padding:4px 0; color:#5D4037; font-size:18px; font-weight:bold;">總金額</td>
                <td style="padding:4px 0; text-align:right; color:#F28C28; font-size:24px; font-weight:bold;">NT$${order.total}</td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Shipping Info -->
        <tr>
          <td style="padding:0 40px 32px;">
            <table width="100%" style="background:#FFF9E6; border-radius:12px; padding:16px 20px;">
              <tr><td style="color:#5D4037; font-size:13px; font-weight:600; padding-bottom:8px;">📦 寄送資訊</td></tr>
              <tr><td style="color:#5D4037; font-size:14px; line-height:1.8;">
                ${order.customer.name}<br/>
                ${order.customer.phone}<br/>
                ${order.customer.address}
              </td></tr>
            </table>
          </td>
        </tr>

        <!-- Divider -->
        <tr><td style="padding:0 40px;"><hr style="border:none; border-top:1px solid #f0e6d6;" /></td></tr>

        <!-- Store Contact -->
        <tr>
          <td style="padding:24px 40px 32px; text-align:center;">
            <p style="margin:0 0 4px; color:#F28C28; font-size:16px; font-weight:bold;">磐石烤地瓜 — 番薯阿嬤</p>
            <p style="margin:0; color:#5D4037; font-size:13px; line-height:1.8;">
              📍 高雄市左營區華夏路576號<br/>
              📞 0953830409<br/>
              ✉️ sweetpotatograndmom@gmail.com
            </p>
            <p style="margin:16px 0 0; color:#999; font-size:11px;">
              © 2026 磐石烤地瓜 版權所有
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/**
 * 店家新訂單通知郵件 HTML
 */
function buildOrderShopEmailHTML(order) {
  const itemsList = order.items
    .map((item) => `<li>${item.name} × ${item.quantity}（NT$${item.price * item.quantity}）</li>`)
    .join('');

  const shippingLabel = order.shipping === 0 ? '免運費' : `NT$${order.shipping}`;

  return `
<!DOCTYPE html>
<html lang="zh-TW">
<head><meta charset="utf-8" /></head>
<body style="margin:0; padding:24px; background:#FFF9E6; font-family:Arial,'PingFang TC','Microsoft JhengHei',sans-serif; color:#5D4037;">
  <div style="max-width:560px; margin:0 auto; background:#fff; border-radius:12px; padding:28px; box-shadow:0 4px 16px rgba(0,0,0,0.06);">
    <h2 style="margin:0 0 8px; color:#F28C28;">🍠 新訂單通知</h2>
    <p style="margin:0 0 20px; font-size:14px;">訂單編號：<strong style="color:#F28C28;">${order.orderNumber}</strong></p>
    <table style="width:100%; font-size:14px; line-height:1.8; margin-bottom:20px;">
      <tr><td style="width:88px; color:#888;">姓名</td><td>${order.customer?.name || '-'}</td></tr>
      <tr><td style="color:#888;">電話</td><td>${order.customer?.phone || '-'}</td></tr>
      <tr><td style="color:#888;">Email</td><td>${order.customer?.email || '未填寫'}</td></tr>
      <tr><td style="color:#888;">地址</td><td>${order.customer?.address || '-'}</td></tr>
    </table>
    <p style="margin:0 0 8px; font-weight:bold;">商品明細</p>
    <ul style="margin:0 0 20px; padding-left:20px; font-size:14px;">${itemsList}</ul>
    <p style="margin:0; font-size:14px;">小計 NT$${order.subtotal}｜運費 ${shippingLabel}｜<strong style="color:#F28C28; font-size:18px;">總計 NT$${order.total}</strong></p>
    <p style="margin:24px 0 0; font-size:12px; color:#999;">請至後台確認並處理訂單。</p>
  </div>
</body>
</html>`;
}

module.exports = { buildOrderEmailHTML, buildOrderShopEmailHTML };
