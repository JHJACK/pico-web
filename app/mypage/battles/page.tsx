"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/app/lib/authContext";
import {
  supabase,
  getTomorrowStock,
  getStockForDate,
  getTodayVote,
  getTodayVoteCounts,
  submitVoteAndAttendance,
  getTodayStock,
  todayKST,
  type BattleVoteRow,
} from "@/app/lib/supabase";
import { BackIcon } from "@/app/components/BackIcon";

const NUM: React.CSSProperties = {
  fontFamily: "var(--font-inter), monospace",
  fontWeight: 300,
  letterSpacing: "-0.02em",
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

function CountUp({ target, duration = 1200 }: { target: number; duration?: number }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start: number | null = null;
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setVal(Math.round(p * target));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);
  return <>{val}</>;
}

export default function BattlesPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [votes, setVotes] = useState<BattleVoteRow[]>([]);
  const [fetching, setFetching] = useState(true);

  // 오늘의 선택
  const todayStock = getTodayStock();
  const [todayVote, setTodayVote] = useState<BattleVoteRow | null>(null);
  const [votesUp, setVotesUp] = useState(0);
  const [votesDown, setVotesDown] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [justVoted, setJustVoted] = useState<"UP" | "DOWN" | null>(null);
  const [showBarAnim, setShowBarAnim] = useState(false);
  const [showResultMsg, setShowResultMsg] = useState(false);
  const [countdown, setCountdown] = useState("--:--:--");
  const barTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/mypage");
  }, [user, loading, router]);

  // 카운트다운
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const close = new Date();
      close.setUTCHours(19, 30, 0, 0);
      if (close.getTime() <= now.getTime()) close.setUTCDate(close.getUTCDate() + 1);
      const diff = close.getTime() - now.getTime();
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1_000);
      setCountdown(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // 오늘의 투표 + 히스토리 로드
  useEffect(() => {
    if (!user) return;
    Promise.all([
      getTodayVote(user.id),
      getTodayVoteCounts(),
      supabase
        .from("battle_votes")
        .select("*")
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .then(({ data, error }) => {
          if (error) console.error("[battles]", error.message);
          return (data ?? []) as BattleVoteRow[];
        }),
    ]).then(([vote, counts, history]) => {
      setTodayVote(vote);
      setVotesUp(counts.votesUp);
      setVotesDown(counts.votesDown);
      if (vote) setShowBarAnim(true);
      setVotes(history);
      setFetching(false);
    });
  }, [user]);

  async function handleVote(direction: "UP" | "DOWN") {
    if (!user || todayVote || submitting) return;
    setSubmitting(true);
    try {
      await submitVoteAndAttendance(user.id, direction, todayStock.ticker);
      const [vote, counts] = await Promise.all([
        getTodayVote(user.id),
        getTodayVoteCounts(),
      ]);
      setTodayVote(vote);
      setVotesUp(counts.votesUp);
      setVotesDown(counts.votesDown);
      setJustVoted(direction);
      barTimerRef.current = setTimeout(() => {
        setShowBarAnim(true);
        barTimerRef.current = setTimeout(() => setShowResultMsg(true), 800);
      }, 300);
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => () => { if (barTimerRef.current) clearTimeout(barTimerRef.current); }, []);

  if (loading) return null;
  if (!user) return null;

  const tomorrow = getTomorrowStock();
  const battleDone = !!todayVote;
  const battleVote = todayVote?.voted_for as "UP" | "DOWN" | undefined;
  const total = votesUp + votesDown;
  const pctUp = total > 0 ? Math.round((votesUp / total) * 100) : 50;
  const pctDown = 100 - pctUp;

  return (
    <main className="min-h-screen" style={{ background: "#0d0d0d", fontFamily: "var(--font-paperlogy), var(--font-noto), sans-serif" }}>
      <nav
        className="sticky top-0 z-30 border-b flex items-center px-6"
        style={{ height: 56, background: "rgba(13,13,13,0.96)", backdropFilter: "blur(20px)", borderColor: "rgba(255,255,255,0.06)" }}
      >
        <Link href="/mypage" style={{ textDecoration: "none" }}><BackIcon /></Link>
        <span style={{ fontFamily: "var(--font-serif)", fontSize: 20, color: "#FACA3E", marginLeft: 16 }}>PICO</span>
      </nav>

      <div className="mx-auto py-8" style={{ maxWidth: 700, paddingLeft: "clamp(16px, 4vw, 24px)", paddingRight: "clamp(16px, 4vw, 24px)" }}>

        {/* ── 오늘의 선택 투표 ── */}
        <div className="rounded-2xl border mb-8" style={{ background: "#141414", borderColor: "rgba(250,202,62,0.2)", padding: "20px 20px 22px" }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p style={{ fontSize: 11, letterSpacing: "0.14em", color: "#5c5448", textTransform: "uppercase", fontWeight: 500, marginBottom: 6 }}>
                오늘의 선택 — {todayStock.category}
              </p>
              <p style={{ fontSize: 20, fontWeight: 500, color: "#e8e0d0" }}>{todayStock.name}</p>
            </div>
            <div className="flex items-center gap-3">
              {battleDone ? (
                <span style={{ fontSize: 11, fontWeight: 500, padding: "4px 10px", borderRadius: 5, background: "rgba(126,212,160,0.12)", color: "#7ed4a0", border: "0.5px solid rgba(126,212,160,0.3)" }}>
                  참여완료
                </span>
              ) : (
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: 11, color: "#5c5448" }}>마감까지</span>
                  <span style={{ ...NUM, fontSize: 13, color: "#FACA3E" }}>{countdown}</span>
                </div>
              )}
            </div>
          </div>

          {/* UP / DOWN 버튼 */}
          <div className="flex gap-3 mb-4">
            <button
              onClick={() => handleVote("UP")}
              disabled={battleDone || submitting}
              className={`flex-1 rounded-xl border text-center pico-btn ${justVoted === "UP" ? "gold-glow" : ""}`}
              style={{
                padding: "18px 12px",
                background: battleVote === "UP" ? "rgba(126,212,160,0.12)" : "#1c1c1c",
                borderColor: battleVote === "UP" ? "#7ed4a0" : "rgba(255,255,255,0.06)",
                cursor: battleDone ? "default" : "pointer",
                opacity: battleDone && battleVote !== "UP" ? 0.4 : 1,
                transition: "all 0.3s ease",
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 6 }}>📈</div>
              <div style={{ fontSize: 16, fontWeight: 500, color: battleVote === "UP" ? "#7ed4a0" : "#e8e0d0", marginBottom: showBarAnim ? 4 : 0 }}>오른다</div>
              {showBarAnim && (
                <div style={{ ...NUM, fontSize: 13, color: "#7ed4a0", fontWeight: 500 }}>
                  <CountUp target={pctUp} duration={1200} />%
                </div>
              )}
              {!showBarAnim && <div style={{ fontSize: 11, color: "#5c5448" }}>탭해서 선택</div>}
            </button>

            <button
              onClick={() => handleVote("DOWN")}
              disabled={battleDone || submitting}
              className={`flex-1 rounded-xl border text-center pico-btn ${justVoted === "DOWN" ? "gold-glow" : ""}`}
              style={{
                padding: "18px 12px",
                background: battleVote === "DOWN" ? "rgba(240,120,120,0.12)" : "#1c1c1c",
                borderColor: battleVote === "DOWN" ? "#f07878" : "rgba(255,255,255,0.06)",
                cursor: battleDone ? "default" : "pointer",
                opacity: battleDone && battleVote !== "DOWN" ? 0.4 : 1,
                transition: "all 0.3s ease",
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 6 }}>📉</div>
              <div style={{ fontSize: 16, fontWeight: 500, color: battleVote === "DOWN" ? "#f07878" : "#e8e0d0", marginBottom: showBarAnim ? 4 : 0 }}>내린다</div>
              {showBarAnim && (
                <div style={{ ...NUM, fontSize: 13, color: "#f07878", fontWeight: 500 }}>
                  <CountUp target={pctDown} duration={1200} />%
                </div>
              )}
              {!showBarAnim && <div style={{ fontSize: 11, color: "#5c5448" }}>탭해서 선택</div>}
            </button>
          </div>

          {/* 투표 바 */}
          {showBarAnim && (
            <div className="fade-in-up">
              <div className="rounded-full overflow-hidden mb-2" style={{ height: 3, background: "#242424" }}>
                <div style={{ width: `${pctUp}%`, height: "100%", background: "#7ed4a0", borderRadius: 9999, transition: "width 1.2s cubic-bezier(.4,0,.2,1)" }} />
              </div>
              <div className="flex justify-between items-center">
                <span style={{ ...NUM, fontSize: 12, color: "#7ed4a0" }}>📈 오른다 {pctUp}%</span>
                <span style={{ ...NUM, fontSize: 11, color: "#5c5448" }}>총 {total.toLocaleString()}명</span>
                <span style={{ ...NUM, fontSize: 12, color: "#f07878" }}>내린다 📉 {pctDown}%</span>
              </div>
            </div>
          )}

          {!showBarAnim && (
            <div style={{ textAlign: "center", fontSize: 12, color: "#5c5448", fontWeight: 300 }}>선택하면 현황이 공개돼요</div>
          )}

          {showResultMsg && (
            <div className="fade-in-up mt-3 rounded-xl px-4 py-3 text-center" style={{ background: "rgba(250,202,62,0.05)", border: "0.5px solid rgba(250,202,62,0.15)" }}>
              <span style={{ fontSize: 14, fontWeight: 500, color: "#e8e0d0" }}>내일 오전 결과 공개! 🎯</span>
            </div>
          )}
        </div>

        {/* ── 내일 예고 ── */}
        <div className="rounded-2xl border mb-6" style={{ background: "#141414", borderColor: "rgba(255,255,255,0.07)", padding: "16px 20px" }}>
          <p style={{ fontSize: 11, letterSpacing: "0.12em", color: "#c8bfb0", textTransform: "uppercase", fontWeight: 500, marginBottom: 10 }}>
            내일의 선택 👀
          </p>
          <div className="flex items-center gap-3">
            <div style={{ fontSize: 22 }}>📊</div>
            <div>
              <span style={{ fontSize: 15, fontWeight: 500, color: "#e8e0d0" }}>{tomorrow.name}</span>
              <span style={{ fontSize: 13, color: "#c8bfb0", marginLeft: 8 }}>· {tomorrow.category}</span>
            </div>
          </div>
          <p style={{ fontSize: 12, color: "#c8bfb0", fontWeight: 300, marginTop: 8 }}>결과는 내일 오전 7시에 발표돼요</p>
        </div>

        {/* ── 히스토리 ── */}
        <p style={{ fontSize: 16, fontWeight: 500, color: "#e8e0d0", marginBottom: 14 }}>참여 기록</p>

        {fetching ? null : votes.length === 0 ? (
          <div className="rounded-2xl border" style={{ background: "#141414", borderColor: "rgba(255,255,255,0.07)", padding: "48px 20px", textAlign: "center" }}>
            <p style={{ fontSize: 15, color: "#c8bfb0", fontWeight: 300 }}>아직 참여 기록이 없어요</p>
          </div>
        ) : (
          <div className="flex flex-col" style={{ gap: 8 }}>
            {votes.map((v) => {
              const isNewFormat = v.voted_for === "UP" || v.voted_for === "DOWN";
              const stockInfo = isNewFormat ? getStockForDate(v.date) : null;
              const stockName = v.ticker ? stockInfo?.name ?? v.ticker : stockInfo?.name ?? v.voted_for;
              const isCorrect = v.is_correct;
              const isToday = v.date === todayKST();

              return (
                <div key={v.id} className="rounded-2xl border" style={{ background: "#141414", borderColor: isToday ? "rgba(250,202,62,0.18)" : "rgba(255,255,255,0.07)", padding: "16px 20px" }}>
                  <div className="flex items-center gap-4">
                    <div style={{ fontSize: 13, fontWeight: 400, color: "#c8bfb0", flexShrink: 0, minWidth: 48 }}>{formatDate(v.date)}</div>
                    <div style={{ width: "0.5px", alignSelf: "stretch", background: "rgba(255,255,255,0.07)", flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 500, color: "#e8e0d0", marginBottom: 2 }}>{stockName}</div>
                      {isNewFormat && (
                        <div style={{ fontSize: 13, fontWeight: 400, color: v.voted_for === "UP" ? "#7ed4a0" : "#f07878" }}>
                          {v.voted_for === "UP" ? "📈 오른다" : "📉 내린다"}
                        </div>
                      )}
                    </div>
                    <div style={{ flexShrink: 0 }}>
                      {isCorrect === true ? (
                        <span style={{ fontSize: 14, fontWeight: 500, color: "#7ed4a0" }}>정답 🎉 +100P</span>
                      ) : isCorrect === false ? (
                        <span style={{ fontSize: 14, fontWeight: 400, color: "#c8bfb0" }}>오답 😅</span>
                      ) : (
                        <span style={{ fontSize: 13, fontWeight: 300, color: "#c8bfb0" }}>집계 중</span>
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
