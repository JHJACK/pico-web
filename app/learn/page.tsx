"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/app/lib/authContext";
import { getLearnCollection } from "@/app/lib/supabase";
import {
  LEARN_CARDS,
  CATEGORY_INFO,
  RARITY_INFO,
  TOTAL_CARDS,
  getTodayCard,
  getCardsByCategory,
  type CardCategory,
} from "@/app/lib/learnData";

const C = {
  bg:     "#0d0d0d",
  card:   "#141414",
  inner:  "#1a1a1a",
  text:   "#e8e0d0",
  text2:  "#c8bfb0",
  gold:   "#FACA3E",
  border: "rgba(255,255,255,0.07)",
} as const;

const CATEGORY_ORDER: CardCategory[] = ["beginner", "intermediate", "advanced", "tax"];

export default function LearnPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [collected, setCollected] = useState<string[]>([]);
  const todayCard = getTodayCard();

  useEffect(() => {
    if (!user) return;
    getLearnCollection(user.id).then(setCollected);
  }, [user]);

  if (loading) return null;

  const collectedSet = new Set(collected);
  const collectedCount = collected.length;
  const progressPct = Math.round((collectedCount / TOTAL_CARDS) * 100);

  return (
    <main style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "var(--font-paperlogy), var(--font-noto), sans-serif" }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }
        .fade-up { animation: fadeUp 0.25s ease forwards; }
        .cat-card:hover { transform: translateY(-2px); transition: transform 0.15s; }
        .today-glow { box-shadow: 0 0 30px rgba(250,202,62,0.08); }
      `}</style>

<div style={{ maxWidth: 700, margin: "0 auto", padding: "24px clamp(16px,4vw,24px) 56px" }}>

        {/* 전체 수집 현황 */}
        <div className="fade-up" style={{
          background: C.card, borderRadius: 20, padding: "22px 22px 18px",
          border: `0.5px solid ${C.border}`, marginBottom: 20,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 14 }}>
            <div>
              <p style={{ fontSize: 12, color: C.text2, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>
                내 도감
              </p>
              <p style={{ fontFamily: "var(--font-inter)", fontSize: 32, fontWeight: 500, color: C.gold, letterSpacing: "-0.03em", lineHeight: 1 }}>
                {collectedCount}
                <span style={{ fontSize: 16, color: C.text2, marginLeft: 4 }}>/ {TOTAL_CARDS}</span>
              </p>
            </div>
            <p style={{ fontSize: 28, fontFamily: "var(--font-inter)", fontWeight: 300, color: C.text2, letterSpacing: "-0.02em" }}>
              {progressPct}%
            </p>
          </div>

          {/* 프로그레스 바 */}
          <div style={{ height: 6, borderRadius: 99, background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
            <div style={{
              height: "100%", borderRadius: 99,
              background: `linear-gradient(90deg, ${C.gold}, #f0b429)`,
              width: `${progressPct}%`,
              transition: "width 0.6s cubic-bezier(0.4,0,0.2,1)",
            }} />
          </div>
          <p style={{ fontSize: 12, color: C.text2, marginTop: 8 }}>
            {collectedCount === 0
              ? "첫 카드를 수집해봐요! 퀴즈를 맞히면 포인트도 받아요."
              : collectedCount === TOTAL_CARDS
              ? "🎉 모든 카드를 수집했어요!"
              : `${TOTAL_CARDS - collectedCount}개 남았어요`}
          </p>
        </div>

        {/* 오늘의 카드 */}
        <div className="fade-up today-glow" style={{
          background: C.card, borderRadius: 20,
          border: `0.5px solid rgba(250,202,62,0.2)`,
          marginBottom: 20, overflow: "hidden",
        }}>
          <div style={{ padding: "14px 18px 0", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: C.gold, fontWeight: 500 }}>오늘의 카드</span>
            <span style={{ fontSize: 11, color: C.text2 }}>· 매일 새 용어</span>
          </div>
          <button
            onClick={() => router.push(`/learn/${todayCard.category}`)}
            style={{
              width: "100%", background: "none", border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", gap: 16, padding: "14px 18px 18px",
              textAlign: "left",
            }}
          >
            <div style={{
              width: 52, height: 52, borderRadius: 14, flexShrink: 0,
              background: "rgba(250,202,62,0.08)", border: `0.5px solid rgba(250,202,62,0.15)`,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24,
            }}>
              {todayCard.emoji}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                <span style={{ fontSize: 18, fontWeight: 600, color: C.text }}>{todayCard.term}</span>
                <span style={{
                  fontSize: 11, padding: "2px 7px", borderRadius: 6, fontWeight: 500,
                  background: `${RARITY_INFO[todayCard.rarity].color}18`,
                  color: RARITY_INFO[todayCard.rarity].color,
                }}>
                  {RARITY_INFO[todayCard.rarity].label}
                </span>
                {collectedSet.has(todayCard.id) && (
                  <span style={{ fontSize: 11, color: C.gold }}>✓ 수집됨</span>
                )}
              </div>
              <p style={{ fontSize: 13, color: C.text2, margin: 0 }}>{todayCard.summary}</p>
            </div>
            <span style={{ fontSize: 16, color: C.text2 }}>→</span>
          </button>
        </div>

        {/* 카테고리 그리드 */}
        <p style={{ fontSize: 12, color: C.text2, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>카테고리</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {CATEGORY_ORDER.map((cat) => {
            const info = CATEGORY_INFO[cat];
            const cards = getCardsByCategory(cat);
            const done = cards.filter(c => collectedSet.has(c.id)).length;
            const pct = Math.round((done / cards.length) * 100);
            return (
              <Link
                key={cat}
                href={`/learn/${cat}`}
                className="cat-card"
                style={{
                  background: C.card, borderRadius: 18, padding: "18px 16px",
                  border: `0.5px solid ${C.border}`, textDecoration: "none",
                  display: "block",
                }}
              >
                <div style={{ fontSize: 22, marginBottom: 8 }}>{info.emoji}</div>
                <p style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 4 }}>{info.label}</p>
                <p style={{ fontSize: 12, color: C.text2, marginBottom: 12, lineHeight: 1.4 }}>{info.description}</p>

                {/* 미니 프로그레스 */}
                <div style={{ height: 4, borderRadius: 99, background: "rgba(255,255,255,0.07)", overflow: "hidden", marginBottom: 6 }}>
                  <div style={{
                    height: "100%", borderRadius: 99,
                    background: info.color,
                    width: `${pct}%`,
                    opacity: 0.8,
                  }} />
                </div>
                <p style={{ fontFamily: "var(--font-inter)", fontSize: 12, color: C.text2 }}>
                  {done} / {cards.length}
                </p>
              </Link>
            );
          })}
        </div>

        {/* 포인트 안내 */}
        <div style={{
          marginTop: 20, padding: "14px 16px", borderRadius: 14,
          background: "rgba(250,202,62,0.04)", border: "0.5px solid rgba(250,202,62,0.12)",
        }}>
          <p style={{ fontSize: 12, color: C.text2, lineHeight: 1.8, margin: 0 }}>
            💡 퀴즈를 맞히면 카드가 수집되고 포인트를 받아요.
            일반 <span style={{ color: C.gold }}>+30P</span> · 레어 <span style={{ color: "#7eb8f7" }}>+50P</span> · 에픽 <span style={{ color: "#a890f0" }}>+80P</span>
          </p>
        </div>
      </div>
    </main>
  );
}
