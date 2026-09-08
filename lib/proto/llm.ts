import { ARTICLES } from "./mockData";

export type ExplanationMode = "easy" | "detailed";

// TODO: LLM API呼び出しに置き換え
export async function generateExplanation(
  articleId: string,
  mode: ExplanationMode
): Promise<string> {
  await new Promise((resolve) => setTimeout(resolve, 150));
  const article = ARTICLES.find((a) => a.id === articleId);
  if (!article) return "";
  return mode === "easy" ? article.easyExplanation : article.detailedExplanation;
}
