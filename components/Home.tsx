"use client";

import { useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import EmailForm from "./EmailForm";

export default function Home() {
  const { data: session, status } = useSession();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");

  if (status === "loading") {
    return (
      <div className="text-slate-200 text-sm">Chargement de la session...</div>
    );
  }

  // Pas connecté => écran de connexion
  if (!session) {
    return (
      <div className="max-w-xl w-full mx-auto bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <h1 className="text-3xl font-bold text-slate-50 mb-2">
          MailCoach <span className="text-blue-400">AI</span>
        </h1>
        <p className="text-slate-300 text-sm mb-6">
          Connecte-toi pour utiliser ton assistant d&apos;e-mails
          professionnels. Aucun mot de passe, juste ton e-mail.
        </p>

        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            await signIn("credentials", {
              email,
              name,
              redirect: false,
            });
          }}
        >
          <div className="flex flex-col gap-1 text-sm">
            <label className="text-slate-200 font-medium">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/70 focus:border-blue-500/70"
              placeholder="toi@exemple.com"
            />
          </div>

          <div className="flex flex-col gap-1 text-sm">
            <label className="text-slate-200 font-medium">Prénom ou pseudo</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/70 focus:border-blue-500/70"
              placeholder="Ex: Sarah, Alex..."
            />
          </div>

          <button
            type="submit"
            className="w-full inline-flex items-center justify-center rounded-lg bg-blue-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-500/90 transition"
          >
            🔐 Se connecter
          </button>

          <p className="text-xs text-slate-500 text-center">
            Tu peux te déconnecter à tout moment depuis le tableau de bord.
          </p>
        </form>
      </div>
    );
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
