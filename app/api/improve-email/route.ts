// app/api/improve-email/route.ts
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

// Assure-toi que cette variable existe dans ton .env
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// Petite fonction utilitaire pour CORS
function corsResponse(body: any, status = 200) {
  return new NextResponse(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*", // <– Gmail pourra appeler ton API
      "Access-Control-Allow-Methods": "POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

// Réponse au preflight CORS
export async function OPTIONS() {
  return corsResponse({}, 200);
}

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    if (!text || typeof text !== "string") {
      return corsResponse({ error: "Champ 'text' manquant." }, 400);
    }

    const prompt = `
Tu es un assistant qui réécrit des emails professionnels en français.
Améliore le texte suivant : clarifie, corrige, rends plus pro, sans changer le sens.

Email :
"""${text}"""
`;

    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }],
    });

    const improved =
      completion.choices[0].message.content?.trim() ?? "";

    if (!improved) {
      return corsResponse({ error: "Pas de réponse du modèle." }, 500);
    }

    return corsResponse({ improved }, 200);
  } catch (err) {
    console.error("Erreur improve-email:", err);
    return corsResponse(
      { error: "Erreur interne du serveur." },
      500
    );
  }
}
