// app/api/user-profile/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { dbGet, dbExec } from "@/db/helpers";

type UserProfileRow = {
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  address: string | null;
  company: string | null;
  title: string | null;
  website: string | null;
  updated_at: number;
};

async function ensureUserProfilesTable() {
  await dbExec(
    `
    CREATE TABLE IF NOT EXISTS user_profiles (
      email TEXT PRIMARY KEY,
      first_name TEXT,
      last_name TEXT,
      phone TEXT,
      address TEXT,
      company TEXT,
      title TEXT,
      website TEXT,
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
    );
    `,
    []
  );
}

function cleanStr(v: any) {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s.length ? s : null;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase();

  if (!email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  await ensureUserProfilesTable();

  const profile = await dbGet<UserProfileRow>(
    `SELECT * FROM user_profiles WHERE lower(email) = ? LIMIT 1`,
    [email]
  );

  // ✅ "firstTime" = pas de ligne en DB
  return NextResponse.json({
    email,
    profile: profile ?? null,
    firstTime: profile ? false : true,
  });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase();

  if (!email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  await ensureUserProfilesTable();

  const body = await req.json().catch(() => ({}));

  const first_name = cleanStr(body.first_name);
  const last_name = cleanStr(body.last_name);
  const phone = cleanStr(body.phone);
  const address = cleanStr(body.address);
  const company = cleanStr(body.company);
  const title = cleanStr(body.title);
  const website = cleanStr(body.website);

  await dbExec(
    `
    INSERT INTO user_profiles (email, first_name, last_name, phone, address, company, title, website, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, (CAST(strftime('%s','now') AS INTEGER) * 1000))
    ON CONFLICT(email) DO UPDATE SET
      first_name = excluded.first_name,
      last_name = excluded.last_name,
      phone = excluded.phone,
      address = excluded.address,
      company = excluded.company,
      title = excluded.title,
      website = excluded.website,
      updated_at = (CAST(strftime('%s','now') AS INTEGER) * 1000)
    `,
    [email, first_name, last_name, phone, address, company, title, website]
  );

  return NextResponse.json({ ok: true });
}
