// ============================================================
// line.js — LINE 綁定通知、LINE Login 導向、LIFF 內建瀏覽器身分連動
// ============================================================

function applySavedLineUserId() {
    const saved = (localStorage.getItem(LINE_USER_ID_KEY) || '').trim();
    if (!saved) return false;
    document.getElementById('cust-line-user-id').value = saved;
    updateLineBindUi(true, '已使用先前綁定的 LINE');
    return true;
}

function getLineBindButtons() {
    return Array.from(document.querySelectorAll('.js-line-bind-btn'));
}

function isCompactLineBindBtn(btn) {
    return btn.id === 'nav-line-bind-btn' || btn.id === 'cart-line-bind-btn';
}

function setCompactLineBindLabel(btnId, labelId, text) {
    const labelEl = document.getElementById(labelId);
    if (labelEl) labelEl.textContent = text;
    const btn = document.getElementById(btnId);
    if (btn) btn.title = text === '已綁' || text === 'LINE 已綁定 ✓' ? 'LINE 已綁定' : '點擊綁定 LINE 訂單通知';
}

function setFullLineBindLabel(labelId, text) {
    const labelEl = document.getElementById(labelId);
    if (labelEl) labelEl.textContent = text;
}

function showLineBindButtons() {
    getLineBindButtons().forEach((btn) => {
        btn.style.display = isCompactLineBindBtn(btn) ? 'inline-flex' : 'flex';
        btn.hidden = false;
    });
}

function updateLineBindUi(bound, statusText) {
    showLineBindButtons();
    const compactLabel = bound ? '已綁' : 'LINE';
    const fullLabel = bound ? 'LINE 已綁定 ✓' : '綁定 LINE 通知';
    getLineBindButtons().forEach((btn) => {
        if (btn.id === 'nav-line-bind-btn') {
            setCompactLineBindLabel('nav-line-bind-btn', 'nav-line-bind-label', compactLabel);
        } else if (btn.id === 'cart-line-bind-btn') {
            setCompactLineBindLabel('cart-line-bind-btn', 'cart-line-bind-label', compactLabel);
        } else if (btn.id === 'mobile-line-bind-btn') {
            setFullLineBindLabel('mobile-line-bind-label', fullLabel);
        } else if (btn.id === 'cart-footer-line-bind-btn') {
            setFullLineBindLabel('cart-footer-line-bind-label', fullLabel);
        }
        if (bound) {
            btn.setAttribute('aria-disabled', 'true');
            btn.classList.add('opacity-70', 'cursor-default', 'pointer-events-none');
            btn.classList.remove('hover:bg-[#06C755]/15');
            btn.removeAttribute('href');
        } else {
            btn.removeAttribute('aria-disabled');
            btn.classList.remove('opacity-70', 'cursor-default', 'pointer-events-none');
            btn.classList.add('hover:bg-[#06C755]/15');
        }
    });
    if (!bound) syncLineBindLinks();

    const checkoutHint = document.getElementById('checkout-line-hint');
    if (!checkoutHint) return;
    checkoutHint.style.display = 'block';
    if (bound) {
        checkoutHint.className = 'text-xs text-green-700';
        checkoutHint.textContent = statusText || '已綁定 LINE，結帳時可選「Email + 我的 LINE」接收通知。';
    } else {
        checkoutHint.className = 'text-xs text-secondary/80';
        checkoutHint.textContent = statusText || '欲接收 LINE 訂單通知，請點「綁定 LINE 通知」（首頁右上角或購物車內）。';
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function showLineBindUnavailable(message) {
    showLineBindButtons();
    setCompactLineBindLabel('nav-line-bind-btn', 'nav-line-bind-label', 'LINE');
    setCompactLineBindLabel('cart-line-bind-btn', 'cart-line-bind-label', 'LINE');
    setFullLineBindLabel('mobile-line-bind-label', '綁定 LINE 通知');
    setFullLineBindLabel('cart-footer-line-bind-label', '綁定 LINE 通知');
    getLineBindButtons().forEach((btn) => {
        btn.removeAttribute('aria-disabled');
        btn.classList.remove('pointer-events-none', 'opacity-70');
        btn.title = message || 'LINE 綁定暫不可用';
    });
    syncLineBindLinks();
    const checkoutHint = document.getElementById('checkout-line-hint');
    if (checkoutHint) {
        checkoutHint.style.display = 'block';
        checkoutHint.className = 'text-xs text-amber-700';
        checkoutHint.textContent = message || 'LINE 綁定暫不可用，請改選 Email 確認信。';
    }
}

function formatLineBindErrorMessage(raw) {
    const msg = decodeURIComponent(String(raw || ''));
    if (msg.includes('access_denied') || msg.includes('取消')) return '您已取消 LINE 登入';
    if (msg.includes('Callback URL') || msg.includes('redirect_uri')) {
        return msg;
    }
    if (msg.includes('無法正常執行') || msg.includes('LINE Login 設定') || msg.includes('invalid_client')) {
        const cb = publicConfig.lineLoginCallbackUrl || '';
        const hint = publicConfig.lineLoginChannelHint ? `（頻道尾碼 ${publicConfig.lineLoginChannelHint}）` : '';
        return cb
            ? `LINE 登入失敗${hint}：請在 LINE Login 頻道設定 Callback URL 為 ${cb}，並按 Publish`
            : `LINE 登入失敗${hint}：請確認後台 LINE Login 設定`;
    }
    return msg || 'LINE 綁定失敗，請稍後再試';
}

function getStorefrontReturnUrl(options = {}) {
    const url = new URL(`${window.location.origin}${window.location.pathname}`);
    if (options.openCart) url.searchParams.set('openCart', '1');
    return url.toString();
}

function applyLineBindFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const bindResult = params.get('lineBind');
    const shouldOpenCart = params.get('openCart') === '1';

    if (bindResult === 'ok') {
        const userId = (params.get('lineUserId') || '').trim();
        const name = (params.get('lineName') || '').trim();
        if (userId) {
            localStorage.setItem(LINE_USER_ID_KEY, userId);
            document.getElementById('cust-line-user-id').value = userId;
            updateLineBindUi(true, `已綁定 LINE：${name || '完成'}`);
            showToast('✅ LINE 綁定成功，可接收訂單通知');
        }
    } else if (bindResult === 'error') {
        const message = formatLineBindErrorMessage(params.get('lineBindMessage'));
        updateLineBindUi(false, message);
        showToast(`❌ ${message}`);
    }

    ['lineBind', 'lineUserId', 'lineName', 'lineBindMessage', 'openCart'].forEach((key) => params.delete(key));
    const qs = params.toString();
    window.history.replaceState({}, '', window.location.pathname + (qs ? `?${qs}` : ''));

    if (shouldOpenCart && typeof openCart === 'function') {
        openCart();
    }
}

function applyPublicConfigFromRuntime() {
    const json = window.AppRuntime.getPublicConfig();
    publicConfig = {
        lineLoginEnabled: Boolean(json.lineLoginEnabled),
        lineLoginConfigError: String(json.lineLoginConfigError || '').trim(),
        lineLoginChannelHint: String(json.lineLoginChannelHint || '').trim(),
        lineLoginCallbackUrl: String(json.lineLoginCallbackUrl || '').trim(),
        lineCustomerNotifyEnabled: Boolean(json.lineCustomerNotifyEnabled),
        lineLiffId: String(json.lineLiffId || '').trim(),
        lineLiffIdValid: Boolean(json.lineLiffIdValid),
    };

    applyLineBindFromUrl();
    syncLineBindLinks();
    showLineBindButtons();

    if (!publicConfig.lineLoginEnabled) {
        const hint = publicConfig.lineLoginConfigError || '店家尚未完成 LINE Login 設定';
        showLineBindUnavailable(`${hint}。目前請改選「Email 確認信」。`);
        return;
    }

    if (!document.getElementById('cust-line-user-id').value && applySavedLineUserId()) {
        return;
    }
    if (!document.getElementById('cust-line-user-id').value) {
        updateLineBindUi(false);
    }
}

async function loadPublicConfig() {
    try {
        applyPublicConfigFromRuntime();
    } catch (_) {
        showLineBindUnavailable('無法載入 LINE 設定，請改選 Email 確認信。');
        syncLineBindLinks();
    } finally {
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }
}

// ============ LIFF：在 LINE 內開啟時自動連動使用者身分 ============
async function initLiff() {
    const liffId = (publicConfig.lineLiffId || '').trim();
    if (!liffId || typeof liff === 'undefined') return;

    try {
        await liff.init({ liffId });
        liffReady = true;
    } catch (err) {
        console.warn('LIFF init 失敗：', err && err.message);
        return;
    }

    // 僅在 LINE App 內建瀏覽器中自動取得身分（外部瀏覽器不強制登入）
    if (!liff.isInClient()) return;

    try {
        if (!liff.isLoggedIn()) {
            liff.login();
            return;
        }
        const profile = await liff.getProfile();
        const userId = (profile && profile.userId || '').trim();
        if (userId) {
            localStorage.setItem(LINE_USER_ID_KEY, userId);
            const idField = document.getElementById('cust-line-user-id');
            if (idField) idField.value = userId;
            updateLineBindUi(true, `已透過 LINE 連動：${profile.displayName || '完成'}`);
            document.body.classList.add('in-line-client');
        }
    } catch (err) {
        console.warn('LIFF 取得身分失敗：', err && err.message);
    }
}

function isCartLineBindBtn(btn) {
    return btn.id === 'cart-line-bind-btn' || btn.id === 'cart-footer-line-bind-btn';
}

function buildLineLoginHref(openCart) {
    const returnUrl = encodeURIComponent(getStorefrontReturnUrl());
    const openCartParam = openCart ? '&openCart=1' : '';
    return `${apiUrl('/api/line/login/start')}?returnUrl=${returnUrl}${openCartParam}`;
}

function syncLineBindLinks() {
    getLineBindButtons().forEach((btn) => {
        if (publicConfig.lineLoginEnabled) {
            btn.href = buildLineLoginHref(isCartLineBindBtn(btn));
            btn.removeAttribute('aria-disabled');
            btn.classList.remove('pointer-events-none', 'opacity-50');
        } else {
            btn.href = '#';
            btn.setAttribute('aria-disabled', 'true');
        }
    });
}

function handleLineBindClick(event) {
    const bindBtn = event.target.closest('.js-line-bind-btn');
    if (!bindBtn) return;

    if (bindBtn.id === 'mobile-line-bind-btn') closeMobileMenu();

    if (!publicConfig.lineLoginEnabled || bindBtn.getAttribute('aria-disabled') === 'true') {
        event.preventDefault();
        const hint = publicConfig.lineLoginConfigError || 'LINE 綁定尚未設定';
        const cb = publicConfig.lineLoginCallbackUrl;
        const detail = cb ? ` Callback：${cb}` : '';
        showToast(`⚠️ ${hint}${detail}`);
        return;
    }

    const loginUrl = (bindBtn.getAttribute('href') || '').trim();
    if (!loginUrl || loginUrl === '#') {
        event.preventDefault();
        syncLineBindLinks();
        const retryUrl = (bindBtn.getAttribute('href') || '').trim();
        if (retryUrl && retryUrl !== '#') {
            window.location.assign(retryUrl);
        } else {
            showToast('⚠️ 無法啟動 LINE 登入，請重新整理頁面後再試');
        }
        return;
    }

    // 攔截舊版 smooth-scroll 對 href="#" 綁定的 preventDefault，確保能導向 LINE
    event.preventDefault();
    window.location.assign(loginUrl);
}

document.addEventListener('click', handleLineBindClick);
