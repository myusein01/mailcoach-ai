"use client";

import { useState } from "react";

export default function EmailForm() {
  const [originalEmail, setOriginalEmail] = useState("");
  const [goal, setGoal] = useState("");
  const [context, setContext] = useState("");
  const [tone, setTone] = useState("professionnel");
  const [language, setLanguage] = useState("français");

  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult("");
    setError("");

    try {
      // Ici on utilise /api/improve-email et non generate-email
      const res = await fetch("/api/improve-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: originalEmail,
          subject: "", // optionnel, tu peux ajouter un input sujet si tu veux
          // (optionnel) tu peux aussi transmettre goal/context/tone/lang si tu adaptes l'API
          goal,
          context,
          tone,
          language,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erreur inconnue.");
      } else {
        // ton API improve renvoie {subject, body}
        setResult(data.body || "");
      }
    } catch {
      setError("Impossible d'appeler le serveur.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="text-xs text-slate-400">
        (Optionnel) Page web de secours. Le vrai produit est dans l’extension
        Gmail.
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 bg-slate-900/80 border border-slate-800 rounded-xl p-4 md:p-5"
      >
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-slate-200 font-medium">Email à améliorer</span>
          <textarea
            value={originalEmail}
            onChange={(e) => setOriginalEmail(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/70 focus:border-blue-500/70 min-h-[160px]"
            placeholder="Colle ici ton email…"
          />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-200 font-medium">
              Objectif (facultatif)
            </span>
            <textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/70 focus:border-blue-500/70 min-h-[80px]"
              placeholder="Ex: plus concis, plus vendeur, plus chaleureux…"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-200 font-medium">
              Contexte (facultatif)
            </span>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/70 focus:border-blue-500/70 min-h-[80px]"
              placeholder="Ex: relation avec la personne, objections, etc."
            />
          </label>
        </div>

        <div className="grid gap-3 md:grid-cols-2 text-sm">
          <label className="flex flex-col gap-1">
            <span className="text-slate-200 font-medium">Ton</span>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/70 focus:border-blue-500/70"
            >
              <option value="professionnel">Professionnel</option>
              <option value="convivial">Convivial</option>
              <option value="direct">Direct</option>
              <option value="formel">Formel</option>
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-slate-200 font-medium">Langue</span>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/70 focus:border-blue-500/70"
            >
              <option value="français">Français</option>
              <option value="anglais">Anglais</option>
            </select>
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center justify-center rounded-lg bg-blue-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-500/90 disabled:opacity-60 disabled:cursor-not-allowed transition"
        >
          {loading ? "Amélioration..." : "✨ Améliorer l’e-mail"}
        </button>

        {error && <div className="text-red-400 text-xs">{error}</div>}
      </form>

      {result && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 md:p-5">
          <h2 className="font-semibold mb-3 text-slate-100 text-lg">
            Version améliorée :
          </h2>
          <pre className="whitespace-pre-wrap text-sm text-slate-100 bg-slate-950/70 border border-slate-800 rounded-lg p-3 overflow-x-auto">
            {result}
          </pre>
        </div>
      )}
    </div>
  );
}
