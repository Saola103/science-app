# POCKET DIVE

TikTok スタイルの縦スクロールで最新科学論文・ニュースを配信する Next.js Web アプリ。（提案書は Obsidian Vault 側 `20_ビジネス/POCKET DIVE/` 参照）。本番は Vercel にデプロイ済み。

## アーキテクチャ

- `app/`（旧 `app/[locale]/`）— アプリ本体のページ（ホーム・フィード・検索・論文詳細・管理画面など）。2026-09-24 に next-intl による多言語対応（英語含む）を完全撤去し、日本語のみのアプリになった。ロケールプレフィックス（`/ja/...`）は廃止し、`/feedapp/feed` のようにルート直下から始まる。UI文言は `messages/*.json` から呼び出す代わりに、コンポーネント側でハードコードするか `lib/i18n/ja.ts`（next-intl の `useTranslations`/`useLocale` と同じ呼び出し形を持つ、日本語固定の軽量シム。言語切り替えは存在しない）経由で参照する。
- `app/api/` — API Routes。`cron/collect`・`cron/fix-summaries` は Vercel Cron から叩かれる自動パイプライン、`admin/*` は手動トリガー用（`CRON_SECRET` または `ADMIN_PASSWORD` で認証）。
- `lib/pipeline/collect.ts` — 収集パイプライン本体。arXiv / bioRxiv / RSS ニュースを取得し、Groq (LLaMA-3.3-70B) で「やさしく／くわしく」の2種類の日本語要約を生成、embedding を作って Supabase に upsert する。ニュースは仕様上「やさしく」1種類のみ生成し `summary_expert` を持たない（`lib/proto/mapArticle.ts`の`isDuplicateSummaryPair()`はこれを重複ではなく正常な単一パネル記事として扱う — 2026-09-23 の重複判定修正がここを誤判定してニュースを全画面から消していたリグレッションを2026-09-24 に修正済み）。
- `lib/sources/` — 各データソース（arxiv, biorxiv, news/rss, pubmed）のフェッチャー。PubMed は著作権リスクのため収集パイプラインからは除外済み（コメント参照）。
- `lib/llm/` — Groq / Gemini 呼び出しのラッパーと要約プロンプト。プロンプトはLaTeX記法を使わないよう明示的に指示している（2026-09-24 追加）。
- `lib/supabase/` — クライアント（anon key）とサーバー用クライアント（service role key）。RLS ポリシーは `supabase/migrations/`。
- `app/feedapp/` + `components/proto/` — 現行のフィードUI（旧 `components/FeedCard.tsx` ベースの `/feed` ルートは削除済み）。`lib/format/summaryText.ts` 等の `stripMarkdown` 系関数は LLM 出力から Markdown 記法・LaTeX記法を除去してカードに表示するための処理。

## 開発コマンド

```bash
npm run dev
npm run build
npm run lint
```

## 環境変数（`.env.local`、Git 管理外）

`GROQ_API_KEY` / `GEMINI_API_KEY` / `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` / `RESEND_API_KEY` / `FROM_EMAIL` / `CRON_SECRET`（任意で `ADMIN_PASSWORD`）。値は絶対に読み上げたりコミットしたりしない。

## 改善サイクル（builder / judge）

`/pocketdive-cycle` で1サイクル実行できる: `pocketdive-builder` サブエージェントが最優先の改善を1件実装・検証・ローカルコミットし、`pocketdive-judge` サブエージェントが類似サービスと比較してその変更とプロダクト全体を評価し、`docs/judge-feedback.md` に次の優先事項を書き残す。定義は `.claude/agents/pocketdive-builder.md` / `.claude/agents/pocketdive-judge.md`。手動起動のみで、自動ループはしない。`git push` はどちらのエージェントも行わない。

## 運用上の制約

- Groq 無料枠は分あたり8,000トークン（TPM）・1日あたり200,000トークン（TPD）の両方が上限（`lib/llm/index.ts`のコメント参照、429レスポンスで実測確認済み。旧「1日100kトークン」という記載は誤りだったため訂正）。`lib/pipeline/collect.ts` の `PAPERS_PER_CATEGORY` はこの上限内に収まるよう調整してあるので、収集件数を増やす変更をするときは冒頭のコメントの計算式を更新しながら判断する。
- `next.config.ts` で `typescript.ignoreBuildErrors: true` になっている（Vercel デプロイ都合の暫定対応）。型エラーを握りつぶす設定なので、新規実装では型チェックを別途 `tsc --noEmit` 等で確認するのが安全。
- `.claude/settings.local.json` はローカル専用（gitignore 済み）。共有したい設定は `.claude/settings.json` を新設する。
