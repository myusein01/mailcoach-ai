// db/index.ts
import { createClient } from "@libsql/client";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL manquant");
}

export const db = createClient({
  url: process.env.DATABASE_URL,
  authToken: process.env.DATABASE_AUTH_TOKEN,
});
