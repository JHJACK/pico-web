"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/app/lib/authContext";
import { checkDailyExchange } from "@/app/lib/supabase";

// 교환 오픈 시 true로 변경
const EXCHANGE_OPEN = false;
import { BackIcon } from "@/app/components/BackIcon";

const C = {
  bg:         "#0d0d0d",
  card:       "#141414",
  text:       "#e8e0d0",
  text2:      "#c8bfb0",
  gold:       "#FACA3E",
  border:     "rgba(255,255,255,0.07)",
  goldBorder: "rgba(250,202,62,0.35)",
} as const;

interface StoreItem {
  id: string;
  emoji: string;
  brand: string;
  name: string;
  points: number;
  badge: string;
  badgeColor: string;
  available: boolean;
  dailyLimit?: boolean;
}

const ITEMS: StoreItem[] = [
  {
    id:         "starbucks_americano",
    emoji:      "☕",
    brand:      "STARBUCKS",
    name:       "아이스 아메리카노 TALL 1잔",
    points:     10000,
    badge:      "OPEN",
    badgeColor: "#FACA3E",
    available:  true,
    dailyLimit: true,
  },
  {
    id:         "cu_5000",
    emoji:      "🏪",
    brand:      "CU",
    name:       "편의점 상품권 5,000원",
    points:     5000,
    badge:      "COMING SOON",
    badgeColor: "#c8bfb0",
    available:  false,
  },
  {
    id:         "gs25_10000",
    emoji:      "🏪",
    brand:      "GS25",
    name:       "편의점 상품권 10,000원",
    points:     10000,
    badge:      "COMING SOON",
    badgeColor: "#c8bfb0",
    available:  false,
  },
  {
    id:         "cgv_ticket",
    emoji:      "🎬",
    brand:      "CGV",
    name:       "영화 관람권 1매",
    points:     15000,
    badge:      "COMING SOON",
    badgeColor: "#c8bfb0",
    available:  false,
  },
];

function ItemCard({
  item,
  userPoints,
  onExchange,
  soldOut,
}: {
  item: StoreItem;
  userPoints: number;
  onExchange: (item: StoreItem) => void;
  soldOut?: boolean | null;
}) {
  const isSoldOut  = item.dailyLimit && soldOut === true;
  const canExchange = item.available && !isSoldOut && userPoints >= item.points;
  const shortfall   = item.available && !isSoldOut && !canExchange ? item.points - userPoints : 0;

  const cardStyle = item.available
    ? isSoldOut
      ? {
          background:     "linear-gradient(135deg, rgba(240,120,120,0.06) 0%, rgba(240,120,120,0.02) 100%)",
          border:         "1px solid rgba(240,120,120,0.25)",
          boxShadow:      "0 8px 32px rgba(240,120,120,0.06)",
          backdropFilter: "blur(20px)",
        }
      : {
          background:     "linear-gradient(135deg, rgba(250,202,62,0.08) 0%, rgba(250,202,62,0.02) 100%)",
          border:         "1px solid rgba(250,202,62,0.35)",
          boxShadow:      "0 8px 32px rgba(250,202,62,0.08), inset 0 1px 0 rgba(255,255,255,0.06)",
          backdropFilter: "blur(20px)",
        }
    : {
        background: C.card,
        border:     `0.5px solid ${C.border}`,
      };

  return (
    <div
      style={{
        marginBottom: 12,
        borderRadius: 20,
        opacity: item.available ? 1 : 0.45,
        ...cardStyle,
      }}
    >
      <div style={{ padding: "20px 20px 0" }}>
        {/* 배지 행 */}
        <div
          style={{
            display:        "flex",
            alignItems:     "center",
            justifyContent: "space-between",
            marginBottom:   14,
          }}
        >
          <span
            style={{
              fontFamily:    "var(--font-mona12)",
              fontSize:      11,
              fontWeight:    700,
              padding:       "3px 8px",
              borderRadius:  6,
              background:    isSoldOut
                ? "rgba(240,120,120,0.15)"
                : item.available
                ? "rgba(250,202,62,0.15)"
                : "rgba(255,255,255,0.07)",
              color:         isSoldOut ? "#f07878" : item.badgeColor,
              letterSpacing: "0.08em",
            }}
          >
            {isSoldOut ? "SOLD OUT" : item.badge}
          </span>
          {item.available && !isSoldOut && (
            <span style={{ fontSize: 11, fontWeight: 300, color: C.text2 }}>
              하루 1잔 · 선착순
            </span>
          )}
          {isSoldOut && (
            <span style={{ fontSize: 11, fontWeight: 300, color: "#f07878" }}>
              내일 00시 다시 열려요 🌅
            </span>
          )}
        </div>

        {/* 아이템 정보 */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
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
              background:     isSoldOut
                ? "rgba(240,120,120,0.08)"
                : item.available
                ? "rgba(250,202,62,0.1)"
                : "rgba(255,255,255,0.04)",
              border:         isSoldOut
                ? "1px solid rgba(240,120,120,0.18)"
                : item.available
                ? "1px solid rgba(250,202,62,0.2)"
                : `0.5px solid ${C.border}`,
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
                color:         isSoldOut ? "#f07878" : item.available ? C.gold : C.text2,
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
                fontSize:      20,
                fontWeight:    700,
                color:         isSoldOut ? "#f07878" : item.available ? C.gold : C.text2,
                letterSpacing: "-0.02em",
              }}
            >
              {item.points.toLocaleString()}P
            </p>
          </div>
        </div>

        {/* 포인트 부족 안내 */}
        {shortfall > 0 && (
          <p
            style={{
              fontSize:     13,
              fontWeight:   300,
              color:        "#f07878",
              marginBottom: 14,
              lineHeight:   1.5,
            }}
          >
            {shortfall.toLocaleString()}P가 더 필요해요
          </p>
        )}

        {/* SOLD OUT 안내 */}
        {isSoldOut && (
          <div
            style={{
              marginBottom: 14,
              padding:      "10px 14px",
              borderRadius: 10,
              background:   "rgba(240,120,120,0.07)",
              border:       "0.5px solid rgba(240,120,120,0.2)",
            }}
          >
            <p style={{ fontSize: 13, fontWeight: 300, color: "#f07878", lineHeight: 1.6, margin: 0 }}>
              오늘 선착순 교환이 완료됐어요.<br />
              내일 자정에 다시 오픈돼요!
            </p>
          </div>
        )}
      </div>

      {/* 교환 버튼 */}
      {item.available && (
        <div style={{ padding: "0 20px 20px" }}>
          <button
            className="pico-btn"
            onClick={() => !isSoldOut && onExchange(item)}
            disabled={!canExchange}
            style={{
              width:        "100%",
              padding:      "13px 0",
              borderRadius: 14,
              fontFamily:   "var(--font-paperlogy)",
              fontSize:     15,
              fontWeight:   500,
              transition:   "all 0.15s",
              ...(canExchange
                ? {
                    background: C.gold,
                    color:      "#0d0d0d",
                    border:     "none",
                  }
                : isSoldOut
                ? {
                    background: "rgba(240,120,120,0.08)",
                    color:      "#f07878",
                    border:     "0.5px solid rgba(240,120,120,0.2)",
                    cursor:     "not-allowed",
                  }
                : {
                    background: "rgba(255,255,255,0.04)",
                    color:      C.text2,
                    border:     `0.5px solid ${C.border}`,
                    cursor:     "not-allowed",
                  }),
            }}
          >
            {isSoldOut ? "오늘은 마감됐어요 😴" : canExchange ? "교환하기" : "포인트 부족"}
          </button>
        </div>
      )}
    </div>
  );
}

export default function StorePage() {
  const router              = useRouter();
  const { user, userRow, loading } = useAuth();
  const [loadingItem, setLoadingItem] = useState<string | null>(null);
  const [soldOut,     setSoldOut]     = useState<boolean | null>(null);

  useEffect(() => {
    if (EXCHANGE_OPEN) {
      checkDailyExchange("starbucks_americano").then(setSoldOut);
    } else {
      setSoldOut(false);
    }
  }, []);

  if (loading || !user || !userRow) return null;

  async function handleExchange(item: StoreItem) {
    if (item.dailyLimit && soldOut) return;
    setLoadingItem(item.id);
    await new Promise((r) => setTimeout(r, 700));
    setLoadingItem(null);
    router.push(`/mypage/store/confirm?item=${item.id}`);
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
      {/* 로딩 오버레이 */}
      {loadingItem && (
        <div
          style={{
            position:       "fixed",
            inset:          0,
            zIndex:         100,
            background:     "rgba(13,13,13,0.93)",
            backdropFilter: "blur(20px)",
            display:        "flex",
            flexDirection:  "column",
            alignItems:     "center",
            justifyContent: "center",
            gap:            18,
          }}
        >
          <div
            style={{
              width:        56,
              height:       56,
              borderRadius: "50%",
              border:       "3px solid rgba(250,202,62,0.18)",
              borderTop:    "3px solid #FACA3E",
              animation:    "picoSpin 0.75s linear infinite",
            }}
          />
          <p
            style={{
              fontFamily:    "var(--font-mona12)",
              fontSize:      15,
              fontWeight:    700,
              color:         C.gold,
              letterSpacing: "0.12em",
            }}
          >
            실력 증명 중...
          </p>
          <style>{`@keyframes picoSpin { to { transform: rotate(360deg); } }`}</style>
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
        <Link href="/mypage" style={{ textDecoration: "none" }}>
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
        {/* 페이지 타이틀 */}
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
            LOOT VAULT
          </p>
          <h1
            style={{
              fontFamily:    "var(--font-paperlogy)",
              fontSize:      26,
              fontWeight:    700,
              color:         C.text,
              margin:        "0 0 5px",
              letterSpacing: "-0.02em",
            }}
          >
            피코 전리품 창고
          </h1>
          <p style={{ fontSize: 14, fontWeight: 300, color: C.text2, margin: 0 }}>
            실력으로 모은 포인트를 보상으로 교환해요
          </p>
        </div>

        {/* 보유 포인트 카드 */}
        <div
          style={{
            background:    C.card,
            borderRadius:  20,
            padding:       "18px 22px",
            border:        `0.5px solid ${C.border}`,
            marginBottom:  14,
            display:       "flex",
            alignItems:    "center",
            gap:           16,
          }}
        >
          <div style={{ flex: 1 }}>
            <p
              style={{
                fontSize:     14,
                fontWeight:   400,
                color:        C.text2,
                marginBottom: 6,
              }}
            >
              보유 포인트
            </p>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
              <span
                style={{
                  fontFamily:    "var(--font-inter)",
                  fontSize:      36,
                  fontWeight:    700,
                  color:         C.gold,
                  letterSpacing: "-0.03em",
                  lineHeight:    1,
                }}
              >
                {userRow.total_points.toLocaleString()}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-mona12)",
                  fontSize:   17,
                  fontWeight: 700,
                  color:      C.gold,
                }}
              >
                P
              </span>
            </div>
          </div>
          <span style={{ fontSize: 38, lineHeight: 1 }}>🏆</span>
        </div>

        {/* 콜아웃 블록 - 선착순 안내 */}
        <div
          style={{
            marginBottom: 14,
            padding:      "14px 18px",
            borderRadius: 14,
            background:   soldOut
              ? "rgba(240,120,120,0.05)"
              : "rgba(250,202,62,0.05)",
            border:       soldOut
              ? "0.5px solid rgba(240,120,120,0.2)"
              : "0.5px solid rgba(250,202,62,0.2)",
          }}
        >
          <p
            style={{
              fontFamily:   "var(--font-mona12)",
              fontSize:     13,
              fontWeight:   700,
              color:        soldOut ? "#f07878" : C.gold,
              margin:       "0 0 5px",
            }}
          >
            {soldOut ? "😴 오늘 선착순 마감" : "⏰ 매일 자정 선착순 1잔 한정"}
          </p>
          <p
            style={{
              fontSize:   13,
              fontWeight: 300,
              color:      C.text2,
              margin:     0,
              lineHeight: 1.65,
            }}
          >
            {soldOut
              ? "오늘의 스타벅스 교환이 완료됐어요. 내일 00시(KST)에 다시 오픈돼요!"
              : "스타벅스 아메리카노는 매일 00시(KST) 기준 딱 1잔만 오픈해요.\n먼저 신청한 분이 가져가요."}
          </p>
        </div>

        {/* 기본 콜아웃 블록 */}
        <div
          style={{
            marginBottom: 24,
            padding:      "14px 18px",
            borderRadius: 14,
            background:   "rgba(250,202,62,0.05)",
            border:       "0.5px solid rgba(250,202,62,0.2)",
          }}
        >
          <p
            style={{
              fontFamily:   "var(--font-mona12)",
              fontSize:     13,
              fontWeight:   700,
              color:        C.gold,
              margin:       "0 0 5px",
            }}
          >
            ⚡ 실력을 증명한 자만이 전리품을 얻는다
          </p>
          <p
            style={{
              fontSize:   13,
              fontWeight: 300,
              color:      C.text2,
              margin:     0,
              lineHeight: 1.65,
            }}
          >
            피코플레이에서 모은 포인트로 실제 리워드를 받아보세요.
            <br />
            더 많은 아이템이 곧 추가될 예정이에요.
          </p>
        </div>

        {/* 섹션 레이블 */}
        <div
          style={{
            display:      "flex",
            alignItems:   "center",
            gap:          8,
            marginBottom: 12,
            paddingLeft:  2,
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-mona12-emoji)",
              fontSize:   18,
            }}
          >
            🎁
          </span>
          <span
            style={{
              fontFamily: "var(--font-mona12)",
              fontSize:   15,
              fontWeight: 700,
              color:      C.text2,
            }}
          >
            교환 가능 아이템
          </span>
        </div>

        {/* 아이템 카드 목록 */}
        {ITEMS.map((item) => (
          <ItemCard
            key={item.id}
            item={item}
            userPoints={userRow.total_points}
            onExchange={handleExchange}
            soldOut={item.dailyLimit ? soldOut : undefined}
          />
        ))}

        {/* 하단 안내 */}
        <div
          style={{
            marginTop:    8,
            padding:      "14px 18px",
            borderRadius: 14,
            background:   "rgba(250,202,62,0.04)",
            border:       "0.5px solid rgba(250,202,62,0.12)",
          }}
        >
          <p
            style={{
              fontSize:   13,
              fontWeight: 300,
              color:      C.text2,
              lineHeight: 1.8,
              margin:     0,
            }}
          >
            <span style={{ fontFamily: "var(--font-mona12-emoji)" }}>💡</span>
            &ensp;퀘스트를 완료하면 포인트를 모을 수 있어요.
            <br />
            아이템 교환 후 포인트는 즉시 차감되며 취소할 수 없어요.
          </p>
        </div>
      </div>
    </main>
  );
}
