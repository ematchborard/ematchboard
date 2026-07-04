"use client";

import { useFollowedTeams, type FollowedTeam } from "@/lib/follow";

// チームページのフォローボタン。フォローしたチームはサイドバーに並ぶ。

export default function TeamFollowButton({ team }: { team: FollowedTeam }) {
  const { ready, isFollowedTeam, toggleTeamFollow } = useFollowedTeams();
  const followed = ready && isFollowedTeam(team.id);

  return (
    <button
      type="button"
      onClick={() => toggleTeamFollow(team)}
      disabled={!ready}
      className={`ml-auto shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
        followed
          ? "border-transparent bg-amber-400/15 text-amber-400 hover:bg-amber-400/25"
          : "border-border-subtle text-muted hover:border-amber-400/40 hover:text-amber-400"
      }`}
    >
      {followed ? "★ Following" : "☆ Follow"}
    </button>
  );
}
