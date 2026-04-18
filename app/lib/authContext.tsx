"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase, getUserRow, createUserRow, type UserRow } from "./supabase";

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<User | null>(null);
  const [userRow, setUserRow] = useState<UserRow | null>(null);
  const [loading, setLoading] = useState(true);

  // ref로 user를 추적 — 이벤트 리스너에서 stale closure 없이 항상 최신 user 참조
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

  // auth 구독 — 최초 1회만 등록 (빈 deps 배열 유지)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) loadUserRow(u).finally(() => setLoading(false));
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) loadUserRow(u);
      else setUserRow(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 포인트 갱신 이벤트 — ref로 user 접근하므로 deps 없이 1회 등록
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
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
