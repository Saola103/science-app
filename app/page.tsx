import { PaperCard, type PaperCardData } from "@/components/PaperCard";
import { getSupabaseClient } from "@/lib/supabase/client";

type PaperRow = PaperCardData;

type HomeProps = {
  searchParams?: { q?: string };
};

export default async function Home({ searchParams }: HomeProps) {
  const supabase = getSupabaseClient();
  const keyword = (searchParams?.q ?? "").trim();

  // クエリを統一しました
  let query = supabase
    .from("papers")
    .select("id, title, journal, url, published_at, summary, summary_general, summary_expert")
    .order("published_at", { ascending: false });

  if (keyword) {
    const pattern = `%${keyword}%`;
    query = query.or(`title.ilike.${pattern},summary.ilike.${pattern},summary_general.ilike.${pattern},summary_expert.ilike.${pattern}`);
  }

  const { data, error } = await query;

  if (error) {
    return (
      <div className="min-h-screen bg-white text-slate-900">
        <main className="mx-auto w-full max-w-5xl px-6 py-12">
          <h1 className="text-2xl font-semibold tracking-tight">Papers</h1>
          <p className="mt-4 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-800">
            Supabase から論文一覧の取得に失敗しました:{" "}
            <span className="font-mono">{error.message}</span>
          </p>
        </main>
      </div>
    );
  }

  const papers = (data ?? []) as PaperRow[];

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <main className="mx-auto w-full max-w-5xl px-6 py-12">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Papers</h1>
            <p className="mt-2 text-sm text-slate-500">
              arXiv から収集した論文を最新順に表示します。
            </p>
          </div>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <form
              action="/"
              method="get"
              className="flex w-full max-w-xs items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 shadow-sm"
            >
              <input
                type="search"
                name="q"
                placeholder="タイトルや要約で検索"
                defaultValue={keyword}
                className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
              />
            </form>
            <div className="text-xs text-slate-500">{papers.length} 件</div>
          </div>
        </header>

        <section className="mt-8 grid grid-cols-1 gap-4">
          {papers.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
              該当する論文がありません。
            </div>
          ) : (
            papers.map((paper) => <PaperCard key={paper.id} paper={paper} />)
          )}
        </section>
      </main>
    </div>
  );
}