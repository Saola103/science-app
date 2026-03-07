"use client";

import { useLanguage } from "@/components/LanguageProvider";

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
                    <h2 className="text-xl font-bold text-foreground">3. {t("第三者提供", "Third-party sharing")}</h2>
                    <p>{t("法令に基づく場合を除き、取得した個人情報を第三者に提供することはありません。", "We do not share your personal data with third parties except as required by law.")}</p>
                </section>
            </div>
        </div>
    );
}
