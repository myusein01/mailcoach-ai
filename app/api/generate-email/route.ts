// app/api/generate-email/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { db, ensureSchema } from "@/db";
import { randomUUID } from "crypto";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

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

    // On s'assure que la table existe
    await ensureSchema();

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
    const email = firstItem?.text ?? "";

    if (!email) {
      return NextResponse.json(
        { error: "Aucun texte généré." },
        { status: 500 }
      );
    }

    // Sauvegarde en BDD
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
        email,
        createdAt,
      ],
    });

    return NextResponse.json({ email });
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
