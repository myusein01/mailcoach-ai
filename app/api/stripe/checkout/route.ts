// app/api/stripe/checkout/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { stripe } from "@/lib/stripe";
import { dbGet, dbExec } from "@/db/helpers";

type PlanKey = "pro_1m" | "pro_6m" | "pro_12m";

type BillingInfo = {
  kind?: "personal" | "company";
  fullName?: string;
  companyName?: string;
  vat?: string;
  addressLine1?: string;
  city?: string;
  postalCode?: string;
  country?: string;
};

type CheckoutBody = {
  priceKey: PlanKey;
  billing?: BillingInfo | null;
};

function resolvePriceId(priceKey: PlanKey) {
  switch (priceKey) {
    case "pro_1m":
      return process.env.STRIPE_PRICE_PRO_MONTHLY;
    case "pro_6m":
      return process.env.STRIPE_PRICE_PRO_6MONTHS;
    case "pro_12m":
      return process.env.STRIPE_PRICE_PRO_YEARLY;
    default:
      return undefined;
  }
}

function safeStr(v: unknown) {
  return typeof v === "string" ? v.trim() : "";
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email?.toLowerCase();

    if (!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as Partial<CheckoutBody>;
    const priceKey = body.priceKey;

    if (!priceKey) {
      return NextResponse.json({ error: "Missing priceKey" }, { status: 400 });
    }

    const priceId = resolvePriceId(priceKey);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;

    if (!priceId) {
      return NextResponse.json(
        { error: "Missing Stripe price env for this plan" },
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

    // ✅ Billing infos (optionnel)
    const billing = body.billing ?? null;
    const kind = billing?.kind === "company" ? "company" : "personal";

    const fullName = safeStr(billing?.fullName);
    const companyName = safeStr(billing?.companyName);
    const vat = safeStr(billing?.vat);

    const addressLine1 = safeStr(billing?.addressLine1);
    const city = safeStr(billing?.city);
    const postalCode = safeStr(billing?.postalCode);
    const countryInput = safeStr(billing?.country).toUpperCase();

    // ✅ garde BE si tu veux un default, sinon mets "" et laisse Stripe demander sur Checkout
    const country = countryInput || "BE";

    // ✅ Validation minimale pour achat société (évite checkout “vide”)
    if (kind === "company" && !companyName) {
      return NextResponse.json(
        { error: "Missing companyName for company billing" },
        { status: 400 }
      );
    }
    if (!fullName) {
      // tu peux rendre obligatoire aussi, ou laisser Stripe le demander
      // ici je le rends obligatoire car tu veux une facture propre
      return NextResponse.json(
        { error: "Missing fullName" },
        { status: 400 }
      );
    }

    // ✅ Update Customer Stripe avec infos (utile pour invoices)
    const displayName = kind === "company" && companyName ? companyName : fullName;

    await stripe.customers.update(customerId, {
      name: displayName,
      address:
        addressLine1 || city || postalCode
          ? {
              line1: addressLine1 || undefined,
              city: city || undefined,
              postal_code: postalCode || undefined,
              country: country || undefined,
            }
          : undefined,
      metadata: {
        billing_kind: kind,
        billing_full_name: fullName,
        billing_company_name: companyName,
        billing_vat: vat,
      },
    });

    const meta = {
      email,
      priceKey,
      plan: "pro",
      billing_kind: kind,
      billing_full_name: fullName,
      billing_company_name: companyName,
      billing_vat: vat,
    };

    const checkout = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],

      // ✅ Collecte infos facture
      billing_address_collection: "required",
      customer_update: { name: "auto", address: "auto" },

      // ✅ TVA / Tax ID natif seulement si société
      tax_id_collection: { enabled: kind === "company" },

      success_url: `${appUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/pricing?canceled=1`,
      allow_promotion_codes: true,
      client_reference_id: email,

      metadata: meta,

      // ✅ Bonus: mets aussi la metadata sur la subscription (pratique pour debug)
      subscription_data: {
        metadata: meta,
      },
    });

    return NextResponse.json({ url: checkout.url });
  } catch (err) {
    console.error("Stripe checkout failed:", err);
    return NextResponse.json({ error: "Stripe checkout failed" }, { status: 500 });
  }
}
