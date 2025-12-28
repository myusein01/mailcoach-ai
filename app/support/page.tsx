// app/support/page.tsx

import Link from "next/link";

export const metadata = {
  title: "Support — MailCoach AI",
  description:
    "Support MailCoach AI : aide, questions fréquentes et contact.",
};

export default function SupportPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <Link
          href="/"
          className="text-slate-300 hover:text-slate-100 transition"
        >
          ← Retour
        </Link>

        <h1 className="mt-6 text-3xl font-bold">Support MailCoach AI</h1>
        <p className="mt-3 text-slate-300">
          Besoin d’aide ? On est là pour toi.
        </p>

        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="text-lg font-semibold">Nous contacter</h2>

          <ul className="mt-3 space-y-2 text-slate-200">
            <li>
              📩 Email :{" "}
              <a
                className="text-blue-300 hover:text-blue-200 underline"
                href="mailto:support@mailcoach-ai.com"
              >
                support@mailcoach-ai.com
              </a>
            </li>
            <li className="text-slate-300 text-sm">
              Temps de réponse habituel : 24 à 48h.
            </li>
          </ul>

          <div className="mt-6 border-t border-slate-800 pt-4 text-sm text-slate-300">
            Astuce : si tu as un souci dans Gmail, indique le navigateur (Chrome),
            et copie/colle le message d’erreur si tu en as un.
          </div>
        </div>

        <footer className="mt-10 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} MailCoach AI
        </footer>
      </div>
    </main>
  );
}
