import { setCached, mgetCached } from "@/app/lib/cache";
import { isKrTicker } from "@/app/lib/stockNames";
import { fetchKisHistory } from "@/app/lib/kis";

export type CandleData = {
  time: string;   // "2024-01-15" or "2024-01-15 09:30:00"
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

// 기간별 Twelve Data 설정
const PERIOD_CONFIG: Record<string, { interval: string; outputsize: number; cacheTTL: number }> = {
  "1D": { interval: "5min",  outputsize: 78,  cacheTTL: 5 * 60      }, // 5분봉 78개 = 6.5시간
  "1W": { interval: "1h",    outputsize: 40,  cacheTTL: 15 * 60     }, // 1시간봉 40개 = ~주간
  "1M": { interval: "1day",  outputsize: 30,  cacheTTL: 60 * 60     }, // 일봉 30개
  "1Y": { interval: "1week", outputsize: 52,  cacheTTL: 6 * 60 * 60 }, // 주봉 52개
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ticker = (searchParams.get("ticker") ?? "").toUpperCase();
  const period = searchParams.get("period") ?? "1M";

  if (!ticker) return Response.json({ error: "ticker required" }, { status: 400 });

  const cfg = PERIOD_CONFIG[period] ?? PERIOD_CONFIG["1M"];
  const cacheKey = `history:${ticker}:${period}`;

  // ── 캐시 확인 ────────────────────────────────────────────────────────────
  const cached = (await mgetCached<CandleData[]>([cacheKey]))[0];
  if (cached) return Response.json(cached);

  // ── 한국 종목 → KIS 히스토리컬 조회 ────────────────────────────────────────
  if (isKrTicker(ticker)) {
    try {
      const candles = await fetchKisHistory(ticker, period);
      if (candles.length) {
        await setCached(cacheKey, candles, cfg.cacheTTL);
      }
      return Response.json(candles);
    } catch (e) {
      console.error("[HISTORY] KIS 오류:", e);
      return Response.json([]);
    }
  }

  // ── 해외 종목 → Twelve Data 히스토리컬 조회 ─────────────────────────────────
  const apiKey = process.env.TWELVE_DATA_API_KEY ?? "";
  if (!apiKey || apiKey === "여기에키입력") {
    return Response.json([], { status: 200 });
  }

  try {
    const url = [
      "https://api.twelvedata.com/time_series",
      `?symbol=${ticker}`,
      `&interval=${cfg.interval}`,
      `&outputsize=${cfg.outputsize}`,
      "&order=ASC",
      `&apikey=${apiKey}`,
    ].join("");

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Twelve Data ${res.status}`);

    const json = await res.json() as {
      status?: string;
      values?: Array<{
        datetime: string;
        open: string;
        high: string;
        low: string;
        close: string;
        volume: string;
      }>;
    };

    if (json.status === "error" || !json.values?.length) {
      return Response.json([]);
    }

    const candles: CandleData[] = json.values.map((v) => ({
      time:   v.datetime,
      open:   parseFloat(v.open),
      high:   parseFloat(v.high),
      low:    parseFloat(v.low),
      close:  parseFloat(v.close),
      volume: parseFloat(v.volume ?? "0"),
    }));

    await setCached(cacheKey, candles, cfg.cacheTTL);
    return Response.json(candles);
  } catch (e) {
    console.error("[HISTORY] 오류:", e);
    return Response.json([]);
  }
}
