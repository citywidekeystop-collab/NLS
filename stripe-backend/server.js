import express from "express";
import cors from "cors";
import Stripe from "stripe";

const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const PORT = process.env.PORT || 10000;
const SITE_URL = "https://nationallocksupply.com";

app.use(cors({ origin: SITE_URL }));
app.use(express.json());

app.get("/", (req, res) => {
res.json({ status: "ok", service: "NLS Stripe Backend" });
});

app.get("/health", (req, res) => {
res.json({ status: "ok" });
});

// Checkout prices must be validated against a
// trusted server-side product catalog before launch.
app.post("/create-checkout-session", async (req, res) => {
res.status(503).json({
error: "Checkout pending verified product catalog integration"
});
});

app.listen(PORT, "0.0.0.0", () => {
console.log(`NLS backend running on port ${PORT}`);
});
