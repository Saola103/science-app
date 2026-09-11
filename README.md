# POCKET DIVE

最新の科学論文・ニュースを TikTok スタイルの縦スクロールフィードで届ける Web アプリ。AI が毎日 arXiv・bioRxiv・科学ニュースを収集し、「やさしく（一般向け）」「くわしく（専門向け）」の2種類の日本語要約を自動生成する。いいね・スキップ・閲覧履歴をもとにフィードがパーソナライズされる。

詳細な企画意図・差別化ポイントは提案書参照。

## 開発

```bash
npm run dev     # 開発サーバー起動 (localhost:3000)
npm run build   # 本番ビルド
npm run lint    # ESLint
```

環境変数は `.env.local` に設定（Supabase・Groq・Gemini・Resend の各キーなど。詳細は [CLAUDE.md](CLAUDE.md) 参照）。

## 技術スタック

- フロントエンド: Next.js (App Router) / TypeScript / Tailwind CSS / next-intl（多言語対応）
- バックエンド: Vercel Serverless / Vercel Cron Jobs
- DB: Supabase (PostgreSQL, pgvector)
- AI: Groq API (LLaMA-3.3-70B) / Gemini（要約生成）
- 論文ソース: arXiv API / bioRxiv / RSS（科学ニュース）

## デプロイ

Vercel にデプロイ済み。`vercel.json` の cron 設定で論文収集・要約修復を自動実行。
