/* The advertising pixel starts only after the visitor allows optional analytics. */
(function(){
  var key="nls-shopping-analytics-consent-v1";
  window.nlsAnalyticsConsentGranted=function(){try{return localStorage.getItem(key)==="yes";}catch(_){return false;}};
  window.nlsInitAdsPixel=function(){
    if(!window.nlsAnalyticsConsentGranted()||window.nlsPixelInitialized)return;
    window.nlsPixelInitialized=true;
    (function(w,d,s,u){
      if(w.oaiq)return;
      var q=function(){q.q.push(arguments)};q.q=[];w.oaiq=q;
      var j=d.createElement(s);j.async=true;j.src=u;
      d.head.appendChild(j);
    })(window,document,"script","https://bzrcdn.openai.com/sdk/oaiq.min.js");
    window.oaiq("init",{pixelId:"7zRTA7E54AgswVzQscPZ6S",debug:false});
  };
  window.nlsInitAdsPixel();
})();

// Called only with the response from the server's Stripe session verification.
window.nlsTrackConfirmedOrder = function (sessionId, checkout) {
  if (!/^cs_live_[A-Za-z0-9_]+$/.test(sessionId) ||
      checkout.status !== "complete" || checkout.payment_status !== "paid" ||
      checkout.livemode !== true || !Number.isSafeInteger(checkout.amount_total) ||
      checkout.amount_total < 0 || !/^[a-z]{3}$/i.test(checkout.currency || "") ||
      (typeof window.nlsAnalyticsConsentGranted !== "function" || !window.nlsAnalyticsConsentGranted()) || typeof window.oaiq !== "function") return false;
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

/* Load NLS's consent-aware analytics module on storefront, catalog and detail pages. */
(function () {
  if (document.querySelector('script[data-nls-ecommerce]')) return;
  var script=document.createElement('script');
  script.src='/nls-ecommerce-events.js';
  script.async=true;
  script.dataset.nlsEcommerce='1';
  document.head.appendChild(script);
})();

/* First-party storefront integration. This leaves Stripe checkout and cart logic untouched. */
(function(){
  "use strict";
  function product(sku,quantity){
    var p=null;
    try { if(typeof products!=="undefined" && Array.isArray(products))p=products.find(function(x){return x.sku===sku;}); }catch(_){}
    if(!p && Array.isArray(window.NLSExpandedProducts))p=window.NLSExpandedProducts.find(function(x){return x.sku===sku;});
    if(p)return {item_id:sku,item_name:p.name||sku,price:Number(p.price)||0,quantity:quantity};
    var b=window.NLSBundles;
    if(b && typeof sku==="string" && sku.startsWith("NLS-BDL-")){
      for(var style of b.styles)for(var variant of style.variants)for(var size of style.sizes||b.sizes)for(var keying of style.keyings||b.keyings){
        if(b.sku(style,variant,size,keying)===sku){
          return {item_id:sku,item_name:style.brand+" "+style.style+" "+variant.finish+" "+size.label,price:Math.round(b.price(variant,size))/100,quantity:quantity};
        }
      }
    }
    return {item_id:String(sku||"").slice(0,90),item_name:String(sku||"").slice(0,90),quantity:quantity};
  }
  function fromSelection(row){
    var b=window.NLSBundles;if(!b)return null;
    var s=b.styles.find(function(x){return x.id===row.style;});if(!s)return null;
    var v=s.variants.find(function(x){return x.id===row.finish;});
    var z=(s.sizes||b.sizes).find(function(x){return x.id===row.size;});
    var k=(s.keyings||b.keyings).find(function(x){return x.id===row.keying;});
    if(!v||!z||!k)return null;
    return product(b.sku(s,v,z,k),row.quantity);
  }
  function snapshots(rows,key){
    var m=new Map();
    for(var row of Array.isArray(rows)?rows:[]){
      if(!row||!Number.isInteger(row.quantity))continue;
      var item=key==="nls-cart-v1"?product(row.sku,row.quantity):fromSelection(row);
      if(item&&item.item_id)m.set(item.item_id,item);
    }
    return m;
  }
  var originalSet=Storage.prototype.setItem;
  Storage.prototype.setItem=function(key,value){
    var watched=key==="nls-cart-v1"||key==="nls-bundle-selections-v1";
    var prev=null;
    if(watched)try{prev=JSON.parse(this.getItem(key)||"[]");}catch(_){}
    var out=originalSet.apply(this,arguments);
    if(watched&&prev&&window.NLSEcommerce)try{
      var before=snapshots(prev,key),after=snapshots(JSON.parse(value),key);
      var ids=new Set([...before.keys(),...after.keys()]);
      for(var id of ids){
        var a=before.get(id),b=after.get(id),diff=(b?b.quantity:0)-(a?a.quantity:0);
        var item=b||a;if(!item||!diff)continue;
        item={...item,quantity:Math.abs(diff)};
        var valueD=Number(item.price||0)*Math.abs(diff);
        if(diff>0)window.NLSEcommerce.addToCart(item,valueD);
        else window.NLSEcommerce.removeFromCart(item,valueD);
      }
    }catch(_){}
    return out;
  };
  var modal=window.showProductDetails;
  try{
    Object.defineProperty(window,"showProductDetails",{
      configurable:true,enumerable:true,
      get:function(){return modal;},
      set:function(fn){
        if(typeof fn!=="function"){modal=fn;return;}
        modal=function(sku){
          var ret=fn.apply(this,arguments);
          if(window.NLSEcommerce)window.NLSEcommerce.viewItem(product(sku,1));
          return ret;
        };
      }
    });
  }catch(_){}
  var nativeFetch=window.fetch;
  window.fetch=async function(input,options){
    var response=await nativeFetch.apply(this,arguments);
    var url=typeof input==="string"?input:(input&&input.url)||"";
    if(!response.ok || typeof url!=="string" || !url.includes("els-stripe-backend.onrender.com/"))return response;
    try{
      if(url.includes("/create-checkout-session") && window.NLSEcommerce){
        var created=await response.clone().json();
        if(created.sessionId && /^https:\/\/checkout\.stripe\.com\//.test(created.url||"")){
          var request=JSON.parse(options&&options.body||"{}");
          var items=(request.items||[]).map(function(r){return product(r.sku,r.quantity);});
          var value=items.reduce(function(n,i){return n+(Number(i.price)||0)*(Number(i.quantity)||0);},0);
          window.NLSEcommerce.beginCheckout(items,value);
        }
      }
      if(url.includes("/checkout-status") && window.NLSEcommerce){
        var status=await response.clone().json();
        var id=new URL(url,location.href).searchParams.get("session_id");
        if(status.status==="complete"&&status.payment_status==="paid"&&status.livemode===true&&/^cs_live_[A-Za-z0-9_]+$/.test(id||"")){
          var raw=sessionStorage.getItem("nls-pending-checkout")||sessionStorage.getItem("nls-bundle-payment")||"null";
          var pending=JSON.parse(raw);
          if(pending&&pending.id===id){
            var items=(pending.items||[]).map(function(r){return product(r.sku,r.quantity);});
            if(!items.length)items=(pending.rows||[]).map(fromSelection).filter(Boolean);
            window.NLSEcommerce.purchase(id,items,Number(status.amount_total)/100);
          }
        }
      }
    }catch(_){}
    return response;
  };
})();

(function(){
  var s=document.createElement("script");s.src="/nls-question-widget.js";s.async=true;
  document.head.appendChild(s);
})();

// Shared storefront installation options, separate from analytics events.
(function(){
 var script=document.createElement('script');script.src='/nls-installation-options.js';script.async=true;document.head.appendChild(script);
})();
