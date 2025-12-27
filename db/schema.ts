// @ts-nocheck
// db/schema.ts
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(), // géré par next-auth
  name: text("name"),
  email: text("email").unique(),
  emailVerified: integer("email_verified", { mode: "timestamp_ms" }),
  image: text("image"),
  plan: text("plan").default("FREE"), // FREE | PRO
  createdAt: integer("created_at", { mode: "timestamp_ms" }).default(
    sql`(strftime('%s', 'now') * 1000)`
  ),
});

export const emails = sqliteTable("emails", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(), // FK vers users.id
  mode: text("mode").notNull(), // generate | improve | reply
  type: text("type"),
  tone: text("tone"),
  language: text("language"),
  goal: text("goal"),
  context: text("context"),
  originalEmail: text("original_email"),
  result: text("result"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).default(
    sql`(strftime('%s', 'now') * 1000)`
  ),
});

import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(), // on va utiliser l'email comme id simple
  email: text("email").notNull(),
  name: text("name"),
  plan: text("plan").notNull().default("free"), // 'free' | 'pro' | 'business'
  creditsUsed: integer("credits_used").notNull().default(0),
  periodStart: integer("period_start", { mode: "number" }).notNull(), // timestamp ms
});
