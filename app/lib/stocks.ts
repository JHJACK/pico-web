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

export const US_FALLBACK: StocksMap = {
  // AI·반도체
  NVDA:  buildUS(875.40,  31.38,  3.72),
  TSM:   buildUS(142.60,  -1.40, -0.97),
  AMD:   buildUS(158.30,  -2.10, -1.31),
  MSFT:  buildUS(414.20,   3.50,  0.85),
  AVGO:  buildUS(164.20,   1.60,  0.98),
  ARM:   buildUS(118.40,   2.20,  1.89),
  // 빅테크
  AAPL:  buildUS(169.30,   1.20,  0.71),
  GOOGL: buildUS(163.40,  -1.20, -0.73),
  AMZN:  buildUS(185.20,   2.40,  1.31),
  TSLA:  buildUS(161.48,  -3.82, -2.30),
  META:  buildUS(488.60,   5.10,  1.05),
  NFLX:  buildUS(622.10,  -4.20, -0.67),
  // 2026 테마
  PLTR:  buildUS( 24.80,   0.70,  2.90),
  LLY:   buildUS(728.40,  -5.20, -0.71),
  ABNB:  buildUS(156.40,   1.85,  1.20),
  UBER:  buildUS( 72.30,   0.90,  1.26),
  SPOT:  buildUS(318.40,   3.60,  1.14),
  // 소비재·금융
  SBUX:  buildUS( 92.40,  -1.10, -1.18),
  NKE:   buildUS( 94.60,  -0.80, -0.84),
  JPM:   buildUS(196.80,   2.10,  1.08),
  V:     buildUS(272.40,   1.80,  0.67),
  // ETF
  SPY:   buildUS(524.60,   3.20,  0.61),
  QQQ:   buildUS(442.80,   4.10,  0.93),
  ARKK:  buildUS( 46.20,   0.80,  1.76),
  SOXX:  buildUS(206.40,   2.30,  1.13),
};

// ─── 국내주식 폴백 (30개) ───────────────────────────────────────────────────

export const KR_FALLBACK: StocksMap = {
  // 반도체·AI
  "005930": buildKR( 75400,   400,  0.53),
  "000660": buildKR(198000,  2500,  1.28),
  "042700": buildKR( 82600, -1200, -1.43),
  "267260": buildKR(346000,  8000,  2.37),
  "012450": buildKR(384000,  6000,  1.59),
  // 플랫폼·IT
  "035720": buildKR( 38900,  -600, -1.52),
  "035420": buildKR(198500,  1500,  0.76),
  "259960": buildKR(304000,  4000,  1.33),
  "323410": buildKR( 23400,  -200, -0.85),
  "293490": buildKR( 26500,   300,  1.14),
  // 전기차·배터리
  "373220": buildKR(412000,  8000,  1.98),
  "006400": buildKR(348000,  4000,  1.16),
  "247540": buildKR(142500, -2500, -1.72),
  "005380": buildKR(218000,  3000,  1.40),
  "000270": buildKR(108000,  1500,  1.41),
  // 로봇·우주
  "454910": buildKR( 68400,  2200,  3.32),
  "277810": buildKR(186000,  5000,  2.76),
  "079550": buildKR(218000,  4000,  1.87),
  "298040": buildKR(312000,  6000,  1.96),
  // 바이오
  "068270": buildKR(198000,  2000,  1.02),
  "207940": buildKR(842000,  8000,  0.96),
  "326030": buildKR( 18640,   440,  2.42),
  "145020": buildKR(282000,  4000,  1.44),
  // 엔터·소비
  "352820": buildKR(236000, -2000, -0.84),
  "035760": buildKR( 64800,   800,  1.25),
  "041510": buildKR( 96400,  1200,  1.26),
  "006800": buildKR( 10480,   120,  1.16),
  // 금융
  "105560": buildKR( 86600,  1200,  1.41),
  "055550": buildKR( 52800,   800,  1.54),
  "086790": buildKR( 68300,  1100,  1.64),
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
