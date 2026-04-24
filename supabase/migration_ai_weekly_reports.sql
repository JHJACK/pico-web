-- ────────────────────────────────────────────────────────────────────────────
-- PICO: AI 주간 리포트 마이그레이션
-- Supabase SQL Editor에서 실행하세요.
-- ────────────────────────────────────────────────────────────────────────────

-- 1. users 테이블에 리포트 관련 컬럼 추가
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS report_opted_in     boolean     DEFAULT false,
  ADD COLUMN IF NOT EXISTS report_opted_in_at  timestamptz,
  ADD COLUMN IF NOT EXISTS report_tier         text        DEFAULT 'free';
  -- report_tier: 'free' | 'premium' (500+ 유저 BM 전환 대비)

-- 2. ai_weekly_reports 테이블 생성
CREATE TABLE IF NOT EXISTS ai_weekly_reports (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_start    date        NOT NULL,     -- 해당 주 월요일 (예: 2026-04-21)
  week_end      date        NOT NULL,     -- 해당 주 금요일 (예: 2026-04-25)
  market        text        NOT NULL,     -- 'kr' | 'us'
  content       jsonb       NOT NULL,     -- ReportContent JSON
  tier          text        DEFAULT 'free',
  generated_at  timestamptz DEFAULT now(),
  UNIQUE(user_id, week_start, market)
);

-- 3. RLS 설정 (본인 리포트만 조회 가능)
ALTER TABLE ai_weekly_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_reports" ON ai_weekly_reports
  FOR SELECT USING (auth.uid() = user_id);

-- service role은 RLS 우회 (Cron 배치 생성용)
-- INSERT/UPDATE는 service role key로만 가능

-- 4. 인덱스 (목록 조회 성능)
CREATE INDEX IF NOT EXISTS idx_reports_user_week
  ON ai_weekly_reports (user_id, week_start DESC);

CREATE INDEX IF NOT EXISTS idx_reports_user_market
  ON ai_weekly_reports (user_id, market, week_start DESC);
