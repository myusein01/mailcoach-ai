import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

function cors(body: any, status = 200) {
  return new NextResponse(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

export async function OPTIONS() {
  return cors({}, 200);
}

export async function POST(req: NextRequest) {
  try {
    const { text, subject } = await req.json();

    if (!text || typeof text !== "string") {
      return cors({ error: "Champ 'text' manquant." }, 400);
    }

    const currentSubject = typeof subject === "string" ? subject : "";

    const prompt = `
Tu es un assistant qui réécrit des emails professionnels en français.

RÈGLES :
- Tu dois renvoyer un JSON STRICT de la forme {"subject":"...","body":"..."}.
- "subject" = l'objet de l'email, court et professionnel (sans "Objet :").
- "body" = uniquement le corps du mail, sans ligne "Objet", ni répétition d'objet.
- Garde le sens du message, améliore la clarté, l'orthographe et le ton.

Email à améliorer :
Objet actuel (peut être vide) :
"""${currentSubject}"""

Corps du mail :
"""${text}"""
`;

    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }],
    });

    const raw = completion.choices[0].message.content ?? "";
    let parsed: { subject?: string; body?: string };

    try {
      parsed = JSON.parse(raw);
    } catch {
      // secours : si ce n'est pas du JSON valide
      parsed = { subject: currentSubject, body: raw };
    }

    const improvedSubject = (parsed.subject || currentSubject || "").trim();
    const improvedBody = (parsed.body || raw || text).trim();

    return cors({ subject: improvedSubject, body: improvedBody }, 200);
  } catch (err) {
    console.error("Erreur improve-email:", err);
    return cors({ error: "Erreur interne du serveur." }, 500);
  }
}
