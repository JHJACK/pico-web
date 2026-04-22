"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { formatUS, formatKR, type StockData } from "@/app/lib/stocks";
import { STOCK_META, KR_STOCK_META, isKrTicker } from "@/app/lib/stockNames";
import { useAuth } from "@/app/lib/authContext";
import { supabase, type MockInvestmentRow } from "@/app/lib/supabase";
import { isKrMarketOpen, isUSMarketOpen, getClosedText, getMarketClosedTooltip } from "@/app/lib/marketStatus";
import { useStockCache } from "@/app/lib/stockCacheContext";
import StockChart from "@/app/components/StockChart";

type OrderTab = "buy" | "sell";

// 현재 평가 포인트가 enriched된 holding
type HoldingEnriched = MockInvestmentRow & {
  currentPrice?: number;
  currentValue: number;
  profitLoss: number;
  profitRate?: number;
};

// ─── 디자인 시스템 색상 ───────────────────────────────────────────────────────
const C = {
  text:  "#e8e0d0",
  text2: "#c8bfb0",
  bg:    "#0d0d0d",
  card:  "#141414",
  inner: "#0d0d0d",
} as const;

const NUM_MONO = {
  fontFamily: "var(--font-inter), monospace",
  fontWeight: 300,
  letterSpacing: "-0.02em",
} as const;

// ─── 로고 ────────────────────────────────────────────────────────────────────
function TickerLogo({ src, ticker, size = 30 }: { src: string; ticker: string; size?: number }) {
  const [err, setErr] = useState(false);
  if (err) return (
    <div style={{
      width: size, height: size, borderRadius: 8, background: "#242424",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.38, fontWeight: 600, color: C.text2, flexShrink: 0,
    }}>{ticker[0]}</div>
  );
  return (
    <img src={src} alt={ticker} width={size} height={size}
      style={{ width: size, height: size, borderRadius: "50%", objectFit: "contain", background: "#fff", flexShrink: 0 }}
      onError={() => setErr(true)}
    />
  );
}

// ─── 스켈레톤 ────────────────────────────────────────────────────────────────
function Skeleton({ w, h, radius = 4 }: { w: number | string; h: number; radius?: number }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: radius, flexShrink: 0,
      background: "linear-gradient(90deg,#1e1e1e 25%,#2a2a2a 50%,#1e1e1e 75%)",
      backgroundSize: "200% 100%",
      animation: "shimmer 1.4s infinite",
    }} />
  );
}

// ─── 카드 박스 ────────────────────────────────────────────────────────────────
function Card({ children, style, className }: { children: React.ReactNode; style?: React.CSSProperties; className?: string }) {
  return (
    <div className={className} style={{
      background: C.card,
      borderRadius: 18,
      border: "0.5px solid rgba(255,255,255,0.07)",
      overflow: "hidden",
      ...style,
    }}>
      {children}
    </div>
  );
}

// ─── 메인 ────────────────────────────────────────────────────────────────────
export default function StockChartPage() {
  const params = useParams();
  const router = useRouter();
  const { userRow } = useAuth();

  const ticker = (params?.ticker as string ?? "").toUpperCase();
  const kr     = isKrTicker(ticker);
  const meta   = kr ? KR_STOCK_META[ticker] : STOCK_META[ticker];
  const logo   = !kr ? `https://financialmodelingprep.com/image-stock/${ticker}.png` : null;
  const EXCHANGE: Record<string, string> = {
    NVDA:"NASDAQ", AMD:"NASDAQ", MSFT:"NASDAQ", AVGO:"NASDAQ", ARM:"NASDAQ",
    AAPL:"NASDAQ", GOOGL:"NASDAQ", AMZN:"NASDAQ", TSLA:"NASDAQ", META:"NASDAQ",
    NFLX:"NASDAQ", PLTR:"NYSE",  ABNB:"NASDAQ", SBUX:"NASDAQ", QQQ:"NASDAQ",
    ARKK:"AMEX",  SOXX:"NASDAQ", TSM:"NYSE", LLY:"NYSE", UBER:"NYSE",
    SPOT:"NYSE",  NKE:"NYSE",   JPM:"NYSE",  V:"NYSE", SPY:"AMEX",
  };
  const exch = kr ? "KRX" : (EXCHANGE[ticker] ?? "NASDAQ");

  const { cacheTimeLeft, updateFromTTL } = useStockCache();

  const [data, setData]             = useState<StockData | null>(null);
  const [loading, setLoading]       = useState(true);
  const [orderTab, setOrderTab]     = useState<OrderTab>("buy");
  const [orderAmt, setOrderAmt]     = useState(0);
  const [exchangeRate, setExchangeRate] = useState(1470);

  // 장 운영 상태 (1분마다 갱신)
  const [marketOpen, setMarketOpen] = useState(() =>
    kr ? isKrMarketOpen() : isUSMarketOpen()
  );
  useEffect(() => {
    const check = () => setMarketOpen(kr ? isKrMarketOpen() : isUSMarketOpen());
    check();
    const id = setInterval(check, 60_000);
    return () => clearInterval(id);
  }, [kr]);

  const closedInfo   = getClosedText(kr);
  const closedTooltip = getMarketClosedTooltip(kr);

  // 투자 관련 상태
  const [holdings, setHoldings]       = useState<HoldingEnriched[]>([]);
  const [holdingsLoading, setHoldingsLoading] = useState(false);
  const [buying, setBuying]           = useState(false);
  const [selling, setSelling]         = useState<string | null>(null); // investmentId
  const [toast, setToast]             = useState<{ msg: string; ok: boolean } | null>(null);
  const [questPopup, setQuestPopup]   = useState<{ title: string; points: number } | null>(null);

  // 모바일 시트 상태
  const [showBuySheet,  setShowBuySheet]  = useState(false);
  const [showSellSheet, setShowSellSheet] = useState(false);
  const [keypadStr,     setKeypadStr]     = useState("");

  // 일반 토스트
  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  // 퀘스트 완료 팝업 (3초 후 사라짐)
  const showQuestPopup = (title: string, points: number) => {
    setQuestPopup({ title, points });
    setTimeout(() => setQuestPopup(null), 3500);
  };

  // 보유 현황 조회
  const fetchHoldings = useCallback(async () => {
    if (!userRow?.id) return;
    setHoldingsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;
      const res = await fetch(`/api/investments/holdings?ticker=${ticker}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.holdings) setHoldings(json.holdings as HoldingEnriched[]);
    } catch {
      // silent
    } finally {
      setHoldingsLoading(false);
    }
  }, [userRow?.id, ticker]);

  // 주가 조회 (초기 + 자동 갱신 공용)
  // 응답 바디의 __ttl 필드로 실제 Redis 잔여 TTL을 받아 카운트다운 초기화
  const doFetchPrice = useCallback(async (isInitial = false) => {
    if (!ticker) return;
    if (isInitial) setLoading(true);
    try {
      const res = await fetch(`/api/stocks?tickers=${ticker}`, { cache: "no-store" });
      const json = await res.json() as Record<string, unknown>;
      const raw = json[ticker] as { price: number; change: number; changePercent: number } | undefined;
      if (raw) setData(isKrTicker(ticker) ? formatKR(raw) : formatUS(raw));

      // __ttl: 서버가 Redis TTL 조회 후 바디에 포함 (캐시 히트 → 잔여 초 / 미스 → 900)
      const ttl = typeof json.__ttl === "number" ? Math.max(1, json.__ttl) : 15 * 60;
      updateFromTTL(ttl);
    } finally {
      if (isInitial) setLoading(false);
    }
  }, [ticker, updateFromTTL]);

  // 초기 로드
  useEffect(() => {
    doFetchPrice(true);
  }, [doFetchPrice]);

  // 전역 카운트다운이 0이 되면 가격 재조회 (interval은 StockCacheProvider가 담당)
  useEffect(() => {
    if (cacheTimeLeft === 0) {
      doFetchPrice(false);
    }
  }, [cacheTimeLeft, doFetchPrice]);

  useEffect(() => {
    if (kr) return;
    fetch("/api/exchange-rate")
      .then((r) => r.json())
      .then((d) => { if (d?.rate) setExchangeRate(d.rate); })
      .catch(() => {});
  }, [kr]);

  useEffect(() => {
    fetchHoldings();
  }, [fetchHoldings]);

  const up          = data?.up ?? true;
  const accentColor = up ? "#7ed4a0" : "#f07878";
  const accentBg    = up ? "rgba(126,212,160,0.1)" : "rgba(240,120,120,0.1)";
  const totalPoints = userRow?.total_points ?? 0;

  function addAmount(n: number) { setOrderAmt((p) => Math.min(p + n, totalPoints)); }
  function setAll()              { setOrderAmt(totalPoints); }
  function clearAmount()         { setOrderAmt(0); }

  // 모바일 키패드 핸들러
  const keypadAmt = Math.min(parseInt(keypadStr || "0", 10), totalPoints);

  function handleKeypad(key: string) {
    setKeypadStr((prev) => {
      if (key === "←") return prev.slice(0, -1);
      if (prev === "" && key === "0") return "";
      const next = prev + key;
      const n = parseInt(next, 10);
      if (n > totalPoints) return String(totalPoints);
      return next;
    });
  }

  function addKeypadAmount(n: number) {
    setKeypadStr((prev) => {
      const cur = parseInt(prev || "0", 10);
      const next = Math.min(cur + n, totalPoints);
      return next === 0 ? "" : String(next);
    });
  }

  // 구매 실행 (데스크탑·모바일 공용)
  async function executeBuy(amt: number) {
    if (amt < 100 || buying) return;
    setBuying(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) { showToast("로그인이 필요해요", false); return; }

      const res = await fetch("/api/investments/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ticker, investedPoints: amt }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        showToast(json.error ?? "구매에 실패했어요", false);
        return;
      }
      showToast(`${amt.toLocaleString("ko-KR")}P 구매 완료!`, true);
      if (json.isFirstInvestment) {
        setTimeout(() => showQuestPopup("첫 모의투자 퀘스트 완료!", 200), 500);
      }
      setOrderAmt(0);
      setKeypadStr("");
      setShowBuySheet(false);
      await fetchHoldings();
      window.dispatchEvent(new Event("pico:points:refresh"));
    } finally {
      setBuying(false);
    }
  }

  function handleBuy() { executeBuy(orderAmt); }

  // 매도 실행
  async function handleSell(investmentId: string) {
    if (selling) return;
    setSelling(investmentId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) { showToast("로그인이 필요해요", false); return; }

      const res = await fetch("/api/investments/sell", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ investmentId, ticker }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        showToast(json.error ?? "매도에 실패했어요", false);
        return;
      }
      const { finalPoints, profitLoss, questBonus } = json;
      const sign = profitLoss >= 0 ? "+" : "";
      showToast(`판매 완료! ${finalPoints.toLocaleString()}P 수령 (${sign}${profitLoss.toLocaleString()}P)`, true);
      // 수익 달성 퀘스트 완료 팝업
      if (questBonus > 0) {
        setTimeout(() => showQuestPopup("모의투자 수익 달성 퀘스트!", questBonus), 600);
      }
      await fetchHoldings();
      window.dispatchEvent(new Event("pico:points:refresh"));
    } finally {
      setSelling(null);
    }
  }

  // 이 종목 보유 중인 holding 목록
  const holdingList = holdings.filter((h) => h.status === "holding");
  const soldList    = holdings.filter((h) => h.status === "sold");

  // ─── 주문창 ──────────────────────────────────────────────────────────────────
  const orderPanel = (
    <>
      <Card className="order-card">
        {/* 매수/매도 탭 */}
        <div style={{ display: "flex", borderBottom: "0.5px solid rgba(255,255,255,0.06)" }}>
          {([["buy", "구매"], ["sell", "판매"]] as [OrderTab, string][]).map(([tab, label]) => (
            <button key={tab}
              onClick={() => { setOrderTab(tab); clearAmount(); }}
              className="order-tab"
              style={{
                flex: 1, padding: "14px 0", fontWeight: 600,
                border: "none", cursor: "pointer",
                background: orderTab === tab
                  ? (tab === "buy" ? "rgba(250,202,62,0.1)" : "rgba(240,120,120,0.1)")
                  : "transparent",
                color: orderTab === tab
                  ? (tab === "buy" ? "#FACA3E" : "#f07878")
                  : C.text2,
                borderBottom: orderTab === tab
                  ? `2px solid ${tab === "buy" ? "#FACA3E" : "#f07878"}`
                  : "2px solid transparent",
              }}
            >{label}</button>
          ))}
        </div>

        {orderTab === "buy" ? (
          /* ── 매수 패널 ── */
          <div style={{ padding: "16px 16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>

            {/* 주문 가능 포인트 */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="lbl" style={{ color: C.text2 }}>주문 가능 포인트</span>
              <span style={{ ...NUM_MONO, color: C.text }}>{totalPoints.toLocaleString("ko-KR")}P</span>
            </div>

            {/* 투자 금액 디스플레이 */}
            <div style={{
              background: C.inner, borderRadius: 12, padding: "14px 16px",
              border: "0.5px solid rgba(255,255,255,0.08)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <span className="lbl" style={{ color: C.text2 }}>투자 금액</span>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                <span style={{ ...NUM_MONO, fontSize: 22, color: orderAmt > 0 ? C.text : C.text2 }}>
                  {orderAmt > 0 ? orderAmt.toLocaleString("ko-KR") : "0"}
                </span>
                <span className="lbl" style={{ color: C.text2 }}>P</span>
                {orderAmt > 0 && (
                  <button onClick={clearAmount} style={{
                    background: "none", border: "none", color: C.text2,
                    fontSize: 14, cursor: "pointer", marginLeft: 6, padding: 0,
                  }}>✕</button>
                )}
              </div>
            </div>

            {/* 빠른 입력 버튼 */}
            <div style={{ display: "flex", gap: 8 }}>
              {[100, 500, 1000].map((n) => (
                <button key={n} onClick={() => addAmount(n)}
                  className="quick-btn lbl"
                  style={{
                    flex: 1, padding: "9px 0", fontWeight: 500,
                    borderRadius: 10, cursor: "pointer",
                    border: "0.5px solid rgba(250,202,62,0.2)",
                    background: "rgba(250,202,62,0.06)",
                    color: C.text2,
                  }}
                >+{n.toLocaleString()}P</button>
              ))}
              <button onClick={setAll}
                className="quick-btn lbl"
                style={{
                  flex: 1, padding: "9px 0", fontWeight: 500,
                  borderRadius: 10, cursor: "pointer",
                  border: "0.5px solid rgba(250,202,62,0.3)",
                  background: "rgba(250,202,62,0.1)",
                  color: "#FACA3E",
                }}
              >전체</button>
            </div>

            {/* 현재 등락률 미리보기 */}
            {orderAmt >= 100 && data && (
              <div className="lbl" style={{
                background: "rgba(255,255,255,0.02)", borderRadius: 10, padding: "10px 14px",
                display: "flex", justifyContent: "space-between", color: C.text2,
              }}>
                <span>현재 등락률</span>
                <span style={{ color: accentColor }}>{up ? "▲" : "▼"} {data.formattedChange}</span>
              </div>
            )}

            {/* 매수 버튼 */}
            <div style={{ position: "relative" }}>
              <button
                disabled={orderAmt < 100 || buying || !userRow || !marketOpen}
                onClick={handleBuy}
                title={!marketOpen ? closedTooltip : undefined}
                style={{
                  width: "100%",
                  background: !marketOpen
                    ? "#1e1e1e"
                    : orderAmt >= 100 && !buying ? "#FACA3E" : "#1e1e1e",
                  color: !marketOpen
                    ? "#555"
                    : orderAmt >= 100 && !buying ? "#0d0d0d" : C.text2,
                  fontSize: 15, fontWeight: 700,
                  padding: "16px 0", borderRadius: 14,
                  border: !marketOpen ? "0.5px solid rgba(255,255,255,0.06)" : "none",
                  cursor: (!marketOpen || orderAmt < 100 || buying) ? "not-allowed" : "pointer",
                  transition: "background 0.15s, color 0.15s",
                }}
              >
                {!marketOpen
                  ? "지금은 휴장 시간이에요 🌙"
                  : buying
                    ? "처리 중..."
                    : orderAmt < 100
                      ? "100P 이상 입력해 주세요"
                      : `${orderAmt.toLocaleString("ko-KR")}P 구매하기`
                }
              </button>
            </div>

            <p className="lbl" style={{ color: C.text2, textAlign: "center", margin: 0 }}>
              가상 투자 참고용 · 실제 거래 아님
            </p>
          </div>
        ) : (
          /* ── 매도 패널 ── */
          <div style={{ padding: "16px 16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
            {holdingsLoading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[1,2].map((i) => <Skeleton key={i} w="100%" h={72} radius={12} />)}
              </div>
            ) : holdingList.length === 0 ? (
              <div style={{ padding: "24px 0", textAlign: "center" }}>
                <div style={{ fontSize: 22, marginBottom: 8 }}>📭</div>
                <p className="lbl" style={{ color: C.text2, margin: 0, lineHeight: 1.7 }}>
                  보유 중인 {ticker} 종목이 없어요<br />
                  <span style={{ color: C.text2 }}>구매 탭에서 투자해 보세요</span>
                </p>
              </div>
            ) : (
              holdingList.map((h) => {
                const isProfit = h.profitLoss >= 0;
                const pl = h.profitLoss;
                const plColor = isProfit ? "#7ed4a0" : "#f07878";
                const rate = h.profitRate ?? 0;
                return (
                  <div key={h.id} style={{
                    background: C.inner, borderRadius: 12, padding: "14px",
                    border: "0.5px solid rgba(255,255,255,0.07)",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                      <div>
                        <div className="lbl" style={{ color: C.text2, marginBottom: 2 }}>
                          {new Date(h.buy_at).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })} 구매
                        </div>
                        <div style={{ ...NUM_MONO, fontSize: 16, color: C.text }}>
                          {h.invested_points.toLocaleString("ko-KR")}P 투자
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div className="lbl" style={{ color: C.text2, marginBottom: 2 }}>현재 평가</div>
                        <div style={{ ...NUM_MONO, fontSize: 16, color: plColor }}>
                          {h.currentValue.toLocaleString("ko-KR")}P
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span className="lbl" style={{ color: plColor }}>
                        {isProfit ? "▲" : "▼"} {isProfit ? "+" : ""}{pl.toLocaleString("ko-KR")}P ({rate >= 0 ? "+" : ""}{rate.toFixed(2)}%)
                      </span>
                      <button
                        onClick={() => !marketOpen ? undefined : handleSell(h.id)}
                        disabled={selling === h.id || !marketOpen}
                        title={!marketOpen ? closedTooltip : undefined}
                        style={{
                          padding: "8px 20px", borderRadius: 10,
                          background: !marketOpen || selling === h.id
                            ? "#1e1e1e"
                            : "rgba(240,120,120,0.15)",
                          border: `0.5px solid ${!marketOpen ? "rgba(255,255,255,0.06)" : "rgba(240,120,120,0.3)"}`,
                          color: !marketOpen || selling === h.id ? "#555" : "#f07878",
                          fontSize: 13, fontWeight: 600,
                          cursor: !marketOpen || selling === h.id ? "not-allowed" : "pointer",
                        }}
                      >
                        {selling === h.id ? "처리 중..." : !marketOpen ? "휴장 중" : "판매하기"}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </Card>

      {/* 내 투자 현황 */}
      <Card>
        <div style={{ padding: "16px 16px 12px", borderBottom: "0.5px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span className="sec-hd">내 투자 현황</span>
          {holdingList.length > 0 && (
            <span className="lbl" style={{ color: C.text2 }}>보유 {holdingList.length}건</span>
          )}
        </div>

        {holdingsLoading ? (
          <div style={{ padding: "16px" }}>
            <Skeleton w="100%" h={60} radius={10} />
          </div>
        ) : holdingList.length === 0 && soldList.length === 0 ? (
          <div style={{ padding: "28px 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <div style={{ fontSize: 24 }}>📊</div>
            <p className="lbl" style={{ color: C.text2, margin: 0, textAlign: "center", lineHeight: 1.7 }}>
              아직 보유 중인 종목이 없어요<br />
              <span style={{ color: C.text2 }}>매수하면 여기에 내역이 표시돼요</span>
            </p>
          </div>
        ) : (
          <div style={{ padding: "12px 16px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
            {/* 보유 중 */}
            {holdingList.map((h) => {
              const isProfit = h.profitLoss >= 0;
              const plColor = isProfit ? "#7ed4a0" : "#f07878";
              return (
                <div key={h.id} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  background: C.inner, borderRadius: 10, padding: "10px 12px",
                  border: "0.5px solid rgba(255,255,255,0.05)",
                }}>
                  <div>
                    <div className="lbl" style={{ color: C.text2 }}>보유 중</div>
                    <div style={{ ...NUM_MONO, fontSize: 14, color: C.text }}>{h.invested_points.toLocaleString()}P</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ ...NUM_MONO, fontSize: 14, color: plColor }}>{h.currentValue.toLocaleString()}P</div>
                    <div className="lbl" style={{ color: plColor }}>
                      {isProfit ? "+" : ""}{h.profitLoss.toLocaleString()}P ({(h.profitRate ?? 0) >= 0 ? "+" : ""}{(h.profitRate ?? 0).toFixed(1)}%)
                    </div>
                  </div>
                </div>
              );
            })}
            {/* 최근 매도 내역 (최대 3건) */}
            {soldList.slice(0, 3).map((h) => {
              const pl = h.profitLoss;
              const isProfit = pl >= 0;
              const plColor = isProfit ? "#7ed4a0" : "#f07878";
              return (
                <div key={h.id} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  background: C.inner, borderRadius: 10, padding: "10px 12px",
                  border: "0.5px solid rgba(255,255,255,0.05)",
                  opacity: 0.6,
                }}>
                  <div>
                    <div className="lbl" style={{ color: C.text2 }}>판매 완료</div>
                    <div style={{ ...NUM_MONO, fontSize: 14, color: C.text }}>{h.invested_points.toLocaleString()}P</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ ...NUM_MONO, fontSize: 14, color: C.text }}>{(h.final_points ?? 0).toLocaleString()}P</div>
                    <div className="lbl" style={{ color: plColor }}>
                      {isProfit ? "+" : ""}{pl.toLocaleString()}P
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </>
  );

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text }}>
      <style>{`
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes slideUp {
          from { transform: translateY(12px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }

        .lbl     { font-size: 12px; }
        .sec-hd  { font-size: 13px; font-weight: 600; color: ${C.text2}; }
        .card-lbl{ font-size: 11px; color: ${C.text2}; margin-bottom: 6px; }
        .card-val{ font-size: 13px; }
        .order-tab { font-size: 14px; transition: background 0.15s, color 0.15s; }
        .quick-btn { transition: background 0.12s; }
        .hero-usd   { font-size: 14px; }
        .hero-delay { font-size: 14px; }

        @media (min-width: 768px) {
          .lbl        { font-size: 14px; }
          .sec-hd     { font-size: 14px; }
          .card-lbl   { font-size: 14px; }
          .card-val   { font-size: 14px; }
          .hero-usd   { font-size: 18px; }
          .hero-delay { font-size: 18px; }
          .period-btn { font-size: 14px; }
          .hdr-stock-info { display: none; }
          .hdr-price      { display: none; }
        }

        .stock-outer { padding-bottom: 100px; }
        .stock-hero  { padding: 14px 14px 0; }
        .stock-body  { padding: 0 14px; display: flex; flex-direction: column; gap: 12px; margin-top: 12px; }
        .stock-left  { display: flex; flex-direction: column; gap: 12px; }
        .stock-right { display: none; }
        .mobile-trade-bar { display: flex; }

        @media (min-width: 768px) {
          .stock-outer { max-width: 1280px; margin: 0 auto; padding-bottom: 48px; }
          .stock-hero  { padding: 16px 20px 0; }
          .stock-body  { flex-direction: row; align-items: flex-start; padding: 0 20px; margin-top: 12px; gap: 16px; }
          .stock-left  { flex: 1 1 0; min-width: 0; }
          .stock-right { display: flex; flex-direction: column; gap: 12px; width: 340px; flex-shrink: 0; position: sticky; top: 70px; }
          .order-card  { height: 434px; overflow-y: auto; }
          .mobile-trade-bar { display: none !important; }
        }
      `}</style>

      {/* ── 토스트 알림 ───────────────────────────────────────────────────── */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)",
          zIndex: 9999, background: toast.ok ? "#1a2e1a" : "#2e1a1a",
          border: `0.5px solid ${toast.ok ? "rgba(126,212,160,0.3)" : "rgba(240,120,120,0.3)"}`,
          color: toast.ok ? "#7ed4a0" : "#f07878",
          padding: "12px 20px", borderRadius: 14, fontSize: 14, fontWeight: 600,
          whiteSpace: "nowrap", animation: "slideUp 0.2s ease",
          boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
        }}>
          {toast.ok ? "✓ " : "✕ "}{toast.msg}
        </div>
      )}

      {/* ── 퀘스트 완료 팝업 ────────────────────────────────────────────── */}
      {questPopup && (
        <div style={{
          position: "fixed", top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 10000,
          background: "#141414",
          border: "0.5px solid rgba(250,202,62,0.4)",
          borderRadius: 22,
          padding: "28px 32px",
          textAlign: "center",
          animation: "slideUp 0.25s ease",
          boxShadow: "0 8px 40px rgba(0,0,0,0.7)",
          minWidth: 240,
        }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>🎯</div>
          <div style={{ fontSize: 13, color: C.text2, marginBottom: 6, fontWeight: 500 }}>퀘스트 완료!</div>
          <div style={{ fontSize: 17, fontWeight: 700, color: C.text, marginBottom: 14 }}>{questPopup.title}</div>
          <div style={{
            display: "inline-block",
            background: "rgba(250,202,62,0.12)",
            border: "0.5px solid rgba(250,202,62,0.3)",
            borderRadius: 12, padding: "8px 20px",
          }}>
            <span style={{ fontSize: 22, fontWeight: 700, color: "#FACA3E", fontFamily: "var(--font-inter)" }}>
              +{questPopup.points}P
            </span>
          </div>
        </div>
      )}

      {/* ── 헤더 ──────────────────────────────────────────────────────────── */}
      <div style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(13,13,13,0.94)", backdropFilter: "blur(14px)",
        borderBottom: "0.5px solid rgba(255,255,255,0.07)",
        padding: "0 16px",
        height: 56, display: "flex", alignItems: "center", gap: 12,
      }}>
        <button onClick={() => router.back()} style={{
          background: "none", border: "none", cursor: "pointer",
          padding: "6px 8px 6px 4px", color: C.text2, fontSize: 20, lineHeight: 1, flexShrink: 0,
        }}>&lt;</button>
      </div>

      {/* ── 바디 ──────────────────────────────────────────────────────────── */}
      <div className="stock-outer">

        {/* ── 가격 히어로 ────────────────────────────────────────────────── */}
        <div className="stock-hero">
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            {logo
              ? <TickerLogo src={logo} ticker={ticker} size={22} />
              : <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#242424", flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 10, fontWeight: 600, color: C.text2 }}>{(meta?.name ?? ticker)[0]}</div>
            }
            <span style={{ fontSize: 15, fontWeight: 500, color: C.text }}>
              {meta?.name ?? ticker}
            </span>
            <span style={{ fontSize: 13, color: C.text2 }}>{ticker} · {exch}</span>
          </div>

          {loading ? (
            <><Skeleton w={200} h={36} radius={8} /><div style={{ height: 8 }} /><Skeleton w={130} h={16} radius={6} /></>
          ) : (
            <>
              <div style={{ ...NUM_MONO, fontSize: 38, fontWeight: 300, color: C.text, lineHeight: 1.1 }}>
                {kr ? data?.formattedPrice : data?.formattedKRW ?? "—"}
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8, flexWrap: "wrap" }}>
                <span style={{ ...NUM_MONO, fontSize: 14, color: accentColor, background: accentBg, padding: "4px 12px", borderRadius: 20 }}>
                  {up ? "▲" : "▼"} {data?.formattedChange ?? "—"}
                </span>
                {!kr && (
                  <span className="hero-usd" style={{ ...NUM_MONO, color: C.text2 }}>
                    {data?.formattedPrice ?? ""} 달러
                  </span>
                )}
                {!marketOpen && (
                  <span className="lbl" style={{ color: C.text2 }}>
                    🌙 {closedInfo.main.replace("🌙", "").trim()} · {closedInfo.sub}
                  </span>
                )}
                <span className="hero-delay" style={{ color: C.text2, marginLeft: "auto", fontVariantNumeric: "tabular-nums" }}>
                  {`${String(Math.floor(cacheTimeLeft / 60)).padStart(2, "0")}:${String(cacheTimeLeft % 60).padStart(2, "0")} 후 갱신`}
                </span>
              </div>
            </>
          )}
        </div>

        <div className="stock-body">

          {/* ── 왼쪽: 차트 + 종목정보 ─────────────────────────────────────── */}
          <div className="stock-left">

            <Card>
              <StockChart
                ticker={ticker} up={up} isKr={kr} exchangeRate={exchangeRate}
              />
            </Card>

            <Card style={{ padding: 16 }}>
              <div style={{ marginBottom: 12 }}>
                <span className="sec-hd">종목 정보</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[
                  { label: "현재가",   value: loading ? null : (kr ? data?.formattedPrice : data?.formattedKRW) ?? "—" },
                  {
                    label: "전일 대비",
                    value: loading ? null : data
                      ? (kr
                          ? (data.change >= 0 ? "+" : "") + data.change.toLocaleString("ko-KR") + "원"
                          : (data.change >= 0 ? "+" : "-") + "$" + Math.abs(data.change).toFixed(2))
                      : "—",
                    colored: true,
                  },
                  { label: "등락률",   value: loading ? null : data?.formattedChange ?? "—", colored: true },
                  { label: "시장",     value: kr ? "한국 KRX" : `미국 ${exch}` },
                  { label: "카테고리", value: meta?.category ?? "—" },
                  { label: "통화",     value: kr ? "KRW (원)" : "USD (달러)" },
                ].map(({ label, value, colored }) => (
                  <div key={label} style={{
                    background: C.inner, borderRadius: 12, padding: "12px 14px",
                    border: "0.5px solid rgba(255,255,255,0.05)",
                  }}>
                    <div className="card-lbl">{label}</div>
                    {loading
                      ? <Skeleton w="80%" h={13} />
                      : <div className="card-val" style={{ ...NUM_MONO, color: colored ? accentColor : C.text }}>{value}</div>
                    }
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* ── 오른쪽: 주문창 + 투자현황 ────────────────────────────────── */}
          <div className="stock-right">
            {orderPanel}
          </div>

        </div>
      </div>

      {/* ── 모바일 하단 거래 바 ──────────────────────────────────────────── */}
      <div className="mobile-trade-bar" style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 40,
        background: "rgba(13,13,13,0.97)", backdropFilter: "blur(20px)",
        borderTop: "0.5px solid rgba(255,255,255,0.08)",
        padding: "12px 16px 36px", gap: 10,
      }}>
        <button
          onClick={() => { setKeypadStr(""); setShowBuySheet(true); }}
          style={{
            flex: 1, padding: "16px 0", borderRadius: 14,
            background: "#FACA3E", color: "#0d0d0d",
            fontSize: 16, fontWeight: 700, border: "none", cursor: "pointer",
          }}
        >구매하기</button>
        <button
          onClick={() => setShowSellSheet(true)}
          style={{
            flex: 1, padding: "16px 0", borderRadius: 14,
            background: "rgba(240,120,120,0.15)",
            border: "0.5px solid rgba(240,120,120,0.3)",
            color: "#f07878", fontSize: 16, fontWeight: 700, cursor: "pointer",
          }}
        >판매하기</button>
      </div>

      {/* ── 모바일 구매 시트 ─────────────────────────────────────────────── */}
      {showBuySheet && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 100,
          background: "#0d0d0d", display: "flex", flexDirection: "column",
          overflow: "hidden",
        }}>
          {/* 헤더: < | 종목명 가운데 | 빈 영역 */}
          <div style={{
            height: 52, display: "flex", alignItems: "center", padding: "0 16px", flexShrink: 0,
            borderBottom: "0.5px solid rgba(255,255,255,0.07)", position: "relative",
          }}>
            <button onClick={() => setShowBuySheet(false)} style={{
              background: "none", border: "none", color: C.text2, fontSize: 20, cursor: "pointer", lineHeight: 1,
            }}>&lt;</button>
            <span style={{
              position: "absolute", left: "50%", transform: "translateX(-50%)",
              fontSize: 15, fontWeight: 600, color: C.text,
            }}>{meta?.name ?? ticker}</span>
          </div>

          {/* 정보 영역 — 스크롤 없이 고정 */}
          <div style={{ flexShrink: 0, padding: "12px 16px 0" }}>

            {/* 현재가 박스 */}
            <div style={{
              background: "#141414", borderRadius: 12, padding: "10px 16px",
              border: "0.5px solid rgba(255,255,255,0.07)", marginBottom: 8,
            }}>
              <div style={{ fontSize: 11, color: C.text2, marginBottom: 4 }}>현재가</div>
              <div style={{ fontSize: 22, fontWeight: 600, fontFamily: "var(--font-inter)", letterSpacing: "-0.02em", color: C.text }}>
                {kr ? data?.formattedPrice : data?.formattedKRW ?? "—"}
              </div>
              {!kr && <div style={{ fontSize: 11, color: C.text2, marginTop: 2 }}>{data?.formattedPrice ?? ""} 달러</div>}
            </div>

            {/* 주문 가능 포인트 */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, padding: "0 2px" }}>
              <span style={{ fontSize: 12, color: C.text2 }}>주문 가능 포인트</span>
              <span style={{ fontSize: 14, fontWeight: 600, fontFamily: "var(--font-inter)", color: C.text }}>
                {totalPoints.toLocaleString("ko-KR")}P
              </span>
            </div>

            {/* 투자 금액 박스 */}
            <div style={{
              background: "#141414", borderRadius: 12, padding: "10px 16px",
              border: "0.5px solid rgba(255,255,255,0.08)", marginBottom: 8,
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <span style={{ fontSize: 12, color: C.text2 }}>투자 금액</span>
              <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
                <span style={{
                  fontSize: 24, fontWeight: 300, fontFamily: "var(--font-inter)", letterSpacing: "-0.02em",
                  color: keypadAmt > 0 ? C.text : C.text2,
                }}>
                  {keypadAmt > 0 ? keypadAmt.toLocaleString("ko-KR") : "0"}
                </span>
                <span style={{ fontSize: 13, color: C.text2 }}>P</span>
              </div>
            </div>

            {/* 빠른 입력 버튼 */}
            <div style={{ display: "flex", gap: 6 }}>
              {[100, 500, 1000].map((n) => (
                <button key={n} onClick={() => addKeypadAmount(n)} style={{
                  flex: 1, padding: "8px 0", borderRadius: 10,
                  background: "rgba(250,202,62,0.06)", border: "0.5px solid rgba(250,202,62,0.2)",
                  color: C.text2, fontSize: 12, fontWeight: 500, cursor: "pointer",
                }}>+{n.toLocaleString()}P</button>
              ))}
              <button onClick={() => setKeypadStr(String(totalPoints))} style={{
                flex: 1, padding: "8px 0", borderRadius: 10,
                background: "rgba(250,202,62,0.1)", border: "0.5px solid rgba(250,202,62,0.3)",
                color: "#FACA3E", fontSize: 12, fontWeight: 600, cursor: "pointer",
              }}>전체</button>
            </div>
          </div>

          {/* 키패드 + 구매 버튼 — 남은 공간 채우기, 드래그 방지 */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "8px 16px 32px", userSelect: "none" }}>
            <div style={{
              flex: 1, minHeight: 0,
              display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gridTemplateRows: "repeat(4, 1fr)",
              gap: 5, marginBottom: 8,
            }}>
              {["1","2","3","4","5","6","7","8","9","00","0","←"].map((key) => (
                <button key={key} onClick={() => handleKeypad(key)} style={{
                  borderRadius: 10,
                  background: key === "←" ? "rgba(255,255,255,0.04)" : "#141414",
                  border: "0.5px solid rgba(255,255,255,0.07)",
                  color: C.text, fontSize: 18, fontWeight: 500,
                  fontFamily: "var(--font-inter)", cursor: "pointer",
                }}>{key}</button>
              ))}
            </div>

            <button
              disabled={keypadAmt < 100 || buying || !userRow || !marketOpen}
              onClick={() => executeBuy(keypadAmt)}
              style={{
                width: "100%", padding: "15px 0", borderRadius: 14, border: "none", flexShrink: 0,
                background: !marketOpen
                  ? "#1e1e1e"
                  : keypadAmt >= 100 && !buying ? "#FACA3E" : "#1e1e1e",
                color: !marketOpen
                  ? "#555"
                  : keypadAmt >= 100 && !buying ? "#0d0d0d" : C.text2,
                fontSize: 16, fontWeight: 700,
                cursor: (!marketOpen || keypadAmt < 100 || buying) ? "not-allowed" : "pointer",
                transition: "background 0.15s, color 0.15s",
              }}
            >
              {!marketOpen
                ? "지금은 휴장 시간이에요 🌙"
                : buying ? "처리 중..."
                : keypadAmt < 100 ? "100P 이상 입력해 주세요"
                : `${keypadAmt.toLocaleString("ko-KR")}P 구매하기`}
            </button>
          </div>
        </div>
      )}

      {/* ── 모바일 판매 시트 ─────────────────────────────────────────────── */}
      {showSellSheet && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 100,
          background: "#0d0d0d", display: "flex", flexDirection: "column",
        }}>
          {/* 헤더 */}
          <div style={{
            height: 56, display: "flex", alignItems: "center", padding: "0 16px", gap: 12, flexShrink: 0,
            borderBottom: "0.5px solid rgba(255,255,255,0.07)",
          }}>
            <button onClick={() => setShowSellSheet(false)} style={{
              background: "none", border: "none", color: C.text2, fontSize: 20, cursor: "pointer", lineHeight: 1,
            }}>&lt;</button>
            <span style={{ fontSize: 16, fontWeight: 600 }}>판매하기</span>
            <span style={{ fontSize: 13, color: C.text2 }}>{ticker}</span>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "20px 16px 40px" }}>
            {holdingsLoading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[1, 2].map((i) => <Skeleton key={i} w="100%" h={96} radius={14} />)}
              </div>
            ) : holdingList.length === 0 ? (
              <div style={{ padding: "60px 0", textAlign: "center" }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>📭</div>
                <p style={{ fontSize: 14, color: C.text2, lineHeight: 1.8, margin: 0 }}>
                  보유 중인 {ticker} 종목이 없어요<br />
                  구매하기에서 투자해 보세요
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {holdingList.map((h) => {
                  const isProfit = h.profitLoss >= 0;
                  const pl = h.profitLoss;
                  const plColor = isProfit ? "#7ed4a0" : "#f07878";
                  const rate = h.profitRate ?? 0;
                  return (
                    <div key={h.id} style={{
                      background: "#141414", borderRadius: 16, padding: "16px",
                      border: "0.5px solid rgba(255,255,255,0.07)",
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                        <div>
                          <div style={{ fontSize: 12, color: C.text2, marginBottom: 4 }}>
                            {new Date(h.buy_at).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })} 구매
                          </div>
                          <div style={{ fontSize: 18, fontWeight: 500, fontFamily: "var(--font-inter)", letterSpacing: "-0.01em" }}>
                            {h.invested_points.toLocaleString("ko-KR")}P
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 12, color: C.text2, marginBottom: 4 }}>현재 평가</div>
                          <div style={{ fontSize: 18, fontWeight: 500, color: plColor, fontFamily: "var(--font-inter)", letterSpacing: "-0.01em" }}>
                            {h.currentValue.toLocaleString("ko-KR")}P
                          </div>
                        </div>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 13, color: plColor }}>
                          {isProfit ? "▲" : "▼"} {isProfit ? "+" : ""}{pl.toLocaleString("ko-KR")}P ({rate >= 0 ? "+" : ""}{rate.toFixed(2)}%)
                        </span>
                        <button
                          onClick={() => !marketOpen ? undefined : handleSell(h.id)}
                          disabled={selling === h.id || !marketOpen}
                          title={!marketOpen ? closedTooltip : undefined}
                          style={{
                            padding: "10px 24px", borderRadius: 12,
                            background: !marketOpen || selling === h.id ? "#1e1e1e" : "rgba(240,120,120,0.15)",
                            border: `0.5px solid ${!marketOpen ? "rgba(255,255,255,0.06)" : "rgba(240,120,120,0.3)"}`,
                            color: !marketOpen || selling === h.id ? "#555" : "#f07878",
                            fontSize: 14, fontWeight: 700,
                            cursor: !marketOpen || selling === h.id ? "not-allowed" : "pointer",
                          }}
                        >
                          {selling === h.id ? "처리 중..." : !marketOpen ? "휴장 중" : "판매하기"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
