"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/app/lib/authContext";
import { supabase } from "@/app/lib/supabase";

const ANIMAL_NAMES: Record<string, { emoji: string; name: string }> = {
  tiger:     { emoji: "🐯", name: "호랑이"   },
  eagle:     { emoji: "🦅", name: "독수리"   },
  wolf:      { emoji: "🐺", name: "늑대"     },
  fox:       { emoji: "🦊", name: "여우"     },
  elephant:  { emoji: "🐘", name: "코끼리"   },
  hedgehog:  { emoji: "🦔", name: "고슴도치" },
  turtle:    { emoji: "🐢", name: "거북이"   },
  butterfly: { emoji: "🦋", name: "나비"     },
};

const MILESTONES = [
  { days: 7,  label: "7일 연속",  bonus: 200, color: "#7eb8f7" },
  { days: 14, label: "14일 연속", bonus: 500, color: "#FACA3E" },
  { days: 21, label: "21일 연속", bonus: 1000, color: "#c4b0fc" },
  { days: 30, label: "30일 연속", bonus: 2000, color: "#7ed4a0" },
];

function calcStreak(dates: string[]): number {
  if (dates.length === 0) return 0;
  const sorted = [...dates].sort().reverse(); // newest first
  const todayKST = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayKST = yesterdayDate.toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });

  // streak must start from today or yesterday
  if (sorted[0] !== todayKST && sorted[0] !== yesterdayKST) return 0;

  let streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    const diff = (prev.getTime() - curr.getTime()) / 86400000;
    if (diff === 1) streak++;
    else break;
  }
  return streak;
}

export default function MyPage() {
  const router = useRouter();
  const { user, userRow, loading, refreshUserRow, signOut } = useAuth();

  const [tab, setTab] = useState<"info" | "calendar">("info");
  const [nickname, setNickname]         = useState("");
  const [editing, setEditing]           = useState(false);
  const [saving, setSaving]             = useState(false);
  const [attendCount, setAttendCount]   = useState(0);
  const [attendDates, setAttendDates]   = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading]         = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [user, loading, router]);

  useEffect(() => {
    if (userRow) setNickname(userRow.nickname);
  }, [userRow]);

  useEffect(() => {
    if (!user) return;
    const thisMonth = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" }).slice(0, 7);
    supabase
      .from("attendance")
      .select("date", { count: "exact" })
      .eq("user_id", user.id)
      .like("date", `${thisMonth}%`)
      .then(({ data, count }) => {
        setAttendCount(count ?? 0);
        setAttendDates((data ?? []).map((r: { date: string }) => r.date));
      });
  }, [user]);

  async function saveNickname() {
    if (!user || !nickname.trim()) return;
    setSaving(true);
    await supabase.from("users").update({ nickname: nickname.trim() }).eq("id", user.id);
    await refreshUserRow();
    setSaving(false);
    setEditing(false);
  }

  async function handleDeleteAccount() {
    if (!user) return;
    setDeleteLoading(true);
    await supabase.from("battle_votes").delete().eq("user_id", user.id);
    await supabase.from("attendance").delete().eq("user_id", user.id);
    await supabase.from("users").delete().eq("id", user.id);
    await signOut();
    router.replace("/");
  }

  const animalInfo = userRow?.investor_type ? ANIMAL_NAMES[userRow.investor_type] : null;
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const attendRate = Math.round((attendCount / daysInMonth) * 100);
  const streak = calcStreak(attendDates);

  // Calendar grid
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDow = new Date(year, month, 1).getDay(); // 0=Sun
  const todayDay = now.getDate();
  const attendSet = new Set(attendDates);

  if (loading) return null;
  if (!user || !userRow) return null;

  return (
    <main className="min-h-screen" style={{ background: "#0d0d0d" }}>
      <nav className="sticky top-0 z-30 border-b flex items-center px-5" style={{ height: 56, background: "rgba(13,13,13,0.96)", backdropFilter: "blur(20px)", borderColor: "rgba(255,255,255,0.06)" }}>
        <Link href="/" style={{ fontSize: 13, color: "#5c5448", textDecoration: "none" }}>← 홈</Link>
        <span style={{ fontFamily: "var(--font-serif)", fontSize: 20, color: "#FACA3E", marginLeft: 16 }}>PICO</span>
      </nav>

      {/* 탭 */}
      <div className="flex border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        {(["info", "calendar"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className="pico-btn flex-1 py-3 relative"
            style={{ fontSize: 13, fontWeight: 500, color: tab === t ? "#e8e0d0" : "#5c5448", background: "none", border: "none" }}>
            {t === "info" ? "내 정보" : "출석 캘린더"}
            <span style={{ position: "absolute", bottom: 0, left: "20%", right: "20%", height: 2, background: tab === t ? "#FACA3E" : "transparent", borderRadius: 2 }} />
          </button>
        ))}
      </div>

      <div className="mx-auto px-5 py-8" style={{ maxWidth: 480 }}>

        {/* ══ 내 정보 탭 ══ */}
        {tab === "info" && (
          <>
            {/* 닉네임 */}
            <div className="rounded-2xl p-5 border mb-4" style={{ background: "#141414", borderColor: "rgba(255,255,255,0.08)" }}>
              <p style={{ fontSize: 11, letterSpacing: "0.12em", color: "#5c5448", textTransform: "uppercase", marginBottom: 10 }}>닉네임</p>
              {editing ? (
                <div className="flex gap-2">
                  <input
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    className="flex-1 rounded-xl px-4 py-2 outline-none"
                    style={{ background: "#1c1c1c", border: "0.5px solid rgba(250,202,62,0.4)", color: "#e8e0d0", fontSize: 15 }}
                  />
                  <button onClick={saveNickname} disabled={saving} className="pico-btn px-4 py-2 rounded-xl"
                    style={{ background: "#FACA3E", color: "#0d0d0d", fontSize: 13, fontWeight: 500 }}>
                    {saving ? "..." : "저장"}
                  </button>
                  <button onClick={() => { setEditing(false); setNickname(userRow.nickname); }} className="pico-btn px-3 py-2 rounded-xl"
                    style={{ background: "#1c1c1c", color: "#5c5448", fontSize: 13, border: "0.5px solid rgba(255,255,255,0.08)" }}>
                    취소
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span style={{ fontSize: 18, fontWeight: 500, color: "#e8e0d0" }}>{userRow.nickname}</span>
                  <button onClick={() => setEditing(true)} className="pico-btn px-3 py-1.5 rounded-lg"
                    style={{ fontSize: 12, color: "#a09688", border: "0.5px solid rgba(255,255,255,0.1)", background: "transparent" }}>
                    수정
                  </button>
                </div>
              )}
              <p style={{ fontSize: 11, color: "#5c5448", marginTop: 6 }}>{user.email}</p>
            </div>

            {/* 투자 DNA */}
            <div className="rounded-2xl p-5 border mb-4" style={{ background: "#141414", borderColor: "rgba(255,255,255,0.08)" }}>
              <p style={{ fontSize: 11, letterSpacing: "0.12em", color: "#5c5448", textTransform: "uppercase", marginBottom: 10 }}>투자 DNA</p>
              {animalInfo ? (
                <div className="flex items-center gap-3">
                  <span style={{ fontSize: 32 }}>{animalInfo.emoji}</span>
                  <span style={{ fontSize: 18, fontWeight: 500, color: "#FACA3E" }}>{animalInfo.name}</span>
                </div>
              ) : (
                <div>
                  <p style={{ fontSize: 14, color: "#5c5448", marginBottom: 10 }}>아직 퀴즈를 완료하지 않았어</p>
                  <Link href="/quiz" style={{ fontSize: 13, color: "#7eb8f7", fontWeight: 500, textDecoration: "none" }}>
                    투자 DNA 찾기 →
                  </Link>
                </div>
              )}
            </div>

            {/* 포인트 + 출석 */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="rounded-2xl p-5 border" style={{ background: "#141414", borderColor: "rgba(250,202,62,0.2)" }}>
                <p style={{ fontSize: 11, letterSpacing: "0.12em", color: "#5c5448", textTransform: "uppercase", marginBottom: 8 }}>누적 포인트</p>
                <p style={{ fontFamily: "var(--font-inter)", fontSize: 26, fontWeight: 300, color: "#FACA3E", letterSpacing: "-0.02em" }}>
                  {userRow.total_points.toLocaleString()}P
                </p>
              </div>
              <div className="rounded-2xl p-5 border" style={{ background: "#141414", borderColor: "rgba(126,212,160,0.2)" }}>
                <p style={{ fontSize: 11, letterSpacing: "0.12em", color: "#5c5448", textTransform: "uppercase", marginBottom: 8 }}>이번 달 출석</p>
                <p style={{ fontFamily: "var(--font-inter)", fontSize: 26, fontWeight: 300, color: "#7ed4a0", letterSpacing: "-0.02em" }}>
                  {attendRate}%
                </p>
                <p style={{ fontSize: 11, color: "#5c5448", marginTop: 4 }}>{attendCount}일 / {daysInMonth}일</p>
              </div>
            </div>

            {/* 로그아웃 */}
            <button onClick={signOut} className="pico-btn w-full rounded-xl py-3 mb-3"
              style={{ background: "transparent", color: "#a09688", border: "0.5px solid rgba(255,255,255,0.1)", fontSize: 14, fontWeight: 500 }}>
              로그아웃
            </button>

            {/* 회원 탈퇴 */}
            {!showDeleteConfirm ? (
              <button onClick={() => setShowDeleteConfirm(true)} className="pico-btn w-full py-2"
                style={{ background: "transparent", color: "#5c5448", fontSize: 13, border: "none" }}>
                회원 탈퇴
              </button>
            ) : (
              <div className="rounded-2xl p-5 border" style={{ background: "rgba(240,120,120,0.06)", borderColor: "rgba(240,120,120,0.25)" }}>
                <p style={{ fontSize: 14, color: "#f07878", marginBottom: 12, fontWeight: 500 }}>정말 탈퇴할까? 모든 포인트와 기록이 삭제돼.</p>
                <div className="flex gap-2">
                  <button onClick={handleDeleteAccount} disabled={deleteLoading} className="pico-btn flex-1 py-2.5 rounded-xl"
                    style={{ background: "#f07878", color: "#0d0d0d", fontSize: 13, fontWeight: 500 }}>
                    {deleteLoading ? "처리중..." : "탈퇴할게"}
                  </button>
                  <button onClick={() => setShowDeleteConfirm(false)} className="pico-btn flex-1 py-2.5 rounded-xl"
                    style={{ background: "#1c1c1c", color: "#a09688", fontSize: 13, border: "0.5px solid rgba(255,255,255,0.1)" }}>
                    취소
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ══ 출석 캘린더 탭 ══ */}
        {tab === "calendar" && (
          <>
            {/* 연속 스트릭 */}
            <div className="rounded-2xl p-5 border mb-4" style={{ background: "#141414", borderColor: "rgba(250,202,62,0.2)" }}>
              <p style={{ fontSize: 11, letterSpacing: "0.12em", color: "#5c5448", textTransform: "uppercase", marginBottom: 8 }}>현재 연속 출석</p>
              <div className="flex items-baseline gap-2">
                <span style={{ fontFamily: "var(--font-inter)", fontSize: 40, fontWeight: 300, color: "#FACA3E", letterSpacing: "-0.03em" }}>{streak}</span>
                <span style={{ fontSize: 16, color: "#a09688", fontWeight: 300 }}>일 연속</span>
              </div>
              {streak > 0 && (
                <p style={{ fontSize: 12, color: "#5c5448", marginTop: 6 }}>VS 배틀 투표로 매일 +50P 획득해!</p>
              )}
              {streak === 0 && (
                <p style={{ fontSize: 12, color: "#5c5448", marginTop: 6 }}>오늘 배틀에 투표하면 출석 시작!</p>
              )}
            </div>

            {/* 월간 캘린더 */}
            <div className="rounded-2xl p-5 border mb-4" style={{ background: "#141414", borderColor: "rgba(255,255,255,0.08)" }}>
              <p style={{ fontSize: 11, letterSpacing: "0.12em", color: "#5c5448", textTransform: "uppercase", marginBottom: 14 }}>
                {now.toLocaleDateString("ko-KR", { year: "numeric", month: "long" })}
              </p>

              {/* 요일 헤더 */}
              <div className="grid grid-cols-7 mb-2">
                {["일","월","화","수","목","금","토"].map((d) => (
                  <div key={d} style={{ textAlign: "center", fontSize: 11, color: "#5c5448", paddingBottom: 4 }}>{d}</div>
                ))}
              </div>

              {/* 날짜 그리드 */}
              <div className="grid grid-cols-7 gap-y-1">
                {/* 첫째 날 전 빈칸 */}
                {Array.from({ length: firstDow }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                {/* 날짜 */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const attended = attendSet.has(dateStr);
                  const isToday = day === todayDay;
                  const isFuture = day > todayDay;
                  return (
                    <div key={day} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, paddingTop: 4, paddingBottom: 4 }}>
                      <span style={{
                        fontSize: 12,
                        color: isToday ? "#e8e0d0" : isFuture ? "#2a2a2a" : attended ? "#FACA3E" : "#3a3a3a",
                        fontWeight: isToday ? 500 : 300,
                        fontFamily: "var(--font-inter)",
                      }}>{day}</span>
                      <div style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: attended ? "#FACA3E" : isToday ? "rgba(255,255,255,0.15)" : "transparent",
                        boxShadow: attended ? "0 0 6px rgba(250,202,62,0.6)" : "none",
                      }} />
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 mt-4 pt-4" style={{ borderTop: "0.5px solid rgba(255,255,255,0.06)" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#FACA3E", boxShadow: "0 0 6px rgba(250,202,62,0.6)" }} />
                <span style={{ fontSize: 11, color: "#5c5448" }}>출석 완료</span>
                <span style={{ fontSize: 11, color: "#3a3a3a", marginLeft: 12 }}>{attendCount}일 출석 / {daysInMonth}일</span>
              </div>
            </div>

            {/* 마일스톤 보너스 카드 */}
            <p style={{ fontSize: 11, letterSpacing: "0.12em", color: "#5c5448", textTransform: "uppercase", marginBottom: 12 }}>연속 출석 보너스</p>
            <div className="flex flex-col gap-3">
              {MILESTONES.map((m) => {
                const achieved = streak >= m.days;
                return (
                  <div key={m.days} className="rounded-2xl px-5 py-4 border flex items-center justify-between"
                    style={{
                      background: achieved ? `rgba(${m.color === "#FACA3E" ? "250,202,62" : m.color === "#7eb8f7" ? "126,184,247" : m.color === "#c4b0fc" ? "196,176,252" : "126,212,160"},0.06)` : "#141414",
                      borderColor: achieved ? `${m.color}40` : "rgba(255,255,255,0.06)",
                      opacity: achieved ? 1 : 0.5,
                    }}>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span style={{ fontSize: 14, fontWeight: 500, color: achieved ? m.color : "#5c5448" }}>{m.label}</span>
                        {achieved && <span style={{ fontSize: 11, color: m.color }}>✓ 달성</span>}
                      </div>
                      <span style={{ fontSize: 12, color: "#5c5448" }}>보너스 포인트</span>
                    </div>
                    <span style={{ fontFamily: "var(--font-inter)", fontSize: 22, fontWeight: 300, color: achieved ? m.color : "#3a3a3a", letterSpacing: "-0.02em" }}>
                      +{m.bonus.toLocaleString()}P
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
