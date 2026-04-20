import { setCached, mgetCached } from "@/app/lib/cache";
import { US_FALLBACK, KR_FALLBACK } from "@/app/lib/stocks";
import { fetchYahooKrPrices } from "@/app/lib/yahoo";
import { isKrTicker } from "@/app/lib/stockNames";
import { isUSMarketOpen } from "@/app/lib/marketStatus";

const CACHE_TTL = 15 * 60; // 15분

// ─── Twelve Data 해외주식 조회 ───────────────────────────────────────────────

type TwelveQuote = {
  symbol?: string;
  close?: string;
  change?: string;
  percent_change?: string;
  status?: string;
};

async function fetchTwelveData(
  tickers: string[]
): Promise<Record<string, { price: number; change: number; changePercent: number }>> {
  const apiKey = process.env.TWELVE_DATA_API_KEY ?? "";
  if (!apiKey || apiKey === "여기에키입력") return {};

  const url = `https://api.twelvedata.com/quote?symbol=${tickers.join(",")}&apikey=${apiKey}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Twelve Data ${res.status}`);

  const json = await res.json();
  const results: Record<string, { price: number; change: number; changePercent: number }> = {};

  // 단일 종목이면 json이 배열이 아니라 객체 직접 반환
  const items: Record<string, TwelveQuote> =
    tickers.length === 1
      ? { [tickers[0]]: json as TwelveQuote }
      : (json as Record<string, TwelveQuote>);

  for (const ticker of tickers) {
    const q = items[ticker];
    if (!q || q.status === "error" || !q.close) continue;
    const price = parseFloat(q.close);
    const change = parseFloat(q.change ?? "0");
    const changePercent = parseFloat(q.percent_change ?? "0");
    if (!isNaN(price) && price > 0) {
      results[ticker] = { price, change, changePercent };
    }
  }

  return results;
}

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

  // ── 2. 해외 캐시 미스 → Twelve Data (장 마감 후에도 최신 종가 조회)
  if (usMiss.length > 0) {
    try {
      const fresh = await fetchTwelveData(usMiss);
      let successCount = 0;
      for (const t of usMiss) {
        if (fresh[t]) {
          results[t] = fresh[t];
          // 장 중: 15분 캐시 / 장 마감: 60분 캐시 (종가는 오래 유효)
          const ttl = isUSMarketOpen() ? CACHE_TTL : 60 * 60;
          await setCached(`stock:us:${t}`, fresh[t], ttl);
          successCount++;
        } else {
          const fb = US_FALLBACK[t];
          if (fb) results[t] = { price: fb.price, change: fb.change, changePercent: fb.changePercent };
        }
      }
      console.log(`[STOCKS] US Twelve Data 성공 ${successCount}/${usMiss.length}개`);
    } catch (e) {
      console.log("[STOCKS] Twelve Data 오류:", e);
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
