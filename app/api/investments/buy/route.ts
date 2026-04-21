import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { buyStock } from "@/app/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { ticker, investedPoints } = body as { ticker: string; investedPoints: number };

    if (!ticker || !investedPoints || investedPoints < 100) {
      return NextResponse.json({ error: "잘못된 요청이에요" }, { status: 400 });
    }

    // 유저 인증: Authorization 헤더에서 토큰 검증
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
    const buyPrice: number = stockData?.[ticker]?.price;
    if (!buyPrice) {
      return NextResponse.json({ error: "주가 정보를 가져올 수 없어요" }, { status: 500 });
    }

    // RLS 우회를 위해 service role 클라이언트 사용 (유저 인증은 위에서 완료)
    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const result = await buyStock(user.id, ticker, investedPoints, buyPrice, serviceClient);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true, investment: result.investment, buyPrice, isFirstInvestment: result.isFirstInvestment ?? false });
  } catch (e) {
    console.error("[/api/investments/buy]", e);
    return NextResponse.json({ error: "서버 오류가 발생했어요" }, { status: 500 });
  }
}
