import { useState, useCallback } from "react";
import { authApi } from "../api/client";
import type { AuthUser } from "../api/client";

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const s = localStorage.getItem("proxmon_user");
      return s ? JSON.parse(s) : null;
    } catch {
      return null;
    }
  });

  const login = useCallback(async (username: string, password: string) => {
    const data = await authApi.login(username, password);
    localStorage.setItem("proxmon_token", data.token);
    localStorage.setItem("proxmon_user", JSON.stringify(data.user));
    setUser(data.user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("proxmon_token");
    localStorage.removeItem("proxmon_user");
    setUser(null);
  }, []);

  return { user, login, logout, isAdmin: user?.role === "admin", isViewer: user?.role === "viewer" };
}
