(function(){
 'use strict';
 function start(){
  const input=document.getElementById('search');if(!input||typeof window.searchProducts!=='function')return;
  const original=window.searchProducts;
  const script=document.createElement('script');script.src='/nls-accessory-keyword-index.js';script.async=true;
  script.onload=()=>{window.searchProducts=function(){
   const q=input.value.toLowerCase().trim().replace(/\s+/g,' ');const family=(window.NLSAccessoryKeywordIndex||{})[q];
   if(!family||(currentCategory!=='all'&&currentCategory!=='accessories'))return original();
   let matches=products.filter(p=>p.accessoryFamily===family);
   const colors=[...new Set(matches.map(p=>p.variant.toLowerCase()))].sort((a,b)=>b.length-a.length);
   const color=colors.find(color=>q.includes(color));if(color)matches=matches.filter(p=>p.variant.toLowerCase()===color);
   displayProducts(matches);
  };if(input.value)window.searchProducts();};document.head.append(script);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
