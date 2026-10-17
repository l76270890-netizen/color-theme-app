import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAppState } from "../appState.jsx";
import { palettePreviewColors, palettes } from "../paletteData.js";
import "./WelcomePage.css";

const featuredPalettes = ["electric-bloom", "tidal-glass", "citrus-hour", "midnight-ledger"]
  .map((id) => palettes.find((palette) => palette.id === id))
  .filter(Boolean);

export default function WelcomePage() {
  const [activePaletteId, setActivePaletteId] = useState(featuredPalettes[0].id);
  const { copyText, isSignedIn, profile } = useAppState();
  const location = useLocation();
  const activePalette = featuredPalettes.find((palette) => palette.id === activePaletteId) ?? featuredPalettes[0];
  const previewColors = palettePreviewColors(activePalette, activePalette.previewMode);
  const accountNavigationState = { backgroundLocation: location, returnTo: location.state?.from };

  return (
    <main className="welcome-page">
      <header className="welcome-header">
        <Link className="welcome-brand" to="/" aria-label="Huecraft welcome">
          <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
          <span>huecraft<span className="brand-period">.</span></span>
        </Link>
        <nav className="welcome-nav" aria-label="Welcome navigation">
          <a href="#palette-library">Palettes</a>
          <a href="#how-it-works">How it works</a>
          <a href="#preview">Preview</a>
        </nav>
        <div className="welcome-account-links">
          {isSignedIn ? (
            <Link className="welcome-sign-in" to="/home">Hi, {profile.name}</Link>
          ) : (
            <Link className="welcome-sign-in" to="/login" state={accountNavigationState}>Sign in</Link>
          )}
          <Link className="welcome-account-button" to={isSignedIn ? "/home" : "/signup"} state={isSignedIn ? undefined : accountNavigationState}>
            {isSignedIn ? "Open workspace" : "Create account"}<span aria-hidden="true">↗</span>
          </Link>
        </div>
      </header>

      <section className="welcome-hero" aria-labelledby="welcome-title">
        <div className="welcome-copy">
          <div className="eyebrow"><span className="sparkle">✳</span> A COLOR WORKSPACE FOR CREATIVE MINDS</div>
          <h1 id="welcome-title">Find a color story worth building around.</h1>
          <p>Explore thoughtful palettes, shape your own direction, and see every color come to life in a real interface.</p>
          <div className="welcome-actions">
            <Link className="welcome-primary-action" to={isSignedIn ? "/home" : "/signup"} state={isSignedIn ? undefined : accountNavigationState}>
              {isSignedIn ? "Open your workspace" : "Start creating"}<span aria-hidden="true">↗</span>
            </Link>
            <a className="welcome-secondary-action" href="#palette-library">Browse palette previews</a>
          </div>
          <div className="welcome-note"><span aria-hidden="true">✳</span> {palettes.length} palettes to get your next idea moving</div>
        </div>

        <div className="welcome-showcase" aria-label={`${activePalette.name} palette preview`}>
          <div className="welcome-showcase-heading">
            <span className="eyebrow small-eyebrow">A PALETTE TO START WITH</span>
            <h2>{activePalette.name}</h2>
            <p>{activePalette.description}</p>
          </div>
          <div className="welcome-color-scene">
            {activePalette.colors.slice(0, 5).map((color, index) => (
              <button
                className={`welcome-color welcome-color-${index + 1}`}
                key={`${activePalette.id}-${color}`}
                type="button"
                style={{ "--welcome-swatch": color }}
                aria-label={`Copy ${color}`}
                title={`Copy ${color}`}
                onClick={() => copyText(color, `${color} copied to clipboard`)}
              />
            ))}
          </div>
          <div className="welcome-showcase-footer">
            <span>SELECT A COLOR STORY</span>
            <span>{activePalette.category} <i /> {activePalette.mood}</span>
          </div>
          <div className="welcome-palette-picker" role="group" aria-label="Choose a featured palette">
            {featuredPalettes.map((palette) => (
              <button
                className={`welcome-palette-option${palette.id === activePaletteId ? " selected" : ""}`}
                key={palette.id}
                type="button"
                aria-pressed={palette.id === activePaletteId}
                onClick={() => setActivePaletteId(palette.id)}
              >
                <span className="welcome-mini-swatches" aria-hidden="true">
                  {palette.colors.slice(0, 4).map((color) => <i key={color} style={{ backgroundColor: color }} />)}
                </span>
                <span>{palette.name}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="welcome-next-steps" aria-label="What you can do in Huecraft">
        <a href="#palette-library"><span>01</span><strong>Discover palettes</strong><i aria-hidden="true">↓</i></a>
        <a href="#how-it-works"><span>02</span><strong>Build a color direction</strong><i aria-hidden="true">↓</i></a>
        <a href="#preview"><span>03</span><strong>See colors in context</strong><i aria-hidden="true">↓</i></a>
      </section>

      <section className="welcome-library" id="palette-library" aria-labelledby="welcome-library-title">
        <div className="welcome-section-heading">
          <span className="eyebrow small-eyebrow">A FEW GOOD PLACES TO BEGIN</span>
          <h2 id="welcome-library-title">Color ideas for what you’re making.</h2>
          <p>Get a feel for the palette library. Create an account to save, compare, and work with every color.</p>
        </div>
        <div className="welcome-public-palettes">
          {featuredPalettes.slice(0, 3).map((palette, index) => (
            <article className="welcome-public-palette" key={palette.id}>
              <div className="welcome-public-swatches" aria-label={`${palette.name} color preview`}>
                {palette.colors.slice(0, 5).map((color) => <span key={color} style={{ backgroundColor: color }} />)}
              </div>
              <div className="welcome-public-palette-meta">
                <span>0{index + 1} / {palette.category}</span>
                <h3>{palette.name}</h3>
                <p>{palette.description}</p>
              </div>
            </article>
          ))}
        </div>
        <Link className="welcome-text-link" to="/signup" state={accountNavigationState}>Unlock the full palette library <span aria-hidden="true">↗</span></Link>
      </section>

      <section className="welcome-how" id="how-it-works" aria-labelledby="welcome-how-title">
        <div className="welcome-section-heading">
          <span className="eyebrow small-eyebrow">FROM FIRST IDEA TO FINISHED PALETTE</span>
          <h2 id="welcome-how-title">A calmer way to make color decisions.</h2>
        </div>
        <div className="welcome-how-grid">
          <article><span>01</span><h3>Find a direction</h3><p>Browse palettes by mood, color style, or the kind of project you’re creating.</p></article>
          <article><span>02</span><h3>Make it yours</h3><p>Save favorites, organize ideas into collections, and tune colors to fit your project.</p></article>
          <article><span>03</span><h3>Put it in context</h3><p>Preview a palette on a sample interface and copy practical values for your code.</p></article>
        </div>
      </section>

      <section className="welcome-preview-section" id="preview" aria-labelledby="welcome-preview-title">
        <div className="welcome-preview-copy">
          <span className="eyebrow small-eyebrow">COLOR, OUT OF THE SWATCH AND INTO THE WORLD</span>
          <h2 id="welcome-preview-title">See how a palette changes the whole page.</h2>
          <p>Preview colors as a working interface before you bring them into your own project.</p>
          <Link className="welcome-primary-action" to="/signup" state={accountNavigationState}>Create an account to preview<span aria-hidden="true">↗</span></Link>
        </div>
        <div className="welcome-interface-preview" style={{ "--preview-bg": previewColors.background, "--preview-surface": previewColors.surface, "--preview-text": previewColors.text, "--preview-primary": previewColors.primary, "--preview-accent": previewColors.accent }}>
          <div className="welcome-preview-bar"><strong>northstar<span>.</span></strong><span>Work&nbsp;&nbsp; About&nbsp;&nbsp; Contact</span><i>Let’s talk ↗</i></div>
          <div className="welcome-preview-body">
            <span>INDEPENDENT DESIGN STUDIO</span>
            <h3>Thoughtful work<br />for a changing world.</h3>
            <p>One palette, a complete visual direction.</p>
            <div className="welcome-preview-blocks"><i /><i /><i /></div>
          </div>
        </div>
      </section>

      <section className="welcome-final-cta">
        <span className="eyebrow small-eyebrow">YOUR NEXT COLOR STORY STARTS HERE</span>
        <h2>Make something that feels like you.</h2>
        <p>Create an account to enter your personal color workspace.</p>
        <Link className="welcome-primary-action" to={isSignedIn ? "/home" : "/signup"} state={isSignedIn ? undefined : accountNavigationState}>
          {isSignedIn ? "Open your workspace" : "Create your account"}<span aria-hidden="true">↗</span>
        </Link>
      </section>

      <footer className="welcome-footer">
        <Link className="welcome-brand" to="/" aria-label="Huecraft welcome">huecraft<span className="brand-period">.</span></Link>
        <span>Thoughtful color for the things you make.</span>
        {!isSignedIn && <Link to="/login" state={accountNavigationState}>Already have an account? Sign in</Link>}
      </footer>
    </main>
  );
}