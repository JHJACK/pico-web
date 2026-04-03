import { STOCK_FALLBACK } from "@/app/lib/stocks";

const cache = new Map<string, { data: Record<string, unknown>; ts: number }>();
const TTL = 15 * 60 * 1000;

type TwelveQuote = {
  symbol?: string;
  close?: string;
  change?: string;
  percent_change?: string;
  status?: string; // "error" 이면 해당 종목 스킵
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tickersParam = searchParams.get("tickers") ?? "";
  const tickers = tickersParam.split(",").map((t) => t.trim()).filter(Boolean);

  if (tickers.length === 0) return Response.json({});

  const cacheKey = [...tickers].sort().join(",");
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < TTL) {
    return Response.json(cached.data);
  }

  const apiKey = process.env.TWELVE_DATA_API_KEY ?? "";
  if (!apiKey || apiKey === "여기에키입력") {
    return Response.json(buildFallback(tickers));
  }

  try {
    // 40개 전체를 1번 요청으로
    const url = `https://api.twelvedata.com/quote?symbol=${tickers.join(",")}&apikey=${apiKey}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Twelve Data ${res.status}`);

    const json = await res.json();
    const results: Record<string, unknown> = {};
    let successCount = 0;

    for (const ticker of tickers) {
      const q: TwelveQuote | undefined = json[ticker];
      if (!q || q.status === "error" || !q.close) continue;
      const price = parseFloat(q.close);
      const change = parseFloat(q.change ?? "0");
      const changePercent = parseFloat(q.percent_change ?? "0");
      if (!isNaN(price) && price > 0) {
        results[ticker] = { price, change, changePercent };
        successCount++;
      }
    }

    console.log(`[STOCKS] Twelve Data 성공 ${successCount}/${tickers.length}개`);

    // 누락 종목 폴백으로 채움
    for (const t of tickers) {
      if (!results[t]) {
        const fb = STOCK_FALLBACK[t];
        if (fb) results[t] = { price: fb.price, change: fb.change, changePercent: fb.changePercent };
      }
    }

    if (successCount > 0) {
      cache.set(cacheKey, { data: results, ts: Date.now() });
    } else if (cached) {
      return Response.json(cached.data);
    }

    return Response.json(results);
  } catch (e) {
    console.log("[STOCKS] 오류:", e);
    if (cached) return Response.json(cached.data);
    return Response.json(buildFallback(tickers));
  }
}

function buildFallback(tickers: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const t of tickers) {
    const fb = STOCK_FALLBACK[t];
    if (fb) out[t] = { price: fb.price, change: fb.change, changePercent: fb.changePercent };
  }
  return out;
}
