// app/pricing/checkout/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function CheckoutRedirectPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/stripe/checkout", { method: "POST" });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Erreur checkout");
        if (!data?.url) throw new Error("URL Stripe manquante");
        window.location.href = data.url;
      } catch (e: any) {
        setError(e.message || "Erreur inconnue");
      }
    })();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-50 px-4">
      <div className="max-w-md w-full rounded-2xl border border-slate-800 bg-slate-900/70 p-6 text-center">
        {!error ? (
          <>
            <div className="text-lg font-semibold">Redirection vers Stripe…</div>
            <p className="mt-2 text-sm text-slate-300">
              Si rien ne se passe, vérifie que tu es connecté.
            </p>
          </>
        ) : (
          <>
            <div className="text-lg font-semibold text-red-300">
              Impossible de lancer le paiement
            </div>
            <p className="mt-2 text-sm text-slate-300">{error}</p>
            <button
              onClick={() => router.push("/pricing")}
              className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-blue-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500/90 transition"
            >
              Retour aux tarifs
            </button>
          </>
        )}
      </div>
    </div>
  );
}
