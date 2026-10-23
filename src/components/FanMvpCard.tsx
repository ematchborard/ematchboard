"use client";

import { useEffect, useState } from "react";
import { roleLabelOf } from "@/lib/lol-roles";
import type { Player } from "@/lib/types";

// Lineupsの上に出す「ファン選出MVP」カード。3票以上で最高平均の1人を表示する
// (PlayerRatingWidgetの案内バーとは別の、常設の単独カード)。終了済み試合のみ
// 表示し、平均点はページ表示後にブラウザ側で/api/ratingsから取得する
// (試合ページ自体は終了後7日間フルページキャッシュされるためHTMLには埋め込まない)。

const MVP_MIN_VOTES = 3;

interface RatingsGetResponse {
  players: { playerId: number; count: number; average: number }[];
}

function PlayerAvatar({ player }: { player: Player }) {
  if (player.image_url) {
    // eslint-disable-next-line @next/next/no-img-element -- 外部CDNの選手写真
    return (
      <img
        src={player.image_url}
        alt=""
        className="h-14 w-14 shrink-0 rounded-full bg-surface-hover object-cover"
      />
    );
  }
  return (
    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-surface-hover text-base font-bold text-muted">
      {player.name.slice(0, 2).toUpperCase()}
    </span>
  );
}

export default function FanMvpCard({
  matchId,
  isFinished,
  teamAName,
  teamBName,
  teamAPlayers,
  teamBPlayers,
}: {
  matchId: number;
  isFinished: boolean;
  teamAName: string;
  teamBName: string;
  teamAPlayers: Player[];
  teamBPlayers: Player[];
}) {
  const [mvp, setMvp] = useState<{ player: Player; teamName: string; average: number; count: number } | null>(null);

  useEffect(() => {
    if (!isFinished) return;
    let cancelled = false;
    fetch(`/api/ratings?matchId=${matchId}`)
      .then((r) => r.json() as Promise<RatingsGetResponse>)
      .then((data) => {
        if (cancelled) return;
        const byId = new Map<number, { player: Player; teamName: string }>();
        for (const p of teamAPlayers) byId.set(p.id, { player: p, teamName: teamAName });
        for (const p of teamBPlayers) byId.set(p.id, { player: p, teamName: teamBName });

        const best = data.players
          .filter((p) => p.count >= MVP_MIN_VOTES && byId.has(p.playerId))
          .sort((a, b) => b.average - a.average)[0];

        if (best) {
          const entry = byId.get(best.playerId)!;
          setMvp({ player: entry.player, teamName: entry.teamName, average: best.average, count: best.count });
        } else {
          setMvp(null);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [matchId, isFinished, teamAName, teamBName, teamAPlayers, teamBPlayers]);

  if (!isFinished || !mvp) return null;

  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold">ファン選出MVP</h2>
      <div className="flex items-center gap-4 rounded-xl border border-border-subtle bg-surface px-4 py-4">
        <div className="relative shrink-0">
          <PlayerAvatar player={mvp.player} />
          <span className="absolute -bottom-1 left-1/2 flex -translate-x-1/2 items-center gap-0.5 whitespace-nowrap rounded-full bg-blue-500 px-2 py-0.5 text-xs font-bold text-white">
            {mvp.average.toFixed(1)} ★
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-bold">{mvp.player.name}</p>
          <p className="truncate text-xs text-muted">
            {mvp.teamName} · {roleLabelOf(mvp.player.role) ?? ""}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-bold text-amber-500">暫定(受付中)</p>
          <p className="text-xs text-muted">{mvp.count}人の採点から</p>
        </div>
      </div>
    </section>
  );
}
