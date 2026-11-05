(function(){
 'use strict';
 const note='Compatible, pre-drilled doors. Extra cutting or door modifications quoted separately. Service availability and appointment confirmed before work.';
 function rate(product){
  const text=[product.name,product.category,product.type].filter(Boolean).join(' ');
  const pair=Boolean(product.secondaryImage)||/handleset|handle[ -]?set|combo|bundle|deadbolt.*(?:knob|handle|lever)|(?:knob|handle|lever).*deadbolt/i.test(text);
  return {price:pair?99:65,label:pair?'Top deadbolt + bottom handle or knob (2 installs)':'One lock (1 install)',unit:pair?'per door set':'per lock'};
 }
 window.NLSInstallationRate=rate;
 function save(product,quote){
  const request={product:product.name,sku:product.sku||'',price:quote.price,scope:quote.label,unit:quote.unit};
  try{sessionStorage.setItem('nls-installation-request',JSON.stringify(request));}catch(_){}
  return request;
 }
 function fill(){
  let request;try{request=JSON.parse(sessionStorage.getItem('nls-installation-request')||'null');}catch(_){}
  const form=document.getElementById('installationForm');if(!request||!form)return;
  const notes=form.elements.notes;
  const text='Installation request: '+request.product+(request.sku?' (SKU: '+request.sku+')':'')+' — $'+request.price+' '+request.unit+'. '+request.scope+'.';
  if(notes&&!notes.value.includes(text))notes.value=(notes.value?notes.value+'\n':'')+text;
  const type=form.elements.lockType;if(type)type.value=/smart|keypad/i.test(request.product)?'Keypad / smart lock':'Other — describe below';
  const supply=form.elements.lockSupply;if(supply)supply.value='I bought / will buy from NLS';
 }
 function option(product){
  const quote=rate(product);const box=document.createElement('div');box.className='nls-install-option';
  const label=document.createElement('label');const checkbox=document.createElement('input');checkbox.type='checkbox';
  label.append(checkbox,document.createTextNode(' Optional installation: $'+quote.price+' '+quote.unit));
  const scope=document.createElement('small');scope.textContent=quote.label+'. '+note+' Installation is arranged separately; hardware checkout does not include this service.';
  const action=document.createElement('button');action.type='button';action.textContent='ARRANGE INSTALLATION';action.hidden=true;
  checkbox.addEventListener('change',()=>{action.hidden=!checkbox.checked;if(checkbox.checked)save(product,quote);});
  action.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();save(product,quote);const dialog=box.closest('dialog');if(dialog?.open)dialog.close();if(typeof window.openInstallationForm==='function'){fill();window.openInstallationForm();}else location.href='/#lock-installation';});
  box.addEventListener('click',event=>event.stopPropagation());box.append(label,scope,action);return box;
 }
 function install(){
  const style=document.createElement('style');style.textContent='.nls-install-option{margin:12px 0;padding:12px;border:1px solid #cbd8e2;border-radius:8px;background:#f2f7fb;color:#173249;font:14px/1.5 Arial,sans-serif}.nls-install-option label{display:flex;align-items:center;gap:7px;font-weight:700}.nls-install-option input{width:18px;height:18px;margin:0;flex-shrink:0}.nls-install-option small{display:block;margin:5px 0;color:#465968}.nls-install-option button{margin-top:6px;padding:10px 12px;font-size:12px;background:#123a55;color:#fff;border:0;border-radius:5px;cursor:pointer}.nls-install-option button[hidden]{display:none}';document.head.append(style);
  const offer=document.querySelector('.installation-offer');if(offer)offer.textContent='$65 for one lock • $99 for a top deadbolt + bottom handle or knob (2 installs).';
  const banner=document.querySelector('#installation strong');if(banner)banner.textContent='$65 PER LOCK • $99 PER DEADBOLT + BOTTOM HANDLE OR KNOB SET';
  function refresh(){
   document.querySelectorAll('[data-product-sku]').forEach(card=>{if(card.querySelector('.nls-install-option'))return;const sku=decodeURIComponent(card.dataset.productSku);let p;try{p=products.find(x=>x.sku===sku);}catch(_){}if(!p)return;const container=card.querySelector('.product-info')||card;container.append(option(p));});
   document.querySelectorAll('.nls-exp-card,.nls-listing').forEach(card=>{if(card.querySelector('.nls-install-option'))return;const title=card.querySelector('h2');if(title)(card.querySelector('.nls-exp-info')||card).append(option({name:title.textContent,category:card.querySelectorAll('.nls-exp-photo img').length>1?'bundle':''}));});
   document.querySelectorAll('.bundle-card').forEach(card=>{
    const title=card.querySelector('h3');if(!title)return;
    const selection=[...card.querySelectorAll('select')].map(x=>x.selectedOptions[0]?.textContent||'').join(' · ');
    const name=title.textContent+' bundle — '+selection;
    const old=card.querySelector('.nls-install-option');if(old?.dataset.name===name)return;if(old)old.remove();
    const box=option({name,category:'bundle'});box.dataset.name=name;(card.querySelector('.card-content')||card).append(box);
   });
   const dialog=document.getElementById('productDialog');if(dialog){const title=dialog.querySelector('#productDetailTitle');const old=dialog.querySelector('.nls-install-option');if(title?.textContent&&old?.dataset.name!==title.textContent){if(old)old.remove();const box=option({name:title.textContent});box.dataset.name=title.textContent;dialog.querySelector('#productDetailService').before(box);}}
  }
  for(const script of document.querySelectorAll('script[type="application/ld+json"]')){try{const p=JSON.parse(script.textContent);if(p['@type']!=='Product')continue;const form=document.querySelector('main form[action="/"]');if(form)form.before(option(p));}catch(_){}}
  refresh();fill();window.addEventListener('hashchange',fill);document.addEventListener('change',event=>{if(event.target.closest('.bundle-card'))refresh();});
  let queued=false;new MutationObserver(()=>{if(queued)return;queued=true;queueMicrotask(()=>{queued=false;refresh();});}).observe(document.body,{childList:true,subtree:true});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
