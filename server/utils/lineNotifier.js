const LINE_PUSH_URL = 'https://api.line.me/v2/bot/message/push';

function buildShopMessage(order) {
  return [
    '🍠 新訂單通知（店家）',
    `訂單編號：${order.orderNumber}`,
    `姓名：${order.customer?.name || '-'}`,
    `電話：${order.customer?.phone || '-'}`,
    `地址：${order.customer?.address || '-'}`,
    `Email：${order.customer?.email || '未填寫'}`,
    `總金額：NT$${order.total ?? 0}`,
  ].join('\n');
}

function buildCustomerMessage(order) {
  return [
    '🍠 磐石烤地瓜 — 訂單確認',
    `訂單編號：${order.orderNumber}`,
    `姓名：${order.customer?.name || '-'}`,
    `電話：${order.customer?.phone || '-'}`,
    `地址：${order.customer?.address || '-'}`,
    `總金額：NT$${order.total ?? 0}`,
    '',
    '感謝您的訂購，我們會盡快為您準備。',
  ].join('\n');
}

async function linePush(userId, text, accessToken) {
  const to = String(userId || '').trim();
  const token = String(accessToken || '').trim();
  if (!to || !token) {
    return { attempted: false, sent: false, reason: 'missing_line_credentials' };
  }

  try {
    const res = await fetch(LINE_PUSH_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to,
        messages: [{ type: 'text', text: String(text || '') }],
      }),
    });

    const bodyText = await res.text().catch(() => '');
    let bodyJson = {};
    try {
      bodyJson = bodyText ? JSON.parse(bodyText) : {};
    } catch {
      bodyJson = { raw: bodyText };
    }

    if (!res.ok) {
      const detail = bodyJson.message || bodyText || `HTTP ${res.status}`;
      console.error('LINE Push 失敗:', res.status, detail);
      return {
        attempted: true,
        sent: false,
        reason: `line_api_${res.status}`,
        detail,
      };
    }

    return { attempted: true, sent: true };
  } catch (err) {
    console.error('LINE Push 錯誤:', err.message);
    return { attempted: true, sent: false, reason: err.message };
  }
}

async function sendViaMakeWebhook(order, webhookUrl) {
  const message = buildShopMessage(order);
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: message,
        orderNumber: order.orderNumber,
        customer: order.customer || {},
        total: order.total,
      }),
    });
    const text = await res.text().catch(() => '');
    if (!res.ok) {
      return { attempted: true, sent: false, reason: `http_${res.status}`, detail: text };
    }
    // Make 等 webhook 常只代表「已收到請求」，不代表 LINE 真的推播成功
    return {
      attempted: true,
      sent: false,
      reason: 'webhook_accepted_unverified',
      detail: 'Webhook 已接收，但無法確認 LINE 是否送達。建議改用 LINE_CHANNEL_ACCESS_TOKEN + LINE_SHOP_USER_ID。',
    };
  } catch (err) {
    return { attempted: true, sent: false, reason: err.message };
  }
}

async function sendShopLineNotification(order) {
  const accessToken = String(process.env.LINE_CHANNEL_ACCESS_TOKEN || '').trim();
  const shopUserId = String(process.env.LINE_SHOP_USER_ID || '').trim();
  const webhookUrl = String(process.env.LINE_NOTIFY_WEBHOOK_URL || '').trim();

  if (accessToken && shopUserId) {
    return linePush(shopUserId, buildShopMessage(order), accessToken);
  }
  if (webhookUrl) {
    return sendViaMakeWebhook(order, webhookUrl);
  }
  return { attempted: false, sent: false, reason: 'missing_line_shop_config' };
}

async function sendCustomerLineNotification(order) {
  const accessToken = String(process.env.LINE_CHANNEL_ACCESS_TOKEN || '').trim();
  const customerUserId = String(order.customer?.lineUserId || '').trim();

  if (!customerUserId) {
    return { attempted: false, sent: false, reason: 'missing_customer_line_user_id' };
  }
  if (!accessToken) {
    return { attempted: false, sent: false, reason: 'missing_line_channel_token' };
  }

  return linePush(customerUserId, buildCustomerMessage(order), accessToken);
}

/**
 * 依通知偏好發送 LINE（店家新單 + 客戶訂單確認）
 */
async function sendLineOrderNotifications(order, options = {}) {
  const pref = options.notifyPreference;
  const wantsLine = pref === 'line' || pref === 'both';
  const wantsCustomerLine = pref === 'both';

  const result = {
    shop: { attempted: false, sent: false, reason: 'disabled_by_customer' },
    customer: { attempted: false, sent: false, reason: 'disabled_by_customer' },
  };

  if (!wantsLine) {
    return result;
  }

  result.shop = await sendShopLineNotification(order);

  if (wantsCustomerLine) {
    result.customer = await sendCustomerLineNotification(order);
  }

  return result;
}

module.exports = {
  sendLineOrderNotifications,
  sendLineOrderNotification: sendLineOrderNotifications,
};
