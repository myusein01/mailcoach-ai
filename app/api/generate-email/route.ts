// app/api/generate-email/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { db, ensureSchema } from "@/db";
import { randomUUID } from "crypto";

import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

import {
  ensureUsersTable,
  getOrCreateUser,
  canUseCredit,
  consumeCredit,
} from "@/lib/billing";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// Récupère l’email user depuis NextAuth (site) OU depuis body (extension)
async function resolveUserIdentity(body: any) {
  const session = await getServerSession(authOptions);
  const sessionEmail = session?.user?.email || null;
  const sessionName = session?.user?.name || null;

  const bodyEmail =
    typeof body?.userEmail === "string" ? body.userEmail.trim() : null;
  const bodyName =
    typeof body?.userName === "string" ? body.userName.trim() : null;

  return {
    email: sessionEmail || bodyEmail,
    name: sessionName || bodyName || null,
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { goal, context, tone, language, type, mode, originalEmail } = body;

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY manquante." },
        { status: 500 }
      );
    }

    // Table emails existante
    await ensureSchema();

    // Table users pour quota
    await ensureUsersTable();

    // Identité user (site session OU extension body)
    const { email, name } = await resolveUserIdentity(body);

    if (!email) {
      return NextResponse.json(
        {
          error:
            "Non authentifié. (Sur l’extension, envoie userEmail dans le body.)",
        },
        { status: 401 }
      );
    }

    // Quota check
    const user = await getOrCreateUser(email, name);
    const check = canUseCredit(user);

    if (!check.allowed) {
      return NextResponse.json(
        {
          error: "Limite gratuite atteinte.",
          errorCode: "LIMIT_REACHED",
          limit: check.limit,
          plan: user.plan,
        },
        { status: 402 }
      );
    }

    // Prompt + OpenAI
    const prompt = buildPrompt({
      goal,
      context,
      tone,
      language,
      type,
      mode,
      originalEmail,
    });

    const completion: any = await client.responses.create({
      model: "gpt-4.1-mini",
      input: prompt,
    });

    const firstItem = completion?.output?.[0]?.content?.[0];
    const emailText = firstItem?.text ?? "";

    if (!emailText) {
      return NextResponse.json(
        { error: "Aucun texte généré." },
        { status: 500 }
      );
    }

    // ✅ Consomme 1 crédit seulement si OK
    await consumeCredit(user);

    // Sauvegarde en BDD (emails)
    const id = randomUUID();
    const createdAt = Date.now();

    await db.execute({
      sql: `
        INSERT INTO emails (
          id, mode, type, tone, language,
          goal, context, original_email, result, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        id,
        mode,
        type ?? null,
        tone ?? null,
        language ?? null,
        goal ?? null,
        context ?? null,
        originalEmail ?? null,
        emailText,
        createdAt,
      ],
    });

    return NextResponse.json({ email: emailText });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Erreur serveur lors de la génération." },
      { status: 500 }
    );
  }
}

function buildPrompt({
  goal,
  context,
  tone,
  language,
  type,
  mode,
  originalEmail,
}: {
  goal?: string;
  context?: string;
  tone?: string;
  language?: string;
  type?: string;
  mode: "generate" | "improve" | "reply";
  originalEmail?: string;
}) {
  const lang = language === "anglais" ? "anglais" : "français";
  const ton = tone || "professionnel";

  if (mode === "generate") {
    return `
Tu es un assistant spécialisé en rédaction d'e-mails professionnels en ${lang}.
Objectif de l'e-mail : ${goal || "non précisé"}.
Contexte : ${context || "non précisé"}.
Type : ${type || "général"}.
Ton : ${ton}.

Rédige un e-mail prêt à être envoyé, sans explication autour, juste le texte de l’e-mail.
    `;
  }

  if (mode === "improve") {
    return `
Tu es un assistant qui améliore les e-mails professionnels.
Voici l'e-mail de départ :

"${originalEmail || ""}"

Objectif de l'amélioration : ${goal || "non précisé"}.
Contexte : ${context || "non précisé"}.
Langue : ${lang}. Ton : ${ton}.

Réécris l'e-mail de manière plus claire, impactante et professionnelle,
sans rajouter de blabla inutile. Retourne juste l'e-mail final.
    `;
  }

  // mode reply
  return `
Tu es un assistant qui rédige des réponses d'e-mails professionnelles.
Voici l'e-mail reçu :

"${originalEmail || ""}"

Objectif de la réponse : ${goal || "non précisé"}.
Contexte : ${context || "non précisé"}.
Langue : ${lang}. Ton : ${ton}.

Rédige une réponse professionnelle prête à envoyer, sans rien autour.
  `;
}
