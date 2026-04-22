"use client";

import { useState, useEffect, useCallback, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/lib/authContext";

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

type Award = {
  category: string;
  user_id: string;
  metric_val: number;
};

type MyRank = {
  rank_position: number;
  return_rate: number;
  trade_count: number;
} | null;

// ── 티어 시스템 ───────────────────────────────────────────────
type Tier = "bronze" | "silver" | "gold" | "platinum" | "diamond";

function getTier(returnRate: number): Tier {
  if (returnRate >= 50) return "diamond";
  if (returnRate >= 30) return "platinum";
  if (returnRate >= 10) return "gold";
  if (returnRate >= 0)  return "silver";
  return "bronze";
}

const TIER_CONFIG: Record<Tier, { label: string; color: string; glow: string; gradient: string; icon: string }> = {
  diamond:  { label: "다이아",   color: "#a8d8f0", glow: "rgba(168,216,240,0.5)", gradient: "linear-gradient(135deg,#a8d8f0 0%,#6bb8e8 40%,#c8ecff 70%,#a8d8f0 100%)", icon: "💎" },
  platinum: { label: "플래티넘", color: "#b8f0d8", glow: "rgba(184,240,216,0.5)", gradient: "linear-gradient(135deg,#b8f0d8 0%,#6be8b4 40%,#c8fff0 70%,#b8f0d8 100%)", icon: "🏅" },
  gold:     { label: "골드",     color: "#FACA3E", glow: "rgba(250,202,62,0.5)",  gradient: "linear-gradient(135deg,#ffe566 0%,#FACA3E 40%,#fff0a0 70%,#e8b820 100%)",  icon: "🥇" },
  silver:   { label: "실버",     color: "#c8c8c8", glow: "rgba(200,200,200,0.4)", gradient: "linear-gradient(135deg,#e0e0e0 0%,#b0b0b0 40%,#f0f0f0 70%,#c8c8c8 100%)", icon: "🥈" },
  bronze:   { label: "브론즈",   color: "#d4956a", glow: "rgba(212,149,106,0.4)", gradient: "linear-gradient(135deg,#e8b090 0%,#c07848 40%,#f0c898 70%,#b86830 100%)", icon: "🥉" },
};

// ── 수상 카테고리 ─────────────────────────────────────────────
const AWARD_CONFIG: Record<string, { emoji: string; title: string; subtitle: string; color: string }> = {
  sniper:      { emoji: "🎯", title: "여의도 스나이퍼",        subtitle: "단 한 방으로 시장을 뚫은 자",         color: "#FACA3E" },
  frog:        { emoji: "🐸", title: "역발상의 천재",           subtitle: "시장이 이 유저를 거부 중입니다",       color: "#7ed4a0" },
  hodl:        { emoji: "🗿", title: "존버의 신",               subtitle: "흔들림 없이 버텨낸 의지의 사나이",     color: "#a0b8f0" },
  daytrader:   { emoji: "⚡️", title: "단타의 귀재",            subtitle: "이번 주 가장 바쁘게 살았던 투자자",    color: "#f0c060" },
  mentalsteel: { emoji: "🧊", title: "냉철한 멘탈",             subtitle: "단 한 번의 손실도 없이 수익만 챙겼다", color: "#b8e0f8" },
};

// ── 수식어 메타 ───────────────────────────────────────────────
const TITLE_META: Record<string, { emoji: string; label: string; color: string }> = {
  sniper:      { emoji: "🎯", label: "여의도 스나이퍼",  color: "#FACA3E" },
  frog:        { emoji: "🐸", label: "역발상의 천재",    color: "#7ed4a0" },
  hodl:        { emoji: "🗿", label: "존버의 신",        color: "#a0b8f0" },
  daytrader:   { emoji: "⚡️", label: "단타의 귀재",     color: "#f0c060" },
  mentalsteel: { emoji: "🧊", label: "냉철한 멘탈",      color: "#b8e0f8" },
};

// ── 공통 스타일 ───────────────────────────────────────────────
const NUM: CSSProperties = { fontFamily: "var(--font-inter), monospace", fontWeight: 300, letterSpacing: "-0.02em" };

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
  const cfg = TIER_CONFIG[tier];
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: cfg.gradient,
      boxShadow: `0 2px 8px ${cfg.glow}, inset 0 1px 2px rgba(255,255,255,0.6), inset 0 -2px 4px rgba(0,0,0,0.25)`,
      border: `1px solid ${cfg.color}60`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.45,
    }}>
      {cfg.icon}
    </div>
  );
}

// ── 메인 ──────────────────────────────────────────────────────
export default function RankingPage() {
  const { user } = useAuth();
  const router   = useRouter();

  const [rankings,    setRankings]    = useState<RankRow[]>([]);
  const [awards,      setAwards]      = useState<Award[]>([]);
  const [myRank,      setMyRank]      = useState<MyRank>(null);
  const [totalUsers,  setTotalUsers]  = useState(0);
  const [weekStart,   setWeekStart]   = useState("");
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [activeTab,   setActiveTab]   = useState<"rank" | "awards">("rank");

  const load = useCallback(async () => {
    setLoading(true);
    const uid = user?.id ?? "";
    const res  = await fetch(`/api/rankings${uid ? `?uid=${uid}` : ""}`);
    const data = await res.json();
    setRankings(data.rankings ?? []);
    setAwards(data.awards ?? []);
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

  return (
    <div style={{ minHeight: "100vh", background: "#0d0d0d", color: "#e8e0d0" }}>

      {/* ── 헤더 ── */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 30, height: 56,
        background: "rgba(13,13,13,0.96)", backdropFilter: "blur(20px)",
        borderBottom: "0.5px solid rgba(255,255,255,0.06)",
        display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px",
      }}>
        <button onClick={() => router.back()} style={{ background: "none", border: "none", color: "#c8bfb0", fontSize: 20, cursor: "pointer", lineHeight: 1 }}>&lt;</button>
        <span style={{ fontSize: 15, fontWeight: 600, color: "#e8e0d0" }}>🏆 주간 랭킹</span>
        <div style={{ width: 32 }} />
      </nav>

      <div style={{ maxWidth: 480, margin: "0 auto", padding: "0 16px 80px" }}>

        {/* ── 타이틀 ── */}
        <div style={{ padding: "28px 0 20px", textAlign: "center" }}>
          <p style={{ fontSize: 13, color: "#c8bfb0", marginBottom: 6, ...NUM }}>{weekLabel}</p>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#e8e0d0", margin: 0 }}>이번 주 투자의 신 🏆</h1>
          <p style={{ fontSize: 12, color: "#c8bfb0", marginTop: 6, letterSpacing: "0.04em" }}>
            투자 수익률로 결정되는 진짜 실력 대결
          </p>
          <p style={{ fontSize: 12, color: "#c8bfb0", marginTop: 4 }}>
            {lastUpdated ? `${timeAgo(lastUpdated)} 업데이트` : "아직 계산된 데이터가 없어요"}
          </p>
        </div>

        {/* ── 내 랭킹 카드 ── */}
        {user && myRank && (
          <div style={{
            background: "linear-gradient(135deg, rgba(250,202,62,0.08) 0%, rgba(13,13,13,0) 100%)",
            border: "0.5px solid rgba(250,202,62,0.25)", borderRadius: 16,
            padding: "16px 20px", marginBottom: 20,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <TierBadge tier={getTier(myRank.return_rate)} size={48} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: "#FACA3E", marginBottom: 4, fontWeight: 600, letterSpacing: "0.04em" }}>내 투자 성적</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <span style={{ fontSize: 26, fontWeight: 700, ...NUM }}>#{myRank.rank_position}</span>
                  <span style={{ fontSize: 16, fontWeight: 700, color: myRank.return_rate >= 0 ? "#7ed4a0" : "#f07070", ...NUM }}>
                    {formatRate(myRank.return_rate)}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: "#c8bfb0", marginTop: 2 }}>
                  {myPercentile !== null ? `상위 ${100 - myPercentile}% · ` : ""}
                  {TIER_CONFIG[getTier(myRank.return_rate)].label} 티어
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 12, color: "#c8bfb0" }}>거래 횟수</div>
                <div style={{ fontSize: 18, fontWeight: 700, ...NUM }}>{myRank.trade_count}회</div>
              </div>
            </div>
            {/* 티어 설명 */}
            <div style={{
              marginTop: 12, paddingTop: 12,
              borderTop: "0.5px solid rgba(255,255,255,0.06)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <span style={{ fontSize: 12, color: "#c8bfb0" }}>
                {myRank.return_rate >= 50 ? "🔥 시장을 이긴 투자자예요!" :
                 myRank.return_rate >= 30 ? "📈 훌륭한 수익률이에요!" :
                 myRank.return_rate >= 10 ? "💪 평균을 크게 웃돌고 있어요" :
                 myRank.return_rate >= 0  ? "✨ 수익권에 있어요" :
                 "📉 다음 게임을 노려보세요!"}
              </span>
              <span style={{ fontSize: 11, color: "#c8bfb0", ...NUM }}>{totalUsers}명 중 {myRank.rank_position}위</span>
            </div>
          </div>
        )}

        {/* ── 내 라이벌 ── */}
        {user && myRank && myRank.rank_position > 1 && (() => {
          const above = rankings.find(r => r.rank_position === myRank.rank_position - 1);
          const below = rankings.find(r => r.rank_position === myRank.rank_position + 1);
          if (!above && !below) return null;
          return (
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 15, color: "#c8bfb0", marginBottom: 8, textAlign: "center" }}>⚔️ 내 라이벌</p>
              <div style={{ display: "flex", gap: 8 }}>
                {above && (
                  <div style={{ flex: 1, background: "rgba(255,255,255,0.03)", border: "0.5px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "12px 14px" }}>
                    <div style={{ fontSize: 15, color: "#FACA3E", marginBottom: 4 }}>▲ 위</div>
                    <div style={{ fontSize: 15, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{above.nickname}</div>
                    <div style={{ fontSize: 15, color: "#7ed4a0", ...NUM }}>{formatRate(above.return_rate)}</div>
                  </div>
                )}
                {below && (
                  <div style={{ flex: 1, background: "rgba(255,255,255,0.03)", border: "0.5px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "12px 14px" }}>
                    <div style={{ fontSize: 15, color: "#f07070", marginBottom: 4 }}>▼ 아래</div>
                    <div style={{ fontSize: 15, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{below.nickname}</div>
                    <div style={{ fontSize: 15, color: "#f07070", ...NUM }}>{formatRate(below.return_rate)}</div>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* ── 탭 ── */}
        <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: 4 }}>
          {(["rank", "awards"] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              flex: 1, padding: "9px 0", borderRadius: 8, border: "none",
              background: activeTab === tab ? "rgba(250,202,62,0.12)" : "transparent",
              color: activeTab === tab ? "#FACA3E" : "#c8bfb0",
              fontSize: 15, fontWeight: activeTab === tab ? 600 : 400, cursor: "pointer",
              transition: "all 0.15s",
            }}>
              {tab === "rank" ? "📊 수익률 순위" : "🏅 이번 주 수상자"}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#c8bfb0", fontSize: 15 }}>
            랭킹 불러오는 중...
          </div>
        ) : activeTab === "rank" ? (
          <div>
            {rankings.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 0" }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>🎮</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: "#e8e0d0", marginBottom: 8 }}>이번 주 게임이 시작됐어요</div>
                <div style={{ fontSize: 13, color: "#c8bfb0", lineHeight: 1.7 }}>
                  종목에서 매수하면<br />수익률 순위에 자동으로 올라가요!
                </div>
              </div>
            ) : (
              <>
                {/* TOP 3 포디엄 */}
                {rankings.length >= 3 && (
                  <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 8, marginBottom: 28, padding: "0 8px" }}>
                    <PodiumCard rank={rankings[1]} position={2} />
                    <PodiumCard rank={rankings[0]} position={1} />
                    <PodiumCard rank={rankings[2]} position={3} />
                  </div>
                )}

                {/* 4위~ */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {rankings.slice(3).map((row) => (
                    <RankListRow key={row.user_id} row={row} isMe={row.user_id === user?.id} />
                  ))}
                </div>

                <p style={{ textAlign: "center", fontSize: 15, color: "#c8bfb0", marginTop: 20 }}>
                  총 {totalUsers}명 참여 · 2시간마다 업데이트
                </p>
              </>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {Object.entries(AWARD_CONFIG).map(([cat, cfg]) => {
              const award  = awards.find(a => a.category === cat);
              const winner = award ? rankings.find(r => r.user_id === award.user_id) : null;
              return (
                <AwardCard key={cat} cfg={cfg} winner={winner ?? null} award={award ?? null} isMe={award?.user_id === user?.id} />
              );
            })}
            {awards.length === 0 && (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <div style={{ fontSize: 16, color: "#e8e0d0", marginBottom: 8 }}>이번 주 수상자가 아직 없어요</div>
                <div style={{ fontSize: 15, color: "#c8bfb0" }}>모의투자 후 새로고침 해보세요</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── 포디엄 카드 (1~3위) ───────────────────────────────────────
function PodiumCard({ rank, position }: { rank: RankRow; position: 1 | 2 | 3 }) {
  const tier    = getTier(rank.return_rate);
  const podiumH = ({ 1: 110, 2: 80, 3: 64 } as const)[position];
  const isFirst = position === 1;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      {isFirst && <span style={{ fontSize: 20 }}>👑</span>}

      <div style={{ position: "relative" }}>
        {rank.avatar_url ? (
          <img src={rank.avatar_url} alt={rank.nickname} style={{ width: isFirst ? 52 : 42, height: isFirst ? 52 : 42, borderRadius: "50%", objectFit: "cover", border: `2px solid ${TIER_CONFIG[tier].color}` }} />
        ) : (
          <div style={{ width: isFirst ? 52 : 42, height: isFirst ? 52 : 42, borderRadius: "50%", background: "#242424", border: `2px solid ${TIER_CONFIG[tier].color}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: isFirst ? 20 : 16, color: "#c8bfb0" }}>
            {rank.nickname[0]?.toUpperCase() ?? "?"}
          </div>
        )}
        <div style={{ position: "absolute", bottom: -4, right: -4 }}>
          <TierBadge tier={tier} size={20} />
        </div>
      </div>

      <div style={{ fontSize: isFirst ? 14 : 13, fontWeight: 500, maxWidth: 72, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "center", color: "#e8e0d0" }}>
        {rank.nickname}
      </div>

      {rank.equipped_title && TITLE_META[rank.equipped_title] ? (
        <div style={{ fontSize: 10, color: TITLE_META[rank.equipped_title].color, textAlign: "center", maxWidth: 80, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {TITLE_META[rank.equipped_title].emoji} {TITLE_META[rank.equipped_title].label}
        </div>
      ) : null}

      <div style={{ fontSize: isFirst ? 15 : 14, fontWeight: 700, color: rank.return_rate >= 0 ? "#7ed4a0" : "#f07070", fontFamily: "var(--font-inter), monospace" }}>
        {formatRate(rank.return_rate)}
      </div>
      {rank.total_invested > 0 && (
        <div style={{ fontSize: 10, color: "#c8bfb0", marginTop: 1 }}>
          {rank.total_invested.toLocaleString("ko-KR")}P
        </div>
      )}

      <div style={{
        width: "100%", height: podiumH, borderRadius: "8px 8px 0 0",
        background: TIER_CONFIG[tier].gradient,
        boxShadow: `0 -4px 20px ${TIER_CONFIG[tier].glow}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: isFirst ? 24 : 20, fontWeight: 700, color: "#0d0d0d",
      }}>
        {position}
      </div>
    </div>
  );
}

// ── 리스트 행 (4위~) ──────────────────────────────────────────
function RankListRow({ row, isMe }: { row: RankRow; isMe: boolean }) {
  const tier      = getTier(row.return_rate);
  const cfg       = TIER_CONFIG[tier];
  const isProfit  = row.return_rate >= 0;
  const rateColor = isProfit ? "#7ed4a0" : "#f07070";
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      background: isMe ? "rgba(250,202,62,0.06)" : "rgba(255,255,255,0.02)",
      border: `0.5px solid ${isMe ? "rgba(250,202,62,0.2)" : "rgba(255,255,255,0.05)"}`,
      borderRadius: 12, padding: "10px 14px",
    }}>
      <div style={{ width: 28, textAlign: "center", fontSize: 15, fontWeight: 600, color: "#c8bfb0", flexShrink: 0, fontFamily: "var(--font-inter),monospace" }}>
        {row.rank_position}
      </div>

      <TierBadge tier={tier} size={32} />

      {row.avatar_url ? (
        <img src={row.avatar_url} alt={row.nickname} style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: `1px solid ${cfg.color}40` }} />
      ) : (
        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#1a1a1a", border: `1px solid ${cfg.color}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, color: "#c8bfb0", flexShrink: 0 }}>
          {row.nickname[0]?.toUpperCase() ?? "?"}
        </div>
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4, overflow: "hidden" }}>
          <span style={{ fontSize: 14, fontWeight: isMe ? 600 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#e8e0d0" }}>
            {row.nickname}
          </span>
          {isMe && <span style={{ fontSize: 10, background: "#FACA3E", color: "#0d0d0d", borderRadius: 4, padding: "1px 5px", fontWeight: 700, flexShrink: 0 }}>나</span>}
        </div>
        {row.equipped_title && TITLE_META[row.equipped_title] ? (
          <div style={{ fontSize: 11, marginTop: 2, color: TITLE_META[row.equipped_title].color, display: "flex", alignItems: "center", gap: 3 }}>
            <span>{TITLE_META[row.equipped_title].emoji}</span>
            <span>{TITLE_META[row.equipped_title].label}</span>
          </div>
        ) : (
          <div style={{ fontSize: 11, color: cfg.color, marginTop: 2 }}>{cfg.label} · {row.trade_count}회 거래</div>
        )}
      </div>

      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          background: isProfit ? "rgba(126,212,160,0.1)" : "rgba(240,112,112,0.1)",
          border: `0.5px solid ${isProfit ? "rgba(126,212,160,0.25)" : "rgba(240,112,112,0.25)"}`,
          borderRadius: 8, padding: "3px 10px",
        }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: rateColor, fontFamily: "var(--font-inter),monospace" }}>
            {formatRate(row.return_rate)}
          </span>
        </div>
        <div style={{ fontSize: 11, color: "#c8bfb0", marginTop: 3 }}>
          {row.total_invested > 0 ? `${row.total_invested.toLocaleString("ko-KR")}P 투자` : ""}
        </div>
      </div>
    </div>
  );
}

// ── 수상 카드 ─────────────────────────────────────────────────
function AwardCard({
  cfg, winner, award, isMe
}: {
  cfg: { emoji: string; title: string; subtitle: string; color: string };
  winner: RankRow | null;
  award: Award | null;
  isMe: boolean;
}) {
  return (
    <div style={{
      background: award ? `linear-gradient(135deg, ${cfg.color}0d 0%, rgba(13,13,13,0) 100%)` : "rgba(255,255,255,0.02)",
      border: `0.5px solid ${award ? cfg.color + "30" : "rgba(255,255,255,0.05)"}`,
      borderRadius: 16, padding: "16px 18px",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 14, flexShrink: 0,
          background: award ? `${cfg.color}18` : "rgba(255,255,255,0.04)",
          border: `0.5px solid ${award ? cfg.color + "40" : "rgba(255,255,255,0.06)"}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 24,
          boxShadow: award ? `0 4px 16px ${cfg.color}20` : "none",
        }}>
          {cfg.emoji}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <span style={{ fontSize: 16, fontWeight: 600, color: award ? cfg.color : "#c8bfb0" }}>
              {cfg.title}
            </span>
            {isMe && (
              <span style={{ fontSize: 15, background: "#FACA3E", color: "#0d0d0d", borderRadius: 4, padding: "1px 6px", fontWeight: 700 }}>
                나
              </span>
            )}
          </div>
          <div style={{ fontSize: 15, color: "#c8bfb0", marginBottom: 10 }}>{cfg.subtitle}</div>

          {award && winner ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {winner.avatar_url ? (
                <img src={winner.avatar_url} alt={winner.nickname} style={{ width: 26, height: 26, borderRadius: "50%", objectFit: "cover" }} />
              ) : (
                <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#242424", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, color: "#c8bfb0" }}>
                  {winner.nickname[0]?.toUpperCase()}
                </div>
              )}
              <span style={{ fontSize: 15, fontWeight: 500, color: "#e8e0d0" }}>{winner.nickname}</span>
              <span style={{ fontSize: 15, color: cfg.color, marginLeft: "auto", fontFamily: "var(--font-inter),monospace" }}>
                {award.metric_val !== null ? `${award.metric_val >= 0 ? "+" : ""}${award.metric_val.toFixed(1)}%` : ""}
              </span>
            </div>
          ) : (
            <div style={{ fontSize: 15, color: "#c8bfb0" }}>— 아직 수상자 없음</div>
          )}
        </div>
      </div>
    </div>
  );
}
