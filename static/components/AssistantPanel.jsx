import React, { useState } from "react";
import { Link } from "react-router-dom";
import { requestAssistant, useAppState } from "../appState.jsx";
import { palettes } from "../paletteData.js";

const prompts = [
  "Calm palette for a dashboard",
  "Warm colors for a creative portfolio",
  "Premium dark fintech",
];

export default function AssistantPanel() {
  const [prompt, setPrompt] = useState("");
  const [suggestion, setSuggestion] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useAppState();

  const submit = async (event) => {
    event.preventDefault();
    if (!prompt.trim()) {
      showToast("Tell the assistant what you’re designing");
      return;
    }
    setIsLoading(true);
    try {
      const response = await requestAssistant({ mode: "recommend", prompt: prompt.trim(), palettes });
      setSuggestion(response.palette);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "The assistant could not find a palette.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <aside className="assistant-panel" aria-label="Huecraft AI assistant">
      <div className="assistant-panel-heading">
        <span className="ai-icon">✳</span>
        <div><span className="eyebrow small-eyebrow">YOUR CREATIVE SIDEKICK</span><h2>Color assistant</h2></div>
        <span className="assistant-online" title="Ready" />
      </div>
      <p className="assistant-panel-intro">Describe what you’re making and I’ll find a palette to get you started.</p>
      {suggestion ? (
        <div className="assistant-suggestion">
          <span className="eyebrow small-eyebrow">A PALETTE TO TRY</span>
          <div className="assistant-swatch-row">{suggestion.colors.map((color) => <span key={color} style={{ backgroundColor: color }} />)}</div>
          <strong>{suggestion.name}</strong>
          <p>{suggestion.description}</p>
          <Link to={`/palette/${suggestion.id}`}>Explore palette <span>↗</span></Link>
        </div>
      ) : (
        <div className="assistant-prompt-suggestions">
          <span className="assistant-hint">A few ideas to get going</span>
          {prompts.map((item) => (
            <button key={item} type="button" onClick={() => setPrompt(item)}>{item}<span>↗</span></button>
          ))}
        </div>
      )}
      <form className="assistant-panel-form" onSubmit={submit}>
        <label className="visually-hidden" htmlFor="workspace-assistant-prompt">Describe your project or color mood</label>
        <textarea
          id="workspace-assistant-prompt"
          rows="3"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="A mood, a project, a color..."
        />
        <button type="submit" disabled={isLoading}>{isLoading ? "Finding..." : "Find my palette"} <span>↗</span></button>
      </form>
      <Link className="assistant-full-link" to="/assistant">Open full assistant <span>→</span></Link>
    </aside>
  );
}
