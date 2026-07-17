// ============================================================
// state.js — 前台共享狀態與常數
// ------------------------------------------------------------
// 本站為 GitHub Pages 靜態部署，沒有打包工具（bundler）。各模組以傳統
// <script> 依「載入順序」執行，共用瀏覽器的全域範疇：頂層的
// let/const/function 在後續載入的檔案中皆可存取。因此這裡集中宣告
// 跨模組共享的狀態，其餘各檔（cart / checkout / line / products…）
// 只放各自功能的函式，讀寫這裡的狀態。
// 載入順序：state → ui → products → cart → line → checkout → newsletter → main
// ============================================================

// 頁面載入即渲染靜態 HTML 中的 lucide 圖示
lucide.createIcons();

// 名稱 → productId 對照（購物車補 productId 用）
const productIdByName = {};
const LINE_USER_ID_KEY = 'sweetpotato_line_user_id';

let publicConfig = {
    lineLoginEnabled: false,
    lineLoginConfigError: '',
    lineLoginChannelHint: '',
    lineLoginCallbackUrl: '',
    lineCustomerNotifyEnabled: false,
    lineLiffId: '',
    lineLiffIdValid: false,
};
let liffReady = false;

// ============ 購物車 / 結帳流程共享狀態 ============
let cart = [];        // { productId, name, price, img, desc, qty }
let checkoutStep = 0; // 0 = cart view, 1 = form visible, 2 = confirm

// 運費規則（預設值與後端一致；loadSiteSettings() 會以後台設定覆蓋）
let shippingRule = { fee: 150, freeThresholdQty: 20, freeThresholdKeyword: '黃金地瓜' };

function apiUrl(path) {
    return window.AppRuntime.apiUrl(path);
}
