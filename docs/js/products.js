// ============================================================
// products.js — 商品渲染、從 API 載入商品、載入店家設定
// ============================================================

const IMAGE_CDN_BASE = 'https://cdn.jsdelivr.net/gh/davidping-happy/sweetpotato@main/';
const SWEET_POTATO_CANDY_IMAGE = `${IMAGE_CDN_BASE}photo/005.png?v=20260520`;

function normalizeImagePath(path) {
    if (!path || typeof path !== 'string') return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    return IMAGE_CDN_BASE + path.replace(/^\/+/, '');
}

function normalizeProductName(name) {
    return String(name || '')
        .trim()
        .toLowerCase()
        .replace(/[（）]/g, (ch) => (ch === '（' ? '(' : ')'))
        .replace(/\s+/g, '');
}

function escHtml(s) {
    return String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function productImageUrl(product) {
    if (product && product.imageUrl) return normalizeImagePath(product.imageUrl);
    // 沒有圖片時，依分類給預設圖
    const cat = String(product?.category || '');
    if (cat.includes('蛋')) return `${IMAGE_CDN_BASE}photo/004.png`;
    if (cat.includes('零食')) return SWEET_POTATO_CANDY_IMAGE;
    return `${IMAGE_CDN_BASE}photo/002.jpg`;
}

function badgeFor(name) {
    return /台農57|黃金地瓜/.test(String(name || '')) ? '熱銷首選' : '';
}

function renderProductCard(product) {
    const id = product._id || '';
    const name = product.name || '';
    const price = Number(product.price) || 0;
    const desc = product.description || '';
    const img = productImageUrl(product);
    const inStock = product.inStock !== false;
    const badge = badgeFor(name);

    const actionHtml = inStock
        ? `<button class="add-to-cart-btn bg-secondary text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-primary transition-colors active:scale-95"
                data-product-id="${escHtml(id)}" data-name="${escHtml(name)}" data-price="${price}" data-img="${escHtml(img)}" data-desc="${escHtml(desc)}">
                <i class="w-4 h-4" data-lucide="shopping-cart"></i> 加入購物車
            </button>`
        : `<span class="text-sm font-bold text-gray-400 px-2 py-1 rounded-lg bg-gray-100">暫時售完</span>`;

    return `
        <div class="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-shadow border border-outline/10 flex flex-col" data-product-id="${escHtml(id)}">
            <div class="relative aspect-[4/5] overflow-hidden">
                <img alt="${escHtml(name)}" class="w-full h-full object-cover hover:scale-105 transition-transform duration-500" src="${escHtml(img)}" loading="lazy" />
                ${badge ? `<span class="absolute top-4 right-4 bg-primary text-white text-xs font-bold px-3 py-1 rounded-full">${escHtml(badge)}</span>` : ''}
            </div>
            <div class="p-6 flex flex-col flex-1">
                <h4 class="text-xl font-bold text-secondary mb-2">${escHtml(name)}</h4>
                <p class="text-secondary/60 text-sm mb-6 flex-1">${escHtml(desc)}</p>
                <div class="flex items-center justify-between mt-auto">
                    <span class="text-2xl font-bold text-primary">NT$${price}</span>
                    ${actionHtml}
                </div>
            </div>
        </div>`;
}

async function loadProducts() {
    try {
        const res = await fetch(apiUrl('/api/products'));
        const json = await res.json();
        if (!json.success || !Array.isArray(json.data)) return;

        const products = json.data;
        const grid = document.getElementById('product-grid');

        // 建立 名稱→productId 對照（給購物車補 productId 用）
        products.forEach((p) => {
            if (p?.name && p?._id) productIdByName[p.name] = p._id;
        });

        // 完全動態渲染：依後端資料重建整個商品區（新增 / 刪除都會反映）
        if (products.length > 0) {
            grid.innerHTML = products.map(renderProductCard).join('');
        } else {
            grid.innerHTML = '<p class="col-span-full text-center text-secondary/60 py-12">商品準備中，敬請期待 🍠</p>';
        }
        if (window.lucide) lucide.createIcons();
        console.log(`✅ 已從 API 動態載入 ${products.length} 筆商品`);
    } catch (err) {
        // API 連線失敗：保留 HTML 既有的靜態卡片作為備援
        console.log('ℹ️ API 未啟動，沿用網頁靜態商品');
    }
}

// ============ 載入店家設定（聯絡方式 / LINE / 運費），與 App 共用同一來源 ============
async function loadSiteSettings() {
    try {
        const res = await fetch(apiUrl('/api/site-settings'));
        const json = await res.json();
        if (!json.success || !json.data) return;
        const d = json.data;

        if (d.shipping) {
            shippingRule = {
                fee: Number(d.shipping.fee) || 0,
                freeThresholdQty: Number(d.shipping.freeThresholdQty) || 0,
                freeThresholdKeyword: (d.shipping.freeThresholdKeyword ?? '').toString(),
            };
            const hint = document.getElementById('cart-free-shipping-hint');
            if (hint) {
                hint.textContent = shippingRule.freeThresholdKeyword
                    ? `${shippingRule.freeThresholdKeyword}滿 ${shippingRule.freeThresholdQty} 盒享免運優惠`
                    : `滿 ${shippingRule.freeThresholdQty} 件享免運優惠`;
            }
            updateCartUI();
        }

        if (d.shop) {
            const setText = (sel, val) => {
                if (!val) return;
                document.querySelectorAll(sel).forEach((el) => { el.textContent = val; });
            };
            setText('[data-shop-phone]', d.shop.phone);
            setText('[data-shop-email]', d.shop.email);
            setText('[data-shop-address]', d.shop.address);
            if (d.shop.address) {
                document.querySelectorAll('[data-shop-address-link]').forEach((a) => {
                    a.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(d.shop.address)}`;
                });
            }
        }

        if (d.line) {
            if (d.line.addFriendUrl) {
                document.querySelectorAll('a[href*="line.me/R/ti/p"]').forEach((a) => {
                    a.href = d.line.addFriendUrl;
                });
            }
            if (d.line.officialId) {
                document.querySelectorAll('[data-line-id]').forEach((el) => {
                    el.textContent = d.line.officialId;
                });
            }
        }
    } catch (err) {
        console.log('ℹ️ 店家設定載入失敗，沿用網頁預設值');
    }
}

async function ensureCartProductIds() {
    if (cart.length === 0) return;
    if (cart.every(item => item.productId)) return;
    await loadProducts();
    cart = cart.map(item => ({
        ...item,
        productId: item.productId || productIdByName[item.name] || null,
    }));
}
