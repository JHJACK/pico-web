"use client";

import { useState, useEffect, useCallback, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { fetchStocks, type StocksMap } from "@/app/lib/stocks";
import { fetchNews, NEWS_FALLBACK, type NewsItem, type NewsCat } from "@/app/lib/news";
import { STOCK_META, TICKERS_BY_CATEGORY, KOR_TO_TICKER, ALL_TICKERS, type StockCategory } from "@/app/lib/stockNames";
import { supabase, getTodayVote, submitVoteAndAttendance } from "@/app/lib/supabase";
import { useAuth } from "@/app/lib/authContext";

// ═══════════════════════════════════════════════
// 상수 & 데이터
// ═══════════════════════════════════════════════
type ModalType = "onboarding" | "followup_quiz" | "followup_battle" | "login" | null;
type AuthTab   = "login" | "signup";
type MainTab   = "event" | "play";

const ANIMAL_NAMES: Record<string, { emoji: string; modifier: string; name: string }> = {
  tiger:     { emoji: "🐯", modifier: "공격적 개척자",  name: "호랑이"   },
  eagle:     { emoji: "🦅", modifier: "정확한 사냥꾼",  name: "독수리"   },
  wolf:      { emoji: "🐺", modifier: "역발상 철학자",  name: "늑대"     },
  fox:       { emoji: "🦊", modifier: "정보 연금술사",  name: "여우"     },
  elephant:  { emoji: "🐘", modifier: "복리 설계사",    name: "코끼리"   },
  hedgehog:  { emoji: "🦔", modifier: "철벽 방어",      name: "고슴도치" },
  turtle:    { emoji: "🐢", modifier: "신중한 수호자",  name: "거북이"   },
  butterfly: { emoji: "🦋", modifier: "예술가적 직관가", name: "나비"     },
};

const TODAY_DATE = new Date().toISOString().slice(0, 10);
const BATTLE_KEY = `pico_battle_${TODAY_DATE}`;
const INIT_VOTES_A = 1648;
const INIT_VOTES_B = 1193;

const YESTERDAY = {
  date: "4월 1일",
  winnerTicker: "ABNB",
  winnerName: "에어비앤비",
  winnerChange: "+2.3%",
  loserTicker: "HLT",
  loserName: "힐튼",
};

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
    insight: "여름 여행 성수기 앞두고 예약 수요 전년 대비 +28% 증가. 숙박업 VS 배틀에서도 주목받는 종목. 단기 모멘텀이 호랑이형과 잘 맞아.",
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

// ═══════════════════════════════════════════════
// 메인 컴포넌트
// ═══════════════════════════════════════════════
export default function Home() {
  const router = useRouter();
  const { user, userRow, refreshUserRow, signOut } = useAuth();

  const [quizDone,   setQuizDone]   = useState(false);
  const [battleDone, setBattleDone] = useState(false);
  const [quizType,   setQuizType]   = useState<string | null>(null);
  const [battleVote, setBattleVote] = useState<"a"|"b"|null>(null);
  const [votesA, setVotesA] = useState(INIT_VOTES_A);
  const [votesB, setVotesB] = useState(INIT_VOTES_B);

  const [modal,     setModal]    = useState<ModalType>(null);
  const [authTab,   setAuthTab]  = useState<AuthTab>("login");
  const [authEmail, setAuthEmail]= useState("");
  const [authPw,    setAuthPw]   = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError,   setAuthError]   = useState("");
  const [mounted,   setMounted]  = useState(false);

  // 출석/보너스 토스트
  const [toast, setToast] = useState<string | null>(null);

  const [mainTab, setMainTab] = useState<MainTab>("event");
  const [prevTab, setPrevTab] = useState<MainTab>("event");

  const [justVoted,      setJustVoted]      = useState<"a"|"b"|null>(null);
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

  // ── PICO Play
  const [playStockTab,      setPlayStockTab]      = useState<"전체" | StockCategory>("전체");
  const [playSearch,        setPlaySearch]        = useState("");
  const [playSearchResults, setPlaySearchResults] = useState<{ symbol: string; name: string; exchange: string }[]>([]);
  const [playSearchLoading, setPlaySearchLoading] = useState(false);

  const [termIdx, setTermIdx] = useState(0);

  useEffect(() => {
    setMounted(true);

    const qRaw      = localStorage.getItem("pico_quiz_done");
    const bRaw      = localStorage.getItem("pico_battle_done");
    const battleData = localStorage.getItem(BATTLE_KEY);

    const qDone = qRaw ? JSON.parse(qRaw).done === true : false;
    const bDone = bRaw === "true";
    setQuizDone(qDone);
    setBattleDone(bDone);
    if (qRaw) setQuizType(JSON.parse(qRaw).type ?? null);
    if (battleData) {
      const bd = JSON.parse(battleData);
      setBattleVote(bd.choice);
      setVotesA(bd.votesA ?? INIT_VOTES_A);
      setVotesB(bd.votesB ?? INIT_VOTES_B);
      setShowBarAnim(true);
      setShowResultMsg(true);
    }

    // 로그인 사용자: Supabase에서 오늘 투표 확인
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      if (!u) return;
      getTodayVote(u.id).then((vote) => {
        if (vote) {
          setBattleDone(true);
          setBattleVote(vote.voted_for === "ABNB" ? "a" : "b");
          setShowBarAnim(true);
          setShowResultMsg(true);
        }
      });
    });

    if (!qDone && !bDone) setModal("onboarding");
    else if (qDone && !bDone) setModal("followup_battle");
    // followup_quiz 모달은 localStorage에 퀴즈 완료 기록이 없을 때만
    else if (!qDone && bDone) setModal("followup_quiz");

    setCountdown(getMarketCountdown());
    const timer = setInterval(() => setCountdown(getMarketCountdown()), 1000);

    fetchStocks(ALL_TICKERS).then((data) => {
      setStocks(data);
      setStocksLoading(false);
    });

    fetchNews("전체").then(setNewsItems);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    setNewsLoading(true);
    fetchNews(newsCat).then((data) => {
      setNewsItems(data);
      setNewsLoading(false);
    });
  }, [newsCat, mounted]);

  // DB에 investor_type이 있으면 퀴즈 완료로 처리 (팝업 제거)
  useEffect(() => {
    if (userRow?.investor_type) {
      setQuizDone(true);
      setQuizType(userRow.investor_type);
      if (modal === "followup_quiz") setModal(null);
    }
  }, [userRow]);

  const isBlurred = modal === "onboarding" || modal === "followup_quiz" || modal === "followup_battle";
  const total = votesA + votesB;
  const pctA  = total > 0 ? Math.round((votesA / total) * 100) : 50;
  const pctB  = 100 - pctA;

  function switchTab(tab: MainTab) { setPrevTab(mainTab); setMainTab(tab); }
  const tabAnim = mainTab === "play"
    ? (prevTab === "event" ? "tab-enter" : "tab-enter-left")
    : (prevTab === "play"  ? "tab-enter-left" : "tab-enter");

  const handleVote = useCallback((choice: "a"|"b") => {
    if (battleVote || battleDone) return;
    // 비로그인 시 로그인 모달 오픈
    if (!user) { openLogin("login"); return; }

    const newA = choice === "a" ? votesA + 1 : votesA;
    const newB = choice === "b" ? votesB + 1 : votesB;
    setJustVoted(choice);
    if (choice === "a") setShowParticlesA(true); else setShowParticlesB(true);
    setTimeout(async () => {
      setBattleVote(choice); setBattleDone(true);
      setVotesA(newA); setVotesB(newB); setShowBarAnim(true);
      localStorage.setItem(BATTLE_KEY, JSON.stringify({ choice, votesA: newA, votesB: newB }));
      localStorage.setItem("pico_battle_done", "true");

      // Supabase 저장
      const votedTicker = choice === "a" ? "ABNB" : "HLT";
      submitVoteAndAttendance(user.id, votedTicker, "ABNB", "HLT").then(({ bonusDays, bonusPoints }) => {
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
  }, [battleVote, battleDone, votesA, votesB, user]);

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

  const userPickedYesterday = battleVote === "a" ? "ABNB" : battleVote === "b" ? "HLT" : null;
  const userWon = userPickedYesterday === YESTERDAY.winnerTicker;

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
                style={{ fontSize: 14, fontWeight: 500, color: mainTab === tab ? "#e8e0d0" : "#5c5448", background: "none", border: "none", transition: "color 0.15s" }}>
                {tab === "event" ? "이벤트" : "PICO Play"}
                <span style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, background: mainTab === tab ? "#FACA3E" : "transparent", borderRadius: 2, transition: "background 0.2s" }} />
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
            style={{ fontSize: 13, fontWeight: 500, color: mainTab === tab ? "#e8e0d0" : "#5c5448", background: "none", border: "none" }}>
            {tab === "event" ? "이벤트" : "PICO Play"}
            <span style={{ position: "absolute", bottom: 0, left: "25%", right: "25%", height: 2, background: mainTab === tab ? "#FACA3E" : "transparent", borderRadius: 2, transition: "background 0.2s" }} />
          </button>
        ))}
      </div>

      {/* ══════════ 히어로 ══════════ */}
      <section className="relative overflow-hidden border-b" style={{ minHeight: 460, borderColor: "rgba(255,255,255,0.06)", background: "radial-gradient(ellipse 70% 55% at 50% -5%, rgba(250,202,62,0.07) 0%, transparent 65%)" }}>
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
                <button onClick={() => router.push("/battle")} className="pico-btn px-6 py-3 rounded-xl" style={{ background: "transparent", color: "#e8e0d0", fontSize: 14, fontWeight: 500, border: "0.5px solid rgba(255,255,255,0.14)" }}>
                  오늘 배틀 참여
                </button>
              </div>
            </div>

            {/* 통계 카드 */}
            <div className="grid grid-cols-3 lg:flex lg:flex-col gap-3 w-full lg:w-auto">
              {[
                { num: "2,841", unit: "명",  sub: "오늘 VS 배틀 참여",    cls: "float-1", accent: "#FACA3E" },
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
      </section>

      {/* ══════════ 메인 콘텐츠 ══════════ */}
      <main className="mx-auto px-5 lg:px-10 pb-24" style={{ maxWidth: 1280 }}>

        {/* ════ 이벤트 탭 ════ */}
        {mainTab === "event" && (
          <div key="event" className={tabAnim}>

            {/* ── 어제 결과 카드 ── */}
            <div className="mt-8 mb-2 rounded-2xl p-5 border" style={{ background: "#141414", borderColor: "rgba(255,255,255,0.08)" }}>
              <SectionLabel text={`${YESTERDAY.date} 배틀 결과`} />
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <TickerLogo src="https://logo.clearbit.com/airbnb.com" ticker="ABNB" size={28} />
                  <div>
                    <span style={{ ...NUM, fontSize: 16, color: "#FACA3E" }}>👑 {YESTERDAY.winnerTicker}</span>
                    <span style={{ fontSize: 13, color: "#5c5448", marginLeft: 6, fontWeight: 300 }}>{YESTERDAY.winnerName}</span>
                  </div>
                  <span style={{ ...NUM, fontSize: 13, color: "#7ed4a0" }}>{YESTERDAY.winnerChange}</span>
                </div>
                <span style={{ fontSize: 13, color: "#5c5448", fontWeight: 300 }}>이겼어요!</span>
                {battleVote && (
                  <span className="fade-in-up rounded-lg px-3 py-1.5" style={{
                    background: userWon ? "rgba(126,212,160,0.1)" : "rgba(240,120,120,0.1)",
                    color: userWon ? "#7ed4a0" : "#f07878",
                    border: `0.5px solid ${userWon ? "rgba(126,212,160,0.25)" : "rgba(240,120,120,0.25)"}`,
                    fontSize: 13, fontWeight: 500,
                  }}>
                    {userWon ? "정답! 🎉 +100P 획득" : "아쉽게 틀렸어요 😅"}
                  </span>
                )}
              </div>
            </div>

            {/* ── VS 배틀 + DNA 그리드 ── */}
            <div className="pb-10 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <div className="mb-5 mt-6">
                <p style={{ fontSize: "clamp(20px, 5vw, 28px)", fontWeight: 500, color: "#e8e0d0", marginBottom: 4 }}>오늘, 누가 오를까</p>
                <p style={{ fontSize: "clamp(12px, 3vw, 14px)", color: "#a09688", fontWeight: 300 }}>하루 1번 예측 → 익일 결과 · 정답 시 100 포인트</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                {/* 배틀 카드 (2/3) */}
                <div className="lg:col-span-2 rounded-2xl p-4 sm:p-6 border" style={{ background: "#141414", borderColor: "rgba(250,202,62,0.18)" }}>
                  <div className="flex items-center justify-between mb-2">
                    <SectionLabel text="오늘의 VS 배틀 — 숙박업" />
                    {battleDone && (
                      <span style={{ fontSize: 11, fontWeight: 500, padding: "3px 9px", borderRadius: 4, background: "rgba(126,212,160,0.12)", color: "#7ed4a0", border: "0.5px solid rgba(126,212,160,0.25)" }}>
                        참여완료
                      </span>
                    )}
                  </div>

                  {!battleDone && (
                    <div className="flex items-center gap-2 mb-4">
                      <span style={{ fontSize: 12, color: "#5c5448", fontWeight: 300 }}>오늘 장 마감까지 투표 가능</span>
                      <span style={{ ...NUM, fontSize: 13, color: "#FACA3E" }}>{countdown}</span>
                    </div>
                  )}

                  {/* A vs B */}
                  <div className="flex items-stretch gap-4 mb-5">
                    {/* A — ABNB */}
                    <div className="relative flex-1">
                      <GoldParticles show={showParticlesA} />
                      <button onClick={() => handleVote("a")} disabled={battleDone}
                        className={`w-full rounded-xl p-5 border text-center pico-btn ${justVoted === "a" ? "gold-glow" : ""}`}
                        style={{
                          background: battleVote === "a" ? "rgba(250,202,62,0.06)" : "#1c1c1c",
                          borderColor: battleVote === "a" ? "rgba(250,202,62,0.45)" : "rgba(255,255,255,0.06)",
                          cursor: battleDone ? "default" : "pointer",
                          opacity: battleDone && battleVote !== "a" ? 0.4 : 1,
                          transform: battleDone && battleVote !== "a" ? "scale(0.96)" : "scale(1)",
                          transition: "opacity 0.4s ease, transform 0.4s ease, border-color 0.2s, background 0.2s",
                        }}>
                        <div className="flex justify-center mb-2">
                          <TickerLogo src="https://logo.clearbit.com/airbnb.com" ticker="ABNB" size={32} />
                        </div>
                        <div style={{ ...NUM, fontSize: "clamp(16px, 4vw, 22px)", color: battleVote === "a" ? "#FACA3E" : "#e8e0d0", marginBottom: 2 }}>ABNB</div>
                        <div style={{ fontSize: 12, color: "#5c5448", marginBottom: 6, fontWeight: 300 }}>에어비앤비</div>
                        {stocksLoading
                          ? <Skeleton w={80} h={14} />
                          : <div style={{ marginBottom: 10 }}>
                              <div style={{ marginBottom: 3 }}><PriceDisplay ticker="ABNB" krwSize={14} usdSize={11} /></div>
                              <div style={{ ...NUM, fontSize: 12, color: upOf("ABNB") ? "#7ed4a0" : "#f07878" }}>{upOf("ABNB") ? "▲" : "▼"} {changeOf("ABNB")}</div>
                            </div>
                        }
                        <div style={{ fontSize: 11, fontWeight: 500, padding: "5px 12px", borderRadius: 5, display: "inline-block", background: battleVote === "a" ? "rgba(250,202,62,0.15)" : "rgba(255,255,255,0.04)", color: battleVote === "a" ? "#FACA3E" : "#5c5448", border: `0.5px solid ${battleVote === "a" ? "rgba(250,202,62,0.3)" : "rgba(255,255,255,0.08)"}` }}>
                          {battleVote === "a" ? "✓ 선택함" : "선택하기"}
                        </div>
                      </button>
                    </div>

                    <div className="flex items-center justify-center flex-shrink-0" style={{ width: 32, fontSize: 14, fontWeight: 500, color: "#5c5448" }}>VS</div>

                    {/* B — HLT */}
                    <div className="relative flex-1">
                      <GoldParticles show={showParticlesB} />
                      <button onClick={() => handleVote("b")} disabled={battleDone}
                        className={`w-full rounded-xl p-5 border text-center pico-btn ${justVoted === "b" ? "gold-glow" : ""}`}
                        style={{
                          background: battleVote === "b" ? "rgba(126,184,247,0.06)" : "#1c1c1c",
                          borderColor: battleVote === "b" ? "rgba(126,184,247,0.45)" : "rgba(255,255,255,0.06)",
                          cursor: battleDone ? "default" : "pointer",
                          opacity: battleDone && battleVote !== "b" ? 0.4 : 1,
                          transform: battleDone && battleVote !== "b" ? "scale(0.96)" : "scale(1)",
                          transition: "opacity 0.4s ease, transform 0.4s ease, border-color 0.2s, background 0.2s",
                        }}>
                        <div className="flex justify-center mb-2">
                          <TickerLogo src="https://logo.clearbit.com/hilton.com" ticker="HLT" size={32} />
                        </div>
                        <div style={{ ...NUM, fontSize: "clamp(16px, 4vw, 22px)", color: battleVote === "b" ? "#7eb8f7" : "#e8e0d0", marginBottom: 2 }}>HLT</div>
                        <div style={{ fontSize: 12, color: "#5c5448", marginBottom: 6, fontWeight: 300 }}>힐튼 호텔</div>
                        {stocksLoading
                          ? <Skeleton w={80} h={14} />
                          : <div style={{ marginBottom: 10 }}>
                              <div style={{ marginBottom: 3 }}><PriceDisplay ticker="HLT" krwSize={14} usdSize={11} /></div>
                              <div style={{ ...NUM, fontSize: 12, color: upOf("HLT") ? "#7ed4a0" : "#f07878" }}>{upOf("HLT") ? "▲" : "▼"} {changeOf("HLT")}</div>
                            </div>
                        }
                        <div style={{ fontSize: 11, fontWeight: 500, padding: "5px 12px", borderRadius: 5, display: "inline-block", background: battleVote === "b" ? "rgba(126,184,247,0.15)" : "rgba(255,255,255,0.04)", color: battleVote === "b" ? "#7eb8f7" : "#5c5448", border: `0.5px solid ${battleVote === "b" ? "rgba(126,184,247,0.3)" : "rgba(255,255,255,0.08)"}` }}>
                          {battleVote === "b" ? "✓ 선택함" : "선택하기"}
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* 투표 바 */}
                  {showBarAnim ? (
                    <div className="fade-in-up">
                      <div className="rounded-full overflow-hidden mb-2" style={{ height: 3, background: "#242424" }}>
                        <div className="h-full rounded-full" style={{ width: `${pctA}%`, background: "#FACA3E", transition: "width 1.2s cubic-bezier(.4,0,.2,1)" }} />
                      </div>
                      <div className="flex justify-between items-center">
                        <span style={{ ...NUM, fontSize: 13, color: "#FACA3E" }}>ABNB <CountUp target={pctA} duration={1200} />%</span>
                        <span style={{ ...NUM, fontSize: 12, color: "#5c5448" }}>총 {total.toLocaleString()}명</span>
                        <span style={{ ...NUM, fontSize: 13, color: "#7eb8f7" }}>HLT <CountUp target={pctB} duration={1200} />%</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center" style={{ fontSize: 13, color: "#5c5448", fontWeight: 300 }}>선택하면 투표 현황이 공개돼</div>
                  )}

                  {showResultMsg && (
                    <div className="fade-in-up mt-4 rounded-xl px-4 py-3 text-center" style={{ background: "rgba(250,202,62,0.05)", border: "0.5px solid rgba(250,202,62,0.15)" }}>
                      <span style={{ fontSize: 14, fontWeight: 500, color: "#e8e0d0" }}>내일 오전 결과 공개! 🎯</span>
                    </div>
                  )}
                </div>

                {/* DNA 카드 (1/3) */}
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
                        <button onClick={() => router.push("/mypage")} className="pico-btn flex-1 rounded-xl py-2.5" style={{ background: "rgba(250,202,62,0.08)", color: "#FACA3E", border: "0.5px solid rgba(250,202,62,0.25)", fontSize: 13, fontWeight: 500 }}>상세 리포트</button>
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
              <div className="scroll-x flex gap-3 pb-2" style={{ scrollSnapType: "x mandatory" }}>
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
                      onClick={() => router.push("/quiz")}>
                      <div style={{ fontSize: 28, marginBottom: 8 }}>{info.emoji}</div>
                      <div style={{ fontSize: 10, color: "#5c5448", marginBottom: 2 }}>{info.modifier}</div>
                      <div style={{ fontSize: 15, fontWeight: 500, color: isMe ? color : "#e8e0d0", marginBottom: 6, lineHeight: 1.2 }}>{info.name}</div>
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
        {mainTab === "play" && (
          <div key="play" className={tabAnim}>

            {/* 헤더 */}
            <div className="pt-10 pb-8 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <p style={{ fontSize: 40, fontWeight: 500, color: "#FACA3E", marginBottom: 6 }}>PICO Play</p>
              <p style={{ fontSize: 16, color: "#a09688", fontWeight: 300 }}>가상 10만원으로 진짜처럼 투자해봐</p>
            </div>

            {/* 포트폴리오 카드 */}
            <div className="pt-8 pb-8 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <div className="rounded-2xl p-6 border" style={{ background: "#141414", borderColor: "rgba(250,202,62,0.22)", maxWidth: 360 }}>
                <SectionLabel text="내 가상 포트폴리오" />
                <div style={{ ...NUM, fontSize: 36, color: "#FACA3E", margin: "10px 0 4px" }}>₩100,000</div>
                <div style={{ ...NUM, fontSize: 13, color: "#5c5448", marginBottom: 20 }}>+0.00% (시작 전)</div>
                <button className="pico-btn w-full rounded-xl py-3" style={{ background: "#FACA3E", color: "#0d0d0d", fontSize: 14, fontWeight: 500 }}>
                  투자 시작하기 →
                </button>
              </div>
            </div>

            {/* 종목 섹션 */}
            <div className="pt-8 pb-8 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <div className="mb-6">
                <p style={{ fontSize: 22, fontWeight: 500, color: "#e8e0d0", marginBottom: 4 }}>종목 둘러보기</p>
                <p style={{ fontSize: 14, color: "#a09688", fontWeight: 300 }}>40개 종목 실시간 시세 · 15분 지연</p>
              </div>

              {/* 검색창 */}
              <div className="relative mb-5" style={{ maxWidth: 400 }}>
                <input
                  type="text"
                  value={playSearch}
                  onChange={(e) => {
                    const q = e.target.value;
                    setPlaySearch(q);
                    if (!q.trim()) { setPlaySearchResults([]); return; }

                    // 한글 → KOR_TO_TICKER 매핑
                    const mapped = KOR_TO_TICKER[q.trim()];
                    if (mapped) {
                      setPlaySearchResults([{ symbol: mapped, name: STOCK_META[mapped]?.name ?? mapped, exchange: "" }]);
                      return;
                    }

                    // 영어 티커 → 로컬 매칭
                    const upper = q.trim().toUpperCase();
                    const local = ALL_TICKERS.filter((t) => t.startsWith(upper) || STOCK_META[t]?.name.includes(q));
                    if (local.length > 0) {
                      setPlaySearchResults(local.map((t) => ({ symbol: t, name: STOCK_META[t]?.name ?? t, exchange: "" })));
                      return;
                    }

                    // 로컬 매칭 없음 → FMP search API
                    setPlaySearchLoading(true);
                    fetch(`/api/stocks/search?query=${encodeURIComponent(q)}`)
                      .then((r) => r.json())
                      .then((data) => setPlaySearchResults(data))
                      .catch(() => setPlaySearchResults([]))
                      .finally(() => setPlaySearchLoading(false));
                  }}
                  placeholder="종목명 또는 티커 검색 (예: 테슬라, NVDA)"
                  className="w-full rounded-xl px-4 py-3 outline-none"
                  style={{ background: "#1c1c1c", border: "0.5px solid rgba(255,255,255,0.1)", color: "#e8e0d0", fontSize: 14, fontWeight: 300 }}
                  onFocus={(e) => (e.target.style.borderColor = "rgba(250,202,62,0.4)")}
                  onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
                />
                {playSearch && (
                  <button onClick={() => { setPlaySearch(""); setPlaySearchResults([]); }} className="pico-btn absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "#5c5448", fontSize: 16, background: "none", border: "none" }}>✕</button>
                )}
              </div>

              {/* 검색 결과 */}
              {playSearch && (
                <div className="mb-6">
                  {playSearchLoading
                    ? <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                        {[1,2].map((i) => <div key={i} className="rounded-xl p-4 border" style={{ background: "#141414", borderColor: "rgba(255,255,255,0.06)", minHeight: 90 }}><Skeleton w="60%" h={14} /><div style={{ height: 8 }} /><Skeleton w="40%" h={12} /></div>)}
                      </div>
                    : playSearchResults.length > 0
                      ? <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                          {playSearchResults.map((r) => (
                            <StockCard key={r.symbol} ticker={r.symbol} korName={STOCK_META[r.symbol]?.name ?? r.name} stocks={stocks} stocksLoading={stocksLoading} />
                          ))}
                        </div>
                      : <p style={{ fontSize: 13, color: "#5c5448", fontWeight: 300 }}>검색 결과가 없어요</p>
                  }
                </div>
              )}

              {/* 카테고리 탭 */}
              {!playSearch && (
                <>
                  <div className="flex gap-2 mb-5 scroll-x">
                    {(["전체", "AI·반도체", "빅테크", "테마", "브랜드", "금융"] as const).map((tab) => (
                      <button key={tab} onClick={() => setPlayStockTab(tab)} className="pico-btn flex-shrink-0 px-4 py-1.5 rounded-lg"
                        style={{ fontSize: 12, fontWeight: 500, background: playStockTab === tab ? "rgba(250,202,62,0.12)" : "rgba(255,255,255,0.04)", color: playStockTab === tab ? "#FACA3E" : "#5c5448", border: `0.5px solid ${playStockTab === tab ? "rgba(250,202,62,0.3)" : "rgba(255,255,255,0.06)"}` }}>
                        {tab}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {(playStockTab === "전체" ? ALL_TICKERS : TICKERS_BY_CATEGORY[playStockTab as StockCategory]).map((ticker) => (
                      <StockCard key={ticker} ticker={ticker} korName={STOCK_META[ticker]?.name ?? ticker} stocks={stocks} stocksLoading={stocksLoading} />
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* ── PICO의 눈 ── */}
            <div className="pt-10 pb-8 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <div className="mb-6">
                <p style={{ fontSize: 28, fontWeight: 500, color: "#e8e0d0", marginBottom: 4 }}>네 성향이 말하는 종목</p>
                <p style={{ fontSize: 14, color: "#a09688", fontWeight: 300 }}>강요 없이, 살짝 밀어주는 PICO의 시각 👀</p>
              </div>

              <div className="scroll-x flex gap-4" style={{ paddingBottom: 4 }}>
                {PICO_EYE_CARDS.map((card) => (
                  <div key={card.ticker} className="pico-card snap-start flex-shrink-0 rounded-2xl border flex flex-col" style={{ background: "#1c1c1c", borderColor: "rgba(250,202,62,0.25)", width: 280, padding: "20px" }}>
                    <div className="flex items-center gap-3 mb-3">
                      <TickerLogo src={card.logo} ticker={card.ticker} size={28} />
                      <div>
                        <div style={{ ...NUM, fontSize: 16, color: card.color }}>{card.ticker}</div>
                        <div style={{ fontSize: 12, color: "#5c5448", fontWeight: 300 }}>{card.name}</div>
                      </div>
                      <div className="ml-auto text-right">
                        {stocksLoading
                          ? <Skeleton w={60} h={14} />
                          : <>
                            <PriceDisplay ticker={card.ticker} krwSize={14} usdSize={11} />
                            <div style={{ ...NUM, fontSize: 12, color: upOf(card.ticker) ? "#7ed4a0" : "#f07878" }}>
                              {upOf(card.ticker) ? "▲" : "▼"} {changeOf(card.ticker)}
                            </div>
                          </>
                        }
                      </div>
                    </div>
                    <p style={{ fontSize: 13, color: "#a09688", lineHeight: 1.75, flex: 1, marginBottom: 14, fontWeight: 300 }}>{card.insight}</p>
                    <div style={{ borderTop: "0.5px solid rgba(255,255,255,0.06)", paddingTop: 12, marginBottom: 12 }}>
                      <p style={{ fontSize: 11, color: "#5c5448", lineHeight: 1.55, fontWeight: 300 }}>이건 PICO의 시각이야. 투자 결정은 네 몫 🤝</p>
                    </div>
                    <button className="pico-btn" style={{ fontSize: 12, fontWeight: 500, color: "#FACA3E" }}>자세히 보기 →</button>
                  </div>
                ))}
              </div>
            </div>

            {/* AI 인사이트 */}
            <div className="pt-10 pb-8">
              <div className="rounded-2xl p-6 border" style={{ background: "#141414", borderColor: "rgba(250,202,62,0.28)" }}>
                <SectionLabel text="오늘의 한 줄" />
                <p style={{ fontSize: 16, fontWeight: 500, color: "#e8e0d0", lineHeight: 1.8 }}>
                  PICO Play를 시작하면 매일 AI 인사이트를 받아볼 수 있어요 ✨
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── 서비스 소개 배너 ── */}
        <div className="rounded-2xl px-6 py-5 border mb-4" style={{ background: "rgba(250,202,62,0.05)", borderColor: "rgba(250,202,62,0.18)" }}>
          <p style={{ fontSize: 16, color: "#e8e0d0", lineHeight: 1.75, marginBottom: 4, fontWeight: 300 }}>
            PICO는 투자 공부 앱이 아니야.<br />
            <strong style={{ color: "#FACA3E", fontWeight: 500 }}>결정을 도와주는 파트너야. 🤝</strong>
          </p>
          <p style={{ fontSize: 13, color: "#5c5448", fontWeight: 300 }}>주식 입문자를 위한 넛지형 투자 가이드</p>
        </div>
      </main>

      {/* ════════ 온보딩 모달 ════════ */}
      {modal === "onboarding" && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0">
          <div className="w-full max-w-sm rounded-2xl p-6 fade-up" style={{ background: "#141414", border: "0.5px solid rgba(255,255,255,0.1)" }}>
            <div className="text-center mb-6">
              <div style={{ fontSize: 22, fontWeight: 500, color: "#FACA3E", marginBottom: 6 }}>PICO에 온 걸 환영해 👋</div>
              <p style={{ fontSize: 14, color: "#a09688", lineHeight: 1.8, fontWeight: 300 }}>시작하기 전에, 하나만 먼저 해볼래?</p>
            </div>
            <div className="flex flex-col gap-3">
              {[
                { icon: "🧬", label: "투자 DNA 찾기", title: "나는 어떤 투자자일까?", sub: "12문항 · 약 2분", accent: "#7eb8f7", path: "/quiz" },
                { icon: "⚔️", label: "VS 배틀 참여하기", title: "오늘 ABNB vs HLT", sub: "하루 1번 · 정답 시 100P", accent: "#FACA3E", path: "/battle" },
              ].map((item) => (
                <button key={item.path} onClick={() => router.push(item.path)} className="pico-card w-full rounded-xl p-4 border text-left" style={{ background: "#1c1c1c", borderColor: `${item.accent}40` }}>
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{item.icon}</div>
                    <div>
                      <div style={{ fontSize: 10, letterSpacing: "0.1em", color: item.accent, textTransform: "uppercase", fontWeight: 500, marginBottom: 2 }}>{item.label}</div>
                      <div style={{ fontSize: 15, color: "#e8e0d0", fontWeight: 500 }}>{item.title}</div>
                      <div style={{ fontSize: 12, color: "#5c5448", marginTop: 2, fontWeight: 300 }}>{item.sub}</div>
                    </div>
                    <div style={{ marginLeft: "auto", color: "#5c5448", fontSize: 20 }}>›</div>
                  </div>
                </button>
              ))}
            </div>
            <button onClick={() => setModal(null)} className="pico-btn w-full mt-4 py-2" style={{ fontSize: 13, color: "#5c5448", fontWeight: 300 }}>나중에 할게</button>
          </div>
        </div>
      )}

      {modal === "followup_battle" && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0">
          <div className="w-full max-w-sm rounded-2xl p-6 fade-up" style={{ background: "#141414", border: "0.5px solid rgba(255,255,255,0.08)" }}>
            <div className="text-center mb-5">
              <div style={{ fontSize: 38, marginBottom: 10 }}>⚔️</div>
              <div style={{ fontSize: 20, fontWeight: 500, color: "#e8e0d0", marginBottom: 6 }}>VS 배틀도 참여해볼래?</div>
              <p style={{ fontSize: 14, color: "#a09688", lineHeight: 1.8, fontWeight: 300 }}>오늘 에어비앤비 vs 힐튼 배틀이 열려 있어.<br />정답 맞추면 100 포인트!</p>
            </div>
            <button onClick={() => router.push("/battle")} className="pico-btn w-full rounded-xl py-3 mb-3" style={{ background: "#FACA3E", color: "#0d0d0d", fontSize: 14, fontWeight: 500 }}>배틀 참여하기 →</button>
            <button onClick={() => setModal(null)} className="pico-btn w-full py-2" style={{ fontSize: 13, color: "#5c5448", fontWeight: 300 }}>괜찮아, 나중에 할게</button>
          </div>
        </div>
      )}

      {modal === "followup_quiz" && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0">
          <div className="w-full max-w-sm rounded-2xl p-6 fade-up" style={{ background: "#141414", border: "0.5px solid rgba(255,255,255,0.08)" }}>
            <div className="text-center mb-5">
              <div style={{ fontSize: 38, marginBottom: 10 }}>🧬</div>
              <div style={{ fontSize: 20, fontWeight: 500, color: "#e8e0d0", marginBottom: 6 }}>투자 DNA도 확인해볼래?</div>
              <p style={{ fontSize: 14, color: "#a09688", lineHeight: 1.8, fontWeight: 300 }}>12문항으로 내 투자 성향을 알아봐.<br />결과를 친구에게 공유할 수도 있어.</p>
            </div>
            <button onClick={() => router.push("/quiz")} className="pico-btn w-full rounded-xl py-3 mb-3" style={{ background: "#FACA3E", color: "#0d0d0d", fontSize: 14, fontWeight: 500 }}>퀴즈 시작하기 →</button>
            <button onClick={() => setModal(null)} className="pico-btn w-full py-2" style={{ fontSize: 13, color: "#5c5448", fontWeight: 300 }}>괜찮아, 나중에 할게</button>
          </div>
        </div>
      )}

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
    </div>
  );
}
