# eMATCH BOARD — セットアップ手順

esports版FotMob。試合日程・結果・大会情報を自分のタイムゾーンで見られるWebアプリ。

## 1. 起動する(APIキーなしでもOK)

```
cd C:\dev\esports-mob
npm run dev
```

ブラウザで http://localhost:3000 を開く。
APIキーを設定するまではサンプルデータ(モック)が表示される。
(デスクトップの「eMATCH BOARD.bat」をダブルクリックでも起動できる)

## 2. PandaScoreのAPIキーを設定する(実データに切り替え)

1. https://app.pandascore.co でサインアップ(無料・クレカ不要)
2. ログイン後のダッシュボードに表示される **API token** をコピー
3. このフォルダの `.env.example` をコピーして `.env.local` という名前にする
4. `PANDASCORE_TOKEN=ここにトークンを貼る`
5. `npm run dev` を再起動 → 実際の試合データが表示される

無料枠は 1,000リクエスト/時。このアプリはサーバー側で5分キャッシュしているので、
通常の閲覧で枠を超えることはまずない。

## 3. ゲームタイトルを追加する

`src/lib/games.ts` の `GAMES` 配列に1行足すだけ。
`slug` は PandaScore のルート名に合わせる(例: CS2 → `csgo`、Dota 2 → `dota2`)。

## 構成メモ

- `src/lib/pandascore.ts` — APIクライアント。トークン未設定ならモックにフォールバック。5分キャッシュ
- `src/lib/mock.ts` — サンプルデータ生成(現在時刻基準)
- `src/lib/games.ts` — 対応ゲーム一覧(12タイトル)
- `src/lib/popularity.ts` — 人気大会の並び順+言語→地域ブースト
- `src/lib/follow.ts` — ゲーム/チームのフォローと言語設定(localStorage)
- `src/lib/range.ts` — Day/Week/Monthのデータ取得期間計算
- `src/app/page.tsx` — 総合ホーム(フォロー中ゲームのダイジェスト)
- `src/app/[game]/page.tsx` — ゲーム別ページ(Day/Week/Month、カレンダー付き)
- `src/app/[game]/event/[id]` — 大会全体ページ(全日程+ステージタブ)
- `src/app/[game]/tournament/[id]` — ステージページ(ブラケット+順位表+日程)
- `src/app/[game]/match/[id]` — 試合詳細(スコア/マップ/フォーム/H2H/ロスター)
- `src/app/[game]/team/[id]` — チームページ(ロスター+直近試合+フォロー)

## 注意

- `.env.local`(APIトークン)は絶対にコミットしない(.gitignoreで除外済み)
- Next.jsのページに `force-dynamic` を付けない(fetchの5分キャッシュまで無効になる)
