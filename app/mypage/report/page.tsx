"use client";

import { useState, useEffect } from "react";
import { useRouter }           from "next/navigation";
import Link                    from "next/link";
import { useAuth }             from "@/app/lib/authContext";
import { supabase }            from "@/app/lib/supabase";

type ReportMeta = {
  id:           string;
  week_start:   string;
  week_end:     string;
  market:       "kr" | "us";
  generated_at: string;
  content: {
    summary: {
      returnRate:   number;
      grade:        string;
      tradeCount:   number;
      profitPoints: number;
    };
  };
};

const MARKET_LABEL = { kr: "한국 주식", us: "해외 주식" };
const MARKET_COLOR = { kr: "#7ed4a0", us: "#7eb8f7" };

function gradeColor(grade: string) {
  if (grade === "S" || grade === "A")  return "#FACA3E";
  if (grade === "B+" || grade === "B") return "#7ed4a0";
  if (grade === "C")                   return "#c8bfb0";
  return "#f07878";
}

// ── 옵트인 팝업 ─────────────────────────────────────────────
function OptInModal({ onConfirm, onDismiss, loading }: {
  onConfirm: () => void;
  onDismiss: () => void;
  loading:   boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-5"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
    >
      <div
        className="w-full max-w-sm rounded-3xl p-7 border"
        style={{ background: "#141414", borderColor: "rgba(255,255,255,0.1)" }}
      >
        {/* 아이콘 */}
        <div
          className="flex items-center justify-center mb-5"
          style={{ width: 56, height: 56, borderRadius: 16, background: "rgba(250,202,62,0.12)", margin: "0 auto 20px" }}
        >
          <span style={{ fontSize: 26 }}>📊</span>
        </div>

        {/* 제목 */}
        <p
          className="text-center mb-2"
          style={{ fontSize: 20, fontWeight: 600, color: "#e8e0d0" }}
        >
          AI 주간 리포트
        </p>
        <p
          className="text-center mb-6"
          style={{ fontSize: 14, color: "#c8bfb0", lineHeight: 1.7 }}
        >
          한 주간의 피코 플레이 활동을<br />
          AI가 팩트 기반으로 정리해드려요.
        </p>

        {/* 기능 목록 */}
        <div
          className="rounded-2xl p-4 mb-6"
          style={{ background: "#1a1a1a", border: "0.5px solid rgba(255,255,255,0.07)" }}
        >
          {[
            { icon: "📈", text: "종목별 수익률 타임라인" },
            { icon: "📰", text: "거래 기간 내 관련 뉴스 연결" },
            { icon: "🔍", text: "나의 매매 패턴 분석" },
            { icon: "🧬", text: "투자 DNA와 행동 비교" },
          ].map(({ icon, text }) => (
            <div key={text} className="flex items-center gap-3 mb-3 last:mb-0">
              <span style={{ fontSize: 16, flexShrink: 0 }}>{icon}</span>
              <span style={{ fontSize: 14, color: "#e8e0d0" }}>{text}</span>
            </div>
          ))}
        </div>

        {/* 발송 일정 */}
        <div
          className="rounded-xl px-4 py-3 mb-6 flex items-center gap-3"
          style={{ background: "rgba(250,202,62,0.06)", border: "0.5px solid rgba(250,202,62,0.2)" }}
        >
          <span style={{ fontSize: 14, flexShrink: 0 }}>🕐</span>
          <div>
            <p style={{ fontSize: 12, color: "#FACA3E", fontWeight: 500 }}>발송 일정</p>
            <p style={{ fontSize: 12, color: "#c8bfb0", marginTop: 2 }}>
              한국 주식 — 매주 금요일 오후 5시<br />
              해외 주식 — 매주 토요일 낮 12시
            </p>
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={onConfirm}
          disabled={loading}
          className="w-full rounded-2xl py-4 mb-3"
          style={{
            background: loading ? "rgba(250,202,62,0.5)" : "#FACA3E",
            color: "#0d0d0d",
            fontSize: 15,
            fontWeight: 600,
          }}
        >
          {loading ? "등록 중..." : "받아보기 시작하기 →"}
        </button>
        <button
          onClick={onDismiss}
          className="w-full py-2"
          style={{ background: "none", border: "none", color: "#c8bfb0", fontSize: 14 }}
        >
          다음에 받아볼게요
        </button>
      </div>
    </div>
  );
}

// ── 첫 리포트 대기 상태 ─────────────────────────────────────
function WaitingState({ onGenerate, generating }: {
  onGenerate: () => void;
  generating: boolean;
}) {
  const router = useRouter();
  return (
    <div
      className="rounded-2xl p-7"
      style={{ background: "#141414", border: "0.5px solid rgba(255,255,255,0.07)" }}
    >
      <div style={{ fontSize: 36, marginBottom: 14, textAlign: "center" }}>🕐</div>
      <p style={{ fontSize: 17, fontWeight: 500, color: "#e8e0d0", marginBottom: 8, textAlign: "center" }}>
        아직 리포트가 없어요
      </p>
      <p style={{ fontSize: 14, color: "#c8bfb0", lineHeight: 1.7, marginBottom: 24, textAlign: "center" }}>
        이번 주 거래 내역이 있다면<br />
        지금 바로 리포트를 만들 수 있어요.
      </p>

      {/* 지금 생성 */}
      <button
        onClick={onGenerate}
        disabled={generating}
        className="w-full rounded-2xl py-3.5 mb-3"
        style={{
          background:  generating ? "rgba(250,202,62,0.5)" : "#FACA3E",
          color:       "#0d0d0d",
          fontSize:    15,
          fontWeight:  600,
        }}
      >
        {generating ? (
          <span className="flex items-center justify-center gap-2">
            <span
              style={{
                width: 14, height: 14, border: "2px solid rgba(0,0,0,0.3)",
                borderTop: "2px solid #0d0d0d", borderRadius: "50%",
                display: "inline-block", animation: "spin 0.8s linear infinite",
              }}
            />
            AI 분석 중... (30초 내외)
          </span>
        ) : "이번 주 리포트 지금 받아보기 →"}
      </button>

      <button
        onClick={() => router.push("/")}
        className="w-full rounded-2xl py-3"
        style={{ background: "#1a1a1a", border: "0.5px solid rgba(255,255,255,0.08)", color: "#c8bfb0", fontSize: 14 }}
      >
        피코 플레이 하러 가기
      </button>
    </div>
  );
}

// ── 리포트 카드 ─────────────────────────────────────────────
function ReportCard({ report }: { report: ReportMeta }) {
  const router  = useRouter();
  const { summary, market } = { summary: report.content.summary, market: report.market };
  const isPos   = summary.returnRate >= 0;

  const weekStartDate = new Date(report.week_start + "T00:00:00");
  const weekEndDate   = new Date(report.week_end   + "T00:00:00");
  const fmtWeek = `${weekStartDate.toLocaleDateString("ko-KR", { month: "long", day: "numeric" })} — ${weekEndDate.toLocaleDateString("ko-KR", { month: "long", day: "numeric" })}`;

  return (
    <button
      onClick={() => router.push(`/mypage/report/${report.week_start}/${report.market}`)}
      className="pico-btn w-full border rounded-2xl p-5 text-left"
      style={{ background: "#141414", borderColor: "rgba(255,255,255,0.07)" }}
    >
      {/* 상단: 마켓 배지 + 주간 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span
            className="rounded-full px-2.5 py-1"
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "#0d0d0d",
              background: MARKET_COLOR[market],
            }}
          >
            {MARKET_LABEL[market]}
          </span>
          <span style={{ fontSize: 13, color: "#c8bfb0" }}>{fmtWeek}</span>
        </div>
        <span style={{ fontSize: 22, fontWeight: 700, color: gradeColor(summary.grade) }}>
          {summary.grade}
        </span>
      </div>

      {/* 수치 3열 */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <p style={{ fontSize: 11, color: "#c8bfb0", marginBottom: 4 }}>수익률</p>
          <p
            className="num"
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: isPos ? "#7ed4a0" : "#f07878",
              fontFamily: "var(--font-inter)",
            }}
          >
            {isPos ? "+" : ""}{summary.returnRate}%
          </p>
        </div>
        <div>
          <p style={{ fontSize: 11, color: "#c8bfb0", marginBottom: 4 }}>거래</p>
          <p className="num" style={{ fontSize: 18, fontWeight: 600, color: "#e8e0d0", fontFamily: "var(--font-inter)" }}>
            {summary.tradeCount}건
          </p>
        </div>
        <div>
          <p style={{ fontSize: 11, color: "#c8bfb0", marginBottom: 4 }}>손익</p>
          <p
            className="num"
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: summary.profitPoints >= 0 ? "#7ed4a0" : "#f07878",
              fontFamily: "var(--font-inter)",
            }}
          >
            {summary.profitPoints >= 0 ? "+" : ""}{summary.profitPoints.toLocaleString()}P
          </p>
        </div>
      </div>

      {/* 화살표 */}
      <div className="flex justify-end mt-3">
        <span style={{ fontSize: 13, color: "#FACA3E" }}>리포트 보기 →</span>
      </div>
    </button>
  );
}

// ── 메인 페이지 ─────────────────────────────────────────────
export default function ReportListPage() {
  const router                    = useRouter();
  const { user, userRow, loading } = useAuth();

  const [reports,      setReports]      = useState<ReportMeta[]>([]);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [optedIn,      setOptedIn]      = useState(false);
  const [showModal,    setShowModal]    = useState(false);
  const [optInLoading, setOptInLoading] = useState(false);
  const [generating,   setGenerating]   = useState(false);
  const [genError,     setGenError]     = useState("");

  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user || !userRow) return;

    // 옵트인 상태 확인
    const opted = (userRow as { report_opted_in?: boolean }).report_opted_in ?? false;
    setOptedIn(opted);
    if (!opted) {
      setShowModal(true);
      setFetchLoading(false);
      return;
    }

    // 리포트 목록 조회
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/insights/report", {
        headers: { Authorization: `Bearer ${session?.access_token ?? ""}` },
      });
      const json = await res.json();
      setReports(json.reports ?? []);
      setFetchLoading(false);
    })();
  }, [user, userRow]);

  async function handleGenerate() {
    if (!user || generating) return;
    setGenerating(true);
    setGenError("");
    const { data: { session } } = await supabase.auth.getSession();
    const res  = await fetch("/api/insights/report/generate", {
      method:  "POST",
      headers: {
        Authorization:  `Bearer ${session?.access_token ?? ""}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ market: "all" }),
    });
    const json = await res.json();
    setGenerating(false);
    if (!res.ok || !json.ok) {
      setGenError(json.error ?? "리포트 생성에 실패했어요. 이번 주 거래 내역을 확인해주세요.");
      return;
    }
    // 생성 완료 → 목록 새로 고침 후 첫 리포트로 이동
    if (json.redirect) {
      router.push(json.redirect);
    }
  }

  async function handleOptIn() {
    if (!user) return;
    setOptInLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    await fetch("/api/insights/report", {
      method: "POST",
      headers: { Authorization: `Bearer ${session?.access_token ?? ""}` },
    });
    setOptedIn(true);
    setShowModal(false);
    setOptInLoading(false);
    setFetchLoading(false);
  }

  if (loading || !user || !userRow) return null;

  // 주차별 그룹핑 (KR + US 묶기)
  const weekMap = new Map<string, ReportMeta[]>();
  for (const r of reports) {
    const list = weekMap.get(r.week_start) ?? [];
    list.push(r);
    weekMap.set(r.week_start, list);
  }
  const weeks = [...weekMap.entries()].sort((a, b) => b[0].localeCompare(a[0]));

  return (
    <main
      className="min-h-screen"
      style={{ background: "#0d0d0d", fontFamily: "var(--font-paperlogy), var(--font-noto), sans-serif" }}
    >
      {/* 옵트인 팝업 */}
      {showModal && (
        <OptInModal
          onConfirm={handleOptIn}
          onDismiss={() => { setShowModal(false); router.back(); }}
          loading={optInLoading}
        />
      )}

      {/* 네비게이션 */}
      <nav
        className="sticky top-0 z-30 border-b flex items-center px-6"
        style={{ height: 56, background: "rgba(13,13,13,0.96)", backdropFilter: "blur(20px)", borderColor: "rgba(255,255,255,0.06)" }}
      >
        <Link href="/mypage" style={{ fontSize: 13, color: "#c8bfb0", textDecoration: "none" }}>{"<"} 내 정보</Link>
        <span style={{ fontFamily: "var(--font-serif)", fontSize: 20, color: "#FACA3E", marginLeft: 16 }}>PICO</span>
      </nav>

      <div
        className="mx-auto py-8"
        style={{ maxWidth: 700, paddingLeft: "clamp(16px, 4vw, 24px)", paddingRight: "clamp(16px, 4vw, 24px)" }}
      >
        {/* 헤더 */}
        <div className="mb-6">
          <h1 style={{ fontSize: 22, fontWeight: 600, color: "#e8e0d0", marginBottom: 4 }}>
            AI 주간 리포트
          </h1>
          <p style={{ fontSize: 14, color: "#c8bfb0" }}>
            나의 한 주간 피코 플레이를 AI가 분석해드려요
          </p>
        </div>

        {/* 발송 일정 안내 */}
        {optedIn && (
          <div
            className="rounded-2xl px-4 py-3 mb-6 flex items-center gap-3"
            style={{ background: "rgba(250,202,62,0.06)", border: "0.5px solid rgba(250,202,62,0.18)" }}
          >
            <span style={{ fontSize: 16 }}>🕐</span>
            <div>
              <p style={{ fontSize: 12, color: "#FACA3E", fontWeight: 500, marginBottom: 2 }}>발송 일정</p>
              <p style={{ fontSize: 12, color: "#c8bfb0" }}>
                <span style={{ color: MARKET_COLOR.kr }}>한국 주식</span> 매주 금요일 오후 5시 &nbsp;·&nbsp;
                <span style={{ color: MARKET_COLOR.us }}>해외 주식</span> 매주 토요일 낮 12시
              </p>
            </div>
          </div>
        )}

        {/* 콘텐츠 */}
        {fetchLoading ? (
          <div className="flex flex-col gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl h-28 animate-pulse" style={{ background: "#1a1a1a" }} />
            ))}
          </div>
        ) : !optedIn ? null : weeks.length === 0 ? (
          <>
            {genError && (
              <div
                className="rounded-xl px-4 py-3 mb-3"
                style={{ background: "rgba(240,120,120,0.08)", border: "0.5px solid rgba(240,120,120,0.25)" }}
              >
                <p style={{ fontSize: 13, color: "#f07878" }}>{genError}</p>
              </div>
            )}
            <WaitingState onGenerate={handleGenerate} generating={generating} />
          </>
        ) : (
          <div className="flex flex-col gap-3">
            {weeks.map(([weekStart, weekReports]) => (
              <div key={weekStart}>
                {/* 주차 구분선 */}
                {weekReports.length === 2 && (
                  <p style={{ fontSize: 12, color: "#c8bfb0", marginBottom: 8, marginLeft: 4 }}>
                    {new Date(weekStart + "T00:00:00").toLocaleDateString("ko-KR", {
                      year: "numeric", month: "long", day: "numeric",
                    })} 주
                  </p>
                )}
                <div className="flex flex-col gap-2">
                  {/* US 먼저, KR 다음 (발송 역순) */}
                  {[...weekReports].sort((a) => a.market === "us" ? -1 : 1).map((r) => (
                    <ReportCard key={r.id} report={r} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
