import express from "express";
import cors from "cors";
import Stripe from "stripe";

const app = express();
const PORT = process.env.PORT || 10000;
const SITE_URL = "https://nationallocksupply.com";

const stripe = process.env.STRIPE_SECRET_KEY
? new Stripe(process.env.STRIPE_SECRET_KEY)
: null;

app.use(cors({ origin: SITE_URL }));
app.use(express.json({ limit: "32kb" }));

app.get("/", (req, res) => {
res.json({
status: "ok",
service: "National Lock Supply Stripe Backend"
});
});

app.get("/health", (req, res) => {
res.json({
status: "ok",
stripeConfigured: Boolean(stripe)
});
});

// Map each NLS product SKU to its verified Stripe Price ID.
// Configure STRIPE_PRICE_MAP_JSON in Render.
// Example: {"005":"price_123456789"}
function getCatalog() {
const map = JSON.parse(
process.env.STRIPE_PRICE_MAP_JSON || "{}"
);

if (!map || Array.isArray(map) ||
typeof map !== "object") {
throw new Error("Invalid catalog");
}

return map;
}

app.post("/create-checkout-session", async (req, res) => {
try {
if (!stripe) {
return res.status(503).json({
error: "Stripe is not configured"
});
}

const items = req.body?.items;
const catalog = getCatalog();

if (!Array.isArray(items) ||
items.length === 0 ||
items.length > 50) {
return res.status(400).json({
error: "Invalid cart"
});
}

const quantities = new Map();

for (const item of items) {
const sku = String(item?.sku ?? item?.id ?? "");
const quantity = Number(item?.quantity);

if (!Object.prototype.hasOwnProperty.call(
catalog, sku
)) {
return res.status(400).json({
error: "Product unavailable",
sku
});
}

if (!Number.isSafeInteger(quantity) ||
quantity < 1 || quantity > 25) {
return res.status(400).json({
error: "Invalid quantity"
});
}

const total =
(quantities.get(sku) || 0) + quantity;

if (total > 25) {
return res.status(400).json({
error: "Quantity limit exceeded"
});
}

quantities.set(sku, total);
}

const line_items = [];

for (const [sku, quantity] of quantities) {
const price = catalog[sku];

if (typeof price !== "string" ||
!/^price_[A-Za-z0-9]+$/.test(price)) {
return res.status(503).json({
error: "Price not configured"
});
}

line_items.push({ price, quantity });
}

const options = {
mode: "payment",
line_items,
success_url:
SITE_URL +
"/?checkout=success&session_id={CHECKOUT_SESSION_ID}",
cancel_url: SITE_URL + "/?checkout=cancel",
billing_address_collection: "required",
shipping_address_collection: {
allowed_countries: ["US"]
},
phone_number_collection: {
enabled: true
}
};

if (process.env.STRIPE_AUTOMATIC_TAX === "true") {
options.automatic_tax = { enabled: true };
}

if (process.env.STRIPE_SHIPPING_RATE_ID) {
options.shipping_options = [{
shipping_rate:
process.env.STRIPE_SHIPPING_RATE_ID
}];
}

const session =
await stripe.checkout.sessions.create(options);

return res.json({
url: session.url,
sessionId: session.id
});

} catch (error) {
console.error("Checkout error:", error.message);

return res.status(500).json({
error: "Unable to start checkout"
});
}
});

app.get("/checkout-status", async (req, res) => {
try {
if (!stripe) {
return res.status(503).json({
error: "Stripe not configured"
});
}

const id = String(req.query.session_id || "");

if (!/^cs_(test_)?[A-Za-z0-9]+$/.test(id)) {
return res.status(400).json({
error: "Invalid session"
});
}

const session =
await stripe.checkout.sessions.retrieve(id);

return res.json({
status: session.status,
payment_status: session.payment_status
});

} catch {
return res.status(404).json({
error: "Session not found"
});
}
});

app.listen(PORT, "0.0.0.0", () => {
console.log("NLS backend running on port " + PORT);
});
