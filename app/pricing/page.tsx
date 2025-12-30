// app/pricing/page.tsx
"use client";

import Link from "next/link";

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

export default function PricingPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const paid = searchParams?.paid === "1";
  const canceled = searchParams?.canceled === "1";

  async function goCheckout(priceKey: PlanKey) {
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceKey }),
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
            onClick={() => goCheckout("pro_1m")}
          />

          <PricingCard
            title="6 mois"
            priceMain="19,99€"
            priceSuffix={<>/ 6 mois</>}
            badge={{ text: "1 mois offert", tone: "primary" }}
            onClick={() => goCheckout("pro_6m")}
          />

          <PricingCard
            title="1 an"
            priceMain="35,99€"
            priceSuffix={<>/ an</>}
            badge={{ text: "3 mois offerts", tone: "primary" }}
            highlight
            onClick={() => goCheckout("pro_12m")}
          />
        </section>

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
    </main>
  );
}
