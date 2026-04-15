"use client";

import { useState, useEffect, useCallback, useRef, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { fetchStocks, type StocksMap } from "@/app/lib/stocks";
import { fetchNews, NEWS_FALLBACK, type NewsItem, type NewsCat } from "@/app/lib/news";
import { STOCK_META, TICKERS_BY_CATEGORY, KOR_TO_TICKER, ALL_TICKERS, type StockCategory, KR_STOCK_META, KR_TICKERS_BY_CATEGORY, ALL_KR_TICKERS, type KrStockCategory, isKrTicker } from "@/app/lib/stockNames";
import { supabase, getTodayVote, submitVoteAndAttendance, getTodayVoteCounts, getYesterdayVote, judgeYesterdayBattle, todayKST, getTodayStock, type BattleVoteRow } from "@/app/lib/supabase";
import { useAuth } from "@/app/lib/authContext";
import { INVESTOR_TYPES } from "@/app/lib/quizTypes";

// ═══════════════════════════════════════════════
// 상수 & 데이터
// ═══════════════════════════════════════════════
type ModalType = "login" | "vs_battle" | null;
type AuthTab   = "login" | "signup";
type MainTab   = "event" | "play";

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


const TERMS = [
  { word: "PER",    reading: "퍼 / Price-to-Earnings Ratio",  desc: "주가가 이익의 몇 배인지 보는 지표. PER 50이면 지금 이익의 50년치를 주고 사는 것.",      example: "치킨집이 1년에 100만원 버는데 가게 값이 5,000만원이면 PER 50" },
  { word: "PBR",    reading: "피비알 / Price-to-Book Ratio",   desc: "주가가 순자산의 몇 배인지. PBR 1 미만이면 장부상 가치보다 싸게 팔리는 중.",             example: "집값이 실제 건물 가치보다 낮다? 그게 PBR 1 이하" },
  { word: "시가총액", reading: "시총 / Market Cap",             desc: "주가 × 발행 주식 수. 회사 전체를 지금 당장 사려면 얼마인지.",                            example: "삼성전자 시총 300조 = 지금 삼성을 통째로 사려면 300조" },
  { word: "분할매수", reading: "물타기의 계획된 버전",           desc: "한 번에 다 사지 않고 여러 번 나눠 사는 전략. 가격 변동 리스크를 분산해.",               example: "100만원을 4번에 나눠 살 때마다 25만원씩 — 이게 분할매수" },
  { word: "손절",   reading: "손실 + 절단",                    desc: "손실이 나는 상태에서 더 큰 손실을 막기 위해 파는 것. 아프지만 때론 최선.",                example: "−10%에 손절선 잡고, 거기 닿으면 미련 없이 파는 것" },
];

const TODAY_DISPLAY = new Date().toLocaleDateString("ko-KR", { month: "long", day: "numeric" });

const PICO_EYE_CARDS = [
  {
    ticker: "TSLA", name: "테슬라", logo: "https://logo.clearbit.com/tesla.com", color: "#FACA3E",
    insight: "변동성을 기회로 보는 호랑이형의 타이밍. 최근 3개월 -18% 하락했지만 에너지 사업 매출이 전년 대비 +67% 성장 중. 떨어진 지금이 호랑이의 구간일 수 있어.",
  },
  {
    ticker: "NVDA", name: "엔비디아", logo: "https://logo.clearbit.com/nvidia.com", color: "#7eb8f7",
    insight: "호랑이형이 좋아하는 폭발적 성장 패턴. AI 칩 수요가 공급을 앞지르는 중. 현재 PER 65배로 비싸긴 해. 그걸 알고도 베팅하는 게 호랑이지.",
  },
  {
    ticker: "ABNB", name: "에어비앤비", logo: "https://logo.clearbit.com/airbnb.com", color: "#7ed4a0",
    insight: "여름 여행 성수기 앞두고 예약 수요 전년 대비 +28% 증가. 숙박·여가 섹터 대표주로 단기 모멘텀이 호랑이형과 잘 맞아.",
  },
];

// DM Mono 숫자 스타일 헬퍼 (주가·등락률·퍼센트·타이머·포인트 등 모든 숫자)
const NUM: CSSProperties = {
  fontFamily: "var(--font-inter), monospace",
  fontWeight: 300,
  letterSpacing: "-0.02em",
};

// ═══════════════════════════════════════════════
// 유틸
// ═══════════════════════════════════════════════

// 현재 KST 기준 장 상태
function getMarketStatus() {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const day = kst.getUTCDay(); // 0=일 6=토
  const min = kst.getUTCHours() * 60 + kst.getUTCMinutes();
  const isWeekday = day >= 1 && day <= 5;
  const krOpen  = isWeekday && min >= 9 * 60 && min < 15 * 60 + 30;
  const usOpen  = isWeekday && (min >= 23 * 60 + 30 || min < 6 * 60);
  return { krOpen, usOpen };
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
    <div style={{ width: size, height: size, borderRadius: 6, background: "#242424", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.4, fontWeight: 500, color: "#a09688", flexShrink: 0 }}>
      {ticker[0]}
    </div>
  );
  return (
    <img src={src} alt={ticker} width={size} height={size}
      style={{ width: size, height: size, borderRadius: 6, objectFit: "contain", background: "#fff", flexShrink: 0 }}
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
          : <div style={{ width:40, height:40, borderRadius:10, background:"#1c1c1c", flexShrink:0,
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:16, fontWeight:600, color:"#a09688" }}>{(meta?.name ?? ticker)[0]}</div>
        }
        {/* 종목명 + 서브라벨 — flex:1로 남은 공간 차지 */}
        <div style={{ flex:1, minWidth:0, textAlign:"left" }}>
          <div style={{ fontSize:16, fontWeight:500, color:"#e8e0d0", marginBottom:2,
            overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{meta?.name ?? ticker}</div>
          <div style={{ fontSize:14, color:"#4a4540", fontWeight:300 }}>{subLabel}</div>
        </div>
        {/* 현재가 — 고정 너비 */}
        <div style={{ textAlign:"right", flexShrink:0, width:100 }}>
          {stocksLoading
            ? <Skeleton w={80} h={15}/>
            : <div style={{ ...NUM_MONO, fontSize:16, color:"#e8e0d0" }}>
                {kr ? (data?.formattedPrice ?? "—") : (data?.formattedKRW ?? "—")}
              </div>
          }
        </div>
        {/* 등락률 — 고정 너비 */}
        <div style={{ textAlign:"right", flexShrink:0, width:72 }}>
          {stocksLoading
            ? <Skeleton w={52} h={15}/>
            : <div style={{ ...NUM_MONO, fontSize:15, color: up?"#7ed4a0":"#f07878" }}>
                {up?"▲":"▼"} {data?.formattedChange ?? "—"}
              </div>
          }
        </div>
      </div>
    </button>
  );
}



// ─── FeaturedCard (인기 종목 가로 스크롤 카드) ──
function FeaturedCard({ ticker, stocks, stocksLoading, idx, onClick }: {
  ticker: string; stocks: StocksMap; stocksLoading: boolean; idx: number; onClick: () => void;
}) {
  const kr   = isKrTicker(ticker);
  const meta = kr ? KR_STOCK_META[ticker] : STOCK_META[ticker];
  const logo = !kr ? `https://financialmodelingprep.com/image-stock/${ticker}.png` : null;
  const data = stocks[ticker];
  const up   = data?.up ?? true;
  return (
    <button onClick={onClick} className="pico-btn flex-shrink-0"
      style={{ width:148, background:"#1c1c1c", border:"0.5px solid rgba(255,255,255,0.07)",
        borderRadius:16, padding:"14px 14px 13px", textAlign:"left", cursor:"pointer",
        display:"flex", flexDirection:"column", gap:0 }}>
      {/* 로고 + 이름 */}
      <div style={{ display:"flex", alignItems:"center", gap:9, marginBottom:10 }}>
        {logo
          ? <TickerLogo src={logo} ticker={ticker} size={32}/>
          : <div style={{ width:32, height:32, borderRadius:8, background:"#242424", flexShrink:0,
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:13, fontWeight:600, color:"#a09688" }}>{(meta?.name ?? ticker)[0]}</div>
        }
        <div style={{ minWidth:0 }}>
          <div style={{ fontSize:14, fontWeight:600, color:"#e8e0d0",
            overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:86 }}>
            {meta?.name?.slice(0,6) ?? ticker}
          </div>
          <div style={{ fontSize:13, color:"#4a4540", overflow:"hidden", textOverflow:"ellipsis",
            whiteSpace:"nowrap", maxWidth:86 }}>{kr ? (meta?.category ?? "") : ticker}</div>
        </div>
      </div>
      {/* 스파크라인 */}
      <MiniSparkline up={up} idx={idx} width={120} height={34}/>
      {/* 가격 */}
      <div style={{ marginTop:9 }}>
        {stocksLoading
          ? <><Skeleton w="85%" h={14}/><div style={{height:4}}/><Skeleton w="65%" h={12}/></>
          : <>
            <div style={{ ...NUM_MONO, fontSize:15, color:"#e8e0d0", marginBottom:3 }}>
              {kr ? (data?.formattedPrice ?? "—") : (data?.formattedKRW ?? "—")}
            </div>
            <div style={{ ...NUM_MONO, fontSize:13, color: up?"#7ed4a0":"#f07878" }}>
              {up?"▲":"▼"} {data?.formattedChange ?? "—"}
            </div>
          </>
        }
      </div>
    </button>
  );
}

// ═══════════════════════════════════════════════
// 메인 컴포넌트
// ═══════════════════════════════════════════════
export default function Home() {
  const router = useRouter();
  const { user, userRow, refreshUserRow } = useAuth();

  const [quizDone,   setQuizDone]   = useState(false);
  const [battleDone, setBattleDone] = useState(false);
  const [quizType,   setQuizType]   = useState<string | null>(null);
  const [popupType,  setPopupType]  = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 오늘의 선택 상태 (UP | DOWN)
  const [battleVote, setBattleVote] = useState<"UP"|"DOWN"|null>(null);
  const [votesUp,  setVotesUp]  = useState(0);
  const [votesDown,setVotesDown]= useState(0);

  // 오늘 종목 (날짜 기반 결정)
  const [todayStock, setTodayStock] = useState(getTodayStock());

  const [modal,     setModal]    = useState<ModalType>(null);
  const [authTab,   setAuthTab]  = useState<AuthTab>("login");
  const [authEmail, setAuthEmail]= useState("");
  const [authPw,    setAuthPw]   = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError,   setAuthError]   = useState("");
  const [mounted,   setMounted]  = useState(false);

  // 오늘의 선택 팝업
  const [popupBattleVote, setPopupBattleVote] = useState<"UP"|"DOWN"|null>(null);
  const [popupBattleDone, setPopupBattleDone] = useState(false);
  const [popupVotesUp,   setPopupVotesUp]   = useState(0);
  const [popupVotesDown, setPopupVotesDown] = useState(0);
  // 어제 선택 결과
  const [yesterdayVote,   setYesterdayVote]   = useState<BattleVoteRow | null>(null);
  const [yesterdayWinner, setYesterdayWinner] = useState<string | null>(null);
  // 팝업 체크 완료 여부 (user 변경시 중복 실행 방지)
  const battlePopupChecked = useRef(false);

  // 출석/보너스 토스트
  const [toast, setToast] = useState<string | null>(null);

  const [mainTab, setMainTab] = useState<MainTab>("event");
  const [prevTab, setPrevTab] = useState<MainTab>("event");

  const [justVoted,      setJustVoted]      = useState<"UP"|"DOWN"|null>(null);
  const [showParticlesA, setShowParticlesA] = useState(false);
  const [showParticlesB, setShowParticlesB] = useState(false);
  const [showBarAnim,    setShowBarAnim]    = useState(false);
  const [showResultMsg,  setShowResultMsg]  = useState(false);

  const [countdown, setCountdown] = useState("--:--:--");

  const [newsCat,    setNewsCat]    = useState<NewsCat>("전체");
  const [newsItems,  setNewsItems]  = useState<NewsItem[]>(NEWS_FALLBACK["전체"]);
  const [newsLoading,setNewsLoading]= useState(false);

  const [stocks,        setStocks]        = useState<StocksMap>({});
  const [stocksLoading, setStocksLoading] = useState(true);
  const [usdKrw,        setUsdKrw]        = useState(0);

  // ── PICO Play
  const [playStockTab,      setPlayStockTab]      = useState<"전체" | StockCategory>("전체");
  const [playKrCatTab,     setPlayKrCatTab]      = useState<"전체" | KrStockCategory>("전체");
  const [playMarketTab,    setPlayMarketTab]     = useState<"해외" | "국내">("해외");
  type PlayFilter = "전체"|"해외"|"국내"|"AI·테크"|"빅테크"|"테마"|"배터리·EV"|"바이오"|"금융"|"ETF";
  const [playFilter,       setPlayFilter]       = useState<PlayFilter>("전체");
  const [playSearch,        setPlaySearch]        = useState("");
  const [playSearchResults, setPlaySearchResults] = useState<{ symbol: string; name: string; exchange: string }[]>([]);
  const [playSearchLoading, setPlaySearchLoading] = useState(false);

  const [termIdx, setTermIdx] = useState(0);

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

    setCountdown(getMarketCountdown());
    const timer = setInterval(() => setCountdown(getMarketCountdown()), 1000);

    fetchStocks([...ALL_TICKERS, ...ALL_KR_TICKERS]).then((data) => {
      setStocks(data);
      setStocksLoading(false);
    });

    fetchNews("전체").then(setNewsItems);

    // 달러 환율 조회 (15분마다 갱신)
    const fetchRate = () => {
      fetch(`https://api.twelvedata.com/price?symbol=USD/KRW&apikey=5cff79650c334f9ea1ba974e8b9d9fd1`)
        .then((r) => r.json())
        .then((d) => { if (d?.price) setUsdKrw(Math.round(parseFloat(d.price))); })
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

  useEffect(() => {
    if (!mounted) return;
    setNewsLoading(true);
    fetchNews(newsCat).then((data) => {
      setNewsItems(data);
      setNewsLoading(false);
    });
  }, [newsCat, mounted]);

  // 카드 슬라이더 마우스 드래그 스크롤
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    let isDown = false, startX = 0, scrollLeft = 0;
    const onDown  = (e: MouseEvent) => { isDown = true; el.style.cursor = "grabbing"; startX = e.pageX - el.offsetLeft; scrollLeft = el.scrollLeft; };
    const onLeave = () => { isDown = false; el.style.cursor = "grab"; };
    const onUp    = () => { isDown = false; el.style.cursor = "grab"; };
    const onMove  = (e: MouseEvent) => { if (!isDown) return; e.preventDefault(); const x = e.pageX - el.offsetLeft; el.scrollLeft = scrollLeft - (x - startX) * 1.5; };
    el.addEventListener("mousedown", onDown);
    el.addEventListener("mouseleave", onLeave);
    el.addEventListener("mouseup", onUp);
    el.addEventListener("mousemove", onMove);
    return () => {
      el.removeEventListener("mousedown", onDown);
      el.removeEventListener("mouseleave", onLeave);
      el.removeEventListener("mouseup", onUp);
      el.removeEventListener("mousemove", onMove);
    };
  }, [mounted]);

  // DB에 investor_type이 있으면 퀴즈 완료로 처리
  useEffect(() => {
    if (userRow?.investor_type) {
      setQuizDone(true);
      setQuizType(userRow.investor_type);
    }
  }, [userRow]);

  const isBlurred = modal === "vs_battle";
  const totalVotes = votesUp + votesDown;
  const pctUp   = totalVotes > 0 ? Math.round((votesUp   / totalVotes) * 100) : 50;
  const pctDown = 100 - pctUp;

  function switchTab(tab: MainTab) { setPrevTab(mainTab); setMainTab(tab); }
  const tabAnim = mainTab === "play"
    ? (prevTab === "event" ? "tab-enter" : "tab-enter-left")
    : (prevTab === "play"  ? "tab-enter-left" : "tab-enter");

  const handleVote = useCallback((choice: "UP"|"DOWN") => {
    if (battleVote || battleDone) return;
    // 비로그인 시 로그인 모달 오픈
    if (!user) { openLogin("login"); return; }

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
          showToast("✅ 출석 완료 +50P");
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
      showToast("✅ 출석 완료 +50P");
    }
    setPopupBattleDone(true);
    // 오늘 팝업 완료 → localStorage에 기록 (중복 방지)
    localStorage.setItem(`pico_vs_popup_${todayKST()}`, "1");
  }

  function openLogin(tab: AuthTab = "login") { setAuthTab(tab); setAuthError(""); setModal("login"); }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  async function handleAuth() {
    if (!authEmail || !authPw) { setAuthError("이메일과 비밀번호를 입력해줘"); return; }
    setAuthLoading(true); setAuthError("");
    if (authTab === "signup") {
      const { error } = await supabase.auth.signUp({ email: authEmail, password: authPw });
      if (error) { setAuthError(error.message); setAuthLoading(false); return; }
      showToast("🎉 가입 완료! 이메일 인증 후 로그인해줘");
      setModal(null);
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPw });
      if (error) { setAuthError("이메일 또는 비밀번호가 틀렸어"); setAuthLoading(false); return; }
      setModal(null);
    }
    setAuthLoading(false);
    setAuthEmail(""); setAuthPw("");
  }

  const animalInfo = quizType ? ANIMAL_NAMES[quizType] : null;
  const term = TERMS[termIdx];

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

      {/* ══════════ 헤더 ══════════ */}
      <nav className="sticky top-0 z-30 border-b" style={{ height: 64, background: "rgba(13,13,13,0.96)", backdropFilter: "blur(20px)", borderColor: "rgba(255,255,255,0.06)" }}>
        <div className="h-full flex items-center justify-between mx-auto px-5 lg:px-10" style={{ maxWidth: 1280 }}>
          {/* 로고 — DM Serif Display 유일하게 사용 */}
          <Link href="/" style={{ fontFamily: "var(--font-serif)", fontSize: 24, color: "#FACA3E", letterSpacing: "0.01em", flexShrink: 0, textDecoration: "none" }}>
            PICO
          </Link>

          <div className="hidden sm:flex items-center gap-10">
            {(["event","play"] as MainTab[]).map((tab) => (
              <button key={tab} onClick={() => switchTab(tab)} className="pico-btn relative py-2"
                style={{ fontSize: 14, fontWeight: mainTab === tab ? 600 : 400, color: mainTab === tab ? "#e8e0d0" : "#3a3530", background: "none", border: "none", transition: "color 0.15s" }}>
                {tab === "event" ? "이벤트" : "PICO Play"}
              </button>
            ))}
          </div>

          {user && userRow ? (
            /* ── 로그인 후: 프로필 버튼 ── */
            <button onClick={() => router.push("/mypage")} className="pico-btn flex items-center gap-2"
              style={{ background: "none", border: "none", padding: "4px 0" }}>
              {userRow.avatar_url ? (
                <img src={userRow.avatar_url} alt="프로필" style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "1.5px solid rgba(255,255,255,0.12)" }} />
              ) : (
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#242424", border: "1.5px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "#a09688", flexShrink: 0 }}>
                  {userRow.nickname[0]?.toUpperCase() ?? "?"}
                </div>
              )}
              <span style={{ fontSize: 13, fontWeight: 500, color: "#e8e0d0", maxWidth: 72, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{userRow.nickname}</span>
            </button>
          ) : (
            /* ── 비로그인: 로그인/회원가입 버튼 ── */
            <div className="flex items-center gap-2">
              <button onClick={() => openLogin("login")} className="pico-btn px-4 py-2 rounded-lg"
                style={{ fontSize: 13, fontWeight: 500, color: "#a09688", border: "0.5px solid rgba(255,255,255,0.1)", background: "transparent" }}>
                로그인
              </button>
              <button onClick={() => openLogin("signup")} className="pico-btn px-4 py-2 rounded-lg"
                style={{ fontSize: 13, fontWeight: 500, color: "#0d0d0d", background: "#FACA3E" }}>
                회원가입
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* 모바일 탭 */}
      <div className="sm:hidden flex border-b sticky z-20" style={{ top: 64, background: "rgba(13,13,13,0.96)", backdropFilter: "blur(16px)", borderColor: "rgba(255,255,255,0.06)" }}>
        {(["event","play"] as MainTab[]).map((tab) => (
          <button key={tab} onClick={() => switchTab(tab)} className="flex-1 py-3 relative pico-btn"
            style={{ fontSize: 14, fontWeight: mainTab === tab ? 600 : 400, color: mainTab === tab ? "#e8e0d0" : "#3a3530", background: "none", border: "none" }}>
            {tab === "event" ? "이벤트" : "PICO Play"}
          </button>
        ))}
      </div>

      {/* ══════════ 히어로 (이벤트 탭 전용) ══════════ */}
      {mainTab === "event" && <section className="relative overflow-hidden border-b" style={{ minHeight: 460, borderColor: "rgba(255,255,255,0.06)", background: "radial-gradient(ellipse 70% 55% at 50% -5%, rgba(250,202,62,0.07) 0%, transparent 65%)" }}>
        <div className="mx-auto px-5 lg:px-10 h-full flex items-center" style={{ maxWidth: 1280 }}>
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between w-full gap-10 py-14 lg:py-0" style={{ minHeight: 460 }}>
            <div className="flex-1">
              <div style={{ fontSize: 11, letterSpacing: "0.16em", color: "#5c5448", textTransform: "uppercase", fontWeight: 500, marginBottom: 18 }}>
                투자 입문 서비스 — PICO v0.1
              </div>
              <h1 style={{ lineHeight: 1.15, marginBottom: 20, fontWeight: 500 }}>
                <span style={{ display: "block", fontSize: "clamp(44px, 6.5vw, 76px)", color: "#e8e0d0" }}>PICO와 함께,</span>
                <span style={{ display: "block", fontSize: "clamp(44px, 6.5vw, 76px)", color: "#FACA3E" }}>한 걸음씩</span>
              </h1>
              <p style={{ fontSize: 16, color: "#a09688", lineHeight: 1.8, maxWidth: 400, marginBottom: 28, fontWeight: 300 }}>
                주식 초보도 OK. PICO가 방향을 잡아줄게.
              </p>
              <div className="flex flex-wrap gap-3">
                <button onClick={() => router.push("/quiz")} className="pico-btn px-6 py-3 rounded-xl" style={{ background: "#FACA3E", color: "#0d0d0d", fontSize: 14, fontWeight: 500 }}>
                  투자 DNA 찾기 →
                </button>
                <button onClick={() => setModal("vs_battle")} className="pico-btn px-6 py-3 rounded-xl" style={{ background: "transparent", color: "#e8e0d0", fontSize: 14, fontWeight: 500, border: "0.5px solid rgba(255,255,255,0.14)" }}>
                  오늘의 선택 참여
                </button>
              </div>
            </div>

            {/* 통계 카드 */}
            <div className="grid grid-cols-3 lg:flex lg:flex-col gap-3 w-full lg:w-auto">
              {[
                { num: "2,841", unit: "명",  sub: "오늘 선택 참여",       cls: "float-1", accent: "#FACA3E" },
                { num: "8",     unit: "가지", sub: "투자자 DNA 유형",      cls: "float-2", accent: "#7eb8f7" },
                { num: "매일",  unit: "",     sub: "AI 인사이트 업데이트", cls: "float-3", accent: "#7ed4a0" },
              ].map((stat) => (
                <div key={stat.num} className={`${stat.cls} rounded-2xl px-3 py-3 lg:px-5 lg:py-4 border`}
                  style={{ background: "rgba(20,20,20,0.88)", borderColor: "rgba(255,255,255,0.08)", backdropFilter: "blur(12px)" }}>
                  <div style={{ ...NUM, fontSize: "clamp(16px, 4vw, 26px)", color: stat.accent, marginBottom: 4 }}>
                    {stat.num}<span style={{ fontSize: "clamp(10px, 2.5vw, 14px)" }}>{stat.unit}</span>
                  </div>
                  <div style={{ fontSize: "clamp(9px, 2vw, 12px)", color: "#5c5448", fontWeight: 300 }}>{stat.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>}

      {/* ══════════ 메인 콘텐츠 ══════════ */}
      <main className="mx-auto px-5 lg:px-10 pb-24" style={{ maxWidth: 1280 }}>

        {/* ════ 이벤트 탭 ════ */}
        {mainTab === "event" && (
          <div key="event" className={tabAnim}>

            {/* ── 오늘의 선택 + DNA 그리드 ── */}
            <div className="pb-10 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <div className="mb-5 mt-6">
                <p style={{ fontSize: "clamp(20px, 5vw, 28px)", fontWeight: 500, color: "#e8e0d0", marginBottom: 4 }}>오늘의 선택</p>
                <p style={{ fontSize: "clamp(12px, 3vw, 14px)", color: "#a09688", fontWeight: 300 }}>하루 1번 예측 → 익일 결과 · 정답 시 100 포인트</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                {/* 오늘의 선택 카드 (2/3) */}
                <div className="lg:col-span-2 rounded-2xl p-4 sm:p-6 border" style={{ background: "#141414", borderColor: "rgba(250,202,62,0.18)" }}>
                  <div className="flex items-center justify-between mb-2">
                    <SectionLabel text={`오늘의 선택 — ${todayStock.category}`} />
                    {battleDone && (
                      <span style={{ fontSize: 11, fontWeight: 500, padding: "3px 9px", borderRadius: 4, background: "rgba(126,212,160,0.12)", color: "#7ed4a0", border: "0.5px solid rgba(126,212,160,0.25)" }}>
                        참여완료
                      </span>
                    )}
                  </div>

                  {/* 종목 헤더 */}
                  <div className="flex items-center gap-3 mb-4">
                    <TickerLogo src={`https://logo.clearbit.com/${todayStock.ticker.toLowerCase()}.com`} ticker={todayStock.ticker} size={36} />
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 500, color: "#e8e0d0", letterSpacing: "-0.01em" }}>{todayStock.name}</div>
                      <div style={{ ...NUM, fontSize: 12, color: "#5c5448" }}>{todayStock.ticker}</div>
                    </div>
                    {!battleDone && (
                      <div className="flex items-center gap-2 ml-auto">
                        <span style={{ fontSize: 12, color: "#5c5448", fontWeight: 300 }}>마감까지</span>
                        <span style={{ ...NUM, fontSize: 13, color: "#FACA3E" }}>{countdown}</span>
                      </div>
                    )}
                  </div>

                  {/* 현재가 */}
                  <div className="mb-5">
                    {stocksLoading
                      ? <Skeleton w={120} h={16} />
                      : <div className="flex items-baseline gap-2">
                          <PriceDisplay ticker={todayStock.ticker} krwSize={16} usdSize={12} />
                          <span style={{ ...NUM, fontSize: 13, color: upOf(todayStock.ticker) ? "#7ed4a0" : "#f07878" }}>
                            {upOf(todayStock.ticker) ? "▲" : "▼"} {changeOf(todayStock.ticker)}
                          </span>
                        </div>
                    }
                  </div>

                  {/* UP / DOWN 카드 */}
                  <div className="flex items-stretch gap-4 mb-5">
                    {/* 오른다 */}
                    <div className="relative flex-1">
                      <GoldParticles show={showParticlesA} />
                      <button onClick={() => handleVote("UP")} disabled={battleDone}
                        className={`w-full rounded-xl p-5 border text-center pico-btn ${justVoted === "UP" ? "gold-glow" : ""}`}
                        style={{
                          background: battleVote === "UP" ? "rgba(126,212,160,0.12)" : "#1c1c1c",
                          borderColor: battleVote === "UP" ? "#7ed4a0" : "rgba(255,255,255,0.06)",
                          cursor: battleDone ? "default" : "pointer",
                          opacity: battleDone && battleVote !== "UP" ? 0.4 : 1,
                          transform: battleDone && battleVote !== "UP" ? "scale(0.96)" : "scale(1)",
                          transition: "opacity 0.4s ease, transform 0.4s ease, border-color 0.2s, background 0.2s",
                        }}>
                        <div style={{ fontSize: 28, marginBottom: 6 }}>📈</div>
                        <div style={{ fontSize: 17, fontWeight: 500, color: battleVote === "UP" ? "#7ed4a0" : "#e8e0d0", marginBottom: 4 }}>오른다</div>
                        {showBarAnim && (
                          <div style={{ ...NUM, fontSize: 13, color: "#7ed4a0", fontWeight: 500 }}>
                            <CountUp target={pctUp} duration={1200} />%가 선택
                          </div>
                        )}
                        {!showBarAnim && (
                          <div style={{ fontSize: 11, color: "#5c5448", fontWeight: 300 }}>탭해서 선택</div>
                        )}
                      </button>
                    </div>

                    {/* DOWN */}
                    <div className="relative flex-1">
                      <GoldParticles show={showParticlesB} />
                      <button onClick={() => handleVote("DOWN")} disabled={battleDone}
                        className={`w-full rounded-xl p-5 border text-center pico-btn ${justVoted === "DOWN" ? "gold-glow" : ""}`}
                        style={{
                          background: battleVote === "DOWN" ? "rgba(240,120,120,0.12)" : "#1c1c1c",
                          borderColor: battleVote === "DOWN" ? "#f07878" : "rgba(255,255,255,0.06)",
                          cursor: battleDone ? "default" : "pointer",
                          opacity: battleDone && battleVote !== "DOWN" ? 0.4 : 1,
                          transform: battleDone && battleVote !== "DOWN" ? "scale(0.96)" : "scale(1)",
                          transition: "opacity 0.4s ease, transform 0.4s ease, border-color 0.2s, background 0.2s",
                        }}>
                        <div style={{ fontSize: 28, marginBottom: 6 }}>📉</div>
                        <div style={{ fontSize: 17, fontWeight: 500, color: battleVote === "DOWN" ? "#f07878" : "#e8e0d0", marginBottom: 4 }}>내린다</div>
                        {showBarAnim && (
                          <div style={{ ...NUM, fontSize: 13, color: "#f07878", fontWeight: 500 }}>
                            <CountUp target={pctDown} duration={1200} />%가 선택
                          </div>
                        )}
                        {!showBarAnim && (
                          <div style={{ fontSize: 11, color: "#5c5448", fontWeight: 300 }}>탭해서 선택</div>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* 투표 바 — 선택 후 표시 */}
                  {showBarAnim ? (
                    <div className="fade-in-up">
                      <div className="rounded-full overflow-hidden mb-2" style={{ height: 3, background: "#242424" }}>
                        <div className="h-full rounded-full" style={{ width: `${pctUp}%`, background: "#7ed4a0", transition: "width 1.2s cubic-bezier(.4,0,.2,1)" }} />
                      </div>
                      <div className="flex justify-between items-center">
                        <span style={{ ...NUM, fontSize: 12, color: "#7ed4a0" }}>📈 오른다 {pctUp}%</span>
                        <span style={{ ...NUM, fontSize: 11, color: "#5c5448" }}>총 {totalVotes.toLocaleString()}명</span>
                        <span style={{ ...NUM, fontSize: 12, color: "#f07878" }}>내린다 📉 {pctDown}%</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center" style={{ fontSize: 13, color: "#5c5448", fontWeight: 300 }}>선택하면 현황이 공개돼</div>
                  )}

                  {showResultMsg && (
                    <div className="fade-in-up mt-4 rounded-xl px-4 py-3 text-center" style={{ background: "rgba(250,202,62,0.05)", border: "0.5px solid rgba(250,202,62,0.15)" }}>
                      <span style={{ fontSize: 14, fontWeight: 500, color: "#e8e0d0" }}>내일 오전 결과 공개! 🎯</span>
                    </div>
                  )}
                </div>

                {/* DNA 카드 (1/3) — 로그인 사용자만 표시 */}
                {user && (
                  <div className="rounded-2xl p-6 border" style={{ background: "#141414", borderColor: "rgba(126,184,247,0.18)" }}>
                    <div className="flex items-center justify-between mb-4">
                      <SectionLabel text="투자 DNA" />
                      {quizDone && <span style={{ fontSize: 11, fontWeight: 500, padding: "3px 8px", borderRadius: 4, background: "rgba(126,212,160,0.12)", color: "#7ed4a0", border: "0.5px solid rgba(126,212,160,0.25)" }}>완료</span>}
                    </div>
                    <p style={{ fontSize: 22, fontWeight: 500, color: "#e8e0d0", marginBottom: 14, lineHeight: 1.2 }}>내 투자 성향은?</p>
                    {quizDone && animalInfo ? (
                      <>
                        <div className="rounded-xl px-4 py-4 mb-4" style={{ background: "rgba(250,202,62,0.06)", border: "0.5px solid rgba(250,202,62,0.2)" }}>
                          <div style={{ fontSize: 36, marginBottom: 6 }}>{animalInfo.emoji}</div>
                          <div style={{ fontSize: 11, color: "#5c5448", marginBottom: 2 }}>{animalInfo.modifier}</div>
                          <div style={{ fontSize: 20, fontWeight: 500, color: "#FACA3E" }}>{animalInfo.name}</div>
                          <div style={{ fontSize: 13, color: "#a09688", marginTop: 2, fontWeight: 300 }}>내 투자 유형</div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => router.push("/mypage/dna")} className="pico-btn flex-1 rounded-xl py-2.5" style={{ background: "rgba(250,202,62,0.08)", color: "#FACA3E", border: "0.5px solid rgba(250,202,62,0.25)", fontSize: 13, fontWeight: 500 }}>상세 리포트</button>
                          <button onClick={() => router.push("/quiz")} className="pico-btn px-4 rounded-xl py-2.5" style={{ background: "transparent", color: "#5c5448", border: "0.5px solid rgba(255,255,255,0.08)", fontSize: 13 }}>다시하기</button>
                        </div>
                      </>
                    ) : (
                      <>
                        <p style={{ fontSize: 14, color: "#a09688", lineHeight: 1.75, marginBottom: 16, fontWeight: 300 }}>18문항으로 4가지 축을 측정해 8가지 유형 중 나를 찾아봐.</p>
                        <button onClick={() => router.push("/quiz")} className="pico-btn w-full rounded-xl py-3" style={{ background: "rgba(126,184,247,0.1)", color: "#7eb8f7", border: "0.5px solid rgba(126,184,247,0.3)", fontSize: 14, fontWeight: 500 }}>
                          🧬 DNA 확인하러 가기
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ── 8가지 투자 DNA 유형 슬라이더 ── */}
            <div className="pt-10 pb-10 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <div className="flex items-end justify-between mb-5">
                <div>
                  <p style={{ fontSize: "clamp(18px, 4vw, 24px)", fontWeight: 500, color: "#e8e0d0", marginBottom: 4 }}>8가지 투자 DNA 유형</p>
                  <p style={{ fontSize: 13, color: "#a09688", fontWeight: 300 }}>4가지 성향 축으로 분류한 투자자 아키타입</p>
                </div>
                <button onClick={() => router.push("/quiz")} className="pico-btn px-4 py-2 rounded-lg flex-shrink-0"
                  style={{ background: "rgba(250,202,62,0.1)", color: "#FACA3E", border: "0.5px solid rgba(250,202,62,0.25)", fontSize: 12, fontWeight: 500 }}>
                  내 유형 찾기 →
                </button>
              </div>
              {/* 4축 설명 컴팩트 */}
              <div className="flex flex-wrap gap-2 mb-5">
                {[
                  { ax: "R", label: "변동성 회복력", sub: "손실 내성·추가매수 의향", color: "#f07878" },
                  { ax: "I", label: "정보 필터링",   sub: "분석 깊이·결정 속도",   color: "#7eb8f7" },
                  { ax: "T", label: "이용 호흡",     sub: "단기 vs 장기 보유",     color: "#7ed4a0" },
                  { ax: "Y", label: "수익 성향",     sub: "성장주 vs 배당·안정주", color: "#FACA3E" },
                ].map((a) => (
                  <div key={a.ax} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5" style={{ background: `${a.color}0f`, border: `0.5px solid ${a.color}28` }}>
                    <span style={{ fontFamily: "var(--font-inter)", fontSize: 11, fontWeight: 500, color: a.color }}>{a.ax}</span>
                    <span style={{ fontSize: 11, color: "#a09688" }}>{a.label}</span>
                    <span style={{ fontSize: 10, color: "#5c5448", display: "none" }}>{a.sub}</span>
                  </div>
                ))}
              </div>
              {/* 카드 슬라이더 */}
              <div ref={scrollContainerRef} className="scroll-x flex gap-3 pb-2" style={{ scrollSnapType: "x mandatory", cursor: "grab", userSelect: "none" }}>
                {Object.entries(ANIMAL_NAMES).map(([key, info]) => {
                  const typeColors: Record<string, string> = {
                    tiger: "#f07878", wolf: "#c4b0fc", eagle: "#7eb8f7", fox: "#f5a742",
                    butterfly: "#FACA3E", hedgehog: "#7ed4a0", elephant: "#7eb8f7", turtle: "#7ed4a0",
                  };
                  const color = typeColors[key] ?? "#FACA3E";
                  const isMe = quizType === key;
                  return (
                    <div key={key} className="snap-start flex-shrink-0 rounded-2xl p-4 border cursor-pointer pico-card"
                      style={{ width: 160, background: isMe ? `${color}0c` : "#141414", borderColor: isMe ? `${color}50` : "rgba(255,255,255,0.08)" }}
                      onClick={() => setPopupType(key)}>
                      <div style={{ fontSize: 28, marginBottom: 8 }}>{info.emoji}</div>
                      <div style={{ fontFamily: "'Instrument Sans','Noto Sans KR',sans-serif", fontSize: 12, fontWeight: 400, color: isMe ? color : "#5c5448", marginBottom: 2 }}>{info.modifier}</div>
                      <div style={{ fontFamily: "'Instrument Sans','Noto Sans KR',sans-serif", fontSize: 17, fontWeight: 500, color: isMe ? color : "#e8e0d0", marginBottom: 6, lineHeight: 1.2 }}>{info.name}</div>
                      {isMe && (
                        <span style={{ fontSize: 9, padding: "2px 7px", borderRadius: 4, background: `${color}20`, color, border: `0.5px solid ${color}40`, fontWeight: 500 }}>내 유형</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── 용어 + PICO Play 예고 (2열) ── */}
            <div className="pt-10 pb-10 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 오늘의 용어 */}
                <div className="rounded-2xl p-6 border" style={{ background: "#141414", borderColor: "rgba(255,255,255,0.06)" }}>
                  <div className="flex items-start justify-between mb-1">
                    <div>
                      <p style={{ fontSize: 26, fontWeight: 500, color: "#e8e0d0", marginBottom: 4 }}>오늘 하나만, 가볍게</p>
                      <SectionLabel text={`오늘의 용어 📖 · ${TODAY_DISPLAY}`} />
                    </div>
                    <div className="flex gap-1 flex-shrink-0 ml-2 mt-1">
                      <button onClick={() => setTermIdx((i) => (i - 1 + TERMS.length) % TERMS.length)} className="pico-btn w-7 h-7 flex items-center justify-center rounded-lg" style={{ background: "#1c1c1c", color: "#5c5448", border: "0.5px solid rgba(255,255,255,0.08)", fontSize: 15 }}>‹</button>
                      <button onClick={() => setTermIdx((i) => (i + 1) % TERMS.length)} className="pico-btn w-7 h-7 flex items-center justify-center rounded-lg" style={{ background: "#1c1c1c", color: "#5c5448", border: "0.5px solid rgba(255,255,255,0.08)", fontSize: 15 }}>›</button>
                    </div>
                  </div>
                  <div style={{ fontSize: 34, fontWeight: 500, color: "#FACA3E", margin: "14px 0 4px" }}>{term.word}</div>
                  <div style={{ fontSize: 12, color: "#5c5448", marginBottom: 12, fontWeight: 300 }}>{term.reading}</div>
                  <p style={{ fontSize: 14, color: "#a09688", lineHeight: 1.75, marginBottom: 12, fontWeight: 300 }}>{term.desc}</p>
                  <div className="rounded-xl px-4 py-3 mb-4" style={{ background: "rgba(250,202,62,0.06)", border: "0.5px solid rgba(250,202,62,0.15)" }}>
                    <div style={{ fontSize: 11, color: "#FACA3E", fontWeight: 500, letterSpacing: "0.06em", marginBottom: 4 }}>예시</div>
                    <p style={{ fontSize: 13, color: "#e8e0d0", lineHeight: 1.65, fontWeight: 300 }}>{term.example}</p>
                  </div>
                  <button onClick={() => switchTab("play")} className="pico-btn" style={{ fontSize: 13, color: "#FACA3E", fontWeight: 500 }}>
                    PICO Play에서 바로 써봐 →
                  </button>
                  <div className="flex gap-1 mt-4">
                    {TERMS.map((_, i) => (
                      <div key={i} onClick={() => setTermIdx(i)} className="pico-btn rounded-full" style={{ width: i === termIdx ? 16 : 5, height: 5, background: i === termIdx ? "#FACA3E" : "rgba(255,255,255,0.12)", transition: "all 0.2s" }} />
                    ))}
                  </div>
                </div>

                {/* PICO Play 예고 */}
                <div className="pico-card rounded-2xl p-6 border" style={{ background: "#141414", borderColor: "rgba(126,212,160,0.15)" }} onClick={() => switchTab("play")}>
                  <SectionLabel text="Coming Soon" />
                  <p style={{ fontSize: 26, fontWeight: 500, color: "#e8e0d0", marginBottom: 10 }}>🎮 PICO Play</p>
                  <p style={{ fontSize: 14, color: "#a09688", lineHeight: 1.75, marginBottom: 18, fontWeight: 300 }}>가상 10만원으로 리스크 없이 진짜처럼 투자 연습. 매일 AI 인사이트 + 소수점 매수 지원.</p>
                  <div className="flex flex-wrap gap-2 mb-6">
                    {["가상 자금", "소수점 투자", "AI 인사이트", "법적 문제 없음"].map((t) => (
                      <span key={t} style={{ fontSize: 10, fontWeight: 500, padding: "3px 8px", borderRadius: 4, background: "rgba(126,212,160,0.08)", color: "#7ed4a0", border: "0.5px solid rgba(126,212,160,0.2)" }}>{t}</span>
                    ))}
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); switchTab("play"); }} className="pico-btn px-5 py-2.5 rounded-xl" style={{ background: "rgba(126,212,160,0.1)", color: "#7ed4a0", border: "0.5px solid rgba(126,212,160,0.25)", fontSize: 13, fontWeight: 500 }}>
                    미리보기 →
                  </button>
                </div>
              </div>
            </div>

            {/* ── 뉴스 ── */}
            <div className="pt-10 pb-6">
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
        {mainTab === "play" && (() => {
          // 필터 → 종목 목록 계산
          const filteredTickers: string[] = (() => {
            switch (playFilter) {
              case "해외":      return ALL_TICKERS;
              case "국내":      return ALL_KR_TICKERS;
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
          const FILTERS = ["전체","해외","국내","AI·테크","빅테크","테마","배터리·EV","바이오","금융","ETF"] as const;

          const { krOpen, usOpen } = getMarketStatus();

          return (
            <div key="play" className={tabAnim}>

              {/* ── 시장 상태 + 환율 배너 ── */}
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                padding:"16px 0 8px", gap:12 }}>
                {/* 국내/해외 장 상태 */}
                <div style={{ display:"flex", gap:18 }}>
                  {[
                    { label:"국내주식", open: krOpen },
                    { label:"해외주식", open: usOpen },
                  ].map(({ label, open }) => (
                    <div key={label} style={{ display:"flex", alignItems:"center", gap:7 }}>
                      <span style={{
                        width:8, height:8, borderRadius:"50%", flexShrink:0,
                        background: open ? "#7ed4a0" : "#f07878",
                        boxShadow: open ? "0 0 7px #7ed4a0" : "0 0 7px #f07878",
                      }}/>
                      <span style={{ fontSize:15, color:"#e8e0d0", fontWeight:500 }}>{label}</span>
                      <span style={{ fontSize:14, color: open ? "#7ed4a0" : "#5c5448" }}>
                        {open ? "장중" : "마감"}
                      </span>
                    </div>
                  ))}
                </div>
                {/* 달러 환율 */}
                <div style={{ display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>
                  <span style={{ fontSize:14, color:"#5c5448" }}>USD</span>
                  <span style={{ ...NUM_MONO, fontSize:18, color:"#e8e0d0", fontWeight:400 }}>
                    {usdKrw > 0 ? `₩${usdKrw.toLocaleString("ko-KR")}` : "₩—"}
                  </span>
                </div>
              </div>

              {/* ── 검색창 ── */}
              <div style={{ padding:"10px 0 12px" }}>
                <div style={{ position:"relative" }}>
                  <span style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)",
                    color:"#5c5448", fontSize:14, pointerEvents:"none" }}>&#128269;</span>
                  <input
                    type="text" value={playSearch}
                    onChange={(e) => {
                      const q = e.target.value;
                      setPlaySearch(q);
                      if (!q.trim()) { setPlaySearchResults([]); return; }
                      const mapped = KOR_TO_TICKER[q.trim()];
                      if (mapped) {
                        const ikr = isKrTicker(mapped);
                        setPlaySearchResults([{ symbol: mapped,
                          name: (ikr ? KR_STOCK_META[mapped]?.name : STOCK_META[mapped]?.name) ?? mapped,
                          exchange: ikr ? "KRX" : "" }]);
                        return;
                      }
                      const upper = q.trim().toUpperCase();
                      const local = [
                        ...ALL_TICKERS.filter((t) => t.startsWith(upper) || STOCK_META[t]?.name.includes(q)),
                        ...ALL_KR_TICKERS.filter((t) => KR_STOCK_META[t]?.name.includes(q)),
                      ];
                      if (local.length > 0) {
                        setPlaySearchResults(local.map((t) => ({
                          symbol: t,
                          name: (isKrTicker(t) ? KR_STOCK_META[t]?.name : STOCK_META[t]?.name) ?? t,
                          exchange: isKrTicker(t) ? "KRX" : "",
                        }))); return;
                      }
                      setPlaySearchLoading(true);
                      fetch(`/api/stocks/search?query=${encodeURIComponent(q)}`)
                        .then((r) => r.json()).then(setPlaySearchResults)
                        .catch(() => setPlaySearchResults([]))
                        .finally(() => setPlaySearchLoading(false));
                    }}
                    placeholder="종목 검색   삼성전자, NVDA, 테슬라..."
                    className="w-full rounded-xl outline-none"
                    style={{ background:"#1c1c1c", border:"0.5px solid rgba(255,255,255,0.08)",
                      color:"#e8e0d0", fontSize:14, fontWeight:300, padding:"12px 38px 12px 40px" }}
                    onFocus={(e) => (e.target.style.borderColor="rgba(250,202,62,0.35)")}
                    onBlur={(e)  => (e.target.style.borderColor="rgba(255,255,255,0.08)")}
                  />
                  {playSearch && (
                    <button onClick={() => { setPlaySearch(""); setPlaySearchResults([]); }} className="pico-btn"
                      style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)",
                        color:"#5c5448", fontSize:14, background:"none", border:"none" }}>✕</button>
                  )}
                </div>
              </div>

              {/* ── 검색 결과 ── */}
              {playSearch ? (
                <div>
                  {playSearchLoading
                    ? [1,2,3].map((i) => (
                        <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 0",
                          borderBottom:"0.5px solid rgba(255,255,255,0.05)" }}>
                          <div style={{ width:40, height:40, borderRadius:10, background:"#242424", flexShrink:0 }}/>
                          <div style={{ flex:1 }}><Skeleton w="50%" h={14}/><div style={{height:5}}/><Skeleton w="30%" h={11}/></div>
                          <div><Skeleton w={70} h={14}/><div style={{height:5}}/><Skeleton w={50} h={11}/></div>
                        </div>))
                    : playSearchResults.length > 0
                      ? playSearchResults.map((r, i) => (
                          <StockRow key={r.symbol} ticker={r.symbol} stocks={stocks}
                            stocksLoading={stocksLoading} idx={i}
                            onClick={() => router.push(`/stock/${r.symbol}`)}/>))
                      : <p style={{ fontSize:13, color:"#5c5448", fontWeight:300, padding:"20px 0" }}>검색 결과가 없어요</p>
                  }
                </div>
              ) : (
                <>
                  {/* ── 인기 종목 카드 (가로 스크롤) ── */}
                  <div style={{ marginBottom:20 }}>
                    <p style={{ fontSize:14, fontWeight:500, color:"#5c5448",
                      letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:10 }}>인기 종목</p>
                    <div className="scroll-x" style={{ display:"flex", gap:8, paddingBottom:4 }}>
                      {FEATURED_TICKERS.map((t, i) => (
                        <FeaturedCard key={t} ticker={t} stocks={stocks} stocksLoading={stocksLoading}
                          idx={i} onClick={() => router.push(`/stock/${t}`)}/>
                      ))}
                    </div>
                  </div>

                  {/* ── 필터 칩 ── */}
                  <div className="scroll-x" style={{ display:"flex", gap:6, marginBottom:4 }}>
                    {FILTERS.map((f) => (
                      <button key={f} onClick={() => setPlayFilter(f)} className="pico-btn flex-shrink-0"
                        style={{ fontSize:13, fontWeight: playFilter===f ? 600 : 400, padding:"6px 16px", borderRadius:20,
                          background: playFilter===f ? "rgba(255,255,255,0.12)":"rgba(255,255,255,0.04)",
                          color:       playFilter===f ? "#e8e0d0":"#3a3530",
                          border:     `0.5px solid ${playFilter===f ? "rgba(255,255,255,0.2)":"rgba(255,255,255,0.06)"}`,
                          transition:"all 0.15s" }}>
                        {f}
                      </button>
                    ))}
                  </div>

                  {/* ── 종목 리스트 헤더 ── */}
                  {(() => {
                    const now = new Date();
                    const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
                    const hh  = String(kst.getUTCHours()).padStart(2,"0");
                    const mm  = String(kst.getUTCMinutes()).padStart(2,"0");
                    return (
                      <div style={{ display:"flex", alignItems:"center", padding:"10px 0 6px",
                        borderBottom:"0.5px solid rgba(255,255,255,0.08)" }}>
                        <div style={{ flex:1, display:"flex", alignItems:"center", gap:8 }}>
                          <div style={{ width:40, flexShrink:0 }}/>
                          <span style={{ fontSize:14, color:"#3a3530" }}>오늘 {hh}:{mm} 기준</span>
                        </div>
                        <div style={{ width:100, textAlign:"right", fontSize:14, color:"#3a3530" }}>현재가</div>
                        <div style={{ width:72, textAlign:"right", fontSize:14, color:"#3a3530" }}>등락률</div>
                      </div>
                    );
                  })()}

                  {/* ── 종목 리스트 ── */}
                  <div>
                    {filteredTickers.map((ticker, i) => (
                      <StockRow key={ticker} ticker={ticker} stocks={stocks}
                        stocksLoading={stocksLoading} idx={i}
                        onClick={() => router.push(`/stock/${ticker}`)}/>
                    ))}
                  </div>
                </>
              )}

            </div>
          );
        })()}

        {/* ── 서비스 소개 배너 ── */}
        <div className="rounded-2xl px-6 py-5 border mb-4" style={{ background: "rgba(250,202,62,0.05)", borderColor: "rgba(250,202,62,0.18)" }}>
          <p style={{ fontSize: 16, color: "#e8e0d0", lineHeight: 1.75, marginBottom: 4, fontWeight: 300 }}>
            PICO는 투자 공부 앱이 아니야.<br />
            <strong style={{ color: "#FACA3E", fontWeight: 500 }}>결정을 도와주는 파트너야. 🤝</strong>
          </p>
          <p style={{ fontSize: 13, color: "#5c5448", fontWeight: 300 }}>주식 입문자를 위한 넛지형 투자 가이드</p>
        </div>
      </main>

      {/* ════════ 오늘의 선택 팝업 (로그인 유저 첫 접속) ════════ */}
      {modal === "vs_battle" && (() => {
        const popTotal   = popupVotesUp + popupVotesDown;
        const popPctUp   = popTotal > 0 ? Math.round((popupVotesUp   / popTotal) * 100) : 50;
        const popPctDown = 100 - popPctUp;
        return (
          <>
            <div className="fixed inset-0 z-50" style={{ background: "rgba(0,0,0,0.78)", backdropFilter: "blur(8px)" }} onClick={() => { if (popupBattleDone) setModal(null); }} />
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0">
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
                    <div className="flex items-center gap-3 mb-1">
                      <TickerLogo src={`https://logo.clearbit.com/${todayStock.ticker.toLowerCase()}.com`} ticker={todayStock.ticker} size={32} />
                      <div>
                        <span style={{ fontSize: 16, fontWeight: 500, color: "#e8e0d0" }}>{todayStock.name}</span>
                        <span style={{ fontSize: 12, color: "#5c5448", marginLeft: 6 }}>· {todayStock.category}</span>
                      </div>
                    </div>

                    {/* 타이틀 */}
                    <div className="mb-5 mt-3">
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
                      {popupBattleVote ? "출석체크하고 선택하기 →" : "출석체크하고 선택하기"}
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
          <div className="fixed inset-0 z-50" style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }} onClick={() => setModal(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div className="w-full max-w-sm rounded-2xl p-6 fade-up" style={{ background: "#141414", border: "0.5px solid rgba(255,255,255,0.1)" }} onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <div className="flex rounded-lg overflow-hidden" style={{ background: "#1c1c1c", padding: 3 }}>
                  {(["login","signup"] as AuthTab[]).map((t) => (
                    <button key={t} onClick={() => setAuthTab(t)} className="pico-btn px-4 py-1.5 rounded-md"
                      style={{ fontSize: 12, fontWeight: 500, background: authTab === t ? "#242424" : "transparent", color: authTab === t ? "#e8e0d0" : "#5c5448" }}>
                      {t === "login" ? "로그인" : "회원가입"}
                    </button>
                  ))}
                </div>
                <button onClick={() => setModal(null)} className="pico-btn flex items-center justify-center rounded-lg w-8 h-8" style={{ background: "#1c1c1c", color: "#5c5448", border: "0.5px solid rgba(255,255,255,0.08)", fontSize: 14 }}>✕</button>
              </div>

              <div className="mb-3">
                <label style={{ fontSize: 12, color: "#5c5448", display: "block", marginBottom: 6, fontWeight: 300 }}>이메일</label>
                <input type="email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} placeholder="hello@example.com"
                  className="w-full rounded-xl px-4 py-3 outline-none"
                  style={{ background: "#1c1c1c", border: "0.5px solid rgba(255,255,255,0.1)", color: "#e8e0d0", fontSize: 14, fontWeight: 300 }}
                  onFocus={(e) => (e.target.style.borderColor = "rgba(250,202,62,0.4)")}
                  onBlur={(e)  => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
                />
              </div>
              <div className="mb-4">
                <label style={{ fontSize: 12, color: "#5c5448", display: "block", marginBottom: 6, fontWeight: 300 }}>비밀번호</label>
                <input type="password" value={authPw} onChange={(e) => setAuthPw(e.target.value)} placeholder="••••••••"
                  className="w-full rounded-xl px-4 py-3 outline-none"
                  style={{ background: "#1c1c1c", border: "0.5px solid rgba(255,255,255,0.1)", color: "#e8e0d0", fontSize: 14, fontWeight: 300 }}
                  onFocus={(e) => (e.target.style.borderColor = "rgba(250,202,62,0.4)")}
                  onBlur={(e)  => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
                />
              </div>
              {authError && (
                <p style={{ fontSize: 12, color: "#f07878", marginBottom: 10 }}>{authError}</p>
              )}
              <button onClick={handleAuth} disabled={authLoading} className="pico-btn w-full rounded-xl py-3 mb-4"
                style={{ background: "#FACA3E", color: "#0d0d0d", fontSize: 14, fontWeight: 500, opacity: authLoading ? 0.7 : 1 }}>
                {authLoading ? "처리 중..." : authTab === "login" ? "로그인 →" : "회원가입 →"}
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div style={{ flex: 1, height: "0.5px", background: "rgba(255,255,255,0.08)" }} />
                <span style={{ fontSize: 12, color: "#5c5448", fontWeight: 300 }}>또는</span>
                <div style={{ flex: 1, height: "0.5px", background: "rgba(255,255,255,0.08)" }} />
              </div>

              <div className="flex flex-col gap-2">
                <button className="pico-btn w-full flex items-center gap-3 rounded-xl px-4 py-3" style={{ background: "#fff", color: "#1a1a1a", fontSize: 14, fontWeight: 500 }}>
                  <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 2.9l5.7-5.7C34.5 7 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.9z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16.1 19 13 24 13c3.1 0 5.8 1.1 7.9 2.9l5.7-5.7C34.5 7 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.5-5.1l-6.2-5.3C29.4 35.5 26.8 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.7 39.7 16.3 44 24 44z"/><path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.3 5.5l6.2 5.3c-.4.4 6.8-5 6.8-14.8 0-1.3-.1-2.7-.4-3.9z"/></svg>
                  구글로 계속하기
                </button>
                <button className="pico-btn w-full flex items-center gap-3 rounded-xl px-4 py-3" style={{ background: "#FEE500", color: "#191600", fontSize: 14, fontWeight: 500 }}>
                  <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#191600" d="M9 1.5C4.86 1.5 1.5 4.17 1.5 7.5c0 2.13 1.38 4.01 3.47 5.09l-.88 3.27a.19.19 0 0 0 .28.21L8.1 13.7a9.4 9.4 0 0 0 .9.05c4.14 0 7.5-2.67 7.5-6S13.14 1.5 9 1.5z"/></svg>
                  카카오로 계속하기
                </button>
                <button className="pico-btn w-full flex items-center gap-3 rounded-xl px-4 py-3" style={{ background: "#000", color: "#fff", border: "0.5px solid rgba(255,255,255,0.15)", fontSize: 14, fontWeight: 500 }}>
                  <svg width="16" height="18" viewBox="0 0 16 18" fill="white"><path d="M13.4 9.5c0-2.7 2.1-4 2.2-4.1-1.2-1.7-3-1.9-3.7-2-1.6-.2-3 .9-3.8.9-.8 0-2-.9-3.3-.9C3 3.5 1 4.7 0 6.6-2 10.4-.8 16.1 1.2 19.2c1 1.5 2.2 3.1 3.8 3.1 1.5 0 2.1-1 4-1s2.4 1 4 1c1.6 0 2.7-1.5 3.7-3 1.2-1.7 1.7-3.3 1.7-3.4-.1-.1-3-1.2-3-4.4zM10.6 2.4c.8-1 1.4-2.4 1.2-3.8-1.2.1-2.6.8-3.4 1.8-.8.9-1.5 2.3-1.3 3.7 1.3.1 2.7-.7 3.5-1.7z"/></svg>
                  Apple로 계속하기
                </button>
              </div>
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
            <div className="fixed inset-x-0 bottom-0 sm:inset-0 z-50 flex items-end sm:items-center justify-center sm:px-4">
              <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl border overflow-y-auto fade-up"
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
    </div>
  );
}
