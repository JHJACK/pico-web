"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/app/lib/authContext";
import { supabase, saveQuizResult } from "@/app/lib/supabase";
import {
  QUESTIONS, INVESTOR_TYPES, calcInvestorType,
  type TypeKey, type AxisScores,
} from "@/app/lib/quizTypes";

const TOTAL = QUESTIONS.length; // 18
const SHARE_URL = "https://pico-web-one.vercel.app/quiz";
const SS_KEY    = "pico_quiz_scores"; // sessionStorage — scores in progress

export default function QuizPage() {
  const { user, refreshUserRow } = useAuth();

  const [step,      setStep]     = useState(0);
  const [scores,    setScores]   = useState<AxisScores>({ R: 0, I: 0, T: 0, Y: 0 });
  const [animating, setAnimating] = useState(false);
  const [result,    setResult]   = useState<TypeKey | null>(null);
  const [resultScores, setResultScores] = useState<AxisScores | null>(null);
  const [showFull,  setShowFull] = useState(false);
  const [quizBonus, setQuizBonus] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [toast,     setToast]    = useState("");

  // 인라인 로그인
  const [authMode,    setAuthMode]    = useState<"login" | "signup" | null>(null);
  const [authEmail,   setAuthEmail]   = useState("");
  const [authPw,      setAuthPw]      = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError,   setAuthError]   = useState("");

  const pendingType = useRef<TypeKey | null>(null);

  // sessionStorage에서 진행 중인 점수 복원
  useEffect(() => {
    const raw = sessionStorage.getItem(SS_KEY);
    if (raw) {
      try {
        const saved = JSON.parse(raw) as { scores: AxisScores; step: number };
        if (saved.step > 0 && saved.step <= TOTAL) {
          setScores(saved.scores);
          setStep(saved.step);
        }
      } catch { /* ignore */ }
    }
  }, []);

  // 로그인 감지 → pending 결과 저장
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

  // 이미 완료한 유형 확인 (로그인 사용자만)
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
    setAnimating(true);
    setTimeout(() => {
      setScores(newScores);
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
        sessionStorage.setItem(SS_KEY, JSON.stringify({ scores: newScores, step: nextStep }));
      }
      setAnimating(false);
    }, 200);
  }

  async function handleAuth() {
    if (!authEmail || !authPw) { setAuthError("이메일과 비밀번호를 입력해줘"); return; }
    setAuthLoading(true); setAuthError("");
    if (authMode === "signup") {
      const { error } = await supabase.auth.signUp({ email: authEmail, password: authPw });
      if (error) { setAuthError(error.message); setAuthLoading(false); return; }
      await supabase.auth.signInWithPassword({ email: authEmail, password: authPw });
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPw });
      if (error) { setAuthError("이메일 또는 비밀번호가 틀렸어"); setAuthLoading(false); return; }
    }
    setAuthLoading(false);
    setAuthMode(null);
    setShowFull(true);
  }

  function reset() {
    setStep(0); setScores({ R: 0, I: 0, T: 0, Y: 0 });
    setResult(null); setResultScores(null); setShowFull(false);
    setAnimating(false); setQuizBonus(0); setAuthMode(null);
    sessionStorage.removeItem(SS_KEY);
  }

  function shareQuiz() {
    const typeData = result ? INVESTOR_TYPES[result] : null;
    const text = typeData
      ? `나는 ${typeData.modifier} ${typeData.emoji}${typeData.name}!\n\n당신의 투자 DNA는? PICO에서 확인해봐 →\n${SHARE_URL}`
      : `투자 DNA 테스트 — PICO에서 내 유형을 찾아봐 →\n${SHARE_URL}`;
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({ title: "PICO 투자 DNA 테스트", text, url: SHARE_URL }).catch(() => {});
    } else {
      navigator.clipboard.writeText(SHARE_URL).then(() => {
        showToast("링크 복사됐어요! 친구에게 보내봐 🎉");
      });
    }
  }

  const typeData   = result ? INVESTOR_TYPES[result] : null;
  const axisColors: Record<string, string> = { R: "#f07878", I: "#7eb8f7", T: "#7ed4a0", Y: "#FACA3E" };
  const axisLabels: Record<string, string> = { R: "변동성 회복력", I: "정보 필터링", T: "운용 호흡", Y: "수익 편향" };
  const axisMax:    Record<string, number> = { R: 165, I: 132, T: 165, Y: 132 };

  // 정규화 점수 0~100
  const normScores = resultScores ? {
    R: Math.round((resultScores.R / axisMax.R) * 100),
    I: Math.round((resultScores.I / axisMax.I) * 100),
    T: Math.round((resultScores.T / axisMax.T) * 100),
    Y: Math.round((resultScores.Y / axisMax.Y) * 100),
  } : null;

  return (
    <main className="min-h-screen" style={{ background: "#0d0d0d" }}>

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
        <Link href="/" style={{ color: "#5c5448", fontSize: 13, textDecoration: "none" }}>{"<"} 홈</Link>
        <span style={{ fontFamily: "var(--font-serif)", fontSize: 16, color: "#FACA3E", marginLeft: 16 }}>PICO</span>
        {step >= 1 && step <= TOTAL && (
          <span style={{ fontFamily: "var(--font-inter)", fontSize: 11, color: "#5c5448", marginLeft: "auto" }}>{step} / {TOTAL}</span>
        )}
      </nav>

      {/* 인라인 로그인 모달 */}
      {authMode && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}>
          <div className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl p-6 border"
            style={{ background: "#141414", borderColor: "rgba(255,255,255,0.1)" }}>
            <div className="flex items-center justify-between mb-5">
              <p style={{ fontSize: 17, fontWeight: 500, color: "#e8e0d0" }}>
                {authMode === "signup" ? "🎉 가입하고 결과 보기" : "🔑 로그인하고 결과 보기"}
              </p>
              <button onClick={() => setAuthMode(null)} style={{ background: "none", border: "none", color: "#5c5448", fontSize: 20, cursor: "pointer" }}>✕</button>
            </div>
            <div className="flex gap-2 mb-5 p-1 rounded-xl" style={{ background: "#1c1c1c" }}>
              {(["login", "signup"] as const).map((t) => (
                <button key={t} onClick={() => setAuthMode(t)} className="pico-btn flex-1 py-2 rounded-lg"
                  style={{ background: authMode === t ? "#FACA3E" : "transparent", color: authMode === t ? "#0d0d0d" : "#5c5448", fontSize: 13, fontWeight: 500, border: "none" }}>
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
            {authError && <p style={{ fontSize: 12, color: "#f07878", marginBottom: 8 }}>{authError}</p>}
            <button onClick={handleAuth} disabled={authLoading} className="pico-btn w-full py-3 rounded-xl"
              style={{ background: "#FACA3E", color: "#0d0d0d", fontSize: 14, fontWeight: 500, border: "none" }}>
              {authLoading ? "처리 중..." : authMode === "signup" ? "가입 후 결과 보기" : "로그인 후 결과 보기"}
            </button>
          </div>
        </div>
      )}

      <div className="page-container mx-auto px-5 pt-6 pb-16" style={{ maxWidth: 560 }}>

        {/* ── 시작 화면 ── */}
        {step === 0 && !analyzing && (
          <div className="fade-up text-center pt-6">
            <div style={{ fontSize: 56, marginBottom: 16 }}>🧬</div>
            <div style={{ fontSize: 10, letterSpacing: "0.16em", color: "#FACA3E", fontWeight: 500, textTransform: "uppercase", marginBottom: 12 }}>
              PICO — 투자 DNA 테스트 v2.0
            </div>
            <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(24px, 6vw, 34px)", color: "#e8e0d0", lineHeight: 1.15, marginBottom: 12 }}>
              나는 어떤 투자자일까?
            </h1>
            <p style={{ fontSize: "clamp(13px, 3vw, 15px)", color: "#a09688", lineHeight: 1.8, maxWidth: 320, margin: "0 auto 16px" }}>
              18문항, 약 3분. 4가지 독립 축으로 측정하는 더 정확한 투자 성향 분석.
            </p>

            {/* 4축 배지 */}
            <div className="flex flex-wrap justify-center gap-2 mb-6">
              {(["R","I","T","Y"] as const).map((ax) => (
                <span key={ax} style={{ fontSize: 12, fontFamily: "var(--font-inter)", padding: "4px 12px", borderRadius: 6, border: `0.5px solid ${axisColors[ax]}40`, color: axisColors[ax], background: `${axisColors[ax]}12` }}>
                  {ax} · {axisLabels[ax]}
                </span>
              ))}
            </div>

            {existingType && (
              <div className="rounded-2xl p-4 border mb-5 text-left" style={{ background: "#141414", borderColor: "rgba(250,202,62,0.2)" }}>
                <p style={{ fontSize: 12, color: "#5c5448", marginBottom: 6 }}>저장된 결과가 있어</p>
                <div className="flex items-center justify-between">
                  <span style={{ fontSize: 15, fontWeight: 500, color: "#e8e0d0" }}>
                    {INVESTOR_TYPES[existingType].emoji} {INVESTOR_TYPES[existingType].modifier} {INVESTOR_TYPES[existingType].name}
                  </span>
                  <button onClick={() => { setResult(existingType); setStep(19); setShowFull(!!user); }}
                    className="pico-btn px-3 py-1.5 rounded-lg"
                    style={{ fontSize: 12, color: "#FACA3E", border: "0.5px solid rgba(250,202,62,0.3)", background: "transparent" }}>
                    결과 보기
                  </button>
                </div>
              </div>
            )}

            <button onClick={() => { reset(); setStep(1); }} className="pico-btn rounded-xl px-8 py-3.5 mb-4"
              style={{ background: "#FACA3E", color: "#0d0d0d", fontSize: 15, fontWeight: 600, border: "none" }}>
              {existingType ? "다시 하기" : "시작하기 →"}
            </button>
            <div>
              <button onClick={shareQuiz} className="pico-btn" style={{ background: "none", border: "none", fontSize: 13, color: "#5c5448" }}>
                🔗 테스트 링크 공유하기
              </button>
            </div>
          </div>
        )}

        {/* ── 분석 중 ── */}
        {analyzing && (
          <div className="fade-up text-center pt-20">
            <div style={{ fontSize: 52, marginBottom: 16 }}>🧬</div>
            <p style={{ fontSize: 18, color: "#e8e0d0", fontWeight: 600, marginBottom: 8 }}>분석 중...</p>
            <p style={{ fontSize: 14, color: "#5c5448" }}>4가지 축을 종합하고 있어</p>
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
              <div className="rounded-full overflow-hidden" style={{ height: 2, background: "#242424", marginBottom: 8 }}>
                <div className="h-full rounded-full" style={{ width: `${progress}%`, background: "#FACA3E", transition: "width 0.4s cubic-bezier(.4,0,.2,1)" }} />
              </div>
              <div className="flex items-center justify-between">
                <span style={{ fontFamily: "var(--font-inter)", fontSize: 11, color: "#5c5448" }}>{step} / {TOTAL}</span>
                <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: `${axisColors[currentQ.axis]}15`, color: axisColors[currentQ.axis], fontFamily: "var(--font-inter)" }}>
                  {currentQ.axis} · {axisLabels[currentQ.axis]}
                </span>
              </div>
            </div>

            <div className={animating ? "slide-out" : "slide-in"}>
              {currentQ.scenario && (
                <div className="rounded-xl px-4 py-3.5 mb-5 border-l-2" style={{ background: "rgba(255,255,255,0.03)", borderLeftColor: axisColors[currentQ.axis] }}>
                  <p style={{ fontSize: "clamp(13px, 3vw, 15px)", color: "#a09688", lineHeight: 1.7, fontStyle: "italic" }}>
                    {currentQ.scenario}
                  </p>
                </div>
              )}
              <p style={{ fontSize: "clamp(18px, 4vw, 22px)", color: "#e8e0d0", fontWeight: 600, lineHeight: 1.5, marginBottom: 24 }}>
                {currentQ.text}
              </p>
              <div className="flex flex-col gap-3">
                {currentQ.options.map((opt, idx) => (
                  <button key={idx} onClick={() => handleAnswer(opt.score)}
                    className="flex items-start gap-3 rounded-2xl p-4 border text-left pico-btn"
                    style={{ background: "#1c1c1c", borderColor: "rgba(255,255,255,0.06)" }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${axisColors[currentQ.axis]}50`; e.currentTarget.style.background = `${axisColors[currentQ.axis]}06`; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; e.currentTarget.style.background = "#1c1c1c"; }}>
                    <div style={{ width: 28, height: 28, borderRadius: 6, background: "#242424", border: "0.5px solid rgba(255,255,255,0.1)", color: "#a09688", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontFamily: "var(--font-inter)", fontWeight: 500, marginTop: 1 }}>
                      {String.fromCharCode(65 + idx)}
                    </div>
                    <div>
                      <div style={{ fontSize: "clamp(14px, 3.5vw, 17px)", color: "#e8e0d0", fontWeight: 500, lineHeight: 1.5 }}>{opt.text}</div>
                      {opt.sub && <div style={{ fontSize: "clamp(11px, 2.5vw, 13px)", color: "#5c5448", marginTop: 4 }}>{opt.sub}</div>}
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
                <span style={{ fontSize: 13, color: "#FACA3E", fontWeight: 500 }}>🎉 첫 퀴즈 완료! +{quizBonus}P 지급</span>
              </div>
            )}

            {/* Block 1 — 유형 카드 */}
            <div className="rounded-2xl p-6 border mb-4 text-center" style={{ background: "#141414", borderColor: `${typeData.color}35` }}>
              <div style={{ fontSize: "clamp(52px, 12vw, 72px)", marginBottom: 12 }}>{typeData.emoji}</div>
              <div style={{ fontSize: "clamp(14px, 3vw, 18px)", letterSpacing: "0.1em", color: typeData.color, textTransform: "uppercase", marginBottom: 6, fontWeight: 700 }}>
                {typeData.modifier}
              </div>
              <div style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(28px, 7vw, 42px)", color: typeData.color, marginBottom: 8 }}>
                {typeData.name}
              </div>
              <p style={{ fontSize: "clamp(14px, 3.2vw, 17px)", color: "#a09688", lineHeight: 1.75, maxWidth: 340, margin: "0 auto 20px" }}>
                {typeData.tagline}
              </p>
              {/* 4축 점수 바 */}
              {normScores && (
                <div className="text-left flex flex-col gap-3 mt-2">
                  {(["R","I","T","Y"] as const).map((ax) => (
                    <div key={ax}>
                      <div className="flex justify-between mb-1">
                        <span style={{ fontFamily: "var(--font-inter)", fontSize: 12, color: axisColors[ax] }}>{ax} · {axisLabels[ax]}</span>
                        <span style={{ fontFamily: "var(--font-inter)", fontSize: 12, fontWeight: 600, color: axisColors[ax] }}>{normScores[ax]}</span>
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
                    <p style={{ fontSize: 12, color: "#5c5448", marginBottom: 8 }}>투자 성향 분석</p>
                    <p style={{ fontSize: 14, color: "#c8c0b0", lineHeight: 1.7 }}>{typeData.desc}</p>
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      {typeData.allocation.map((a) => (
                        <div key={a.label} style={{ background: "#1c1c1c", borderRadius: 10, padding: "10px 12px" }}>
                          <div style={{ fontSize: 16, fontWeight: 500, color: typeData.color }}>{a.pct}</div>
                          <div style={{ fontSize: 11, color: "#5c5448" }}>{a.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="absolute inset-0 flex flex-col items-center justify-end pb-6"
                    style={{ background: "linear-gradient(to bottom, rgba(13,13,13,0.1) 0%, rgba(13,13,13,0.96) 55%)" }}>
                    <div style={{ textAlign: "center", padding: "0 20px" }}>
                      <div style={{ fontSize: 22, marginBottom: 8 }}>🔒</div>
                      <p style={{ fontSize: "clamp(15px, 3.5vw, 18px)", fontWeight: 600, color: "#e8e0d0", marginBottom: 4 }}>상세 분석 리포트 잠김</p>
                      <p style={{ fontSize: "clamp(12px, 2.8vw, 14px)", color: "#a09688" }}>자산 배분 · 추천 ETF · 투자 경고까지 무료로 확인해봐</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2 mb-6">
                  <button onClick={() => setAuthMode("signup")} className="pico-btn w-full py-4 rounded-xl"
                    style={{ background: "#FACA3E", color: "#0d0d0d", fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 600, border: "none" }}>
                    🎉 회원가입하고 결과 보기
                  </button>
                  <button onClick={() => setAuthMode("login")} className="pico-btn w-full py-3 rounded-xl"
                    style={{ background: "transparent", color: "#a09688", fontSize: 13, border: "0.5px solid rgba(255,255,255,0.1)" }}>
                    이미 계정이 있어 — 로그인
                  </button>
                </div>
              </>
            )}

            {/* 풀 리포트 */}
            {(showFull || user) && (
              <>
                {/* Block 2 — 성향 */}
                <div className="rounded-2xl p-5 border mb-4" style={{ background: "#141414", borderColor: "rgba(255,255,255,0.08)" }}>
                  <p style={{ fontSize: 11, letterSpacing: "0.12em", color: "#5c5448", textTransform: "uppercase", marginBottom: 10 }}>투자 성향</p>
                  <p style={{ fontSize: "clamp(14px, 3vw, 16px)", color: "#c8c0b0", lineHeight: 1.8 }}>{typeData.desc}</p>
                </div>

                {/* Block 2 — 자산 배분 */}
                <div className="rounded-2xl p-5 border mb-4" style={{ background: "#141414", borderColor: "rgba(255,255,255,0.08)" }}>
                  <p style={{ fontSize: 11, letterSpacing: "0.12em", color: "#5c5448", textTransform: "uppercase", marginBottom: 12 }}>적정 자산 배분</p>
                  <div className="flex flex-col gap-3">
                    {typeData.allocation.map((a) => (
                      <div key={a.label} className="flex justify-between pb-3 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                        <span style={{ fontSize: "clamp(14px, 3vw, 16px)", fontWeight: 600, color: "#e8e0d0" }}>{a.label}</span>
                        <span style={{ fontFamily: "var(--font-inter)", fontSize: "clamp(14px, 3vw, 17px)", fontWeight: 600, color: typeData.color }}>{a.pct}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Block 3 — 위험 신호 */}
                <div className="flex flex-col gap-3 mb-4">
                  {typeData.guards.map((g) => (
                    <div key={g.title} className="rounded-2xl p-5 border" style={{ background: "rgba(240,120,120,0.05)", borderColor: "rgba(240,120,120,0.22)" }}>
                      <p style={{ fontSize: "clamp(13px, 3vw, 16px)", fontWeight: 700, color: "#f07878", marginBottom: 6 }}>
                        🚨 위험 신호 — {g.title}
                      </p>
                      <p style={{ fontSize: "clamp(12px, 2.8vw, 14px)", color: "#c8c0b0", lineHeight: 1.7 }}>{g.desc}</p>
                    </div>
                  ))}
                </div>

                {/* Block 4 — 추천 종목 스타일 */}
                <div className="rounded-2xl p-5 border mb-4" style={{ background: "#141414", borderColor: "rgba(255,255,255,0.08)" }}>
                  <p style={{ fontSize: 11, letterSpacing: "0.12em", color: "#5c5448", textTransform: "uppercase", marginBottom: 12 }}>추천 종목 스타일</p>
                  <div className="flex flex-col gap-3">
                    {typeData.recommended.map((r) => (
                      <div key={r.label} className="flex gap-3 pb-3 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                        <span style={{ fontSize: "clamp(11px, 2.5vw, 13px)", color: typeData.color, fontWeight: 700, minWidth: 40, flexShrink: 0, paddingTop: 2, letterSpacing: "0.06em" }}>{r.label}</span>
                        <span style={{ fontSize: "clamp(13px, 3vw, 15px)", color: "#c8c0b0", lineHeight: 1.6 }}>{r.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </>
            )}

            {/* 버튼 */}
            <div className="flex flex-col gap-2">
              <button onClick={shareQuiz} className="pico-btn w-full py-4 rounded-xl"
                style={{ background: "#FACA3E", color: "#0d0d0d", fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 600, border: "none" }}>
                🔗 링크 공유하기 (카카오톡)
              </button>
              <button onClick={reset} className="pico-btn w-full py-3 rounded-xl"
                style={{ background: "transparent", color: "#a09688", fontSize: 13, border: "0.5px solid rgba(255,255,255,0.1)" }}>
                다시 하기
              </button>
            </div>

            <div className="mt-6 rounded-2xl p-5 border" style={{ background: "#141414", borderColor: "rgba(250,202,62,0.12)" }}>
              <p style={{ fontSize: 13, color: "#a09688", marginBottom: 10 }}>이제 오늘의 VS 배틀도 해볼래?</p>
              <Link href="/" style={{ display: "inline-block", fontSize: 13, color: "#FACA3E", fontWeight: 500, textDecoration: "none", border: "0.5px solid rgba(250,202,62,0.25)", borderRadius: 10, padding: "8px 16px" }}>
                ⚔️ VS 배틀 참여하기
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
