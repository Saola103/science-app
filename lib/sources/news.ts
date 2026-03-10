
const GNEWS_API_BASE = "https://gnews.io/api/v4/search";

export type NewsArticle = {
  title: string;
  description: string;
  content: string;
  url: string;
  image: string;
  publishedAt: string;
  source: {
    name: string;
    url: string;
  };
};

export async function fetchScienceNews(query: string = "science"): Promise<NewsArticle[]> {
  const apiKey = process.env.GNEWS_API_KEY;
  if (!apiKey) {
    console.warn("GNEWS_API_KEY is not set. Returning mock data.");
    return MOCK_NEWS;
  }

  try {
    const params = new URLSearchParams({
      q: query,
      lang: "en",
      country: "us",
      max: "10",
      apikey: apiKey,
      category: "science"
    });

    const res = await fetch(`${GNEWS_API_BASE}?${params.toString()}`);
    if (!res.ok) {
      throw new Error(`GNews API request failed: ${res.status}`);
    }

    const data = await res.json();
    return data.articles || [];
  } catch (error) {
    console.error("News fetch error:", error);
    return MOCK_NEWS;
  }
}

const MOCK_NEWS: NewsArticle[] = [
  {
    title: "NASA's Webb Telescope Captures Rare View of a Supernova",
    description: "The James Webb Space Telescope has captured a stunning image of a supernova remnant in the distant universe.",
    content: "The James Webb Space Telescope has captured a stunning image of a supernova remnant in the distant universe...",
    url: "https://nasa.gov",
    image: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&q=80&w=800",
    publishedAt: new Date().toISOString(),
    source: { name: "NASA", url: "https://nasa.gov" }
  },
  {
    title: "New AI Model Predicts Protein Structures with Unprecedented Accuracy",
    description: "Researchers have developed a new AI model that outperforms AlphaFold in certain protein folding tasks.",
    content: "Researchers have developed a new AI model that outperforms AlphaFold in certain protein folding tasks...",
    url: "https://nature.com",
    image: "https://images.unsplash.com/photo-1532187875605-1ef638237bf2?auto=format&fit=crop&q=80&w=800",
    publishedAt: new Date().toISOString(),
    source: { name: "Nature", url: "https://nature.com" }
  }
];
