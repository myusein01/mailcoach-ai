// app/api/generate-email/route.ts
import { NextRequest, NextResponse } from "next/server";
import { generateEmailCompletion } from "@/lib/openai";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      goal,
      context,
      tone,
      language,
      type,
      mode = "generate",
      originalEmail,
    } = body as {
      goal?: string;
      context?: string;
      tone?: string;
      language?: string;
      type?: string;
      mode?: "generate" | "improve" | "reply";
      originalEmail?: string;
    };

    let prompt = "";

    if (mode === "generate") {
      prompt = `
Contexte : ${context || "Pas de contexte spécifique fourni."}
Objectif de l'email : ${goal}
Type d'email : ${type || "général"}
Ton : ${tone || "professionnel mais chaleureux"}
Langue de l'email : ${language || "français"}

Rédige un email complet, prêt à être envoyé.
`;
    } else if (mode === "improve") {
      prompt = `
Tu vas améliorer l'email suivant en le rendant plus clair, plus professionnel, tout en gardant le sens.

Contexte : ${context || "Pas de contexte spécifique fourni."}
Ton souhaité : ${tone || "professionnel"}
Langue : ${language || "français"}

Email à améliorer :

${originalEmail}

Renvoie uniquement la version améliorée.
`;
    } else if (mode === "reply") {
      prompt = `
Tu vas rédiger une réponse à l'email suivant.

Contexte : ${context || "Pas de contexte spécifique fourni."}
Objectif de la réponse : ${goal || "Répondre de manière professionnelle."}
Ton souhaité : ${tone || "professionnel"}
Langue : ${language || "français"}

Email reçu :

${originalEmail}

Rédige une réponse complète, prête à être envoyée.
`;
    }

    const email = await generateEmailCompletion(prompt);

    return NextResponse.json({ email });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Erreur lors de la génération de l'email" },
      { status: 500 }
    );
  }
}
