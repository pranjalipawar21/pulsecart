import { createContext, useContext, useState, useCallback } from "react";

const AuthContext = createContext(null);

const API = process.env.REACT_APP_API_URL || "http://localhost:5001";

export function AuthProvider({ children }) {
  const [user,  setUser]  = useState(() => {
    try { return JSON.parse(localStorage.getItem("pc_user")) || null; } catch { return null; }
  });
  const [token, setToken] = useState(() => localStorage.getItem("pc_token") || null);

  const login = useCallback(async (username, password) => {
    const res = await fetch(`${API}/api/auth/login`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Login failed");
    localStorage.setItem("pc_token", data.token);
    localStorage.setItem("pc_user",  JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("pc_token");
    localStorage.removeItem("pc_user");
    setToken(null);
    setUser(null);
  }, []);

  /** Fetch wrapper that injects the Bearer token */
  const apiFetch = useCallback(async (path, opts = {}) => {
    const res = await fetch(`${API}${path}`, {
      ...opts,
      headers: {
        "Content-Type": "application/json",
        Authorization:  token ? `Bearer ${token}` : "",
        ...opts.headers,
      },
    });
    if (res.status === 401) { logout(); throw new Error("Session expired"); }
    return res;
  }, [token, logout]);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, apiFetch, isOwner: user?.role === "owner" }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
