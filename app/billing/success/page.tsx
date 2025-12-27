// app/billing/success/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function BillingSuccessPage() {
  const router = useRouter();
  const [status, setStatus] = useState("Activation de ton abonnement…");

  useEffect(() => {
    (async () => {
      try {
        // ✅ on force la sync juste après le paiement
        await fetch("/api/stripe/sync", { method: "POST" });

        // ✅ une fois sync OK → direction HOME (pas billing)
        setStatus("✅ Abonnement activé. Redirection…");

        setTimeout(() => {
          router.replace("/");
        }, 600);
      } catch (err) {
        console.error(err);
        setStatus("❌ Erreur lors de l’activation. Redirection…");
        setTimeout(() => {
          router.replace("/");
        }, 1200);
      }
    })();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-50 px-4">
      <div className="max-w-md w-full rounded-2xl border border-slate-800 bg-slate-900/70 p-6 text-center">
        <div className="text-lg font-semibold">{status}</div>
      </div>
    </div>
  );
}
