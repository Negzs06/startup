import { normalizeStripeEvent, verifyStripeSignature } from "@/lib/stripe/webhook";

const MAX_BODY_BYTES = 512 * 1024;

// Receives Stripe `charge.dispute.created` events. Verified and normalised
// disputes are returned but not persisted: there is no database yet, and the
// connector lookups that would build a full case file are not implemented.
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return Response.json({ error: "STRIPE_WEBHOOK_SECRET is not configured" }, { status: 503 });
  }

  // The signature covers the exact bytes Stripe sent, so read the raw text.
  const payload = await request.text();
  if (Buffer.byteLength(payload, "utf8") > MAX_BODY_BYTES) {
    return Response.json({ error: "Payload too large" }, { status: 413 });
  }

  const signature = verifyStripeSignature(payload, request.headers.get("stripe-signature"), secret);
  if (!signature.ok) {
    return Response.json({ error: "Invalid signature", reason: signature.reason }, { status: 400 });
  }

  let event: unknown;
  try {
    event = JSON.parse(payload);
  } catch {
    return Response.json({ error: "Body is not valid JSON" }, { status: 400 });
  }

  const result = normalizeStripeEvent(event);
  switch (result.kind) {
    case "ignored":
      return Response.json({ received: true, ignored: result.eventType });
    case "invalid":
      return Response.json({ error: result.error }, { status: 422 });
    case "dispute":
      return Response.json({ received: true, dispute: result.dispute, persisted: false }, { status: 202 });
  }
}
