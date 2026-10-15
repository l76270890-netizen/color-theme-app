import React, { useState } from "react";
import { Link } from "react-router-dom";
import { requestAssistant, useAppState } from "../appState.jsx";
import { palettes } from "../paletteData.js";

const prompts = [
  "What colors make a workspace feel calm and focused?",
  "Create a warm palette for a creative portfolio",
  "Find an existing palette for a premium dark fintech app",
];

const modes = [
  { value: "ask", label: "Ask" },
  { value: "generate", label: "Generate" },
  { value: "recommend", label: "Find a palette" },
];

export default function AssistantPanel() {
  const [prompt, setPrompt] = useState("");
  const [mode, setMode] = useState("ask");
  const [reply, setReply] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const { copyText, showToast } = useAppState();

  const submit = async (event) => {
    event.preventDefault();
    if (!prompt.trim()) {
      showToast("Tell the assistant what you’re designing");
      return;
    }
    setIsLoading(true);
    try {
      const response = await requestAssistant({
        mode,
        prompt: prompt.trim(),
        ...(mode === "recommend" ? { palettes } : {}),
      });
      setReply(response);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "The assistant could not complete your request.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <aside className="assistant-panel" aria-label="Huecraft AI assistant">
      <div className="assistant-panel-heading">
        <span className="eyebrow small-eyebrow">YOUR CREATIVE SIDEKICK</span>
        <span className="assistant-online" title="Ready" />
        <h2>Meet AI Mode</h2>
        <p>Ask detailed questions for better color ideas.</p>
      </div>
      {reply && (
        <div className="assistant-reply" aria-live="polite">
          <p>{reply.answer}</p>
          {reply.palette && (
            <div className="assistant-reply-palette">
              <div className="assistant-swatch-row">
                {reply.palette.colors.map((color, index) => (
                  <button
                    key={`${color}-${index}`}
                    type="button"
                    style={{ backgroundColor: color }}
                    onClick={() => copyText(color, `${color} copied to clipboard`)}
                    aria-label={`Copy ${color}`}
                  />
                ))}
              </div>
              <strong>{reply.palette.name}</strong>
              <span>{reply.palette.description}</span>
              {reply.mode === "recommend" && (
                <Link to={`/palette/${reply.palette.id}`}>Explore palette <span>↗</span></Link>
              )}
            </div>
          )}
        </div>
      )}
      <form className="assistant-panel-form" onSubmit={submit}>
        <label className="visually-hidden" htmlFor="workspace-assistant-prompt">Ask about colors or describe a palette</label>
        <textarea
          id="workspace-assistant-prompt"
          rows="2"
          maxLength={1000}
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="Ask anything about color..."
          disabled={isLoading}
        />
        <div className="assistant-composer-tools">
          <span className="assistant-mode-label">{modes.find((item) => item.value === mode)?.label}</span>
          <button type="submit" disabled={isLoading || !prompt.trim()} aria-label={isLoading ? "Assistant is responding" : "Send prompt"}>
            {isLoading ? "…" : (
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 19V5m-7 7 7-7 7 7" />
              </svg>
            )}
          </button>
        </div>
      </form>
      <div className="assistant-mode-controls" role="group" aria-label="Assistant mode">
        {modes.map((item) => (
          <button
            key={item.value}
            type="button"
            aria-pressed={mode === item.value}
            onClick={() => setMode(item.value)}
            disabled={isLoading}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="assistant-prompt-suggestions">
        <span className="assistant-hint">Try asking</span>
        {prompts.map((item) => (
          <button key={item} type="button" onClick={() => setPrompt(item)} disabled={isLoading}>
            <span aria-hidden="true">✧</span>{item}
          </button>
        ))}
      </div>
      <Link className="assistant-full-link" to="/assistant">Open full assistant <span>→</span></Link>
    </aside>
  );
}
