// app/api/me/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { dbGet } from "@/db/helpers";

type DbUser = {
  email?: string | null;
  plan?: string | null;
  credits_used?: number | null;
};

const FREE_LIMIT = 5;

export async function GET() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase();

  if (!email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // ✅ on prend la ligne la plus récente (si tu as eu des doublons)
  const user = await dbGet<DbUser>(
    `
    SELECT email, plan, credits_used
    FROM users
    WHERE lower(email) = ? OR lower(id) = ?
    ORDER BY period_start DESC
    LIMIT 1
    `,
    [email, email]
  );

  const plan = (user?.plan ?? "free").toString().toLowerCase() === "pro" ? "pro" : "free";
  const creditsUsed = Number(user?.credits_used ?? 0);

  const isPro = plan === "pro";

  return NextResponse.json({
    email,
    plan,

    // ✅ ce que ton Home veut afficher
    subscription_status: isPro ? "active" : null,
    emails_improved: creditsUsed,

    // ✅ limite affichée
    limit: isPro ? "illimitée" : FREE_LIMIT,
  });
}
