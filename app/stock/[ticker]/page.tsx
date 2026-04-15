"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchStocks, type StockData } from "@/app/lib/stocks";
import {
  STOCK_META,
  KR_STOCK_META,
  isKrTicker,
} from "@/app/lib/stockNames";

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

// ─── 숫자 폰트 스타일 ───────────────────────────────────────────────────────────
const NUM_MONO = {
  fontFamily: "var(--font-inter), monospace",
  fontWeight: 300,
  letterSpacing: "-0.02em",
} as const;

// ─── 로고 컴포넌트 ─────────────────────────────────────────────────────────────
function TickerLogo({ src, ticker, size = 40 }: { src: string; ticker: string; size?: number }) {
  const [err, setErr] = useState(false);
  if (err) return (
    <div style={{
      width: size, height: size, borderRadius: 10, background: "#242424",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.4, fontWeight: 600, color: "#a09688", flexShrink: 0,
    }}>
      {ticker[0]}
    </div>
  );
  return (
    <img src={src} alt={ticker} width={size} height={size}
      style={{ width: size, height: size, borderRadius: 10, objectFit: "contain", background: "#fff", flexShrink: 0 }}
      onError={() => setErr(true)}
    />
  );
}

// ─── 스켈레톤 ────────────────────────────────────────────────────────────────
function Skeleton({ w, h }: { w: number; h: number }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: 4,
      background: "linear-gradient(90deg,#1e1e1e 25%,#2a2a2a 50%,#1e1e1e 75%)",
      backgroundSize: "200% 100%",
      animation: "shimmer 1.4s infinite",
    }} />
  );
}

// ─── 메인 페이지 ──────────────────────────────────────────────────────────────
export default function StockChartPage() {
  const params = useParams();
  const router = useRouter();
  const ticker = (params?.ticker as string ?? "").toUpperCase();

  const [period, setPeriod] = useState<Period>("1M");
  const [data, setData] = useState<StockData | null>(null);
  const [loading, setLoading] = useState(true);

  const kr   = isKrTicker(ticker);
  const meta = kr ? KR_STOCK_META[ticker] : STOCK_META[ticker];
  const logo = !kr ? `https://financialmodelingprep.com/image-stock/${ticker}.png` : null;
  const exch = kr ? "KRX" : (TV_EXCHANGE[ticker] ?? "NASDAQ");
  const tvSym = encodeURIComponent(`${exch}:${ticker}`);
  const tvUrl = `https://s.tradingview.com/widgetembed/?hideideas=1&symbol=${tvSym}&interval=${TV_PERIOD[period]}&hidesidetoolbar=1&hidetoptoolbar=1&theme=dark&style=3&locale=kr&backgroundColor=%230d0d0d`;

  useEffect(() => {
    if (!ticker) return;
    setLoading(true);
    fetchStocks([ticker]).then((map) => {
      setData(map[ticker] ?? null);
      setLoading(false);
    });
  }, [ticker]);

  const up = data?.up ?? true;
  const accentColor = up ? "#7ed4a0" : "#f07878";

  return (
    <div style={{ minHeight: "100vh", background: "#0d0d0d", color: "#e8e0d0", display: "flex", flexDirection: "column" }}>
      {/* 글로벌 shimmer 애니메이션 */}
      <style>{`
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      {/* ─── 헤더 ──────────────────────────────────────────────────────────── */}
      <div style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(13,13,13,0.92)", backdropFilter: "blur(12px)",
        borderBottom: "0.5px solid rgba(255,255,255,0.07)",
        padding: "0 20px",
        height: 56, display: "flex", alignItems: "center", gap: 14,
      }}>
        <button
          onClick={() => router.back()}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 4,
            color: "#a09688", fontSize: 20, lineHeight: 1, flexShrink: 0 }}
        >
          ←
        </button>
        {logo
          ? <TickerLogo src={logo} ticker={ticker} size={30} />
          : <div style={{ width: 30, height: 30, borderRadius: 8, background: "#242424", flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13, fontWeight: 600, color: "#a09688" }}>{(meta?.name ?? ticker)[0]}</div>
        }
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {meta?.name ?? ticker}
          </div>
          <div style={{ fontSize: 11, color: "#5c5448" }}>{ticker} · {exch}</div>
        </div>
        {/* 가격 (헤더 우측) */}
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          {loading
            ? <><Skeleton w={72} h={14} /><div style={{ height: 4 }} /><Skeleton w={50} h={11} /></>
            : <>
              <div style={{ ...NUM_MONO, fontSize: 15, color: "#e8e0d0" }}>
                {kr ? (data?.formattedPrice ?? "—") : (data?.formattedKRW ?? "—")}
              </div>
              <div style={{ ...NUM_MONO, fontSize: 12, color: accentColor }}>
                {up ? "▲" : "▼"} {data?.formattedChange ?? "—"}
              </div>
            </>
          }
        </div>
      </div>

      {/* ─── 가격 히어로 ──────────────────────────────────────────────────────── */}
      <div style={{ padding: "28px 24px 20px" }}>
        {loading ? (
          <><Skeleton w={180} h={40} /><div style={{ height: 10 }} /><Skeleton w={120} h={18} /></>
        ) : (
          <>
            <div style={{ ...NUM_MONO, fontSize: 42, fontWeight: 300, color: "#e8e0d0", lineHeight: 1.1 }}>
              {kr ? (data?.formattedPrice ?? "—") : (data?.formattedKRW ?? "—")}
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 8 }}>
              <span style={{
                ...NUM_MONO, fontSize: 15, color: accentColor,
                background: up ? "rgba(126,212,160,0.1)" : "rgba(240,120,120,0.1)",
                padding: "3px 10px", borderRadius: 20,
              }}>
                {up ? "▲" : "▼"} {data?.formattedChange ?? "—"}
              </span>
              {!kr && (
                <span style={{ ...NUM_MONO, fontSize: 14, color: "#5c5448" }}>
                  {data?.formattedPrice ?? ""}
                </span>
              )}
              <span style={{ fontSize: 12, color: "#3a3530", marginLeft: "auto" }}>15분 지연</span>
            </div>
          </>
        )}
      </div>

      {/* ─── 기간 탭 ─────────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 6, padding: "0 24px 14px" }}>
        {(["1D", "1W", "1M", "1Y"] as Period[]).map((p) => (
          <button key={p} onClick={() => setPeriod(p)}
            style={{
              fontSize: 12, fontWeight: 500, padding: "5px 16px", borderRadius: 20,
              border: `0.5px solid ${period === p ? "rgba(250,202,62,0.4)" : "rgba(255,255,255,0.08)"}`,
              background: period === p ? "rgba(250,202,62,0.12)" : "rgba(255,255,255,0.04)",
              color: period === p ? "#FACA3E" : "#5c5448",
              cursor: "pointer",
            }}
          >
            {p}
          </button>
        ))}
      </div>

      {/* ─── TradingView 차트 ────────────────────────────────────────────────── */}
      <div style={{
        margin: "0 16px",
        borderRadius: 16,
        overflow: "hidden",
        border: "0.5px solid rgba(255,255,255,0.07)",
        background: "#0d0d0d",
        height: 320,
        flexShrink: 0,
      }}>
        <iframe
          key={`${ticker}-${period}`}
          src={tvUrl}
          style={{ width: "100%", height: "100%", border: "none", display: "block" }}
          allowFullScreen
        />
      </div>

      {/* ─── 지표 카드 ───────────────────────────────────────────────────────── */}
      <div style={{ padding: "20px 16px 0" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          {[
            {
              label: "현재가",
              value: loading ? null : (kr ? (data?.formattedPrice ?? "—") : (data?.formattedKRW ?? "—")),
            },
            {
              label: "전일 대비",
              value: loading ? null : (data
                ? (kr
                    ? (data.change >= 0 ? "+" : "") + data.change.toLocaleString("ko-KR") + "원"
                    : (data.change >= 0 ? "+" : "-") + "$" + Math.abs(data.change).toFixed(2))
                : "—"),
              colored: true,
            },
            {
              label: "등락률",
              value: loading ? null : (data?.formattedChange ?? "—"),
              colored: true,
            },
          ].map(({ label, value, colored }) => (
            <div key={label} style={{
              background: "#141414", borderRadius: 14,
              padding: "14px 14px", border: "0.5px solid rgba(255,255,255,0.07)",
            }}>
              <div style={{ fontSize: 10, color: "#5c5448", marginBottom: 7, fontWeight: 300 }}>{label}</div>
              {loading
                ? <Skeleton w={60} h={14} />
                : <div style={{
                    ...NUM_MONO, fontSize: 13, fontWeight: 400,
                    color: colored ? accentColor : "#e8e0d0",
                  }}>{value}</div>
              }
            </div>
          ))}
        </div>

        {/* 2열 카드 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
          {[
            { label: "시장", value: kr ? "한국 KRX" : `미국 ${exch}` },
            { label: "종목코드", value: ticker },
            { label: "카테고리", value: meta?.category ?? "—" },
            { label: "통화", value: kr ? "KRW (원)" : "USD (달러)" },
          ].map(({ label, value }) => (
            <div key={label} style={{
              background: "#141414", borderRadius: 14,
              padding: "14px 14px", border: "0.5px solid rgba(255,255,255,0.07)",
            }}>
              <div style={{ fontSize: 10, color: "#5c5448", marginBottom: 7, fontWeight: 300 }}>{label}</div>
              <div style={{ fontSize: 13, color: "#e8e0d0", fontWeight: 400 }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── 하단 버튼 ──────────────────────────────────────────────────────── */}
      <div style={{ padding: "24px 16px 48px", marginTop: "auto" }}>
        <button
          style={{
            width: "100%", background: "#FACA3E", color: "#0d0d0d",
            fontSize: 15, fontWeight: 600, padding: "16px 0",
            borderRadius: 14, border: "none", cursor: "pointer",
          }}
        >
          모의 매수하기
        </button>
        <p style={{ fontSize: 11, color: "#3a3530", textAlign: "center", marginTop: 10 }}>
          가상 투자 참고용 · 실제 거래 아님
        </p>
      </div>
    </div>
  );
}
