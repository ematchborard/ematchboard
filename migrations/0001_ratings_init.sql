-- ファン採点機能の初期スキーマ (2026-10-22, Worlds 2026から導入)
--
-- voter_hash は httpOnly CookieのランダムID単体(+サーバー側ペッパー)だけから
-- 作ること。IPハッシュ(日替わりソルト)を混ぜると、翌日には別のvoter_hashに
-- なってしまい「同じ端末が日をまたいで再投票できてしまう」ため、永続的な
-- 重複防止(UNIQUE制約)には使えない。IPは短時間の連投を防ぐレート制限専用の
-- ip_hash列として別で持つ(日替わりソルトはこちらでは問題にならない —
-- レート制限は「直近の」連投を見るだけなので)。

CREATE TABLE IF NOT EXISTS ratings (
  match_id INTEGER NOT NULL,
  player_id INTEGER NOT NULL,
  voter_hash TEXT NOT NULL,
  ip_hash TEXT NOT NULL, -- レート制限専用。重複投票の判定には使わない
  score INTEGER NOT NULL CHECK (score >= 1 AND score <= 10),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(match_id, player_id, voter_hash)
  -- (match_id, player_id, voter_hash)のUNIQUE制約がそのまま先頭2列の検索にも
  -- 効く複合indexになるため、別途match_id+player_idだけのindexは作らない
);

CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id INTEGER NOT NULL,
  player_id INTEGER NOT NULL,
  voter_hash TEXT NOT NULL,
  ip_hash TEXT NOT NULL, -- レート制限専用
  text TEXT NOT NULL,
  likes INTEGER NOT NULL DEFAULT 0,
  hidden INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(match_id, player_id, voter_hash)
);

-- トップコメント(いいね順)表示を速くするため、いいね数も複合indexに含める
CREATE INDEX IF NOT EXISTS idx_comments_match_player
  ON comments(match_id, player_id, hidden, likes DESC);

CREATE TABLE IF NOT EXISTS comment_likes (
  comment_id INTEGER NOT NULL,
  voter_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(comment_id, voter_hash)
);

-- 通報も1人1回まで(reportsをただのカウンターにすると1人が3回押すだけで
-- 非表示にできてしまうため、likesと同じ方式でテーブルを分ける)。
-- 通報数は SELECT COUNT(*) FROM comment_reports WHERE comment_id = ? で集計し、
-- 3件以上でhidden=1にする
CREATE TABLE IF NOT EXISTS comment_reports (
  comment_id INTEGER NOT NULL,
  voter_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(comment_id, voter_hash)
);
