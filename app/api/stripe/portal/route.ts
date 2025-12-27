// app/api/stripe/portal/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { stripe } from "@/lib/stripe";
import { dbGet } from "@/db/helpers";

export async function POST() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase();

  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await dbGet<{ stripe_customer_id: string | null }>(
    `
    SELECT stripe_customer_id
    FROM users
    WHERE lower(email) = ? OR lower(id) = ?
    ORDER BY period_start DESC
    LIMIT 1
    `,
    [email, email]
  );

  if (!user?.stripe_customer_id) {
    return NextResponse.json(
      { error: "No Stripe customer id (missing stripe_customer_id in users)" },
      { status: 400 }
    );
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!baseUrl) {
    return NextResponse.json(
      { error: "Missing NEXT_PUBLIC_APP_URL" },
      { status: 500 }
    );
  }

  // ✅ Retour du Stripe Portal :
  // - on force sync=1 pour que ta Home lance /api/stripe/sync automatiquement (grâce au code déjà ajouté)
  // - et on renvoie vers HOME (/) au lieu de /billing
  const rawReturnUrl = process.env.STRIPE_PORTAL_RETURN_URL || `${baseUrl}/`;
  const url = new URL(rawReturnUrl);

  // si l'env pointe vers /billing, on ignore et on force /
  url.pathname = "/";

  // garantit que l’UI déclenche la sync en arrivant
  url.searchParams.set("sync", "1");

  const portal = await stripe.billingPortal.sessions.create({
    customer: user.stripe_customer_id,
    return_url: url.toString(),
  });

  return NextResponse.json({ url: portal.url });
}
