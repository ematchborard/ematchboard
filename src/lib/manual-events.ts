// PandaScore非対応タイトル(Apex/Fortnite/TFTなどバトロワ・ロビー形式)の
// 大会スケジュール。手動キュレーション方式:
//   シーズンの節目に最新情報へ更新する(更新→push→自動デプロイ)。
// 日付はイベント公式発表ベースの「日付ラベル」(タイムゾーン厳密でなくてよい)。
// 最終更新: 2026-07-06

export interface ManualEvent {
  id: string;
  game: string; // games.ts の slug
  name: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  dateNote?: string; // 日程未確定のときの表示 (例: "January 2027 · dates TBA")
  location?: string;
  prizePool?: string;
  streamUrl?: string;
  detailsUrl?: string;
}

export const MANUAL_EVENTS: ManualEvent[] = [
  // ---- Apex Legends (ALGS Year 6, 年間賞金総額 $7M) ----
  {
    id: "algs-y6-split1-proleague",
    game: "apex",
    name: "ALGS Year 6: Split 1 Pro League",
    startDate: "2026-04-04",
    endDate: "2026-06-07",
    location: "Online (4 regions)",
    streamUrl: "https://www.twitch.tv/playapex",
    detailsUrl:
      "https://liquipedia.net/apexlegends/Apex_Legends_Global_Series/2026/Split_1/Pro_League/Americas",
  },
  {
    id: "algs-y6-split1-playoffs",
    game: "apex",
    name: "ALGS Year 6: Split 1 Playoffs (Esports World Cup)",
    startDate: "2026-07-07",
    endDate: "2026-07-11",
    location: "Paris, France",
    streamUrl: "https://www.twitch.tv/playapex",
    detailsUrl:
      "https://liquipedia.net/apexlegends/Apex_Legends_Global_Series/2026/Split_1/Playoffs",
  },
  {
    id: "algs-2026-championship",
    game: "apex",
    name: "ALGS Championship",
    startDate: "2027-01-01",
    endDate: "2027-01-31",
    dateNote: "January 2027 · exact dates TBA",
    location: "Sapporo, Japan",
    streamUrl: "https://www.twitch.tv/playapex",
    detailsUrl:
      "https://liquipedia.net/apexlegends/Apex_Legends_Global_Series/2026/Championship",
  },

  // ---- Fortnite (FNCS 2026) ----
  {
    id: "fncs-2026-major1",
    game: "fortnite",
    name: "FNCS Major 1: Summit",
    startDate: "2026-05-29",
    endDate: "2026-05-31",
    location: "Düsseldorf, Germany",
    prizePool: "$1,300,000",
    streamUrl: "https://www.twitch.tv/fortnite",
    detailsUrl:
      "https://liquipedia.net/fortnite/Fortnite_Champion_Series/2026/Major_1/Summit",
  },
  {
    id: "fncs-2026-major2",
    game: "fortnite",
    name: "FNCS Major 2",
    startDate: "2026-07-18",
    endDate: "2026-08-02",
    location: "Online · Finals Aug 1–2",
    streamUrl: "https://www.twitch.tv/fortnite",
    detailsUrl: "https://liquipedia.net/fortnite/Fortnite_Champion_Series/2026",
  },
  {
    id: "fncs-2026-last-chance",
    game: "fortnite",
    name: "FNCS Global Championship: Last Chance",
    startDate: "2026-08-03",
    endDate: "2026-08-03",
    dateNote: "Starts Aug 3 (online)",
    location: "Online",
    streamUrl: "https://www.twitch.tv/fortnite",
    detailsUrl: "https://liquipedia.net/fortnite/Fortnite_Champion_Series/2026",
  },
  {
    id: "fncs-2026-global-championship",
    game: "fortnite",
    name: "FNCS Global Championship",
    startDate: "2026-09-26",
    endDate: "2026-09-27",
    location: "Antwerp, Belgium",
    prizePool: "$2,000,000",
    streamUrl: "https://www.twitch.tv/fortnite",
    detailsUrl:
      "https://liquipedia.net/fortnite/Fortnite_Champion_Series/2026/Global_Championship",
  },
  {
    id: "fncs-2026-solos",
    game: "fortnite",
    name: "FNCS Solos",
    startDate: "2026-10-01",
    endDate: "2026-10-31",
    dateNote: "October 2026 · details TBA",
    location: "TBA",
    detailsUrl: "https://liquipedia.net/fortnite/Fortnite_Champion_Series/2026",
  },

  // ---- Teamfight Tactics (Space Gods / Set 16) ----
  {
    id: "tft-space-gods-regional-finals",
    game: "tft",
    name: "Space Gods Regional Finals (AMER / EMEA / APAC)",
    startDate: "2026-06-26",
    endDate: "2026-07-05",
    location: "Online",
    detailsUrl: "https://liquipedia.net/tft/TOC/2026",
  },
  {
    id: "tft-space-gods-tacticians-crown",
    game: "tft",
    name: "Space Gods Tactician's Crown",
    startDate: "2026-07-10",
    endDate: "2026-07-12",
    prizePool: "$470,000",
    location: "Top 40 · AMER/EMEA/APAC/CN",
    streamUrl: "https://www.twitch.tv/teamfighttactics",
    detailsUrl:
      "https://teamfighttactics.leagueoflegends.com/en-us/news/esports/tft-space-gods-tacticians-crown-announcement/",
  },
  {
    id: "tft-set16-pro-circuit",
    game: "tft",
    name: "Set 16 TFT Pro Circuit",
    startDate: "2026-08-01",
    endDate: "2026-12-31",
    dateNote: "Late 2026 · details TBA",
    detailsUrl:
      "https://teamfighttactics.leagueoflegends.com/en-us/news/esports/set-16-tft-pro-circuit-everything-you-need-to-know/",
  },
];

export function eventsForGame(gameSlug: string): ManualEvent[] {
  return MANUAL_EVENTS.filter((e) => e.game === gameSlug).sort((a, b) =>
    a.startDate.localeCompare(b.startDate)
  );
}

// 期間 [fromMs, toMs) と重なるイベント (ホームのDay/Week/Month絞り込み用)
export function eventsOverlapping(
  gameSlug: string,
  fromMs: number,
  toMs: number
): ManualEvent[] {
  return eventsForGame(gameSlug).filter((e) => {
    const start = Date.parse(e.startDate);
    const end = Date.parse(e.endDate) + 86_400_000; // endDateの日いっぱいまで
    return start < toMs && end > fromMs;
  });
}
