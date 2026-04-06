"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/app/lib/authContext";
import { supabase, saveQuizResult } from "@/app/lib/supabase";
import {
  QUESTIONS, INVESTOR_TYPES, TYPE_KEYS, calcInvestorType,
  type TypeKey, type AxisScores,
} from "@/app/lib/quizTypes";

const TOTAL = QUESTIONS.length; // 18

export default function QuizPage() {
  const { user, refreshUserRow } = useAuth();

  const [step,      setStep]     = useState(0);   // 0=intro, 1-18=questions, 19=result
  const [scores,    setScores]   = useState<AxisScores>({ R: 0, I: 0, T: 0, Y: 0 });
  const [animating, setAnimating] = useState(false);
  const [result,    setResult]   = useState<TypeKey | null>(null);
  const [showFull,  setShowFull] = useState(false);
  const [quizBonus, setQuizBonus] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);

  // 인라인 로그인
  const [authMode,    setAuthMode]    = useState<"login" | "signup" | null>(null);
  const [authEmail,   setAuthEmail]   = useState("");
  const [authPw,      setAuthPw]      = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError,   setAuthError]   = useState("");

  const pendingType = useRef<TypeKey | null>(null);

  // 페이지 로드 시: localStorage에 pending 결과가 있고 이제 로그인됐으면 저장
  useEffect(() => {
    if (!user) return;
    const raw = localStorage.getItem("pico_quiz_pending");
    if (!raw) return;
    const { type } = JSON.parse(raw) as { type: TypeKey };
    pendingType.current = null;
    saveQuizResult(user.id, type).then(({ pointsAdded }) => {
      if (pointsAdded > 0) { setQuizBonus(pointsAdded); refreshUserRow(); }
    });
    localStorage.removeItem("pico_quiz_pending");
    localStorage.setItem("pico_quiz_done", JSON.stringify({ done: true, type }));
    setResult(type);
    setStep(19);
    setShowFull(true);
  }, [user]);

  // 이미 완료한 유형 확인 (localStorage)
  const [existingType, setExistingType] = useState<TypeKey | null>(null);
  useEffect(() => {
    const raw = localStorage.getItem("pico_quiz_done");
    if (raw) {
      const { done, type } = JSON.parse(raw);
      if (done && type) setExistingType(type as TypeKey);
    }
  }, []);

  const progress = step === 0 ? 0 : Math.min((step / TOTAL) * 100, 100);
  const currentQ = step >= 1 && step <= TOTAL ? QUESTIONS[step - 1] : null;

  function handleAnswer(score: number) {
    if (animating || !currentQ) return;
    const newScores = { ...scores, [currentQ.axis]: scores[currentQ.axis] + score };
    setAnimating(true);
    setTimeout(() => {
      setScores(newScores);
      if (step === TOTAL) {
        const typeKey = calcInvestorType(newScores);
        setResult(typeKey);
        setAnalyzing(true);
        setTimeout(() => {
          setAnalyzing(false);
          setStep(19);
          if (user) {
            saveQuizResult(user.id, typeKey).then(({ pointsAdded }) => {
              if (pointsAdded > 0) { setQuizBonus(pointsAdded); refreshUserRow(); }
            });
            localStorage.setItem("pico_quiz_done", JSON.stringify({ done: true, type: typeKey }));
            setShowFull(true);
          } else {
            pendingType.current = typeKey;
            localStorage.setItem("pico_quiz_pending", JSON.stringify({ type: typeKey }));
            setShowFull(false);
          }
        }, 1600);
      } else {
        setStep(step + 1);
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
      // 가입 후 자동 로그인 시도
      await supabase.auth.signInWithPassword({ email: authEmail, password: authPw });
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPw });
      if (error) { setAuthError("이메일 또는 비밀번호가 틀렸어"); setAuthLoading(false); return; }
    }
    setAuthLoading(false);
    // user useEffect가 pending 처리 담당
    setAuthMode(null);
    setShowFull(true);
  }

  function reset() {
    setStep(0); setScores({ R: 0, I: 0, T: 0, Y: 0 });
    setResult(null); setShowFull(false); setAnimating(false); setQuizBonus(0);
    setAuthMode(null);
  }

  function shareQuiz() {
    const url = typeof window !== "undefined" ? `${window.location.origin}/quiz` : "https://pico.app/quiz";
    const typeData = result ? INVESTOR_TYPES[result] : null;
    const text = typeData
      ? `나는 ${typeData.modifier} ${typeData.emoji}${typeData.name}!\n\n당신의 투자 DNA는? PICO에서 확인해봐 →\n${url}`
      : `투자 DNA 테스트 — PICO에서 내 유형을 찾아봐 →\n${url}`;
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({ title: "PICO 투자 DNA 테스트", text, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      alert("링크가 복사됐어! 카카오톡에 붙여넣어줘.");
    }
  }

  const typeData = result ? INVESTOR_TYPES[result] : null;
  const axisColors: Record<string, string> = { R: "#f07878", I: "#7eb8f7", T: "#7ed4a0", Y: "#FACA3E" };
  const axisLabels: Record<string, string> = { R: "변동성 회복력", I: "정보 필터링", T: "이용 호흡", Y: "수익 성향" };

  return (
    <main className="min-h-screen" style={{ background: "#0d0d0d" }}>
      {/* 네비게이션 */}
      <nav className="sticky top-0 z-50 flex items-center px-5 border-b"
        style={{ height: 50, background: "rgba(13,13,13,0.95)", backdropFilter: "blur(16px)", borderColor: "rgba(255,255,255,0.06)" }}>
        <Link href="/" style={{ color: "#5c5448", fontSize: 13, textDecoration: "none" }}>← 홈</Link>
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

      <div className="mx-auto px-5 pt-6 pb-16" style={{ maxWidth: 520 }}>

        {/* ── 시작 전 ── */}
        {step === 0 && !analyzing && (
          <div className="fade-up text-center pt-6">
            <div style={{ fontSize: 52, marginBottom: 16 }}>🧬</div>
            <div style={{ fontSize: 10, letterSpacing: "0.16em", color: "#FACA3E", fontWeight: 500, textTransform: "uppercase", marginBottom: 12 }}>
              PICO — 투자 DNA 테스트 v2.0
            </div>
            <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(24px, 6vw, 32px)", color: "#e8e0d0", lineHeight: 1.15, marginBottom: 12 }}>
              나는 어떤 투자자일까?
            </h1>
            <p style={{ fontSize: 14, color: "#a09688", lineHeight: 1.8, maxWidth: 300, margin: "0 auto 10px" }}>
              18문항, 약 3분. 4가지 독립 축으로 측정하는 더 정확한 투자 성향 분석.
            </p>

            {/* 4축 배지 */}
            <div className="flex flex-wrap justify-center gap-2 mb-6">
              {(["R","I","T","Y"] as const).map((ax) => (
                <span key={ax} style={{ fontSize: 11, fontFamily: "var(--font-inter)", padding: "3px 10px", borderRadius: 5, border: `0.5px solid ${axisColors[ax]}40`, color: axisColors[ax], background: `${axisColors[ax]}12` }}>
                  {ax} · {axisLabels[ax]}
                </span>
              ))}
            </div>

            {/* 이미 했으면 결과 보기 옵션 */}
            {existingType && (
              <div className="rounded-2xl p-4 border mb-5 text-left" style={{ background: "#141414", borderColor: "rgba(250,202,62,0.2)" }}>
                <p style={{ fontSize: 12, color: "#5c5448", marginBottom: 6 }}>저장된 결과가 있어</p>
                <div className="flex items-center justify-between">
                  <span style={{ fontSize: 15, fontWeight: 500, color: "#e8e0d0" }}>
                    {INVESTOR_TYPES[existingType].emoji} {INVESTOR_TYPES[existingType].modifier} {INVESTOR_TYPES[existingType].name}
                  </span>
                  <button onClick={() => { setResult(existingType); setStep(19); setShowFull(true); }}
                    className="pico-btn px-3 py-1.5 rounded-lg"
                    style={{ fontSize: 12, color: "#FACA3E", border: "0.5px solid rgba(250,202,62,0.3)", background: "transparent" }}>
                    결과 보기
                  </button>
                </div>
              </div>
            )}

            <button onClick={() => setStep(1)} className="pico-btn rounded-xl px-8 py-3 mb-4"
              style={{ background: "#FACA3E", color: "#0d0d0d", fontSize: 14, fontWeight: 500, border: "none" }}>
              {existingType ? "다시 하기" : "시작하기 →"}
            </button>
            <div>
              <button onClick={shareQuiz} className="pico-btn" style={{ background: "none", border: "none", fontSize: 13, color: "#5c5448" }}>
                🔗 링크 공유하기
              </button>
            </div>
          </div>
        )}

        {/* ── 분석 중 애니메이션 ── */}
        {analyzing && (
          <div className="fade-up text-center pt-20">
            <div style={{ fontSize: 48, marginBottom: 16 }}>🧬</div>
            <p style={{ fontSize: 16, color: "#e8e0d0", fontWeight: 500, marginBottom: 8 }}>분석 중...</p>
            <p style={{ fontSize: 13, color: "#5c5448" }}>4가지 축을 종합하고 있어</p>
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
            <div style={{ marginBottom: 24 }}>
              <div className="rounded-full overflow-hidden" style={{ height: 2, background: "#242424", marginBottom: 6 }}>
                <div className="h-full rounded-full" style={{ width: `${progress}%`, background: "#FACA3E", transition: "width 0.4s cubic-bezier(.4,0,.2,1)" }} />
              </div>
              <div className="flex items-center justify-between">
                <span style={{ fontFamily: "var(--font-inter)", fontSize: 10, color: "#5c5448" }}>
                  {step} / {TOTAL}
                </span>
                <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, background: `${axisColors[currentQ.axis]}15`, color: axisColors[currentQ.axis], fontFamily: "var(--font-inter)" }}>
                  {currentQ.axis} · {axisLabels[currentQ.axis]}
                </span>
              </div>
            </div>

            <div className={animating ? "slide-out" : "slide-in"}>
              {currentQ.scenario && (
                <div className="rounded-xl px-4 py-3 mb-4 border-l-2" style={{ background: "rgba(255,255,255,0.03)", borderLeftColor: axisColors[currentQ.axis] }}>
                  <p style={{ fontSize: 12, color: "#a09688", lineHeight: 1.65, fontStyle: "italic" }}>
                    {currentQ.scenario}
                  </p>
                </div>
              )}
              <p style={{ fontSize: "clamp(15px, 3.5vw, 18px)", color: "#e8e0d0", fontWeight: 500, lineHeight: 1.5, marginBottom: 20 }}>
                {currentQ.text}
              </p>
              <div className="flex flex-col gap-3">
                {currentQ.options.map((opt, idx) => (
                  <button key={idx} onClick={() => handleAnswer(opt.score)}
                    className="flex items-start gap-3 rounded-2xl p-4 border text-left pico-btn"
                    style={{ background: "#1c1c1c", borderColor: "rgba(255,255,255,0.06)" }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${axisColors[currentQ.axis]}50`; e.currentTarget.style.background = `${axisColors[currentQ.axis]}06`; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; e.currentTarget.style.background = "#1c1c1c"; }}>
                    <div style={{ width: 26, height: 26, borderRadius: 6, background: "#242424", border: "0.5px solid rgba(255,255,255,0.1)", color: "#a09688", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontFamily: "var(--font-inter)", fontWeight: 500, marginTop: 1 }}>
                      {String.fromCharCode(65 + idx)}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, color: "#e8e0d0", fontWeight: 500, lineHeight: 1.45 }}>{opt.text}</div>
                      {opt.sub && <div style={{ fontSize: 11, color: "#5c5448", marginTop: 3 }}>{opt.sub}</div>}
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

            {/* 유형 헤더 */}
            <div className="rounded-2xl p-6 border mb-4 text-center" style={{ background: "#141414", borderColor: `${typeData.color}35` }}>
              <div style={{ fontSize: 52, marginBottom: 10 }}>{typeData.emoji}</div>
              <div style={{ fontSize: 11, letterSpacing: "0.12em", color: typeData.color, textTransform: "uppercase", marginBottom: 6, fontWeight: 500 }}>
                {typeData.modifier}
              </div>
              <div style={{ fontFamily: "var(--font-serif)", fontSize: 28, color: typeData.color, marginBottom: 6 }}>
                {typeData.name}
              </div>
              <p style={{ fontSize: 14, color: "#a09688", lineHeight: 1.75, maxWidth: 300, margin: "0 auto 14px" }}>
                {typeData.tagline}
              </p>
              {/* 축 배지 */}
              <div className="flex flex-wrap justify-center gap-2">
                <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: "rgba(240,120,120,0.1)", color: "#f07878", border: "0.5px solid rgba(240,120,120,0.25)" }}>R: {typeData.axisR}</span>
                <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: "rgba(126,212,160,0.1)", color: "#7ed4a0", border: "0.5px solid rgba(126,212,160,0.25)" }}>T: {typeData.axisT}</span>
                <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: "rgba(250,202,62,0.1)", color: "#FACA3E", border: "0.5px solid rgba(250,202,62,0.25)" }}>Y: {typeData.axisY}</span>
              </div>
            </div>

            {/* 비로그인 블러 게이트 */}
            {!showFull && !user && (
              <>
                {/* 블러 미리보기 */}
                <div className="relative rounded-2xl overflow-hidden mb-4" style={{ border: "0.5px solid rgba(255,255,255,0.08)" }}>
                  <div style={{ filter: "blur(6px)", pointerEvents: "none", userSelect: "none", padding: "20px", background: "#141414" }}>
                    <p style={{ fontSize: 12, color: "#5c5448", marginBottom: 8 }}>자산 배분 가이드</p>
                    <div className="flex gap-3">
                      {typeData.allocation.map((a) => (
                        <div key={a.label} style={{ flex: 1, background: "#1c1c1c", borderRadius: 10, padding: "10px 12px" }}>
                          <div style={{ fontSize: 16, fontWeight: 500, color: typeData.color }}>{a.pct}</div>
                          <div style={{ fontSize: 11, color: "#5c5448" }}>{a.label}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: 12, fontSize: 13, color: "#a09688", lineHeight: 1.65 }}>
                      {typeData.desc}
                    </div>
                  </div>
                  {/* 블러 오버레이 */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center"
                    style={{ background: "linear-gradient(to bottom, rgba(13,13,13,0.3) 0%, rgba(13,13,13,0.92) 60%)" }}>
                    <div style={{ marginTop: 60, textAlign: "center", padding: "0 20px" }}>
                      <div style={{ fontSize: 20, marginBottom: 8 }}>🔒</div>
                      <p style={{ fontSize: 14, fontWeight: 500, color: "#e8e0d0", marginBottom: 4 }}>상세 분석 리포트 잠김</p>
                      <p style={{ fontSize: 12, color: "#a09688" }}>자산 배분 · 추천 ETF · 투자 경고까지 무료로 확인해</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2 mb-6">
                  <button onClick={() => setAuthMode("signup")} className="pico-btn w-full py-3.5 rounded-xl"
                    style={{ background: "#FACA3E", color: "#0d0d0d", fontSize: 14, fontWeight: 500, border: "none" }}>
                    🎉 회원가입하고 결과 보기
                  </button>
                  <button onClick={() => setAuthMode("login")} className="pico-btn w-full py-3 rounded-xl"
                    style={{ background: "transparent", color: "#a09688", fontSize: 13, border: "0.5px solid rgba(255,255,255,0.1)" }}>
                    이미 계정이 있어 — 로그인
                  </button>
                </div>
              </>
            )}

            {/* 풀 리포트 (로그인 후) */}
            {(showFull || user) && (
              <>
                {/* 성향 설명 */}
                <div className="rounded-2xl p-5 border mb-4" style={{ background: "#141414", borderColor: "rgba(255,255,255,0.08)" }}>
                  <p style={{ fontSize: 11, letterSpacing: "0.12em", color: "#5c5448", textTransform: "uppercase", marginBottom: 10 }}>투자 성향</p>
                  <p style={{ fontSize: 14, color: "#a09688", lineHeight: 1.8 }}>{typeData.desc}</p>
                </div>

                {/* 자산 배분 */}
                <div className="rounded-2xl p-5 border mb-4" style={{ background: "#141414", borderColor: "rgba(255,255,255,0.08)" }}>
                  <p style={{ fontSize: 11, letterSpacing: "0.12em", color: "#5c5448", textTransform: "uppercase", marginBottom: 12 }}>권장 자산 배분</p>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {typeData.allocation.map((a) => (
                      <div key={a.label} className="rounded-xl p-3 text-center" style={{ background: "#1c1c1c" }}>
                        <div style={{ fontFamily: "var(--font-inter)", fontSize: 18, fontWeight: 300, color: typeData.color, letterSpacing: "-0.02em" }}>{a.pct}</div>
                        <div style={{ fontSize: 10, color: "#5c5448", marginTop: 3 }}>{a.label}</div>
                      </div>
                    ))}
                  </div>
                  {typeData.recommended.map((r) => (
                    <div key={r.label} className="flex gap-3 py-2.5 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                      <span style={{ fontSize: 11, color: "#5c5448", fontWeight: 500, minWidth: 40, flexShrink: 0 }}>{r.label}</span>
                      <span style={{ fontSize: 13, color: "#e8e0d0" }}>{r.value}</span>
                    </div>
                  ))}
                </div>

                {/* 추천 종목 태그 */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {typeData.stocks.map((s) => (
                    <span key={s} style={{ fontSize: 12, fontWeight: 500, padding: "4px 10px", borderRadius: 5, background: `${typeData.color}12`, color: typeData.color, border: `0.5px solid ${typeData.color}30` }}>
                      {s}
                    </span>
                  ))}
                </div>

                {/* 투자 경고 */}
                <div className="rounded-2xl p-5 border mb-4" style={{ background: "rgba(240,120,120,0.04)", borderColor: "rgba(240,120,120,0.2)" }}>
                  <p style={{ fontSize: 11, letterSpacing: "0.12em", color: "#f07878", textTransform: "uppercase", marginBottom: 12 }}>⚠️ 투자 경고 — 이것만 조심해</p>
                  {typeData.guards.map((g) => (
                    <div key={g.title} className="mb-3 last:mb-0">
                      <p style={{ fontSize: 13, fontWeight: 500, color: "#f07878", marginBottom: 4 }}>{g.title}</p>
                      <p style={{ fontSize: 12, color: "#a09688", lineHeight: 1.65 }}>{g.desc}</p>
                    </div>
                  ))}
                </div>

                {/* 궁합 유형 */}
                <div className="rounded-2xl px-5 py-4 border mb-6 flex items-center gap-3" style={{ background: "#141414", borderColor: "rgba(255,255,255,0.08)" }}>
                  <span style={{ fontSize: 20 }}>💞</span>
                  <div>
                    <p style={{ fontSize: 11, color: "#5c5448", marginBottom: 2 }}>투자 궁합 유형</p>
                    <p style={{ fontSize: 14, fontWeight: 500, color: "#e8e0d0" }}>{typeData.compatible}</p>
                  </div>
                </div>
              </>
            )}

            {/* 버튼 */}
            <div className="flex flex-col gap-2">
              <button onClick={shareQuiz} className="pico-btn w-full py-3.5 rounded-xl"
                style={{ background: "#FACA3E", color: "#0d0d0d", fontSize: 14, fontWeight: 500, border: "none" }}>
                🔗 링크 공유하기 (카카오톡)
              </button>
              <button onClick={reset} className="pico-btn w-full py-3 rounded-xl"
                style={{ background: "transparent", color: "#a09688", fontSize: 13, border: "0.5px solid rgba(255,255,255,0.1)" }}>
                다시 하기
              </button>
            </div>

            {/* VS 배틀 유도 */}
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
