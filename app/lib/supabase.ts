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

// ── 프로필 이미지 업로드 ──────────────────────────
export async function uploadAvatar(uid: string, file: File): Promise<string | null> {
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${uid}/avatar.${ext}`;
  const { error } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) return null;
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  const url = `${data.publicUrl}?t=${Date.now()}`;
  await supabase.from("users").update({ avatar_url: url }).eq("id", uid);
  return url;
}

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

// ── 회원가입 후 users 테이블 row 생성 ─────────────
export async function createUserRow(uid: string, email: string) {
  const nickname = email.split("@")[0];
  await supabase.from("users").upsert({
    id: uid,
    nickname,
    investor_type: null,
    total_points: 0,
  }, { onConflict: "id" });
}

// ── users row 가져오기 ─────────────────────────────
export async function getUserRow(uid: string): Promise<UserRow | null> {
  const { data } = await supabase.from("users").select("*").eq("id", uid).single();
  return data as UserRow | null;
}

// ── 오늘 battle_vote 존재 여부 ────────────────────
export async function getTodayVote(uid: string): Promise<BattleVoteRow | null> {
  const { data } = await supabase
    .from("battle_votes")
    .select("*")
    .eq("user_id", uid)
    .eq("date", todayKST())
    .maybeSingle();
  return data as BattleVoteRow | null;
}

// ── 포인트 증가 헬퍼 ─────────────────────────────
async function addPoints(uid: string, delta: number) {
  const { data } = await supabase
    .from("users")
    .select("total_points")
    .eq("id", uid)
    .single();
  const current = (data as { total_points: number } | null)?.total_points ?? 0;
  await supabase.from("users").update({ total_points: current + delta }).eq("id", uid);
}

// ── 투표 + 출석 저장 + 포인트 처리 ───────────────
export async function submitVoteAndAttendance(
  uid: string,
  votedFor: string,
  tickerA: string,
  tickerB: string
): Promise<{ bonusDays: number; bonusPoints: number }> {
  const today = todayKST();

  // 1) battle_votes 저장
  await supabase.from("battle_votes").upsert({
    user_id: uid,
    date: today,
    ticker_a: tickerA,
    ticker_b: tickerB,
    voted_for: votedFor,
    is_correct: null,
    points_earned: 0,
  }, { onConflict: "user_id,date" });

  // 2) attendance 저장 (이미 있으면 무시)
  const { data: existingAtt } = await supabase
    .from("attendance")
    .select("id")
    .eq("user_id", uid)
    .eq("date", today)
    .maybeSingle();

  if (!existingAtt) {
    await supabase.from("attendance").insert({
      user_id: uid,
      date: today,
      attended: true,
      points_earned: 50,
    });

    // 3) 기본 출석 포인트 +50
    await addPoints(uid, 50);
  }

  // 4) 연속 출석 보너스 계산
  const { data: attRows } = await supabase
    .from("attendance")
    .select("date")
    .eq("user_id", uid)
    .eq("attended", true)
    .order("date", { ascending: false })
    .limit(30);

  const streak = calcStreak(attRows?.map((r: { date: string }) => r.date) ?? []);
  const bonusMap: Record<number, number> = { 7: 100, 14: 200, 21: 300, 30: 500 };
  const bonusPoints = bonusMap[streak] ?? 0;

  if (bonusPoints > 0 && !existingAtt) {
    await addPoints(uid, bonusPoints);
  }

  return { bonusDays: streak, bonusPoints: !existingAtt ? bonusPoints : 0 };
}

// 연속 출석일 계산
function calcStreak(dates: string[]): number {
  if (dates.length === 0) return 0;
  const sorted = [...dates].sort((a, b) => b.localeCompare(a));
  let streak = 1;
  for (let i = 0; i < sorted.length - 1; i++) {
    const cur = new Date(sorted[i]);
    const next = new Date(sorted[i + 1]);
    const diff = (cur.getTime() - next.getTime()) / 86_400_000;
    if (diff === 1) streak++;
    else break;
  }
  return streak;
}

// ── 퀴즈 결과 저장 ────────────────────────────────
export async function saveQuizResult(uid: string, investorType: string) {
  const { data: user } = await supabase
    .from("users")
    .select("investor_type")
    .eq("id", uid)
    .single();

  const isFirst = !(user as { investor_type: string | null } | null)?.investor_type;

  await supabase.from("users").update({ investor_type: investorType }).eq("id", uid);

  if (isFirst) {
    await addPoints(uid, 300);
  }

  return { pointsAdded: isFirst ? 300 : 0 };
}
