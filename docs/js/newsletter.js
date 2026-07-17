// ============================================================
// newsletter.js — 電子報訂閱表單
// ============================================================

document.getElementById('newsletter-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const emailInput = document.getElementById('newsletter-email');
    const submitBtn = document.getElementById('newsletter-submit-btn');
    const statusEl = document.getElementById('newsletter-status');
    const email = emailInput.value.trim();

    statusEl.classList.add('hidden');
    statusEl.className = 'text-white/70 text-sm mt-4 hidden';

    if (!email) {
        showToast('請輸入 Email');
        return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showToast('Email 格式不正確');
        return;
    }

    submitBtn.disabled = true;
    const originalText = submitBtn.textContent;
    submitBtn.textContent = '訂閱中...';

    try {
        await window.AppRuntime.init();
        const res = await fetch(apiUrl('/api/newsletter/subscribe'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.success) {
            throw new Error(json.message || '訂閱失敗，請稍後再試');
        }

        showToast(json.message || '感謝訂閱！阿嬤的溫暖報即將送達 ❤️');
        statusEl.textContent = json.message || '訂閱成功，歡迎加入阿嬤的溫暖報！';
        statusEl.className = 'text-green-200 text-sm mt-4';
        emailInput.value = '';
    } catch (err) {
        const message = err.message || '訂閱失敗，請稍後再試';
        showToast(`❌ ${message}`);
        statusEl.textContent = message;
        statusEl.className = 'text-red-200 text-sm mt-4';
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
});
