import React, { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useAppState } from "../appState.jsx";
import Brand from "./Brand.jsx";

const links = [
  { to: "/", label: "Home", icon: "⌂", end: true },
  { to: "/explore", label: "Explore palettes", icon: "◈" },
  { to: "/assistant", label: "AI assistant", icon: "✳", badge: "NEW" },
  { to: "/collections", label: "Collections", icon: "▤" },
  { to: "/preview", label: "Preview", icon: "◱" },
];

export default function Sidebar() {
  const { sidebarCollapsed, setSidebarCollapsed, isSignedIn, signOut, profile, showToast } = useAppState();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const pageScrollPosition = useRef(0);
  const location = useLocation();
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const matchesSearch = (label) => label.toLowerCase().includes(normalizedQuery);
  const matchingLinks = links.filter((link) => matchesSearch(link.label));
  const hasSearchResults = matchingLinks.length > 0
    || matchesSearch("Settings")
    || matchesSearch(isSignedIn ? "Sign out" : "Sign in");

  useEffect(() => {
    setMobileMenuOpen(false);
    setSearchQuery("");
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileMenuOpen) return undefined;

    const root = document.documentElement;
    const body = document.body;
    const previousRootOverflow = root.style.overflow;
    const previousBodyStyles = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      overflow: body.style.overflow,
    };
    pageScrollPosition.current = window.scrollY;
    root.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${pageScrollPosition.current}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    body.style.overflow = "hidden";

    return () => {
      root.style.overflow = previousRootOverflow;
      Object.assign(body.style, previousBodyStyles);
      window.requestAnimationFrame(() => {
        window.scrollTo(0, pageScrollPosition.current);
      });
    };
  }, [mobileMenuOpen]);

  return (
    <aside className={`sidebar${mobileMenuOpen ? " mobile-menu-open" : ""}`}>
      <div className="sidebar-brand-row">
        <Brand />
        <button
          className="mobile-menu-toggle"
          type="button"
          aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-sidebar-menu"
          onClick={() => setMobileMenuOpen((open) => !open)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            {mobileMenuOpen
              ? <path d="m6 6 12 12M18 6 6 18" />
              : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
        <button
          className="sidebar-toggle"
          type="button"
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!sidebarCollapsed}
          title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={() => setSidebarCollapsed((current) => !current)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d={sidebarCollapsed ? "m9 18 6-6-6-6M4 5v14" : "m15 18-6-6 6-6M20 5v14"} />
          </svg>
        </button>
      </div>
      <div className="sidebar-menu" id="mobile-sidebar-menu">
        <div className="mobile-workspace-card">
          <Brand />
          <div className="mobile-workspace-copy">
            <strong>{profile.name || "Workspace"}</strong>
            <span>Personal color workspace</span>
          </div>
          <span className="mobile-workspace-indicator" aria-hidden="true">⌄</span>
        </div>
        <label className="mobile-nav-search">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.3" /><path d="m16 16 4.5 4.5" /></svg>
          <span className="visually-hidden">Search navigation</span>
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search"
          />
          <kbd aria-hidden="true">⌕</kbd>
        </label>
        <div className="sidebar-section-label">WORKSPACE</div>
        <nav className="sidebar-nav" aria-label="Main navigation">
          {matchingLinks.map((link) => (
            <NavLink
              aria-label={link.label}
              className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}
              title={link.label}
              end={link.end}
              key={link.to}
              to={link.to}
              onClick={() => setMobileMenuOpen(false)}
            >
              <span className="sidebar-icon" aria-hidden="true">{link.icon}</span>
              <span className="sidebar-link-label">{link.label}</span>
              {link.badge && <span className="new-pill">{link.badge}</span>}
            </NavLink>
          ))}
          {!hasSearchResults && (
            <p className="mobile-nav-empty">No pages match “{searchQuery}”.</p>
          )}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-section-label">PREFERENCES</div>
          {matchesSearch("Settings") && (
            <NavLink aria-label="Settings" className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`} title="Settings" to="/settings" onClick={() => setMobileMenuOpen(false)}>
              <span className="sidebar-icon" aria-hidden="true">⚙</span>
              <span className="sidebar-link-label">Settings</span>
            </NavLink>
          )}
          {!isSignedIn ? (
            matchesSearch("Sign in") && <Link className="sidebar-link sidebar-account-link" aria-label="Sign in" title="Sign in" to="/login" state={{ backgroundLocation: location }} onClick={() => setMobileMenuOpen(false)}>
              <span className="sidebar-icon" aria-hidden="true">↪</span>
              <span className="sidebar-link-label">Sign in</span>
            </Link>
          ) : (
            matchesSearch("Sign out") && <button className="sidebar-link mobile-sign-out" type="button" onClick={async () => {
              setMobileMenuOpen(false);
              try {
                await signOut();
              } catch (error) {
                showToast(error instanceof Error ? error.message : "Could not sign out");
              }
            }}>
              <span className="sidebar-icon" aria-hidden="true">↪</span>
              <span className="sidebar-link-label">Sign out</span>
            </button>
          )}
          {!normalizedQuery && <div className="sidebar-note"><span>✳</span><p>Thoughtful color for the things you make.</p></div>}
        </div>
      </div>
    </aside>
  );
}
