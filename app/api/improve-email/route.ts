import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!, // assure-toi que cette variable existe dans .env/.env.local
});

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

export async function POST(req: NextRequest) {
  try {
    const { text, subject } = await req.json();

    if (!text || typeof text !== "string") {
      return json({ error: "Champ 'text' manquant." }, 400);
    }

    const currentSubject = typeof subject === "string" ? subject : "";

    const prompt = `
Tu es un assistant qui améliore des emails professionnels en français.

⭐ RÈGLES INDISPENSABLES ⭐
- Tu dois répondre STRICTEMENT en JSON brut, SANS markdown, SANS \`\`\`json.
- Le JSON doit être exactement : {"subject":"...","body":"..."}
- "subject" = un objet court, professionnel, sans "Objet :".
- "body" = uniquement le corps du mail, sans objet ni ligne "Objet".
- Ne mets AUCUN texte en dehors du JSON.
- PAS de markdown, pas de commentaires.

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

    // Nettoyage anti-markdown (au cas où)
    raw = raw.replace(/```json/gi, "").replace(/```/g, "").trim();

    let parsed: { subject?: string; body?: string };

    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      console.error("JSON non valide renvoyé par le modèle :", raw);
      return json({ error: "Réponse modèle non valide." }, 500);
    }

    const improvedSubject = (parsed.subject || currentSubject || "").trim();
    const improvedBody = (parsed.body || text).trim();

    return json(
      {
        subject: improvedSubject,
        body: improvedBody,
      },
      200
    );
  } catch (err) {
    console.error("Erreur improve-email:", err);
    return json({ error: "Erreur interne du serveur." }, 500);
  }
}
