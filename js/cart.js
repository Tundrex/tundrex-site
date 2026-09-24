/**
 * Tundrex Custom Cart System
 * cart.js — Slide-out cart drawer with Shopify Storefront API (Cart API)
 *
 * Uses cartCreate, cartLinesAdd, cartLinesUpdate, cartLinesRemove mutations
 * Persists cart in localStorage across pages
 */

(function () {
  'use strict';

  /* ─── Shopify Config ─────────────────────────────────────── */
  var SHOPIFY_DOMAIN = 'tundrex.myshopify.com';
  var STOREFRONT_TOKEN = '674853abbc6841c6c29d963e121a2f37';
  var API_URL = 'https://' + SHOPIFY_DOMAIN + '/api/2024-01/graphql.json';
  var STORAGE_KEY = 'tundrex_cart';

  /* ─── GraphQL helpers ────────────────────────────────────── */
  function gql(query, variables) {
    return fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': STOREFRONT_TOKEN
      },
      body: JSON.stringify({ query: query, variables: variables || {} })
    }).then(function (r) { return r.json(); });
  }

  /* ─── Cart Manager ───────────────────────────────────────── */
  var CartManager = {

    /* Local cart state (no Shopify cart ID until checkout) */
    items: [],       // [{variantId, title, price, imageUrl, quantity}]
    cartId: null,    // Shopify cart GID — created at checkout time

    /* ── Init ── */
    init: function () {
      this._load();
      this._injectDrawer();
      this._injectCartIcon();
      this._bindEvents();
      this._renderItems();
      this._updateBadge();
    },

    /* ── Persist ── */
    _save: function () {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          items: this.items,
          cartId: this.cartId
        }));
      } catch (e) { /* quota/private mode */ }
    },

    _load: function () {
      try {
        var raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          var data = JSON.parse(raw);
          this.items = data.items || [];
          this.cartId = data.cartId || null;
        }
      } catch (e) {
        this.items = [];
        this.cartId = null;
      }
    },

    /* ── Cart actions ── */
    addToCart: function (variantId, title, price, imageUrl, quantity) {
      quantity = quantity || 1;
      var existing = this._findItem(variantId);
      if (existing) {
        existing.quantity += quantity;
      } else {
        this.items.push({ variantId: variantId, title: title, price: parseFloat(price), imageUrl: imageUrl, quantity: quantity });
      }
      this._save();
      this._renderItems();
      this._updateBadge();
      this._showToast('Added to cart!');
      this.openDrawer();
    },

    removeItem: function (variantId) {
      this.items = this.items.filter(function (i) { return i.variantId !== variantId; });
      this._save();
      this._renderItems();
      this._updateBadge();
    },

    updateQty: function (variantId, delta) {
      var item = this._findItem(variantId);
      if (!item) return;
      item.quantity = Math.max(0, item.quantity + delta);
      if (item.quantity === 0) {
        this.removeItem(variantId);
      } else {
        this._save();
        this._renderItems();
        this._updateBadge();
      }
    },

    _findItem: function (variantId) {
      for (var i = 0; i < this.items.length; i++) {
        if (this.items[i].variantId === variantId) return this.items[i];
      }
      return null;
    },

    totalItems: function () {
      return this.items.reduce(function (s, i) { return s + i.quantity; }, 0);
    },

    subtotal: function () {
      return this.items.reduce(function (s, i) { return s + i.price * i.quantity; }, 0);
    },

    /* ── Checkout via Shopify Cart API ── */
    checkout: function () {
      var self = this;
      if (this.items.length === 0) return;

      var btn = document.getElementById('tundrex-checkout-btn');
      if (btn) { btn.disabled = true; btn.classList.add('loading'); btn.textContent = ''; }

      var lines = this.items.map(function (item) {
        return { merchandiseId: item.variantId, quantity: item.quantity };
      });

      var mutation = '\n        mutation cartCreate($input: CartInput!) {\n          cartCreate(input: $input) {\n            cart {\n              id\n              checkoutUrl\n            }\n            userErrors {\n              field\n              message\n            }\n          }\n        }\n      ';

      gql(mutation, { input: { lines: lines } })
        .then(function (data) {
          var result = data && data.data && data.data.cartCreate;
          if (result && result.cart && result.cart.checkoutUrl) {
            self.cartId = result.cart.id;
            self._save();
            window.location.href = result.cart.checkoutUrl;
          } else {
            var errs = result && result.userErrors && result.userErrors.length
              ? result.userErrors.map(function (e) { return e.message; }).join(', ')
              : 'Unknown error';
            console.error('Tundrex cart error:', errs);
            if (btn) { btn.disabled = false; btn.classList.remove('loading'); btn.textContent = 'Checkout'; }
            alert('Checkout failed: ' + errs + '. Please try again.');
          }
        })
        .catch(function (err) {
          console.error('Tundrex cart API error:', err);
          if (btn) { btn.disabled = false; btn.classList.remove('loading'); btn.textContent = 'Checkout'; }
          alert('Network error. Please check your connection and try again.');
        });
    },

    /* ── Drawer open / close ── */
    openDrawer: function () {
      var drawer = document.getElementById('tundrex-cart-drawer');
      var overlay = document.getElementById('tundrex-cart-overlay');
      if (drawer) drawer.classList.add('open');
      if (overlay) overlay.classList.add('open');
      document.body.classList.add('tundrex-cart-open');
    },

    closeDrawer: function () {
      var drawer = document.getElementById('tundrex-cart-drawer');
      var overlay = document.getElementById('tundrex-cart-overlay');
      if (drawer) drawer.classList.remove('open');
      if (overlay) overlay.classList.remove('open');
      document.body.classList.remove('tundrex-cart-open');
    },

    /* ── Inject DOM ── */
    _injectDrawer: function () {
      if (document.getElementById('tundrex-cart-drawer')) return; // already injected

      /* Overlay */
      var overlay = document.createElement('div');
      overlay.id = 'tundrex-cart-overlay';
      overlay.className = 'tundrex-cart-overlay';
      document.body.appendChild(overlay);

      /* Drawer */
      var drawer = document.createElement('div');
      drawer.id = 'tundrex-cart-drawer';
      drawer.className = 'tundrex-cart-drawer';
      drawer.setAttribute('aria-label', 'Shopping cart');
      drawer.setAttribute('role', 'dialog');
      drawer.innerHTML = [
        '<div class="tundrex-cart-header">',
        '  <h2 class="tundrex-cart-title">Your Cart</h2>',
        '  <button class="tundrex-cart-close" id="tundrex-cart-close-btn" aria-label="Close cart">',
        '    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">',
        '      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
        '    </svg>',
        '  </button>',
        '</div>',
        '<div class="tundrex-cart-items" id="tundrex-cart-items"></div>',
        '<div class="tundrex-cart-footer" id="tundrex-cart-footer">',
        '  <div class="tundrex-cart-subtotal-row">',
        '    <span class="tundrex-cart-subtotal-label">Subtotal</span>',
        '    <span class="tundrex-cart-subtotal-value" id="tundrex-cart-subtotal">$0.00</span>',
        '  </div>',
        '  <button class="tundrex-cart-checkout-btn" id="tundrex-checkout-btn">',
        '    Checkout',
        '    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">',
        '      <path d="M5 12h14M12 5l7 7-7 7"/>',
        '    </svg>',
        '  </button>',
        '</div>'
      ].join('');

      document.body.appendChild(drawer);

      /* Toast */
      var toast = document.createElement('div');
      toast.id = 'tundrex-cart-toast';
      toast.className = 'tundrex-cart-toast';
      toast.innerHTML = '<span class="tundrex-cart-toast-icon">✓</span><span id="tundrex-cart-toast-msg">Added to cart!</span>';
      document.body.appendChild(toast);
    },

    _injectCartIcon: function () {
      if (document.getElementById('tundrex-cart-nav-btn')) return;

      /* Find the nav-inner div or nav-links */
      var navLinks = document.querySelector('.nav-links');
      var navInner = document.querySelector('.nav-inner');
      var hamburger = document.getElementById('hamburger');
      var insertBefore = hamburger || null;
      var parent = navInner || document.querySelector('.nav');

      if (!parent) return;

      var btn = document.createElement('button');
      btn.id = 'tundrex-cart-nav-btn';
      btn.className = 'tundrex-cart-nav-btn';
      btn.setAttribute('aria-label', 'Open cart');
      btn.innerHTML = [
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">',
        '  <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>',
        '  <line x1="3" y1="6" x2="21" y2="6"/>',
        '  <path d="M16 10a4 4 0 01-8 0"/>',
        '</svg>',
        '<span class="tundrex-cart-badge hidden" id="tundrex-cart-badge">0</span>'
      ].join('');

      /* Insert before hamburger, or append to nav-inner */
      if (insertBefore && insertBefore.parentNode === parent) {
        parent.insertBefore(btn, insertBefore);
      } else {
        parent.appendChild(btn);
      }
    },

    _bindEvents: function () {
      var self = this;

      /* Close button */
      document.addEventListener('click', function (e) {
        var closeBtn = e.target.closest('#tundrex-cart-close-btn');
        if (closeBtn) { self.closeDrawer(); return; }

        /* Overlay click */
        if (e.target.id === 'tundrex-cart-overlay') { self.closeDrawer(); return; }

        /* Nav cart icon */
        var navBtn = e.target.closest('#tundrex-cart-nav-btn');
        if (navBtn) { self.openDrawer(); return; }

        /* Checkout button */
        if (e.target.id === 'tundrex-checkout-btn' || e.target.closest('#tundrex-checkout-btn')) {
          self.checkout(); return;
        }

        /* Add to cart buttons */
        var addBtn = e.target.closest('.btn-add-to-cart');
        if (addBtn) {
          e.preventDefault();
          var variantId = addBtn.dataset.variantId;
          var title = addBtn.dataset.title || 'Tundrex Product';
          var price = addBtn.dataset.price || '44.99';
          var imageUrl = addBtn.dataset.image || '';
          self.addToCart(variantId, title, parseFloat(price), imageUrl, 1);

          /* Brief "Added!" feedback */
          var origText = addBtn.textContent;
          addBtn.textContent = 'Added!';
          addBtn.classList.add('added');
          setTimeout(function () {
            addBtn.textContent = origText;
            addBtn.classList.remove('added');
          }, 1800);
          return;
        }

        /* Qty + / - buttons */
        var qtyBtn = e.target.closest('.tundrex-cart-qty-btn');
        if (qtyBtn) {
          var delta = parseInt(qtyBtn.dataset.delta, 10);
          var vid = qtyBtn.dataset.variantId;
          self.updateQty(vid, delta);
          return;
        }

        /* Remove button */
        var removeBtn = e.target.closest('.tundrex-cart-item-remove');
        if (removeBtn) {
          self.removeItem(removeBtn.dataset.variantId);
          return;
        }
      });

      /* Keyboard close */
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { self.closeDrawer(); }
      });
    },

    /* ── Render ── */
    _renderItems: function () {
      var container = document.getElementById('tundrex-cart-items');
      var footer = document.getElementById('tundrex-cart-footer');
      var subtotalEl = document.getElementById('tundrex-cart-subtotal');
      if (!container) return;

      if (this.items.length === 0) {
        container.innerHTML = [
          '<div class="tundrex-cart-empty">',
          '  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">',
          '    <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>',
          '    <line x1="3" y1="6" x2="21" y2="6"/>',
          '    <path d="M16 10a4 4 0 01-8 0"/>',
          '  </svg>',
          '  <p>Your cart is empty</p>',
          '  <span>Add a product to get started</span>',
          '</div>'
        ].join('');
        if (footer) footer.style.display = 'none';
        return;
      }

      if (footer) footer.style.display = '';

      var html = '';
      for (var i = 0; i < this.items.length; i++) {
        var item = this.items[i];
        var lineTotal = (item.price * item.quantity).toFixed(2);
        var imgSrc = item.imageUrl || '';
        html += '<div class="tundrex-cart-item">';
        if (imgSrc) {
          html += '<img class="tundrex-cart-item-img" src="' + this._escHtml(imgSrc) + '" alt="' + this._escHtml(item.title) + '" loading="lazy" />';
        } else {
          html += '<div class="tundrex-cart-item-img" style="display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,0.2);font-size:1.5rem;">🌿</div>';
        }
        html += '<div class="tundrex-cart-item-info">';
        html += '<p class="tundrex-cart-item-title">' + this._escHtml(item.title) + '</p>';
        html += '<p class="tundrex-cart-item-price">$' + lineTotal + '</p>';
        html += '<div class="tundrex-cart-item-controls">';
        html += '<button class="tundrex-cart-qty-btn" data-variant-id="' + this._escHtml(item.variantId) + '" data-delta="-1" aria-label="Decrease quantity">−</button>';
        html += '<span class="tundrex-cart-qty-num">' + item.quantity + '</span>';
        html += '<button class="tundrex-cart-qty-btn" data-variant-id="' + this._escHtml(item.variantId) + '" data-delta="1" aria-label="Increase quantity">+</button>';
        html += '<button class="tundrex-cart-item-remove" data-variant-id="' + this._escHtml(item.variantId) + '" aria-label="Remove item">';
        html += '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>';
        html += '</button>';
        html += '</div>';
        html += '</div>';
        html += '</div>';
      }
      container.innerHTML = html;

      if (subtotalEl) {
        subtotalEl.textContent = '$' + this.subtotal().toFixed(2);
      }
    },

    _updateBadge: function () {
      var badge = document.getElementById('tundrex-cart-badge');
      if (!badge) return;
      var count = this.totalItems();
      badge.textContent = count > 99 ? '99+' : String(count);
      if (count > 0) {
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    },

    /* ── Toast ── */
    _toastTimer: null,
    _showToast: function (msg) {
      var toast = document.getElementById('tundrex-cart-toast');
      var msgEl = document.getElementById('tundrex-cart-toast-msg');
      if (!toast) return;
      if (msgEl) msgEl.textContent = msg || 'Added to cart!';
      toast.classList.add('visible');
      if (this._toastTimer) clearTimeout(this._toastTimer);
      var self = this;
      this._toastTimer = setTimeout(function () {
        toast.classList.remove('visible');
      }, 2500);
    },

    /* ── Utility ── */
    _escHtml: function (str) {
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }
  };

  /* ─── Boot ─────────────────────────────────────────────────── */
  function boot() {
    CartManager.init();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  /* Expose globally for console debugging */
  window.TundrexCart = CartManager;

})();
