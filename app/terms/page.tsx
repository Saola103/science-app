import { CONTACT_EMAIL } from "../../lib/site/contact";

// 要確認(オーナー決定事項・未対応): 運営者が未成年である旨と保護者の関与、
// 準拠法・管轄、年齢の下限。文面案は 20_ビジネス/進行中/ビジネス戦略/POCKET_DIVE_法務整備_G4.md 2-1 参照。
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
                    <h2 className="text-xl font-bold text-foreground">3. AI要約についての注意と免責</h2>
                    <p>本サービスの要約・解説は、AIが自動で生成したものです。事実と異なる内容や、重要な情報の抜け、不正確な数値や表現が含まれることがあります。学習や興味のきっかけとしてご利用いただき、研究・学習上の重要な判断、医療・健康・法律・投資などの専門的な判断には使用せず、必ず原文（出典リンク先）をご確認ください。本サービスは医療行為や診断の助言を行うものではありません。</p>
                    <p>本サービスは現状有姿（as-is）で無償提供され、内容の正確性・完全性・最新性・継続的な利用可能性を保証しません。運営者に故意または重大な過失がある場合を除き、本サービスの利用または利用できなかったことによる損害について責任を負いません。ただし、法令により免責が認められない場合はこの限りではありません。{/* 要確認: 免責条項の有効性(消費者契約法8条等)は専門家確認 */}</p>
                </section>
                <section>
                    <h2 className="text-xl font-bold text-foreground">4. 禁止事項</h2>
                    <p>法令・公序良俗に反する行為、不正アクセス、本サービスのサーバーに過度な負荷をかける自動アクセス・スクレイピング、本サービスのコンテンツの大量の収集・複製・再配布やAIの学習への利用、本サービスの構成・UI・機能を模倣する目的での利用、他者の権利を侵害する行為を禁止します。また、検索やAIチャットに、自分や他人の個人情報・機密情報を入力しないでください。</p>
                </section>
                <section>
                    <h2 className="text-xl font-bold text-foreground">5. 出典と権利</h2>
                    <p>本サービスは、論文（arXiv、およびbioRxiv/medRxivのうちCC BYまたはCC0のライセンスのもの）と、公的機関（NASA・NSF・CERN）が公開するニュースの内容を、AIで日本語に要約して紹介します。各情報源の利用条件に従うよう努めています。{/* 要確認: 情報源の最終リストと、要約の法的整理(著作権法30条の4・47条の5・32条・27条等)は専門家確認。「引用として適法」とは断定しない */}</p>
                    <p>紹介する論文・記事の著作権その他の権利は、それぞれの著者・出版元・配信元に帰属します。各記事には出典名と原文へのリンクを表示しています。要約は元の著作物の代わりになるものではありません。全文は原文でお読みください。</p>
                </section>
                <section>
                    <h2 className="text-xl font-bold text-foreground">権利者の方・誤りのご指摘</h2>
                    <p>権利者の方、または記載内容に誤りがあると考える方は、{CONTACT_EMAIL} までご連絡ください。内容を確認のうえ、不適切と判断した場合は、速やかに該当部分を非表示または削除します。{/* 要確認: 窓口メールはオーナー決定(lib/site/contact.ts) */}</p>
                </section>
                <section>
                    <h2 className="text-xl font-bold text-foreground">6. サービスの変更・中断・終了</h2>
                    <p>本サービスは個人開発・非営利で運営されているため、予告なく内容を変更、または提供を中断・終了する場合があります。</p>
                </section>
            </div>
        </div>
    );
}
