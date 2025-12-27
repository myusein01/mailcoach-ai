// app/success/page.tsx
"use client";

import { useEffect, useState } from "react";

export default function SuccessPage() {
  const [syncing, setSyncing] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        // ✅ force la sync Stripe -> DB (au cas où le webhook n'est pas reçu)
        await fetch("/api/stripe/sync", { method: "POST" });
      } catch {
        // ignore
      } finally {
        setSyncing(false);
        window.location.href = "/";
      }
    })();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-50 px-4">
      <div className="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900/60 p-8 text-center">
        <div className="text-2xl font-bold mb-2">
          ✅ Abonnement activé
        </div>
        <p className="text-slate-300">
          {syncing
            ? "Synchronisation en cours avec Stripe…"
            : "Redirection…"}
        </p>

        <button
          onClick={() => (window.location.href = "/")}
          className="mt-6 inline-flex items-center justify-center rounded-xl bg-blue-500 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-500/90 transition"
        >
          Retour au dashboard
        </button>
      </div>
    </div>
  );
}
