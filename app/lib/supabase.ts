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
  ticker_a: string;
  ticker_b: string;
  voted_for: string;
  is_correct: boolean | null;
  points_earned: number;
};

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

// ── 오늘 battle_vote 투표 수 집계 (인증 유저 전체) ──
// ※ RLS 정책 필요: battle_votes SELECT USING (auth.role() = 'authenticated')
export async function getTodayBattleVoteCounts(): Promise<{ votesA: number; votesB: number }> {
  const { data, error } = await supabase
    .from("battle_votes")
    .select("voted_for")
    .eq("date", todayKST());

  if (error) {
    console.error("[getTodayBattleVoteCounts]", error.message);
    return { votesA: 0, votesB: 0 };
  }

  const rows   = (data ?? []) as { voted_for: string }[];
  const votesA = rows.filter((r) => r.voted_for === "ABNB").length;
  const votesB = rows.filter((r) => r.voted_for === "HLT").length;
  return { votesA, votesB };
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
async function insertPointHistory(uid: string, points: number, reason: string) {
  if (!uid) return;
  const { error } = await supabase
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
async function addPoints(uid: string, delta: number) {
  if (!uid || delta === 0) return;

  // RPC 시도
  const { error: rpcErr } = await supabase.rpc("increment_user_points", {
    uid,
    delta,
  });
  console.log("포인트 RPC 결과:", rpcErr ?? "success");

  if (!rpcErr) return; // 성공

  // RPC 없으면 select→update fallback
  console.warn("[addPoints] RPC fallback:", rpcErr.message);
  const { data, error: selErr } = await supabase
    .from("users")
    .select("total_points")
    .eq("id", uid)
    .single();
  if (selErr) { console.error("[addPoints] select:", selErr.message); return; }
  const current = (data as { total_points: number } | null)?.total_points ?? 0;
  const { error: updErr } = await supabase
    .from("users")
    .update({ total_points: current + delta })
    .eq("id", uid);
  if (updErr) console.error("[addPoints] update:", updErr.message);
}

// ── 투표 + 출석 저장 + 포인트 처리 ───────────────
export async function submitVoteAndAttendance(
  uid: string,
  votedFor: string,
  tickerA: string,
  tickerB: string
): Promise<{ bonusDays: number; bonusPoints: number }> {
  if (!uid) return { bonusDays: 0, bonusPoints: 0 };

  // 날짜: KST 기준 YYYY-MM-DD (date 타입 컬럼과 일치)
  const today = todayKST();

  console.log("1. 투표 시작", { userId: uid, voted: votedFor, today });

  // 1) battle_votes 저장 (이미 있으면 무시)
  const { error: voteErr } = await supabase.from("battle_votes").insert(
    {
      user_id: uid,
      date: today,
      ticker_a: tickerA,
      ticker_b: tickerB,
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
      points_earned: 50,
    });
    console.log("3. attendance 저장 결과:", JSON.stringify(attInsErr));

    if (!attInsErr) {
      // 4) 기본 출석 포인트 +50
      const { error: pointErr } = await supabase.rpc("increment_user_points", {
        uid,
        delta: 50,
      });
      console.log("4. 포인트 업데이트 결과 (+50)", pointErr ?? "✅ 성공");
      if (pointErr) {
        console.warn("4. RPC 없음 — fallback 사용:", pointErr.message);
        await addPoints(uid, 50);
      }
      await insertPointHistory(uid, 50, "일일 출석 체크");
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

// ── VS 대결 정답 포인트 지급 ──────────────────────────
// battle_votes의 is_correct가 true로 확정된 후 호출
export async function awardBattleCorrect(uid: string) {
  if (!uid) return;
  await addPoints(uid, 100);
  await insertPointHistory(uid, 100, "VS 대결 정답");
}

// ── 결과 판정: 어제 미판정 투표 처리 (더미) ──────────
// 오전 6시(KST) 이후 첫 접속 시 호출
// 실제 주가 API 연결 후 winner 결정 로직 교체 예정
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
      : vote.voted_for === vote.ticker_a
      ? vote.ticker_b
      : vote.ticker_a;
    return { winner, myVote: vote as BattleVoteRow };
  }

  // 더미 판정: 랜덤으로 승자 결정 (실제 API 연결 전 임시)
  const winner = Math.random() < 0.5 ? vote.ticker_a : vote.ticker_b;
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
