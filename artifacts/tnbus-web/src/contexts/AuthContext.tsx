import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type UserRole = "passenger" | "admin" | "conductor" | "driver";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  phone: string;
  walletBalance: string;
  rewardPoints: number;
  role: UserRole;
  crewId: number | null;
  createdAt: string;
}

// Where each role lands after signing in.
export function roleHome(role: UserRole | undefined): string {
  switch (role) {
    case "admin":
      return "/admin";
    case "conductor":
      return "/conductor";
    case "driver":
      return "/driver";
    default:
      return "/dashboard";
  }
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  signup: (name: string, email: string, phone: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {
    throw new Error("AuthProvider not mounted");
  },
  signup: async () => {
    throw new Error("AuthProvider not mounted");
  },
  logout: async () => {},
  refresh: async () => {},
});

const API = `${import.meta.env.BASE_URL}api`.replace(/\/+/g, "/").replace(/^\//, "/");

async function apiPost(path: string, body: object) {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Request failed");
  return data;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const res = await fetch(`${API}/auth/me`, { credentials: "include" });
      if (res.ok) {
        setUser(await res.json());
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const data = (await apiPost("/auth/login", { email, password })) as AuthUser;
    setUser(data);
    return data;
  };

  const signup = async (name: string, email: string, phone: string, password: string) => {
    const data = (await apiPost("/auth/signup", { name, email, phone, password })) as AuthUser;
    setUser(data);
    return data;
  };

  const logout = async () => {
    await apiPost("/auth/logout", {});
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
