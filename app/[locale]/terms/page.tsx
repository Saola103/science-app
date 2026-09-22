"use client";

import { useLanguage } from "../../../components/LanguageProvider";

export default function TermsPage() {
    const { t } = useLanguage();
    return (
        <div className="mx-auto max-w-4xl px-6 py-24 space-y-12">
            <h1 className="text-4xl font-black">{t("利用規約", "Terms of Service")}</h1>
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                {t(
                    "本規約は下書き段階であり、専門家（行政書士・弁護士等）によるレビューを経ていません。",
                    "This is a draft that has not yet been reviewed by a legal professional."
                )}
            </p>
            <div className="prose dark:prose-invert max-w-none space-y-8 font-medium text-slate-700 dark:text-slate-300">
                <section>
                    <h2 className="text-xl font-bold text-foreground">1. {t("規約の適用", "Applicability")}</h2>
                    <p>{t("本規約は、本サービスの利用に関する条件を定めるものです。利用者は、本サービスを利用することで本規約に同意したものとみなされます。", "These terms govern the use of our service. By using the service, you agree to these terms.")}</p>
                </section>
                <section>
                    <h2 className="text-xl font-bold text-foreground">2. {t("サービスの目的・非営利性", "Purpose and non-profit nature")}</h2>
                    <p>{t("本サービスは、AI技術を用いて科学論文・科学ニュースの要約を提供し、学術情報へのアクセスを容易にすることを目的とした、個人開発・非営利の教育目的のサービスです。商用の対価を目的とした提供ではありません。アカウント登録・ログイン機能はなく、どなたでも無料でご利用いただけます。", "This service uses AI to summarize scientific papers and news, making academic information easier to access. It is an individually-run, non-profit, educational project — not a commercial offering. There is no account registration or login; anyone can use it free of charge.")}</p>
                </section>
                <section>
                    <h2 className="text-xl font-bold text-foreground">3. {t("免責事項", "Disclaimer")}</h2>
                    <p>{t("本サービスは現状有姿（as-is）で提供され、内容の正確性・完全性・可用性についていかなる保証もしません。特に、AIによって生成された要約には誤り・不正確な内容が含まれる可能性があります。重要な情報を利用する際は、必ず原文（出典リンク先）をご確認ください。", "This service is provided as-is, with no warranty as to the accuracy, completeness, or availability of its content. In particular, AI-generated summaries may contain errors or inaccuracies. Please verify important information against the original source linked from each article.")}</p>
                </section>
                <section>
                    <h2 className="text-xl font-bold text-foreground">4. {t("禁止事項", "Prohibited uses")}</h2>
                    <p>{t("不正アクセス、本サービスのサーバーに過度な負荷をかける自動アクセス・スクレイピング、本サービスの構成・UI・機能を模倣する目的での利用を禁止します。", "You may not attempt unauthorized access, use automated scraping that places excessive load on our servers, or use the service for the purpose of imitating its design, UI, or functionality.")}</p>
                </section>
                <section>
                    <h2 className="text-xl font-bold text-foreground">5. {t("著作権について", "Copyright")}</h2>
                    <p>{t("本サービスで扱う論文・ニュース記事はarXiv・bioRxiv/medRxiv等のオープンアクセス（CC BY等）および各ニュース配信元の記事に基づいています。掲載する要約は著作権法上の引用（公正な慣行への合致、正当な範囲内での利用、引用部分の明瞭な区別、出典明示）として運用しており、原著作物の著作権は原著作者・原出典に帰属します。各記事には原文・出典へのリンクを付しています。", "The papers and news articles handled by this service are based on open-access sources (e.g. CC BY) such as arXiv and bioRxiv/medRxiv, and on each news outlet's own articles. Summaries are presented as quotations under copyright law (following fair practice, within a legitimate scope, clearly distinguished, with the source cited); copyright in the original works remains with their original authors/publishers. Each article links back to its original source.")}</p>
                </section>
                <section>
                    <h2 className="text-xl font-bold text-foreground">6. {t("サービスの変更・中断・終了", "Changes, suspension, or termination of the service")}</h2>
                    <p>{t("本サービスは個人開発・非営利で運営されているため、予告なく内容を変更、または提供を中断・終了する場合があります。", "As this service is run individually and non-profit, its content may be changed, suspended, or discontinued without prior notice.")}</p>
                </section>
                <section>
                    <h2 className="text-xl font-bold text-foreground">7. {t("お問い合わせ", "Contact")}</h2>
                    <p>{t("本規約に関するお問い合わせは、お問い合わせページ（/contact）よりご連絡ください。", "For questions about these terms, please contact us via the contact page (/contact).")}</p>
                </section>
            </div>
        </div>
    );
}
