import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ── 타입 정의 ──────────────────────────────────────
export type UserRow = {
  id: string;
  nickname: string;
  investor_type: string | null;
  total_points: number;
  created_at: string;
  avatar_url: string | null;
  equipped_title: string | null;
};

export type AttendanceRow = {
  id: number;
  user_id: string;
  date: string;
  attended: boolean;
  points_earned: number;
};

export type BattleVoteRow = {
  id: number;
  user_id: string;
  date: string;
  ticker: string;           // 오늘의 선택 종목 티커
  voted_for: string;        // 'UP' | 'DOWN'
  is_correct: boolean | null;
  points_earned: number;
};

// ── 종목 타입 ──────────────────────────────────────
export type StockItem = {
  ticker: string;
  name: string;
  category: string;
};

// ── 종목 풀 (PICO Play API 연동 전 순환 풀) ─────────
// 나중에 battles 테이블에서 읽어오는 방식으로 교체 예정
// 교체 시 getTodayStock / getTomorrowStock 함수만 수정하면 됨
const STOCK_POOL: StockItem[] = [
  { ticker: "TSLA",  name: "테슬라",         category: "전기차"    },
  { ticker: "NVDA",  name: "엔비디아",        category: "AI·반도체" },
  { ticker: "AAPL",  name: "애플",            category: "빅테크"    },
  { ticker: "MSFT",  name: "마이크로소프트",   category: "빅테크"    },
  { ticker: "ABNB",  name: "에어비앤비",       category: "숙박"      },
  { ticker: "META",  name: "메타",            category: "빅테크"    },
  { ticker: "GOOGL", name: "구글",            category: "빅테크"    },
  { ticker: "AMZN",  name: "아마존",          category: "빅테크"    },
  { ticker: "NFLX",  name: "넷플릭스",        category: "스트리밍"  },
  { ticker: "AMD",   name: "AMD",             category: "반도체"    },
  { ticker: "SBUX",  name: "스타벅스",        category: "소비재"    },
  { ticker: "NKE",   name: "나이키",          category: "소비재"    },
  { ticker: "JPM",   name: "JP모건",          category: "금융"      },
  { ticker: "PLTR",  name: "팔란티어",        category: "AI"        },
];

// 날짜 문자열(YYYY-MM-DD) → 고정 기준일로부터 경과 일수
function dayIndex(dateStr: string): number {
  const epoch = new Date("2025-01-01").getTime();
  const date  = new Date(dateStr + "T00:00:00").getTime();
  return Math.floor((date - epoch) / 86_400_000);
}

// 오늘 종목 (날짜 기반 결정론적 순환)
// PICO Play API 연동 시 이 함수를 battles 테이블 조회로 교체
export function getTodayStock(): StockItem {
  return STOCK_POOL[dayIndex(todayKST()) % STOCK_POOL.length];
}

// 내일 종목 (히스토리 페이지 "내일 예고"용)
// PICO Play API 연동 시 이 함수를 battles 테이블 조회로 교체
export function getTomorrowStock(): StockItem {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const tomorrowStr = d.toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
  return STOCK_POOL[dayIndex(tomorrowStr) % STOCK_POOL.length];
}

// 특정 날짜의 종목 (히스토리 표시용)
// PICO Play API 연동 시 battles 테이블에서 해당 날짜 row 조회로 교체
export function getStockForDate(dateStr: string): StockItem {
  return STOCK_POOL[dayIndex(dateStr) % STOCK_POOL.length];
}

export type PointHistoryRow = {
  id: number;
  user_id: string;
  points: number;
  reason: string;
  created_at: string;
};

// ── 오늘 날짜 (KST 기준 YYYY-MM-DD) ───────────────
export function todayKST(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
}

// ── 어제 날짜 (KST 기준 YYYY-MM-DD) ───────────────
export function yesterdayKST(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
}

// ── 현재 KST 시각 (시간) ─────────────────────────
export function currentHourKST(): number {
  return parseInt(new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul", hour: "numeric", hour12: false }));
}

// ── 프로필 이미지 업로드 ──────────────────────────
export async function uploadAvatar(uid: string, file: File): Promise<string | null> {
  if (!uid) return null;
  const ext  = file.name.split(".").pop() ?? "jpg";
  const path = `${uid}/avatar.${ext}`;

  const { error: upErr } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (upErr) {
    console.error("[uploadAvatar] storage:", upErr.message);
    return null;
  }

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  const url = `${data.publicUrl}?t=${Date.now()}`;

  const { error: dbErr } = await supabase
    .from("users")
    .update({ avatar_url: url })
    .eq("id", uid);
  if (dbErr) {
    console.error("[uploadAvatar] db update:", dbErr.message);
    return null;
  }
  return url;
}

// ── 회원가입 후 users 테이블 row 생성 ─────────────
export async function createUserRow(uid: string, email: string) {
  if (!uid) return;
  const nickname = email.split("@")[0];
  const { error } = await supabase.from("users").upsert(
    { id: uid, nickname, investor_type: null, total_points: 0 },
    { onConflict: "id" }
  );
  if (error) console.error("[createUserRow]", error.message);
}

// ── users row 가져오기 ─────────────────────────────
export async function getUserRow(uid: string): Promise<UserRow | null> {
  if (!uid) return null;
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", uid)
    .single();
  if (error && error.code !== "PGRST116") {
    // PGRST116 = 0 rows (정상 케이스)
    console.error("[getUserRow]", error.message);
  }
  return data as UserRow | null;
}

// ── 오늘 선택 투표 수 집계 (UP/DOWN) ─────────────────
export async function getTodayVoteCounts(): Promise<{ votesUp: number; votesDown: number }> {
  const { data, error } = await supabase
    .from("battle_votes")
    .select("voted_for")
    .eq("date", todayKST());

  if (error) {
    console.error("[getTodayVoteCounts]", error.message);
    return { votesUp: 0, votesDown: 0 };
  }

  const rows     = (data ?? []) as { voted_for: string }[];
  const votesUp   = rows.filter((r) => r.voted_for === "UP").length;
  const votesDown = rows.filter((r) => r.voted_for === "DOWN").length;
  return { votesUp, votesDown };
}

// ── 어제 battle_vote 조회 ────────────────────────
export async function getYesterdayVote(uid: string): Promise<BattleVoteRow | null> {
  if (!uid) return null;
  const { data, error } = await supabase
    .from("battle_votes")
    .select("*")
    .eq("user_id", uid)
    .eq("date", yesterdayKST())
    .maybeSingle();
  if (error) console.error("[getYesterdayVote]", error.message);
  return data as BattleVoteRow | null;
}

// ── 오늘 battle_vote 존재 여부 ────────────────────
export async function getTodayVote(uid: string): Promise<BattleVoteRow | null> {
  if (!uid) return null;
  const { data, error } = await supabase
    .from("battle_votes")
    .select("*")
    .eq("user_id", uid)
    .eq("date", todayKST())
    .maybeSingle();
  if (error) console.error("[getTodayVote]", error.message);
  return data as BattleVoteRow | null;
}

// ── 포인트 내역 조회 ──────────────────────────────────
export async function getPointHistory(uid: string): Promise<PointHistoryRow[]> {
  if (!uid) return [];
  const { data, error } = await supabase
    .from("point_history")
    .select("*")
    .eq("user_id", uid)
    .order("created_at", { ascending: false });
  if (error) { console.error("[getPointHistory]", error.message); return []; }
  return (data ?? []) as PointHistoryRow[];
}

// ── 포인트 내역 삽입 (내부 헬퍼) ─────────────────────
async function insertPointHistory(uid: string, points: number, reason: string, db: typeof supabase = supabase) {
  if (!uid) return;
  const { error } = await db
    .from("point_history")
    .insert({ user_id: uid, points, reason });
  if (error) console.error("[insertPointHistory]", error.message);
}

// ── 포인트 증가 헬퍼 (RPC 사용 — race condition 방지) ──
// ※ Supabase SQL Editor에서 아래 함수를 먼저 생성해야 합니다:
//
//   CREATE OR REPLACE FUNCTION increment_user_points(uid uuid, delta int)
//   RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
//   BEGIN
//     UPDATE users SET total_points = total_points + delta WHERE id = uid;
//   END;
//   $$;
//
// RPC가 없으면 select→update fallback 사용
async function addPoints(uid: string, delta: number, db: typeof supabase = supabase) {
  if (!uid || delta === 0) return;

  // RPC 시도
  const { error: rpcErr } = await db.rpc("increment_user_points", {
    uid,
    delta,
  });
  console.log("포인트 RPC 결과:", rpcErr ?? "success");

  if (!rpcErr) return; // 성공

  // RPC 없으면 select→update fallback
  console.warn("[addPoints] RPC fallback:", rpcErr.message);
  const { data, error: selErr } = await db
    .from("users")
    .select("total_points")
    .eq("id", uid)
    .single();
  if (selErr) { console.error("[addPoints] select:", selErr.message); return; }
  const current = (data as { total_points: number } | null)?.total_points ?? 0;
  const { error: updErr } = await db
    .from("users")
    .update({ total_points: current + delta })
    .eq("id", uid);
  if (updErr) console.error("[addPoints] update:", updErr.message);
}

// ── 투표 + 출석 저장 + 포인트 처리 ───────────────
// votedFor: 'UP' | 'DOWN', ticker: 오늘 종목 티커
// PICO Play API 연동 후에도 이 함수 시그니처 유지 (내부만 교체)
export async function submitVoteAndAttendance(
  uid: string,
  votedFor: "UP" | "DOWN",
  ticker: string
): Promise<{ bonusDays: number; bonusPoints: number }> {
  if (!uid) return { bonusDays: 0, bonusPoints: 0 };

  // 날짜: KST 기준 YYYY-MM-DD (date 타입 컬럼과 일치)
  const today = todayKST();

  console.log("1. 투표 시작", { userId: uid, voted: votedFor, ticker, today });

  // 1) battle_votes 저장 (이미 있으면 무시)
  const { error: voteErr } = await supabase.from("battle_votes").insert(
    {
      user_id: uid,
      date: today,
      ticker,
      voted_for: votedFor,
      is_correct: null,
      points_earned: 0,
    }
  );
  // 중복(unique violation) 에러는 정상 — 이미 투표한 경우
  if (voteErr && voteErr.code !== "23505") {
    console.error("2. battle_votes 저장 실패", voteErr);
  } else {
    console.log("2. battle_votes 저장 결과", voteErr ? "이미 존재(정상)" : "✅ 성공");
  }

  // 2) attendance 이미 있는지 확인
  const { data: existingAtt, error: attSelErr } = await supabase
    .from("attendance")
    .select("id")
    .eq("user_id", uid)
    .eq("date", today)
    .maybeSingle();
  console.log("2b. attendance 중복 확인", { existingAtt, error: attSelErr ?? null });

  if (!existingAtt) {
    if (!uid) {
      console.error("3. attendance INSERT 건너뜀 — uid 없음");
      return { bonusDays: 0, bonusPoints: 0 };
    }
    // 3) attendance 삽입 — user_id 명시 필수 (RLS: auth.uid() = user_id)
    // 컬럼명: points_earned (ALTER TABLE로 DB 통일됨)
    const { error: attInsErr } = await supabase.from("attendance").insert({
      user_id: uid,
      date: today,
      attended: true,
      points_earned: 100,
    });
    console.log("3. attendance 저장 결과:", JSON.stringify(attInsErr));

    if (!attInsErr) {
      // 4) 기본 출석 포인트 +100
      const { error: pointErr } = await supabase.rpc("increment_user_points", {
        uid,
        delta: 100,
      });
      console.log("4. 포인트 업데이트 결과 (+100)", pointErr ?? "✅ 성공");
      if (pointErr) {
        console.warn("4. RPC 없음 — fallback 사용:", pointErr.message);
        await addPoints(uid, 100);
      }
      await insertPointHistory(uid, 100, "일일 출석 체크");
    }
  } else {
    console.log("3. attendance 이미 존재 — 삽입 건너뜀");
  }

  // 5) 연속 출석 보너스 계산
  const { data: attRows, error: streakErr } = await supabase
    .from("attendance")
    .select("date")
    .eq("user_id", uid)
    .eq("attended", true)
    .order("date", { ascending: false })
    .limit(35);
  console.log("5. streak 조회", { rows: attRows?.length ?? 0, error: streakErr ?? null });

  const streak      = calcStreak(attRows?.map((r: { date: string }) => r.date) ?? []);
  const bonusMap: Record<number, number> = { 7: 100, 14: 200, 21: 300, 30: 500 };
  const bonusPoints = bonusMap[streak] ?? 0;
  console.log("5b. streak 계산", { streak, bonusPoints });

  if (bonusPoints > 0 && !existingAtt) {
    const { error: bonusErr } = await supabase.rpc("increment_user_points", {
      uid,
      delta: bonusPoints,
    });
    console.log(`6. 보너스 포인트 +${bonusPoints}`, bonusErr ?? "✅ 성공");
    if (bonusErr) await addPoints(uid, bonusPoints); // fallback
    const bonusReasonMap: Record<number, string> = {
      100: "7일 연속 출석 보너스",
      200: "14일 연속 출석 보너스",
      300: "21일 연속 출석 보너스",
      500: "30일 연속 출석 보너스",
    };
    await insertPointHistory(uid, bonusPoints, bonusReasonMap[bonusPoints] ?? `${streak}일 연속 출석 보너스`);
  }

  return { bonusDays: streak, bonusPoints: !existingAtt ? bonusPoints : 0 };
}

// 연속 출석일 계산
function calcStreak(dates: string[]): number {
  if (dates.length === 0) return 0;
  const sorted = [...dates].sort((a, b) => b.localeCompare(a));
  let streak = 1;
  for (let i = 0; i < sorted.length - 1; i++) {
    const cur  = new Date(sorted[i]);
    const next = new Date(sorted[i + 1]);
    const diff = (cur.getTime() - next.getTime()) / 86_400_000;
    if (diff === 1) streak++;
    else break;
  }
  return streak;
}

// ── 퀴즈 결과 저장 ────────────────────────────────
export async function saveQuizResult(uid: string, investorType: string) {
  if (!uid) return { pointsAdded: 0 };

  const { data: row, error: selErr } = await supabase
    .from("users")
    .select("investor_type")
    .eq("id", uid)
    .single();
  if (selErr) console.error("[saveQuizResult] select:", selErr.message);

  // SELECT 실패 시 isFirst = false로 처리 → 보너스 중복 지급 방지
  const isFirst = !selErr && !(row as { investor_type: string | null } | null)?.investor_type;

  const { error: updErr } = await supabase
    .from("users")
    .update({ investor_type: investorType })
    .eq("id", uid);
  console.log("investor_type 저장 결과:", updErr ?? "success");

  if (isFirst) {
    await addPoints(uid, 300);
    await insertPointHistory(uid, 300, "투자 DNA 퀴즈 완료");
  }

  return { pointsAdded: isFirst ? 300 : 0 };
}

// ── 오늘의 선택 정답 포인트 지급 ────────────────────────
export async function awardBattleCorrect(uid: string) {
  if (!uid) return;
  await addPoints(uid, 100);
  await insertPointHistory(uid, 100, "오늘의 선택 정답");
}

// ── 결과 판정: 어제 미판정 투표 처리 ──────────────────
// 오전 6시(KST) 이후 첫 접속 시 호출.
// 해당 종목의 실제 등락률(changePercent)로 UP/DOWN 판정.
// changePercent >= 0 → UP 승, < 0 → DOWN 승.
export async function judgeYesterdayBattle(
  uid: string
): Promise<{ winner: string | null; myVote: BattleVoteRow | null }> {
  if (!uid) return { winner: null, myVote: null };

  // 오전 6시(KST) 이전이면 판정 안 함
  if (currentHourKST() < 6) return { winner: null, myVote: null };

  const yesterday = yesterdayKST();
  const { data: vote, error } = await supabase
    .from("battle_votes")
    .select("*")
    .eq("user_id", uid)
    .eq("date", yesterday)
    .maybeSingle();

  if (error || !vote) return { winner: null, myVote: null };

  // 이미 판정됨 — 결과 반환
  if (vote.is_correct !== null) {
    const winner = vote.is_correct
      ? vote.voted_for
      : vote.voted_for === "UP" ? "DOWN" : "UP";
    return { winner, myVote: vote as BattleVoteRow };
  }

  // 실제 주가 등락률로 UP/DOWN 판정
  let winner: string;
  try {
    const res = await fetch(`/api/stocks?tickers=${vote.ticker}`, { cache: "no-store" });
    const data = await res.json();
    const changePercent: number = data?.[vote.ticker]?.changePercent ?? 0;
    winner = changePercent >= 0 ? "UP" : "DOWN";
  } catch {
    // API 실패 시 랜덤 폴백
    winner = Math.random() < 0.5 ? "UP" : "DOWN";
  }

  const isCorrect = vote.voted_for === winner;

  await supabase
    .from("battle_votes")
    .update({ is_correct: isCorrect, points_earned: isCorrect ? 100 : 0 })
    .eq("id", vote.id);

  if (isCorrect) {
    await awardBattleCorrect(uid);
  }

  const judged = { ...vote, is_correct: isCorrect, points_earned: isCorrect ? 100 : 0 };
  return { winner, myVote: judged as BattleVoteRow };
}

// ── 모의 투자 타입 ────────────────────────────────────
export type MockInvestmentRow = {
  id: string;
  user_id: string;
  ticker: string;
  invested_points: number;
  buy_price: number;
  buy_at: string;
  sell_price: number | null;
  sell_at: string | null;
  status: "holding" | "sold";
  final_points: number | null;
};

// ── 모의 매수 ─────────────────────────────────────────
// 주의: 포인트 먼저 차감 → 투자 기록 순서로 진행 (실패 시 환불)
export async function buyStock(
  uid: string,
  ticker: string,
  investedPoints: number,
  buyPrice: number,
  db: typeof supabase = supabase
): Promise<{ ok: boolean; investment?: MockInvestmentRow; error?: string; isFirstInvestment?: boolean }> {
  if (!uid) return { ok: false, error: "로그인이 필요해요" };
  if (investedPoints < 100) return { ok: false, error: "최소 100P 이상 투자해 주세요" };

  // 1) 현재 포인트 확인
  const { data: userRow, error: selErr } = await db
    .from("users")
    .select("total_points")
    .eq("id", uid)
    .single();
  if (selErr || !userRow) return { ok: false, error: "유저 정보를 불러올 수 없어요" };
  if ((userRow as { total_points: number }).total_points < investedPoints)
    return { ok: false, error: "포인트가 부족해요" };

  // 2) 포인트 차감
  const { error: rpcErr } = await db.rpc("increment_user_points", {
    uid,
    delta: -investedPoints,
  });
  if (rpcErr) return { ok: false, error: "포인트 차감에 실패했어요" };

  // 3) 투자 기록 저장
  const { data: inv, error: invErr } = await db
    .from("mock_investments")
    .insert({
      user_id: uid,
      ticker,
      invested_points: investedPoints,
      buy_price: buyPrice,
      status: "holding",
    })
    .select()
    .single();

  if (invErr) {
    // 실패 시 포인트 환불
    await db.rpc("increment_user_points", { uid, delta: investedPoints });
    return { ok: false, error: "투자 기록 저장에 실패했어요" };
  }

  // 4) 포인트 내역 기록
  await insertPointHistory(uid, -investedPoints, `${ticker} 모의 매수`, db);

  // 5) 투자 횟수 단계별 퀘스트 (1회씩)
  const { count } = await db
    .from("mock_investments")
    .select("*", { count: "exact", head: true })
    .eq("user_id", uid);
  const investCount = count ?? 0;
  const isFirstInvestment = investCount === 1;

  if (isFirstInvestment) {
    await db.rpc("increment_user_points", { uid, delta: 200 });
    await insertPointHistory(uid, 200, "첫 모의투자 퀘스트 완료", db);
  } else if (investCount === 3) {
    await db.rpc("increment_user_points", { uid, delta: 150 });
    await insertPointHistory(uid, 150, "모의투자 3회 달성 퀘스트", db);
  } else if (investCount === 10) {
    await db.rpc("increment_user_points", { uid, delta: 300 });
    await insertPointHistory(uid, 300, "모의투자 10회 달성 퀘스트", db);
  } else if (investCount === 30) {
    await db.rpc("increment_user_points", { uid, delta: 500 });
    await insertPointHistory(uid, 500, "모의투자 30회 달성 퀘스트", db);
  }

  return { ok: true, investment: inv as MockInvestmentRow, isFirstInvestment };
}

// ── 모의 매도 ─────────────────────────────────────────
export async function sellStock(
  uid: string,
  investmentId: string,
  sellPrice: number,
  db: typeof supabase = supabase
): Promise<{ ok: boolean; finalPoints?: number; profitLoss?: number; error?: string; questBonus?: number }> {
  if (!uid) return { ok: false, error: "로그인이 필요해요" };

  // 1) 투자 기록 조회
  const { data: inv, error: selErr } = await db
    .from("mock_investments")
    .select("*")
    .eq("id", investmentId)
    .eq("user_id", uid)
    .eq("status", "holding")
    .single();
  if (selErr || !inv) return { ok: false, error: "보유 종목을 찾을 수 없어요" };

  const investment = inv as MockInvestmentRow;
  const finalPoints = Math.max(
    0,
    Math.round(investment.invested_points * (sellPrice / investment.buy_price))
  );
  const profitLoss = finalPoints - investment.invested_points;

  // 2) 투자 기록 업데이트
  const { error: updErr } = await db
    .from("mock_investments")
    .update({
      sell_price: sellPrice,
      sell_at: new Date().toISOString(),
      status: "sold",
      final_points: finalPoints,
    })
    .eq("id", investmentId);
  if (updErr) return { ok: false, error: "매도 처리에 실패했어요" };

  // 3) 포인트 환급 (손실이면 finalPoints < invested_points지만 항상 >= 0)
  await db.rpc("increment_user_points", { uid, delta: finalPoints });

  // 4) 포인트 내역 기록
  const reason =
    profitLoss >= 0
      ? `${investment.ticker} 모의 매도 (+${profitLoss}P 수익)`
      : `${investment.ticker} 모의 매도 (${profitLoss}P 손실)`;
  await insertPointHistory(uid, finalPoints, reason, db);

  // 5) 수익 달성 퀘스트 보너스 (단계별)
  let questBonus = 0;
  if (profitLoss > 0) {
    const profitRate = profitLoss / investment.invested_points;

    // 첫 수익 매도 (1회)
    const { count: fp } = await db
      .from("point_history")
      .select("*", { count: "exact", head: true })
      .eq("user_id", uid)
      .eq("reason", "첫 수익 매도 퀘스트");
    if ((fp ?? 0) === 0) {
      await db.rpc("increment_user_points", { uid, delta: 100 });
      await insertPointHistory(uid, 100, "첫 수익 매도 퀘스트", db);
      questBonus += 100;
    }

    // 수익률 단계별 (최고 티어만 지급)
    if (profitRate >= 0.20) {
      const { count: g20 } = await db
        .from("point_history")
        .select("*", { count: "exact", head: true })
        .eq("user_id", uid)
        .eq("reason", "수익률 20% 달성 퀘스트");
      if ((g20 ?? 0) === 0) {
        await db.rpc("increment_user_points", { uid, delta: 500 });
        await insertPointHistory(uid, 500, "수익률 20% 달성 퀘스트", db);
        questBonus += 500;
      }
    } else if (profitRate >= 0.10) {
      await db.rpc("increment_user_points", { uid, delta: 200 });
      await insertPointHistory(uid, 200, "수익률 10% 달성 퀘스트", db);
      questBonus += 200;
    } else if (profitRate >= 0.05) {
      await db.rpc("increment_user_points", { uid, delta: 100 });
      await insertPointHistory(uid, 100, "수익률 5% 달성 퀘스트", db);
      questBonus += 100;
    }
  }

  return { ok: true, finalPoints, profitLoss, questBonus };
}

// ── 보유 종목 조회 ────────────────────────────────────
export async function getUserHoldings(
  uid: string,
  ticker?: string,
  db: typeof supabase = supabase
): Promise<MockInvestmentRow[]> {
  if (!uid) return [];
  let query = db
    .from("mock_investments")
    .select("*")
    .eq("user_id", uid)
    .order("buy_at", { ascending: false });
  if (ticker) query = query.eq("ticker", ticker);
  const { data, error } = await query;
  if (error) { console.error("[getUserHoldings]", error.message); return []; }
  return (data ?? []) as MockInvestmentRow[];
}

// ── 출석만 처리 (대결 없이) ──────────────────────────
export async function submitAttendanceOnly(
  uid: string
): Promise<{ bonusDays: number; bonusPoints: number; alreadyAttended: boolean }> {
  if (!uid) return { bonusDays: 0, bonusPoints: 0, alreadyAttended: false };
  const today = todayKST();

  const { data: existing } = await supabase
    .from("attendance")
    .select("id")
    .eq("user_id", uid)
    .eq("date", today)
    .maybeSingle();

  if (existing) return { bonusDays: 0, bonusPoints: 0, alreadyAttended: true };

  const { error: attErr } = await supabase.from("attendance").insert({
    user_id: uid,
    date: today,
    attended: true,
    points_earned: 50,
  });
  if (attErr) {
    console.error("[submitAttendanceOnly]", attErr.message);
    return { bonusDays: 0, bonusPoints: 0, alreadyAttended: false };
  }

  // 기본 출석 포인트 +50
  const { error: rpcErr } = await supabase.rpc("increment_user_points", { uid, delta: 50 });
  if (rpcErr) await addPoints(uid, 50);
  await insertPointHistory(uid, 50, "일일 출석 체크");

  // 연속 출석 보너스 계산
  const { data: attRows } = await supabase
    .from("attendance")
    .select("date")
    .eq("user_id", uid)
    .eq("attended", true)
    .order("date", { ascending: false })
    .limit(35);

  const streak = calcStreak(attRows?.map((r: { date: string }) => r.date) ?? []);
  const bonusMap: Record<number, number> = { 7: 100, 14: 200, 21: 300, 30: 500 };
  const bonusPoints = bonusMap[streak] ?? 0;

  if (bonusPoints > 0) {
    const { error: bErr } = await supabase.rpc("increment_user_points", { uid, delta: bonusPoints });
    if (bErr) await addPoints(uid, bonusPoints);
    const bonusReasonMap: Record<number, string> = {
      100: "7일 연속 출석 보너스",
      200: "14일 연속 출석 보너스",
      300: "21일 연속 출석 보너스",
      500: "30일 연속 출석 보너스",
    };
    await insertPointHistory(uid, bonusPoints, bonusReasonMap[bonusPoints] ?? `${streak}일 연속 출석 보너스`);
  }

  return { bonusDays: streak, bonusPoints, alreadyAttended: false };
}

// ── 도감 수집 ──────────────────────────────────────────────────────────────

export async function getLearnCollection(uid: string): Promise<string[]> {
  if (!uid) return [];
  const { data, error } = await supabase
    .from("learn_collections")
    .select("term_id")
    .eq("user_id", uid);
  if (error) { console.error("[getLearnCollection]", error.message); return []; }
  return (data ?? []).map((r: { term_id: string }) => r.term_id);
}

export async function collectLearnCard(
  uid: string,
  termId: string,
  points: number,
  termName: string
): Promise<{ newly_collected: boolean }> {
  if (!uid) return { newly_collected: false };

  const { error } = await supabase
    .from("learn_collections")
    .insert({ user_id: uid, term_id: termId });

  if (error) {
    if (error.code === "23505") return { newly_collected: false };
    console.error("[collectLearnCard]", error.message);
    return { newly_collected: false };
  }

  await addPoints(uid, points);
  await insertPointHistory(uid, points, `도감 수집: ${termName}`);

  // 도감 수집 단계 퀘스트
  const { count: totalCollected } = await supabase
    .from("learn_collections")
    .select("*", { count: "exact", head: true })
    .eq("user_id", uid);
  const tc = totalCollected ?? 0;
  if (tc === 1) {
    await addPoints(uid, 50);
    await insertPointHistory(uid, 50, "첫 용어 수집 퀘스트");
  } else if (tc === 10) {
    await addPoints(uid, 150);
    await insertPointHistory(uid, 150, "용어 10개 수집 퀘스트");
  } else if (tc === 30) {
    await addPoints(uid, 300);
    await insertPointHistory(uid, 300, "용어 30개 수집 퀘스트");
  }

  return { newly_collected: true };
}

// ── 전리품 창고: 오늘 KST 기준 해당 아이템 교환 여부 확인 ────────────────────
export async function checkDailyExchange(itemId: string): Promise<boolean> {
  const today = todayKST();
  const { data } = await supabase
    .from("store_exchanges")
    .select("id")
    .eq("item_id", itemId)
    .eq("kst_date", today)
    .limit(1);
  return (data?.length ?? 0) > 0;
}

// ── 전리품 창고: 포인트 차감 + 교환 기록 저장 ────────────────────────────────
export async function executeExchange(
  uid: string,
  itemId: string,
  points: number,
  marketingAgreed: boolean
): Promise<{ success: boolean; soldOut?: boolean; error?: string }> {
  const today = todayKST();

  // 재고 재확인 (confirm 페이지 진입 후 다른 유저가 선점한 경우 방어)
  const { data: existing } = await supabase
    .from("store_exchanges")
    .select("id")
    .eq("item_id", itemId)
    .eq("kst_date", today)
    .limit(1);

  if ((existing?.length ?? 0) > 0) {
    return { success: false, soldOut: true };
  }

  // 잔액 확인 (서버사이드 이중 검증)
  const { data: userData } = await supabase
    .from("users")
    .select("total_points")
    .eq("id", uid)
    .single();

  if ((userData?.total_points ?? 0) < points) {
    return { success: false, error: "포인트가 부족해요." };
  }

  // 포인트 차감
  await addPoints(uid, -points);

  // 교환 기록 삽입
  const { error: insErr } = await supabase.from("store_exchanges").insert({
    user_id:          uid,
    item_id:          itemId,
    points_used:      points,
    kst_date:         today,
    marketing_agreed: marketingAgreed,
  });

  if (insErr) {
    // 삽입 실패 시 차감한 포인트 복구
    await addPoints(uid, points);
    return { success: false, error: insErr.message };
  }

  const labelMap: Record<string, string> = {
    starbucks_americano: "스타벅스 아이스 아메리카노 교환",
  };
  await insertPointHistory(uid, -points, labelMap[itemId] ?? `${itemId} 교환`);

  return { success: true };
}

// ── 퀘스트 1회 달성 보상 (중복 방지) ────────────────────────────────────────
export async function awardOnceQuest(
  uid: string,
  reason: string,
  points: number,
  earnedSet: Set<string>
): Promise<boolean> {
  if (earnedSet.has(reason)) return false;
  await addPoints(uid, points);
  await insertPointHistory(uid, points, reason);
  earnedSet.add(reason);
  return true;
}
