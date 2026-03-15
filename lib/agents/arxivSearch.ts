import { parseStringPromise } from 'xml2js';

export interface ArxivPaper {
  id: string;
  title: string;
  summary: string;
  published: string;
  url: string;
}

/**
 * Searches for papers on arXiv using their API.
 * Adheres to strict usage rules:
 * - User-Agent: PocketDive_Bot/1.0 (contact@pocket-dive.app)
 * - 3-second delay before request
 * - Graceful error handling
 *
 * @param query The search query string
 * @param maxResults The maximum number of results to return (default: 5)
 * @returns An array of ArxivPaper objects
 */
export async function searchArxivPapers(query: string, maxResults: number = 5): Promise<ArxivPaper[]> {
  // 1. Wait for 3 seconds to avoid overloading the API
  await new Promise(resolve => setTimeout(resolve, 3000));

  const apiUrl = 'http://export.arxiv.org/api/query';
  
  // Construct query parameters
  // Ensure we search all fields if not specified
  const searchQuery = query.includes(':') ? query : `all:${query}`;
  
  const params = new URLSearchParams({
    search_query: searchQuery,
    start: '0',
    max_results: String(maxResults),
    sortBy: 'relevance',
    sortOrder: 'descending'
  });

  try {
    const response = await fetch(`${apiUrl}?${params.toString()}`, {
      method: 'GET',
      headers: {
        // 2. Set User-Agent as required
        'User-Agent': 'PocketDive_Bot/1.0 (contact@pocket-dive.app)'
      }
    });

    if (!response.ok) {
      console.error(`arXiv API error: ${response.status} ${response.statusText}`);
      return [];
    }

    const xmlData = await response.text();
    
    // Parse XML response
    const result = await parseStringPromise(xmlData, { explicitArray: false });

    if (!result.feed || !result.feed.entry) {
      // No results or unexpected format
      return [];
    }

    // Handle case where entry is a single object (not an array)
    const entries = Array.isArray(result.feed.entry) 
      ? result.feed.entry 
      : [result.feed.entry];

    return entries.map((entry: any) => {
      // id is usually a URL like http://arxiv.org/abs/2101.00001
      // We want the ID part if needed, but the requirement says return { id, ... }
      // The id field in XML is the URL. The link with rel="alternate" is also the URL.
      // We'll use the id field from XML as the id.
      
      return {
        id: entry.id,
        title: entry.title.replace(/\s+/g, ' ').trim(), // Clean up whitespace
        summary: entry.summary.replace(/\s+/g, ' ').trim(),
        published: entry.published,
        url: entry.id // arXiv ID is the absolute URL to the abstract page
      };
    });

  } catch (error) {
    // 3. Graceful error handling
    console.error('Error fetching/parsing arXiv data:', error);
    return [];
  }
}
