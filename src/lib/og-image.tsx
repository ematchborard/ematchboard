import { ImageResponse } from "next/og";
import { GAMES } from "./games";

// OGP/Xカード用の画像生成ロジック。opengraph-image.tsx / twitter-image.tsx
// (サイト全体用・/worlds用)から呼ばれる共通部品。satori(next/og)はCSSの
// サブセットしか解釈しないため、子要素を持つdivには必ずdisplay:flexを明示する。
// 日本語フォントを同梱していないため、画像内のテキストは英字のみにしている
// (ページ本文は日本語のままでよい。OGP画像はXカード用の見た目だけの問題)。

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

const BG = "#12161f";
const FOREGROUND = "#e8ebf2";
const MUTED = "#8b94a7";
const BRAND = "#22d3ee";

const FEATURED_SLUGS = ["valorant", "lol", "csgo", "dota2", "ow"];

export function siteOgImage() {
  const chips = GAMES.filter((g) => FEATURED_SLUGS.includes(g.slug));
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          backgroundColor: BG,
          padding: "90px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: 999,
              backgroundColor: BRAND,
              display: "flex",
            }}
          />
          <div
            style={{
              display: "flex",
              fontSize: 26,
              color: MUTED,
              letterSpacing: 6,
              textTransform: "uppercase",
            }}
          >
            Esports Schedules &amp; Results
          </div>
        </div>
        <div style={{ display: "flex", marginTop: 24 }}>
          <span style={{ fontSize: 128, fontWeight: 800, color: BRAND }}>e</span>
          <span style={{ fontSize: 128, fontWeight: 800, color: FOREGROUND }}>
            MATCH BOARD
          </span>
        </div>
        <div style={{ display: "flex", marginTop: 30, fontSize: 30, color: MUTED }}>
          All your esports matches, schedules and results — in one place.
        </div>
        <div style={{ display: "flex", gap: 14, marginTop: 56, flexWrap: "wrap" }}>
          {chips.map((g) => (
            <div
              key={g.slug}
              style={{
                display: "flex",
                padding: "12px 24px",
                borderRadius: 999,
                backgroundColor: `${g.accent}22`,
                color: g.accent,
                fontSize: 26,
                fontWeight: 700,
              }}
            >
              {g.name}
            </div>
          ))}
        </div>
      </div>
    ),
    OG_SIZE
  );
}

export function worldsOgImage(year: number) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          backgroundColor: BG,
          padding: "90px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: 999,
              backgroundColor: "#0ac8b9",
              display: "flex",
            }}
          />
          <div
            style={{
              display: "flex",
              fontSize: 26,
              color: MUTED,
              letterSpacing: 6,
              textTransform: "uppercase",
            }}
          >
            League of Legends
          </div>
        </div>
        <div
          style={{ display: "flex", marginTop: 24, fontSize: 112, fontWeight: 800, color: FOREGROUND }}
        >
          WORLDS {year}
        </div>
        <div style={{ display: "flex", marginTop: 20, fontSize: 36, fontWeight: 700, color: "#0ac8b9" }}>
          Schedule &amp; Results — Japan Time (JST)
        </div>
        <div style={{ display: "flex", marginTop: 56, fontSize: 28, color: MUTED }}>
          eMATCH BOARD
        </div>
      </div>
    ),
    OG_SIZE
  );
}
