"use client";

import { useState, useEffect, useCallback, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/app/lib/authContext";
import AuthGuard from "@/app/components/AuthGuard";
import { BackIcon } from "@/app/components/BackIcon";

// ── 타입 ──────────────────────────────────────────────────────
type RankRow = {
  user_id: string;
  nickname: string;
  avatar_url: string | null;
  return_rate: number;
  total_invested: number;
  trade_count: number;
  rank_position: number;
  updated_at: string;
  equipped_title: string | null;
};

type MyRank = {
  rank_position: number;
  return_rate: number;
  trade_count: number;
} | null;

// ── 색상 ──────────────────────────────────────────────────────
const C = {
  bg:     "#0d0d0d",
  card:   "#141414",
  text:   "#e8e0d0",
  text2:  "#c8bfb0",
  gold:   "#FACA3E",
  green:  "#7ed4a0",
  red:    "#f07070",
  border: "rgba(255,255,255,0.07)",
} as const;

// ── 티어 시스템 ───────────────────────────────────────────────
type Tier = "bronze" | "silver" | "gold" | "platinum" | "diamond";

function getTier(r: number): Tier {
  if (r >= 50) return "diamond";
  if (r >= 30) return "platinum";
  if (r >= 10) return "gold";
  if (r >= 0)  return "silver";
  return "bronze";
}

const TIER_CFG: Record<Tier, { label: string; color: string; glow: string; gradient: string; icon: string }> = {
  diamond:  { label: "다이아",   color: "#a8d8f0", glow: "rgba(168,216,240,0.5)", gradient: "linear-gradient(135deg,#a8d8f0 0%,#6bb8e8 40%,#c8ecff 70%,#a8d8f0 100%)", icon: "💎" },
  platinum: { label: "플래티넘", color: "#b8f0d8", glow: "rgba(184,240,216,0.5)", gradient: "linear-gradient(135deg,#b8f0d8 0%,#6be8b4 40%,#c8fff0 70%,#b8f0d8 100%)", icon: "🏅" },
  gold:     { label: "골드",     color: "#FACA3E", glow: "rgba(250,202,62,0.5)",  gradient: "linear-gradient(135deg,#ffe566 0%,#FACA3E 40%,#fff0a0 70%,#e8b820 100%)",  icon: "🥇" },
  silver:   { label: "실버",     color: "#c8c8c8", glow: "rgba(200,200,200,0.4)", gradient: "linear-gradient(135deg,#e0e0e0 0%,#b0b0b0 40%,#f0f0f0 70%,#c8c8c8 100%)", icon: "🥈" },
  bronze:   { label: "브론즈",   color: "#d4956a", glow: "rgba(212,149,106,0.4)", gradient: "linear-gradient(135deg,#e8b090 0%,#c07848 40%,#f0c898 70%,#b86830 100%)", icon: "🥉" },
};

// ── 수식어 메타 (23종 전체) ───────────────────────────────────
const TITLE_META: Record<string, { emoji: string; label: string; color: string }> = {
  sniper:      { emoji: "🎯", label: "여의도 스나이퍼",  color: "#FACA3E" },
  frog:        { emoji: "🐸", label: "역발상의 천재",    color: "#7ed4a0" },
  hodl:        { emoji: "🗿", label: "존버의 신",        color: "#a0b8f0" },
  daytrader:   { emoji: "⚡", label: "단타의 귀재",      color: "#f0c060" },
  mentalsteel: { emoji: "🧊", label: "냉철한 멘탈",      color: "#b8e0f8" },
  lucky:       { emoji: "🎲", label: "행운의 여신",      color: "#f0a0e0" },
  spinner:     { emoji: "🔄", label: "회전왕",           color: "#80d8f0" },
  dip:         { emoji: "📉", label: "바닥 사냥꾼",      color: "#f0a060" },
  rocket:      { emoji: "🚀", label: "로켓 탑승자",      color: "#c0a0f8" },
  whale:       { emoji: "🐋", label: "큰손",             color: "#4090e8" },
  surfer:      { emoji: "🌊", label: "파도타기",          color: "#40c8d0" },
  allin:       { emoji: "🎰", label: "올인",             color: "#f07060" },
  jungle:      { emoji: "🦁", label: "정글의 왕",         color: "#f0c020" },
  battlefirst: { emoji: "🏹", label: "첫 예측",          color: "#f09060" },
  prophet:     { emoji: "🔮", label: "예언자",            color: "#c080f8" },
  odds:        { emoji: "🧮", label: "확률의 지배자",     color: "#60d0a0" },
  sprout:      { emoji: "🌱", label: "새싹",             color: "#80d060" },
  flame:       { emoji: "🔥", label: "불꽃 의지",         color: "#f08040" },
  diamond:     { emoji: "💎", label: "다이아 의지",       color: "#80e8f8" },
  scholar:     { emoji: "📖", label: "용어 학자",         color: "#d0a060" },
  yoidodao:    { emoji: "🏛️", label: "여의도 학자",       color: "#e0c080" },
  pointrich:   { emoji: "💰", label: "포인트 부자",        color: "#f0d040" },
  collector:   { emoji: "👑", label: "도감왕",             color: "#f0a020" },
};

const NUM: CSSProperties = { fontFamily: "var(--font-mona12), monospace", fontWeight: 700, letterSpacing: "-0.02em" };

function formatRate(r: number) {
  return `${r >= 0 ? "+" : ""}${r.toFixed(2)}%`;
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diff < 1)  return "방금 전";
  if (diff < 60) return `${diff}분 전`;
  return `${Math.floor(diff / 60)}시간 전`;
}

// ── 3D 티어 뱃지 ──────────────────────────────────────────────
function TierBadge({ tier, size = 40 }: { tier: Tier; size?: number }) {
  const cfg = TIER_CFG[tier];
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: cfg.gradient,
      boxShadow: `0 2px 8px ${cfg.glow}, inset 0 1px 2px rgba(255,255,255,0.6), inset 0 -2px 4px rgba(0,0,0,0.25)`,
      border: `1px solid ${cfg.color}60`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.45, fontFamily: "var(--font-mona12-emoji)",
    }}>
      {cfg.icon}
    </div>
  );
}

// ── 메인 ──────────────────────────────────────────────────────
type RankTab = "return" | "battle" | "point";

export default function RankingPage() {
  const { user } = useAuth();
  const router   = useRouter();

  const [rankings,    setRankings]    = useState<RankRow[]>([]);
  const [myRank,      setMyRank]      = useState<MyRank>(null);
  const [totalUsers,  setTotalUsers]  = useState(0);
  const [weekStart,   setWeekStart]   = useState("");
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [activeTab,   setActiveTab]   = useState<RankTab>("return");

  const load = useCallback(async () => {
    setLoading(true);
    const uid = user?.id ?? "";
    const res  = await fetch(`/api/rankings${uid ? `?uid=${uid}` : ""}`);
    const data = await res.json();
    setRankings(data.rankings ?? []);
    setMyRank(data.myRank ?? null);
    setTotalUsers(data.totalUsers ?? 0);
    setWeekStart(data.weekStart ?? "");
    setLastUpdated(data.lastUpdated);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  const myPercentile = myRank && totalUsers > 0
    ? Math.round(((totalUsers - myRank.rank_position) / totalUsers) * 100)
    : null;

  const weekLabel = weekStart
    ? `${weekStart.slice(0, 4)}년 ${parseInt(weekStart.slice(5, 7))}월 ${parseInt(weekStart.slice(8, 10))}일 주`
    : "";

  const RANK_TABS: { id: RankTab; label: string; emoji: string; comingSoon?: boolean }[] = [
    { id: "return", label: "수익률 순위", emoji: "📊" },
    { id: "battle", label: "배틀 순위",   emoji: "⚔️", comingSoon: true },
    { id: "point",  label: "포인트 순위", emoji: "💰", comingSoon: true },
  ];

  return (
    <AuthGuard>
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "var(--font-paperlogy), var(--font-noto), sans-serif" }}>

      {/* 헤더 */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 30, height: 56,
        background: "rgba(13,13,13,0.96)", backdropFilter: "blur(20px)",
        borderBottom: `0.5px solid ${C.border}`,
        display: "flex", alignItems: "center", padding: "0 20px",
      }}>
        <button onClick={() => router.back()} style={{ background: "none", border: "none", cursor: "pointer" }}>
          <BackIcon />
        </button>
      </nav>

      <div style={{ maxWidth: 700, margin: "0 auto", padding: "20px clamp(16px,4vw,24px) 52px" }}>

        {/* 페이지 타이틀 */}
        <div style={{ marginBottom: 22 }}>
          <p style={{ fontFamily: "var(--font-mona12)", fontSize: 13, fontWeight: 700, color: C.gold, marginBottom: 6, letterSpacing: "0.06em" }}>
            RANKING
          </p>
          <h1 style={{ fontFamily: "var(--font-paperlogy)", fontSize: 26, fontWeight: 700, color: C.text, margin: "0 0 5px", letterSpacing: "-0.02em" }}>
            주간 랭킹
          </h1>
          <p style={{ fontSize: 14, fontWeight: 300, color: C.text2, margin: 0 }}>
            이번 주 수익률로 결정되는 진짜 실력 대결
          </p>
        </div>

        {/* 내 랭킹 카드 */}
        {user && myRank && (
          <div style={{
            background: C.card, borderRadius: 20, padding: "18px 22px",
            border: `0.5px solid rgba(250,202,62,0.2)`, marginBottom: 20,
            display: "flex", alignItems: "center", gap: 16,
          }}>
            <TierBadge tier={getTier(myRank.return_rate)} size={52} />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 400, color: C.text2, marginBottom: 5 }}>내 투자 성적</p>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span style={{ fontFamily: "var(--font-mona12)", fontSize: 30, fontWeight: 700, color: C.gold, letterSpacing: "-0.03em" }}>
                  #{myRank.rank_position}
                </span>
                <span style={{
                  fontFamily: "var(--font-mona12)", fontSize: 18, fontWeight: 700,
                  color: myRank.return_rate >= 0 ? C.green : C.red,
                }}>
                  {formatRate(myRank.return_rate)}
                </span>
              </div>
              <div style={{ height: 3, borderRadius: 2, background: "rgba(255,255,255,0.06)", marginTop: 8, overflow: "hidden" }}>
                <div style={{
                  height: "100%",
                  width: `${Math.max(5, Math.min(100, ((totalUsers - myRank.rank_position + 1) / Math.max(totalUsers, 1)) * 100))}%`,
                  background: C.gold, borderRadius: 2, transition: "width 0.5s ease",
                }} />
              </div>
              <p style={{ fontFamily: "var(--font-mona12)", fontSize: 12, color: C.text2, marginTop: 4 }}>
                {myPercentile !== null ? `상위 ${100 - myPercentile}% · ` : ""}
                {TIER_CFG[getTier(myRank.return_rate)].label} 티어 · {totalUsers}명 중 {myRank.rank_position}위
              </p>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <p style={{ fontSize: 12, color: C.text2, marginBottom: 4 }}>거래</p>
              <span style={{ fontFamily: "var(--font-mona12)", fontSize: 22, fontWeight: 700, color: C.text }}>
                {myRank.trade_count}
                <span style={{ fontSize: 13, fontWeight: 400, color: C.text2 }}>회</span>
              </span>
            </div>
          </div>
        )}

        {/* 라이벌 */}
        {user && myRank && myRank.rank_position > 1 && (() => {
          const above = rankings.find(r => r.rank_position === myRank.rank_position - 1);
          const below = rankings.find(r => r.rank_position === myRank.rank_position + 1);
          if (!above && !below) return null;
          return (
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, paddingLeft: 2 }}>
                <span style={{ fontFamily: "var(--font-mona12-emoji)", fontSize: 18 }}>⚔️</span>
                <span style={{ fontFamily: "var(--font-mona12)", fontSize: 15, fontWeight: 700, color: C.text2 }}>내 라이벌</span>
              </div>
              <div style={{ background: C.card, borderRadius: 18, border: `0.5px solid ${C.border}`, overflow: "hidden" }}>
                {above && (
                  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px" }}>
                    <span style={{ fontFamily: "var(--font-mona12)", fontSize: 11, color: C.gold, fontWeight: 700, width: 20, flexShrink: 0 }}>▲</span>
                    <TierBadge tier={getTier(above.return_rate)} size={28} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{above.nickname}</div>
                      <div style={{ fontSize: 11, color: C.text2 }}>#{above.rank_position}</div>
                    </div>
                    <span style={{ fontFamily: "var(--font-mona12)", fontSize: 14, fontWeight: 700, color: above.return_rate >= 0 ? C.green : C.red, flexShrink: 0 }}>
                      {formatRate(above.return_rate)}
                    </span>
                  </div>
                )}
                {above && below && <div style={{ height: "0.5px", background: "rgba(255,255,255,0.05)", marginInline: 16 }} />}
                {below && (
                  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px" }}>
                    <span style={{ fontFamily: "var(--font-mona12)", fontSize: 11, color: C.red, fontWeight: 700, width: 20, flexShrink: 0 }}>▼</span>
                    <TierBadge tier={getTier(below.return_rate)} size={28} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{below.nickname}</div>
                      <div style={{ fontSize: 11, color: C.text2 }}>#{below.rank_position}</div>
                    </div>
                    <span style={{ fontFamily: "var(--font-mona12)", fontSize: 14, fontWeight: 700, color: below.return_rate >= 0 ? C.green : C.red, flexShrink: 0 }}>
                      {formatRate(below.return_rate)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* 랭킹 탭 */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20, overflowX: "auto", paddingBottom: 2 }}>
          {RANK_TABS.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => !tab.comingSoon && setActiveTab(tab.id)}
                style={{
                  flexShrink: 0,
                  padding: "7px 14px", borderRadius: 20,
                  fontFamily: "var(--font-mona12)", fontSize: 13, fontWeight: 700,
                  background: isActive ? C.gold : "rgba(255,255,255,0.05)",
                  border: `0.5px solid ${isActive ? C.gold : C.border}`,
                  color: isActive ? "#0d0d0d" : tab.comingSoon ? "rgba(200,191,176,0.4)" : C.text2,
                  cursor: tab.comingSoon ? "default" : "pointer",
                  transition: "all 0.15s",
                  display: "flex", alignItems: "center", gap: 5,
                  opacity: tab.comingSoon ? 0.5 : 1,
                }}
              >
                <span style={{ fontFamily: "var(--font-mona12-emoji)", fontSize: 14 }}>{tab.emoji}</span>
                {tab.label}
                {tab.comingSoon && (
                  <span style={{ fontSize: 10, background: "rgba(255,255,255,0.08)", borderRadius: 4, padding: "1px 5px" }}>
                    준비 중
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* 수익률 순위 콘텐츠 */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: C.text2, fontSize: 15 }}>
            랭킹 불러오는 중...
          </div>
        ) : activeTab === "return" ? (
          <>
            {rankings.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 0" }}>
                <span style={{ fontFamily: "var(--font-mona12-emoji)", fontSize: 44, display: "block", marginBottom: 16 }}>🎮</span>
                <div style={{ fontSize: 16, fontWeight: 600, color: C.text, marginBottom: 8 }}>이번 주 게임이 시작됐어요</div>
                <div style={{ fontSize: 14, color: C.text2, lineHeight: 1.7 }}>
                  종목에서 매수하면<br />수익률 순위에 자동으로 올라가요
                </div>
              </div>
            ) : (
              <>
                {/* TOP 3 포디엄 */}
                {rankings.length >= 3 && (
                  <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 8, marginBottom: 28, padding: "0 8px" }}>
                    <PodiumCard rank={rankings[1]} position={2} isMe={rankings[1].user_id === user?.id} />
                    <PodiumCard rank={rankings[0]} position={1} isMe={rankings[0].user_id === user?.id} />
                    <PodiumCard rank={rankings[2]} position={3} isMe={rankings[2].user_id === user?.id} />
                  </div>
                )}

                {/* 섹션 헤더 */}
                {rankings.length > 3 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, paddingLeft: 2 }}>
                    <span style={{ fontFamily: "var(--font-mona12-emoji)", fontSize: 18 }}>📋</span>
                    <span style={{ fontFamily: "var(--font-mona12)", fontSize: 15, fontWeight: 700, color: C.text2 }}>4위 이하</span>
                  </div>
                )}

                {/* 4위~ 리스트 */}
                <div style={{ background: C.card, borderRadius: 18, border: `0.5px solid ${C.border}`, overflow: "hidden" }}>
                  {rankings.slice(3).map((row, idx) => (
                    <div key={row.user_id}>
                      <RankListRow row={row} isMe={row.user_id === user?.id} />
                      {idx < rankings.slice(3).length - 1 && (
                        <div style={{ height: "0.5px", background: "rgba(255,255,255,0.05)", marginInline: 16 }} />
                      )}
                    </div>
                  ))}
                </div>

                <p style={{
                  textAlign: "center", fontSize: 13, color: C.text2, marginTop: 16,
                  fontFamily: "var(--font-mona12)",
                }}>
                  총 {totalUsers}명 참여 · {lastUpdated ? `${timeAgo(lastUpdated)} 업데이트` : "2시간마다 업데이트"}
                </p>
              </>
            )}
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <span style={{ fontFamily: "var(--font-mona12-emoji)", fontSize: 44, display: "block", marginBottom: 16 }}>
              {activeTab === "battle" ? "⚔️" : "💰"}
            </span>
            <div style={{ fontSize: 16, fontWeight: 600, color: C.text, marginBottom: 8 }}>준비 중이에요</div>
            <div style={{ fontSize: 14, color: C.text2 }}>
              {activeTab === "battle" ? "배틀 정답률 순위가 곧 오픈돼요" : "포인트 적립 순위가 곧 오픈돼요"}
            </div>
          </div>
        )}

      </div>
    </div>
    </AuthGuard>
  );
}

// ── 포디엄 카드 (1~3위) ───────────────────────────────────────
function PodiumCard({ rank, position, isMe }: { rank: RankRow; position: 1 | 2 | 3; isMe: boolean }) {
  const tier    = getTier(rank.return_rate);
  const podiumH = ({ 1: 110, 2: 80, 3: 64 } as const)[position];
  const isFirst = position === 1;
  const titleM  = rank.equipped_title ? TITLE_META[rank.equipped_title] : null;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      {isFirst && <span style={{ fontFamily: "var(--font-mona12-emoji)", fontSize: 20 }}>👑</span>}

      <div style={{ position: "relative" }}>
        {rank.avatar_url ? (
          <img src={rank.avatar_url} alt={rank.nickname} style={{
            width: isFirst ? 56 : 44, height: isFirst ? 56 : 44,
            borderRadius: "50%", objectFit: "cover",
            border: `2px solid ${TIER_CFG[tier].color}`,
            boxShadow: isMe ? `0 0 0 2px ${TIER_CFG[tier].color}60` : "none",
          }} />
        ) : (
          <div style={{
            width: isFirst ? 56 : 44, height: isFirst ? 56 : 44,
            borderRadius: "50%", background: "#242424",
            border: `2px solid ${TIER_CFG[tier].color}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: isFirst ? 22 : 17, color: "#c8bfb0",
          }}>
            {rank.nickname[0]?.toUpperCase() ?? "?"}
          </div>
        )}
        <div style={{ position: "absolute", bottom: -4, right: -4 }}>
          <TierBadge tier={tier} size={20} />
        </div>
        {isMe && (
          <div style={{
            position: "absolute", top: -4, left: -4,
            background: "#FACA3E", color: "#0d0d0d",
            fontSize: 8, fontWeight: 700, borderRadius: 4,
            padding: "1px 4px", fontFamily: "var(--font-mona12)",
          }}>나</div>
        )}
      </div>

      <div style={{
        fontSize: isFirst ? 13 : 12, fontWeight: 500,
        maxWidth: 72, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        textAlign: "center", color: "#e8e0d0",
      }}>
        {rank.nickname}
      </div>

      {titleM && (
        <div style={{
          fontSize: 10, textAlign: "center", maxWidth: 80,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          color: titleM.color,
          fontFamily: "var(--font-mona12)",
        }}>
          <span style={{ fontFamily: "var(--font-mona12-emoji)" }}>{titleM.emoji}</span>
          {" "}{titleM.label}
        </div>
      )}

      <div style={{
        fontFamily: "var(--font-mona12)", fontSize: isFirst ? 15 : 13, fontWeight: 700,
        color: rank.return_rate >= 0 ? "#7ed4a0" : "#f07070",
      }}>
        {formatRate(rank.return_rate)}
      </div>

      <div style={{
        width: "100%", height: podiumH, borderRadius: "8px 8px 0 0",
        background: TIER_CFG[tier].gradient,
        boxShadow: `0 -4px 20px ${TIER_CFG[tier].glow}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "var(--font-mona12)", fontSize: isFirst ? 24 : 20, fontWeight: 700, color: "#0d0d0d",
      }}>
        {position}
      </div>
    </div>
  );
}

// ── 리스트 행 (4위~) ──────────────────────────────────────────
function RankListRow({ row, isMe }: { row: RankRow; isMe: boolean }) {
  const tier     = getTier(row.return_rate);
  const cfg      = TIER_CFG[tier];
  const isProfit = row.return_rate >= 0;
  const titleM   = row.equipped_title ? TITLE_META[row.equipped_title] : null;

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "14px 16px",
      background: isMe ? "rgba(250,202,62,0.04)" : "transparent",
    }}>
      <div style={{
        width: 28, textAlign: "center", flexShrink: 0,
        fontFamily: "var(--font-mona12)", fontSize: 14, fontWeight: 700, color: C.text2,
      }}>
        {row.rank_position}
      </div>

      <TierBadge tier={tier} size={30} />

      {row.avatar_url ? (
        <img src={row.avatar_url} alt={row.nickname} style={{
          width: 34, height: 34, borderRadius: "50%", objectFit: "cover",
          flexShrink: 0, border: `1.5px solid ${cfg.color}50`,
        }} />
      ) : (
        <div style={{
          width: 34, height: 34, borderRadius: "50%", background: "#1a1a1a",
          border: `1.5px solid ${cfg.color}50`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 14, color: "#c8bfb0", flexShrink: 0,
        }}>
          {row.nickname[0]?.toUpperCase() ?? "?"}
        </div>
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{
            fontFamily: "var(--font-paperlogy)", fontSize: 14,
            fontWeight: isMe ? 600 : 400,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            color: C.text,
          }}>
            {row.nickname}
          </span>
          {isMe && (
            <span style={{
              fontFamily: "var(--font-mona12)", fontSize: 9,
              background: "#FACA3E", color: "#0d0d0d",
              borderRadius: 4, padding: "1px 5px", fontWeight: 700, flexShrink: 0,
            }}>나</span>
          )}
        </div>

        {titleM ? (
          <div style={{
            fontFamily: "var(--font-mona12)", fontSize: 11, marginTop: 2,
            color: titleM.color, display: "flex", alignItems: "center", gap: 3,
          }}>
            <span style={{ fontFamily: "var(--font-mona12-emoji)" }}>{titleM.emoji}</span>
            <span>{titleM.label}</span>
          </div>
        ) : (
          <div style={{
            fontFamily: "var(--font-mona12)", fontSize: 11, color: cfg.color, marginTop: 2,
          }}>
            {cfg.label} · {row.trade_count}회 거래
          </div>
        )}
      </div>

      <div style={{ flexShrink: 0 }}>
        <div style={{
          display: "inline-flex", alignItems: "center",
          background: isProfit ? "rgba(126,212,160,0.1)" : "rgba(240,112,112,0.1)",
          border: `0.5px solid ${isProfit ? "rgba(126,212,160,0.25)" : "rgba(240,112,112,0.25)"}`,
          borderRadius: 8, padding: "4px 10px",
        }}>
          <span style={{
            fontFamily: "var(--font-mona12)", fontSize: 14, fontWeight: 700,
            color: isProfit ? "#7ed4a0" : "#f07070",
          }}>
            {formatRate(row.return_rate)}
          </span>
        </div>
      </div>
    </div>
  );
}
