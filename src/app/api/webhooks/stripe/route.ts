import { normalizeStripeDispute, verifyStripeSignature } from "@/lib/stripe-webhook";

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return Response.json({ error: "Webhook endpoint is not configured" }, { status: 503 });
  }

  // The signature covers the exact bytes Stripe sent, so read the raw text.
  const rawBody = await request.text();
  if (!verifyStripeSignature(rawBody, request.headers.get("stripe-signature"), secret)) {
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const dispute = normalizeStripeDispute(event);
  if (!dispute) {
    // Acknowledge unrelated events so Stripe does not retry them.
    return Response.json({ received: true, handled: false });
  }

  // TODO: persist the dispute and enqueue the evidence-collection job. The MVP
  // has no datastore, so the normalized dispute is only echoed back.
  return Response.json({ received: true, handled: true, dispute });
}
