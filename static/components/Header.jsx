import React from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useAppState } from "../appState.jsx";

const links = [
  { to: "/home", label: "Home", end: true },
  { to: "/explore", label: "Explore palettes" },
  { to: "/assistant", label: "AI assistant" },
  { to: "/collections", label: "Collections" },
];

export default function Header() {
  const { theme, setTheme, profile, isSignedIn } = useAppState();
  const location = useLocation();
  const accountNavigationState = { backgroundLocation: location };

  return (
    <header className="topbar">
      <div className="workspace-label"><span className="workspace-status" /> COLOR WORKSPACE</div>
      <nav className="topbar-nav" aria-label="Quick navigation">
        {links.map((link) => <NavLink key={link.to} end={link.end} to={link.to}>{link.label}</NavLink>)}
      </nav>
      <div className="topbar-actions">
        <button
          className="icon-button theme-toggle"
          type="button"
          aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
          title="Switch color mode"
          onClick={() => setTheme((current) => current === "dark" ? "light" : "dark")}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v2m0 14v2M5.64 5.64l1.42 1.42m9.88 9.88 1.42 1.42M3 12h2m14 0h2M5.64 18.36l1.42-1.42m9.88-9.88 1.42-1.42M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" /></svg>
        </button>
        {isSignedIn ? (
          <>
            <Link className="profile-button" to="/settings" aria-label={`Manage ${profile.name}'s profile`}>
              <span>{profile.name.slice(0, 1).toUpperCase()}</span>
              <span className="profile-name">{profile.name}</span>
            </Link>
          </>
        ) : (
          <>
            <Link className="header-login-link" to="/login" state={accountNavigationState}>Sign in</Link>
            <Link className="get-started-button" to="/signup" state={accountNavigationState}>Create account</Link>
          </>
        )}
      </div>
    </header>
  );
}
