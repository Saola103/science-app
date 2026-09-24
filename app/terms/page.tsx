export default function TermsPage() {
    return (
        <div className="mx-auto max-w-4xl px-6 py-24 space-y-12">
            <h1 className="text-4xl font-black">利用規約</h1>
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                本規約は下書き段階であり、専門家（行政書士・弁護士等）によるレビューを経ていません。
            </p>
            <div className="prose dark:prose-invert max-w-none space-y-8 font-medium text-slate-700 dark:text-slate-300">
                <section>
                    <h2 className="text-xl font-bold text-foreground">1. 規約の適用</h2>
                    <p>本規約は、本サービスの利用に関する条件を定めるものです。利用者は、本サービスを利用することで本規約に同意したものとみなされます。</p>
                </section>
                <section>
                    <h2 className="text-xl font-bold text-foreground">2. サービスの目的・非営利性</h2>
                    <p>本サービスは、AI技術を用いて科学論文・科学ニュースの要約を提供し、学術情報へのアクセスを容易にすることを目的とした、個人開発・非営利の教育目的のサービスです。商用の対価を目的とした提供ではありません。アカウント登録・ログイン機能はなく、どなたでも無料でご利用いただけます。</p>
                </section>
                <section>
                    <h2 className="text-xl font-bold text-foreground">3. 免責事項</h2>
                    <p>本サービスは現状有姿（as-is）で提供され、内容の正確性・完全性・可用性についていかなる保証もしません。特に、AIによって生成された要約には誤り・不正確な内容が含まれる可能性があります。重要な情報を利用する際は、必ず原文（出典リンク先）をご確認ください。</p>
                </section>
                <section>
                    <h2 className="text-xl font-bold text-foreground">4. 禁止事項</h2>
                    <p>不正アクセス、本サービスのサーバーに過度な負荷をかける自動アクセス・スクレイピング、本サービスの構成・UI・機能を模倣する目的での利用を禁止します。</p>
                </section>
                <section>
                    <h2 className="text-xl font-bold text-foreground">5. 著作権について</h2>
                    <p>本サービスで扱う論文・ニュース記事はarXiv・bioRxiv/medRxiv等のオープンアクセス（CC BY等）および各ニュース配信元の記事に基づいています。掲載する要約は著作権法上の引用（公正な慣行への合致、正当な範囲内での利用、引用部分の明瞭な区別、出典明示）として運用しており、原著作物の著作権は原著作者・原出典に帰属します。各記事には原文・出典へのリンクを付しています。</p>
                </section>
                <section>
                    <h2 className="text-xl font-bold text-foreground">6. サービスの変更・中断・終了</h2>
                    <p>本サービスは個人開発・非営利で運営されているため、予告なく内容を変更、または提供を中断・終了する場合があります。</p>
                </section>
            </div>
        </div>
    );
}
