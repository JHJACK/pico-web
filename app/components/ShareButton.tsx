"use client";

import { useState } from "react";

interface ShareButtonProps {
  url?: string;
  title?: string;
  text?: string;
}

export default function ShareButton({
  url   = "https://pico-web-one.vercel.app",
  title = "PICO — 금융은 어렵다? 아니다, 재밌다",
  text  = "피코플레이(모의투자)로 실전 투자 감각을 키워보세요!",
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    // 모바일: 네이티브 공유 시트 (카카오·인스타·문자 등)
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch {
        // 취소하면 조용히 무시
        return;
      }
    }

    // 데스크탑: 클립보드 복사 fallback
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard 권한 없을 때
    }
  }

  return (
    <button
      onClick={handleShare}
      style={{
        display:        "inline-flex",
        alignItems:     "center",
        gap:            8,
        padding:        "8px 18px",
        borderRadius:   10,
        border:         "1px solid rgba(250,202,62,0.35)",
        background:     "rgba(250,202,62,0.06)",
        color:          "#FACA3E",
        fontFamily:     "var(--font-paperlogy), var(--font-noto), sans-serif",
        fontSize:       13,
        fontWeight:     600,
        cursor:         "pointer",
        transition:     "background 0.15s, border-color 0.15s",
        letterSpacing:  "0.02em",
        whiteSpace:     "nowrap",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = "rgba(250,202,62,0.12)";
        (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(250,202,62,0.6)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = "rgba(250,202,62,0.06)";
        (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(250,202,62,0.35)";
      }}
    >
      {/* 공유 아이콘 */}
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="18" cy="5"  r="3" />
        <circle cx="6"  cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <line x1="8.59"  y1="13.51" x2="15.42" y2="17.49" />
        <line x1="15.41" y1="6.51"  x2="8.59"  y2="10.49" />
      </svg>
      {copied ? "링크 복사됨!" : "PICO 공유하기"}
    </button>
  );
}
