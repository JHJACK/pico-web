-- ═══════════════════════════════════════════════════════════════
-- 전리품 창고 교환 내역 테이블
-- Supabase SQL Editor에서 실행하세요
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS store_exchanges (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id          text        NOT NULL,
  points_used      integer     NOT NULL,
  kst_date         date        NOT NULL, -- KST 기준 교환 날짜 (YYYY-MM-DD)
  marketing_agreed boolean     DEFAULT false,
  status           text        DEFAULT 'pending', -- pending | confirmed | cancelled
  created_at       timestamptz DEFAULT now()
);

-- 일일 교환 조회 인덱스
CREATE INDEX IF NOT EXISTS idx_store_exchanges_item_date
  ON store_exchanges(item_id, kst_date);

-- 유저별 교환 조회 인덱스
CREATE INDEX IF NOT EXISTS idx_store_exchanges_user
  ON store_exchanges(user_id);

-- RLS 활성화
ALTER TABLE store_exchanges ENABLE ROW LEVEL SECURITY;

-- 모든 인증 유저가 일일 교환 여부 조회 가능 (sold out 체크 용)
CREATE POLICY "read_all_exchanges" ON store_exchanges
  FOR SELECT USING (true);

-- 본인 교환만 INSERT 가능
CREATE POLICY "insert_own_exchange" ON store_exchanges
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════
-- Supabase Authentication 이메일 인증 설정 안내
-- ═══════════════════════════════════════════════════════════════
-- 이메일 OTP 인증을 활성화하려면:
-- 1. Supabase Dashboard → Authentication → Providers → Email
-- 2. "Confirm email" 토글 ON
-- 3. Email Templates → Confirm signup 템플릿에서
--    기존 링크 아래에 OTP 코드 추가:
--    "인증 코드: {{ .Token }}"
-- ═══════════════════════════════════════════════════════════════
