import { NextRequest, NextResponse }   from "next/server";
import { createClient }                from "@supabase/supabase-js";
import {
  getWeekRange,
  aggregateWeekTrades,
  getMarket,
  type Market,
} from "@/app/lib/reportUtils";
import { generateReportNarrative, assembleReportContent } from "@/app/lib/gemini";
import type { MockInvestmentRow } from "@/app/lib/supabase";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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

// ── POST: 현재 유저 이번 주 리포트 즉시 생성 ─────────────────
// Body: { market: "kr" | "us" | "all" }
// "all"이면 KR·US 둘 다 생성 시도 (거래 있는 마켓만)
export async function POST(req: NextRequest) {
  // 인증
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
  if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body   = await req.json().catch(() => ({}));
  const target = (body.market ?? "all") as Market | "all";
  const origin = req.nextUrl.origin;

  // 유저 정보
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("nickname, investor_type")
    .eq("id", user.id)
    .single();

  const { weekStart, weekEnd, weekLabel } = getWeekRange();

  // 이번 주 투자 전체 조회
  const { data: investments, error: invErr } = await supabaseAdmin
    .from("mock_investments")
    .select("*")
    .eq("user_id", user.id)
    .gte("buy_at", `${weekStart}T00:00:00+09:00`)
    .lte("buy_at", `${weekEnd}T23:59:59+09:00`);

  if (invErr) return NextResponse.json({ error: invErr.message }, { status: 500 });
  if (!investments || investments.length === 0) {
    return NextResponse.json({ error: "이번 주 거래 내역이 없어요" }, { status: 404 });
  }

  // 현재가 조회
  const holdingTickers = [...new Set(
    investments.filter((i) => i.status === "holding").map((i) => i.ticker as string)
  )];
  const currentPrices = await fetchPrices(holdingTickers, origin);

  // 생성할 마켓 목록
  const markets: Market[] = target === "all" ? ["kr", "us"] : [target];
  const results: { market: Market; weekStart: string; generated: boolean; reason?: string }[] = [];

  for (const market of markets) {
    const hasThisMarket = (investments as MockInvestmentRow[]).some(
      (i) => getMarket(i.ticker) === market
    );
    if (!hasThisMarket) {
      results.push({ market, weekStart, generated: false, reason: "거래 없음" });
      continue;
    }

    const { trades, holdings, stats, behavior } = aggregateWeekTrades(
      investments as MockInvestmentRow[],
      market,
      currentPrices
    );

    const geminiOutput = await generateReportNarrative({
      nickname:  (userRow?.nickname as string) ?? "투자자",
      dnaType:   (userRow?.investor_type as string | null) ?? null,
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
      dnaType:      (userRow?.investor_type as string | null) ?? null,
      geminiOutput,
    });

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

    results.push({
      market,
      weekStart,
      generated: !upsertErr,
      reason:    upsertErr?.message,
    });

    // 두 마켓 연속 생성 시 Rate limit 방지
    if (target === "all" && market === "kr") {
      await new Promise((r) => setTimeout(r, 4500));
    }
  }

  const generated = results.filter((r) => r.generated);
  if (generated.length === 0) {
    return NextResponse.json({ error: "생성할 수 있는 리포트가 없어요", results }, { status: 404 });
  }

  // 첫 번째 생성된 리포트로 리다이렉트 정보 반환
  const first = generated[0];
  return NextResponse.json({
    ok:        true,
    results,
    redirect:  `/mypage/report/${first.weekStart}/${first.market}`,
  });
}
