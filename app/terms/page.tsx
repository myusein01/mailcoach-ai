export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
          Conditions d’utilisation
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          MailCoach AI — Dernière mise à jour : 27 décembre 2025
        </p>

        <div className="mt-8 space-y-8 text-slate-200">
          <section>
            <h2 className="text-xl font-semibold">1. Objet</h2>
            <p className="mt-2 text-slate-300">
              MailCoach AI est un service permettant d’améliorer la rédaction
              d’e-mails directement dans Gmail via une extension.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">2. Accès au service</h2>
            <p className="mt-2 text-slate-300">
              L’utilisation du service nécessite un compte Google, une connexion
              Internet et l’installation de l’extension MailCoach AI.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">3. Compte utilisateur</h2>
            <p className="mt-2 text-slate-300">
              L’utilisateur est responsable des informations fournies et de
              l’utilisation de son compte.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">4. Utilisation autorisée</h2>
            <ul className="mt-2 list-disc pl-5 text-slate-300 space-y-1">
              <li>Utiliser MailCoach AI uniquement à des fins légales</li>
              <li>Ne pas détourner le service (abus, spam, scraping)</li>
              <li>Ne pas envoyer de contenu illégal via le service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold">5. Limites & abonnements</h2>
            <p className="mt-2 text-slate-300">
              Une version gratuite avec limites d’usage est proposée. Un
              abonnement Pro permet un usage étendu/illimité selon la formule.
              Les paiements sont gérés par Stripe.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">6. Responsabilité</h2>
            <p className="mt-2 text-slate-300">
              MailCoach AI fournit des suggestions d’amélioration. L’utilisateur
              reste entièrement responsable du contenu final envoyé.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">7. Disponibilité</h2>
            <p className="mt-2 text-slate-300">
              Le service peut être modifié, suspendu ou interrompu à tout moment
              pour maintenance ou amélioration.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">8. Résiliation</h2>
            <p className="mt-2 text-slate-300">
              MailCoach AI se réserve le droit de suspendre un compte en cas
              d’abus ou de non-respect des présentes conditions.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">9. Contact</h2>
            <div className="mt-2 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-slate-300">
              <p>📧 support@mailcoach-ai.com</p>
              <p>🌐 https://www.mailcoach-ai.com</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
