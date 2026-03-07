"use client";

import { useLanguage } from "@/components/LanguageProvider";

export default function AboutPage() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-white pb-32">
      <section className="mx-auto max-w-4xl px-6 pt-24 pb-16 space-y-8">
        <div className="text-xs-pro text-cyan-600">Vision</div>
        <h1 className="text-5xl sm:text-8xl font-black tracking-tighter uppercase leading-[0.85]">
          Democratizing<br />
          <span className="text-neutral-300">Science.</span>
        </h1>
        <p className="max-w-xl text-lg font-bold leading-tight text-neutral-500">
          {t("「科学論文は難しすぎる」。そんな常識を、高校生がAI技術を使って塗り替えました。", "Redefining the accessibility of research using AI. A project born from a high schooler's curiosity.")}
        </p>
      </section>

      <main className="mx-auto max-w-4xl px-6">
        <div className="border-t border-black pt-12 space-y-24">
          <section className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="text-xs-pro text-neutral-400">01 / Motivation</div>
            <div className="md:col-span-2 space-y-8 text-xl font-bold leading-tight">
              <p>
                {t("私は高校生で以前から科学の世界に興味を持っていました。最先端の科学の世界を知るには論文は欠かせません。しかし、論文を読みこなすだけでなく、そもそも読みたい論文を探すところから高いハードルがありました。",
                  "As a high school student fascinated by science, I found that accessing cutting-edge papers was surprisingly difficult—not just reading them, but even locating the right ones.")}
              </p>
              <p>
                {t("同じような悩みを抱えた学生は日本に、そして世界中に数多くいるはずです。科学は一部の専門家だけのものではなく、好奇心を持つすべての人に開かれているべきだと信じています。",
                  "I believe science shouldn't be gated. It should be open to anyone with the drive to learn, regardless of their background or age.")}
              </p>
            </div>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="text-xs-pro text-neutral-400">02 / Solution</div>
            <div className="md:col-span-2 space-y-8 text-xl font-bold leading-tight">
              <p>
                {t("このアプリ「Science Papers」は、AIが膨大な論文データベースから最新の研究を抽出し、「一般」と「専門家」の二つの視点で要約を提供します。",
                  "Science Papers uses AI to bridge the gap between complex research and human understanding, offering dual-depth summaries for every paper.")}
              </p>
              <p className="text-cyan-600">
                {t("中高生には「研究という選択肢」を。社会人の方には「科学的思考のアップデート」を。",
                  "Providing a path to research for students, and a mental upgrade for society.")}
              </p>
            </div>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-3 gap-12 pt-12 border-t border-neutral-100">
            <div className="text-xs-pro text-neutral-400">03 / Identity</div>
            <div className="md:col-span-2 flex items-center gap-6">
              <div className="w-16 h-16 rounded-full bg-black flex items-center justify-center text-white font-black text-xl">S</div>
              <div>
                <div className="text-xl font-black uppercase">Saola</div>
                <div className="text-xs-pro text-neutral-400">Developer / High School Student</div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
