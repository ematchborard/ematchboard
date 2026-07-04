// サーバー側で使う、ビュー(Day/Week/Month)ごとのデータ取得期間の計算。
// 週・月・日の境界はクライアント側でユーザーのタイムゾーン基準に引き直すので、
// サーバーはどのタイムゾーンでも足りるよう前後にパディングして広めに取得する。

export type ViewMode = "day" | "week" | "month";

const DAY_MS = 86_400_000;
const PAD_MS = 36 * 3_600_000;
const BUCKET_MS = 5 * 60_000;

export function parseViewMode(v?: string): ViewMode {
  return v === "week" || v === "month" ? v : "day";
}

export function parseOffset(o?: string): number {
  return Math.max(-24, Math.min(24, Number.parseInt(o ?? "0", 10) || 0));
}

// "YYYY-MM-DD" 形式のみ受け付ける(それ以外は null = 今日扱い)
export function parseDateParam(d?: string): string | null {
  if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
  return d;
}

// 「現在時刻」を5分単位に丸める。生のDate.now()を使うとAPIのURLが毎回変わって
// fetchキャッシュのキーが一致せず、キャッシュが全く効かなくなるため
function bucketedNow(): number {
  return Math.floor(Date.now() / BUCKET_MS) * BUCKET_MS;
}

export function rangeFor(
  view: ViewMode,
  offset: number,
  dateStr: string | null
): { from: Date; to: Date } {
  const now = new Date(bucketedNow());

  if (view === "week") {
    const dow = (now.getUTCDay() + 6) % 7; // 月曜=0
    const monday =
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - dow) +
      offset * 7 * DAY_MS;
    return {
      from: new Date(monday - PAD_MS),
      to: new Date(monday + 7 * DAY_MS + PAD_MS),
    };
  }

  if (view === "month") {
    const start = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1);
    const end = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset + 1, 1);
    return { from: new Date(start - PAD_MS), to: new Date(end + PAD_MS) };
  }

  // Day: 日付指定があればその日を中心に、なければ今日を中心に
  if (dateStr) {
    const [y, m, d] = dateStr.split("-").map(Number);
    const dayUtc = Date.UTC(y, m - 1, d);
    return {
      from: new Date(dayUtc - PAD_MS),
      to: new Date(dayUtc + DAY_MS + PAD_MS),
    };
  }
  return {
    from: new Date(now.getTime() - 2 * DAY_MS),
    to: new Date(now.getTime() + 3 * DAY_MS),
  };
}
