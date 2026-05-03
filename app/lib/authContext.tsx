"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase, getUserRow, createUserRow, submitAttendanceOnly, todayKST, type UserRow } from "./supabase";

type AuthCtx = {
  user: User | null;
  userRow: UserRow | null;
  loading: boolean;
  refreshUserRow: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthCtx>({
  user: null,
  userRow: null,
  loading: true,
  refreshUserRow: async () => {},
  signOut: async () => {},
});

// ── 출석 토스트 ────────────────────────────────────────────────────────────────
type ToastState = { points: number; bonus: number } | null;

function AttendanceToast({ toast, onDismiss }: { toast: NonNullable<ToastState>; onDismiss: () => void }) {
  return (
    <>
      <style>{`
        @keyframes picoToastIn {
          from { opacity: 0; transform: translateX(-50%) translateY(16px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
      <div
        onClick={onDismiss}
        style={{
          position: "fixed",
          bottom: 96,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 9999,
          background: "#1c1c1c",
          border: "0.5px solid rgba(250,202,62,0.35)",
          borderRadius: 18,
          padding: "14px 20px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          boxShadow: "0 8px 32px rgba(0,0,0,0.55)",
          animation: "picoToastIn 0.35s cubic-bezier(0.34,1.56,0.64,1) both",
          whiteSpace: "nowrap",
          cursor: "pointer",
          fontFamily: "var(--font-paperlogy), var(--font-noto), sans-serif",
        }}
      >
        <span style={{ fontFamily: "var(--font-mona12-emoji)", fontSize: 24, lineHeight: 1 }}>⭐</span>
        <div>
          <p style={{ fontSize: 14, fontWeight: 600, color: "#e8e0d0", margin: 0, lineHeight: 1.3 }}>
            출석 완료!&ensp;
            <span style={{ fontFamily: "var(--font-mona12)", fontWeight: 700, color: "#FACA3E" }}>+50P</span>
          </p>
          {toast.bonus > 0 && (
            <p style={{ fontSize: 14, fontWeight: 400, color: "#FACA3E", margin: "3px 0 0", lineHeight: 1 }}>
              연속 출석 보너스 +{toast.bonus}P&ensp;
              <span style={{ fontFamily: "var(--font-mona12-emoji)" }}>🔥</span>
            </p>
          )}
        </div>
      </div>
    </>
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<User | null>(null);
  const [userRow, setUserRow] = useState<UserRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast]     = useState<ToastState>(null);

  const userRef = useRef<User | null>(null);
  useEffect(() => { userRef.current = user; }, [user]);

  async function loadUserRow(u: User) {
    let row = await getUserRow(u.id);
    if (!row) {
      await createUserRow(u.id, u.email ?? "");
      row = await getUserRow(u.id);
    }
    setUserRow(row);
  }

  // 로그인 후 오늘 첫 방문이면 자동 출석 처리
  async function autoAttend(u: User) {
    const today = todayKST();
    const key   = `pico_auto_attend_${u.id}`;
    if (localStorage.getItem(key) === today) return;

    const { alreadyAttended, bonusPoints } = await submitAttendanceOnly(u.id);
    localStorage.setItem(key, today);

    if (!alreadyAttended) {
      setToast({ points: 50, bonus: bonusPoints });
      window.dispatchEvent(new Event("pico:points:refresh"));
      setTimeout(() => setToast(null), 3800);
    }
  }

  async function refreshUserRow() {
    if (userRef.current) await loadUserRow(userRef.current);
  }

  async function signOut() {
    await supabase.auth.signOut();
    localStorage.clear();
    sessionStorage.clear();
    setUser(null);
    setUserRow(null);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        loadUserRow(u).then(() => autoAttend(u)).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) { loadUserRow(u).then(() => autoAttend(u)); }
      else setUserRow(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const onPointsRefresh = () => {
      if (userRef.current) loadUserRow(userRef.current);
    };
    window.addEventListener("pico:points:refresh", onPointsRefresh);
    return () => window.removeEventListener("pico:points:refresh", onPointsRefresh);
  }, []);

  return (
    <AuthContext.Provider value={{ user, userRow, loading, refreshUserRow, signOut }}>
      {children}
      {toast && <AttendanceToast toast={toast} onDismiss={() => setToast(null)} />}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
