/* NLS on-page question form. This is asynchronous email, not live operator chat. */
(function(){
  "use strict";
  function init(){
    if(document.getElementById("nls-question-launcher"))return;
    var wrap=document.createElement("div");wrap.id="nls-question-widget";
    wrap.style.cssText="font-family:Arial,sans-serif;position:fixed;bottom:16px;right:16px;z-index:2147482800";
    var button=document.createElement("button");button.id="nls-question-launcher";button.type="button";
    button.textContent="Questions? Message NLS";
    button.setAttribute("aria-controls","nls-question-panel");button.setAttribute("aria-expanded","false");
    button.style.cssText="background:#123d55;color:white;border:0;border-radius:99px;padding:14px 18px;box-shadow:0 4px 18px #0004;font-size:14px;font-weight:bold;cursor:pointer";
    var panel=document.createElement("section");panel.id="nls-question-panel";panel.hidden=true;panel.setAttribute("aria-label","Message National Locks Supply");
    panel.style.cssText="box-sizing:border-box;width:min(360px,calc(100vw - 32px));max-height:calc(100vh - 98px);overflow-y:auto;background:white;color:#183342;border:1px solid #c9d5dc;box-shadow:0 6px 35px #0005;border-radius:14px;padding:18px;margin:0 0 12px auto";
    panel.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center;gap:12px"><strong style="font-size:19px">Ask National Locks Supply</strong><button type="button" id="nls-question-close" style="background:transparent;border:0;font-size:24px;cursor:pointer" aria-label="Close">×</button></div>'+
      '<p style="font-size:13px;line-height:1.5;margin:10px 0">Ask about a lock, compatibility, shipping, or installation. Your message goes to our team by email; this is not a live chat.</p>'+
      '<form method="POST" action="https://formsubmit.co/citywidekeystop@gmail.com" style="display:grid;gap:10px">'+
      '<input type="hidden" name="_subject" value="NLS Website Customer Question">'+
      '<input type="hidden" name="_template" value="table">'+
      '<input type="hidden" name="_next" value="https://nationallockssupply.com/#message-sent">'+
      '<input type="text" name="_honey" style="display:none" tabindex="-1" autocomplete="off">'+
      '<label style="font-size:13px">Your name<input name="name" required maxlength="100" autocomplete="name" style="box-sizing:border-box;width:100%;padding:9px;border:1px solid #bac9d1;border-radius:6px;display:block"></label>'+
      '<label style="font-size:13px">Email for reply<input type="email" name="email" required maxlength="180" autocomplete="email" style="box-sizing:border-box;width:100%;padding:9px;border:1px solid #bac9d1;border-radius:6px;display:block"></label>'+
      '<label style="font-size:13px">What can we help with?<textarea name="message" required maxlength="1200" rows="4" style="box-sizing:border-box;width:100%;padding:9px;border:1px solid #bac9d1;border-radius:6px;display:block;resize:vertical"></textarea></label>'+
      '<button type="submit" style="background:#123d55;color:#fff;padding:11px;border:0;border-radius:7px;font-weight:bold;cursor:pointer">Send question to NLS</button>'+
      '</form><p style="font-size:12px;margin:12px 0 0">Need immediate help? <a style="color:#0e5479;font-weight:bold" href="tel:+14435781686">Call 443-578-1686</a>.</p>';
    button.onclick=function(){panel.hidden=!panel.hidden;button.setAttribute("aria-expanded",String(!panel.hidden));if(!panel.hidden)panel.querySelector('[name="name"]').focus();};
    panel.querySelector("#nls-question-close").onclick=function(){panel.hidden=true;button.setAttribute("aria-expanded","false");button.focus();};
    panel.addEventListener("keydown",function(e){if(e.key==="Escape"){panel.hidden=true;button.setAttribute("aria-expanded","false");button.focus();}});
    wrap.append(panel,button);document.body.append(wrap);
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();