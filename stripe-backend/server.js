import express from "express";
import cors from "cors";
import Stripe from "stripe";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const app = express();
const PORT = process.env.PORT || 10000;
const SITE_URL = (
process.env.SITE_URL ||
"https://nationallockssupply.com"
).replace(/\/$/, "");

const stripe = process.env.STRIPE_SECRET_KEY
? new Stripe(process.env.STRIPE_SECRET_KEY)
: null;

app.use(cors({ origin: SITE_URL }));
app.use(express.json({ limit: "32kb" }));

// Load verified product prices from the server.
// Expected nls-catalog.json format:
// {
// "005": {
// "name": "Defiant Entry Door Knob",
// "price": 33.00,
// "verified": true
// }
// }

function loadCatalog() {
const file = path.join(
process.cwd(),
"nls-catalog.json"
);

const data = JSON.parse(
fs.readFileSync(file, "utf8")
);

if (!data || Array.isArray(data) ||
typeof data !== "object") {
throw new Error("Invalid product catalog");
}

return data;
}

app.get("/", (req, res) => {
res.json({
service: "National Lock Supply",
status: "online"
});
});

app.get("/health", (req, res) => {
let catalogReady = false;
let bundleCatalogReady = false;

try {
const healthCatalog = loadCatalog();
catalogReady = true;
bundleCatalogReady = Object.entries(healthCatalog).filter(([sku, item]) => sku.startsWith("NLS-BDL-") && item.verified === true && item.bundleVersion === "nls-bundles-v1").length === 88;
} catch {
catalogReady = false;
}

res.json({
status: "ok",
stripeConfigured: Boolean(stripe),
catalogReady,
bundleCatalogReady
});
});

app.post(
"/create-checkout-session",
async (req, res) => {
try {
if (!stripe) {
return res.status(503).json({
error: "Stripe is not configured"
});
}

const catalog = loadCatalog();
const cart = req.body?.items;

if (!Array.isArray(cart) ||
cart.length < 1 ||
cart.length > 50) {
return res.status(400).json({
error: "Invalid shopping cart"
});
}

const quantities = new Map();

for (const item of cart) {
const sku = String(
item?.sku ?? item?.id ?? ""
);

const qty = Number(item?.quantity);

if (!Object.prototype.hasOwnProperty.call(
catalog, sku
)) {
return res.status(400).json({
error: "Product not found",
sku
});
}

if (!Number.isSafeInteger(qty) ||
qty < 1 || qty > 25) {
return res.status(400).json({
error: "Invalid quantity"
});
}

const total =
(quantities.get(sku) || 0) + qty;

if (total > 25) {
return res.status(400).json({
error: "Quantity limit exceeded"
});
}

quantities.set(sku, total);
}

const line_items = [];
let subtotalCents = 0;

for (const [sku, quantity] of quantities) {
const product = catalog[sku];

if (product?.verified !== true) {
return res.status(400).json({
error: "Price requires verification",
sku
});
}

const name = product.name;
const price = Number(product.price);

if (typeof name !== "string" ||
!name.trim() ||
!Number.isFinite(price) ||
price <= 0 ||
!Number.isSafeInteger(
Math.round(price * 100)
)) {
return res.status(503).json({
error: "Invalid catalog price",
sku
});
}

subtotalCents += Math.round(price * 100) * quantity;

line_items.push({
price_data: {
currency: "usd",
product_data: {
name: name.trim()
},
unit_amount: Math.round(
price * 100
)
},
quantity
});
}

// Only this explicit same-site return path can override the original storefront.
const checkoutPath = req.body?.returnPath === "/lock-bundles.html" ? "/lock-bundles.html" : "/";
const options = {
mode: "payment",
line_items,
billing_address_collection: "required",
shipping_address_collection: {
allowed_countries: ["US"]
},
phone_number_collection: {
enabled: true
},
success_url:
SITE_URL +
checkoutPath + "?checkout=success&session_id=" +
"{CHECKOUT_SESSION_ID}",
cancel_url:
SITE_URL + checkoutPath + "?checkout=cancel"
};

if (
process.env.STRIPE_AUTOMATIC_TAX
?.toLowerCase() === "true"
) {
options.automatic_tax = {
enabled: true
};
}

// Match the published NLS policy using server-verified merchandise prices.
options.shipping_options = [{
  shipping_rate_data: {
    type: "fixed_amount",
    fixed_amount: { amount: subtotalCents >= 10000 ? 0 : 900, currency: "usd" },
    display_name: "NLS Standard Shipping"
  }
}];
options.custom_text = {
  shipping_address: {
    message: "Standard shipping covers qualifying orders to the contiguous United States. Contact NLS before ordering oversized items or shipments to Alaska or Hawaii."
  }
};

const session =
await stripe.checkout.sessions.create(
options
);

return res.json({
url: session.url,
sessionId: session.id
});

} catch (error) {
console.error(
"NLS checkout error:",
error.message
);

return res.status(500).json({
error: "Checkout unavailable"
});
}
}
);

app.get("/checkout-status", async (req, res) => {
try {
if (!stripe) {
return res.status(503).json({
error: "Stripe unavailable"
});
}

const sessionId = String(
req.query.session_id || ""
);

if (!/^cs_(live|test)_[A-Za-z0-9]+$/.test(
sessionId
)) {
return res.status(400).json({
error: "Invalid checkout session"
});
}

const session =
await stripe.checkout.sessions.retrieve(
sessionId
);

return res.json({
status: session.status,
payment_status: session.payment_status,
livemode: session.livemode,
amount_total: session.amount_total,
currency: session.currency
});

} catch {
return res.status(404).json({
error: "Session not found"
});
}
});


// Citywide locksmith installation checkout. Separate from NLS merchandise,
// and accessible only from Citywide's server using a shared private token.
const KEYPAD_OFFER = "bowie-crofton-keypad-369";
const KEYPAD_AMOUNT = 36900;
function authorizedCitywide(req) {
  const secret=process.env.CITYWIDE_CHECKOUT_SHARED_TOKEN || "";
  const supplied=String(req.get("x-citywide-checkout-token")||"");
  if(!secret || !supplied || supplied.length!==secret.length)return false;
  return crypto.timingSafeEqual(Buffer.from(secret),Buffer.from(supplied));
}
app.get("/citywide/keypad-integration-ready",(req,res)=>{
  res.set("Cache-Control","no-store");
  if(!authorizedCitywide(req))return res.status(401).json({ready:false});
  return res.json({ready:Boolean(stripe),checkoutConfigured:Boolean(stripe),offer:KEYPAD_OFFER,amountCents:KEYPAD_AMOUNT,currency:"usd"});
});
app.post("/citywide/keypad-checkout",async(req,res)=>{
  res.set("Cache-Control","no-store");
  if(!authorizedCitywide(req))return res.status(401).json({error:"Unauthorized"});
  if(!stripe)return res.status(503).json({error:"Stripe account unavailable"});
  try {
    const b=req.body?.booking || {};
    const id=String(req.body?.bookingId||"");
    if(!/^[A-F0-9]{14}$/.test(id) || !["Bowie","Crofton","Annapolis"].includes(b.city) ||
       !b.name || !b.phone || !b.address) return res.status(400).json({error:"Invalid booking"});
    const meta=JSON.stringify({
      name:String(b.name).slice(0,90),phone:String(b.phone).slice(0,28),
      city:b.city,address:String(b.address).slice(0,200),
      finish:String(b.finish||"").slice(0,30),hardware:String(b.hardware||"").slice(0,40),
      date:String(b.date||"").slice(0,12),time:String(b.time||"").slice(0,35),
      paymentPreference:"online"
    });
    if(meta.length>490)return res.status(400).json({error:"Booking information too long"});
    const session=await stripe.checkout.sessions.create({
      mode:"payment",
      line_items:[{price_data:{currency:"usd",unit_amount:KEYPAD_AMOUNT,
        product_data:{
          name:"Citywide Wi-Fi Keypad Lock + Handle/Knob — Installation Included",
          description:"$369 complete standard installation package in Bowie, Crofton or Annapolis, MD. Dispatch confirms appointment."
        }},quantity:1}],
      phone_number_collection:{enabled:true},
      ...(b.email?{customer_email:String(b.email).slice(0,120)}:{}),
      client_reference_id:id,
      metadata:{offer:KEYPAD_OFFER,booking_id:id,booking:meta},
      success_url:"https://citywidelockandkey.com/bowie-crofton-keypad.html?payment=success&session_id={CHECKOUT_SESSION_ID}",
      cancel_url:"https://citywidelockandkey.com/bowie-crofton-keypad.html?payment=cancelled"
    });
    return res.json({url:session.url,sessionId:session.id});
  }catch(e){console.error("Citywide hosted Checkout failed",e.message);return res.status(503).json({error:"Payment checkout unavailable. Dispatch can help by phone."});}
});
app.get("/citywide/keypad-payment-status",async(req,res)=>{
  res.set("Cache-Control","no-store");
  if(!authorizedCitywide(req))return res.status(401).json({error:"Unauthorized"});
  const id=String(req.query.session_id||"");
  if(!/^cs_(live|test)_[A-Za-z0-9_]+$/.test(id) || !stripe)return res.status(400).json({paid:false});
  try{
    const s=await stripe.checkout.sessions.retrieve(id);
    return res.json({paid:s.payment_status==="paid" && s.amount_total===KEYPAD_AMOUNT && s.currency==="usd" && s.metadata?.offer===KEYPAD_OFFER && s.livemode===true});
  }catch(e){return res.status(404).json({paid:false});}
});
console.info("NLS_CITYWIDE_CHECKOUT_CONFIG",JSON.stringify({stripeConfigured:Boolean(stripe),sharedTokenConfigured:Boolean(process.env.CITYWIDE_CHECKOUT_SHARED_TOKEN)}));

app.listen(PORT, "0.0.0.0", () => {
console.log(
"NLS Stripe backend running on " + PORT
);
});
