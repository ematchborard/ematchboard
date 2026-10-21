// JST(日本時間)の「今日」の範囲を求める小さなユーティリティ。
// featured.ts・today-snapshot.ts(Cron)の両方から参照するので、
// 循環import を避けるためにどちらにも属さない独立ファイルに置く。

export function jstTodayRange(): { from: Date; to: Date; dateJst: string } {
  const now = new Date();
  const jstMs = now.getTime() + 9 * 60 * 60_000;
  const jst = new Date(jstMs);
  const y = jst.getUTCFullYear();
  const m = jst.getUTCMonth();
  const d = jst.getUTCDate();
  const dateJst = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  // JST 00:00 のその日始まりをUTCに戻す(JSTはUTC+9なので前日15:00Z)
  const fromUtcMs = Date.UTC(y, m, d) - 9 * 60 * 60_000;
  return {
    from: new Date(fromUtcMs),
    to: new Date(fromUtcMs + 24 * 60 * 60_000),
    dateJst,
  };
}
