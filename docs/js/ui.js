// ============================================================
// ui.js — 通用 UI：Toast 提示、行動選單、平滑捲動、LINE QR 放大彈窗
// ============================================================

// ============ Toast ============
function showToast(msg) {
    const toast = document.getElementById('toast');
    document.getElementById('toast-msg').textContent = msg;
    toast.classList.remove('translate-y-20', 'opacity-0');
    toast.classList.add('translate-y-0', 'opacity-100');
    setTimeout(() => {
        toast.classList.add('translate-y-20', 'opacity-0');
        toast.classList.remove('translate-y-0', 'opacity-100');
    }, 2500);
}

// ============ Mobile Menu ============
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const mobileMenuOverlay = document.getElementById('mobile-menu-overlay');
const mobileMenuDrawer = document.getElementById('mobile-menu-drawer');
const closeMobileMenuBtn = document.getElementById('close-mobile-menu-btn');

function openMobileMenu() {
    mobileMenuDrawer.classList.remove('-translate-x-full');
    mobileMenuOverlay.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
}
function closeMobileMenu() {
    mobileMenuDrawer.classList.add('-translate-x-full');
    mobileMenuOverlay.classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
}

mobileMenuBtn.addEventListener('click', openMobileMenu);
closeMobileMenuBtn.addEventListener('click', closeMobileMenu);
mobileMenuOverlay.addEventListener('click', closeMobileMenu);

document.querySelectorAll('#mobile-menu-drawer a').forEach(link => {
    link.addEventListener('click', closeMobileMenu);
});

// ============ Smooth Scrolling ============
document.querySelectorAll('a[href^="#"]:not(.js-line-bind-btn)').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth' });
        }
    });
});

// ============ LINE QR 放大彈窗 ============
function openQrModal() {
    const modal = document.getElementById('qr-modal');
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.body.style.overflow = 'hidden';
}
function closeQrModal() {
    const modal = document.getElementById('qr-modal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    document.body.style.overflow = '';
}
document.addEventListener('click', (event) => {
    if (event.target.closest('.js-qr-open')) {
        event.preventDefault();
        openQrModal();
        return;
    }
    if (event.target.closest('#qr-modal-close')) {
        closeQrModal();
        return;
    }
    const modal = document.getElementById('qr-modal');
    // 點擊彈窗背景（非內容卡片）即關閉
    if (modal && !modal.classList.contains('hidden') && event.target === modal) {
        closeQrModal();
    }
});
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeQrModal();
});
