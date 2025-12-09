"use client";

import { useState } from "react";

type Mode = "generate" | "improve" | "reply";

export default function EmailForm() {
  const [goal, setGoal] = useState("");
  const [context, setContext] = useState("");
  const [tone, setTone] = useState("professionnel");
  const [language, setLanguage] = useState("français");
  const [type, setType] = useState("prospection");
  const [mode, setMode] = useState<Mode>("generate");
  const [originalEmail, setOriginalEmail] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult("");
    setError("");

    try {
      const res = await fetch("/api/generate-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal,
          context,
          tone,
          language,
          type,
          mode,
          originalEmail,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erreur inconnue.");
      } else if (data.email) {
        setResult(data.email);
      } else {
        setError("Pas de texte généré.");
      }
    } catch {
      setError("Impossible d'appeler le serveur.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Onglets de mode */}
      <div className="flex gap-2 mb-1 text-xs font-medium text-slate-300">
        <button
          type="button"
          onClick={() => setMode("generate")}
          className={`px-3 py-1 rounded-full border text-xs ${
            mode === "generate"
              ? "bg-blue-500 border-blue-400 text-white"
              : "border-slate-700 text-slate-300 bg-slate-900/60"
          }`}
        >
          ✨ Nouveau mail
        </button>
        <button
          type="button"
          onClick={() => setMode("improve")}
          className={`px-3 py-1 rounded-full border text-xs ${
            mode === "improve"
              ? "bg-blue-500 border-blue-400 text-white"
              : "border-slate-700 text-slate-300 bg-slate-900/60"
          }`}
        >
          📈 Améliorer un mail
        </button>
        <button
          type="button"
          onClick={() => setMode("reply")}
          className={`px-3 py-1 rounded-full border text-xs ${
            mode === "reply"
              ? "bg-blue-500 border-blue-400 text-white"
              : "border-slate-700 text-slate-300 bg-slate-900/60"
          }`}
        >
          💬 Répondre à un mail
        </button>
      </div>

      {/* Formulaire */}
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 bg-slate-900/80 border border-slate-800 rounded-xl p-4 md:p-5"
      >
        {/* Zone principale : différente selon le mode */}
        {mode === "generate" && (
          <div className="grid gap-4 md:grid-cols-[2fr,2fr]">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-slate-200 font-medium">
                Objectif de l’email
              </span>
              <textarea
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/70 focus:border-blue-500/70 min-h-[90px]"
                placeholder="Ex: proposer un appel découverte pour présenter mon offre..."
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="text-slate-200 font-medium">
                Contexte (facultatif)
              </span>
              <textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/70 focus:border-blue-500/70 min-h-[90px]"
                placeholder="Ex: la personne a déjà montré de l’intérêt mais hésite sur le prix..."
              />
            </label>
          </div>
        )}

        {(mode === "improve" || mode === "reply") && (
          <div className="grid gap-4 md:grid-cols-[2fr,2fr]">
            <label className="flex flex-col gap-1 text-sm md:col-span-2">
              <span className="text-slate-200 font-medium">
                Email à {mode === "improve" ? "améliorer" : "répondre"}
              </span>
              <textarea
                value={originalEmail}
                onChange={(e) => setOriginalEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/70 focus:border-blue-500/70 min-h-[140px]"
                placeholder="Colle ici l'e-mail original..."
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="text-slate-200 font-medium">
                Objectif (facultatif)
              </span>
              <textarea
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/70 focus:border-blue-500/70 min-h-[80px]"
                placeholder={
                  mode === "improve"
                    ? "Ex: rendre plus concis, plus percutant, plus chaleureux..."
                    : "Ex: accepter la proposition, demander plus d'infos, proposer un appel..."
                }
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
                placeholder="Ex: relation avec la personne, objections, ton souhaité..."
              />
            </label>
          </div>
        )}

        {/* Options communes */}
        <div className="grid gap-3 md:grid-cols-3 text-sm">
          <label className="flex flex-col gap-1">
            <span className="text-slate-200 font-medium">Type</span>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/70 focus:border-blue-500/70"
            >
              <option value="prospection">Prospection</option>
              <option value="relance">Relance</option>
              <option value="reponse">Réponse</option>
              <option value="suivi">Suivi</option>
            </select>
          </label>

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
          {loading ? "Génération en cours..." : "⚡ Générer l’e-mail"}
        </button>

        {error && <div className="text-red-400 text-xs">{error}</div>}
      </form>

      {result && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 md:p-5">
          <h2 className="font-semibold mb-3 text-slate-100 text-lg">
            Email généré :
          </h2>
          <pre className="whitespace-pre-wrap text-sm text-slate-100 bg-slate-950/70 border border-slate-800 rounded-lg p-3 overflow-x-auto">
            {result}
          </pre>
        </div>
      )}
    </div>
  );
}
