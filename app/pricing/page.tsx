// app/pricing/page.tsx
"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type SearchParams = Record<string, string | string[] | undefined>;
type PlanKey = "pro_1m" | "pro_6m" | "pro_12m";

function Banner({ type }: { type: "success" | "warning" | "info" }) {
  const styles =
    type === "success"
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
      : type === "warning"
      ? "border-amber-500/40 bg-amber-500/10 text-amber-200"
      : "border-blue-500/40 bg-blue-500/10 text-blue-200";

  return (
    <div className={`rounded-2xl border px-4 py-3 text-sm ${styles}`}>
      {type === "success" && (
        <div>
          ✅ Paiement confirmé. Ton plan Pro va être activé (quelques secondes si
          webhook).
        </div>
      )}
      {type === "warning" && (
        <div>⚠️ Paiement annulé. Tu peux réessayer quand tu veux.</div>
      )}
      {type === "info" && <div>ℹ️ Connecte-toi pour pouvoir passer en Pro.</div>}
    </div>
  );
}

function Chip({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "primary";
}) {
  const cls =
    tone === "primary"
      ? "border border-blue-500/40 bg-blue-500/10 text-blue-200"
      : "border border-slate-700 bg-slate-950/40 text-slate-200";

  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${cls}`}>
      {children}
    </span>
  );
}

function Price({ main, suffix }: { main: string; suffix: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-baseline gap-2">
        <span className="text-5xl font-bold">{main}</span>
        <span className="text-sm text-slate-300">{suffix}</span>
      </div>
      <p className="mt-2 text-xs text-slate-400">Taxes incluses</p>
    </div>
  );
}

function Feature({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2 text-sm text-slate-200">
      <span className="mt-[2px] inline-flex h-4 w-4 items-center justify-center rounded-full bg-blue-500/15 text-blue-300">
        ✓
      </span>
      <span className="text-slate-200/95">{children}</span>
    </li>
  );
}

function PricingCard({
  title,
  priceMain,
  priceSuffix,
  badge,
  highlight,
  onClick,
}: {
  title: string;
  priceMain: string;
  priceSuffix: React.ReactNode;
  badge?: { text: string; tone?: "neutral" | "primary" };
  highlight?: boolean;
  onClick: () => void;
}) {
  return (
    <div
      className={
        highlight
          ? "relative rounded-2xl border border-blue-500/60 bg-gradient-to-br from-blue-600/20 via-slate-900 to-indigo-600/20 p-6 shadow-sm"
          : "relative rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-sm"
      }
    >
      {highlight && (
        <div className="pointer-events-none absolute -inset-px rounded-2xl bg-gradient-to-r from-blue-500/20 via-indigo-500/10 to-blue-500/20 blur-xl" />
      )}

      <div className="relative">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>
          {badge && <Chip tone={badge.tone ?? "neutral"}>{badge.text}</Chip>}
        </div>

        <div className="mt-5">
          <Price main={priceMain} suffix={priceSuffix} />
        </div>

        <button
          onClick={onClick}
          className={
            highlight
              ? "mt-6 inline-flex w-full items-center justify-center rounded-xl bg-blue-500 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-500/90 transition"
              : "mt-6 inline-flex w-full items-center justify-center rounded-xl border border-slate-700 bg-slate-900/50 px-5 py-3 text-sm font-semibold text-slate-100 hover:bg-slate-800/60 transition"
          }
        >
          Passer Pro
        </button>

        <p className="mt-3 text-[11px] text-slate-400">
          Paiement sécurisé. Accès immédiat après paiement.
        </p>

        <div className="mt-5 pt-4 border-t border-slate-800/70">
          <p className="text-xs text-slate-400 mb-2">Inclus dans Pro</p>
          <ul className="space-y-2">
            <Feature>Extension Gmail illimitée</Feature>
          </ul>
        </div>
      </div>
    </div>
  );
}

type BillingInfo = {
  kind: "personal" | "company";
  fullName: string;
  companyName?: string;
  vat?: string;
  addressLine1?: string;
  city?: string;
  postalCode?: string;
  country?: string; // ex: "BE"
};

export default function PricingPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const paid = searchParams?.paid === "1";
  const canceled = searchParams?.canceled === "1";

  const [billingOpen, setBillingOpen] = useState(false);
  const [billingLoading, setBillingLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanKey | null>(null);

  const [billing, setBilling] = useState<BillingInfo>({
    kind: "personal",
    fullName: "",
    companyName: "",
    vat: "",
    addressLine1: "",
    city: "",
    postalCode: "",
    country: "BE",
  });

  const isCompany = billing.kind === "company";

  const canSubmit = useMemo(() => {
    if (!billing.fullName.trim()) return false;
    if (isCompany && !String(billing.companyName || "").trim()) return false;
    return true;
  }, [billing.fullName, billing.companyName, isCompany]);

  async function goCheckout(priceKey: PlanKey, billingInfo?: BillingInfo) {
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceKey, billing: billingInfo ?? null }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        console.error("Checkout error:", data);
        alert(
          data?.error ||
            "Erreur lors du checkout Stripe. Vérifie que /api/stripe/checkout accepte priceKey."
        );
        return;
      }

      if (data?.url) window.location.href = data.url;
      else alert("Erreur: URL Stripe manquante.");
    } catch (e) {
      console.error(e);
      alert("Erreur réseau.");
    }
  }

  function openBillingModal(plan: PlanKey) {
    setSelectedPlan(plan);
    setBillingOpen(true);
  }

  async function submitBillingAndCheckout() {
    if (!selectedPlan) return;
    if (!canSubmit) {
      alert("Merci de compléter les infos de facturation.");
      return;
    }

    setBillingLoading(true);
    try {
      await goCheckout(selectedPlan, billing);
    } finally {
      setBillingLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-10 md:py-14">
        <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-slate-300 hover:text-slate-100 transition"
            >
              ← Retour
            </Link>

            <h1 className="mt-4 text-3xl md:text-5xl font-bold">
              Tarifs <span className="text-blue-400">MailCoach AI</span>
            </h1>

            <p className="mt-2 text-slate-300 max-w-2xl">
              Choisis la durée la plus avantageuse pour toi.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/"
              className="text-xs md:text-sm px-3 py-1.5 rounded-full border border-slate-700 text-slate-200 hover:bg-slate-800/60 transition"
            >
              Dashboard
            </Link>
          </div>
        </header>

        <div className="mb-6 space-y-3">
          {paid && <Banner type="success" />}
          {canceled && <Banner type="warning" />}
        </div>

        <section className="grid gap-4 lg:grid-cols-3">
          <PricingCard
            title="1 mois"
            priceMain="3,99€"
            priceSuffix={<>/ mois</>}
            badge={{ text: "Flexible" }}
            onClick={() => openBillingModal("pro_1m")}
          />

          <PricingCard
            title="6 mois"
            priceMain="19,99€"
            priceSuffix={<>/ 6 mois</>}
            badge={{ text: "1 mois offert", tone: "primary" }}
            onClick={() => openBillingModal("pro_6m")}
          />

          <PricingCard
            title="1 an"
            priceMain="35,99€"
            priceSuffix={<>/ an</>}
            badge={{ text: "3 mois offerts", tone: "primary" }}
            highlight
            onClick={() => openBillingModal("pro_12m")}
          />
        </section>

        {/* ✅ FAQ RESTAURÉE (inchangée) */}
        <section className="mt-10 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <h3 className="font-semibold">Est-ce que je peux annuler ?</h3>
            <p className="mt-2 text-sm text-slate-300">
              Oui. Tu peux annuler à tout moment. Ton plan reste actif jusqu’à la fin
              de la période payée.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <h3 className="font-semibold">Pourquoi l’extension plutôt que le site ?</h3>
            <p className="mt-2 text-sm text-slate-300">
              Parce que tu restes dans Gmail. En 1 clic, l’objet et le corps sont améliorés
              directement.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <h3 className="font-semibold">Le plan Pro débloque quoi ?</h3>
            <p className="mt-2 text-sm text-slate-300">
              Plus de limite mensuelle, meilleure qualité, et l’extension Gmail en usage illimité.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <h3 className="font-semibold">Est-ce sécurisé ?</h3>
            <p className="mt-2 text-sm text-slate-300">
              On ne lit pas ta boîte. Tu envoies uniquement le texte du mail que tu veux améliorer au moment où tu cliques.
            </p>
          </div>
        </section>

        <footer className="mt-10 text-center text-[11px] text-slate-500">
          © {new Date().getFullYear()} MailCoach AI
        </footer>
      </div>

      {/* ✅ MODAL : infos de facturation */}
      {billingOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !billingLoading) setBillingOpen(false);
          }}
        >
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 p-6">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <h3 className="text-lg font-semibold">Infos de facturation</h3>
                <p className="text-sm text-slate-400 mt-1">
                  
                </p>
              </div>

              <button
                type="button"
                disabled={billingLoading}
                onClick={() => setBillingOpen(false)}
                className="text-slate-400 hover:text-slate-200 transition"
                aria-label="Fermer"
              >
                ✕
              </button>
            </div>

            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={() => setBilling((b) => ({ ...b, kind: "personal" }))}
                className={`px-3 py-2 rounded-xl border text-sm ${
                  billing.kind === "personal"
                    ? "border-blue-500 bg-blue-500/10 text-blue-100"
                    : "border-slate-700 text-slate-200 hover:bg-slate-800/40"
                }`}
              >
                Particulier
              </button>
              <button
                type="button"
                onClick={() => setBilling((b) => ({ ...b, kind: "company" }))}
                className={`px-3 py-2 rounded-xl border text-sm ${
                  billing.kind === "company"
                    ? "border-blue-500 bg-blue-500/10 text-blue-100"
                    : "border-slate-700 text-slate-200 hover:bg-slate-800/40"
                }`}
              >
                Société
              </button>
            </div>

            <div className="space-y-3">
              <input
                value={billing.fullName}
                onChange={(e) => setBilling((b) => ({ ...b, fullName: e.target.value }))}
                placeholder="Nom / Prénom (obligatoire)"
                className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              {isCompany && (
                <>
                  <input
                    value={billing.companyName || ""}
                    onChange={(e) =>
                      setBilling((b) => ({ ...b, companyName: e.target.value }))
                    }
                    placeholder="Nom de la société"
                    className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    value={billing.vat || ""}
                    onChange={(e) => setBilling((b) => ({ ...b, vat: e.target.value }))}
                    placeholder="N° TVA"
                    className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </>
              )}

              <input
                value={billing.addressLine1 || ""}
                onChange={(e) =>
                  setBilling((b) => ({ ...b, addressLine1: e.target.value }))
                }
                placeholder="Adresse (rue, numéro)"
                className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <div className="grid grid-cols-2 gap-3">
                <input
                  value={billing.postalCode || ""}
                  onChange={(e) =>
                    setBilling((b) => ({ ...b, postalCode: e.target.value }))
                  }
                  placeholder="Code postal"
                  className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  value={billing.city || ""}
                  onChange={(e) => setBilling((b) => ({ ...b, city: e.target.value }))}
                  placeholder="Ville"
                  className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <input
                  value={billing.country}
                  onChange={(e) =>
                    setBilling((b) => ({ ...b, country: e.target.value.toUpperCase() }))
                  }
                  placeholder="Pays (ex: BE, FR)"
                  className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                <div className="text-[11px] text-slate-400 flex items-center">
                  
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={billingLoading}
                  onClick={() => setBillingOpen(false)}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 disabled:opacity-50"
                >
                  Annuler
                </button>

                <button
                  type="button"
                  disabled={billingLoading || !canSubmit}
                  onClick={submitBillingAndCheckout}
                  className="rounded-xl bg-blue-500 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-500/90 disabled:opacity-60"
                >
                  {billingLoading ? "Redirection…" : "Continuer vers paiement"}
                </button>
              </div>

              
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
