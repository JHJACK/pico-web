"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/app/lib/authContext";
import { supabase, todayKST } from "@/app/lib/supabase";
import { BackIcon } from "@/app/components/BackIcon";

function calcStreak(dates: string[]): number {
  if (dates.length === 0) return 0;
  const sorted = [...dates].sort((a, b) => b.localeCompare(a));
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
  const yd = new Date();
  yd.setDate(yd.getDate() - 1);
  const yesterday = yd.toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
  if (sorted[0] !== today && sorted[0] !== yesterday) return 0;
  let streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    const diff = (new Date(sorted[i - 1]).getTime() - new Date(sorted[i]).getTime()) / 86_400_000;
    if (diff === 1) streak++;
    else break;
  }
  return streak;
}

const BONUS_LIST = [
  { days: 7,  points: 100, color: "#FACA3E", emoji: "🥉" },
  { days: 14, points: 200, color: "#7eb8f7", emoji: "🥈" },
  { days: 21, points: 300, color: "#c4b0fc", emoji: "🥇" },
  { days: 30, points: 500, color: "#7ed4a0", emoji: "💎" },
];

function streakEmoji(streak: number) {
  if (streak >= 30) return "💎";
  if (streak >= 21) return "🥇";
  if (streak >= 14) return "🥈";
  if (streak >= 7)  return "🥉";
  return "🔥";
}

export default function AttendancePage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [attendDates, setAttendDates] = useState<string[]>([]);
  const [viewDate, setViewDate] = useState(() => new Date());

  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("attendance")
      .select("date")
      .eq("user_id", user.id)
      .eq("attended", true)
      .then(({ data, error }) => {
        if (error) { console.error("[attendance]", error.message); return; }
        setAttendDates((data ?? []).map((r: { date: string }) => r.date));
      });
  }, [user]);

  const todayStr    = todayKST();
  const attendSet   = new Set(attendDates);
  const streak      = calcStreak(attendDates);
  const todayAttended = attendSet.has(todayStr);

  // 현재 보고 있는 달 정보
  const viewYear  = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDow    = new Date(viewYear, viewMonth, 1).getDay();
  const viewMonthStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`;

  const monthAttendCount = attendDates.filter(d => d.startsWith(viewMonthStr)).length;
  const monthAttendRate  = Math.round((monthAttendCount / daysInMonth) * 100);

  // 실제 오늘 날짜 파싱
  const [todayYear, todayMonth, todayDay] = todayStr.split("-").map(Number);

  const isCurrentMonth = viewYear === todayYear && viewMonth === todayMonth - 1;
  const isFutureMonth  = viewYear > todayYear || (viewYear === todayYear && viewMonth > todayMonth - 1);

  function prevMonth() {
    setViewDate(d => {
      const nd = new Date(d);
      nd.setDate(1);
      nd.setMonth(nd.getMonth() - 1);
      return nd;
    });
  }

  function nextMonth() {
    if (isCurrentMonth) return;
    setViewDate(d => {
      const nd = new Date(d);
      nd.setDate(1);
      nd.setMonth(nd.getMonth() + 1);
      return nd;
    });
  }

  if (loading || !user) return null;

  return (
    <main
      className="min-h-screen"
      style={{ background: "#0d0d0d", fontFamily: "var(--font-paperlogy), var(--font-noto), sans-serif" }}
    >
      {/* 헤더 */}
      <nav
        className="sticky top-0 z-30 flex items-center px-5"
        style={{
          height: 56,
          background: "rgba(13,13,13,0.96)",
          backdropFilter: "blur(20px)",
          borderBottom: "0.5px solid rgba(255,255,255,0.06)",
        }}
      >
        <Link href="/mypage" style={{ textDecoration: "none" }}><BackIcon /></Link>
      </nav>

      <div style={{ maxWidth: 700, margin: "0 auto", padding: "20px clamp(16px,4vw,24px) 52px" }}>

        {/* ── 스트릭 요약 카드 ── */}
        <div
          style={{
            background: "#141414",
            border: "0.5px solid rgba(255,255,255,0.08)",
            borderRadius: 20,
            padding: "18px 22px",
            marginBottom: 14,
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 14, fontWeight: 400, color: "#c8bfb0", marginBottom: 6, lineHeight: 1 }}>
              {todayAttended ? "오늘 출석 완료" : "오늘 아직 미출석"}
            </p>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <span
                style={{
                  fontFamily: "var(--font-mona12)",
                  fontSize: 32,
                  fontWeight: 700,
                  color: "#FACA3E",
                  letterSpacing: "-0.03em",
                  lineHeight: 1,
                }}
              >
                {streak}일
              </span>
              <span style={{ fontSize: 14, fontWeight: 400, color: "#c8bfb0" }}>연속 출석</span>
            </div>
          </div>
          <span style={{ fontFamily: "var(--font-mona12-emoji)", fontSize: 40, lineHeight: 1 }}>
            {streakEmoji(streak)}
          </span>
        </div>

        {/* ── 캘린더 카드 ── */}
        <div
          style={{
            background: "#141414",
            border: "0.5px solid rgba(255,255,255,0.08)",
            borderRadius: 20,
            padding: "20px 16px",
            marginBottom: 14,
          }}
        >
          {/* 월 네비게이션 */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
              paddingInline: 4,
            }}
          >
            <button
              onClick={prevMonth}
              style={{
                background: "none",
                border: "none",
                color: "#c8bfb0",
                cursor: "pointer",
                fontSize: 22,
                lineHeight: 1,
                padding: "4px 10px",
              }}
            >
              ‹
            </button>

            <div style={{ textAlign: "center" }}>
              <p
                style={{
                  fontFamily: "var(--font-mona12)",
                  fontSize: 16,
                  fontWeight: 700,
                  color: "#e8e0d0",
                  margin: 0,
                  letterSpacing: "-0.01em",
                }}
              >
                {viewDate.toLocaleDateString("ko-KR", { year: "numeric", month: "long" })}
              </p>
              <p style={{ fontSize: 14, fontWeight: 400, color: "#c8bfb0", margin: "5px 0 0" }}>
                {monthAttendCount}일 출석 · {monthAttendRate}%
              </p>
            </div>

            <button
              onClick={nextMonth}
              style={{
                background: "none",
                border: "none",
                fontSize: 22,
                lineHeight: 1,
                padding: "4px 10px",
                cursor: isCurrentMonth ? "default" : "pointer",
                color: isCurrentMonth ? "rgba(255,255,255,0.1)" : "#c8bfb0",
              }}
            >
              ›
            </button>
          </div>

          {/* 요일 헤더 */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: 4 }}>
            {["일", "월", "화", "수", "목", "금", "토"].map((d, i) => (
              <div
                key={d}
                style={{
                  textAlign: "center",
                  fontSize: 14,
                  fontWeight: 400,
                  color: i === 0 ? "#f07878" : i === 6 ? "#7eb8f7" : "#c8bfb0",
                  paddingBottom: 8,
                }}
              >
                {d}
              </div>
            ))}
          </div>

          {/* 날짜 그리드 */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", rowGap: 4 }}>
            {/* 빈 칸 */}
            {Array.from({ length: firstDow }).map((_, i) => <div key={`e${i}`} />)}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day     = i + 1;
              const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const attended = attendSet.has(dateStr);
              const isToday  = dateStr === todayStr;
              const isFuture = isFutureMonth || (isCurrentMonth && day > todayDay);

              return (
                <div
                  key={day}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    padding: "5px 2px 6px",
                    borderRadius: 10,
                    background: attended ? "rgba(250,202,62,0.1)" : "transparent",
                    opacity: isFuture ? 0.2 : 1,
                    transition: "opacity 0.15s",
                  }}
                >
                  {/* 날짜 숫자 */}
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: "50%",
                      background: isToday && attended ? "#FACA3E" : "transparent",
                      border: isToday && !attended
                        ? "1.5px solid #FACA3E"
                        : "1.5px solid transparent",
                      marginBottom: 3,
                      flexShrink: 0,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "var(--font-mona12)",
                        fontSize: 14,
                        fontWeight: attended ? 700 : 400,
                        lineHeight: 1,
                        color: isToday && attended
                          ? "#0d0d0d"
                          : attended
                          ? "#e8e0d0"
                          : isToday
                          ? "#FACA3E"
                          : "#c8bfb0",
                      }}
                    >
                      {day}
                    </span>
                  </div>

                  {/* 이모지 또는 빈 자리 */}
                  <span
                    style={{
                      fontFamily: "var(--font-mona12-emoji)",
                      fontSize: 14,
                      lineHeight: 1,
                      height: 15,
                      display: "block",
                    }}
                  >
                    {attended ? "🌟" : ""}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── 연속 출석 보너스 ── */}
        <p
          style={{
            fontSize: 14,
            fontWeight: 400,
            color: "#c8bfb0",
            marginBottom: 10,
            paddingLeft: 2,
          }}
        >
          <span style={{ fontFamily: "var(--font-mona12-emoji)" }}>🔥</span>
          &ensp;연속 출석 보너스
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {BONUS_LIST.map((b) => {
            const achieved = streak >= b.days;
            const progress = Math.min(streak / b.days, 1);

            return (
              <div
                key={b.days}
                style={{
                  background: achieved ? "rgba(255,255,255,0.03)" : "#141414",
                  border: `0.5px solid ${achieved ? `${b.color}35` : "rgba(255,255,255,0.07)"}`,
                  borderRadius: 16,
                  padding: "14px 18px",
                  opacity: achieved ? 1 : 0.55,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: achieved ? 0 : 8,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontFamily: "var(--font-mona12-emoji)", fontSize: 20 }}>{b.emoji}</span>
                    <div>
                      <span style={{ fontSize: 14, fontWeight: 500, color: achieved ? b.color : "#c8bfb0" }}>
                        {b.days}일 연속
                      </span>
                      {achieved && (
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 400,
                            color: b.color,
                            background: `${b.color}20`,
                            padding: "1px 7px",
                            borderRadius: 4,
                            marginLeft: 8,
                          }}
                        >
                          달성
                        </span>
                      )}
                    </div>
                  </div>
                  <span
                    style={{
                      fontFamily: "var(--font-mona12)",
                      fontSize: 16,
                      fontWeight: 700,
                      color: achieved ? b.color : "#333",
                      letterSpacing: "-0.02em",
                    }}
                  >
                    +{b.points.toLocaleString()}P
                  </span>
                </div>

                {/* 달성 전 프로그레스바 */}
                {!achieved && (
                  <div
                    style={{
                      height: 3,
                      borderRadius: 2,
                      background: "rgba(255,255,255,0.06)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${progress * 100}%`,
                        background: b.color,
                        borderRadius: 2,
                        transition: "width 0.4s ease",
                        opacity: 0.7,
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </main>
  );
}
