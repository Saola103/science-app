import { getSupabaseServerClient } from '../../lib/supabase/serviceClient';
import { HomeContent } from '../../components/HomeContent';

export default async function Home() {
    // Supabaseサーバークライアントを初期化
    const supabase = getSupabaseServerClient();

    // Fetch papers (Temporarily removed filters to ensure data display)
    const { data: papers, error: papersError } = await supabase
        .from('papers')
        .select('*')
        .order('published_at', { ascending: false }) // Use published_at which matches serviceClient schema, but fallback to ordering if needed
        .limit(6);
        
    if (papersError) {
        console.error("CRITICAL: Failed to fetch papers:", papersError);
    } else {
        console.log(`Successfully fetched ${papers?.length || 0} papers.`);
    }

    // Fetch news
    const { data: news, error: newsError } = await supabase
        .from('news')
        .select('*')
        // .order('published_date', { ascending: false }) // Avoid ordering on potentially missing column 'published_date', just get top 3
        .limit(3);

    if (newsError) {
        console.error("CRITICAL: Failed to fetch news:", newsError);
    } else {
        console.log(`Successfully fetched ${news?.length || 0} news items.`);
    }

    return (
        <HomeContent papers={papers || []} news={news || []} />
    );
}


