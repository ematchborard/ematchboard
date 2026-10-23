"use client";

import { useEffect, useState } from "react";
import { roleLabelOf, sortByRole } from "@/lib/lol-roles";
import type { Player, TeamDetail } from "@/lib/types";

// FotMob風の対面ラインナップ。データは各チームの登録ロスター
// (試合単位の出場選手・レーティングは有料データのため未対応)。
// LoLはロール順(TOP/JNG/MID/BOT/SUP)に並べて同ロール同士を向かい合わせる。
// ratingsMatchIdが渡された場合(Worlds・終了済み試合)のみ、ロールの左右に
// ファン採点の平均点バッジを表示する。試合ページ自体は終了後7日間フルページ
// キャッシュされるため、平均点はページ表示後にブラウザ側で/api/ratingsから
// 取得する(HTMLには埋め込まない)。
//
// ヘッダー・各行とも5カラムのCSS grid(1fr 54px 56px 54px 1fr)で、中央の
// role/vs列を常に画面中央に固定する(チーム名の長さが違っても崩れないように)。

interface ScoreStat {
  average: number;
  count: number;
}

function scoreBadgeClass(average: number): string {
  if (average >= 9) return "bg-blue-500 text-white";
  if (average >= 7) return "bg-emerald-500 text-white";
  if (average >= 5) return "bg-orange-500 text-white";
  return "bg-live text-white";
}

function ScoreBadge({ stat }: { stat: ScoreStat | undefined }) {
  if (!stat || stat.count === 0) {
    return (
      <span className="flex h-6 w-[54px] items-center justify-center rounded-md bg-surface-hover text-xs font-bold text-muted">
        -
      </span>
    );
  }
  return (
    <span
      className={`flex h-6 w-[54px] items-center justify-center rounded-md text-xs font-bold tabular-nums ${scoreBadgeClass(stat.average)}`}
    >
      {stat.average.toFixed(1)}
    </span>
  );
}

function PlayerCell({
  player,
  align,
}: {
  player: Player | undefined;
  align: "left" | "right";
}) {
  if (!player) return <div />;
  const photo = player.image_url ? (
    // eslint-disable-next-line @next/next/no-img-element -- 外部CDNの選手写真
    <img
      src={player.image_url}
      alt=""
      className="h-9 w-9 shrink-0 rounded-full bg-surface-hover object-cover"
    />
  ) : (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-hover text-[10px] font-bold text-muted">
      {player.name.slice(0, 2).toUpperCase()}
    </span>
  );

  return (
    <div
      className={`flex min-w-0 items-center gap-2 ${
        align === "right" ? "flex-row-reverse text-right" : ""
      }`}
    >
      {photo}
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{player.name}</p>
        <p className="truncate text-[11px] text-muted">
          {[player.first_name, player.last_name].filter(Boolean).join(" ")}
        </p>
      </div>
    </div>
  );
}

const GRID_COLS = "grid-cols-[1fr_54px_56px_54px_1fr]";

export default function MatchLineups({
  teamA,
  teamB,
  ratingsMatchId,
}: {
  teamA: TeamDetail | null;
  teamB: TeamDetail | null;
  ratingsMatchId?: number;
}) {
  const [scores, setScores] = useState<Record<number, ScoreStat>>({});

  useEffect(() => {
    if (!ratingsMatchId) return;
    let cancelled = false;
    fetch(`/api/ratings?matchId=${ratingsMatchId}`)
      .then((r) => r.json() as Promise<{ players: { playerId: number; average: number; count: number }[] }>)
      .then((data) => {
        if (cancelled) return;
        const next: Record<number, ScoreStat> = {};
        for (const p of data.players) next[p.playerId] = { average: p.average, count: p.count };
        setScores(next);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [ratingsMatchId]);

  const a = sortByRole(teamA?.players ?? []);
  const b = sortByRole(teamB?.players ?? []);
  const rows = Math.max(a.length, b.length);
  if (rows === 0) {
    return (
      <p className="rounded-xl border border-border-subtle bg-surface px-4 py-6 text-center text-sm text-muted">
        No roster data
      </p>
    );
  }

  const roleOf = (p: Player | undefined) => roleLabelOf(p?.role ?? null);
  const showScores = Boolean(ratingsMatchId);

  return (
    <div className="overflow-hidden rounded-xl border border-border-subtle bg-surface">
      <div className={`grid ${GRID_COLS} items-center gap-2 border-b border-border-subtle bg-surface-hover/50 px-4 py-2.5`}>
        <span className="truncate text-right text-sm font-semibold">{teamA?.name ?? "TBD"}</span>
        <span />
        <span className="text-center text-[10px] font-bold tracking-wider text-muted">VS</span>
        <span />
        <span className="truncate text-left text-sm font-semibold">{teamB?.name ?? "TBD"}</span>
      </div>
      <div className="divide-y divide-border-subtle">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className={`grid ${GRID_COLS} items-center gap-2 px-4 py-2.5`}>
            <PlayerCell player={a[i]} align="left" />
            {showScores ? <ScoreBadge stat={a[i] ? scores[a[i].id] : undefined} /> : <span />}
            <span className="text-center text-[10px] font-bold tracking-wider text-muted">
              {roleOf(a[i]) ?? roleOf(b[i]) ?? ""}
            </span>
            {showScores ? <ScoreBadge stat={b[i] ? scores[b[i].id] : undefined} /> : <span />}
            <PlayerCell player={b[i]} align="right" />
          </div>
        ))}
      </div>
      <p className="border-t border-border-subtle px-4 py-2 text-center text-[10px] text-muted">
        Registered rosters — actual starters may differ
      </p>
    </div>
  );
}
