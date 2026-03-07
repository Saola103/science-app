"use client";

import { useLanguage } from "@/components/LanguageProvider";

export default function ThoughtsPage() {
    const { t } = useLanguage();

    return (
        <div className="min-h-screen text-slate-300 pb-32 pt-16">
            <main className="mx-auto w-full max-w-3xl px-6">
                <h1 className="text-4xl font-bold tracking-tight sm:text-5xl text-white mb-10 text-center drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                    {t("開発者の思い", "Developer's thoughts")}
                </h1>

                <div className="bg-white/5 backdrop-blur-md rounded-3xl p-8 sm:p-12 shadow-2xl border border-white/10 relative overflow-hidden">
                    <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-cyan-500/10 blur-[100px] rounded-full pointer-events-none"></div>

                    <div className="prose prose-invert prose-lg max-w-none text-slate-300 leading-relaxed relative z-10">
                        {t(
                            <>
                                <p className="font-medium text-white text-xl sm:text-2xl border-l-4 border-cyan-400 pl-4 py-1 mb-10 leading-snug">
                                    「科学論文は難しすぎる」。<br />
                                    そんな常識を、高校生がAI技術を使って塗り替えました。
                                </p>
                                <div className="space-y-6">
                                    <p>
                                        私が開発した『Science Papers』は、世界中の最新論文をAIが収集・要約し、中高生から社会人まで、誰もが「一般向け」と「専門家向け」の深度を選んで読めるプラットフォームです。
                                    </p>
                                    <p>
                                        なぜ高校生がこれを作るのか？<br />
                                        それは、私自身が研究を志す中で「科学の面白さ」を誰よりも早く、そしてもっと簡単に体験したかったからです。研究は、限られた人のための特別な営みではありません。
                                    </p>
                                    <p>
                                        中高生には「研究という選択肢」を。社会人の方には「科学的思考のアップデート」を。<br />
                                        科学の最前線へ、ワンクリックで飛び込める環境をここから届けます。
                                    </p>
                                </div>
                                <p className="mt-12 font-medium text-cyan-300 text-xl flex items-center justify-end border-t border-white/10 pt-6">
                                    開発者　Saola
                                </p>
                            </>,
                            <>
                                <p className="font-medium text-white text-xl sm:text-2xl border-l-4 border-cyan-400 pl-4 py-1 mb-10 leading-snug">
                                    &quot;Scientific papers are too difficult.&quot;<br />
                                    A high school student has shattered this common sense using AI technology.
                                </p>
                                <div className="space-y-6">
                                    <p>
                                        &quot;Science Papers,&quot; which I developed, is a platform where AI collects and summarizes the latest papers from around the world. Anyone, from middle and high school students to working adults, can choose to read at either a &quot;General&quot; or &quot;Expert&quot; depth.
                                    </p>
                                    <p>
                                        Why did a high school student build this?<br />
                                        Because as I aspired to do research myself, I wanted to experience the &quot;fascination of science&quot; sooner and more easily than anyone else. Research is not a special activity limited to a select few.
                                    </p>
                                    <p>
                                        For middle and high school students: &quot;Research as an option.&quot; For working adults: &quot;An update to your scientific thinking.&quot;<br />
                                        From here, I will deliver an environment where you can jump into the forefront of science with a single click.
                                    </p>
                                </div>
                                <p className="mt-12 font-medium text-cyan-300 text-xl flex items-center justify-end border-t border-white/10 pt-6">
                                    Developer: Saola
                                </p>
                            </>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
