// app/onboarding/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type UserProfile = {
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  address: string | null;
  company: string | null;
  title: string | null;
  website: string | null;

  // ✅ Signature Luxury
  logo_url: string | null;
  accent_color: string | null;
  logo_height: number | null;
  signature_enabled: number | null; // 0/1
};

function clean(v: any) {
  if (typeof v !== "string") return "";
  return v.trim();
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function normalizeUrl(u: string) {
  const s = u.trim();
  if (!s) return "";
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  return `https://${s}`;
}

function buildLuxurySignatureHtml(p: {
  first_name: string;
  last_name: string;
  phone: string;
  address: string;
  company: string;
  title: string;
  website: string;
  logo_url: string;
  accent_color: string;
  logo_height: number;
  signature_enabled: boolean;
}) {
  if (!p.signature_enabled) return "";

  const first = clean(p.first_name);
  const last = clean(p.last_name);
  const title = clean(p.title);
  const company = clean(p.company);
  const phone = clean(p.phone);
  const address = clean(p.address);
  const websiteRaw = clean(p.website);

  const fullName = [first, last].filter(Boolean).join(" ").trim();
  const titleCompany = [title, company].filter(Boolean).join(" — ").trim();

  const websiteUrl = websiteRaw ? normalizeUrl(websiteRaw) : "";
  const websiteLabel = websiteRaw ? websiteRaw.replace(/^https?:\/\//i, "") : "";

  const logoUrl = clean(p.logo_url);
  const accent = clean(p.accent_color) || "#C8A24A";
  const logoHeight = Number.isFinite(p.logo_height) ? p.logo_height : 70;

  const hasAny =
    !!fullName || !!titleCompany || !!phone || !!address || !!websiteUrl;
  if (!hasAny && !logoUrl) return "";

  const leftPart = logoUrl
    ? `
      <td style="padding:0 18px 0 0; vertical-align:middle;">
        <img
          src="${escapeHtml(logoUrl)}"
          alt="Logo"
          height="${logoHeight}"
          style="display:block; height:${logoHeight}px; width:auto; border:0; outline:none; text-decoration:none;"
        />
      </td>
      <td style="width:1px; background:${escapeHtml(accent)};">&nbsp;</td>
    `
    : ``;

  const rightPad = logoUrl ? `padding:0 0 0 18px;` : `padding:0;`;

  const infoParts: string[] = [];

  if (fullName) {
    infoParts.push(
      `<div style="font-size:16px; font-weight:700; letter-spacing:0.2px; color:${escapeHtml(
        accent
      )}; line-height:1.2;">${escapeHtml(fullName)}</div>`
    );
  }

  if (titleCompany) {
    infoParts.push(
      `<div style="font-size:12.5px; line-height:1.35; margin-top:2px; color:#2B2B2B;">${escapeHtml(
        titleCompany
      )}</div>`
    );
  }

  if (phone || websiteUrl || address) {
    infoParts.push(`<div style="height:10px; line-height:10px;">&nbsp;</div>`);
  }

  if (phone) {
    infoParts.push(
      `<div style="font-size:12.5px; line-height:1.5; color:#2B2B2B;">
        <span style="color:#7A7A7A;">☎</span><span style="margin-left:6px;">${escapeHtml(
          phone
        )}</span>
      </div>`
    );
  }

  if (websiteUrl && websiteLabel) {
    infoParts.push(
      `<div style="font-size:12.5px; line-height:1.5; color:#2B2B2B;">
        <span style="color:#7A7A7A;">🌐</span>
        <span style="margin-left:6px;">
          <a href="${escapeHtml(
            websiteUrl
          )}" style="color:#2B2B2B; text-decoration:none;">${escapeHtml(
            websiteLabel
          )}</a>
        </span>
      </div>`
    );
  }

  if (address) {
    const safe = escapeHtml(address).replace(/\n/g, "<br />");
    infoParts.push(
      `<div style="font-size:12.5px; line-height:1.5; margin-top:2px; color:#2B2B2B;">${safe}</div>`
    );
  }

  return `
<table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
  <tr>
    ${leftPart}
    <td style="${rightPad} vertical-align:middle; font-family:Arial, Helvetica, sans-serif; color:#2B2B2B;">
      ${infoParts.join("\n")}
    </td>
  </tr>
</table>
  `.trim();
}

export default function OnboardingPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // champs existants
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [company, setCompany] = useState("");
  const [title, setTitle] = useState("");
  const [website, setWebsite] = useState("");

  // ✅ nouveaux champs signature
  const [logoUrl, setLogoUrl] = useState("");
  const [accentColor, setAccentColor] = useState("#C8A24A");
  const [logoHeight, setLogoHeight] = useState(70);
  const [signatureEnabled, setSignatureEnabled] = useState(true);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/user-profile", { method: "GET" });
        const data = await res.json().catch(() => null);

        if (!mounted) return;

        if (!res.ok) {
          setError(data?.error || "Erreur lors du chargement du profil.");
          setLoading(false);
          return;
        }

        const p: UserProfile | null = data?.profile ?? null;

        setFirstName(p?.first_name ?? "");
        setLastName(p?.last_name ?? "");
        setPhone(p?.phone ?? "");
        setAddress(p?.address ?? "");
        setCompany(p?.company ?? "");
        setTitle(p?.title ?? "");
        setWebsite(p?.website ?? "");

        // ✅ signature
        setLogoUrl(p?.logo_url ?? "");
        setAccentColor(p?.accent_color ?? "#C8A24A");
        setLogoHeight(
          typeof p?.logo_height === "number" && Number.isFinite(p.logo_height)
            ? p.logo_height
            : 70
        );
        setSignatureEnabled((p?.signature_enabled ?? 1) !== 0);

        setLoading(false);
      } catch (e) {
        console.error(e);
        if (!mounted) return;
        setError("Erreur réseau.");
        setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const previewHtml = useMemo(() => {
    return buildLuxurySignatureHtml({
      first_name: firstName,
      last_name: lastName,
      phone,
      address,
      company,
      title,
      website,
      logo_url: logoUrl,
      accent_color: accentColor,
      logo_height: logoHeight,
      signature_enabled: signatureEnabled,
    });
  }, [
    firstName,
    lastName,
    phone,
    address,
    company,
    title,
    website,
    logoUrl,
    accentColor,
    logoHeight,
    signatureEnabled,
  ]);

  async function save() {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/user-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          phone,
          address,
          company,
          title,
          website,

          // ✅ signature
          logo_url: logoUrl,
          accent_color: accentColor,
          logo_height: logoHeight,
          signature_enabled: signatureEnabled ? 1 : 0,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data?.error || "Erreur lors de l’enregistrement.");
        setSaving(false);
        return;
      }

      router.push("/");
    } catch (e) {
      console.error(e);
      setError("Erreur réseau.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-50">
        Chargement…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto max-w-4xl px-4 py-14">
        <h1 className="text-4xl font-bold tracking-tight mb-3">Ta signature</h1>
        <p className="text-slate-300 mb-10">
          Ces infos peuvent être ajoutées automatiquement en fin de mail (signature).
          <br />
          Remplis uniquement ce que tu veux afficher.
        </p>

        <div className="grid gap-6 md:grid-cols-2">
          {/* FORM */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
            <div className="grid grid-cols-2 gap-3">
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Prénom"
                className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Nom"
                className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Téléphone"
              className="mt-3 w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Adresse (tu peux mettre plusieurs lignes)"
              className="mt-3 w-full min-h-[90px] rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <div className="mt-3 grid grid-cols-2 gap-3">
              <input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Entreprise"
                className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Poste"
                className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <input
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="Site web (ex: luxury-apartments.com)"
              className="mt-3 w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <div className="mt-8 border-t border-slate-800 pt-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">Template “Luxury”</div>
                  <div className="text-xs text-slate-400 mt-1">
                    Logo + barre verticale + infos (style carte).
                  </div>
                </div>

                <label className="flex items-center gap-2 text-sm text-slate-200">
                  <input
                    type="checkbox"
                    checked={signatureEnabled}
                    onChange={(e) => setSignatureEnabled(e.target.checked)}
                    className="h-4 w-4"
                  />
                  Activer
                </label>
              </div>

              <input
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="Logo URL (https://...)"
                className="mt-3 w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <div className="mt-3 grid grid-cols-2 gap-3">
                <input
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  placeholder="#C8A24A"
                  className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                <input
                  type="number"
                  value={logoHeight}
                  onChange={(e) => setLogoHeight(Number(e.target.value || 70))}
                  placeholder="Hauteur logo (px)"
                  className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <p className="mt-2 text-[11px] text-slate-500">
                Astuce : le logo doit être une URL publique HTTPS (PNG/JPG).
              </p>
            </div>

            {error ? (
              <div className="mt-4 text-sm text-red-300">{error}</div>
            ) : null}

            <div className="mt-6 flex gap-3">
              <button
                onClick={save}
                disabled={saving}
                className="inline-flex flex-1 items-center justify-center rounded-xl bg-blue-500 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-500/90 disabled:opacity-60 transition"
              >
                {saving ? "Enregistrement…" : "Enregistrer"}
              </button>

              <button
                onClick={() => router.push("/")}
                disabled={saving}
                className="inline-flex flex-1 items-center justify-center rounded-xl border border-slate-700 bg-slate-900/40 px-5 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-900/70 disabled:opacity-60 transition"
              >
                Passer
              </button>
            </div>

            <p className="mt-3 text-xs text-slate-500">
              Tu pourras modifier ça plus tard depuis la page d’accueil.
            </p>
          </div>

          {/* PREVIEW */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
            <h2 className="text-lg font-semibold mb-3">Aperçu</h2>

            <div className="rounded-xl border border-slate-800 bg-white p-5">
              {previewHtml ? (
                <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
              ) : (
                <div className="text-sm text-slate-600">
                  Remplis au moins un champ (nom / tel / site / adresse / logo) pour voir
                  l’aperçu.
                </div>
              )}
            </div>

            <div className="mt-5 text-xs text-slate-400">
              L’aperçu ci-dessus correspond à ce qui sera inséré en fin de mail (Gmail).
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
