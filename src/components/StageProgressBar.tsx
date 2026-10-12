// 大会ヘッダー用の進行状況バー。StageTabs(ステージ間のクリック切り替え)とは別に、
// 「全体の何ステージ目にいるか」を一目で分かるようにする純粋表示コンポーネント

interface StageInfo {
  id: number;
  name: string;
}

export default function StageProgressBar({
  stages,
  activeId,
}: {
  stages: StageInfo[];
  activeId: number;
}) {
  if (stages.length < 2) return null;
  const activeIndex = stages.findIndex((s) => s.id === activeId);
  if (activeIndex < 0) return null;

  return (
    <div className="mt-2.5">
      <div className="flex gap-1">
        {stages.map((s, i) => (
          <span
            key={s.id}
            aria-hidden
            className={`h-1 flex-1 rounded-full ${
              i < activeIndex
                ? "bg-brand/40"
                : i === activeIndex
                  ? "bg-brand"
                  : "bg-border-subtle"
            }`}
          />
        ))}
      </div>
      <p className="mt-1 text-[11px] text-muted">
        Stage {activeIndex + 1}/{stages.length} · {stages[activeIndex].name}
      </p>
    </div>
  );
}
