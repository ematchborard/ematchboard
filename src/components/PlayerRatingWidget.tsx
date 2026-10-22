"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Player } from "@/lib/types";

// ファン採点(デプロイ1): 試合終了後だけ受け付ける・控えを除いた5人のみ表示・
// Turnstileは普段は幅0で隠し、投票(execute)の間だけ見せる(Cloudflareが
// 実際にチャレンジを出した場合だけその場に表示される)。
// カード型UI(2カラム・案内バー・ファン選出MVP等)はデプロイ2で別途対応する。
// ロスターは試合ページが既に取得しているTeamDetail.playersから選んだ5人を
// そのまま使う(Worlds限定機能なので追加のPandaScore呼び出しは発生しない)。

const TURNSTILE_SITE_KEY = "0x4AAAAAAFfz_mUUYY0c7nF_";
const SCORES = Array.from({ length: 10 }, (_, i) => i + 1);

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
}

interface RatingsPostResponse {
  average: number;
  count: number;
  yourScore: number;
  error?: string;
}

function PlayerAvatar({ player }: { player: Player }) {
  if (player.image_url) {
    // eslint-disable-next-line @next/next/no-img-element -- 外部CDNの選手写真
    return (
      <img
        src={player.image_url}
        alt=""
        className="h-8 w-8 shrink-0 rounded-full bg-surface-hover object-cover"
      />
    );
  }
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-hover text-[10px] font-bold text-muted">
      {player.name.slice(0, 2).toUpperCase()}
    </span>
  );
}

export default function PlayerRatingWidget({
  matchId,
  isFinished,
  teamAPlayers,
  teamBPlayers,
}: {
  matchId: number;
  isFinished: boolean;
  teamAPlayers: Player[];
  teamBPlayers: Player[];
}) {
  const players = [...teamAPlayers, ...teamBPlayers];
  const [stats, setStats] = useState<Record<number, PlayerStat>>({});
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
      } catch (err) {
        setError(err instanceof Error ? err.message : "投票に失敗しました");
      } finally {
        if (widgetIdRef.current) window.turnstile?.reset(widgetIdRef.current);
        setTurnstileVisible(false);
        setPendingId(null);
      }
    },
    [matchId, getToken]
  );

  if (players.length === 0) return null;

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
      <div className="divide-y divide-border-subtle overflow-hidden rounded-xl border border-border-subtle bg-surface">
        {players.map((p) => {
          const stat = stats[p.id];
          return (
            <div key={p.id} className="flex items-center gap-3 px-4 py-2.5">
              <PlayerAvatar player={p} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{p.name}</p>
                <p className="text-xs text-muted">
                  {stat && stat.count > 0 ? `${stat.average.toFixed(1)} (${stat.count}票)` : "まだ評価がありません"}
                </p>
              </div>
              <select
                value={stat?.yourScore ?? ""}
                disabled={pendingId === p.id}
                onChange={(e) => vote(p.id, Number(e.target.value))}
                className="shrink-0 rounded-lg border border-border-subtle bg-surface px-2 py-1 text-sm disabled:opacity-50"
              >
                <option value="" disabled>
                  評価する
                </option>
                {SCORES.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </div>
    </section>
  );
}
