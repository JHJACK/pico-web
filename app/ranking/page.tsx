"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
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

const TIER_CFG: Record<Tier, { label: string; color: string; glow: string; gradient: string }> = {
  diamond:  { label: "다이아",   color: "#a8d8f0", glow: "rgba(168,216,240,0.45)", gradient: "linear-gradient(135deg,#a8d8f0 0%,#6bb8e8 40%,#c8ecff 70%,#a8d8f0 100%)" },
  platinum: { label: "플래티넘", color: "#b8f0d8", glow: "rgba(184,240,216,0.45)", gradient: "linear-gradient(135deg,#b8f0d8 0%,#6be8b4 40%,#c8fff0 70%,#b8f0d8 100%)" },
  gold:     { label: "골드",     color: "#FACA3E", glow: "rgba(250,202,62,0.45)",  gradient: "linear-gradient(135deg,#ffe566 0%,#FACA3E 40%,#fff0a0 70%,#e8b820 100%)"  },
  silver:   { label: "실버",     color: "#c8c8c8", glow: "rgba(200,200,200,0.35)", gradient: "linear-gradient(135deg,#e0e0e0 0%,#b0b0b0 40%,#f0f0f0 70%,#c8c8c8 100%)" },
  bronze:   { label: "브론즈",   color: "#d4956a", glow: "rgba(212,149,106,0.35)", gradient: "linear-gradient(135deg,#e8b090 0%,#c07848 40%,#f0c898 70%,#b86830 100%)" },
};

// ── 수식어 메타 (23종) ────────────────────────────────────────
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

const MEDAL: Record<1 | 2 | 3, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

function formatRate(r: number) {
  return `${r >= 0 ? "+" : ""}${r.toFixed(2)}%`;
}
function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diff < 1)  return "방금 전";
  if (diff < 60) return `${diff}분 전`;
  return `${Math.floor(diff / 60)}시간 전`;
}

// ── 티어 이모지 (원형 컨테이너 없이 이모지 직출력) ──────────────
function TierBadge({ tier, size = 28 }: { tier: Tier; size?: number }) {
  const icons: Record<Tier, string> = { diamond: "💎", platinum: "🏅", gold: "🥇", silver: "🥈", bronze: "🥉" };
  return (
    <span style={{
      fontFamily: "var(--font-mona12-emoji)",
      fontSize: Math.round(size * 0.82),
      lineHeight: 1, display: "inline-block", flexShrink: 0,
    }}>
      {icons[tier]}
    </span>
  );
}

// ── 메인 ──────────────────────────────────────────────────────
type Period = "weekly" | "total";

export default function RankingPage() {
  const { user } = useAuth();
  const router   = useRouter();

  const [rankings,    setRankings]    = useState<RankRow[]>([]);
  const [myRank,      setMyRank]      = useState<MyRank>(null);
  const [totalUsers,  setTotalUsers]  = useState(0);
  const [weekStart,   setWeekStart]   = useState("");
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [period,      setPeriod]      = useState<Period>("weekly");

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

  // 주간 날짜 범위 (월요일 ~ 일요일)
  const weekRange = (() => {
    if (!weekStart) return "";
    const KO_DAYS = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];
    const mon = new Date(weekStart + "T00:00:00");
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    const fmt = (d: Date) =>
      `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 ${KO_DAYS[d.getDay()]}`;
    return `${fmt(mon)} ~ ${sun.getMonth() + 1}월 ${sun.getDate()}일 ${KO_DAYS[sun.getDay()]}`;
  })();

  const top3   = rankings.slice(0, 3);
  const rest50 = rankings.slice(3, 50);

  return (
    <AuthGuard>
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "var(--font-paperlogy), var(--font-noto), sans-serif" }}>
      <style>{`
        .rank-toggle-fs { font-size: 13px; }
        @media (min-width: 768px) { .rank-toggle-fs { font-size: 15px; } }
        .rank-row-item { padding: 13px 16px; }
        .rank-row-pos { font-size: 13px; }
        .rank-row-nick { font-size: 14px; }
        .rank-row-subtitle { font-size: 11px; }
        .rank-row-rate { font-size: 14px; }
        .rank-row-avatar { width: 34px; height: 34px; }
        .rank-tier-wrap span { font-size: 23px; }
        .rank-me-badge { font-size: 9px; }
        @media (min-width: 768px) {
          .rank-row-item { padding: 18px 22px; }
          .rank-row-pos { font-size: 18px; }
          .rank-row-nick { font-size: 19px; }
          .rank-row-subtitle { font-size: 13px; }
          .rank-row-rate { font-size: 16px; }
          .rank-row-avatar { width: 37px !important; height: 37px !important; }
          .rank-tier-wrap span { font-size: 26px !important; }
          .rank-me-badge { font-size: 10px; }
        }
      `}</style>

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

        {/* 페이지 타이틀 + 주간/TOTAL 토글 */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 22, gap: 12 }}>
          <div>
            <p style={{ fontFamily: "var(--font-mona12)", fontSize: 13, fontWeight: 700, color: C.gold, marginBottom: 6, letterSpacing: "0.06em" }}>
              RANKING
            </p>
            <h1 style={{ fontFamily: "var(--font-paperlogy)", fontSize: 26, fontWeight: 700, color: C.text, margin: "0 0 5px", letterSpacing: "-0.02em" }}>
              {period === "weekly" ? "주간 랭킹" : "전체 랭킹"}
            </h1>
            <p style={{ fontSize: 14, fontWeight: 300, color: C.text2, margin: "0 0 6px" }}>
              {period === "weekly"
                ? "이번 주 수익률로 결정되는 진짜 실력 대결"
                : "전체 기간 누적 수익률 순위"}
            </p>
            {period === "weekly" && weekRange && (
              <span style={{
                display: "inline-block",
                fontFamily: "var(--font-mona12)", fontSize: 13, fontWeight: 700,
                color: C.gold,
                background: "rgba(250,202,62,0.12)",
                border: "0.5px solid rgba(250,202,62,0.25)",
                borderRadius: 7, padding: "3px 10px",
              }}>
                {weekRange}
              </span>
            )}
          </div>

          {/* 주간 / TOTAL 토글 */}
          <div style={{
            display: "flex", flexShrink: 0,
            background: "rgba(255,255,255,0.05)",
            border: `0.5px solid ${C.border}`,
            borderRadius: 12, padding: 3, gap: 2,
            alignSelf: "flex-start", marginTop: 4,
          }}>
            {(["weekly", "total"] as Period[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className="rank-toggle-fs"
                style={{
                  fontFamily: "var(--font-mona12)", fontWeight: 700,
                  padding: "6px 14px", borderRadius: 9,
                  background: period === p ? C.gold : "transparent",
                  color: period === p ? "#0d0d0d" : C.text2,
                  border: "none", cursor: "pointer",
                  transition: "all 0.15s",
                  letterSpacing: p === "total" ? "0.04em" : "0",
                }}
              >
                {p === "weekly" ? "주간" : "TOTAL"}
              </button>
            ))}
          </div>
        </div>

        {/* TOTAL: 준비 중 */}
        {period === "total" ? (
          <div style={{
            textAlign: "center", padding: "80px 0",
            background: C.card, borderRadius: 20, border: `0.5px solid ${C.border}`,
          }}>
            <span style={{ fontFamily: "var(--font-mona12-emoji)", fontSize: 48, display: "block", marginBottom: 16 }}>🏆</span>
            <div style={{ fontFamily: "var(--font-paperlogy)", fontSize: 18, fontWeight: 600, color: C.text, marginBottom: 8 }}>
              TOTAL 랭킹 준비 중
            </div>
            <div style={{ fontSize: 14, color: C.text2, lineHeight: 1.7 }}>
              전체 기간 누적 수익률 순위가<br />곧 오픈될 예정이에요
            </div>
          </div>
        ) : loading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: C.text2, fontSize: 15 }}>
            랭킹 불러오는 중...
          </div>
        ) : rankings.length === 0 ? (
          <div style={{
            textAlign: "center", padding: "80px 0",
            background: C.card, borderRadius: 20, border: `0.5px solid ${C.border}`,
          }}>
            <span style={{ fontFamily: "var(--font-mona12-emoji)", fontSize: 48, display: "block", marginBottom: 16 }}>🎮</span>
            <div style={{ fontFamily: "var(--font-paperlogy)", fontSize: 18, fontWeight: 600, color: C.text, marginBottom: 8 }}>
              이번 주 게임이 시작됐어요
            </div>
            <div style={{ fontSize: 14, color: C.text2, lineHeight: 1.7 }}>
              종목에서 매수하면<br />수익률 순위에 자동으로 올라가요
            </div>
          </div>
        ) : (
          <>
            {/* 내 랭킹 카드 */}
            {user && myRank && (
              <div style={{
                background: C.card, borderRadius: 20, padding: "18px 22px",
                border: `0.5px solid rgba(250,202,62,0.22)`, marginBottom: 24,
                display: "flex", alignItems: "center", gap: 16,
              }}>
                <TierBadge tier={getTier(myRank.return_rate)} size={50} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 400, color: C.text2, marginBottom: 5 }}>내 투자 성적</p>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                    <span style={{ fontFamily: "var(--font-paperlogy)", fontSize: 30, fontWeight: 700, color: C.gold, letterSpacing: "-0.03em" }}>
                      #{myRank.rank_position}
                    </span>
                    <span style={{ fontFamily: "var(--font-paperlogy)", fontSize: 18, fontWeight: 700, color: myRank.return_rate >= 0 ? C.green : C.red }}>
                      {formatRate(myRank.return_rate)}
                    </span>
                  </div>
                  <div style={{ height: 3, borderRadius: 2, background: "rgba(255,255,255,0.06)", marginTop: 8, overflow: "hidden" }}>
                    <div style={{
                      height: "100%",
                      width: `${Math.max(4, Math.min(100, ((totalUsers - myRank.rank_position + 1) / Math.max(totalUsers, 1)) * 100))}%`,
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
                  <span style={{ fontFamily: "var(--font-paperlogy)", fontSize: 22, fontWeight: 700, color: C.text }}>
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
                <div style={{ marginBottom: 24 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, paddingLeft: 2 }}>
                    <span style={{ fontFamily: "var(--font-mona12-emoji)", fontSize: 17 }}>⚔️</span>
                    <span style={{ fontFamily: "var(--font-mona12)", fontSize: 14, fontWeight: 700, color: C.text2 }}>내 라이벌</span>
                  </div>
                  <div style={{ background: C.card, borderRadius: 18, border: `0.5px solid ${C.border}`, overflow: "hidden" }}>
                    {above && (
                      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px" }}>
                        <span style={{ fontFamily: "var(--font-mona12)", fontSize: 10, color: C.gold, fontWeight: 700, width: 16 }}>▲</span>
                        <TierBadge tier={getTier(above.return_rate)} size={26} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 500, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{above.nickname}</div>
                          <div style={{ fontFamily: "var(--font-mona12)", fontSize: 11, color: C.text2 }}>#{above.rank_position}</div>
                        </div>
                        <span style={{ fontFamily: "var(--font-paperlogy)", fontSize: 14, fontWeight: 700, color: above.return_rate >= 0 ? C.green : C.red }}>{formatRate(above.return_rate)}</span>
                      </div>
                    )}
                    {above && below && <div style={{ height: "0.5px", background: "rgba(255,255,255,0.05)", marginInline: 16 }} />}
                    {below && (
                      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px" }}>
                        <span style={{ fontFamily: "var(--font-mona12)", fontSize: 10, color: C.red, fontWeight: 700, width: 16 }}>▼</span>
                        <TierBadge tier={getTier(below.return_rate)} size={26} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 500, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{below.nickname}</div>
                          <div style={{ fontFamily: "var(--font-mona12)", fontSize: 11, color: C.text2 }}>#{below.rank_position}</div>
                        </div>
                        <span style={{ fontFamily: "var(--font-paperlogy)", fontSize: 14, fontWeight: 700, color: below.return_rate >= 0 ? C.green : C.red }}>{formatRate(below.return_rate)}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* ── TOP 3 왕좌 (3명 이상일 때) ── */}
            {top3.length >= 3 && (
              <div style={{ marginBottom: 28 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, paddingLeft: 2 }}>
                  <span style={{ fontFamily: "var(--font-mona12-emoji)", fontSize: 17 }}>🏆</span>
                  <span style={{ fontFamily: "var(--font-mona12)", fontSize: 14, fontWeight: 700, color: C.text2 }}>TOP 3</span>
                </div>
                <div style={{
                  background: C.card, borderRadius: 20,
                  border: `0.5px solid rgba(250,202,62,0.15)`,
                  padding: "28px 16px 0",
                  overflow: "hidden",
                  boxShadow: "0 0 40px rgba(250,202,62,0.06)",
                }}>
                  <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 6 }}>
                    <ThroneSeat rank={top3[1]} position={2} isMe={top3[1].user_id === user?.id} />
                    <ThroneSeat rank={top3[0]} position={1} isMe={top3[0].user_id === user?.id} />
                    <ThroneSeat rank={top3[2]} position={3} isMe={top3[2].user_id === user?.id} />
                  </div>
                </div>
              </div>
            )}

            {/* ── 전체 리스트 (3명 미만이면 1위~도 여기서, 이상이면 4위~50위) ── */}
            {(top3.length < 3 ? rankings.slice(0, 50) : rest50).length > 0 && (() => {
              const listRows = top3.length < 3 ? rankings.slice(0, 50) : rest50;
              const label    = top3.length < 3 ? "수익률 순위" : "4위 이하";
              const emoji    = top3.length < 3 ? "📊" : "📋";
              return (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, paddingLeft: 2 }}>
                    <span style={{ fontFamily: "var(--font-mona12-emoji)", fontSize: 17 }}>{emoji}</span>
                    <span style={{ fontFamily: "var(--font-mona12)", fontSize: 14, fontWeight: 700, color: C.text2 }}>{label}</span>
                  </div>
                  <div style={{ background: C.card, borderRadius: 18, border: `0.5px solid ${C.border}`, overflow: "hidden" }}>
                    {listRows.map((row, idx) => (
                      <div key={row.user_id}>
                        <RankRow row={row} isMe={row.user_id === user?.id} />
                        {idx < listRows.length - 1 && (
                          <div style={{ height: "0.5px", background: "rgba(255,255,255,0.04)", marginInline: 16 }} />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            <p style={{
              textAlign: "center", fontSize: 12, color: C.text2, marginTop: 16,
              fontFamily: "var(--font-mona12)",
            }}>
              총 {totalUsers}명 참여 · {lastUpdated ? `${timeAgo(lastUpdated)} 업데이트` : "2시간마다 업데이트"}
            </p>
          </>
        )}
      </div>
    </div>
    </AuthGuard>
  );
}

// ── TOP 3 왕좌 카드 ──────────────────────────────────────────
function ThroneSeat({ rank, position, isMe }: { rank: RankRow; position: 1 | 2 | 3; isMe: boolean }) {
  const tier    = getTier(rank.return_rate);
  const cfg     = TIER_CFG[tier];
  const isFirst = position === 1;
  const titleM  = rank.equipped_title ? TITLE_META[rank.equipped_title] : null;

  const avatarSize = isFirst ? 68 : 52;
  const podiumH    = isFirst ? 120 : position === 2 ? 88 : 72;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 7 }}>

      {/* 왕관 (1위만) */}
      {isFirst && (
        <span style={{ fontFamily: "var(--font-mona12-emoji)", fontSize: 26, lineHeight: 1, marginBottom: 2 }}>👑</span>
      )}

      {/* 아바타 */}
      <div style={{ position: "relative" }}>
        {rank.avatar_url ? (
          <img src={rank.avatar_url} alt={rank.nickname} style={{
            width: avatarSize, height: avatarSize, borderRadius: "50%", objectFit: "cover",
            border: `2.5px solid ${cfg.color}`,
            boxShadow: `0 0 20px ${cfg.glow}`,
          }} />
        ) : (
          <div style={{
            width: avatarSize, height: avatarSize, borderRadius: "50%",
            background: "#1e1e1e", border: `2.5px solid ${cfg.color}`,
            boxShadow: `0 0 20px ${cfg.glow}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: isFirst ? 26 : 20, color: "#c8bfb0",
            fontFamily: "var(--font-paperlogy)",
          }}>
            {rank.nickname[0]?.toUpperCase() ?? "?"}
          </div>
        )}
        {/* 메달 이모지 */}
        <div style={{
          position: "absolute", bottom: -6, right: -6,
          fontFamily: "var(--font-mona12-emoji)", fontSize: isFirst ? 22 : 18, lineHeight: 1,
        }}>
          {MEDAL[position]}
        </div>
        {/* 내 표시 */}
        {isMe && (
          <div style={{
            position: "absolute", top: -4, left: -4,
            background: C.gold, color: "#0d0d0d",
            fontFamily: "var(--font-mona12)", fontSize: 8, fontWeight: 700,
            borderRadius: 4, padding: "1px 4px",
          }}>나</div>
        )}
      </div>

      {/* 닉네임 */}
      <div style={{
        fontFamily: "var(--font-paperlogy)", fontSize: isFirst ? 14 : 12, fontWeight: 600,
        maxWidth: isFirst ? 88 : 72,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        textAlign: "center", color: C.text,
      }}>
        {rank.nickname}
      </div>

      {/* 수식어 */}
      {titleM && (
        <div style={{
          fontFamily: "var(--font-mona12)", fontSize: 10, textAlign: "center",
          maxWidth: isFirst ? 90 : 74,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          color: titleM.color,
        }}>
          <span style={{ fontFamily: "var(--font-mona12-emoji)" }}>{titleM.emoji}</span>
          {" "}{titleM.label}
        </div>
      )}

      {/* 수익률 */}
      <div style={{
        fontFamily: "var(--font-paperlogy)", fontSize: isFirst ? 16 : 14, fontWeight: 700,
        color: rank.return_rate >= 0 ? C.green : C.red,
      }}>
        {formatRate(rank.return_rate)}
      </div>

      {/* 포디엄 기단 */}
      <div style={{
        width: "100%", height: podiumH,
        borderRadius: "10px 10px 0 0",
        background: cfg.gradient,
        boxShadow: `0 -6px 24px ${cfg.glow}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "var(--font-mona12-emoji)", fontSize: isFirst ? 32 : 26, lineHeight: 1,
      }}>
        {MEDAL[position]}
      </div>
    </div>
  );
}

// ── 4위~ 리스트 행 ────────────────────────────────────────────
function RankRow({ row, isMe }: { row: RankRow; isMe: boolean }) {
  const tier     = getTier(row.return_rate);
  const cfg      = TIER_CFG[tier];
  const isProfit = row.return_rate >= 0;
  const titleM   = row.equipped_title ? TITLE_META[row.equipped_title] : null;

  return (
    <div className="rank-row-item" style={{
      display: "flex", alignItems: "center", gap: 12,
      background: isMe ? "rgba(250,202,62,0.04)" : "transparent",
    }}>
      {/* 순위 */}
      <div className="rank-row-pos" style={{
        width: 30, textAlign: "center", flexShrink: 0,
        fontFamily: "var(--font-mona12)", fontWeight: 700, color: C.text2,
      }}>
        {row.rank_position}
      </div>

      {/* 티어 배지 */}
      <div className="rank-tier-wrap">
        <TierBadge tier={tier} size={28} />
      </div>

      {/* 아바타 */}
      {row.avatar_url ? (
        <img src={row.avatar_url} alt={row.nickname} className="rank-row-avatar" style={{
          borderRadius: "50%", objectFit: "cover",
          flexShrink: 0, border: `1.5px solid ${cfg.color}45`,
        }} />
      ) : (
        <div className="rank-row-avatar" style={{
          borderRadius: "50%", background: "#1a1a1a",
          border: `1.5px solid ${cfg.color}45`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 13, color: "#c8bfb0", flexShrink: 0,
          fontFamily: "var(--font-paperlogy)",
        }}>
          {row.nickname[0]?.toUpperCase() ?? "?"}
        </div>
      )}

      {/* 수식어 (위) + 닉네임 + 나 배지 (아래) */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* 수식어 */}
        {titleM ? (
          <div className="rank-row-subtitle" style={{
            fontFamily: "var(--font-mona12)", marginBottom: 2,
            color: titleM.color, display: "flex", alignItems: "center", gap: 3,
          }}>
            <span style={{ fontFamily: "var(--font-mona12-emoji)" }}>{titleM.emoji}</span>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{titleM.label}</span>
          </div>
        ) : (
          <div className="rank-row-subtitle" style={{
            fontFamily: "var(--font-mona12)", color: cfg.color, marginBottom: 2,
          }}>
            {cfg.label} · {row.trade_count}회 거래
          </div>
        )}
        {/* 닉네임 + 나 배지 — inline-flex so 나 is always adjacent */}
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span className="rank-row-nick" style={{
            fontFamily: "var(--font-paperlogy)",
            fontWeight: isMe ? 600 : 400,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            color: C.text, flex: "0 1 auto", minWidth: 0,
          }}>
            {row.nickname}
          </span>
          {isMe && (
            <span className="rank-me-badge" style={{
              fontFamily: "var(--font-mona12)",
              background: C.gold, color: "#0d0d0d",
              borderRadius: 4, padding: "1px 5px", fontWeight: 700, flexShrink: 0,
            }}>나</span>
          )}
        </div>
      </div>

      {/* 수익률 */}
      <div style={{
        display: "inline-flex", alignItems: "center", flexShrink: 0,
        background: isProfit ? "rgba(126,212,160,0.1)" : "rgba(240,112,112,0.1)",
        border: `0.5px solid ${isProfit ? "rgba(126,212,160,0.25)" : "rgba(240,112,112,0.25)"}`,
        borderRadius: 8, padding: "4px 10px",
      }}>
        <span className="rank-row-rate" style={{
          fontFamily: "var(--font-paperlogy)", fontWeight: 700,
          color: isProfit ? C.green : C.red,
        }}>
          {formatRate(row.return_rate)}
        </span>
      </div>
    </div>
  );
}
