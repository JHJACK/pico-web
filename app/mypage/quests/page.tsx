"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/app/lib/authContext";
import { supabase, todayKST, awardOnceQuest } from "@/app/lib/supabase";
import { BackIcon } from "@/app/components/BackIcon";

// ── 색상 ──────────────────────────────────────────────────────────────────────
const C = {
  bg:     "#0d0d0d",
  card:   "#141414",
  text:   "#e8e0d0",
  text2:  "#c8bfb0",
  gold:   "#FACA3E",
  green:  "#7ed4a0",
  blue:   "#7eb8f7",
  purple: "#c4b0fc",
  red:    "#f07878",
  border: "rgba(255,255,255,0.07)",
} as const;

// ── streak 계산 ───────────────────────────────────────────────────────────────
function calcStreak(dates: string[]): number {
  if (!dates.length) return 0;
  const sorted = [...dates].sort((a, b) => b.localeCompare(a));
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
  const yd = new Date(); yd.setDate(yd.getDate() - 1);
  const yesterday = yd.toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
  if (sorted[0] !== today && sorted[0] !== yesterday) return 0;
  let s = 1;
  for (let i = 1; i < sorted.length; i++) {
    const diff = (new Date(sorted[i - 1]).getTime() - new Date(sorted[i]).getTime()) / 86_400_000;
    if (diff === 1) s++; else break;
  }
  return s;
}

// ── 배틀 연속 정답 계산 ────────────────────────────────────────────────────────
function calcBattleStreak(votes: { date: string; is_correct: boolean | null }[]): number {
  const judged = [...votes]
    .filter(v => v.is_correct !== null)
    .sort((a, b) => b.date.localeCompare(a.date));
  let s = 0;
  for (const v of judged) {
    if (v.is_correct === true) s++;
    else break;
  }
  return s;
}

// ── 타입 뱃지 ─────────────────────────────────────────────────────────────────
const TYPE_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  daily:      { label: "매일",   bg: "rgba(250,202,62,0.12)",  color: "#FACA3E" },
  once:       { label: "달성시", bg: "rgba(126,212,160,0.12)", color: "#7ed4a0" },
  repeatable: { label: "반복",   bg: "rgba(126,184,247,0.12)", color: "#7eb8f7" },
  monthly:    { label: "월간",   bg: "rgba(196,176,252,0.12)", color: "#c4b0fc" },
  weekly:     { label: "주간",   bg: "rgba(240,120,120,0.12)", color: "#f07878" },
  comingSoon: { label: "준비 중",bg: "rgba(255,255,255,0.07)", color: "#c8bfb0" },
};

// ── 퀘스트 정의 ───────────────────────────────────────────────────────────────
interface Quest {
  id: string;
  emoji: string;
  title: string;
  desc: string;
  points: number;
  pointSuffix?: string;
  type: "daily" | "once" | "repeatable" | "monthly" | "weekly";
  href?: string;
  comingSoon?: boolean;
}

const SECTIONS: {
  id: string;
  label: string;
  emoji: string;
  sub?: string;
  quests: Quest[];
}[] = [
  {
    id: "daily",
    label: "데일리 퀘스트",
    emoji: "📅",
    quests: [
      { id: "daily_attend", emoji: "⭐", title: "일일 출석 체크",    desc: "로그인하면 자동 출석",            points: 50,  type: "daily"      },
      { id: "daily_battle", emoji: "⚡", title: "오늘의 선택",       desc: "주가 상승/하락 예측하기",          points: 100, type: "daily", href: "/" },
      { id: "daily_news",   emoji: "📰", title: "뉴스 읽기",         desc: "경제 뉴스 읽기 (1일 최대 3회)",  points: 10,  pointSuffix: "×3", type: "daily", comingSoon: true },
    ],
  },
  {
    id: "invest",
    label: "모의투자 퀘스트",
    emoji: "💹",
    quests: [
      { id: "quiz",         emoji: "🧬", title: "투자 DNA 퀴즈",     desc: "나의 투자 성향 알아보기",         points: 300, type: "once", href: "/quiz" },
      { id: "first_invest", emoji: "🌱", title: "첫 모의투자",        desc: "처음으로 종목에 투자하기",         points: 200, type: "once"      },
      { id: "invest_3",     emoji: "📈", title: "투자 3회 달성",      desc: "모의투자 3번 해보기",             points: 150, type: "once"      },
      { id: "invest_10",    emoji: "🚀", title: "투자 10회 달성",     desc: "모의투자 10번 해보기",            points: 300, type: "once"      },
      { id: "invest_30",    emoji: "💼", title: "투자 30회 달성",     desc: "모의투자 30번은 진짜 고수",       points: 500, type: "once"      },
    ],
  },
  {
    id: "profit",
    label: "수익 달성 퀘스트",
    emoji: "💸",
    quests: [
      { id: "first_profit",  emoji: "💰", title: "첫 수익 매도",       desc: "수익이 난 종목 처음 매도하기",    points: 100, type: "once"       },
      { id: "profit_5pct",   emoji: "🔥", title: "수익률 5% 달성",     desc: "수익률 5% 이상으로 매도",        points: 100, type: "repeatable" },
      { id: "profit_10pct",  emoji: "💎", title: "수익률 10% 달성",    desc: "수익률 10% 이상으로 매도",       points: 200, type: "repeatable" },
      { id: "profit_20pct",  emoji: "👑", title: "수익률 20% 대박",    desc: "수익률 20% 이상 매도 (1회)",     points: 500, type: "once"       },
    ],
  },
  {
    id: "battle",
    label: "배틀 달성 퀘스트",
    emoji: "⚔️",
    quests: [
      { id: "battle_first",    emoji: "⚡", title: "첫 정답",          desc: "오늘의 선택 첫 번째 정답",        points: 50,  type: "once", href: "/" },
      { id: "battle_streak_3", emoji: "🎯", title: "정답 3연속",        desc: "오늘의 선택 3일 연속 정답",       points: 200, type: "once", href: "/" },
      { id: "battle_streak_7", emoji: "👑", title: "정답 7연속",        desc: "오늘의 선택 7일 연속 정답",       points: 500, type: "once", href: "/" },
    ],
  },
  {
    id: "battle_monthly",
    label: "배틀 월간 퀘스트",
    emoji: "🗓️",
    sub: "매달 1일 초기화",
    quests: [
      { id: "battle_m5",    emoji: "🏃", title: "이번 달 배틀 5회",     desc: "이번 달 오늘의 선택 5회 참여",        points: 100, type: "monthly", href: "/" },
      { id: "battle_mc10",  emoji: "🎯", title: "이번 달 정답 10회",    desc: "이번 달 오늘의 선택 정답 10번",       points: 250, type: "monthly", href: "/" },
      { id: "battle_mc20",  emoji: "🔥", title: "이번 달 정답 20회",    desc: "이번 달 오늘의 선택 정답 20번",       points: 450, type: "monthly", href: "/" },
      { id: "battle_mr70",  emoji: "🏆", title: "정답률 70%+ 달성",    desc: "최소 15회 참여 후 정답률 70% 이상",   points: 500, type: "monthly", href: "/" },
      { id: "weekly_top3",  emoji: "🏅", title: "주간 수익률 TOP 3",   desc: "이번 주 모의투자 수익률 상위 3위",    points: 300, type: "weekly", comingSoon: true },
    ],
  },
  {
    id: "streak",
    label: "연속 출석 보너스",
    emoji: "🔥",
    quests: [
      { id: "streak_7",  emoji: "🥉", title: "7일 연속 출석",  desc: "7일 연속으로 출석하기",   points: 100, type: "once", href: "/mypage/attendance" },
      { id: "streak_14", emoji: "🥈", title: "14일 연속 출석", desc: "14일 연속으로 출석하기",  points: 200, type: "once", href: "/mypage/attendance" },
      { id: "streak_21", emoji: "🥇", title: "21일 연속 출석", desc: "21일 연속으로 출석하기",  points: 300, type: "once", href: "/mypage/attendance" },
      { id: "streak_30", emoji: "💎", title: "30일 연속 출석", desc: "30일 연속 완전 정복!",    points: 500, type: "once", href: "/mypage/attendance" },
    ],
  },
  {
    id: "attend_monthly",
    label: "출석 월간 퀘스트",
    emoji: "📆",
    sub: "매달 1일 초기화",
    quests: [
      { id: "attend_m20",      emoji: "📅", title: "이번 달 20일 출석", desc: "이번 달 20일 이상 출석하기",        points: 300, type: "monthly", href: "/mypage/attendance" },
      { id: "attend_mperfect", emoji: "🌕", title: "이번 달 개근",      desc: "이번 달 하루도 빠짐없이 출석",      points: 600, type: "monthly", href: "/mypage/attendance" },
    ],
  },
  {
    id: "collect",
    label: "도감 퀘스트",
    emoji: "📚",
    quests: [
      { id: "collect_1",  emoji: "📖", title: "첫 용어 수집",      desc: "투자 용어 첫 번째 수집하기",     points: 50,  type: "once" },
      { id: "collect_10", emoji: "📚", title: "용어 10개 수집",    desc: "투자 용어 10개 모으기",          points: 150, type: "once" },
      { id: "collect_30", emoji: "🏛️", title: "용어 30개 마스터",  desc: "투자 용어 30개 완전 정복",       points: 300, type: "once" },
    ],
  },
  {
    id: "milestone",
    label: "포인트 마일스톤",
    emoji: "🏆",
    quests: [
      { id: "pts_1000",  emoji: "💫", title: "누적 1,000P 달성",  desc: "포인트를 1,000P 모아보기",        points: 100, type: "once" },
      { id: "pts_5000",  emoji: "⭐", title: "누적 5,000P 달성",  desc: "포인트를 5,000P 모아보기",        points: 300, type: "once" },
      { id: "pts_10000", emoji: "🌟", title: "누적 10,000P 달성", desc: "포인트 10,000P 레전드 달성",      points: 500, type: "once" },
    ],
  },
];

// ── 상태 타입 ─────────────────────────────────────────────────────────────────
type StatusMap = Record<string, boolean | number>;
type ProgressMap = Record<string, { cur: number; max: number; label?: string }>;

// ── 메인 ─────────────────────────────────────────────────────────────────────
export default function QuestsPage() {
  const router = useRouter();
  const { user, userRow, loading, refreshUserRow } = useAuth();
  const [status,   setStatus]   = useState<StatusMap>({});
  const [progress, setProgress] = useState<ProgressMap>({});
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [user, loading, router]);

  const fetchQuestStatus = useCallback(async () => {
    if (!user || !userRow) return;
    setFetching(true);

    const today      = todayKST();
    const thisMonth  = today.slice(0, 7); // "YYYY-MM"
    const now        = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const todayNum   = parseInt(today.slice(8));

    const [
      attendTodayRes,
      battleTodayRes,
      investCountRes,
      soldInvRes,
      attHistRes,
      battleAllRes,
      learnCountRes,
      phRes,
    ] = await Promise.all([
      supabase.from("attendance").select("id").eq("user_id", user.id).eq("date", today).maybeSingle(),
      supabase.from("battle_votes").select("id").eq("user_id", user.id).eq("date", today).maybeSingle(),
      supabase.from("mock_investments").select("*", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("mock_investments").select("invested_points,final_points,sell_at").eq("user_id", user.id).eq("status", "sold"),
      supabase.from("attendance").select("date").eq("user_id", user.id).eq("attended", true).order("date", { ascending: false }),
      supabase.from("battle_votes").select("date,is_correct").eq("user_id", user.id).order("date", { ascending: false }),
      supabase.from("learn_collections").select("*", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("point_history").select("reason").eq("user_id", user.id),
    ]);

    // ── 기본 데이터 파싱 ────────────────────────────────────────────────────
    const earnedSet = new Set<string>((phRes.data ?? []).map((r: { reason: string }) => r.reason));
    const monthlyEarned = new Set(
      [...earnedSet].filter(r => r.includes(`·${thisMonth}`))
    );

    const attDates: string[] = (attHistRes.data ?? []).map((r: { date: string }) => r.date);
    const streak = calcStreak(attDates);
    const thisMonthAttend = attDates.filter(d => d.startsWith(thisMonth)).length;

    type BVote = { date: string; is_correct: boolean | null };
    const battleVotes = (battleAllRes.data ?? []) as BVote[];
    const battleStreak = calcBattleStreak(battleVotes);
    const monthBattles = battleVotes.filter(v => v.date.startsWith(thisMonth));
    const monthJudged  = monthBattles.filter(v => v.is_correct !== null);
    const monthCorrect = monthJudged.filter(v => v.is_correct === true).length;
    const monthTotal   = monthBattles.length;
    const monthRate    = monthJudged.length >= 15 ? monthCorrect / monthJudged.length : 0;

    const investCount = investCountRes.count ?? 0;
    type SoldRow = { invested_points: number; final_points: number | null };
    const soldInvs    = (soldInvRes.data ?? []) as SoldRow[];
    const firstProfit = soldInvs.some(inv => (inv.final_points ?? 0) > inv.invested_points);

    // 오늘 수익 퀘스트 달성 수 (point_history 기반)
    const todayPh = (phRes.data ?? []).filter((r: { reason: string }) =>
      r.reason === "수익률 5% 달성 퀘스트" || r.reason === "수익률 10% 달성 퀘스트"
    );
    const profit5Today  = todayPh.filter((r: { reason: string }) => r.reason === "수익률 5% 달성 퀘스트").length;
    const profit10Today = todayPh.filter((r: { reason: string }) => r.reason === "수익률 10% 달성 퀘스트").length;

    const learnCount   = learnCountRes.count ?? 0;
    const totalPoints  = userRow.total_points;

    // ── 월간 퀘스트 reason 헬퍼 ─────────────────────────────────────────────
    const mr = (base: string) => `${base}·${thisMonth}`;

    // ── "once" 퀘스트 자동 지급 (페이지 로드 시) ────────────────────────────
    let awarded = false;

    // 배틀 달성
    if (battleStreak >= 1 && await awardOnceQuest(user.id, "배틀 첫 정답 퀘스트",    50, earnedSet)) awarded = true;
    if (battleStreak >= 3 && await awardOnceQuest(user.id, "배틀 3연속 정답 퀘스트", 200, earnedSet)) awarded = true;
    if (battleStreak >= 7 && await awardOnceQuest(user.id, "배틀 7연속 정답 퀘스트", 500, earnedSet)) awarded = true;

    // 포인트 마일스톤
    if (totalPoints >= 1000  && await awardOnceQuest(user.id, "포인트 1000P 달성 퀘스트",  100, earnedSet)) awarded = true;
    if (totalPoints >= 5000  && await awardOnceQuest(user.id, "포인트 5000P 달성 퀘스트",  300, earnedSet)) awarded = true;
    if (totalPoints >= 10000 && await awardOnceQuest(user.id, "포인트 10000P 달성 퀘스트", 500, earnedSet)) awarded = true;

    // 배틀 월간 퀘스트
    if (monthTotal   >= 5  && await awardOnceQuest(user.id, mr("배틀 월간 5회 참여"),    100, monthlyEarned)) { earnedSet.add(mr("배틀 월간 5회 참여"));    awarded = true; }
    if (monthCorrect >= 10 && await awardOnceQuest(user.id, mr("배틀 월간 정답 10회"),   250, monthlyEarned)) { earnedSet.add(mr("배틀 월간 정답 10회"));   awarded = true; }
    if (monthCorrect >= 20 && await awardOnceQuest(user.id, mr("배틀 월간 정답 20회"),   450, monthlyEarned)) { earnedSet.add(mr("배틀 월간 정답 20회"));   awarded = true; }
    if (monthRate   >= 0.7 && await awardOnceQuest(user.id, mr("배틀 월간 정답률 70%"), 500, monthlyEarned)) { earnedSet.add(mr("배틀 월간 정답률 70%")); awarded = true; }

    // 출석 월간 퀘스트
    if (thisMonthAttend >= 20       && await awardOnceQuest(user.id, mr("출석 월간 20일"),  300, monthlyEarned)) { earnedSet.add(mr("출석 월간 20일"));  awarded = true; }
    if (thisMonthAttend >= todayNum && todayNum > 0 &&
        await awardOnceQuest(user.id, mr("출석 월간 개근"), 600, monthlyEarned)) { earnedSet.add(mr("출석 월간 개근")); awarded = true; }

    if (awarded) refreshUserRow();

    // ── 상태 세팅 ────────────────────────────────────────────────────────────
    setStatus({
      daily_attend:    !!attendTodayRes.data,
      daily_battle:    !!battleTodayRes.data,
      daily_news:      false,
      quiz:            !!userRow.investor_type,
      first_invest:    investCount >= 1,
      invest_3:        investCount >= 3  || earnedSet.has("모의투자 3회 달성 퀘스트"),
      invest_10:       investCount >= 10 || earnedSet.has("모의투자 10회 달성 퀘스트"),
      invest_30:       investCount >= 30 || earnedSet.has("모의투자 30회 달성 퀘스트"),
      first_profit:    firstProfit || earnedSet.has("첫 수익 매도 퀘스트"),
      profit_5pct:     profit5Today,
      profit_10pct:    profit10Today,
      profit_20pct:    earnedSet.has("수익률 20% 달성 퀘스트"),
      battle_first:    earnedSet.has("배틀 첫 정답 퀘스트"),
      battle_streak_3: earnedSet.has("배틀 3연속 정답 퀘스트"),
      battle_streak_7: earnedSet.has("배틀 7연속 정답 퀘스트"),
      battle_m5:       earnedSet.has(mr("배틀 월간 5회 참여")),
      battle_mc10:     earnedSet.has(mr("배틀 월간 정답 10회")),
      battle_mc20:     earnedSet.has(mr("배틀 월간 정답 20회")),
      battle_mr70:     earnedSet.has(mr("배틀 월간 정답률 70%")),
      weekly_top3:     false,
      streak_7:        streak >= 7,
      streak_14:       streak >= 14,
      streak_21:       streak >= 21,
      streak_30:       streak >= 30,
      attend_m20:      earnedSet.has(mr("출석 월간 20일")),
      attend_mperfect: earnedSet.has(mr("출석 월간 개근")),
      collect_1:       learnCount >= 1  || earnedSet.has("첫 용어 수집 퀘스트"),
      collect_10:      learnCount >= 10 || earnedSet.has("용어 10개 수집 퀘스트"),
      collect_30:      learnCount >= 30 || earnedSet.has("용어 30개 수집 퀘스트"),
      pts_1000:        earnedSet.has("포인트 1000P 달성 퀘스트"),
      pts_5000:        earnedSet.has("포인트 5000P 달성 퀘스트"),
      pts_10000:       earnedSet.has("포인트 10000P 달성 퀘스트"),
    });

    setProgress({
      battle_m5:       { cur: monthTotal,   max: 5,           label: `${monthTotal}/5회` },
      battle_mc10:     { cur: monthCorrect, max: 10,          label: `${monthCorrect}/10회` },
      battle_mc20:     { cur: monthCorrect, max: 20,          label: `${monthCorrect}/20회` },
      battle_mr70:     { cur: monthJudged.length, max: 15,    label: `${Math.round(monthRate * 100)}% (${monthJudged.length}회 참여)` },
      attend_m20:      { cur: thisMonthAttend, max: 20,       label: `${thisMonthAttend}/20일` },
      attend_mperfect: { cur: thisMonthAttend, max: daysInMonth, label: `${thisMonthAttend}/${daysInMonth}일` },
      invest_3:        { cur: Math.min(investCount, 3),  max: 3,  label: `${Math.min(investCount, 3)}/3회` },
      invest_10:       { cur: Math.min(investCount, 10), max: 10, label: `${Math.min(investCount, 10)}/10회` },
      invest_30:       { cur: Math.min(investCount, 30), max: 30, label: `${Math.min(investCount, 30)}/30회` },
      collect_10:      { cur: Math.min(learnCount, 10), max: 10,  label: `${Math.min(learnCount, 10)}/10개` },
      collect_30:      { cur: Math.min(learnCount, 30), max: 30,  label: `${Math.min(learnCount, 30)}/30개` },
      pts_1000:        { cur: Math.min(totalPoints, 1000),  max: 1000,  label: `${totalPoints.toLocaleString()}/1,000P` },
      pts_5000:        { cur: Math.min(totalPoints, 5000),  max: 5000,  label: `${totalPoints.toLocaleString()}/5,000P` },
      pts_10000:       { cur: Math.min(totalPoints, 10000), max: 10000, label: `${totalPoints.toLocaleString()}/10,000P` },
    });

    setFetching(false);
  }, [user, userRow, refreshUserRow]);

  useEffect(() => { fetchQuestStatus(); }, [fetchQuestStatus]);

  // 완료된 퀘스트 수 (comingSoon 제외)
  const allQuests  = SECTIONS.flatMap(s => s.quests).filter(q => !q.comingSoon);
  const doneCount  = allQuests.filter(q => !!status[q.id]).length;
  const totalCount = allQuests.length;

  if (loading || !user || !userRow) return null;

  return (
    <main style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "var(--font-paperlogy), var(--font-noto), sans-serif" }}>

      {/* 헤더 */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 30, height: 56,
        background: "rgba(13,13,13,0.96)", backdropFilter: "blur(20px)",
        borderBottom: `0.5px solid ${C.border}`,
        display: "flex", alignItems: "center", padding: "0 20px",
      }}>
        <Link href="/mypage" style={{ textDecoration: "none" }}><BackIcon /></Link>
      </nav>

      <div style={{ maxWidth: 700, margin: "0 auto", padding: "20px clamp(16px,4vw,24px) 52px" }}>

        {/* ── 페이지 타이틀 ── */}
        <div style={{ marginBottom: 22 }}>
          <p style={{ fontFamily: "var(--font-mona12)", fontSize: 13, fontWeight: 700, color: C.gold, marginBottom: 6, letterSpacing: "0.06em" }}>
            QUEST
          </p>
          <h1 style={{ fontFamily: "var(--font-paperlogy)", fontSize: 26, fontWeight: 700, color: C.text, margin: "0 0 5px", letterSpacing: "-0.02em" }}>
            퀘스트
          </h1>
          <p style={{ fontSize: 14, fontWeight: 300, color: C.text2, margin: 0 }}>
            미션을 완수하고 포인트를 모아보세요
          </p>
        </div>

        {/* ── 진행 현황 카드 ── */}
        <div style={{
          background: C.card, borderRadius: 20, padding: "18px 22px",
          border: `0.5px solid ${C.border}`, marginBottom: 20,
          display: "flex", alignItems: "center", gap: 16,
        }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 14, fontWeight: 400, color: C.text2, marginBottom: 6 }}>전체 퀘스트 달성률</p>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <span style={{ fontFamily: "var(--font-mona12)", fontSize: 30, fontWeight: 700, color: C.gold, letterSpacing: "-0.03em" }}>
                {fetching ? "—" : doneCount}
              </span>
              <span style={{ fontSize: 14, fontWeight: 400, color: C.text2 }}>/ {totalCount} 달성</span>
            </div>
            {/* 전체 프로그레스바 */}
            <div style={{ height: 3, borderRadius: 2, background: "rgba(255,255,255,0.06)", marginTop: 8, overflow: "hidden" }}>
              <div style={{
                height: "100%",
                width: fetching ? "0%" : `${(doneCount / totalCount) * 100}%`,
                background: C.gold, borderRadius: 2,
                transition: "width 0.5s ease",
              }} />
            </div>
          </div>
          <span style={{ fontFamily: "var(--font-mona12-emoji)", fontSize: 38, lineHeight: 1 }}>🏆</span>
        </div>

        {/* ── 섹션 목록 ── */}
        {SECTIONS.map(section => (
          <div key={section.id} style={{ marginBottom: 20 }}>

            {/* 섹션 헤더 */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, paddingLeft: 2 }}>
              <span style={{ fontFamily: "var(--font-mona12-emoji)", fontSize: 18 }}>{section.emoji}</span>
              <span style={{ fontFamily: "var(--font-mona12)", fontSize: 15, fontWeight: 700, color: C.text2 }}>
                {section.label}
              </span>
              {section.sub && (
                <span style={{
                  fontFamily: "var(--font-mona12)", fontSize: 12, fontWeight: 400,
                  color: C.purple, background: "rgba(196,176,252,0.12)",
                  padding: "2px 7px", borderRadius: 6,
                }}>
                  {section.sub}
                </span>
              )}
            </div>

            {/* 퀘스트 카드 */}
            <div style={{ background: C.card, borderRadius: 18, border: `0.5px solid ${C.border}`, overflow: "hidden" }}>
              {section.quests.map((quest, idx) => {
                const isDone      = !!status[quest.id];
                const isRepeat    = quest.type === "repeatable";
                const repeatCount = isRepeat && typeof status[quest.id] === "number" ? status[quest.id] as number : 0;
                const prog        = progress[quest.id];
                const showProg    = !isDone && prog && prog.max > 0;
                const isLast      = idx === section.quests.length - 1;
                const badge       = quest.comingSoon ? TYPE_BADGE.comingSoon : TYPE_BADGE[quest.type];

                return (
                  <div key={quest.id}>
                    <div
                      style={{
                        display: "flex", alignItems: "center", gap: 12,
                        padding: "14px 16px",
                        opacity: quest.comingSoon ? 0.45 : 1,
                      }}
                    >
                      {/* 이모지 */}
                      <span style={{ fontFamily: "var(--font-mona12-emoji)", fontSize: 20, flexShrink: 0, lineHeight: 1 }}>
                        {quest.emoji}
                      </span>

                      {/* 내용 */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 2 }}>
                          <span style={{
                            fontFamily: "var(--font-paperlogy)", fontSize: 14, fontWeight: 500,
                            color: isDone ? C.text2 : C.text,
                            textDecoration: isDone && quest.type === "once" ? "none" : "none",
                          }}>
                            {quest.title}
                          </span>
                          {/* 타입 뱃지 */}
                          <span style={{
                            fontFamily: "var(--font-mona12)", fontSize: 11, fontWeight: 700,
                            padding: "2px 6px", borderRadius: 5,
                            background: badge.bg, color: badge.color,
                          }}>
                            {badge.label}
                          </span>
                          {/* 반복 달성 수 */}
                          {isRepeat && repeatCount > 0 && (
                            <span style={{
                              fontFamily: "var(--font-mona12)", fontSize: 11, fontWeight: 700,
                              color: C.blue, background: "rgba(126,184,247,0.12)",
                              padding: "2px 6px", borderRadius: 5,
                            }}>
                              오늘 {repeatCount}회
                            </span>
                          )}
                        </div>
                        <p style={{ fontSize: 14, fontWeight: 300, color: C.text2, margin: 0, lineHeight: 1.4 }}>
                          {quest.desc}
                        </p>
                        {/* 진행률 바 */}
                        {showProg && (
                          <div style={{ marginTop: 6 }}>
                            <div style={{ height: 2, borderRadius: 1, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                              <div style={{
                                height: "100%",
                                width: `${Math.min(prog!.cur / prog!.max, 1) * 100}%`,
                                background: badge.color, borderRadius: 1,
                                transition: "width 0.4s ease", opacity: 0.8,
                              }} />
                            </div>
                            <p style={{ fontFamily: "var(--font-mona12)", fontSize: 12, fontWeight: 400, color: badge.color, margin: "3px 0 0" }}>
                              {prog!.label}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* 포인트 */}
                      <span style={{
                        fontFamily: "var(--font-mona12)", fontSize: 15, fontWeight: 700,
                        color: isDone ? C.text2 : C.gold,
                        letterSpacing: "-0.02em", flexShrink: 0, marginRight: 8,
                        textDecoration: "none",
                      }}>
                        +{quest.points.toLocaleString()}P{quest.pointSuffix ?? ""}
                      </span>

                      {/* 버튼 또는 완료 표시 */}
                      {quest.comingSoon ? (
                        <div style={{ width: 60, flexShrink: 0 }} />
                      ) : isDone ? (
                        <div style={{
                          width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                          background: C.gold, display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          <span style={{ fontFamily: "var(--font-mona12)", fontSize: 14, fontWeight: 700, color: "#0d0d0d" }}>✓</span>
                        </div>
                      ) : quest.href ? (
                        <button
                          onClick={() => router.push(quest.href!)}
                          style={{
                            flexShrink: 0, padding: "7px 12px", borderRadius: 10,
                            fontFamily: "var(--font-mona12)", fontSize: 13, fontWeight: 700,
                            border: "0.5px solid rgba(250,202,62,0.3)",
                            background: "rgba(250,202,62,0.08)",
                            color: C.gold,
                            cursor: "pointer", whiteSpace: "nowrap",
                          }}
                        >
                          하러 가기
                        </button>
                      ) : (
                        <div style={{ width: 32, flexShrink: 0 }} />
                      )}
                    </div>

                    {!isLast && (
                      <div style={{ height: "0.5px", background: "rgba(255,255,255,0.05)", marginInline: 16 }} />
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
          <p style={{ fontSize: 14, fontWeight: 300, color: C.text2, lineHeight: 1.8, margin: 0 }}>
            <span style={{ fontFamily: "var(--font-mona12-emoji)" }}>💡</span>
            &ensp;적립된 포인트는&ensp;
            <span style={{ fontFamily: "var(--font-mona12)", fontWeight: 700, color: C.gold }}>포인트 스토어</span>
            에서 스타벅스, 편의점 쿠폰으로 교환할 수 있어요.<br />
            <span style={{ fontFamily: "var(--font-mona12)", color: C.text2 }}>10,000P</span>
            &ensp;= 스타벅스 아이스 아메리카노 1잔
          </p>
        </div>

      </div>
    </main>
  );
}
