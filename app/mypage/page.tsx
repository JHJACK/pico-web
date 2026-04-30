"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/app/lib/authContext";
import { supabase, uploadAvatar } from "@/app/lib/supabase";
import { INVESTOR_TYPES, type TypeKey } from "@/app/lib/quizTypes";
import { BackIcon } from "@/app/components/BackIcon";
import PicoFooter from "@/app/components/PicoFooter";


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
    <main className="min-h-screen" style={{ background: "#0d0d0d", fontFamily: "var(--font-paperlogy), var(--font-noto), sans-serif" }}>
      <nav
        className="sticky top-0 z-30 border-b flex items-center px-6"
        style={{ height: 56, background: "rgba(13,13,13,0.96)", backdropFilter: "blur(20px)", borderColor: "rgba(255,255,255,0.06)" }}
      >
        <Link href="/" style={{ textDecoration: "none" }}><BackIcon /></Link>
        <span style={{ fontFamily: "var(--font-serif)", fontSize: 20, color: "#FACA3E", marginLeft: 16 }}>PICO</span>
      </nav>

      {/* 프로필 수정 모달 */}
      {editOpen && (() => {
        const MAX_NICK = 15;
        const hasChanged = nickname.trim() !== userRow.nickname || !!pendingFile;
        const canSave = nickname.trim().length > 0 && nickname.trim().length <= MAX_NICK && hasChanged;
        const provider = user.app_metadata?.provider;
        return (
          <>
            <div
              className="fixed inset-0 z-50"
              style={{ background: "rgba(0,0,0,0.88)", backdropFilter: "blur(20px)" }}
              onClick={() => { setEditOpen(false); setPendingFile(null); setPreviewUrl(null); }}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
              <div
                className="w-full fade-up"
                style={{ maxWidth: 400, background: "#141414", border: "0.5px solid rgba(250,202,62,0.22)", borderRadius: 28, padding: "0 0 28px", position: "relative", boxShadow: "0 0 80px rgba(250,202,62,0.08), 0 24px 60px rgba(0,0,0,0.7)", fontFamily: "var(--font-paperlogy), var(--font-noto), sans-serif" }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* 닫기 버튼 */}
                <button
                  onClick={() => { setEditOpen(false); setPendingFile(null); setPreviewUrl(null); }}
                  className="pico-btn flex items-center justify-center"
                  style={{ position: "absolute", top: 16, right: 16, width: 32, height: 32, borderRadius: 10, background: "#1e1e1e", color: "#c8bfb0", border: "0.5px solid rgba(255,255,255,0.08)", fontSize: 14, zIndex: 1 }}
                >✕</button>

                {/* 아바타 업로드 영역 (상단 강조) */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 32, marginBottom: 20 }}>
                  <button onClick={() => fileInputRef.current?.click()} className="pico-btn" style={{ background: "none", border: "none", position: "relative", marginBottom: 10 }}>
                    {avatarSrc ? (
                      <img src={avatarSrc} alt="프로필" style={{ width: 88, height: 88, borderRadius: "50%", objectFit: "cover", border: "2.5px solid rgba(250,202,62,0.45)" }} />
                    ) : (
                      <div style={{ width: 88, height: 88, borderRadius: "50%", background: "#1c1c1c", border: "2px dashed rgba(250,202,62,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, color: "#c8bfb0" }}>
                        {userRow.nickname[0]?.toUpperCase() ?? "?"}
                      </div>
                    )}
                    <div style={{ position: "absolute", bottom: 2, right: 2, width: 28, height: 28, borderRadius: "50%", background: "#FACA3E", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "#0d0d0d", boxShadow: "0 2px 8px rgba(0,0,0,0.4)" }}>✎</div>
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileChange} />
                  <p style={{ fontFamily: "var(--font-mona12)", fontSize: 11, fontWeight: 400, color: "rgba(200,191,176,0.55)", letterSpacing: "0.02em" }}>
                    {pendingFile ? "✓ 새 사진 선택됨" : "탭해서 사진 변경 · 2MB 이하"}
                  </p>
                </div>

                <div style={{ padding: "0 28px" }}>
                  {/* 소셜 계정 배지 */}
                  {provider === "kakao" && (
                    <div className="flex items-center gap-1.5" style={{ marginBottom: 16, padding: "8px 14px", background: "rgba(254,229,0,0.07)", border: "0.5px solid rgba(254,229,0,0.2)", borderRadius: 10, display: "inline-flex" }}>
                      <svg width="12" height="12" viewBox="0 0 18 18"><path fill="#FEE500" d="M9 1.5C4.86 1.5 1.5 4.17 1.5 7.5c0 2.13 1.38 4.01 3.47 5.09l-.88 3.27a.19.19 0 0 0 .28.21L8.1 13.7a9.4 9.4 0 0 0 .9.05c4.14 0 7.5-2.67 7.5-6S13.14 1.5 9 1.5z"/></svg>
                      <span style={{ fontFamily: "var(--font-mona12)", fontSize: 11, fontWeight: 700, color: "#c8bfb0" }}>카카오로 로그인 중</span>
                    </div>
                  )}
                  {provider === "google" && (
                    <div className="flex items-center gap-1.5" style={{ marginBottom: 16, padding: "8px 14px", background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.1)", borderRadius: 10, display: "inline-flex" }}>
                      <svg width="12" height="12" viewBox="0 0 48 48">
                        <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 2.9l5.7-5.7C34.5 7 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.9z"/>
                        <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16.1 19 13 24 13c3.1 0 5.8 1.1 7.9 2.9l5.7-5.7C34.5 7 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
                        <path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.5-5.1l-6.2-5.3C29.4 35.5 26.8 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.7 39.7 16.3 44 24 44z"/>
                        <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.3 5.5l6.2 5.3c-.4.4 6.8-5 6.8-14.8 0-1.3-.1-2.7-.4-3.9z"/>
                      </svg>
                      <span style={{ fontFamily: "var(--font-mona12)", fontSize: 11, fontWeight: 700, color: "#c8bfb0" }}>구글로 로그인 중</span>
                    </div>
                  )}

                  {/* 이메일 (소셜 아닌 경우) */}
                  {!["kakao", "google"].includes(provider ?? "") && (
                    <div style={{ marginBottom: 16, padding: "12px 16px", background: "#1a1a1a", borderRadius: 12, border: "0.5px solid rgba(255,255,255,0.07)" }}>
                      <p style={{ fontFamily: "var(--font-mona12)", fontSize: 11, fontWeight: 700, color: "rgba(200,191,176,0.5)", marginBottom: 4, letterSpacing: "0.04em" }}>LOGIN EMAIL</p>
                      <p style={{ fontSize: 14, color: "#e8e0d0", fontWeight: 300, margin: 0 }}>{user.email}</p>
                    </div>
                  )}

                  {/* 닉네임 */}
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <p style={{ fontFamily: "var(--font-mona12)", fontSize: 11, fontWeight: 700, color: "#c8bfb0", letterSpacing: "0.04em" }}>NICKNAME</p>
                      <span style={{ fontFamily: "var(--font-mona12)", fontSize: 11, fontWeight: 400, color: nickname.trim().length > MAX_NICK ? "#f07878" : "rgba(200,191,176,0.45)" }}>
                        {nickname.trim().length}/{MAX_NICK}
                      </span>
                    </div>
                    <input
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      maxLength={MAX_NICK}
                      className="w-full outline-none"
                      style={{ display: "block", width: "100%", background: "#1e1e1e", border: `1px solid ${nickname.trim().length > MAX_NICK ? "rgba(240,120,120,0.5)" : "rgba(250,202,62,0.3)"}`, borderRadius: 12, padding: "13px 16px", color: "#e8e0d0", fontSize: 15, fontWeight: 300, fontFamily: "var(--font-paperlogy), var(--font-noto), sans-serif" }}
                      onFocus={(e) => (e.target.style.borderColor = "rgba(250,202,62,0.6)")}
                      onBlur={(e)  => (e.target.style.borderColor = nickname.trim().length > MAX_NICK ? "rgba(240,120,120,0.5)" : "rgba(250,202,62,0.3)")}
                    />
                  </div>

                  {/* 변경사항 감지 뱃지 */}
                  {hasChanged && !saveError && (
                    <p style={{ fontFamily: "var(--font-mona12)", fontSize: 11, fontWeight: 700, color: "#FACA3E", marginBottom: 16, letterSpacing: "0.02em" }}>
                      ● 저장되지 않은 변경사항이 있어요
                    </p>
                  )}
                  {!hasChanged && <div style={{ marginBottom: 16 }} />}

                  {saveError && (
                    <p style={{ fontSize: 12, color: "#f07878", marginBottom: 16 }}>{saveError}</p>
                  )}

                  <button onClick={handleSave} disabled={saving || !canSave} className="pico-btn w-full"
                    style={{ width: "100%", padding: "14px 0", borderRadius: 14, fontSize: 15, fontWeight: 500, border: "none", marginBottom: 8, transition: "all 0.15s",
                      background: canSave ? "#FACA3E" : "rgba(255,255,255,0.05)",
                      color:      canSave ? "#0d0d0d"  : "rgba(200,191,176,0.35)",
                      cursor:     canSave ? "pointer"  : "not-allowed",
                    }}>
                    {saving ? (uploadLoading ? "업로드 중..." : "저장 중...") : "저장하기"}
                  </button>
                  <button
                    onClick={() => { setEditOpen(false); setPendingFile(null); setPreviewUrl(null); }}
                    className="pico-btn w-full"
                    style={{ display: "block", width: "100%", padding: "10px 0", background: "transparent", color: "#c8bfb0", fontSize: 13, fontWeight: 300, border: "none" }}
                  >
                    취소
                  </button>
                </div>
              </div>
            </div>
          </>
        );
      })()}

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
            {userRow.equipped_title && (() => {
              const TITLE_META: Record<string, { emoji: string; label: string; color: string }> = {
                sniper:      { emoji: "🎯", label: "여의도 스나이퍼",  color: "#FACA3E" },
                frog:        { emoji: "🐸", label: "역발상의 천재",    color: "#7ed4a0" },
                hodl:        { emoji: "🗿", label: "존버의 신",        color: "#a0b8f0" },
                daytrader:   { emoji: "⚡", label: "단타의 귀재",      color: "#f0c060" },
                mentalsteel: { emoji: "🧊", label: "냉철한 멘탈",      color: "#b8e0f8" },
                lucky:       { emoji: "🎲", label: "행운의 여신",      color: "#f0a0e0" },
                spinner:     { emoji: "🔄", label: "회전왕",           color: "#80d8f0" },
                dip:         { emoji: "📉", label: "바닥 사냥꾼",      color: "#f0a060" },
                rocket:      { emoji: "🚀", label: "로켓 탑승자",      color: "#c0a0f8" },
                whale:       { emoji: "🐋", label: "큰손",             color: "#4090e8" },
                surfer:      { emoji: "🌊", label: "파도타기",          color: "#40c8d0" },
                allin:       { emoji: "🎰", label: "올인",             color: "#f07060" },
                jungle:      { emoji: "🦁", label: "정글의 왕",         color: "#f0c020" },
                battlefirst: { emoji: "🏹", label: "첫 예측",          color: "#f09060" },
                prophet:     { emoji: "🔮", label: "예언자",            color: "#c080f8" },
                odds:        { emoji: "🧮", label: "확률의 지배자",     color: "#60d0a0" },
                sprout:      { emoji: "🌱", label: "새싹",             color: "#80d060" },
                flame:       { emoji: "🔥", label: "불꽃 의지",         color: "#f08040" },
                diamond:     { emoji: "💎", label: "다이아 의지",       color: "#80e8f8" },
                scholar:     { emoji: "📖", label: "용어 학자",         color: "#d0a060" },
                yoidodao:    { emoji: "🏛️", label: "여의도 학자",       color: "#e0c080" },
                pointrich:   { emoji: "💰", label: "포인트 부자",        color: "#f0d040" },
                collector:   { emoji: "👑", label: "도감왕",             color: "#f0a020" },
              };
              const m = TITLE_META[userRow.equipped_title];
              if (!m) return null;
              return (
                <p style={{
                  fontFamily: "var(--font-mona12)", fontSize: 11, fontWeight: 700,
                  color: m.color, marginBottom: 4,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  display: "flex", alignItems: "center", gap: 3,
                }}>
                  <span style={{ fontFamily: "var(--font-mona12-emoji)" }}>{m.emoji}</span>
                  {m.label}
                </p>
              );
            })()}
            <p style={{ fontFamily: "var(--font-paperlogy)", fontSize: FS.nickname, fontWeight: 500, color: "#e8e0d0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{userRow.nickname}</p>
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
              <p style={{ fontSize: FS.cardLabel, fontWeight: 500, color: "#c8bfb0", marginBottom: 6 }}>보유 포인트</p>
              <div className="num" style={{ display: "flex", alignItems: "baseline", gap: 2 }}>
                <span style={{ fontFamily: "var(--font-inter)", fontSize: FS.pointVal, fontWeight: 700, color: "#FACA3E", letterSpacing: "-0.03em", lineHeight: 1 }}>
                  {userRow.total_points.toLocaleString()}
                </span>
                <span style={{ fontFamily: "var(--font-mona12)", fontSize: FS.cardLabel, fontWeight: 700, color: "#FACA3E" }}>P</span>
              </div>
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

        {/* ── AI 주간 리포트 카드 ── */}
        <button
          className="pico-btn border w-full mb-[10px]"
          style={{ background: "#141414", borderColor: "rgba(126,180,247,0.25)", borderRadius: 16, padding: "16px 20px", display: "flex", alignItems: "center", gap: 12, textAlign: "left" }}
          onClick={() => router.push("/mypage/report")}
        >
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: FS.cardLabel, fontWeight: 500, color: "#7eb8f7", marginBottom: 4 }}>매주 금·토 발송</p>
            <p style={{ fontSize: FS.cardBody, fontWeight: 500, color: "#e8e0d0" }}>AI 주간 리포트 📊</p>
          </div>
          <div className="arrow-btn" style={{ width: 36, height: 36, background: "#1c1c1c", border: "0.5px solid rgba(255,255,255,0.07)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ fontSize: 16, color: "#FACA3E" }}>›</span>
          </div>
        </button>

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

        {/* ── 전리품 창고 카드 ── */}
        <button
          className="pico-btn border w-full mb-[10px]"
          style={{ background: "linear-gradient(135deg, rgba(250,202,62,0.06) 0%, #141414 100%)", borderColor: "rgba(250,202,62,0.25)", borderRadius: 16, padding: "16px 20px", display: "flex", alignItems: "center", gap: 12, textAlign: "left" }}
          onClick={() => router.push("/mypage/store")}
        >
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: FS.cardLabel, fontWeight: 500, color: "#c8bfb0", marginBottom: 4 }}>포인트로 교환</p>
            <p style={{ fontSize: FS.cardBody, fontWeight: 500, color: "#e8e0d0" }}>피코 전리품 창고 🎁</p>
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
              <p style={{ fontSize: FS.cardLabel, fontWeight: 500, color: "#c8bfb0", marginBottom: 6 }}>뱃지</p>
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
            style={{ background: "transparent", color: "#c8bfb0", fontSize: 14, fontWeight: 400, border: "none" }}>
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
                style={{ background: "#1c1c1c", color: "#c8bfb0", fontSize: 13, fontWeight: 400, border: "0.5px solid rgba(255,255,255,0.1)" }}>
                취소
              </button>
            </div>
          </div>
        )}

        <PicoFooter />
      </div>
    </main>
  );
}
