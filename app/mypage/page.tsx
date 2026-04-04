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

export default function MyPage() {
  const router = useRouter();
  const { user, userRow, loading, refreshUserRow, signOut } = useAuth();

  const [nickname, setNickname]         = useState("");
  const [editing, setEditing]           = useState(false);
  const [saving, setSaving]             = useState(false);
  const [attendCount, setAttendCount]   = useState(0);
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
    const thisMonth = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" }).slice(0, 7); // "2026-04"
    supabase
      .from("attendance")
      .select("date", { count: "exact" })
      .eq("user_id", user.id)
      .like("date", `${thisMonth}%`)
      .then(({ count }) => setAttendCount(count ?? 0));
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
    // 관련 데이터 삭제 → auth 삭제는 서버 측 admin 권한 필요, 여기선 signOut만
    await supabase.from("battle_votes").delete().eq("user_id", user.id);
    await supabase.from("attendance").delete().eq("user_id", user.id);
    await supabase.from("users").delete().eq("id", user.id);
    await signOut();
    router.replace("/");
  }

  const animalInfo = userRow?.investor_type ? ANIMAL_NAMES[userRow.investor_type] : null;
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const attendRate = Math.round((attendCount / daysInMonth) * 100);

  if (loading) return null;
  if (!user || !userRow) return null;

  return (
    <main className="min-h-screen" style={{ background: "#0d0d0d" }}>
      <nav className="sticky top-0 z-30 border-b flex items-center px-5" style={{ height: 56, background: "rgba(13,13,13,0.96)", backdropFilter: "blur(20px)", borderColor: "rgba(255,255,255,0.06)" }}>
        <Link href="/" style={{ fontSize: 13, color: "#5c5448", textDecoration: "none" }}>← 홈</Link>
        <span style={{ fontFamily: "var(--font-serif)", fontSize: 20, color: "#FACA3E", marginLeft: 16 }}>PICO</span>
      </nav>

      <div className="mx-auto px-5 py-10" style={{ maxWidth: 480 }}>
        <p style={{ fontSize: 24, fontWeight: 500, color: "#e8e0d0", marginBottom: 24 }}>내 정보</p>

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
            <p style={{ fontFamily: "var(--font-dm-mono)", fontSize: 26, fontWeight: 300, color: "#FACA3E", letterSpacing: "-0.02em" }}>
              {userRow.total_points.toLocaleString()}P
            </p>
          </div>
          <div className="rounded-2xl p-5 border" style={{ background: "#141414", borderColor: "rgba(126,212,160,0.2)" }}>
            <p style={{ fontSize: 11, letterSpacing: "0.12em", color: "#5c5448", textTransform: "uppercase", marginBottom: 8 }}>이번 달 출석</p>
            <p style={{ fontFamily: "var(--font-dm-mono)", fontSize: 26, fontWeight: 300, color: "#7ed4a0", letterSpacing: "-0.02em" }}>
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
      </div>
    </main>
  );
}
