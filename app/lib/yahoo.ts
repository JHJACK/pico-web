// Yahoo Finance 비공식 API — 한국 주식 전용
// 공식 API 없음. IP 제한 없음, API 키 불필요, 무료.
// 리스크: Yahoo 구조 변경 시 중단 가능. Redis 캐시로 호출 최소화 필요.

// ─── KOSPI(.KS) / KOSDAQ(.KQ) 구분 ─────────────────────────────────────────
// 명시 없으면 .KS (KOSPI) 기본값
const KOSDAQ_TICKERS = new Set([
  "247540", // 에코프로비엠
  "277810", // 레인보우로보틱스
  "326030", // 에이비엘바이오
  "145020", // 휴젤
  "035760", // CJ ENM
  "041510", // SM엔터테인먼트
]);

export function toYahooSymbol(ticker: string): string {
  return KOSDAQ_TICKERS.has(ticker) ? `${ticker}.KQ` : `${ticker}.KS`;
}

// ─── 현재가 배치 조회 ────────────────────────────────────────────────────────

export type YahooKrPrice = {
  price: number;        // KRW
  change: number;       // KRW 변동
  changePercent: number;
};

export async function fetchYahooKrPrices(
  tickers: string[]
): Promise<Record<string, YahooKrPrice>> {
  if (!tickers.length) return {};

  const symbols = tickers.map(toYahooSymbol).join(",");
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols}&fields=regularMarketPrice,regularMarketChange,regularMarketChangePercent,currency`;

  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; PICO/1.0)" },
    cache: "no-store",
  });

  if (!res.ok) throw new Error(`Yahoo Finance ${res.status}`);

  const json = await res.json() as {
    quoteResponse?: {
      result?: Array<{
        symbol: string;
        regularMarketPrice?: number;
        regularMarketChange?: number;
        regularMarketChangePercent?: number;
      }>;
    };
  };

  const results: Record<string, YahooKrPrice> = {};
  for (const q of json?.quoteResponse?.result ?? []) {
    if (!q.regularMarketPrice) continue;
    // symbol에서 티커 복원 (005930.KS → 005930)
    const ticker = q.symbol.replace(/\.(KS|KQ)$/, "");
    results[ticker] = {
      price: Math.round(q.regularMarketPrice),
      change: Math.round(q.regularMarketChange ?? 0),
      changePercent: parseFloat((q.regularMarketChangePercent ?? 0).toFixed(2)),
    };
  }
  return results;
}

// ─── 차트 히스토리 조회 ──────────────────────────────────────────────────────

export type YahooCandleData = {
  time: string;   // "YYYY-MM-DD" 또는 "YYYY-MM-DD HH:mm:00" (KST)
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

const PERIOD_TO_YAHOO: Record<string, { interval: string; range: string; cacheTTL: number }> = {
  "1D": { interval: "5m",  range: "1d",  cacheTTL: 5 * 60       },
  "1W": { interval: "1h",  range: "5d",  cacheTTL: 15 * 60      },
  "1M": { interval: "1d",  range: "1mo", cacheTTL: 60 * 60      },
  "1Y": { interval: "1wk", range: "1y",  cacheTTL: 6 * 60 * 60  },
};

// Unix timestamp → KST 문자열 변환 (UTC+9)
function toKSTString(unixSec: number, includeTime: boolean): string {
  const kstMs = unixSec * 1000 + 9 * 60 * 60 * 1000;
  const d = new Date(kstMs);
  const y = d.getUTCFullYear();
  const mo = String(d.getUTCMonth() + 1).padStart(2, "0");
  const da = String(d.getUTCDate()).padStart(2, "0");
  if (!includeTime) return `${y}-${mo}-${da}`;
  const h = String(d.getUTCHours()).padStart(2, "0");
  const mi = String(d.getUTCMinutes()).padStart(2, "0");
  return `${y}-${mo}-${da} ${h}:${mi}:00`;
}

export async function fetchYahooKrHistory(
  ticker: string,
  period: string
): Promise<YahooCandleData[]> {
  const symbol = toYahooSymbol(ticker);
  const cfg = PERIOD_TO_YAHOO[period] ?? PERIOD_TO_YAHOO["1M"];
  const includeTime = period === "1D" || period === "1W";

  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}` +
    `?interval=${cfg.interval}&range=${cfg.range}&includePrePost=false`;

  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; PICO/1.0)" },
    cache: "no-store",
  });

  if (!res.ok) {
    console.log(`[YAHOO] ${symbol} 히스토리 ${res.status}`);
    return [];
  }

  const json = await res.json() as {
    chart?: {
      result?: Array<{
        timestamp?: number[];
        indicators?: {
          quote?: Array<{
            open?: (number | null)[];
            high?: (number | null)[];
            low?: (number | null)[];
            close?: (number | null)[];
            volume?: (number | null)[];
          }>;
        };
      }>;
      error?: { code: string; description: string };
    };
  };

  if (json.chart?.error) {
    console.log(`[YAHOO] ${symbol} 에러:`, json.chart.error.description);
    return [];
  }

  const result = json?.chart?.result?.[0];
  if (!result) return [];

  const timestamps = result.timestamp ?? [];
  const quote = result.indicators?.quote?.[0] ?? {};
  const candles: YahooCandleData[] = [];

  for (let i = 0; i < timestamps.length; i++) {
    const o = quote.open?.[i];
    const h = quote.high?.[i];
    const l = quote.low?.[i];
    const c = quote.close?.[i];
    const v = quote.volume?.[i];
    // null/undefined 봉 스킵 (장 중 미완성 봉 등)
    if (o == null || c == null) continue;

    candles.push({
      time:   toKSTString(timestamps[i], includeTime),
      open:   Math.round(o),
      high:   Math.round(h ?? o),
      low:    Math.round(l ?? o),
      close:  Math.round(c),
      volume: v ?? 0,
    });
  }

  return candles;
}

export { PERIOD_TO_YAHOO };
