"use client";

import { useLanguage } from "@/components/LanguageProvider";

export default function TermsPage() {
    const { t } = useLanguage();
    return (
        <div className="mx-auto max-w-4xl px-6 py-24 space-y-12">
            <h1 className="text-4xl font-black">{t("利用規約", "Terms of Service")}</h1>
            <div className="prose dark:prose-invert max-w-none space-y-8 font-medium text-slate-700 dark:text-slate-300">
                <section>
                    <h2 className="text-xl font-bold text-foreground">1. {t("規約の適用", "Applicability")}</h2>
                    <p>{t("本規約は、本サービスの利用に関する条件を定めるものです。利用者は、本サービスを利用することで本規約に同意したものとみなされます。", "These terms govern the use of our service. By using the service, you agree to these terms.")}</p>
                </section>
                <section>
                    <h2 className="text-xl font-bold text-foreground">2. {t("サービスの目的", "Purpose")}</h2>
                    <p>{t("本サービスは、AI技術を用いて科学論文の要約を提供し、学術情報へのアクセスを容易にすることを目的としています。", "This service aims to facilitate access to academic information using AI summarization.")}</p>
                </section>
                <section>
                    <h2 className="text-xl font-bold text-foreground">3. {t("著作権について", "Copyright")}</h2>
                    <p>{t("本サービスで扱う論文はオープンアクセス（CC BY等）に基づいています。要約結果の著作権は本サービスに帰属しますが、原著論文の権利は各著作者に帰属します。", "Papers follow open-access licenses. Summaries are ours, but original rights belong to the authors.")}</p>
                </section>
            </div>
        </div>
    );
}
