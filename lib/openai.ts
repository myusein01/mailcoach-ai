import OpenAI from "openai";

if (!process.env.OPENAI_API_KEY) {
  throw new Error("Missing OPENAI_API_KEY");
}

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateEmailCompletion(prompt: string) {
  const response = await client.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [
      {
        role: "system",
        content:
          "Tu es un assistant spécialisé dans la rédaction d'e-mails professionnels, clairs, concis et efficaces.",
      },
      { role: "user", content: prompt },
    ],
    temperature: 0.7,
  });

  return response.choices[0]?.message?.content ?? "";
}
