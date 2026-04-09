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

// ── 오늘 날짜 (KST 기준 YYYY-MM-DD) ───────────────
export function todayKST(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
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

  // 1) battle_votes 저장
  const { error: voteErr } = await supabase.from("battle_votes").upsert(
    {
      user_id: uid,
      date: today,
      ticker_a: tickerA,
      ticker_b: tickerB,
      voted_for: votedFor,
      is_correct: null,
      points_earned: 0,
    },
    { onConflict: "user_id,date" }
  );
  console.log("2. battle_votes 저장 결과", voteErr ?? "✅ 성공");

  // 2) attendance 이미 있는지 확인
  const { data: existingAtt, error: attSelErr } = await supabase
    .from("attendance")
    .select("id")
    .eq("user_id", uid)
    .eq("date", today)
    .maybeSingle();
  console.log("2b. attendance 중복 확인", { existingAtt, error: attSelErr ?? null });

  if (!existingAtt) {
    // 3) attendance 삽입
    const { error: attInsErr } = await supabase.from("attendance").insert({
      user_id: uid,
      date: today,
      attended: true,
      points_earned: 50,
    });
    console.log("3. attendance 저장 결과", attInsErr ?? "✅ 성공");

    if (!attInsErr) {
      // 4) 기본 출석 포인트 +50
      const { error: pointErr } = await supabase.rpc("increment_user_points", {
        uid,
        delta: 50,
      });
      console.log("4. 포인트 업데이트 결과 (+50)", pointErr ?? "✅ 성공");

      if (pointErr) {
        // RPC 없으면 fallback
        console.warn("[addPoints] RPC fallback:", pointErr.message);
        await addPoints(uid, 50);
      }
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

  const isFirst = !(row as { investor_type: string | null } | null)?.investor_type;

  const { error: updErr } = await supabase
    .from("users")
    .update({ investor_type: investorType })
    .eq("id", uid);
  if (updErr) console.error("[saveQuizResult] update:", updErr.message);

  if (isFirst) await addPoints(uid, 300);

  return { pointsAdded: isFirst ? 300 : 0 };
}
