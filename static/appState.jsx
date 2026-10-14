import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { palettes } from "./paletteData.js";

const AppStateContext = createContext(null);
const API_BASE_URL = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

function readStoredValue(key, fallback) {
  try {
    const stored = window.localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch (error) {
    console.warn(`Could not read saved ${key} settings:`, error);
    return fallback;
  }
}

function usePersistentState(key, fallback) {
  const [value, setValue] = useState(() => readStoredValue(key, fallback));
  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn(`Could not save ${key} settings:`, error);
    }
  }, [key, value]);
  return [value, setValue];
}

const emptyProfile = { name: "Workspace", email: "", role: "Designer & developer" };

async function authRequest(path, { method = "GET", body } = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}/api/auth${path}`, {
      method,
      credentials: "include",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error("Could not reach the authentication server. Make sure the backend is running.");
  }

  if (response.status === 204) return null;

  const result = await response.json();
  if (!response.ok) {
    const detail = result.detail;
    const message = Array.isArray(detail)
      ? detail.map((item) => item.msg).join(" ")
      : detail;
    throw new Error(typeof message === "string" ? message : "Could not complete that action.");
  }
  return result;
}

function toProfile(user) {
  return { name: user.name, email: user.email, role: user.role };
}

export function AppStateProvider({ children }) {
  const [theme, setTheme] = usePersistentState("huecraft-theme", "dark");
  const [sidebarCollapsed, setSidebarCollapsed] = usePersistentState("huecraft-sidebar-collapsed", false);
  const [favorites, setFavorites] = usePersistentState("huecraft-favorites", []);
  const [collections, setCollections] = usePersistentState("huecraft-collections", [
    { id: "inspiration", name: "Inspiration", paletteIds: [] },
  ]);
  const [profile, setProfile] = useState(emptyProfile);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    try {
      for (const key of ["huecraft-demo-accounts", "huecraft-current-user", "huecraft-profile"]) {
        window.localStorage.removeItem(key);
      }
    } catch (error) {
      console.warn("Could not clear the old browser-only account data:", error);
    }

    let active = true;
    authRequest("/me")
      .then((user) => {
        if (!active) return;
        setProfile(toProfile(user));
        setIsSignedIn(true);
      })
      .catch((error) => {
        if (!active) return;
        if (!error.message.includes("Please sign in")) {
          console.error("Could not restore the authentication session:", error);
          setToast(error.message);
        }
        setProfile(emptyProfile);
        setIsSignedIn(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const showToast = (message) => setToast(message);

  const signUp = async ({ name, email, password }) => {
    const user = await authRequest("/signup", {
      method: "POST",
      body: { name, email, password },
    });
    const accountProfile = toProfile(user);
    setProfile(accountProfile);
    setIsSignedIn(true);
    showToast("Your Huecraft account is ready");
  };

  const signIn = async ({ email, password }) => {
    const user = await authRequest("/login", {
      method: "POST",
      body: { email, password },
    });
    setProfile(toProfile(user));
    setIsSignedIn(true);
    showToast(`Welcome back, ${user.name}`);
  };

  const updateProfile = async (nextProfile) => {
    const user = await authRequest("/me", {
      method: "PATCH",
      body: {
        name: nextProfile.name,
        email: nextProfile.email,
        role: nextProfile.role,
      },
    });
    const savedProfile = toProfile(user);
    setProfile(savedProfile);
    return savedProfile;
  };

  const signOut = async () => {
    await authRequest("/logout", { method: "POST" });
    setProfile(emptyProfile);
    setIsSignedIn(false);
    showToast("You have been signed out");
  };

  const copyText = async (text, message = "Copied to clipboard") => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(message);
    } catch (error) {
      console.error("Could not copy to clipboard:", error);
      showToast("Clipboard access is unavailable in this browser");
    }
  };

  const toggleFavorite = (paletteId) => {
    const palette = palettes.find((item) => item.id === paletteId);
    if (!palette) {
      showToast("That palette could not be found");
      return;
    }
    const isSaved = favorites.includes(paletteId);
    setFavorites((current) => isSaved
      ? current.filter((id) => id !== paletteId)
      : [...current, paletteId]);
    showToast(`${palette.name} ${isSaved ? "removed from" : "saved to"} favorites`);
  };

  const value = useMemo(() => ({
    theme,
    setTheme,
    sidebarCollapsed,
    setSidebarCollapsed,
    isSignedIn,
    signUp,
    signIn,
    signOut,
    favorites,
    setFavorites,
    collections,
    setCollections,
    profile,
    updateProfile,
    toast,
    showToast,
    copyText,
    toggleFavorite,
  }), [theme, sidebarCollapsed, isSignedIn, favorites, collections, profile, toast]);

  return (
    <AppStateContext.Provider value={value}>
      <div className={`page-shell${theme === "light" ? " theme-light" : ""}`}>
        {children}
        <div className="toast" role="status" aria-live="polite" data-visible={Boolean(toast)}>{toast}</div>
      </div>
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) throw new Error("useAppState must be used inside AppStateProvider");
  return context;
}
