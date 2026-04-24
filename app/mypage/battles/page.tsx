"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/app/lib/authContext";
import { supabase, getTomorrowStock, getStockForDate, type BattleVoteRow } from "@/app/lib/supabase";
import { BackIcon } from "@/app/components/BackIcon";

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export default function BattlesPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [votes, setVotes] = useState<BattleVoteRow[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.replace("/mypage");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("battle_votes")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error("[battles]", error.message);
        setVotes((data ?? []) as BattleVoteRow[]);
        setFetching(false);
      });
  }, [user]);

  if (loading) return null;
  if (!user) return null;

  const tomorrow = getTomorrowStock();

  return (
    <main className="min-h-screen" style={{ background: "#0d0d0d", fontFamily: "var(--font-paperlogy), var(--font-noto), sans-serif" }}>
      <nav
        className="sticky top-0 z-30 border-b flex items-center px-6"
        style={{
          height: 56,
          background: "rgba(13,13,13,0.96)",
          backdropFilter: "blur(20px)",
          borderColor: "rgba(255,255,255,0.06)",
        }}
      >
        <Link href="/mypage" style={{ textDecoration: "none" }}><BackIcon /></Link>
        <span style={{ fontFamily: "var(--font-serif)", fontSize: 20, color: "#FACA3E", marginLeft: 16 }}>
          PICO
        </span>
      </nav>

      <div
        className="mx-auto py-8"
        style={{
          maxWidth: 700,
          paddingLeft: "clamp(16px, 4vw, 24px)",
          paddingRight: "clamp(16px, 4vw, 24px)",
        }}
      >
        <h1 style={{ fontSize: 22, fontWeight: 600, color: "#e8e0d0", marginBottom: 24, fontFamily: "var(--font-paperlogy)" }}>
          오늘의 선택 히스토리
        </h1>

        {/* 내일 예고 */}
        <div
          className="rounded-2xl border mb-6"
          style={{
            background: "#141414",
            borderColor: "rgba(250,202,62,0.18)",
            padding: "18px 20px",
          }}
        >
          <p style={{ fontSize: 11, letterSpacing: "0.12em", color: "#c8bfb0", textTransform: "uppercase", fontWeight: 500, marginBottom: 10 }}>
            내일의 선택 👀
          </p>
          <div className="flex items-center gap-3">
            <div style={{ fontSize: 22 }}>📊</div>
            <div>
              <span style={{ fontSize: 16, fontWeight: 500, color: "#e8e0d0" }}>{tomorrow.name}</span>
              <span style={{ fontSize: 13, color: "#c8bfb0", marginLeft: 8 }}>· {tomorrow.category}</span>
            </div>
          </div>
          <p style={{ fontSize: 12, color: "#c8bfb0", fontWeight: 300, marginTop: 8 }}>
            결과는 내일 오전 7시에 발표돼
          </p>
        </div>

        {/* 히스토리 목록 */}
        {fetching ? null : votes.length === 0 ? (
          <div
            className="rounded-2xl border"
            style={{
              background: "#141414",
              borderColor: "rgba(255,255,255,0.07)",
              padding: "48px 20px",
              textAlign: "center",
            }}
          >
            <p style={{ fontSize: 15, color: "#c8bfb0", fontWeight: 300 }}>
              아직 참여 기록이 없어요
            </p>
          </div>
        ) : (
          <div className="flex flex-col" style={{ gap: 8 }}>
            {votes.map((v) => {
              const isNewFormat = v.voted_for === "UP" || v.voted_for === "DOWN";
              const stockInfo = isNewFormat ? getStockForDate(v.date) : null;
              const stockName = v.ticker
                ? stockInfo?.name ?? v.ticker
                : stockInfo?.name ?? v.voted_for;
              const isCorrect = v.is_correct;

              return (
                <div
                  key={v.id}
                  className="rounded-2xl border"
                  style={{
                    background: "#141414",
                    borderColor: "rgba(255,255,255,0.07)",
                    padding: "18px 20px",
                  }}
                >
                  <div className="flex items-center gap-4">
                    {/* 날짜 */}
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 400,
                        color: "#c8bfb0",
                        flexShrink: 0,
                        minWidth: 48,
                      }}
                    >
                      {formatDate(v.date)}
                    </div>

                    {/* 구분선 */}
                    <div style={{ width: "0.5px", alignSelf: "stretch", background: "rgba(255,255,255,0.07)", flexShrink: 0 }} />

                    {/* 종목 + 선택 */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 500, color: "#e8e0d0", marginBottom: 2 }}>
                        {stockName}
                      </div>
                      {isNewFormat && (
                        <div style={{
                          fontSize: 13,
                          fontWeight: 400,
                          color: v.voted_for === "UP" ? "#7ed4a0" : "#f07878",
                        }}>
                          {v.voted_for === "UP" ? "📈 오른다" : "📉 내린다"}
                        </div>
                      )}
                    </div>

                    {/* 결과 */}
                    <div style={{ flexShrink: 0 }}>
                      {isCorrect === true ? (
                        <span style={{ fontSize: 14, fontWeight: 500, color: "#7ed4a0" }}>
                          정답 🎉 +100P
                        </span>
                      ) : isCorrect === false ? (
                        <span style={{ fontSize: 14, fontWeight: 400, color: "#c8bfb0" }}>
                          오답 😅
                        </span>
                      ) : (
                        <span style={{ fontSize: 13, fontWeight: 300, color: "#c8bfb0" }}>
                          집계 중
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
