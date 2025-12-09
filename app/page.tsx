"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Home from "@/components/Home";

export default function Page() {
  const { status } = useSession();
  const router = useRouter();

  // Pas connecté → redirection vers /login
  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  // Pendant le chargement de la session
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center">
        Chargement...
      </div>
    );
  }

  // Connecté → afficher l'app
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 flex items-start justify-center py-10">
      <Home />
    </main>
  );
}
