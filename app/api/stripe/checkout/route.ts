// app/api/stripe/checkout/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { stripe } from "@/lib/stripe";
import { dbGet, dbExec } from "@/db/helpers";

type CheckoutBody = {
  duration: "monthly" | "6months" | "yearly";
};

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email?.toLowerCase();

    if (!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { duration } = (await req.json().catch(() => ({}))) as CheckoutBody;

    let priceId: string | undefined;

    switch (duration) {
      case "monthly":
        priceId = process.env.STRIPE_PRICE_PRO_MONTHLY;
        break;
      case "6months":
        priceId = process.env.STRIPE_PRICE_PRO_6MONTHS;
        break;
      case "yearly":
        priceId = process.env.STRIPE_PRICE_PRO_YEARLY;
        break;
      default:
        return NextResponse.json(
          { error: "Invalid plan duration" },
          { status: 400 }
        );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;

    if (!priceId) {
      return NextResponse.json(
        { error: "Missing Stripe price for duration" },
        { status: 500 }
      );
    }

    if (!appUrl) {
      return NextResponse.json(
        { error: "Missing NEXT_PUBLIC_APP_URL" },
        { status: 500 }
      );
    }

    const existing = await dbGet<{ stripe_customer_id: string | null }>(
      `
      SELECT stripe_customer_id
      FROM users
      WHERE lower(email) = ? OR lower(id) = ?
      ORDER BY period_start DESC
      LIMIT 1
      `,
      [email, email]
    );

    let customerId = existing?.stripe_customer_id ?? null;

    if (!customerId) {
      const customer = await stripe.customers.create({ email });
      customerId = customer.id;

      await dbExec(
        `UPDATE users SET stripe_customer_id = ? WHERE lower(email) = ? OR lower(id) = ?`,
        [customerId, email, email]
      );
    }

    const checkout = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/billing`,
      allow_promotion_codes: true,
      client_reference_id: email,
      metadata: {
        email,
        plan: "pro",
        duration,
      },
    });

    return NextResponse.json({ url: checkout.url });
  } catch (err) {
    console.error("Stripe checkout failed:", err);
    return NextResponse.json(
      { error: "Stripe checkout failed" },
      { status: 500 }
    );
  }
}
