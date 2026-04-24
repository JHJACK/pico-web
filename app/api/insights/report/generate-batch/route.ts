import { NextRequest, NextResponse } from "next/server";
import { createClient }              from "@supabase/supabase-js";
import { getWeekRange, aggregateWeekTrades, type Market } from "@/app/lib/reportUtils";
import { generateReportNarrative, assembleReportContent } from "@/app/lib/gemini";
import type { MockInvestmentRow }    from "@/app/lib/supabase";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ── 현재가 일괄 조회 ─────────────────────────────────────────
async function fetchPrices(
  tickers: string[],
  origin: string
): Promise<Record<string, number>> {
  if (tickers.length === 0) return {};
  try {
    const res  = await fetch(`${origin}/api/stocks?tickers=${[...new Set(tickers)].join(",")}`, { cache: "no-store" });
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

// ── GET: Vercel Cron 진입점 ───────────────────────────────────
// vercel.json에서 ?market=kr 또는 ?market=us 쿼리로 구분 호출
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const market = (searchParams.get("market") ?? "us") as Market;

  if (market !== "kr" && market !== "us") {
    return NextResponse.json({ error: "market must be kr or us" }, { status: 400 });
  }

  const origin = req.nextUrl.origin;
  const { weekStart, weekEnd, weekLabel } = getWeekRange();

  // ── 1. 옵트인된 유저 전원 조회 ───────────────────────────
  const { data: users, error: userErr } = await supabaseAdmin
    .from("users")
    .select("id, nickname, investor_type")
    .eq("report_opted_in", true);

  if (userErr || !users || users.length === 0) {
    return NextResponse.json({ ok: true, generated: 0, message: "옵트인 유저 없음" });
  }

  // ── 2. 이번 주 mock_investments 전체 조회 ─────────────────
  const { data: allInv, error: invErr } = await supabaseAdmin
    .from("mock_investments")
    .select("*")
    .gte("buy_at", `${weekStart}T00:00:00+09:00`)
    .lte("buy_at", `${weekEnd}T23:59:59+09:00`);

  if (invErr) {
    console.error("[generate-batch] investments:", invErr.message);
    return NextResponse.json({ error: invErr.message }, { status: 500 });
  }

  // ── 3. 보유 중 종목의 현재가 조회 ───────────────────────────
  const holdingTickers = [...new Set(
    (allInv ?? [])
      .filter((i) => i.status === "holding")
      .map((i) => i.ticker as string)
  )];
  const currentPrices = await fetchPrices(holdingTickers, origin);

  // ── 4. 유저별 리포트 생성 ───────────────────────────────────
  let generated = 0;
  let skipped   = 0;

  for (const user of users) {
    const userInv = (allInv ?? []).filter(
      (i) => i.user_id === user.id
    ) as MockInvestmentRow[];

    const { trades, holdings, stats, behavior } = aggregateWeekTrades(
      userInv,
      market,
      currentPrices
    );

    // 해당 마켓 거래 없으면 스킵
    if (stats.tradeCount === 0) {
      skipped++;
      continue;
    }

    // Gemini 호출 (Rate limit 대비 순차 처리)
    const geminiOutput = await generateReportNarrative({
      nickname:  user.nickname as string,
      dnaType:   user.investor_type as string | null,
      market,
      weekLabel,
      trades,
      holdings,
      stats,
      behavior,
    });

    const content = assembleReportContent({
      weekLabel,
      market,
      trades,
      holdings,
      stats,
      behavior,
      dnaType:      user.investor_type as string | null,
      geminiOutput,
    });

    // DB 저장 (이미 있으면 덮어씀)
    const { error: upsertErr } = await supabaseAdmin
      .from("ai_weekly_reports")
      .upsert({
        user_id:      user.id,
        week_start:   weekStart,
        week_end:     weekEnd,
        market,
        content,
        generated_at: new Date().toISOString(),
      }, { onConflict: "user_id,week_start,market" });

    if (upsertErr) {
      console.error(`[generate-batch] upsert ${user.id}:`, upsertErr.message);
    } else {
      generated++;
    }

    // Gemini 무료 티어 Rate limit 방지 (15 RPM)
    await new Promise((r) => setTimeout(r, 4500));
  }

  return NextResponse.json({
    ok:        true,
    market,
    weekStart,
    generated,
    skipped,
    total:     users.length,
  });
}
