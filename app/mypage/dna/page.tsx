"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/app/lib/authContext";
import { INVESTOR_TYPES, TYPE_KEYS, type TypeKey } from "@/app/lib/quizTypes";
import { BackIcon } from "@/app/components/BackIcon";

export default function DnaPage() {
  const router = useRouter();
  const { user, userRow, loading } = useAuth();
  const [showAllTypes, setShowAllTypes] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [user, loading, router]);

  function share() {
    const url = typeof window !== "undefined" ? `${window.location.origin}/quiz` : "";
    const dnaType = userRow?.investor_type ? INVESTOR_TYPES[userRow.investor_type as TypeKey] : null;
    const text = dnaType
      ? `나는 ${dnaType.modifier} ${dnaType.emoji}${dnaType.name}!\n\n당신의 투자 DNA는? PICO에서 확인해봐 →\n${url}`
      : `투자 DNA 테스트 — PICO에서 내 유형을 찾아봐 →\n${url}`;
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({ title: "PICO 투자 DNA 테스트", text, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(`${text}`).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  }

  if (loading) return null;
  if (!user || !userRow) return null;

  const dnaType = userRow.investor_type ? INVESTOR_TYPES[userRow.investor_type as TypeKey] : null;

  return (
    <main className="min-h-screen" style={{ background: "#0d0d0d", fontFamily: "var(--font-paperlogy), var(--font-noto), sans-serif" }}>
      <nav className="sticky top-0 z-30 border-b flex items-center px-5"
        style={{ height: 56, background: "rgba(13,13,13,0.96)", backdropFilter: "blur(20px)", borderColor: "rgba(255,255,255,0.06)" }}>
        <button onClick={() => router.back()} style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}>
          <BackIcon />
        </button>
        <span style={{ fontFamily: "var(--font-serif)", fontSize: 20, color: "#FACA3E", marginLeft: 16 }}>PICO</span>
        <button onClick={share} className="pico-btn ml-auto px-4 py-2 rounded-xl"
          style={{ background: "rgba(250,202,62,0.1)", border: "0.5px solid rgba(250,202,62,0.25)", color: "#FACA3E", fontSize: 13, fontWeight: 500 }}>
          {copied ? "복사됨 ✓" : "🔗 공유하기"}
        </button>
      </nav>

      <div className="page-container mx-auto py-8 px-4 sm:px-6" style={{ maxWidth: 700 }}>

        {dnaType ? (
          <>
            {/* ── 타입 헤더 ── */}
            <div className="rounded-2xl px-5 py-6 border mb-5 flex items-center justify-between flex-wrap gap-4"
              style={{ background: `${dnaType.color}0d`, borderColor: `${dnaType.color}35` }}>
              <div className="flex items-center gap-4">
                <span style={{ fontSize: "clamp(44px, 8vw, 60px)", lineHeight: 1 }}>{dnaType.emoji}</span>
                <div>
                  <p style={{ fontSize: 13, letterSpacing: "0.08em", color: dnaType.color, fontWeight: 600, marginBottom: 4, textTransform: "uppercase" }}>
                    {dnaType.modifier}
                  </p>
                  <p style={{ fontSize: "clamp(24px, 5vw, 36px)", fontWeight: 700, color: "#e8e0d0", lineHeight: 1.05, marginBottom: 6 }}>
                    {dnaType.name}
                  </p>
                  <p style={{ fontSize: 14, color: "#c8bfb0", lineHeight: 1.6, maxWidth: 420 }}>
                    {dnaType.tagline}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <span style={{ fontSize: 14, padding: "5px 14px", borderRadius: 6, background: "rgba(240,120,120,0.12)", color: "#f07878", border: "0.5px solid rgba(240,120,120,0.3)", fontFamily: "var(--font-inter)" }}>
                  R: {dnaType.axisR}
                </span>
                <span style={{ fontSize: 14, padding: "5px 14px", borderRadius: 6, background: "rgba(126,212,160,0.12)", color: "#7ed4a0", border: "0.5px solid rgba(126,212,160,0.3)", fontFamily: "var(--font-inter)" }}>
                  T: {dnaType.axisT}
                </span>
                <span style={{ fontSize: 14, padding: "5px 14px", borderRadius: 6, background: "rgba(250,202,62,0.12)", color: "#FACA3E", border: "0.5px solid rgba(250,202,62,0.3)", fontFamily: "var(--font-inter)" }}>
                  Y: {dnaType.axisY}
                </span>
              </div>
            </div>

            {/* ── 성향 ── */}
            <div className="rounded-2xl px-5 py-4 border mb-4" style={{ background: "#141414", borderColor: "rgba(255,255,255,0.08)" }}>
              <p style={{ fontSize: 12, letterSpacing: "0.12em", color: "#c8bfb0", textTransform: "uppercase", marginBottom: 10, fontWeight: 400 }}>투자 성향</p>
              <p style={{ fontSize: 15, color: "#c8c0b0", lineHeight: 1.8 }}>{dnaType.desc}</p>
            </div>

            {/* ── 자산배분 + 추천종목 2열 ── */}
            <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
              {/* 자산 배분 */}
              <div className="rounded-2xl px-5 py-4 border" style={{ background: "#141414", borderColor: "rgba(255,255,255,0.08)" }}>
                <p style={{ fontSize: 12, letterSpacing: "0.12em", color: "#c8bfb0", textTransform: "uppercase", marginBottom: 14, fontWeight: 400 }}>적정 자산 배분</p>
                <div className="flex flex-col gap-4">
                  {dnaType.allocation.map((item, i) => (
                    <div key={i}>
                      <p style={{ fontSize: 15, fontWeight: 600, color: "#e8e0d0", marginBottom: 3 }}>{item.label}</p>
                      <p style={{ fontFamily: "var(--font-inter)", fontSize: 17, fontWeight: 300, color: dnaType.color, letterSpacing: "-0.02em" }}>{item.pct}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 추천 종목 */}
              <div className="rounded-2xl px-5 py-4 border" style={{ background: "#141414", borderColor: "rgba(255,255,255,0.08)" }}>
                <p style={{ fontSize: 12, letterSpacing: "0.12em", color: "#c8bfb0", textTransform: "uppercase", marginBottom: 14, fontWeight: 400 }}>추천 종목 스타일</p>
                <div className="flex flex-col gap-3">
                  {dnaType.recommended.map((r, i) => (
                    <div key={i} className="pb-3 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                      <p style={{ fontSize: 12, color: dnaType.color, fontWeight: 700, marginBottom: 4, letterSpacing: "0.06em", textTransform: "uppercase" }}>{r.label}</p>
                      <p style={{ fontSize: 14, color: "#c8c0b0", lineHeight: 1.6 }}>{r.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── 위험 경고 ── */}
            <div className="flex flex-col gap-3 mb-5">
              {dnaType.guards.map((g, i) => (
                <div key={i} className="rounded-2xl px-5 py-4 border"
                  style={{ background: "rgba(240,120,120,0.06)", borderColor: "rgba(240,120,120,0.22)" }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "#f07878", marginBottom: 6 }}>
                    🚨 위험 신호 — {g.title}
                  </p>
                  <p style={{ fontSize: 13, color: "#c8c0b0", lineHeight: 1.75 }}>{g.desc}</p>
                </div>
              ))}
            </div>

            {/* ── 공유 + 다시 하기 ── */}
            <div className="flex gap-3 mb-8">
              <button onClick={share} className="pico-btn flex-1 py-4 rounded-2xl"
                style={{ background: "#FACA3E", color: "#0d0d0d", fontSize: 16, fontWeight: 600, border: "none" }}>
                {copied ? "링크 복사됨 ✓" : "🔗 공유하기 (카카오톡)"}
              </button>
              <Link href="/quiz" className="pico-btn px-6 py-4 rounded-2xl flex items-center"
                style={{ background: "transparent", color: "#c8bfb0", border: "0.5px solid rgba(255,255,255,0.1)", fontSize: 15, textDecoration: "none", whiteSpace: "nowrap" }}>
                다시 테스트
              </Link>
            </div>

            {/* ── 모든 유형 ── */}
            <button onClick={() => setShowAllTypes((v) => !v)} className="pico-btn w-full rounded-2xl py-4 mb-5"
              style={{ background: "transparent", color: "#c8bfb0", border: "0.5px solid rgba(255,255,255,0.1)", fontSize: 15 }}>
              {showAllTypes ? "접기" : "모든 투자 유형 보기 (8가지)"}
            </button>

            {showAllTypes && (
              <div className="grid gap-4 mb-8" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
                {TYPE_KEYS.map((key) => {
                  const t = INVESTOR_TYPES[key];
                  const isMe = key === userRow.investor_type;
                  return (
                    <div key={key} className="rounded-2xl p-5 border flex items-start gap-4"
                      style={{ background: isMe ? `${t.color}10` : "#141414", borderColor: isMe ? `${t.color}45` : "rgba(255,255,255,0.06)" }}>
                      <span style={{ fontSize: 40, flexShrink: 0, lineHeight: 1 }}>{t.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p style={{ fontSize: 12, color: t.color, marginBottom: 3, letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600 }}>{t.modifier}</p>
                        <p style={{ fontSize: 20, fontWeight: 700, color: "#e8e0d0", marginBottom: 4 }}>{t.name}</p>
                        <p style={{ fontSize: 13, color: "#c8bfb0", lineHeight: 1.5 }}>{t.tagline}</p>
                      </div>
                      {isMe && (
                        <span style={{ fontSize: 11, color: t.color, background: `${t.color}18`, padding: "3px 8px", borderRadius: 5, flexShrink: 0, fontWeight: 600 }}>나</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          /* ── 미완료 상태 ── */
          <div className="rounded-2xl p-12 border text-center" style={{ background: "#141414", borderColor: "rgba(255,255,255,0.08)" }}>
            <p style={{ fontSize: 48, marginBottom: 20 }}>🧬</p>
            <p style={{ fontSize: 22, fontWeight: 600, color: "#c8bfb0", marginBottom: 8 }}>아직 투자 DNA를 몰라</p>
            <p style={{ fontSize: 15, color: "#c8bfb0", marginBottom: 28 }}>18개 질문으로 나만의 투자 유형을 찾아봐</p>
            <Link href="/quiz"
              style={{ display: "inline-block", background: "#FACA3E", color: "#0d0d0d", fontSize: 16, fontWeight: 600, padding: "14px 32px", borderRadius: 14, textDecoration: "none" }}>
              투자 DNA 테스트 시작
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
