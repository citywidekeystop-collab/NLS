(function(){
  'use strict';
  const {styles,sizes,keyings,price,sku}=window.NLSBundles;
  const $=id=>document.getElementById(id);
  const money=cents=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(cents/100);
  const storageKey='nls-bundle-selections-v1';
  let rows=[],storageOK=true,busy=false;
  function element(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;}
  function resolve(row){
    const style=styles.find(s=>s.id===row.style);const size=(style?.sizes||sizes).find(s=>s.id===row.size);const keying=(style?.keyings||keyings).find(k=>k.id===row.keying);
    if(!style||!size||!keying||!Number.isInteger(row.quantity)||row.quantity<1||row.quantity>25)return null;
    const variant=style.variants.find(v=>v.id===row.finish);
    if(!variant)return null;
    const cents=Number.isInteger(variant.basePriceCents)?price(variant,size):null;
    return {style,size,keying,variant,cents,sku:sku(style,variant,size,keying)};
  }
  try{rows=JSON.parse(localStorage.getItem(storageKey)||'[]');if(!Array.isArray(rows))rows=[];rows=rows.filter(resolve).slice(0,50);}catch{rows=[];storageOK=false;}
  function invalidateReview(){$('checkoutError').textContent='';}
  function save(){try{localStorage.setItem(storageKey,JSON.stringify(rows));}catch{storageOK=false;}invalidateReview();renderSelections();}
  function field(label,options){const wrap=element('label',label,'field');const select=element('select');select.setAttribute('aria-label',label);for(const option of options){const o=element('option',option.label||option.finish);o.value=option.id;select.append(o);}wrap.append(select);return {wrap,select};}
  function card(style){
    const article=element('article',undefined,'bundle-card');
    const photo=element('div',undefined,'product-photo');const image=element('img');image.loading='lazy';image.decoding='async';photo.append(image);
    const secondary=element('img');secondary.loading='lazy';secondary.hidden=true;photo.append(secondary);
    const fallback=element('div','Matching product photo being confirmed.','no-photo');fallback.hidden=true;photo.append(fallback);
    const photoNote=element('p',undefined,'photo-note');article.append(photo,photoNote);
    const content=element('div',undefined,'card-content');content.append(element('span',style.brand,'manufacturer'),element('h3',style.style),element('p',style.description,'description'));
    const variants=style.variants;
    const finishField=field('Finish',variants);const sizeField=field('Bundle size',style.sizes||sizes);sizeField.select.value=style.group==='keypad'?'1k1d':'2k2d';const keyField=field(style.group==='keypad'?'Backup keys':'Keying',style.keyings||keyings);
    content.append(finishField.wrap,sizeField.wrap,keyField.wrap);
    const block=element('div',undefined,'price-block');const amount=element('strong',undefined,'bundle-price');const note=element('small',undefined,'price-status');const button=element('button',undefined,'primary');button.type='button';block.append(amount,note,button);content.append(block);article.append(content);
    function selection(){return {style:style.id,finish:finishField.select.value,size:sizeField.select.value,keying:keyField.select.value,quantity:1};}
    function update(){
      const selected=resolve(selection());const {variant,size,cents}=selected;
      image.hidden=!variant.image;fallback.hidden=Boolean(variant.image);if(variant.image){image.src=variant.image;image.alt=style.brand+' '+style.style+' — '+variant.finish;}
      secondary.hidden=!variant.secondaryImage;photo.classList.toggle('paired-photo',Boolean(variant.secondaryImage));if(variant.secondaryImage){secondary.src=variant.secondaryImage;secondary.alt=style.style+' — non-locking passage handle';}
      photoNote.textContent=style.group==='keypad'?'Component photos. Includes: '+size.label+'.':'Photo shows the source pack. Your selection includes '+size.knobs+' complete knob'+(size.knobs===1?'':'s')+' + '+size.deadbolts+' complete deadbolt'+(size.deadbolts===1?'':'s')+'.';
      amount.textContent=money(cents);
      note.textContent='Hardware + selected keying. Shipping and any applicable tax shown at checkout.';
      button.textContent='ORDER THIS BUNDLE';
    }
    image.onerror=()=>{image.hidden=true;fallback.hidden=false;fallback.textContent='Product photo unavailable. Your selected style and finish are listed below.';};
    [finishField.select,sizeField.select,keyField.select].forEach(s=>s.addEventListener('change',update));
    button.onclick=()=>{const row=selection();const existing=rows.find(r=>r.style===row.style&&r.finish===row.finish&&r.size===row.size&&r.keying===row.keying);if(existing)existing.quantity=Math.min(25,existing.quantity+1);else if(rows.length<50)rows.push(row);save();$('announcement').textContent=style.brand+' '+style.style+' bundle added to your selections.';openSelections();};
    update();return article;
  }
  function renderGrid(){const value=$('brandFilter').value;const grid=$('bundleGrid');grid.replaceChildren();styles.filter(s=>s.group!=='keypad'&&(value==='all'||s.brand===value)).forEach(s=>grid.append(card(s)));const keypad=$('keypadGrid');keypad.replaceChildren();styles.filter(s=>s.group==='keypad').forEach(s=>keypad.append(card(s)));}
  function renderSelections(){
    $('selectionCount').textContent=rows.reduce((n,r)=>n+r.quantity,0);$('storageNotice').hidden=storageOK;const target=$('selectionRows');target.replaceChildren();let subtotal=0,quotes=0;
    rows.forEach((row,index)=>{const {style,variant,size,keying,cents}=resolve(row);const line=element('div',undefined,'selection-row');const text=element('div');text.append(element('h3',style.brand+' '+style.style+' — '+variant.finish),element('p',size.label),element('p',keying.label));
      const label=element('label','Bundle quantity');const input=element('input');input.type='number';input.min='1';input.max='25';input.step='1';input.value=row.quantity;input.setAttribute('aria-label','Quantity of '+style.brand+' '+style.style+' bundles');input.onchange=()=>{const n=Number(input.value);if(!Number.isInteger(n)||n<1||n>25){input.value=row.quantity;return;}row.quantity=n;save();};label.append(input);const remove=element('button','Remove','remove');remove.type='button';remove.onclick=()=>{rows.splice(index,1);save();};text.append(label,remove);line.append(text,element('strong',cents===null?'Quote required':money(cents*row.quantity)));target.append(line);if(cents===null)quotes+=row.quantity;else subtotal+=cents*row.quantity;
    });
    if(!rows.length)target.append(element('p','Choose a bundle to begin your request.'));
    $('selectionTotals').textContent=quotes?('Priced selections: '+money(subtotal)+' + '+quotes+' bundle'+(quotes===1?'':'s')+' awaiting a quote. Final total pending.'):'Merchandise subtotal: '+money(subtotal);
    $('payBundles').disabled=rows.length===0||busy;
  }
  function openSelections(){renderSelections();if(!$('selectionDialog').open)$('selectionDialog').showModal();}
  $('openSelection').onclick=openSelections;$('closeSelection').onclick=()=>$('selectionDialog').close();
  for(const brand of [...new Set(styles.map(s=>s.brand))]){const option=element('option',brand);option.value=brand;$('brandFilter').append(option);}
  $('brandFilter').onchange=renderGrid;
  $('payBundles').onclick=async()=>{
    if(!rows.length||busy)return;busy=true;renderSelections();$('checkoutError').textContent='Connecting to secure checkout…';
    try{
      const health=await fetch('https://els-stripe-backend.onrender.com/health',{cache:'no-store',signal:AbortSignal.timeout(70000)});const state=await health.json();
      if(!health.ok||!state.stripeConfigured||!state.bundleCatalogReady)throw Error('Bundle checkout is temporarily unavailable. Your selections are saved; please try again shortly.');
      const items=rows.map(row=>({sku:resolve(row).sku,quantity:row.quantity}));
      const response=await fetch('https://els-stripe-backend.onrender.com/create-checkout-session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({items,returnPath:'/lock-bundles.html'}),signal:AbortSignal.timeout(70000)});const data=await response.json();
      if(!response.ok||!data.url)throw Error(data.error||'Checkout could not be opened.');const url=new URL(data.url);if(url.protocol!=='https:'||url.hostname!=='checkout.stripe.com')throw Error('Secure checkout URL could not be verified.');
      try{sessionStorage.setItem('nls-bundle-payment',JSON.stringify({id:data.sessionId,rows}));}catch{}
      location.assign(url.href);
    }catch(error){$('checkoutError').textContent=error.message;}finally{busy=false;renderSelections();}
  };
  renderGrid();renderSelections();
  async function paymentReturn(){
    const params=new URLSearchParams(location.search);if(params.get('checkout')!=='success')return;const id=params.get('session_id');if(!/^cs_live_[A-Za-z0-9_]+$/.test(id||''))return;
    try{const r=await fetch('https://els-stripe-backend.onrender.com/checkout-status?session_id='+encodeURIComponent(id),{signal:AbortSignal.timeout(70000)});const data=await r.json();if(!r.ok||data.status!=='complete'||data.payment_status!=='paid'||data.livemode!==true)return;
      let pending;try{pending=JSON.parse(sessionStorage.getItem('nls-bundle-payment')||'null');}catch{}
      if(pending?.id===id){rows=[];save();try{sessionStorage.removeItem('nls-bundle-payment');}catch{}}
      try{if(typeof window.nlsTrackConfirmedOrder==='function')window.nlsTrackConfirmedOrder(id,data);}catch{}
      document.querySelector('main').prepend(element('p','Payment confirmed. Thank you for your order! Your Stripe confirmation includes your purchase details.','warranty'));
    }catch{document.querySelector('main').prepend(element('p','Your payment confirmation is still loading. Please check your Stripe receipt before placing another order.','warranty'));}
  }
  paymentReturn();
})();
