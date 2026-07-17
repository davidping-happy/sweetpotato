// ============================================================
// main.js — 進入點：等 AppRuntime 初始化完成後，串起各模組
// 須最後載入（相依於前面各檔定義的函式與狀態）
// ============================================================

window.AppRuntime.init()
    .then(() => {
        showLineBindButtons();
        setCompactLineBindLabel('nav-line-bind-btn', 'nav-line-bind-label', 'LINE');
        setCompactLineBindLabel('cart-line-bind-btn', 'cart-line-bind-label', 'LINE');
        setFullLineBindLabel('cart-footer-line-bind-label', '綁定 LINE 通知');
        updateCartUI();
        loadProducts();
        loadSiteSettings();
        loadPublicConfig();
        initLiff();
    })
    .catch((err) => {
        showLineBindUnavailable(`無法載入 API 設定：${err.message}`);
        updateCartUI();
    });
