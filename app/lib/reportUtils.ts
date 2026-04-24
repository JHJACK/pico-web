import { STOCK_META, KR_STOCK_META } from "./stockNames";
import type { MockInvestmentRow } from "./supabase";

// ── 마켓 구분 ─────────────────────────────────────────────────
export type Market = "kr" | "us";

export function isKrTicker(ticker: string): boolean {
  return /^\d{6}$/.test(ticker);
}

export function getMarket(ticker: string): Market {
  return isKrTicker(ticker) ? "kr" : "us";
}

// ── 주간 범위 계산 (KST 기준 월~금) ──────────────────────────
export function getWeekRange(refDate?: Date): {
  weekStart: string; // YYYY-MM-DD (월요일)
  weekEnd: string;   // YYYY-MM-DD (금요일)
  weekLabel: string; // "2026년 4월 21일(월) — 25일(금)"
} {
  const now = new Date(
    (refDate ?? new Date()).toLocaleString("en-US", { timeZone: "Asia/Seoul" })
  );
  const day         = now.getDay();
  const diffToMon   = day === 0 ? -6 : 1 - day;
  const monday      = new Date(now);
  monday.setDate(now.getDate() + diffToMon);
  monday.setHours(0, 0, 0, 0);
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);

  const weekStart = monday.toLocaleDateString("sv-SE");
  const weekEnd   = friday.toLocaleDateString("sv-SE");

  const fmtMon = monday.toLocaleDateString("ko-KR", {
    month: "long", day: "numeric", weekday: "short",
  });
  const fmtFri = friday.toLocaleDateString("ko-KR", {
    day: "numeric", weekday: "short",
  });

  return { weekStart, weekEnd, weekLabel: `${fmtMon} — ${fmtFri}` };
}

// ── 등급 계산 ────────────────────────────────────────────────
export function calcGrade(returnRate: number): string {
  if (returnRate >= 10) return "S";
  if (returnRate >= 5)  return "A";
  if (returnRate >= 2)  return "B+";
  if (returnRate >= 0)  return "B";
  if (returnRate >= -2) return "C";
  return "D";
}

// ── 종목 이름 / 카테고리 ─────────────────────────────────────
export function getTickerName(ticker: string): string {
  if (isKrTicker(ticker)) return KR_STOCK_META[ticker]?.name ?? ticker;
  return STOCK_META[ticker]?.name ?? ticker;
}

export function getTickerCategory(ticker: string): string {
  if (isKrTicker(ticker)) return KR_STOCK_META[ticker]?.category ?? "기타";
  return STOCK_META[ticker]?.category ?? "기타";
}

// ── 집계 타입 ────────────────────────────────────────────────
export type TradeData = {
  ticker: string;
  name: string;
  status: "sold" | "holding";
  buyAt: string;
  sellAt: string | null;
  buyPrice: number;
  sellPrice: number | null;
  currentPrice?: number;
  returnPct: number | null;
  investedPoints: number;
  finalPoints: number | null;
  newsContext: string;
};

export type WeeklyStats = {
  tradeCount: number;
  soldCount: number;
  holdingCount: number;
  returnRate: number;
  profitPoints: number;
  investedPoints: number;
  winRate: number;
  grade: string;
  bestTrade:  { ticker: string; name: string; returnPct: number } | null;
  worstTrade: { ticker: string; name: string; returnPct: number } | null;
};

export type BehaviorData = {
  avgHoldingDays: number;
  topSector: string;
  activeDays: string[];
  tags: string[];
};

// ── 주간 거래 집계 ────────────────────────────────────────────
export function aggregateWeekTrades(
  investments: MockInvestmentRow[],
  market: Market,
  currentPrices: Record<string, number>
): {
  trades:   TradeData[];
  holdings: TradeData[];
  stats:    WeeklyStats;
  behavior: BehaviorData;
} {
  const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];
  const marketInvs = investments.filter((inv) => getMarket(inv.ticker) === market);

  const trades:   TradeData[] = [];
  const holdings: TradeData[] = [];
  let totalInvested = 0;
  let totalFinal    = 0;

  for (const inv of marketInvs) {
    const name         = getTickerName(inv.ticker);
    const currentPrice = currentPrices[inv.ticker] ?? inv.buy_price;

    let returnPct: number | null = null;
    let finalPts:  number | null = null;

    if (inv.status === "sold" && inv.sell_price != null && inv.final_points != null) {
      returnPct = ((inv.sell_price - inv.buy_price) / inv.buy_price) * 100;
      finalPts  = inv.final_points;
    } else {
      returnPct = ((currentPrice - inv.buy_price) / inv.buy_price) * 100;
      finalPts  = Math.round(inv.invested_points * (currentPrice / inv.buy_price));
    }

    totalInvested += inv.invested_points;
    totalFinal    += finalPts ?? inv.invested_points;

    const item: TradeData = {
      ticker:         inv.ticker,
      name,
      status:         inv.status,
      buyAt:          inv.buy_at.slice(0, 10),
      sellAt:         inv.sell_at ? inv.sell_at.slice(0, 10) : null,
      buyPrice:       inv.buy_price,
      sellPrice:      inv.sell_price,
      currentPrice:   inv.status === "holding" ? currentPrice : undefined,
      returnPct:      returnPct !== null ? Math.round(returnPct * 100) / 100 : null,
      investedPoints: inv.invested_points,
      finalPoints:    finalPts,
      newsContext:    "",
    };

    if (inv.status === "sold") trades.push(item);
    else holdings.push(item);
  }

  // ── 통계 ──
  const profitPoints = totalFinal - totalInvested;
  const returnRate   = totalInvested > 0
    ? Math.round((profitPoints / totalInvested) * 10000) / 100
    : 0;
  const winCount = trades.filter((t) => (t.returnPct ?? 0) > 0).length;
  const winRate  = trades.length > 0 ? Math.round((winCount / trades.length) * 100) : 0;

  const sorted = [...trades].sort((a, b) => (b.returnPct ?? 0) - (a.returnPct ?? 0));
  const bestTrade  = sorted[0]
    ? { ticker: sorted[0].ticker, name: sorted[0].name, returnPct: sorted[0].returnPct ?? 0 }
    : null;
  const worstTrade = sorted.length > 1
    ? { ticker: sorted[sorted.length - 1].ticker, name: sorted[sorted.length - 1].name, returnPct: sorted[sorted.length - 1].returnPct ?? 0 }
    : null;

  // ── 행동 패턴 ──
  const holdingDays = trades
    .filter((t) => t.sellAt)
    .map((t) => Math.max(1, Math.round(
      (new Date(t.sellAt!).getTime() - new Date(t.buyAt).getTime()) / 86_400_000
    )));
  const avgHoldingDays = holdingDays.length > 0
    ? Math.round((holdingDays.reduce((s, d) => s + d, 0) / holdingDays.length) * 10) / 10
    : 0;

  const allItems = [...trades, ...holdings];

  const sectorCount: Record<string, number> = {};
  for (const item of allItems) {
    const cat = getTickerCategory(item.ticker);
    sectorCount[cat] = (sectorCount[cat] ?? 0) + 1;
  }
  const topSector = Object.entries(sectorCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";

  const dayCount: Record<number, number> = {};
  for (const item of allItems) {
    const d = new Date(item.buyAt).getDay();
    dayCount[d] = (dayCount[d] ?? 0) + 1;
  }
  const activeDays = Object.entries(dayCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([d]) => DAY_LABELS[parseInt(d)]);

  const tags: string[] = [];
  if (avgHoldingDays > 0) {
    if (avgHoldingDays < 3) {
      tags.push(`단기 매매 비중이 높았어요 (평균 보유 **${avgHoldingDays}일**)`);
    } else {
      tags.push(`중장기 보유 위주로 플레이하셨어요 (평균 보유 **${avgHoldingDays}일**)`);
    }
  }
  if (topSector && allItems.length > 0) {
    const pct = Math.round((sectorCount[topSector] / allItems.length) * 100);
    tags.push(`${topSector} 업종 거래가 전체의 **${pct}%**였어요`);
  }
  if (activeDays.length > 0) {
    tags.push(`${activeDays.join("·")}요일에 매매가 집중됐어요`);
  }

  return {
    trades,
    holdings,
    stats: {
      tradeCount:     allItems.length,
      soldCount:      trades.length,
      holdingCount:   holdings.length,
      returnRate,
      profitPoints,
      investedPoints: totalInvested,
      winRate,
      grade:          calcGrade(returnRate),
      bestTrade,
      worstTrade,
    },
    behavior: { avgHoldingDays, topSector, activeDays, tags },
  };
}
