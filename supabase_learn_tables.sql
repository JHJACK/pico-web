-- ─────────────────────────────────────────────────────────────
-- PICO 도감 — 수집 테이블
-- Supabase SQL Editor 또는 마이그레이션에서 실행하세요.
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS learn_collections (
  id           bigint generated always as identity primary key,
  user_id      uuid references users(id) on delete cascade not null,
  term_id      text not null,
  collected_at timestamptz default now() not null,
  UNIQUE(user_id, term_id)
);

CREATE INDEX IF NOT EXISTS learn_collections_user_idx
  ON learn_collections(user_id);
