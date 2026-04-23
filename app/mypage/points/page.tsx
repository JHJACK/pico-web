"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/app/lib/authContext";
import { getPointHistory, type PointHistoryRow } from "@/app/lib/supabase";

export default function PointsPage() {
  const router = useRouter();
  const { user, userRow, loading } = useAuth();
  const [history, setHistory] = useState<PointHistoryRow[]>([]);
  const [fetched, setFetched] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/mypage");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    getPointHistory(user.id).then((rows) => {
      setHistory(rows);
      setFetched(true);
    });
  }, [user]);

  if (loading) return null;
  if (!user || !userRow) return null;

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
        <Link href="/mypage" style={{ fontSize: 13, color: "#c8bfb0", textDecoration: "none" }}>{"<"} 내 정보</Link>
        <span style={{ fontFamily: "var(--font-serif)", fontSize: 20, color: "#FACA3E", marginLeft: 16 }}>PICO</span>
      </nav>

      <div
        className="page-container mx-auto py-8"
        style={{ maxWidth: 700, paddingLeft: "clamp(16px, 4vw, 24px)", paddingRight: "clamp(16px, 4vw, 24px)" }}
      >
        {/* ── 헤더 ── */}
        <div className="mb-8">
          <p style={{ fontSize: 13, fontWeight: 400, color: "#c8bfb0", marginBottom: 8, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            포인트 내역
          </p>
          <p style={{ fontFamily: "var(--font-inter)", fontSize: 36, fontWeight: 500, color: "#FACA3E", letterSpacing: "-0.03em", lineHeight: 1 }}>
            {userRow.total_points.toLocaleString()}P
          </p>
          <p style={{ fontSize: 13, fontWeight: 300, color: "#c8bfb0", marginTop: 6 }}>누적 포인트</p>
        </div>

        {/* ── 내역 리스트 ── */}
        <div className="rounded-2xl border" style={{ background: "#141414", borderColor: "rgba(255,255,255,0.08)" }}>
          {!fetched ? null : history.length === 0 ? (
            <p style={{ fontSize: 13, fontWeight: 300, color: "#c8bfb0", padding: "32px 20px", textAlign: "center" }}>
              아직 포인트 내역이 없어요
            </p>
          ) : (
            history.map((item, i) => {
              const d = new Date(item.created_at);
              const label = `${d.getMonth() + 1}월 ${d.getDate()}일 ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between px-5 py-4"
                  style={{ borderBottom: i < history.length - 1 ? "0.5px solid rgba(255,255,255,0.05)" : "none" }}
                >
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 400, color: "#c8bfb0" }}>{item.reason}</p>
                    <p style={{ fontSize: 12, fontWeight: 300, color: "#c8bfb0", marginTop: 3 }}>{label}</p>
                  </div>
                  <span style={{ fontFamily: "var(--font-inter)", fontSize: 16, fontWeight: 500, color: "#FACA3E", letterSpacing: "-0.02em" }}>
                    +{item.points.toLocaleString()}P
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </main>
  );
}
