import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PaletteCard from "../components/PaletteCard.jsx";
import { useAppState } from "../appState.jsx";
import { findPalette, paletteCategories, palettePreviewColors, paletteStyles, paletteCss, palettes, colorValues } from "../paletteData.js";
import "./HomePage.css";

const moods = ["All moods", ...new Set(palettes.map((palette) => palette.mood))];
const categories = [
  { name: "SaaS & dashboards", filter: "category=SaaS", paletteIds: ["deep-current", "midnight-ledger", "tidal-glass"] },
  { name: "Portfolio websites", filter: "category=Portfolio", paletteIds: ["soft-structure", "clay-study", "electric-bloom"] },
  { name: "E-commerce stores", filter: "category=E-commerce", paletteIds: ["citrus-hour", "botanical-market"] },
  { name: "Fintech applications", filter: "q=fintech", paletteIds: ["deep-current", "midnight-ledger"] },
  { name: "Agency & business", filter: "q=business", paletteIds: ["soft-structure", "midnight-ledger"] },
  { name: "Creative & gaming", filter: "q=gaming", paletteIds: ["electric-bloom", "clay-study"] },
];

export default function HomePage() {
  const [search, setSearch] = useState("");
  const [mood, setMood] = useState("All moods");
  const [style, setStyle] = useState("All styles");
  const [category, setCategory] = useState("All projects");
  const [assistantPrompt, setAssistantPrompt] = useState("");
  const [assistantPalette, setAssistantPalette] = useState(null);
  const [previewId, setPreviewId] = useState("deep-current");
  const navigate = useNavigate();
  const { favorites, toggleFavorite, copyText, showToast } = useAppState();
  const previewPalette = palettes.find((palette) => palette.id === previewId) ?? palettes[0];
  const previewMode = previewPalette.previewMode;
  const previewColors = palettePreviewColors(previewPalette, previewMode);

  const filteredPalettes = useMemo(() => {
    const query = search.trim().toLowerCase();
    return palettes.filter((palette) => {
      const matchesMood = mood === "All moods" || palette.mood === mood;
      const matchesStyle = style === "All styles" || palette.style === style;
      const matchesCategory = category === "All projects" || palette.category === category;
      const haystack = [palette.name, palette.description, palette.category, palette.style, palette.mood, ...palette.keywords, ...palette.colors].join(" ").toLowerCase();
      return matchesMood && matchesStyle && matchesCategory && (!query || haystack.includes(query));
    });
  }, [search, mood, style, category]);
  const hasActiveFilters = Boolean(search.trim()) || mood !== "All moods" || style !== "All styles" || category !== "All projects";
  const featuredPalettes = hasActiveFilters ? filteredPalettes : [palettes[0], palettes[1], palettes[3]];
  const morePalettes = palettes.filter((palette) => !["deep-current", "citrus-hour", "tidal-glass"].includes(palette.id));

  const submitSearch = (event) => {
    event.preventDefault();
    navigate(`/explore${search.trim() ? `?q=${encodeURIComponent(search.trim())}` : ""}`);
  };

  const submitAssistantPrompt = (event) => {
    event.preventDefault();
    if (!assistantPrompt.trim()) {
      showToast("Describe a project or color mood first");
      return;
    }
    setAssistantPalette(findPalette(assistantPrompt));
  };

  const openAssistant = () => {
    const query = assistantPrompt.trim() ? `?prompt=${encodeURIComponent(assistantPrompt.trim())}` : "";
    navigate(`/assistant${query}`);
  };

  return (
    <div className="home-page page-content">
      <section className="home-hero">
        <div className="home-copy">
          <div className="eyebrow"><span className="sparkle">✳</span> THE COLOR TOOLKIT FOR BUILDERS</div>
          <h1>Find the perfect colors for your <span>next project.</span></h1>
          <p>Explore thoughtful palettes, tune every color, and preview your next idea in a real interface.</p>
          <form className="home-search" onSubmit={submitSearch}>
            <label className="visually-hidden" htmlFor="home-search">Search by palette name, color mood, or HEX code</label>
            <span aria-hidden="true">⌕</span>
            <input id="home-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search a palette, mood, or HEX code..." />
            <button type="submit">Search palettes <span aria-hidden="true">↗</span></button>
          </form>
          <div className="home-hero-actions">
            <Link className="home-explore-button" to="/explore">Explore palettes <span>↗</span></Link>
            <Link className="home-ai-button" to="/assistant"><span>✳</span> Generate with AI</Link>
          </div>
        </div>
        <Link className="home-feature" to="/palette/deep-current" aria-label="Explore featured palette Deep Current">
          <div className="feature-copy"><span className="eyebrow">✳ FEATURED PALETTE</span><h2>Deep Current</h2><p>Quiet depth, cool clarity</p></div>
          <div className="feature-swatches">{palettes[0].colors.map((color) => <span key={color} style={{ backgroundColor: color }} />)}</div>
          <div className="feature-footer"><span>5 considered colors</span><span>Explore palette ↗</span></div>
        </Link>
      </section>

      <section className="home-quick-search" aria-labelledby="home-filters-heading">
        <div className="section-heading"><div><div className="eyebrow small-eyebrow">FIND YOUR COLOR STORY</div><h2 id="home-filters-heading">Quick search &amp; filters.</h2></div><span className="home-filter-count">{filteredPalettes.length} palettes</span></div>
        <div className="home-filter-row">
          <label>MOOD
            <select value={mood} onChange={(event) => setMood(event.target.value)} aria-label="Filter by mood">
              {moods.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label>STYLE
            <select value={style} onChange={(event) => setStyle(event.target.value)} aria-label="Filter by color style">
              {["All styles", ...paletteStyles].map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label>PROJECT TYPE
            <select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Filter by project type">
              {["All projects", ...paletteCategories].map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
        </div>
      </section>

      <section className="home-featured-palettes" aria-labelledby="featured-palettes-heading">
        <div className="section-heading">
          <div><div className="eyebrow small-eyebrow">CURATED COLOR COMBINATIONS</div><h2 id="featured-palettes-heading">Featured palettes.</h2></div>
          <Link className="text-link" to="/explore">Browse all palettes <span>↗</span></Link>
        </div>
        {filteredPalettes.length ? (
          <div className="palette-grid">
            {featuredPalettes.map((palette) => (
              <PaletteCard key={palette.id} palette={palette} favorite={favorites.includes(palette.id)} onFavorite={() => toggleFavorite(palette.id)} onCopy={copyText} />
            ))}
          </div>
        ) : <div className="empty-state">No palettes match these filters. Try another mood, style, or search.</div>}
      </section>

      <section className="home-categories" aria-labelledby="home-categories-heading">
        <div className="section-heading"><div><div className="eyebrow small-eyebrow">MADE FOR WHAT YOU MAKE</div><h2 id="home-categories-heading">Browse by project.</h2></div></div>
        <div className="category-grid">
          {categories.map((item) => {
            const examples = item.paletteIds.map((id) => palettes.find((palette) => palette.id === id)).filter(Boolean);
            return (
              <Link className="category-card" to={`/explore?${item.filter}`} key={item.name}>
                <span className="category-count">{String(examples.length).padStart(2, "0")} PALETTES</span>
                <strong>{item.name}</strong>
                <span className="category-colors">{examples[0]?.colors.slice(0, 4).map((color) => <i key={color} style={{ backgroundColor: color }} />)}</span>
                <span className="category-arrow">↗</span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="home-ai-feature" aria-labelledby="home-ai-heading">
        <div className="home-ai-copy">
          <div className="eyebrow small-eyebrow"><span>✳</span> YOUR CREATIVE SIDEKICK</div>
          <h2 id="home-ai-heading">A few words in.<br /><span>A palette to start.</span></h2>
          <p>Describe your project, a mood, or a color you love. Get a thoughtful palette from the Huecraft library.</p>
          <form className="home-ai-form" onSubmit={submitAssistantPrompt}>
            <label className="visually-hidden" htmlFor="home-ai-prompt">Describe the palette you need</label>
            <textarea id="home-ai-prompt" rows="2" value={assistantPrompt} onChange={(event) => setAssistantPrompt(event.target.value)} placeholder="e.g. A premium dark palette for a modern banking dashboard" />
            <button type="submit">Generate palette <span>↗</span></button>
          </form>
          <button className="home-ai-open-link" type="button" onClick={openAssistant}>Continue in the AI assistant <span>→</span></button>
        </div>
        <div className="home-ai-result" aria-live="polite">
          {assistantPalette ? (
            <>
              <span className="eyebrow small-eyebrow">A PALETTE TO TRY</span>
              <Link className="home-ai-result-swatches" to={`/palette/${assistantPalette.id}`} aria-label={`View ${assistantPalette.name} palette`}>
                {assistantPalette.colors.map((color) => <span key={color} style={{ backgroundColor: color }} />)}
              </Link>
              <h3>{assistantPalette.name}</h3>
              <p>{assistantPalette.description}</p>
              <button className="home-ai-open-link" type="button" onClick={openAssistant}>Refine this idea <span>→</span></button>
            </>
          ) : (
            <>
              <div className="home-ai-result-mark">✳</div>
              <span className="eyebrow small-eyebrow">A LITTLE INSPIRATION</span>
              <p>“A calm, coastal palette for a focused workspace.”</p>
              <div className="home-ai-result-swatches">{palettes[0].colors.map((color) => <span key={color} style={{ backgroundColor: color }} />)}</div>
            </>
          )}
        </div>
      </section>

      <section className="home-live-preview" aria-labelledby="home-preview-heading">
        <div className="section-heading">
          <div><div className="eyebrow small-eyebrow">SEE IT IN CONTEXT</div><h2 id="home-preview-heading">A palette, on a page.</h2></div>
          <Link className="text-link" to={`/preview?palette=${previewPalette.id}`}>Open full preview <span>↗</span></Link>
        </div>
        <div className="home-preview-toolbar">
          <p>Switch palettes to see how they change the feel of a real interface.</p>
          <label>Palette
            <select value={previewId} onChange={(event) => setPreviewId(event.target.value)} aria-label="Choose a palette for the live website preview">
              {palettes.map((palette) => <option value={palette.id} key={palette.id}>{palette.name}</option>)}
            </select>
          </label>
        </div>
        <div className="home-site-preview" style={{ "--preview-bg": previewColors.background, "--preview-surface": previewColors.surface, "--preview-text": previewColors.text, "--preview-primary": previewColors.primary, "--preview-secondary": previewColors.secondary }}>
          <nav className="home-preview-nav"><strong>northstar<span>.</span></strong><div><span>Work</span><span>About</span><span>Contact</span></div><button type="button">Let’s talk ↗</button></nav>
          <div className="home-preview-content">
            <span>INDEPENDENT DESIGN STUDIO</span>
            <h3>Thoughtful work<br />for a changing world.</h3>
            <p>A clear, colorful preview of your next project.</p>
            <button type="button">Explore our work <span>↗</span></button>
            <div className="home-preview-cards"><article><strong>Find the signal.</strong><span>Clarity for complex products.</span></article><article><strong>Make it matter.</strong><span>Useful digital experiences.</span></article><article><strong>Bring it to life.</strong><span>Thoughtful details, always.</span></article></div>
          </div>
        </div>
      </section>

      <section className="home-more-palettes" aria-labelledby="home-more-heading">
        <div className="section-heading">
          <div><div className="eyebrow small-eyebrow">A FEW MORE GOOD STARTING POINTS</div><h2 id="home-more-heading">Explore the palette library.</h2></div>
          <Link className="text-link" to="/explore">Explore all <span>↗</span></Link>
        </div>
        <div className="palette-grid">
          {morePalettes.map((palette) => (
            <PaletteCard key={palette.id} palette={palette} favorite={favorites.includes(palette.id)} onFavorite={() => toggleFavorite(palette.id)} onCopy={copyText} />
          ))}
        </div>
      </section>

      <section className="home-developer-tools" id="developer-tools" aria-labelledby="home-tools-heading">
        <div className="section-heading"><div><div className="eyebrow small-eyebrow">MORE THAN A PRETTY PALETTE</div><h2 id="home-tools-heading">Made for your workflow.</h2></div></div>
        <div className="developer-tool-grid">
          <article><span>⌘</span><h3>Copy color values</h3><p>Grab HEX, RGB, or HSL values and put each color straight to work.</p><div className="developer-tool-actions">
            <button type="button" onClick={() => copyText(previewPalette.colors[0], `${previewPalette.colors[0]} copied`)}>HEX</button>
            <button type="button" onClick={() => copyText(colorValues(previewPalette.colors[0]).rgb, "RGB value copied")}>RGB</button>
            <button type="button" onClick={() => copyText(colorValues(previewPalette.colors[0]).hsl, "HSL value copied")}>HSL</button>
          </div></article>
          <article><span>{"{}"}</span><h3>Export CSS variables</h3><p>Take a palette into your codebase with a ready-to-copy CSS snippet.</p><button className="developer-tool-button" type="button" onClick={() => copyText(paletteCss(previewPalette), "CSS variables copied")}>Copy CSS variables ↗</button></article>
          <article><span>◱</span><h3>Preview a full theme</h3><p>Try a palette on a sample website and adjust colors as you go.</p><Link className="developer-tool-button" to={`/preview?palette=${previewPalette.id}`}>Open live preview ↗</Link></article>
          <article><span>✳</span><h3>Get a creative nudge</h3><p>Turn a project brief or a mood into a palette suggestion.</p><Link className="developer-tool-button" to="/assistant">Ask the color assistant ↗</Link></article>
        </div>
      </section>
      <section className="home-about" id="about"><span className="eyebrow small-eyebrow">HUECRAFT</span><p>Thoughtful color for the things you make. Explore, refine, and preview palettes for your next digital project.</p></section>
    </div>
  );
}
