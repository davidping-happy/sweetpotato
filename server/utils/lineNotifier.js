async function sendLineOrderNotification(order, options = {}) {
  const webhookUrl = String(process.env.LINE_NOTIFY_WEBHOOK_URL || '').trim();
  const enabled = options.notifyPreference === 'line' || options.notifyPreference === 'both';
  if (!enabled) {
    return { attempted: false, sent: false, reason: 'disabled_by_customer' };
  }
  if (!webhookUrl) {
    return { attempted: false, sent: false, reason: 'missing_webhook_url' };
  }

  const message = [
    '🍠 新訂單通知',
    `訂單編號：${order.orderNumber}`,
    `姓名：${order.customer?.name || '-'}`,
    `電話：${order.customer?.phone || '-'}`,
    `地址：${order.customer?.address || '-'}`,
    `總金額：NT$${order.total ?? 0}`,
  ].join('\n');

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: message, orderNumber: order.orderNumber }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return { attempted: true, sent: false, reason: `http_${res.status}`, detail: text };
    }
    return { attempted: true, sent: true };
  } catch (err) {
    return { attempted: true, sent: false, reason: err.message };
  }
}

module.exports = { sendLineOrderNotification };
