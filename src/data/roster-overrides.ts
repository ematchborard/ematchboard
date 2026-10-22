// ファン採点(PlayerRatingWidget)で表示する「出場5人」の手動補正。
// PandaScoreのチームロスターには控えが混ざっていることがあり、既定の自動選出
// (ロールごとに最初の1人)が実際の先発と違う場合にここで上書きする。
//
// 使い方: 該当試合のmatch_id(URLの/lol/match/の後ろの数字)をキーにして、
// 実際に出場した5人のplayer_id(PandaScoreのチームページ等で確認)を
// teamAIds/teamBIdsに入れる。teamA/teamBの対応は試合ページのopponents[0]/[1]
// と同じ並び。
//
// 例:
// export const ROSTER_OVERRIDES: Record<number, { teamAIds: number[]; teamBIds: number[] }> = {
//   1710926: { teamAIds: [111, 222, 333, 444, 555], teamBIds: [666, 777, 888, 999, 1000] },
// };

export const ROSTER_OVERRIDES: Record<number, { teamAIds: number[]; teamBIds: number[] }> = {};
