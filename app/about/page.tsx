export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <main className="mx-auto w-full max-w-3xl px-6 py-12 space-y-8">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            開発者の思い
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            科学情報の民主化と、著作権を尊重した知の共有をめざして。
          </p>
        </header>

        <section className="space-y-4 text-sm leading-7 text-slate-800">
          <h2 className="text-base font-semibold text-slate-900">科学情報の民主化</h2>
          <p>
            このアプリは、専門的な論文をただ列挙するのではなく、「一般向け」と「専門家向け」の
            2つのレイヤーで要約することで、できるだけ多くの人が科学の最前線にアクセスできるようにすることを目指しています。
          </p>
          <p>
            研究者・学生・実務家だけでなく、「なんとなく興味がある」人でも、負荷なく概要に触れられること。
            そして、より深く知りたいときには一次情報や専門家向けの説明へ自然に橋渡しされること。
            その「知への入り口」を整えることが、このプロジェクトの出発点です。
          </p>
        </section>

        <section className="space-y-4 text-sm leading-7 text-slate-800">
          <h2 className="text-base font-semibold text-slate-900">著作権への配慮とライセンス</h2>
          <p>
            本アプリで扱う論文は、arXiv などオープンアクセスの情報源を中心に収集しています。
            元論文のライセンスに従い、本文そのものを再配布するのではなく、「要約」という二次的な説明にとどめることで、
            著作権・利用規約を尊重しながら情報提供を行う方針です。
          </p>
          <p>
            また、元の論文へのリンクを明示し、「一次情報にアクセスできること」を大切にしています。
            要約はあくまでナビゲーションであり、解釈の一つであることを前提に設計しています。
          </p>
        </section>

        <section className="space-y-4 text-sm leading-7 text-slate-800">
          <h2 className="text-base font-semibold text-slate-900">AI 要約との付き合い方</h2>
          <p>
            要約生成には大規模言語モデル（LLM）を利用していますが、モデルは誤りを含む可能性があります。
            そのため、本アプリの要約は「便利な概要」でありつつも、「最終的な判断は元論文と人間の目に委ねる」前提で運営します。
          </p>
          <p>
            将来的には、専門家によるレビューや「この要約はどれくらい信頼できるか」といったメタ情報を付与することで、
            より安全で透明性の高い科学コミュニケーションの形を探っていきたいと考えています。
          </p>
        </section>

        <section className="space-y-4 text-sm leading-7 text-slate-800">
          <h2 className="text-base font-semibold text-slate-900">開発者の想い</h2>
          <p>
            「難しいことを、難しさを失わないまま、もう少しだけやさしく届けたい」──
            そんな思いから、このアプリは生まれました。
          </p>
          <p>
            科学の面白さや意義は、本来ごく身近なところにあります。
            ただ、論文というフォーマットや英語・専門用語の壁が、それを遠ざけてしまうことも多くあります。
            その距離を、少しでも縮める手助けができれば幸いです。
          </p>
        </section>
      </main>
    </div>
  );
}

