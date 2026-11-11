export type PaperCardData = {
  id: string;
  title: string;
  journal?: string | null;
  url?: string | null;
  published_at?: string | null;
  summary?: string | null;
  summary_general?: string | null;
  summary_expert?: string | null;
  image_url?: string | null;
  abstract?: string | null;
  source?: string | null;
  license?: string | null; // CC BY-NC のbioRxiv/medRxivの出典行(attributionFor)用
};

export type NewsData = {
  id: string;
  title: string;
  url: string;
  published_at?: string | null;
  summary?: string | null;
  image_url?: string | null;
  source?: string | null;
};
