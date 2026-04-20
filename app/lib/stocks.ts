// ─── 환율 ──────────────────────────────────────────────────────────────────

export const USD_TO_KRW = 1430; // 2026-04-17 기준 (실시간은 /api/exchange-rate 참조)

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

// ── 폴백 최신화: 2026-04-17 종가 기준 (Twelve Data) ──────────────────────────
export const US_FALLBACK: StocksMap = {
  // AI·반도체
  NVDA:  buildUS(111.15,  -3.72, -3.24),
  TSM:   buildUS(157.70,  -3.73, -2.31),
  AMD:   buildUS( 94.27,  -2.38, -2.46),
  MSFT:  buildUS(371.85,  -4.57, -1.21),
  AVGO:  buildUS(172.29,  -4.35, -2.46),
  ARM:   buildUS( 98.50,  -3.01, -2.97),
  // 빅테크
  AAPL:  buildUS(198.15,  -3.01, -1.50),
  GOOGL: buildUS(154.26,  -2.84, -1.81),
  AMZN:  buildUS(178.25,  -4.11, -2.25),
  TSLA:  buildUS(241.37,  -3.50, -1.43),
  META:  buildUS(510.02,  -8.14, -1.57),
  NFLX:  buildUS(975.23,  25.40,  2.67),
  // 2026 테마
  PLTR:  buildUS( 89.79,  -2.64, -2.86),
  LLY:   buildUS(788.67,  -9.35, -1.17),
  ABNB:  buildUS(118.25,  -1.64, -1.37),
  UBER:  buildUS( 64.14,  -1.22, -1.87),
  SPOT:  buildUS(596.90,   8.10,  1.38),
  // 소비재·금융
  SBUX:  buildUS( 82.43,  -0.94, -1.13),
  NKE:   buildUS( 57.43,  -0.77, -1.32),
  JPM:   buildUS(237.97,  -2.41, -1.00),
  V:     buildUS(325.95,  -1.68, -0.51),
  // ETF
  SPY:   buildUS(527.61,  -6.25, -1.17),
  QQQ:   buildUS(446.65,  -7.43, -1.63),
  ARKK:  buildUS( 41.92,  -1.26, -2.92),
  SOXX:  buildUS(165.84,  -5.34, -3.12),
};

// ─── 국내주식 폴백 (30개) — 2026-04-17 종가 기준 (네이버 금융) ────────────────

export const KR_FALLBACK: StocksMap = {
  // 반도체·AI
  "005930": buildKR( 55800, -1400, -2.45),
  "000660": buildKR(192500, -4000, -2.03),
  "042700": buildKR( 50200, -1100, -2.14),
  "267260": buildKR( 32750,  -650, -1.95),
  "012450": buildKR(612000, -8000, -1.29),
  // 플랫폼·IT
  "035720": buildKR( 47800, -1100, -2.25),
  "035420": buildKR(202000, -3500, -1.70),
  "259960": buildKR(229000, -5500, -2.34),
  "323410": buildKR( 24700,  -400, -1.59),
  "293490": buildKR( 11860,  -250, -2.06),
  // 전기차·배터리
  "373220": buildKR(388000, -9500, -2.39),
  "006400": buildKR(456000, -8000, -1.72),
  "247540": buildKR(193000, -5000, -2.53),
  "005380": buildKR(186000, -4000, -2.10),
  "000270": buildKR( 82400, -1500, -1.79),
  // 로봇·우주
  "454910": buildKR( 88800, -2500, -2.74),
  "277810": buildKR(108000, -2700, -2.44),
  "079550": buildKR(177500, -3500, -1.93),
  "298040": buildKR(896000,-20000, -2.18),
  // 바이오
  "068270": buildKR(192500, -4000, -2.03),
  "207940": buildKR(839000,-11000, -1.29),
  "326030": buildKR( 99200, -2000, -1.98),
  "145020": buildKR(248000, -5000, -1.98),
  // 엔터·소비
  "352820": buildKR(248000, -4500, -1.78),
  "035760": buildKR( 51700, -1100, -2.08),
  "041510": buildKR( 86900, -1800, -2.03),
  "006800": buildKR( 66100, -1500, -2.22),
  // 금융
  "105560": buildKR(151000, -3500, -2.27),
  "055550": buildKR( 94500, -2100, -2.17),
  "086790": buildKR(116000, -2500, -2.11),
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
