// db/index.ts
import { createClient } from "@libsql/client";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL manquant");
}

export const db = createClient({
  url: process.env.DATABASE_URL,
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

// Création des tables si elles n'existent pas (appelée au démarrage)
export async function ensureSchema() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS emails (
      id TEXT PRIMARY KEY,
      mode TEXT NOT NULL,
      type TEXT,
      tone TEXT,
      language TEXT,
      goal TEXT,
      context TEXT,
      original_email TEXT,
      result TEXT,
      created_at INTEGER NOT NULL
    );
  `);
}
