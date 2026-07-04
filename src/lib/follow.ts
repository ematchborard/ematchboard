"use client";

import { useCallback, useEffect, useState } from "react";
import { GAMES, type GameConfig } from "./games";

// ゲームタイトルのフォロー機能。アカウント不要で localStorage に保存する。
// サイドバー・タブ・ホームなど複数コンポーネントが同時に使うので、
// 変更時にカスタムイベントを飛ばして全員の表示を同期させる。

const FOLLOW_KEY = "esports-mob:followed-games";
const SHOW_OTHERS_KEY = "esports-mob:show-others";
const TEAM_KEY = "esports-mob:followed-teams";
const LANG_KEY = "esports-mob:lang";
const CHANGE_EVENT = "esports-mob:follow-changed";
const DEFAULT_FOLLOWED = ["valorant", "lol"];

function readFollowedSlugs(): string[] {
  try {
    const raw = localStorage.getItem(FOLLOW_KEY);
    if (!raw) return DEFAULT_FOLLOWED;
    const arr: unknown = JSON.parse(raw);
    if (!Array.isArray(arr)) return DEFAULT_FOLLOWED;
    return arr.filter(
      (s): s is string =>
        typeof s === "string" && GAMES.some((g) => g.slug === s)
    );
  } catch {
    return DEFAULT_FOLLOWED;
  }
}

function readShowOthers(): boolean {
  try {
    return localStorage.getItem(SHOW_OTHERS_KEY) === "1";
  } catch {
    return false;
  }
}

export function useFollowedGames(): {
  ready: boolean;
  followed: GameConfig[];
  others: GameConfig[];
  isFollowed: (slug: string) => boolean;
  toggleFollow: (slug: string) => void;
  showOthers: boolean;
  setShowOthers: (v: boolean) => void;
} {
  const [ready, setReady] = useState(false);
  const [followedSlugs, setFollowedSlugs] = useState<string[]>(DEFAULT_FOLLOWED);
  const [showOthers, setShowOthersState] = useState(false);

  useEffect(() => {
    const sync = () => {
      setFollowedSlugs(readFollowedSlugs());
      setShowOthersState(readShowOthers());
    };
    sync();
    setReady(true);
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener("storage", sync); // 別タブでの変更も反映
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const toggleFollow = useCallback((slug: string) => {
    const current = readFollowedSlugs();
    const next = current.includes(slug)
      ? current.filter((s) => s !== slug)
      : [...current, slug];
    localStorage.setItem(FOLLOW_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  const setShowOthers = useCallback((v: boolean) => {
    localStorage.setItem(SHOW_OTHERS_KEY, v ? "1" : "0");
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return {
    ready,
    followed: GAMES.filter((g) => followedSlugs.includes(g.slug)),
    others: GAMES.filter((g) => !followedSlugs.includes(g.slug)),
    isFollowed: (slug: string) => followedSlugs.includes(slug),
    toggleFollow,
    showOthers,
    setShowOthers,
  };
}

// ---- チームのフォロー ----

export interface FollowedTeam {
  id: number;
  name: string;
  acronym: string | null;
  image_url: string | null;
  game: string; // ゲームslug (チームページのURL用)
}

function readFollowedTeams(): FollowedTeam[] {
  try {
    const raw = localStorage.getItem(TEAM_KEY);
    if (!raw) return [];
    const arr: unknown = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.filter(
      (t): t is FollowedTeam =>
        typeof t === "object" && t !== null && typeof (t as FollowedTeam).id === "number"
    );
  } catch {
    return [];
  }
}

export function useFollowedTeams(): {
  ready: boolean;
  teams: FollowedTeam[];
  isFollowedTeam: (id: number) => boolean;
  toggleTeamFollow: (team: FollowedTeam) => void;
} {
  const [ready, setReady] = useState(false);
  const [teams, setTeams] = useState<FollowedTeam[]>([]);

  useEffect(() => {
    const sync = () => setTeams(readFollowedTeams());
    sync();
    setReady(true);
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const toggleTeamFollow = useCallback((team: FollowedTeam) => {
    const current = readFollowedTeams();
    const next = current.some((t) => t.id === team.id)
      ? current.filter((t) => t.id !== team.id)
      : [...current, team];
    localStorage.setItem(TEAM_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return {
    ready,
    teams,
    isFollowedTeam: (id: number) => teams.some((t) => t.id === id),
    toggleTeamFollow,
  };
}

// ---- 言語(地域の大会を上位表示するのに使う) ----

export const LANGS = [
  { code: "en", label: "English" },
  { code: "ja", label: "日本語" },
  { code: "ko", label: "한국어" },
  { code: "zh", label: "中文" },
  { code: "pt", label: "Português" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
] as const;

function readLang(): string {
  try {
    const l = localStorage.getItem(LANG_KEY);
    return l && LANGS.some((x) => x.code === l) ? l : "en";
  } catch {
    return "en";
  }
}

export function useLanguage(): {
  ready: boolean;
  lang: string;
  setLang: (code: string) => void;
} {
  const [ready, setReady] = useState(false);
  const [lang, setLangState] = useState("en");

  useEffect(() => {
    const sync = () => setLangState(readLang());
    sync();
    setReady(true);
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const setLang = useCallback((code: string) => {
    localStorage.setItem(LANG_KEY, code);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return { ready, lang, setLang };
}
