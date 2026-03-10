import { createClient, SupabaseClient } from "@supabase/supabase-js";

type PaperUpsertInput = {
  id: string;
  title: string;
  abstract?: string;
  authors: string[];
  journal?: string;
  publishedAt?: string;
  url: string;
  license?: string;
  pmcid?: string;
  pmid?: string;
  source: string;
  summary?: string;
  summaryGeneral?: string;
  summaryExpert?: string;
  summaryEmbedding?: number[];
  imageUrl?: string;
};

let client: SupabaseClient | null = null;

export function getSupabaseServerClient(): SupabaseClient {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL または SUPABASE_SERVICE_ROLE_KEY が設定されていません。.env.local を確認してください。",
    );
  }

  client = createClient(url, serviceKey, {
    auth: {
      persistSession: false,
    },
  });

  return client;
}

/**
 * Supabase の `papers` テーブルに論文情報を upsert する。
 *
 * 想定しているカラム（必要に応じて Supabase 側のスキーマを合わせてください）:
 * - id (text, PK)
 * - pmcid (text)
 * - pmid (text)
 * - title (text)
 * - abstract (text)
 * - summary (text)
 * - authors (text[])     : 著者名の配列
 * - journal (text)
 * - published_at (text)  : 日付文字列
 * - url (text)
 * - license (text)
 * - source (text)        : "pubmed" など
 */
export async function upsertPaperToSupabase(input: PaperUpsertInput): Promise<void> {
  const supabase = getSupabaseServerClient();
  const schema = process.env.SUPABASE_SCHEMA ?? "public";
  const table = process.env.SUPABASE_PAPERS_TABLE ?? "papers";

  const payload = {
    id: input.id,
    pmcid: input.pmcid ?? null,
    pmid: input.pmid ?? null,
    title: input.title,
    abstract: input.abstract ?? null,
    summary: input.summary ?? null,
    authors: input.authors,
    journal: input.journal ?? null,
    published_at: input.publishedAt ?? null,
    url: input.url,
    license: input.license ?? null,
    source: input.source,
    summary_general: input.summaryGeneral ?? null,
    summary_expert: input.summaryExpert ?? null,
    summary_embedding: input.summaryEmbedding ?? null,
    image_url: input.imageUrl ?? null,
  };

  const { error } = await supabase
    .schema(schema)
    .from(table)
    .upsert(payload, { onConflict: "id" });

  if (error) {
    throw new Error(
      `Supabase upsert failed (${schema}.${table}): ${error.message}`,
    );
  }
}


/**
 * Supabase の `inquiries` テーブルに問い合わせ内容を保存する。
 */
export async function saveInquiryToSupabase(input: {
  topic: string;
  email?: string;
  message: string;
}): Promise<void> {
  const supabase = getSupabaseServerClient();
  const schema = process.env.SUPABASE_SCHEMA ?? "public";

  const { error } = await supabase
    .schema(schema)
    .from("inquiries")
    .insert({
      topic: input.topic,
      email: input.email ?? null,
      message: input.message,
    });

  if (error) {
    throw new Error(`Inquiry submission failed: ${error.message}`);
  }
}

/**
 * Supabase の `subscribers` テーブルにメールアドレスを保存する。
 */
export async function saveSubscriberToSupabase(email: string): Promise<void> {
  const supabase = getSupabaseServerClient();
  const schema = process.env.SUPABASE_SCHEMA ?? "public";

  const { error } = await supabase
    .schema(schema)
    .from("subscribers")
    .insert({ email });

  if (error) {
    if (error.code === "23505") {
      // Unique violation
      throw new Error("This email is already subscribed.");
    }
    throw new Error(`Subscription failed: ${error.message}`);
  }
}
