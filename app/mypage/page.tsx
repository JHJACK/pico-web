"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/app/lib/authContext";
import { supabase, uploadAvatar } from "@/app/lib/supabase";
import { INVESTOR_TYPES, TYPE_KEYS, type TypeKey } from "@/app/lib/quizTypes";

const MILESTONES = [
  { days: 7,  label: "7일 연속",  bonus: 200,  color: "#7eb8f7" },
  { days: 14, label: "14일 연속", bonus: 500,  color: "#FACA3E" },
  { days: 21, label: "21일 연속", bonus: 1000, color: "#c4b0fc" },
  { days: 30, label: "30일 연속", bonus: 2000, color: "#7ed4a0" },
];

function calcStreak(dates: string[]): number {
  if (dates.length === 0) return 0;
  const sorted = [...dates].sort().reverse();
  const todayKST = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
  const yd = new Date();
  yd.setDate(yd.getDate() - 1);
  const yesterdayKST = yd.toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
  if (sorted[0] !== todayKST && sorted[0] !== yesterdayKST) return 0;
  let streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    const diff = (new Date(sorted[i - 1]).getTime() - new Date(sorted[i]).getTime()) / 86400000;
    if (diff === 1) streak++;
    else break;
  }
  return streak;
}

function MyPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, userRow, loading, refreshUserRow, signOut } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initialTab = searchParams.get("tab") === "dna" ? "dna" : "info";
  const [tab, setTab]                     = useState<"info" | "dna">(initialTab);
  const [showAllTypes, setShowAllTypes]   = useState(false);
  const [nickname, setNickname]           = useState("");
  const [editOpen, setEditOpen]           = useState(false);
  const [saving, setSaving]               = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [previewUrl, setPreviewUrl]       = useState<string | null>(null);
  const [pendingFile, setPendingFile]     = useState<File | null>(null);
  const [attendCount, setAttendCount]     = useState(0);
  const [attendDates, setAttendDates]     = useState<string[]>([]);
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

  function openEdit() {
    if (userRow) setNickname(userRow.nickname);
    setPreviewUrl(null);
    setPendingFile(null);
    setEditOpen(true);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert("이미지는 2MB 이하만 업로드할 수 있어.");
      e.target.value = "";
      return;
    }
    setPendingFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function handleSave() {
    if (!user || !userRow) return;
    setSaving(true);
    setUploadLoading(true);

    if (nickname.trim() && nickname.trim() !== userRow.nickname) {
      await supabase.from("users").update({ nickname: nickname.trim() }).eq("id", user.id);
    }

    if (pendingFile) {
      const result = await uploadAvatar(user.id, pendingFile);
      if (!result) {
        alert("이미지 업로드에 실패했어. 브라우저 콘솔에서 에러를 확인해줘.");
        setUploadLoading(false);
        setSaving(false);
        return;
      }
    }

    await refreshUserRow();
    setUploadLoading(false);
    setSaving(false);
    setEditOpen(false);
    setPendingFile(null);
    setPreviewUrl(null);
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

  const dnaType   = userRow?.investor_type ? INVESTOR_TYPES[userRow.investor_type as TypeKey] : null;
  const now       = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const attendRate  = Math.round((attendCount / daysInMonth) * 100);
  const streak      = calcStreak(attendDates);

  const year     = now.getFullYear();
  const month    = now.getMonth();
  const firstDow = new Date(year, month, 1).getDay();
  const todayDay = now.getDate();
  const attendSet = new Set(attendDates);

  if (loading) return null;
  if (!user || !userRow) return null;

  const avatarSrc = previewUrl ?? userRow.avatar_url;

  return (
    <main className="min-h-screen" style={{ background: "#0d0d0d" }}>
      <nav className="sticky top-0 z-30 border-b flex items-center px-5" style={{ height: 56, background: "rgba(13,13,13,0.96)", backdropFilter: "blur(20px)", borderColor: "rgba(255,255,255,0.06)" }}>
        <Link href="/" style={{ fontSize: 13, color: "#5c5448", textDecoration: "none" }}>← 홈</Link>
        <span style={{ fontFamily: "var(--font-serif)", fontSize: 20, color: "#FACA3E", marginLeft: 16 }}>PICO</span>
      </nav>

      {/* 수정 모달 */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}>
          <div className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl p-6 border" style={{ background: "#141414", borderColor: "rgba(255,255,255,0.1)" }}>
            <p style={{ fontSize: 17, fontWeight: 500, color: "#e8e0d0", marginBottom: 24 }}>프로필 수정</p>

            <div className="flex justify-center mb-6">
              <button onClick={() => fileInputRef.current?.click()} className="pico-btn relative" style={{ background: "none", border: "none" }}>
                {avatarSrc ? (
                  <img src={avatarSrc} alt="프로필" style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(250,202,62,0.4)" }} />
                ) : (
                  <div style={{ width: 80, height: 80, borderRadius: "50%", background: "#242424", border: "2px dashed rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, color: "#5c5448" }}>
                    {userRow.nickname[0]?.toUpperCase() ?? "?"}
                  </div>
                )}
                <div style={{ position: "absolute", bottom: 0, right: 0, width: 24, height: 24, borderRadius: "50%", background: "#FACA3E", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#0d0d0d" }}>
                  ✎
                </div>
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileChange} />
            </div>

            <p style={{ fontSize: 11, letterSpacing: "0.12em", color: "#5c5448", textTransform: "uppercase", marginBottom: 8 }}>닉네임</p>
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full rounded-xl px-4 py-3 outline-none mb-5"
              style={{ background: "#1c1c1c", border: "0.5px solid rgba(250,202,62,0.35)", color: "#e8e0d0", fontSize: 15 }}
            />

            <div className="flex gap-3">
              <button onClick={handleSave} disabled={saving} className="pico-btn flex-1 py-3 rounded-xl"
                style={{ background: "#FACA3E", color: "#0d0d0d", fontSize: 14, fontWeight: 500 }}>
                {saving ? (uploadLoading ? "업로드 중..." : "저장 중...") : "저장"}
              </button>
              <button onClick={() => { setEditOpen(false); setPendingFile(null); setPreviewUrl(null); }} className="pico-btn px-5 py-3 rounded-xl"
                style={{ background: "#1c1c1c", color: "#a09688", fontSize: 14, border: "0.5px solid rgba(255,255,255,0.1)" }}>
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto px-4 py-8" style={{ maxWidth: tab === "dna" ? 900 : 520 }}>

        {/* ── 프로필 카드 ── */}
        <div className="rounded-2xl p-6 border mb-5 flex items-center gap-4" style={{ background: "#141414", borderColor: "rgba(255,255,255,0.08)" }}>
          {userRow.avatar_url ? (
            <img src={userRow.avatar_url} alt="프로필" style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "2px solid rgba(255,255,255,0.1)" }} />
          ) : (
            <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#242424", border: "2px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 500, color: "#a09688", flexShrink: 0 }}>
              {userRow.nickname[0]?.toUpperCase() ?? "?"}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p style={{ fontSize: 20, fontWeight: 500, color: "#e8e0d0", marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{userRow.nickname}</p>
            <p style={{ fontSize: 12, color: "#5c5448", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.email}</p>
          </div>
          <button onClick={openEdit} className="pico-btn px-3 py-2 rounded-lg flex-shrink-0"
            style={{ fontSize: 12, color: "#a09688", border: "0.5px solid rgba(255,255,255,0.1)", background: "transparent" }}>
            수정
          </button>
        </div>

        {/* ── 탭 ── */}
        <div className="flex mb-6 rounded-xl p-1" style={{ background: "#1a1a1a", border: "0.5px solid rgba(255,255,255,0.06)" }}>
          {(["info", "dna"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className="pico-btn flex-1 py-2.5 rounded-lg"
              style={{
                fontSize: 13, fontWeight: tab === t ? 500 : 400,
                background: tab === t ? "#242424" : "transparent",
                color: tab === t ? "#e8e0d0" : "#5c5448",
                border: "none", transition: "all 0.15s",
              }}>
              {t === "info" ? "내 정보" : "투자 DNA"}
            </button>
          ))}
        </div>

        {/* ── 내 정보 탭 ── */}
        {tab === "info" && (
          <>
            {/* 포인트 + 출석률 */}
            <div className="grid grid-cols-2 gap-3 mb-6">
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

            {/* 출석 캘린더 */}
            <p style={{ fontSize: 11, letterSpacing: "0.12em", color: "#5c5448", textTransform: "uppercase", marginBottom: 12 }}>출석 캘린더</p>

            <div className="rounded-2xl px-5 py-4 border mb-3 flex items-center justify-between" style={{ background: "#141414", borderColor: "rgba(250,202,62,0.2)" }}>
              <div>
                <p style={{ fontSize: 12, color: "#5c5448", marginBottom: 4 }}>현재 연속 출석</p>
                <div className="flex items-baseline gap-1.5">
                  <span style={{ fontFamily: "var(--font-inter)", fontSize: 34, fontWeight: 300, color: "#FACA3E", letterSpacing: "-0.03em" }}>{streak}</span>
                  <span style={{ fontSize: 15, color: "#a09688" }}>일 연속</span>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ fontSize: 12, color: "#5c5448" }}>
                  {streak === 0 ? "오늘 배틀 투표로 시작!" : "VS 배틀 투표 → +50P"}
                </p>
              </div>
            </div>

            <div className="rounded-2xl p-5 border mb-4" style={{ background: "#141414", borderColor: "rgba(255,255,255,0.08)" }}>
              <p style={{ fontSize: 12, color: "#a09688", fontWeight: 500, marginBottom: 14 }}>
                {now.toLocaleDateString("ko-KR", { year: "numeric", month: "long" })}
              </p>
              <div className="grid grid-cols-7 mb-2">
                {["일","월","화","수","목","금","토"].map((d) => (
                  <div key={d} style={{ textAlign: "center", fontSize: 11, color: "#5c5448" }}>{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-y-1">
                {Array.from({ length: firstDow }).map((_, i) => <div key={`e${i}`} />)}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const attended = attendSet.has(dateStr);
                  const isToday = day === todayDay;
                  const isFuture = day > todayDay;
                  return (
                    <div key={day} className="flex flex-col items-center gap-1 py-1">
                      <span style={{ fontFamily: "var(--font-inter)", fontSize: 12, fontWeight: isToday ? 500 : 300, color: isToday ? "#e8e0d0" : isFuture ? "#2a2a2a" : attended ? "#FACA3E" : "#3a3a3a" }}>
                        {day}
                      </span>
                      <div style={{ width: 5, height: 5, borderRadius: "50%", background: attended ? "#FACA3E" : isToday ? "rgba(255,255,255,0.12)" : "transparent", boxShadow: attended ? "0 0 5px rgba(250,202,62,0.55)" : "none" }} />
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-2 mt-4 pt-3" style={{ borderTop: "0.5px solid rgba(255,255,255,0.06)" }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#FACA3E", boxShadow: "0 0 5px rgba(250,202,62,0.55)" }} />
                <span style={{ fontSize: 11, color: "#5c5448" }}>출석</span>
                <span style={{ fontSize: 11, color: "#3a3a3a", marginLeft: 10 }}>{attendCount} / {daysInMonth}일</span>
              </div>
            </div>

            {/* 연속 출석 보너스 */}
            <p style={{ fontSize: 11, letterSpacing: "0.12em", color: "#5c5448", textTransform: "uppercase", marginBottom: 12 }}>연속 출석 보너스</p>
            <div className="flex flex-col gap-2 mb-8">
              {MILESTONES.map((m) => {
                const achieved = streak >= m.days;
                return (
                  <div key={m.days} className="rounded-xl px-4 py-3.5 border flex items-center justify-between"
                    style={{ background: achieved ? "rgba(255,255,255,0.03)" : "#141414", borderColor: achieved ? `${m.color}35` : "rgba(255,255,255,0.06)", opacity: achieved ? 1 : 0.45 }}>
                    <div className="flex items-center gap-2">
                      <span style={{ fontSize: 13, fontWeight: 500, color: achieved ? m.color : "#5c5448" }}>{m.label}</span>
                      {achieved && <span style={{ fontSize: 10, color: m.color, background: `${m.color}18`, padding: "1px 6px", borderRadius: 4 }}>달성</span>}
                    </div>
                    <span style={{ fontFamily: "var(--font-inter)", fontSize: 18, fontWeight: 300, color: achieved ? m.color : "#2a2a2a", letterSpacing: "-0.02em" }}>
                      +{m.bonus.toLocaleString()}P
                    </span>
                  </div>
                );
              })}
            </div>

            {/* 로그아웃 */}
            <button onClick={signOut} className="pico-btn w-full rounded-xl py-3 mb-3"
              style={{ background: "transparent", color: "#a09688", border: "0.5px solid rgba(255,255,255,0.1)", fontSize: 14, fontWeight: 500 }}>
              로그아웃
            </button>

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

        {/* ── 투자 DNA 탭 ── */}
        {tab === "dna" && (
          <>
            {dnaType ? (
              <>
                {/* 타입 헤더 */}
                <div className="rounded-2xl px-7 py-6 border mb-5 flex items-center justify-between flex-wrap gap-4"
                  style={{ background: `${dnaType.color}0e`, borderColor: `${dnaType.color}30` }}>
                  <div className="flex items-center gap-4">
                    <span style={{ fontSize: "clamp(44px, 8vw, 64px)", lineHeight: 1 }}>{dnaType.emoji}</span>
                    <div>
                      <p style={{ fontSize: "clamp(13px, 2.5vw, 16px)", letterSpacing: "0.1em", color: dnaType.color, fontWeight: 600, marginBottom: 4 }}>{dnaType.modifier}</p>
                      <p style={{ fontSize: "clamp(24px, 5vw, 36px)", fontWeight: 700, color: "#e8e0d0", lineHeight: 1.1 }}>{dnaType.name}</p>
                      <p style={{ fontSize: "clamp(13px, 2.5vw, 15px)", color: "#a09688", marginTop: 6, lineHeight: 1.55, maxWidth: 420 }}>{dnaType.tagline}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <span style={{ fontSize: 12, padding: "3px 10px", borderRadius: 5, background: "rgba(240,120,120,0.12)", color: "#f07878", border: "0.5px solid rgba(240,120,120,0.3)" }}>R: {dnaType.axisR}</span>
                    <span style={{ fontSize: 12, padding: "3px 10px", borderRadius: 5, background: "rgba(126,212,160,0.12)", color: "#7ed4a0", border: "0.5px solid rgba(126,212,160,0.3)" }}>T: {dnaType.axisT}</span>
                    <span style={{ fontSize: 12, padding: "3px 10px", borderRadius: 5, background: "rgba(250,202,62,0.12)", color: "#FACA3E", border: "0.5px solid rgba(250,202,62,0.3)" }}>Y: {dnaType.axisY}</span>
                  </div>
                </div>

                {/* 성향 */}
                <div className="rounded-2xl px-7 py-5 border mb-4" style={{ background: "#141414", borderColor: "rgba(255,255,255,0.08)" }}>
                  <p style={{ fontSize: 11, letterSpacing: "0.14em", color: "#5c5448", textTransform: "uppercase", marginBottom: 10 }}>투자 성향</p>
                  <p style={{ fontSize: "clamp(14px, 2.5vw, 16px)", color: "#c8c0b0", lineHeight: 1.8 }}>{dnaType.desc}</p>
                </div>

                {/* 자산배분 + 추천종목 — 2열 그리드 (desktop) */}
                <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
                  {/* 자산 배분 */}
                  <div className="rounded-2xl px-6 py-5 border" style={{ background: "#141414", borderColor: "rgba(255,255,255,0.08)" }}>
                    <p style={{ fontSize: 11, letterSpacing: "0.14em", color: "#5c5448", textTransform: "uppercase", marginBottom: 14 }}>적정 자산 배분</p>
                    <div className="flex flex-col gap-4">
                      {dnaType.allocation.map((item, i) => (
                        <div key={i}>
                          <p style={{ fontSize: "clamp(14px, 2.5vw, 16px)", fontWeight: 600, color: "#e8e0d0", marginBottom: 2 }}>{item.label}</p>
                          <p style={{ fontFamily: "var(--font-inter)", fontSize: "clamp(14px, 2.5vw, 16px)", color: dnaType.color }}>{item.pct}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 추천 종목 */}
                  <div className="rounded-2xl px-6 py-5 border" style={{ background: "#141414", borderColor: "rgba(255,255,255,0.08)" }}>
                    <p style={{ fontSize: 11, letterSpacing: "0.14em", color: "#5c5448", textTransform: "uppercase", marginBottom: 14 }}>추천 종목 스타일</p>
                    <div className="flex flex-col gap-3">
                      {dnaType.recommended.map((r, i) => (
                        <div key={i} className="flex gap-3 pb-3 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                          <span style={{ fontSize: "clamp(11px, 2vw, 13px)", color: dnaType.color, fontWeight: 600, minWidth: 36, flexShrink: 0, paddingTop: 2 }}>{r.label}</span>
                          <span style={{ fontSize: "clamp(13px, 2.3vw, 15px)", color: "#c8c0b0", lineHeight: 1.55 }}>{r.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 위험 경고 */}
                <div className="flex flex-col gap-3 mb-4">
                  {dnaType.guards.map((g, i) => (
                    <div key={i} className="rounded-2xl px-6 py-4 border" style={{ background: "rgba(240,120,120,0.06)", borderColor: "rgba(240,120,120,0.22)" }}>
                      <p style={{ fontSize: "clamp(13px, 2.5vw, 15px)", fontWeight: 600, color: "#f07878", marginBottom: 6 }}>
                        🚨 위험 신호 — {g.title}
                      </p>
                      <p style={{ fontSize: "clamp(12px, 2.2vw, 14px)", color: "#c8c0b0", lineHeight: 1.7 }}>{g.desc}</p>
                    </div>
                  ))}
                </div>

                {/* 궁합 */}
                <div className="rounded-2xl px-6 py-4 border mb-5"
                  style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.1)" }}>
                  <p style={{ fontSize: 11, letterSpacing: "0.14em", color: "#5c5448", textTransform: "uppercase", marginBottom: 8 }}>찰떡 궁합 유형</p>
                  <p style={{ fontSize: "clamp(14px, 2.5vw, 16px)", color: "#e8e0d0", lineHeight: 1.6 }}>{dnaType.compatible}</p>
                </div>

                {/* 모든 유형 보기 */}
                <button onClick={() => setShowAllTypes((v) => !v)} className="pico-btn w-full rounded-xl py-3 mb-4"
                  style={{ background: "transparent", color: "#a09688", border: "0.5px solid rgba(255,255,255,0.1)", fontSize: 14 }}>
                  {showAllTypes ? "접기" : "모든 유형 보기"}
                </button>

                {showAllTypes && (
                  <div className="grid gap-3 mb-6" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
                    {TYPE_KEYS.map((key) => {
                      const t = INVESTOR_TYPES[key];
                      const isMe = key === userRow.investor_type;
                      return (
                        <div key={key} className="rounded-2xl p-4 border flex items-center gap-4"
                          style={{ background: isMe ? `${t.color}10` : "#141414", borderColor: isMe ? `${t.color}40` : "rgba(255,255,255,0.06)" }}>
                          <span style={{ fontSize: 36, flexShrink: 0 }}>{t.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <p style={{ fontSize: 11, color: t.color, marginBottom: 2, letterSpacing: "0.1em", textTransform: "uppercase" }}>{t.modifier}</p>
                            <p style={{ fontSize: 16, fontWeight: 600, color: "#e8e0d0" }}>{t.name}</p>
                            <p style={{ fontSize: 12, color: "#5c5448", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.tagline}</p>
                          </div>
                          {isMe && (
                            <span style={{ fontSize: 10, color: t.color, background: `${t.color}18`, padding: "2px 7px", borderRadius: 4, flexShrink: 0 }}>나</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-2xl p-8 border text-center" style={{ background: "#141414", borderColor: "rgba(255,255,255,0.08)" }}>
                <p style={{ fontSize: 32, marginBottom: 16 }}>🧬</p>
                <p style={{ fontSize: 16, color: "#a09688", marginBottom: 6 }}>아직 투자 DNA를 몰라</p>
                <p style={{ fontSize: 13, color: "#5c5448", marginBottom: 20 }}>18개 질문으로 나만의 투자 유형을 찾아봐</p>
                <Link href="/quiz"
                  style={{ display: "inline-block", background: "#FACA3E", color: "#0d0d0d", fontSize: 14, fontWeight: 500, padding: "10px 24px", borderRadius: 12, textDecoration: "none" }}>
                  투자 DNA 테스트 시작
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}

export default function MyPage() {
  return (
    <Suspense fallback={null}>
      <MyPageInner />
    </Suspense>
  );
}
