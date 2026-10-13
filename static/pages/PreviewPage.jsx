import React, { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAppState } from "../appState.jsx";
import { getPalette, palettePreviewColors, palettes } from "../paletteData.js";
import "./PreviewPage.css";

export default function PreviewPage() {
  const [params, setParams] = useSearchParams();
  const initialPalette = getPalette(params.get("palette")) ?? getPalette("deep-current");
  const [paletteId, setPaletteId] = useState(initialPalette.id);
  const [mode, setMode] = useState(initialPalette.previewMode);
  const [colors, setColors] = useState(() => palettePreviewColors(initialPalette, initialPalette.previewMode));
  const { copyText, showToast } = useAppState();
  const palette = getPalette(paletteId);
  const roles = ["background", "surface", "text", "primary", "secondary", "accent"];
  const labels = ["Background", "Surface", "Text", "Primary", "Secondary", "Accent"];

  const updatePalette = (id) => {
    const nextPalette = getPalette(id);
    if (!nextPalette) return;
    setPaletteId(nextPalette.id);
    setMode(nextPalette.previewMode);
    setColors(palettePreviewColors(nextPalette, nextPalette.previewMode));
    params.set("palette", nextPalette.id);
    setParams(params, { replace: true });
  };

  const changeMode = (nextMode) => {
    if (nextMode !== mode) {
      setColors(palettePreviewColors(palette, nextMode));
      setMode(nextMode);
    }
  };

  const css = useMemo(() => `:root {\n${roles.map((role) => `  --${role}-color: ${colors[role]};`).join("\n")}\n}`, [colors]);

  return (
    <div className="preview-page page-content">
      <div className="page-heading"><div className="eyebrow small-eyebrow">SEE IT IN CONTEXT</div><h1>Preview your theme.</h1><p>Try a palette on a sample website. Change colors and see the layout update instantly.</p></div>
      <div className="preview-toolbar">
        <label>Palette<select value={paletteId} onChange={(event) => updatePalette(event.target.value)}>{palettes.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
        <div className="mode-switch" role="group" aria-label="Preview theme mode"><button type="button" className={mode === "light" ? "selected" : ""} aria-pressed={mode === "light"} onClick={() => changeMode("light")}>☼ Light</button><button type="button" className={mode === "dark" ? "selected" : ""} aria-pressed={mode === "dark"} onClick={() => changeMode("dark")}>☾ Dark</button></div>
      </div>
      <div className={`site-mockup site-mockup-${mode}`} style={{ "--mock-bg": colors.background, "--mock-surface": colors.surface, "--mock-text": colors.text, "--mock-primary": colors.primary, "--mock-secondary": colors.secondary, "--mock-accent": colors.accent }}>
        <nav className="mock-nav"><strong>huecraft<span>.</span></strong><div><a href="#mock-home">Home</a><a href="#mock-feature">Feature</a><a href="#mock-about">About</a><a href="#mock-contact">Contact</a></div><button type="button">Get Started ↗</button></nav>
        <section className="mock-hero">
          <span>INDEPENDENT DESIGN STUDIO</span>
          <h2>Thoughtful work<br />for a changing world.</h2>
          <p>We partner with ambitious teams to turn big ideas into clear, human experiences.</p>
          <div className="btn">
            <button type="button">Explore our work <span>↗</span></button>
            <button type="button">Learn more <span>↗</span></button>
          </div>
        </section>
        <section className="mock-cards" id="mock-work"><article><span>01 / STRATEGY</span><strong>Find the signal.</strong><p>Clarity for complex products and teams.</p></article><article><span>02 / DESIGN</span><strong>Make it matter.</strong><p>Useful, distinctive digital experiences.</p></article><article><span>03 / BUILD</span><strong>Bring it to life.</strong><p>Thoughtful details from first click onward.</p></article></section>
      </div>
      <div className="preview-bottom"><section className="color-controls"><div><h2>Adjust the colors</h2><p>{palette.name} · Changes update the preview live</p></div>{roles.map((role, index) => <label key={role}><span>{labels[index]}</span><input type="color" value={colors[role]} onChange={(event) => setColors((current) => ({ ...current, [role]: event.target.value.toUpperCase() }))} aria-label={`Choose ${role} color`} /><code>{colors[role]}</code></label>)}</section>
        <section className="preview-export"><h2>Export theme</h2><p>Use these custom properties in your project.</p><pre>{css}</pre><button type="button" onClick={() => copyText(css, "Preview CSS variables copied")}>Copy CSS variables</button><Link to={`/palette/${palette.id}`}>View full palette details ↗</Link></section></div>
    </div>
  );
}
