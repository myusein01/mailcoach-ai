"use client";

import { FormEvent, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const { status } = useSession();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");

  // Si déjà connecté → redirection vers la home
  if (status === "authenticated") {
    router.push("/");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    // Pour l’instant on utilise Google uniquement
    await signIn("google", {
      callbackUrl: "/", // où revenir après login
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
      <div className="w-full max-w-xl rounded-2xl bg-slate-900/90 border border-slate-800 px-8 py-10 shadow-xl">
        <h1 className="text-3xl font-bold mb-2">
          <span className="text-slate-100">MailCoach</span>
          <span className="text-blue-400"> AI</span>
        </h1>
        <p className="text-slate-400 mb-8 text-sm">
          Connecte-toi pour utiliser ton assistant d&apos;e-mails professionnels.
          Aucun mot de passe, juste ton compte Google.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Email
            </label>
            <input
              type="email"
              className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/70 focus:border-blue-500/70"
              placeholder="toi@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Prénom ou pseudo
            </label>
            <input
              type="text"
              className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/70 focus:border-blue-500/70"
              placeholder="Ex: Sarah, Alex..."
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="mt-4 w-full inline-flex items-center justify-center rounded-lg bg-blue-500 hover:bg-blue-500/90 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition"
          >
            🔐 Se connecter avec Google
          </button>
        </form>

        <p className="mt-6 text-[11px] text-slate-500 text-center">
          Tu peux te déconnecter à tout moment depuis le tableau de bord.
        </p>
      </div>
    </div>
  );
}
