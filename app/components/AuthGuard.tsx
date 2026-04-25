"use client";
import { useAuth } from "@/app/lib/authContext";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
}

export default function AuthGuard({ children }: Props) {
  const { user, loading } = useAuth();
  const router = useRouter();

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#0d0d0d", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "#5c5448", fontSize: 14 }}>로딩 중...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ position: "relative", minHeight: "100vh", overflow: "hidden" }}>
        <div style={{ filter: "blur(8px)", pointerEvents: "none", userSelect: "none" }}>
          {children}
        </div>
        <div style={{
          position: "fixed", inset: 0, zIndex: 50,
          background: "rgba(0,0,0,0.65)",
          backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "0 24px",
        }}>
          <div style={{
            background: "#141414",
            border: "0.5px solid rgba(255,255,255,0.08)",
            borderRadius: 20,
            padding: "40px 36px",
            textAlign: "center",
            maxWidth: 360,
            width: "100%",
          }}>
            <div style={{ fontSize: 32, marginBottom: 16 }}>🔐</div>
            <div style={{
              fontSize: 20, fontWeight: 600, color: "#e8e0d0", marginBottom: 8,
              fontFamily: "var(--font-paperlogy), var(--font-noto), sans-serif",
            }}>
              로그인이 필요해요
            </div>
            <div style={{ fontSize: 14, color: "#c8bfb0", marginBottom: 28, lineHeight: 1.6 }}>
              이 페이지는 로그인 후에<br />이용할 수 있어요.
            </div>
            <button
              onClick={() => router.push("/?openLogin=1")}
              className="pico-btn"
              style={{
                width: "100%", padding: "14px 0",
                background: "#FACA3E", color: "#0d0d0d",
                fontWeight: 600, fontSize: 15,
                border: "none", borderRadius: 12, cursor: "pointer",
                marginBottom: 10,
              }}
            >
              로그인하기
            </button>
            <button
              onClick={() => router.push("/?openLogin=1")}
              className="pico-btn"
              style={{
                width: "100%", padding: "12px 0",
                background: "transparent", color: "#c8bfb0",
                fontWeight: 500, fontSize: 13,
                border: "0.5px solid rgba(255,255,255,0.1)", borderRadius: 12, cursor: "pointer",
              }}
            >
              회원가입
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
