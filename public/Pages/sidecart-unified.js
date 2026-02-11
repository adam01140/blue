// Unified sidecart behavior for Pages/*.html
(function () {
  function getCookie(name) {
    const eq = name + '=';
    const parts = document.cookie.split(';');
    for (let c of parts) {
      while (c.charAt(0) === ' ') c = c.slice(1);
      if (c.indexOf(eq) === 0) return c.slice(eq.length);
    }
    return null;
  }

  function parseCartPayload(raw) {
    if (!raw || typeof raw !== 'string') return null;
    try {
      const normalized = raw.startsWith('%') ? decodeURIComponent(raw) : raw;
      const parsed = JSON.parse(normalized);
      if (Array.isArray(parsed)) return parsed;
      if (parsed && Array.isArray(parsed.cart)) return parsed.cart;
      return null;
    } catch {
      return null;
    }
  }

  function readCart() {
    const cookieRaw = getCookie('formwiz_cart');
    const localRaw = (typeof localStorage !== 'undefined') ? localStorage.getItem('formwiz_cart') : null;

    const fromCookie = parseCartPayload(cookieRaw);
    if (fromCookie) return fromCookie;

    const fromLocal = parseCartPayload(localRaw);
    if (fromLocal) return fromLocal;

    return [];
  }

  function writeCart(cart) {
    document.cookie = 'formwiz_cart=' + encodeURIComponent(JSON.stringify(cart)) + ';path=/;max-age=2592000';
    try { localStorage.setItem('formwiz_cart', JSON.stringify(cart)); } catch {}
  }

  async function fetchStripePrice(priceId) {
    try {
      const res = await fetch('/stripe-price/' + priceId, { mode: 'cors' });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  function normalizeFormId(value) {
    return String(value || '').replace(/\.pdf$/i, '').trim().toLowerCase();
  }

  function ensureCartMarkup() {
    const overlay = document.getElementById('cart-overlay');
    const sideMenu = document.getElementById('cart-side-menu');
    if (!overlay || !sideMenu) return null;

    let header = sideMenu.querySelector('.cart-header');
    if (!header) {
      header = document.createElement('div');
      header.className = 'cart-header';
      sideMenu.prepend(header);
    }
    header.innerHTML = '<h2>🛒 Cart</h2><button class="cart-close-btn" id="cart-close-btn" type="button">&times;</button>';

    let content = sideMenu.querySelector('.cart-content');
    if (!content) {
      content = document.createElement('div');
      content.className = 'cart-content';
      sideMenu.appendChild(content);
    }
    content.id = 'cart-content';
    content.innerHTML = '' +
      '<div class="cart-icon-large">🛒</div>' +
      '<div class="cart-message" id="cart-message">Create an account to start shopping!</div>' +
      '<div class="cart-description" id="cart-description">To add forms to your cart and make purchases, you\\'ll need to create a Form-Star account. Sign up now to access our complete library of forms and start simplifying your paperwork.</div>' +
      '<a href="account.html" class="cart-signup-btn" id="cart-signup-btn">Sign Up</a>' +
      '<div class="cart-items-list" id="cart-items-list" style="display:none;"></div>' +
      '<button type="button" class="cart-checkout-btn" id="cart-checkout-btn" style="display:none;">Checkout</button>' +
      '<br>';

    return {
      overlay,
      sideMenu,
      content,
      closeBtn: document.getElementById('cart-close-btn'),
      message: document.getElementById('cart-message'),
      description: document.getElementById('cart-description'),
      signupBtn: document.getElementById('cart-signup-btn'),
      itemsList: document.getElementById('cart-items-list'),
      checkoutBtn: document.getElementById('cart-checkout-btn'),
      iconLarge: content.querySelector('.cart-icon-large')
    };
  }

  function updateCartCountBadge() {
    const badge = document.getElementById('cart-count-badge');
    if (!badge) return;
    let count = 0;
    if (typeof getCartCount === 'function') {
      count = getCartCount();
    } else {
      const cart = readCart();
      count = cart.length;
    }
    if (count > 0) {
      badge.textContent = count;
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  }

  async function init() {
    const cartIconLink = document.getElementById('cart-icon-link');
    const parts = ensureCartMarkup();
    if (!cartIconLink || !parts) return;
    if (cartIconLink.dataset.sidecartUnified === '1') return;

    const {
      overlay,
      sideMenu,
      content,
      closeBtn,
      message,
      description,
      signupBtn,
      itemsList,
      checkoutBtn,
      iconLarge
    } = parts;

    function openCart() {
      overlay.classList.add('active');
      sideMenu.classList.add('active');
      overlay.style.opacity = '1';
      overlay.style.visibility = 'visible';
      document.body.style.overflow = 'hidden';
      if (content) content.scrollTop = 0;
    }

    function closeCart() {
      overlay.classList.remove('active');
      sideMenu.classList.remove('active');
      overlay.style.opacity = '0';
      overlay.style.visibility = 'hidden';
      document.body.style.overflow = '';
    }

    async function renderSignedInCart() {
      if (content) content.style.justifyContent = 'flex-start';
      if (iconLarge) iconLarge.style.display = 'block';
      signupBtn.style.display = 'none';
      itemsList.style.display = 'block';
      checkoutBtn.style.display = 'none';
      itemsList.innerHTML = '<div style="color:#7f8c8d;font-size:1.1em;margin-top:18px;text-align:center;width:100%;">Loading cart...</div>';

      const cart = readCart();
      if (!cart.length) {
        if (content) content.style.justifyContent = 'center';
        if (iconLarge) iconLarge.style.display = 'block';
        message.style.display = 'none';
        description.style.display = 'none';
        itemsList.innerHTML = '<div style="color:#7f8c8d;font-size:1.1em;margin-top:18px;">Your cart is empty.</div>';
        checkoutBtn.style.display = 'none';
        updateCartCountBadge();
        return;
      }

      message.textContent = 'Your Cart';
      description.textContent = 'Review your selected forms and proceed to checkout.';
      message.style.display = 'block';
      description.style.display = 'block';

      const groupedItems = new Map();
      for (let i = 0; i < cart.length; i++) {
        const item = cart[i];
        const groupKey = item && item.portfolioId ? String(item.portfolioId) : 'NO_PORTFOLIO_ID';
        if (!groupedItems.has(groupKey)) groupedItems.set(groupKey, []);
        groupedItems.get(groupKey).push({ item, index: i });
      }

      let html = '';
      let totalAmount = 0;

      for (const [groupKey, entries] of groupedItems.entries()) {
        let groupName = '';
        const withExplicitName = entries.find(entry => entry.item && entry.item.formData && entry.item.formData.formName);
        if (withExplicitName) groupName = String(withExplicitName.item.formData.formName).trim();

        if (!groupName) {
          const parentRow = entries.find(entry => {
            const fid = normalizeFormId(entry.item && entry.item.formId);
            const ofid = normalizeFormId(entry.item && entry.item.originalFormId);
            return fid && ofid && fid === ofid;
          });
          if (parentRow && parentRow.item && parentRow.item.title) groupName = String(parentRow.item.title).trim();
        }

        if (!groupName) {
          const titled = entries.find(entry => entry.item && entry.item.title);
          if (titled) groupName = String(titled.item.title).trim();
        }

        if (!groupName) {
          groupName = groupKey === 'NO_PORTFOLIO_ID' ? 'Ungrouped Forms' : 'Portfolio Group';
        }

        html += '<div class="cart-group"><div class="cart-group-header">' + groupName + ' (' + entries.length + ' item' + (entries.length === 1 ? '' : 's') + ')</div>';

        for (const entry of entries) {
          const item = entry.item;
          const priceInfo = await fetchStripePrice(item.priceId);
          let display = '...';
          if (priceInfo && priceInfo.unit_amount != null) {
            display = '$' + (priceInfo.unit_amount / 100).toFixed(2);
            totalAmount += (priceInfo.unit_amount / 100);
          }

          let defendantDisplay = '';
          if (item.defendantName) {
            const capName = String(item.defendantName)
              .split(/\s+/)
              .map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(); })
              .join(' ');
            defendantDisplay = '<div style="font-weight:bold;color:#e74c3c;">Defendant: ' + capName + '</div>';
          }

          html += '<div class="cart-item">' +
            '<div class="cart-item-info">' +
            '<div class="cart-item-title">' + (item.title || 'Form') + '</div>' +
            defendantDisplay +
            (item.countyName ? '<div class="cart-item-county" style="font-size:0.98em;color:#153a5b;margin-bottom:2px;">' + item.countyName + '</div>' : '') +
            '<div class="cart-item-price">' + display + '</div></div>' +
            '<button class="remove-item" title="Remove" data-index="' + entry.index + '"><svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 7h10"></path><path d="M8 7V5.8a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1V7"></path><rect x="6.5" y="7" width="7" height="9" rx="1.2"></rect><line x1="9" y1="10" x2="9" y2="14"></line><line x1="11" y1="10" x2="11" y2="14"></line></svg></button></div>';
        }

        html += '</div>';
      }

      html += '<div class="cart-summary"><div class="summary-label">Total:</div><div class="total-amount">$' + totalAmount.toFixed(2) + '</div><button class="cart-summary-checkout-btn" id="cart-summary-checkout-btn">Checkout - $' + totalAmount.toFixed(2) + '</button></div>';
      itemsList.innerHTML = html;
      checkoutBtn.style.display = 'none';

      itemsList.querySelectorAll('.remove-item').forEach(function (btn) {
        btn.addEventListener('click', async function () {
          const cartIndex = parseInt(btn.getAttribute('data-index'), 10);
          const latest = readCart();
          if (isNaN(cartIndex) || cartIndex < 0 || cartIndex >= latest.length) return;
          latest.splice(cartIndex, 1);
          writeCart(latest);
          updateCartCountBadge();
          await renderSignedInCart();
        });
      });

      const summaryCheckoutBtn = document.getElementById('cart-summary-checkout-btn');
      if (summaryCheckoutBtn) {
        summaryCheckoutBtn.onclick = function () {
          window.location.href = 'cart.html';
        };
      }

      updateCartCountBadge();
    }

    async function onCartClick(e) {
      e.preventDefault();
      openCart();
      const isSignedIn = !!(window.firebase && firebase.auth && firebase.auth().currentUser);
      const cartSnapshot = readCart();
      const hasCartItems = Array.isArray(cartSnapshot) && cartSnapshot.length > 0;
      if (!isSignedIn && !hasCartItems) {
        if (content) content.style.justifyContent = 'center';
        if (iconLarge) iconLarge.style.display = 'block';
        message.textContent = 'Create an account to start shopping!';
        message.style.display = 'block';
        description.style.display = 'block';
        signupBtn.style.display = 'inline-block';
        itemsList.style.display = 'none';
        checkoutBtn.style.display = 'none';
        return;
      }
      await renderSignedInCart();
    }

    // Reset possible old listeners by cloning elements.
    const iconClone = cartIconLink.cloneNode(true);
    cartIconLink.parentNode.replaceChild(iconClone, cartIconLink);
    const closeClone = closeBtn.cloneNode(true);
    closeBtn.parentNode.replaceChild(closeClone, closeBtn);

    iconClone.dataset.sidecartUnified = '1';
    iconClone.addEventListener('click', onCartClick);
    closeClone.addEventListener('click', closeCart);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeCart();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeCart();
    });

    updateCartCountBadge();
    setInterval(updateCartCountBadge, 5000);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
