"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession, signOut, signIn } from "next-auth/react";
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

  // ✅ Contact modal (on le garde pour les users connectés)
  const [showContact, setShowContact] = useState(false);
  const [contactLoading, setContactLoading] = useState(false);

  const authStatus = status as "loading" | "authenticated" | "unauthenticated";

  const userName = useMemo(
    () => session?.user?.name || session?.user?.email || "toi",
    [session]
  );

  // =========================
  // ✅ IMAGES LANDING (à remplacer)
  // =========================
  const LANDING_IMAGES = {
    // ✅ Mets ici une capture/GIF/mini vidéo (exportée en mp4/webm ou gif) montrant MailCoach dans Gmail
    // Exemple: "/images/hero-demo.gif"
    heroDemo: "/images/hero-demo.png",

    // ✅ Petites icônes (SVG/PNG) pour les étapes
    step1Icon: "/images/step-install.svg",
    step2Icon: "/images/step-write.svg",
    step3Icon: "/images/step-improve.svg",

    // ✅ Social proof: note Chrome Web Store / logos / avatars
    socialProof: "/images/social-proof.png",
  };

  const HERO_LOOM_EMBED_URL =
    "https://www.loom.com/embed/dd58221113c948e5a3ce114d4e5e2b06?autoplay=1&muted=1";

  const CHROME_WEBSTORE_URL =
    "https://chrome.google.com/webstore/detail/mailcoach-ai-for-gmail/ejddkpobljmcmoimcmmacikkjcecnfhk";

  const SOCIAL_PROOF = {
    rating: 5.0,
    reviewsCount: 1,
    review: {
      name: "Squeem",
      dateLabel: "2 janv. 2026",
      text: "C'est une application qui est pratique et qui fait gagner du temps",
    },
  };

  // ✅ On ne fait le refreshMe / onboarding QUE si connecté
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

  if (authStatus === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-50">
        Chargement…
      </div>
    );
  }

  const openInstall = () => {
    window.open(
      "https://chrome.google.com/webstore/detail/mailcoach-ai-for-gmail/ejddkpobljmcmoimcmmacikkjcecnfhk",
      "_blank"
    );
  };

  const openGmail = () => {
    window.open("https://mail.google.com", "_blank");
  };

  const openPlans = () => {
    window.location.href = "/pricing";
  };

  const openPrivacy = () => {
    window.location.href = "/privacy";
  };

  const openTerms = () => {
    window.location.href = "/terms";
  };

  // ✅ Ajout “Mentions légales” (conseil marketer)
  const openLegal = () => {
    window.location.href = "/legal";
  };

  const goEditProfile = () => {
    router.push("/onboarding");
  };

  const scrollToHowItWorks = () => {
    const el = document.getElementById("how-it-works");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // =========================
  // ✅ CAS 1: PAS CONNECTÉ
  // =========================
  if (!session) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50">
        <div className="mx-auto max-w-4xl px-4 py-12">
          {/* HEADER */}
          <header className="mb-10 flex flex-col gap-6">
            {/* ✅ Top-right secondary actions (conseil UI/UX) */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                  MailCoach <span className="text-blue-400">AI</span>
                </h1>

                {/* ✅ Headline un peu plus spécifique (conseil UI/UX) */}
                <p className="mt-3 text-lg text-slate-300 max-w-2xl">
                  Rends tes e-mails{" "}
                  <strong>plus clairs, plus pros et sans fautes</strong>{" "}
                  <strong>directement dans Gmail</strong>, en <strong>1 clic</strong>.
                </p>
              </div>

              <div className="flex items-center gap-2">
                

                <button
                  onClick={() => signIn("google", { callbackUrl: "/" })}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-800 px-4 py-2 text-xs text-slate-200 hover:bg-slate-900/40 transition"
                >
                  Se connecter
                </button>
              </div>
            </div>

            {/* ✅ HERO: texte + vidéo en grand en dessous */}
            <div className="grid gap-6">
              <div>
                {/* ✅ CLARTÉ IMMÉDIATE */}
                <div className="mt-1 rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className="inline-flex items-center rounded-full border border-blue-500/40 bg-blue-500/10 px-3 py-1 text-[11px] font-semibold text-blue-200">
                      Extension Chrome
                    </span>
                    <span className="inline-flex items-center rounded-full border border-slate-700 bg-slate-900/40 px-3 py-1 text-[11px] font-semibold text-slate-200">
                      Fonctionne dans Gmail
                    </span>
                  </div>

                  <div className="space-y-2 text-sm text-slate-200">
                    <p>
                      <strong>Marre de relire 3 fois</strong> pour trouver le bon ton, être clair, et éviter
                      les fautes ?
                    </p>

                    <p>
                      <strong>MailCoach AI</strong> est une extension Chrome qui ajoute un bouton dans Gmail :{" "}
                      <span className="text-slate-100 font-semibold">
                        “Améliorer avec MailCoach”
                      </span>
                      . Tu écris comme d’habitude, puis tu cliques : on reformule pour un résultat{" "}
                      <strong>plus clair, plus pro, sans fautes</strong>.
                    </p>
                  </div>

                  <p className="mt-2 text-xs text-slate-400">
                    👉 Aucune configuration nécessaire. Installation en 30 secondes.
                  </p>
                </div>

                {/* CTA */}
                <div className="mt-5 flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={openInstall}
                    className="inline-flex items-center justify-center rounded-xl bg-blue-500 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:bg-blue-500/90 transition"
                  >
                    ✨ Ajouter à Chrome (gratuit)
                  </button>
                </div>

                {/* ✅ Remplace l'emoji ⚠️ */}
                <p className="mt-3 text-xs text-slate-400 flex items-start gap-2">
                  <span
                    className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-slate-700 text-[10px] text-slate-300"
                    aria-hidden="true"
                  >
                    i
                  </span>
                  <span>
                    L’extension est nécessaire pour utiliser MailCoach dans Gmail.
                  </span>
                </p>
              </div>

              {/* ✅ Vidéo en grand sous le texte */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-3">
                <div className="rounded-xl border border-slate-800 bg-slate-950/30 overflow-hidden">
                  <div
                    className="relative w-full"
                    style={{ paddingBottom: "53.73134328358209%" }}
                  >
                    <iframe
                      src={HERO_LOOM_EMBED_URL}
                      frameBorder="0"
                      allowFullScreen
                      className="absolute top-0 left-0 w-full h-full"
                    />
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* ✅ RÉSULTAT + EXEMPLE */}
          <section className="grid gap-6 md:grid-cols-2 mb-10">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 flex flex-col">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400 mb-2">
                  Résultat
                </p>
                <h3 className="text-lg font-semibold mb-3">
                  Des réponses plus pro, sans perdre de temps
                </h3>
              </div>

              <div className="flex-1 flex flex-col justify-center">
                <ul className="text-sm text-slate-300 space-y-2">
                  <li>• Ton plus clair et plus poli</li>
                  <li>• Structure + meilleure lisibilité</li>
                  <li>• Pas de fautes d&apos;orthographe</li>
                  <li>• Pas de formulations bancales</li>
                  <li>• Gain de temps énorme au quotidien</li>
                  <li>• Gain en crédibilité</li>
                </ul>
              </div>

              <div className="mt-6">
                <div className="flex flex-col gap-2">
                  <button
                    onClick={openInstall}
                    className="inline-flex w-full items-center justify-center rounded-xl bg-blue-500 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-500/90 transition"
                  >
                    Commencer maintenant
                  </button>
                </div>

                <p className="mt-3 text-[11px] text-slate-500">
                  5 améliorations gratuites (5 e-mails) pour tester.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-blue-500/40 bg-gradient-to-br from-blue-600/20 via-slate-900 to-indigo-600/20 p-6">
              <p className="text-xs uppercase tracking-wide text-slate-300/80 mb-2">
                Exemple
              </p>
              <h3 className="text-lg font-semibold mb-3">
                Avant → Après (en 1 clic)
              </h3>

              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-300">
                <div className="text-slate-400 text-xs mb-2">Avant</div>
                <div className="mb-4">
                  “Salut, je vous ecris pour connaitre quand vous etes
                  disponibles, possible de faire un appel ?”
                </div>

                <div className="text-slate-400 text-xs mb-2">Après</div>
                <div>
                  “Bonjour, <br />
                  <br />
                  Je souhaiterais connaître vos disponibilités afin d&apos;organiser
                  un appel. <br />
                  <br />
                  Pourriez-vous me faire part des créneaux qui vous conviennent ?{" "}
                  <br />
                  <br />
                  Cordialement,”
                </div>
              </div>

              <p className="mt-4 text-[11px] text-slate-300/80">
                (Exemple indicatif — le style s’adapte à ton contexte.)
              </p>
            </div>
          </section>

          {/* ✅ AVIS (Google / Chrome Web Store) — déplacé sous Résultat + Avant/Après */}
          <section className="mb-10">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold mb-2">
                    5,0 ★ sur le Chrome Web Store
                  </h2>

                  <div className="flex flex-wrap items-center gap-2 text-sm text-slate-300">
                    <div className="flex items-center gap-1" aria-label="Note 5 étoiles">
                      <span className="text-yellow-300">★</span>
                      <span className="text-yellow-300">★</span>
                      <span className="text-yellow-300">★</span>
                      <span className="text-yellow-300">★</span>
                      <span className="text-yellow-300">★</span>
                    </div>

                    <span className="text-slate-200 font-semibold">
                      {SOCIAL_PROOF.rating.toFixed(1)} / 5
                    </span>

                    <span className="text-slate-500">
                      • avis
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => window.open(CHROME_WEBSTORE_URL, "_blank")}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-900/40 px-4 py-2 text-xs font-medium text-slate-200 hover:bg-slate-900/70 transition"
                >
                  Voir l’avis sur le Web Store
                </button>
              </div>

              <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/30 p-5">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-sm font-semibold text-slate-200">
                    {SOCIAL_PROOF.review.name
                      .split(" ")
                      .slice(0, 2)
                      .map((w) => w[0]?.toUpperCase())
                      .join("")}
                  </div>

                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <p className="text-sm font-semibold text-slate-100">
                        {SOCIAL_PROOF.review.name}
                      </p>
                      <span className="text-xs text-slate-500">•</span>
                      <p className="text-xs text-slate-400">{SOCIAL_PROOF.review.dateLabel}</p>
                    </div>

                    <p className="mt-2 text-sm text-slate-200 leading-relaxed">
                      “{SOCIAL_PROOF.review.text}”
                    </p>

                    <div className="mt-3 flex items-center gap-1 text-xs text-slate-400">
                      <span className="text-yellow-300">★</span>
                      <span className="text-yellow-300">★</span>
                      <span className="text-yellow-300">★</span>
                      <span className="text-yellow-300">★</span>
                      <span className="text-yellow-300">★</span>
                      <span className="ml-2">Avis (Chrome Web Store)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ✅ Pas de CTA "Installer l'extension" ici (comme demandé) */}
            </div>
          </section>

          {/* COMMENT ÇA MARCHE */}
          <section className="mb-10" id="how-it-works">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
              <h2 className="text-xl font-semibold mb-4">Comment ça marche ?</h2>

              <ol className="grid gap-6 md:grid-cols-3 text-sm text-slate-300">
                <li className="rounded-xl border border-slate-800 bg-slate-950/30 p-4">
                  <img
                    src={LANDING_IMAGES.step1Icon}
                    alt="Installer l’extension"
                    className="h-10 w-10 mb-3"
                    loading="lazy"
                  />
                  <div className="flex gap-3">
                    <span className="text-blue-400 font-bold">1.</span>
                    <span>Ajoute l’extension et redémarre Gmail</span>
                  </div>
                </li>

                <li className="rounded-xl border border-slate-800 bg-slate-950/30 p-4">
                  <img
                    src={LANDING_IMAGES.step2Icon}
                    alt="Écrire un e-mail"
                    className="h-10 w-10 mb-3"
                    loading="lazy"
                  />
                  <div className="flex gap-3">
                    <span className="text-blue-400 font-bold">2.</span>
                    <span>Rédige ton e-mail comme d’habitude</span>
                  </div>
                </li>

                <li className="rounded-xl border border-slate-800 bg-slate-950/30 p-4">
                  <img
                    src={LANDING_IMAGES.step3Icon}
                    alt="Améliorer avec MailCoach"
                    className="h-10 w-10 mb-3"
                    loading="lazy"
                  />
                  <div className="flex gap-3">
                    <span className="text-blue-400 font-bold">3.</span>
                    <span>Clique sur “Améliorer avec MailCoach”</span>
                  </div>
                </li>
              </ol>

              <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/30 p-4 text-sm text-slate-300">
                <span className="text-slate-200 font-semibold">
                  Où est le bouton ?
                </span>{" "}
                Dans Gmail, quand tu rédiges un e-mail, tu verras un bouton{" "}
                <span className="text-slate-100 font-semibold">
                  “Améliorer avec MailCoach”
                </span>{" "}
                à côté des actions d’envoi.
              </div>

              <div className="mt-4 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={openInstall}
                  className="inline-flex items-center justify-center rounded-xl bg-blue-500 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-500/90 transition"
                >
                  Installer l’extension
                </button>
                <button
                  onClick={openGmail}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-900/40 px-6 py-3 text-sm font-medium text-slate-200 hover:bg-slate-900/70 transition"
                >
                  Ouvrir Gmail
                </button>
              </div>
            </div>
          </section>

          {/* ✅ FINAL CTA */}
          <section className="mb-10">
            <div className="rounded-2xl border border-blue-500/40 bg-gradient-to-br from-blue-600/20 via-slate-900 to-indigo-600/20 p-6">
              <h2 className="text-2xl font-semibold mb-2">
                Écris mieux en 1 clic, directement dans Gmail
              </h2>
              <p className="text-sm text-slate-300 mb-5 max-w-2xl">
                Installe l’extension, rédige comme d’habitude, puis clique sur
                “Améliorer avec MailCoach”.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={openInstall}
                  className="inline-flex items-center justify-center rounded-xl bg-blue-500 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-500/90 transition"
                >
                  ✨ Ajouter à Chrome (gratuit)
                </button>
                <button
                  onClick={openPlans}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-900/40 px-6 py-3 text-sm font-medium text-slate-200 hover:bg-slate-900/70 transition"
                >
                  Voir les plans
                </button>
              </div>

              <p className="mt-3 text-[11px] text-slate-300/80">
                5 améliorations gratuites (5 e-mails) pour tester.
              </p>
            </div>
          </section>

          {/* FOOTER */}
          <footer className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center text-xs text-slate-500">
            <div className="flex flex-wrap items-center gap-4">
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

              <button
                onClick={openLegal}
                className="hover:text-slate-300 transition underline underline-offset-4"
              >
                Mentions légales
              </button>

              <button
                onClick={() => window.open("mailto:support@mailcoach.ai", "_blank")}
                className="hover:text-slate-300 transition underline underline-offset-4"
              >
                Support
              </button>
            </div>

            <button
              onClick={() => signIn("google", { callbackUrl: "/" })}
              className="hover:text-slate-300 transition"
            >
              Se connecter
            </button>
          </footer>
        </div>
      </div>
    );
  }

  // =========================
  // ✅ CAS 2: CONNECTÉ (ton code)
  // =========================

  const userEmail = session.user?.email ?? "";
  const userNameSafe = session.user?.name ?? null;

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

  const statusLabel = !isPro
    ? "—"
    : proActive
    ? "Actif"
    : subStatus
    ? subStatus
    : "—";

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

            {/* ✅ RAPPEL CLARTÉ (connecté aussi) */}
            <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
              <p className="text-sm text-slate-200">
                <strong>Rappel :</strong> MailCoach AI est une{" "}
                <strong>extension Chrome</strong>. Dans Gmail, tu verras un
                bouton{" "}
                <span className="text-slate-100 font-semibold">
                  “Améliorer avec MailCoach”
                </span>{" "}
                pendant que tu rédiges.
              </p>
            </div>
          </div>

          {/* CTA PRINCIPAL */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={openInstall}
              className="inline-flex items-center justify-center rounded-xl bg-blue-500 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:bg-blue-500/90 transition"
            >
              ✨ Ajouter à Chrome (gratuit)
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

          {/* ✅ Remplace ⚠️ par icône info */}
          <p className="text-xs text-slate-400 flex items-start gap-2">
            <span
              className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-slate-700 text-[10px] text-slate-300"
              aria-hidden="true"
            >
              i
            </span>
            <span>L’extension est nécessaire pour utiliser MailCoach dans Gmail.</span>
          </p>
        </header>

        {/* COMMENT ÇA MARCHE */}
        <section className="mb-10">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
            <h2 className="text-xl font-semibold mb-4">Comment ça marche</h2>

            <ol className="grid gap-4 md:grid-cols-3 text-sm text-slate-300">
              <li className="flex gap-3">
                <span className="text-blue-400 font-bold">1.</span>
                Ajoute l&apos;extension et redémarre Gmail
              </li>
              <li className="flex gap-3">
                <span className="text-blue-400 font-bold">2.</span>
                Rédige ton e-mail comme d&apos;habitude
              </li>
              <li className="flex gap-3">
                <span className="text-blue-400 font-bold">3.</span>
                Clique sur “Améliorer avec MailCoach”
              </li>
            </ol>
          </div>
        </section>

        {/* PLAN + CARTE DROITE (inchangé) */}
        <section className="grid gap-6 md:grid-cols-2">
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

            <p className="text-xs text-slate-500">
              Connecté en tant que {userEmail}
            </p>

            {isPro && (
              <button
                onClick={openPortal}
                className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-slate-800 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700 transition"
              >
                Gérer mon abonnement
              </button>
            )}
          </div>

          {isPro ? (
            <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-blue-600/10 via-slate-900 to-indigo-600/10 p-6">
              <h3 className="text-xl font-semibold mb-4">Ton activité</h3>

              <ul className="space-y-2 text-sm text-slate-200">
                <li>
                  E-mails améliorés :{" "}
                  <span className="text-slate-300">
                    {emailsImproved === null ? "—" : emailsImproved}
                  </span>
                </li>

                <li>
                  Accès Pro :{" "}
                  <span className="text-slate-300">{statusLabel}</span>
                </li>

                <li>
                  Limite : <span className="text-slate-300">illimitée</span>
                </li>

                {me?.cancel_at_period_end ? (
                  <li className="text-slate-300">⚠️ Renouvellement désactivé</li>
                ) : null}

                {periodEndLabel ? (
                  <li className="text-slate-400 text-xs">
                    Période en cours jusqu’au {periodEndLabel}
                  </li>
                ) : null}
              </ul>

              <p className="mt-4 text-xs text-slate-500">
                Connecté en tant que {userEmail}
              </p>
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

            <button
              onClick={openLegal}
              className="hover:text-slate-300 transition underline underline-offset-4"
            >
              Mentions légales
            </button>
          </div>

          <button
            onClick={() => signOut()}
            className="hover:text-slate-300 transition"
          >
            Se déconnecter
          </button>
        </footer>
      </div>

      {/* CONTACT MODAL */}
      {showContact && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !contactLoading)
              setShowContact(false);
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
                (On utilise ton email de connexion pour te répondre.)
              </p>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
