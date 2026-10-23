"use client";

import Script from "next/script";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { roleLabelOf } from "@/lib/lol-roles";
import type { Player } from "@/lib/types";

// ファン採点(デプロイ2): カード型UI。
// - 案内バー(受付中・注意書き)。ファン選出MVPは別コンポーネント(FanMvpCard)で
//   Lineupsの上に常設表示する(こちらは投票カードの案内バーのみ)
// - 2カラム(チームA=赤 / チームB=青)、モバイルはタブ切り替え
// - カードをタップすると1〜10の数字がその場で開く(タップ1回で投票)
// 平均点・自分の投票はページ表示後に/api/ratingsから取得する
// (試合ページは終了後7日間フルページキャッシュされるため、HTMLには埋め込まない)。
// コメント機能・Xシェアはステップ4/5で追加する。

const TURNSTILE_SITE_KEY = "0x4AAAAAAFfz_mUUYY0c7nF_";
const SCORES = Array.from({ length: 10 }, (_, i) => i + 1);
const VOTING_WINDOW_DAYS = 7;

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, unknown>) => string;
      execute: (widgetId: string) => void;
      reset: (widgetId: string) => void;
    };
  }
}

interface PlayerStat {
  average: number;
  count: number;
  yourScore: number | null;
}

interface RatingsGetResponse {
  players: { playerId: number; count: number; average: number }[];
  yourVotes: Record<string, number>;
  totalVoters: number;
}

interface RatingsPostResponse {
  average: number;
  count: number;
  yourScore: number;
  error?: string;
}

type Accent = "red" | "blue";

function daysRemaining(beginAt: string | null): number {
  if (!beginAt) return VOTING_WINDOW_DAYS;
  const elapsedDays = (new Date().getTime() - Date.parse(beginAt)) / (24 * 60 * 60 * 1000);
  return Math.max(0, Math.ceil(VOTING_WINDOW_DAYS - elapsedDays));
}

function PlayerAvatar({ player }: { player: Player }) {
  if (player.image_url) {
    // eslint-disable-next-line @next/next/no-img-element -- 外部CDNの選手写真
    return (
      <img
        src={player.image_url}
        alt=""
        className="h-9 w-9 shrink-0 rounded-full bg-surface-hover object-cover"
      />
    );
  }
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-hover text-[10px] font-bold text-muted">
      {player.name.slice(0, 2).toUpperCase()}
    </span>
  );
}

function PlayerCard({
  player,
  stat,
  accent,
  expanded,
  pending,
  onToggle,
  onVote,
}: {
  player: Player;
  stat: PlayerStat | undefined;
  accent: Accent;
  expanded: boolean;
  pending: boolean;
  onToggle: () => void;
  onVote: (score: number) => void;
}) {
  const accentText = accent === "red" ? "text-live" : "text-blue-500";
  const accentBg = accent === "red" ? "bg-live text-white" : "bg-blue-500 text-white";

  return (
    <div className="overflow-hidden rounded-xl border border-border-subtle bg-surface">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-surface-hover"
      >
        <PlayerAvatar player={player} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{player.name}</p>
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
            {roleLabelOf(player.role) ?? ""}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className={`text-lg font-bold tabular-nums ${accentText}`}>
            {stat && stat.count > 0 ? stat.average.toFixed(1) : "-"}
          </p>
          <p className="text-[10px] text-muted">{stat?.count ?? 0}人</p>
        </div>
      </button>
      {expanded && (
        <div className="border-t border-border-subtle px-3 py-2.5">
          <div className="grid grid-cols-5 gap-1.5">
            {SCORES.map((n) => (
              <button
                key={n}
                type="button"
                disabled={pending}
                onClick={() => onVote(n)}
                className={`flex h-10 min-w-10 items-center justify-center rounded-lg text-sm font-bold transition-colors disabled:opacity-50 ${
                  stat?.yourScore === n
                    ? accentBg
                    : "bg-surface-hover text-foreground hover:bg-border-subtle"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          {stat?.yourScore != null && (
            <p className="mt-2 text-center text-xs text-muted">あなた {stat.yourScore}</p>
          )}
        </div>
      )}
    </div>
  );
}

function TeamColumn({
  teamName,
  accent,
  players,
  stats,
  expandedId,
  pendingId,
  onToggle,
  onVote,
  className,
}: {
  teamName: string;
  accent: Accent;
  players: Player[];
  stats: Record<number, PlayerStat>;
  expandedId: number | null;
  pendingId: number | null;
  onToggle: (playerId: number) => void;
  onVote: (playerId: number, score: number) => void;
  className?: string;
}) {
  const withVotes = players
    .map((p) => stats[p.id])
    .filter((s): s is PlayerStat => !!s && s.count > 0);
  const teamAvg =
    withVotes.length > 0 ? withVotes.reduce((sum, s) => sum + s.average, 0) / withVotes.length : null;

  return (
    <div className={className}>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="truncate text-sm font-bold">{teamName}</h3>
        {teamAvg !== null && (
          <span className={`shrink-0 text-sm font-bold tabular-nums ${accent === "red" ? "text-live" : "text-blue-500"}`}>
            平均 {teamAvg.toFixed(1)}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-2">
        {players.map((p) => (
          <PlayerCard
            key={p.id}
            player={p}
            stat={stats[p.id]}
            accent={accent}
            expanded={expandedId === p.id}
            pending={pendingId === p.id}
            onToggle={() => onToggle(p.id)}
            onVote={(score) => onVote(p.id, score)}
          />
        ))}
      </div>
    </div>
  );
}

export default function PlayerRatingWidget({
  matchId,
  isFinished,
  beginAt,
  teamAName,
  teamBName,
  teamAPlayers,
  teamBPlayers,
}: {
  matchId: number;
  isFinished: boolean;
  beginAt: string | null;
  teamAName: string;
  teamBName: string;
  teamAPlayers: Player[];
  teamBPlayers: Player[];
}) {
  const allPlayers = useMemo(() => [...teamAPlayers, ...teamBPlayers], [teamAPlayers, teamBPlayers]);
  const [stats, setStats] = useState<Record<number, PlayerStat>>({});
  const [totalVoters, setTotalVoters] = useState(0);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [activeTeam, setActiveTeam] = useState<"A" | "B">("A");
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [turnstileVisible, setTurnstileVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const tokenResolverRef = useRef<((token: string) => void) | null>(null);

  useEffect(() => {
    if (!isFinished) return;
    let cancelled = false;
    fetch(`/api/ratings?matchId=${matchId}`)
      .then((r) => r.json() as Promise<RatingsGetResponse>)
      .then((data) => {
        if (cancelled) return;
        const next: Record<number, PlayerStat> = {};
        for (const p of data.players) {
          next[p.playerId] = { average: p.average, count: p.count, yourScore: null };
        }
        for (const [pid, score] of Object.entries(data.yourVotes)) {
          const id = Number(pid);
          next[id] = { ...(next[id] ?? { average: score, count: 1 }), yourScore: score };
        }
        setStats(next);
        setTotalVoters(data.totalVoters);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [matchId, isFinished]);

  const setupTurnstile = useCallback(() => {
    if (!window.turnstile || !containerRef.current || widgetIdRef.current) return;
    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: TURNSTILE_SITE_KEY,
      execution: "execute",
      callback: (token: string) => {
        tokenResolverRef.current?.(token);
        tokenResolverRef.current = null;
      },
      "error-callback": () => {
        tokenResolverRef.current = null;
        setError("認証に失敗しました。もう一度お試しください");
      },
    });
  }, []);

  const getToken = useCallback((): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!window.turnstile || !widgetIdRef.current) {
        reject(new Error("まだ準備中です。少し待ってからお試しください"));
        return;
      }
      tokenResolverRef.current = resolve;
      // 普段は幅0で隠しておき、Cloudflareが実際にチャレンジを要求した
      // 場合だけ(execute中)見える状態にする
      setTurnstileVisible(true);
      window.turnstile.execute(widgetIdRef.current);
    });
  }, []);

  const vote = useCallback(
    async (playerId: number, score: number) => {
      setError(null);
      setPendingId(playerId);
      const hadVote = stats[playerId]?.yourScore != null;
      try {
        const token = await getToken();
        const res = await fetch("/api/ratings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ matchId, playerId, score, turnstileToken: token }),
        });
        const body = (await res.json().catch(() => null)) as RatingsPostResponse | null;
        if (!res.ok || !body) throw new Error(body?.error ?? `HTTP ${res.status}`);
        setStats((prev) => ({
          ...prev,
          [playerId]: { average: body.average, count: body.count, yourScore: body.yourScore },
        }));
        if (!hadVote) setTotalVoters((prev) => prev + 1);
      } catch (err) {
        setError(err instanceof Error ? err.message : "投票に失敗しました");
      } finally {
        if (widgetIdRef.current) window.turnstile?.reset(widgetIdRef.current);
        setTurnstileVisible(false);
        setPendingId(null);
      }
    },
    [matchId, getToken, stats]
  );

  if (allPlayers.length === 0) return null;

  if (!isFinished) {
    return (
      <section>
        <h2 className="mb-2 text-sm font-semibold">ファン採点</h2>
        <p className="rounded-xl border border-border-subtle bg-surface px-4 py-6 text-center text-sm text-muted">
          ファン採点は試合終了後に始まります(終了後7日間受付)
        </p>
      </section>
    );
  }

  const tabButtonClass = (active: boolean) =>
    `flex-1 rounded-lg px-3 py-2 text-center text-sm font-semibold transition-colors ${
      active ? "bg-surface text-foreground shadow-sm" : "text-muted"
    }`;

  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold">ファン採点</h2>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onReady={setupTurnstile}
      />
      <div ref={containerRef} className={turnstileVisible ? "mb-2" : "h-0 w-0 overflow-hidden"} />
      {error && <p className="mb-2 text-xs text-live">{error}</p>}

      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-live/30 bg-live/10 px-4 py-3">
        <span className="shrink-0 rounded-full bg-live px-2 py-0.5 text-[10px] font-bold text-white">
          受付中
        </span>
        <p className="min-w-0 flex-1 text-xs">
          <span className="font-semibold">この試合の選手を採点しよう</span>
          <span className="text-muted">
            {" "}
            ・ 10点満点 ・ 1人1回 ・ ログイン不要 ・ あと{daysRemaining(beginAt)}日 ・ {totalVoters}人が採点
          </span>
        </p>
      </div>

      <div className="mb-3 flex gap-1.5 rounded-xl bg-surface-hover p-1 md:hidden">
        <button type="button" onClick={() => setActiveTeam("A")} className={tabButtonClass(activeTeam === "A")}>
          {teamAName}
        </button>
        <button type="button" onClick={() => setActiveTeam("B")} className={tabButtonClass(activeTeam === "B")}>
          {teamBName}
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <TeamColumn
          teamName={teamAName}
          accent="red"
          players={teamAPlayers}
          stats={stats}
          expandedId={expandedId}
          pendingId={pendingId}
          onToggle={(id) => setExpandedId((prev) => (prev === id ? null : id))}
          onVote={vote}
          className={activeTeam === "A" ? "" : "hidden md:block"}
        />
        <TeamColumn
          teamName={teamBName}
          accent="blue"
          players={teamBPlayers}
          stats={stats}
          expandedId={expandedId}
          pendingId={pendingId}
          onToggle={(id) => setExpandedId((prev) => (prev === id ? null : id))}
          onVote={vote}
          className={activeTeam === "B" ? "" : "hidden md:block"}
        />
      </div>
    </section>
  );
}
