"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { GAMES } from "@/lib/games";

// ヘッダー常設の検索ボックス。対応ゲーム一覧(ローカルのGAMES配列)だけを
// その場でフィルタするので、PandaScoreへの問い合わせは一切発生しない
// (チーム/大会名の横断検索はPandaScore側のゲームslugと当サイトのゲームslugが
// 一致せず対応表が必要になるため、まずはゲーム検索だけを即日で提供する)。

export default function GameSearch() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return GAMES.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        g.short.toLowerCase().includes(q) ||
        g.slug.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [query]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function goTo(slug: string) {
    setQuery("");
    setOpen(false);
    router.push(`/${slug}`);
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (results.length > 0) goTo(results[0].slug);
        }}
      >
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="ゲームを検索…"
          aria-label="ゲームを検索"
          className="w-full rounded-lg border border-border-subtle bg-surface px-3 py-1.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-brand"
        />
      </form>
      {open && results.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-lg border border-border-subtle bg-surface shadow-lg">
          {results.map((g) => (
            <button
              key={g.slug}
              type="button"
              onClick={() => goTo(g.slug)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-surface-hover"
            >
              <span
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[8px] font-bold"
                style={{ backgroundColor: `${g.accent}22`, color: g.accent }}
              >
                {g.short.slice(0, 3)}
              </span>
              <span className="truncate">{g.name}</span>
            </button>
          ))}
        </div>
      )}
      {open && query.trim() !== "" && results.length === 0 && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-lg border border-border-subtle bg-surface px-3 py-2 text-xs text-muted shadow-lg">
          見つかりませんでした
        </div>
      )}
    </div>
  );
}
