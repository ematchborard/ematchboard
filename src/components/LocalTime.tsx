"use client";

import { useEffect, useState } from "react";

// 日時をユーザーのタイムゾーンで表示する小部品(マウント後に描画してズレを防ぐ)

export default function LocalTime({
  iso,
  mode = "datetime",
}: {
  iso: string;
  mode?: "datetime" | "time";
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <span aria-hidden>…</span>;

  const options: Intl.DateTimeFormatOptions =
    mode === "time"
      ? { hour: "2-digit", minute: "2-digit" }
      : {
          weekday: "short",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        };
  return <>{new Intl.DateTimeFormat(undefined, options).format(new Date(iso))}</>;
}
