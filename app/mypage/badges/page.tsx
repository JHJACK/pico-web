"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/lib/authContext";
import { supabase } from "@/app/lib/supabase";

type BadgeRow = {
  category: string;
  week_start: string;
  earned_at: string;
};

const BADGE_META: Record<string, { emoji: string; title: string; subtitle: string; color: string; desc: string }> = {
  sniper:      { emoji: "🎯", title: "여의도 스나이퍼",  subtitle: "단 한 방으로 시장을 뚫은 자",          color: "#FACA3E", desc: "거래 횟수는 적지만, 단 한 번의 매수로 압도적 수익률을 기록했어요." },
  frog:        { emoji: "🐸", title: "역발상의 천재",    subtitle: "시장이 이 유저를 거부 중",              color: "#7ed4a0", desc: "모든 투자 종목이 손실이었어요. 하지만 이걸 받은 사람과 반대로 투자하면 부자가 된다는 전설이..." },
  hodl:        { emoji: "🗿", title: "존버의 신",        subtitle: "흔들림 없이 버텨낸 의지",               color: "#a0b8f0", desc: "이번 주 단 한 번도 팔지 않았어요. 복리의 화신." },
  daytrader:   { emoji: "⚡️", title: "단타의 귀재",     subtitle: "이번 주 가장 바쁘게 살았던 투자자",     color: "#f0c060", desc: "일평균 거래 횟수가 가장 많았어요. 손가락이 쉬질 않는 타입." },
  mentalsteel: { emoji: "🧊", title: "냉철한 멘탈",      subtitle: "단 한 번의 손실도 없이 수익만",         color: "#b8e0f8", desc: "이번 주 모든 거래가 수익이었어요. 흔들리지 않는 멘탈의 소유자." },
};

const ALL_CATEGORIES = ["sniper", "frog", "hodl", "daytrader", "mentalsteel"];

function weekLabel(week: string): string {
  const [y, m, d] = week.split("-");
  return `${y}년 ${parseInt(m)}월 ${parseInt(d)}일 주`;
}

export default function BadgesPage() {
  const { user, userRow, loading, refreshUserRow } = useAuth();
  const router = useRouter();

  const [badges,       setBadges]       = useState<BadgeRow[]>([]);
  const [fetching,     setFetching]     = useState(true);
  const [selected,     setSelected]     = useState<string | null>(null);
  const [equipping,    setEquipping]    = useState(false);

  // 현재 착용 중인 수식어 (userRow에서 가져옴)
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
    const next = equippedTitle === category ? null : category; // 이미 착용 중이면 해제
    setEquipping(true);
    const { error } = await supabase
      .from("users")
      .update({ equipped_title: next })
      .eq("id", user.id);
    if (!error) await refreshUserRow();
    setEquipping(false);
  }

  const countMap: Record<string, number> = {};
  for (const b of badges) {
    countMap[b.category] = (countMap[b.category] ?? 0) + 1;
  }
  const totalEarned = Object.keys(countMap).length;

  return (
    <main style={{ minHeight: "100vh", background: "#0d0d0d", color: "#e8e0d0", fontFamily: "var(--font-paperlogy), var(--font-noto), sans-serif" }}>
      <nav style={{
        position: "sticky", top: 0, zIndex: 30, height: 56,
        background: "rgba(13,13,13,0.96)", backdropFilter: "blur(20px)",
        borderBottom: "0.5px solid rgba(255,255,255,0.06)",
        display: "flex", alignItems: "center", padding: "0 20px", gap: 16,
      }}>
        <button onClick={() => router.back()} style={{ background: "none", border: "none", color: "#c8bfb0", fontSize: 20, cursor: "pointer", lineHeight: 1 }}>&lt;</button>
        <span style={{ fontFamily: "var(--font-serif)", fontSize: 20, color: "#FACA3E" }}>PICO</span>
      </nav>

      <div style={{ maxWidth: 480, margin: "0 auto", padding: "0 16px 80px" }}>

        {/* 타이틀 */}
        <div style={{ padding: "28px 0 24px", textAlign: "center" }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, marginBottom: 8, fontFamily: "var(--font-paperlogy)" }}>🎖️ 뱃지 도감</h1>
          <p style={{ fontSize: 13, color: "#c8bfb0" }}>
            {totalEarned > 0 ? `총 ${totalEarned}종 획득 · 전체 ${ALL_CATEGORIES.length}종` : "아직 획득한 뱃지가 없어요"}
          </p>
          <div style={{ margin: "12px auto 0", maxWidth: 200, height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2 }}>
            <div style={{ height: "100%", width: `${(totalEarned / ALL_CATEGORIES.length) * 100}%`, background: "#FACA3E", borderRadius: 2, transition: "width 0.5s" }} />
          </div>
        </div>

        {/* 현재 착용 중인 수식어 */}
        {equippedTitle && BADGE_META[equippedTitle] && (
          <div style={{
            marginBottom: 20, padding: "14px 18px",
            background: `linear-gradient(135deg, ${BADGE_META[equippedTitle].color}14 0%, rgba(13,13,13,0) 100%)`,
            border: `0.5px solid ${BADGE_META[equippedTitle].color}40`,
            borderRadius: 16,
            display: "flex", alignItems: "center", gap: 12,
          }}>
            <span style={{ fontSize: 28 }}>{BADGE_META[equippedTitle].emoji}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: "#c8bfb0", marginBottom: 2 }}>현재 착용 중인 수식어</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: BADGE_META[equippedTitle].color }}>
                {BADGE_META[equippedTitle].title}
              </div>
            </div>
            <button
              onClick={() => handleEquip(equippedTitle)}
              disabled={equipping}
              style={{
                padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                background: "rgba(240,112,112,0.12)",
                border: "0.5px solid rgba(240,112,112,0.3)",
                color: "#f07878", cursor: equipping ? "default" : "pointer",
                opacity: equipping ? 0.5 : 1,
              }}
            >
              해제
            </button>
          </div>
        )}

        {/* 도감 그리드 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {ALL_CATEGORIES.map((cat) => {
            const meta     = BADGE_META[cat];
            const earned   = countMap[cat] ?? 0;
            const isOwned  = earned > 0;
            const isEquipped = equippedTitle === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelected(selected === cat ? null : cat)}
                style={{
                  background: isOwned
                    ? `linear-gradient(135deg, ${meta.color}14 0%, rgba(13,13,13,0) 100%)`
                    : "rgba(255,255,255,0.02)",
                  border: `0.5px solid ${isEquipped ? meta.color + "80" : isOwned ? meta.color + "30" : "rgba(255,255,255,0.05)"}`,
                  borderRadius: 16, padding: "20px 16px",
                  cursor: "pointer", textAlign: "center",
                  opacity: isOwned ? 1 : 0.4,
                  transition: "all 0.2s",
                  boxShadow: isEquipped
                    ? `0 0 0 2px ${meta.color}50, 0 0 16px ${meta.color}20`
                    : selected === cat ? `0 0 0 1.5px ${meta.color}60` : "none",
                  position: "relative",
                }}
              >
                {/* 착용 중 뱃지 */}
                {isEquipped && (
                  <div style={{
                    position: "absolute", top: 8, right: 8,
                    background: meta.color, color: "#0d0d0d",
                    fontSize: 9, fontWeight: 700, borderRadius: 4,
                    padding: "2px 6px", letterSpacing: "0.02em",
                  }}>
                    착용 중
                  </div>
                )}
                <div style={{ fontSize: 36, marginBottom: 10, filter: isOwned ? "none" : "grayscale(1)" }}>
                  {meta.emoji}
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: isOwned ? meta.color : "#c8bfb0", marginBottom: 4 }}>
                  {meta.title}
                </div>
                <div style={{ fontSize: 11, color: "#c8bfb0" }}>{meta.subtitle}</div>
                <div style={{ marginTop: 10 }}>
                  {isOwned ? (
                    <span style={{ fontSize: 11, background: `${meta.color}20`, color: meta.color, borderRadius: 6, padding: "2px 10px", fontWeight: 600 }}>
                      {earned}회 획득
                    </span>
                  ) : (
                    <span style={{ fontSize: 11, color: "#c8bfb0" }}>미획득</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* 선택된 뱃지 상세 + 착용 버튼 */}
        {selected && (() => {
          const meta    = BADGE_META[selected];
          const history = badges.filter(b => b.category === selected);
          const isOwned = (countMap[selected] ?? 0) > 0;
          const isEquipped = equippedTitle === selected;
          return (
            <div style={{
              marginTop: 20,
              background: `linear-gradient(135deg, ${meta.color}10 0%, rgba(13,13,13,0) 100%)`,
              border: `0.5px solid ${meta.color}30`, borderRadius: 20, padding: "20px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <span style={{ fontSize: 32 }}>{meta.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 600, color: meta.color }}>{meta.title}</div>
                  <div style={{ fontSize: 12, color: "#c8bfb0", marginTop: 2 }}>{meta.subtitle}</div>
                </div>
                {/* 착용 / 해제 버튼 */}
                {isOwned && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleEquip(selected); }}
                    disabled={equipping}
                    style={{
                      padding: "8px 18px", borderRadius: 10, fontSize: 13, fontWeight: 700,
                      background: isEquipped
                        ? "rgba(240,112,112,0.12)"
                        : `${meta.color}20`,
                      border: `0.5px solid ${isEquipped ? "rgba(240,112,112,0.4)" : meta.color + "50"}`,
                      color: isEquipped ? "#f07878" : meta.color,
                      cursor: equipping ? "default" : "pointer",
                      opacity: equipping ? 0.6 : 1,
                      transition: "all 0.15s",
                      flexShrink: 0,
                    }}
                  >
                    {equipping ? "..." : isEquipped ? "해제하기" : "착용하기"}
                  </button>
                )}
              </div>
              <p style={{ fontSize: 13, color: "#c8bfb0", lineHeight: 1.6, marginBottom: 16 }}>{meta.desc}</p>

              {history.length > 0 ? (
                <>
                  <div style={{ fontSize: 12, color: "#c8bfb0", marginBottom: 8 }}>획득 기록</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {history.map((h, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#c8bfb0", background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "8px 12px" }}>
                        <span>{weekLabel(h.week_start)}</span>
                        <span style={{ color: meta.color }}>획득</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 13, color: "#c8bfb0", textAlign: "center", padding: "8px 0" }}>
                  아직 획득하지 못했어요. 도전해 보세요!
                </div>
              )}
            </div>
          );
        })()}

        {/* 최근 획득 내역 */}
        {badges.length > 0 && !selected && (
          <div style={{ marginTop: 28 }}>
            <p style={{ fontSize: 13, color: "#c8bfb0", marginBottom: 12 }}>최근 획득 내역</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {badges.slice(0, 10).map((b, i) => {
                const meta = BADGE_META[b.category];
                const isEquipped = equippedTitle === b.category;
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, background: "rgba(255,255,255,0.02)", border: `0.5px solid ${isEquipped ? meta?.color + "40" : "rgba(255,255,255,0.05)"}`, borderRadius: 12, padding: "12px 14px" }}>
                    <span style={{ fontSize: 22 }}>{meta?.emoji}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: meta?.color }}>{meta?.title}</div>
                      <div style={{ fontSize: 11, color: "#c8bfb0" }}>{weekLabel(b.week_start)}</div>
                    </div>
                    {isEquipped && (
                      <span style={{ fontSize: 10, background: meta?.color + "20", color: meta?.color, borderRadius: 4, padding: "2px 7px", fontWeight: 600 }}>착용 중</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {fetching && (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#c8bfb0", fontSize: 15 }}>
            불러오는 중...
          </div>
        )}
      </div>
    </main>
  );
}
