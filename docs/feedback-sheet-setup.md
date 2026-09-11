# マイページの「ご意見」をGoogleスプレッドシートに同期する設定

管理画面のパスワードを使わずに、送られてきた意見をGoogleスプレッドシートで
そのまま見られるようにする設定手順。Google Cloudの認証情報は不要（Apps
Scriptを「自分用のWebアプリ」として公開するだけ）。

## 1. スプレッドシートを作る

1. https://sheets.google.com で新しいスプレッドシートを作成
2. 1行目にヘッダーを入れる: `A1` に `受信日時`、`B1` に `内容`

## 2. Apps Scriptを設定する

1. スプレッドシート上部メニュー「拡張機能」→「Apps Script」
2. デフォルトで開かれる `Code.gs` の中身を全部消して、以下を貼り付ける

```javascript
function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var body = JSON.parse(e.postData.contents);
  sheet.appendRow([body.created_at || new Date().toISOString(), body.message || ""]);
  return ContentService.createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

3. フロッピーアイコン（保存）を押す

## 3. Webアプリとして公開する

1. 右上の「デプロイ」→「新しいデプロイ」
2. 歯車アイコン →種類を選択で「ウェブアプリ」を選ぶ
3. 設定:
   - 説明: 何でもOK（例: `feedback-webhook`）
   - 次のユーザーとして実行: **自分**
   - アクセスできるユーザー: **全員**
4. 「デプロイ」を押す
5. 初回はGoogleの確認画面が出るので、自分のアカウントで許可する
   （「Googleで確認されていません」と出ても、自分が作ったスクリプトなので
   「詳細」→「（プロジェクト名）に移動」で進めて問題ない）
6. 発行された **ウェブアプリのURL**（`https://script.google.com/macros/s/.../exec` の形）をコピーする

## 4. VercelにURLを環境変数として設定する

1. https://vercel.com/dashboard → `scienceapp` → Settings → Environment Variables
2. 新規追加:
   - Key: `FEEDBACK_SHEET_WEBHOOK_URL`
   - Value: 手順3でコピーしたURL
   - Environment: Production
3. 保存後、再デプロイが必要（Claude Codeに「デプロイして」と頼めばOK）

## 5. 確認

再デプロイ後、マイページの「ご意見・ご要望」欄から適当なテキストを送信し、
スプレッドシートに行が追加されるか確認する。

## 補足

- このAPIはGoogleスプレッドシートへの送信とSupabaseへの保存を両方試みる
  （`app/api/feedback/route.ts`）。どちらか一方が成功すればユーザーには
  成功として返る。Supabase側は `supabase/migrations/005_feedback.sql` を
  実行していなくても、スプレッドシート側が設定されていれば問題なく使える。
- スプレッドシートのURLは自分のGoogleアカウントの中だけで完結するため、
  管理画面のパスワード管理から解放される。
