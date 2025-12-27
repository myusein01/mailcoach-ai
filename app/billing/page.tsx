// app/billing/page.tsx
import { Suspense } from "react";
import BillingClient from "./BillingClient";

export default function BillingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center p-6">
          <div className="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
            <h1 className="text-2xl font-bold mb-2">Abonnement</h1>
            <p className="text-slate-300">Chargement…</p>
          </div>
        </div>
      }
    >
      <BillingClient />
    </Suspense>
  );
}
