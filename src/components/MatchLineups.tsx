import type { Player, TeamDetail } from "@/lib/types";

// FotMob風の対面ラインナップ。データは各チームの登録ロスター
// (試合単位の出場選手・レーティングは有料データのため未対応)。
// LoLはロール順(TOP/JNG/MID/BOT/SUP)に並べて同ロール同士を向かい合わせる。

const ROLE_ORDER: Record<string, number> = {
  top: 0,
  jun: 1,
  jungle: 1,
  mid: 2,
  adc: 3,
  bot: 3,
  sup: 4,
  support: 4,
};

const ROLE_LABEL: Record<string, string> = {
  top: "TOP",
  jun: "JNG",
  jungle: "JNG",
  mid: "MID",
  adc: "BOT",
  bot: "BOT",
  sup: "SUP",
  support: "SUP",
};

function sortByRole(players: Player[]): Player[] {
  return players
    .slice()
    .sort(
      (a, b) =>
        (ROLE_ORDER[a.role?.toLowerCase() ?? ""] ?? 9) -
        (ROLE_ORDER[b.role?.toLowerCase() ?? ""] ?? 9)
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

export default function MatchLineups({
  teamA,
  teamB,
}: {
  teamA: TeamDetail | null;
  teamB: TeamDetail | null;
}) {
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

  const roleOf = (p: Player | undefined) =>
    p?.role ? (ROLE_LABEL[p.role.toLowerCase()] ?? p.role.toUpperCase()) : null;

  return (
    <div className="overflow-hidden rounded-xl border border-border-subtle bg-surface">
      <div className="flex items-center justify-between border-b border-border-subtle bg-surface-hover/50 px-4 py-2.5">
        <span className="truncate text-sm font-semibold">
          {teamA?.name ?? "TBD"}
        </span>
        <span className="px-2 text-[10px] font-bold text-muted">VS</span>
        <span className="truncate text-right text-sm font-semibold">
          {teamB?.name ?? "TBD"}
        </span>
      </div>
      <div className="divide-y divide-border-subtle">
        {Array.from({ length: rows }, (_, i) => (
          <div
            key={i}
            className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 py-2.5"
          >
            <PlayerCell player={a[i]} align="left" />
            <span className="w-10 text-center text-[10px] font-bold tracking-wider text-muted">
              {roleOf(a[i]) ?? roleOf(b[i]) ?? ""}
            </span>
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
