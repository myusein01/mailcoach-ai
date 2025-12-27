"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type FormState = {
  first_name: string;
  last_name: string;
  phone: string;
  address: string;
  company: string;
  title: string;
  website: string;
};

export default function OnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<FormState>({
    first_name: "",
    last_name: "",
    phone: "",
    address: "",
    company: "",
    title: "",
    website: "",
  });

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/user-profile", { method: "GET" });
      const data = await res.json().catch(() => null);

      if (res.ok && data?.profile) {
        setForm({
          first_name: data.profile.first_name ?? "",
          last_name: data.profile.last_name ?? "",
          phone: data.profile.phone ?? "",
          address: data.profile.address ?? "",
          company: data.profile.company ?? "",
          title: data.profile.title ?? "",
          website: data.profile.website ?? "",
        });
      }

      setLoading(false);
    })();
  }, []);

  const set =
    (key: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((p) => ({ ...p, [key]: e.target.value }));
    };

  const save = async () => {
    setSaving(true);
    const res = await fetch("/api/user-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);

    if (!res.ok) {
      alert(data?.error ?? "Erreur lors de la sauvegarde du profil.");
      return;
    }

    router.push("/");
  };

  // ✅ "Passer" = on enregistre un profil vide
  // (comme ça Home ne redirige plus + aucune signature)
  const skip = async () => {
    setSaving(true);
    const res = await fetch("/api/user-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        first_name: "",
        last_name: "",
        phone: "",
        address: "",
        company: "",
        title: "",
        website: "",
      }),
    });
    setSaving(false);

    if (!res.ok) {
      alert("Erreur lors du passage.");
      return;
    }

    router.push("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-50">
        Chargement…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto max-w-xl px-4 py-12">
        <h1 className="text-3xl font-bold mb-2">Ta signature</h1>
        <p className="text-slate-300 mb-8">
          Ces infos peuvent être ajoutées automatiquement en fin de mail (signature).
          Remplis uniquement ce que tu veux afficher.
        </p>

        <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <div className="grid grid-cols-2 gap-3">
            <input
              className="rounded-xl bg-slate-950/40 border border-slate-800 px-3 py-2 outline-none"
              placeholder="Prénom"
              value={form.first_name}
              onChange={set("first_name")}
            />
            <input
              className="rounded-xl bg-slate-950/40 border border-slate-800 px-3 py-2 outline-none"
              placeholder="Nom"
              value={form.last_name}
              onChange={set("last_name")}
            />
          </div>

          <input
            className="w-full rounded-xl bg-slate-950/40 border border-slate-800 px-3 py-2 outline-none"
            placeholder="Téléphone"
            value={form.phone}
            onChange={set("phone")}
          />

          <input
            className="w-full rounded-xl bg-slate-950/40 border border-slate-800 px-3 py-2 outline-none"
            placeholder="Adresse"
            value={form.address}
            onChange={set("address")}
          />

          <div className="grid grid-cols-2 gap-3">
            <input
              className="rounded-xl bg-slate-950/40 border border-slate-800 px-3 py-2 outline-none"
              placeholder="Entreprise"
              value={form.company}
              onChange={set("company")}
            />
            <input
              className="rounded-xl bg-slate-950/40 border border-slate-800 px-3 py-2 outline-none"
              placeholder="Poste"
              value={form.title}
              onChange={set("title")}
            />
          </div>

          <input
            className="w-full rounded-xl bg-slate-950/40 border border-slate-800 px-3 py-2 outline-none"
            placeholder="Site web"
            value={form.website}
            onChange={set("website")}
          />

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={save}
              disabled={saving}
              className="w-full rounded-xl bg-blue-600 px-4 py-2 font-semibold hover:bg-blue-500 disabled:opacity-60"
            >
              {saving ? "Sauvegarde…" : "Enregistrer"}
            </button>

            <button
              onClick={skip}
              disabled={saving}
              className="w-full rounded-xl bg-slate-800 px-4 py-2 font-semibold hover:bg-slate-700 disabled:opacity-60"
            >
              Passer
            </button>
          </div>

          <p className="text-xs text-slate-400">
            Tu pourras modifier ça plus tard depuis la page d’accueil.
          </p>
        </div>
      </div>
    </div>
  );
}
