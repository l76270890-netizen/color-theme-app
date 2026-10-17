import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Brand from "../components/Brand.jsx";
import TypingHeading from "../components/TypingHeading.jsx";
import { useAppState } from "../appState.jsx";
import "./AccountPage.css";

export default function AccountPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const isSignUp = location.pathname === "/signup";
  const backgroundLocation = location.state?.backgroundLocation;
  const { isSignedIn, signIn, signUp, theme } = useAppState();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const closePage = () => {
    if (backgroundLocation) {
      navigate({
        pathname: backgroundLocation.pathname,
        search: backgroundLocation.search,
        hash: backgroundLocation.hash,
      }, { replace: true });
    } else {
      navigate("/", { replace: true });
    }
  };

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") closePage();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [backgroundLocation, navigate]);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (isSignUp && !name.trim()) {
      setError("Enter your name to create an account.");
      return;
    }
    if (password.length < 8) {
      setError("Use a password with at least 8 characters.");
      return;
    }
    setSubmitting(true);
    try {
      if (isSignUp) await signUp({ name, email, password });
      else await signIn({ email, password });
      navigate(location.state?.returnTo ?? "/home", { replace: true });
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Could not complete that action.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`account-page page-content${theme === "light" ? " theme-light" : ""}`} role="dialog" aria-modal="true" aria-labelledby="account-title">
      <section className="account-form-side">
        <button className="account-close" type="button" aria-label="Close account page" onClick={closePage}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
        </button>
        <div className="account-card">
          <Brand />
          <div className="eyebrow small-eyebrow">{isSignUp ? "YOUR COLOR WORKSPACE" : "WELCOME BACK"}</div>
          <TypingHeading id="account-title" text={isSignUp ? "Hello!" : "Welcome back."} />
          <p className="account-intro">{isSignUp ? "Create an account to personalize your Huecraft workspace." : "Sign in to continue to your Huecraft workspace."}</p>
          {isSignedIn && (
            <div className="account-signed-in">
              You’re already signed in on this device. <Link to="/settings">Manage your profile</Link>
            </div>
          )}
          <form className="account-form" onSubmit={submit}>
            {isSignUp && <label htmlFor="account-name">Your name<input id="account-name" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Alex Morgan" required /></label>}
            <label htmlFor="account-email">Email address<input id="account-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required /></label>
            <label htmlFor="account-password">Password<input id="account-password" type="password" autoComplete={isSignUp ? "new-password" : "current-password"} minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" required /></label>
            {error && <p className="account-error" role="alert">{error}</p>}
            <button type="submit" disabled={submitting}>{submitting ? "One moment..." : isSignUp ? "Create account" : "Continue with email"} <span>↗</span></button>
          </form>
          <p className="account-switch">
            {isSignUp ? "Already have an account?" : "New to Huecraft?"}{" "}
            <Link
              to={isSignUp ? "/login" : "/signup"}
              state={backgroundLocation ? { backgroundLocation, returnTo: location.state?.returnTo } : undefined}
            >
              {isSignUp ? "Sign in" : "Create an account"}
            </Link>
          </p>
          <p className="account-local-note"><strong>Secure account</strong>Your password is securely hashed by the Huecraft server. Your session is protected with an HTTP-only cookie.</p>
        </div>
      </section>
      <aside className="account-art" aria-label="Huecraft color workspace">
        <div className="account-art-shape" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
        <div className="account-art-copy">
          <span className="account-art-kicker">COLOR, WITH INTENTION</span>
          <h2>Find your next great color story.</h2>
          <p>Thoughtful palettes and a calmer place to make things.</p>
        </div>
        <div className="account-art-footer"><Brand /><span>DESIGN YOUR OWN SHADE OF GOOD</span></div>
      </aside>
    </div>
  );
}
