// ============================================================
// checkout.js — 兩段式結帳（填寫 → 確認 → 送出）、通知結果摘要
// ============================================================

function collectCheckoutFields() {
    return {
        name: document.getElementById('cust-name').value.trim(),
        phone: document.getElementById('cust-phone').value.trim(),
        email: document.getElementById('cust-email').value.trim(),
        address: document.getElementById('cust-address').value.trim(),
        lineUserId: document.getElementById('cust-line-user-id').value.trim(),
        notifyPreference: document.getElementById('notify-preference').value || 'email',
    };
}

function validateCheckoutFields(fields) {
    if (!fields.name || !fields.phone || !fields.address) {
        return '請填寫姓名、電話與寄送地址';
    }
    if (fields.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) {
        return 'Email 格式不正確';
    }
    if ((fields.notifyPreference === 'email' || fields.notifyPreference === 'both') && !fields.email) {
        return '選擇 Email 確認信時，請填寫 Email';
    }
    if (fields.notifyPreference === 'both' && publicConfig.lineLoginEnabled && !fields.lineUserId) {
        return '請先綁定 LINE 通知（首頁右上角或購物車內），或改選 Email 確認信';
    }
    if (fields.notifyPreference === 'both' && !publicConfig.lineLoginEnabled && !fields.email) {
        return 'LINE 綁定尚未設定完成，請填寫 Email 或改選其他通知方式';
    }
    return '';
}

function renderCheckoutConfirmation(fields) {
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    const shipping = calculateShippingByCart();
    const total = subtotal + shipping;
    const notifyMap = {
        email: 'Email 確認信',
        line: '僅通知店家 LINE',
        both: 'Email + 我的 LINE',
        none: '不通知',
    };
    document.getElementById('checkout-confirm-summary').innerHTML = `
        <div><strong>姓名：</strong>${fields.name}</div>
        <div><strong>電話：</strong>${fields.phone}</div>
        <div><strong>Email：</strong>${fields.email || '未填寫'}</div>
        <div><strong>地址：</strong>${fields.address}</div>
        <div><strong>通知方式：</strong>${notifyMap[fields.notifyPreference] || 'Email 通知'}</div>
        <div><strong>總計：</strong>NT$${total}（含運費 ${shipping === 0 ? '免運' : `NT$${shipping}`}）</div>
    `;
    document.getElementById('checkout-confirm-items').innerHTML = cart
        .map(item => `<div>・${item.name} x ${item.qty} = NT$${item.price * item.qty}</div>`)
        .join('');
}

function formatNotificationStatus(type, result) {
    if (!result) return `${type}：狀態未知`;
    if (result.sent) {
        const to = String(result.recipient || '').trim();
        return to ? `${type}：已寄出至 ${to}` : `${type}：已寄出`;
    }

    const reason = String(result.reason || '');
    if (reason === 'disabled_by_customer') return `${type}：未啟用`;
    if (reason === 'missing_customer_email') return `${type}：未填寫信箱，無法寄送`;
    if (reason === 'smtp_not_configured') return `${type}：伺服器未設定 SMTP（請在 Render 設定 SMTP_*）`;
    if (reason === 'smtp_auth_failed') return `${type}：SMTP 帳密錯誤（請檢查 Gmail 應用程式密碼）`;
    if (reason === 'smtp_connection_failed') return `${type}：無法連線 SMTP 伺服器`;
    if (reason === 'recipient_rejected') return `${type}：收件信箱被拒絕，請確認 Email 是否正確`;
    if (reason === 'no_customer_email') return `${type}：未填寫信箱`;
    if (reason === 'missing_customer_line_user_id') return '您的 LINE：尚未綁定，無法推播';
    if (reason === 'missing_line_channel_token') return '您的 LINE：伺服器未設定 LINE_CHANNEL_ACCESS_TOKEN';
    if (reason === 'missing_line_shop_config') return '店家 LINE：未設定（需 LINE_CHANNEL_ACCESS_TOKEN + LINE_SHOP_USER_ID）';
    if (reason === 'webhook_accepted_unverified') return '店家 LINE：Webhook 已接收但未確認送達（建議改用 Messaging API）';
    if (reason.startsWith('line_api_')) return `${type}：LINE API 失敗（${reason.replace('line_api_', 'HTTP ')})`;
    if (reason.startsWith('http_')) return `${type}：Webhook 失敗（${reason.replace('http_', 'HTTP ')})`;
    return `${type}：未寄出（${reason || '未知原因'}）`;
}

function formatEmailNotificationSummary(emailNotifications) {
    if (!emailNotifications) return 'Email：狀態未知';

    // 舊版 API：單一 email 結果（有 sent / reason 欄位）
    const isLegacyFlat = emailNotifications.customer === undefined
        && emailNotifications.shop === undefined
        && (emailNotifications.sent !== undefined || emailNotifications.reason !== undefined);
    if (isLegacyFlat) {
        return formatNotificationStatus('Email', emailNotifications);
    }

    const parts = [];
    const customer = emailNotifications.customer;
    const shop = emailNotifications.shop;

    if (customer && customer.reason !== 'disabled_by_customer') {
        parts.push(formatNotificationStatus('Email（客戶）', customer));
    }
    if (shop) {
        parts.push(formatNotificationStatus('Email（店家）', shop));
    }

    return parts.length ? parts.join('\n') : 'Email：狀態未知';
}

function formatLineNotificationSummary(line, notifyPreference) {
    if (notifyPreference === 'email' || notifyPreference === 'none') return '';
    if (!line) return 'LINE：狀態未知';
    const shop = formatNotificationStatus('店家 LINE', line.shop);
    if (notifyPreference === 'line') return shop;
    const customer = formatNotificationStatus('您的 LINE', line.customer);
    return `${shop}\n${customer}`;
}

document.getElementById('checkout-btn').addEventListener('click', async function() {
    if (cart.length === 0) return;
    const btn = this;
    const validationEl = document.getElementById('checkout-validation');
    validationEl.textContent = '';

    // Step 1: Show the form
    if (checkoutStep === 0) {
        checkoutStep = 1;
        document.getElementById('checkout-form-wrapper').style.display = 'block';
        document.getElementById('checkout-confirm-wrapper').style.display = 'none';
        btn.textContent = '下一步：確認訂單';
        document.getElementById('cust-name').focus();
        showToast('請先填寫寄送資訊');
        return;
    }

    const fields = collectCheckoutFields();
    const validationMessage = validateCheckoutFields(fields);
    if (validationMessage) {
        validationEl.textContent = validationMessage;
        showToast(`⚠️ ${validationMessage}`);
        return;
    }

    if (checkoutStep === 1) {
        checkoutStep = 2;
        renderCheckoutConfirmation(fields);
        document.getElementById('checkout-confirm-wrapper').style.display = 'block';
        btn.textContent = '確認送出訂單';
        showToast('請確認訂單資訊後送出');
        return;
    }

    // Step 3: Submit order
    btn.disabled = true;
    btn.textContent = '訂單處理中...';

    await ensureCartProductIds();
    try {
        const res = await fetch(apiUrl('/api/orders'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                items: cart.map(item => ({
                    id: item.productId || undefined,
                    productId: item.productId || undefined,
                    name: item.name,
                    quantity: item.qty,
                })),
                customer: {
                    name: fields.name,
                    email: fields.email,
                    phone: fields.phone,
                    address: fields.address,
                    lineUserId: fields.lineUserId,
                },
                notifyPreference: fields.notifyPreference,
            }),
        });
        const json = await res.json().catch(() => ({}));
        if (res.ok && json.success) {
            const d = json.data || {};
            const emailStatus = formatEmailNotificationSummary(d.notifications?.email);
            const lineStatus = formatLineNotificationSummary(d.notifications?.line, fields.notifyPreference);
            const notifyLines = [emailStatus, lineStatus].filter(Boolean).join('\n');
            alert(`訂單建立成功！\n訂單編號：${d.orderNumber || json.orderId || '-'}\n${notifyLines}`);
            showToast(`✅ 訂單 ${d.orderNumber || json.orderId || '-'} 已建立`);
            cart = [];
            updateCartUI();
            closeCart();
        } else {
            showToast(`❌ ${json.message || '訂單送出失敗'}`);
        }
    } catch (err) {
        showToast('❌ 無法連線伺服器，請稍後再試');
    }

    btn.disabled = false;
    btn.textContent = '確認送出訂單';

    // Clear form
    ['cust-name', 'cust-phone', 'cust-email', 'cust-address'].forEach(id => {
        document.getElementById(id).value = '';
    });
    if (publicConfig.lineLoginEnabled) {
        document.getElementById('cust-line-user-id').value = localStorage.getItem(LINE_USER_ID_KEY) || '';
        updateLineBindUi(Boolean(document.getElementById('cust-line-user-id').value));
    }
    document.getElementById('notify-preference').value = 'both';
});
