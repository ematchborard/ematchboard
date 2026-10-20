// League of Legends World Championship (Worlds) 専用ページ用の定数。
// PandaScoreの league_id=297 (Worlds) は年をまたいで固定だが、serie_id と日程は
// 毎年変わるので、シーズンが切り替わったら /lol/series?filter[league_id]=297
// (sort=-begin_at) から最新の値に更新すること。
// 2026年大会: Play-In 10/15-10/18, Group Stage 10/23-11/1, Playoffs 11/3-11/15
// (出典: PandaScore series/tournaments API, 2026-10-20時点)。

export const WORLDS_YEAR = 2026;
export const WORLDS_SERIE_ID = 11014;
export const WORLDS_START = "2026-10-15";
export const WORLDS_END = "2026-11-15";
// Group Stage(Swiss形式)のtournament_id。トーナメント表タブで簡易Swiss表示を
// 出し分けるのに使う。シーズンが切り替わったら上のserie_idと合わせて更新すること
export const WORLDS_GROUP_STAGE_ID = 22047;
// league_id=297固定なのでロゴURLも年をまたいで変わらない
export const WORLDS_LEAGUE_IMAGE =
  "https://cdn-api.pandascore.co/images/league/image/297/worlds-png";
