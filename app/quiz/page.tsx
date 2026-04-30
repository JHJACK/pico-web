"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/app/lib/authContext";
import AuthGuard from "@/app/components/AuthGuard";
import { BackIcon } from "@/app/components/BackIcon";
import { supabase, saveQuizResult } from "@/app/lib/supabase";
import {
  QUESTIONS, INVESTOR_TYPES, calcInvestorType,
  type TypeKey, type AxisScores,
} from "@/app/lib/quizTypes";

const TOTAL = QUESTIONS.length; // 18
const SHARE_URL = "https://pico-web-one.vercel.app/quiz";
const SS_KEY    = "pico_quiz_scores";

const axisColors: Record<string, string> = { R: "#f07878", I: "#7eb8f7", T: "#7ed4a0", Y: "#FACA3E" };
const axisLabels: Record<string, string> = { R: "변동성 회복력", I: "정보 필터링", T: "운용 호흡", Y: "수익 편향" };
const axisMax:    Record<string, number> = { R: 165, I: 132, T: 165, Y: 132 };

const axisDetails = [
  {
    key: "R", color: "#f07878", icon: "⚡",
    label: "변동성 회복력",
    desc: "시장이 흔들릴 때 감정이 아닌 전략으로 반응하는 능력. 하락장에서 어떻게 판단하고 행동하는지를 측정해요.",
  },
  {
    key: "I", color: "#7eb8f7", icon: "🔍",
    label: "정보 필터링",
    desc: "소문·노이즈를 걸러내고 핵심 정보만 선별하는 판단력. 투자 결정을 내릴 때 어떤 정보를 신뢰하는지 측정해요.",
  },
  {
    key: "T", color: "#7ed4a0", icon: "⏳",
    label: "운용 호흡",
    desc: "나에게 맞는 투자 시간 지평과 매매 리듬. 단기 목표를 추구하는지, 장기 복리를 설계하는지 측정해요.",
  },
  {
    key: "Y", color: "#FACA3E", icon: "📈",
    label: "수익 편향",
    desc: "안정적인 현금흐름을 원하는지, 폭발적 자본 성장을 원하는지. 수익을 바라보는 근본 성향을 측정해요.",
  },
];

function Mark({ children }: { children: React.ReactNode }) {
  return (
    <mark style={{ background: "rgba(250,202,62,0.22)", color: "#e8e0d0", borderRadius: "3px", padding: "1px 5px", fontWeight: 600 } as React.CSSProperties}>
      {children}
    </mark>
  );
}

export default function QuizPage() {
  const { user, refreshUserRow } = useAuth();

  const [step,      setStep]     = useState(0);
  const [scores,    setScores]   = useState<AxisScores>({ R: 0, I: 0, T: 0, Y: 0 });
  const [perQuestionAnswer, setPerQuestionAnswer] = useState<Record<number, number>>({});
  const [animating, setAnimating] = useState(false);
  const [result,    setResult]   = useState<TypeKey | null>(null);
  const [resultScores, setResultScores] = useState<AxisScores | null>(null);
  const [showFull,  setShowFull] = useState(false);
  const [quizBonus, setQuizBonus] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [toast,     setToast]    = useState("");

  const [authMode,    setAuthMode]    = useState<"login" | "signup" | null>(null);
  const [authEmail,   setAuthEmail]   = useState("");
  const [authPw,      setAuthPw]      = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError,   setAuthError]   = useState("");

  const pendingType = useRef<TypeKey | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem(SS_KEY);
    if (raw) {
      try {
        const saved = JSON.parse(raw) as { scores: AxisScores; step: number; answers?: Record<number, number> };
        if (saved.step > 0 && saved.step <= TOTAL) {
          setScores(saved.scores);
          setStep(saved.step);
          if (saved.answers) setPerQuestionAnswer(saved.answers);
        }
      } catch { /* ignore */ }
    }
  }, []);

  useEffect(() => {
    document.body.style.overflow = authMode ? "hidden" : "";
    document.documentElement.style.overflow = authMode ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, [authMode]);

  useEffect(() => {
    if (!user) return;
    const raw = localStorage.getItem("pico_quiz_pending");
    if (!raw) return;
    const { type, scores: s } = JSON.parse(raw) as { type: TypeKey; scores: AxisScores };
    pendingType.current = null;
    saveQuizResult(user.id, type).then(({ pointsAdded }) => {
      if (pointsAdded > 0) setQuizBonus(pointsAdded);
      refreshUserRow();
    });
    localStorage.removeItem("pico_quiz_pending");
    localStorage.setItem("pico_quiz_done", JSON.stringify({ done: true, type }));
    sessionStorage.removeItem(SS_KEY);
    setResult(type);
    setResultScores(s ?? null);
    setStep(19);
    setShowFull(true);
  }, [user]);

  const [existingType, setExistingType] = useState<TypeKey | null>(null);
  useEffect(() => {
    if (!user) { setExistingType(null); return; }
    const raw = localStorage.getItem("pico_quiz_done");
    if (raw) {
      const { done, type } = JSON.parse(raw);
      if (done && type) setExistingType(type as TypeKey);
    }
  }, [user]);

  const progress  = step === 0 ? 0 : Math.min((step / TOTAL) * 100, 100);
  const currentQ  = step >= 1 && step <= TOTAL ? QUESTIONS[step - 1] : null;

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  function handleAnswer(score: number) {
    if (animating || !currentQ) return;
    const newScores = { ...scores, [currentQ.axis]: scores[currentQ.axis] + score };
    const newAnswers = { ...perQuestionAnswer, [step]: score };
    setAnimating(true);
    setTimeout(() => {
      setScores(newScores);
      setPerQuestionAnswer(newAnswers);
      const nextStep = step + 1;
      if (step === TOTAL) {
        const typeKey = calcInvestorType(newScores);
        setResult(typeKey);
        setResultScores(newScores);
        setAnalyzing(true);
        sessionStorage.removeItem(SS_KEY);
        setTimeout(() => {
          setAnalyzing(false);
          setStep(19);
          if (user) {
            saveQuizResult(user.id, typeKey).then(({ pointsAdded }) => {
              if (pointsAdded > 0) setQuizBonus(pointsAdded);
              refreshUserRow();
            });
            localStorage.setItem("pico_quiz_done", JSON.stringify({ done: true, type: typeKey }));
            setShowFull(true);
          } else {
            pendingType.current = typeKey;
            localStorage.setItem("pico_quiz_pending", JSON.stringify({ type: typeKey, scores: newScores }));
            setShowFull(false);
          }
        }, 1600);
      } else {
        setStep(nextStep);
        sessionStorage.setItem(SS_KEY, JSON.stringify({ scores: newScores, step: nextStep, answers: newAnswers }));
      }
      setAnimating(false);
    }, 200);
  }

  function handleBack() {
    if (step <= 1) {
      reset();
      return;
    }
    const prevStep = step - 1;
    const prevQ = QUESTIONS[prevStep - 1];
    const prevScore = perQuestionAnswer[prevStep];

    let newScores = { ...scores };
    const newAnswers = { ...perQuestionAnswer };

    if (prevScore !== undefined) {
      newScores = { ...scores, [prevQ.axis]: Math.max(0, scores[prevQ.axis] - prevScore) };
      delete newAnswers[prevStep];
    }

    setScores(newScores);
    setPerQuestionAnswer(newAnswers);
    setStep(prevStep);
    sessionStorage.setItem(SS_KEY, JSON.stringify({ scores: newScores, step: prevStep, answers: newAnswers }));
  }

  async function handleAuth() {
    if (!authEmail || !authPw) { setAuthError("이메일과 비밀번호를 입력해주세요."); return; }
    setAuthLoading(true); setAuthError("");
    if (authMode === "signup") {
      const { error } = await supabase.auth.signUp({ email: authEmail, password: authPw });
      if (error) { setAuthError(error.message); setAuthLoading(false); return; }
      await supabase.auth.signInWithPassword({ email: authEmail, password: authPw });
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPw });
      if (error) { setAuthError("이메일 또는 비밀번호가 틀렸어요."); setAuthLoading(false); return; }
    }
    setAuthLoading(false);
    setAuthMode(null);
    setShowFull(true);
  }

  function reset() {
    setStep(0); setScores({ R: 0, I: 0, T: 0, Y: 0 });
    setPerQuestionAnswer({});
    setResult(null); setResultScores(null); setShowFull(false);
    setAnimating(false); setQuizBonus(0); setAuthMode(null);
    sessionStorage.removeItem(SS_KEY);
  }

  function shareQuiz() {
    const typeData = result ? INVESTOR_TYPES[result] : null;
    const text = typeData
      ? `나는 ${typeData.modifier} ${typeData.emoji}${typeData.name}!\n\n당신의 투자 DNA는? PICO에서 확인해보세요 →\n${SHARE_URL}`
      : `투자 DNA 테스트 — PICO에서 내 유형을 찾아보세요 →\n${SHARE_URL}`;
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({ title: "PICO 투자 DNA 테스트", text, url: SHARE_URL }).catch(() => {});
    } else {
      navigator.clipboard.writeText(SHARE_URL).then(() => {
        showToast("링크 복사됐어요! 친구에게 보내보세요 🎉");
      });
    }
  }

  const typeData = result ? INVESTOR_TYPES[result] : null;

  const normScores = resultScores ? {
    R: Math.round((resultScores.R / axisMax.R) * 100),
    I: Math.round((resultScores.I / axisMax.I) * 100),
    T: Math.round((resultScores.T / axisMax.T) * 100),
    Y: Math.round((resultScores.Y / axisMax.Y) * 100),
  } : null;

  const currentAxisColor = currentQ ? axisColors[currentQ.axis] : "#FACA3E";

  return (
    <AuthGuard>
    <main className="min-h-screen" style={{ background: "#0d0d0d", fontFamily: "var(--font-paperlogy), var(--font-noto), sans-serif" }}>

      {/* 토스트 */}
      {toast && (
        <div className="fixed top-16 left-1/2 z-[100]" style={{ transform: "translateX(-50%)" }}>
          <div className="rounded-2xl px-5 py-3 shadow-xl" style={{ background: "#FACA3E", color: "#0d0d0d", fontSize: 14, fontWeight: 600, whiteSpace: "nowrap" }}>
            {toast}
          </div>
        </div>
      )}

      {/* 네비게이션 */}
      <nav className="sticky top-0 z-50 flex items-center px-5 border-b"
        style={{ height: 50, background: "rgba(13,13,13,0.95)", backdropFilter: "blur(16px)", borderColor: "rgba(255,255,255,0.06)" }}>
        <Link href="/" style={{ textDecoration: "none" }}><BackIcon /></Link>
        <span style={{ fontFamily: "var(--font-mona12)", fontSize: 14, color: "#FACA3E", marginLeft: 16, fontWeight: 700, letterSpacing: "0.06em" }}>PICO</span>
        {step >= 1 && step <= TOTAL && (
          <span style={{ fontFamily: "var(--font-mona12)", fontSize: 12, color: "#c8bfb0", marginLeft: "auto" }}>{step} / {TOTAL}</span>
        )}
      </nav>

      {/* 인라인 로그인 모달 */}
      {authMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 overflow-y-auto"
          style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}>
          <div className="w-full max-w-sm rounded-2xl p-6 border"
            style={{ background: "#141414", borderColor: "rgba(255,255,255,0.1)" }}>
            <div className="flex items-center justify-between mb-5">
              <p style={{ fontSize: 17, fontWeight: 600, color: "#e8e0d0" }}>
                {authMode === "signup" ? "🎉 가입하고 결과 보기" : "🔑 로그인하고 결과 보기"}
              </p>
              <button onClick={() => setAuthMode(null)} style={{ background: "none", border: "none", color: "#c8bfb0", fontSize: 20, cursor: "pointer" }}>✕</button>
            </div>
            <div className="flex gap-2 mb-5 p-1 rounded-xl" style={{ background: "#1c1c1c" }}>
              {(["login", "signup"] as const).map((t) => (
                <button key={t} onClick={() => setAuthMode(t)} className="pico-btn flex-1 py-2 rounded-lg"
                  style={{ background: authMode === t ? "#FACA3E" : "transparent", color: authMode === t ? "#0d0d0d" : "#c8bfb0", fontSize: 14, fontWeight: 600, border: "none" }}>
                  {t === "login" ? "로그인" : "회원가입"}
                </button>
              ))}
            </div>
            <input value={authEmail} onChange={(e) => setAuthEmail(e.target.value)}
              placeholder="이메일" type="email"
              className="w-full rounded-xl px-4 py-3 outline-none mb-3"
              style={{ background: "#1c1c1c", border: "0.5px solid rgba(255,255,255,0.1)", color: "#e8e0d0", fontSize: 14 }} />
            <input value={authPw} onChange={(e) => setAuthPw(e.target.value)}
              placeholder="비밀번호" type="password"
              onKeyDown={(e) => e.key === "Enter" && handleAuth()}
              className="w-full rounded-xl px-4 py-3 outline-none mb-3"
              style={{ background: "#1c1c1c", border: "0.5px solid rgba(255,255,255,0.1)", color: "#e8e0d0", fontSize: 14 }} />
            {authError && <p style={{ fontSize: 14, color: "#f07878", marginBottom: 8 }}>{authError}</p>}
            <button onClick={handleAuth} disabled={authLoading} className="pico-btn w-full py-3 rounded-xl"
              style={{ background: "#FACA3E", color: "#0d0d0d", fontSize: 14, fontWeight: 600, border: "none" }}>
              {authLoading ? "처리 중..." : authMode === "signup" ? "가입 후 결과 보기" : "로그인 후 결과 보기"}
            </button>
          </div>
        </div>
      )}

      <div className="page-container mx-auto px-5 pt-6 pb-16" style={{ maxWidth: 560 }}>

        {/* ── 시작 화면 ── */}
        {step === 0 && !analyzing && (
          <div className="fade-up">

            {/* 헤더 */}
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ fontSize: 64, marginBottom: 14 }}>🧬</div>
              <div style={{
                display: "inline-flex", alignItems: "center",
                fontFamily: "var(--font-mona12)", fontSize: 11, fontWeight: 700,
                letterSpacing: "0.16em", color: "#FACA3E",
                textTransform: "uppercase",
                background: "rgba(250,202,62,0.08)",
                border: "0.5px solid rgba(250,202,62,0.25)",
                borderRadius: 99, padding: "5px 16px",
                marginBottom: 20,
              }}>
                PICO — 투자 DNA 테스트 v2.0
              </div>
              <h1 style={{
                fontFamily: "var(--font-paperlogy)", fontWeight: 800,
                fontSize: "clamp(36px, 9vw, 48px)", color: "#e8e0d0",
                lineHeight: 1.1, marginBottom: 16,
              }}>
                나는 어떤<br />투자자일까?
              </h1>
              <p style={{ fontSize: "clamp(14px, 3vw, 16px)", color: "#c8bfb0", lineHeight: 1.8, maxWidth: 320, margin: "0 auto" }}>
                <Mark>18문항</Mark> · <Mark>약 3분</Mark>.<br />
                4가지 독립 축으로 분석하는<br />더 정확한 투자 성향 분석.
              </p>
            </div>

            {/* 행동경제학 기반 설명 카드 */}
            <div style={{
              background: "#141414",
              border: "0.5px solid rgba(255,255,255,0.08)",
              borderRadius: 18, padding: "18px 20px", marginBottom: 20,
            }}>
              <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                  background: "rgba(250,202,62,0.1)", border: "0.5px solid rgba(250,202,62,0.2)",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
                }}>
                  🧠
                </div>
                <div>
                  <p style={{
                    fontFamily: "var(--font-mona12)", fontSize: 11, fontWeight: 700,
                    color: "#FACA3E", letterSpacing: "0.12em", textTransform: "uppercase",
                    marginBottom: 8,
                  }}>
                    과학적 설계
                  </p>
                  <p style={{ fontSize: 14, color: "#c8bfb0", lineHeight: 1.8, margin: 0 }}>
                    단순한 심리 설문이 아니에요.{" "}
                    <Mark>행동경제학(Behavioral Economics)</Mark>과{" "}
                    <Mark>투자심리학</Mark>의 핵심 이론을 체계적으로 반영한{" "}
                    전문적인 설계예요.
                  </p>
                </div>
              </div>
            </div>

            {/* 4축 측정 항목 */}
            <p style={{
              fontFamily: "var(--font-mona12)", fontSize: 11, fontWeight: 700,
              color: "#c8bfb0", letterSpacing: "0.14em", textTransform: "uppercase",
              marginBottom: 12,
            }}>
              🔬 측정 항목
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
              {axisDetails.map(({ key, color, icon, label, desc }) => (
                <div key={key} style={{
                  background: "#141414",
                  border: `0.5px solid ${color}25`,
                  borderRadius: 16, padding: "16px 18px",
                  display: "flex", gap: 14, alignItems: "flex-start",
                }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                    background: `${color}12`, border: `0.5px solid ${color}35`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "var(--font-mona12)", fontSize: 16, fontWeight: 700,
                    color: color,
                  }}>
                    {key}
                  </div>
                  <div>
                    <p style={{
                      fontFamily: "var(--font-paperlogy)", fontWeight: 700,
                      fontSize: 16, color: "#e8e0d0", marginBottom: 5,
                    }}>
                      {icon} {label}
                    </p>
                    <p style={{ fontSize: 14, color: "#c8bfb0", lineHeight: 1.7, margin: 0 }}>
                      {desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* 8가지 유형 프리뷰 */}
            <div style={{
              background: "#141414",
              border: "0.5px solid rgba(255,255,255,0.06)",
              borderRadius: 16, padding: "16px 18px", marginBottom: 24,
            }}>
              <p style={{
                fontFamily: "var(--font-mona12)", fontSize: 11, fontWeight: 700,
                color: "#c8bfb0", letterSpacing: "0.12em", textTransform: "uppercase",
                marginBottom: 12,
              }}>
                🎯 8가지 투자자 유형 중 나는?
              </p>
              <div style={{ display: "flex", justifyContent: "space-around", alignItems: "center" }}>
                {(["🐯","🐺","🦅","🦊","🦋","🦔","🐘","🐢"] as const).map((emoji, i) => (
                  <span key={i} style={{ fontSize: 26 }}>{emoji}</span>
                ))}
              </div>
            </div>

            {/* 기존 결과 있을 때 */}
            {existingType && (
              <div className="rounded-2xl p-4 border mb-5" style={{ background: "#141414", borderColor: "rgba(250,202,62,0.2)" }}>
                <p style={{ fontSize: 14, color: "#c8bfb0", marginBottom: 8 }}>저장된 결과가 있어요.</p>
                <div className="flex items-center justify-between">
                  <span style={{ fontSize: 16, fontWeight: 600, color: "#e8e0d0" }}>
                    {INVESTOR_TYPES[existingType].emoji} {INVESTOR_TYPES[existingType].modifier} {INVESTOR_TYPES[existingType].name}
                  </span>
                  <button onClick={() => { setResult(existingType); setStep(19); setShowFull(!!user); }}
                    className="pico-btn px-3 py-1.5 rounded-lg"
                    style={{ fontSize: 14, color: "#FACA3E", border: "0.5px solid rgba(250,202,62,0.3)", background: "transparent" }}>
                    결과 보기
                  </button>
                </div>
              </div>
            )}

            {/* 시작 버튼 */}
            <button
              onClick={() => { reset(); setStep(1); }}
              className="pico-btn w-full rounded-2xl py-4 mb-4"
              style={{ background: "#FACA3E", color: "#0d0d0d", fontSize: 16, fontWeight: 700, border: "none", fontFamily: "var(--font-paperlogy)" }}
            >
              {existingType ? "다시 하기" : "시작하기"}
            </button>
            <div style={{ textAlign: "center" }}>
              <button onClick={shareQuiz} className="pico-btn" style={{ background: "none", border: "none", fontSize: 14, color: "#c8bfb0" }}>
                🔗 테스트 링크 공유하기
              </button>
            </div>
          </div>
        )}

        {/* ── 분석 중 ── */}
        {analyzing && (
          <div className="fade-up text-center pt-20">
            <div style={{ fontSize: 52, marginBottom: 16 }}>🧬</div>
            <p style={{ fontFamily: "var(--font-paperlogy)", fontSize: 20, color: "#e8e0d0", fontWeight: 700, marginBottom: 8 }}>분석 중이에요...</p>
            <p style={{ fontSize: 14, color: "#c8bfb0" }}>4가지 축을 종합하고 있어요</p>
            <div className="flex justify-center gap-2 mt-6">
              {(["R","I","T","Y"] as const).map((ax, i) => (
                <div key={ax} style={{ width: 8, height: 8, borderRadius: "50%", background: axisColors[ax], animation: `fadeUp 0.6s ${i * 0.15}s ease-in-out infinite alternate` }} />
              ))}
            </div>
          </div>
        )}

        {/* ── 문항 ── */}
        {step >= 1 && step <= TOTAL && currentQ && !analyzing && (
          <div>
            {/* 진행 바 */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <button
                  onClick={handleBack}
                  style={{ background: "none", border: "none", padding: 0, cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", opacity: 0.7 }}
                >
                  <BackIcon size={18} />
                </button>
                <div style={{ flex: 1, height: 3, borderRadius: 99, background: "#242424", overflow: "hidden" }}>
                  <div style={{
                    height: "100%", borderRadius: 99,
                    width: `${progress}%`,
                    background: currentAxisColor,
                    transition: "width 0.4s cubic-bezier(.4,0,.2,1)",
                  }} />
                </div>
              </div>
              <div className="flex items-center justify-between" style={{ paddingLeft: 28 }}>
                <span style={{ fontFamily: "var(--font-mona12)", fontSize: 12, color: "#c8bfb0" }}>{step} / {TOTAL}</span>
                <span style={{
                  fontFamily: "var(--font-mona12)", fontSize: 12, fontWeight: 700,
                  padding: "3px 10px", borderRadius: 6,
                  background: `${currentAxisColor}18`,
                  color: currentAxisColor,
                  border: `0.5px solid ${currentAxisColor}35`,
                }}>
                  {currentQ.axis} · {axisLabels[currentQ.axis]}
                </span>
              </div>
            </div>

            <div className={animating ? "slide-out" : "slide-in"}>
              {/* 시나리오 */}
              {currentQ.scenario && (
                <div style={{
                  background: "rgba(255,255,255,0.03)",
                  border: `0.5px solid ${currentAxisColor}30`,
                  borderRadius: 14, padding: "14px 16px", marginBottom: 16,
                  display: "flex", gap: 10, alignItems: "flex-start",
                }}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>📌</span>
                  <p style={{ fontSize: 14, color: "#c8bfb0", lineHeight: 1.7, margin: 0 }}>
                    {currentQ.scenario}
                  </p>
                </div>
              )}

              {/* 질문 텍스트 */}
              <p style={{
                fontFamily: "var(--font-paperlogy)", fontWeight: 700,
                fontSize: "clamp(20px, 4.5vw, 26px)", color: "#e8e0d0",
                lineHeight: 1.4, marginBottom: 24,
              }}>
                {currentQ.text}
              </p>

              {/* 선택지 카드 */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {currentQ.options.map((opt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleAnswer(opt.score)}
                    className="pico-btn"
                    style={{
                      background: "#141414",
                      border: "0.5px solid rgba(255,255,255,0.08)",
                      borderRadius: 18, padding: "16px 16px",
                      textAlign: "left", cursor: "pointer",
                      transition: "transform 0.15s, border-color 0.15s, background 0.15s, box-shadow 0.15s",
                      display: "flex", alignItems: "flex-start", gap: 14,
                      width: "100%",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.borderColor = `${currentAxisColor}55`;
                      e.currentTarget.style.background = `${currentAxisColor}08`;
                      e.currentTarget.style.boxShadow = `0 6px 20px rgba(0,0,0,0.35)`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "none";
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                      e.currentTarget.style.background = "#141414";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    {/* 알파벳 뱃지 */}
                    <div style={{
                      width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                      background: `${currentAxisColor}15`,
                      border: `0.5px solid ${currentAxisColor}35`,
                      color: currentAxisColor,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontFamily: "var(--font-mona12)", fontSize: 14, fontWeight: 700,
                    }}>
                      {String.fromCharCode(65 + idx)}
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontFamily: "var(--font-paperlogy)", fontWeight: 600,
                        fontSize: "clamp(14px, 3.5vw, 17px)", color: "#e8e0d0",
                        lineHeight: 1.5, marginBottom: opt.sub ? 6 : 0,
                      }}>
                        {opt.text}
                      </div>
                      {opt.sub && (
                        <div style={{ fontSize: 14, color: "#c8bfb0", lineHeight: 1.5, display: "flex", alignItems: "center", gap: 5 }}>
                          <span style={{ fontFamily: "var(--font-mona12)", color: currentAxisColor, fontSize: 12 }}>—</span>
                          {opt.sub}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── 결과 ── */}
        {step === 19 && typeData && !analyzing && (
          <div className="fade-up pt-4">
            {quizBonus > 0 && (
              <div className="inline-block mb-4 rounded-xl px-4 py-2" style={{ background: "rgba(250,202,62,0.1)", border: "0.5px solid rgba(250,202,62,0.3)" }}>
                <span style={{ fontSize: 14, color: "#FACA3E", fontWeight: 600 }}>🎉 첫 퀴즈 완료! +{quizBonus}P 지급</span>
              </div>
            )}

            {/* Block 1 — 유형 카드 */}
            <div className="rounded-2xl p-6 border mb-4 text-center" style={{ background: "#141414", borderColor: `${typeData.color}35` }}>
              <div style={{ fontSize: "clamp(52px, 12vw, 72px)", marginBottom: 12 }}>{typeData.emoji}</div>
              <div style={{ fontFamily: "var(--font-mona12)", fontSize: 12, letterSpacing: "0.1em", color: typeData.color, textTransform: "uppercase", marginBottom: 6, fontWeight: 700 }}>
                {typeData.modifier}
              </div>
              <div style={{ fontFamily: "var(--font-paperlogy)", fontWeight: 800, fontSize: "clamp(28px, 7vw, 42px)", color: typeData.color, marginBottom: 8 }}>
                {typeData.name}
              </div>
              <p style={{ fontSize: "clamp(14px, 3.2vw, 17px)", color: "#c8bfb0", lineHeight: 1.75, maxWidth: 340, margin: "0 auto 20px" }}>
                {typeData.tagline}
              </p>
              {normScores && (
                <div className="text-left flex flex-col gap-3 mt-2">
                  {(["R","I","T","Y"] as const).map((ax) => (
                    <div key={ax}>
                      <div className="flex justify-between mb-1">
                        <span style={{ fontFamily: "var(--font-mona12)", fontSize: 12, color: axisColors[ax] }}>{ax} · {axisLabels[ax]}</span>
                        <span style={{ fontFamily: "var(--font-mona12)", fontSize: 12, fontWeight: 700, color: axisColors[ax] }}>{normScores[ax]}</span>
                      </div>
                      <div style={{ height: 5, borderRadius: 3, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${normScores[ax]}%`, background: axisColors[ax], borderRadius: 3, transition: "width 0.8s cubic-bezier(.4,0,.2,1)" }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 비로그인 게이트 */}
            {!showFull && !user && (
              <>
                <div className="relative rounded-2xl overflow-hidden mb-4" style={{ border: "0.5px solid rgba(255,255,255,0.08)" }}>
                  <div style={{ filter: "blur(6px)", pointerEvents: "none", userSelect: "none", padding: "20px", background: "#141414" }}>
                    <p style={{ fontSize: 14, color: "#c8bfb0", marginBottom: 8 }}>투자 성향 분석</p>
                    <p style={{ fontSize: 14, color: "#c8bfb0", lineHeight: 1.7 }}>{typeData.desc}</p>
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      {typeData.allocation.map((a) => (
                        <div key={a.label} style={{ background: "#1c1c1c", borderRadius: 10, padding: "10px 12px" }}>
                          <div style={{ fontSize: 16, fontWeight: 600, color: typeData.color }}>{a.pct}</div>
                          <div style={{ fontSize: 14, color: "#c8bfb0" }}>{a.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="absolute inset-0 flex flex-col items-center justify-end pb-6"
                    style={{ background: "linear-gradient(to bottom, rgba(13,13,13,0.1) 0%, rgba(13,13,13,0.96) 55%)" }}>
                    <div style={{ textAlign: "center", padding: "0 20px" }}>
                      <div style={{ fontSize: 22, marginBottom: 8 }}>🔒</div>
                      <p style={{ fontFamily: "var(--font-paperlogy)", fontSize: "clamp(15px, 3.5vw, 18px)", fontWeight: 700, color: "#e8e0d0", marginBottom: 6 }}>상세 분석 리포트 잠김</p>
                      <p style={{ fontSize: 14, color: "#c8bfb0" }}>자산 배분 · 추천 ETF · 투자 경고까지 무료로 확인해보세요.</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2 mb-6">
                  <button onClick={() => setAuthMode("signup")} className="pico-btn w-full py-4 rounded-xl"
                    style={{ background: "#FACA3E", color: "#0d0d0d", fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 700, border: "none", fontFamily: "var(--font-paperlogy)" }}>
                    🎉 회원가입하고 결과 보기
                  </button>
                  <button onClick={() => setAuthMode("login")} className="pico-btn w-full py-3 rounded-xl"
                    style={{ background: "transparent", color: "#c8bfb0", fontSize: 14, border: "0.5px solid rgba(255,255,255,0.1)" }}>
                    이미 계정이 있어요 — 로그인
                  </button>
                </div>
              </>
            )}

            {/* 풀 리포트 */}
            {(showFull || user) && (
              <>
                <div className="rounded-2xl p-5 border mb-4" style={{ background: "#141414", borderColor: "rgba(255,255,255,0.08)" }}>
                  <p style={{ fontFamily: "var(--font-mona12)", fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: "#c8bfb0", textTransform: "uppercase", marginBottom: 10 }}>투자 성향</p>
                  <p style={{ fontSize: 14, color: "#c8bfb0", lineHeight: 1.8 }}>{typeData.desc}</p>
                </div>

                <div className="rounded-2xl p-5 border mb-4" style={{ background: "#141414", borderColor: "rgba(255,255,255,0.08)" }}>
                  <p style={{ fontFamily: "var(--font-mona12)", fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: "#c8bfb0", textTransform: "uppercase", marginBottom: 12 }}>적정 자산 배분</p>
                  <div className="flex flex-col gap-3">
                    {typeData.allocation.map((a) => (
                      <div key={a.label} className="flex justify-between pb-3 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                        <span style={{ fontSize: 16, fontWeight: 600, color: "#e8e0d0" }}>{a.label}</span>
                        <span style={{ fontFamily: "var(--font-mona12)", fontSize: 16, fontWeight: 700, color: typeData.color }}>{a.pct}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-3 mb-4">
                  {typeData.guards.map((g) => (
                    <div key={g.title} className="rounded-2xl p-5 border" style={{ background: "rgba(240,120,120,0.05)", borderColor: "rgba(240,120,120,0.22)" }}>
                      <p style={{ fontFamily: "var(--font-paperlogy)", fontSize: 16, fontWeight: 700, color: "#f07878", marginBottom: 6 }}>
                        🚨 위험 신호 — {g.title}
                      </p>
                      <p style={{ fontSize: 14, color: "#c8bfb0", lineHeight: 1.7 }}>{g.desc}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl p-5 border mb-4" style={{ background: "#141414", borderColor: "rgba(255,255,255,0.08)" }}>
                  <p style={{ fontFamily: "var(--font-mona12)", fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: "#c8bfb0", textTransform: "uppercase", marginBottom: 12 }}>추천 종목 스타일</p>
                  <div className="flex flex-col gap-3">
                    {typeData.recommended.map((r) => (
                      <div key={r.label} className="flex gap-3 pb-3 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                        <span style={{ fontFamily: "var(--font-mona12)", fontSize: 14, color: typeData.color, fontWeight: 700, minWidth: 40, flexShrink: 0, paddingTop: 2, letterSpacing: "0.06em" }}>{r.label}</span>
                        <span style={{ fontSize: 14, color: "#c8bfb0", lineHeight: 1.6 }}>{r.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div className="flex flex-col gap-2">
              <button onClick={shareQuiz} className="pico-btn w-full py-4 rounded-xl"
                style={{ background: "#FACA3E", color: "#0d0d0d", fontSize: 16, fontWeight: 700, border: "none", fontFamily: "var(--font-paperlogy)" }}>
                🔗 링크 공유하기
              </button>
              <button onClick={reset} className="pico-btn w-full py-3 rounded-xl"
                style={{ background: "transparent", color: "#c8bfb0", fontSize: 14, border: "0.5px solid rgba(255,255,255,0.1)" }}>
                다시 하기
              </button>
            </div>

            <div className="mt-6 rounded-2xl p-5 border" style={{ background: "#141414", borderColor: "rgba(250,202,62,0.12)" }}>
              <p style={{ fontSize: 14, color: "#c8bfb0", marginBottom: 10 }}>이제 오늘의 VS 배틀도 해보세요!</p>
              <Link href="/" style={{ display: "inline-block", fontSize: 14, color: "#FACA3E", fontWeight: 600, textDecoration: "none", border: "0.5px solid rgba(250,202,62,0.25)", borderRadius: 10, padding: "8px 16px" }}>
                ⚔️ VS 배틀 참여하기
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
    </AuthGuard>
  );
}
