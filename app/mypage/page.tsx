"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/app/lib/authContext";
import { supabase, uploadAvatar } from "@/app/lib/supabase";
import { INVESTOR_TYPES, type TypeKey } from "@/app/lib/quizTypes";


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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading]         = useState(false);
  const [saveError,     setSaveError]             = useState("");
  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [user, loading, router]);

  useEffect(() => {
    if (userRow) setNickname(userRow.nickname);
  }, [userRow]);


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
      setSaveError("이미지는 2MB 이하만 업로드 가능해요.");
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
        setSaveError("닉네임 저장에 실패했어요. 다시 시도해주세요.");
        setUploadLoading(false);
        setSaving(false);
        return;
      }
    }

    if (pendingFile) {
      const result = await uploadAvatar(user.id, pendingFile);
      if (!result) {
        setSaveError("이미지 업로드에 실패했어요. 파일 크기나 형식을 확인해주세요.");
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
            <p style={{ fontSize: 18, fontWeight: 500, color: "#e8e0d0", marginBottom: 24 }}>프로필 수정</p>

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
            <p style={{ fontSize: 13, color: "#a09688", textAlign: "center", marginTop: -12, marginBottom: 16 }}>이미지는 2MB 이하만 업로드 가능해요</p>

            {/* 이메일 (읽기 전용) */}
            <p style={{ fontSize: 14, color: "#e8e0d0", marginBottom: 4 }}>로그인 이메일</p>
            <p style={{ fontSize: 16, color: "#e8e0d0", marginBottom: 16 }}>{user.email}</p>
            <div style={{ height: "0.5px", background: "rgba(255,255,255,0.07)", marginBottom: 16 }} />

            <p style={{ fontSize: 14, color: "#e8e0d0", marginBottom: 8 }}>닉네임</p>
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full rounded-xl px-4 py-3 outline-none mb-4"
              style={{ background: "#1c1c1c", border: "0.5px solid rgba(250,202,62,0.35)", color: "#e8e0d0", fontSize: 16, fontWeight: 300 }}
            />

            {saveError && (
              <p style={{ fontSize: 14, color: "#f07878", marginBottom: 10 }}>{saveError}</p>
            )}

            <div className="flex gap-3">
              <button onClick={handleSave} disabled={saving} className="pico-btn flex-1 py-3 rounded-xl"
                style={{ background: "#FACA3E", color: "#0d0d0d", fontSize: 15, fontWeight: 500 }}>
                {saving ? (uploadLoading ? "업로드 중..." : "저장 중...") : "저장"}
              </button>
              <button onClick={() => { setEditOpen(false); setPendingFile(null); setPreviewUrl(null); }} className="pico-btn px-5 py-3 rounded-xl"
                style={{ background: "#1c1c1c", color: "#e8e0d0", fontSize: 15, border: "0.5px solid rgba(255,255,255,0.1)" }}>
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      <div
        className="page-container mx-auto py-8"
        style={{ maxWidth: 700, paddingLeft: "clamp(16px, 4vw, 24px)", paddingRight: "clamp(16px, 4vw, 24px)" }}
      >

        {/* ── 프로필 카드 ── */}
        <div className="flex items-center gap-4 mb-[10px]"
          style={{ background: "#141414", borderRadius: 16, padding: "18px 20px", border: "0.5px solid rgba(255,255,255,0.07)" }}>
          {userRow.avatar_url ? (
            <img src={userRow.avatar_url} alt="프로필" style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "2px solid rgba(255,255,255,0.1)" }} />
          ) : (
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#242424", border: "2px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 400, color: "#c8bfb0", flexShrink: 0 }}>
              {userRow.nickname[0]?.toUpperCase() ?? "?"}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="nickname" style={{ fontSize: "clamp(24px, 6.5vw, 27px)", fontWeight: 500, color: "#e8e0d0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{userRow.nickname}</p>
          </div>
          <button onClick={openEdit} className="pico-btn arrow-btn flex-shrink-0"
            style={{ width: 36, height: 36, background: "#1c1c1c", border: "0.5px solid rgba(255,255,255,0.07)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 16, color: "#FACA3E" }}>›</span>
          </button>
        </div>

        {/* ── 포인트 + 최근 대결 ── */}
        <div className="grid grid-cols-2 gap-[10px] mb-[10px]">
          <button
            className="pico-btn border"
            style={{ background: "#141414", borderColor: "rgba(255,255,255,0.07)", borderRadius: 16, padding: "18px 20px", display: "flex", alignItems: "center", gap: 10 }}
            onClick={() => router.push("/mypage/points")}
          >
            <div style={{ flex: 1, textAlign: "left" }}>
              <p className="card-label" style={{ fontSize: 14, fontWeight: 500, color: "#c8bfb0", marginBottom: 6 }}>누적 포인트</p>
              <p className="point-value num" style={{ fontFamily: "var(--font-inter)", fontSize: "clamp(20px, 5vw, 22px)", fontWeight: 500, color: "#FACA3E", letterSpacing: "-0.02em" }}>
                {userRow.total_points.toLocaleString()}P
              </p>
            </div>
            <div className="arrow-btn" style={{ width: 36, height: 36, background: "#1c1c1c", border: "0.5px solid rgba(255,255,255,0.07)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ fontSize: 16, color: "#FACA3E" }}>›</span>
            </div>
          </button>
          <button
            className="pico-btn border"
            style={{ background: "#141414", borderColor: "rgba(255,255,255,0.07)", borderRadius: 16, padding: "18px 20px", display: "flex", alignItems: "center", gap: 10, textAlign: "left", width: "100%" }}
            onClick={() => router.push("/mypage/battles")}
          >
            <div style={{ flex: 1 }}>
              <span className="card-body" style={{ fontSize: "clamp(12px, 3.5vw, 14px)", fontWeight: 500, color: "#e8e0d0" }}>오늘의 VS 대결 결과</span>
            </div>
            <div className="arrow-btn" style={{ width: 36, height: 36, background: "#1c1c1c", border: "0.5px solid rgba(255,255,255,0.07)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, alignSelf: "center" }}>
              <span style={{ fontSize: 16, color: "#FACA3E" }}>›</span>
            </div>
          </button>
        </div>

        {/* ── DNA 카드 + 출석 카드 2열 그리드 ── */}
        <div className="grid-2-col mb-8">
          {/* DNA 카드 */}
          <button onClick={() => router.push("/mypage/dna")} className="pico-btn"
            style={{ background: "#141414", borderRadius: 16, padding: "18px 20px", border: "0.5px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", gap: 12, textAlign: "left" }}>
            <span style={{ fontSize: "clamp(20px, 5vw, 23px)", flexShrink: 0 }}>{dnaType ? dnaType.emoji : "🧬"}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
                <span className="dna-modifier" style={{ fontSize: "clamp(12px, 3.5vw, 14px)", fontWeight: 500, color: "#e8e0d0" }}>
                  {dnaType ? dnaType.modifier : "투자 DNA"}
                </span>
                <span className="dna-animal" style={{ fontSize: "clamp(12px, 3.5vw, 14px)", fontWeight: 500, color: "#FACA3E" }}>
                  {dnaType ? dnaType.name : "테스트 전"}
                </span>
              </div>
            </div>
            <div className="arrow-btn" style={{ width: 36, height: 36, background: "#1c1c1c", border: "0.5px solid rgba(255,255,255,0.07)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, alignSelf: "center" }}>
              <span style={{ fontSize: 16, color: "#FACA3E" }}>›</span>
            </div>
          </button>

          {/* 출석 카드 */}
          <button onClick={() => router.push("/mypage/attendance")} className="pico-btn"
            style={{ background: "#141414", borderRadius: 16, padding: "18px 20px", border: "0.5px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", gap: 12 }}>
            <span className="card-body" style={{ fontSize: "clamp(12px, 3.5vw, 14px)", fontWeight: 500, color: "#e8e0d0", flex: 1, textAlign: "left" }}>출석체크 캘린더🔥</span>
            <div className="arrow-btn" style={{ width: 36, height: 36, background: "#1c1c1c", border: "0.5px solid rgba(255,255,255,0.07)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ fontSize: 16, color: "#FACA3E" }}>›</span>
            </div>
          </button>
        </div>

        {/* ── 로그아웃 ── */}
        <button onClick={signOut} className="pico-btn w-full rounded-xl py-3 mb-3"
          style={{ background: "transparent", color: "#c8bfb0", border: "0.5px solid rgba(255,255,255,0.07)", fontSize: 14, fontWeight: 400 }}>
          로그아웃
        </button>

        {!showDeleteConfirm ? (
          <button onClick={() => setShowDeleteConfirm(true)} className="pico-btn w-full py-2"
            style={{ background: "transparent", color: "#5c5448", fontSize: 14, fontWeight: 400, border: "none" }}>
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
