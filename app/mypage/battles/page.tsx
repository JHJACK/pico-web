"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/app/lib/authContext";
import { supabase, type BattleVoteRow } from "@/app/lib/supabase";

const TICKER_KOR: Record<string, string> = {
  ABNB: "에어비앤비",
  HLT:  "힐튼 호텔",
};

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

  return (
    <main className="min-h-screen" style={{ background: "#0d0d0d" }}>
      <nav
        className="sticky top-0 z-30 border-b flex items-center px-6"
        style={{
          height: 56,
          background: "rgba(13,13,13,0.96)",
          backdropFilter: "blur(20px)",
          borderColor: "rgba(255,255,255,0.06)",
        }}
      >
        <Link href="/mypage" style={{ fontSize: 13, color: "#5c5448", textDecoration: "none" }}>
          ← 내 정보
        </Link>
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
        <h1 style={{ fontSize: 22, fontWeight: 500, color: "#e8e0d0", marginBottom: 24 }}>
          대결 히스토리
        </h1>

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
            <p style={{ fontSize: 15, color: "#5c5448", fontWeight: 300 }}>
              아직 대결 참여 기록이 없어요
            </p>
          </div>
        ) : (
          <div className="flex flex-col" style={{ gap: 8 }}>
            {votes.map((v) => {
              const korName = TICKER_KOR[v.voted_for] ?? v.voted_for;
              const isCorrect = v.is_correct;

              return (
                <div
                  key={v.id}
                  className="rounded-2xl border flex items-center"
                  style={{
                    background: "#141414",
                    borderColor: "rgba(255,255,255,0.07)",
                    padding: "18px 20px",
                    gap: 16,
                  }}
                >
                  {/* 날짜 */}
                  <div
                    style={{
                      fontFamily: "var(--font-inter)",
                      fontSize: 14,
                      fontWeight: 400,
                      color: "#5c5448",
                      flexShrink: 0,
                      minWidth: 52,
                    }}
                  >
                    {formatDate(v.date)}
                  </div>

                  {/* 구분선 */}
                  <div style={{ width: "0.5px", alignSelf: "stretch", background: "rgba(255,255,255,0.07)", flexShrink: 0 }} />

                  {/* 선택 종목 */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span
                      style={{
                        fontFamily: "var(--font-inter)",
                        fontSize: 15,
                        fontWeight: 500,
                        color: "#e8e0d0",
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {v.voted_for}
                    </span>
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 300,
                        color: "#c8bfb0",
                        marginLeft: 8,
                      }}
                    >
                      {korName}
                    </span>
                  </div>

                  {/* 결과 */}
                  <div style={{ flexShrink: 0 }}>
                    {isCorrect === true ? (
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: 500,
                          color: "#7ed4a0",
                        }}
                      >
                        정답 🎉 +100P
                      </span>
                    ) : isCorrect === false ? (
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: 400,
                          color: "#5c5448",
                        }}
                      >
                        오답 😅
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: 300,
                          color: "#3a3a3a",
                        }}
                      >
                        집계 중...
                      </span>
                    )}
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
