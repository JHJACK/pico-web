"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchStocks, type StockData } from "@/app/lib/stocks";
import { STOCK_META, KR_STOCK_META, isKrTicker } from "@/app/lib/stockNames";
import { useAuth } from "@/app/lib/authContext";

// ─── TradingView 설정 ─────────────────────────────────────────────────────────
const TV_EXCHANGE: Record<string, string> = {
  NVDA:"NASDAQ", AMD:"NASDAQ", MSFT:"NASDAQ", AVGO:"NASDAQ", ARM:"NASDAQ",
  AAPL:"NASDAQ", GOOGL:"NASDAQ", AMZN:"NASDAQ", TSLA:"NASDAQ", META:"NASDAQ",
  NFLX:"NASDAQ", PLTR:"NYSE",  ABNB:"NASDAQ", SBUX:"NASDAQ", QQQ:"NASDAQ",
  ARKK:"AMEX",  SOXX:"NASDAQ", TSM:"NYSE", LLY:"NYSE", UBER:"NYSE",
  SPOT:"NYSE",  NKE:"NYSE",   JPM:"NYSE",  V:"NYSE", SPY:"AMEX",
};
const TV_PERIOD: Record<string, string> = { "1D": "5", "1W": "60", "1M": "D", "1Y": "W" };
type Period = "1D" | "1W" | "1M" | "1Y";
type OrderTab = "buy" | "sell";

// ─── 디자인 시스템 색상 ───────────────────────────────────────────────────────
const C = {
  text:  "#e8e0d0",   // 본문 주력
  text2: "#c8bfb0",   // 라벨·보조 텍스트
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
function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
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
  const exch   = kr ? "KRX" : (TV_EXCHANGE[ticker] ?? "NASDAQ");
  const tvSym  = encodeURIComponent(`${exch}:${ticker}`);

  const [period, setPeriod]     = useState<Period>("1M");
  const [data, setData]         = useState<StockData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [orderTab, setOrderTab] = useState<OrderTab>("buy");
  const [orderAmt, setOrderAmt] = useState(0);

  const tvUrl = [
    "https://s.tradingview.com/widgetembed/",
    `?symbol=${tvSym}`,
    `&interval=${TV_PERIOD[period]}`,
    "&theme=dark&style=3&locale=kr",
    `&backgroundColor=%23141414`,
    "&hideideas=1&hidesidetoolbar=1&hidetoptoolbar=1",
    "&withdateranges=0&hide_top_toolbar=1",
    "&saveimage=0&calendar=0&studies=[]&show_popup_button=0",
  ].join("");

  useEffect(() => {
    if (!ticker) return;
    setLoading(true);
    fetchStocks([ticker]).then((map) => {
      setData(map[ticker] ?? null);
      setLoading(false);
    });
  }, [ticker]);

  const up          = data?.up ?? true;
  const accentColor = up ? "#7ed4a0" : "#f07878";
  const accentBg    = up ? "rgba(126,212,160,0.1)" : "rgba(240,120,120,0.1)";
  const totalPoints = userRow?.total_points ?? 0;

  function addAmount(n: number) { setOrderAmt((p) => Math.min(p + n, totalPoints)); }
  function setAll()              { setOrderAmt(totalPoints); }
  function clearAmount()         { setOrderAmt(0); }

  // ─── 주문창 ──────────────────────────────────────────────────────────────────
  const orderPanel = (
    <>
      <Card>
        {/* 매수/매도 탭 */}
        <div style={{ display: "flex", borderBottom: "0.5px solid rgba(255,255,255,0.06)" }}>
          {([["buy", "매수"], ["sell", "매도"]] as [OrderTab, string][]).map(([tab, label]) => (
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

          {/* 주문 버튼 */}
          <button disabled={orderAmt < 100}
            style={{
              width: "100%",
              background: orderAmt >= 100
                ? (orderTab === "buy" ? "#FACA3E" : "#f07878")
                : "#1e1e1e",
              color: orderAmt >= 100
                ? (orderTab === "buy" ? "#0d0d0d" : "#fff")
                : C.text2,
              fontSize: 15, fontWeight: 700,
              padding: "16px 0", borderRadius: 14, border: "none",
              cursor: orderAmt >= 100 ? "pointer" : "not-allowed",
              transition: "background 0.15s, color 0.15s",
            }}
          >
            {orderAmt < 100
              ? "100P 이상 입력해 주세요"
              : `${orderAmt.toLocaleString("ko-KR")}P ${orderTab === "buy" ? "매수하기" : "매도하기"}`
            }
          </button>

          <p className="lbl" style={{ color: C.text2, textAlign: "center", margin: 0 }}>
            가상 투자 참고용 · 실제 거래 아님
          </p>
        </div>
      </Card>

      {/* 내 투자 현황 */}
      <Card>
        <div style={{ padding: "16px 16px 12px", borderBottom: "0.5px solid rgba(255,255,255,0.05)" }}>
          <span className="sec-hd">내 투자 현황</span>
        </div>
        {/* TODO: mock_investments 테이블 연동 후 실제 보유 내역 표시 */}
        <div style={{ padding: "28px 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <div style={{ fontSize: 24 }}>📊</div>
          <p className="lbl" style={{ color: C.text2, margin: 0, textAlign: "center", lineHeight: 1.7 }}>
            아직 보유 중인 종목이 없어요<br />
            <span style={{ color: C.text2 }}>매수하면 여기에 내역이 표시돼요</span>
          </p>
        </div>
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

        /* ── 공통 텍스트 클래스 (모바일 기본값) ── */
        .lbl     { font-size: 12px; }
        .sec-hd  { font-size: 13px; font-weight: 600; color: ${C.text2}; }
        .card-lbl{ font-size: 11px; color: ${C.text2}; margin-bottom: 6px; }
        .card-val{ font-size: 13px; }
        .order-tab { font-size: 14px; transition: background 0.15s, color 0.15s; }
        .quick-btn { transition: background 0.12s; }

        /* ── 웹(≥768px): 14px 미만 폰트 전부 14px로 ── */
        @media (min-width: 768px) {
          .lbl      { font-size: 14px; }
          .sec-hd   { font-size: 14px; }
          .card-lbl { font-size: 14px; }
          .card-val { font-size: 14px; }
          .hdr-sub  { font-size: 14px; }
          .hero-usd { font-size: 14px; }
          .hero-delay { font-size: 14px; }
          .period-btn { font-size: 14px; }
        }

        /* ── 데스크탑 2열 레이아웃 ── */
        .stock-outer { padding-bottom: 48px; }
        .stock-body  { padding: 14px 14px 0; display: flex; flex-direction: column; gap: 12px; }
        .stock-left  { display: flex; flex-direction: column; gap: 12px; }
        .stock-right { display: flex; flex-direction: column; gap: 12px; }

        @media (min-width: 768px) {
          .stock-outer { max-width: 1280px; margin: 0 auto; }
          .stock-body  { flex-direction: row; align-items: flex-start; padding: 16px 20px 0; gap: 16px; }
          .stock-left  { flex: 1 1 0; min-width: 0; }
          .stock-right { width: 340px; flex-shrink: 0; position: sticky; top: 70px; }
        }
      `}</style>

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
        }}>←</button>

        {logo
          ? <TickerLogo src={logo} ticker={ticker} size={30} />
          : <div style={{
              width: 30, height: 30, borderRadius: "50%", background: "#242424", flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 600, color: C.text2,
            }}>{(meta?.name ?? ticker)[0]}</div>
        }

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 500, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {meta?.name ?? ticker}
          </div>
          <div className="hdr-sub" style={{ fontSize: 12, color: C.text2 }}>{ticker} · {exch}</div>
        </div>

        <div style={{ textAlign: "right", flexShrink: 0 }}>
          {loading
            ? <><Skeleton w={68} h={13} /><div style={{ height: 4 }} /><Skeleton w={48} h={11} /></>
            : <>
              <div style={{ ...NUM_MONO, fontSize: 14, color: C.text }}>
                {kr ? data?.formattedPrice : data?.formattedKRW ?? "—"}
              </div>
              <div style={{ ...NUM_MONO, fontSize: 13, color: accentColor }}>
                {up ? "▲" : "▼"} {data?.formattedChange ?? "—"}
              </div>
            </>
          }
        </div>
      </div>

      {/* ── 바디 ──────────────────────────────────────────────────────────── */}
      <div className="stock-outer">
        <div className="stock-body">

          {/* ── 왼쪽: 가격 + 차트 + 종목정보 ─────────────────────────────── */}
          <div className="stock-left">

            {/* 가격 히어로 */}
            <div style={{ padding: "4px 4px 0" }}>
              {loading ? (
                <><Skeleton w={200} h={36} radius={8} /><div style={{ height: 8 }} /><Skeleton w={130} h={16} radius={6} /></>
              ) : (
                <>
                  <div style={{ ...NUM_MONO, fontSize: 38, fontWeight: 300, color: C.text, lineHeight: 1.1 }}>
                    {kr ? data?.formattedPrice : data?.formattedKRW ?? "—"}
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
                    <span style={{ ...NUM_MONO, fontSize: 14, color: accentColor, background: accentBg, padding: "4px 12px", borderRadius: 20 }}>
                      {up ? "▲" : "▼"} {data?.formattedChange ?? "—"}
                    </span>
                    {!kr && (
                      <span className="hero-usd" style={{ ...NUM_MONO, fontSize: 13, color: C.text2 }}>
                        {data?.formattedPrice ?? ""}
                      </span>
                    )}
                    <span className="hero-delay" style={{ fontSize: 12, color: C.text2, marginLeft: "auto" }}>
                      15분 지연
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* 차트 카드 */}
            <Card>
              <div style={{ display: "flex", gap: 4, padding: "12px 14px 10px", borderBottom: "0.5px solid rgba(255,255,255,0.05)" }}>
                {(["1D", "1W", "1M", "1Y"] as Period[]).map((p) => (
                  <button key={p} onClick={() => setPeriod(p)}
                    className="period-btn"
                    style={{
                      fontSize: 12, fontWeight: 500, padding: "5px 14px", borderRadius: 20,
                      border: `0.5px solid ${period === p ? "rgba(250,202,62,0.4)" : "rgba(255,255,255,0.08)"}`,
                      background: period === p ? "rgba(250,202,62,0.12)" : "transparent",
                      color: period === p ? "#FACA3E" : C.text2,
                      cursor: "pointer",
                      transition: "background 0.15s, color 0.15s",
                    }}
                  >{p}</button>
                ))}
              </div>
              <div style={{ height: 380 }}>
                <iframe
                  key={`${ticker}-${period}`}
                  src={tvUrl}
                  style={{ width: "100%", height: "100%", border: "none", display: "block" }}
                  allowFullScreen
                />
              </div>
            </Card>

            {/* 종목 정보 카드 */}
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
    </div>
  );
}
