import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  const { text } = await req.json();

  const prompt = `
Tu es un assistant qui réécrit des emails professionnels.
Améliore cet email sans changer le sens, rends-le plus clair, pro et concis.

Email :
"""${text}"""
`;

  const completion = await client.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [{ role: "user", content: prompt }],
  });

  const improved = completion.choices[0].message.content;

  return NextResponse.json({ improved });
}
