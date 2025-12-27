import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { dbGet } from "@/db/helpers";

type UserRow = { id: string; plan: string };

export async function requireUserEmail() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase();
  if (!email) throw new Error("UNAUTHORIZED");
  return email;
}

export async function requirePro() {
  const email = await requireUserEmail();

  const user = await dbGet<UserRow>(
    "SELECT id, plan FROM users WHERE id = ?",
    [email]
  );

  if (!user) throw new Error("USER_NOT_FOUND");
  if (user.plan !== "pro") throw new Error("PRO_REQUIRED");

  return { email, user };
}
