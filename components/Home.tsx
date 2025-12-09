"use client";

import { useSession, signOut } from "next-auth/react";
import EmailForm from "./EmailForm";

export default function Home() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="text-slate-200 text-sm">
        Chargement de la session...
      </div>
    );
  }

  // Normalement, on ne passe ici que si on est connecté
  if (!session) {
    return null; // sécurité, mais la redirection est déjà faite côté serveur
  }

  // Connecté => app complète
  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-50">
            MailCoach <span className="text-blue-400">AI</span>
          </h1>
          <p className="text-slate-300 text-sm md:text-base mt-1">
            Salut {session.user?.name || session.user?.email}, je rédige tes
            e-mails pros pour toi.
          </p>
        </div>

        <button
          onClick={() => signOut()}
          className="text-xs md:text-sm px-3 py-1.5 rounded-full border border-slate-700 text-slate-300 hover:bg-slate-800/60 transition"
        >
          🚪 Se déconnecter
        </button>
      </div>

      <EmailForm />

      <p className="mt-4 text-center text-[11px] text-slate-500">
        Connecté en tant que {session.user?.email}
      </p>
    </div>
  );
}
