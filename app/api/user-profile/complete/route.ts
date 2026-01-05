import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { dbExec } from "@/db/helpers";

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

  await dbExec(`ALTER TABLE user_profiles ADD COLUMN logo_url TEXT;`, []).catch(() => {});
  await dbExec(`ALTER TABLE user_profiles ADD COLUMN accent_color TEXT;`, []).catch(() => {});
  await dbExec(`ALTER TABLE user_profiles ADD COLUMN logo_height INTEGER;`, []).catch(() => {});
  await dbExec(
    `ALTER TABLE user_profiles ADD COLUMN signature_enabled INTEGER NOT NULL DEFAULT 1;`,
    []
  ).catch(() => {});
}

export async function POST() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase();

  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  await ensureUserProfilesTable();

  // crée la ligne si elle n'existe pas (sans écraser si elle existe déjà)
  await dbExec(
    `
    INSERT INTO user_profiles (email, signature_enabled, updated_at)
    VALUES (?, 1, (CAST(strftime('%s','now') AS INTEGER) * 1000))
    ON CONFLICT(email) DO UPDATE SET
      updated_at = (CAST(strftime('%s','now') AS INTEGER) * 1000)
    `,
    [email]
  );

  return NextResponse.json({ ok: true });
}
