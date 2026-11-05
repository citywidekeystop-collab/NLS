!function(w,d,s,u){if(w.oaiq)return;var q=function(){q.q.push(arguments)};q.q=[];w.oaiq=q;var j=d.createElement(s);j.async=1;j.src=u;var f=d.getElementsByTagName(s)[0];f.parentNode.insertBefore(j,f)}(window,document,"script","https://bzrcdn.openai.com/sdk/oaiq.min.js");oaiq("init",{pixelId:"7zRTA7E54AgswVzQscPZ6S",debug:true});

// Called only with the response from the server's Stripe session verification.

// Capture the cart state before the homepage handles direct "?product=...&add=1" links.
try{const q=new URL(location.href);if(q.searchParams.get('add')==='1'&&q.searchParams.get('product'))window.__nlsCartPriorToQuery=JSON.parse(localStorage.getItem('nls-cart-v1')||'[]');}catch(_){}

// The Stripe return handler calls nlsTrackConfirmedOrder only after checking the
// server. Record homepage ecommerce purchase separately from the advertising pixel.
function nlsTrackHomepagePurchase(sessionId,checkout){
  if(!['/','/index.html'].includes(location.pathname))return;
  if(!/^cs_live_[A-Za-z0-9]+$/.test(sessionId)||checkout?.status!=='complete'||checkout?.payment_status!=='paid'||checkout?.livemode!==true||!Number.isSafeInteger(checkout.amount_total))return;
  try{
    const pending=JSON.parse(sessionStorage.getItem('nls-pending-checkout')||'null');
    const rows=JSON.parse(localStorage.getItem('nls-cart-v1')||'[]');
    if(pending?.id!==sessionId||!Array.isArray(rows)||JSON.stringify(rows)!==JSON.stringify(pending.items))return;
    const key='nls-ga4-purchase:'+sessionId;
    if(localStorage.getItem(key))return;
    const items=rows.map(row=>{
      const item={item_id:row.sku,quantity:row.quantity};
      try{if(typeof products!=='undefined'){const p=products.find(x=>x.sku===row.sku);if(p){item.item_name=p.name;if(Number.isFinite(p.price))item.price=p.price;}}}catch(_){}
      return item;
    });
    const value=checkout.amount_total/100;
    if(window.NLSEcommerce)window.NLSEcommerce.purchase(sessionId,items,value);
    else{window.dataLayer=window.dataLayer||[];window.dataLayer.push({ecommerce:null});window.dataLayer.push({event:'purchase',ecommerce:{transaction_id:sessionId,currency:'USD',value,items}});}
    localStorage.setItem(key,'1');
  }catch(_){}
}

window.nlsTrackConfirmedOrder = function (sessionId, checkout) {
  nlsTrackHomepagePurchase(sessionId, checkout);
  if (!/^cs_live_[A-Za-z0-9]+$/.test(sessionId) ||
      checkout.status !== "complete" || checkout.payment_status !== "paid" ||
      checkout.livemode !== true || !Number.isSafeInteger(checkout.amount_total) ||
      checkout.amount_total < 0 || !/^[a-z]{3}$/i.test(checkout.currency || "") ||
      typeof window.oaiq !== "function") return false;
  var eventId = "nls_" + sessionId;
  var storageKey = "nls-order-tracked:" + eventId;
  try { if (localStorage.getItem(storageKey)) return false; } catch (_) {}
  window.oaiq("measure", "order_created", {
    type: "contents",
    amount: checkout.amount_total,
    currency: checkout.currency.toUpperCase()
  }, { event_id: eventId });
  try { localStorage.setItem(storageKey, "1"); } catch (_) {}
  return true;
};

// The existing NLS storefront includes this file on its homepage and product pages.
// Load the separate visitor/cart instrumentation without editing its large HTML.
(function(d){if(d.querySelector('script[data-nls-storefront-tracking]'))return;const s=d.createElement('script');s.src='/nls-storefront-tracking.js';s.setAttribute('data-nls-storefront-tracking','');d.head.appendChild(s);})(document);
