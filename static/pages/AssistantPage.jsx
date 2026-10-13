import React, { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import PaletteCard from "../components/PaletteCard.jsx";
import { useAppState } from "../appState.jsx";
import { findPalette } from "../paletteData.js";
import "./AssistantPage.css";

const examples = [
  "Create a premium dark color scheme for a fintech dashboard",
  "Make a warm, playful palette for an online shop",
  "I need a calm pastel palette for a portfolio",
];

export default function AssistantPage() {
  const [params] = useSearchParams();
  const [prompt, setPrompt] = useState(() => params.get("prompt") ?? "");
  const [chat, setChat] = useState([]);
  const { favorites, toggleFavorite, copyText, showToast } = useAppState();
  const latest = chat.at(-1);

  const submit = (event) => {
    event.preventDefault();
    if (!prompt.trim()) {
      showToast("Tell the assistant what you’re designing");
      return;
    }
    const palette = findPalette(prompt, latest?.palette.id);
    setChat((current) => [...current, { prompt: prompt.trim(), palette }]);
    setPrompt("");
  };

  const regenerate = () => {
    if (!latest) return;
    const palette = findPalette(latest.prompt, latest.palette.id);
    setChat((current) => [...current, { prompt: latest.prompt, palette }]);
  };

  return (
    <div className="assistant-page page-content">
      <div className="page-heading"><div className="eyebrow small-eyebrow">YOUR CREATIVE SIDEKICK</div><h1>Your idea, in color.</h1><p>Describe the project and mood. Get a curated palette to start with.</p></div>
      <div className="assistant-layout">
        <section className="assistant-chat" aria-label="Color assistant chat">
          <div className="assistant-welcome"><span className="ai-icon">✳</span><div><strong>Huecraft assistant</strong><p>I’ll match your brief to a palette and explain how the colors work together.</p></div></div>
          {chat.length === 0 ? (
            <div className="assistant-empty"><span>✳</span><h2>What are you making?</h2><p>Start with a project, a feeling, or a color you love.</p></div>
          ) : (
            <div className="chat-history">{chat.map((item, index) => (
              <div className="chat-turn" key={`${item.palette.id}-${index}`}>
                <div className="user-message">{item.prompt}</div>
                <div className="assistant-answer">
                  <p>I’d start with <strong>{item.palette.name}</strong>. {item.palette.description}. The palette pairs {item.palette.mood.toLowerCase()} tones with enough contrast to keep interface text and actions clear.</p>
                  <PaletteCard palette={item.palette} favorite={favorites.includes(item.palette.id)} onFavorite={() => toggleFavorite(item.palette.id)} onCopy={copyText} />
                  <p className="why-it-works"><strong>Why it works:</strong> {item.palette.colors.slice(0, 2).join(" and ")} establish the foundation; {item.palette.colors.slice(-2).join(" and ")} add contrast for highlights, controls, and supporting text.</p>
                  <div className="assistant-actions">
                    <button type="button" onClick={regenerate}>↻ Regenerate</button>
                    <Link to={`/palette/${item.palette.id}`}>See color values ↗</Link>
                  </div>
                </div>
              </div>
            ))}</div>
          )}
          <form className="assistant-input" onSubmit={submit}>
            <label className="visually-hidden" htmlFor="assistant-prompt">Describe your color palette</label>
            <input id="assistant-prompt" value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="e.g. Premium dark fintech dashboard..." />
            <button type="submit">Generate <span>↗</span></button>
          </form>
          <p className="assistant-disclaimer">Palette suggestions are curated from the Huecraft library.</p>
        </section>
        <aside className="assistant-examples"><span className="eyebrow small-eyebrow">NEED A PROMPT?</span><h2>Try one of these.</h2>{examples.map((example) => <button key={example} type="button" onClick={() => setPrompt(example)}>{example}<span>↗</span></button>)}</aside>
      </div>
    </div>
  );
}
