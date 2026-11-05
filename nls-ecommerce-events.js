/* NLS storefront ecommerce events. No personal data is collected by this module.
 * Connect a consent-aware analytics destination before reporting visitor metrics.
 */
(function () {
  'use strict';
  window.dataLayer = window.dataLayer || [];
  const allowed = new Set(['view_item', 'add_to_cart', 'remove_from_cart', 'begin_checkout', 'purchase']);
  function emit(name, ecommerce) {
    if (!allowed.has(name) || !ecommerce || typeof ecommerce !== 'object') return;
    window.dataLayer.push({ ecommerce: null });
    window.dataLayer.push({ event: name, ecommerce });
  }
  window.NLSEcommerce = Object.freeze({
    track: emit,
    viewItem: item => emit('view_item', { currency: 'USD', items: [item] }),
    addToCart: (item, value) => emit('add_to_cart', { currency: 'USD', value, items: [item] }),
    removeFromCart: (item, value) => emit('remove_from_cart', { currency: 'USD', value, items: [item] }),
    beginCheckout: (items, value) => emit('begin_checkout', { currency: 'USD', value, items }),
    purchase: (transactionId, items, value) => {
      if (typeof transactionId !== 'string' || !/^cs_(live|test)_[A-Za-z0-9_]+$/.test(transactionId)) return;
      emit('purchase', { transaction_id: transactionId, currency: 'USD', value, items });
    }
  });
  // Product detail pages use SKU-style HTML filenames. Do not infer a purchase from a page view.
  const page = location.pathname.split('/').pop();
  if (page && page !== 'index.html' && /^[a-z0-9][a-z0-9-]*\.html$/i.test(page) &&
      !['lock-bundles.html','checkout.html','privacy.html','terms.html'].includes(page)) {
    window.NLSEcommerce.viewItem({ item_id: page.slice(0, -5), item_name: document.title || page });
  }
})();
