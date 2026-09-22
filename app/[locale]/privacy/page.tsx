"use client";

import { useLanguage } from "../../../components/LanguageProvider";

export default function PrivacyPage() {
    const { t } = useLanguage();
    return (
        <div className="mx-auto max-w-4xl px-6 py-24 space-y-12">
            <h1 className="text-4xl font-black">{t("プライバシーポリシー", "Privacy Policy")}</h1>
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                {t(
                    "本ポリシーは下書き段階であり、専門家（行政書士・弁護士等）によるレビューを経ていません。",
                    "This is a draft that has not yet been reviewed by a legal professional."
                )}
            </p>
            <div className="prose dark:prose-invert max-w-none space-y-8 font-medium text-slate-700 dark:text-slate-300">
                <section>
                    <h2 className="text-xl font-bold text-foreground">1. {t("運営の性質", "Nature of this service")}</h2>
                    <p>{t("本サービスは個人開発・非営利の教育目的で運営されており、商用の対価を目的としたサービス提供ではありません。", "This service is operated by an individual, non-profit, for educational purposes — not as a commercial offering.")}</p>
                </section>
                <section>
                    <h2 className="text-xl font-bold text-foreground">2. {t("個人情報の収集", "Data Collection")}</h2>
                    <p>{t("本サービスはアカウント登録・ログイン機能を提供していません。保存記事・閲覧履歴・連続記録などはお使いのブラウザのローカルストレージ内にのみ保存され、サーバー側で個人を識別できる情報として保持することはありません。お問い合わせフォームは設けておらず、フォーム経由での個人情報の取得も行っていません。", "This service has no account registration or login. Saved articles, view history, and streaks are stored only in your browser's local storage and are not retained server-side in a form that identifies you. We do not operate a contact form and do not collect personal information through one.")}</p>
                </section>
                <section>
                    <h2 className="text-xl font-bold text-foreground">3. {t("クッキー・ローカルストレージ", "Cookies and local storage")}</h2>
                    <p>{t("設定（言語、テーマ、選択カテゴリ、保存記事、閲覧履歴等）を保存するためにブラウザのローカルストレージを使用します。広告配信・行動追跡を目的としたCookieは使用していません。", "We use browser local storage to save your settings (language, theme, categories, saved articles, view history). We do not use cookies for advertising or behavioral tracking.")}</p>
                </section>
                <section>
                    <h2 className="text-xl font-bold text-foreground">4. {t("広告について", "Advertising")}</h2>
                    <p>{t("本サービスは非営利運営のため、広告は掲載していません。Google AdSense等の広告配信サービスは利用していません。", "This service is run non-profit and does not display advertising. We do not use ad services such as Google AdSense.")}</p>
                </section>
                <section>
                    <h2 className="text-xl font-bold text-foreground">5. {t("第三者提供", "Third-party sharing")}</h2>
                    <p>{t("法令に基づく場合を除き、取得した個人情報を第三者に提供することはありません。", "We do not share your personal data with third parties except as required by law.")}</p>
                </section>
                <section>
                    <h2 className="text-xl font-bold text-foreground">6. {t("アクセス解析", "Analytics")}</h2>
                    <p>{t("サービス改善のため、Google Analytics等のアクセス解析ツールを導入している場合があります。導入時は個人を特定しない形での集計にとどめます。", "We may use access analytics tools such as Google Analytics to improve the service. Where used, data is aggregated and not used to identify individuals.")}</p>
                </section>
                <section>
                    <h2 className="text-xl font-bold text-foreground">7. {t("免責事項", "Disclaimer")}</h2>
                    <p>{t("本サービスは現状有姿（as-is）で提供され、内容の正確性・完全性・可用性についていかなる保証もしません。AIによる要約には誤りが含まれる可能性があるため、重要な情報は必ず原文をご確認ください。", "This service is provided as-is, without any warranty as to the accuracy, completeness, or availability of its content. AI-generated summaries may contain errors — please verify important information against the original source.")}</p>
                </section>
                <section>
                    <h2 className="text-xl font-bold text-foreground">8. {t("本ポリシーの変更", "Changes to this policy")}</h2>
                    <p>{t("本ポリシーは予告なく変更される場合があります。重要な変更がある場合は本ページ上で告知します。", "This policy may be changed without notice. Significant changes will be announced on this page.")}</p>
                </section>
            </div>
        </div>
    );
}
