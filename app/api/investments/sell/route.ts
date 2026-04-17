import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sellStock } from "@/app/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { investmentId, ticker } = body as { investmentId: string; ticker: string };

    if (!investmentId || !ticker) {
      return NextResponse.json({ error: "잘못된 요청이에요" }, { status: 400 });
    }

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

    // 현재 주가 조회
    const stockRes = await fetch(
      `${req.nextUrl.origin}/api/stocks?tickers=${ticker}`,
      { headers: { "Cache-Control": "no-store" } }
    );
    const stockData = await stockRes.json();
    const sellPrice: number = stockData?.[ticker]?.price;
    if (!sellPrice) {
      return NextResponse.json({ error: "주가 정보를 가져올 수 없어요" }, { status: 500 });
    }

    const result = await sellStock(user.id, investmentId, sellPrice);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      finalPoints: result.finalPoints,
      profitLoss: result.profitLoss,
      sellPrice,
    });
  } catch (e) {
    console.error("[/api/investments/sell]", e);
    return NextResponse.json({ error: "서버 오류가 발생했어요" }, { status: 500 });
  }
}
