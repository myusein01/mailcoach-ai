// app/api/stripe/webhook/route.ts
import Stripe from "stripe";
import { NextResponse } from "next/server";
import { dbExec, dbGet } from "@/db/helpers";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

type UserEmailRow = { email: string | null };

async function ensureUserExists(email: string) {
  await dbExec(
    `
    INSERT OR IGNORE INTO users (id, email, name, plan, credits_used, period_start)
    VALUES (?, ?, NULL, 'free', 0, (CAST(strftime('%s','now') AS INTEGER) * 1000))
    `,
    [email, email]
  );

  await dbExec(
    `UPDATE users SET id = COALESCE(id, ?) WHERE lower(email) = ?`,
    [email, email]
  );
}

async function getEmailByCustomerId(customerId: string) {
  const row = await dbGet<UserEmailRow>(
    `SELECT email FROM users WHERE stripe_customer_id = ? ORDER BY period_start DESC LIMIT 1`,
    [customerId]
  );
  if (row?.email) return row.email.toLowerCase();

  const cust = await stripe.customers.retrieve(customerId);
  if ((cust as any)?.deleted) return null;

  const email = (cust as any)?.email ?? null;
  return typeof email === "string" ? email.toLowerCase() : null;
}

async function upsertFromSubscription(sub: any) {
  const customerId = typeof sub.customer === "string" ? sub.customer : null;
  if (!customerId) return;

  const email = await getEmailByCustomerId(customerId);
  if (!email) return;

  await ensureUserExists(email);

  const status = String(sub.status ?? "").toLowerCase();
  const isPro = status === "active" || status === "trialing" || status === "past_due";

  const periodStartMs =
    typeof sub.current_period_start === "number" ? sub.current_period_start * 1000 : null;

  const currentPeriodEndMs =
    typeof sub.current_period_end === "number" ? sub.current_period_end * 1000 : null;

  const cancelAtPeriodEndInt = sub.cancel_at_period_end === true ? 1 : 0;

  const cancelAtMs = typeof sub.cancel_at === "number" ? sub.cancel_at * 1000 : null;

  const finalCancelAtMs =
    cancelAtMs ?? (cancelAtPeriodEndInt === 1 ? currentPeriodEndMs : null);

  await dbExec(
    `
    UPDATE users
    SET
      plan = ?,
      stripe_customer_id = ?,
      stripe_subscription_id = ?,
      period_start = COALESCE(?, period_start),
      cancel_at_period_end = ?,
      cancel_at = ?,
      current_period_end = ?
    WHERE lower(email) = ? OR lower(id) = ?
    `,
    [
      isPro ? "pro" : "free",
      customerId,
      sub.id ?? null,
      periodStartMs,
      cancelAtPeriodEndInt,
      finalCancelAtMs,
      currentPeriodEndMs,
      email,
      email,
    ]
  );
}

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  const whsec = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !whsec) {
    return NextResponse.json(
      { error: "Missing webhook secret or signature" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    const body = await req.text();
    event = stripe.webhooks.constructEvent(body, sig, whsec);
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err?.message || err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as any;

        // ✅ copie name/adresse saisis sur Checkout -> Customer Stripe
        const customerId = typeof session.customer === "string" ? session.customer : null;
        if (customerId && session.customer_details) {
          const cd = session.customer_details;

          await stripe.customers.update(customerId, {
            name: cd.name ?? undefined,
            address: cd.address ?? undefined,
          });
        }

        const subId =
          typeof session.subscription === "string" ? session.subscription : null;
        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId);
          await upsertFromSubscription(sub);
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as any;
        await upsertFromSubscription(sub);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as any;
        const customerId = typeof sub.customer === "string" ? sub.customer : null;
        if (!customerId) break;

        const email = await getEmailByCustomerId(customerId);
        if (!email) break;

        await dbExec(
          `
          UPDATE users
          SET plan = 'free',
              stripe_subscription_id = NULL,
              cancel_at_period_end = 0,
              cancel_at = NULL,
              current_period_end = NULL
          WHERE lower(email) = ? OR lower(id) = ?
          `,
          [email, email]
        );
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (e: any) {
    console.error("Webhook handler error:", e?.message || e);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
