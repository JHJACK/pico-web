import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getUserHoldings, type MockInvestmentRow } from "@/app/lib/supabase";
import { fetchStocks } from "@/app/lib/stocks";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const ticker = searchParams.get("ticker") ?? undefined;

    // 유저 인증
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "로그인이 필요해요" }, { status: 401 });
    }

    const supabaseAuth = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );
    const { data: { user }, error: authErr } = await supabaseAuth.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: "인증에 실패했어요" }, { status: 401 });
    }

    const holdings = await getUserHoldings(user.id, ticker, supabaseAuth);

    // 보유 중인 종목의 현재 주가 조회해서 현재 평가금 계산
    const holdingRows = holdings.filter((h) => h.status === "holding");
    const tickers = [...new Set(holdingRows.map((h) => h.ticker))];
    let priceMap: Record<string, number> = {};

    if (tickers.length > 0) {
      try {
        const stockMap = await fetchStocks(tickers);
        priceMap = Object.fromEntries(
          Object.entries(stockMap).map(([t, d]) => [t, d.price])
        );
      } catch {
        // 가격 조회 실패 시 buy_price로 fallback
      }
    }

    // 현재 평가 포인트 계산
    const enriched = holdings.map((h: MockInvestmentRow) => {
      if (h.status !== "holding") return { ...h, currentValue: h.final_points ?? 0, profitLoss: (h.final_points ?? 0) - h.invested_points };
      const currentPrice = priceMap[h.ticker] ?? h.buy_price;
      const currentValue = Math.max(0, Math.round(h.invested_points * (currentPrice / h.buy_price)));
      return {
        ...h,
        currentPrice,
        currentValue,
        profitLoss: currentValue - h.invested_points,
        profitRate: ((currentPrice - h.buy_price) / h.buy_price) * 100,
      };
    });

    return NextResponse.json({ holdings: enriched });
  } catch (e) {
    console.error("[/api/investments/holdings]", e);
    return NextResponse.json({ error: "서버 오류가 발생했어요" }, { status: 500 });
  }
}
