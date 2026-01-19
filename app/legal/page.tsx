"use client";

import Link from "next/link";

export default function LegalPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-bold mb-8">Mentions légales</h1>

        {/* ÉDITEUR */}
        <section className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Éditeur du site</h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            <strong>MailCoach AI</strong>
            <br />
            Responsable du site : <strong>MailCoach AI</strong>
            <br />
            Statut : <strong>Éditeur particulier</strong>
            <br />
            Localisation : <strong>Bruxelles, Belgique</strong>
            <br />
            Contact :{" "}
            <a
              href="mailto:support@mailcoach.ai"
              className="underline hover:text-slate-200"
            >
              support@mailcoach.ai
            </a>
          </p>
        </section>

        {/* HÉBERGEMENT */}
        <section className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Hébergement</h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Le site est hébergé par :
            <br />
            <strong>Vercel Inc.</strong>
            <br />
            440 N Barranca Ave #4133
            <br />
            Covina, CA 91723
            <br />
            États-Unis
            <br />
            <a
              href="https://vercel.com"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-slate-200"
            >
              https://vercel.com
            </a>
          </p>
        </section>

        {/* RESPONSABILITÉ */}
        <section className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Responsabilité</h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            MailCoach AI est un service en ligne proposant une assistance à la
            rédaction d’e-mails via une extension Chrome intégrée à Gmail.
            <br />
            <br />
            Le service est édité par un particulier et est susceptible de
            générer des revenus. L’activité est actuellement en cours de
            structuration.
            <br />
            <br />
            Les contenus générés par le service restent sous la responsabilité
            de l’utilisateur. L’éditeur ne saurait être tenu responsable de
            l’usage fait des textes produits.
          </p>
        </section>

        {/* DONNÉES PERSONNELLES */}
        <section className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Données personnelles</h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Le site et l’extension peuvent collecter certaines informations
            strictement nécessaires au fonctionnement du service (connexion,
            utilisation de l’extension, statistiques d’usage).
            <br />
            <br />
            Ces données ne sont ni vendues ni cédées à des tiers.
            <br />
            <br />
            Pour plus d’informations, consulte la{" "}
            <Link href="/privacy" className="underline hover:text-slate-200">
              politique de confidentialité
            </Link>
            .
          </p>
        </section>

        {/* PROPRIÉTÉ INTELLECTUELLE */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold mb-2">
            Propriété intellectuelle
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            L’ensemble du site, du code, du design, des contenus et de la marque
            MailCoach AI est protégé par le droit d’auteur et le droit de la
            propriété intellectuelle. Toute reproduction, représentation ou
            exploitation sans autorisation préalable est interdite.
          </p>
        </section>

        {/* RETOUR */}
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-900/40 px-5 py-2 text-sm font-medium text-slate-200 hover:bg-slate-900/70 transition"
        >
          ← Retour à l’accueil
        </Link>
      </div>
    </div>
  );
}
