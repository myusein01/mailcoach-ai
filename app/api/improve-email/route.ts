// app/api/improve-email/route.ts
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

import {
  ensureUsersTable,
  getOrCreateUser,
  canUseCredit,
  consumeCredit,
} from "@/lib/billing";

import Stripe from "stripe";
import { dbExec, dbGet } from "@/db/helpers";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// ⚠️ Pour l’extension on garde CORS ouvert (MVP)
const corsHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function json(body: any, status = 200) {
  return new NextResponse(JSON.stringify(body), {
    status,
    headers: corsHeaders,
  });
}

export async function OPTIONS() {
  return json({}, 200);
}

async function resolveUserIdentity(req: NextRequest, body: any) {
  const bodyEmail =
    typeof body?.userEmail === "string" ? body.userEmail.trim() : null;
  const bodyName =
    typeof body?.userName === "string" ? body.userName.trim() : null;

  if (bodyEmail) {
    return {
      email: bodyEmail.toLowerCase(),
      name: bodyName || null,
      source: "body",
    };
  }

  const session = await getServerSession(authOptions);
  const sessionEmail = session?.user?.email?.toLowerCase() || null;
  const sessionName = session?.user?.name || null;

  return {
    email: sessionEmail,
    name: sessionName || null,
    source: "session",
  };
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

type DbUserStripe = {
  stripe_customer_id: string | null;
};

function isProStatus(status: string) {
  const s = (status ?? "").toLowerCase();
  return s === "active" || s === "trialing" || s === "past_due";
}

function pickBestSubscription(subs: Stripe.Subscription[]) {
  const preferred = subs.find((x) => isProStatus(String(x.status)));
  return preferred ?? subs[0] ?? null;
}

// ✅ normalisation langue venant de l’extension
function normalizeLanguage(input: any): {
  code: "fr" | "en" | "nl" | "es" | "de" | "tr" | "it" | "pt" | "ro" | "bg";
  label: string;
} {
  const raw = String(input ?? "").trim().toLowerCase();

  const allowed = [
    "fr",
    "en",
    "nl",
    "es",
    "de",
    "tr",
    "it",
    "pt",
    "ro",
    "bg",
  ] as const;

  if ((allowed as readonly string[]).includes(raw)) {
    const label =
      raw === "fr"
        ? "Français"
        : raw === "en"
        ? "English"
        : raw === "nl"
        ? "Nederlands"
        : raw === "es"
        ? "Español"
        : raw === "de"
        ? "Deutsch"
        : raw === "tr"
        ? "Türkçe"
        : raw === "it"
        ? "Italiano"
        : raw === "pt"
        ? "Português"
        : raw === "ro"
        ? "Română"
        : raw === "bg"
        ? "Български"
        : "Français";
    return { code: raw as any, label };
  }

  if (raw.startsWith("fr")) return { code: "fr", label: "Français" };
  if (raw.startsWith("en")) return { code: "en", label: "English" };
  if (raw.startsWith("nl")) return { code: "nl", label: "Nederlands" };
  if (raw.startsWith("es")) return { code: "es", label: "Español" };
  if (raw.startsWith("de")) return { code: "de", label: "Deutsch" };
  if (raw.startsWith("tr")) return { code: "tr", label: "Türkçe" };
  if (raw.startsWith("it")) return { code: "it", label: "Italiano" };
  if (raw.startsWith("pt")) return { code: "pt", label: "Português" };
  if (raw.startsWith("ro")) return { code: "ro", label: "Română" };
  if (raw.startsWith("bg")) return { code: "bg", label: "Български" };

  return { code: "fr", label: "Français" };
}

// ✅ Sync Stripe -> DB
async function stripeSyncIfNeeded(email: string) {
  try {
    await dbExec(
      `
      INSERT OR IGNORE INTO users (id, email, name, plan, credits_used, period_start)
      VALUES (?, ?, NULL, 'free', 0, (CAST(strftime('%s','now') AS INTEGER) * 1000))
      `,
      [email, email]
    );

    const row = await dbGet<DbUserStripe>(
      `
      SELECT stripe_customer_id
      FROM users
      WHERE lower(email) = ? OR lower(id) = ?
      ORDER BY period_start DESC
      LIMIT 1
      `,
      [email, email]
    );

    let customerId = row?.stripe_customer_id ?? null;

    if (!customerId) {
      const customers = await stripe.customers.list({ email, limit: 1 });
      customerId = customers.data?.[0]?.id ?? null;

      if (customerId) {
        await dbExec(
          `
          UPDATE users
          SET stripe_customer_id = COALESCE(stripe_customer_id, ?)
          WHERE lower(email) = ? OR lower(id) = ?
          `,
          [customerId, email, email]
        );
      }
    }

    if (!customerId) return;

    const subs = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 20,
    });

    const picked = pickBestSubscription(subs.data);

    if (!picked) {
      await dbExec(
        `
        UPDATE users
        SET plan = 'free',
            stripe_subscription_id = NULL,
            cancel_at_period_end = 0,
            cancel_at = NULL,
            current_period_end = NULL
        WHERE lower(email) = ? OR lower(id) = ?
        `,
        [email, email]
      );
      return;
    }

    const sub = await stripe.subscriptions.retrieve(picked.id);
    const anySub = sub as any;

    const status = String(anySub.status ?? "").toLowerCase();
    const isPro = isProStatus(status);

    const periodStartMs =
      typeof anySub.current_period_start === "number"
        ? anySub.current_period_start * 1000
        : null;

    const currentPeriodEndMs =
      typeof anySub.current_period_end === "number"
        ? anySub.current_period_end * 1000
        : null;

    const cancelAtPeriodEndInt =
      typeof anySub.cancel_at_period_end === "boolean"
        ? anySub.cancel_at_period_end
          ? 1
          : 0
        : 0;

    const cancelAtMs =
      typeof anySub.cancel_at === "number" ? anySub.cancel_at * 1000 : null;

    const finalCancelAtMs =
      cancelAtMs ?? (cancelAtPeriodEndInt === 1 ? currentPeriodEndMs : null);

    await dbExec(
      `
      UPDATE users
      SET
        plan = ?,
        stripe_customer_id = ?,
        stripe_subscription_id = ?,
        period_start = COALESCE(?, period_start),
        cancel_at_period_end = ?,
        cancel_at = ?,
        current_period_end = ?
      WHERE lower(email) = ? OR lower(id) = ?
      `,
      [
        isPro ? "pro" : "free",
        customerId,
        anySub.id ?? null,
        periodStartMs,
        cancelAtPeriodEndInt,
        finalCancelAtMs,
        currentPeriodEndMs,
        email,
        email,
      ]
    );
  } catch (e) {
    console.error("stripeSyncIfNeeded error:", e);
  }
}

// --------------------
// ✅ PROFIL / SIGNATURE (HTML Luxury)
// --------------------

type DbUserProfile = {
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  address: string | null;
  company: string | null;
  title: string | null;
  website: string | null;

  logo_url: string | null;
  accent_color: string | null;
  logo_height: number | null;
  signature_enabled: number | null; // 0/1
};

async function ensureUserProfilesTable() {
  await dbExec(
    `
    CREATE TABLE IF NOT EXISTS user_profiles (
      email TEXT PRIMARY KEY,
      first_name TEXT,
      last_name TEXT,
      phone TEXT,
      address TEXT,
      company TEXT,
      title TEXT,
      website TEXT,

      -- ✅ signature "Luxury"
      logo_url TEXT,
      accent_color TEXT,
      logo_height INTEGER,
      signature_enabled INTEGER NOT NULL DEFAULT 1,

      updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
    );
    `,
    []
  );

  await dbExec(`ALTER TABLE user_profiles ADD COLUMN logo_url TEXT;`, []).catch(
    () => {}
  );
  await dbExec(
    `ALTER TABLE user_profiles ADD COLUMN accent_color TEXT;`,
    []
  ).catch(() => {});
  await dbExec(
    `ALTER TABLE user_profiles ADD COLUMN logo_height INTEGER;`,
    []
  ).catch(() => {});
  await dbExec(
    `ALTER TABLE user_profiles ADD COLUMN signature_enabled INTEGER NOT NULL DEFAULT 1;`,
    []
  ).catch(() => {});
}

function clean(v: any) {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s.length ? s : null;
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
  if (!s) return null;
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  return `https://${s}`;
}

function buildLuxurySignatureHtml(profile: DbUserProfile | null) {
  if (!profile) return null;
  if ((profile.signature_enabled ?? 1) === 0) return null;

  const first = clean(profile.first_name);
  const last = clean(profile.last_name);
  const title = clean(profile.title);
  const company = clean(profile.company);
  const phone = clean(profile.phone);
  const address = clean(profile.address);
  const websiteRaw = clean(profile.website);

  const fullName = [first, last].filter(Boolean).join(" ").trim();
  const titleCompany = [title, company].filter(Boolean).join(" — ").trim();

  const websiteUrl = websiteRaw ? normalizeUrl(websiteRaw) : null;
  const websiteLabel = websiteRaw
    ? websiteRaw.replace(/^https?:\/\//i, "")
    : null;

  const logoUrl = clean(profile.logo_url);
  const accent = clean(profile.accent_color) ?? "#C8A24A";
  const logoHeight = Number(profile.logo_height ?? 70);

  const hasAny =
    !!fullName || !!titleCompany || !!phone || !!address || !!websiteUrl;
  if (!hasAny && !logoUrl) return null;

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

  // téléphone aligné
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

  // website aligné (icône web)
  if (websiteUrl && websiteLabel) {
    infoParts.push(
      `<table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse; margin-top:2px;">
        <tr>
          <td style="padding-right:6px; font-size:12px; color:#7A7A7A; vertical-align:middle;">
            🌐
          </td>
          <td style="font-size:12.5px; line-height:1.2; color:#2B2B2B; vertical-align:middle;">
            <a href="${escapeHtml(
              websiteUrl
            )}" style="color:#2B2B2B; text-decoration:none; display:inline-block; vertical-align:middle; line-height:1.2;">${escapeHtml(
        websiteLabel
      )}</a>
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

  const html = `
<!-- MailCoach Luxury Signature -->
<table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
  <tr>
    ${leftPart}
    <td style="${rightPad} vertical-align:middle; font-family:Arial, Helvetica, sans-serif; color:#2B2B2B;">
      ${infoParts.join("\n")}
    </td>
  </tr>
</table>
<!-- /MailCoach Luxury Signature -->
  `.trim();

  return html;
}

async function getUserSignatureHtml(email: string) {
  try {
    await ensureUserProfilesTable();

    const profile = await dbGet<DbUserProfile>(
      `SELECT
        email,
        first_name, last_name, phone, address, company, title, website,
        logo_url, accent_color, logo_height, signature_enabled
       FROM user_profiles
       WHERE lower(email) = ? LIMIT 1`,
      [email.toLowerCase()]
    );

    return buildLuxurySignatureHtml(profile ?? null);
  } catch (e) {
    console.error("getUserSignatureHtml error:", e);
    return null;
  }
}

function textToHtmlWithBr(text: string) {
  const safe = escapeHtml(text);
  return safe.split("\n").map((l) => l.trimEnd()).join("<br>");
}

export async function POST(req: NextRequest) {
  try {
    const { text, subject, userEmail, userName, language } = await req.json();

    if (!text || typeof text !== "string") {
      return json({ error: "Champ 'text' manquant." }, 400);
    }

    if (!process.env.OPENAI_API_KEY) {
      return json({ error: "OPENAI_API_KEY manquante." }, 500);
    }

    await ensureUsersTable();

    const { email, name, source } = await resolveUserIdentity(req, {
      userEmail,
      userName,
    });

    if (!email) {
      return json(
        {
          error:
            "Non authentifié. (Sur l’extension, envoie userEmail dans le body.)",
        },
        401
      );
    }

    await stripeSyncIfNeeded(email);

    const user = await getOrCreateUser(email, name);
    const check = canUseCredit(user);

    if (!check.allowed) {
      return json(
        {
          error: "Limite gratuite atteinte.",
          errorCode: "LIMIT_REACHED",
          limit: check.limit ?? null,
          plan: user.plan,
          emailUsed: email,
          identitySource: source,
        },
        402
      );
    }

    const currentSubject = typeof subject === "string" ? subject : "";
    const lang = normalizeLanguage(language);

    // ✅ On récupère la signature HTML (Luxury)
    const signatureHtml = await getUserSignatureHtml(email);

    const prompt = `
Tu es un assistant qui améliore des emails professionnels.

⭐ RÈGLES INDISPENSABLES ⭐
- Tu dois répondre STRICTEMENT en JSON brut, SANS markdown, SANS \`\`\`json.
- Le JSON doit être exactement : {"subject":"...","body":"..."}
- "subject" = un objet court, professionnel, sans "Objet :".
- "body" = uniquement le corps du mail, sans objet ni ligne "Objet".
- Ne mets AUCUN texte en dehors du JSON.
- PAS de markdown, pas de commentaires.

⭐ LANGUE OBLIGATOIRE ⭐
- Tu dois écrire la réponse en : ${lang.label} (code: ${lang.code})

⭐ IMPORTANT (SIGNATURE) ⭐
- Ajoute une formule de politesse à la fin
- MAIS : tu ne dois JAMAIS ajouter de signature d'identité (nom/tel/adresse/site). Zéro signature.
- La signature sera ajoutée automatiquement après.

Objet actuel :
"${currentSubject}"

Corps à améliorer :
"${text}"

Réponds uniquement avec le JSON.
`.trim();

    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }],
    });

    let raw = completion.choices[0].message.content ?? "";
    raw = raw.replace(/```json/gi, "").replace(/```/g, "").trim();

    let parsed: { subject?: string; body?: string };
    try {
      parsed = JSON.parse(raw);
    } catch {
      console.error("JSON non valide renvoyé par le modèle :", raw);
      return json({ error: "Réponse modèle non valide." }, 500);
    }

    const improvedSubject = (parsed.subject || currentSubject || "").trim();
    const improvedBodyText = (parsed.body || text).trim();

    // ✅ CHANGEMENT: on ajoute la signature à CHAQUE FOIS si elle existe
    const appendOk = !!signatureHtml;

    const bodyHtml = appendOk
      ? `${textToHtmlWithBr(improvedBodyText)}<br><br>${signatureHtml}`
      : `${textToHtmlWithBr(improvedBodyText)}`;

    await consumeCredit(user);

    return json(
      {
        subject: improvedSubject,
        body: improvedBodyText, // texte
        bodyHtml, // ✅ HTML prêt pour Gmail
        signatureAppended: appendOk,
        plan: user.plan,
        emailUsed: email,
        identitySource: source,
        language: lang.code,
      },
      200
    );
  } catch (err) {
    console.error("Erreur improve-email:", err);
    return json({ error: "Erreur interne du serveur." }, 500);
  }
}
