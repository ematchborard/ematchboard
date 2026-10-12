"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Match, Team } from "@/lib/types";

// ホーム最上部「今日のビッグマッチ」のカードグリッド。
// 時刻は閲覧者のタイムゾーンで出したいのでクライアント側で処理
// (マウント前は時刻を隠してサーバー/クライアントのズレを防ぐ)。

export interface BigMatchItem {
  match: Match;
  gameSlug: string;
  gameName: string;
  gameShort: string;
  gameLogo: string | null;
  gameLogoFixedColor?: boolean;
  accent: string;
}

function MatchTime({ iso }: { iso: string }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <span aria-hidden>--:--</span>;
  return (
    <>
      {new Intl.DateTimeFormat(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(new Date(iso))}
    </>
  );
}

function GameIcon({ item }: { item: BigMatchItem }) {
  if (item.gameLogo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- 自前ホストのロゴ画像(public/game-logos)
      <img
        src={item.gameLogo}
        alt=""
        className={`h-5 w-5 shrink-0 object-contain ${item.gameLogoFixedColor ? "" : "game-logo-auto"}`}
      />
    );
  }
  return (
    <span
      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[8px] font-bold"
      style={{ backgroundColor: `${item.accent}22`, color: item.accent }}
    >
      {item.gameShort}
    </span>
  );
}

function TeamLogo({ team }: { team: Team | null }) {
  if (team?.image_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- 外部CDNのチームロゴ
      <img src={team.image_url} alt="" className="h-9 w-9 shrink-0 object-contain" />
    );
  }
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-hover text-[10px] font-bold text-muted">
      {team ? (team.acronym ?? team.name).slice(0, 2).toUpperCase() : "?"}
    </span>
  );
}

function Card({ item }: { item: BigMatchItem }) {
  const { match: m, gameSlug, gameName, accent } = item;
  const teamA = m.opponents[0]?.opponent ?? null;
  const teamB = m.opponents[1]?.opponent ?? null;
  const running = m.status === "running";
  const finished = m.status === "finished";
  const scoreOf = (team: typeof teamA) =>
    team ? (m.results.find((r) => r.team_id === team.id)?.score ?? null) : null;
  const scoreA = scoreOf(teamA);
  const scoreB = scoreOf(teamB);
  const eventName = `${m.league?.name ?? ""} ${m.tournament?.name ?? ""}`.trim();

  return (
    <Link
      href={`/${gameSlug}/match/${m.id}`}
      className="group relative flex shrink-0 snap-start flex-col gap-2.5 overflow-hidden rounded-xl border border-border-subtle bg-surface px-4 py-3.5 transition-colors hover:bg-surface-hover md:w-auto w-[78vw]"
    >
      <span
        className="absolute inset-y-0 left-0 w-1"
        style={{ backgroundColor: accent }}
        aria-hidden
      />
      <div className="flex items-center justify-between gap-2 border-b border-border-subtle pb-2.5 pl-1.5">
        <span className="flex min-w-0 items-center gap-1.5">
          <GameIcon item={item} />
          <span
            className="truncate text-[11px] font-bold uppercase tracking-wide"
            style={{ color: accent }}
          >
            {gameName}
          </span>
        </span>
        {running ? (
          <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-bold text-live">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-live" />
            LIVE
          </span>
        ) : finished ? (
          <span className="shrink-0 text-[11px] font-semibold text-muted">FT</span>
        ) : (
          <span className="shrink-0 text-[11px] font-semibold tabular-nums text-muted">
            {m.begin_at ? <MatchTime iso={m.begin_at} /> : "TBD"}
          </span>
        )}
      </div>
      <p className="truncate pl-1.5 text-[11px] text-muted">
        {eventName} · BO{m.number_of_games}
      </p>
      <div className="flex items-center justify-center gap-3 px-1.5 py-0.5">
        <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
          <TeamLogo team={teamA} />
          <span className="max-w-full truncate text-xs font-semibold">
            {teamA?.name ?? "TBD"}
          </span>
        </div>
        <span className="shrink-0 text-sm font-bold tabular-nums text-muted">
          {scoreA !== null && scoreB !== null ? `${scoreA} – ${scoreB}` : "VS"}
        </span>
        <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
          <TeamLogo team={teamB} />
          <span className="max-w-full truncate text-xs font-semibold">
            {teamB?.name ?? "TBD"}
          </span>
        </div>
      </div>
      <span className="pl-1.5 text-[11px] font-semibold text-muted transition-colors group-hover:text-foreground">
        大会を見る ›
      </span>
    </Link>
  );
}

export default function BigMatchGrid({ items }: { items: BigMatchItem[] }) {
  if (items.length === 0) return null;
  return (
    <section className="mb-5">
      <h2 className="mb-2 flex items-center gap-1.5 text-sm font-bold">
        <span className="h-1.5 w-1.5 rounded-full bg-live" aria-hidden />
        今日のビッグマッチ
      </h2>
      <div className="flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory md:grid md:grid-cols-3 md:overflow-visible">
        {items.map((item) => (
          <Card key={item.match.id} item={item} />
        ))}
      </div>
    </section>
  );
}
