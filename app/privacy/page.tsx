export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
          Politique de confidentialité
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          MailCoach AI — Dernière mise à jour : 27 décembre 2025
        </p>

        <div className="mt-8 space-y-8 text-slate-200">
          <section>
            <h2 className="text-xl font-semibold">1. Introduction</h2>
            <p className="mt-2 text-slate-300">
              MailCoach AI respecte la vie privée de ses utilisateurs. Cette page
              explique quelles données sont collectées, pourquoi, et comment
              elles sont utilisées lorsque vous utilisez le site web et
              l’extension MailCoach AI.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">2. Données collectées</h2>
            <ul className="mt-2 list-disc pl-5 text-slate-300 space-y-1">
              <li>Adresse e-mail (via connexion Google)</li>
              <li>Nom (si fourni par l’utilisateur)</li>
              <li>Contenu des e-mails soumis à amélioration</li>
              <li>Informations de profil optionnelles (signature : nom, téléphone, etc.)</li>
              <li>Informations d’abonnement (statut Stripe, identifiants Stripe)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold">3. Utilisation des données</h2>
            <p className="mt-2 text-slate-300">
              Les données sont utilisées uniquement pour :
            </p>
            <ul className="mt-2 list-disc pl-5 text-slate-300 space-y-1">
              <li>Améliorer et reformuler les e-mails</li>
              <li>Gérer les comptes utilisateurs et abonnements</li>
              <li>Appliquer les limites d’usage (Free / Pro)</li>
              <li>Ajouter une signature personnalisée si configurée</li>
              <li>Fournir le support client</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold">4. Contenu des e-mails</h2>
            <p className="mt-2 text-slate-300">
              Le contenu des e-mails est traité uniquement à la demande de
              l’utilisateur afin de produire une amélioration immédiate. Il
              n’est pas utilisé à des fins publicitaires.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">5. Partage des données</h2>
            <p className="mt-2 text-slate-300">
              Aucune donnée personnelle n’est vendue. Certaines données peuvent
              être transmises uniquement aux prestataires nécessaires au
              fonctionnement :
            </p>
            <ul className="mt-2 list-disc pl-5 text-slate-300 space-y-1">
              <li>OpenAI (amélioration de texte)</li>
              <li>Stripe (paiement et gestion d’abonnement)</li>
              <li>Obligations légales si nécessaire</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold">6. Sécurité</h2>
            <p className="mt-2 text-slate-300">
              Des mesures techniques raisonnables sont mises en place pour
              protéger les données contre l’accès non autorisé.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">7. Vos droits</h2>
            <ul className="mt-2 list-disc pl-5 text-slate-300 space-y-1">
              <li>Accéder à vos données</li>
              <li>Modifier votre profil</li>
              <li>Demander la suppression de votre compte</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold">8. Contact</h2>
            <p className="mt-2 text-slate-300">
              Pour toute question :
            </p>
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
