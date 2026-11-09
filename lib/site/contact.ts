/**
 * 問い合わせ・権利者からの削除依頼の窓口メール(1か所に集約)。
 *
 * 要確認(オーナー決定事項): 現行コードには2種類が混在していた。
 *   - contact@pocket-dive.app (about / ja.ts / arXiv User-Agent)
 *   - contact@saolams.com     (legal)
 * 実際に受信できる1つに確定し、この定数だけを書き換える。
 * 現時点は仮に pocket-dive.app 側を採用している。
 */
export const CONTACT_EMAIL = "contact@pocket-dive.app";
