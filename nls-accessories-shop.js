(function(){
 'use strict';
 const families=window.NLSAccessoryFamilies||[];
 const grid=document.getElementById('accessoryGrid');if(!grid)return;
 const money=value=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(value);
 document.getElementById('accessoryCount').textContent=families.length+' styles · '+families.reduce((sum,f)=>sum+f.products.length,0)+' color and pack options';
 function node(tag,text){const x=document.createElement(tag);if(text)x.textContent=text;return x;}
 for(const family of families){
  const card=node('article');card.className='accessory-card';const image=node('img');image.loading='lazy';image.decoding='async';
  const title=node('h3',family.name),label=node('label','Choose color / pack'),select=node('select');select.setAttribute('aria-label','Choose color / pack for '+family.name);
  for(const p of family.products){const opt=node('option',p.variant+(p.packQuantity>1?' · '+p.packQuantity+'-pack':'')+' · '+money(p.price));opt.value=p.sku;select.append(opt);}label.append(select);
  const price=node('strong'),pack=node('p'),details=node('a','VIEW DETAILS'),add=node('a','ADD TO CART');add.className='nls-exp-add';const delivery=node('small','Special order · Estimated delivery 12–23 business days');
  function update(){const p=family.products.find(x=>x.sku===select.value);image.src=p.image;image.alt=p.name;price.textContent=money(p.price);pack.textContent=p.packQuantity>1?'Includes '+p.packQuantity+' matching pieces.':'Includes one piece.';details.href='/'+p.sku.toLowerCase()+'.html';add.href='/?product='+encodeURIComponent(p.sku)+'&quantity=1&add=1';}
  select.addEventListener('change',update);card.append(image,title,label,price,pack,delivery,node('br'),details,node('br'),add);grid.append(card);update();
 }
})();
