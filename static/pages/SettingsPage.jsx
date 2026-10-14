import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAppState } from "../appState.jsx";
import "./SettingsPage.css";

export default function SettingsPage() {
  const location = useLocation();
  const { profile, updateProfile, theme, setTheme, showToast, isSignedIn, signOut } = useAppState();
  const [form, setForm] = useState(profile);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(profile);
  }, [profile]);

  const saveProfile = async (event) => {
    event.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      showToast("Name and email are required");
      return;
    }
    setSaving(true);
    try {
      await updateProfile({ ...form, name: form.name.trim(), email: form.email.trim() });
      showToast("Workspace profile saved");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not save profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="settings-page page-content">
      <div className="page-heading"><div className="eyebrow small-eyebrow">MAKE HUECRAFT YOURS</div><h1>Profile &amp; settings.</h1><p>Manage your Huecraft profile and preferences.</p></div>
      <div className="settings-layout">
        <form className="settings-panel profile-settings" onSubmit={saveProfile}><div className="settings-panel-heading"><span className="settings-icon">◉</span><div><h2>Profile information</h2><p>Changes are saved to your Huecraft account.</p></div></div>
          <label>Display name<input value={form.name} disabled={!isSignedIn} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} /></label>
          <label>Email address<input type="email" value={form.email} disabled={!isSignedIn} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} /></label>
          <label>About you<input value={form.role} disabled={!isSignedIn} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))} /></label>
          <button type="submit" disabled={!isSignedIn || saving}>{saving ? "Saving..." : "Save profile"}</button>
        </form>
        <section className="settings-panel"><div className="settings-panel-heading"><span className="settings-icon">◐</span><div><h2>Appearance</h2><p>Choose how Huecraft looks on this device.</p></div></div>
          <div className="appearance-options"><button type="button" className={theme === "light" ? "selected" : ""} aria-pressed={theme === "light"} onClick={() => setTheme("light")}><span className="theme-sample theme-sample-light">Aa</span><strong>Light</strong></button><button type="button" className={theme === "dark" ? "selected" : ""} aria-pressed={theme === "dark"} onClick={() => setTheme("dark")}><span className="theme-sample theme-sample-dark">Aa</span><strong>Dark</strong></button></div>
          <p className="settings-note">Your theme preference is saved in this browser and applies across all pages.</p>
        </section>
        <section className="settings-panel account-settings"><div className="settings-panel-heading"><span className="settings-icon">⌁</span><div><h2>Account &amp; sign-in</h2><p>{isSignedIn ? "Your account is active." : "Sign in or create an account to sync your profile."}</p></div></div>
          <div className="account-notice">
            <strong>{isSignedIn ? "Signed in securely" : "Account required"}</strong>
            <p>Your Huecraft account is stored on the server. Your password is hashed, and your sign-in session uses a protected cookie.</p>
            {isSignedIn
              ? <button className="settings-account-action" type="button" onClick={async () => {
                try {
                  await signOut();
                } catch (error) {
                  showToast(error instanceof Error ? error.message : "Could not sign out");
                }
              }}>Sign out</button>
              : <Link className="settings-account-action" to="/signup" state={{ backgroundLocation: location }}>Create account</Link>}
          </div>
        </section>
      </div>
    </div>
  );
}
