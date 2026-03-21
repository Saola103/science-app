"use client";

import { useLanguage } from "../../../components/LanguageProvider";

export default function PrivacyPage() {
    const { t } = useLanguage();
    return (
        <div className="mx-auto max-w-4xl px-6 py-24 space-y-12">
            <h1 className="text-4xl font-black">{t("プライバシーポリシー", "Privacy Policy")}</h1>
            <div className="prose dark:prose-invert max-w-none space-y-8 font-medium text-slate-700 dark:text-slate-300">
                <section>
                    <h2 className="text-xl font-bold text-foreground">1. {t("個人情報の収集", "Data Collection")}</h2>
                    <p>{t("本サービスでは、アカウント登録時にメールアドレスを取得します。これらの情報は、ログイン認証および重要なお知らせの送信に使用されます。", "We collect email addresses for authentication and important notifications.")}</p>
                </section>
                <section>
                    <h2 className="text-xl font-bold text-foreground">2. {t("クッキーの使用", "Cookies")}</h2>
                    <p>{t("設定（言語、テーマ、選択カテゴリ）を保存するためにブラウザのローカルストレージおよびクッキーを使用することがあります。", "We use local storage and cookies to save your settings (language, theme, categories).")}</p>
                </section>
                <section>
                    <h2 className="text-xl font-bold text-foreground">3. {t("広告について", "Advertising")}</h2>
                    <p>{t("本サービスはGoogle AdSenseを利用した広告を掲載しています。Google AdSenseはユーザーの興味・関心に基づいたパーソナライズ広告を配信するためにCookieを使用します。Googleによるデータ使用の詳細はGoogleプライバシーポリシーをご確認ください。広告のパーソナライズはGoogleの広告設定ページからオプトアウト可能です。", "This service uses Google AdSense for advertising. Google AdSense uses cookies to serve personalized ads based on your interests. For details on Google's data practices, please see Google's Privacy Policy. You can opt out of personalized advertising via Google's Ads Settings.")}</p>
                </section>
                <section>
                    <h2 className="text-xl font-bold text-foreground">4. {t("第三者提供", "Third-party sharing")}</h2>
                    <p>{t("法令に基づく場合を除き、取得した個人情報を第三者に提供することはありません。ただし、広告配信のためにGoogle AdSenseと情報を共有する場合があります。", "We do not share your personal data with third parties except as required by law or for advertising via Google AdSense.")}</p>
                </section>
                <section>
                    <h2 className="text-xl font-bold text-foreground">5. {t("アクセス解析", "Analytics")}</h2>
                    <p>{t("サービス改善のため、アクセス状況の分析を行う場合があります。これらの情報は個人を特定するものではありません。", "We may analyze access logs to improve our service. This data does not identify individuals.")}</p>
                </section>
            </div>
        </div>
    );
}
