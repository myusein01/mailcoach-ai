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

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-12-15.clover",
});

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
  code: "fr" | "en" | "es" | "de" | "it" | "pt";
  label: string;
} {
  const raw = String(input ?? "").trim().toLowerCase();

  const allowed = ["fr", "en", "es", "de", "it", "pt"] as const;
  if ((allowed as readonly string[]).includes(raw)) {
    const label =
      raw === "fr"
        ? "Français"
        : raw === "en"
        ? "English"
        : raw === "es"
        ? "Español"
        : raw === "de"
        ? "Deutsch"
        : raw === "it"
        ? "Italiano"
        : "Português";
    return { code: raw as any, label };
  }

  if (raw.startsWith("fr")) return { code: "fr", label: "Français" };
  if (raw.startsWith("en")) return { code: "en", label: "English" };
  if (raw.startsWith("es")) return { code: "es", label: "Español" };
  if (raw.startsWith("de")) return { code: "de", label: "Deutsch" };
  if (raw.startsWith("it")) return { code: "it", label: "Italiano" };
  if (raw.startsWith("pt")) return { code: "pt", label: "Português" };

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
// ✅ PROFIL / SIGNATURE
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
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
    );
    `,
    []
  );
}

function clean(v: any) {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s.length ? s : null;
}

function buildSignature(profile: DbUserProfile | null, langCode: string) {
  if (!profile) return null;

  const first = clean(profile.first_name);
  const last = clean(profile.last_name);
  const title = clean(profile.title);
  const company = clean(profile.company);
  const phone = clean(profile.phone);
  const address = clean(profile.address);
  const website = clean(profile.website);

  const lines: string[] = [];

  const fullName = [first, last].filter(Boolean).join(" ").trim();
  if (fullName) lines.push(fullName);

  const titleCompany = [title, company].filter(Boolean).join(" — ").trim();
  if (titleCompany) lines.push(titleCompany);

  const phoneLabel =
    langCode === "en"
      ? "Phone"
      : langCode === "de"
      ? "Tel."
      : langCode === "es"
      ? "Tel."
      : langCode === "it"
      ? "Tel."
      : langCode === "pt"
      ? "Tel."
      : "Tél.";

  if (phone) lines.push(`${phoneLabel} : ${phone}`);

  if (address) lines.push(address);

  const websiteLabel =
    langCode === "en"
      ? "Website"
      : langCode === "de"
      ? "Web"
      : langCode === "es"
      ? "Web"
      : langCode === "it"
      ? "Sito"
      : langCode === "pt"
      ? "Site"
      : "Site";

  if (website) lines.push(`${websiteLabel} : ${website}`);

  if (lines.length === 0) return null;

  // signature prête à coller
  return lines.join("\n");
}

async function getUserSignature(email: string, langCode: string) {
  try {
    await ensureUserProfilesTable();

    const profile = await dbGet<DbUserProfile>(
      `SELECT email, first_name, last_name, phone, address, company, title, website
       FROM user_profiles
       WHERE lower(email) = ? LIMIT 1`,
      [email.toLowerCase()]
    );

    return buildSignature(profile ?? null, langCode);
  } catch (e) {
    console.error("getUserSignature error:", e);
    return null;
  }
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

    // ✅ Signature (optionnelle) basée sur le profil utilisateur
    const signature = await getUserSignature(email, lang.code);

    const signatureBlock = signature
      ? `\n\n---\nSIGNATURE À UTILISER (copie exactement, sans rien ajouter) :\n${signature}\n---\n`
      : `\n\n---\nAUCUNE SIGNATURE DISPONIBLE (profil vide ou ignoré)\n---\n`;

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

⭐ POLITESSE + SIGNATURE (TRÈS IMPORTANT) ⭐
1) Tu dois décider toi-même si le texte est un vrai email adressé à quelqu’un.
- Si c’est un email adressé à un destinataire (demande, réponse, relance, proposition, etc.) :
  ✅ dans la grande majorité des cas, ajoute une formule de fin naturelle adaptée (selon la langue et le ton).
- Si le texte n’est PAS un email destiné à être envoyé (notes perso, checklist, brouillon interne, etc.) :
  ❌ n’ajoute PAS de formule de politesse.

2) SIGNATURE :
- Si tu ajoutes une formule de politesse, ALORS :
  - si une signature est fournie ci-dessous, tu dois la coller à la toute fin, exactement telle quelle (sans inventer d’infos).
  - si aucune signature n’est fournie, ne mets pas de signature.
- Si tu N’ajoutes PAS de formule de politesse, tu ne dois JAMAIS ajouter de signature.

${signatureBlock}

Objet actuel :
"${currentSubject}"

Corps à améliorer :
"${text}"

Réponds uniquement avec le JSON.
`;

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
    const improvedBody = (parsed.body || text).trim();

    await consumeCredit(user);

    return json(
      {
        subject: improvedSubject,
        body: improvedBody,
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
