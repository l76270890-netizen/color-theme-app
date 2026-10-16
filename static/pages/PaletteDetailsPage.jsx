import React from "react";
import { Link, useParams } from "react-router-dom";
import TypingHeading from "../components/TypingHeading.jsx";
import PaletteCard from "../components/PaletteCard.jsx";
import NotFoundPage from "./NotFoundPage.jsx";
import { useAppState } from "../appState.jsx";
import { colorValues, getPalette, paletteCss, palettes } from "../paletteData.js";
import "./PaletteDetailsPage.css";

export default function PaletteDetailsPage() {
  const { paletteId } = useParams();
  const palette = getPalette(paletteId);
  if (!palette) return <NotFoundPage />;
  const { favorites, toggleFavorite, copyText, showToast } = useAppState();
  const similar = palettes.filter((item) => item.id !== palette.id && (item.category === palette.category || item.mood === palette.mood)).slice(0, 3);
  const tailwind = `colors: {\n${palette.colors.map((color, index) => `  'huecraft-${index + 1}': '${color}',`).join("\n")}\n}`;

  const savePalette = () => {
    if (!favorites.includes(palette.id)) toggleFavorite(palette.id);
    else showToast(`${palette.name} is already in your favorites`);
  };

  return (
    <div className="palette-details-page page-content">
      <div className="details-breadcrumb"><Link to="/explore">Explore palettes</Link><span>/</span><span>{palette.name}</span></div>
      <div className="details-heading"><div><div className="eyebrow small-eyebrow">{palette.category.toUpperCase()} · {palette.mood.toUpperCase()}</div><TypingHeading text={palette.name} /><p>{palette.description}</p></div>
        <div className="details-actions"><button type="button" onClick={savePalette}>{favorites.includes(palette.id) ? "♥ Saved" : "♡ Save palette"}</button><button type="button" onClick={() => copyText(palette.colors.join(", "), "Palette HEX values copied")}>Copy HEX values</button><Link to={`/preview?palette=${palette.id}`}>Preview theme ↗</Link></div>
      </div>
      <div className="detail-swatches">{palette.colors.map((color, index) => (
        <article className="detail-swatch" key={color}>
          <div className="detail-color-block" style={{ backgroundColor: color }}><span>{String(index + 1).padStart(2, "0")}</span><button type="button" onClick={() => copyText(color, `${color} copied`)} aria-label={`Copy ${color}`}>Copy</button></div>
          <div className="detail-color-values"><strong>{color}</strong><span>{colorValues(color).rgb}</span><span>{colorValues(color).hsl}</span></div>
        </article>
      ))}</div>
      <div className="export-panels">
        <section className="export-panel"><div><h2>CSS variables</h2><p>Drop these into your stylesheet.</p></div><button type="button" onClick={() => copyText(paletteCss(palette), "CSS variables copied")}>Copy CSS</button><pre>{paletteCss(palette)}</pre></section>
        <section className="export-panel"><div><h2>Tailwind colors</h2><p>Use the palette in your Tailwind theme.</p></div><button type="button" onClick={() => copyText(tailwind, "Tailwind colors copied")}>Copy config</button><pre>{tailwind}</pre></section>
      </div>
      {similar.length > 0 && <section className="similar-palettes"><div className="section-heading"><div><div className="eyebrow small-eyebrow">KEEP EXPLORING</div><h2>Similar palettes.</h2></div><Link className="text-link" to="/explore">View all <span>↗</span></Link></div><div className="palette-grid">{similar.map((item) => <PaletteCard key={item.id} palette={item} favorite={favorites.includes(item.id)} onFavorite={() => toggleFavorite(item.id)} onCopy={copyText} />)}</div></section>}
    </div>
  );
}
