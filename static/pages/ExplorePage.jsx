import React, { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import TypingHeading from "../components/TypingHeading.jsx";
import PaletteCard from "../components/PaletteCard.jsx";
import { useAppState } from "../appState.jsx";
import { paletteCategories, paletteStyles, palettes } from "../paletteData.js";
import "./ExplorePage.css";

export default function ExplorePage() {
  const [params, setParams] = useSearchParams();
  const [category, setCategory] = useState(params.get("category") ?? "All");
  const [style, setStyle] = useState("All styles");
  const [search, setSearch] = useState(params.get("q") ?? "");
  const { favorites, toggleFavorite, copyText } = useAppState();

  const results = useMemo(() => {
    const query = search.trim().toLowerCase();
    return palettes.filter((palette) => {
      const matchesCategory = category === "All" || palette.category === category;
      const matchesStyle = style === "All styles" || palette.style === style;
      const haystack = [palette.name, palette.description, palette.category, palette.style, palette.mood, ...palette.keywords, ...palette.colors].join(" ").toLowerCase();
      return matchesCategory && matchesStyle && (!query || haystack.includes(query));
    });
  }, [category, style, search]);

  const changeCategory = (nextCategory) => {
    setCategory(nextCategory);
    const nextParams = new URLSearchParams(params);
    if (nextCategory === "All") nextParams.delete("category");
    else nextParams.set("category", nextCategory);
    setParams(nextParams, { replace: true });
  };

  return (
    <div className="explore-page page-content">
      <div className="page-heading"><div className="eyebrow small-eyebrow">YOUR NEXT COLOR STORY</div><TypingHeading text="Explore palettes." /><p>Ready-made color combinations for the things you’re building.</p></div>
      <div className="explore-controls">
        <label className="search-box explore-search">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.2 4.2" /></svg>
          <input type="search" placeholder="Search by name, mood, or HEX..." value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Search palettes" />
        </label>
        <label className="style-select-label">Style
          <select value={style} onChange={(event) => setStyle(event.target.value)} aria-label="Filter by color style">
            <option>All styles</option>{paletteStyles.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
      </div>
      <div className="explore-filter-block"><span>PROJECT</span><div className="filter-tabs" role="group" aria-label="Filter by project">
        {["All", ...paletteCategories].map((item) => <button className={`filter-tab${category === item ? " selected" : ""}`} type="button" key={item} aria-pressed={category === item} onClick={() => changeCategory(item)}>{item}</button>)}
      </div></div>
      <div className="explore-filter-block"><span>COLOR STYLE</span><div className="filter-tabs" role="group" aria-label="Filter by color style">
        {["All styles", ...paletteStyles].map((item) => <button className={`filter-tab${style === item ? " selected" : ""}`} type="button" key={item} aria-pressed={style === item} onClick={() => setStyle(item)}>{item}</button>)}
      </div></div>
      <div className="results-heading"><span>{results.length} palettes</span><span>Curated for your next project</span></div>
      {results.length ? <div className="palette-grid">{results.map((palette) => <PaletteCard key={palette.id} palette={palette} favorite={favorites.includes(palette.id)} onFavorite={() => toggleFavorite(palette.id)} onCopy={copyText} />)}</div> : <div className="empty-state">No palettes match those filters. Try another search or style.</div>}
    </div>
  );
}
