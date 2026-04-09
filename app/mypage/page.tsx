"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/app/lib/authContext";
import { supabase, uploadAvatar, type BattleVoteRow } from "@/app/lib/supabase";
import { INVESTOR_TYPES, type TypeKey } from "@/app/lib/quizTypes";

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

export default function MyPage() {
  const router = useRouter();
  const { user, userRow, loading, refreshUserRow, signOut } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  const [saveError,     setSaveError]             = useState("");
  const [lastBattle,   setLastBattle]             = useState<BattleVoteRow | null | undefined>(undefined);

  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [user, loading, router]);

  useEffect(() => {
    if (userRow) setNickname(userRow.nickname);
  }, [userRow]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("battle_votes")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) { console.error("[mypage] lastBattle:", error.message); return; }
        setLastBattle(data as BattleVoteRow | null);
      });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const now = new Date();
    const y   = now.getFullYear();
    const m   = String(now.getMonth() + 1).padStart(2, "0");
    const lastDay = new Date(y, now.getMonth() + 1, 0).getDate();
    const monthStart = `${y}-${m}-01`;
    const monthEnd   = `${y}-${m}-${String(lastDay).padStart(2, "0")}`;
    supabase
      .from("attendance")
      .select("date", { count: "exact" })
      .eq("user_id", user.id)
      .gte("date", monthStart)
      .lte("date", monthEnd)
      .then(({ data, count, error }) => {
        if (error) { console.error("[mypage] attendance:", error.message); return; }
        setAttendCount(count ?? 0);
        setAttendDates((data ?? []).map((r: { date: string }) => r.date));
      });
  }, [user]);

  function openEdit() {
    if (userRow) setNickname(userRow.nickname);
    setPreviewUrl(null);
    setPendingFile(null);
    setSaveError("");
    setEditOpen(true);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setSaveError("이미지는 2MB 이하만 업로드할 수 있어.");
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
    setSaveError("");

    if (nickname.trim() && nickname.trim() !== userRow.nickname) {
      const { error } = await supabase
        .from("users")
        .update({ nickname: nickname.trim() })
        .eq("id", user.id);
      if (error) {
        setSaveError("닉네임 저장에 실패했어. 다시 시도해줘.");
        setUploadLoading(false);
        setSaving(false);
        return;
      }
    }

    if (pendingFile) {
      const result = await uploadAvatar(user.id, pendingFile);
      if (!result) {
        setSaveError("이미지 업로드에 실패했어. 파일 크기나 형식을 확인해줘.");
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
    try {
      await supabase.from("battle_votes").delete().eq("user_id", user.id);
      await supabase.from("attendance").delete().eq("user_id", user.id);
      const { error } = await supabase.from("users").delete().eq("id", user.id);
      if (error) throw error;
      await signOut();
      router.replace("/");
    } catch (e) {
      console.error("[deleteAccount]", e);
      setDeleteLoading(false);
      setShowDeleteConfirm(false);
    }
  }

  const dnaType     = userRow?.investor_type ? INVESTOR_TYPES[userRow.investor_type as TypeKey] : null;
  const now         = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const attendRate  = Math.round((attendCount / daysInMonth) * 100);
  const streak      = calcStreak(attendDates);

  if (loading) return null;
  if (!user || !userRow) return null;

  const avatarSrc = previewUrl ?? userRow.avatar_url;

  return (
    <main className="min-h-screen" style={{ background: "#0d0d0d" }}>
      <nav
        className="sticky top-0 z-30 border-b flex items-center px-6"
        style={{ height: 56, background: "rgba(13,13,13,0.96)", backdropFilter: "blur(20px)", borderColor: "rgba(255,255,255,0.06)" }}
      >
        <Link href="/" style={{ fontSize: 13, color: "#5c5448", textDecoration: "none" }}>← 홈</Link>
        <span style={{ fontFamily: "var(--font-serif)", fontSize: 20, color: "#FACA3E", marginLeft: 16 }}>PICO</span>
      </nav>

      {/* 수정 모달 */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}>
          <div className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl p-6 border"
            style={{ background: "#141414", borderColor: "rgba(255,255,255,0.1)" }}>
            <p style={{ fontSize: 16, fontWeight: 500, color: "#e8e0d0", marginBottom: 24 }}>프로필 수정</p>

            <div className="flex justify-center mb-6">
              <button onClick={() => fileInputRef.current?.click()} className="pico-btn relative" style={{ background: "none", border: "none" }}>
                {avatarSrc ? (
                  <img src={avatarSrc} alt="프로필" style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(250,202,62,0.4)" }} />
                ) : (
                  <div style={{ width: 80, height: 80, borderRadius: "50%", background: "#242424", border: "2px dashed rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, color: "#5c5448" }}>
                    {userRow.nickname[0]?.toUpperCase() ?? "?"}
                  </div>
                )}
                <div style={{ position: "absolute", bottom: 0, right: 0, width: 24, height: 24, borderRadius: "50%", background: "#FACA3E", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#0d0d0d" }}>✎</div>
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileChange} />
            </div>

            <p style={{ fontSize: 11, letterSpacing: "0.12em", color: "#5c5448", textTransform: "uppercase", marginBottom: 8 }}>닉네임</p>
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full rounded-xl px-4 py-3 outline-none mb-4"
              style={{ background: "#1c1c1c", border: "0.5px solid rgba(250,202,62,0.35)", color: "#e8e0d0", fontSize: 15, fontWeight: 300 }}
            />

            {saveError && (
              <p style={{ fontSize: 12, color: "#f07878", marginBottom: 10 }}>{saveError}</p>
            )}

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

      <div
        className="mx-auto py-8"
        style={{ maxWidth: 700, paddingLeft: "clamp(16px, 4vw, 24px)", paddingRight: "clamp(16px, 4vw, 24px)" }}
      >

        {/* ── 프로필 카드 ── */}
        <div className="rounded-2xl p-5 border mb-4 flex items-center gap-4"
          style={{ background: "#141414", borderColor: "rgba(255,255,255,0.08)" }}>
          {userRow.avatar_url ? (
            <img src={userRow.avatar_url} alt="프로필" style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "2px solid rgba(255,255,255,0.1)" }} />
          ) : (
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#242424", border: "2px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 400, color: "#a09688", flexShrink: 0 }}>
              {userRow.nickname[0]?.toUpperCase() ?? "?"}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p style={{ fontSize: 16, fontWeight: 500, color: "#e8e0d0", marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{userRow.nickname}</p>
            <p style={{ fontSize: 12, fontWeight: 300, color: "#5c5448", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.email}</p>
          </div>
          <button onClick={openEdit} className="pico-btn px-3 py-2 rounded-lg flex-shrink-0"
            style={{ fontSize: 12, fontWeight: 400, color: "#a09688", border: "0.5px solid rgba(255,255,255,0.1)", background: "transparent" }}>
            수정
          </button>
        </div>

        {/* ── 포인트 + 출석률 ── */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-2xl p-5 border" style={{ background: "#141414", borderColor: "rgba(250,202,62,0.2)" }}>
            <p style={{ fontSize: 13, fontWeight: 400, color: "#5c5448", marginBottom: 8 }}>누적 포인트</p>
            <p style={{ fontFamily: "var(--font-inter)", fontSize: 22, fontWeight: 500, color: "#FACA3E", letterSpacing: "-0.02em" }}>
              {userRow.total_points.toLocaleString()}P
            </p>
          </div>
          <div className="rounded-2xl p-5 border" style={{ background: "#141414", borderColor: "rgba(126,184,247,0.2)" }}>
            <p style={{ fontSize: 13, fontWeight: 400, color: "#5c5448", marginBottom: 8 }}>최근 대결 결과</p>
            {lastBattle === undefined ? null : lastBattle === null ? (
              <p style={{ fontSize: 13, fontWeight: 300, color: "#3a3a3a", marginTop: 4 }}>아직 대결 참여 기록이 없어요</p>
            ) : (
              <>
                <p style={{ fontFamily: "var(--font-inter)", fontSize: 22, fontWeight: 500, color: "#7eb8f7", letterSpacing: "-0.02em" }}>
                  {lastBattle.voted_for}
                </p>
                <p style={{
                  fontSize: 13,
                  fontWeight: 300,
                  marginTop: 4,
                  color: lastBattle.is_correct === true
                    ? "#7ed4a0"
                    : lastBattle.is_correct === false
                    ? "#a09688"
                    : "#5c5448",
                }}>
                  {lastBattle.is_correct === true
                    ? "정답! 🎉"
                    : lastBattle.is_correct === false
                    ? "아쉽게 틀렸어요 😅"
                    : "결과 집계 중..."}
                </p>
              </>
            )}
          </div>
        </div>

        {/* ── 내 투자 DNA 박스 ── */}
        <button onClick={() => router.push("/mypage/dna")} className="pico-btn w-full text-left rounded-2xl p-5 border mb-4"
          style={{ background: "#141414", borderColor: dnaType ? `${dnaType.color}30` : "rgba(255,255,255,0.08)" }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span style={{ fontSize: 26 }}>{dnaType ? dnaType.emoji : "🧬"}</span>
              <div>
                <p style={{ fontSize: 11, letterSpacing: "0.12em", fontWeight: 400, color: dnaType ? dnaType.color : "#5c5448", textTransform: "uppercase", marginBottom: 3 }}>
                  {dnaType ? dnaType.modifier : "투자 DNA"}
                </p>
                <p style={{ fontSize: 16, fontWeight: 500, color: "#e8e0d0" }}>
                  {dnaType ? dnaType.name : "아직 테스트 안 함"}
                </p>
              </div>
            </div>
            <span style={{ fontSize: 18, color: "#5c5448" }}>→</span>
          </div>
          <p style={{ fontSize: 12, fontWeight: 300, color: "#5c5448", marginTop: 8 }}>
            {dnaType ? "상세 리포트 · 자산 배분 · 추천 종목 보기" : "18문항으로 나만의 투자 유형 찾기"}
          </p>
        </button>

        {/* ── 출석 캘린더 카드 ── */}
        <button onClick={() => router.push("/mypage/attendance")} className="pico-btn w-full text-left rounded-2xl p-5 border mb-8"
          style={{ background: "#141414", borderColor: "rgba(250,202,62,0.2)" }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span style={{ fontSize: 26 }}>📅</span>
              <div>
                <p style={{ fontSize: 11, letterSpacing: "0.12em", fontWeight: 400, color: "#FACA3E", textTransform: "uppercase", marginBottom: 3 }}>
                  출석 캘린더
                </p>
                <p style={{ fontSize: 16, fontWeight: 500, color: "#e8e0d0" }}>
                  🔥 {streak}일 연속 출석 중
                </p>
              </div>
            </div>
            <span style={{ fontSize: 18, color: "#5c5448" }}>→</span>
          </div>
          <p style={{ fontSize: 12, fontWeight: 300, color: "#5c5448", marginTop: 8 }}>
            이번 달 출석 {attendCount}/{daysInMonth}일
          </p>
        </button>

        {/* ── 로그아웃 ── */}
        <button onClick={signOut} className="pico-btn w-full rounded-xl py-3 mb-3"
          style={{ background: "transparent", color: "#a09688", border: "0.5px solid rgba(255,255,255,0.1)", fontSize: 14, fontWeight: 400 }}>
          로그아웃
        </button>

        {!showDeleteConfirm ? (
          <button onClick={() => setShowDeleteConfirm(true)} className="pico-btn w-full py-2"
            style={{ background: "transparent", color: "#5c5448", fontSize: 13, fontWeight: 300, border: "none" }}>
            회원 탈퇴
          </button>
        ) : (
          <div className="rounded-2xl p-5 border" style={{ background: "rgba(240,120,120,0.06)", borderColor: "rgba(240,120,120,0.25)" }}>
            <p style={{ fontSize: 14, fontWeight: 400, color: "#f07878", marginBottom: 12 }}>정말 탈퇴할까? 모든 포인트와 기록이 삭제돼.</p>
            <div className="flex gap-2">
              <button onClick={handleDeleteAccount} disabled={deleteLoading} className="pico-btn flex-1 py-2.5 rounded-xl"
                style={{ background: "#f07878", color: "#0d0d0d", fontSize: 13, fontWeight: 500 }}>
                {deleteLoading ? "처리중..." : "탈퇴할게"}
              </button>
              <button onClick={() => setShowDeleteConfirm(false)} className="pico-btn flex-1 py-2.5 rounded-xl"
                style={{ background: "#1c1c1c", color: "#a09688", fontSize: 13, fontWeight: 400, border: "0.5px solid rgba(255,255,255,0.1)" }}>
                취소
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
