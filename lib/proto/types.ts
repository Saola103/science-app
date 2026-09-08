export type ContentType = "news" | "paper";
export type Illustration = "network" | "graph" | "comparison" | "process";

export type DivePoint = {
  label: string;
  text: string;
};

export type Article = {
  id: string;
  category: string;
  contentType: ContentType;
  summary: string;
  leadText: string;
  illustration: Illustration;
  divePoints: DivePoint[];
  source: string;
  author: string;
  publishedAt: string;
  easyExplanation: string;
  detailedExplanation: string;
  // Real source URL when available (real DB data via lib/proto/mapArticle.ts).
  // Mock ARTICLES in lib/proto/mockData.ts leave this undefined — components
  // fall back to a Google search link built from source+summary in that case.
  url?: string;
};

export type Topic = {
  id: string;
  name: string;
  newCount: number;
  windowLabel: string;
  category: string;
};
