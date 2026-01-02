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
  signature_enabled: number | null;
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

// ✅ ajout: validation simple hex (pour champ code couleur)
function normalizeHex(input: string) {
  const raw = (input || "").trim();
  if (!raw) return "";
  const v = raw.startsWith("#") ? raw : `#${raw}`;
  if (/^#[0-9a-fA-F]{6}$/.test(v)) return v;
  if (/^#[0-9a-fA-F]{3}$/.test(v)) return v;
  return "";
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
}) {
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

  // ✅ MODIF: téléphone aligné (même logique que website)
  if (phone) {
    infoParts.push(
      `<table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse; margin:0;">
        <tr>
          <td style="padding-right:6px; vertical-align:middle; line-height:0;">
            <span style="font-size:12px; color:#7A7A7A; display:inline-block; vertical-align:middle;">☎</span>
          </td>
          <td style="font-size:12.5px; line-height:1.2; color:#2B2B2B; vertical-align:middle;">
            ${escapeHtml(phone)}
          </td>
        </tr>
      </table>`
    );
  }

  // ✅ MODIF: website aligné + icône GRISE (pas bleue)
  if (websiteUrl && websiteLabel) {
    infoParts.push(
      `<table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse; margin-top:2px;">
        <tr>
          <td style="padding-right:6px; font-size:12px; color:#7A7A7A; vertical-align:middle;">
            🔗
          </td>
          <td style="font-size:12.5px; line-height:1.2; color:#2B2B2B; vertical-align:middle;">
            <a
              href="${escapeHtml(websiteUrl)}"
              style="color:#2B2B2B; text-decoration:none; display:inline-block; vertical-align:middle; line-height:1.2;"
            >
              ${escapeHtml(websiteLabel)}
            </a>
          </td>
        </tr>
      </table>`
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

const COLOR_PRESETS = [
  { name: "Or", value: "#C8A24A" },
  { name: "Bleu", value: "#2563EB" },
  { name: "Noir", value: "#111827" },
  { name: "Vert", value: "#16A34A" },
  { name: "Violet", value: "#7C3AED" },
  { name: "Rouge", value: "#DC2626" },
  { name: "Rose", value: "#DB2777" },
  { name: "Gris", value: "#6B7280" },
];

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

  // ✅ signature (toujours activée)
  const [logoUrl, setLogoUrl] = useState("");
  const [accentColor, setAccentColor] = useState("#C8A24A");
  // ✅ ajout: input code couleur (sync avec accentColor)
  const [accentInput, setAccentInput] = useState("#C8A24A");
  const [logoHeight, setLogoHeight] = useState(70);

  // upload logo
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

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
        const acc = p?.accent_color ?? "#C8A24A";
        setAccentColor(acc);
        setAccentInput(acc);
        setLogoHeight(
          typeof p?.logo_height === "number" && Number.isFinite(p.logo_height)
            ? p.logo_height
            : 70
        );

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
  ]);

  async function onPickLogo(file: File | null) {
    if (!file) return;
    setUploadError(null);

    // petites validations client
    if (!/^image\/(png|jpe?g|webp)$/i.test(file.type)) {
      setUploadError("Format non supporté. Utilise PNG, JPG ou WEBP.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setUploadError("Fichier trop lourd (max 2MB).");
      return;
    }

    setUploadingLogo(true);
    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch("/api/upload-logo", {
        method: "POST",
        body: fd,
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setUploadError(data?.error || "Upload impossible.");
        return;
      }

      if (typeof data?.url === "string" && data.url) {
        setLogoUrl(data.url);
      } else {
        setUploadError("Upload OK mais URL manquante.");
      }
    } catch (e) {
      console.error(e);
      setUploadError("Erreur réseau pendant l’upload.");
    } finally {
      setUploadingLogo(false);
    }
  }

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

          // ✅ signature (toujours activée)
          logo_url: logoUrl,
          accent_color: accentColor,
          logo_height: logoHeight,
          signature_enabled: 1,
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
          Ces infos seront ajoutées automatiquement en fin de mail (signature).
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
              <div className="text-sm font-semibold">Template “Luxury”</div>
              <div className="text-xs text-slate-400 mt-1">
                Logo + barre verticale + infos (style carte).
              </div>

              {/* ✅ Upload logo */}
              <div className="mt-4">
                <div className="text-xs text-slate-300 mb-2">Logo (fichier)</div>

                <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 cursor-pointer hover:bg-slate-800/80 transition">
                  <span className="truncate">
                    {uploadingLogo
                      ? "Upload en cours…"
                      : logoUrl
                      ? "Logo uploadé ✅ (clique pour remplacer)"
                      : "Choisir un fichier (PNG/JPG/WEBP)"}
                  </span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    className="hidden"
                    disabled={uploadingLogo}
                    onChange={(e) =>
                      onPickLogo(e.target.files?.[0] ?? null).finally(() => {
                        if (e.currentTarget) e.currentTarget.value = "";
                      })
                    }
                  />
                </label>

                {uploadError ? (
                  <div className="mt-2 text-xs text-red-300">{uploadError}</div>
                ) : null}

                <p className="mt-2 text-[11px] text-slate-500">
                  Max 2MB. Format PNG/JPG/WEBP.
                </p>
              </div>

              {/* ✅ Choix couleur preset */}
              <div className="mt-5">
                <div className="text-xs text-slate-300 mb-2">
                  Couleur de la barre
                </div>
                <div className="flex flex-wrap gap-2">
                  {COLOR_PRESETS.map((c) => {
                    const active =
                      accentColor.toLowerCase() === c.value.toLowerCase();
                    return (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => {
                          setAccentColor(c.value);
                          setAccentInput(c.value);
                        }}
                        className={
                          active
                            ? "flex items-center gap-2 rounded-xl border border-slate-500 bg-slate-800 px-3 py-2 text-xs text-slate-100"
                            : "flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/40 px-3 py-2 text-xs text-slate-200 hover:bg-slate-900/70 transition"
                        }
                        title={c.value}
                      >
                        <span
                          className="inline-block h-3 w-3 rounded-full"
                          style={{ background: c.value }}
                        />
                        {c.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ✅ ajout: code couleur juste en dessous */}
              <div className="mt-3">
                <div className="text-xs text-slate-300 mb-2">
                  Code couleur (hex)
                </div>
                <div className="flex items-center gap-2">
                  <input
                    value={accentInput}
                    onChange={(e) => {
                      const v = e.target.value;
                      setAccentInput(v);
                      const hex = normalizeHex(v);
                      if (hex) setAccentColor(hex);
                    }}
                    placeholder="#C8A24A"
                    className="flex-1 rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div
                    className="h-10 w-12 rounded-xl border border-slate-700"
                    style={{ background: accentColor }}
                    title={accentColor}
                  />
                </div>
                <p className="mt-2 text-[11px] text-slate-500">
                  Exemple : #2563EB
                </p>
              </div>

              {/* ✅ Taille clairement indiquée */}
              <div className="mt-5">
                <div className="text-xs text-slate-300 mb-2">
                  Taille du logo (hauteur en pixels)
                </div>
                <input
                  type="number"
                  value={logoHeight}
                  min={30}
                  max={140}
                  onChange={(e) => setLogoHeight(Number(e.target.value || 70))}
                  className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="mt-2 text-[11px] text-slate-500">
                  Recommandé : 60 à 90px.
                </p>
              </div>
            </div>

            {error ? (
              <div className="mt-4 text-sm text-red-300">{error}</div>
            ) : null}

            <div className="mt-6 flex gap-3">
              <button
                onClick={save}
                disabled={saving || uploadingLogo}
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
                  Remplis au moins un champ (nom / tel / site / adresse / logo)
                  pour voir l’aperçu.
                </div>
              )}
            </div>

            <div className="mt-5 text-xs text-slate-400">
              L’aperçu ci-dessus correspond à ce qui sera inséré en fin de mail
              (Gmail).
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
