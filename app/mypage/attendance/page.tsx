"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/app/lib/authContext";
import { supabase } from "@/app/lib/supabase";

// 연속 출석일 계산 (오늘 또는 어제부터 연속인 경우만)
function calcStreak(dates: string[]): number {
  if (dates.length === 0) return 0;
  const sorted = [...dates].sort((a, b) => b.localeCompare(a));
  const todayKST = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
  const yd = new Date();
  yd.setDate(yd.getDate() - 1);
  const yesterdayKST = yd.toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
  if (sorted[0] !== todayKST && sorted[0] !== yesterdayKST) return 0;
  let streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    const diff =
      (new Date(sorted[i - 1]).getTime() - new Date(sorted[i]).getTime()) /
      86_400_000;
    if (diff === 1) streak++;
    else break;
  }
  return streak;
}

// 현재 연속 스트릭의 시작 날짜 반환
function calcStreakStart(dates: string[]): string | null {
  if (dates.length === 0) return null;
  const sorted = [...dates].sort((a, b) => b.localeCompare(a));
  const todayKST = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
  const yd = new Date();
  yd.setDate(yd.getDate() - 1);
  const yesterdayKST = yd.toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
  if (sorted[0] !== todayKST && sorted[0] !== yesterdayKST) return null;
  let start = sorted[0];
  for (let i = 1; i < sorted.length; i++) {
    const diff =
      (new Date(sorted[i - 1]).getTime() - new Date(sorted[i]).getTime()) /
      86_400_000;
    if (diff === 1) start = sorted[i];
    else break;
  }
  return start;
}

// 세그먼트별 설정 (7→14→21→30일 순차 구간)
const SEGMENTS = [
  { endDiff: 6,  points: 100, bg: "rgba(250,202,62,0.10)",   color: "#FACA3E", grayBg: "rgba(255,255,255,0.03)" },
  { endDiff: 13, points: 200, bg: "rgba(126,184,247,0.10)",  color: "#7eb8f7", grayBg: "rgba(255,255,255,0.03)" },
  { endDiff: 20, points: 300, bg: "rgba(196,176,252,0.10)",  color: "#c4b0fc", grayBg: "rgba(255,255,255,0.03)" },
  { endDiff: 29, points: 500, bg: "rgba(126,212,160,0.10)",  color: "#7ed4a0", grayBg: "rgba(255,255,255,0.03)" },
];

const BONUS_LIST = [
  { days: 7,  points: 100, color: "#FACA3E" },
  { days: 14, points: 200, color: "#7eb8f7" },
  { days: 21, points: 300, color: "#c4b0fc" },
  { days: 30, points: 500, color: "#7ed4a0" },
];

function getSegmentIndex(diff: number): number {
  if (diff < 7)  return 0;
  if (diff < 14) return 1;
  if (diff < 21) return 2;
  if (diff < 30) return 3;
  return -1;
}

export default function AttendancePage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [attendDates, setAttendDates] = useState<string[]>([]);

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
      .then(({ data }) => {
        setAttendDates((data ?? []).map((r: { date: string }) => r.date));
      });
  }, [user]);

  const now         = new Date();
  const year        = now.getFullYear();
  const month       = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDow    = new Date(year, month, 1).getDay();
  const todayKST    = now.toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
  const todayDay    = parseInt(todayKST.slice(8));
  const thisMonth   = `${year}-${String(month + 1).padStart(2, "0")}`;
  const attendCount = attendDates.filter((d) => d.startsWith(thisMonth)).length;
  const attendRate  = Math.round((attendCount / daysInMonth) * 100);
  const streak      = calcStreak(attendDates);
  const streakStart = calcStreakStart(attendDates);
  const attendSet   = new Set(attendDates);

  if (loading) return null;
  if (!user) return null;

  // 날짜셀의 세그먼트 정보 반환
  function getSegInfo(dateStr: string): { segIdx: number; diff: number } | null {
    if (!streakStart) return null;
    const d    = new Date(dateStr + "T00:00:00");
    const s    = new Date(streakStart + "T00:00:00");
    const diff = Math.round((d.getTime() - s.getTime()) / 86_400_000);
    if (diff < 0 || diff >= 30) return null;
    return { segIdx: getSegmentIndex(diff), diff };
  }

  return (
    <main className="min-h-screen" style={{ background: "#0d0d0d" }}>
      <nav
        className="sticky top-0 z-30 border-b flex items-center px-5"
        style={{
          height: 56,
          background: "rgba(13,13,13,0.96)",
          backdropFilter: "blur(20px)",
          borderColor: "rgba(255,255,255,0.06)",
        }}
      >
        <Link href="/mypage" style={{ fontSize: 13, color: "#5c5448", textDecoration: "none" }}>
          ← 내 정보
        </Link>
        <span
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 20,
            color: "#FACA3E",
            marginLeft: 16,
          }}
        >
          PICO
        </span>
      </nav>

      <div className="mx-auto py-8 px-4 sm:px-6" style={{ maxWidth: 500 }}>

        {/* ── 연속 출석 헤더 ── */}
        <div className="text-center mb-8">
          <p
            style={{
              fontFamily: "var(--font-inter)",
              fontSize: 64,
              fontWeight: 700,
              color: "#FACA3E",
              letterSpacing: "-0.03em",
              lineHeight: 1,
              marginBottom: 6,
            }}
          >
            🔥 {streak}일
          </p>
          <p style={{ fontSize: 20, fontWeight: 500, color: "#e8e0d0", marginBottom: 8 }}>
            연속 출석 중
          </p>
          <p style={{ fontSize: 13, color: "#5c5448" }}>
            이번 달 출석률&nbsp;
            <span style={{ color: "#a09688" }}>{attendRate}%</span>
            &nbsp;·&nbsp;{attendCount}/{daysInMonth}일
          </p>
        </div>

        {/* ── 캘린더 ── */}
        <div
          className="rounded-2xl p-5 border mb-6"
          style={{ background: "#141414", borderColor: "rgba(255,255,255,0.08)" }}
        >
          <p style={{ fontSize: 13, color: "#a09688", fontWeight: 500, marginBottom: 16 }}>
            {now.toLocaleDateString("ko-KR", { year: "numeric", month: "long" })}
          </p>

          {/* 요일 헤더 */}
          <div className="grid grid-cols-7 mb-2">
            {["일", "월", "화", "수", "목", "금", "토"].map((d, i) => (
              <div
                key={d}
                style={{
                  textAlign: "center",
                  fontSize: 12,
                  fontWeight: 600,
                  color: i === 0 ? "#f07878" : i === 6 ? "#7eb8f7" : "#5c5448",
                  paddingBottom: 8,
                }}
              >
                {d}
              </div>
            ))}
          </div>

          {/* 날짜 그리드 */}
          <div className="grid grid-cols-7">
            {Array.from({ length: firstDow }).map((_, i) => (
              <div key={`e${i}`} />
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day     = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const attended = attendSet.has(dateStr);
              const isToday  = dateStr === todayKST;
              const isFuture = day > todayDay;
              const segInfo  = getSegInfo(dateStr);
              const seg      = segInfo ? SEGMENTS[segInfo.segIdx] : null;
              const segDone  = seg ? streak >= (segInfo!.segIdx + 1) * 7 : false;
              const isSegEnd = segInfo ? segInfo.diff === SEGMENTS[segInfo.segIdx].endDiff : false;

              return (
                <div
                  key={day}
                  className="flex flex-col items-center py-1.5 rounded-lg"
                  style={{
                    background: seg
                      ? segDone
                        ? seg.grayBg
                        : seg.bg
                      : "transparent",
                    opacity: isFuture && !seg ? 0.25 : 1,
                  }}
                >
                  {/* 날짜 숫자 */}
                  <span
                    style={{
                      fontFamily: "var(--font-inter)",
                      fontSize: 14,
                      fontWeight: isToday ? 700 : 300,
                      color: isToday
                        ? "#e8e0d0"
                        : isFuture
                        ? "#3a3a3a"
                        : "#a09688",
                      lineHeight: 1.2,
                      marginBottom: 2,
                      border: isToday ? "1.5px solid rgba(255,255,255,0.4)" : "1.5px solid transparent",
                      borderRadius: 4,
                      padding: "0 3px",
                    }}
                  >
                    {day}
                  </span>

                  {/* PICO 도장 / 빈 자리 */}
                  {attended ? (
                    <div
                      style={{
                        width: 30,
                        height: 22,
                        border: `1.5px solid ${segDone ? "rgba(255,255,255,0.12)" : "#FACA3E"}`,
                        borderRadius: 3,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "var(--font-serif)",
                          fontSize: 8,
                          fontWeight: 700,
                          color: segDone ? "rgba(255,255,255,0.18)" : "#FACA3E",
                          transform: "rotate(-15deg)",
                          display: "inline-block",
                          letterSpacing: "0.04em",
                          opacity: segDone ? 0.6 : 0.9,
                        }}
                      >
                        PICO
                      </span>
                    </div>
                  ) : (
                    <div style={{ width: 30, height: 22 }} />
                  )}

                  {/* 세그먼트 끝 포인트 레이블 */}
                  {isSegEnd && seg && (
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 600,
                        color: segDone ? "#5c5448" : seg.color,
                        marginTop: 1,
                        lineHeight: 1,
                      }}
                    >
                      {segDone ? "완료" : `+${seg.points}P`}
                    </span>
                  )}
                  {!isSegEnd && <div style={{ height: 11 }} />}
                </div>
              );
            })}
          </div>

          {/* 범례 */}
          <div
            className="flex items-center gap-3 mt-4 pt-3"
            style={{ borderTop: "0.5px solid rgba(255,255,255,0.06)" }}
          >
            <div
              style={{
                width: 30,
                height: 22,
                border: "1.5px solid #FACA3E",
                borderRadius: 3,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: 8,
                  fontWeight: 700,
                  color: "#FACA3E",
                  transform: "rotate(-15deg)",
                  display: "inline-block",
                }}
              >
                PICO
              </span>
            </div>
            <span style={{ fontSize: 11, color: "#5c5448" }}>출석 완료</span>
            <span style={{ fontSize: 11, color: "#3a3a3a", marginLeft: 8 }}>
              {attendCount} / {daysInMonth}일
            </span>
          </div>
        </div>

        {/* ── 연속 출석 보너스 ── */}
        <p style={{ fontSize: 14, fontWeight: 500, color: "#5c5448", marginBottom: 12 }}>
          연속 출석 보너스
        </p>
        <div className="flex flex-col gap-2 mb-8">
          {BONUS_LIST.map((b) => {
            const achieved = streak >= b.days;
            return (
              <div
                key={b.days}
                className="rounded-xl px-4 py-3.5 border flex items-center justify-between"
                style={{
                  background: achieved ? "rgba(255,255,255,0.03)" : "#141414",
                  borderColor: achieved ? `${b.color}35` : "rgba(255,255,255,0.06)",
                  opacity: achieved ? 1 : 0.45,
                }}
              >
                <div className="flex items-center gap-2">
                  <span
                    style={{ fontSize: 13, fontWeight: 500, color: achieved ? b.color : "#5c5448" }}
                  >
                    {b.days}일 연속
                  </span>
                  {achieved && (
                    <span
                      style={{
                        fontSize: 10,
                        color: b.color,
                        background: `${b.color}18`,
                        padding: "1px 6px",
                        borderRadius: 4,
                      }}
                    >
                      달성
                    </span>
                  )}
                </div>
                <span
                  style={{
                    fontFamily: "var(--font-inter)",
                    fontSize: 18,
                    fontWeight: 300,
                    color: achieved ? b.color : "#2a2a2a",
                    letterSpacing: "-0.02em",
                  }}
                >
                  +{b.points.toLocaleString()}P
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
