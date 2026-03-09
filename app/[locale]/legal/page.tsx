"use client";

import { useLanguage } from "@/components/LanguageProvider";

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
                            <td className="py-4">{t("基本無料（将来的に有料プランの可能性あり）", "Free (Potential paid plans in the future)")}</td>
                        </tr>
                        <tr className="border-b border-white/10">
                            <td className="py-4 font-bold">{t("引き渡し時期", "Delivery")}</td>
                            <td className="py-4">{t("登録完了後、即時利用可能", "Immediate after registration")}</td>
                        </tr>
                        <tr className="border-b border-white/10">
                            <td className="py-4 font-bold">{t("キャンセル・返品", "Cancellation")}</td>
                            <td className="py-4">{t("デジタルコンテンツの特性上、返品は不可。退会は随時可能。", "No returns due to digital nature. Cancellation anytime.")}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}
