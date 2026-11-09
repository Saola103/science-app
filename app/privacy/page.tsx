import { CONTACT_EMAIL } from "../../lib/site/contact";

// Google Analytics は layout.tsx と同じ環境変数で読み込みの有無が決まる(ビルド時に確定)。
// 本文もそれに合わせて出し分ける。
// 要確認(オーナー決定・未対応): 運営者の表記、未成年である旨と保護者の関与、GA4を本番で使うかの最終決定、
// 外部サービス(Groq/Gemini/Supabase/Vercel)の保持・学習利用の取り扱い、保存期間。
const GA_ENABLED = !!process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

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
                    <h2 className="text-xl font-bold text-foreground">2. 取得する情報</h2>
                    <p>本サービスはアカウント登録・ログイン機能を提供しておらず、氏名・メールアドレスなどを入力していただく設計にしていません。取得する情報は、サービスの提供と改善に必要な最小限にとどめます。</p>
                    <ul className="list-disc pl-6 space-y-2">
                        <li>端末（ブラウザ）内の情報: 保存記事、フォロー、読んだ記事の記録、連続利用日数、閲覧時間、テーマ設定などは、お使いのブラウザのローカルストレージに保存され、原則として運営者のサーバーには送信されません。ブラウザの設定で削除できます。</li>
                        <li>検索・AIチャットに入力した内容: 回答の生成や検索のため、外部のAIサービス（下記5）に送信されます。個人情報や機密情報は入力しないでください。{/* 要確認: 入力内容をサーバー側で保存しているか・保存期間 */}</li>
                        <li>ご意見・フィードバック: 「ご意見」に入力された文章を、サービス改善のために受け取り、運営者の管理するデータベースおよびGoogleスプレッドシートに保存します。氏名やメールアドレスは求めません。文章中に個人情報を書かないでください。</li>
                        <li>通信記録（ログ）: 不正利用の防止やアクセス制限のため、IPアドレスやアクセス日時などが、ホスティング事業者（Vercel）のログや一時的な制限処理に使われます。</li>
                    </ul>
                </section>
                <section>
                    <h2 className="text-xl font-bold text-foreground">3. Cookie・ローカルストレージ・アクセス解析</h2>
                    <p>設定や保存記事などの保存にブラウザのローカルストレージを使用します。広告配信を目的としたCookieは使用していません。</p>
                    {GA_ENABLED ? (
                        <p>サービスの利用状況を把握して改善するため、Google LLCのGoogleアナリティクス（GA4）を利用しています。ページの閲覧、端末・ブラウザの種類、おおよその地域、利用日時などの情報が、Cookieまたはそれに類する技術を通じて収集され、Googleに送信されます。広告配信やプロファイリングを目的とした利用はしません。収集を望まない場合は、ブラウザのCookie設定、またはGoogleのオプトアウトアドオン（https://tools.google.com/dlpage/gaoptout）で停止できます。</p>
                    ) : (
                        <p>Googleアナリティクスは使用していません。</p>
                    )}
                    <p>また、Vercel Inc.のVercel Web Analyticsで、ページの閲覧数などの統計情報を取得しています。{/* 要確認: Vercel Web AnalyticsがCookieを使わない旨は一次情報で確認してから記載 */}</p>
                </section>
                <section>
                    <h2 className="text-xl font-bold text-foreground">4. 広告について</h2>
                    <p>本サービスは非営利運営のため、広告は掲載していません。Google AdSense等の広告配信サービスは利用していません。</p>
                </section>
                <section>
                    <h2 className="text-xl font-bold text-foreground">5. 外部サービスへの送信</h2>
                    <p>本サービスは次の事業者のサービスを利用しており、入力内容や利用情報がこれらに送信されることがあります。事業者は海外（主に米国）に所在する場合があります。取り扱いは各社のプライバシーポリシー等に従います。{/* 要確認: 各社のデータ保持・学習利用・保存地域、個人情報保護法上の整理は専門家確認 */}</p>
                    <ul className="list-disc pl-6 space-y-2">
                        <li>Groq, Inc.: AIによる要約・チャット回答の生成</li>
                        <li>Google LLC: 検索用の埋め込み生成（Gemini API）、フィードバックの保存（Googleスプレッドシート）{GA_ENABLED ? "、アクセス解析（GA4）" : ""}</li>
                        <li>Supabase, Inc.: データベース（記事データ、フィードバック）</li>
                        <li>Vercel Inc.: ホスティング、アクセス解析</li>
                    </ul>
                    <p>法令に基づく場合を除き、取得した個人情報を、上記のサービス提供に必要な範囲を超えて第三者に提供することはありません。</p>
                </section>
                <section>
                    <h2 className="text-xl font-bold text-foreground">6. 開示・訂正・削除のご請求、お問い合わせ</h2>
                    <p>運営者が保有するあなたに関する情報の開示・訂正・削除などを希望される場合は、{CONTACT_EMAIL} までご連絡ください。{/* 要確認: 窓口メールはオーナー決定(lib/site/contact.ts) */}</p>
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
