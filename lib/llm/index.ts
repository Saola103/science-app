import Groq from "groq-sdk";

const MODEL = "llama-3.3-70b-versatile";

function getGroqClient(): Groq {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.error("CRITICAL: GROQ_API_KEY is missing. Get a free key at https://console.groq.com");
    throw new Error("GROQ_API_KEY is required. Get a free key at https://console.groq.com");
  }
  return new Groq({ apiKey });
}

export async function generateText(prompt: string, temperature = 0.7): Promise<string> {
  try {
    const client = getGroqClient();
    const result = await client.chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature,
      max_tokens: 2048,
    });
    return result.choices[0]?.message?.content || "";
  } catch (err) {
    console.error("[Groq generateText Error]:", err);
    throw err;
  }
}

/**
 * Embedding is not available on Groq free tier.
 * Returns empty array - vector search will gracefully fall back.
 */
export async function embedText(_text: string): Promise<number[]> {
  console.warn("[embedText] Embedding not available on Groq free tier. Skipping.");
  return [];
}
