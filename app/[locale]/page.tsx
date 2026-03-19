import { getSupabaseServerClient } from '../../lib/supabase/serviceClient';
import { HomeContent } from '../../components/HomeContent';

export default async function Home() {
    const supabase = getSupabaseServerClient();

    // Fetch papers only (news table does not exist)
    const { data: papers, error: papersError } = await supabase
        .from('papers')
        .select('*')
        .order('published_at', { ascending: false })
        .limit(6);

    if (papersError) {
        console.error("Failed to fetch papers:", papersError);
    }

    return (
        <HomeContent papers={papers || []} />
    );
}
