// app/api/me/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { dbGet } from "@/db/helpers";
import type { UserRow } from "@/db/types";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const user = await dbGet<UserRow>(
    "SELECT * FROM users WHERE email = ?",
    [session.user.email.toLowerCase()]
  );

  return NextResponse.json(user);
}
