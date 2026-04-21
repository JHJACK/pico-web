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
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/auth/delete-account", {
        method: "POST",
        headers: { Authorization: `Bearer ${session?.access_token ?? ""}` },
      });
      if (!res.ok) throw new Error("탈퇴 실패");
      await signOut();
      router.replace("/");
    } catch (e) {
      console.error("[deleteAccount]", e);
      setDeleteLoading(false);
      setShowDeleteConfirm(false);
    }
  }

  const dnaType = userRow?.investor_type ? INVESTOR_TYPES[userRow.investor_type as TypeKey] : null;
  const isMobile = typeof window !== "undefined" && window.innerWidth <= 480;

  // isMobile 분기 폰트 크기
  const FS = {
    nickname:  isMobile ? "19px" : "22px",
    cardBody:  isMobile ? "14px" : "16px",
    pointVal:  isMobile ? "20px" : "24px",
    cardLabel: isMobile ? "12px" : "14px",
  };

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
            <div className="flex items-center justify-between mb-6">
              <p style={{ fontSize: 18, fontWeight: 500, color: "#e8e0d0" }}>프로필 수정</p>
              {(() => {
                const provider = user.app_metadata?.provider;
                if (provider === "kakao") return (
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full" style={{ background: "#FEE500" }}>
                    <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#FEE500", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <svg width="12" height="12" viewBox="0 0 18 18"><path fill="#191600" d="M9 1.5C4.86 1.5 1.5 4.17 1.5 7.5c0 2.13 1.38 4.01 3.47 5.09l-.88 3.27a.19.19 0 0 0 .28.21L8.1 13.7a9.4 9.4 0 0 0 .9.05c4.14 0 7.5-2.67 7.5-6S13.14 1.5 9 1.5z"/></svg>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#191600", whiteSpace: "nowrap" }}>카카오 계정 로그인 중</span>
                  </div>
                );
                if (provider === "google") return (
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full" style={{ background: "#fff" }}>
                    <svg width="14" height="14" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
                      <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 2.9l5.7-5.7C34.5 7 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.9z"/>
                      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16.1 19 13 24 13c3.1 0 5.8 1.1 7.9 2.9l5.7-5.7C34.5 7 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
                      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.5-5.1l-6.2-5.3C29.4 35.5 26.8 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.7 39.7 16.3 44 24 44z"/>
                      <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.3 5.5l6.2 5.3c-.4.4 6.8-5 6.8-14.8 0-1.3-.1-2.7-.4-3.9z"/>
                    </svg>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#3c3c3c", whiteSpace: "nowrap" }}>구글 계정 로그인 중</span>
                  </div>
                );
                return null;
              })()}
            </div>

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

            {/* 이메일 (소셜 로그인이 아닐 때만 표시) */}
            {!["kakao", "google"].includes(user.app_metadata?.provider ?? "") && (
              <>
                <p style={{ fontSize: 14, color: "#e8e0d0", marginBottom: 4 }}>로그인 이메일</p>
                <p style={{ fontSize: 16, color: "#e8e0d0", marginBottom: 16 }}>{user.email}</p>
              </>
            )}
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
            <p style={{ fontSize: FS.nickname, fontWeight: 500, color: "#e8e0d0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{userRow.nickname}</p>
            {userRow.equipped_title && (
              <p style={{ fontSize: 12, color: "#c8bfb0", marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {({ sniper:"🎯 여의도 스나이퍼", frog:"🐸 역발상의 천재", hodl:"🗿 존버의 신", daytrader:"⚡️ 단타의 귀재", mentalsteel:"🧊 냉철한 멘탈" } as Record<string,string>)[userRow.equipped_title] ?? ""}
              </p>
            )}
          </div>
          <button onClick={openEdit} className="pico-btn arrow-btn flex-shrink-0"
            style={{ width: 36, height: 36, background: "#1c1c1c", border: "0.5px solid rgba(255,255,255,0.07)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 16, color: "#FACA3E" }}>›</span>
          </button>
        </div>

        {/* ── 포인트 + 오늘의 선택 ── */}
        <div className="grid grid-cols-2 gap-[10px] mb-[10px]">
          <button
            className="pico-btn border"
            style={{ background: "#141414", borderColor: "rgba(255,255,255,0.07)", borderRadius: 16, padding: "18px 20px", display: "flex", alignItems: "center", gap: 10 }}
            onClick={() => router.push("/mypage/points")}
          >
            <div style={{ flex: 1, textAlign: "left" }}>
              <p style={{ fontSize: FS.cardLabel, fontWeight: 500, color: "#c8bfb0", marginBottom: 6 }}>누적 포인트</p>
              <p className="num" style={{ fontFamily: "var(--font-inter)", fontSize: FS.pointVal, fontWeight: 500, color: "#FACA3E", letterSpacing: "-0.02em" }}>
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
              <span style={{ fontSize: FS.cardBody, fontWeight: 500, color: "#e8e0d0" }}>오늘의 선택</span>
            </div>
            <div className="arrow-btn" style={{ width: 36, height: 36, background: "#1c1c1c", border: "0.5px solid rgba(255,255,255,0.07)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, alignSelf: "center" }}>
              <span style={{ fontSize: 16, color: "#FACA3E" }}>›</span>
            </div>
          </button>
        </div>

        {/* ── 퀘스트 카드 ── */}
        <button
          className="pico-btn border w-full mb-[10px]"
          style={{ background: "#141414", borderColor: "rgba(250,202,62,0.2)", borderRadius: 16, padding: "16px 20px", display: "flex", alignItems: "center", gap: 12, textAlign: "left" }}
          onClick={() => router.push("/mypage/quests")}
        >
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: FS.cardBody, fontWeight: 500, color: "#e8e0d0" }}>퀘스트 완료하고 포인트 받기 🎯</p>
          </div>
          <div className="arrow-btn" style={{ width: 36, height: 36, background: "#1c1c1c", border: "0.5px solid rgba(255,255,255,0.07)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ fontSize: 16, color: "#FACA3E" }}>›</span>
          </div>
        </button>

        {/* ── 랭킹 + 뱃지 도감 ── */}
        <div className="grid grid-cols-2 gap-[10px] mb-[10px]">
          <button
            className="pico-btn border"
            style={{ background: "#141414", borderColor: "rgba(255,255,255,0.07)", borderRadius: 16, padding: "18px 20px", display: "flex", alignItems: "center", gap: 10, textAlign: "left", width: "100%" }}
            onClick={() => router.push("/ranking")}
          >
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: FS.cardLabel, fontWeight: 500, color: "#c8bfb0", marginBottom: 6 }}>주간 랭킹</p>
              <p style={{ fontSize: FS.cardBody, fontWeight: 500, color: "#FACA3E" }}>🏆 투자의 신</p>
            </div>
            <div className="arrow-btn" style={{ width: 36, height: 36, background: "#1c1c1c", border: "0.5px solid rgba(255,255,255,0.07)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ fontSize: 16, color: "#FACA3E" }}>›</span>
            </div>
          </button>
          <button
            className="pico-btn border"
            style={{ background: "#141414", borderColor: "rgba(255,255,255,0.07)", borderRadius: 16, padding: "18px 20px", display: "flex", alignItems: "center", gap: 10, textAlign: "left", width: "100%" }}
            onClick={() => router.push("/mypage/badges")}
          >
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: FS.cardLabel, fontWeight: 500, color: "#c8bfb0", marginBottom: 6 }}>뱃지 도감</p>
              <p style={{ fontSize: FS.cardBody, fontWeight: 500, color: "#e8e0d0" }}>🎖️ 컬렉션</p>
            </div>
            <div className="arrow-btn" style={{ width: 36, height: 36, background: "#1c1c1c", border: "0.5px solid rgba(255,255,255,0.07)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
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
                <span style={{ fontSize: FS.cardBody, fontWeight: 500, color: "#e8e0d0" }}>
                  {dnaType ? dnaType.modifier : "투자 DNA"}
                </span>
                <span style={{ fontSize: FS.cardBody, fontWeight: 500, color: "#FACA3E" }}>
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
            <span style={{ fontSize: FS.cardBody, fontWeight: 500, color: "#e8e0d0", flex: 1, textAlign: "left" }}>출석체크 캘린더🔥</span>
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
            <p style={{ fontSize: 14, fontWeight: 400, color: "#f07878", marginBottom: 12 }}>정말 탈퇴하실 건가요? 모든 포인트와 기록이 삭제돼요.</p>
            <div className="flex gap-2">
              <button onClick={handleDeleteAccount} disabled={deleteLoading} className="pico-btn flex-1 py-2.5 rounded-xl"
                style={{ background: "#f07878", color: "#0d0d0d", fontSize: 13, fontWeight: 500 }}>
                {deleteLoading ? "처리 중..." : "탈퇴할게요"}
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
