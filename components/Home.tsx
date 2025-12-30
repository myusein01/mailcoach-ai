// app/components/Home.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

type Me = {
  email: string;
  plan: string;
  stripe_customer_id?: string | null;

  subscription_status?: string | null;
  current_period_end?: string | number | null;
  cancel_at_period_end?: boolean | null;

  emails_improved?: number | null;
};

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [me, setMe] = useState<Me | null>(null);
  const [loadingMe, setLoadingMe] = useState(false);

  // ✅ Contact modal
  const [showContact, setShowContact] = useState(false);
  const [contactLoading, setContactLoading] = useState(false);

  // ✅ FIX TS: status parfois mal inféré => on le force en union correcte
  const authStatus = status as "loading" | "authenticated" | "unauthenticated";

  const userName = useMemo(
    () => session?.user?.name || session?.user?.email || "toi",
    [session]
  );

  useEffect(() => {
    if (!session?.user?.email) return;

    let mounted = true;
    let interval: any = null;

    const refreshMe = async () => {
      setLoadingMe(true);

      const params = new URLSearchParams(window.location.search);
      const shouldSyncByQuery = params.get("sync") === "1";

      if (shouldSyncByQuery) {
        await fetch("/api/stripe/sync", { method: "POST" }).catch(() => {});
        window.history.replaceState({}, "", "/");
      } else {
        await fetch("/api/stripe/sync", { method: "POST" }).catch(() => {});
      }

      const res = await fetch("/api/me", { method: "GET" });
      const data = await res.json().catch(() => null);

      if (!mounted) return;

      setLoadingMe(false);
      if (res.ok && data) setMe(data);
      else setMe(null);

      // ✅ 1ère connexion => onboarding
      const pr = await fetch("/api/user-profile", { method: "GET" }).catch(
        () => null
      );
      const prData = pr ? await pr.json().catch(() => null) : null;

      if (!mounted) return;

      if (pr && pr.ok && prData && prData.firstTime === true) {
        router.push("/onboarding");
      }
    };

    refreshMe();

    const onFocus = () => refreshMe();
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") refreshMe();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);

    interval = setInterval(() => {
      if (document.visibilityState === "visible") refreshMe();
    }, 30_000);

    return () => {
      mounted = false;
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (interval) clearInterval(interval);
    };
  }, [session?.user?.email, router]);

  // ✅ FIX TS: on se base sur authStatus
  if (authStatus === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-50">
        Chargement…
      </div>
    );
  }

  if (!session) return null;

  // ✅ FIX TS: on fige des variables safe (plus de "session possibly null")
  const userEmail = session.user?.email ?? "";
  const userNameSafe = session.user?.name ?? null;

  const openInstall = () => {
    window.open(
      "https://chrome.google.com/webstore/detail/mailcoach-ai-for-gmail/ejddkpobljmcmoimcmmacikkjcecnfhk",
      "_blank"
    );
  };

  const openGmail = () => {
    window.open("https://mail.google.com", "_blank");
  };

  async function goCheckout() {
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        console.error("Checkout error:", data);
        alert(data?.error || "Erreur lors du checkout Stripe.");
        return;
      }

      if (data?.url) window.location.href = data.url;
      else alert("Erreur: URL Stripe manquante.");
    } catch (e) {
      console.error(e);
      alert("Erreur réseau.");
    }
  }

  async function openPortal() {
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        console.error("Portal error:", data);
        alert(data?.error || "Erreur portail Stripe.");
        return;
      }

      if (data?.url) window.location.href = data.url;
      else alert("Erreur: URL portal manquante.");
    } catch (e) {
      console.error(e);
      alert("Erreur réseau.");
    }
  }

  const isPro = (me?.plan ?? "").toString().toLowerCase() === "pro";

  const openPlans = () => {
    window.location.href = "/pricing";
  };

  const goEditProfile = () => {
    router.push("/onboarding");
  };

  // ✅ AJOUT: liens vers tes pages existantes
  const openPrivacy = () => {
    window.location.href = "/privacy";
  };

  const openTerms = () => {
    window.location.href = "/terms";
  };

  const formatPeriodEnd = (value: Me["current_period_end"]) => {
    if (value === null || value === undefined) return null;

    if (typeof value === "string") {
      const d = new Date(value);
      if (!Number.isNaN(d.getTime())) return d;
      return null;
    }

    if (typeof value === "number") {
      const ms = value < 10_000_000_000 ? value * 1000 : value;
      const d = new Date(ms);
      if (!Number.isNaN(d.getTime())) return d;
      return null;
    }

    return null;
  };

  const periodEndDate = formatPeriodEnd(me?.current_period_end);
  const periodEndLabel = periodEndDate
    ? periodEndDate.toLocaleDateString("fr-FR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  const subStatus = (me?.subscription_status ?? "").toString().toLowerCase();

  const proActive =
    isPro &&
    (subStatus === "active" ||
      subStatus === "trialing" ||
      subStatus === "past_due");

  const statusLabel = !isPro ? "—" : proActive ? "Actif" : subStatus ? subStatus : "—";

  const emailsImproved = me?.emails_improved ?? null;

  async function submitContact(form: HTMLFormElement) {
    const fd = new FormData(form);
    const subject = String(fd.get("subject") ?? "").trim();
    const message = String(fd.get("message") ?? "").trim();

    if (!message) {
      alert("Écris ton message 🙂");
      return;
    }

    setContactLoading(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: userEmail,
          name: userNameSafe,
          subject,
          message,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        console.error("contact error:", data);
        alert(data?.error || "Erreur lors de l’envoi du message.");
        return;
      }

      setShowContact(false);
      form.reset();
      alert(
        "Merci pour votre message, nous reviendrons vers vous dans les plus bréfs délais."
      );
    } catch (e) {
      console.error(e);
      alert("Erreur réseau.");
    } finally {
      setContactLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto max-w-4xl px-4 py-12">
        {/* HEADER */}
        <header className="mb-10 flex flex-col gap-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                MailCoach <span className="text-blue-400">AI</span>
              </h1>

              {isPro && (
                <span className="inline-flex items-center rounded-full border border-yellow-400/40 bg-yellow-400/15 px-3 py-1 text-[11px] font-bold tracking-wide text-yellow-200">
                  ⭐ PRO
                </span>
              )}
            </div>

            <p className="mt-3 text-lg text-slate-300 max-w-2xl">
              Salut {userName}. Améliore tes e-mails{" "}
              <strong>directement dans Gmail</strong>, en 1 clic.
            </p>
          </div>

          {/* CTA PRINCIPAL */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={openInstall}
              className="inline-flex items-center justify-center rounded-xl bg-blue-500 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:bg-blue-500/90 transition"
            >
              ✨ Installer l’extension Gmail
            </button>

            <button
              onClick={openGmail}
              className="inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-900/40 px-6 py-3 text-sm font-medium text-slate-200 hover:bg-slate-900/70 transition"
            >
              Ouvrir Gmail
            </button>

            <button
              onClick={goEditProfile}
              className="inline-flex items-center justify-center rounded-xl border border-slate-800 px-6 py-3 text-sm text-slate-200 hover:bg-slate-900/40 transition"
            >
              Modifier mon profil
            </button>
          </div>

          <p className="text-xs text-slate-400">
            ⚠️ L’extension est nécessaire pour utiliser MailCoach dans Gmail.
          </p>
        </header>

        {/* COMMENT ÇA MARCHE */}
        <section className="mb-10">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
            <h2 className="text-xl font-semibold mb-4">Comment ça marche</h2>

            <ol className="grid gap-4 md:grid-cols-3 text-sm text-slate-300">
              <li className="flex gap-3">
                <span className="text-blue-400 font-bold">1.</span>
                Installe l’extension Gmail
              </li>
              <li className="flex gap-3">
                <span className="text-blue-400 font-bold">2.</span>
                Rédige ton e-mail normalement
              </li>
              <li className="flex gap-3">
                <span className="text-blue-400 font-bold">3.</span>
                Clique sur “Améliorer avec MailCoach”
              </li>
            </ol>
          </div>
        </section>

        {/* PLAN + CARTE DROITE */}
        <section className="grid gap-6 md:grid-cols-2">
          {/* PLAN ACTUEL */}
          <div
            className={
              isPro
                ? "rounded-2xl border border-yellow-400/40 bg-gradient-to-br from-yellow-400/10 via-slate-900 to-indigo-600/20 p-6"
                : "rounded-2xl border border-slate-800 bg-slate-900/70 p-6"
            }
          >
            <p className="text-xs uppercase tracking-wide text-slate-400 mb-1">
              Ton plan
            </p>

            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-semibold">
                {loadingMe ? "…" : isPro ? "Pro" : "Starter (gratuit)"}
              </h3>

              {isPro && (
                <span className="inline-flex items-center rounded-full border border-yellow-400/40 bg-yellow-400/15 px-2 py-0.5 text-[10px] font-bold text-yellow-200">
                  PRO
                </span>
              )}
            </div>

            <p className="text-sm text-slate-300 mb-4">
              {isPro
                ? "Tu as accès aux améliorations illimitées."
                : "Idéal pour tester MailCoach AI sur quelques e-mails."}
            </p>

            <ul className="text-sm text-slate-400 space-y-1 mb-4">
              {isPro ? (
                <>
                  <li>• Améliorations illimitées dans Gmail</li>
                  <li>• Support prioritaire</li>
                  <li>• Accès prioritaire aux nouveautés</li>
                </>
              ) : (
                <>
                  <li>• Améliorations limitées par mois</li>
                  <li>• Extension Gmail incluse</li>
                  <li>• Support standard</li>
                </>
              )}
            </ul>

            <p className="text-xs text-slate-500">Connecté en tant que {userEmail}</p>

            {isPro && (
              <button
                onClick={openPortal}
                className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-slate-800 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700 transition"
              >
                Gérer mon abonnement
              </button>
            )}
          </div>

          {/* CARTE DROITE */}
          {isPro ? (
            <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-blue-600/10 via-slate-900 to-indigo-600/10 p-6">
              <h3 className="text-xl font-semibold mb-4">Ton activité</h3>

              <ul className="space-y-2 text-sm text-slate-200">
                <li className="flex items-center gap-2">
                  <span>
                    E-mails améliorés :{" "}
                    <span className="text-slate-300">
                      {emailsImproved === null ? "—" : emailsImproved}
                    </span>
                  </span>
                </li>

                <li className="flex items-center gap-2">
                  <span>
                    Accès Pro : <span className="text-slate-300">{statusLabel}</span>
                  </span>
                </li>

                <li className="flex items-center gap-2">
                  <span>
                    Limite : <span className="text-slate-300">illimitée</span>
                  </span>
                </li>

                {me?.cancel_at_period_end ? (
                  <li className="flex items-center gap-2">
                    <span>⚠️</span>
                    <span className="text-slate-300">
                      Renouvellement désactivé (fin à l’échéance)
                    </span>
                  </li>
                ) : null}
              </ul>

              <p className="mt-4 text-xs text-slate-500">Connecté en tant que {userEmail}</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-blue-500/60 bg-gradient-to-br from-blue-600/20 via-slate-900 to-indigo-600/20 p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold">Passe en Pro</h3>
                <span className="rounded-full bg-blue-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                  Recommandé
                </span>
              </div>

              <p className="text-sm text-slate-200 mb-4">
                Pour ceux qui écrivent des e-mails tous les jours.
              </p>

              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-3xl font-bold">3,99€</span>
                <span className="text-sm text-slate-300">/ mois</span>
              </div>

              <ul className="text-sm text-slate-100 space-y-1.5 mb-6">
                <li>• Améliorations illimitées dans Gmail</li>
                <li>• Meilleur ton, clarté & structure</li>
                <li>• Accès prioritaire aux nouveautés</li>
                <li>• Support prioritaire</li>
              </ul>

              <button
                onClick={openPlans}
                className="inline-flex w-full items-center justify-center rounded-xl bg-blue-500 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-500/90 transition"
              >
                Voir les plans
              </button>

              <p className="mt-3 text-[11px] text-slate-300">
                Essai inclus si configuré dans Stripe.
              </p>
            </div>
          )}
        </section>

        {/* FOOTER */}
        <footer className="mt-14 flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center text-xs text-slate-500">
          <div className="flex flex-wrap items-center gap-4">
            <button
              onClick={() => setShowContact(true)}
              className="hover:text-slate-300 transition underline underline-offset-4"
            >
              Besoin d’aide ? Contacte-nous.
            </button>

            <button
              onClick={openPrivacy}
              className="hover:text-slate-300 transition underline underline-offset-4"
            >
              Politique de confidentialité
            </button>

            <button
              onClick={openTerms}
              className="hover:text-slate-300 transition underline underline-offset-4"
            >
              Conditions d’utilisation
            </button>
          </div>

          <button onClick={() => signOut()} className="hover:text-slate-300 transition">
            Se déconnecter
          </button>
        </footer>
      </div>

      {/* CONTACT MODAL */}
      {showContact && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !contactLoading) setShowContact(false);
          }}
        >
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <h3 className="text-lg font-semibold">Contacter le support</h3>
                <p className="text-sm text-slate-400 mt-1">
                  Ton message sera envoyé à l’équipe MailCoach AI.
                </p>
              </div>

              <button
                type="button"
                disabled={contactLoading}
                onClick={() => setShowContact(false)}
                className="text-slate-400 hover:text-slate-200 transition"
                aria-label="Fermer"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await submitContact(e.currentTarget);
              }}
              className="space-y-4"
            >
              <input
                name="subject"
                placeholder="Sujet (optionnel)"
                className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <textarea
                name="message"
                required
                placeholder="Explique ton problème ou ta question…"
                className="w-full h-28 rounded-xl bg-slate-800 border border-slate-700 p-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  disabled={contactLoading}
                  onClick={() => setShowContact(false)}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 disabled:opacity-50"
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  disabled={contactLoading}
                  className="rounded-xl bg-blue-500 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-500/90 disabled:opacity-60"
                >
                  {contactLoading ? "Envoi…" : "Envoyer"}
                </button>
              </div>

              <p className="text-[11px] text-slate-500">
                (Tu peux laisser le sujet vide. On utilise ton email de connexion pour te répondre.)
              </p>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
