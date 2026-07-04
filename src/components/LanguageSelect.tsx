"use client";

import { LANGS, useLanguage } from "@/lib/follow";

// ヘッダーの言語セレクター。選んだ言語に近い地域の大会が上位表示される。

export default function LanguageSelect() {
  const { ready, lang, setLang } = useLanguage();

  return (
    <select
      aria-label="Language / region"
      value={ready ? lang : "en"}
      onChange={(e) => setLang(e.target.value)}
      className="rounded-lg border border-border-subtle bg-surface px-2 py-1.5 text-xs font-medium text-muted outline-none transition-colors hover:text-foreground"
    >
      {LANGS.map((l) => (
        <option key={l.code} value={l.code}>
          {l.label}
        </option>
      ))}
    </select>
  );
}
