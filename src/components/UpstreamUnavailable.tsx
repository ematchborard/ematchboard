// PandaScoreの一時的な取得失敗(429/5xx等、本物の404ではない)時に出す案内。
// ここは「ページが存在しない」わけではないので notFound() は呼ばない
// (呼ぶとGooglebotがインデックスから外してしまう)。
export default function UpstreamUnavailable() {
  return (
    <p className="rounded-xl border border-border-subtle bg-surface px-4 py-10 text-center text-sm text-muted">
      データの取得に失敗しました。しばらくしてからもう一度お試しください。
    </p>
  );
}
