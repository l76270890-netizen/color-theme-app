import React, { useState } from "react";
import { Link } from "react-router-dom";
import PaletteCard from "../components/PaletteCard.jsx";
import { useAppState } from "../appState.jsx";
import { downloadText, palettes } from "../paletteData.js";
import "./CollectionsPage.css";

export default function CollectionsPage() {
  const { favorites, collections, setCollections, toggleFavorite, copyText, showToast } = useAppState();
  const [newName, setNewName] = useState("");
  const savedPalettes = palettes.filter((palette) => favorites.includes(palette.id));

  const createCollection = (event) => {
    event.preventDefault();
    const name = newName.trim();
    if (!name) {
      showToast("Enter a name for your collection");
      return;
    }
    setCollections((current) => [...current, { id: `collection-${Date.now()}`, name, paletteIds: [] }]);
    setNewName("");
    showToast(`${name} collection created`);
  };

  const renameCollection = (id, currentName) => {
    const name = window.prompt("Rename this collection", currentName);
    if (name === null) return;
    if (!name.trim()) {
      showToast("Collection names can’t be empty");
      return;
    }
    setCollections((current) => current.map((collection) => collection.id === id ? { ...collection, name: name.trim() } : collection));
  };

  const exportSaved = () => {
    if (!savedPalettes.length) {
      showToast("Save a palette before exporting your collection");
      return;
    }
    const content = savedPalettes.map((palette) => `${palette.name}\n${palette.colors.join(", ")}`).join("\n\n");
    downloadText("huecraft-favorites.txt", content);
    showToast("Favorites exported");
  };

  const exportCollection = (collection, items) => {
    if (!items.length) {
      showToast("Add a palette before exporting this collection");
      return;
    }
    const content = items.map((palette) => `${palette.name}\n${palette.colors.join(", ")}`).join("\n\n");
    downloadText(`${collection.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.txt`, content);
    showToast(`${collection.name} exported`);
  };

  const addPalette = (collectionId, paletteId) => {
    if (!paletteId) return;
    setCollections((current) => current.map((collection) => collection.id === collectionId
      ? { ...collection, paletteIds: [...new Set([...collection.paletteIds, paletteId])] }
      : collection));
    showToast("Palette added to collection");
  };

  return (
    <div className="collections-page page-content">
      <div className="page-heading collection-heading"><div><div className="eyebrow small-eyebrow">YOUR PERSONAL COLOR LIBRARY</div><h1>Keep what you love.</h1><p>Save palettes and sort them into collections for your projects.</p></div><button className="export-button" type="button" onClick={exportSaved}>Export favorites ↗</button></div>
      <section className="saved-section"><div className="section-heading"><div><div className="eyebrow small-eyebrow">SAVED PALETTES</div><h2>Your favorites <span className="count-pill">{savedPalettes.length}</span></h2></div><Link to="/explore" className="text-link">Find more palettes <span>↗</span></Link></div>
        {savedPalettes.length ? <div className="palette-grid">{savedPalettes.map((palette) => <PaletteCard key={palette.id} palette={palette} favorite onFavorite={() => toggleFavorite(palette.id)} onCopy={copyText} />)}</div> : <div className="collection-empty"><span>♡</span><h3>Your favorites will live here.</h3><p>Tap the heart on a palette to save it to your library.</p><Link to="/explore">Explore palettes ↗</Link></div>}
      </section>
      <section className="collections-section"><div className="section-heading"><div><div className="eyebrow small-eyebrow">ORGANIZE BY PROJECT</div><h2>Your collections.</h2></div></div>
        <form className="create-collection-form" onSubmit={createCollection}><label className="visually-hidden" htmlFor="new-collection">New collection name</label><input id="new-collection" value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="e.g. My Portfolio" /><button type="submit">+ New collection</button></form>
        <div className="collection-list">{collections.map((collection) => {
          const items = palettes.filter((palette) => collection.paletteIds.includes(palette.id));
          return <article className="collection-card" key={collection.id}><div className="collection-card-head"><div><h3>{collection.name}</h3><p>{items.length} {items.length === 1 ? "palette" : "palettes"}</p></div><div><button type="button" onClick={() => exportCollection(collection, items)}>Export</button><button type="button" onClick={() => renameCollection(collection.id, collection.name)}>Rename</button>{collection.id !== "inspiration" && <button type="button" onClick={() => { setCollections((current) => current.filter((item) => item.id !== collection.id)); showToast("Collection removed"); }}>Remove</button>}</div></div><label>Add a palette<select defaultValue="" onChange={(event) => { addPalette(collection.id, event.target.value); event.target.value = ""; }}><option value="" disabled>Select palette…</option>{palettes.filter((palette) => !collection.paletteIds.includes(palette.id)).map((palette) => <option value={palette.id} key={palette.id}>{palette.name}</option>)}</select></label>{items.length > 0 && <div className="collection-mini-swatches">{items.map((palette) => <Link to={`/palette/${palette.id}`} title={palette.name} key={palette.id}>{palette.colors.slice(0, 5).map((color) => <i key={color} style={{ backgroundColor: color }} />)}</Link>)}</div>}</article>;
        })}</div>
      </section>
    </div>
  );
}
