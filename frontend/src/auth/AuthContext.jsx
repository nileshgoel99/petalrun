import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  clearStoredToken,
  getMe,
  getSignupInfo,
  getStoredToken,
  loginUser,
  logoutUser,
  registerUser,
  setStoredToken,
} from "../api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [signupInfo, setSignupInfo] = useState(null);
  const [booting, setBooting] = useState(true);

  const refreshSignupInfo = useCallback(async () => {
    try {
      const info = await getSignupInfo();
      setSignupInfo(info);
      return info;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await refreshSignupInfo();
      const token = getStoredToken();
      if (!token) {
        if (!cancelled) setBooting(false);
        return;
      }
      try {
        const data = await getMe();
        if (!cancelled) {
          setUser(data.user);
          setSignupInfo((prev) => ({
            ...(prev || {}),
            seats_used: data.seats_used,
            seats_max: data.seats_max,
            can_signup: data.can_signup,
            upgrade_required: data.upgrade_required,
          }));
        }
      } catch {
        clearStoredToken();
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setBooting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshSignupInfo]);

  const login = async (payload) => {
    const data = await loginUser(payload);
    setStoredToken(data.token);
    setUser(data.user);
    await refreshSignupInfo();
    return data;
  };

  const register = async (payload) => {
    const data = await registerUser(payload);
    setStoredToken(data.token);
    setUser(data.user);
    await refreshSignupInfo();
    return data;
  };

  const logout = async () => {
    try {
      await logoutUser();
    } catch {
      // still clear local session
    }
    clearStoredToken();
    setUser(null);
    await refreshSignupInfo();
  };

  const value = useMemo(
    () => ({
      user,
      booting,
      signupInfo,
      isAuthenticated: Boolean(user),
      login,
      register,
      logout,
      refreshSignupInfo,
    }),
    [user, booting, signupInfo, refreshSignupInfo]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
