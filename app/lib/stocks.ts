// ─── 환율 ──────────────────────────────────────────────────────────────────

export const USD_TO_KRW = 1370;

export function toKRW(usdPrice: number): string {
  const krw = Math.round(usdPrice * USD_TO_KRW);
  return krw.toLocaleString("ko-KR") + "원";
}

// ─── 타입 ──────────────────────────────────────────────────────────────────

export type StockData = {
  price: number;
  change: number;
  changePercent: number;
  up: boolean;
  formattedPrice: string;   // 해외: "$161.48" / 국내: "75,400원"
  formattedChange: string;  // "+2.30%"
  formattedKRW: string;     // "₩221,228" (해외만 사용, 국내는 formattedPrice와 동일)
  isKr: boolean;
};

export type StocksMap = Record<string, StockData>;

// ─── 포맷 헬퍼 ─────────────────────────────────────────────────────────────

function buildUS(price: number, change: number, changePct: number): StockData {
  const up = change >= 0;
  const sign = up ? "+" : "";
  return {
    price, change, changePercent: changePct, up,
    formattedPrice:  `$${price.toFixed(2)}`,
    formattedChange: `${sign}${changePct.toFixed(2)}%`,
    formattedKRW:    toKRW(price),
    isKr: false,
  };
}

function buildKR(price: number, change: number, changePct: number): StockData {
  const up = change >= 0;
  const sign = up ? "+" : "";
  return {
    price, change, changePercent: changePct, up,
    formattedPrice:  price.toLocaleString("ko-KR") + "원",
    formattedChange: `${sign}${changePct.toFixed(2)}%`,
    formattedKRW:    price.toLocaleString("ko-KR") + "원",
    isKr: true,
  };
}

export function formatUS(raw: { price: number; change: number; changePercent: number }): StockData {
  return buildUS(raw.price, raw.change, raw.changePercent);
}

export function formatKR(raw: { price: number; change: number; changePercent: number }): StockData {
  return buildKR(raw.price, raw.change, raw.changePercent);
}

function empty(isKr: boolean): StockData {
  return {
    price: 0, change: 0, changePercent: 0, up: false,
    formattedPrice: "—", formattedChange: "—", formattedKRW: "—",
    isKr,
  };
}

export function emptyUS(): StockData { return empty(false); }
export function emptyKR(): StockData { return empty(true); }

// ─── 해외주식 폴백 (25개) ───────────────────────────────────────────────────

// ── 폴백 최신화: 2026-04-14 종가 기준 (Twelve Data) ──────────────────────────
export const US_FALLBACK: StocksMap = {
  // AI·반도체
  NVDA:  buildUS(196.51,   7.20,  3.80),
  TSM:   buildUS(379.89,  10.32,  2.79),
  AMD:   buildUS(255.07,   8.24,  3.34),
  MSFT:  buildUS(393.11,   8.74,  2.27),
  AVGO:  buildUS(380.78,   1.03,  0.27),
  ARM:   buildUS(161.22,   3.64,  2.31),
  // 빅테크
  AAPL:  buildUS(258.83,  -0.37, -0.14),
  GOOGL: buildUS(332.91,  11.60,  3.61),
  AMZN:  buildUS(249.02,   9.13,  3.81),
  TSLA:  buildUS(364.20,  11.78,  3.34),
  META:  buildUS(662.49,  27.96,  4.41),
  NFLX:  buildUS(106.28,   3.12,  3.02),
  // 2026 테마
  PLTR:  buildUS(135.70,   3.33,  2.52),
  LLY:   buildUS(922.50,  -7.05, -0.76),
  ABNB:  buildUS(133.85,   3.53,  2.71),
  UBER:  buildUS( 72.91,   0.57,  0.79),
  SPOT:  buildUS(511.36,   7.26,  1.44),
  // 소비재·금융
  SBUX:  buildUS( 98.47,   0.99,  1.02),
  NKE:   buildUS( 44.20,   1.29,  3.01),
  JPM:   buildUS(311.12,  -2.56, -0.82),
  V:     buildUS(311.37,   1.98,  0.64),
  // ETF
  SPY:   buildUS(694.46,   8.36,  1.22),
  QQQ:   buildUS(628.60,  11.21,  1.82),
  ARKK:  buildUS( 74.83,   2.87,  3.99),
  SOXX:  buildUS(401.24,   7.90,  2.01),
};

// ─── 국내주식 폴백 (30개) — 2026-04-15 종가 기준 (네이버 금융) ────────────────

export const KR_FALLBACK: StocksMap = {
  // 반도체·AI
  "005930": buildKR(211000,  4500,  2.18),
  "000660": buildKR(1136000, 33000,  2.99),
  "042700": buildKR(295000,  11000,  3.87),
  "267260": buildKR(1050000, -11000, -1.04),
  "012450": buildKR(1509000, -14000, -0.92),
  // 플랫폼·IT
  "035720": buildKR( 49600,  1500,  3.12),
  "035420": buildKR(211000,  9500,  4.71),
  "259960": buildKR(244000,  5000,  2.09),
  "323410": buildKR( 25500,   250,  0.99),
  "293490": buildKR( 12290,   240,  1.99),
  // 전기차·배터리
  "373220": buildKR(408000,  8000,  2.00),
  "006400": buildKR(471000,   500,  0.11),
  "247540": buildKR(202500,  4700,  2.38),
  "005380": buildKR(508000, 16500,  3.36),
  "000270": buildKR(151500,  2300,  1.54),
  // 로봇·우주
  "454910": buildKR( 93300,  2700,  2.98),
  "277810": buildKR(611000,  8000,  1.33),
  "079550": buildKR(893000, -41000, -4.39),
  "298040": buildKR(2965000, -77000, -2.53),
  // 바이오
  "068270": buildKR(202000,  2900,  1.46),
  "207940": buildKR(1602000, 66000,  4.30),
  "326030": buildKR(105700,  5500,  5.49),
  "145020": buildKR(263500, 10500,  4.15),
  // 엔터·소비
  "352820": buildKR(255500, 10000,  4.07),
  "035760": buildKR( 54100,   500,  0.93),
  "041510": buildKR( 90900,  2900,  3.30),
  "006800": buildKR( 69700, -2700, -3.73),
  // 금융
  "105560": buildKR(158200,  2300,  1.48),
  "055550": buildKR( 99800,  1500,  1.53),
  "086790": buildKR(121100,   300,  0.25),
};

// ─── fetchStocks (클라이언트 → /api/stocks 호출) ─────────────────────────────

export async function fetchStocks(tickers: string[]): Promise<StocksMap> {
  const { isKrTicker } = await import("@/app/lib/stockNames");
  try {
    const res = await fetch(
      `/api/stocks?tickers=${tickers.join(",")}`,
      { cache: "no-store" }
    );
    if (!res.ok) throw new Error("fetch failed");
    const data: Record<
      string,
      { price: number; change: number; changePercent: number; isKr?: boolean }
    > = await res.json();

    const result: StocksMap = {};
    for (const t of tickers) {
      const raw = data[t];
      if (raw) {
        result[t] = isKrTicker(t) ? formatKR(raw) : formatUS(raw);
      } else {
        result[t] =
          isKrTicker(t)
            ? (KR_FALLBACK[t] ?? emptyKR())
            : (US_FALLBACK[t] ?? emptyUS());
      }
    }
    return result;
  } catch {
    const result: StocksMap = {};
    const { isKrTicker: kr } = await import("@/app/lib/stockNames");
    for (const t of tickers) {
      result[t] = kr(t)
        ? (KR_FALLBACK[t] ?? emptyKR())
        : (US_FALLBACK[t] ?? emptyUS());
    }
    return result;
  }
}
