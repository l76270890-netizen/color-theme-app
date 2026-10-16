import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { palettes } from "./paletteData.js";
import { getThemePaletteStyle, themePalettes } from "./themePalettes.js";

const AppStateContext = createContext(null);
const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();
const defaultApiUrl = import.meta.env.PROD
  ? "https://color-theme-app-production.up.railway.app"
  : "http://127.0.0.1:8000";
const selectedApiUrl = configuredApiUrl || defaultApiUrl;
const API_BASE_URL = (
  /^[a-z][a-z\d+.-]*:\/\//i.test(selectedApiUrl)
    ? selectedApiUrl
    : `https://${selectedApiUrl}`
).replace(/\/$/, "");

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

async function apiRequest(path, { method = "GET", body, keepalive = false } = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}/api${path}`, {
      method,
      credentials: "include",
      keepalive,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error("Could not reach the authentication server. Check VITE_API_URL and make sure Railway allows this site's origin in FRONTEND_ORIGINS.");
  }

  if (response.status === 204) return null;

  const responseText = await response.text();
  let result;
  try {
    result = responseText ? JSON.parse(responseText) : null;
  } catch {
    throw new Error(`The server returned an unreadable response (HTTP ${response.status}).`);
  }
  if (!response.ok) {
    const detail = result?.detail;
    const message = Array.isArray(detail)
      ? detail.map((item) => item.msg).join(" ")
      : detail;
    throw new Error(typeof message === "string" ? message : "Could not complete that action.");
  }
  if (result === null) {
    throw new Error(`The server returned an empty response (HTTP ${response.status}).`);
  }
  return result;
}

export function requestAssistant(payload) {
  return apiRequest("/ai/chat", { method: "POST", body: payload });
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
  const [themePaletteIndex, setThemePaletteIndex] = usePersistentState("huecraft-theme-palette-index", 0);
  const [profile, setProfile] = useState(emptyProfile);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [workspaceReady, setWorkspaceReady] = useState(false);
  const [workspaceSyncEnabled, setWorkspaceSyncEnabled] = useState(false);
  const [assistantHistory, setAssistantHistory] = useState([]);
  const [assistantHistoryReady, setAssistantHistoryReady] = useState(false);
  const [toast, setToast] = useState("");
  const activeThemePalette = themePalettes[themePaletteIndex];

  useEffect(() => {
    const timer = window.setInterval(() => {
      setThemePaletteIndex((current) => (current + 1) % themePalettes.length);
    }, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    try {
      for (const key of ["huecraft-demo-accounts", "huecraft-current-user", "huecraft-profile"]) {
        window.localStorage.removeItem(key);
      }
    } catch (error) {
      console.warn("Could not clear the old browser-only account data:", error);
    }

    let active = true;
    const restoreSession = async () => {
      try {
        const user = await apiRequest("/auth/me");
        if (!active) return;
        setProfile(toProfile(user));
        setIsSignedIn(true);
        const [workspaceResult, historyResult] = await Promise.allSettled([
          apiRequest("/workspace"),
          apiRequest("/workspace/assistant-history"),
        ]);
        if (!active) return;
        if (workspaceResult.status === "fulfilled") {
          const workspace = workspaceResult.value;
          setTheme(workspace.theme);
          setSidebarCollapsed(workspace.sidebarCollapsed);
          setFavorites(workspace.favorites);
          setCollections(workspace.collections);
          setWorkspaceSyncEnabled(true);
        } else {
          console.error("Could not restore the saved workspace:", workspaceResult.reason);
          setToast(`Signed in, but could not restore your workspace: ${workspaceResult.reason.message}`);
        }
        if (historyResult.status === "fulfilled") {
          setAssistantHistory(historyResult.value);
        } else {
          console.error("Could not restore the saved AI conversation:", historyResult.reason);
          setToast(`Signed in, but could not restore your AI history: ${historyResult.reason.message}`);
        }
      } catch (error) {
        if (!active) return;
        if (!error.message.includes("Please sign in")) {
          console.error("Could not restore the authentication session:", error);
          setToast(error.message);
        }
        setProfile(emptyProfile);
        setIsSignedIn(false);
        setWorkspaceSyncEnabled(false);
        setAssistantHistory([]);
      } finally {
        if (active) {
          setWorkspaceReady(true);
          setAssistantHistoryReady(true);
        }
      }
    };
    restoreSession();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isSignedIn || !workspaceReady || !workspaceSyncEnabled) return undefined;
    const workspace = {
      theme,
      sidebarCollapsed,
      favorites,
      collections,
    };
    const timer = window.setTimeout(() => {
      apiRequest("/workspace", {
        method: "PUT",
        body: workspace,
      }).catch((error) => {
        console.error("Could not save the workspace:", error);
        setToast(`Could not save your workspace: ${error.message}`);
      });
    }, 350);
    const persistBeforeLeaving = () => {
      apiRequest("/workspace", {
        method: "PUT",
        body: workspace,
        keepalive: true,
      }).catch((error) => {
        console.error("Could not save the workspace before leaving:", error);
      });
    };
    window.addEventListener("pagehide", persistBeforeLeaving);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pagehide", persistBeforeLeaving);
    };
  }, [theme, sidebarCollapsed, favorites, collections, isSignedIn, workspaceReady, workspaceSyncEnabled]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const showToast = (message) => setToast(message);

  const signUp = async ({ name, email, password }) => {
    const user = await apiRequest("/auth/signup", {
      method: "POST",
      body: { name, email, password },
    });
    const accountProfile = toProfile(user);
    setProfile(accountProfile);
    setIsSignedIn(true);
    setAssistantHistory([]);
    await restoreWorkspaceForSignedInUser("Your Huecraft account is ready");
  };

  const signIn = async ({ email, password }) => {
    const user = await apiRequest("/auth/login", {
      method: "POST",
      body: { email, password },
    });
    setProfile(toProfile(user));
    setIsSignedIn(true);
    setAssistantHistory([]);
    await restoreWorkspaceForSignedInUser(`Welcome back, ${user.name}`);
  };

  const restoreWorkspaceForSignedInUser = async (successMessage) => {
    setWorkspaceReady(false);
    setWorkspaceSyncEnabled(false);
    setAssistantHistoryReady(false);
    const [workspaceResult, historyResult] = await Promise.allSettled([
      apiRequest("/workspace"),
      apiRequest("/workspace/assistant-history"),
    ]);
    if (workspaceResult.status === "fulfilled") {
      const workspace = workspaceResult.value;
      setTheme(workspace.theme);
      setSidebarCollapsed(workspace.sidebarCollapsed);
      setFavorites(workspace.favorites);
      setCollections(workspace.collections);
      setWorkspaceSyncEnabled(true);
      showToast(successMessage);
    } else {
      console.error("Could not restore the saved workspace:", workspaceResult.reason);
      showToast(`Signed in, but could not restore your workspace: ${workspaceResult.reason.message}`);
    }
    if (historyResult.status === "fulfilled") {
      setAssistantHistory(historyResult.value);
    } else {
      console.error("Could not restore the saved AI conversation:", historyResult.reason);
      showToast(`Signed in, but could not restore your AI history: ${historyResult.reason.message}`);
    }
    setWorkspaceReady(true);
    setAssistantHistoryReady(true);
  };

  const saveAssistantMessage = async (entry) => {
    const savedEntry = await apiRequest("/workspace/assistant-history", {
      method: "POST",
      body: {
        mode: entry.mode,
        prompt: entry.prompt,
        answer: entry.answer,
        palette: entry.palette ?? null,
      },
    });
    setAssistantHistory((current) => [...current, savedEntry].slice(-100));
    return savedEntry;
  };

  const updateProfile = async (nextProfile) => {
    const user = await apiRequest("/auth/me", {
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
    await apiRequest("/auth/logout", { method: "POST" });
    setProfile(emptyProfile);
    setIsSignedIn(false);
    setWorkspaceSyncEnabled(false);
    setAssistantHistory([]);
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
    activeThemePalette,
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
    assistantHistory,
    assistantHistoryReady,
    saveAssistantMessage,
    toast,
    showToast,
    copyText,
    toggleFavorite,
  }), [theme, activeThemePalette, sidebarCollapsed, isSignedIn, favorites, collections, profile, assistantHistory, assistantHistoryReady, toast]);

  return (
    <AppStateContext.Provider value={value}>
      <div
        className={`page-shell${theme === "light" ? " theme-light" : ""}`}
        data-color-combo={themePalettes[themePaletteIndex].id}
        style={getThemePaletteStyle(themePalettes[themePaletteIndex], theme)}
      >
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
