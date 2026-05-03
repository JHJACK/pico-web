"use client";

import { useState, useEffect, useCallback, useRef, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { fetchStocks, type StocksMap } from "@/app/lib/stocks";
import { fetchNews, NEWS_FALLBACK, type NewsItem, type NewsCat } from "@/app/lib/news";
import { STOCK_META, TICKERS_BY_CATEGORY, KOR_TO_TICKER, ALL_TICKERS, type StockCategory, KR_STOCK_META, KR_TICKERS_BY_CATEGORY, ALL_KR_TICKERS, type KrStockCategory, isKrTicker, decomposeHangul } from "@/app/lib/stockNames";
import { supabase, getTodayVote, submitVoteAndAttendance, getTodayVoteCounts, getYesterdayVote, judgeYesterdayBattle, todayKST, getTodayStock, uploadAvatar, type BattleVoteRow } from "@/app/lib/supabase";
import { useAuth } from "@/app/lib/authContext";
import { INVESTOR_TYPES } from "@/app/lib/quizTypes";
import { isKrMarketOpen, isUSMarketOpen } from "@/app/lib/marketStatus";
import dynamic from "next/dynamic";
import RankingTab from "@/app/components/RankingTab";
import LearnTab from "@/app/components/LearnTab";
import GlobeCanvas from "@/app/components/GlobeCanvas";
import PicoFooter from "@/app/components/PicoFooter";

// ═══════════════════════════════════════════════
// 상수 & 데이터
// ═══════════════════════════════════════════════
type ModalType = "login" | "vs_battle" | "setup_profile" | "email_verify" | null;
type MainTab   = "event" | "play" | "learn";

const ANIMAL_NAMES: Record<string, { emoji: string; modifier: string; name: string }> = {
  tiger:     { emoji: "🐯", modifier: "공격적 개척자",   name: "호랑이"   },
  eagle:     { emoji: "🦅", modifier: "집중 돌파의",     name: "독수리"   },
  wolf:      { emoji: "🐺", modifier: "역발상의 철학자", name: "늑대"     },
  fox:       { emoji: "🦊", modifier: "정보의 연금술사", name: "여우"     },
  elephant:  { emoji: "🐘", modifier: "복리의 설계자",   name: "코끼리"   },
  hedgehog:  { emoji: "🦔", modifier: "방어의 전략가",   name: "고슴도치" },
  turtle:    { emoji: "🐢", modifier: "안전 제일 수호자", name: "거북이"  },
  butterfly: { emoji: "🦋", modifier: "예술가적 직관가", name: "나비"     },
};

const TODAY_DATE = new Date().toISOString().slice(0, 10);
const BATTLE_KEY = `pico_selection_${TODAY_DATE}`;



// DM Mono 숫자 스타일 헬퍼 (주가·등락률·퍼센트·타이머·포인트 등 모든 숫자)
const NUM: CSSProperties = {
  fontFamily: "var(--font-inter), monospace",
  fontWeight: 300,
  letterSpacing: "-0.02em",
};

// ═══════════════════════════════════════════════
// 유틸
// ═══════════════════════════════════════════════

// 현재 KST 기준 장 상태 (marketStatus.ts 공용 함수 사용 — DST 반영)
function getMarketStatus() {
  return { krOpen: isKrMarketOpen(), usOpen: isUSMarketOpen() };
}

function getMarketCountdown(): string {
  const now = new Date();
  const close = new Date();
  close.setUTCHours(19, 30, 0, 0);
  if (close.getTime() <= now.getTime()) close.setUTCDate(close.getUTCDate() + 1);
  const diff = close.getTime() - now.getTime();
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1_000);
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}

// ═══════════════════════════════════════════════
// 서브 컴포넌트
// ═══════════════════════════════════════════════

function TickerLogo({ src, ticker, size = 28 }: { src: string; ticker: string; size?: number }) {
  const [err, setErr] = useState(false);
  if (err) return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: "#242424", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.4, fontWeight: 500, color: "#a09688", flexShrink: 0 }}>
      {ticker[0]}
    </div>
  );
  return (
    <img src={src} alt={ticker} width={size} height={size}
      style={{ width: size, height: size, borderRadius: "50%", objectFit: "contain", background: "#fff", flexShrink: 0 }}
      onError={() => setErr(true)}
    />
  );
}

function GoldParticles({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="absolute inset-0 pointer-events-none overflow-visible" style={{ zIndex: 10 }}>
      {[1,2,3,4].map((n) => (
        <div key={n} className={`pt${n}`} style={{
          position: "absolute",
          left: `${15 + n * 18}%`,
          bottom: "35%",
          width: n % 2 === 0 ? 7 : 5,
          height: n % 2 === 0 ? 7 : 5,
          borderRadius: "50%",
          background: n % 3 === 0 ? "#f07878" : "#FACA3E",
        }} />
      ))}
    </div>
  );
}

function CountUp({ target, duration = 1200 }: { target: number; duration?: number }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start: number | null = null;
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setVal(Math.round(p * target));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);
  return <>{val}</>;
}

function Skeleton({ w = "100%", h = 18 }: { w?: string | number; h?: number }) {
  return <div className="skeleton" style={{ width: w, height: h }} />;
}

// 종목 카드 (PICO Play 그리드용)
const NUM_MONO: CSSProperties = {
  fontFamily: "var(--font-inter), monospace",
  fontWeight: 300,
  letterSpacing: "-0.02em",
};
function StockCard({ ticker, korName, stocks, stocksLoading }: {
  ticker: string;
  korName: string;
  stocks: StocksMap;
  stocksLoading: boolean;
}) {
  const data = stocks[ticker];
  const up = data?.up ?? true;
  return (
    <div className="pico-card rounded-xl p-4 border flex flex-col gap-2" style={{ background: "#1c1c1c", borderColor: "rgba(255,255,255,0.06)" }}>
      <div className="flex items-center justify-between">
        <span style={{ fontSize: 15, fontWeight: 500, color: "#e8e0d0" }}>{korName}</span>
        <span style={{ fontSize: 11, color: "#5c5448", fontWeight: 300 }}>{ticker}</span>
      </div>
      {stocksLoading
        ? <><Skeleton w="60%" h={16} /><div style={{ height: 4 }} /><Skeleton w="40%" h={12} /></>
        : <>
          <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
            <span style={{ ...NUM_MONO, fontSize: 17, color: "#e8e0d0" }}>{data?.formattedKRW ?? "—"}</span>
            <span style={{ ...NUM_MONO, fontSize: 12, color: "#5c5448" }}>{data?.formattedPrice ?? "—"}</span>
          </div>
          <div style={{ ...NUM_MONO, fontSize: 13, color: up ? "#7ed4a0" : "#f07878" }}>
            {up ? "▲" : "▼"} {data?.formattedChange ?? "—"}
          </div>
        </>
      }
      <div style={{ fontSize: 10, color: "#5c5448", marginTop: 2 }}>15분 지연 · 투자 참고용</div>
    </div>
  );
}

// ─── 인기 종목 (Featured) ────────────────────────
const FEATURED_TICKERS = ["NVDA","TSLA","AAPL","META","005930","000660","035720","352820"];
const WEB_FOREIGN_TICKERS  = ["NVDA","TSLA","AAPL","META"];
const WEB_DOMESTIC_TICKERS = ["005930","000660"];

// ─── MiniSparkline ───────────────────────────────
const UP_PATHS = [
  "M0,24 L12,20 L24,22 L36,15 L48,17 L60,11 L72,7 L84,5",
  "M0,22 L12,24 L24,17 L36,19 L48,13 L60,9 L72,11 L84,3",
  "M0,20 L12,17 L24,21 L36,13 L48,15 L60,7 L72,9 L84,3",
  "M0,24 L12,19 L24,15 L36,17 L48,11 L60,13 L72,7 L84,3",
  "M0,22 L12,15 L24,19 L36,11 L48,13 L60,7 L72,9 L84,2",
];
const DN_PATHS = [
  "M0,5 L12,7 L24,5 L36,11 L48,9 L60,13 L72,17 L84,22",
  "M0,3 L12,7 L24,9 L36,7 L48,13 L60,15 L72,19 L84,24",
  "M0,5 L12,3 L24,7 L36,11 L48,9 L60,15 L72,17 L84,22",
  "M0,3 L12,5 L24,9 L36,7 L48,13 L60,11 L72,17 L84,23",
  "M0,7 L12,5 L24,7 L36,9 L48,13 L60,15 L72,19 L84,23",
];
function MiniSparkline({ up, idx = 0, width = 84, height = 28 }: { up: boolean; idx?: number; width?: number; height?: number }) {
  const color  = up ? "#7ed4a0" : "#f07878";
  const pathD  = (up ? UP_PATHS : DN_PATHS)[idx % 5];
  const areaD  = `${pathD} L84,${height} L0,${height} Z`;
  const gid    = `sg${up?"u":"d"}${idx}`;
  return (
    <svg width={width} height={height} viewBox={`0 0 84 ${height}`} style={{ display:"block" }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#${gid})`}/>
      <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}


// ─── StockRow ────────────────────────────────────
function StockRow({ ticker, stocks, stocksLoading, onClick }: {
  ticker: string; stocks: StocksMap; stocksLoading: boolean; onClick: () => void; idx?: number;
}) {
  const kr       = isKrTicker(ticker);
  const meta     = kr ? KR_STOCK_META[ticker] : STOCK_META[ticker];
  const logo     = !kr ? `https://financialmodelingprep.com/image-stock/${ticker}.png` : null;
  const data     = stocks[ticker];
  const up       = data?.up ?? true;
  const subLabel = kr ? (meta?.category ?? "") : ticker;
  return (
    <button onClick={onClick} className="w-full pico-btn"
      style={{ background:"none", border:"none", padding:"12px 0",
               borderBottom:"0.5px solid rgba(255,255,255,0.05)", cursor:"pointer" }}>
      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
        {/* 로고 */}
        {logo
          ? <TickerLogo src={logo} ticker={ticker} size={40} />
          : <div style={{ width:40, height:40, borderRadius:"50%", background:"#1c1c1c", flexShrink:0,
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:16, fontWeight:600, color:"#a09688" }}>{(meta?.name ?? ticker)[0]}</div>
        }
        {/* 종목명 + 서브라벨 — 최대 너비 제한으로 웹에서도 밀착 */}
        <div style={{ flex:1, minWidth:0, maxWidth:220, textAlign:"left" }}>
          <div className="stock-row-name" style={{ fontSize:16, fontWeight:500, color:"#e8e0d0", marginBottom:2,
            overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{meta?.name ?? ticker}</div>
          <div className="stock-row-sub" style={{ fontSize:14, color:"#c8bfb0", fontWeight:300 }}>{subLabel}</div>
        </div>
        {/* 현재가 — 고정 너비 */}
        <div className="stock-row-price-col" style={{ textAlign:"right", flexShrink:0, width:110 }}>
          {stocksLoading
            ? <Skeleton w={88} h={15}/>
            : <div className="stock-row-price-val" style={{ ...NUM_MONO, fontSize:16, color:"#e8e0d0" }}>
                {kr ? (data?.formattedPrice ?? "—") : (data?.formattedKRW ?? "—")}
              </div>
          }
        </div>
        {/* 등락률 — 고정 너비 */}
        <div className="stock-row-change-col" style={{ textAlign:"right", flexShrink:0, width:80 }}>
          {stocksLoading
            ? <Skeleton w={56} h={15}/>
            : <div className="stock-row-change-val" style={{ ...NUM_MONO, fontSize:15, color: up?"#7ed4a0":"#f07878" }}>
                {up?"▲":"▼"} {data?.formattedChange ?? "—"}
              </div>
          }
        </div>
      </div>
    </button>
  );
}



// ─── FeaturedCard (인기 종목 가로 스크롤 카드) ──
function FeaturedCard({ ticker, stocks, stocksLoading, idx, onClick, large = false }: {
  ticker: string; stocks: StocksMap; stocksLoading: boolean; idx: number; onClick: () => void; large?: boolean;
}) {
  const W       = large ? 174 : 148;
  const sparkW  = large ? 142 : 120;
  const nameMax = large ? 104 : 86;
  const kr   = isKrTicker(ticker);
  const meta = kr ? KR_STOCK_META[ticker] : STOCK_META[ticker];
  const logo = !kr ? `https://financialmodelingprep.com/image-stock/${ticker}.png` : null;
  const data = stocks[ticker];
  const up   = data?.up ?? true;
  return (
    <button onClick={onClick} className="pico-btn flex-shrink-0"
      style={{ width:W, background:"#1c1c1c", border:"0.5px solid rgba(255,255,255,0.07)",
        borderRadius:16, padding:"16px 16px 14px", textAlign:"left", cursor:"pointer",
        display:"flex", flexDirection:"column", gap:0 }}>
      {/* 로고 + 이름 */}
      <div style={{ display:"flex", alignItems:"center", gap:9, marginBottom:11 }}>
        {logo
          ? <TickerLogo src={logo} ticker={ticker} size={32}/>
          : <div style={{ width:32, height:32, borderRadius:"50%", background:"#242424", flexShrink:0,
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:15, fontWeight:600, color:"#c8bfb0" }}>{(meta?.name ?? ticker)[0]}</div>
        }
        <div style={{ minWidth:0 }}>
          <div style={{ fontSize:15, fontWeight:600, color:"#e8e0d0",
            overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:nameMax }}>
            {meta?.name?.slice(0,6) ?? ticker}
          </div>
          <div style={{ fontSize:15, color:"#c8bfb0", overflow:"hidden", textOverflow:"ellipsis",
            whiteSpace:"nowrap", maxWidth:nameMax }}>{kr ? (meta?.category ?? "") : ticker}</div>
        </div>
      </div>
      {/* 스파크라인 */}
      <MiniSparkline up={up} idx={idx} width={sparkW} height={34}/>
      {/* 가격 */}
      <div style={{ marginTop:10 }}>
        {stocksLoading
          ? <><Skeleton w="85%" h={15}/><div style={{height:4}}/><Skeleton w="65%" h={15}/></>
          : <>
            <div style={{ ...NUM_MONO, fontSize:15, color:"#e8e0d0", marginBottom:3 }}>
              {kr ? (data?.formattedPrice ?? "—") : (data?.formattedKRW ?? "—")}
            </div>
            <div style={{ ...NUM_MONO, fontSize:15, color: up?"#7ed4a0":"#f07878" }}>
              {up?"▲":"▼"} {data?.formattedChange ?? "—"}
            </div>
          </>
        }
      </div>
    </button>
  );
}

// ─── Game Dashboard Panel (웹 전용 우측 패널) ──
const TITLE_META: Record<string, { emoji: string; label: string; color: string }> = {
  sniper:      { emoji: "🎯", label: "여의도 스나이퍼",  color: "#FACA3E" },
  frog:        { emoji: "🐸", label: "역발상의 천재",    color: "#7ed4a0" },
  hodl:        { emoji: "🗿", label: "존버의 신",        color: "#a0b8f0" },
  daytrader:   { emoji: "⚡️", label: "단타의 귀재",     color: "#f0c060" },
  mentalsteel: { emoji: "🧊", label: "냉철한 멘탈",      color: "#b8e0f8" },
};

type DashHolding = {
  ticker: string;
  invested_points: number;
  currentValue: number;
  profitLoss: number;
  profitRate: number;
};
type DashRankRow = {
  nickname: string;
  return_rate: number;
  equipped_title: string | null;
  rank_position: number;
};

function GameDashboardPanel({
  loading,
  user,
  userRow,
  holdings,
  top3,
  myRank,
}: {
  loading: boolean;
  user: { id: string } | null;
  userRow: { total_points?: number; nickname?: string } | null | undefined;
  holdings: DashHolding[];
  top3: DashRankRow[];
  myRank: { rank_position: number; return_rate: number } | null;
}) {
  const [holdingsExpanded, setHoldingsExpanded] = useState(false);
  const router = useRouter();

  // 같은 티커 합산
  const grouped: DashHolding[] = Object.values(
    holdings.reduce<Record<string, DashHolding>>((acc, h) => {
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

  const RANK_STYLE = [
    { medal: "🥇", color: "#FACA3E" },
    { medal: "🥈", color: "#c8c8c8" },
    { medal: "🥉", color: "#d4956a" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* ── 상단: 내 게임 현황 ── */}
      <div style={{
        background: "#1c1c1c",
        border: "0.5px solid rgba(255,255,255,0.08)",
        borderRadius: 16,
        padding: "18px 18px 16px",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ fontFamily:"var(--font-mona12-emoji)", fontSize:15 }}>📊</span>
            <p style={{ fontFamily:"var(--font-mona12)", fontSize: 13, fontWeight: 700, color: "#e8e0d0", letterSpacing: "0.04em", margin: 0 }}>
              내 투자 현황
            </p>
          </div>
          {user && !loading && grouped.length > 0 && (
            <Link href="/mypage/investments"
              style={{ fontFamily:"var(--font-mona12)", fontSize: 12, color: "#c8bfb0", textDecoration: "none" }}>
              전체 보기
            </Link>
          )}
        </div>

        {!user ? (
          <p style={{ fontSize: 15, color: "#c8bfb0", fontWeight: 300, lineHeight: 1.6 }}>
            로그인하면 내 현황을<br/>확인할 수 있어요
          </p>
        ) : loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Skeleton w="55%" h={22} /><Skeleton w="40%" h={16} />
            <Skeleton w="100%" h={44} /><Skeleton w="80%" h={16} />
          </div>
        ) : (
          <>
            {/* 보유 포인트 */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 13, color: "#c8bfb0", marginBottom: 4 }}>보유 포인트</div>
              <div style={{ fontFamily: "var(--font-paperlogy)", fontSize: 32, fontWeight: 700, color: "#FACA3E", letterSpacing: "-0.02em", lineHeight: 1 }}>
                {(userRow?.total_points ?? 0).toLocaleString("ko-KR")}
                <span style={{ fontSize: 18, fontWeight: 600, marginLeft: 3 }}>P</span>
              </div>
            </div>

            {/* 평가손익 */}
            {grouped.length > 0 && (
              <div style={{
                background: isProfit ? "rgba(126,212,160,0.06)" : "rgba(240,120,120,0.06)",
                border: `0.5px solid ${isProfit ? "rgba(126,212,160,0.22)" : "rgba(240,120,120,0.22)"}`,
                borderRadius: 10, padding: "10px 13px", marginBottom: 12,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 15, color: "#c8bfb0" }}>
                    {isProfit ? "🔥" : "❄️"} 평가손익
                  </span>
                  <span style={{ ...NUM_MONO, fontSize: 15, color: isProfit ? "#7ed4a0" : "#f07878" }}>
                    {isProfit ? "+" : ""}{totalPL.toLocaleString("ko-KR")}P
                    <span style={{ fontSize: 15, marginLeft: 5, opacity: 0.8 }}>
                      ({isProfit ? "+" : ""}{totalPLRate.toFixed(1)}%)
                    </span>
                  </span>
                </div>
              </div>
            )}

            {/* 보유 종목 미니 리스트 */}
            {grouped.length === 0 ? (
              <p style={{ fontSize: 15, color: "#c8bfb0", fontWeight: 300 }}>
                보유 종목 없음 · 지금 투자해 보세요 🎯
              </p>
            ) : (
              <>
                {/* 총 투자 포인트 레이블 */}
                <div style={{ fontSize: 13, color: "#c8bfb0", marginBottom: 8 }}>
                  총 투자 포인트 <span style={{ ...NUM_MONO, color: "#c8bfb0" }}>{totalInvested.toLocaleString()}P</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {(holdingsExpanded ? grouped : grouped.slice(0, 4)).map((h) => {
                    const up   = h.profitLoss >= 0;
                    const kr   = isKrTicker(h.ticker);
                    const meta = kr ? KR_STOCK_META[h.ticker] : STOCK_META[h.ticker];
                    const logo = !kr ? `https://financialmodelingprep.com/image-stock/${h.ticker}.png` : null;
                    return (
                      <button key={h.ticker} className={`pico-btn ${up ? "flash-green" : "flash-red"}`}
                        onClick={() => router.push(`/stock/${h.ticker}?tab=sell&from=play`)}
                        style={{ display: "flex", alignItems: "center", gap: 8,
                          padding: "7px 8px", width: "100%", background: "none", border: "none",
                          cursor: "pointer", borderRadius: 8, textAlign: "left",
                          transition: "background 0.15s" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "none")}>
                        {/* 로고 */}
                        {logo
                          ? <TickerLogo src={logo} ticker={h.ticker} size={28} />
                          : <div style={{ width:28, height:28, borderRadius:"50%", background:"#2a2a2a",
                              flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center",
                              fontSize:12, fontWeight:600, color:"#c8bfb0" }}>
                              {(meta?.name ?? h.ticker)[0]}
                            </div>
                        }
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:4, marginBottom:1 }}>
                            <span style={{ fontSize: 13, fontWeight:500, color: "#e8e0d0",
                              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {meta?.name ?? h.ticker}
                            </span>
                            <span style={{ fontFamily:"var(--font-mona12-emoji)", fontSize:14, flexShrink:0 }}>
                              {kr ? "🇰🇷" : "🌎"}
                            </span>
                          </div>
                          <span style={{ ...NUM_MONO, fontSize: 12, color: "#c8bfb0" }}>
                            {h.invested_points.toLocaleString()}P 투자
                          </span>
                        </div>
                        <span style={{ ...NUM_MONO, fontSize: 13, fontWeight:600, color: up ? "#7ed4a0" : "#f07878", flexShrink: 0 }}>
                          {up ? "+" : ""}{h.profitLoss.toLocaleString()}P
                        </span>
                      </button>
                    );
                  })}
                  {grouped.length > 4 && (
                    <button
                      onClick={() => setHoldingsExpanded(v => !v)}
                      style={{
                        display: "flex", alignItems: "center", gap: 5,
                        marginTop: 2, padding: "4px 0",
                        background: "none", border: "none", cursor: "pointer",
                        color: "#c8bfb0", fontSize: 14,
                      }}
                    >
                      <span style={{
                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                        width: 18, height: 18, borderRadius: "50%",
                        background: "rgba(255,255,255,0.06)",
                        fontSize: 11, transition: "transform 0.2s",
                        transform: holdingsExpanded ? "rotate(180deg)" : "rotate(0deg)",
                      }}>▼</span>
                      {holdingsExpanded ? "접기" : `전체 확인 (${grouped.length - 4}개 더)`}
                    </button>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* ── 하단: 이번 주 랭킹 ── */}
      <div style={{
        background: "#1c1c1c",
        border: "0.5px solid rgba(255,255,255,0.08)",
        borderRadius: 16,
        padding: "18px 18px 16px",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ fontFamily:"var(--font-mona12-emoji)", fontSize:15 }}>🏆</span>
            <p style={{ fontFamily:"var(--font-mona12)", fontSize: 13, fontWeight: 700, color: "#e8e0d0", letterSpacing: "0.04em", margin: 0 }}>
              이번 주 랭킹
            </p>
          </div>
          <Link href="/ranking"
            style={{ fontFamily:"var(--font-mona12)", fontSize: 12, color: "#c8bfb0", textDecoration: "none" }}>
            전체 보기
          </Link>
        </div>

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[1, 2, 3].map((i) => <Skeleton key={i} w="100%" h={48} />)}
          </div>
        ) : top3.length === 0 ? (
          <p style={{ fontSize: 15, color: "#c8bfb0", fontWeight: 300 }}>아직 랭킹 데이터가 없어요</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {top3.map((r, i) => {
              const st     = RANK_STYLE[i];
              const isPos  = r.return_rate >= 0;
              return (
                <div key={r.rank_position} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 0",
                  borderBottom: i < top3.length - 1 ? "0.5px solid rgba(255,255,255,0.05)" : "none",
                }}>
                  <span style={{ fontFamily:"var(--font-mona12-emoji)", fontSize: 18, flexShrink: 0 }}>{st.medal}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {r.equipped_title && TITLE_META[r.equipped_title] && (
                      <div style={{ fontSize: 11, color: TITLE_META[r.equipped_title].color, fontWeight: 300, marginBottom: 1 }}>
                        {TITLE_META[r.equipped_title].emoji} {TITLE_META[r.equipped_title].label}
                      </div>
                    )}
                    <div style={{ fontFamily:"var(--font-paperlogy)", fontSize: 15, fontWeight: 500, color: "#e8e0d0",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {r.nickname}
                    </div>
                  </div>
                  <span style={{ ...NUM_MONO, fontSize: 14, fontWeight: 600, color: isPos ? "#7ed4a0" : "#f07878", flexShrink: 0 }}>
                    {isPos ? "+" : ""}{r.return_rate.toFixed(1)}%
                  </span>
                </div>
              );
            })}

            {/* 내 순위 고정 표시 */}
            {myRank && user && (
              <div style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 0 4px", marginTop: 4,
                borderTop: "0.5px solid rgba(255,255,255,0.06)",
              }}>
                <span style={{ ...NUM_MONO, fontSize: 14, color: "#FACA3E",
                  fontWeight: 700, flexShrink: 0, minWidth: 28 }}>
                  #{myRank.rank_position}
                </span>
                <div style={{ flex: 1, fontFamily:"var(--font-paperlogy)", fontSize: 14, color: "#c8bfb0" }}>나의 순위</div>
                <span style={{ ...NUM_MONO, fontSize: 14, fontWeight: 600,
                  color: myRank.return_rate >= 0 ? "#7ed4a0" : "#f07878", flexShrink: 0 }}>
                  {myRank.return_rate >= 0 ? "+" : ""}{myRank.return_rate.toFixed(1)}%
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// 메인 컴포넌트
// ═══════════════════════════════════════════════
export default function Home() {
  const router = useRouter();
  const { user, userRow, loading, refreshUserRow } = useAuth();

  const [quizDone,   setQuizDone]   = useState(false);
  const [battleDone, setBattleDone] = useState(false);
  const [quizType,   setQuizType]   = useState<string | null>(null);
  const [popupType,  setPopupType]  = useState<string | null>(null);

  // 오늘의 선택 상태 (UP | DOWN)
  const [battleVote, setBattleVote] = useState<"UP"|"DOWN"|null>(null);
  const [votesUp,  setVotesUp]  = useState(0);
  const [votesDown,setVotesDown]= useState(0);

  // 오늘 종목 (날짜 기반 결정)
  const [todayStock, setTodayStock] = useState(getTodayStock());

  const [modal,     setModal]    = useState<ModalType>(null);
  const [authEmail, setAuthEmail]= useState("");
  const [authPw,    setAuthPw]   = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError,   setAuthError]   = useState("");
  const [rememberMe,  setRememberMe]  = useState(false);
  const [lastLoginProvider, setLastLoginProvider] = useState<string | null>(null);
  const [forgotPw,    setForgotPw]    = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent,  setForgotSent]  = useState(false);
  const [mounted,   setMounted]  = useState(false);
  const [loginTab,       setLoginTab]       = useState<"login" | "signup">("login");
  const [authPwConfirm,  setAuthPwConfirm]  = useState("");
  const [emailVerifyEmail,    setEmailVerifyEmail]    = useState("");
  const [emailVerifyCode,     setEmailVerifyCode]     = useState("");
  const [emailVerifyLoading,  setEmailVerifyLoading]  = useState(false);
  const [emailVerifyError,    setEmailVerifyError]    = useState("");
  const [emailVerifyResending,setEmailVerifyResending]= useState(false);
  const [setupNickname,  setSetupNickname]  = useState("");
  const [setupSaving,    setSetupSaving]    = useState(false);
  const [setupPendingFile, setSetupPendingFile] = useState<File | null>(null);
  const [setupPreviewUrl,  setSetupPreviewUrl]  = useState<string | null>(null);

  // 오늘의 선택 팝업
  const [popupBattleVote, setPopupBattleVote] = useState<"UP"|"DOWN"|null>(null);
  const [popupBattleDone, setPopupBattleDone] = useState(false);
  const [popupVotesUp,   setPopupVotesUp]   = useState(0);
  const [popupVotesDown, setPopupVotesDown] = useState(0);
  // 어제 선택 결과
  const [yesterdayVote,   setYesterdayVote]   = useState<BattleVoteRow | null>(null);
  const [yesterdayWinner, setYesterdayWinner] = useState<string | null>(null);
  // 팝업 체크 완료 여부 (user 변경시 중복 실행 방지)
  const battlePopupChecked  = useRef(false);
  const profileSetupChecked = useRef(false);
  const setupFileRef        = useRef<HTMLInputElement>(null);
  const tabInitRef          = useRef(false);

  // 출석/보너스 토스트
  const [toast, setToast] = useState<string | null>(null);

  const [mainTab, setMainTab] = useState<MainTab>("event");
  const [prevTab, setPrevTab] = useState<MainTab>("event");

  // URL ?openLogin=1 로 로그인 모달 자동 오픈 (비로그인 상태로 보호된 페이지 접근 시)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("openLogin") === "1") {
      openLogin();
      router.replace("/");
    }
  }, []);

  // 탭 초기화: 비로그인은 항상 홈, 로그인 후 30분 이내 재방문만 URL 탭 복원
  useEffect(() => {
    if (loading || tabInitRef.current) return;
    tabInitRef.current = true;
    if (!user) return; // 비로그인: 기본값 "event" 유지
    const INACTIVITY_MS = 30 * 60 * 1000;
    const lastVisit = localStorage.getItem("pico_last_tab_visit");
    const isRecent = !!lastVisit && (Date.now() - parseInt(lastVisit, 10)) < INACTIVITY_MS;
    if (isRecent) {
      const urlTab = new URLSearchParams(window.location.search).get("tab");
      if (urlTab === "play") setMainTab("play");
    }
    localStorage.setItem("pico_last_tab_visit", Date.now().toString());
  }, [user, loading]);

  const [justVoted,      setJustVoted]      = useState<"UP"|"DOWN"|null>(null);
  const [showParticlesA, setShowParticlesA] = useState(false);
  const [showParticlesB, setShowParticlesB] = useState(false);
  const [showBarAnim,    setShowBarAnim]    = useState(false);
  const [showResultMsg,  setShowResultMsg]  = useState(false);

  const [countdown, setCountdown] = useState("--:--:--");
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  const [newsCat,    setNewsCat]    = useState<NewsCat>("전체");
  const [newsItems,  setNewsItems]  = useState<NewsItem[]>(NEWS_FALLBACK["전체"]);
  const [newsLoading,setNewsLoading]= useState(false);

  const [stocks,        setStocks]        = useState<StocksMap>({});
  const [stocksLoading, setStocksLoading] = useState(true);
  const [usdKrw,        setUsdKrw]        = useState(0);

  // ── PICO Play
  const [playStockTab,      setPlayStockTab]      = useState<"전체" | StockCategory>("전체");
  const [playKrCatTab,     setPlayKrCatTab]      = useState<"전체" | KrStockCategory>("전체");
  const [playMarketTab,    setPlayMarketTab]     = useState<"해외" | "한국">("해외");
  type PlayFilter = "전체"|"해외"|"한국"|"AI·테크"|"빅테크"|"테마"|"배터리·EV"|"바이오"|"금융"|"ETF";
  const [playFilter,       setPlayFilter]       = useState<PlayFilter>("전체");
  type PlaySort = "기본" | "상승률" | "하락률" | "현재가↑" | "현재가↓";
  const [playSort,          setPlaySort]          = useState<PlaySort>("기본");
  const [sortOpen,          setSortOpen]          = useState(false);
  const [playSearch,        setPlaySearch]        = useState("");
  const [playSearchResults, setPlaySearchResults] = useState<{ symbol: string; name: string; exchange: string }[]>([]);
  const [playSearchLoading, setPlaySearchLoading] = useState(false);
  const searchIdRef = useRef(0);

  // ── 게임 대시보드 (웹 전용 우측 패널)
  const [dashHoldings, setDashHoldings] = useState<DashHolding[]>([]);
  const [dashTop3,     setDashTop3]     = useState<DashRankRow[]>([]);
  const [dashMyRank,   setDashMyRank]   = useState<{ rank_position: number; return_rate: number } | null>(null);
  const [dashLoading,  setDashLoading]  = useState(false);

  useEffect(() => {
    setMounted(true);

    const bRaw      = localStorage.getItem("pico_battle_done");
    const battleData = localStorage.getItem(BATTLE_KEY);

    // 오늘 날짜 아닌 pico_vs_popup_ 키 자동 정리
    const todayKey = todayKST();
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith("pico_vs_popup_") && !key.endsWith(todayKey)) {
        localStorage.removeItem(key);
      }
    });

    // 비로그인 유저는 localStorage의 퀴즈 데이터를 무시 — quizDone/quizType은 DB(userRow)에서만 설정
    const bDone = bRaw === "true";
    setBattleDone(bDone);
    if (battleData) {
      const bd = JSON.parse(battleData);
      setBattleVote(bd.choice as "UP" | "DOWN");
      setVotesUp(bd.votesUp ?? 0);
      setVotesDown(bd.votesDown ?? 0);
      setShowBarAnim(true);
      setShowResultMsg(true);
    }

    // 최근 로그인 provider 복원
    const savedProvider = localStorage.getItem("pico_last_login_provider");
    if (savedProvider) setLastLoginProvider(savedProvider);

    setCountdown(getMarketCountdown());
    const timer = setInterval(() => setCountdown(getMarketCountdown()), 1000);

    fetchStocks([...ALL_TICKERS, ...ALL_KR_TICKERS]).then((data) => {
      setStocks(data);
      setStocksLoading(false);
    });

    fetchNews("전체").then(setNewsItems);

    // 달러 환율 조회 — 서버 API 경유 (Redis 캐싱, 15분마다 갱신)
    const fetchRate = () => {
      fetch("/api/exchange-rate")
        .then((r) => r.json())
        .then((d) => { if (d?.rate) setUsdKrw(d.rate); })
        .catch(() => setUsdKrw(1470));
    };
    fetchRate();
    const rateTimer = setInterval(fetchRate, 15 * 60 * 1000);

    return () => { clearInterval(timer); clearInterval(rateTimer); };
  }, []);

  // ── 로그인 후 팝업 체크 (user가 바뀔 때마다 한 번만 실행) ──
  useEffect(() => {
    if (!user || battlePopupChecked.current) return;
    battlePopupChecked.current = true;

    const popupKey = `pico_vs_popup_${todayKST()}`;

    getTodayVote(user.id).then((vote) => {
      if (vote) {
        // 이미 투표함 → 선택 상태만 복원
        setBattleDone(true);
        const v = vote.voted_for === "UP" || vote.voted_for === "DOWN"
          ? vote.voted_for as "UP" | "DOWN"
          : null;
        setBattleVote(v);
        setShowBarAnim(true);
        setShowResultMsg(true);
      } else if (!localStorage.getItem(popupKey)) {
        // 오늘 첫 접속 + 미투표 → 팝업 표시
        // 어제 결과 판정 후 팝업 오픈
        judgeYesterdayBattle(user.id).then(({ winner, myVote }) => {
          setYesterdayWinner(winner);
          setYesterdayVote(myVote);
        });
        setModal("vs_battle");
        getTodayVoteCounts().then(({ votesUp: u, votesDown: d }) => {
          setPopupVotesUp(u);
          setPopupVotesDown(d);
        });
        // 어제 참여 여부와 무관하게 로드
        getYesterdayVote(user.id).then((yv) => {
          if (yv && yv.is_correct === null) {
            // judgeYesterdayBattle가 처리 — 중복 방지
          } else if (yv) {
            setYesterdayVote(yv);
          }
        });
      }
    });
  }, [user]);

  // 팝업 열릴 때 body/html 스크롤 잠금
  useEffect(() => {
    const isOpen = modal !== null || popupType !== null;
    document.body.style.overflow = isOpen ? "hidden" : "";
    document.documentElement.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, [modal, popupType]);

  useEffect(() => {
    if (!mounted) return;
    setNewsLoading(true);
    fetchNews(newsCat).then((data) => {
      setNewsItems(data);
      setNewsLoading(false);
    });
  }, [newsCat, mounted]);


  // DB에 investor_type이 있으면 퀴즈 완료로 처리
  useEffect(() => {
    if (userRow?.investor_type) {
      setQuizDone(true);
      setQuizType(userRow.investor_type);
    }
  }, [userRow]);

  // 게임 대시보드 데이터 로드 (로그인 유저 + Play 탭)
  const fetchDashboard = useCallback(async () => {
    if (!user) return;
    setDashLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (token) {
        const res = await fetch("/api/investments/holdings", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (json.holdings) {
          const active = (json.holdings as (DashHolding & { status: string })[])
            .filter((h) => h.status === "holding");
          setDashHoldings(active);
        }
      }
      const rankRes  = await fetch(`/api/rankings?uid=${user.id}`);
      const rankData = await rankRes.json();
      setDashTop3((rankData.rankings ?? []).slice(0, 3));
      setDashMyRank(rankData.myRank ?? null);
    } catch {
      // silent
    } finally {
      setDashLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user && mainTab === "play") fetchDashboard();
  }, [user, mainTab, fetchDashboard]);

  const isBlurred = modal === "vs_battle";
  const tabNeedsAuth = !user && !loading && mainTab !== "event";
  const totalVotes = votesUp + votesDown;
  const pctUp   = totalVotes > 0 ? Math.round((votesUp   / totalVotes) * 100) : 50;
  const pctDown = 100 - pctUp;

  function switchTab(tab: MainTab) {
    setPrevTab(mainTab);
    setMainTab(tab);
    if (tab !== "event" && !user) openLogin();
    if (tab === "play") router.replace("/?tab=play");
    else if (tab === "event") { router.replace("/"); window.scrollTo(0, 0); }
    localStorage.setItem("pico_last_tab_visit", Date.now().toString());
  }
  const tabAnim = mainTab === "play"
    ? (prevTab === "event" ? "tab-enter" : "tab-enter-left")
    : (prevTab === "play"  ? "tab-enter-left" : "tab-enter");

  const handleVote = useCallback((choice: "UP"|"DOWN") => {
    if (battleVote || battleDone) return;
    // 비로그인 시 로그인 모달 오픈
    if (!user) { openLogin(); return; }

    const newUp   = choice === "UP"   ? votesUp   + 1 : votesUp;
    const newDown = choice === "DOWN" ? votesDown + 1 : votesDown;
    setJustVoted(choice);
    if (choice === "UP") setShowParticlesA(true); else setShowParticlesB(true);
    setTimeout(async () => {
      setBattleVote(choice); setBattleDone(true);
      setVotesUp(newUp); setVotesDown(newDown); setShowBarAnim(true);
      localStorage.setItem(BATTLE_KEY, JSON.stringify({ choice, votesUp: newUp, votesDown: newDown }));
      localStorage.setItem("pico_battle_done", "true");

      // Supabase 저장
      submitVoteAndAttendance(user.id, choice, todayStock.ticker).then(({ bonusDays, bonusPoints }) => {
        refreshUserRow();
        if (bonusPoints > 0) {
          showToast(`🎉 ${bonusDays}일 연속 출석! +${bonusPoints}P 추가 지급`);
        } else {
          showToast("✅ 출석 완료 +100P");
        }
      });

      setTimeout(() => setShowResultMsg(true), 700);
    }, 300);
    setTimeout(() => { setShowParticlesA(false); setShowParticlesB(false); setJustVoted(null); }, 1000);
  }, [battleVote, battleDone, votesUp, votesDown, user, todayStock]);

  async function handleBattlePopupVote() {
    if (!popupBattleVote || !user || popupBattleDone) return;
    const choice = popupBattleVote;

    // Supabase 저장
    const { bonusDays, bonusPoints } = await submitVoteAndAttendance(user.id, choice, todayStock.ticker);

    // 메인 선택 상태 업데이트
    const newUp   = choice === "UP"   ? votesUp   + 1 : votesUp;
    const newDown = choice === "DOWN" ? votesDown + 1 : votesDown;
    setBattleDone(true);
    setBattleVote(choice);
    setVotesUp(newUp);
    setVotesDown(newDown);
    setShowBarAnim(true);
    setShowResultMsg(true);
    localStorage.setItem(BATTLE_KEY, JSON.stringify({ choice, votesUp: newUp, votesDown: newDown }));
    localStorage.setItem("pico_battle_done", "true");

    refreshUserRow();
    if (bonusPoints > 0) {
      showToast(`🎉 ${bonusDays}일 연속 출석! +${bonusPoints}P 추가 지급`);
    } else {
      showToast("✅ 출석 완료 +100P");
    }
    setPopupBattleDone(true);
    // 오늘 팝업 완료 → localStorage에 기록 (중복 방지)
    localStorage.setItem(`pico_vs_popup_${todayKST()}`, "1");
  }

  // ── 신규 유저 감지 → 닉네임 설정 모달 ────────────────────────────────────────
  useEffect(() => {
    if (!user || !userRow || profileSetupChecked.current) return;
    profileSetupChecked.current = true;
    const justSignedUp = localStorage.getItem("pico_just_signed_up") === "true";
    const isNew = (Date.now() - new Date(userRow.created_at).getTime()) < 120_000;
    if (justSignedUp || isNew) {
      localStorage.removeItem("pico_just_signed_up");
      setSetupNickname(userRow.nickname);
      setModal("setup_profile");
    }
  }, [user, userRow]);

  function openLogin() {
    setAuthError(""); setForgotPw(false); setForgotSent(false); setForgotEmail(""); setLoginTab("login"); setModal("login");
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  async function handleAuth() {
    if (!authEmail || !authPw) { setAuthError("이메일과 비밀번호를 입력해 주세요."); return; }
    setAuthLoading(true); setAuthError("");
    const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPw });
    if (error) { setAuthError("이메일 또는 비밀번호가 올바르지 않아요."); setAuthLoading(false); return; }
    localStorage.setItem("pico_last_login_provider", "email");
    if (rememberMe) localStorage.setItem("pico_remember_me", "true");
    setModal(null);
    setAuthLoading(false);
    setAuthEmail(""); setAuthPw("");
  }

  async function handleSignUp() {
    if (!authEmail || !authPw) { setAuthError("이메일과 비밀번호를 입력해 주세요."); return; }
    if (authPw.length < 6) { setAuthError("비밀번호는 6자 이상이어야 해요."); return; }
    if (authPw !== authPwConfirm) { setAuthError("비밀번호가 일치하지 않아요."); return; }
    setAuthLoading(true); setAuthError("");
    const { data, error } = await supabase.auth.signUp({ email: authEmail, password: authPw });
    setAuthLoading(false);
    if (error) {
      setAuthError(
        error.message.includes("already") ? "이미 가입된 이메일이에요." :
        error.message.includes("email")   ? "유효한 이메일을 입력해 주세요." :
        "가입에 실패했어요. 다시 시도해 주세요."
      );
      return;
    }
    const email = authEmail;
    setAuthEmail(""); setAuthPw(""); setAuthPwConfirm("");
    // 이메일 인증이 필요한 경우(data.session === null) → 인증 단계로
    if (!data.session) {
      setEmailVerifyEmail(email);
      setEmailVerifyCode("");
      setEmailVerifyError("");
      setModal("email_verify");
    } else {
      // Supabase에서 이메일 인증 미활성화 시 즉시 가입 완료
      if (data.user) localStorage.setItem("pico_just_signed_up", "true");
      setModal(null);
    }
  }

  async function handleVerifyEmail() {
    if (emailVerifyCode.length !== 6) { setEmailVerifyError("6자리 인증 코드를 입력해 주세요."); return; }
    setEmailVerifyLoading(true); setEmailVerifyError("");
    const { data, error } = await supabase.auth.verifyOtp({
      email: emailVerifyEmail,
      token: emailVerifyCode,
      type:  "signup",
    });
    setEmailVerifyLoading(false);
    if (error) {
      setEmailVerifyError("인증 코드가 올바르지 않아요. 다시 확인해 주세요.");
      return;
    }
    if (data.user) {
      localStorage.setItem("pico_just_signed_up", "true");
      localStorage.setItem("pico_last_login_provider", "email");
    }
    setModal(null);
    setEmailVerifyCode("");
    setEmailVerifyEmail("");
  }

  async function handleResendVerify() {
    setEmailVerifyResending(true);
    await supabase.auth.resend({ type: "signup", email: emailVerifyEmail });
    setEmailVerifyResending(false);
    showToast("인증 코드를 재전송했어요. 이메일을 확인해 주세요.");
  }

  async function handleSaveSetup() {
    if (!user || !setupNickname.trim()) return;
    setSetupSaving(true);
    if (setupNickname.trim() !== userRow?.nickname) {
      await supabase.from("users").update({ nickname: setupNickname.trim() }).eq("id", user.id);
    }
    if (setupPendingFile) await uploadAvatar(user.id, setupPendingFile);
    await refreshUserRow();
    setSetupSaving(false);
    setModal(null);
    setSetupPendingFile(null);
    setSetupPreviewUrl(null);
  }

  async function handleSocialLogin(provider: "google" | "kakao") {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: window.location.origin,
        scopes: provider === "kakao" ? "profile_nickname account_email" : undefined,
      },
    });
    if (error) { showToast("소셜 로그인에 실패했어요. 다시 시도해 주세요."); return; }
    localStorage.setItem("pico_last_login_provider", provider);
  }

  async function handleForgotPassword() {
    if (!forgotEmail) { setAuthError("이메일을 입력해 주세요."); return; }
    setAuthLoading(true); setAuthError("");
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setAuthLoading(false);
    if (error) { setAuthError("이메일 전송에 실패했어요. 다시 시도해 주세요."); return; }
    setForgotSent(true);
  }

  const handleSearchChange = useCallback((q: string) => {
    setPlaySearch(q);
    if (!q.trim()) { setPlaySearchResults([]); setPlaySearchLoading(false); return; }
    const mapped = KOR_TO_TICKER[q.trim()];
    if (mapped) {
      const ikr = isKrTicker(mapped);
      setPlaySearchResults([{ symbol: mapped,
        name: (ikr ? KR_STOCK_META[mapped]?.name : STOCK_META[mapped]?.name) ?? mapped,
        exchange: ikr ? "KRX" : "" }]);
      return;
    }
    const upper = q.trim().toUpperCase();
    const dq    = decomposeHangul(q);
    const local = [
      ...ALL_TICKERS.filter((t) =>
        t.startsWith(upper) || decomposeHangul(STOCK_META[t]?.name ?? "").includes(dq)
      ),
      ...ALL_KR_TICKERS.filter((t) =>
        decomposeHangul(KR_STOCK_META[t]?.name ?? "").includes(dq)
      ),
    ];
    if (local.length > 0) {
      setPlaySearchResults(local.map((t) => ({
        symbol: t,
        name: (isKrTicker(t) ? KR_STOCK_META[t]?.name : STOCK_META[t]?.name) ?? t,
        exchange: isKrTicker(t) ? "KRX" : "",
      })));
      return;
    }
    const id = ++searchIdRef.current;
    setPlaySearchLoading(true);
    fetch(`/api/stocks/search?query=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then((data) => { if (searchIdRef.current === id) setPlaySearchResults(data); })
      .catch(() => { if (searchIdRef.current === id) setPlaySearchResults([]); })
      .finally(() => { if (searchIdRef.current === id) setPlaySearchLoading(false); });
  }, []);

  const animalInfo = quizType ? ANIMAL_NAMES[quizType] : null;

  const s = (ticker: string) => stocks[ticker];
  const krwOf    = (t: string) => s(t)?.formattedKRW    ?? "—";
  const priceOf  = (t: string) => s(t)?.formattedPrice  ?? "—";
  const changeOf = (t: string) => s(t)?.formattedChange ?? "—";
  const upOf     = (t: string) => s(t)?.up ?? true;

  // 원화(주) + 달러(부) 인라인 컴포넌트
  const PriceDisplay = ({ ticker, krwSize = 13, usdSize = 11 }: { ticker: string; krwSize?: number; usdSize?: number }) => (
    <span style={{ display: "inline-flex", alignItems: "baseline", gap: 5 }}>
      <span style={{ ...NUM, fontSize: krwSize, color: "#e8e0d0" }}>{krwOf(ticker)}</span>
      <span style={{ ...NUM, fontSize: usdSize, color: "#5c5448" }}>{priceOf(ticker)}</span>
    </span>
  );

  if (!mounted) return null;

  const SectionLabel = ({ text }: { text: string }) => (
    <div style={{ fontSize: 11, letterSpacing: "0.14em", color: "#5c5448", textTransform: "uppercase" as const, fontWeight: 500, marginBottom: 6 }}>
      {text}
    </div>
  );

  // NewsItem 확장 타입 (AI 번역 결과 포함)
  type RichNewsItem = NewsItem & { korTitle?: string; bullets?: string[] };

  return (
    <div className="min-h-screen" style={{ background: "#0d0d0d" }}>

      {/* ── 토스트 ── */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 fade-in-up"
          style={{ transform: "translateX(-50%)", background: "#1c1c1c", border: "0.5px solid rgba(250,202,62,0.4)", borderRadius: 12, padding: "12px 20px", fontSize: 14, color: "#e8e0d0", fontWeight: 500, whiteSpace: "nowrap", boxShadow: "0 4px 24px rgba(0,0,0,0.4)" }}>
          {toast}
        </div>
      )}

      {isBlurred && (
        <div className="fixed inset-0 z-40" style={{ backdropFilter: "blur(8px)", background: "rgba(13,13,13,0.55)" }} />
      )}

      {/* ══════════ 모바일 검색 오버레이 ══════════ */}
      {mobileSearchOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col" style={{ background: "#0d0d0d" }}>
          {/* 검색 헤더 */}
          <div style={{ display:"flex", alignItems:"center", gap:10,
            padding:"14px 16px 10px", paddingTop:"calc(14px + env(safe-area-inset-top))" }}>
            <button
              onClick={() => { setMobileSearchOpen(false); setPlaySearch(""); setPlaySearchResults([]); }}
              style={{ background:"none", border:"none", color:"#c8bfb0", fontSize:24,
                padding:"4px 8px 4px 0", cursor:"pointer", flexShrink:0, lineHeight:1 }}>
              ‹
            </button>
            <div style={{ flex:1, position:"relative" }}>
              <span style={{ position:"absolute", left:13, top:"50%", transform:"translateY(-50%)", pointerEvents:"none" }}>
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                  <circle cx="9" cy="9" r="6" stroke="#c8bfb0" strokeWidth="1.6"/>
                  <path d="M13.5 13.5L17 17" stroke="#c8bfb0" strokeWidth="1.6" strokeLinecap="round"/>
                </svg>
              </span>
              <input
                autoFocus
                type="text" value={playSearch}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="종목 검색  삼성전자, NVDA, 테슬라..."
                style={{ width:"100%", background:"#1c1c1c",
                  border:"0.5px solid rgba(255,255,255,0.1)", borderRadius:14,
                  color:"#e8e0d0", fontSize:16, fontWeight:300,
                  padding:"12px 36px 12px 36px", outline:"none",
                  fontFamily:"var(--font-paperlogy)" }}
                onFocus={(e) => (e.target.style.borderColor="rgba(250,202,62,0.4)")}
                onBlur={(e)  => (e.target.style.borderColor="rgba(255,255,255,0.1)")}
              />
              {playSearch && (
                <button onClick={() => { setPlaySearch(""); setPlaySearchResults([]); }}
                  style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)",
                    background:"none", border:"none", color:"#c8bfb0", fontSize:16, cursor:"pointer" }}>
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* 검색 결과 */}
          <div style={{ flex:1, overflowY:"auto", padding:"4px 16px 24px" }}>
            {playSearch ? (
              playSearchLoading ? (
                [1,2,3,4].map((i) => (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 0",
                    borderBottom:"0.5px solid rgba(255,255,255,0.05)" }}>
                    <div style={{ width:40, height:40, borderRadius:"50%", background:"#1c1c1c", flexShrink:0 }}/>
                    <div style={{ flex:1 }}>
                      <Skeleton w="55%" h={15}/><div style={{height:5}}/><Skeleton w="32%" h={12}/>
                    </div>
                    <div><Skeleton w={70} h={15}/></div>
                  </div>
                ))
              ) : playSearchResults.length > 0 ? (
                playSearchResults.map((r) => (
                  <StockRow key={r.symbol} ticker={r.symbol} stocks={stocks}
                    stocksLoading={stocksLoading}
                    onClick={() => { setMobileSearchOpen(false); setPlaySearch(""); setPlaySearchResults([]); router.push(`/stock/${r.symbol}?from=play`); }}/>
                ))
              ) : (
                <p style={{ fontSize:15, color:"#5c5448", fontWeight:300, padding:"28px 0",
                  textAlign:"center", fontFamily:"var(--font-paperlogy)" }}>
                  검색 결과가 없어요
                </p>
              )
            ) : (
              <p style={{ fontSize:14, color:"#5c5448", fontWeight:300, padding:"20px 0",
                fontFamily:"var(--font-paperlogy)" }}>
                종목명 또는 티커를 입력해 보세요
              </p>
            )}
          </div>
        </div>
      )}

      {/* ══════════ 헤더 ══════════ */}
      <nav className="sticky top-0 z-30 border-b" style={{ height: 64, background: "rgba(13,13,13,0.96)", backdropFilter: "blur(20px)", borderColor: "rgba(255,255,255,0.06)" }}>
        <div className="h-full flex items-center justify-between mx-auto px-5 lg:px-10" style={{ maxWidth: 1280 }}>
          {/* 로고 — DM Serif Display 유일하게 사용 */}
          <Link href="/" style={{ fontFamily: "var(--font-serif)", fontSize: 24, color: "#FACA3E", letterSpacing: "0.01em", flexShrink: 0, textDecoration: "none" }}>
            PICO
          </Link>

          <div className="hidden sm:flex items-center gap-10">
            {(["event","play","learn"] as MainTab[]).map((tab) => (
              <button key={tab} onClick={() => switchTab(tab)} className="pico-btn relative py-2"
                style={{
                  fontFamily: "var(--font-paperlogy), var(--font-noto), sans-serif",
                  fontSize: mainTab === tab ? 17 : 16,
                  fontWeight: mainTab === tab ? 600 : 500,
                  color: mainTab === tab ? "#FACA3E" : "#e8e0d0",
                  background: "none", border: "none", cursor: "pointer", transition: "color 0.15s, font-size 0.1s",
                }}>
                {tab === "event" ? "홈" : tab === "play" ? "PICO Play" : "📚 도감"}
              </button>
            ))}
          </div>

          {user && userRow ? (
            /* ── 로그인 후: 프로필 ── */
            <div className="flex items-center gap-2">
              <button onClick={() => router.push("/mypage")} className="pico-btn flex items-center"
                style={{ background: "none", border: "none", padding: "4px 0" }}>
                {userRow.avatar_url ? (
                  <img src={userRow.avatar_url} alt="프로필" style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "1.5px solid rgba(255,255,255,0.12)" }} />
                ) : (
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#242424", border: "1.5px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "#a09688", flexShrink: 0 }}>
                    {userRow.nickname[0]?.toUpperCase() ?? "?"}
                  </div>
                )}
                <span className="hidden sm:inline text-[13px] md:text-[16px]" style={{ fontWeight: 500, color: "#e8e0d0", maxWidth: 72, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginLeft: 8 }}>{userRow.nickname}</span>
              </button>
            </div>
          ) : (
            /* ── 비로그인: 로그인/회원가입 ── */
            <div className="flex items-center gap-2">
              <button onClick={() => openLogin()} className="pico-btn px-4 py-2 rounded-lg"
                style={{ fontSize: 13, fontWeight: 500, color: "#a09688", border: "0.5px solid rgba(255,255,255,0.1)", background: "transparent" }}>
                로그인
              </button>
              <button onClick={() => openLogin()} className="pico-btn px-4 py-2 rounded-lg hidden sm:block"
                style={{ fontSize: 13, fontWeight: 500, color: "#0d0d0d", background: "#FACA3E" }}>
                회원가입
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* 모바일 탭 */}
      <div className="sm:hidden flex border-b sticky z-20" style={{ top: 64, background: "rgba(13,13,13,0.96)", backdropFilter: "blur(16px)", borderColor: "rgba(255,255,255,0.06)" }}>
        {(["event","play","learn"] as MainTab[]).map((tab) => (
          <button key={tab} onClick={() => switchTab(tab)} className="flex-1 py-3 relative pico-btn"
            style={{
              fontFamily: "var(--font-paperlogy), var(--font-noto), sans-serif",
              fontSize: mainTab === tab ? 14 : 13,
              fontWeight: mainTab === tab ? 600 : 500,
              color: mainTab === tab ? "#FACA3E" : "#e8e0d0",
              background: "none", border: "none", cursor: "pointer",
            }}>
            {tab === "event" ? "홈" : tab === "play" ? "PICO Play" : "📚 도감"}
          </button>
        ))}
      </div>

      {/* ══════════ 히어로 (이벤트 탭 전용) ══════════ */}
      {mainTab === "event" && (
        <section
          className="relative overflow-hidden border-b"
          style={{
            borderColor: "rgba(255,255,255,0.06)",
            background: "#0d0d0d",
            height: "calc(100vh - 64px)",
            minHeight: 480,
          }}
        >
          {/* 지구본 — 모바일: 전체 / 데스크탑: 오른쪽 65% */}
          <div className="absolute top-0 bottom-0 right-0 left-0 md:left-[35%]" style={{ zIndex: 1 }}>
            <GlobeCanvas />
          </div>

          {/* 데스크탑 좌측 그라디언트 */}
          <div
            className="absolute inset-y-0 left-0 pointer-events-none hidden md:block"
            style={{
              width: "55%",
              background: "linear-gradient(to right, #0d0d0d 55%, rgba(13,13,13,0.6) 75%, transparent 100%)",
              zIndex: 2,
            }}
          />
          {/* 모바일 상단 그라디언트 */}
          <div
            className="absolute inset-x-0 top-0 pointer-events-none md:hidden"
            style={{
              height: "55%",
              background: "linear-gradient(to bottom, rgba(13,13,13,0.9) 0%, rgba(13,13,13,0.5) 60%, transparent 100%)",
              zIndex: 2,
            }}
          />

          {/* 텍스트 오버레이 */}
          <div
            className="absolute inset-0 flex items-start md:items-center"
            style={{ zIndex: 3 }}
          >
            <div style={{ padding: "clamp(40px, 7vh, 72px) clamp(24px, 5vw, 64px)" }} className="md:pl-20 lg:pl-28">
              <h1 style={{ lineHeight: 1.14, marginBottom: 16 }}>
                <span style={{
                  display: "block",
                  fontFamily: "var(--font-mona12), monospace",
                  fontWeight: 400,
                  fontSize: "clamp(22px, 2.4vw, 38px)",
                  color: "#e8e0d0",
                  textDecoration: "line-through",
                  textDecorationColor: "rgba(232,224,208,0.65)",
                  textDecorationThickness: "2px",
                  textUnderlineOffset: "5px",
                  letterSpacing: "-0.01em",
                  textShadow: "0 2px 16px rgba(0,0,0,0.9)",
                }}>
                  금융은 어렵다
                </span>
                <span style={{
                  display: "block",
                  fontFamily: "var(--font-mona12), monospace",
                  fontWeight: 700,
                  fontSize: "clamp(22px, 2.4vw, 38px)",
                  color: "#FACA3E",
                  letterSpacing: "-0.01em",
                  marginTop: 5,
                  textShadow: "0 2px 16px rgba(0,0,0,0.9)",
                }}>
                  아니다. 재밌다
                </span>
              </h1>
              <div style={{
                display: "flex",
                gap: 10,
                flexWrap: "nowrap",
                fontFamily: "var(--font-mona12-emoji), var(--font-mona12), sans-serif",
                fontSize: "clamp(18px, 1.8vw, 26px)",
                lineHeight: 1,
                userSelect: "none",
              }}>
                {["📈","😊","💡","😄","🤖","😍","⚡","😜"].map((e) => (
                  <span key={e}>{e}</span>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ══════════ 메인 콘텐츠 ══════════ */}
      <main className="mx-auto px-5 lg:px-10 pb-24" style={{ maxWidth: 1280 }}>

        {/* ════ 이벤트 탭 ════ */}
        {mainTab === "event" && (
          <div key="event" className={tabAnim}>

            {/* ── 시장 뉴스 ── */}
            <div className="pt-8 pb-6">
              <div className="mb-5">
                <p style={{ fontSize: 28, fontWeight: 500, color: "#e8e0d0", marginBottom: 4 }}>시장 뉴스</p>
                <p style={{ fontSize: 14, color: "#a09688", fontWeight: 300 }}>AI 번역 · 핵심 요약 · 감성 분석</p>
              </div>
              <div className="flex gap-2 mb-5 scroll-x">
                {(["전체","숙박","전기차","반도체","바이오"] as NewsCat[]).map((cat) => (
                  <button key={cat} onClick={() => setNewsCat(cat)} className="pico-btn flex-shrink-0 px-4 py-1.5 rounded-lg"
                    style={{ fontSize: 12, fontWeight: 500, background: newsCat === cat ? "rgba(250,202,62,0.12)" : "rgba(255,255,255,0.04)", color: newsCat === cat ? "#FACA3E" : "#5c5448", border: `0.5px solid ${newsCat === cat ? "rgba(250,202,62,0.3)" : "rgba(255,255,255,0.06)"}` }}>
                    {cat}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {newsLoading
                  ? Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="rounded-xl p-4 border flex flex-col gap-2" style={{ background: "#141414", borderColor: "rgba(255,255,255,0.06)", minHeight: 160 }}>
                      <Skeleton w="55%" h={10} />
                      <Skeleton w="100%" h={14} />
                      <Skeleton w="88%" h={14} />
                      <div style={{ height: 4 }} />
                      <Skeleton w="92%" h={11} />
                      <Skeleton w="78%" h={11} />
                      <Skeleton w="85%" h={11} />
                    </div>
                  ))
                  : (newsItems as RichNewsItem[]).map((item, i) => (
                    <a key={i} href={item.url !== "#" ? item.url : undefined} target="_blank" rel="noopener noreferrer"
                      className="pico-card rounded-xl p-4 border flex flex-col"
                      style={{ background: "#141414", borderColor: "rgba(255,255,255,0.06)", textDecoration: "none", gap: 10, minHeight: 130 }}>
                      {/* 감성 점 */}
                      <div className="flex items-center gap-2">
                        <div className="rounded-full flex-shrink-0" style={{ width: 7, height: 7, background: item.sentiment === "pos" ? "#7ed4a0" : item.sentiment === "neg" ? "#f07878" : "#5c5448" }} />
                        {item.url !== "#" && <span style={{ fontSize: 12, color: "#5c5448", marginLeft: "auto" }}>↗</span>}
                      </div>
                      {/* 제목 (번역 있으면 한국어, 없으면 영어 원문) */}
                      <p style={{ fontSize: 15, fontWeight: 500, color: "#e8e0d0", lineHeight: 1.5, margin: 0, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", flex: 1 }}>
                        {item.korTitle ?? item.title}
                      </p>
                      {/* 핵심 요약 불릿 (AI 번역 완료 시 표시) */}
                      {item.bullets && item.bullets.length > 0 && (
                        <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 4 }}>
                          {item.bullets.map((b, bi) => (
                            <li key={bi} style={{ fontSize: 13, color: "#a09688", lineHeight: 1.5, display: "flex", gap: 6, alignItems: "flex-start", fontWeight: 300 }}>
                              <span style={{ color: "#5c5448", flexShrink: 0 }}>·</span>
                              <span>{b}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      {/* 하단: 출처 + 시간 / AI 요약 레이블 */}
                      <div className="flex items-center justify-between" style={{ marginTop: "auto", paddingTop: 2 }}>
                        <span style={{ fontSize: 11, color: "#5c5448", fontWeight: 300 }}>출처: {item.source} · {item.time}</span>
                        {item.bullets && item.bullets.length > 0 && (
                          <span style={{ fontSize: 11, color: "#FACA3E", fontWeight: 500, letterSpacing: "0.08em" }}>✦ AI 요약</span>
                        )}
                      </div>
                    </a>
                  ))
                }
              </div>
            </div>
          </div>
        )}

        {/* ════ PICO Play 탭 ════ */}
        {mainTab === "play" && (
          <div style={tabNeedsAuth ? { filter: "blur(8px)", pointerEvents: "none", userSelect: "none" } : {}}>
          {(() => {
          // 필터 → 종목 목록 계산
          const baseTickers: string[] = (() => {
            switch (playFilter) {
              case "해외":      return ALL_TICKERS;
              case "한국":      return ALL_KR_TICKERS;
              case "AI·테크":  return [...TICKERS_BY_CATEGORY["AI·반도체"], ...KR_TICKERS_BY_CATEGORY["반도체·AI"]];
              case "빅테크":   return TICKERS_BY_CATEGORY["빅테크"];
              case "테마":     return TICKERS_BY_CATEGORY["2026테마"];
              case "배터리·EV": return KR_TICKERS_BY_CATEGORY["전기차·배터리"];
              case "바이오":   return KR_TICKERS_BY_CATEGORY["바이오"];
              case "금융":     return [...TICKERS_BY_CATEGORY["소비재·금융"], ...KR_TICKERS_BY_CATEGORY["금융"]];
              case "ETF":      return TICKERS_BY_CATEGORY["ETF"];
              default:         return [...ALL_TICKERS, ...ALL_KR_TICKERS];
            }
          })();
          const filteredTickers: string[] = [...baseTickers].sort((a, b) => {
            const da = stocks[a], db = stocks[b];
            if (!da || !db) return 0;
            switch (playSort) {
              case "상승률":  return db.changePercent - da.changePercent;
              case "하락률":  return da.changePercent - db.changePercent;
              case "현재가↑": return db.price - da.price;
              case "현재가↓": return da.price - db.price;
              default: return 0;
            }
          });
          const FILTERS = ["전체","해외","한국","AI·테크","빅테크","테마","배터리·EV","바이오","금융","ETF"] as const;

          const { krOpen, usOpen } = getMarketStatus();

          return (
            <div key="play" className={tabAnim}>

              {/* ── 시장 상태 콜아웃 ── */}
              <div style={{ display:"flex", gap:8, padding:"14px 0 10px", flexWrap:"wrap" }}>
                {[
                  { emoji:"🇰🇷", label:"한국장", open: krOpen },
                  { emoji:"🌎", label:"해외장", open: usOpen },
                ].map(({ emoji, label, open }) => (
                  <div key={label} style={{
                    display:"flex", alignItems:"center", gap:7,
                    background: open ? "rgba(126,212,160,0.08)" : "rgba(255,255,255,0.04)",
                    border: `0.5px solid ${open ? "rgba(126,212,160,0.22)" : "rgba(255,255,255,0.08)"}`,
                    borderRadius:10, padding:"7px 13px",
                  }}>
                    <span style={{ fontFamily:"var(--font-mona12-emoji)", fontSize:15 }}>{emoji}</span>
                    <span style={{ fontFamily:"var(--font-mona12)", fontSize:13, fontWeight:700, color:"#e8e0d0" }}>{label}</span>
                    <span style={{
                      width:6, height:6, borderRadius:"50%", flexShrink:0,
                      background: open ? "#7ed4a0" : "#f07878",
                      boxShadow: `0 0 5px ${open ? "#7ed4a0" : "#f07878"}`,
                    }}/>
                    <span style={{ fontFamily:"var(--font-mona12)", fontSize:12, fontWeight:700, color: open ? "#7ed4a0" : "#c8bfb0" }}>
                      {open ? "LIVE" : "CLOSED"}
                    </span>
                  </div>
                ))}
                {/* 달러 환율 */}
                <div style={{
                  display:"flex", alignItems:"center", gap:7,
                  background: "rgba(255,255,255,0.04)",
                  border:"0.5px solid rgba(255,255,255,0.08)",
                  borderRadius:10, padding:"7px 13px",
                }}>
                  <span style={{ fontFamily:"var(--font-mona12-emoji)", fontSize:15 }}>💱</span>
                  <span style={{ fontFamily:"var(--font-paperlogy)", fontSize:13, fontWeight:600, color:"#c8bfb0" }}>USD/KRW</span>
                  <span style={{ fontFamily:"var(--font-paperlogy)", fontSize:15, fontWeight:700, color:"#e8e0d0" }}>
                    {usdKrw > 0 ? `${usdKrw.toLocaleString("ko-KR")}` : "—"}
                  </span>
                </div>
              </div>

              {/* ── 웹: 검색창부터 우측 패널이 나란히 시작 ── */}
              <div className="hidden md:flex" style={{ gap:16, alignItems:"flex-start" }}>
                {/* 왼쪽 컬럼: 검색창 + 인기종목 + 종목 리스트 */}
                <div style={{ flex:1, minWidth:0 }}>
                  {/* 검색창 */}
                  <div style={{ padding:"10px 0 14px", position:"relative" }}>
                    <span style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)",
                      color:"#c8bfb0", fontSize:14, pointerEvents:"none" }}>&#128269;</span>
                    <input
                      type="text" value={playSearch}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      placeholder="종목 검색   삼성전자, NVDA, 테슬라..."
                      className="w-full rounded-xl outline-none"
                      style={{ background:"#1c1c1c", border:"0.5px solid rgba(255,255,255,0.08)",
                        color:"#e8e0d0", fontSize:16, fontWeight:300, padding:"12px 38px 12px 40px" }}
                      onFocus={(e) => (e.target.style.borderColor="rgba(250,202,62,0.35)")}
                      onBlur={(e)  => (e.target.style.borderColor="rgba(255,255,255,0.08)")}
                    />
                    {playSearch && (
                      <button onClick={() => { setPlaySearch(""); setPlaySearchResults([]); }} className="pico-btn"
                        style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)",
                          color:"#c8bfb0", fontSize:14, background:"none", border:"none" }}>✕</button>
                    )}
                  </div>

                  {/* 인기 종목 */}
                  {!playSearch && (
                    <div style={{
                      background:"#141414", border:"0.5px solid rgba(255,255,255,0.07)",
                      borderRadius:18, padding:"18px 18px 16px", marginBottom:16,
                    }}>
                      <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:16 }}>
                        <span style={{ fontFamily:"var(--font-mona12-emoji)", fontSize:16 }}>🔥</span>
                        <span style={{ fontFamily:"var(--font-mona12)", fontSize:13, fontWeight:700, color:"#e8e0d0", letterSpacing:"0.05em" }}>인기 종목</span>
                      </div>
                      <div style={{ marginBottom:14 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:5, marginBottom:10 }}>
                          <span style={{ fontFamily:"var(--font-mona12-emoji)", fontSize:13 }}>🌎</span>
                          <span style={{ fontFamily:"var(--font-mona12)", fontSize:12, fontWeight:700, color:"#c8bfb0", letterSpacing:"0.04em" }}>해외</span>
                        </div>
                        <div style={{ display:"flex", gap:10 }}>
                          {WEB_FOREIGN_TICKERS.map((t, i) => (
                            <FeaturedCard key={t} ticker={t} stocks={stocks} stocksLoading={stocksLoading}
                              idx={i} large onClick={() => router.push(`/stock/${t}?from=play`)}/>
                          ))}
                        </div>
                      </div>
                      <div style={{ borderTop:"0.5px solid rgba(255,255,255,0.05)", paddingTop:14 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:5, marginBottom:10 }}>
                          <span style={{ fontFamily:"var(--font-mona12-emoji)", fontSize:13 }}>🇰🇷</span>
                          <span style={{ fontFamily:"var(--font-mona12)", fontSize:12, fontWeight:700, color:"#c8bfb0", letterSpacing:"0.04em" }}>한국</span>
                        </div>
                        <div style={{ display:"flex", gap:10 }}>
                          {WEB_DOMESTIC_TICKERS.map((t, i) => (
                            <FeaturedCard key={t} ticker={t} stocks={stocks} stocksLoading={stocksLoading}
                              idx={i+4} large onClick={() => router.push(`/stock/${t}?from=play`)}/>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 검색 결과 */}
                  {playSearch ? (
                    <div>
                      {playSearchLoading
                        ? [1,2,3].map((i) => (
                            <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 0",
                              borderBottom:"0.5px solid rgba(255,255,255,0.05)" }}>
                              <div style={{ width:40, height:40, borderRadius:"50%", background:"#242424", flexShrink:0 }}/>
                              <div style={{ flex:1 }}><Skeleton w="50%" h={14}/><div style={{height:5}}/><Skeleton w="30%" h={11}/></div>
                              <div><Skeleton w={70} h={14}/><div style={{height:5}}/><Skeleton w={50} h={11}/></div>
                            </div>))
                        : playSearchResults.length > 0
                          ? playSearchResults.map((r, i) => (
                              <StockRow key={r.symbol} ticker={r.symbol} stocks={stocks}
                                stocksLoading={stocksLoading} idx={i}
                                onClick={() => router.push(`/stock/${r.symbol}?from=play`)}/>))
                          : <p style={{ fontSize:13, color:"#5c5448", fontWeight:300, padding:"20px 0" }}>검색 결과가 없어요</p>
                      }
                    </div>
                  ) : (
                    <>
                      {/* 필터 + 정렬 바 */}
                      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                        {/* 카테고리 칩 */}
                        <div className="scroll-x" style={{ display:"flex", gap:5, flex:1, minWidth:0 }}>
                          {FILTERS.map((f) => (
                            <button key={f} onClick={() => setPlayFilter(f)} className="pico-btn flex-shrink-0"
                              style={{ fontFamily:"var(--font-mona12)", fontSize:12, fontWeight: playFilter===f ? 700 : 400,
                                padding:"5px 13px", borderRadius:20,
                                background: playFilter===f ? "rgba(250,202,62,0.12)":"rgba(255,255,255,0.04)",
                                color:       playFilter===f ? "#FACA3E":"#c8bfb0",
                                border:     `0.5px solid ${playFilter===f ? "rgba(250,202,62,0.3)":"rgba(255,255,255,0.06)"}`,
                                transition:"all 0.15s" }}>
                              {f}
                            </button>
                          ))}
                        </div>
                        {/* 정렬 드롭다운 */}
                        <div style={{ position:"relative", flexShrink:0 }}>
                          <button onClick={() => setSortOpen(v => !v)} className="pico-btn"
                            style={{ fontFamily:"var(--font-mona12)", fontSize:12, fontWeight:700,
                              padding:"5px 12px", borderRadius:8, display:"flex", alignItems:"center", gap:5,
                              background: playSort !== "기본" ? "rgba(250,202,62,0.12)" : "rgba(255,255,255,0.06)",
                              border: playSort !== "기본" ? "1px solid rgba(250,202,62,0.45)" : "1px solid rgba(200,191,176,0.22)",
                              color: playSort !== "기본" ? "#FACA3E" : "#e8e0d0",
                              cursor:"pointer", whiteSpace:"nowrap" }}>
                            <span style={{ fontSize:13 }}>⇅</span>
                            <span>{playSort === "기본" ? "정렬" : playSort}</span>
                          </button>
                          {sortOpen && (
                            <div style={{
                              position:"absolute", right:0, top:"calc(100% + 6px)", zIndex:20,
                              background:"#1c1c1c", border:"0.5px solid rgba(255,255,255,0.12)",
                              borderRadius:12, overflow:"hidden", minWidth:120,
                              boxShadow:"0 8px 24px rgba(0,0,0,0.5)",
                            }}>
                              {(["기본","상승률","하락률","현재가↑","현재가↓"] as PlaySort[]).map((s) => (
                                <button key={s} onClick={() => { setPlaySort(s); setSortOpen(false); }}
                                  className="pico-btn"
                                  style={{ width:"100%", padding:"10px 16px", textAlign:"left", background:"none",
                                    border:"none", cursor:"pointer", fontFamily:"var(--font-mona12)", fontSize:13,
                                    fontWeight: playSort===s ? 700 : 400,
                                    color: playSort===s ? "#FACA3E" : "#e8e0d0",
                                    borderBottom:"0.5px solid rgba(255,255,255,0.05)",
                                    transition:"background 0.1s" }}
                                  onMouseEnter={e => (e.currentTarget.style.background="rgba(255,255,255,0.04)")}
                                  onMouseLeave={e => (e.currentTarget.style.background="none")}>
                                  {s === "기본" ? "기본순" : s}
                                  {playSort===s && <span style={{ float:"right" }}>✓</span>}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      {/* 종목 리스트 헤더 */}
                      {(() => {
                        const now = new Date();
                        const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
                        const hh  = String(kst.getUTCHours()).padStart(2,"0");
                        const mm  = String(kst.getUTCMinutes()).padStart(2,"0");
                        return (
                          <div style={{ display:"flex", alignItems:"center", gap:12,
                            padding:"10px 0 6px", borderBottom:"0.5px solid rgba(255,255,255,0.08)" }}>
                            <div style={{ width:40, flexShrink:0 }}/>
                            <div style={{ flex:1, minWidth:0, maxWidth:220 }}>
                              <span style={{ fontFamily:"var(--font-mona12)", fontSize:12, color:"#c8bfb0" }}>
                                {hh}:{mm} KST 기준 · 15분 지연
                              </span>
                            </div>
                            <div style={{ width:110, textAlign:"right", fontFamily:"var(--font-mona12)", fontSize:12, color:"#c8bfb0" }}>현재가</div>
                            <div style={{ width:80, textAlign:"right", fontFamily:"var(--font-mona12)", fontSize:12, color:"#c8bfb0" }}>등락률</div>
                          </div>
                        );
                      })()}
                      {/* 종목 리스트 */}
                      <div>
                        {filteredTickers.map((ticker, i) => (
                          <StockRow key={ticker} ticker={ticker} stocks={stocks}
                            stocksLoading={stocksLoading} idx={i}
                            onClick={() => router.push(`/stock/${ticker}?from=play`)}/>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* 오른쪽: 게임 대시보드 */}
                <div style={{ width:320, flexShrink:0 }}>
                  <GameDashboardPanel
                    loading={dashLoading}
                    user={user}
                    userRow={userRow}
                    holdings={dashHoldings}
                    top3={dashTop3}
                    myRank={dashMyRank}
                  />
                </div>
              </div>

              {/* ── 모바일 전면 개편 (토스 스타일 카드형) ── */}
              <div className="md:hidden" style={{ paddingTop: 4 }}>
                    {/* ① 자산 카드 — 포인트는 auth에서 즉시, P&L만 대시보드 로딩 */}
                    <div style={{ background:"#1c1c1c", borderRadius:20, padding:"18px 20px 16px",
                      marginBottom:12, border:"0.5px solid rgba(255,255,255,0.08)" }}>
                      {!user ? (
                        <div style={{ textAlign:"center", padding:"8px 0" }}>
                          <div style={{ fontSize:38, marginBottom:10 }}>🎮</div>
                          <p style={{ fontSize:15, color:"#c8bfb0", fontWeight:300, marginBottom:14,
                            fontFamily:"var(--font-paperlogy)" }}>
                            로그인하면 내 자산을 확인할 수 있어요
                          </p>
                          <button onClick={() => openLogin()} className="pico-btn px-5 py-2.5 rounded-xl"
                            style={{ background:"rgba(250,202,62,0.1)", color:"#FACA3E",
                              border:"0.5px solid rgba(250,202,62,0.3)", fontSize:14, fontWeight:500,
                              fontFamily:"var(--font-paperlogy)" }}>
                            로그인하기
                          </button>
                        </div>
                      ) : (
                        <>
                          <div style={{ fontFamily:"var(--font-mona12)", fontSize:12, fontWeight:700, color:"#c8bfb0", marginBottom:8, letterSpacing:"0.05em" }}>PICO POINTS</div>
                          {/* 포인트 숫자 + P&L 인라인 (같은 행) */}
                          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8 }}>
                            <div style={{ fontSize:38, fontWeight:800, color:"#FACA3E",
                              fontFamily:"var(--font-paperlogy)", letterSpacing:"-0.02em", lineHeight:1 }}>
                              {(userRow?.total_points ?? 0).toLocaleString("ko-KR")}
                              <span style={{ fontSize:22, fontWeight:600, marginLeft:3 }}>P</span>
                            </div>
                            {/* P&L — 대시보드 로딩 중엔 스켈레톤, 완료 후 표시 */}
                            {dashLoading ? (
                              <Skeleton w={88} h={44}/>
                            ) : (() => {
                              const inv = dashHoldings.reduce((s,h) => s + h.invested_points, 0);
                              const val = dashHoldings.reduce((s,h) => s + h.currentValue, 0);
                              const pl  = val - inv;
                              const plR = inv > 0 ? (pl / inv) * 100 : 0;
                              const pos = pl >= 0;
                              if (dashHoldings.length === 0) return null;
                              return (
                                <div style={{ display:"flex", alignItems:"center", gap:6,
                                  background: pos ? "rgba(126,212,160,0.08)" : "rgba(240,120,120,0.08)",
                                  border:`0.5px solid ${pos ? "rgba(126,212,160,0.2)" : "rgba(240,120,120,0.2)"}`,
                                  borderRadius:10, padding:"8px 12px", flexShrink:0 }}>
                                  <span style={{ fontSize:15 }}>{pos ? "🔥" : "❄️"}</span>
                                  <span style={{ ...NUM_MONO, fontSize:14, fontWeight:600,
                                    color: pos ? "#7ed4a0" : "#f07878" }}>
                                    {pos ? "+" : ""}{pl.toLocaleString("ko-KR")}P
                                  </span>
                                  <span style={{ ...NUM_MONO, fontSize:12,
                                    color: pos ? "#7ed4a0" : "#f07878", opacity:0.8 }}>
                                    ({pos ? "+" : ""}{plR.toFixed(1)}%)
                                  </span>
                                </div>
                              );
                            })()}
                          </div>
                        </>
                      )}
                    </div>

                    {/* ② 내 주식 현황 카드 */}
                    {user && (
                      <div style={{ background:"#1c1c1c", borderRadius:20, padding:"18px 20px",
                        marginBottom:12, border:"0.5px solid rgba(255,255,255,0.08)" }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                            <span style={{ fontFamily:"var(--font-mona12-emoji)", fontSize:15 }}>📊</span>
                            <span style={{ fontFamily:"var(--font-mona12)", fontSize:13, fontWeight:700, color:"#e8e0d0" }}>내 투자 현황</span>
                            {!dashLoading && dashHoldings.length > 0 && (
                              <span style={{ fontFamily:"var(--font-mona12)", fontSize:11, color:"#c8bfb0",
                                background:"rgba(255,255,255,0.05)", borderRadius:6, padding:"2px 7px" }}>
                                {dashHoldings.reduce((s, h) => s + h.invested_points, 0).toLocaleString()}P
                              </span>
                            )}
                          </div>
                          <button onClick={() => router.push("/mypage/investments")} className="pico-btn"
                            style={{ fontFamily:"var(--font-mona12)", fontSize:12, color:"#c8bfb0", background:"none", border:"none", cursor:"pointer" }}>
                            전체 보기
                          </button>
                        </div>
                        {dashLoading ? (
                          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                            {[1,2,3].map((i) => <Skeleton key={i} w="100%" h={44}/>)}
                          </div>
                        ) : dashHoldings.length === 0 ? (
                          <p style={{ fontSize:14, color:"#5c5448", fontWeight:300, textAlign:"center",
                            padding:"12px 0", fontFamily:"var(--font-paperlogy)" }}>
                            보유 종목 없음 · 지금 투자해 보세요 🎯
                          </p>
                        ) : (
                          <div style={{ display:"flex", flexDirection:"column" }}>
                            {(() => {
                              const grouped = Object.values(
                                dashHoldings.reduce<Record<string, DashHolding>>((acc, h) => {
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
                              })).slice(0, 5);
                              return grouped.map((h, i) => {
                                const up   = h.profitLoss >= 0;
                                const kr   = isKrTicker(h.ticker);
                                const meta = kr ? KR_STOCK_META[h.ticker] : STOCK_META[h.ticker];
                                const logo = !kr ? `https://financialmodelingprep.com/image-stock/${h.ticker}.png` : null;
                                return (
                                  <button key={h.ticker}
                                    onClick={() => router.push(`/stock/${h.ticker}?from=play`)}
                                    className={`pico-btn w-full ${up ? "flash-green" : "flash-red"}`}
                                    style={{ background:"none", border:"none", cursor:"pointer",
                                      padding:"11px 0",
                                      borderBottom: i < grouped.length - 1
                                        ? "0.5px solid rgba(255,255,255,0.05)" : "none" }}>
                                    <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                                      {logo
                                        ? <TickerLogo src={logo} ticker={h.ticker} size={36}/>
                                        : <div style={{ width:36, height:36, borderRadius:"50%", background:"#242424",
                                            flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center",
                                            fontSize:15, fontWeight:600, color:"#c8bfb0" }}>
                                            {(meta?.name ?? h.ticker)[0]}
                                          </div>
                                      }
                                      <div style={{ flex:1, textAlign:"left", minWidth:0 }}>
                                        <div style={{ display:"flex", alignItems:"center", gap:5, marginBottom:2 }}>
                                          <span style={{ fontSize:15, fontWeight:500, color:"#e8e0d0",
                                            fontFamily:"var(--font-paperlogy)",
                                            overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                                            {meta?.name ?? h.ticker}
                                          </span>
                                          <span style={{ fontFamily:"var(--font-mona12-emoji)", fontSize:14, flexShrink:0 }}>{kr ? "🇰🇷" : "🌎"}</span>
                                        </div>
                                        <span style={{ fontFamily:"var(--font-inter)", fontSize:12, color:"#c8bfb0", whiteSpace:"nowrap" }}>
                                          {h.invested_points.toLocaleString()}P 투자
                                        </span>
                                      </div>
                                      <div style={{ textAlign:"right", flexShrink:0 }}>
                                        <div style={{ ...NUM_MONO, fontSize:15, fontWeight:600,
                                          color: up ? "#7ed4a0" : "#f07878" }}>
                                          {up ? "+" : ""}{h.profitLoss.toLocaleString()}P
                                        </div>
                                        <div style={{ ...NUM_MONO, fontSize:12,
                                          color: up ? "#7ed4a0" : "#f07878", opacity:0.8, marginTop:1 }}>
                                          ({up ? "+" : ""}{h.profitRate.toFixed(1)}%)
                                        </div>
                                      </div>
                                    </div>
                                  </button>
                                );
                              });
                            })()}
                          </div>
                        )}
                      </div>
                    )}

                    {/* ③ 이번 주 랭킹 카드 */}
                    <div style={{ background:"#141414", borderRadius:20, overflow:"hidden",
                      marginBottom:16, border:"0.5px solid rgba(250,202,62,0.12)" }}>
                      {/* 헤더 */}
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
                        padding:"16px 20px 14px" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                          <span style={{ fontFamily:"var(--font-mona12-emoji)", fontSize:15 }}>🏆</span>
                          <span style={{ fontFamily:"var(--font-mona12)", fontSize:13, fontWeight:700,
                            color:"#e8e0d0", letterSpacing:"0.04em" }}>이번 주 랭킹</span>
                        </div>
                        <Link href="/ranking" style={{ fontFamily:"var(--font-mona12)", fontSize:12, color:"#c8bfb0", textDecoration:"none" }}>
                          전체 보기
                        </Link>
                      </div>

                      {dashLoading ? (
                        <div style={{ display:"flex", flexDirection:"column", gap:8, padding:"0 20px 16px" }}>
                          {[1,2,3].map((i) => <Skeleton key={i} w="100%" h={48}/>)}
                        </div>
                      ) : dashTop3.length === 0 ? (
                        <p style={{ fontSize:14, color:"#c8bfb0", fontWeight:300,
                          fontFamily:"var(--font-paperlogy)", padding:"0 20px 20px", margin:0 }}>
                          아직 랭킹 데이터가 없어요
                        </p>
                      ) : (
                        <div style={{ display:"flex", flexDirection:"column" }}>
                          {[
                            { medal:"🥇" },
                            { medal:"🥈" },
                            { medal:"🥉" },
                          ].map((st, i) => {
                            const r = dashTop3[i];
                            if (!r) return null;
                            const pos = r.return_rate >= 0;
                            return (
                              <div key={r.rank_position}
                                style={{ display:"flex", alignItems:"center", gap:12,
                                  padding:"12px 20px",
                                  borderTop: i > 0 ? "0.5px solid rgba(255,255,255,0.04)" : "0.5px solid rgba(255,255,255,0.06)" }}>
                                <span style={{ fontFamily:"var(--font-mona12-emoji)", fontSize:20, flexShrink:0 }}>{st.medal}</span>
                                <div style={{ flex:1, minWidth:0 }}>
                                  {r.equipped_title && TITLE_META[r.equipped_title] && (
                                    <div style={{ fontSize:11, color:TITLE_META[r.equipped_title].color,
                                      fontWeight:300, marginBottom:2 }}>
                                      {TITLE_META[r.equipped_title].emoji} {TITLE_META[r.equipped_title].label}
                                    </div>
                                  )}
                                  <div style={{ fontFamily:"var(--font-paperlogy)", fontSize:15, fontWeight:500, color:"#e8e0d0",
                                    overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                                    {r.nickname}
                                  </div>
                                </div>
                                <span style={{ ...NUM_MONO, fontSize:15, fontWeight:600,
                                  color: pos ? "#7ed4a0" : "#f07878", flexShrink:0 }}>
                                  {pos ? "+" : ""}{r.return_rate.toFixed(1)}%
                                </span>
                              </div>
                            );
                          })}
                          {dashMyRank && user && (
                            <div style={{ display:"flex", alignItems:"center", gap:12,
                              padding:"12px 20px",
                              borderTop:"0.5px solid rgba(250,202,62,0.15)",
                              background:"rgba(250,202,62,0.03)" }}>
                              <span style={{ ...NUM_MONO, fontSize:15, color:"#FACA3E",
                                fontWeight:700, flexShrink:0, minWidth:28 }}>
                                #{dashMyRank.rank_position}
                              </span>
                              <div style={{ flex:1, fontFamily:"var(--font-paperlogy)", fontSize:14, color:"#c8bfb0" }}>나의 순위</div>
                              <span style={{ ...NUM_MONO, fontSize:15, fontWeight:600, flexShrink:0,
                                color: dashMyRank.return_rate >= 0 ? "#7ed4a0" : "#f07878" }}>
                                {dashMyRank.return_rate >= 0 ? "+" : ""}{dashMyRank.return_rate.toFixed(1)}%
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* 구분선 */}
                    <div style={{ borderTop:"0.5px solid rgba(255,255,255,0.06)", marginBottom:18 }}/>

                    {/* ④ 인기 종목 */}
                    <div style={{
                      background:"#141414", border:"0.5px solid rgba(255,255,255,0.07)",
                      borderRadius:16, padding:"14px 14px 12px", marginBottom:14,
                    }}>
                      <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:12 }}>
                        <span style={{ fontFamily:"var(--font-mona12-emoji)", fontSize:15 }}>🔥</span>
                        <span style={{ fontFamily:"var(--font-mona12)", fontSize:13, fontWeight:700, color:"#e8e0d0" }}>인기 종목</span>
                      </div>
                      <div className="scroll-x" style={{ display:"flex", gap:8, paddingBottom:4 }}>
                        {FEATURED_TICKERS.map((t, i) => (
                          <FeaturedCard key={t} ticker={t} stocks={stocks} stocksLoading={stocksLoading}
                            idx={i} onClick={() => router.push(`/stock/${t}?from=play`)}/>
                        ))}
                      </div>
                    </div>

                    {/* ⑤ 전체 종목 헤더 + 필터/정렬 */}
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                      <div className="scroll-x" style={{ display:"flex", gap:5, flex:1, minWidth:0 }}>
                        {FILTERS.map((f) => (
                          <button key={f} onClick={() => setPlayFilter(f)} className="pico-btn flex-shrink-0"
                            style={{ fontFamily:"var(--font-mona12)", fontSize:12,
                              fontWeight: playFilter===f ? 700 : 400, padding:"5px 12px",
                              borderRadius:20,
                              background: playFilter===f ? "rgba(250,202,62,0.12)":"rgba(255,255,255,0.04)",
                              color:       playFilter===f ? "#FACA3E":"#c8bfb0",
                              border:     `0.5px solid ${playFilter===f ? "rgba(250,202,62,0.3)":"rgba(255,255,255,0.06)"}`,
                              transition:"all 0.15s" }}>
                            {f}
                          </button>
                        ))}
                      </div>
                      {/* 정렬 드롭다운 */}
                      <div style={{ position:"relative", flexShrink:0 }}>
                        <button onClick={() => setSortOpen(v => !v)} className="pico-btn"
                          style={{ fontFamily:"var(--font-mona12)", fontSize:12, fontWeight:700,
                            padding:"5px 10px", borderRadius:8, display:"flex", alignItems:"center", gap:4,
                            background: playSort !== "기본" ? "rgba(250,202,62,0.12)" : "rgba(255,255,255,0.06)",
                            border: playSort !== "기본" ? "1px solid rgba(250,202,62,0.45)" : "1px solid rgba(200,191,176,0.22)",
                            color: playSort !== "기본" ? "#FACA3E" : "#e8e0d0",
                            cursor:"pointer", whiteSpace:"nowrap" }}>
                          <span style={{ fontSize:13 }}>⇅</span>
                          <span>{playSort === "기본" ? "정렬" : playSort}</span>
                        </button>
                        {sortOpen && (
                          <div style={{
                            position:"absolute", right:0, top:"calc(100% + 6px)", zIndex:20,
                            background:"#1c1c1c", border:"0.5px solid rgba(255,255,255,0.12)",
                            borderRadius:12, overflow:"hidden", minWidth:120,
                            boxShadow:"0 8px 24px rgba(0,0,0,0.6)",
                          }}>
                            {(["기본","상승률","하락률","현재가↑","현재가↓"] as PlaySort[]).map((s) => (
                              <button key={s} onClick={() => { setPlaySort(s); setSortOpen(false); }}
                                className="pico-btn"
                                style={{ width:"100%", padding:"11px 16px", textAlign:"left", background:"none",
                                  border:"none", cursor:"pointer", fontFamily:"var(--font-mona12)", fontSize:13,
                                  fontWeight: playSort===s ? 700 : 400,
                                  color: playSort===s ? "#FACA3E" : "#e8e0d0",
                                  borderBottom:"0.5px solid rgba(255,255,255,0.05)" }}>
                                {s === "기본" ? "기본순" : s}
                                {playSort===s && <span style={{ float:"right" }}>✓</span>}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 종목 리스트 헤더 */}
                    {(() => {
                      const now = new Date();
                      const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
                      const hh  = String(kst.getUTCHours()).padStart(2,"0");
                      const mm  = String(kst.getUTCMinutes()).padStart(2,"0");
                      return (
                        <div style={{ display:"flex", alignItems:"center", gap:8,
                          padding:"8px 0 5px", borderBottom:"0.5px solid rgba(255,255,255,0.08)" }}>
                          <div style={{ width:40, flexShrink:0 }}/>
                          <div style={{ flex:1, minWidth:0, overflow:"hidden" }}>
                            <span style={{ fontFamily:"var(--font-mona12)", fontSize:11, color:"#c8bfb0", whiteSpace:"nowrap" }}>
                              {hh}:{mm} KST · 15분 지연
                            </span>
                          </div>
                          <div style={{ width:88, textAlign:"right", fontFamily:"var(--font-mona12)", fontSize:11, color:"#c8bfb0", flexShrink:0 }}>현재가</div>
                          <div style={{ width:68, textAlign:"right", fontFamily:"var(--font-mona12)", fontSize:11, color:"#c8bfb0", flexShrink:0 }}>등락률</div>
                        </div>
                      );
                    })()}

                    {/* 종목 리스트 */}
                    <div>
                      {filteredTickers.map((ticker, i) => (
                        <StockRow key={ticker} ticker={ticker} stocks={stocks}
                          stocksLoading={stocksLoading} idx={i}
                          onClick={() => router.push(`/stock/${ticker}?from=play`)}/>
                      ))}
                    </div>
              </div>

            </div>
          );
        })()}
          </div>
        )}

      </main>

      {/* ════════ 오늘의 선택 팝업 (로그인 유저 첫 접속) ════════ */}
      {modal === "vs_battle" && (() => {
        const popTotal   = popupVotesUp + popupVotesDown;
        const popPctUp   = popTotal > 0 ? Math.round((popupVotesUp   / popTotal) * 100) : 50;
        const popPctDown = 100 - popPctUp;
        return (
          <>
            <div className="fixed inset-0 z-50" style={{ background: "rgba(0,0,0,0.78)", backdropFilter: "blur(8px)" }} onClick={() => { if (popupBattleDone) setModal(null); }} />
            <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 overflow-y-auto">
              <div className="w-full max-w-sm rounded-2xl p-5 fade-up" style={{ background: "#141414", border: "0.5px solid rgba(250,202,62,0.25)" }} onClick={(e) => e.stopPropagation()}>

                {!popupBattleDone ? (
                  <>
                    {/* 어제 선택 결과 (참여했을 때만) */}
                    {yesterdayVote && yesterdayWinner && (
                      <div
                        className="rounded-xl px-4 py-3 mb-5"
                        style={{
                          background: yesterdayVote.is_correct ? "rgba(126,212,160,0.07)" : "rgba(240,120,120,0.07)",
                          border: `0.5px solid ${yesterdayVote.is_correct ? "rgba(126,212,160,0.22)" : "rgba(240,120,120,0.22)"}`,
                        }}
                      >
                        <p style={{ fontSize: 12, color: "#5c5448", marginBottom: 6, letterSpacing: "0.08em", textTransform: "uppercase" as const, fontWeight: 500 }}>어제 결과</p>
                        <p style={{ fontSize: 15, fontWeight: 500, color: "#e8e0d0", marginBottom: 4 }}>
                          {yesterdayWinner === "UP" ? "📈 올랐어요!" : "📉 내렸어요!"}
                        </p>
                        <p style={{ fontSize: 15, fontWeight: 500, color: yesterdayVote.is_correct ? "#7ed4a0" : "#f07878" }}>
                          {yesterdayVote.is_correct ? "정답! 🎉 +100P 적립" : "아쉽게 틀렸어요 😅"}
                        </p>
                      </div>
                    )}

                    {/* 종목 헤더 */}
                    <div className="flex items-center gap-3 mb-3">
                      <TickerLogo src={`https://logo.clearbit.com/${todayStock.ticker.toLowerCase()}.com`} ticker={todayStock.ticker} size={32} />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                          <span style={{ fontSize: 16, fontWeight: 500, color: "#e8e0d0" }}>{todayStock.name}</span>
                          <span style={{ fontSize: 12, color: "#c8bfb0" }}>· {todayStock.category}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 2 }}>
                          <PriceDisplay ticker={todayStock.ticker} krwSize={14} usdSize={12} />
                          <span style={{ ...NUM, fontSize: 12, color: upOf(todayStock.ticker) ? "#7ed4a0" : "#f07878" }}>
                            {upOf(todayStock.ticker) ? "▲" : "▼"} {changeOf(todayStock.ticker)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 타이틀 */}
                    <div className="mb-5 mt-1">
                      <p style={{ fontSize: 19, fontWeight: 500, color: "#e8e0d0", marginBottom: 4, letterSpacing: "-0.01em" }}>
                        오늘 {todayStock.name}, 어떻게 될까?
                      </p>
                      <p style={{ fontSize: 13, color: "#5c5448", fontWeight: 300 }}>내일 오전 결과 발표 · 정답 시 100P</p>
                    </div>

                    {/* UP / DOWN 카드 */}
                    <div className="flex gap-3 mb-4">
                      {/* 오른다 */}
                      <button
                        onClick={() => setPopupBattleVote("UP")}
                        className="flex-1 rounded-xl border text-center pico-btn"
                        style={{
                          padding: "18px 12px",
                          background: popupBattleVote === "UP" ? "rgba(126,212,160,0.12)" : "#242424",
                          borderWidth: popupBattleVote === "UP" ? 1.5 : 1,
                          borderColor: popupBattleVote === "UP" ? "#7ed4a0" : "rgba(255,255,255,0.13)",
                          transition: "all 0.18s",
                          position: "relative",
                          opacity: popupBattleVote && popupBattleVote !== "UP" ? 0.45 : 1,
                        }}
                      >
                        {popupBattleVote === "UP" && (
                          <div style={{ position: "absolute", top: 8, right: 8, width: 18, height: 18, borderRadius: "50%", background: "#7ed4a0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#0d0d0d", fontWeight: 700 }}>✓</div>
                        )}
                        <div style={{ fontSize: 24, marginBottom: 6 }}>📈</div>
                        <div style={{ fontSize: 15, fontWeight: 500, color: popupBattleVote === "UP" ? "#7ed4a0" : "#e8e0d0", marginBottom: 6 }}>오른다</div>
                        <div style={{ fontSize: 12, color: popupBattleVote === "UP" ? "#7ed4a0" : "#5c5448", fontWeight: 300 }}>
                          {popPctUp}%가 선택
                        </div>
                      </button>

                      {/* 내린다 */}
                      <button
                        onClick={() => setPopupBattleVote("DOWN")}
                        className="flex-1 rounded-xl border text-center pico-btn"
                        style={{
                          padding: "18px 12px",
                          background: popupBattleVote === "DOWN" ? "rgba(240,120,120,0.12)" : "#242424",
                          borderWidth: popupBattleVote === "DOWN" ? 1.5 : 1,
                          borderColor: popupBattleVote === "DOWN" ? "#f07878" : "rgba(255,255,255,0.13)",
                          transition: "all 0.18s",
                          position: "relative",
                          opacity: popupBattleVote && popupBattleVote !== "DOWN" ? 0.45 : 1,
                        }}
                      >
                        {popupBattleVote === "DOWN" && (
                          <div style={{ position: "absolute", top: 8, right: 8, width: 18, height: 18, borderRadius: "50%", background: "#f07878", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#0d0d0d", fontWeight: 700 }}>✓</div>
                        )}
                        <div style={{ fontSize: 24, marginBottom: 6 }}>📉</div>
                        <div style={{ fontSize: 15, fontWeight: 500, color: popupBattleVote === "DOWN" ? "#f07878" : "#e8e0d0", marginBottom: 6 }}>내린다</div>
                        <div style={{ fontSize: 12, color: popupBattleVote === "DOWN" ? "#f07878" : "#5c5448", fontWeight: 300 }}>
                          {popPctDown}%가 선택
                        </div>
                      </button>
                    </div>

                    {/* 참여 버튼 */}
                    <button
                      onClick={handleBattlePopupVote}
                      disabled={!popupBattleVote}
                      className="pico-btn w-full rounded-xl mb-3"
                      style={{
                        padding: "15px 0",
                        background: popupBattleVote ? "#FACA3E" : "#1c1c1c",
                        color: popupBattleVote ? "#0d0d0d" : "#3a3a3a",
                        fontSize: 15,
                        fontWeight: 600,
                        border: popupBattleVote ? "none" : "0.5px solid rgba(255,255,255,0.07)",
                        transition: "all 0.2s",
                        letterSpacing: "-0.01em",
                      }}
                    >
                      출석체크하고 선택하기
                    </button>
                    <p style={{ textAlign: "center", fontSize: 12, color: "#3a3a3a", marginBottom: 10 }}>
                      투표 마감 · 내일 오전 결과 발표
                    </p>
                    <button onClick={() => setModal(null)} className="pico-btn w-full py-2.5" style={{ fontSize: 13, color: "#5c5448", fontWeight: 300 }}>
                      나중에 할게
                    </button>
                  </>
                ) : (
                  <>
                    {/* 선택 완료 화면 */}
                    <div className="text-center mb-5">
                      <div style={{ fontSize: 38, marginBottom: 10 }}>🎯</div>
                      <p style={{ fontSize: 20, fontWeight: 500, color: "#e8e0d0", marginBottom: 6 }}>
                        내일 오전 결과 공개!
                      </p>
                      <p style={{ fontSize: 14, color: "#7ed4a0", fontWeight: 500 }}>오늘 출석 완료 ✓ +50P</p>
                    </div>

                    {/* 선택 결과 강조 */}
                    <div
                      className="rounded-xl p-5 border text-center mb-5"
                      style={{
                        background: popupBattleVote === "UP" ? "rgba(126,212,160,0.07)" : "rgba(240,120,120,0.07)",
                        borderColor: popupBattleVote === "UP" ? "rgba(126,212,160,0.4)" : "rgba(240,120,120,0.4)",
                      }}
                    >
                      <div style={{ fontSize: 24, marginBottom: 6 }}>{popupBattleVote === "UP" ? "📈" : "📉"}</div>
                      <div style={{ fontSize: 17, fontWeight: 500, color: popupBattleVote === "UP" ? "#7ed4a0" : "#f07878", marginBottom: 2 }}>
                        {todayStock.name} {popupBattleVote === "UP" ? "오른다" : "내린다"}
                      </div>
                      <div style={{ fontSize: 13, color: "#5c5448", fontWeight: 300 }}>내 선택</div>
                    </div>

                    <button onClick={() => setModal(null)} className="pico-btn w-full rounded-xl py-3"
                      style={{ background: "#1c1c1c", color: "#a09688", fontSize: 14, fontWeight: 500, border: "0.5px solid rgba(255,255,255,0.1)" }}>
                      닫기
                    </button>
                  </>
                )}
              </div>
            </div>
          </>
        );
      })()}

      {/* ════════ 로그인 모달 ════════ */}
      {modal === "login" && (
        <>
          <div className="fixed inset-0 z-50" style={{ background: "rgba(0,0,0,0.88)", backdropFilter: "blur(16px)" }} onClick={() => setModal(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ overflowY: "auto", paddingTop: 20, paddingBottom: 20 }}>
            <style>{`
              .pico-auth-input:-webkit-autofill,
              .pico-auth-input:-webkit-autofill:hover,
              .pico-auth-input:-webkit-autofill:focus {
                -webkit-box-shadow: 0 0 0 30px #1e1e1e inset !important;
                -webkit-text-fill-color: #e8e0d0 !important;
              }
            `}</style>
            <div className="w-full fade-up" style={{ maxWidth: 400, background: "#141414", border: "0.5px solid rgba(250,202,62,0.2)", borderRadius: 28, padding: "0 0 28px", position: "relative", boxShadow: "0 0 80px rgba(250,202,62,0.07), 0 24px 60px rgba(0,0,0,0.7)", fontFamily: "var(--font-paperlogy), var(--font-noto), sans-serif" }} onClick={(e) => e.stopPropagation()}>

              {/* 닫기 버튼 */}
              <button onClick={() => setModal(null)} className="pico-btn flex items-center justify-center"
                style={{ position: "absolute", top: 16, right: 16, width: 32, height: 32, borderRadius: 10, background: "#1e1e1e", color: "#c8bfb0", border: "0.5px solid rgba(255,255,255,0.08)", fontSize: 14, zIndex: 1 }}>✕</button>

              {/* 브랜딩 헤더 */}
              <div style={{ padding: "28px 28px 0", textAlign: "center", marginBottom: 20 }}>
                <span style={{ fontSize: 44, display: "block", marginBottom: 10 }}>🏆</span>
                <p style={{ fontFamily: "var(--font-mona12)", fontSize: 12, fontWeight: 700, color: "#FACA3E", letterSpacing: "0.1em" }}>WELCOME TO PICO</p>
              </div>

              {/* 탭 스위처 */}
              {!forgotPw && (
                <div style={{ display: "flex", margin: "0 28px 24px", background: "#1a1a1a", borderRadius: 14, padding: 4, gap: 4 }}>
                  {(["login", "signup"] as const).map((tab) => (
                    <button key={tab} onClick={() => { setLoginTab(tab); setAuthError(""); setAuthPwConfirm(""); }}
                      className="pico-btn"
                      style={{ flex: 1, padding: "10px 0", borderRadius: 11, fontSize: 14, fontWeight: 500, transition: "all 0.15s", border: "none",
                        background: loginTab === tab ? "#FACA3E" : "transparent",
                        color:      loginTab === tab ? "#0d0d0d"  : "#c8bfb0",
                      }}>
                      {tab === "login" ? "로그인" : "회원가입"}
                    </button>
                  ))}
                </div>
              )}

              <div style={{ padding: "0 28px" }}>
                {forgotPw ? (
                  /* ── 비밀번호 찾기 ── */
                  <>
                    <p style={{ fontSize: 16, fontWeight: 700, color: "#e8e0d0", marginBottom: 6, textAlign: "center", letterSpacing: "-0.02em" }}>비밀번호 재설정</p>
                    <p style={{ fontSize: 13, color: "#c8bfb0", fontWeight: 300, marginBottom: 20, lineHeight: 1.7, textAlign: "center" }}>
                      가입한 이메일로 재설정 링크를 보내드려요.
                    </p>
                    {forgotSent ? (
                      <div style={{ borderRadius: 14, padding: "16px 20px", textAlign: "center", background: "#1a1a1a", border: "0.5px solid rgba(250,202,62,0.25)", marginBottom: 12 }}>
                        <p style={{ fontFamily: "var(--font-mona12)", fontSize: 13, color: "#FACA3E", fontWeight: 700, marginBottom: 6 }}>이메일을 확인해 주세요</p>
                        <p style={{ fontSize: 13, color: "#c8bfb0", fontWeight: 300 }}>받은 편지함에서 재설정 링크를 클릭하면 돼요.</p>
                      </div>
                    ) : (
                      <>
                        <input type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} placeholder="가입한 이메일 주소"
                          className="w-full outline-none pico-auth-input"
                          style={{ display: "block", background: "#1e1e1e", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "13px 16px", color: "#e8e0d0", fontSize: 16, fontWeight: 300, marginBottom: 10 }}
                          onFocus={(e) => (e.target.style.borderColor = "rgba(250,202,62,0.45)")}
                          onBlur={(e)  => (e.target.style.borderColor = "rgba(255,255,255,0.08)")}
                        />
                        {authError && <p style={{ fontSize: 12, color: "#f07878", marginBottom: 10 }}>{authError}</p>}
                        <button onClick={handleForgotPassword} disabled={authLoading} className="pico-btn w-full"
                          style={{ display: "block", background: "#FACA3E", color: "#0d0d0d", fontSize: 15, fontWeight: 500, borderRadius: 12, padding: "14px 0", marginBottom: 10, border: "none" }}>
                          {authLoading ? "전송 중..." : "재설정 링크 받기"}
                        </button>
                      </>
                    )}
                    <button onClick={() => { setForgotPw(false); setAuthError(""); setForgotSent(false); }} className="pico-btn w-full"
                      style={{ display: "block", background: "transparent", color: "#c8bfb0", fontSize: 13, fontWeight: 300, borderRadius: 12, padding: "10px 0", border: "none" }}>
                      로그인으로 돌아가기
                    </button>
                  </>
                ) : loginTab === "login" ? (
                  /* ── 로그인 ── */
                  <>
                    <input type="email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} placeholder="이메일"
                      className="w-full outline-none pico-auth-input"
                      style={{ display: "block", background: "#1e1e1e", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "13px 16px", color: "#e8e0d0", fontSize: 16, fontWeight: 300, marginBottom: 10 }}
                      onFocus={(e) => (e.target.style.borderColor = "rgba(250,202,62,0.45)")}
                      onBlur={(e)  => (e.target.style.borderColor = "rgba(255,255,255,0.08)")}
                      onKeyDown={(e) => e.key === "Enter" && handleAuth()}
                    />
                    <input type="password" value={authPw} onChange={(e) => setAuthPw(e.target.value)} placeholder="비밀번호"
                      className="w-full outline-none pico-auth-input"
                      style={{ display: "block", background: "#1e1e1e", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "13px 16px", color: "#e8e0d0", fontSize: 16, fontWeight: 300, marginBottom: 12 }}
                      onFocus={(e) => (e.target.style.borderColor = "rgba(250,202,62,0.45)")}
                      onBlur={(e)  => (e.target.style.borderColor = "rgba(255,255,255,0.08)")}
                      onKeyDown={(e) => e.key === "Enter" && handleAuth()}
                    />
                    <div className="flex items-center justify-between" style={{ marginBottom: 20 }}>
                      <label className="flex items-center gap-2 cursor-pointer" style={{ fontSize: 12, color: "#c8bfb0", fontWeight: 300 }}>
                        <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} style={{ accentColor: "#FACA3E", width: 13, height: 13 }} />
                        로그인 유지
                      </label>
                      <button onClick={() => { setForgotPw(true); setAuthError(""); }} className="pico-btn"
                        style={{ fontSize: 12, color: "#c8bfb0", fontWeight: 300, background: "transparent", border: "none" }}>
                        비밀번호 찾기
                      </button>
                    </div>
                    {authError && <p style={{ fontSize: 12, color: "#f07878", marginBottom: 12 }}>{authError}</p>}
                    <button onClick={handleAuth} disabled={authLoading} className="pico-btn w-full"
                      style={{ display: "block", background: "#FACA3E", color: "#0d0d0d", fontSize: 15, fontWeight: 500, borderRadius: 12, padding: "14px 0", marginBottom: 20, border: "none" }}>
                      {authLoading ? "처리 중..." : "로그인"}
                    </button>
                    <div className="flex items-center gap-3" style={{ marginBottom: 14 }}>
                      <div style={{ flex: 1, height: "0.5px", background: "rgba(255,255,255,0.07)" }} />
                      <span style={{ fontFamily: "var(--font-mona12)", fontSize: 11, color: "#c8bfb0", fontWeight: 400, letterSpacing: "0.04em", opacity: 0.5 }}>또는</span>
                      <div style={{ flex: 1, height: "0.5px", background: "rgba(255,255,255,0.07)" }} />
                    </div>
                    {/* 원형 소셜 버튼 */}
                    <div className="flex items-center justify-center" style={{ gap: 20, marginBottom: 8, paddingTop: 4 }}>
                      {/* 구글 */}
                      <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center" }}>
                        {lastLoginProvider === "google" && (
                          <div style={{ position: "absolute", bottom: "calc(100% + 10px)", left: "50%", transform: "translateX(-50%)", background: "#FACA3E", color: "#0d0d0d", fontSize: 10, fontWeight: 700, borderRadius: 6, padding: "3px 9px", whiteSpace: "nowrap", pointerEvents: "none" }}>
                            최근 로그인
                            <div style={{ position: "absolute", bottom: -4, left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "4px solid transparent", borderRight: "4px solid transparent", borderTop: "4px solid #FACA3E" }} />
                          </div>
                        )}
                        <button onClick={() => handleSocialLogin("google")} className="pico-btn flex items-center justify-center"
                          style={{ width: 54, height: 54, borderRadius: "50%", background: "#fff", border: lastLoginProvider === "google" ? "2.5px solid #FACA3E" : "2.5px solid transparent" }}>
                          <svg width="22" height="22" viewBox="0 0 48 48">
                            <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 2.9l5.7-5.7C34.5 7 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.9z"/>
                            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16.1 19 13 24 13c3.1 0 5.8 1.1 7.9 2.9l5.7-5.7C34.5 7 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
                            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.5-5.1l-6.2-5.3C29.4 35.5 26.8 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.7 39.7 16.3 44 24 44z"/>
                            <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.3 5.5l6.2 5.3c-.4.4 6.8-5 6.8-14.8 0-1.3-.1-2.7-.4-3.9z"/>
                          </svg>
                        </button>
                      </div>
                      {/* 카카오 */}
                      <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center" }}>
                        {lastLoginProvider === "kakao" && (
                          <div style={{ position: "absolute", bottom: "calc(100% + 10px)", left: "50%", transform: "translateX(-50%)", background: "#FACA3E", color: "#0d0d0d", fontSize: 10, fontWeight: 700, borderRadius: 6, padding: "3px 9px", whiteSpace: "nowrap", pointerEvents: "none" }}>
                            최근 로그인
                            <div style={{ position: "absolute", bottom: -4, left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "4px solid transparent", borderRight: "4px solid transparent", borderTop: "4px solid #FACA3E" }} />
                          </div>
                        )}
                        <button onClick={() => handleSocialLogin("kakao")} className="pico-btn flex items-center justify-center"
                          style={{ width: 54, height: 54, borderRadius: "50%", background: "#FEE500", border: lastLoginProvider === "kakao" ? "2.5px solid #FACA3E" : "2.5px solid transparent" }}>
                          <svg width="22" height="22" viewBox="0 0 18 18">
                            <path fill="#191600" d="M9 1.5C4.86 1.5 1.5 4.17 1.5 7.5c0 2.13 1.38 4.01 3.47 5.09l-.88 3.27a.19.19 0 0 0 .28.21L8.1 13.7a9.4 9.4 0 0 0 .9.05c4.14 0 7.5-2.67 7.5-6S13.14 1.5 9 1.5z"/>
                          </svg>
                        </button>
                      </div>
                      {/* 미구현 (애플) */}
                      <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center" }}>
                        <div style={{ position: "absolute", bottom: "calc(100% + 10px)", left: "50%", transform: "translateX(-50%)", background: "#2a2a2a", color: "#c8bfb0", fontSize: 10, fontWeight: 500, borderRadius: 6, padding: "3px 9px", whiteSpace: "nowrap", pointerEvents: "none", border: "0.5px solid rgba(255,255,255,0.12)" }}>
                          미구현
                          <div style={{ position: "absolute", bottom: -4, left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "4px solid transparent", borderRight: "4px solid transparent", borderTop: "4px solid #2a2a2a" }} />
                        </div>
                        <button disabled className="pico-btn flex items-center justify-center"
                          style={{ width: 54, height: 54, borderRadius: "50%", background: "#1e1e1e", border: "2.5px solid rgba(255,255,255,0.1)", opacity: 0.5, cursor: "not-allowed" }}>
                          <svg width="18" height="22" viewBox="0 0 16 20" fill="#e8e0d0">
                            <path d="M13.4 10.5c0-2.7 2.1-4 2.2-4.1-1.2-1.7-3-1.9-3.7-2-1.6-.2-3 .9-3.8.9-.8 0-2-.9-3.3-.9C3 3.5 1 4.7 0 6.6c-2 3.8-.8 9.5 1.2 12.6 1 1.5 2.2 3.1 3.8 3.1 1.5 0 2.1-1 4-1s2.4 1 4 1c1.6 0 2.7-1.5 3.7-3 1.2-1.7 1.7-3.3 1.7-3.4-.1-.1-3-1.2-3-4.4zM10.6 2.4c.8-1 1.4-2.4 1.2-3.8-1.2.1-2.6.8-3.4 1.8-.8.9-1.5 2.3-1.3 3.7 1.3.1 2.7-.7 3.5-1.7z"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  /* ── 회원가입 ── */
                  <>
                    <input type="email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} placeholder="이메일"
                      className="w-full outline-none pico-auth-input"
                      style={{ display: "block", background: "#1e1e1e", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "13px 16px", color: "#e8e0d0", fontSize: 16, fontWeight: 300, marginBottom: 10 }}
                      onFocus={(e) => (e.target.style.borderColor = "rgba(250,202,62,0.45)")}
                      onBlur={(e)  => (e.target.style.borderColor = "rgba(255,255,255,0.08)")}
                    />
                    <input type="password" value={authPw} onChange={(e) => setAuthPw(e.target.value)} placeholder="비밀번호 (6자 이상)"
                      className="w-full outline-none pico-auth-input"
                      style={{ display: "block", background: "#1e1e1e", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "13px 16px", color: "#e8e0d0", fontSize: 16, fontWeight: 300, marginBottom: 10 }}
                      onFocus={(e) => (e.target.style.borderColor = "rgba(250,202,62,0.45)")}
                      onBlur={(e)  => (e.target.style.borderColor = "rgba(255,255,255,0.08)")}
                    />
                    <input type="password" value={authPwConfirm} onChange={(e) => setAuthPwConfirm(e.target.value)} placeholder="비밀번호 확인"
                      className="w-full outline-none pico-auth-input"
                      style={{ display: "block", background: "#1e1e1e", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "13px 16px", color: "#e8e0d0", fontSize: 16, fontWeight: 300, marginBottom: 16 }}
                      onFocus={(e) => (e.target.style.borderColor = "rgba(250,202,62,0.45)")}
                      onBlur={(e)  => (e.target.style.borderColor = "rgba(255,255,255,0.08)")}
                      onKeyDown={(e) => e.key === "Enter" && handleSignUp()}
                    />
                    {authError && <p style={{ fontSize: 12, color: "#f07878", marginBottom: 12 }}>{authError}</p>}
                    <button onClick={handleSignUp} disabled={authLoading} className="pico-btn w-full"
                      style={{ display: "block", background: "#FACA3E", color: "#0d0d0d", fontSize: 15, fontWeight: 500, borderRadius: 12, padding: "14px 0", marginBottom: 20, border: "none" }}>
                      {authLoading ? "처리 중..." : "가입하기"}
                    </button>
                    <div className="flex items-center gap-3" style={{ marginBottom: 14 }}>
                      <div style={{ flex: 1, height: "0.5px", background: "rgba(255,255,255,0.07)" }} />
                      <span style={{ fontFamily: "var(--font-mona12)", fontSize: 11, color: "#c8bfb0", fontWeight: 400, letterSpacing: "0.04em", opacity: 0.5 }}>또는</span>
                      <div style={{ flex: 1, height: "0.5px", background: "rgba(255,255,255,0.07)" }} />
                    </div>
                    {/* 원형 소셜 버튼 */}
                    <div className="flex items-center justify-center" style={{ gap: 20, marginBottom: 8, paddingTop: 4 }}>
                      {/* 구글 */}
                      <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center" }}>
                        <button onClick={() => handleSocialLogin("google")} className="pico-btn flex items-center justify-center"
                          style={{ width: 54, height: 54, borderRadius: "50%", background: "#fff", border: "2.5px solid transparent" }}>
                          <svg width="22" height="22" viewBox="0 0 48 48">
                            <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 2.9l5.7-5.7C34.5 7 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.9z"/>
                            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16.1 19 13 24 13c3.1 0 5.8 1.1 7.9 2.9l5.7-5.7C34.5 7 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
                            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.5-5.1l-6.2-5.3C29.4 35.5 26.8 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.7 39.7 16.3 44 24 44z"/>
                            <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.3 5.5l6.2 5.3c-.4.4 6.8-5 6.8-14.8 0-1.3-.1-2.7-.4-3.9z"/>
                          </svg>
                        </button>
                      </div>
                      {/* 카카오 */}
                      <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center" }}>
                        <button onClick={() => handleSocialLogin("kakao")} className="pico-btn flex items-center justify-center"
                          style={{ width: 54, height: 54, borderRadius: "50%", background: "#FEE500", border: "2.5px solid transparent" }}>
                          <svg width="22" height="22" viewBox="0 0 18 18">
                            <path fill="#191600" d="M9 1.5C4.86 1.5 1.5 4.17 1.5 7.5c0 2.13 1.38 4.01 3.47 5.09l-.88 3.27a.19.19 0 0 0 .28.21L8.1 13.7a9.4 9.4 0 0 0 .9.05c4.14 0 7.5-2.67 7.5-6S13.14 1.5 9 1.5z"/>
                          </svg>
                        </button>
                      </div>
                      {/* 미구현 (애플) */}
                      <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center" }}>
                        <div style={{ position: "absolute", bottom: "calc(100% + 10px)", left: "50%", transform: "translateX(-50%)", background: "#2a2a2a", color: "#c8bfb0", fontSize: 10, fontWeight: 500, borderRadius: 6, padding: "3px 9px", whiteSpace: "nowrap", pointerEvents: "none", border: "0.5px solid rgba(255,255,255,0.12)" }}>
                          미구현
                          <div style={{ position: "absolute", bottom: -4, left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "4px solid transparent", borderRight: "4px solid transparent", borderTop: "4px solid #2a2a2a" }} />
                        </div>
                        <button disabled className="pico-btn flex items-center justify-center"
                          style={{ width: 54, height: 54, borderRadius: "50%", background: "#1e1e1e", border: "2.5px solid rgba(255,255,255,0.1)", opacity: 0.5, cursor: "not-allowed" }}>
                          <svg width="18" height="22" viewBox="0 0 16 20" fill="#e8e0d0">
                            <path d="M13.4 10.5c0-2.7 2.1-4 2.2-4.1-1.2-1.7-3-1.9-3.7-2-1.6-.2-3 .9-3.8.9-.8 0-2-.9-3.3-.9C3 3.5 1 4.7 0 6.6c-2 3.8-.8 9.5 1.2 12.6 1 1.5 2.2 3.1 3.8 3.1 1.5 0 2.1-1 4-1s2.4 1 4 1c1.6 0 2.7-1.5 3.7-3 1.2-1.7 1.7-3.3 1.7-3.4-.1-.1-3-1.2-3-4.4zM10.6 2.4c.8-1 1.4-2.4 1.2-3.8-1.2.1-2.6.8-3.4 1.8-.8.9-1.5 2.3-1.3 3.7 1.3.1 2.7-.7 3.5-1.7z"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ════════ 이메일 인증 모달 (이메일 가입 후) ════════ */}
      {modal === "email_verify" && (
        <>
          <div className="fixed inset-0 z-50" style={{ background: "rgba(0,0,0,0.92)", backdropFilter: "blur(20px)" }} onClick={() => setModal(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div className="w-full fade-up" style={{ maxWidth: 400, background: "#141414", border: "0.5px solid rgba(250,202,62,0.2)", borderRadius: 28, padding: "36px 28px 28px", position: "relative", boxShadow: "0 0 80px rgba(250,202,62,0.07), 0 24px 60px rgba(0,0,0,0.7)", fontFamily: "var(--font-paperlogy), var(--font-noto), sans-serif" }} onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setModal(null)} className="pico-btn flex items-center justify-center"
                style={{ position: "absolute", top: 16, right: 16, width: 32, height: 32, borderRadius: 10, background: "#1e1e1e", color: "#c8bfb0", border: "0.5px solid rgba(255,255,255,0.08)", fontSize: 14, zIndex: 1 }}>✕</button>

              <div style={{ textAlign: "center", marginBottom: 28 }}>
                <span style={{ fontSize: 44, display: "block", marginBottom: 10 }}>📧</span>
                <p style={{ fontFamily: "var(--font-mona12)", fontSize: 12, fontWeight: 700, color: "#FACA3E", letterSpacing: "0.1em", marginBottom: 10 }}>EMAIL VERIFY</p>
                <p style={{ fontSize: 18, fontWeight: 700, color: "#e8e0d0", marginBottom: 8, letterSpacing: "-0.02em" }}>이메일을 확인해 주세요</p>
                <p style={{ fontSize: 13, fontWeight: 300, color: "#c8bfb0", lineHeight: 1.7, margin: 0 }}>
                  <span style={{ color: "#e8e0d0" }}>{emailVerifyEmail}</span>로<br />6자리 인증 코드를 보냈어요
                </p>
              </div>

              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={emailVerifyCode}
                onChange={(e) => setEmailVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="인증 코드 6자리"
                className="w-full outline-none pico-auth-input"
                style={{ display: "block", background: "#1e1e1e", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "13px 16px", color: "#e8e0d0", fontSize: 22, fontWeight: 700, marginBottom: 10, textAlign: "center", letterSpacing: "0.25em", fontFamily: "var(--font-inter)" }}
                onFocus={(e) => (e.target.style.borderColor = "rgba(250,202,62,0.45)")}
                onBlur={(e)  => (e.target.style.borderColor = "rgba(255,255,255,0.08)")}
                onKeyDown={(e) => e.key === "Enter" && handleVerifyEmail()}
              />

              {emailVerifyError && <p style={{ fontSize: 12, color: "#f07878", marginBottom: 10, textAlign: "center" }}>{emailVerifyError}</p>}

              <button onClick={handleVerifyEmail} disabled={emailVerifyLoading || emailVerifyCode.length !== 6} className="pico-btn w-full"
                style={{ display: "block", background: emailVerifyCode.length === 6 ? "#FACA3E" : "rgba(255,255,255,0.06)", color: emailVerifyCode.length === 6 ? "#0d0d0d" : "#c8bfb0", fontSize: 15, fontWeight: 500, borderRadius: 12, padding: "14px 0", marginBottom: 16, border: "none", transition: "all 0.15s" }}>
                {emailVerifyLoading ? "인증 중..." : "인증하기"}
              </button>

              <div style={{ textAlign: "center" }}>
                <button onClick={handleResendVerify} disabled={emailVerifyResending} className="pico-btn"
                  style={{ fontSize: 13, color: "#c8bfb0", fontWeight: 300, background: "transparent", border: "none", textDecoration: "underline", textUnderlineOffset: 3 }}>
                  {emailVerifyResending ? "재전송 중..." : "코드를 받지 못하셨나요? 재전송"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ════════ 닉네임 설정 모달 (신규 가입 후) ════════ */}
      {modal === "setup_profile" && user && (
        <>
          <div className="fixed inset-0 z-50" style={{ background: "rgba(0,0,0,0.92)", backdropFilter: "blur(20px)" }} />
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div className="w-full fade-up" style={{ maxWidth: 380, background: "#141414", border: "0.5px solid rgba(250,202,62,0.25)", borderRadius: 28, padding: "36px 28px 28px", boxShadow: "0 0 80px rgba(250,202,62,0.1), 0 24px 60px rgba(0,0,0,0.7)", fontFamily: "var(--font-paperlogy), var(--font-noto), sans-serif" }}>

              {/* 환영 헤더 */}
              <div style={{ textAlign: "center", marginBottom: 28 }}>
                <p style={{ fontFamily: "var(--font-mona12)", fontSize: 12, fontWeight: 700, color: "#FACA3E", marginBottom: 8, letterSpacing: "0.1em" }}>NICKNAME</p>
                <p style={{ fontSize: 13, fontWeight: 300, color: "#c8bfb0", margin: 0, lineHeight: 1.65 }}>나만의 닉네임으로 PICO 여정을 시작해보세요</p>
              </div>

              {/* 프로필 사진 업로드 */}
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
                <button onClick={() => setupFileRef.current?.click()} className="pico-btn" style={{ background: "none", border: "none", position: "relative" }}>
                  {setupPreviewUrl ? (
                    <img src={setupPreviewUrl} alt="프로필" style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(250,202,62,0.4)" }} />
                  ) : (
                    <div style={{ width: 80, height: 80, borderRadius: "50%", background: "#1c1c1c", border: "2px dashed rgba(250,202,62,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, color: "#c8bfb0" }}>
                      {setupNickname[0]?.toUpperCase() ?? "?"}
                    </div>
                  )}
                  <div style={{ position: "absolute", bottom: 0, right: 0, width: 26, height: 26, borderRadius: "50%", background: "#FACA3E", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "#0d0d0d" }}>✎</div>
                </button>
                <input ref={setupFileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setSetupPendingFile(file);
                  setSetupPreviewUrl(URL.createObjectURL(file));
                }} />
              </div>
              <p style={{ fontFamily: "var(--font-mona12)", fontSize: 12, fontWeight: 400, color: "#c8bfb0", textAlign: "center", marginBottom: 20, opacity: 0.7 }}>프로필 사진 (선택)</p>

              {/* 닉네임 입력 */}
              <div style={{ marginBottom: 20 }}>
                <p style={{ fontFamily: "var(--font-mona12)", fontSize: 11, fontWeight: 700, color: "#c8bfb0", marginBottom: 8, letterSpacing: "0.04em" }}>닉네임</p>
                <input
                  value={setupNickname}
                  onChange={(e) => setSetupNickname(e.target.value)}
                  placeholder="닉네임을 입력해 주세요"
                  className="w-full outline-none"
                  style={{ display: "block", background: "#1e1e1e", border: "1px solid rgba(250,202,62,0.35)", borderRadius: 12, padding: "13px 16px", color: "#e8e0d0", fontSize: 16, fontWeight: 300 }}
                  onFocus={(e) => (e.target.style.borderColor = "rgba(250,202,62,0.65)")}
                  onBlur={(e)  => (e.target.style.borderColor = "rgba(250,202,62,0.35)")}
                  onKeyDown={(e) => e.key === "Enter" && handleSaveSetup()}
                />
              </div>

              {/* PICO 시작하기 */}
              <button onClick={handleSaveSetup} disabled={setupSaving || !setupNickname.trim()} className="pico-btn w-full"
                style={{ width: "100%", padding: "14px 0", borderRadius: 14, fontSize: 15, fontWeight: 500, border: "none", marginBottom: 8, transition: "all 0.15s",
                  background: setupNickname.trim() ? "#FACA3E" : "rgba(255,255,255,0.05)",
                  color:      setupNickname.trim() ? "#0d0d0d"  : "#c8bfb0",
                  cursor:     setupNickname.trim() ? "pointer"  : "not-allowed",
                }}>
                {setupSaving ? "저장 중..." : "PICO 시작하기"}
              </button>
              <button onClick={() => setModal(null)} className="pico-btn w-full"
                style={{ display: "block", width: "100%", padding: "10px 0", background: "transparent", color: "#c8bfb0", fontSize: 13, fontWeight: 300, border: "none" }}>
                나중에 설정할게요
              </button>
            </div>
          </div>
        </>
      )}

      {/* ════════ 유형 상세 팝업 ════════ */}
      {popupType && (() => {
        const typeColors: Record<string, string> = {
          tiger: "#f07878", wolf: "#c4b0fc", eagle: "#7eb8f7", fox: "#f5a742",
          butterfly: "#FACA3E", hedgehog: "#7ed4a0", elephant: "#7eb8f7", turtle: "#7ed4a0",
        };
        const color = typeColors[popupType] ?? "#FACA3E";
        const info  = ANIMAL_NAMES[popupType];
        const typeData = INVESTOR_TYPES[popupType as keyof typeof INVESTOR_TYPES];
        if (!info || !typeData) return null;
        return (
          <>
            <div className="fixed inset-0 z-50" style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }} onClick={() => setPopupType(null)} />
            <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 overflow-y-auto">
              <div className="w-full max-w-md rounded-2xl border overflow-y-auto fade-up"
                style={{ background: "#141414", borderColor: `${color}40`, maxHeight: "88vh" }}>
                {/* 헤더 */}
                <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                  <div className="flex items-center gap-3">
                    <span style={{ fontSize: 32 }}>{info.emoji}</span>
                    <div>
                      <p style={{ fontFamily: "'Instrument Sans','Noto Sans KR',sans-serif", fontSize: 11, fontWeight: 400, color, marginBottom: 2, letterSpacing: "0.06em", textTransform: "uppercase" }}>{info.modifier}</p>
                      <p style={{ fontFamily: "'Instrument Sans','Noto Sans KR',sans-serif", fontSize: 20, fontWeight: 600, color: "#e8e0d0" }}>{info.name}</p>
                    </div>
                  </div>
                  <button onClick={() => setPopupType(null)} className="pico-btn flex items-center justify-center rounded-xl w-8 h-8" style={{ background: "#1c1c1c", color: "#5c5448", border: "0.5px solid rgba(255,255,255,0.08)", fontSize: 14 }}>✕</button>
                </div>

                <div className="px-6 py-5 flex flex-col gap-4">
                  {/* 성향 */}
                  <p style={{ fontSize: 14, color: "#a09688", lineHeight: 1.8, fontWeight: 300 }}>{typeData.desc}</p>

                  {/* 포트폴리오 */}
                  <div className="rounded-xl p-4 border" style={{ background: "#1c1c1c", borderColor: "rgba(255,255,255,0.07)" }}>
                    <div className="flex items-center gap-1.5 mb-3">
                      <p style={{ fontSize: 11, letterSpacing: "0.1em", color: "#5c5448", textTransform: "uppercase", fontWeight: 500 }}>포트폴리오 배분</p>
                      <span title="포트폴리오 = 내가 투자한 자산들의 구성 비율. 어디에 얼마나 투자했는지 보여줘."
                        style={{ fontSize: 10, color: "#5c5448", background: "#242424", border: "0.5px solid rgba(255,255,255,0.1)", borderRadius: "50%", width: 14, height: 14, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "help", flexShrink: 0 }}>?</span>
                    </div>
                    <div className="flex flex-col gap-2">
                      {typeData.allocation.map((a) => (
                        <div key={a.label} className="flex justify-between items-center">
                          <span style={{ fontSize: 13, color: "#c8c0b0" }}>{a.label}</span>
                          <span style={{ fontFamily: "var(--font-inter)", fontSize: 14, fontWeight: 600, color }}>{a.pct}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 잘 맞는 스타일 */}
                  <div className="rounded-xl p-4 border" style={{ background: "#1c1c1c", borderColor: "rgba(255,255,255,0.07)" }}>
                    <p style={{ fontSize: 11, letterSpacing: "0.1em", color: "#5c5448", textTransform: "uppercase", fontWeight: 500, marginBottom: 10 }}>잘 맞는 종목 스타일</p>
                    <div className="flex flex-col gap-2">
                      {typeData.recommended.filter((r) => r.label !== "피할 것").map((r) => (
                        <div key={r.label} className="flex gap-2">
                          <span style={{ fontSize: 10, color, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", paddingTop: 2, flexShrink: 0 }}>{r.label}</span>
                          <span style={{ fontSize: 13, color: "#a09688", lineHeight: 1.5 }}>{r.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 조심할 것 */}
                  <div className="flex flex-col gap-2">
                    {typeData.guards.map((g) => (
                      <div key={g.title} className="rounded-xl p-4 border" style={{ background: "rgba(240,120,120,0.06)", borderColor: "rgba(240,120,120,0.2)" }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: "#f07878", marginBottom: 4 }}>⚠️ {g.title}</p>
                        <p style={{ fontSize: 13, color: "#c8c0b0", lineHeight: 1.65, fontWeight: 300 }}>{g.desc}</p>
                      </div>
                    ))}
                  </div>

                  {/* CTA */}
                  <button onClick={() => { setPopupType(null); router.push("/quiz"); }} className="pico-btn w-full rounded-xl py-3.5"
                    style={{ background: "#FACA3E", color: "#0d0d0d", fontSize: 14, fontWeight: 600, border: "none", marginBottom: 8 }}>
                    나도 테스트 해보기 →
                  </button>
                </div>
              </div>
            </div>
          </>
        );
      })()}

      {/* ════ 도감 탭 ════ */}
      {mainTab === "learn" && (
        <div style={tabNeedsAuth ? { filter: "blur(8px)", pointerEvents: "none", userSelect: "none" } : {}}>
          <LearnTab />
        </div>
      )}

      {/* ════ 푸터 ════ */}
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 clamp(16px,4vw,40px)" }}>
        <PicoFooter />
      </div>
    </div>
  );
}
