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

  // ✅ Signature Luxury
  logo_url: string | null;
  accent_color: string | null;
  logo_height: number | null;
  signature_enabled: number | null;

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

      logo_url TEXT,
      accent_color TEXT,
      logo_height INTEGER,
      signature_enabled INTEGER NOT NULL DEFAULT 1,

      updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
    );
    `,
    []
  );

  // migrations safe si table existait déjà
  await dbExec(`ALTER TABLE user_profiles ADD COLUMN logo_url TEXT;`, []).catch(
    () => {}
  );
  await dbExec(
    `ALTER TABLE user_profiles ADD COLUMN accent_color TEXT;`,
    []
  ).catch(() => {});
  await dbExec(
    `ALTER TABLE user_profiles ADD COLUMN logo_height INTEGER;`,
    []
  ).catch(() => {});
  await dbExec(
    `ALTER TABLE user_profiles ADD COLUMN signature_enabled INTEGER NOT NULL DEFAULT 1;`,
    []
  ).catch(() => {});
}

function cleanStr(v: any) {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s.length ? s : null;
}

function cleanInt(v: any, fallback: number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.round(n);
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

  // ✅ Signature Luxury
  const logo_url = cleanStr(body.logo_url);
  const accent_color = cleanStr(body.accent_color);
  const logo_height = cleanInt(body.logo_height, 70);

  // ✅ toujours activé
  const signature_enabled = 1;

  await dbExec(
    `
    INSERT INTO user_profiles (
      email, first_name, last_name, phone, address, company, title, website,
      logo_url, accent_color, logo_height, signature_enabled,
      updated_at
    )
    VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      (CAST(strftime('%s','now') AS INTEGER) * 1000)
    )
    ON CONFLICT(email) DO UPDATE SET
      first_name = excluded.first_name,
      last_name = excluded.last_name,
      phone = excluded.phone,
      address = excluded.address,
      company = excluded.company,
      title = excluded.title,
      website = excluded.website,

      logo_url = excluded.logo_url,
      accent_color = excluded.accent_color,
      logo_height = excluded.logo_height,
      signature_enabled = excluded.signature_enabled,

      updated_at = (CAST(strftime('%s','now') AS INTEGER) * 1000)
    `,
    [
      email,
      first_name,
      last_name,
      phone,
      address,
      company,
      title,
      website,
      logo_url,
      accent_color,
      logo_height,
      signature_enabled,
    ]
  );

  return NextResponse.json({ ok: true });
}
