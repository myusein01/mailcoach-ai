// app/billing/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function BillingPage() {
  const router = useRouter();
  const params = useSearchParams();

  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // ✅ AUTO-SYNC ROBUSTE :
  // 1) si retour Stripe avec /billing?sync=1 → on sync
  // 2) même si jamais le param n'est pas là (env STRIPE_PORTAL_RETURN_URL),
  //    on sync quand même grâce au flag sessionStorage mis avant d'ouvrir le portal
  useEffect(() => {
    const shouldSyncByQuery = params.get("sync") === "1";
    const shouldSyncByFlag =
      typeof window !== "undefined" &&
      window.sessionStorage.getItem("needs_stripe_sync") === "1";

    if (!shouldSyncByQuery && !shouldSyncByFlag) return;

    (async () => {
      setSyncing(true);
      try {
        await fetch("/api/stripe/sync", { method: "POST" });
      } finally {
        // ✅ on retire le flag pour éviter de resync à chaque refresh
        try {
          window.sessionStorage.removeItem("needs_stripe_sync");
        } catch {}
        setSyncing(false);

        // ✅ on nettoie l'URL (enlève ?sync=1)
        router.replace("/billing");
      }
    })();
  }, [params, router]);

  const goCheckout = async () => {
    setLoading(true);
    const res = await fetch("/api/stripe/checkout", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      alert(data?.error ?? "Stripe error");
      return;
    }
    window.location.href = data.url;
  };

  const openPortal = async () => {
    setLoading(true);

    // ✅ FIX: on pose un flag AVANT d'aller sur Stripe
    // comme ça, même si Stripe revient sans ?sync=1, on sync quand même
    try {
      window.sessionStorage.setItem("needs_stripe_sync", "1");
    } catch {}

    const res = await fetch("/api/stripe/portal", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      alert(data?.error ?? "Portal error");
      // si erreur, on retire le flag
      try {
        window.sessionStorage.removeItem("needs_stripe_sync");
      } catch {}
      return;
    }

    window.location.href = data.url;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <h1 className="text-2xl font-bold mb-2">Abonnement</h1>
        <p className="text-slate-300 mb-6">
          Gérez votre plan Pro et votre facturation.
        </p>

        {syncing ? (
          <div className="mb-4 rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-slate-200">
            Synchronisation Stripe en cours…
          </div>
        ) : null}

        <div className="flex gap-3">
          <button
            onClick={goCheckout}
            disabled={loading || syncing}
            className="rounded-lg bg-blue-600 px-4 py-2 font-semibold hover:bg-blue-500 disabled:opacity-60"
          >
            Débloquer Pro
          </button>

          <button
            onClick={openPortal}
            disabled={loading || syncing}
            className="rounded-lg bg-slate-800 px-4 py-2 font-semibold hover:bg-slate-700 disabled:opacity-60"
          >
            Gérer mon abonnement
          </button>
        </div>
      </div>
    </div>
  );
}
