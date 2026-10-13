import React from "react";
import { Link } from "react-router-dom";

export default function PaletteCard({ palette, favorite, recommended = false, onFavorite, onCopy }) {
  return (
    <article className={`palette-card${recommended ? " recommended-card" : ""}`}>
      {recommended && <span className="recommend-badge">A good match</span>}
      <button
        className={`favorite-button${favorite ? " is-favorite" : ""}`}
        type="button"
        aria-label={`${favorite ? "Remove" : "Save"} ${palette.name} palette ${favorite ? "from" : "to"} favorites`}
        aria-pressed={favorite}
        onClick={onFavorite}
      >
        {favorite ? "♥" : "♡"}
      </button>
      <Link className="palette-preview" to={`/palette/${palette.id}`} aria-label={`View ${palette.name} palette details`}>
        {palette.colors.map((color) => <span key={color} style={{ "--swatch": color }} />)}
      </Link>
      <div className="card-meta">
        <div><h3>{palette.name}</h3><p>{palette.description}</p></div>
        <span className="card-tag">{palette.category}</span>
      </div>
      <div className="hex-list" aria-label={`${palette.name} color values`}>
        {palette.colors.map((color) => (
          <button key={color} type="button" onClick={() => onCopy(color, `${color} copied to clipboard`)}>
            {color}
          </button>
        ))}
      </div>
    </article>
  );
}
