-- ファン採点機能の初期スキーマ (2026-10-22, Worlds 2026から導入)
-- 適用: npx wrangler d1 migrations apply ematchboard-ratings --remote

CREATE TABLE IF NOT EXISTS ratings (
  match_id INTEGER NOT NULL,
  player_id INTEGER NOT NULL,
  voter_hash TEXT NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 1 AND score <= 10),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(match_id, player_id, voter_hash)
);

CREATE INDEX IF NOT EXISTS idx_ratings_match_player ON ratings(match_id, player_id);

CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id INTEGER NOT NULL,
  player_id INTEGER NOT NULL,
  voter_hash TEXT NOT NULL,
  text TEXT NOT NULL,
  likes INTEGER NOT NULL DEFAULT 0,
  reports INTEGER NOT NULL DEFAULT 0,
  hidden INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(match_id, player_id, voter_hash)
);

CREATE INDEX IF NOT EXISTS idx_comments_match_player ON comments(match_id, player_id, hidden);

CREATE TABLE IF NOT EXISTS comment_likes (
  comment_id INTEGER NOT NULL,
  voter_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(comment_id, voter_hash)
);
