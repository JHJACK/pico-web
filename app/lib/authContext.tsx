"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
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

  async function loadUserRow(u: User) {
    let row = await getUserRow(u.id);
    if (!row) {
      await createUserRow(u.id, u.email ?? "");
      row = await getUserRow(u.id);
    }
    setUserRow(row);
  }

  async function refreshUserRow() {
    if (user) await loadUserRow(user);
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
      if (u) loadUserRow(u).finally(() => setLoading(false));
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) loadUserRow(u);
      else setUserRow(null);
    });

    // 매수/매도 후 포인트 즉시 반영
    const onPointsRefresh = () => { if (user) loadUserRow(user); };
    window.addEventListener("pico:points:refresh", onPointsRefresh);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("pico:points:refresh", onPointsRefresh);
    };
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, userRow, loading, refreshUserRow, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
