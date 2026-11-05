/* NLS privacy-conscious GA4 dataLayer and OpenAI Ads shopping events.
   No email, name, phone, address, or card details are included. */
(function () {
  "use strict";
  var CONSENT_KEY = "nls-shopping-analytics-consent-v1";
  var allowed = new Set(["page_view", "view_item", "add_to_cart", "remove_from_cart", "begin_checkout", "purchase"]);
  window.dataLayer = window.dataLayer || [];
  function consented() { try { return localStorage.getItem(CONSENT_KEY) === "yes"; } catch (_) { return false; } }
  var googleReady = false;
  function initGoogleAds() {
    if (!consented() || googleReady) return;
    googleReady = true;
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("set", "allow_ad_personalization_signals", false);
    window.gtag("config", "AW-16693027016");
    var script = document.createElement("script");
    script.async = true;
    script.src = "https://www.googletagmanager.com/gtag/js?id=AW-16693027016";
    document.head.appendChild(script);
  }
  function cleanItem(item) {
    if (!item || typeof item !== "object") return null;
    var x = { item_id: String(item.item_id || "").slice(0, 90), item_name: String(item.item_name || "").slice(0, 180) };
    if (!x.item_id) return null;
    if (Number.isFinite(item.price) && item.price >= 0) x.price = Math.round(item.price * 100) / 100;
    if (Number.isSafeInteger(item.quantity) && item.quantity > 0) x.quantity = Math.min(25, item.quantity);
    return x;
  }
  function send(name, payload) {
    if (!allowed.has(name) || !consented()) return;
    var e = payload && typeof payload === "object" ? payload : {};
    initGoogleAds();
    if (name === "purchase" && Number.isFinite(e.value) && e.value >= 0) {
      window.gtag("event", "conversion", {
        send_to: "AW-16693027016/cbn0CKrD57IdEMjB7Zc-",
        value: e.value,
        currency: e.currency,
        transaction_id: e.transaction_id
      });
    }
    window.dataLayer.push({ecommerce:null});
    window.dataLayer.push({event:name, ecommerce:e});
    if (typeof window.oaiq !== "function" || name === "purchase" || name === "remove_from_cart") return;
    var names = {page_view:"page_viewed", view_item:"contents_viewed", add_to_cart:"items_added", begin_checkout:"checkout_started"};
    var mapped = names[name];
    if (!mapped) return;
    var contents = (Array.isArray(e.items) ? e.items : []).map(function(i) {
      var v = {id:i.item_id, name:i.item_name, content_type:"product", quantity:i.quantity || 1};
      if (Number.isFinite(i.price)) v.amount = Math.round(i.price * 100);
      return v;
    });
    var body = {type:"contents"};
    if (contents.length) body.contents = contents;
    if (Number.isFinite(e.value) && e.value >= 0) { body.amount = Math.round(e.value * 100); body.currency = "USD"; }
    window.oaiq("measure", mapped, body);
  }
  window.NLSEcommerce = Object.freeze({
    track:send,
    pageView:function(){send("page_view",{});},
    viewItem:function(item){var i=cleanItem(item);if(i)send("view_item",{currency:"USD",items:[i]});},
    addToCart:function(item,value){var i=cleanItem(item);if(i)send("add_to_cart",{currency:"USD",value:Number(value)||0,items:[i]});},
    removeFromCart:function(item,value){var i=cleanItem(item);if(i)send("remove_from_cart",{currency:"USD",value:Number(value)||0,items:[i]});},
    beginCheckout:function(items,value){send("begin_checkout",{currency:"USD",value:Number(value)||0,items:(items||[]).map(cleanItem).filter(Boolean)});},
    purchase:function(transactionId,items,value){
      if(!consented() || typeof transactionId!=="string" || !/^cs_live_[A-Za-z0-9_]+$/.test(transactionId)) return;
      var key="nls-analytics-purchase-"+transactionId;
      try { if(localStorage.getItem(key))return; }catch(_){}
      send("purchase",{transaction_id:transactionId,currency:"USD",value:Number(value)||0,items:(items||[]).map(cleanItem).filter(Boolean)});
      try{localStorage.setItem(key,"1");}catch(_){}
    }
  });
  function trackPage() {
    window.NLSEcommerce.pageView();
    var data=document.querySelector('script[type="application/ld+json"]');
    if (!data) return;
    try {
      var p=JSON.parse(data.textContent);
      if (p["@type"]!=="Product")return;
      var item={item_id:String(p.sku||""),item_name:String(p.name||document.title)};
      var price=Number(p.offers && p.offers.price);
      if(Number.isFinite(price))item.price=price;
      window.NLSEcommerce.viewItem(item);
    } catch(_){}
  }
  function consentBanner() {
    var existing;try{existing=localStorage.getItem(CONSENT_KEY);}catch(_){return;}
    if(existing==="yes" || existing==="no")return;
    var b=document.createElement("section");
    b.setAttribute("aria-label","Shopping analytics choice");
    b.style.cssText="position:fixed;bottom:12px;left:12px;right:12px;z-index:2147483000;max-width:550px;margin:auto;background:#112c40;color:white;border-radius:12px;padding:14px 16px;font:14px/1.5 Arial,sans-serif;box-shadow:0 5px 25px #0005";
    var p=document.createElement("p");p.textContent="NLS uses optional analytics and advertising measurement to understand product views, cart activity, and purchases, including through Google Ads and OpenAI Ads. No card details are included.";p.style.margin="0 0 10px";
    var buttons=document.createElement("div");buttons.style.cssText="display:flex;gap:10px";
    function button(text,yes){
      var el=document.createElement("button");el.type="button";el.textContent=text;
      el.style.cssText="border:1px solid #fff9;border-radius:7px;padding:7px 14px;cursor:pointer;background:"+(yes?"#fff":"transparent")+";color:"+(yes?"#112c40":"#fff")+";font-weight:bold";
      el.onclick=function(){try{localStorage.setItem(CONSENT_KEY,yes?"yes":"no");}catch(_){}b.remove();if(yes){if(typeof window.nlsInitAdsPixel==="function")window.nlsInitAdsPixel();trackPage();}};
      return el;
    }
    buttons.append(button("Allow analytics",true),button("No thanks",false));
    b.append(p,buttons);document.body.append(b);
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",function(){trackPage();consentBanner();});
  else {trackPage();consentBanner();}
})();
