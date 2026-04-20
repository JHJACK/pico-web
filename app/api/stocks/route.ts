import { setCached, mgetCached } from "@/app/lib/cache";
import { US_FALLBACK, KR_FALLBACK } from "@/app/lib/stocks";
import { fetchYahooKrPrices, fetchYahooUsPrices } from "@/app/lib/yahoo";
import { isKrTicker } from "@/app/lib/stockNames";

const CACHE_TTL = 15 * 60; // 15분

// ─── 메인 라우트 ──────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tickersParam = searchParams.get("tickers") ?? "";
  const tickers = tickersParam.split(",").map((t) => t.trim()).filter(Boolean);
  if (tickers.length === 0) return Response.json({});

  // 해외 / 국내 분리
  const usTickers = tickers.filter((t) => !isKrTicker(t));
  const krTickers = tickers.filter((t) => isKrTicker(t));

  const results: Record<string, unknown> = {};

  // ── 1. Redis 캐시 일괄 조회 ──────────────────────────────────────────────
  const usKeys = usTickers.map((t) => `stock:us:${t}`);
  const krKeys = krTickers.map((t) => `stock:kr:${t}`);
  const allKeys = [...usKeys, ...krKeys];
  const allCached = await mgetCached<{
    price: number; change: number; changePercent: number;
  }>(allKeys);

  const usMiss: string[] = [];
  const krMiss: string[] = [];

  usTickers.forEach((t, i) => {
    const cached = allCached[i];
    if (cached) results[t] = cached;
    else usMiss.push(t);
  });

  krTickers.forEach((t, i) => {
    const cached = allCached[usTickers.length + i];
    if (cached) results[t] = cached;
    else krMiss.push(t);
  });

  // ── 2. 해외 캐시 미스 → Yahoo Finance (API 키 불필요, 무제한)
  if (usMiss.length > 0) {
    try {
      const fresh = await fetchYahooUsPrices(usMiss);
      let successCount = 0;
      for (const t of usMiss) {
        if (fresh[t]) {
          results[t] = fresh[t];
          await setCached(`stock:us:${t}`, fresh[t], CACHE_TTL);
          successCount++;
        } else {
          const fb = US_FALLBACK[t];
          if (fb) results[t] = { price: fb.price, change: fb.change, changePercent: fb.changePercent };
        }
      }
      console.log(`[STOCKS] US Yahoo 성공 ${successCount}/${usMiss.length}개`);
    } catch (e) {
      console.log("[STOCKS] Yahoo US 오류:", e);
      for (const t of usMiss) {
        const fb = US_FALLBACK[t];
        if (fb) results[t] = { price: fb.price, change: fb.change, changePercent: fb.changePercent };
      }
    }
  }

  // ── 3. 국내 캐시 미스 → Yahoo Finance (KRW, 15분 지연) ──────────────────
  if (krMiss.length > 0) {
    try {
      const fresh = await fetchYahooKrPrices(krMiss);
      let successCount = 0;
      for (const t of krMiss) {
        if (fresh[t]) {
          results[t] = fresh[t];
          await setCached(`stock:kr:${t}`, fresh[t], CACHE_TTL);
          successCount++;
        } else {
          const fb = KR_FALLBACK[t];
          if (fb) results[t] = { price: fb.price, change: fb.change, changePercent: fb.changePercent };
        }
      }
      console.log(`[STOCKS] KR Yahoo 성공 ${successCount}/${krMiss.length}개`);
    } catch (e) {
      console.log("[STOCKS] Yahoo 오류:", e);
      for (const t of krMiss) {
        const fb = KR_FALLBACK[t];
        if (fb) results[t] = { price: fb.price, change: fb.change, changePercent: fb.changePercent };
      }
    }
  }

  return Response.json(results);
}
