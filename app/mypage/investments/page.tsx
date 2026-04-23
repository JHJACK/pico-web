"use client";

import { useState, useEffect, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/lib/authContext";
import { supabase } from "@/app/lib/supabase";
import { STOCK_META, KR_STOCK_META, isKrTicker } from "@/app/lib/stockNames";
import { fetchStocks, type StocksMap } from "@/app/lib/stocks";

type Holding = {
  ticker: string;
  invested_points: number;
  currentValue: number;
  profitLoss: number;
  profitRate: number;
  status: string;
};

type GroupedHolding = Holding;

const NUM_MONO: CSSProperties = {
  fontFamily: "var(--font-inter), monospace",
  fontWeight: 300,
  letterSpacing: "-0.02em",
};

function Skeleton({ w = "100%", h = 18 }: { w?: string | number; h?: number }) {
  return <div className="skeleton" style={{ width: w, height: h }} />;
}

function TickerLogo({ src, ticker, size = 40 }: { src: string; ticker: string; size?: number }) {
  const [err, setErr] = useState(false);
  if (err) return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: "#242424",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.4, fontWeight: 600, color: "#c8bfb0", flexShrink: 0 }}>
      {ticker[0]}
    </div>
  );
  return (
    <img src={src} alt={ticker} width={size} height={size}
      style={{ width: size, height: size, borderRadius: "50%", objectFit: "contain",
        background: "#fff", flexShrink: 0 }}
      onError={() => setErr(true)} />
  );
}

export default function InvestmentsPage() {
  const router = useRouter();
  const { user, userRow, loading } = useAuth();
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [stocks, setStocks]     = useState<StocksMap>({});
  const [fetched, setFetched]   = useState(false);
  const [stocksLoading, setStocksLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.replace("/mypage");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;
      const res  = await fetch("/api/investments/holdings", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.holdings) {
        const active = (json.holdings as Holding[]).filter((h) => h.status === "holding");
        setHoldings(active);

        const tickers = [...new Set(active.map((h) => h.ticker))];
        if (tickers.length > 0) {
          fetchStocks(tickers).then((data) => {
            setStocks(data);
            setStocksLoading(false);
          });
        } else {
          setStocksLoading(false);
        }
      }
      setFetched(true);
    })();
  }, [user]);

  if (loading) return null;
  if (!user || !userRow) return null;

  // 같은 티커 합산
  const grouped: GroupedHolding[] = Object.values(
    holdings.reduce<Record<string, GroupedHolding>>((acc, h) => {
      if (!acc[h.ticker]) {
        acc[h.ticker] = { ...h };
      } else {
        acc[h.ticker].invested_points += h.invested_points;
        acc[h.ticker].currentValue    += h.currentValue;
        acc[h.ticker].profitLoss      += h.profitLoss;
      }
      return acc;
    }, {})
  ).map(h => ({
    ...h,
    profitRate: h.invested_points > 0 ? (h.profitLoss / h.invested_points) * 100 : 0,
  }));

  const totalInvested = holdings.reduce((s, h) => s + h.invested_points, 0);
  const totalValue    = holdings.reduce((s, h) => s + h.currentValue, 0);
  const totalPL       = totalValue - totalInvested;
  const totalPLRate   = totalInvested > 0 ? (totalPL / totalInvested) * 100 : 0;
  const isProfit      = totalPL >= 0;

  return (
    <main className="min-h-screen" style={{ background: "#0d0d0d", fontFamily: "var(--font-paperlogy), var(--font-noto), sans-serif" }}>
      {/* 네비 */}
      <nav className="sticky top-0 z-30 border-b flex items-center gap-4 px-5"
        style={{ height: 56, background: "rgba(13,13,13,0.96)",
          backdropFilter: "blur(20px)", borderColor: "rgba(255,255,255,0.06)" }}>
        <button
          onClick={() => router.back()}
          style={{ fontSize: 22, color: "#c8bfb0", background: "none", border: "none",
            cursor: "pointer", lineHeight: 1, padding: "4px 4px 4px 0" }}>
          ‹
        </button>
        <span style={{ fontFamily: "var(--font-paperlogy)", fontSize: 17, fontWeight: 600, color: "#e8e0d0" }}>
          내 투자 현황
        </span>
      </nav>

      <div className="mx-auto py-6"
        style={{ maxWidth: 700, paddingLeft: "clamp(16px, 4vw, 20px)", paddingRight: "clamp(16px, 4vw, 20px)" }}>

        {/* 요약 카드 */}
        <div style={{ background: "#1c1c1c", borderRadius: 20, padding: "20px",
          marginBottom: 16, border: "0.5px solid rgba(255,255,255,0.08)" }}>
          <p style={{ fontSize: 13, color: "#c8bfb0", marginBottom: 8,
            fontFamily: "var(--font-paperlogy)", fontWeight: 400 }}>총 평가 포인트</p>

          {!fetched ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <Skeleton w="55%" h={36} /><Skeleton w="40%" h={20} />
            </div>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <div style={{ ...NUM_MONO, fontSize: 36, fontWeight: 700, color: "#FACA3E",
                  fontFamily: "var(--font-paperlogy)", letterSpacing: "-0.02em", lineHeight: 1 }}>
                  {totalValue.toLocaleString("ko-KR")}
                  <span style={{ fontSize: 20, fontWeight: 600, marginLeft: 3 }}>P</span>
                </div>
                {grouped.length > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6,
                    background: isProfit ? "rgba(126,212,160,0.08)" : "rgba(240,120,120,0.08)",
                    border: `0.5px solid ${isProfit ? "rgba(126,212,160,0.2)" : "rgba(240,120,120,0.2)"}`,
                    borderRadius: 10, padding: "8px 12px", flexShrink: 0 }}>
                    <span style={{ fontSize: 16 }}>{isProfit ? "🔥" : "❄️"}</span>
                    <span style={{ ...NUM_MONO, fontSize: 14, fontWeight: 600,
                      color: isProfit ? "#7ed4a0" : "#f07878" }}>
                      {isProfit ? "+" : ""}{totalPL.toLocaleString("ko-KR")}P
                    </span>
                    <span style={{ ...NUM_MONO, fontSize: 13,
                      color: isProfit ? "#7ed4a0" : "#f07878", opacity: 0.8 }}>
                      ({isProfit ? "+" : ""}{totalPLRate.toFixed(1)}%)
                    </span>
                  </div>
                )}
              </div>
              <div style={{ marginTop: 8, display: "flex", gap: 16 }}>
                <span style={{ fontSize: "clamp(13px, 1.5vw, 15px)", color: "#c8bfb0", fontFamily: "var(--font-paperlogy)" }}>
                  총 투자 포인트 <span style={{ ...NUM_MONO, color: "#c8bfb0" }}>{totalInvested.toLocaleString("ko-KR")}P</span>
                </span>
                <span style={{ fontSize: "clamp(13px, 1.5vw, 15px)", color: "#c8bfb0", fontFamily: "var(--font-paperlogy)" }}>
                  종목 수 <span style={{ ...NUM_MONO, color: "#c8bfb0" }}>{grouped.length}개</span>
                </span>
              </div>
            </>
          )}
        </div>

        {/* 종목 리스트 */}
        <div style={{ background: "#1c1c1c", borderRadius: 20,
          border: "0.5px solid rgba(255,255,255,0.08)", overflow: "hidden" }}>

          {!fetched ? (
            <div style={{ display: "flex", flexDirection: "column", padding: "4px 0" }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 14,
                  padding: "14px 20px",
                  borderBottom: i < 5 ? "0.5px solid rgba(255,255,255,0.05)" : "none" }}>
                  <div style={{ width: 42, height: 42, borderRadius: "50%", background: "#242424", flexShrink: 0 }} />
                  <div style={{ flex: 1 }}><Skeleton w="50%" h={15} /><div style={{ height: 5 }} /><Skeleton w="30%" h={12} /></div>
                  <div style={{ textAlign: "right" }}><Skeleton w={70} h={15} /><div style={{ height: 5 }} /><Skeleton w={50} h={12} /></div>
                </div>
              ))}
            </div>
          ) : grouped.length === 0 ? (
            <div style={{ padding: "48px 20px", textAlign: "center" }}>
              <div style={{ fontSize: 40, marginBottom: 14 }}>🎯</div>
              <p style={{ fontSize: 15, color: "#5c5448", fontFamily: "var(--font-paperlogy)", fontWeight: 300 }}>
                아직 투자한 종목이 없어요
              </p>
              <button onClick={() => router.push("/?tab=play")}
                className="pico-btn"
                style={{ marginTop: 20, background: "rgba(250,202,62,0.1)", color: "#FACA3E",
                  border: "0.5px solid rgba(250,202,62,0.3)", borderRadius: 12,
                  padding: "10px 20px", fontSize: 14, fontWeight: 500,
                  fontFamily: "var(--font-paperlogy)", cursor: "pointer" }}>
                PICO Play에서 투자하기 →
              </button>
            </div>
          ) : (
            grouped.map((h, i) => {
              const up   = h.profitLoss >= 0;
              const kr   = isKrTicker(h.ticker);
              const meta = kr ? KR_STOCK_META[h.ticker] : STOCK_META[h.ticker];
              const logo = !kr ? `https://financialmodelingprep.com/image-stock/${h.ticker}.png` : null;
              return (
                <button key={h.ticker}
                  onClick={() => router.push(`/mypage/investments/${h.ticker}`)}
                  className="pico-btn w-full"
                  style={{ background: "none", border: "none", cursor: "pointer", textAlign: "left",
                    padding: "14px 20px",
                    borderBottom: i < grouped.length - 1 ? "0.5px solid rgba(255,255,255,0.05)" : "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    {logo
                      ? <TickerLogo src={logo} ticker={h.ticker} size={42} />
                      : <div style={{ width: 42, height: 42, borderRadius: "50%", background: "#242424",
                          flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 17, fontWeight: 600, color: "#c8bfb0" }}>
                          {(meta?.name ?? h.ticker)[0]}
                        </div>
                    }
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 500, color: "#e8e0d0",
                        fontFamily: "var(--font-paperlogy)",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {meta?.name ?? h.ticker}
                      </div>
                      <div style={{ marginTop: 3 }}>
                        {stocksLoading
                          ? <Skeleton w={60} h={12} />
                          : <span style={{ fontSize: 13, color: "#c8bfb0", fontFamily: "var(--font-paperlogy)" }}>
                              총 투자 포인트 {h.invested_points.toLocaleString()}P
                            </span>
                        }
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ ...NUM_MONO, fontSize: 15, fontWeight: 600,
                        color: up ? "#7ed4a0" : "#f07878" }}>
                        {up ? "+" : ""}{h.profitLoss.toLocaleString()}P
                      </div>
                      <div style={{ ...NUM_MONO, fontSize: 13, marginTop: 2,
                        color: up ? "#7ed4a0" : "#f07878", opacity: 0.85 }}>
                        {up ? "+" : ""}{h.profitRate.toFixed(2)}%
                      </div>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        <p style={{ fontSize: 12, color: "#c8bfb0", textAlign: "center", marginTop: 20,
          fontFamily: "var(--font-paperlogy)", fontWeight: 300, opacity: 0.5 }}>
          15분 지연 · 투자 참고용
        </p>
      </div>
    </main>
  );
}
