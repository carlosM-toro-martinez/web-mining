import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren
} from "react";
import type { AuthSession, AuthUser } from "@/features/auth/model/auth.schema";
import {
  clearStoredAuthSession,
  getStoredAuthSession,
  setStoredAuthSession
} from "@/features/auth/lib/authSessionStorage";
import { clearAuthToken, isAuthTokenExpired, setAuthToken } from "@/shared/lib/authToken";

interface AuthContextValue {
  session: AuthSession | null;
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (session: AuthSession) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<AuthSession | null>(() => {
    const stored = getStoredAuthSession();
    if (stored) setAuthToken(stored.token);
    return stored;
  });

  const value = useMemo<AuthContextValue>(() => {
    const login = (nextSession: AuthSession) => {
      setSession(nextSession);
      setStoredAuthSession(nextSession);
      setAuthToken(nextSession.token);
    };

    const logout = () => {
      setSession(null);
      clearStoredAuthSession();
      clearAuthToken();
    };

    return {
      session,
      user: session?.user ?? null,
      token: session?.token ?? null,
      isAuthenticated: Boolean(session?.token),
      isAdmin: session?.user.role === "ADMIN",
      login,
      logout
    };
  }, [session]);

  useEffect(() => {
    if (!session?.token) return;

    const validateToken = () => {
      if (isAuthTokenExpired(session.token)) {
        setSession(null);
        clearStoredAuthSession();
        clearAuthToken();
      }
    };

    validateToken();
    const intervalId = window.setInterval(validateToken, 30_000);
    const onVisibilityChange = () => {
      if (!document.hidden) validateToken();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [session?.token]);

  useEffect(() => {
    const onUnauthorized = () => {
      setSession(null);
      clearStoredAuthSession();
      clearAuthToken();
    };

    window.addEventListener("auth:unauthorized", onUnauthorized);
    return () => window.removeEventListener("auth:unauthorized", onUnauthorized);
  }, []);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
