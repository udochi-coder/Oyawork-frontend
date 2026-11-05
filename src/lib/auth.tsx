import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { get, hasSession, post, setTokens } from "./api";
import type { Me, Role } from "./types";

type AuthValue = {
  me: Me | null;
  loading: boolean;
  setSession: (tokens: { access: string; refresh: string }, user: Me) => void;
  refresh: () => Promise<Me | null>;
  setMe: (me: Me) => void;
  logout: () => void;
  switchMode: (role: Role) => Promise<Me>;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(hasSession());

  const refresh = useCallback(async () => {
    if (!hasSession()) {
      setMe(null);
      return null;
    }
    try {
      const data = await get<Me>("/me/");
      setMe(data);
      return data;
    } catch {
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const onLogout = () => setMe(null);
    window.addEventListener("oyawork:logout", onLogout);
    return () => window.removeEventListener("oyawork:logout", onLogout);
  }, [refresh]);

  const value: AuthValue = {
    me,
    loading,
    setMe,
    refresh,
    setSession: (tokens, user) => {
      setTokens(tokens.access, tokens.refresh);
      setMe(user);
      setLoading(false);
    },
    logout: () => {
      setTokens(null, null);
      setMe(null);
    },
    switchMode: async (role) => {
      const data = await post<Me>("/me/switch-mode/", { role });
      setMe(data);
      return data;
    },
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

/** The profile for the current mode. */
export function useProfile() {
  const { me } = useAuth();
  if (!me) return null;
  return me.role === "worker" ? me.worker_profile : me.employer_profile;
}
