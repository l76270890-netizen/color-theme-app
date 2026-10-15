import React, { useEffect, useRef, useState } from "react";
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

const modes = [
  ["generate", "Generate palette"],
  ["recommend", "Find a match"],
  ["ask", "Ask a question"],
];

export default function AssistantPage() {
  const [params] = useSearchParams();
  const [prompt, setPrompt] = useState(() => params.get("prompt") ?? "");
  const [mode, setMode] = useState("generate");
  const [chat, setChat] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const { favorites, toggleFavorite, copyText, showToast } = useAppState();
  const requestId = useRef(0);
  const transcriptRef = useRef(null);

  useEffect(() => {
    const transcript = transcriptRef.current;
    if (transcript) transcript.scrollTo({ top: transcript.scrollHeight, behavior: "smooth" });
  }, [chat]);

  const sendPrompt = async (selectedMode, text) => {
    const normalizedText = text.trim();
    if (!normalizedText) {
      showToast("Tell the assistant what you’re designing");
      return;
    }

    const id = ++requestId.current;
    setIsLoading(true);
    setChat((current) => [...current, {
      id,
      prompt: normalizedText,
      mode: selectedMode,
      loading: true,
    }]);

    try {
      const response = await requestAssistant({
        mode: selectedMode,
        prompt: normalizedText,
        ...(selectedMode === "recommend" ? { palettes } : {}),
      });
      setChat((current) => current.map((item) => (
        item.id === id ? { ...item, ...response, loading: false } : item
      )));
      setPrompt("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "The assistant could not complete your request.";
      setChat((current) => current.map((item) => (
        item.id === id ? { ...item, loading: false, error: message } : item
      )));
      showToast(message);
    } finally {
      setIsLoading(false);
    }
  };

  const submit = (event) => {
    event.preventDefault();
    void sendPrompt(mode, prompt);
  };

  const regenerate = (item) => void sendPrompt(item.mode, item.prompt);

  return (
    <div className="assistant-page page-content">
      <div className="page-heading assistant-page-heading">
        <div className="eyebrow small-eyebrow">YOUR CREATIVE SIDEKICK</div>
        <h1>Your idea, in color.</h1>
        <p>Think out loud with your AI color partner. Explore a direction, refine it, and make it yours.</p>
      </div>
      <div className="assistant-layout">
        <section className="assistant-chat" aria-label="Color assistant chat">
          <div className="assistant-welcome">
            <span className="assistant-welcome-icon" aria-hidden="true">✳</span>
            <div>
              <strong>Huecraft assistant</strong>
              <p>AI-powered color thinking, tailored to your brief.</p>
            </div>
            <span className="assistant-status"><i /> Groq AI</span>
          </div>
          <div ref={transcriptRef} className="assistant-transcript" aria-live="polite">
            {chat.length === 0 ? (
              <div className="assistant-empty">
                <span className="assistant-empty-icon" aria-hidden="true">✳</span>
                <span className="eyebrow small-eyebrow">A FRESH CANVAS</span>
                <h2>What are you making?</h2>
                <p>Start with a project, a feeling, or a color you love. I’ll help you find the right direction.</p>
              </div>
            ) : (
              <div className="chat-history">
                {chat.map((item) => (
                  <div className="chat-turn" key={item.id}>
                    <div className="user-message-row">
                      <span className="message-caption">
                        YOU <span>· {item.mode === "ask" ? "QUESTION" : item.mode === "recommend" ? "PALETTE MATCH" : "PALETTE BRIEF"}</span>
                      </span>
                      <div className="user-message">{item.prompt}</div>
                    </div>
                    <div className="assistant-answer-row">
                      <span className="assistant-message-avatar" aria-hidden="true">✳</span>
                      <div className="assistant-answer">
                        <span className="message-caption">HUECRAFT AI</span>
                        {item.loading ? (
                          <div className="assistant-message-bubble assistant-message-thinking" role="status">
                            <span className="assistant-typing-dots" aria-hidden="true"><i /><i /><i /></span>
                            <span>Thinking through your colors…</span>
                          </div>
                        ) : (
                          <div className={`assistant-message-bubble${item.error ? " is-error" : ""}`}>
                            <p>{item.error || item.answer}</p>
                          </div>
                        )}
                        {item.palette && item.mode === "recommend" && (
                          <PaletteCard
                            palette={item.palette}
                            favorite={favorites.includes(item.palette.id)}
                            onFavorite={() => toggleFavorite(item.palette.id)}
                            onCopy={copyText}
                          />
                        )}
                        {item.palette && item.mode === "generate" && (
                          <section className="generated-palette" aria-label={`Generated palette ${item.palette.name}`}>
                            <div className="generated-palette-heading">
                              <span className="eyebrow small-eyebrow">NEW PALETTE</span>
                              <h3>{item.palette.name}</h3>
                              <p>{item.palette.description}</p>
                            </div>
                            <div className="generated-swatches">
                              {item.palette.colors.map((color, colorIndex) => (
                                <button
                                  key={`${color}-${colorIndex}`}
                                  type="button"
                                  style={{ backgroundColor: color }}
                                  onClick={() => copyText(color, `${color} copied to clipboard`)}
                                  aria-label={`Copy ${color}`}
                                >
                                  <span>{color}</span>
                                </button>
                              ))}
                            </div>
                          </section>
                        )}
                        {!item.loading && !item.error && (
                          <div className="assistant-actions">
                            {item.mode !== "ask" && (
                              <button type="button" onClick={() => regenerate(item)} disabled={isLoading}>↻ Try another</button>
                            )}
                            {item.palette && item.mode === "recommend" && (
                              <Link to={`/palette/${item.palette.id}`}>See color values ↗</Link>
                            )}
                            {item.palette && item.mode === "generate" && (
                              <button type="button" onClick={() => copyText(item.palette.colors.join(", "), "Palette HEX values copied")}>
                                Copy all HEX values
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {chat.length === 0 && (
              <div className="assistant-starter-prompts" aria-label="Example prompts">
                {examples.map((example) => (
                  <button key={example} type="button" onClick={() => setPrompt(example)}>
                    <span aria-hidden="true">✧</span>{example}<span aria-hidden="true">↗</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <form className="assistant-input" onSubmit={submit}>
            <label className="visually-hidden" htmlFor="assistant-prompt">Describe your color palette</label>
            <input
              id="assistant-prompt"
              maxLength={1000}
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder={mode === "ask"
                ? "Ask about color theory, contrast, or combinations…"
                : mode === "recommend"
                  ? "Describe the palette you need…"
                  : "Describe your project, audience, and mood…"}
              disabled={isLoading}
            />
            <button type="submit" disabled={isLoading || !prompt.trim()} aria-label={isLoading ? "Assistant is responding" : "Send message"}>
              {isLoading ? (
                <span className="assistant-send-loading" aria-hidden="true">···</span>
              ) : (
                <>
                  <span>{mode === "ask" ? "Ask" : mode === "recommend" ? "Find match" : "Generate"}</span>
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>
                </>
              )}
            </button>
          </form>
          <div className="assistant-mode-controls" role="group" aria-label="Assistant task">
            {modes.map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={mode === value}
                onClick={() => setMode(value)}
                disabled={isLoading}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="assistant-disclaimer">AI can make mistakes. Check generated colors for accessibility before using them.</p>
        </section>
        <aside className="assistant-examples">
          <span className="eyebrow small-eyebrow">NEED A PROMPT?</span>
          <h2>Start with a direction.</h2>
          <p className="assistant-examples-intro">Pick a prompt to get the conversation moving. You can refine the result afterward.</p>
          {examples.map((example, index) => (
            <button key={example} type="button" onClick={() => setPrompt(example)}>
              <span className="assistant-example-number">0{index + 1}</span>
              <span>{example}</span>
              <span aria-hidden="true">↗</span>
            </button>
          ))}
          <div className="assistant-provider-note"><span aria-hidden="true">✳</span><p>Responses are generated by Groq AI using your selected mode.</p></div>
        </aside>
      </div>
    </div>
  );
}
