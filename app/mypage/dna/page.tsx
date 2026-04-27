"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/app/lib/authContext";
import { INVESTOR_TYPES, TYPE_KEYS, type TypeKey } from "@/app/lib/quizTypes";
import { BackIcon } from "@/app/components/BackIcon";

// ── 축 메타 (R I T Y 순서) ───────────────────────────────────────────────────
const AXIS_META = {
  R: { color: "#f07878", leftLabel: "안정 우선",  rightLabel: "도전 선호", name: "변동성 회복력" },
  I: { color: "#7eb8f7", leftLabel: "감각·직관",  rightLabel: "독자 분석", name: "정보 필터링"  },
  T: { color: "#7ed4a0", leftLabel: "단기 지향",  rightLabel: "장기 지향", name: "운용 호흡"    },
  Y: { color: "#FACA3E", leftLabel: "안정 배당",  rightLabel: "공격 성장", name: "수익 편향"    },
} as const;

// ── 축 팝업 설명 콘텐츠 ──────────────────────────────────────────────────────
const AXIS_INFO = [
  {
    key: "R", color: "#f07878", icon: "⚡", title: "변동성 회복력",
    keyword: "손실 회피 편향",
    desc: "공포 앞에서 이성적으로 반응하는 능력을 측정해요. 하락장에서 멘탈을 유지할 수 있는지, 감정이 아닌 전략으로 행동하는지를 봐요.",
  },
  {
    key: "I", color: "#7eb8f7", icon: "🔍", title: "정보 필터링",
    keyword: "독자적 판단력",
    desc: "노이즈와 핵심 정보를 가르는 판단력을 측정해요. 유튜브·커뮤니티에 흔들리는지, 본인만의 투자 기준이 있는지를 봐요.",
  },
  {
    key: "T", color: "#7ed4a0", icon: "⏳", title: "운용 호흡",
    keyword: "복리의 마법",
    desc: "나에게 맞는 투자 시간 지평을 측정해요. 당장의 수익(단기)을 쫓는지, 복리의 힘(장기)을 기다릴 줄 아는지를 봐요.",
  },
  {
    key: "Y", color: "#FACA3E", icon: "📈", title: "수익 편향",
    keyword: "수익 성향의 방향",
    desc: "안정적인 배당·이자(수비)를 원하는지, 폭발적인 시세 차익(공격)을 원하는지 측정해요. 수익을 바라보는 근본 성향이에요.",
  },
] as const;

// ── renderText: ==형광펜== 파서 ───────────────────────────────────────────────
function renderText(text: string) {
  const tokens = text.split(/(==.*?==)/);
  return tokens.map((tok, i) => {
    if (tok.startsWith("==") && tok.endsWith("==") && tok.length > 4) {
      return (
        <mark key={i} style={{ background: "rgba(250,202,62,0.22)", color: "inherit", borderRadius: "3px", padding: "1px 5px", fontWeight: 600 } as React.CSSProperties}>
          {tok.slice(2, -2)}
        </mark>
      );
    }
    return <span key={i}>{tok}</span>;
  });
}

// ── Mona12 콜아웃 컴포넌트 ───────────────────────────────────────────────────
function Callout({ icon, label, color = "#FACA3E" }: { icon: string; label: string; color?: string }) {
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 8,
      fontFamily: "var(--font-mona12)", fontSize: 15, fontWeight: 700,
      color, background: `${color}0f`, border: `0.5px solid ${color}30`,
      borderRadius: 10, padding: "8px 14px", marginBottom: 20,
    }}>
      {icon} {label}
    </div>
  );
}

// ── 섹션 헤더 ────────────────────────────────────────────────────────────────
function SectionHeader({ icon, label, color = "#c8bfb0" }: { icon: string; label: string; color?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
      <span style={{ fontSize: 18 }}>{icon}</span>
      <span style={{ fontFamily: "var(--font-paperlogy)", fontWeight: 700, fontSize: 16, color }}>{label}</span>
    </div>
  );
}

// ── 스펙트럼 게이지 바 ────────────────────────────────────────────────────────
function SpectrumBar({ value, color }: { value: number; color: string }) {
  return (
    <div style={{ position: "relative", height: 6, borderRadius: 99, background: "rgba(255,255,255,0.07)", overflow: "visible" }}>
      <div style={{
        height: "100%", borderRadius: 99,
        width: `${value}%`,
        background: `linear-gradient(90deg, ${color}40, ${color})`,
        transition: "width 0.8s cubic-bezier(0.4,0,0.2,1)",
      }} />
      <div style={{
        position: "absolute", top: "50%",
        left: `${value}%`, transform: "translate(-50%, -50%)",
        width: 14, height: 14, borderRadius: "50%",
        background: color, boxShadow: `0 0 8px ${color}80`,
        border: "2px solid #0d0d0d",
        transition: "left 0.8s cubic-bezier(0.4,0,0.2,1)",
      }} />
    </div>
  );
}

export default function DnaPage() {
  const router = useRouter();
  const { user, userRow, loading } = useAuth();
  const [showAllTypes, setShowAllTypes] = useState(false);
  const [showAxisInfo, setShowAxisInfo] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [user, loading, router]);

  // body 스크롤 잠금 (팝업 열릴 때)
  useEffect(() => {
    if (showAxisInfo) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [showAxisInfo]);

  function share() {
    const url = typeof window !== "undefined" ? `${window.location.origin}/quiz` : "";
    const dnaType = userRow?.investor_type ? INVESTOR_TYPES[userRow.investor_type as TypeKey] : null;
    const text = dnaType
      ? `나는 ${dnaType.modifier} ${dnaType.emoji}${dnaType.name}!\n\n당신의 투자 DNA는? PICO에서 확인해보세요 →\n${url}`
      : `투자 DNA 테스트 — PICO에서 내 유형을 찾아보세요 →\n${url}`;
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({ title: "PICO 투자 DNA 테스트", text, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  }

  if (loading) return null;
  if (!user || !userRow) return null;

  const dnaType = userRow.investor_type ? INVESTOR_TYPES[userRow.investor_type as TypeKey] : null;

  const axisPositions = dnaType ? {
    R: dnaType.axisR === "HIGH" ? 78 : 22,
    I: dnaType.axisI === "HIGH" ? 78 : 22,
    T: dnaType.axisT === "LONG" ? 78 : 22,
    Y: dnaType.axisY === "GROWTH" ? 78 : 22,
  } : null;

  return (
    <main className="min-h-screen" style={{ background: "#0d0d0d", fontFamily: "var(--font-paperlogy), var(--font-noto), sans-serif" }}>

      {/* ── 축 설명 팝업 ── */}
      {showAxisInfo && (
        <div
          onClick={() => setShowAxisInfo(false)}
          style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.82)", backdropFilter: "blur(10px)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: "100%", maxWidth: 560,
              background: "#141414", borderRadius: "24px 24px 0 0",
              padding: "24px 20px 40px",
              border: "0.5px solid rgba(255,255,255,0.1)",
              maxHeight: "85vh", overflowY: "auto",
            }}
          >
            {/* 핸들바 */}
            <div style={{ width: 40, height: 4, borderRadius: 99, background: "rgba(255,255,255,0.15)", margin: "0 auto 22px" }} />

            {/* 팝업 제목 — Mona12 콜아웃 */}
            <div style={{
              fontFamily: "var(--font-mona12)", fontSize: 16, fontWeight: 700,
              color: "#e8e0d0", marginBottom: 6,
            }}>
              🔬 4가지 측정 축 설명
            </div>
            <p style={{ fontSize: 14, color: "#c8bfb0", marginBottom: 20, lineHeight: 1.6 }}>
              PICO 투자 DNA 테스트는 행동경제학 기반으로 아래 ==4가지 독립 축==을 측정해요.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {AXIS_INFO.map(({ key, color, icon, title, keyword, desc }) => (
                <div key={key} style={{
                  background: `${color}08`, border: `0.5px solid ${color}28`,
                  borderRadius: 16, padding: "16px",
                }}>
                  {/* 축 레이블 + 키워드 — Mona12 */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
                    <div style={{
                      fontFamily: "var(--font-mona12)", fontSize: 15, fontWeight: 700,
                      color, background: `${color}18`,
                      border: `0.5px solid ${color}35`,
                      borderRadius: 8, padding: "4px 10px",
                      display: "flex", alignItems: "center", gap: 6,
                    }}>
                      {icon} {key}
                    </div>
                    <span style={{ fontFamily: "var(--font-paperlogy)", fontWeight: 700, fontSize: 15, color: "#e8e0d0" }}>{title}</span>
                    {/* 핵심 키워드 형광펜 */}
                    <mark style={{ background: "rgba(250,202,62,0.2)", color: "#e8e0d0", borderRadius: "3px", padding: "2px 7px", fontSize: 13, fontWeight: 600 } as React.CSSProperties}>
                      {keyword}
                    </mark>
                  </div>
                  <p style={{ fontSize: 14, color: "#c8bfb0", lineHeight: 1.75, margin: 0 }}>{desc}</p>
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowAxisInfo(false)}
              style={{ width: "100%", marginTop: 20, padding: "14px", borderRadius: 14, background: "rgba(255,255,255,0.06)", border: "0.5px solid rgba(255,255,255,0.1)", color: "#c8bfb0", fontSize: 15, cursor: "pointer", fontFamily: "var(--font-paperlogy)" }}
            >
              닫기
            </button>
          </div>
        </div>
      )}

      <nav className="sticky top-0 z-30 border-b flex items-center px-5"
        style={{ height: 56, background: "rgba(13,13,13,0.96)", backdropFilter: "blur(20px)", borderColor: "rgba(255,255,255,0.06)" }}>
        <button onClick={() => router.back()} style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}>
          <BackIcon />
        </button>
        <span style={{ fontFamily: "var(--font-mona12)", fontSize: 15, fontWeight: 700, color: "#FACA3E", marginLeft: 16, letterSpacing: "0.06em" }}>PICO</span>
        <button onClick={share} className="pico-btn ml-auto px-4 py-2 rounded-xl"
          style={{ background: "rgba(250,202,62,0.1)", border: "0.5px solid rgba(250,202,62,0.25)", color: "#FACA3E", fontSize: 14, fontWeight: 600 }}>
          {copied ? "✓ 복사됨" : "🔗 공유"}
        </button>
      </nav>

      <div style={{ maxWidth: 700, margin: "0 auto", padding: "clamp(16px,4vw,24px)", paddingBottom: 80 }}>

        {dnaType ? (
          <>
            {/* ── 타입 헤더 카드 ── */}
            <div style={{
              background: `linear-gradient(135deg, ${dnaType.color}12 0%, #141414 60%)`,
              border: `0.5px solid ${dnaType.color}40`,
              borderRadius: 24, padding: "clamp(20px,4vw,32px)",
              marginBottom: 16, position: "relative", overflow: "hidden",
            }}>
              {/* 배경 이모지 워터마크 */}
              <div style={{ position: "absolute", right: -10, top: -10, fontSize: "clamp(80px,20vw,120px)", opacity: 0.07, lineHeight: 1, pointerEvents: "none", userSelect: "none" }}>
                {dnaType.emoji}
              </div>

              <div style={{ position: "relative" }}>
                <div style={{ marginBottom: 14 }}>
                  <span style={{
                    fontFamily: "var(--font-mona12)", fontSize: 12, fontWeight: 700,
                    color: dnaType.color, letterSpacing: "0.14em", textTransform: "uppercase",
                    background: `${dnaType.color}15`, border: `0.5px solid ${dnaType.color}35`,
                    borderRadius: 6, padding: "4px 10px",
                  }}>
                    {dnaType.modifier}
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "flex-end", gap: 16, marginBottom: 14, flexWrap: "wrap" }}>
                  <span style={{ fontSize: "clamp(48px,12vw,72px)", lineHeight: 1 }}>{dnaType.emoji}</span>
                  <div>
                    <p style={{ fontFamily: "var(--font-paperlogy)", fontWeight: 800, fontSize: "clamp(30px,8vw,48px)", color: "#e8e0d0", lineHeight: 1, marginBottom: 6 }}>
                      {dnaType.name}
                    </p>
                    <p style={{ fontSize: "clamp(14px,3vw,16px)", color: "#c8bfb0", lineHeight: 1.6, maxWidth: 360 }}>
                      {dnaType.tagline}
                    </p>
                  </div>
                </div>

                {/* R I T Y 4축 뱃지 */}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {[
                    { label: `R · ${dnaType.axisR === "HIGH" ? "도전형" : "안정형"}`,  color: "#f07878" },
                    { label: `I · ${dnaType.axisI === "HIGH" ? "분석형" : "감각형"}`,  color: "#7eb8f7" },
                    { label: `T · ${dnaType.axisT === "LONG"  ? "장기형" : "단기형"}`,  color: "#7ed4a0" },
                    { label: `Y · ${dnaType.axisY === "GROWTH"? "성장형" : "배당형"}`,  color: "#FACA3E" },
                  ].map(({ label, color }) => (
                    <span key={label} style={{
                      fontFamily: "var(--font-mona12)", fontSize: 13, fontWeight: 700,
                      padding: "5px 12px", borderRadius: 8,
                      background: `${color}15`, color,
                      border: `0.5px solid ${color}35`,
                    }}>
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* ── 투자 성향 요약 ── */}
            <div style={{ background: "#141414", border: "0.5px solid rgba(255,255,255,0.08)", borderRadius: 18, padding: "20px", marginBottom: 16 }}>
              <SectionHeader icon="🧬" label="투자 성향 분석" color="#e8e0d0" />
              <p style={{ fontSize: "clamp(14px,3vw,16px)", color: "#c8bfb0", lineHeight: 1.85 }}>{dnaType.desc}</p>
            </div>

            {/* ── A: 4축 스펙트럼 게이지 ── */}
            <div style={{ background: "#141414", border: "0.5px solid rgba(255,255,255,0.08)", borderRadius: 18, padding: "20px", marginBottom: 16 }}>
              {/* 헤더 + 자세히 보기 버튼 */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
                <Callout icon="📊" label="성향 스펙트럼" color="#c8bfb0" />
                <button
                  onClick={() => setShowAxisInfo(true)}
                  style={{
                    fontFamily: "var(--font-mona12)", fontSize: 12, fontWeight: 700,
                    color: "#FACA3E", background: "rgba(250,202,62,0.1)",
                    border: "0.5px solid rgba(250,202,62,0.3)",
                    borderRadius: 8, padding: "6px 10px",
                    cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
                  }}
                >
                  R I T Y 자세히 보기
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
                {(["R", "I", "T", "Y"] as const).map((ax) => {
                  const meta = AXIS_META[ax];
                  const pos = axisPositions?.[ax] ?? 50;
                  return (
                    <div key={ax}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 8 }}>
                        <span style={{ fontSize: 13, color: "#c8bfb0", flexShrink: 0 }}>{meta.leftLabel}</span>
                        <span style={{
                          fontFamily: "var(--font-mona12)", fontSize: 12, fontWeight: 700,
                          color: meta.color, background: `${meta.color}15`,
                          border: `0.5px solid ${meta.color}30`,
                          borderRadius: 6, padding: "3px 9px", whiteSpace: "nowrap",
                        }}>
                          {ax} · {meta.name}
                        </span>
                        <span style={{ fontSize: 13, color: "#c8bfb0", flexShrink: 0 }}>{meta.rightLabel}</span>
                      </div>
                      <SpectrumBar value={pos} color={meta.color} />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── B: 강점 & 심리 함정 ── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12, marginBottom: 16 }}>
              <div style={{ background: "rgba(126,212,160,0.05)", border: "0.5px solid rgba(126,212,160,0.2)", borderRadius: 18, padding: "20px" }}>
                <Callout icon="✨" label="강점" color="#7ed4a0" />
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {dnaType.strengths.map((s, i) => (
                    <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <div style={{
                        width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                        background: "rgba(126,212,160,0.15)", border: "0.5px solid rgba(126,212,160,0.3)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontFamily: "var(--font-mona12)", fontSize: 11, fontWeight: 700, color: "#7ed4a0",
                      }}>
                        {i + 1}
                      </div>
                      <p style={{ fontSize: 14, color: "#c8bfb0", lineHeight: 1.7, margin: 0 }}>{s}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ background: "rgba(240,120,120,0.05)", border: "0.5px solid rgba(240,120,120,0.2)", borderRadius: 18, padding: "20px" }}>
                <Callout icon="⚠️" label="심리 함정" color="#f07878" />
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {dnaType.traps.map((t, i) => (
                    <div key={i}>
                      {/* 행동경제학 이론명 — Mona12 콜아웃 */}
                      <div style={{
                        fontFamily: "var(--font-mona12)", fontSize: 13, fontWeight: 700,
                        color: "#f07878", marginBottom: 6,
                        background: "rgba(240,120,120,0.1)", borderRadius: 6,
                        padding: "4px 10px", display: "inline-block",
                      }}>
                        {t.name}
                      </div>
                      <p style={{ fontSize: 14, color: "#c8bfb0", lineHeight: 1.7, margin: 0 }}>{t.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── C: 닮은 투자 전략가 ── */}
            <div style={{ background: "#141414", border: `0.5px solid ${dnaType.color}25`, borderRadius: 18, padding: "20px", marginBottom: 16 }}>
              <Callout icon="🤝" label="닮은 투자 전략가" color={dnaType.color} />
              <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 16, flexShrink: 0,
                  background: `${dnaType.color}12`, border: `0.5px solid ${dnaType.color}30`,
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26,
                }}>
                  👤
                </div>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <p style={{ fontFamily: "var(--font-paperlogy)", fontWeight: 700, fontSize: "clamp(18px,4vw,22px)", color: "#e8e0d0", marginBottom: 6 }}>
                    {dnaType.famousInvestor.name}
                  </p>
                  <div style={{
                    fontFamily: "var(--font-mona12)", fontSize: 13, fontWeight: 700,
                    color: dnaType.color, marginBottom: 10,
                    display: "inline-block",
                    background: `${dnaType.color}12`, border: `0.5px solid ${dnaType.color}30`,
                    borderRadius: 6, padding: "3px 10px",
                  }}>
                    {dnaType.famousInvestor.role}
                  </div>
                  <p style={{ fontSize: 14, color: "#c8bfb0", lineHeight: 1.75, margin: 0 }}>
                    {renderText(dnaType.famousInvestor.overlap)}
                  </p>
                </div>
              </div>
            </div>

            {/* ── D: 시장 상황별 패턴 ── */}
            <div style={{ background: "#141414", border: "0.5px solid rgba(255,255,255,0.08)", borderRadius: 18, padding: "20px", marginBottom: 16 }}>
              <Callout icon="📈" label="시장 상황별 내 패턴" color="#e8e0d0" />
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  { icon: "🚀", label: "상승장", text: dnaType.marketPatterns.bull, color: "#7ed4a0" },
                  { icon: "📉", label: "하락장", text: dnaType.marketPatterns.bear, color: "#f07878" },
                  { icon: "↔️", label: "횡보장", text: dnaType.marketPatterns.side, color: "#7eb8f7" },
                ].map(({ icon, label, text, color }) => (
                  <div key={label} style={{
                    background: `${color}06`, border: `0.5px solid ${color}25`,
                    borderRadius: 14, padding: "14px 16px",
                    display: "flex", gap: 12, alignItems: "flex-start",
                  }}>
                    <span style={{ fontSize: 20, flexShrink: 0 }}>{icon}</span>
                    <div>
                      <div style={{ fontFamily: "var(--font-mona12)", fontSize: 13, fontWeight: 700, color, marginBottom: 6 }}>
                        {label}
                      </div>
                      <p style={{ fontSize: 14, color: "#c8bfb0", lineHeight: 1.75, margin: 0 }}>{text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── E: 성장 미션 ── */}
            <div style={{ background: "rgba(250,202,62,0.04)", border: "0.5px solid rgba(250,202,62,0.2)", borderRadius: 18, padding: "20px", marginBottom: 16 }}>
              <Callout icon="🎯" label="성장 미션" color="#FACA3E" />
              {/* Mona12 콜아웃 블록 — 핵심 행동 유도 */}
              <div style={{
                fontFamily: "var(--font-mona12)", fontSize: 14, fontWeight: 700,
                color: "#FACA3E", background: "rgba(250,202,62,0.08)",
                border: "0.5px solid rgba(250,202,62,0.2)",
                borderRadius: 10, padding: "10px 14px", marginBottom: 16,
              }}>
                💡 이 유형의 약점을 보완하는 행동 과제예요. 하나씩 실천해보세요.
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {dnaType.growthMissions.map((mission, i) => (
                  <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                      background: "rgba(250,202,62,0.12)", border: "0.5px solid rgba(250,202,62,0.3)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontFamily: "var(--font-mona12)", fontSize: 13, fontWeight: 700, color: "#FACA3E",
                    }}>
                      {i + 1}
                    </div>
                    <p style={{ fontSize: 14, color: "#e8e0d0", lineHeight: 1.7, margin: 0, paddingTop: 4 }}>{mission}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* ── 자산 배분 + 추천 종목 ── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12, marginBottom: 16 }}>
              <div style={{ background: "#141414", border: "0.5px solid rgba(255,255,255,0.08)", borderRadius: 18, padding: "20px" }}>
                <SectionHeader icon="🏦" label="적정 자산 배분" />
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {dnaType.allocation.map((item) => (
                    <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 12, borderBottom: "0.5px solid rgba(255,255,255,0.06)" }}>
                      <span style={{ fontSize: 15, fontWeight: 600, color: "#e8e0d0" }}>{item.label}</span>
                      <span style={{ fontFamily: "var(--font-mona12)", fontSize: 16, fontWeight: 700, color: dnaType.color }}>{item.pct}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ background: "#141414", border: "0.5px solid rgba(255,255,255,0.08)", borderRadius: 18, padding: "20px" }}>
                <SectionHeader icon="📋" label="추천 종목 스타일" />
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {dnaType.recommended.map((r) => (
                    <div key={r.label} style={{ paddingBottom: 12, borderBottom: "0.5px solid rgba(255,255,255,0.06)" }}>
                      <div style={{
                        fontFamily: "var(--font-mona12)", fontSize: 12, fontWeight: 700,
                        color: dnaType.color, marginBottom: 5,
                        textTransform: "uppercase", letterSpacing: "0.06em",
                      }}>
                        {r.label}
                      </div>
                      <p style={{ fontSize: 14, color: "#c8bfb0", lineHeight: 1.6, margin: 0 }}>{r.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── 위험 신호 ── */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
              {dnaType.guards.map((g) => (
                <div key={g.title} style={{
                  background: "rgba(240,120,120,0.05)", border: "0.5px solid rgba(240,120,120,0.22)",
                  borderRadius: 16, padding: "16px 18px",
                }}>
                  <p style={{ fontFamily: "var(--font-paperlogy)", fontSize: 15, fontWeight: 700, color: "#f07878", marginBottom: 6 }}>
                    🚨 {g.title}
                  </p>
                  <p style={{ fontSize: 14, color: "#c8bfb0", lineHeight: 1.75 }}>{g.desc}</p>
                </div>
              ))}
            </div>

            {/* ── 공유 + 다시하기 ── */}
            <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
              <button onClick={share} className="pico-btn"
                style={{ flex: 1, padding: "16px 0", borderRadius: 16, background: "#FACA3E", color: "#0d0d0d", fontSize: 16, fontWeight: 700, border: "none", fontFamily: "var(--font-paperlogy)" }}>
                {copied ? "링크 복사됨 ✓" : "🔗 결과 공유하기"}
              </button>
              <Link href="/quiz" className="pico-btn"
                style={{ padding: "16px 20px", borderRadius: 16, background: "transparent", color: "#c8bfb0", border: "0.5px solid rgba(255,255,255,0.12)", fontSize: 15, textDecoration: "none", whiteSpace: "nowrap", display: "flex", alignItems: "center", fontWeight: 500 }}>
                다시 테스트
              </Link>
            </div>

            {/* ── 모든 유형 보기 ── */}
            <button onClick={() => setShowAllTypes(v => !v)} className="pico-btn w-full"
              style={{ padding: "14px 0", borderRadius: 16, background: "transparent", color: "#c8bfb0", border: "0.5px solid rgba(255,255,255,0.1)", fontSize: 15, marginBottom: 16 }}>
              {showAllTypes ? "접기" : "모든 투자자 유형 보기 (8가지)"}
            </button>

            {showAllTypes && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12, marginBottom: 32 }}>
                {TYPE_KEYS.map((key) => {
                  const t = INVESTOR_TYPES[key];
                  const isMe = key === userRow.investor_type;
                  return (
                    <div key={key} style={{
                      background: isMe ? `${t.color}0d` : "#141414",
                      border: `0.5px solid ${isMe ? t.color + "45" : "rgba(255,255,255,0.06)"}`,
                      borderRadius: 18, padding: "18px",
                      display: "flex", alignItems: "flex-start", gap: 14,
                      position: "relative",
                    }}>
                      {isMe && (
                        <div style={{
                          position: "absolute", top: 12, right: 12,
                          fontFamily: "var(--font-mona12)", fontSize: 11, fontWeight: 700,
                          color: t.color, background: `${t.color}18`,
                          padding: "3px 8px", borderRadius: 5,
                        }}>
                          나
                        </div>
                      )}
                      <span style={{ fontSize: 38, flexShrink: 0, lineHeight: 1 }}>{t.emoji}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontFamily: "var(--font-mona12)", fontSize: 11, fontWeight: 700,
                          color: t.color, marginBottom: 4, letterSpacing: "0.08em", textTransform: "uppercase",
                        }}>
                          {t.modifier}
                        </div>
                        <p style={{ fontFamily: "var(--font-paperlogy)", fontWeight: 700, fontSize: 18, color: "#e8e0d0", marginBottom: 5 }}>{t.name}</p>
                        <p style={{ fontSize: 14, color: "#c8bfb0", lineHeight: 1.5 }}>{t.tagline}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          /* ── 미완료 상태 ── */
          <div style={{ background: "#141414", border: "0.5px solid rgba(255,255,255,0.08)", borderRadius: 24, padding: "clamp(40px,8vw,64px) 24px", textAlign: "center" }}>
            <p style={{ fontSize: 52, marginBottom: 20 }}>🧬</p>
            <p style={{ fontFamily: "var(--font-paperlogy)", fontWeight: 800, fontSize: "clamp(22px,5vw,28px)", color: "#e8e0d0", marginBottom: 10 }}>
              아직 투자 DNA를 모르고 있어요
            </p>
            <p style={{ fontSize: 15, color: "#c8bfb0", marginBottom: 8, lineHeight: 1.7 }}>
              18문항으로 나만의 투자 유형을 찾아보세요.
            </p>
            <p style={{ fontSize: 14, color: "#c8bfb0", marginBottom: 32, lineHeight: 1.7 }}>
              행동경제학 기반 · 4가지 독립 축 · 약 3분
            </p>
            <Link href="/quiz"
              style={{ display: "inline-block", background: "#FACA3E", color: "#0d0d0d", fontFamily: "var(--font-paperlogy)", fontSize: 16, fontWeight: 700, padding: "16px 40px", borderRadius: 16, textDecoration: "none" }}>
              투자 DNA 테스트 시작하기
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
