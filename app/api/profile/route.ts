// app/api/profile/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { dbGet } from "@/db/helpers";

type ProfileRow = {
  plan: string;
  credits_used: number;
  period_start: number; // ms
  stripe_subscription_id?: string | null;
  cancel_at_period_end?: number | null;
};

type CountRow = { count: number };

export async function GET() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase();

  if (!email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // 1) infos user
  // ⚠️ adapte les noms si ton schéma diffère (credits_used / period_start etc)
  const user = await dbGet<ProfileRow>(
    `SELECT plan, credits_used, period_start, stripe_subscription_id, cancel_at_period_end
     FROM users
     WHERE email = ? OR id = ?`,
    [email, email]
  );

  if (!user) {
    return NextResponse.json({ error: "user_not_found" }, { status: 404 });
  }

  // 2) nombre total d'emails générés (table emails)
  const totalEmails = await dbGet<CountRow>(
    `SELECT COUNT(*) as count FROM emails WHERE user_id = ?`,
    [email]
  );

  // 3) période : on assume mensuel si tu utilises period_start en ms
  // (si tu veux mieux: récupère la date depuis Stripe via webhook et stocke period_end)
  const periodStart = user.period_start ?? null;
  const periodEnd =
    typeof periodStart === "number" ? periodStart + 30 * 24 * 60 * 60 * 1000 : null;

  return NextResponse.json({
    plan: user.plan,
    creditsUsed: user.credits_used ?? 0,
    totalEmails: totalEmails?.count ?? 0,
    periodStart,
    periodEnd,
    cancelAtPeriodEnd: user.cancel_at_period_end ?? 0,
  });
}
