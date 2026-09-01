/**
 * Razorpay Test Mode smoke test (creds-gated, NOT in CI).
 *
 * Creates a test-mode order and verifies the response shape.
 * Pattern: scripts/smoke-azure.mjs, scripts/smoke-brightdata.mjs.
 *
 * Usage: npm run smoke:razorpay
 * Requires: NEXT_PUBLIC_RAZORPAY_KEY_ID + RAZORPAY_KEY_SECRET in .env.local
 */

const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;

if (!keyId || !keySecret || keyId.startsWith("your-")) {
  console.error("❌ Set NEXT_PUBLIC_RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env.local");
  process.exit(1);
}

const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

async function main() {
  console.log("🔑 Using key:", keyId.slice(0, 12) + "...");
  console.log("📡 Creating test-mode order...");

  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify({
      amount: 149900, // ₹1,499 in paise
      currency: "INR",
      receipt: `smoke_${Date.now()}`,
      notes: { source: "mediaos-smoke-test" },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`❌ Razorpay API ${res.status}:`, text.slice(0, 500));
    process.exit(1);
  }

  const order = await res.json();

  // Assertions
  if (!order.id || !order.id.startsWith("order_")) {
    console.error("❌ Order ID doesn't start with 'order_':", order.id);
    process.exit(1);
  }

  if (order.amount !== 149900) {
    console.error("❌ Amount mismatch:", order.amount, "expected 149900");
    process.exit(1);
  }

  if (order.currency !== "INR") {
    console.error("❌ Currency mismatch:", order.currency, "expected INR");
    process.exit(1);
  }

  console.log("✅ Order created:", order.id);
  console.log("   Amount:", order.amount, "paise");
  console.log("   Currency:", order.currency);
  console.log("   Status:", order.status);
  console.log("   Receipt:", order.receipt);
  console.log("\n🎉 Razorpay smoke test passed.");
}

main().catch((err) => {
  console.error("❌ Smoke test failed:", err.message);
  process.exit(1);
});
