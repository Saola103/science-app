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
  // True when detailedExplanation ("くわしく") is effectively the same text
  // as easyExplanation ("やさしく") — either because expert summary
  // generation failed for this item (detailedExplanation fell back to
  // easyExplanation verbatim, see mapArticle.ts) or because the two texts
  // are near-duplicates by n-gram similarity. Consumers that don't want to
  // show a "detailed" view that reads identically to the "easy" one should
  // filter these out (see lib/proto/useFeedData.ts). Undefined/false for
  // mock ARTICLES in lib/proto/mockData.ts, which never hits this path.
  isDuplicateSummary?: boolean;
};

export type Topic = {
  id: string;
  name: string;
  newCount: number;
  windowLabel: string;
  category: string;
};
