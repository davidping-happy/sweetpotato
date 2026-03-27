import React, { useState, useEffect, useCallback } from 'react';
import {
  ShoppingCart, Plus, Minus, Trash2, X,
  ShoppingBag, Phone, Mail, MapPin, CheckCircle, ArrowRight,
} from 'lucide-react';
import './App.css';

const API_BASE = 'http://localhost:3000';
const IMAGE_CDN_BASE = 'https://cdn.jsdelivr.net/gh/davidping-happy/sweetpotato@main/';

const toCdnImageUrl = (url) => {
  if (!url || typeof url !== 'string') return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${IMAGE_CDN_BASE}${url.replace(/^\/+/, '')}`;
};

/* ============================================================
   Toast Component
   ============================================================ */
function Toast({ message, visible }) {
  return (
    <div className={`toast ${visible ? 'visible' : ''}`}>
      <CheckCircle size={20} />
      <span>{message}</span>
    </div>
  );
}

/* ============================================================
   Main App
   ============================================================ */
export default function App() {
  // ---------- Products ----------
  const fallbackProducts = [
    { _id: 'local-1', name: '黃金地瓜（1斤）', description: '香甜鬆軟，經典人氣品項。', price: 100, category: '烤地瓜', imageUrl: `${IMAGE_CDN_BASE}photo/002.jpg`, badge: '熱銷首選' },
    { _id: 'local-2', name: '手作地瓜糖/酥（小盒）', description: '輕巧包裝，隨時享受甜香酥脆。', price: 45, category: '零食', imageUrl: `${IMAGE_CDN_BASE}photo/005.png` },
    { _id: 'local-3', name: '手作地瓜糖/酥（大盒）', description: '份量更足，送禮分享都適合。', price: 65, category: '零食', imageUrl: `${IMAGE_CDN_BASE}photo/005.png` },
    { _id: 'local-4', name: '古早味茶葉蛋（1粒）', description: '單顆選購，剛剛好的滿足。', price: 13, category: '蛋', imageUrl: `${IMAGE_CDN_BASE}photo/004.png` },
    { _id: 'local-5', name: '古早味茶葉蛋（2粒）', description: '雙顆優惠組合，價格更划算。', price: 25, category: '蛋', imageUrl: `${IMAGE_CDN_BASE}photo/004.png` },
  ];

  const [products, setProducts] = useState(fallbackProducts);
  const [apiReady, setApiReady] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/api/products`)
      .then(r => r.json())
      .then(json => {
        if (json.success && json.data.length > 0) {
          // keep badges from fallback
          const badgeMap = { '黃金地瓜（1斤）': '熱銷首選' };
          setProducts(json.data.map(p => ({ ...p, imageUrl: toCdnImageUrl(p.imageUrl), badge: badgeMap[p.name] })));
          setApiReady(true);
        }
      })
      .catch(() => { /* use fallback */ });
  }, []);

  // ---------- Cart State ----------
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState(0); // 0=cart, 1=form
  const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '', email: '', address: '' });
  const [submitting, setSubmitting] = useState(false);

  // ---------- Toast ----------
  const [toastMsg, setToastMsg] = useState('');
  const [toastVisible, setToastVisible] = useState(false);

  const showToast = useCallback((msg) => {
    setToastMsg(msg);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2500);
  }, []);

  // ---------- Cart Logic ----------
  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(i => i._id === product._id);
      if (existing) return prev.map(i => i._id === product._id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { _id: product._id, name: product.name, price: product.price, imageUrl: product.imageUrl, description: product.description, qty: 1 }];
    });
    showToast(`已將「${product.name}」加入購物車`);
  };

  const updateQty = (id, delta) => {
    setCart(prev => prev.map(i => i._id === id ? { ...i, qty: Math.max(1, i.qty + delta) } : i));
  };

  const removeItem = (id) => {
    setCart(prev => prev.filter(i => i._id !== id));
  };

  const totalItems = cart.reduce((s, i) => s + i.qty, 0);
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const sweetPotatoQty = cart
    .filter(i => (i.name || '').includes('黃金地瓜'))
    .reduce((s, i) => s + i.qty, 0);
  const shipping = sweetPotatoQty >= 20 ? 0 : 150;
  const total = subtotal + shipping;

  const closeCart = () => {
    setIsCartOpen(false);
    setCheckoutStep(0);
  };

  // ---------- Checkout ----------
  const handleCheckout = async () => {
    if (checkoutStep === 0) {
      setCheckoutStep(1);
      return;
    }

    if (cart.length === 0) {
      showToast('⚠️ 您的購物車是空的喔！');
      return;
    }

    const { name, phone, email, address } = customerInfo;
    if (!name || !phone || !address) {
      showToast('⚠️ 請填寫姓名、電話與寄送地址');
      return;
    }

    setSubmitting(true);

    if (apiReady) {
      try {
        const shopInfo = {
          name: '磐石烤地瓜 - 番薯阿嬤',
          address: '高雄市左營區華夏路576號',
          phone: '0953830409',
        };

        const subtotalAmount = subtotal;
        const shippingAmount = shipping;
        const totalAmount = subtotalAmount + shippingAmount;

        const res = await fetch(`${API_BASE}/api/orders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: cart.map(item => ({
              id: item._id,
              name: item.name,
              price: item.price,
              quantity: item.qty,
            })),
            subtotal: subtotalAmount,
            shipping: shippingAmount,
            totalAmount,
            shopInfo,
            // 保留既有結單所需資訊：後端會用來建立訂單資料
            customer: { name, email, phone, address },
          }),
        });

        const json = await res.json().catch(() => ({}));
        if (res.ok && json.success && json.orderId) {
          alert(`訂單發送成功！您的訂單編號為：${json.orderId}`);
          setCart([]);
          setCustomerInfo({ name: '', phone: '', email: '', address: '' });
          closeCart();
        } else {
          showToast(`❌ 訂單發送失敗，請稍後再試。${json.message ? `(${json.message})` : ''}`);
        }
      } catch {
        showToast('❌ 無法連線伺服器，請稍後再試');
      }
    } else {
      showToast(`✅ 訂單已記錄！共 NT$${total}（含運費 NT$${shipping}）`);
      setCart([]);
      setCustomerInfo({ name: '', phone: '', email: '', address: '' });
      closeCart();
    }

    setSubmitting(false);
  };

  // ---------- Render ----------
  return (
    <>
      {/* ======= Nav ======= */}
      <nav className="nav">
        <div className="nav-inner">
          <h1 className="nav-logo">磐石烤地瓜</h1>
          <ul className="nav-links">
            <li><a href="#hero" className="active">首頁</a></li>
            <li><a href="#products">精選產品</a></li>
            <li><a href="#story">品牌故事</a></li>
          </ul>
          <button className="cart-btn" onClick={() => setIsCartOpen(true)} aria-label="開啟購物車">
            <ShoppingCart size={22} />
            {totalItems > 0 && <span className="cart-badge">{totalItems}</span>}
          </button>
        </div>
      </nav>

      {/* ======= Hero ======= */}
      <section className="hero" id="hero">
        <div className="hero-bg">
          <img src={`${IMAGE_CDN_BASE}photo/001.webp`} alt="磐石烤地瓜攤位" />
          <div className="hero-overlay" />
        </div>
        <div className="hero-content">
          <span className="tag">傳承古早窯烤工藝</span>
          <h2>番薯阿嬤的<br /><span className="accent">溫暖滋味</span></h2>
          <p>傳承阿嬤的手藝，現烤噴香的純粹。炭火慢烤，每一口都是古早的人情味。</p>
          <a href="#products" className="btn-primary">
            立即訂購 <ArrowRight size={20} />
          </a>
        </div>
      </section>

      {/* ======= Products ======= */}
      <section className="products-section" id="products">
        <div className="section-header">
          <p className="label">Our Selection</p>
          <h3>阿嬤的手工精選</h3>
        </div>
        <div className="product-grid">
          {products.map(product => (
            <div className="product-card" key={product._id}>
              <div className="product-img-wrapper">
                <img src={product.imageUrl} alt={product.name} />
                {product.badge && <span className="product-badge">{product.badge}</span>}
              </div>
              <div className="product-info">
                <h4>{product.name}</h4>
                <p className="desc">{product.description}</p>
                <div className="product-footer">
                  <span className="product-price">
                    NT${product.price}
                  </span>
                  <button className="btn-add-cart" onClick={() => addToCart(product)}>
                    <ShoppingCart size={16} /> 加入購物車
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ======= Brand Story ======= */}
      <section className="story-section" id="story">
        <div className="story-inner">
          <div className="story-img-wrapper">
            <img src={`${IMAGE_CDN_BASE}photo/003.png`} alt="窯烤地瓜" />
            <div className="story-badge">
              <div className="number">20+</div>
              <div className="text">Years of Tradition</div>
            </div>
          </div>
          <div className="story-text">
            <p className="label">Our Story</p>
            <h3>守護一爐炭火的執著</h3>
            <p>在那座用了 20 多年的窯烤爐旁，我們依然堅持最古老的做法。阿嬤常說：「地瓜要好吃，急不得。」</p>
            <p>從天未亮就開始挑選最新鮮的番薯，到細心地洗淨、入爐、翻動。每一次呼吸都伴隨著炭火的香氣，每一顆地瓜都承載著我們對土地的敬意。</p>
            <div className="story-stats">
              <div>
                <div className="stat-label">阿嬤精神</div>
                <div className="stat-value">無添加、真材實料</div>
              </div>
              <div className="divider" />
              <div>
                <div className="stat-label">產地直送</div>
                <div className="stat-value">雲林水林優質契作</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ======= Footer ======= */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <h4>磐石烤地瓜</h4>
            <p>致力於將最原始、最天然的古早美味帶進現代人的生活中。每一顆地瓜，都是一份溫暖的傳承。</p>
          </div>
          <div className="footer-col">
            <h5>快速連結</h5>
            <ul>
              <li><a href="#">關於我們</a></li>
              <li><a href="#products">產品系列</a></li>
              <li><a href="#">美味據點</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h5>聯絡我們</h5>
            <ul>
              <li><Phone size={14} /> 0953830409</li>
              <li><Mail size={14} /> hello@panshi.com</li>
              <li><MapPin size={14} /> 高雄市左營區華夏路576號</li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© 2024 磐石烤地瓜 - 番薯阿嬤 版權所有</p>
          <div>
            <a href="#">隱私政策</a>
            <a href="#">服務條款</a>
          </div>
        </div>
      </footer>

      {/* ======= Cart Overlay ======= */}
      <div
        className={`cart-overlay ${isCartOpen ? 'open' : ''}`}
        onClick={closeCart}
      />

      {/* ======= Cart Drawer ======= */}
      <aside className={`cart-drawer ${isCartOpen ? 'open' : ''}`}>
        <div className="cart-header">
          <h2><ShoppingCart size={20} /> 購物車</h2>
          <button className="cart-close-btn" onClick={closeCart}><X size={22} /></button>
        </div>

        <div className="cart-body">
          {cart.length === 0 ? (
            <div className="cart-empty">
              <ShoppingBag size={48} />
              <p>購物車是空的</p>
              <p>快去挑選阿嬤的好料吧！</p>
            </div>
          ) : (
            cart.map(item => (
              <div className="cart-item" key={item._id}>
                <img src={item.imageUrl} alt={item.name} />
                <div className="cart-item-info">
                  <div className="cart-item-header">
                    <h4>{item.name}</h4>
                    <button className="cart-item-remove" onClick={() => removeItem(item._id)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="cart-item-footer">
                    <div className="qty-control">
                      <button className="qty-btn" onClick={() => updateQty(item._id, -1)}><Minus size={14} /></button>
                      <span className="qty-value">{item.qty}</span>
                      <button className="qty-btn" onClick={() => updateQty(item._id, 1)}><Plus size={14} /></button>
                    </div>
                    <span className="cart-item-price">NT${item.price * item.qty}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {cart.length > 0 && (
          <div className="cart-footer">
            <div className="cart-row">
              <span className="cart-row-label">商品小計</span>
              <span className="cart-row-value">NT${subtotal}</span>
            </div>
            <div className="cart-row">
              <span className="cart-row-label">運費</span>
              <span className={`cart-row-value ${shipping === 0 ? 'free' : ''}`}>
                {shipping === 0 ? '免運費 🎉' : `NT$${shipping}`}
              </span>
            </div>
            {shipping > 0 && <div className="cart-shipping-hint">黃金地瓜滿 20 盒享免運優惠</div>}
            <div className="cart-total-row">
              <span className="label">總計</span>
              <span className="value">NT${total}</span>
            </div>

            {checkoutStep === 1 && (
              <div className="checkout-form">
                <h4>寄送資訊</h4>
                <input
                  placeholder="姓名 *" value={customerInfo.name}
                  onChange={e => setCustomerInfo(p => ({ ...p, name: e.target.value }))}
                  autoFocus
                />
                <input
                  type="tel" placeholder="電話 *" value={customerInfo.phone}
                  onChange={e => setCustomerInfo(p => ({ ...p, phone: e.target.value }))}
                />
                <input
                  type="email" placeholder="Email（選填）" value={customerInfo.email}
                  onChange={e => setCustomerInfo(p => ({ ...p, email: e.target.value }))}
                />
                <input
                  placeholder="寄送地址 *" value={customerInfo.address}
                  onChange={e => setCustomerInfo(p => ({ ...p, address: e.target.value }))}
                />
              </div>
            )}

            <button className="btn-checkout" onClick={handleCheckout} disabled={submitting}>
              {submitting ? '訂單處理中...' : checkoutStep === 0 ? '前往結帳' : '確認送出訂單'}
            </button>
          </div>
        )}
      </aside>

      {/* ======= Toast ======= */}
      <Toast message={toastMsg} visible={toastVisible} />
    </>
  );
}
