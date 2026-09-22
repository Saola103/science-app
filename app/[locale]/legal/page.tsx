"use client";

import { useLanguage } from "../../../components/LanguageProvider";

export default function LegalPage() {
    const { t } = useLanguage();
    return (
        <div className="mx-auto max-w-4xl px-6 py-24 space-y-12">
            <h1 className="text-4xl font-black">{t("特定商取引法に基づく表記", "Legal Notice (MSL)")}</h1>
            <div className="prose dark:prose-invert max-w-none space-y-8 font-medium text-slate-700 dark:text-slate-300">
                <table className="w-full border-collapse">
                    <tbody>
                        <tr className="border-b border-white/10">
                            <td className="py-4 font-bold w-1/3">{t("運営者名", "Provider")}</td>
                            <td className="py-4">Saola (Science Papers Project)</td>
                        </tr>
                        <tr className="border-b border-white/10">
                            <td className="py-4 font-bold">{t("お問い合わせ先", "Contact")}</td>
                            <td className="py-4">contact@saolams.com</td>
                        </tr>
                        <tr className="border-b border-white/10">
                            <td className="py-4 font-bold">{t("販売価格", "Price")}</td>
                            <td className="py-4">{t("無料（非営利の教育目的サービスとして運営しており、基本無料を継続する方針です）", "Free (operated as a non-profit, educational service; we intend to keep it free)")}</td>
                        </tr>
                        <tr className="border-b border-white/10">
                            <td className="py-4 font-bold">{t("引き渡し時期", "Delivery")}</td>
                            <td className="py-4">{t("アカウント登録・ログイン機能はなく、サイトにアクセス後すぐにご利用いただけます。", "There is no account registration or login — the service is available immediately upon accessing the site.")}</td>
                        </tr>
                        <tr className="border-b border-white/10">
                            <td className="py-4 font-bold">{t("キャンセル・返品", "Cancellation")}</td>
                            <td className="py-4">{t("デジタルコンテンツの特性上、返品は不可。アカウント登録自体がないため退会の手続きは不要で、ブラウザでの利用をやめることでいつでも利用を終了できます。", "No returns due to the nature of digital content. As there is no account registration, no cancellation procedure is required — you may simply stop using the service in your browser at any time.")}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}
