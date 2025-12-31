// app/api/signature/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { dbExec, dbGet } from "@/db/helpers";

type DbUserProfile = {
  email: string;

  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  address: string | null;
  company: string | null;
  title: string | null;
  website: string | null;

  logo_url: string | null;
  accent_color: string | null;
  logo_height: number | null;
  signature_enabled: number | null;
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

function clean(v: any) {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s.length ? s : null;
}

function cleanInt(v: any, fallback: number | null) {
  if (v === null || v === undefined) return fallback;
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

  const profile = await dbGet<DbUserProfile>(
    `SELECT
      email,
      first_name, last_name, phone, address, company, title, website,
      logo_url, accent_color, logo_height, signature_enabled
     FROM user_profiles
     WHERE lower(email) = ? LIMIT 1`,
    [email]
  );

  return NextResponse.json({
    email,
    profile: profile ?? null,
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase();

  if (!email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  await ensureUserProfilesTable();

  const body = await req.json().catch(() => ({}));

  const first_name = clean(body.first_name);
  const last_name = clean(body.last_name);
  const phone = clean(body.phone);
  const address = clean(body.address);
  const company = clean(body.company);
  const title = clean(body.title);
  const website = clean(body.website);

  const logo_url = clean(body.logo_url);
  const accent_color = clean(body.accent_color);
  const logo_height = cleanInt(body.logo_height, 70);
  const signature_enabled =
    body.signature_enabled === 0 || body.signature_enabled === false ? 0 : 1;

  // upsert simple
  await dbExec(
    `
    INSERT INTO user_profiles (
      email, first_name, last_name, phone, address, company, title, website,
      logo_url, accent_color, logo_height, signature_enabled, updated_at
    )
    VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, (strftime('%s','now') * 1000)
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
      updated_at = excluded.updated_at
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
