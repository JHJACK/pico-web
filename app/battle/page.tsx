"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const STORAGE_KEY = "pico_battle_2024_04_01";

const BATTLE = {
  category: "숙박업 대결",
  question: "오늘 장 마감까지 어느 쪽이 오를까?",
  a: {
    ticker: "ABNB",
    name: "에어비앤비",
    price: "$156.40",
    change: "+1.2%",
    changeUp: true,
  },
  b: {
    ticker: "HLT",
    name: "힐튼 호텔",
    price: "$218.30",
    change: "-0.4%",
    changeUp: false,
  },
  // 초기 투표 수 (시뮬레이션)
  initVotesA: 1648,
  initVotesB: 1193,
};

export default function BattlePage() {
  const [voted, setVoted] = useState<"a" | "b" | null>(null);
  const [votesA, setVotesA] = useState(BATTLE.initVotesA);
  const [votesB, setVotesB] = useState(BATTLE.initVotesB);
  const [animating, setAnimating] = useState(false);

  // 로컬스토리지에서 이미 투표한 기록 불러오기
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const data = JSON.parse(saved);
      setVoted(data.choice);
      setVotesA(data.votesA);
      setVotesB(data.votesB);
    }
  }, []);

  function handleVote(choice: "a" | "b") {
    if (voted || animating) return;
    setAnimating(true);

    const newA = choice === "a" ? votesA + 1 : votesA;
    const newB = choice === "b" ? votesB + 1 : votesB;

    setTimeout(() => {
      setVoted(choice);
      setVotesA(newA);
      setVotesB(newB);
      setAnimating(false);
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ choice, votesA: newA, votesB: newB })
      );
      localStorage.setItem("pico_battle_done", "true");
    }, 300);
  }

  const total = votesA + votesB;
  const pctA = total > 0 ? Math.round((votesA / total) * 100) : 50;
  const pctB = 100 - pctA;

  return (
    <main className="min-h-screen" style={{ background: "#0d0d0d" }}>
      {/* 네비게이션 */}
      <nav
        className="sticky top-0 z-50 flex items-center px-5 border-b"
        style={{
          height: 50,
          background: "rgba(13,13,13,0.95)",
          backdropFilter: "blur(16px)",
          borderColor: "rgba(255,255,255,0.06)",
        }}
      >
        <Link
          href="/"
          className="mr-4"
          style={{ color: "#5c5448", fontSize: 13, fontFamily: "var(--font-mono)" }}
        >
          ← 홈
        </Link>
        <span
          style={{ fontFamily: "var(--font-serif)", fontSize: 16, color: "#EDD97A" }}
        >
          PICO
        </span>
      </nav>

      <div className="max-w-lg mx-auto px-5 pt-8 pb-16">
        {/* 헤더 */}
        <div className="mb-6">
          <div
            className="text-xs font-semibold tracking-widest uppercase mb-2"
            style={{ fontFamily: "var(--font-mono)", color: "#5c5448" }}
          >
            오늘의 배틀 — {BATTLE.category}
          </div>
          <h1
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "clamp(20px, 5vw, 26px)",
              color: "#e8e0d0",
              lineHeight: 1.2,
              marginBottom: 6,
            }}
          >
            {BATTLE.question}
          </h1>
          <p style={{ fontSize: 12, color: "#5c5448", fontFamily: "var(--font-mono)" }}>
            내일 오전 결과 공개 · 정답 시 100 포인트
          </p>
        </div>

        {/* VS 카드 */}
        <div
          className="rounded-2xl p-5 border mb-4"
          style={{ background: "#141414", borderColor: "rgba(255,255,255,0.06)" }}
        >
          {/* 두 종목 */}
          <div className="flex items-stretch gap-3 mb-5">
            {/* A */}
            <button
              onClick={() => handleVote("a")}
              disabled={!!voted}
              className="flex-1 rounded-xl p-4 border text-center transition-all duration-200 active:scale-[0.97]"
              style={{
                background: voted === "a"
                  ? "rgba(250,202,62,0.06)"
                  : "#1c1c1c",
                borderColor: voted === "a"
                  ? "rgba(250,202,62,0.45)"
                  : "rgba(255,255,255,0.06)",
                cursor: voted ? "default" : "pointer",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: 22,
                  color: voted === "a" ? "#FACA3E" : "#e8e0d0",
                  marginBottom: 4,
                }}
              >
                {BATTLE.a.ticker}
              </div>
              <div
                style={{ fontSize: 11, color: "#5c5448", fontFamily: "var(--font-mono)", marginBottom: 8 }}
              >
                {BATTLE.a.name}
              </div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: BATTLE.a.changeUp ? "#7ed4a0" : "#f07878",
                  fontFamily: "var(--font-mono)",
                  marginBottom: 10,
                }}
              >
                {BATTLE.a.price} {BATTLE.a.changeUp ? "▲" : "▼"} {BATTLE.a.change}
              </div>
              <div
                className="text-xs font-semibold px-3 py-1.5 rounded-md inline-block"
                style={{
                  fontFamily: "var(--font-mono)",
                  background: voted === "a"
                    ? "rgba(250,202,62,0.15)"
                    : "rgba(255,255,255,0.04)",
                  color: voted === "a" ? "#FACA3E" : "#5c5448",
                  border: `0.5px solid ${voted === "a" ? "rgba(250,202,62,0.3)" : "rgba(255,255,255,0.08)"}`,
                  letterSpacing: "0.04em",
                }}
              >
                {voted === "a" ? "✓ 선택함" : "선택하기"}
              </div>
            </button>

            {/* VS 중앙 */}
            <div className="flex items-center justify-center flex-shrink-0 w-10">
              <span
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: 16,
                  color: "#5c5448",
                }}
              >
                VS
              </span>
            </div>

            {/* B */}
            <button
              onClick={() => handleVote("b")}
              disabled={!!voted}
              className="flex-1 rounded-xl p-4 border text-center transition-all duration-200 active:scale-[0.97]"
              style={{
                background: voted === "b"
                  ? "rgba(126,184,247,0.06)"
                  : "#1c1c1c",
                borderColor: voted === "b"
                  ? "rgba(126,184,247,0.45)"
                  : "rgba(255,255,255,0.06)",
                cursor: voted ? "default" : "pointer",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: 22,
                  color: voted === "b" ? "#7eb8f7" : "#e8e0d0",
                  marginBottom: 4,
                }}
              >
                {BATTLE.b.ticker}
              </div>
              <div
                style={{ fontSize: 11, color: "#5c5448", fontFamily: "var(--font-mono)", marginBottom: 8 }}
              >
                {BATTLE.b.name}
              </div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: BATTLE.b.changeUp ? "#7ed4a0" : "#f07878",
                  fontFamily: "var(--font-mono)",
                  marginBottom: 10,
                }}
              >
                {BATTLE.b.price} {BATTLE.b.changeUp ? "▲" : "▼"} {BATTLE.b.change}
              </div>
              <div
                className="text-xs font-semibold px-3 py-1.5 rounded-md inline-block"
                style={{
                  fontFamily: "var(--font-mono)",
                  background: voted === "b"
                    ? "rgba(126,184,247,0.15)"
                    : "rgba(255,255,255,0.04)",
                  color: voted === "b" ? "#7eb8f7" : "#5c5448",
                  border: `0.5px solid ${voted === "b" ? "rgba(126,184,247,0.3)" : "rgba(255,255,255,0.08)"}`,
                  letterSpacing: "0.04em",
                }}
              >
                {voted === "b" ? "✓ 선택함" : "선택하기"}
              </div>
            </button>
          </div>

          {/* 투표 바 — 투표 후에만 표시 */}
          <div
            style={{
              opacity: voted ? 1 : 0,
              transition: "opacity 0.4s ease",
              pointerEvents: "none",
            }}
          >
            <div
              className="rounded-full overflow-hidden mb-2"
              style={{ height: 3, background: "#242424" }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${pctA}%`,
                  background: "#FACA3E",
                  transition: "width 0.6s cubic-bezier(.4,0,.2,1)",
                }}
              />
            </div>
            <div className="flex justify-between" style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "#5c5448", fontWeight: 600 }}>
              <span style={{ color: "#FACA3E" }}>ABNB {pctA}%</span>
              <span style={{ color: "#7eb8f7" }}>HLT {pctB}%</span>
            </div>
            <div
              className="text-center mt-2"
              style={{ fontSize: 11, color: "#5c5448", fontFamily: "var(--font-mono)" }}
            >
              총 {total.toLocaleString()}명 참여 중
            </div>
          </div>

          {/* 투표 전 안내 */}
          {!voted && (
            <div className="text-center" style={{ fontSize: 12, color: "#5c5448" }}>
              하나를 선택하면 투표 현황이 공개돼
            </div>
          )}
        </div>

        {/* 투표 완료 메시지 */}
        {voted && (
          <div
            className="rounded-xl p-4 mb-4 fade-up"
            style={{
              background: "rgba(250,202,62,0.06)",
              border: "0.5px solid rgba(250,202,62,0.2)",
            }}
          >
            <div
              className="text-xs font-semibold tracking-widest uppercase mb-1"
              style={{ fontFamily: "var(--font-mono)", color: "#FACA3E" }}
            >
              참여 완료
            </div>
            <p style={{ fontSize: 13, color: "#e8e0d0", lineHeight: 1.7 }}>
              내일 오전에 결과가 공개돼. 정답이면 <strong style={{ color: "#FACA3E" }}>100 포인트</strong>를 받아!
            </p>
          </div>
        )}

      </div>
    </main>
  );
}
