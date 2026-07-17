// ============================================================
// cart.js — 購物車：運費計算、購物車 UI、抽屜開關、加入購物車
// 共享狀態（cart / checkoutStep / shippingRule）定義於 state.js
// ============================================================

function calculateShippingByCart() {
    const threshold = Number(shippingRule.freeThresholdQty) || 0;
    if (threshold <= 0) return 0;
    const keyword = shippingRule.freeThresholdKeyword || '';
    const qualifyingQty = cart
        .filter(item => keyword === '' || (item.name || '').includes(keyword))
        .reduce((sum, item) => sum + Number(item.qty || 0), 0);
    return qualifyingQty >= threshold ? 0 : (Number(shippingRule.fee) || 0);
}

function updateCartUI() {
    const container = document.getElementById('cart-items-container');
    const emptyMsg = document.getElementById('cart-empty-msg');
    const footer = document.getElementById('cart-footer');
    const countBadge = document.querySelector('.cart-count');

    const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    const shipping = calculateShippingByCart();
    const total = subtotal + shipping;

    // Badge
    if (totalItems > 0) {
        countBadge.textContent = totalItems;
        countBadge.style.display = 'flex';
    } else {
        countBadge.style.display = 'none';
    }

    // Footer amounts
    document.getElementById('cart-subtotal').textContent = 'NT$' + subtotal;
    document.getElementById('cart-shipping').textContent = shipping === 0 ? '免運費 🎉' : 'NT$' + shipping;
    document.getElementById('cart-shipping').className = shipping === 0 ? 'font-bold text-sm text-green-600' : 'font-bold text-sm text-secondary';
    document.getElementById('cart-free-shipping-hint').style.display = shipping === 0 ? 'none' : 'flex';
    document.getElementById('cart-total').textContent = 'NT$' + total;

    // Cart items
    if (cart.length === 0) {
        emptyMsg.style.display = 'flex';
        footer.style.display = 'none';
        container.querySelectorAll('.cart-item').forEach(el => el.remove());
        checkoutStep = 0;
        return;
    }

    emptyMsg.style.display = 'none';
    footer.style.display = 'block';

    // Remove old rendered items
    container.querySelectorAll('.cart-item').forEach(el => el.remove());

    cart.forEach((item, idx) => {
        const div = document.createElement('div');
        div.className = 'cart-item flex gap-4';
        div.innerHTML = `
            <img alt="${item.name}" class="w-20 h-20 object-cover rounded-lg bg-surface-container" src="${item.img}" />
            <div class="flex-1">
                <div class="flex justify-between items-start">
                    <h4 class="font-bold text-secondary">${item.name}</h4>
                    <button class="remove-item text-gray-400 hover:text-red-500" data-idx="${idx}"><i class="w-4 h-4" data-lucide="trash"></i></button>
                </div>
                <p class="text-sm text-secondary/60 mb-2">${item.desc}</p>
                <div class="flex justify-between items-center">
                    <div class="flex items-center border border-outline/30 rounded-md">
                        <button class="qty-minus px-2 py-1 hover:bg-gray-50" data-idx="${idx}"><i class="w-3 h-3" data-lucide="minus"></i></button>
                        <span class="px-3 text-sm font-bold">${item.qty}</span>
                        <button class="qty-plus px-2 py-1 hover:bg-gray-50" data-idx="${idx}"><i class="w-3 h-3" data-lucide="plus"></i></button>
                    </div>
                    <span class="font-bold text-primary">NT$${item.price * item.qty}</span>
                </div>
            </div>
        `;
        container.appendChild(div);
    });

    lucide.createIcons();

    // Bind qty +/- and remove
    container.querySelectorAll('.qty-minus').forEach(btn => {
        btn.addEventListener('click', () => {
            const idx = parseInt(btn.dataset.idx);
            if (cart[idx].qty > 1) cart[idx].qty--;
            else cart.splice(idx, 1);
            updateCartUI();
        });
    });
    container.querySelectorAll('.qty-plus').forEach(btn => {
        btn.addEventListener('click', () => {
            const idx = parseInt(btn.dataset.idx);
            cart[idx].qty++;
            updateCartUI();
        });
    });
    container.querySelectorAll('.remove-item').forEach(btn => {
        btn.addEventListener('click', () => {
            const idx = parseInt(btn.dataset.idx);
            cart.splice(idx, 1);
            updateCartUI();
        });
    });
}

// ============ Add to Cart（事件委派，支援動態渲染的商品卡片） ============
document.addEventListener('click', (event) => {
    const btn = event.target.closest('.add-to-cart-btn');
    if (!btn) return;

    const name = btn.dataset.name;
    const price = parseInt(btn.dataset.price);
    const img = btn.dataset.img;
    const desc = btn.dataset.desc;
    const productId = btn.dataset.productId || null;

    const existing = cart.find(item => item.name === name);
    if (existing) {
        existing.qty++;
    } else {
        cart.push({ productId, name, price, img, desc, qty: 1 });
    }
    updateCartUI();
    showToast(`已將「${name}」加入購物車`);
});

// ============ Cart Drawer Logic ============
const cartDrawer = document.getElementById('cart-drawer');
const cartOverlay = document.getElementById('cart-overlay');
const openCartBtn = document.getElementById('open-cart-btn');
const closeCartBtn = document.getElementById('close-cart-btn');

function openCart() {
    cartDrawer.classList.add('open');
    cartOverlay.classList.add('open');
    document.body.classList.add('overflow-hidden');
}
function closeCart() {
    cartDrawer.classList.remove('open');
    cartOverlay.classList.remove('open');
    document.body.classList.remove('overflow-hidden');
    // Reset checkout form
    checkoutStep = 0;
    document.getElementById('checkout-form-wrapper').style.display = 'none';
    document.getElementById('checkout-confirm-wrapper').style.display = 'none';
    document.getElementById('checkout-btn').textContent = '前往結帳';
}

openCartBtn.addEventListener('click', openCart);
closeCartBtn.addEventListener('click', closeCart);
cartOverlay.addEventListener('click', closeCart);
