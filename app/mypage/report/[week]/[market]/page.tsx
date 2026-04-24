"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link                     from "next/link";
import { useAuth }              from "@/app/lib/authContext";
import { supabase }             from "@/app/lib/supabase";
import type { ReportContent }   from "@/app/lib/gemini";

const MARKET_LABEL = { kr: "한국 주식", us: "해외 주식" };
const MARKET_COLOR = { kr: "#7ed4a0", us: "#7eb8f7" };

function gradeColor(grade: string) {
  if (grade === "S" || grade === "A")  return "#FACA3E";
  if (grade === "B+" || grade === "B") return "#7ed4a0";
  if (grade === "C")                   return "#c8bfb0";
  return "#f07878";
}

// ── **볼드** / ==형광펜== 마크업 렌더러 ─────────────────────
function RichText({ text, style }: { text: string; style?: React.CSSProperties }) {
  const parts = text.split(/(\*\*[^*]+\*\*|==[^=]+==[^=])/g);
  return (
    <span style={style}>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={i} style={{ fontWeight: 600, color: "#e8e0d0" }}>{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith("==") && part.endsWith("==")) {
          return (
            <mark key={i} style={{ background: "rgba(250,202,62,0.25)", color: "#e8e0d0", borderRadius: 3, padding: "1px 3px" }}>
              {part.slice(2, -2)}
            </mark>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}

// ── 섹션 카드 래퍼 ─────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl p-5 mb-3"
      style={{ background: "#141414", border: "0.5px solid rgba(255,255,255,0.07)" }}
    >
      <p style={{ fontSize: 13, fontWeight: 600, color: "#c8bfb0", letterSpacing: "0.06em", marginBottom: 14 }}>
        {title}
      </p>
      {children}
    </div>
  );
}

// ── 수익률 뱃지 ────────────────────────────────────────────
function ReturnBadge({ pct }: { pct: number | null }) {
  if (pct === null) return <span style={{ fontSize: 12, color: "#c8bfb0" }}>—</span>;
  const color = pct >= 0 ? "#7ed4a0" : "#f07878";
  return (
    <span
      className="num rounded-lg px-2 py-0.5"
      style={{
        fontSize: 12,
        fontWeight: 600,
        color,
        background: `${color}18`,
        fontFamily: "var(--font-inter)",
      }}
    >
      {pct >= 0 ? "+" : ""}{pct.toFixed(2)}%
    </span>
  );
}

// ── 종목 타임라인 카드 ──────────────────────────────────────
function TradeTimeline({ trade }: {
  trade: ReportContent["trades"][0];
}) {
  const isPos  = (trade.returnPct ?? 0) >= 0;
  const isSold = trade.status === "sold";

  return (
    <div
      className="rounded-2xl p-4 mb-2"
      style={{ background: "#1a1a1a", border: "0.5px solid rgba(255,255,255,0.06)" }}
    >
      {/* 헤더: 종목명 + 상태 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 15, fontWeight: 600, color: "#e8e0d0" }}>{trade.name}</span>
          <span style={{ fontSize: 11, color: "#c8bfb0" }}>{trade.ticker}</span>
        </div>
        <div className="flex items-center gap-2">
          <ReturnBadge pct={trade.returnPct} />
          <span
            className="rounded-full px-2 py-0.5"
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: isSold ? "#c8bfb0" : "#FACA3E",
              background: isSold ? "rgba(200,191,176,0.12)" : "rgba(250,202,62,0.12)",
            }}
          >
            {isSold ? "매도 완료" : "보유 중"}
          </span>
        </div>
      </div>

      {/* 타임라인 */}
      <div className="flex flex-col gap-2 pl-1">
        {/* 매수 */}
        <div className="flex items-start gap-3">
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#7eb8f7", marginTop: 5, flexShrink: 0 }} />
          <div>
            <span style={{ fontSize: 12, color: "#c8bfb0" }}>{trade.buyAt} 매수</span>
            <span className="num" style={{ fontSize: 12, color: "#e8e0d0", marginLeft: 6, fontFamily: "var(--font-inter)" }}>
              {trade.buyPrice.toLocaleString()}
            </span>
          </div>
        </div>

        {/* 뉴스 */}
        {trade.newsContext && (
          <div className="flex items-start gap-3">
            <div style={{ width: 7, height: 7, marginTop: 5, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 10 }}>📰</span>
            </div>
            <span style={{ fontSize: 12, color: "#c8bfb0", lineHeight: 1.5 }}>{trade.newsContext}</span>
          </div>
        )}

        {/* 매도 */}
        {isSold && trade.sellAt && trade.sellPrice != null && (
          <div className="flex items-start gap-3">
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: isPos ? "#7ed4a0" : "#f07878", marginTop: 5, flexShrink: 0 }} />
            <div>
              <span style={{ fontSize: 12, color: "#c8bfb0" }}>{trade.sellAt} 매도</span>
              <span className="num" style={{ fontSize: 12, color: "#e8e0d0", marginLeft: 6, fontFamily: "var(--font-inter)" }}>
                {trade.sellPrice.toLocaleString()}
              </span>
              <span
                className="num"
                style={{ fontSize: 12, fontWeight: 600, color: isPos ? "#7ed4a0" : "#f07878", marginLeft: 8, fontFamily: "var(--font-inter)" }}
              >
                {(isPos ? "+" : "")}{(trade.finalPoints! - trade.investedPoints).toLocaleString()}P
              </span>
            </div>
          </div>
        )}

        {/* 보유 중 평가 */}
        {!isSold && (
          <div className="flex items-start gap-3">
            <div style={{ width: 7, height: 7, borderRadius: 2, background: "#FACA3E", marginTop: 5, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: "#c8bfb0" }}>현재 보유 중</span>
          </div>
        )}
      </div>

      {/* 투자 포인트 */}
      <div
        className="flex items-center justify-between mt-3 pt-3"
        style={{ borderTop: "0.5px solid rgba(255,255,255,0.06)" }}
      >
        <span style={{ fontSize: 12, color: "#c8bfb0" }}>투자</span>
        <span className="num" style={{ fontSize: 12, color: "#e8e0d0", fontFamily: "var(--font-inter)" }}>
          {trade.investedPoints.toLocaleString()}P
          {trade.finalPoints != null && (
            <span style={{ color: isPos ? "#7ed4a0" : "#f07878", marginLeft: 4 }}>
              → {trade.finalPoints.toLocaleString()}P
            </span>
          )}
        </span>
      </div>
    </div>
  );
}

// ── 메인 페이지 ────────────────────────────────────────────
export default function ReportDetailPage() {
  const router                     = useRouter();
  const params                     = useParams<{ week: string; market: string }>();
  const { user, loading }          = useAuth();
  const [report, setReport]        = useState<{ content: ReportContent } | null>(null);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [notFound, setNotFound]    = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const market = params.market as "kr" | "us";
  const week   = params.week;

  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const res  = await fetch(`/api/insights/report?week=${week}&market=${market}`, {
        headers: { Authorization: `Bearer ${session?.access_token ?? ""}` },
      });
      const json = await res.json();
      if (!json.report) { setNotFound(true); setFetchLoading(false); return; }
      setReport(json.report);
      setFetchLoading(false);
    })();
  }, [user, week, market]);

  async function handleRegenerate() {
    if (!user || regenerating) return;
    setRegenerating(true);
    const { data: { session } } = await supabase.auth.getSession();
    await fetch("/api/insights/report/generate", {
      method:  "POST",
      headers: { Authorization: `Bearer ${session?.access_token ?? ""}`, "Content-Type": "application/json" },
      body:    JSON.stringify({ market }),
    });
    const res  = await fetch(`/api/insights/report?week=${week}&market=${market}`, {
      headers: { Authorization: `Bearer ${session?.access_token ?? ""}` },
    });
    const json = await res.json();
    if (json.report) setReport(json.report);
    setRegenerating(false);
  }

  if (loading || !user) return null;

  const c = report?.content;

  // ── 전주 / 다음주 이동 ────────────────────────────────────
  function shiftWeek(direction: -1 | 1) {
    const d = new Date(week + "T00:00:00");
    d.setDate(d.getDate() + direction * 7);
    router.push(`/mypage/report/${d.toLocaleDateString("sv-SE")}/${market}`);
  }

  return (
    <main
      className="min-h-screen"
      style={{ background: "#0d0d0d", fontFamily: "var(--font-paperlogy), var(--font-noto), sans-serif" }}
    >
      {/* 네비게이션 */}
      <nav
        className="sticky top-0 z-30 border-b flex items-center px-6"
        style={{ height: 56, background: "rgba(13,13,13,0.96)", backdropFilter: "blur(20px)", borderColor: "rgba(255,255,255,0.06)" }}
      >
        <Link href="/mypage/report" style={{ fontSize: 13, color: "#c8bfb0", textDecoration: "none" }}>{"<"} 리포트 목록</Link>
        <span style={{ fontFamily: "var(--font-serif)", fontSize: 20, color: "#FACA3E", marginLeft: 16 }}>PICO</span>
      </nav>

      <div
        className="mx-auto py-6"
        style={{ maxWidth: 700, paddingLeft: "clamp(16px, 4vw, 24px)", paddingRight: "clamp(16px, 4vw, 24px)" }}
      >

        {/* 스켈레톤 */}
        {fetchLoading && (
          <div className="flex flex-col gap-3">
            {[80, 140, 200, 160].map((h, i) => (
              <div key={i} className="rounded-2xl animate-pulse" style={{ height: h, background: "#1a1a1a" }} />
            ))}
          </div>
        )}

        {/* 404 */}
        {!fetchLoading && notFound && (
          <div className="text-center py-16">
            <p style={{ fontSize: 36, marginBottom: 12 }}>📭</p>
            <p style={{ fontSize: 16, color: "#e8e0d0", marginBottom: 8 }}>아직 리포트가 없어요</p>
            <p style={{ fontSize: 14, color: "#c8bfb0", marginBottom: 24 }}>
              {market === "kr" ? "금요일 오후 5시" : "토요일 낮 12시"}에 생성돼요
            </p>
            <Link
              href="/mypage/report"
              style={{ fontSize: 14, color: "#FACA3E" }}
            >
              목록으로 돌아가기
            </Link>
          </div>
        )}

        {/* 리포트 본문 */}
        {!fetchLoading && c && (
          <>
            {/* ── 헤더 ── */}
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="rounded-full px-2.5 py-1"
                  style={{ fontSize: 11, fontWeight: 600, color: "#0d0d0d", background: MARKET_COLOR[market] }}
                >
                  {MARKET_LABEL[market]}
                </span>
              </div>
              <h1 style={{ fontSize: 20, fontWeight: 600, color: "#e8e0d0", marginBottom: 2 }}>
                AI 주간 리포트
              </h1>
              <p style={{ fontSize: 13, color: "#c8bfb0" }}>{c.weekLabel}</p>
            </div>

            {/* ── 요약 카드 ── */}
            <div
              className="rounded-2xl p-5 mb-3"
              style={{ background: "#141414", border: "0.5px solid rgba(255,255,255,0.07)" }}
            >
              {/* 등급 + 수익률 */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p style={{ fontSize: 12, color: "#c8bfb0", marginBottom: 4 }}>이번 주 등급</p>
                  <span
                    style={{
                      fontSize: 32,
                      fontWeight: 700,
                      color: gradeColor(c.summary.grade),
                      fontFamily: "var(--font-inter)",
                    }}
                  >
                    {c.summary.grade}
                  </span>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontSize: 12, color: "#c8bfb0", marginBottom: 4 }}>종합 수익률</p>
                  <span
                    className="num"
                    style={{
                      fontSize: 28,
                      fontWeight: 700,
                      color: c.summary.returnRate >= 0 ? "#7ed4a0" : "#f07878",
                      fontFamily: "var(--font-inter)",
                    }}
                  >
                    {c.summary.returnRate >= 0 ? "+" : ""}{c.summary.returnRate}%
                  </span>
                </div>
              </div>

              {/* 4열 수치 */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: "거래",   value: `${c.summary.tradeCount}건` },
                  { label: "매도",   value: `${c.summary.soldCount}건` },
                  { label: "승률",   value: `${c.summary.winRate}%` },
                  {
                    label: "손익",
                    value: `${c.summary.profitPoints >= 0 ? "+" : ""}${c.summary.profitPoints.toLocaleString()}P`,
                    color: c.summary.profitPoints >= 0 ? "#7ed4a0" : "#f07878",
                  },
                ].map(({ label, value, color }) => (
                  <div
                    key={label}
                    className="rounded-xl p-2.5 text-center"
                    style={{ background: "#1a1a1a" }}
                  >
                    <p style={{ fontSize: 10, color: "#c8bfb0", marginBottom: 3 }}>{label}</p>
                    <p
                      className="num"
                      style={{ fontSize: 14, fontWeight: 600, color: color ?? "#e8e0d0", fontFamily: "var(--font-inter)" }}
                    >
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              {/* 베스트 거래 */}
              {c.bestTrade && (
                <div
                  className="flex items-center justify-between rounded-xl px-3 py-2.5 mt-3"
                  style={{ background: "rgba(250,202,62,0.06)", border: "0.5px solid rgba(250,202,62,0.15)" }}
                >
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: 14 }}>🏆</span>
                    <span style={{ fontSize: 13, color: "#c8bfb0" }}>이번 주 최고 수익</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#e8e0d0" }}>{c.bestTrade.name}</span>
                    <ReturnBadge pct={c.bestTrade.returnPct} />
                  </div>
                </div>
              )}
            </div>

            {/* ── AI 분석 ── */}
            {c.aiNarrative ? (
              <Section title="AI 분석">
                <p style={{ fontSize: 15, color: "#c8bfb0", lineHeight: 1.8 }}>
                  <RichText text={c.aiNarrative} />
                </p>
              </Section>
            ) : (
              <div
                className="rounded-2xl p-5 mb-3 flex flex-col gap-3"
                style={{ background: "#141414", border: "0.5px solid rgba(255,255,255,0.07)" }}
              >
                <p style={{ fontSize: 13, fontWeight: 600, color: "#c8bfb0", letterSpacing: "0.06em" }}>AI 분석</p>
                <p style={{ fontSize: 14, color: "#c8bfb0", lineHeight: 1.7 }}>
                  아직 AI 분석이 없어요.<br />지금 바로 생성할 수 있어요.
                </p>
                <button
                  onClick={handleRegenerate}
                  disabled={regenerating}
                  className="rounded-xl py-3"
                  style={{
                    background:  regenerating ? "rgba(250,202,62,0.5)" : "#FACA3E",
                    color:       "#0d0d0d",
                    fontSize:    14,
                    fontWeight:  600,
                  }}
                >
                  {regenerating ? (
                    <span className="flex items-center justify-center gap-2">
                      <span style={{ width: 12, height: 12, border: "2px solid rgba(0,0,0,0.3)", borderTop: "2px solid #0d0d0d", borderRadius: "50%", display: "inline-block", animation: "spin 0.8s linear infinite" }} />
                      AI 분석 중... (30초 내외)
                    </span>
                  ) : "AI 분석 생성하기 →"}
                </button>
              </div>
            )}

            {/* ── 종목별 타임라인 ── */}
            {(c.trades.length > 0 || c.holdings.length > 0) && (
              <Section title="종목별 타임라인">
                {c.trades.map((t) => (
                  <TradeTimeline key={`${t.ticker}-${t.buyAt}`} trade={t} />
                ))}
                {c.holdings.map((h) => (
                  <TradeTimeline
                    key={`${h.ticker}-${h.buyAt}`}
                    trade={{
                      ...h,
                      status:    "holding",
                      sellAt:    null,
                      sellPrice: null,
                      returnPct: h.returnPct,
                      finalPoints: null,
                      newsContext: "",
                    }}
                  />
                ))}
              </Section>
            )}

            {/* ── 이번 주 패턴 ── */}
            {(c.behavior?.tags?.length ?? 0) > 0 && (
              <Section title="이번 주 패턴">
                <div className="flex flex-col gap-2">
                  {c.behavior.tags.map((tag, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span style={{ color: "#FACA3E", fontSize: 14, marginTop: 1, flexShrink: 0 }}>•</span>
                      <p style={{ fontSize: 14, color: "#c8bfb0", lineHeight: 1.6 }}>
                        <RichText text={tag} />
                      </p>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* ── DNA 코멘트 ── */}
            {c.dna?.commentary && (
              <Section title={`${c.dna.emoji || "🧬"} ${c.dna.type ? "투자 DNA" : "DNA 분석"}`}>
                <p style={{ fontSize: 14, color: "#c8bfb0", lineHeight: 1.7 }}>
                  <RichText text={c.dna.commentary} />
                </p>
              </Section>
            )}

            {/* ── 주간 이동 ── */}
            <div
              className="flex items-center justify-between mt-4 pt-4"
              style={{ borderTop: "0.5px solid rgba(255,255,255,0.07)" }}
            >
              <button
                onClick={() => shiftWeek(-1)}
                className="pico-btn rounded-xl px-4 py-2.5"
                style={{ background: "#1a1a1a", border: "0.5px solid rgba(255,255,255,0.08)", color: "#c8bfb0", fontSize: 13 }}
              >
                ← 이전 주
              </button>
              <span style={{ fontSize: 12, color: "#c8bfb0" }}>
                {MARKET_LABEL[market]}
              </span>
              <button
                onClick={() => shiftWeek(1)}
                className="pico-btn rounded-xl px-4 py-2.5"
                style={{ background: "#1a1a1a", border: "0.5px solid rgba(255,255,255,0.08)", color: "#c8bfb0", fontSize: 13 }}
              >
                다음 주 →
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
