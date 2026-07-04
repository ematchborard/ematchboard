// クライアント側の日付ユーティリティ(ユーザーのタイムゾーン基準)

export const DAY_MS = 86_400_000;

export function localDayStart(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

// ローカル日付 → "YYYY-MM-DD"
export function toDateStr(ms: number): string {
  const d = new Date(ms);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

// "YYYY-MM-DD" → そのローカル日付の0時 (不正なら null)
export function parseDateStr(s: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const t = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime();
  return Number.isFinite(t) ? t : null;
}
