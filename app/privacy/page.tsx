export default function PrivacyPage() {
    return (
        <div className="mx-auto max-w-4xl px-6 py-24 space-y-12">
            <h1 className="text-4xl font-black">プライバシーポリシー</h1>
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                本ポリシーは下書き段階であり、専門家（行政書士・弁護士等）によるレビューを経ていません。
            </p>
            <div className="prose dark:prose-invert max-w-none space-y-8 font-medium text-slate-700 dark:text-slate-300">
                <section>
                    <h2 className="text-xl font-bold text-foreground">1. 運営の性質</h2>
                    <p>本サービスは個人開発・非営利の教育目的で運営されており、商用の対価を目的としたサービス提供ではありません。</p>
                </section>
                <section>
                    <h2 className="text-xl font-bold text-foreground">2. 個人情報の収集</h2>
                    <p>本サービスはアカウント登録・ログイン機能を提供していません。保存記事・閲覧履歴・連続記録などはお使いのブラウザのローカルストレージ内にのみ保存され、サーバー側で個人を識別できる情報として保持することはありません。お問い合わせフォームは設けておらず、フォーム経由での個人情報の取得も行っていません。</p>
                </section>
                <section>
                    <h2 className="text-xl font-bold text-foreground">3. クッキー・ローカルストレージ</h2>
                    <p>設定（テーマ、選択カテゴリ、保存記事、閲覧履歴等）を保存するためにブラウザのローカルストレージを使用します。広告配信・行動追跡を目的としたCookieは使用していません。</p>
                </section>
                <section>
                    <h2 className="text-xl font-bold text-foreground">4. 広告について</h2>
                    <p>本サービスは非営利運営のため、広告は掲載していません。Google AdSense等の広告配信サービスは利用していません。</p>
                </section>
                <section>
                    <h2 className="text-xl font-bold text-foreground">5. 第三者提供</h2>
                    <p>法令に基づく場合を除き、取得した個人情報を第三者に提供することはありません。</p>
                </section>
                <section>
                    <h2 className="text-xl font-bold text-foreground">6. アクセス解析</h2>
                    <p>サービス改善のため、Google Analytics等のアクセス解析ツールを導入している場合があります。導入時は個人を特定しない形での集計にとどめます。</p>
                </section>
                <section>
                    <h2 className="text-xl font-bold text-foreground">7. 免責事項</h2>
                    <p>本サービスは現状有姿（as-is）で提供され、内容の正確性・完全性・可用性についていかなる保証もしません。AIによる要約には誤りが含まれる可能性があるため、重要な情報は必ず原文をご確認ください。</p>
                </section>
                <section>
                    <h2 className="text-xl font-bold text-foreground">8. 本ポリシーの変更</h2>
                    <p>本ポリシーは予告なく変更される場合があります。重要な変更がある場合は本ページ上で告知します。</p>
                </section>
            </div>
        </div>
    );
}
