import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ── 이번 주 월요일 (KST 기준) ─────────────────────────────────
function getWeekStart(): string {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  return monday.toLocaleDateString("sv-SE");
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const weekStart = searchParams.get("week") ?? getWeekStart();
  const uid       = searchParams.get("uid") ?? null;

  // 1) 랭킹 TOP 100
  const { data: rankings, error: rankErr } = await supabase
    .from("weekly_rankings_cache")
    .select("*")
    .eq("week_start", weekStart)
    .order("rank_position", { ascending: true })
    .limit(100);

  if (rankErr) return NextResponse.json({ error: rankErr.message }, { status: 500 });

  // 2) 이번 주 수상자
  const { data: awards, error: awardsErr } = await supabase
    .from("weekly_awards")
    .select("category, user_id, metric_val")
    .eq("week_start", weekStart);

  if (awardsErr) console.error("[rankings] awards:", awardsErr.message);

  // 3) 내 순위 (uid 있을 때)
  let myRank = null;
  if (uid) {
    const { data: me } = await supabase
      .from("weekly_rankings_cache")
      .select("rank_position, return_rate, trade_count")
      .eq("week_start", weekStart)
      .eq("user_id", uid)
      .maybeSingle();
    myRank = me;
  }

  // 4) 마지막 업데이트 시각
  const lastUpdated = rankings?.[0]?.updated_at ?? null;

  // 5) 총 유저 수 (퍼센타일 계산용)
  const { count: totalUsers } = await supabase
    .from("weekly_rankings_cache")
    .select("*", { count: "exact", head: true })
    .eq("week_start", weekStart);

  // 6) 닉네임 + 수식어(equipped_title) — 캐시 아닌 users 테이블 직접 조회 (닉네임 변경 즉시 반영)
  const rankingUserIds = (rankings ?? []).map((r: { user_id: string }) => r.user_id);
  let userMap: Record<string, { nickname: string | null; equipped_title: string | null }> = {};
  if (rankingUserIds.length > 0) {
    const { data: userRows } = await supabase
      .from("users")
      .select("id, nickname, equipped_title")
      .in("id", rankingUserIds);
    for (const row of userRows ?? []) {
      const r = row as { id: string; nickname: string | null; equipped_title: string | null };
      userMap[r.id] = { nickname: r.nickname, equipped_title: r.equipped_title };
    }
  }

  const rankingsWithTitle = (rankings ?? []).map((r: Record<string, unknown>) => ({
    ...r,
    nickname:       userMap[r.user_id as string]?.nickname       ?? r.nickname,
    equipped_title: userMap[r.user_id as string]?.equipped_title ?? null,
  }));

  return NextResponse.json({
    weekStart,
    rankings: rankingsWithTitle,
    awards:   awards ?? [],
    myRank,
    totalUsers: totalUsers ?? 0,
    lastUpdated,
  });
}
