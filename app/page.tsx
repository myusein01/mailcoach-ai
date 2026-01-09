"use client";

import Home from "@/components/Home";
import { useSession } from "next-auth/react";

export default function Page() {
  const { status } = useSession();

  // Pendant le chargement de la session
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center">
        Chargement...
      </div>
    );
  }

  // ✅ Plus de redirect: on affiche Home dans tous les cas
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 flex items-start justify-center py-10">
      <Home />
    </main>
  );
}
