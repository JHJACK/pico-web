import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// ── 서비스 롤 클라이언트 (RLS 우회, 계산용) ─────────────────────
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ── 이번 주 월요일 날짜 (KST 기준 YYYY-MM-DD) ─────────────────
function getWeekStart(): string {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
  const day = now.getDay(); // 0=일, 1=월 ...
  const diff = day === 0 ? -6 : 1 - day; // 월요일로 이동
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  return monday.toLocaleDateString("sv-SE");
}

// ── 이번 주 금요일 23:59 (KST → UTC ISO) ──────────────────────
function getWeekEnd(): string {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
  const day = now.getDay();
  const diff = day === 0 ? 0 : 5 - day;
  const friday = new Date(now);
  friday.setDate(now.getDate() + diff);
  friday.setHours(23, 59, 59, 999);
  // KST → UTC (-9h)
  return new Date(friday.getTime() - 9 * 60 * 60 * 1000).toISOString();
}

// ── 현재 주가 일괄 조회 ────────────────────────────────────────
async function fetchCurrentPrices(
  tickers: string[],
  origin: string
): Promise<Record<string, number>> {
  if (tickers.length === 0) return {};
  try {
    const res = await fetch(
      `${origin}/api/stocks?tickers=${[...new Set(tickers)].join(",")}`,
      { next: { revalidate: 0 } }
    );
    const data = await res.json();
    const map: Record<string, number> = {};
    for (const [t, v] of Object.entries(data)) {
      map[t] = (v as { price: number }).price ?? 0;
    }
    return map;
  } catch {
    return {};
  }
}

// ── 메인 계산 ─────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const weekStart = getWeekStart();
  const weekEnd   = getWeekEnd();
  const origin    = req.nextUrl.origin;

  // 1) 이번 주 mock_investments 전체 조회
  const { data: allInv, error: invErr } = await supabaseAdmin
    .from("mock_investments")
    .select("id, user_id, ticker, invested_points, buy_price, buy_at, sell_price, sell_at, status, final_points")
    .gte("buy_at", `${weekStart}T00:00:00+09:00`)
    .lte("buy_at", weekEnd);

  if (invErr) {
    console.error("[rankings/calculate] investments:", invErr.message);
    return NextResponse.json({ error: invErr.message }, { status: 500 });
  }

  if (!allInv || allInv.length === 0) {
    return NextResponse.json({ ok: true, message: "이번 주 투자 데이터 없음", weekStart });
  }

  // 2) 현재 주가 조회 (holding 중인 종목들만)
  const holdingTickers = [...new Set(
    allInv.filter((i) => i.status === "holding").map((i) => i.ticker as string)
  )];
  const prices = await fetchCurrentPrices(holdingTickers, origin);

  // 3) 유저별 집계
  type UserStats = {
    user_id: string;
    trades: Array<{ invested: number; pnl: number; returnRate: number; buyAt: string }>;
    sellCount: number;
    allLoss: boolean;
  };

  const userMap = new Map<string, UserStats>();

  for (const inv of allInv) {
    const uid = inv.user_id as string;
    if (!userMap.has(uid)) {
      userMap.set(uid, { user_id: uid, trades: [], sellCount: 0, allLoss: true });
    }
    const stats = userMap.get(uid)!;

    const invested = inv.invested_points as number;
    let finalPts: number;

    if (inv.status === "sold") {
      finalPts = inv.final_points as number ?? 0;
      stats.sellCount++;
    } else {
      // holding: 현재 주가로 평가
      const currentPrice = prices[inv.ticker as string] ?? (inv.buy_price as number);
      finalPts = Math.round(invested * (currentPrice / (inv.buy_price as number)));
    }

    const pnl = finalPts - invested;
    const returnRate = invested > 0 ? (pnl / invested) * 100 : 0;

    stats.trades.push({
      invested,
      pnl,
      returnRate,
      buyAt: inv.buy_at as string,
    });

    if (returnRate > 0) stats.allLoss = false;
  }

  // 4) 유저 정보 조회
  const uids = [...userMap.keys()];
  const { data: users } = await supabaseAdmin
    .from("users")
    .select("id, nickname, avatar_url")
    .in("id", uids);

  const userInfo = new Map(
    (users ?? []).map((u) => [u.id as string, { nickname: u.nickname as string, avatar_url: u.avatar_url as string | null }])
  );

  // 5) 최종 랭킹 데이터 계산
  type RankRow = {
    week_start: string;
    user_id: string;
    nickname: string;
    avatar_url: string | null;
    return_rate: number;
    total_invested: number;
    trade_count: number;
    win_count: number;
    max_single_return: number;
    all_loss: boolean;
    never_sold: boolean;
    daily_trade_avg: number;
    min_drawdown: number;
  };

  const rankRows: RankRow[] = [];

  for (const [uid, stats] of userMap.entries()) {
    const info = userInfo.get(uid);
    const { trades, sellCount } = stats;

    const totalInvested = trades.reduce((s, t) => s + t.invested, 0);
    const totalPnl      = trades.reduce((s, t) => s + t.pnl, 0);
    const overallReturn = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;
    const winCount      = trades.filter((t) => t.pnl > 0).length;
    const maxSingle     = Math.max(...trades.map((t) => t.returnRate), 0);
    const neverSold     = sellCount === 0 && trades.length > 0;

    // 일평균 거래: 거래를 날짜별로 그룹핑
    const daySet = new Set(trades.map((t) => t.buyAt.slice(0, 10)));
    const activeDays = daySet.size || 1;
    const dailyAvg = trades.length / activeDays;

    // MDD 대용: 손실 거래 중 최대 손실폭 (없으면 0)
    const losses = trades.filter((t) => t.returnRate < 0).map((t) => t.returnRate);
    const minDrawdown = losses.length > 0 ? Math.min(...losses) : 0;

    rankRows.push({
      week_start:       weekStart,
      user_id:          uid,
      nickname:         info?.nickname ?? "익명",
      avatar_url:       info?.avatar_url ?? null,
      return_rate:      Math.round(overallReturn * 100) / 100,
      total_invested:   totalInvested,
      trade_count:      trades.length,
      win_count:        winCount,
      max_single_return: Math.round(maxSingle * 100) / 100,
      all_loss:         stats.allLoss,
      never_sold:       neverSold,
      daily_trade_avg:  Math.round(dailyAvg * 100) / 100,
      min_drawdown:     Math.round(minDrawdown * 100) / 100,
    });
  }

  // 수익률 기준 정렬 → rank_position 부여
  rankRows.sort((a, b) => b.return_rate - a.return_rate);
  const rowsWithRank = rankRows.map((r, i) => ({ ...r, rank_position: i + 1, updated_at: new Date().toISOString() }));

  // 6) DB upsert
  const { error: upsertErr } = await supabaseAdmin
    .from("weekly_rankings_cache")
    .upsert(rowsWithRank, { onConflict: "week_start,user_id" });

  if (upsertErr) {
    console.error("[rankings/calculate] upsert:", upsertErr.message);
    return NextResponse.json({ error: upsertErr.message }, { status: 500 });
  }

  // 7) 특별 수상자 선정
  await calculateAwards(rowsWithRank, weekStart);

  return NextResponse.json({
    ok: true,
    weekStart,
    calculated: rowsWithRank.length,
    updatedAt: new Date().toISOString(),
  });
}

// ── 특별 수상자 계산 ──────────────────────────────────────────
async function calculateAwards(
  rows: Array<{
    user_id: string; trade_count: number; max_single_return: number;
    all_loss: boolean; return_rate: number; never_sold: boolean;
    daily_trade_avg: number; min_drawdown: number; win_count: number;
  }>,
  weekStart: string
) {
  const awards: Array<{ week_start: string; category: string; user_id: string; metric_val: number }> = [];

  // 여의도 스나이퍼: 거래 1~3회 중 단건 최고 수익률
  const sniper = rows
    .filter((r) => r.trade_count >= 1 && r.trade_count <= 3 && r.max_single_return > 0)
    .sort((a, b) => b.max_single_return - a.max_single_return)[0];
  if (sniper) awards.push({ week_start: weekStart, category: "sniper", user_id: sniper.user_id, metric_val: sniper.max_single_return });

  // 청개구리: 모든 종목 손실 중 손실률 1위 (가장 많이 잃은)
  const frog = rows
    .filter((r) => r.all_loss && r.return_rate < 0)
    .sort((a, b) => a.return_rate - b.return_rate)[0]; // 가장 낮은 수익률
  if (frog) awards.push({ week_start: weekStart, category: "frog", user_id: frog.user_id, metric_val: frog.return_rate });

  // 존버의 신: 한 번도 팔지 않은 유저 중 보유 기간이 가장 길거나 투자금이 큰 사람
  const hodl = rows.filter((r) => r.never_sold).sort((a, b) => b.max_single_return - a.max_single_return)[0];
  if (hodl) awards.push({ week_start: weekStart, category: "hodl", user_id: hodl.user_id, metric_val: hodl.max_single_return });

  // 단타의 귀재: 일평균 거래 최다
  const daytrader = rows.sort((a, b) => b.daily_trade_avg - a.daily_trade_avg)[0];
  if (daytrader && daytrader.daily_trade_avg > 1)
    awards.push({ week_start: weekStart, category: "daytrader", user_id: daytrader.user_id, metric_val: daytrader.daily_trade_avg });

  // 냉철한 멘탈: 수익률 플러스이면서 MDD 가장 낮은 (손실폭 최소)
  const mental = rows
    .filter((r) => r.return_rate > 0 && r.win_count === r.trade_count && r.trade_count >= 2)
    .sort((a, b) => b.return_rate - a.return_rate)[0];
  if (mental) awards.push({ week_start: weekStart, category: "mentalsteel", user_id: mental.user_id, metric_val: mental.return_rate });

  if (awards.length === 0) return;

  // DB upsert
  await supabaseAdmin
    .from("weekly_awards")
    .upsert(awards, { onConflict: "week_start,category" });

  // 뱃지 추가
  const badges = awards.map((a) => ({
    user_id:    a.user_id,
    category:   a.category,
    week_start: a.week_start,
    earned_at:  new Date().toISOString(),
  }));
  await supabaseAdmin
    .from("user_badges")
    .upsert(badges, { onConflict: "user_id,category,week_start" });
}

// ── GET: 마지막 계산 시각 확인 ─────────────────────────────────
export async function GET() {
  const weekStart = getWeekStart();
  const { data } = await supabaseAdmin
    .from("weekly_rankings_cache")
    .select("updated_at")
    .eq("week_start", weekStart)
    .order("updated_at", { ascending: false })
    .limit(1);

  return NextResponse.json({
    weekStart,
    lastUpdated: data?.[0]?.updated_at ?? null,
  });
}
