// lib/billing.ts
import { db } from "@/db";

export type Plan = "free" | "pro" | "business";

const FREE_CREDITS_PER_MONTH = 5;

type UserRow = {
  id: string;
  email: string;
  name: string | null;
  plan: Plan;
  credits_used: number;
  credits_limit: number; // ✅ AJOUT : pour éviter l’erreur "no such column: credits_limit"
  period_start: number;

  // ✅ colonnes Stripe (optionnelles)
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  cancel_at_period_end?: number | null;
  cancel_at?: number | null;
  current_period_end?: number | null;
};

async function columnExists(table: string, column: string) {
  const res = await db.execute({
    sql: `PRAGMA table_info(${table});`,
    args: [],
  });

  // @ts-ignore
  const rows = (res?.rows ?? []) as Array<{ name?: string }>;
  return rows.some((r) => String(r?.name ?? "").toLowerCase() === column.toLowerCase());
}

async function addColumnIfMissing(table: string, column: string, ddl: string) {
  const exists = await columnExists(table, column);
  if (exists) return;

  await db.execute({
    sql: `ALTER TABLE ${table} ADD COLUMN ${ddl};`,
    args: [],
  });
}

export async function ensureUsersTable() {
  // ✅ TABLE "canon" (avec credits_limit + colonnes Stripe)
  await db.execute({
    sql: `
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        name TEXT,
        plan TEXT NOT NULL DEFAULT 'free',
        credits_used INTEGER NOT NULL DEFAULT 0,

        -- ✅ AJOUT : certaines routes/queries utilisent credits_limit
        -- Sans ça : SQLITE_INPUT_ERROR no such column: credits_limit
        credits_limit INTEGER NOT NULL DEFAULT ${FREE_CREDITS_PER_MONTH},

        period_start INTEGER NOT NULL,

        -- ✅ Stripe
        stripe_customer_id TEXT,
        stripe_subscription_id TEXT,
        cancel_at_period_end INTEGER NOT NULL DEFAULT 0,
        cancel_at INTEGER,
        current_period_end INTEGER
      );
    `,
    args: [],
  });

  // ✅ MIGRATION SAFE (si la table existait déjà sans les colonnes)
  await addColumnIfMissing(
    "users",
    "credits_limit",
    `credits_limit INTEGER NOT NULL DEFAULT ${FREE_CREDITS_PER_MONTH}`
  );

  await addColumnIfMissing("users", "stripe_customer_id", `stripe_customer_id TEXT`);
  await addColumnIfMissing("users", "stripe_subscription_id", `stripe_subscription_id TEXT`);
  await addColumnIfMissing(
    "users",
    "cancel_at_period_end",
    `cancel_at_period_end INTEGER NOT NULL DEFAULT 0`
  );
  await addColumnIfMissing("users", "cancel_at", `cancel_at INTEGER`);
  await addColumnIfMissing("users", "current_period_end", `current_period_end INTEGER`);
}

function startOfCurrentPeriod() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
}

export async function getOrCreateUser(email: string, name?: string | null) {
  const id = email.toLowerCase();
  const currentPeriod = startOfCurrentPeriod();

  const res = await db.execute({
    sql: `SELECT id, email, name, plan, credits_used, credits_limit, period_start
          FROM users WHERE id = ? LIMIT 1`,
    args: [id],
  });

  // @ts-ignore
  const row = res?.rows?.[0] as UserRow | undefined;

  if (!row) {
    await db.execute({
      sql: `INSERT INTO users (id, email, name, plan, credits_used, credits_limit, period_start)
            VALUES (?, ?, ?, 'free', 0, ?, ?)`,
      args: [id, email, name ?? null, FREE_CREDITS_PER_MONTH, currentPeriod],
    });

    return {
      id,
      email,
      name: name ?? null,
      plan: "free" as Plan,
      credits_used: 0,
      credits_limit: FREE_CREDITS_PER_MONTH,
      period_start: currentPeriod,
    };
  }

  // reset mensuel
  if (Number(row.period_start) !== currentPeriod) {
    await db.execute({
      sql: `UPDATE users
            SET credits_used = 0,
                credits_limit = COALESCE(credits_limit, ?),
                period_start = ?
            WHERE id = ?`,
      args: [FREE_CREDITS_PER_MONTH, currentPeriod, id],
    });

    return {
      ...row,
      credits_used: 0,
      credits_limit: Number(row.credits_limit ?? FREE_CREDITS_PER_MONTH),
      period_start: currentPeriod,
    };
  }

  // sécurité si credits_limit null (anciens rows)
  if (row.credits_limit == null) {
    await db.execute({
      sql: `UPDATE users SET credits_limit = ? WHERE id = ?`,
      args: [FREE_CREDITS_PER_MONTH, id],
    });
    row.credits_limit = FREE_CREDITS_PER_MONTH;
  }

  return row;
}

export function canUseCredit(user: UserRow) {
  const plan = String(user.plan || "free").toLowerCase();
  const used = Number(user.credits_used || 0);

  if (plan === "pro" || plan === "business") return { allowed: true as const };

  const limit = Number(user.credits_limit ?? FREE_CREDITS_PER_MONTH);

  if (used >= limit) {
    return {
      allowed: false as const,
      reason: "LIMIT_REACHED" as const,
      limit,
    };
  }

  return { allowed: true as const };
}

export async function consumeCredit(user: UserRow) {
  const used = Number(user.credits_used || 0);

  await db.execute({
    sql: `UPDATE users SET credits_used = ? WHERE id = ?`,
    args: [used + 1, user.id],
  });
}
