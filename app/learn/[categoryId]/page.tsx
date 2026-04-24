"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/app/lib/authContext";
import { getLearnCollection, collectLearnCard } from "@/app/lib/supabase";
import {
  CATEGORY_INFO,
  RARITY_INFO,
  getCardsByCategory,
  type LearnCard,
  type CardCategory,
} from "@/app/lib/learnData";

const C = {
  bg:     "#0d0d0d",
  card:   "#141414",
  inner:  "#1a1a1a",
  text:   "#e8e0d0",
  text2:  "#c8bfb0",
  gold:   "#FACA3E",
  green:  "#7ed4a0",
  red:    "#f07878",
  border: "rgba(255,255,255,0.07)",
} as const;

type FilterType = "all" | "collected" | "uncollected";

export default function CategoryPage() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const category = categoryId as CardCategory;
  const info = CATEGORY_INFO[category];
  const cards = info ? getCardsByCategory(category) : [];

  const [collected, setCollected] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<FilterType>("all");

  // 모달 상태
  const [activeCard, setActiveCard] = useState<LearnCard | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [correct, setCorrect] = useState(false);
  const [collecting, setCollecting] = useState(false);
  const [justCollected, setJustCollected] = useState(false);
  const [pointsEarned, setPointsEarned] = useState(0);

  useEffect(() => {
    if (!user) return;
    getLearnCollection(user.id).then((ids) => setCollected(new Set(ids)));
  }, [user]);

  const openCard = useCallback((card: LearnCard) => {
    setActiveCard(card);
    setFlipped(false);
    setSelectedOption(null);
    setAnswered(false);
    setCorrect(false);
    setJustCollected(false);
    setPointsEarned(0);
  }, []);

  const closeModal = useCallback(() => {
    setActiveCard(null);
  }, []);

  const handleFlip = useCallback(() => {
    if (!flipped) setFlipped(true);
  }, [flipped]);

  const handleSubmit = useCallback(async () => {
    if (selectedOption === null || !activeCard || answered) return;

    const isCorrect = selectedOption === activeCard.quiz.answer;
    setAnswered(true);
    setCorrect(isCorrect);

    if (isCorrect && user && !collected.has(activeCard.id)) {
      setCollecting(true);
      const rarityPoints = RARITY_INFO[activeCard.rarity].points;
      const { newly_collected } = await collectLearnCard(
        user.id,
        activeCard.id,
        rarityPoints,
        activeCard.term
      );
      if (newly_collected) {
        setCollected((prev) => new Set([...prev, activeCard.id]));
        setJustCollected(true);
        setPointsEarned(rarityPoints);
      }
      setCollecting(false);
    }
  }, [selectedOption, activeCard, answered, user, collected]);

  if (!info) {
    return (
      <main style={{ minHeight: "100vh", background: C.bg, color: C.text, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <p style={{ color: C.text2, marginBottom: 16 }}>존재하지 않는 카테고리예요.</p>
          <Link href="/learn" style={{ color: C.gold }}>도감으로 돌아가기</Link>
        </div>
      </main>
    );
  }

  const filteredCards = cards.filter((c) => {
    if (filter === "collected") return collected.has(c.id);
    if (filter === "uncollected") return !collected.has(c.id);
    return true;
  });

  const doneCount = cards.filter((c) => collected.has(c.id)).length;
  const pct = Math.round((doneCount / cards.length) * 100);

  return (
    <main style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "var(--font-paperlogy), var(--font-noto), sans-serif" }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }
        @keyframes overlayIn { from { opacity:0; } to { opacity:1; } }
        @keyframes cardIn { from { opacity:0; transform:scale(0.94) translateY(12px); } to { opacity:1; transform:scale(1) translateY(0); } }
        @keyframes flipFront { from { transform: rotateY(0deg); } to { transform: rotateY(-180deg); } }
        @keyframes flipBack  { from { transform: rotateY(180deg); } to { transform: rotateY(0deg); } }
        .card-grid-item { transition: transform 0.15s, box-shadow 0.15s; cursor: pointer; }
        .card-grid-item:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,0.4); }
        .card-grid-item:active { transform: scale(0.97); }
        .flip-card-inner { transition: transform 0.55s cubic-bezier(0.4,0,0.2,1); transform-style: preserve-3d; position: relative; }
        .flip-card-inner.is-flipped { transform: rotateY(180deg); }
        .flip-face { backface-visibility: hidden; -webkit-backface-visibility: hidden; }
        .flip-face-back { transform: rotateY(180deg); position: absolute; top: 0; left: 0; right: 0; }
        .opt-btn { transition: background 0.12s, border-color 0.12s; }
        .opt-btn:hover { background: rgba(255,255,255,0.06) !important; }
        .filter-btn { transition: background 0.12s, color 0.12s; }
      `}</style>

<div style={{ maxWidth: 700, margin: "0 auto", padding: "20px clamp(16px,4vw,24px) 56px" }}>

        {/* 진행 바 */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ height: 5, borderRadius: 99, background: "rgba(255,255,255,0.07)", overflow: "hidden", marginBottom: 6 }}>
            <div style={{
              height: "100%", borderRadius: 99,
              background: info.color,
              width: `${pct}%`,
              transition: "width 0.6s cubic-bezier(0.4,0,0.2,1)",
              opacity: 0.85,
            }} />
          </div>
          <p style={{ fontSize: 12, color: C.text2 }}>{info.description} · {pct}% 수집 완료</p>
        </div>

        {/* 필터 */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {(["all", "collected", "uncollected"] as FilterType[]).map((f) => (
            <button
              key={f}
              className="filter-btn"
              onClick={() => setFilter(f)}
              style={{
                padding: "6px 14px", borderRadius: 99, fontSize: 12, fontWeight: 500,
                border: `0.5px solid ${filter === f ? C.gold : "rgba(255,255,255,0.1)"}`,
                background: filter === f ? "rgba(250,202,62,0.1)" : "transparent",
                color: filter === f ? C.gold : C.text2,
                cursor: "pointer",
              }}
            >
              {f === "all" ? "전체" : f === "collected" ? "✓ 수집됨" : "미수집"}
            </button>
          ))}
        </div>

        {/* 카드 그리드 */}
        {filteredCards.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <p style={{ color: C.text2, fontSize: 14 }}>
              {filter === "collected" ? "아직 수집한 카드가 없어요." : "모든 카드를 수집했어요! 🎉"}
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {filteredCards.map((card) => {
              const isDone = collected.has(card.id);
              const rarity = RARITY_INFO[card.rarity];
              return (
                <div
                  key={card.id}
                  className="card-grid-item"
                  onClick={() => openCard(card)}
                  style={{
                    background: isDone
                      ? `linear-gradient(135deg, ${C.card} 0%, rgba(250,202,62,0.04) 100%)`
                      : C.card,
                    borderRadius: 18,
                    border: `0.5px solid ${isDone ? "rgba(250,202,62,0.2)" : C.border}`,
                    padding: "16px 14px",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  {/* 수집 체크 */}
                  {isDone && (
                    <div style={{
                      position: "absolute", top: 10, right: 10,
                      width: 20, height: 20, borderRadius: "50%",
                      background: C.gold,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 11, color: "#0d0d0d", fontWeight: 700,
                    }}>✓</div>
                  )}

                  <div style={{ fontSize: 28, marginBottom: 8 }}>{card.emoji}</div>
                  <p style={{
                    fontSize: 15, fontWeight: 600,
                    color: isDone ? C.gold : C.text,
                    marginBottom: 4, lineHeight: 1.3,
                  }}>{card.term}</p>
                  <p style={{ fontSize: 11, color: C.text2, marginBottom: 10, lineHeight: 1.4 }}>
                    {card.summary}
                  </p>

                  {/* 레어도 뱃지 */}
                  <span style={{
                    fontSize: 10, padding: "2px 7px", borderRadius: 6, fontWeight: 500,
                    background: `${rarity.color}18`,
                    color: rarity.color,
                  }}>
                    {rarity.label} +{rarity.points}P
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── 플립 카드 모달 ─────────────────────────────────── */}
      {activeCard && (
        <div
          onClick={closeModal}
          style={{
            position: "fixed", inset: 0, zIndex: 50,
            background: "rgba(0,0,0,0.78)", backdropFilter: "blur(8px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "20px 16px",
            animation: "overlayIn 0.2s ease",
          }}
        >
          {/* 카드 컨테이너 — 클릭 버블링 차단 */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%", maxWidth: 360,
              animation: "cardIn 0.25s cubic-bezier(0.34,1.56,0.64,1)",
            }}
          >
            {/* perspective wrapper */}
            <div style={{ perspective: "1200px" }}>
              <div className={`flip-card-inner${flipped ? " is-flipped" : ""}`}>

                {/* ── 앞면 ── */}
                <div
                  className="flip-face"
                  style={{
                    background: C.card,
                    borderRadius: 24,
                    border: `0.5px solid rgba(250,202,62,0.2)`,
                    padding: "32px 24px 28px",
                    textAlign: "center",
                    minHeight: 320,
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  }}
                >
                  <div style={{ fontSize: 56, marginBottom: 16 }}>{activeCard.emoji}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center", marginBottom: 8 }}>
                    <h2 style={{ fontSize: 28, fontWeight: 700, color: C.text, margin: 0 }}>
                      {activeCard.term}
                    </h2>
                    {collected.has(activeCard.id) && (
                      <span style={{
                        fontSize: 11, padding: "2px 8px", borderRadius: 6,
                        background: "rgba(250,202,62,0.12)", color: C.gold,
                      }}>수집됨</span>
                    )}
                  </div>
                  <p style={{ fontSize: 14, color: C.text2, marginBottom: 24, lineHeight: 1.6 }}>
                    {activeCard.summary}
                  </p>
                  <span style={{
                    fontSize: 11, padding: "3px 10px", borderRadius: 99, fontWeight: 500,
                    background: `${RARITY_INFO[activeCard.rarity].color}18`,
                    color: RARITY_INFO[activeCard.rarity].color,
                    marginBottom: 28,
                  }}>
                    {CATEGORY_INFO[activeCard.category].label} · {RARITY_INFO[activeCard.rarity].label} +{RARITY_INFO[activeCard.rarity].points}P
                  </span>
                  <button
                    onClick={handleFlip}
                    style={{
                      padding: "12px 28px", borderRadius: 14, fontSize: 14, fontWeight: 600,
                      background: C.gold, color: "#0d0d0d", border: "none", cursor: "pointer",
                      letterSpacing: "0.02em",
                    }}
                  >
                    치익— 뒤집기 🃏
                  </button>
                  <p style={{ fontSize: 11, color: "rgba(200,191,176,0.4)", marginTop: 12 }}>퀴즈를 맞히면 카드가 수집돼요</p>
                </div>

                {/* ── 뒷면 ── */}
                <div
                  className="flip-face flip-face-back"
                  style={{
                    background: C.card,
                    borderRadius: 24,
                    border: `0.5px solid rgba(168,144,240,0.2)`,
                    padding: "24px 20px",
                    minHeight: 320,
                    overflowY: "auto",
                    maxHeight: "80vh",
                  }}
                >
                  {/* 설명 */}
                  <div style={{
                    background: C.inner, borderRadius: 14, padding: "16px",
                    marginBottom: 16,
                  }}>
                    <p style={{ fontSize: 11, color: C.text2, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
                      쉽게 말하면?
                    </p>
                    <p style={{ fontSize: 14, color: C.text, lineHeight: 1.7, margin: 0 }}>
                      {activeCard.description}
                    </p>
                    {activeCard.tip && (
                      <p style={{
                        fontSize: 12, color: C.gold, marginTop: 10,
                        paddingTop: 10, borderTop: "0.5px solid rgba(255,255,255,0.06)",
                        lineHeight: 1.6, margin: "10px 0 0",
                      }}>
                        💡 {activeCard.tip}
                      </p>
                    )}
                  </div>

                  {/* 퀴즈 */}
                  <div>
                    <p style={{ fontSize: 12, color: C.text2, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>
                      퀴즈
                    </p>
                    <p style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 14, lineHeight: 1.5 }}>
                      {activeCard.quiz.question}
                    </p>

                    {/* 선택지 */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
                      {activeCard.quiz.options.map((opt, idx) => {
                        let bg: string = "transparent";
                        let borderColor: string = "rgba(255,255,255,0.1)";
                        let textColor: string = C.text;

                        if (answered) {
                          if (idx === activeCard.quiz.answer) {
                            bg = "rgba(126,212,160,0.1)";
                            borderColor = C.green;
                            textColor = C.green;
                          } else if (idx === selectedOption && !correct) {
                            bg = "rgba(240,120,120,0.1)";
                            borderColor = C.red;
                            textColor = C.red;
                          } else {
                            textColor = "rgba(200,191,176,0.35)";
                            borderColor = "rgba(255,255,255,0.05)";
                          }
                        } else if (selectedOption === idx) {
                          bg = "rgba(250,202,62,0.08)";
                          borderColor = "rgba(250,202,62,0.4)";
                        }

                        return (
                          <button
                            key={idx}
                            className="opt-btn"
                            disabled={answered}
                            onClick={() => setSelectedOption(idx)}
                            style={{
                              width: "100%", padding: "12px 14px",
                              borderRadius: 12, fontSize: 13,
                              border: `0.5px solid ${borderColor}`,
                              background: bg, color: textColor,
                              cursor: answered ? "default" : "pointer",
                              textAlign: "left", transition: "all 0.12s",
                            }}
                          >
                            <span style={{ fontFamily: "var(--font-inter)", marginRight: 8, fontSize: 11, opacity: 0.6 }}>
                              {["①", "②", "③", "④"][idx]}
                            </span>
                            {opt}
                          </button>
                        );
                      })}
                    </div>

                    {/* 확인 버튼 or 피드백 */}
                    {!answered ? (
                      <button
                        onClick={handleSubmit}
                        disabled={selectedOption === null || collecting}
                        style={{
                          width: "100%", padding: "13px", borderRadius: 12,
                          fontSize: 14, fontWeight: 600,
                          background: selectedOption !== null ? C.gold : "rgba(255,255,255,0.06)",
                          color: selectedOption !== null ? "#0d0d0d" : C.text2,
                          border: "none", cursor: selectedOption !== null ? "pointer" : "default",
                          transition: "background 0.15s, color 0.15s",
                        }}
                      >
                        확인하기
                      </button>
                    ) : (
                      <div>
                        {/* 정답/오답 배너 */}
                        <div style={{
                          padding: "12px 14px", borderRadius: 12, marginBottom: 10,
                          background: correct ? "rgba(126,212,160,0.1)" : "rgba(240,120,120,0.1)",
                          border: `0.5px solid ${correct ? C.green : C.red}`,
                        }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: correct ? C.green : C.red, marginBottom: 4 }}>
                            {correct ? "🎉 정답이에요!" : "🤔 아쉬워요, 다시 도전해봐요"}
                          </p>
                          <p style={{ fontSize: 12, color: C.text2, margin: 0, lineHeight: 1.5 }}>
                            {activeCard.quiz.explanation}
                          </p>
                        </div>

                        {/* 수집 완료 알림 */}
                        {justCollected && (
                          <div style={{
                            padding: "10px 14px", borderRadius: 12, marginBottom: 10,
                            background: "rgba(250,202,62,0.1)",
                            border: "0.5px solid rgba(250,202,62,0.3)",
                            display: "flex", alignItems: "center", gap: 8,
                          }}>
                            <span style={{ fontSize: 18 }}>✨</span>
                            <div>
                              <p style={{ fontSize: 13, fontWeight: 600, color: C.gold, margin: 0 }}>
                                카드 수집 완료!
                              </p>
                              <p style={{ fontSize: 12, color: C.text2, margin: 0 }}>
                                +{pointsEarned}P 획득했어요
                              </p>
                            </div>
                          </div>
                        )}

                        {/* 이미 수집된 경우 */}
                        {correct && !justCollected && collected.has(activeCard.id) && (
                          <div style={{
                            padding: "10px 14px", borderRadius: 12, marginBottom: 10,
                            background: "rgba(255,255,255,0.04)",
                            border: `0.5px solid ${C.border}`,
                          }}>
                            <p style={{ fontSize: 12, color: C.text2, margin: 0 }}>
                              이미 수집한 카드예요. 복습 완료! 📖
                            </p>
                          </div>
                        )}

                        <button
                          onClick={closeModal}
                          style={{
                            width: "100%", padding: "12px", borderRadius: 12,
                            fontSize: 14, fontWeight: 500,
                            background: "rgba(255,255,255,0.06)",
                            color: C.text2, border: `0.5px solid ${C.border}`,
                            cursor: "pointer",
                          }}
                        >
                          닫기
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                {/* ── 뒷면 끝 ── */}
              </div>
            </div>
            {/* 닫기 힌트 */}
            <p style={{ textAlign: "center", fontSize: 12, color: "rgba(200,191,176,0.35)", marginTop: 14 }}>
              바깥을 탭하면 닫혀요
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
