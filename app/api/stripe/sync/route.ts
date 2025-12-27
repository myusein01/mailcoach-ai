// app/api/stripe/sync/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { dbExec, dbGet } from "@/db/helpers";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-11-17.clover",
});

type DbUser = {
  email: string | null;
  stripe_customer_id: string | null;
};

async function ensureUserExists(email: string) {
  await dbExec(
    `
    INSERT OR IGNORE INTO users (id, email, name, plan, credits_used, period_start)
    VALUES (?, ?, NULL, 'free', 0, (CAST(strftime('%s','now') AS INTEGER) * 1000))
    `,
    [email, email]
  );

  await dbExec(`UPDATE users SET id = COALESCE(id, ?) WHERE lower(email) = ?`, [
    email,
    email,
  ]);
}

function isProStatus(s: string) {
  const status = (s ?? "").toLowerCase();
  return status === "active" || status === "trialing" || status === "past_due";
}

function pickBestSubscription(subs: Stripe.Subscription[]) {
  const preferred = subs.find((s) => isProStatus(String(s.status)));
  if (preferred) return preferred;

  // sinon on prend la plus récente (Stripe renvoie souvent trié, mais on sécurise)
  return (
    subs
      .slice()
      .sort((a, b) => Number((b as any).created ?? 0) - Number((a as any).created ?? 0))[0] ??
    null
  );
}

async function writeFree(email: string, customerId?: string | null) {
  await dbExec(
    `
    UPDATE users
    SET plan = 'free',
        stripe_customer_id = COALESCE(stripe_customer_id, ?),
        stripe_subscription_id = NULL,
        cancel_at_period_end = 0,
        cancel_at = NULL,
        current_period_end = NULL
    WHERE lower(email) = ? OR lower(id) = ?
    `,
    [customerId ?? null, email, email]
  );
}

export async function POST() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase();

  if (!email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  await ensureUserExists(email);

  const user = await dbGet<DbUser>(
    `
    SELECT email, stripe_customer_id
    FROM users
    WHERE lower(email) = ? OR lower(id) = ?
    ORDER BY period_start DESC
    LIMIT 1
    `,
    [email, email]
  );

  let customerId = user?.stripe_customer_id ?? null;

  // 1) retrouve / fixe le customerId si manquant
  if (!customerId) {
    const customers = await stripe.customers.list({ email, limit: 1 });
    customerId = customers.data?.[0]?.id ?? null;

    if (customerId) {
      await dbExec(
        `UPDATE users SET stripe_customer_id = COALESCE(stripe_customer_id, ?) WHERE lower(email) = ? OR lower(id) = ?`,
        [customerId, email, email]
      );
    }
  }

  if (!customerId) {
    await writeFree(email, null);
    return NextResponse.json({ ok: true, plan: "free", reason: "no_customer" });
  }

  // ✅ FIX PRINCIPAL :
  // On IGNORE complètement stripe_subscription_id stocké en DB.
  // Source de vérité = Stripe : on liste toutes les subs du customer et on choisit la meilleure.
  const subs = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 20,
  });

  const picked = pickBestSubscription(subs.data);

  if (!picked) {
    await writeFree(email, customerId);
    return NextResponse.json({
      ok: true,
      plan: "free",
      reason: "no_subscription",
    });
  }

  // retrieve pour avoir current_period_* / cancel_* fiables
  const sub = await stripe.subscriptions.retrieve(picked.id);
  const anySub = sub as any;

  const status = (anySub.status ?? "").toString().toLowerCase();
  const isPro = isProStatus(status);

  const periodStartMs =
    typeof anySub.current_period_start === "number"
      ? anySub.current_period_start * 1000
      : null;

  const currentPeriodEndMs =
    typeof anySub.current_period_end === "number"
      ? anySub.current_period_end * 1000
      : null;

  const cancelAtPeriodEndInt =
    typeof anySub.cancel_at_period_end === "boolean"
      ? anySub.cancel_at_period_end
        ? 1
        : 0
      : 0;

  const cancelAtMs =
    typeof anySub.cancel_at === "number" ? anySub.cancel_at * 1000 : null;

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
      anySub.id ?? null,
      periodStartMs,
      cancelAtPeriodEndInt,
      finalCancelAtMs,
      currentPeriodEndMs,
      email,
      email,
    ]
  );

  return NextResponse.json({
    ok: true,
    email,
    plan: isPro ? "pro" : "free",
    stripe_customer_id: customerId,
    stripe_subscription_id: anySub.id ?? null,
    status,
    cancel_at_period_end: cancelAtPeriodEndInt,
    cancel_at: finalCancelAtMs,
    current_period_end: currentPeriodEndMs,
  });
}
