"use client";

import { useState, useEffect, type CSSProperties } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/app/lib/authContext";
import { supabase } from "@/app/lib/supabase";
import { STOCK_META, KR_STOCK_META, isKrTicker } from "@/app/lib/stockNames";

type InvestmentRecord = {
  id: string;
  ticker: string;
  invested_points: number;
  buy_price: number;
  buy_at: string;
  status: "holding" | "sold";
  final_points: number | null;
  sell_price: number | null;
  sell_at: string | null;
};

const NUM_MONO: CSSProperties = {
  fontFamily: "var(--font-inter), monospace",
  fontWeight: 300,
  letterSpacing: "-0.02em",
};

const KOR_DAYS = ["일", "월", "화", "수", "목", "금", "토"];

function formatKoreanDate(dateStr: string): string {
  const d = new Date(dateStr);
  const y = d.getFullYear() % 100;
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const dow = KOR_DAYS[d.getDay()];
  return `${y}년 ${m}월 ${day}일 ${dow}요일`;
}

function Skeleton({ w = "100%", h = 18 }: { w?: string | number; h?: number }) {
  return <div className="skeleton" style={{ width: w, height: h }} />;
}

export default function TickerHistoryPage() {
  const router = useRouter();
  const params = useParams();
  const ticker = (params?.ticker as string) ?? "";

  const { user, loading } = useAuth();
  const [records, setRecords] = useState<InvestmentRecord[]>([]);
  const [fetched, setFetched] = useState(false);

  const kr   = isKrTicker(ticker);
  const meta = kr ? KR_STOCK_META[ticker] : STOCK_META[ticker];

  useEffect(() => {
    if (!loading && !user) router.replace("/mypage");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user || !ticker) return;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;
      const res = await fetch(`/api/investments/holdings?ticker=${encodeURIComponent(ticker)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.holdings) {
        const sorted = [...(json.holdings as InvestmentRecord[])].sort(
          (a, b) => new Date(b.buy_at).getTime() - new Date(a.buy_at).getTime()
        );
        setRecords(sorted);
      }
      setFetched(true);
    })();
  }, [user, ticker]);

  const holdingRecords = records.filter(r => r.status === "holding");
  const totalInvested  = holdingRecords.reduce((s, r) => s + r.invested_points, 0);

  if (loading) return null;
  if (!user) return null;

  return (
    <main className="min-h-screen" style={{ background: "#0d0d0d", fontFamily: "var(--font-paperlogy), var(--font-noto), sans-serif" }}>
      {/* 네비 */}
      <nav className="sticky top-0 z-30 border-b flex items-center gap-4 px-5"
        style={{ height: 56, background: "rgba(13,13,13,0.96)",
          backdropFilter: "blur(20px)", borderColor: "rgba(255,255,255,0.06)" }}>
        <button
          onClick={() => router.back()}
          style={{ fontSize: 22, color: "#c8bfb0", background: "none", border: "none",
            cursor: "pointer", lineHeight: 1, padding: "4px 4px 4px 0" }}>
          ‹
        </button>
        <span style={{ fontFamily: "var(--font-paperlogy)", fontSize: 17, fontWeight: 600, color: "#e8e0d0" }}>
          {meta?.name ?? ticker} 투자 내역
        </span>
      </nav>

      <div className="mx-auto py-6"
        style={{ maxWidth: 700, paddingLeft: "clamp(16px, 4vw, 20px)", paddingRight: "clamp(16px, 4vw, 20px)" }}>

        {/* 총 투자 포인트 요약 */}
        <div style={{ background: "#1c1c1c", borderRadius: 16, padding: "18px 20px",
          marginBottom: 16, border: "0.5px solid rgba(255,255,255,0.08)" }}>
          <p style={{ fontSize: 13, color: "#c8bfb0", marginBottom: 6,
            fontFamily: "var(--font-paperlogy)", fontWeight: 400 }}>
            총 투자 포인트
          </p>
          {!fetched ? (
            <Skeleton w="40%" h={28} />
          ) : (
            <p style={{ ...NUM_MONO, fontSize: 26, fontWeight: 700, color: "#FACA3E",
              fontFamily: "var(--font-paperlogy)" }}>
              {totalInvested.toLocaleString("ko-KR")}P
            </p>
          )}
        </div>

        {/* 투자 히스토리 리스트 */}
        <div style={{ background: "#1c1c1c", borderRadius: 20,
          border: "0.5px solid rgba(255,255,255,0.08)", overflow: "hidden" }}>

          {!fetched ? (
            <div style={{ display: "flex", flexDirection: "column", padding: "4px 0" }}>
              {[1, 2, 3].map((i) => (
                <div key={i} style={{ padding: "16px 20px",
                  borderBottom: i < 3 ? "0.5px solid rgba(255,255,255,0.05)" : "none" }}>
                  <Skeleton w="55%" h={14} />
                  <div style={{ height: 6 }} />
                  <Skeleton w="35%" h={12} />
                </div>
              ))}
            </div>
          ) : records.length === 0 ? (
            <div style={{ padding: "48px 20px", textAlign: "center" }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
              <p style={{ fontSize: 15, color: "#c8bfb0", fontFamily: "var(--font-paperlogy)", fontWeight: 300 }}>
                투자 내역이 없어요
              </p>
            </div>
          ) : (
            records.map((r, i) => {
              const priceStr = kr
                ? `${r.buy_price.toLocaleString("ko-KR")}원`
                : `$${r.buy_price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

              return (
                <div key={r.id}
                  style={{ padding: "16px 20px",
                    borderBottom: i < records.length - 1 ? "0.5px solid rgba(255,255,255,0.05)" : "none" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 500, color: "#e8e0d0",
                        fontFamily: "var(--font-paperlogy)", marginBottom: 5 }}>
                        {formatKoreanDate(r.buy_at)}
                      </p>
                      <p style={{ fontSize: 13, color: "#c8bfb0", fontFamily: "var(--font-paperlogy)" }}>
                        매수가 {priceStr}
                        {r.status === "sold" && (
                          <span style={{ marginLeft: 8, color: "#c8bfb0" }}>· 매도 완료</span>
                        )}
                      </p>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <p style={{ ...NUM_MONO, fontSize: 16, fontWeight: 600, color: "#FACA3E" }}>
                        {r.invested_points.toLocaleString("ko-KR")}P
                      </p>
                      {r.status === "sold" && r.final_points != null && (
                        <p style={{ ...NUM_MONO, fontSize: 12, marginTop: 3,
                          color: r.final_points >= r.invested_points ? "#7ed4a0" : "#f07878" }}>
                          → {r.final_points.toLocaleString("ko-KR")}P
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <p style={{ fontSize: 12, color: "#c8bfb0", textAlign: "center", marginTop: 20,
          fontFamily: "var(--font-paperlogy)", fontWeight: 300, opacity: 0.5 }}>
          15분 지연 · 투자 참고용
        </p>
      </div>
    </main>
  );
}
