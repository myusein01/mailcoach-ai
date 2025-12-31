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
  const websiteLabel = websiteRaw
    ? websiteRaw.replace(/^https?:\/\//i, "").replace(/^www\./i, "")
    : "";

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
    style="display:block; height:${logoHeight}px; width:auto; border:0;"
  />
</td>
<td style="width:2px; background:${escapeHtml(accent)};"></td>
`
    : ``;

  const rightPad = logoUrl ? `padding:0 0 0 18px;` : `padding:0;`;

  const rows: string[] = [];

  if (fullName) {
    rows.push(`
<div style="font-size:16px; font-weight:700; color:${escapeHtml(
      accent
    )}; line-height:1.2;">
  ${escapeHtml(fullName)}
</div>
`);
  }

  if (titleCompany) {
    rows.push(`
<div style="font-size:12.5px; color:#2B2B2B; line-height:1.4; margin-top:2px;">
  ${escapeHtml(titleCompany)}
</div>
`);
  }

  if (phone || websiteUrl || address) {
    rows.push(`<div style="height:8px;"></div>`);
  }

  if (phone) {
    rows.push(`
<table cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
  <tr>
    <td style="padding-right:6px; vertical-align:middle; line-height:0;">
      <span style="font-size:12px; color:#9CA3AF; display:inline-block; vertical-align:middle;">☎</span>
    </td>
    <td style="font-size:12.5px; color:#2B2B2B; vertical-align:middle; line-height:1.2; padding:0;">
      ${escapeHtml(phone)}
    </td>
  </tr>
</table>
`);
  }

  // ✅ Nouveau logo "website" + alignement propre (plus de décalage)
  if (websiteUrl && websiteLabel) {
    rows.push(`
<table cellpadding="0" cellspacing="0" style="border-collapse:collapse; margin-top:2px;">
  <tr>
    <td style="padding-right:6px; vertical-align:middle; line-height:0;">
      <img
        src="https://api.iconify.design/mdi/web.svg?color=%239CA3AF"
        width="12"
        height="12"
        alt="Website"
        style="display:block; border:0;"
      />
    </td>
    <td style="font-size:12.5px; vertical-align:middle; line-height:1.2; padding:0;">
      <a
        href="${escapeHtml(websiteUrl)}"
        style="color:#2B2B2B; text-decoration:none; display:inline-block; vertical-align:middle; line-height:1.2;"
      >
        ${escapeHtml(websiteLabel)}
      </a>
    </td>
  </tr>
</table>
`);
  }

  if (address) {
    rows.push(`
<div style="font-size:12.5px; color:#2B2B2B; line-height:1.4; margin-top:2px;">
  ${escapeHtml(address).replace(/\n/g, "<br />")}
</div>
`);
  }

  return `
<table cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
  <tr>
    ${leftPart}
    <td style="${rightPad} vertical-align:middle; font-family:Arial, Helvetica, sans-serif;">
      ${rows.join("\n")}
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

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [company, setCompany] = useState("");
  const [title, setTitle] = useState("");
  const [website, setWebsite] = useState("");

  const [logoUrl, setLogoUrl] = useState("");
  const [accentColor, setAccentColor] = useState("#C8A24A");
  const [logoHeight, setLogoHeight] = useState(70);

  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const res = await fetch("/api/user-profile");
        const data = await res.json();

        if (!mounted) return;

        const p: UserProfile | null = data?.profile ?? null;

        setFirstName(p?.first_name ?? "");
        setLastName(p?.last_name ?? "");
        setPhone(p?.phone ?? "");
        setAddress(p?.address ?? "");
        setCompany(p?.company ?? "");
        setTitle(p?.title ?? "");
        setWebsite(p?.website ?? "");

        setLogoUrl(p?.logo_url ?? "");
        setAccentColor(p?.accent_color ?? "#C8A24A");
        setLogoHeight(typeof p?.logo_height === "number" ? p.logo_height : 70);

        setLoading(false);
      } catch {
        if (!mounted) return;
        setError("Erreur réseau.");
        setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const previewHtml = useMemo(
    () =>
      buildLuxurySignatureHtml({
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
      }),
    [
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
    ]
  );

  async function onPickLogo(file: File | null) {
    if (!file) return;
    setUploadError(null);

    if (!/^image\/(png|jpe?g|webp)$/i.test(file.type)) {
      setUploadError("Format non supporté.");
      return;
    }

    setUploadingLogo(true);
    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch("/api/upload-logo", { method: "POST", body: fd });
      const data = await res.json();

      if (!res.ok) {
        setUploadError(data?.error || "Upload impossible.");
        return;
      }

      if (data?.url) setLogoUrl(data.url);
    } catch {
      setUploadError("Erreur réseau.");
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
          logo_url: logoUrl,
          accent_color: accentColor,
          logo_height: logoHeight,
          signature_enabled: 1,
        }),
      });

      if (!res.ok) {
        setError("Erreur lors de l’enregistrement.");
        setSaving(false);
        return;
      }

      router.push("/");
    } catch {
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
        <h1 className="text-4xl font-bold mb-3">Ta signature</h1>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Prénom"
              className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-sm"
            />

            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Nom"
              className="mt-3 w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-sm"
            />

            <input
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="Site web"
              className="mt-3 w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-sm"
            />

            <div className="mt-6">
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => onPickLogo(e.target.files?.[0] ?? null)}
              />
              {uploadError && (
                <div className="mt-2 text-sm text-red-300">{uploadError}</div>
              )}
              {uploadingLogo && (
                <div className="mt-2 text-sm text-slate-300">
                  Upload en cours…
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setAccentColor(c.value)}
                  className="rounded-xl border border-slate-700 px-3 py-1 text-xs"
                >
                  {c.name}
                </button>
              ))}
            </div>

            <div className="mt-4">
              <input
                type="number"
                value={logoHeight}
                min={30}
                max={140}
                onChange={(e) => setLogoHeight(Number(e.target.value))}
                className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-sm"
              />
            </div>

            {error && <div className="mt-4 text-red-300">{error}</div>}

            <button
              onClick={save}
              disabled={saving}
              className="mt-6 w-full rounded-xl bg-blue-500 py-3 text-sm font-semibold"
            >
              Enregistrer
            </button>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
            <h2 className="text-lg font-semibold mb-3">Aperçu</h2>

            <div className="rounded-xl bg-white p-5">
              {previewHtml ? (
                <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
              ) : (
                <div className="text-sm text-slate-600">
                  Remplis au moins un champ pour voir l’aperçu.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
