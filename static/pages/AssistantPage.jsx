import React, { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import PaletteCard from "../components/PaletteCard.jsx";
import { requestAssistant, useAppState } from "../appState.jsx";
import { palettes } from "../paletteData.js";
import "./AssistantPage.css";

const examples = [
  "Create a premium dark color scheme for a fintech dashboard",
  "Make a warm, playful palette for an online shop",
  "I need a calm pastel palette for a portfolio",
];

export default function AssistantPage() {
  const [params] = useSearchParams();
  const [prompt, setPrompt] = useState(() => params.get("prompt") ?? "");
  const [mode, setMode] = useState("generate");
  const [chat, setChat] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const { favorites, toggleFavorite, copyText, showToast } = useAppState();
  const latest = chat.at(-1);

  const sendPrompt = async (selectedMode, text) => {
    if (!text.trim()) {
      showToast("Tell the assistant what you’re designing");
      return;
    }
    setIsLoading(true);
    try {
      const response = await requestAssistant({
        mode: selectedMode,
        prompt: text.trim(),
        ...(selectedMode === "recommend" ? { palettes } : {}),
      });
      setChat((current) => [...current, {
        prompt: text.trim(),
        mode: selectedMode,
        answer: response.answer,
        palette: response.palette,
      }]);
      setPrompt("");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "The assistant could not complete your request.");
    } finally {
      setIsLoading(false);
    }
  };

  const submit = (event) => {
    event.preventDefault();
    void sendPrompt(mode, prompt);
  };

  const regenerate = () => latest && void sendPrompt(latest.mode, latest.prompt);

  return (
    <div className="assistant-page page-content">
      <div className="page-heading"><div className="eyebrow small-eyebrow">YOUR CREATIVE SIDEKICK</div><h1>Your idea, in color.</h1><p>Describe the project and mood. Get a curated palette to start with.</p></div>
      <div className="assistant-layout">
        <section className="assistant-chat" aria-label="Color assistant chat">
          <div className="assistant-welcome"><span className="ai-icon">✳</span><div><strong>Huecraft assistant</strong><p>Generate a new palette, find a Huecraft match, or ask a color question.</p></div></div>
          {chat.length === 0 ? (
            <div className="assistant-empty"><span>✳</span><h2>What are you making?</h2><p>Start with a project, a feeling, or a color you love.</p></div>
          ) : (
            <div className="chat-history">{chat.map((item, index) => (
              <div className="chat-turn" key={`${item.mode}-${index}`}>
                <div className="user-message">{item.prompt}</div>
                <div className="assistant-answer">
                  <p>{item.answer}</p>
                  {item.palette && item.mode === "recommend" && (
                    <PaletteCard palette={item.palette} favorite={favorites.includes(item.palette.id)} onFavorite={() => toggleFavorite(item.palette.id)} onCopy={copyText} />
                  )}
                  {item.palette && item.mode === "generate" && (
                    <section className="generated-palette" aria-label={`Generated palette ${item.palette.name}`}>
                      <div><span className="eyebrow small-eyebrow">NEW PALETTE</span><h3>{item.palette.name}</h3><p>{item.palette.description}</p></div>
                      <div className="generated-swatches">{item.palette.colors.map((color, colorIndex) => (
                        <button key={`${color}-${colorIndex}`} type="button" style={{ backgroundColor: color }} onClick={() => copyText(color, `${color} copied to clipboard`)} aria-label={`Copy ${color}`}>
                          <span>{color}</span>
                        </button>
                      ))}</div>
                    </section>
                  )}
                  <div className="assistant-actions">
                    {item.mode !== "ask" && <button type="button" onClick={regenerate} disabled={isLoading}>↻ Regenerate</button>}
                    {item.palette && item.mode === "recommend" && <Link to={`/palette/${item.palette.id}`}>See color values ↗</Link>}
                    {item.palette && item.mode === "generate" && <button type="button" onClick={() => copyText(item.palette.colors.join(", "), "Palette HEX values copied")}>Copy all HEX values</button>}
                  </div>
                </div>
              </div>
            ))}</div>
          )}
          <form className="assistant-input" onSubmit={submit}>
            <label className="visually-hidden" htmlFor="assistant-prompt">Describe your color palette</label>
            <input id="assistant-prompt" maxLength={1000} value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder={mode === "ask" ? "Ask about color theory or contrast..." : "e.g. Premium dark fintech dashboard..."} disabled={isLoading} />
            <button type="submit" disabled={isLoading}>{isLoading ? "Thinking..." : mode === "ask" ? "Ask" : mode === "recommend" ? "Find match" : "Generate"} <span>↗</span></button>
          </form>
          <div className="assistant-mode-controls" role="group" aria-label="Assistant task">
            {[["generate", "Generate palette"], ["recommend", "Find a match"], ["ask", "Ask a question"]].map(([value, label]) => (
              <button key={value} type="button" aria-pressed={mode === value} onClick={() => setMode(value)} disabled={isLoading}>{label}</button>
            ))}
          </div>
          <p className="assistant-disclaimer">Powered by Groq. Generated colors should be checked for accessibility before use.</p>
        </section>
        <aside className="assistant-examples"><span className="eyebrow small-eyebrow">NEED A PROMPT?</span><h2>Try one of these.</h2>{examples.map((example) => <button key={example} type="button" onClick={() => setPrompt(example)}>{example}<span>↗</span></button>)}</aside>
      </div>
    </div>
  );
}
