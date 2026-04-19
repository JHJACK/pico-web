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

  return NextResponse.json({
    weekStart,
    rankings: rankings ?? [],
    awards:   awards ?? [],
    myRank,
    totalUsers: totalUsers ?? 0,
    lastUpdated,
  });
}
