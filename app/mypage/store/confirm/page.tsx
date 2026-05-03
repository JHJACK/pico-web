"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/app/lib/authContext";
import { executeExchange } from "@/app/lib/supabase";
import { BackIcon } from "@/app/components/BackIcon";

const C = {
  bg:     "#0d0d0d",
  card:   "#141414",
  text:   "#e8e0d0",
  text2:  "#c8bfb0",
  gold:   "#FACA3E",
  border: "rgba(255,255,255,0.07)",
} as const;

const ITEM_INFO: Record<string, { emoji: string; brand: string; name: string; points: number }> = {
  starbucks_americano: {
    emoji:  "☕",
    brand:  "STARBUCKS",
    name:   "아이스 아메리카노 TALL 1잔",
    points: 10000,
  },
};

const NOTICES = [
  "교환 후 포인트는 즉시 차감되며 취소할 수 없어요.",
  "쿠폰은 교환 후 등록된 이메일로 발송돼요.",
  "발송에는 최대 3~5 영업일이 소요될 수 있어요.",
  "쿠폰 유효기간은 발급일로부터 30일이에요.",
  "스타벅스 아메리카노는 하루 1잔 선착순으로 교환 가능해요.",
];

function Checkbox({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div
      onClick={onChange}
      style={{
        width:          22,
        height:         22,
        borderRadius:   6,
        flexShrink:     0,
        marginTop:      1,
        border:         checked ? "none" : "1.5px solid rgba(255,255,255,0.2)",
        background:     checked ? C.gold : "transparent",
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        cursor:         "pointer",
        transition:     "all 0.15s",
      }}
    >
      {checked && (
        <span
          style={{
            fontFamily: "var(--font-mona12)",
            fontSize:   13,
            fontWeight: 700,
            color:      "#0d0d0d",
          }}
        >
          ✓
        </span>
      )}
    </div>
  );
}

function ConfirmContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { user, userRow, loading, refreshUserRow } = useAuth();

  const [agreed,          setAgreed]          = useState(false);
  const [marketingAgreed, setMarketingAgreed] = useState(false);
  const [isSubmitting,    setIsSubmitting]    = useState(false);
  const [isSuccess,       setIsSuccess]       = useState(false);
  const [exchangeError,   setExchangeError]   = useState("");

  if (loading || !user || !userRow) return null;

  const itemId = searchParams.get("item") ?? "starbucks_americano";
  const item   = ITEM_INFO[itemId] ?? ITEM_INFO["starbucks_americano"];

  async function handleExchange() {
    if (!agreed || isSubmitting) return;
    setIsSubmitting(true);
    setExchangeError("");
    const result = await executeExchange(user!.id, itemId, item.points, marketingAgreed);
    setIsSubmitting(false);
    if (result.soldOut) {
      setExchangeError("아쉽게도 오늘 선착순이 마감됐어요. 내일 자정에 다시 도전해 보세요!");
      return;
    }
    if (!result.success) {
      setExchangeError("교환에 실패했어요. 잠시 후 다시 시도해 주세요.");
      return;
    }
    await refreshUserRow();
    setIsSuccess(true);
  }

  return (
    <main
      style={{
        minHeight:  "100vh",
        background: C.bg,
        color:      C.text,
        fontFamily: "var(--font-paperlogy), var(--font-noto), sans-serif",
      }}
    >
      {/* 교환 완료 팝업 */}
      {isSuccess && (
        <div
          style={{
            position:       "fixed",
            inset:          0,
            zIndex:         100,
            background:     "rgba(13,13,13,0.95)",
            backdropFilter: "blur(20px)",
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
            padding:        "0 24px",
          }}
        >
          <div
            style={{
              width:        "100%",
              maxWidth:     360,
              background:   C.card,
              borderRadius: 24,
              padding:      "36px 28px 28px",
              border:       "0.5px solid rgba(250,202,62,0.35)",
              textAlign:    "center",
              boxShadow:    "0 0 60px rgba(250,202,62,0.1)",
            }}
          >
            <span style={{ fontSize: 56, display: "block", marginBottom: 16 }}>🎉</span>
            <p
              style={{
                fontFamily:    "var(--font-mona12)",
                fontSize:      12,
                fontWeight:    700,
                color:         C.gold,
                marginBottom:  10,
                letterSpacing: "0.1em",
              }}
            >
              EXCHANGE COMPLETE
            </p>
            <h2
              style={{
                fontFamily:    "var(--font-paperlogy)",
                fontSize:      22,
                fontWeight:    700,
                color:         C.text,
                margin:        "0 0 10px",
                letterSpacing: "-0.02em",
              }}
            >
              교환 완료!
            </h2>
            <p
              style={{
                fontSize:     14,
                fontWeight:   300,
                color:        C.text2,
                lineHeight:   1.75,
                marginBottom: 8,
              }}
            >
              등록된 이메일로 쿠폰이 발송될 예정이에요.
              <br />
              3~5 영업일 이내로 확인해 주세요.
            </p>
            <p
              style={{
                fontSize:     12,
                fontWeight:   300,
                color:        C.text2,
                lineHeight:   1.6,
                marginBottom: 28,
                opacity:      0.7,
              }}
            >
              내일도 자정에 새로운 기회가 열려요 ☕
            </p>
            <button
              className="pico-btn"
              onClick={() => router.replace("/mypage/store")}
              style={{
                width:        "100%",
                padding:      "13px 0",
                borderRadius: 14,
                background:   C.gold,
                color:        "#0d0d0d",
                fontSize:     15,
                fontWeight:   500,
                border:       "none",
              }}
            >
              전리품 창고로 돌아가기
            </button>
          </div>
        </div>
      )}

      {/* 헤더 */}
      <nav
        style={{
          position:       "sticky",
          top:            0,
          zIndex:         30,
          height:         56,
          background:     "rgba(13,13,13,0.96)",
          backdropFilter: "blur(20px)",
          borderBottom:   `0.5px solid ${C.border}`,
          display:        "flex",
          alignItems:     "center",
          padding:        "0 20px",
        }}
      >
        <Link href="/mypage/store" style={{ textDecoration: "none" }}>
          <BackIcon />
        </Link>
      </nav>

      <div
        style={{
          maxWidth: 700,
          margin:   "0 auto",
          padding:  "20px clamp(16px,4vw,24px) 52px",
        }}
      >
        {/* 타이틀 */}
        <div style={{ marginBottom: 22 }}>
          <p
            style={{
              fontFamily:    "var(--font-mona12)",
              fontSize:      13,
              fontWeight:    700,
              color:         C.gold,
              marginBottom:  6,
              letterSpacing: "0.06em",
            }}
          >
            EXCHANGE
          </p>
          <h1
            style={{
              fontFamily:    "var(--font-paperlogy)",
              fontSize:      24,
              fontWeight:    700,
              color:         C.text,
              margin:        "0 0 5px",
              letterSpacing: "-0.02em",
            }}
          >
            교환 확인
          </h1>
          <p style={{ fontSize: 14, fontWeight: 300, color: C.text2, margin: 0 }}>
            아래 내용을 확인하고 동의해 주세요
          </p>
        </div>

        {/* 아이템 요약 카드 */}
        <div
          style={{
            marginBottom:   20,
            borderRadius:   20,
            padding:        "20px",
            background:
              "linear-gradient(135deg, rgba(250,202,62,0.08) 0%, rgba(250,202,62,0.02) 100%)",
            border:         "1px solid rgba(250,202,62,0.35)",
            boxShadow:      "0 8px 32px rgba(250,202,62,0.08), inset 0 1px 0 rgba(255,255,255,0.06)",
            backdropFilter: "blur(20px)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                width:          64,
                height:         64,
                borderRadius:   16,
                flexShrink:     0,
                display:        "flex",
                alignItems:     "center",
                justifyContent: "center",
                fontSize:       30,
                background:     "rgba(250,202,62,0.1)",
                border:         "1px solid rgba(250,202,62,0.2)",
              }}
            >
              {item.emoji}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  fontFamily:    "var(--font-mona12)",
                  fontSize:      11,
                  fontWeight:    700,
                  color:         C.gold,
                  marginBottom:  3,
                  letterSpacing: "0.06em",
                }}
              >
                {item.brand}
              </p>
              <p
                style={{
                  fontSize:     16,
                  fontWeight:   500,
                  color:        C.text,
                  marginBottom: 4,
                  lineHeight:   1.3,
                }}
              >
                {item.name}
              </p>
              <p
                style={{
                  fontFamily:    "var(--font-inter)",
                  fontSize:      18,
                  fontWeight:    700,
                  color:         C.gold,
                  letterSpacing: "-0.02em",
                }}
              >
                {item.points.toLocaleString()}P 차감
              </p>
            </div>
          </div>
          {/* 잔여 포인트 미리보기 */}
          <div
            style={{
              marginTop:      16,
              paddingTop:     16,
              borderTop:      "0.5px solid rgba(250,202,62,0.15)",
              display:        "flex",
              alignItems:     "center",
              justifyContent: "space-between",
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 300, color: C.text2 }}>
              교환 후 잔여 포인트
            </span>
            <span
              style={{
                fontFamily:    "var(--font-inter)",
                fontSize:      16,
                fontWeight:    700,
                color:         Math.max(0, userRow.total_points - item.points) === 0
                  ? "#f07878"
                  : C.text2,
                letterSpacing: "-0.02em",
              }}
            >
              {Math.max(0, userRow.total_points - item.points).toLocaleString()}P
            </span>
          </div>
        </div>

        {/* 안내 사항 */}
        <div
          style={{
            marginBottom: 16,
            background:   C.card,
            borderRadius: 16,
            border:       `0.5px solid ${C.border}`,
            padding:      "18px 20px",
          }}
        >
          <p
            style={{
              fontFamily:    "var(--font-mona12)",
              fontSize:      12,
              fontWeight:    700,
              color:         C.text2,
              marginBottom:  12,
              letterSpacing: "0.06em",
            }}
          >
            교환 안내
          </p>
          {NOTICES.map((text, i) => (
            <div
              key={i}
              style={{
                display:      "flex",
                alignItems:   "flex-start",
                gap:          8,
                marginBottom: i < NOTICES.length - 1 ? 8 : 0,
              }}
            >
              <span
                style={{
                  color:      C.gold,
                  fontWeight: 700,
                  flexShrink: 0,
                  marginTop:  1,
                  fontSize:   14,
                }}
              >
                ·
              </span>
              <p
                style={{
                  fontSize:   13,
                  fontWeight: 300,
                  color:      C.text2,
                  lineHeight: 1.6,
                  margin:     0,
                }}
              >
                {text}
              </p>
            </div>
          ))}
        </div>

        {/* 동의 영역 */}
        <div
          style={{
            marginBottom: 16,
            background:   C.card,
            borderRadius: 16,
            border:       `0.5px solid ${C.border}`,
            padding:      "18px 20px",
          }}
        >
          {/* 필수 동의 */}
          <label
            style={{
              display:      "flex",
              alignItems:   "flex-start",
              gap:          12,
              cursor:       "pointer",
              marginBottom: 14,
            }}
          >
            <Checkbox checked={agreed} onChange={() => setAgreed(!agreed)} />
            <p
              style={{
                fontSize:   14,
                fontWeight: 400,
                color:      C.text,
                lineHeight: 1.55,
                margin:     0,
              }}
            >
              위 안내 사항을 모두 확인했고, 교환에 동의해요.{" "}
              <span style={{ color: "#f07878", fontSize: 13 }}>(필수)</span>
            </p>
          </label>

          <div
            style={{
              height:     "0.5px",
              background: "rgba(255,255,255,0.05)",
              marginBottom: 14,
            }}
          />

          {/* 마케팅 동의 */}
          <label
            style={{ display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer" }}
          >
            <Checkbox
              checked={marketingAgreed}
              onChange={() => setMarketingAgreed(!marketingAgreed)}
            />
            <div>
              <p
                style={{
                  fontSize:     14,
                  fontWeight:   400,
                  color:        C.text,
                  lineHeight:   1.55,
                  margin:       "0 0 3px",
                }}
              >
                새로운 리워드 및 이벤트 소식을 받을게요.{" "}
                <span style={{ fontSize: 13, color: C.text2 }}>(선택)</span>
              </p>
              <p style={{ fontSize: 12, fontWeight: 300, color: C.text2, margin: 0 }}>
                이메일로 신규 아이템 오픈 알림이 발송돼요
              </p>
            </div>
          </label>
        </div>

        {/* 에러 메시지 */}
        {exchangeError && (
          <div
            style={{
              marginBottom: 14,
              padding:      "12px 16px",
              borderRadius: 12,
              background:   "rgba(240,120,120,0.08)",
              border:       "0.5px solid rgba(240,120,120,0.25)",
            }}
          >
            <p style={{ fontSize: 13, color: "#f07878", fontWeight: 400, margin: 0, lineHeight: 1.6 }}>
              {exchangeError}
            </p>
          </div>
        )}

        {/* 최종 교환 버튼 */}
        <button
          className="pico-btn"
          onClick={handleExchange}
          disabled={!agreed || isSubmitting}
          style={{
            width:        "100%",
            padding:      "15px 0",
            borderRadius: 14,
            fontFamily:   "var(--font-paperlogy)",
            fontSize:     16,
            fontWeight:   500,
            transition:   "all 0.15s",
            ...(agreed && !isSubmitting
              ? {
                  background: C.gold,
                  color:      "#0d0d0d",
                  border:     "none",
                }
              : {
                  background: "rgba(255,255,255,0.04)",
                  color:      C.text2,
                  border:     `0.5px solid ${C.border}`,
                  cursor:     "not-allowed",
                }),
          }}
        >
          {isSubmitting ? "교환 처리 중..." : `${item.points.toLocaleString()}P 교환하기`}
        </button>
      </div>
    </main>
  );
}

export default function ConfirmPage() {
  return (
    <Suspense fallback={null}>
      <ConfirmContent />
    </Suspense>
  );
}
