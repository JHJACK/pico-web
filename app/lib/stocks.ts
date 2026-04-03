// 원/달러 환율 고정값 (실시간 API 없을 때 사용)
export const USD_TO_KRW = 1370;

export function toKRW(usdPrice: number): string {
  const krw = Math.round(usdPrice * USD_TO_KRW);
  return krw.toLocaleString("ko-KR") + "원";
}

export type StockData = {
  price: number;
  change: number;
  changePercent: number;
  up: boolean;
  formattedPrice: string;   // USD: "$161.48"
  formattedChange: string;  // "%: "+2.30%"
  formattedKRW: string;     // KRW: "₩221,228"
};

export type StocksMap = Record<string, StockData>;

function fb(price: number, change: number, changePct: number): StockData {
  const up = change >= 0;
  const sign = up ? "+" : "";
  return { price, change, changePercent: changePct, up, formattedPrice: `$${price.toFixed(2)}`, formattedChange: `${sign}${changePct.toFixed(2)}%`, formattedKRW: toKRW(price) };
}

export const STOCK_FALLBACK: StocksMap = {
  TSLA:    fb(161.48, -3.82, -2.30),
  NVDA:    fb(875.40, 31.38,  3.72),
  ABNB:    fb(156.40,  1.85,  1.20),
  HLT:     fb(218.30, -0.88, -0.40),
  RIVN:    fb( 10.82,  0.63,  6.18),
  AAPL:    fb(169.30,  1.20,  0.71),
  MSFT:    fb(414.20,  3.50,  0.85),
  GOOGL:   fb(163.40, -1.20, -0.73),
  AMZN:    fb(185.20,  2.40,  1.31),
  META:    fb(488.60,  5.10,  1.05),
  NFLX:    fb(622.10, -4.20, -0.67),
  UBER:    fb( 72.30,  0.90,  1.26),
  SPOT:    fb(318.40,  3.60,  1.14),
  PLTR:    fb( 24.80,  0.70,  2.90),
  SBUX:    fb( 92.40, -1.10, -1.18),
  DIS:     fb(111.30,  0.60,  0.54),
  NKE:     fb( 94.60, -0.80, -0.84),
  MCD:     fb(291.50,  1.30,  0.45),
  JPM:     fb(196.80,  2.10,  1.08),
  V:       fb(272.40,  1.80,  0.67),
  MA:      fb(452.30,  2.90,  0.65),
  TSM:     fb(142.60, -1.40, -0.97),
  ARM:     fb(118.40,  2.20,  1.89),
  AVGO:    fb(164.20,  1.60,  0.98),
  AMD:     fb(158.30, -2.10, -1.31),
  INTC:    fb( 21.40, -0.30, -1.38),
  QCOM:    fb(158.90,  1.10,  0.70),
  NEE:     fb( 62.30,  0.40,  0.65),
  LUNR:    fb(  6.80,  0.20,  3.03),
  LLY:     fb(728.40, -5.20, -0.71),
  CEG:     fb(248.60,  3.10,  1.26),
  RKLB:    fb( 18.40,  0.60,  3.37),
  JOBY:    fb(  5.20,  0.10,  1.96),
  RXRX:    fb(  4.80, -0.10, -2.04),
  TGT:     fb(128.40, -1.60, -1.23),
  COST:    fb(892.30,  6.40,  0.72),
  LULU:    fb(282.10, -3.20, -1.12),
  GS:      fb(482.60,  4.30,  0.90),
  BAC:     fb( 38.90,  0.30,  0.78),
  WFC:     fb( 54.20,  0.40,  0.74),
  BLK:     fb(852.40,  7.20,  0.85),
  "BRK-B": fb(428.30,  2.10,  0.49),
};

export function formatStock(raw: { price: number; change: number; changePercent: number }): StockData {
  const up = raw.change >= 0;
  const sign = up ? "+" : "";
  return {
    price: raw.price,
    change: raw.change,
    changePercent: raw.changePercent,
    up,
    formattedPrice: `$${raw.price.toFixed(2)}`,
    formattedChange: `${sign}${raw.changePercent.toFixed(2)}%`,
    formattedKRW: toKRW(raw.price),
  };
}

function fallbackItem(): StockData {
  return { price: 0, change: 0, changePercent: 0, up: false, formattedPrice: "—", formattedChange: "—", formattedKRW: "—" };
}

export async function fetchStocks(tickers: string[]): Promise<StocksMap> {
  try {
    const res = await fetch(`/api/stocks?tickers=${tickers.join(",")}`, { cache: "no-store" });
    if (!res.ok) throw new Error("fetch failed");
    const data: Record<string, { price: number; change: number; changePercent: number }> = await res.json();
    const result: StocksMap = {};
    for (const t of tickers) {
      result[t] = data[t] ? formatStock(data[t]) : (STOCK_FALLBACK[t] ?? fallbackItem());
    }
    return result;
  } catch {
    const result: StocksMap = {};
    for (const t of tickers) result[t] = STOCK_FALLBACK[t] ?? fallbackItem();
    return result;
  }
}
