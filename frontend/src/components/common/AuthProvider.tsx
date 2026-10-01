import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../../services/api";
import type { PublicUser } from "../../types";

type AuthContextValue = {
  user: PublicUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  enter: (name: string) => Promise<PublicUser>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const result = await api.me();
      setUser(result.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const enter = useCallback(async (name: string) => {
    const result = await api.guest(name.trim());
    setUser(result.user);
    localStorage.setItem("freemeet-name", result.user.name);
    return result.user;
  }, []);

  const logout = useCallback(async () => {
    await api.logout();
    setUser(null);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(() => ({ user, loading, refresh, enter, logout }), [user, loading, refresh, enter, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used within AuthProvider");
  return value;
}
