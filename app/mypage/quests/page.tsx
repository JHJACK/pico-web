"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/app/lib/authContext";
import { supabase, todayKST } from "@/app/lib/supabase";
import { BackIcon } from "@/app/components/BackIcon";

// ─── 색상 ────────────────────────────────────────────────────────────────────
const C = {
  bg:    "#0d0d0d",
  card:  "#141414",
  inner: "#1a1a1a",
  text:  "#e8e0d0",
  text2: "#c8bfb0",
  gold:  "#FACA3E",
  green: "#7ed4a0",
  red:   "#f07878",
  border: "rgba(255,255,255,0.07)",
} as const;

// ─── 퀘스트 정의 ─────────────────────────────────────────────────────────────
type QuestId =
  | "daily_attend" | "daily_battle" | "daily_news"
  | "quiz" | "first_invest" | "profit_sell"
  | "streak_7" | "streak_14" | "streak_21" | "streak_30"
  | "weekly_top3";

interface Quest {
  id: QuestId;
  title: string;
  desc: string;
  points: number;
  pointSuffix?: string; // "×3회" 등
  type: "daily" | "once" | "repeatable" | "weekly";
  href: string;
  comingSoon?: boolean;
}

const QUEST_SECTIONS: { label: string; emoji: string; quests: Quest[] }[] = [
  {
    label: "데일리 퀘스트",
    emoji: "📅",
    quests: [
      { id: "daily_attend", title: "일일 출석 체크", desc: "매일 자동 출석 체크", points: 50, type: "daily", href: "/mypage/attendance" },
      { id: "daily_battle", title: "오늘의 선택", desc: "주가 상승/하락 예측하기", points: 100, type: "daily", href: "/" },
      { id: "daily_news", title: "뉴스 읽기", desc: "경제 뉴스 읽기 (1일 최대 3회)", points: 10, pointSuffix: "×3", type: "daily", href: "/", comingSoon: true },
    ],
  },
  {
    label: "투자 퀘스트",
    emoji: "💹",
    quests: [
      { id: "quiz", title: "투자 DNA 퀴즈", desc: "나의 투자 성향 알아보기", points: 300, type: "once", href: "/quiz" },
      { id: "first_invest", title: "첫 모의투자", desc: "처음으로 종목에 투자하기", points: 200, type: "once", href: "/" },
      { id: "profit_sell", title: "모의투자 수익 달성", desc: "매도 시 수익이 발생하면 지급", points: 50, type: "repeatable", href: "/" },
    ],
  },
  {
    label: "출석 보너스",
    emoji: "🔥",
    quests: [
      { id: "streak_7",  title: "7일 연속 출석",  desc: "7일 연속으로 출석 체크하기",  points: 100, type: "once", href: "/mypage/attendance" },
      { id: "streak_14", title: "14일 연속 출석", desc: "14일 연속으로 출석 체크하기", points: 200, type: "once", href: "/mypage/attendance" },
      { id: "streak_21", title: "21일 연속 출석", desc: "21일 연속으로 출석 체크하기", points: 300, type: "once", href: "/mypage/attendance" },
      { id: "streak_30", title: "30일 연속 출석", desc: "30일 연속으로 출석 체크하기", points: 500, type: "once", href: "/mypage/attendance" },
    ],
  },
  {
    label: "랭킹 퀘스트",
    emoji: "🏅",
    quests: [
      { id: "weekly_top3", title: "주간 수익률 TOP 3", desc: "이번 주 모의투자 수익률 상위 3위 달성", points: 300, type: "weekly", href: "/", comingSoon: true },
    ],
  },
];

// ─── 퀘스트 완료 상태 타입 ────────────────────────────────────────────────────
type QuestStatus = Partial<Record<QuestId, boolean | number>>;

// ─── 메인 ────────────────────────────────────────────────────────────────────
export default function QuestsPage() {
  const router = useRouter();
  const { user, userRow, loading } = useAuth();

  const [status, setStatus] = useState<QuestStatus>({});
  const [streak, setStreak]   = useState(0);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user || !userRow) return;
    fetchQuestStatus();
  }, [user, userRow]);

  async function fetchQuestStatus() {
    if (!user) return;
    setFetching(true);
    const today = todayKST();

    const [attendRes, battleRes, investRes, historyRes, attHistRes] = await Promise.all([
      // 오늘 출석 여부
      supabase.from("attendance").select("id").eq("user_id", user.id).eq("date", today).maybeSingle(),
      // 오늘 배틀 투표 여부
      supabase.from("battle_votes").select("id").eq("user_id", user.id).eq("date", today).maybeSingle(),
      // 모의투자 전체 건수
      supabase.from("mock_investments").select("*", { count: "exact", head: true }).eq("user_id", user.id),
      // 오늘 포인트 내역 (수익 달성 퀘스트 횟수 확인)
      supabase.from("point_history")
        .select("reason")
        .eq("user_id", user.id)
        .ilike("reason", "%수익 달성 퀘스트%")
        .gte("created_at", today + "T00:00:00+09:00"),
      // 연속 출석 계산용
      supabase.from("attendance").select("date").eq("user_id", user.id).eq("attended", true)
        .order("date", { ascending: false }).limit(35),
    ]);

    // 연속 출석 계산
    const dates: string[] = (attHistRes.data ?? []).map((r: { date: string }) => r.date);
    const calcStreak = (ds: string[]) => {
      if (!ds.length) return 0;
      const sorted = [...ds].sort((a, b) => b.localeCompare(a));
      const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
      const yd = new Date(); yd.setDate(yd.getDate() - 1);
      const yesterday = yd.toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
      if (sorted[0] !== today && sorted[0] !== yesterday) return 0;
      let s = 1;
      for (let i = 0; i < sorted.length - 1; i++) {
        const diff = (new Date(sorted[i]).getTime() - new Date(sorted[i + 1]).getTime()) / 86_400_000;
        if (diff === 1) s++; else break;
      }
      return s;
    };
    const currentStreak = calcStreak(dates);
    setStreak(currentStreak);

    const profitQuestToday = (historyRes.data ?? []).length;

    setStatus({
      daily_attend:  !!attendRes.data,
      daily_battle:  !!battleRes.data,
      daily_news:    false, // 미구현
      quiz:          !!userRow?.investor_type,
      first_invest:  (investRes.count ?? 0) > 0,
      profit_sell:   profitQuestToday > 0 ? profitQuestToday : false,
      streak_7:      currentStreak >= 7,
      streak_14:     currentStreak >= 14,
      streak_21:     currentStreak >= 21,
      streak_30:     currentStreak >= 30,
      weekly_top3:   false, // 미구현
    });
    setFetching(false);
  }

  // 완료된 퀘스트 수 (comingSoon 제외)
  const allQuests = QUEST_SECTIONS.flatMap((s) => s.quests).filter((q) => !q.comingSoon);
  const doneCount = allQuests.filter((q) => !!status[q.id]).length;

  if (loading || !user || !userRow) return null;

  return (
    <main style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "var(--font-paperlogy), var(--font-noto), sans-serif" }}>
      <style>{`
        .lbl { font-size: 13px; }
        @media (min-width: 768px) { .lbl { font-size: 15px; } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
        .quest-row { animation: fadeIn 0.2s ease; }
      `}</style>

      {/* 헤더 */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 30, height: 56,
        background: "rgba(13,13,13,0.96)", backdropFilter: "blur(20px)",
        borderBottom: `0.5px solid ${C.border}`,
        display: "flex", alignItems: "center", padding: "0 20px", gap: 14,
      }}>
        <Link href="/mypage" style={{ textDecoration: "none" }}><BackIcon /></Link>
      </nav>

      <div style={{ maxWidth: 700, margin: "0 auto", padding: "20px clamp(16px,4vw,24px) 48px" }}>

        {/* 진행 현황 카드 */}
        <div style={{
          background: C.card, borderRadius: 18, padding: "20px 22px",
          border: `0.5px solid ${C.border}`, marginBottom: 20,
          display: "flex", alignItems: "center", gap: 16,
        }}>
          <div style={{ flex: 1 }}>
            <p className="lbl" style={{ color: C.text2, marginBottom: 6 }}>오늘의 퀘스트 진행률</p>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <span style={{ fontSize: 28, fontWeight: 600, color: C.gold, fontFamily: "var(--font-inter)" }}>
                {fetching ? "—" : doneCount}
              </span>
              <span style={{ fontSize: 16, color: C.text2 }}>/ {allQuests.length} 완료</span>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <p className="lbl" style={{ color: C.text2, marginBottom: 4 }}>연속 출석</p>
            <p style={{ fontSize: 20, fontWeight: 600, color: C.text, fontFamily: "var(--font-inter)" }}>
              🔥 {streak}일
            </p>
          </div>
        </div>

        {/* 퀘스트 섹션들 */}
        {QUEST_SECTIONS.map((section) => (
          <div key={section.label} style={{ marginBottom: 16 }}>
            {/* 섹션 헤더 */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, paddingLeft: 2 }}>
              <span style={{ fontSize: 16 }}>{section.emoji}</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: C.text2 }}>{section.label}</span>
            </div>

            {/* 퀘스트 카드 */}
            <div style={{ background: C.card, borderRadius: 18, border: `0.5px solid ${C.border}`, overflow: "hidden" }}>
              {section.quests.map((quest, idx) => {
                const isDone = !!status[quest.id];
                const repeatCount = typeof status[quest.id] === "number" ? status[quest.id] as number : 0;
                const isLast = idx === section.quests.length - 1;

                return (
                  <div
                    key={quest.id}
                    className="quest-row"
                    style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "14px 16px",
                      borderBottom: isLast ? "none" : `0.5px solid rgba(255,255,255,0.05)`,
                      opacity: quest.comingSoon ? 0.5 : 1,
                    }}
                  >
                    {/* 체크박스 */}
                    <div style={{
                      width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                      border: isDone
                        ? "none"
                        : `1.5px solid rgba(255,255,255,0.2)`,
                      background: isDone ? C.gold : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {isDone && <span style={{ fontSize: 14, color: "#0d0d0d", fontWeight: 700 }}>✓</span>}
                    </div>

                    {/* 내용 */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 14, fontWeight: 500, color: isDone ? C.text2 : C.text }}>
                          {quest.title}
                        </span>
                        {/* 타입 뱃지 */}
                        {quest.comingSoon ? (
                          <span style={{ fontSize: 14, padding: "2px 6px", borderRadius: 6, background: "rgba(255,255,255,0.07)", color: C.text2, fontWeight: 500 }}>준비 중</span>
                        ) : quest.type === "repeatable" ? (
                          <span style={{ fontSize: 14, padding: "2px 6px", borderRadius: 6, background: "rgba(126,212,160,0.12)", color: C.green, fontWeight: 500 }}>반복 가능</span>
                        ) : quest.type === "daily" ? (
                          <span style={{ fontSize: 14, padding: "2px 6px", borderRadius: 6, background: "rgba(250,202,62,0.1)", color: C.gold, fontWeight: 500 }}>매일</span>
                        ) : quest.type === "weekly" ? (
                          <span style={{ fontSize: 14, padding: "2px 6px", borderRadius: 6, background: "rgba(150,120,255,0.12)", color: "#a890f0", fontWeight: 500 }}>주간</span>
                        ) : null}
                      </div>
                      <p className="lbl" style={{ color: C.text2, margin: "2px 0 0", lineHeight: 1.4 }}>
                        {quest.desc}
                        {quest.type === "repeatable" && repeatCount > 0 && ` · 오늘 ${repeatCount}회 달성`}
                      </p>
                    </div>

                    {/* 포인트 */}
                    <div style={{ textAlign: "right", flexShrink: 0, marginRight: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: isDone ? C.text2 : C.gold, fontFamily: "var(--font-inter)" }}>
                        +{quest.points}P{quest.pointSuffix ?? ""}
                      </span>
                    </div>

                    {/* 하러 가기 버튼 */}
                    {quest.comingSoon ? (
                      <div style={{ width: 72, flexShrink: 0 }} />
                    ) : (
                      <button
                        onClick={() => router.push(quest.href)}
                        style={{
                          flexShrink: 0, padding: "7px 12px",
                          borderRadius: 10, fontSize: 14, fontWeight: 600,
                          border: `0.5px solid ${isDone ? "rgba(255,255,255,0.08)" : "rgba(250,202,62,0.3)"}`,
                          background: isDone ? "rgba(255,255,255,0.04)" : "rgba(250,202,62,0.08)",
                          color: isDone ? C.text2 : C.gold,
                          cursor: "pointer", whiteSpace: "nowrap",
                        }}
                      >
                        {isDone && quest.type === "once" ? "완료" : "하러 가기"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* 포인트 안내 */}
        <div style={{
          marginTop: 8, padding: "14px 18px", borderRadius: 14,
          background: "rgba(250,202,62,0.05)", border: "0.5px solid rgba(250,202,62,0.15)",
        }}>
          <p className="lbl" style={{ color: C.text2, lineHeight: 1.8, margin: 0 }}>
            💡 적립된 포인트는 <span style={{ color: C.gold }}>포인트 스토어</span>에서 스타벅스, 편의점 쿠폰으로 교환할 수 있어요.<br />
            (10,000P = 스타벅스 아이스 아메리카노 1잔)
          </p>
        </div>
      </div>
    </main>
  );
}
