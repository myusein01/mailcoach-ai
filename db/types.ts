// db/types.ts
export type UserRow = {
  email: string;
  name: string | null;
  plan: "free" | "pro";
  credits_used: number;
  credits_limit: number;
  stripe_customer_id: string | null;
  period_start: number;
};
