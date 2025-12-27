// db/helpers.ts
import { db } from "./index";

export async function dbGet<T>(sql: string, args: any[] = []) {
  const res = await db.execute({ sql, args });
  return (res.rows[0] as T) ?? null;
}

export async function dbExec(sql: string, args: any[] = []) {
  return db.execute({ sql, args });
}
