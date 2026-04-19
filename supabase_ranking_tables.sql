-- ══════════════════════════════════════════════════════════════
-- PICO 주간 랭킹 테이블 (Supabase SQL Editor에서 순서대로 실행)
-- ══════════════════════════════════════════════════════════════

-- 1. 주간 랭킹 캐시 (2시간마다 갱신)
CREATE TABLE IF NOT EXISTS weekly_rankings_cache (
  id                  BIGSERIAL PRIMARY KEY,
  week_start          DATE        NOT NULL,         -- 해당 주 월요일 날짜
  user_id             UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nickname            TEXT,
  avatar_url          TEXT,
  return_rate         NUMERIC(10,4) DEFAULT 0,      -- 주간 총 수익률 (%)
  total_invested      INTEGER     DEFAULT 0,         -- 총 투자 포인트
  trade_count         INTEGER     DEFAULT 0,         -- 거래 횟수 (매수 기준)
  win_count           INTEGER     DEFAULT 0,         -- 수익 거래 수
  max_single_return   NUMERIC(10,4) DEFAULT 0,       -- 단건 최고 수익률 (스나이퍼 기준)
  all_loss            BOOLEAN     DEFAULT FALSE,     -- 모든 종목 손실 여부 (청개구리 기준)
  never_sold          BOOLEAN     DEFAULT FALSE,     -- 이번 주 매도 0회 (존버 기준)
  daily_trade_avg     NUMERIC(6,2) DEFAULT 0,        -- 일평균 거래 횟수 (단타 기준)
  min_drawdown        NUMERIC(10,4) DEFAULT 0,       -- 최소 손실폭 (냉철한 멘탈 기준)
  rank_position       INTEGER,                       -- 수익률 기준 전체 순위
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(week_start, user_id)
);

-- 2. 주간 수상 기록 (카테고리별 주간 우승자)
CREATE TABLE IF NOT EXISTS weekly_awards (
  id          BIGSERIAL PRIMARY KEY,
  week_start  DATE    NOT NULL,
  category    TEXT    NOT NULL,   -- 'sniper'|'frog'|'hodl'|'daytrader'|'mentalsteel'
  user_id     UUID    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  metric_val  NUMERIC(10,4),      -- 수상 기준 수치
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(week_start, category)
);

-- 3. 유저 뱃지 컬렉션 (도감용 영구 보관)
CREATE TABLE IF NOT EXISTS user_badges (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category    TEXT    NOT NULL,   -- 'sniper'|'frog'|'hodl'|'daytrader'|'mentalsteel'
  week_start  DATE    NOT NULL,
  earned_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, category, week_start)
);

-- ── RLS 설정 ──────────────────────────────────────────────────
ALTER TABLE weekly_rankings_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_awards         ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges           ENABLE ROW LEVEL SECURITY;

-- 랭킹 캐시: 전체 공개 읽기
CREATE POLICY "rankings_read_all"  ON weekly_rankings_cache FOR SELECT USING (true);
CREATE POLICY "rankings_write_all" ON weekly_rankings_cache FOR ALL   USING (true);

-- 수상 기록: 전체 공개 읽기
CREATE POLICY "awards_read_all"  ON weekly_awards FOR SELECT USING (true);
CREATE POLICY "awards_write_all" ON weekly_awards FOR ALL   USING (true);

-- 뱃지: 전체 공개 읽기 / 본인만 쓰기
CREATE POLICY "badges_read_all"   ON user_badges FOR SELECT USING (true);
CREATE POLICY "badges_write_all"  ON user_badges FOR ALL   USING (true);

-- ── 인덱스 ─────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_rankings_week   ON weekly_rankings_cache(week_start, rank_position);
CREATE INDEX IF NOT EXISTS idx_awards_week     ON weekly_awards(week_start);
CREATE INDEX IF NOT EXISTS idx_badges_user     ON user_badges(user_id);
