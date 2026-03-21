import { fetchLatestPapers, fetchLatestNews } from '../actions';
import { HomeContent } from '../../components/HomeContent';

export default async function Home() {
    const [papers, news] = await Promise.all([
        fetchLatestPapers(6).catch(() => []),
        fetchLatestNews(3).catch(() => []),
    ]);

    return (
        <HomeContent papers={papers || []} news={news || []} />
    );
}
