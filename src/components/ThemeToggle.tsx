"use client";

import { useEffect, useState } from "react";

// ダーク/ライトの切り替えボタン。選択は localStorage に保存し、
// 初期表示のチラつきは layout.tsx のインラインスクリプトが防ぐ。

const KEY = "esports-mob:theme";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    try {
      if (localStorage.getItem(KEY) === "light") setTheme("light");
    } catch {}
  }, []);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    try {
      localStorage.setItem(KEY, next);
    } catch {}
    if (next === "light") {
      document.documentElement.dataset.theme = "light";
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title={theme === "dark" ? "ライトモード" : "ダークモード"}
      className="rounded-lg border border-border-subtle bg-surface px-2.5 py-1.5 text-sm transition-colors hover:bg-surface-hover"
    >
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}
