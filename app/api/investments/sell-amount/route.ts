import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { ticker, amount } = body as { ticker: string; amount: number };

    if (!ticker || !amount || amount < 1) {
      return NextResponse.json({ error: "잘못된 요청이에요" }, { status: 400 });
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "로그인이 필요해요" }, { status: 401 });
    }

    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );
    const { data: { user }, error: authErr } = await db.auth.getUser();
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

    // 보유 종목 조회 (오래된 순 — FIFO)
    const { data: rows, error: fetchErr } = await db
      .from("mock_investments")
      .select("*")
      .eq("user_id", user.id)
      .eq("ticker", ticker)
      .eq("status", "holding")
      .order("buy_at", { ascending: true });

    if (fetchErr || !rows || rows.length === 0) {
      return NextResponse.json({ error: "보유 종목을 찾을 수 없어요" }, { status: 400 });
    }

    const totalHolding = rows.reduce((s: number, r: { invested_points: number }) => s + r.invested_points, 0);
    const sellAmount = Math.min(amount, totalHolding);

    let remaining = sellAmount;
    let totalFinalPoints = 0;
    let totalProfitLoss = 0;
    const now = new Date().toISOString();

    for (const row of rows) {
      if (remaining <= 0) break;

      const toSell = Math.min(row.invested_points, remaining);
      const finalPts = Math.max(0, Math.round(toSell * (sellPrice / row.buy_price)));
      const pl = finalPts - toSell;

      if (toSell === row.invested_points) {
        // 전체 레코드 매도
        await db
          .from("mock_investments")
          .update({ sell_price: sellPrice, sell_at: now, status: "sold", final_points: finalPts })
          .eq("id", row.id);
      } else {
        // 부분 매도: 기존 레코드에서 일부만 매도
        // 1) 매도된 부분을 새 레코드로 삽입
        await db.from("mock_investments").insert({
          user_id: user.id,
          ticker,
          invested_points: toSell,
          buy_price: row.buy_price,
          buy_at: row.buy_at,
          sell_price: sellPrice,
          sell_at: now,
          status: "sold",
          final_points: finalPts,
        });
        // 2) 기존 레코드는 남은 포인트로 업데이트
        await db
          .from("mock_investments")
          .update({ invested_points: row.invested_points - toSell })
          .eq("id", row.id);
      }

      // 포인트 환급
      await db.rpc("increment_user_points", { uid: user.id, delta: finalPts });

      // 포인트 내역
      const reason =
        pl >= 0
          ? `${ticker} 모의 매도 (+${pl}P 수익)`
          : `${ticker} 모의 매도 (${pl}P 손실)`;
      await db.from("point_history").insert({
        user_id: user.id,
        points: finalPts,
        reason,
        created_at: now,
      });

      totalFinalPoints += finalPts;
      totalProfitLoss += pl;
      remaining -= toSell;
    }

    // 수익 달성 퀘스트 보너스 (이익 발생 시 1회 50P)
    let questBonus = 0;
    if (totalProfitLoss > 0) {
      questBonus = 50;
      await db.rpc("increment_user_points", { uid: user.id, delta: 50 });
      await db.from("point_history").insert({
        user_id: user.id,
        points: 50,
        reason: "모의투자 수익 달성 퀘스트",
        created_at: now,
      });
    }

    // 랭킹 재계산 (백그라운드)
    fetch(`${req.nextUrl.origin}/api/rankings/calculate`, { method: "POST" }).catch(() => {});

    return NextResponse.json({
      ok: true,
      finalPoints: totalFinalPoints,
      profitLoss: totalProfitLoss,
      questBonus,
      sellPrice,
    });
  } catch (e) {
    console.error("[/api/investments/sell-amount]", e);
    return NextResponse.json({ error: "서버 오류가 발생했어요" }, { status: 500 });
  }
}
