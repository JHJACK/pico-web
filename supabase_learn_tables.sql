-- ─────────────────────────────────────────────────────────────
-- PICO 도감 — 수집 테이블
-- Supabase SQL Editor에서 전체 실행하세요.
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS learn_collections (
  id           bigint generated always as identity primary key,
  user_id      uuid references users(id) on delete cascade not null,
  term_id      text not null,
  collected_at timestamptz default now() not null,
  UNIQUE(user_id, term_id)
);

-- ── 인덱스 ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS learn_collections_user_idx
  ON learn_collections(user_id);

-- ── RLS 설정 ─────────────────────────────────────────────────
ALTER TABLE learn_collections ENABLE ROW LEVEL SECURITY;

-- 본인 데이터만 읽기/쓰기
CREATE POLICY "learn_read_own"
  ON learn_collections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "learn_insert_own"
  ON learn_collections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "learn_delete_own"
  ON learn_collections FOR DELETE
  USING (auth.uid() = user_id);
