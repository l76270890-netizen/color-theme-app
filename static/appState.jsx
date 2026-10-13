import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { palettes } from "./paletteData.js";

const AppStateContext = createContext(null);

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

async function hashPassword(password, salt) {
  const material = await window.crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await window.crypto.subtle.deriveBits({
    name: "PBKDF2",
    salt: Uint8Array.from(atob(salt), (character) => character.charCodeAt(0)),
    iterations: 210000,
    hash: "SHA-256",
  }, material, 256);
  return Array.from(new Uint8Array(bits), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function makeSalt() {
  const bytes = window.crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes));
}

export function AppStateProvider({ children }) {
  const [theme, setTheme] = usePersistentState("huecraft-theme", "dark");
  const [sidebarCollapsed, setSidebarCollapsed] = usePersistentState("huecraft-sidebar-collapsed", false);
  const [favorites, setFavorites] = usePersistentState("huecraft-favorites", []);
  const [accounts, setAccounts] = usePersistentState("huecraft-demo-accounts", []);
  const [currentUserEmail, setCurrentUserEmail] = usePersistentState("huecraft-current-user", "");
  const [collections, setCollections] = usePersistentState("huecraft-collections", [
    { id: "inspiration", name: "Inspiration", paletteIds: [] },
  ]);
  const [profile, setProfile] = usePersistentState("huecraft-profile", {
    ...emptyProfile,
  });
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const showToast = (message) => setToast(message);

  const signUp = async ({ name, email, password }) => {
    const normalizedEmail = email.trim().toLowerCase();
    if (accounts.some((account) => account.email === normalizedEmail)) {
      throw new Error("An account with this email already exists in this browser");
    }
    const salt = makeSalt();
    const accountProfile = { name: name.trim(), email: normalizedEmail, role: "Designer & developer" };
    const passwordHash = await hashPassword(password, salt);
    setAccounts((current) => [...current, { ...accountProfile, salt, passwordHash }]);
    setProfile(accountProfile);
    setCurrentUserEmail(normalizedEmail);
    showToast("Your local Huecraft account is ready");
  };

  const signIn = async ({ email, password }) => {
    const normalizedEmail = email.trim().toLowerCase();
    const account = accounts.find((item) => item.email === normalizedEmail);
    if (!account || await hashPassword(password, account.salt) !== account.passwordHash) {
      throw new Error("Email or password is incorrect");
    }
    setProfile({ name: account.name, email: account.email, role: account.role });
    setCurrentUserEmail(account.email);
    showToast(`Welcome back, ${account.name}`);
  };

  const updateProfile = (nextProfile) => {
    const normalizedEmail = nextProfile.email.trim().toLowerCase();
    if (currentUserEmail && accounts.some((account) => account.email === normalizedEmail && account.email !== currentUserEmail)) {
      throw new Error("That email is already used by another local account");
    }
    const savedProfile = { ...nextProfile, email: normalizedEmail };
    setProfile(savedProfile);
    if (currentUserEmail) {
      setAccounts((current) => current.map((account) => account.email === currentUserEmail
        ? { ...account, ...savedProfile }
        : account));
      setCurrentUserEmail(normalizedEmail);
    }
    return savedProfile;
  };

  const signOut = () => {
    setCurrentUserEmail("");
    setProfile(emptyProfile);
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
    isSignedIn: Boolean(currentUserEmail),
    signUp,
    signIn,
    signOut,
    favorites,
    setFavorites,
    collections,
    setCollections,
    profile,
    setProfile,
    updateProfile,
    toast,
    showToast,
    copyText,
    toggleFavorite,
  }), [theme, sidebarCollapsed, favorites, accounts, currentUserEmail, collections, profile, toast]);

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
