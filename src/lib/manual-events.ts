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
  ewc?: boolean; // Esports World Cup 2026 の公式種目なら true (/ewc ハブに掲載)
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
    prizePool: "$2,000,000",
    streamUrl: "https://www.twitch.tv/playapex",
    detailsUrl:
      "https://liquipedia.net/apexlegends/Apex_Legends_Global_Series/2026/Split_1/Playoffs",
    ewc: true,
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
    id: "fortnite-ewc-2026",
    game: "fortnite",
    name: "Fortnite Reload Elite Series at Esports World Cup",
    startDate: "2026-08-19",
    endDate: "2026-08-22",
    location: "Paris, France",
    prizePool: "$1,000,000",
    detailsUrl: "https://liquipedia.net/esports/Esports_World_Cup/2026",
    ewc: true,
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
    id: "tft-ewc-2026",
    game: "tft",
    name: "Teamfight Tactics at Esports World Cup",
    startDate: "2026-07-21",
    endDate: "2026-07-25",
    location: "Paris, France",
    prizePool: "$500,000",
    detailsUrl: "https://liquipedia.net/esports/Esports_World_Cup/2026",
    ewc: true,
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

  // ---- Mario Kart World (Nintendo公式オンライン大会+コミュニティ世界大会) ----
  {
    id: "mkw-drivers-championship",
    game: "mario-kart",
    name: "Drivers' Championship",
    startDate: "2026-03-07",
    endDate: "2026-03-07",
    location: "Online",
    detailsUrl:
      "https://www.nintendo.com/au/online-events/mario-kart-world/drivers-championship/",
  },
  {
    id: "mkw-springtime-skirmish",
    game: "mario-kart",
    name: "European Springtime Skirmish",
    startDate: "2026-04-25",
    endDate: "2026-04-25",
    location: "Online · Europe",
    detailsUrl: "https://www.nintendo.com/en-gb/News/2026/June/Aim-for-the-horizon-in-the-first-Mario-Kart-World-global-online-event--3111588.html",
  },
  {
    id: "mkw-global-online-challenge",
    game: "mario-kart",
    name: "Global Online Challenge",
    startDate: "2026-06-05",
    endDate: "2026-06-12",
    location: "Online · Worldwide",
    detailsUrl:
      "https://www.nintendo.com/en-gb/News/2026/June/Aim-for-the-horizon-in-the-first-Mario-Kart-World-global-online-event--3111588.html",
  },
  {
    id: "mkw-world-open-july",
    game: "mario-kart",
    name: "Mario Kart World Open — July",
    startDate: "2026-07-18",
    endDate: "2026-07-19",
    location: "Online · Americas",
    detailsUrl:
      "https://www.nintendo.com/us/whatsnew/turn-up-the-heat-this-summer-in-the-mario-kart-world-open-july-2026-event/",
  },
  {
    id: "mkwc-world-2026",
    game: "mario-kart",
    name: "MKWC World 2026 (community World Cup)",
    startDate: "2026-09-01",
    endDate: "2026-12-31",
    dateNote: "Late 2026 · dates TBA",
    detailsUrl: "https://mkcentral.com/en-us/tournaments/details?id=702",
  },

  // ---- Identity V 第五人格 (IJL=日本リーグ / IVL=中国リーグ / COA=世界大会) ----
  {
    id: "idv-coa-ix-world-finals",
    game: "identity-v",
    name: "Call of the Abyss IX — World Finals",
    startDate: "2026-05-01",
    endDate: "2026-05-05",
    location: "World Championship",
    detailsUrl: "https://esports-world.jp/tournament/59477",
  },
  {
    id: "idv-ivl-2026-summer",
    game: "identity-v",
    name: "IVL 2026 Summer",
    startDate: "2026-06-05",
    endDate: "2026-08-23",
    location: "China",
    detailsUrl: "https://liquipedia.net/identityv/Main_Page",
  },
  {
    id: "idv-ijl-2026-summer",
    game: "identity-v",
    name: "IJL 2026 Summer (Japan League)",
    startDate: "2026-06-06",
    endDate: "2026-08-02",
    location: "Japan",
    streamUrl: "https://www.youtube.com/channel/UCo5pHsgk0RaUek1ORd0PyXA",
    detailsUrl: "https://www.identityv.jp/IJLleague/",
  },
  {
    id: "idv-ijl-2026-autumn",
    game: "identity-v",
    name: "IJL 2026 Autumn (Japan League)",
    startDate: "2026-09-01",
    endDate: "2026-11-30",
    dateNote: "Autumn 2026 · details TBA",
    location: "Japan",
    detailsUrl: "https://www.identityv.jp/IJLleague/",
  },

  // ---- Super Smash Bros. Ultimate (コミュニティ大会が主体) ----
  {
    id: "smash-genesis-x3",
    game: "smash",
    name: "GENESIS X3",
    startDate: "2026-02-13",
    endDate: "2026-02-16",
    location: "San Jose, US",
    detailsUrl: "https://www.ssbwiki.com/Tournament:GENESIS_X3",
  },
  {
    id: "smash-kagaribi-15",
    game: "smash",
    name: "Kagaribi #15 (篝火)",
    startDate: "2026-05-03",
    endDate: "2026-05-05",
    location: "Makuhari Messe, Japan",
    detailsUrl: "https://liquipedia.net/smash/Major_Tournaments/Ultimate",
  },
  {
    id: "smash-majors-tba",
    game: "smash",
    name: "Upcoming majors",
    startDate: "2026-08-01",
    endDate: "2026-12-31",
    dateNote: "Autumn 2026 · see majors calendar",
    detailsUrl: "https://liquipedia.net/smash/Major_Tournaments/Ultimate",
  },

  // ---- Street Fighter 6 (Capcom Pro Tour 2026, 賞金総額$2.1M) ----
  {
    id: "sf6-evo-japan-2026",
    game: "sf6",
    name: "EVO Japan 2026 (CPT)",
    startDate: "2026-05-01",
    endDate: "2026-05-03",
    location: "Japan",
    detailsUrl: "https://liquipedia.net/fighters/Capcom_Pro_Tour/2026",
  },
  {
    id: "sf6-combo-breaker-2026",
    game: "sf6",
    name: "COMBO BREAKER 2026 (CPT Premier)",
    startDate: "2026-05-22",
    endDate: "2026-05-24",
    location: "US",
    detailsUrl: "https://liquipedia.net/fighters/Capcom_Pro_Tour/2026",
  },
  {
    id: "sf6-evo-2026",
    game: "sf6",
    name: "EVO 2026 (CPT Premier)",
    startDate: "2026-06-26",
    endDate: "2026-06-28",
    location: "Las Vegas, US",
    detailsUrl: "https://liquipedia.net/fighters/Capcom_Pro_Tour/2026",
  },
  {
    id: "sf6-ewc-2026",
    game: "sf6",
    name: "Street Fighter 6 at Esports World Cup",
    startDate: "2026-07-29",
    endDate: "2026-08-01",
    location: "Paris, France",
    prizePool: "$1,000,000",
    detailsUrl: "https://sf.esports.capcom.com/cpt/schedule/",
    ewc: true,
  },
  {
    id: "sf6-capcom-cup-13",
    game: "sf6",
    name: "Capcom Cup 13",
    startDate: "2027-02-01",
    endDate: "2027-03-31",
    dateNote: "Early 2027 · dates TBA",
    location: "Ryogoku Kokugikan, Tokyo",
    detailsUrl: "https://sf.esports.capcom.com/cpt/schedule/",
  },

  // ---- Pokémon (World Championship Series) ----
  {
    id: "pokemon-worlds-2026",
    game: "pokemon",
    name: "Pokémon World Championships 2026",
    startDate: "2026-08-28",
    endDate: "2026-08-30",
    location: "San Francisco, US (Moscone Center)",
    detailsUrl: "https://worlds.pokemon.com/en-us",
  },

  // ---- Splatoon 3 (公式大会の新シーズン待ち) ----
  {
    id: "splatoon-official-tba",
    game: "splatoon",
    name: "Nintendo official tournaments",
    startDate: "2026-08-01",
    endDate: "2027-03-31",
    dateNote: "TBA — check official channels",
    location: "Japan",
    detailsUrl: "https://e-spogate.net/splatoon3/",
  },

  // ---- Puyo Puyo (セガ公式 Global Ranking Series 2026) ----
  {
    id: "puyo-grs-2026-1",
    game: "puyo-puyo",
    name: "PuyoPuyo Global Ranking Series 2026 #1",
    startDate: "2026-05-30",
    endDate: "2026-05-30",
    location: "Japan",
    detailsUrl: "https://esports.sega.jp/puyo/",
  },
  {
    id: "puyo-grs-2026-2",
    game: "puyo-puyo",
    name: "PuyoPuyo Global Ranking Series 2026 #2",
    startDate: "2026-07-25",
    endDate: "2026-07-25",
    location: "Japan",
    detailsUrl: "https://esports.sega.jp/puyo/",
  },
  {
    id: "puyo-grs-2026-3",
    game: "puyo-puyo",
    name: "PuyoPuyo Global Ranking Series 2026 #3",
    startDate: "2026-11-07",
    endDate: "2026-11-07",
    location: "Japan",
    detailsUrl: "https://esports.sega.jp/puyo/",
  },
  {
    id: "puyo-grs-2026-4",
    game: "puyo-puyo",
    name: "PuyoPuyo Global Ranking Series 2026 #4",
    startDate: "2027-01-16",
    endDate: "2027-01-16",
    location: "Japan",
    detailsUrl: "https://esports.sega.jp/puyo/",
  },
];

export function eventsForGame(gameSlug: string): ManualEvent[] {
  return MANUAL_EVENTS.filter((e) => e.game === gameSlug).sort((a, b) =>
    a.startDate.localeCompare(b.startDate)
  );
}

// Esports World Cup 2026 の公式種目としてタグ付けされた手動イベント
// (Apex/Fortnite/TFT/SF6 など、試合単位データを持たないタイトル向け)
export function ewcManualEvents(): ManualEvent[] {
  return MANUAL_EVENTS.filter((e) => e.ewc).sort((a, b) =>
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
