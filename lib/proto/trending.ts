const MOCK_SCORES: Record<string, number> = {
  t1: 82,
  t2: 91,
  t3: 64,
  t4: 77,
  t5: 58,
};

// TODO: 全ユーザーの保存・興味ありスワイプ数を集計するバックエンド実装に置き換え。
// 現状はモックの基準値に、このユーザー自身の保存/既読傾向によるブーストを加算している。
export function getTrendingScore(topicId: string, interestBoost = 0): number {
  const base = MOCK_SCORES[topicId] ?? 50;
  return Math.min(100, base + interestBoost);
}
