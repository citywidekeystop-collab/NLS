/* National Locks Supply: privacy-conscious storefront activity hooks.
 * Sends only SKU, quantity, displayed price and anonymous page path to dataLayer.
 * GA4/GTM collection remains inactive until a consent-aware destination is configured.
 */
(function () {
  'use strict';
  if (window.__NLSStorefrontActivityInstalled) return;
  window.__NLSStorefrontActivityInstalled = true;

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({event:'nls_page_visit',page_path:location.pathname,page_title:document.title});
  if (!window.NLSEcommerce && !document.querySelector('script[src="/nls-ecommerce-events.js"]')) {
    const events=document.createElement('script');
    events.src='/nls-ecommerce-events.js';
    document.head.appendChild(events);
  }

  const cartKey='nls-cart-v1';
  const safeCart=()=>{
    try{
      const rows=JSON.parse(localStorage.getItem(cartKey)||'[]');
      return Array.isArray(rows)?rows.filter(r=>r&&typeof r.sku==='string'&&Number.isInteger(r.quantity)&&r.quantity>0&&r.quantity<=25):[];
    }catch(_){return[];}
  };
  const catalogItem=(sku,quantity)=>{
    let product=null;
    try { if(typeof products!=='undefined'&&Array.isArray(products))product=products.find(p=>p.sku===sku); }catch(_){}
    const item={item_id:sku,quantity};
    if(product){
      item.item_name=product.name;
      if(Number.isFinite(product.price))item.price=product.price;
    }
    return item;
  };
  const fire=(kind,sku,qty)=>{
    if(!window.NLSEcommerce||qty<=0)return;
    const item=catalogItem(sku,qty);
    const value=Number.isFinite(item.price)?Math.round(item.price*qty*100)/100:undefined;
    try {window.NLSEcommerce[kind]?.(item,value);}catch(_){}
  };
  const reportDiff=(before,after)=>{
    const a=new Map(before.map(r=>[r.sku,r.quantity]));
    const b=new Map(after.map(r=>[r.sku,r.quantity]));
    for(const sku of new Set([...a.keys(),...b.keys()])){
      const delta=(b.get(sku)||0)-(a.get(sku)||0);
      if(delta>0)fire('addToCart',sku,delta);
      if(delta<0)fire('removeFromCart',sku,-delta);
    }
  };
  const afterAction=()=>{const before=safeCart();queueMicrotask(()=>reportDiff(before,safeCart()));};

  function enableHomepageCartTracking(){
    if(!document.getElementById('cartDialog'))return;
    if(typeof window.addToCart==='function'&&!window.addToCart.__nlsTracked){
      const original=window.addToCart;
      const instrumented=function(){const before=safeCart();const result=original.apply(this,arguments);reportDiff(before,safeCart());return result;};
      instrumented.__nlsTracked=true;
      window.addToCart=instrumented;
    }
    if(typeof window.showProductDetails==='function'&&!window.showProductDetails.__nlsTracked){
      const original=window.showProductDetails;
      const instrumented=function(sku){
        const result=original.apply(this,arguments);
        try{window.NLSEcommerce?.viewItem(catalogItem(sku,1));}catch(_){}
        return result;
      };
      instrumented.__nlsTracked=true;
      window.showProductDetails=instrumented;
    }
    document.addEventListener('click',e=>{
      if(e.target.closest('.cart-remove'))afterAction();
      if(e.target.closest('#payNow')){
        const rows=safeCart();
        if(!rows.length)return;
        const items=rows.map(r=>catalogItem(r.sku,r.quantity));
        const value=items.reduce((sum,item)=>sum+(item.price||0)*item.quantity,0);
        try{window.NLSEcommerce?.beginCheckout(items,Math.round(value*100)/100);}catch(_){}
      }
    },true);
    document.addEventListener('change',e=>{
      if(e.target.matches('#cartItems input[type="number"]'))afterAction();
    },true);
  }

  function installQuestionWidget(){
    if(document.getElementById('nlsQuestionsButton'))return;
    const css=document.createElement('style');
    css.textContent='#nlsQuestionsButton{position:fixed;right:18px;bottom:86px;z-index:9000;border:0;border-radius:999px;background:#0d406f;color:#fff;padding:13px 19px;font:700 15px system-ui;box-shadow:0 6px 20px #0004;cursor:pointer}#nlsQuestionsDialog{border:1px solid #cad7e4;border-radius:16px;padding:0;width:min(420px,calc(100vw - 28px));max-height:90vh;box-shadow:0 20px 65px #0005;color:#213547;background:#fff}#nlsQuestionsDialog::backdrop{background:#11182790}#nlsQuestionsDialog form{display:grid;gap:11px;padding:22px}#nlsQuestionsDialog label{display:grid;gap:5px;font:600 14px system-ui}#nlsQuestionsDialog input,#nlsQuestionsDialog textarea{width:100%;box-sizing:border-box;border:1px solid #b8c9d8;border-radius:8px;padding:10px;font:15px system-ui}#nlsQuestionsDialog button{padding:11px 14px;border:0;border-radius:8px;cursor:pointer;font:700 14px system-ui}#nlsQuestionsDialog .nlsQuestionSend{background:#0d406f;color:#fff}#nlsQuestionsDialog .nlsQuestionClose{background:#e9eef3;color:#173551}';
    document.head.appendChild(css);
    const launcher=document.createElement('button');launcher.id='nlsQuestionsButton';launcher.type='button';launcher.textContent='Questions? Message NLS';launcher.setAttribute('aria-haspopup','dialog');
    const dialog=document.createElement('dialog');dialog.id='nlsQuestionsDialog';dialog.setAttribute('aria-label','Message National Locks Supply');
    const form=document.createElement('form');form.method='POST';form.action='https://formsubmit.co/citywidekeystop@gmail.com';
    function hidden(name,value){const input=document.createElement('input');input.type='hidden';input.name=name;input.value=value;return input;}
    form.append(hidden('_subject','NLS: New customer product question'),hidden('_template','table'),hidden('_next','https://nationallockssupply.com/'),hidden('_honey',''));
    const header=document.createElement('strong');header.textContent='Ask National Locks Supply';header.style.font='700 20px system-ui';form.appendChild(header);
    const description=document.createElement('p');description.textContent='Ask about a lock, compatibility, delivery or installation. We will reply by email. This is not a live chat.';description.style.margin='0';form.appendChild(description);
    function field(title,name,type,required){const label=document.createElement('label');label.textContent=title;const input=document.createElement(type==='textarea'?'textarea':'input');if(type!=='textarea')input.type=type;else input.rows=4;input.name=name;input.required=required;input.maxLength=name==='message'?2000:160;label.appendChild(input);return label;}
    form.append(field('Name','name','text',true),field('Email','email','email',true),field('Question','message','textarea',true));
    const notice=document.createElement('small');notice.textContent='Please do not include credit card numbers, passwords or access codes.';form.appendChild(notice);
    const actions=document.createElement('div');actions.style.cssText='display:flex;gap:8px;flex-wrap:wrap';
    const send=document.createElement('button');send.className='nlsQuestionSend';send.type='submit';send.textContent='Send question';
    const close=document.createElement('button');close.className='nlsQuestionClose';close.type='button';close.textContent='Close';close.onclick=()=>dialog.close();
    actions.append(send,close);form.appendChild(actions);dialog.appendChild(form);
    launcher.onclick=()=>{if(!dialog.open)dialog.showModal();};
    document.body.append(dialog,launcher);
  }

  function init(){
    enableHomepageCartTracking();
    installQuestionWidget();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();