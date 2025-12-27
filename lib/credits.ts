// lib/credits.ts
import { dbGet, dbExec } from "@/db/helpers";
import type { UserRow } from "@/db/types";

export async function assertCredits(email: string) {
  const user = await dbGet<UserRow>(
    "SELECT * FROM users WHERE email = ?",
    [email.toLowerCase()]
  );

  if (!user) throw new Error("USER_NOT_FOUND");

  if (user.plan === "pro") return;

  if (user.credits_used >= user.credits_limit) {
    throw new Error("NO_CREDITS_LEFT");
  }

  await dbExec(
    "UPDATE users SET credits_used = credits_used + 1 WHERE email = ?",
    [email.toLowerCase()]
  );
}
