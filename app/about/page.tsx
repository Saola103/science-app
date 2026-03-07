"use client";

import { useLanguage } from "@/components/LanguageProvider";

export default function AboutPage() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen text-slate-300 pb-32 pt-16">
      <main className="mx-auto w-full max-w-3xl px-6">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl text-white mb-10 text-center drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
          {t("このアプリについて", "About this app")}
        </h1>
        <div className="bg-white/5 backdrop-blur-md rounded-3xl p-8 sm:p-12 shadow-2xl border border-white/10 relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-cyan-500/10 blur-[100px] rounded-full pointer-events-none"></div>
          <div className="prose prose-invert prose-lg max-w-none text-slate-300 leading-relaxed relative z-10">
            {t(
              <>
                <p className="font-medium text-white text-xl sm:text-2xl border-l-4 border-cyan-400 pl-4 py-1 mb-10 leading-snug">
                  高校生が作った論文アプリ
                </p>
                <div className="space-y-8">
                  <section>
                    <h2 className="text-2xl font-bold text-white mb-4 border-b border-white/10 pb-2">開発者の想い</h2>
                    <p>私は高校生で以前から科学の世界に興味を持っていました。最先端の科学の世界を知るには論文は欠かせません。しかし、論文を読むだけでなくそもそも読みたい論文を探すところから高校生にはハードルが高いものでした。同じような悩みを抱えた高校生は日本に数多くいると思います。</p>
                    <p className="mt-4">そこで私は論文をもっと身近に、全員にわかりやすく、読めるようこのアプリ「Science Papers」を開発しました。このアプリではAIに要約された最新の科学ニュースや論文を「一般向け」「専門家向け」と二つの難度で読むことができます。また論文のAI検索もでき、読みたい論文をすぐに読むことができます。このようにこのアプリでは自分の興味を突き詰めることも、科学への興味を広げることも、どちらもすることができます。</p>
                    <p className="mt-4">私はこのアプリを高校生が科学への興味を妨げられることなく突き進んでいけることを願って作成しました。しかし、もちろん大人の研究者だけでなく社会人も自分の中に眠るうちなる科学への興味を突き詰めることができます、私はこのアプリが日本のみならず世界中の人々の科学への興味をブーストするよう祈っています。</p>
                    <p className="mt-6 font-medium text-cyan-300 text-lg flex items-center justify-end">開発者　Saola</p>
                  </section>
                  <section className="pt-8 border-t border-white/10">
                    <h2 className="text-2xl font-bold text-white mb-4 border-b border-white/10 pb-2">著作権への配慮とライセンス</h2>
                    <p>本アプリで扱う論文は、arXiv などオープンアクセスの情報源を中心に収集しています。元論文のライセンスに従い、本文そのものを再配布するのではなく、「要約」という二次的な説明にとどめることで、著作権・利用規約を尊重しながら情報提供を行う方針です。</p>
                    <p className="mt-4">また、元の論文へのリンクを明示し、「一次情報にアクセスできること」を大切にしています。要約はあくまでナビゲーションであり、解釈の一つであることを前提に設計しています。</p>
                  </section>
                  <section className="pt-8 border-t border-white/10">
                    <h2 className="text-2xl font-bold text-white mb-4 border-b border-white/10 pb-2">AI 要約との付き合い方</h2>
                    <p>要約生成には大規模言語モデル（LLM）を利用していますが、モデルは誤りを含む可能性があります。そのため、本アプリの要約は「便利な概要」でありつつも、「最終的な判断は元論文と人間の目に委ねる」前提で運営します。</p>
                    <p className="mt-4">将来的には、専門家によるレビューや「この要約はどれくらい信頼できるか」といったメタ情報を付与することで、より安全で透明性の高い科学コミュニケーションの形を探っていきたいと考えています。</p>
                  </section>
                </div>
              </>,
              <>
                <p className="font-medium text-white text-xl sm:text-2xl border-l-4 border-cyan-400 pl-4 py-1 mb-10 leading-snug">
                  A Paper App Created by a High School Student
                </p>
                <div className="space-y-8">
                  <section>
                    <h2 className="text-2xl font-bold text-white mb-4 border-b border-white/10 pb-2">Developer&apos;s Thoughts</h2>
                    <p>I am a high school student and have always been interested in the world of science. Research papers are essential for understanding cutting-edge science, but even finding them was a high hurdle for students like me. I believe many high school students in Japan share this struggle.</p>
                    <p className="mt-4">That&apos;s why I developed &quot;Science Papers&quot; — to make research papers accessible and understandable for everyone. This app provides AI-summarized papers at two difficulty levels: &quot;General&quot; and &quot;Expert.&quot; You can also use AI Search to quickly find papers on topics you care about.</p>
                    <p className="mt-4">I created this app hoping that high school students can pursue their interest in science freely. But of course, researchers and working professionals can also deepen their inner curiosity for science. I pray this app boosts the interest in science of people around the world.</p>
                    <p className="mt-6 font-medium text-cyan-300 text-lg flex items-center justify-end">Developer: Saola</p>
                  </section>
                  <section className="pt-8 border-t border-white/10">
                    <h2 className="text-2xl font-bold text-white mb-4 border-b border-white/10 pb-2">Copyright &amp; Licensing</h2>
                    <p>Papers in this app are collected from open access sources like arXiv. We provide &quot;summaries&quot; rather than redistributing original text, respecting copyrights and terms of use. Links to original papers are always provided.</p>
                  </section>
                  <section className="pt-8 border-t border-white/10">
                    <h2 className="text-2xl font-bold text-white mb-4 border-b border-white/10 pb-2">About AI Summaries</h2>
                    <p>Summaries are generated using Large Language Models (LLM), which may contain errors. They serve as a &quot;convenient overview&quot; — final judgment should always be based on the original paper.</p>
                  </section>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
