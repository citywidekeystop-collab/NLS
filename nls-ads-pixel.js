!function(w,d,s,u){if(w.oaiq)return;var q=function(){q.q.push(arguments)};q.q=[];w.oaiq=q;var j=d.createElement(s);j.async=1;j.src=u;var f=d.getElementsByTagName(s)[0];f.parentNode.insertBefore(j,f)}(window,document,"script","https://bzrcdn.openai.com/sdk/oaiq.min.js");oaiq("init",{pixelId:"7zRTA7E54AgswVzQscPZ6S",debug:true});

// Called only with the response from the server's Stripe session verification.
window.nlsTrackConfirmedOrder = function (sessionId, checkout) {
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
