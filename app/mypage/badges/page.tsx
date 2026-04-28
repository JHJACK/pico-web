"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/lib/authContext";
import { supabase } from "@/app/lib/supabase";
import { BackIcon } from "@/app/components/BackIcon";

type BadgeRow = {
  category: string;
  week_start: string;
  earned_at: string;
};

const C = {
  bg:     "#0d0d0d",
  card:   "#141414",
  text:   "#e8e0d0",
  text2:  "#c8bfb0",
  gold:   "#FACA3E",
  border: "rgba(255,255,255,0.07)",
} as const;

const BADGE_META: Record<string, {
  emoji: string; title: string; subtitle: string;
  color: string; cat: string; desc: string;
}> = {
  // ── 모의투자 퍼포먼스 (13종) ─────────────────────────────────────────────────
  sniper:      { emoji: "🎯", title: "여의도 스나이퍼",  subtitle: "단 한 방으로 시장을 뚫은 자",      color: "#FACA3E", cat: "invest", desc: "거래 횟수는 적지만, 단 한 번의 매수로 압도적 수익률을 기록했어요." },
  frog:        { emoji: "🐸", title: "역발상의 천재",    subtitle: "시장이 이 유저를 거부 중",          color: "#7ed4a0", cat: "invest", desc: "모든 투자 종목이 손실이었어요. 하지만 이걸 받은 사람과 반대로 투자하면 부자가 된다는 전설이..." },
  hodl:        { emoji: "🗿", title: "존버의 신",        subtitle: "흔들림 없이 버텨낸 의지",           color: "#a0b8f0", cat: "invest", desc: "이번 주 단 한 번도 팔지 않았어요. 복리의 화신." },
  daytrader:   { emoji: "⚡", title: "단타의 귀재",      subtitle: "이번 주 가장 바쁘게 살았던 투자자", color: "#f0c060", cat: "invest", desc: "일평균 거래 횟수가 가장 많았어요. 손가락이 쉬질 않는 타입." },
  mentalsteel: { emoji: "🧊", title: "냉철한 멘탈",      subtitle: "단 한 번의 손실도 없이 수익만",     color: "#b8e0f8", cat: "invest", desc: "이번 주 모든 거래가 수익이었어요. 흔들리지 않는 멘탈의 소유자." },
  lucky:       { emoji: "🎲", title: "행운의 여신",      subtitle: "첫 투자부터 대박을 터뜨린 자",      color: "#f0a0e0", cat: "invest", desc: "첫 매수 종목에서 +10% 이상 수익을 냈어요. 운도 실력이라는 말이 딱 맞는 투자자." },
  spinner:     { emoji: "🔄", title: "회전왕",           subtitle: "돈이 쉬질 않는 타입",               color: "#80d8f0", cat: "invest", desc: "하루에 3회 이상 매도 후 재투자를 반복했어요. 포트폴리오가 쉬지 않아요." },
  dip:         { emoji: "📉", title: "바닥 사냥꾼",      subtitle: "공포에 사는 자",                    color: "#f0a060", cat: "invest", desc: "하락 중인 종목을 매수해 결국 수익을 냈어요. 역발상 투자의 진정한 고수." },
  rocket:      { emoji: "🚀", title: "로켓 탑승자",      subtitle: "타이밍이 전부다",                   color: "#c0a0f8", cat: "invest", desc: "급등 종목에서 +15% 이상 수익 실현. 로켓이 발사되기 전에 탑승했어요." },
  whale:       { emoji: "🐋", title: "큰손",             subtitle: "몰빵의 미학",                       color: "#4090e8", cat: "invest", desc: "보유 포인트의 80% 이상을 단일 종목에 투자했어요. 배짱 하나는 최고." },
  surfer:      { emoji: "🌊", title: "파도타기",          subtitle: "물 흐르듯 자연스럽게",              color: "#40c8d0", cat: "invest", desc: "이번 주 매도한 모든 종목에서 수익을 냈어요 (3종목 이상). 시장의 흐름을 탔어요." },
  allin:       { emoji: "🎰", title: "올인",             subtitle: "전부 걸었다",                       color: "#f07060", cat: "invest", desc: "보유 포인트 100%를 투자 상태로 만들었어요. 배짱 만점 투자자." },
  jungle:      { emoji: "🦁", title: "정글의 왕",         subtitle: "수익률 정상에 서다",                color: "#f0c020", cat: "invest", desc: "주간 모의투자 수익률 전체 1위를 달성했어요. 시장의 진정한 왕." },

  // ── 배틀 챔피언 (3종) ────────────────────────────────────────────────────────
  battlefirst: { emoji: "🏹", title: "첫 예측",          subtitle: "배틀의 문을 연 자",                 color: "#f09060", cat: "battle", desc: "처음으로 오늘의 선택에 참여했어요. 예측의 여정이 시작됐어요." },
  prophet:     { emoji: "🔮", title: "예언자",            subtitle: "7일의 미래를 봤다",                 color: "#c080f8", cat: "battle", desc: "배틀 7일 연속 정답. 시장의 흐름을 읽는 눈이 생겼어요." },
  odds:        { emoji: "🧮", title: "확률의 지배자",     subtitle: "숫자가 그를 따른다",                color: "#60d0a0", cat: "battle", desc: "이번 달 정답률 70% 이상 달성 (15회 이상 참여). 확률을 내 편으로 만들었어요." },

  // ── 출석 & 지속성 (3종) ──────────────────────────────────────────────────────
  sprout:      { emoji: "🌱", title: "새싹",             subtitle: "여정이 시작되었다",                 color: "#80d060", cat: "attend", desc: "처음으로 PICO에 출석했어요. 위대한 여정의 첫 발걸음." },
  flame:       { emoji: "🔥", title: "불꽃 의지",         subtitle: "7일을 버텨낸 자",                   color: "#f08040", cat: "attend", desc: "7일 연속으로 출석했어요. 흔들리지 않는 의지의 소유자." },
  diamond:     { emoji: "💎", title: "다이아 의지",       subtitle: "30일의 전설",                       color: "#80e8f8", cat: "attend", desc: "30일 연속 출석이라는 위업을 달성했어요. 전설의 시작." },

  // ── 지식 & 마일스톤 (4종) ────────────────────────────────────────────────────
  scholar:     { emoji: "📖", title: "용어 학자",         subtitle: "지식은 힘이다",                     color: "#d0a060", cat: "knowledge", desc: "투자 용어 10개를 수집했어요. 지식이 투자의 기반이에요." },
  yoidodao:    { emoji: "🏛️", title: "여의도 학자",       subtitle: "완전 정복",                         color: "#e0c080", cat: "knowledge", desc: "투자 용어 30개를 수집했어요. 진정한 여의도 학자의 경지." },
  pointrich:   { emoji: "💰", title: "포인트 부자",        subtitle: "1만P의 사나이",                     color: "#f0d040", cat: "knowledge", desc: "누적 포인트 10,000P를 달성했어요. 노력의 결실이에요." },
  collector:   { emoji: "👑", title: "도감왕",             subtitle: "모든 것을 가진 자",                 color: "#f0a020", cat: "knowledge", desc: "모든 뱃지를 수집했어요. PICO의 진정한 레전드." },
};

const TABS = [
  { id: "all",       label: "전체",    emoji: "✨" },
  { id: "invest",    label: "모의투자", emoji: "💹" },
  { id: "battle",    label: "배틀",    emoji: "⚔️" },
  { id: "attend",    label: "출석",    emoji: "📅" },
  { id: "knowledge", label: "지식",    emoji: "📚" },
];

const SECTIONS = [
  { id: "invest",    label: "모의투자 퍼포먼스", emoji: "💹" },
  { id: "battle",    label: "배틀 챔피언",       emoji: "⚔️" },
  { id: "attend",    label: "출석 & 지속성",     emoji: "📅" },
  { id: "knowledge", label: "지식 & 마일스톤",   emoji: "📚" },
];

const BADGES_BY_CAT: Record<string, string[]> = {
  invest:    ["sniper", "frog", "hodl", "daytrader", "mentalsteel", "lucky", "spinner", "dip", "rocket", "whale", "surfer", "allin", "jungle"],
  battle:    ["battlefirst", "prophet", "odds"],
  attend:    ["sprout", "flame", "diamond"],
  knowledge: ["scholar", "yoidodao", "pointrich", "collector"],
};

const ALL_BADGE_KEYS = SECTIONS.flatMap(s => BADGES_BY_CAT[s.id]);

export default function BadgesPage() {
  const { user, userRow, loading, refreshUserRow } = useAuth();
  const router = useRouter();

  const [badges,    setBadges]    = useState<BadgeRow[]>([]);
  const [fetching,  setFetching]  = useState(true);
  const [selected,  setSelected]  = useState<string | null>(null);
  const [equipping, setEquipping] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  const equippedTitle = userRow?.equipped_title ?? null;

  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setFetching(true);
      const { data, error } = await supabase
        .from("user_badges")
        .select("category, week_start, earned_at")
        .eq("user_id", user.id)
        .order("earned_at", { ascending: false });
      if (!error) setBadges((data ?? []) as BadgeRow[]);
      setFetching(false);
    })();
  }, [user]);

  async function handleEquip(category: string) {
    if (!user || equipping) return;
    const next = equippedTitle === category ? null : category;
    setEquipping(true);
    const { error } = await supabase
      .from("users")
      .update({ equipped_title: next })
      .eq("id", user.id);
    if (!error) await refreshUserRow();
    setEquipping(false);
  }

  const ownedSet   = new Set(badges.map(b => b.category));
  const totalOwned = ownedSet.size;
  const totalAll   = ALL_BADGE_KEYS.length;

  const visibleKeys = activeTab === "all"
    ? ALL_BADGE_KEYS
    : BADGES_BY_CAT[activeTab] ?? [];

  return (
    <main style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "var(--font-paperlogy), var(--font-noto), sans-serif" }}>
      <style>{`
        .badge-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
        @media (min-width: 768px) { .badge-grid { grid-template-columns: repeat(4, 1fr); } }
      `}</style>

      {/* 헤더 */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 30, height: 56,
        background: "rgba(13,13,13,0.96)", backdropFilter: "blur(20px)",
        borderBottom: `0.5px solid ${C.border}`,
        display: "flex", alignItems: "center", padding: "0 20px",
      }}>
        <Link href="/mypage" style={{ textDecoration: "none" }}><BackIcon /></Link>
      </nav>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "20px clamp(16px,4vw,24px) 52px" }}>

        {/* 페이지 타이틀 */}
        <div style={{ marginBottom: 22 }}>
          <p style={{ fontFamily: "var(--font-mona12)", fontSize: 13, fontWeight: 700, color: C.gold, marginBottom: 6, letterSpacing: "0.06em" }}>
            BADGE
          </p>
          <h1 style={{ fontFamily: "var(--font-paperlogy)", fontSize: 26, fontWeight: 700, color: C.text, margin: "0 0 5px", letterSpacing: "-0.02em" }}>
            뱃지
          </h1>
          <p style={{ fontSize: 14, fontWeight: 300, color: C.text2, margin: 0 }}>
            나만의 수식어를 수집하고 착용해보세요
          </p>
        </div>

        {/* 진행 현황 카드 */}
        <div style={{
          background: C.card, borderRadius: 20, padding: "18px 22px",
          border: `0.5px solid ${C.border}`, marginBottom: 20,
          display: "flex", alignItems: "center", gap: 16,
        }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 14, fontWeight: 400, color: C.text2, marginBottom: 6 }}>
              {equippedTitle && BADGE_META[equippedTitle]
                ? <>착용 중&ensp;·&ensp;<span style={{ color: BADGE_META[equippedTitle].color, fontWeight: 600 }}>{BADGE_META[equippedTitle].title}</span></>
                : "착용 중인 수식어 없음"}
            </p>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <span style={{ fontFamily: "var(--font-mona12)", fontSize: 30, fontWeight: 700, color: C.gold, letterSpacing: "-0.03em" }}>
                {fetching ? "—" : totalOwned}
              </span>
              <span style={{ fontSize: 14, fontWeight: 400, color: C.text2 }}>/ {totalAll} 수집</span>
            </div>
            <div style={{ height: 3, borderRadius: 2, background: "rgba(255,255,255,0.06)", marginTop: 8, overflow: "hidden" }}>
              <div style={{
                height: "100%",
                width: fetching ? "0%" : `${(totalOwned / totalAll) * 100}%`,
                background: C.gold, borderRadius: 2,
                transition: "width 0.5s ease",
              }} />
            </div>
          </div>
          <span style={{ fontFamily: "var(--font-mona12-emoji)", fontSize: 38, lineHeight: 1 }}>🏅</span>
        </div>

        {/* 카테고리 탭 */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20, overflowX: "auto", paddingBottom: 2 }}>
          {TABS.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setSelected(null); }}
                style={{
                  flexShrink: 0,
                  padding: "7px 14px", borderRadius: 20,
                  fontFamily: "var(--font-mona12)", fontSize: 13, fontWeight: 700,
                  background: isActive ? C.gold : "rgba(255,255,255,0.05)",
                  border: `0.5px solid ${isActive ? C.gold : C.border}`,
                  color: isActive ? "#0d0d0d" : C.text2,
                  cursor: "pointer", transition: "all 0.15s",
                  display: "flex", alignItems: "center", gap: 5,
                }}
              >
                <span style={{ fontFamily: "var(--font-mona12-emoji)", fontSize: 14 }}>{tab.emoji}</span>
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* 전체 탭: 섹션별 / 개별 탭: 그리드 바로 */}
        {activeTab === "all" ? (
          SECTIONS.map(section => (
            <div key={section.id} style={{ marginBottom: 28 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, paddingLeft: 2 }}>
                <span style={{ fontFamily: "var(--font-mona12-emoji)", fontSize: 18 }}>{section.emoji}</span>
                <span style={{ fontFamily: "var(--font-mona12)", fontSize: 15, fontWeight: 700, color: C.text2 }}>
                  {section.label}
                </span>
              </div>
              <BadgeGrid
                keys={BADGES_BY_CAT[section.id]}
                ownedSet={ownedSet}
                equippedTitle={equippedTitle}
                selected={selected}
                equipping={equipping}
                onSelect={setSelected}
                onEquip={handleEquip}
              />
            </div>
          ))
        ) : (
          <BadgeGrid
            keys={visibleKeys}
            ownedSet={ownedSet}
            equippedTitle={equippedTitle}
            selected={selected}
            equipping={equipping}
            onSelect={setSelected}
            onEquip={handleEquip}
          />
        )}

        {fetching && (
          <div style={{ textAlign: "center", padding: "40px 0", color: C.text2, fontSize: 15 }}>
            불러오는 중...
          </div>
        )}
      </div>
    </main>
  );
}

function BadgeGrid({
  keys, ownedSet, equippedTitle, selected, equipping, onSelect, onEquip,
}: {
  keys: string[];
  ownedSet: Set<string>;
  equippedTitle: string | null;
  selected: string | null;
  equipping: boolean;
  onSelect: (k: string | null) => void;
  onEquip: (k: string) => void;
}) {
  return (
    <div className="badge-grid">
      {keys.map(key => {
        const meta       = BADGE_META[key];
        const isOwned    = ownedSet.has(key);
        const isEquipped = equippedTitle === key;
        const isSelected = selected === key;

        return (
          <button
            key={key}
            onClick={() => onSelect(isSelected ? null : key)}
            style={{
              background: isOwned
                ? `linear-gradient(135deg, ${meta.color}12 0%, rgba(13,13,13,0) 100%)`
                : "rgba(255,255,255,0.02)",
              border: `0.5px solid ${
                isEquipped ? meta.color + "80" :
                isSelected ? meta.color + "55" :
                isOwned    ? meta.color + "28" :
                             "rgba(255,255,255,0.05)"
              }`,
              borderRadius: 18,
              padding: isSelected ? "16px 14px 14px" : "18px 14px 16px",
              cursor: "pointer", textAlign: "center",
              opacity: isOwned ? 1 : 0.4,
              transition: "all 0.2s",
              boxShadow: isEquipped
                ? `0 0 0 2px ${meta.color}40, 0 0 20px ${meta.color}15`
                : isSelected
                ? `0 0 0 1px ${meta.color}35`
                : "none",
              position: "relative",
              display: "flex", flexDirection: "column", alignItems: "center",
            }}
          >
            {/* 착용 중 태그 */}
            {isEquipped && (
              <div style={{
                position: "absolute", top: 8, right: 8,
                background: meta.color, color: "#0d0d0d",
                fontSize: 9, fontWeight: 700, borderRadius: 4,
                padding: "2px 6px", letterSpacing: "0.02em",
                fontFamily: "var(--font-mona12)",
              }}>
                착용 중
              </div>
            )}

            {/* 이모지 */}
            <span style={{
              fontFamily: "var(--font-mona12-emoji)",
              fontSize: 36, lineHeight: 1, display: "block",
              marginBottom: 10,
              filter: isOwned ? "none" : "grayscale(1)",
            }}>
              {meta.emoji}
            </span>

            {/* 타이틀 */}
            <div style={{
              fontFamily: "var(--font-paperlogy)", fontSize: 13, fontWeight: 600,
              color: isOwned ? meta.color : C.text2,
              marginBottom: 4, lineHeight: 1.3,
            }}>
              {meta.title}
            </div>

            {/* 수식어 */}
            <div style={{ fontSize: 11, color: C.text2, lineHeight: 1.3, marginBottom: 10 }}>
              {meta.subtitle}
            </div>

            {/* 획득 여부 */}
            <div>
              {isOwned ? (
                <span style={{
                  fontSize: 11, fontFamily: "var(--font-mona12)",
                  background: `${meta.color}20`, color: meta.color,
                  borderRadius: 5, padding: "2px 8px", fontWeight: 700,
                }}>
                  획득
                </span>
              ) : (
                <span style={{ fontSize: 11, fontFamily: "var(--font-mona12)", color: C.text2 }}>미획득</span>
              )}
            </div>

            {/* 선택 시 확장: 설명 + 착용/해제 버튼 */}
            {isSelected && (
              <div style={{
                width: "100%", marginTop: 12,
                borderTop: `0.5px solid ${meta.color}20`,
                paddingTop: 12,
              }}>
                <p style={{
                  fontSize: 11, color: C.text2, lineHeight: 1.65,
                  margin: "0 0 10px", textAlign: "left",
                }}>
                  {meta.desc}
                </p>
                {isOwned && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onEquip(key); }}
                    disabled={equipping}
                    style={{
                      width: "100%", padding: "8px 0", borderRadius: 10,
                      fontFamily: "var(--font-mona12)", fontSize: 12, fontWeight: 700,
                      background: isEquipped ? "rgba(240,112,112,0.14)" : `${meta.color}20`,
                      border: `0.5px solid ${isEquipped ? "rgba(240,112,112,0.45)" : meta.color + "55"}`,
                      color: isEquipped ? "#f07878" : meta.color,
                      cursor: equipping ? "default" : "pointer",
                      opacity: equipping ? 0.6 : 1,
                      transition: "all 0.15s",
                    }}
                  >
                    {equipping ? "..." : isEquipped ? "해제하기" : "착용하기"}
                  </button>
                )}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
