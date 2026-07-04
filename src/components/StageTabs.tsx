import Link from "next/link";

// 大会全体ページとステージページの上部に出すタブ。
// Overview = 大会全体の日程、それ以降は各ステージ (Group A / Playoffs など)。

export default function StageTabs({
  gameSlug,
  serieId,
  stages,
  activeTournamentId,
}: {
  gameSlug: string;
  serieId: number;
  stages: { id: number; name: string }[];
  activeTournamentId?: number;
}) {
  const chip = (active: boolean) =>
    `shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
      active
        ? "border-transparent bg-brand/15 text-brand"
        : "border-border-subtle text-muted hover:bg-surface-hover hover:text-foreground"
    }`;

  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1">
      <Link
        href={`/${gameSlug}/event/${serieId}`}
        className={chip(activeTournamentId === undefined)}
      >
        Overview
      </Link>
      {stages.map((s) => (
        <Link
          key={s.id}
          href={`/${gameSlug}/tournament/${s.id}`}
          className={chip(s.id === activeTournamentId)}
        >
          {s.name}
        </Link>
      ))}
    </div>
  );
}
