import { searchArxivPapers } from '../lib/agents/arxivSearch';

async function runTest() {
  console.log('Starting arXiv search test...');
  
  const query = 'quantum computing';
  const maxResults = 2;

  try {
    console.log(`Searching for "${query}" with maxResults=${maxResults}...`);
    const results = await searchArxivPapers(query, maxResults);

    console.log('Search completed.');
    console.log(`Found ${results.length} papers.`);

    if (results.length > 0) {
      console.log('First paper details:');
      console.log(JSON.stringify(results[0], null, 2));
    } else {
      console.log('No papers found.');
    }

  } catch (error) {
    console.error('Test failed:', error);
  }
}

runTest();
