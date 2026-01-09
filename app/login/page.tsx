"use client";

import { FormEvent, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") router.replace("/");
  }, [status, router]);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    await signIn("google", { callbackUrl: "/" });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
      <div className="w-full max-w-xl rounded-2xl bg-slate-900/90 border border-slate-800 px-8 py-10 shadow-xl">
        <h1 className="text-3xl font-bold mb-2">
          <span className="text-slate-100">MailCoach</span>
          <span className="text-blue-400"> AI</span>
        </h1>

        <p className="text-slate-400 mb-8 text-sm">
          Connecte-toi avec Google pour utiliser ton assistant d’e-mails professionnels.
        </p>

        <button
          onClick={handleLogin}
          className="w-full inline-flex items-center justify-center rounded-lg bg-blue-500 hover:bg-blue-500/90 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition"
        >
          🔐 Se connecter avec Google
        </button>

        <p className="mt-6 text-[11px] text-slate-500 text-center">
          Aucun mot de passe requis. Authentification 100% sécurisée via Google.
        </p>
      </div>
    </div>
  );
}
