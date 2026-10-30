import express from "express";
import cors from "cors";
import Stripe from "stripe";
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

app.listen(PORT, "0.0.0.0", () => {
console.log(
"NLS Stripe backend running on " + PORT
);
});
