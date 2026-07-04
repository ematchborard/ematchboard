// ページ遷移中・サーバーでのデータ取得中に出るスケルトン(全ルート共通)
export default function Loading() {
  return (
    <div aria-hidden className="flex flex-col gap-3">
      <div className="h-10 animate-pulse rounded-xl bg-surface" />
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-28 animate-pulse rounded-xl bg-surface" />
      ))}
    </div>
  );
}
