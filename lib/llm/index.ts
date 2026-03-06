import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";

// 優先的に使いたいモデル（レート制限の都合で 1.5 flash）
const PREFERRED_MODEL = "gemini-1.5-flash";

type GeminiListModelsResponse = {
  models?: Array<{
    name?: string; // e.g. "models/gemini-1.5-flash"
    displayName?: string;
    supportedGenerationMethods?: string[]; // e.g. ["generateContent", ...]
  }>;
};

function stripModelsPrefix(name: string): string {
  return name.startsWith("models/") ? name.slice("models/".length) : name;
}

function uniq<T>(items: T[]): T[] {
  return [...new Set(items)];
}

function getApiKey(): string {
  // 実行環境によっては import.meta.env が注入されるため、まずはこちらを参照します。
  // Next.js（Node 実行）では import.meta.env が無いこともあるため、無い場合は undefined になります。
  const apiKey =
    (import.meta as any)?.env?.GEMINI_API_KEY ??
    (import.meta as any)?.env?.NEXT_PUBLIC_GEMINI_API_KEY ??
    process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY が設定されていません。`.env.local` を確認してください。",
    );
  }

  return apiKey;
}

function getClient(): GoogleGenerativeAI {
  return new GoogleGenerativeAI(getApiKey());
}

let cachedResolvedModel: string | null = null;
let resolvingModelPromise: Promise<string> | null = null;

async function listModels(): Promise<GeminiListModelsResponse["models"]> {
  const apiKey = getApiKey();
  const url = new URL("https://generativelanguage.googleapis.com/v1beta/models");
  url.searchParams.set("key", apiKey);

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`ListModels failed: ${res.status} ${res.statusText}`);
  }
  const json = (await res.json()) as GeminiListModelsResponse;
  return json.models ?? [];
}

async function resolveModelName(): Promise<string> {
  if (cachedResolvedModel) return cachedResolvedModel;

  const fromEnv =
    (import.meta as any)?.env?.GEMINI_MODEL ??
    (import.meta as any)?.env?.NEXT_PUBLIC_GEMINI_MODEL ??
    process.env.GEMINI_MODEL;

  if (typeof fromEnv === "string" && fromEnv.trim()) {
    cachedResolvedModel = fromEnv.trim();
    return cachedResolvedModel;
  }

  if (resolvingModelPromise) return resolvingModelPromise;

  resolvingModelPromise = (async () => {
    const models = (await listModels()) ?? [];

    const candidates = models
      .filter((m) => (m.supportedGenerationMethods ?? []).includes("generateContent"))
      .map((m) => m.name)
      .filter((n): n is string => Boolean(n))
      .map(stripModelsPrefix);

    // まずは 1.5-flash を最優先。次に 1.5-flash-latest、その後 1.5-flash 系の別バリアント
    const preferredOrder = [
      PREFERRED_MODEL,
      `${PREFERRED_MODEL}-latest`,
      // よくあるバリアント（環境によって公開されている場合がある）
      `${PREFERRED_MODEL}-002`,
      `${PREFERRED_MODEL}-001`,
    ];

    for (const p of preferredOrder) {
      if (candidates.includes(p)) return p;
    }

    const anyFlash15 = candidates.find((n) => n.startsWith("gemini-1.5-flash"));
    if (anyFlash15) return anyFlash15;

    // どうしても見つからない場合は、generateContent 対応の先頭を使う
    const fallback = candidates[0];
    if (!fallback) {
      throw new Error(
        "generateContent に対応した Gemini モデルが見つかりませんでした。API キーの権限や利用可能モデルを確認してください。",
      );
    }
    return fallback;
  })();

  try {
    cachedResolvedModel = await resolvingModelPromise;
    return cachedResolvedModel;
  } finally {
    resolvingModelPromise = null;
  }
}

export function getModel(): GenerativeModel {
  const client = getClient();
  // 同期 API として残すため、環境変数指定のみで利用する（未指定の場合は generateText 側で解決）
  const fromEnv =
    (import.meta as any)?.env?.GEMINI_MODEL ??
    (import.meta as any)?.env?.NEXT_PUBLIC_GEMINI_MODEL ??
    process.env.GEMINI_MODEL;
  const modelName = (typeof fromEnv === "string" && fromEnv.trim()) || PREFERRED_MODEL;

  return client.getGenerativeModel({ model: modelName });
}

export async function generateText(prompt: string): Promise<string> {
  const client = getClient();

  try {
    const modelName = await resolveModelName();
    // “シンプルなモデル名” を指定して呼び出し（SDK が内部で models/ を解決）
    const model = client.getGenerativeModel({ model: modelName });
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    throw err;
  }
}

