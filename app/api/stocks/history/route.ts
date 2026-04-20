import { setCached, mgetCached } from "@/app/lib/cache";
import { isKrTicker } from "@/app/lib/stockNames";
import { fetchYahooKrHistory, fetchYahooUsHistory, PERIOD_TO_YAHOO } from "@/app/lib/yahoo";

export type CandleData = {
  time: string | number; // 1M/1Y: "YYYY-MM-DD" / 1D/1W: KST 보정 Unix timestamp(초)
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ticker = (searchParams.get("ticker") ?? "").toUpperCase();
  const period = searchParams.get("period") ?? "1M";

  if (!ticker) return Response.json({ error: "ticker required" }, { status: 400 });

  const cacheKey = `history:${ticker}:${period}`;

  // ── 캐시 확인 ────────────────────────────────────────────────────────────
  const cached = (await mgetCached<CandleData[]>([cacheKey]))[0];
  if (cached) return Response.json(cached);

  const ttl = PERIOD_TO_YAHOO[period]?.cacheTTL ?? 60 * 60;

  // ── 한국 종목 → Yahoo Finance (KRW, KST 시간) ────────────────────────────
  if (isKrTicker(ticker)) {
    try {
      const candles = await fetchYahooKrHistory(ticker, period);
      if (candles.length) await setCached(cacheKey, candles, ttl);
      console.log(`[HISTORY] Yahoo KR ${ticker} ${period} → ${candles.length}개`);
      return Response.json(candles);
    } catch (e) {
      console.error("[HISTORY] Yahoo KR 오류:", e);
      return Response.json([]);
    }
  }

  // ── 해외 종목 → Yahoo Finance (USD, KST 보정) ────────────────────────────
  try {
    const candles = await fetchYahooUsHistory(ticker, period);
    if (candles.length) await setCached(cacheKey, candles, ttl);
    console.log(`[HISTORY] Yahoo US ${ticker} ${period} → ${candles.length}개`);
    return Response.json(candles);
  } catch (e) {
    console.error("[HISTORY] Yahoo US 오류:", e);
    return Response.json([]);
  }
}
