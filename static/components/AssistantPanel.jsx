import React, { useEffect, useRef, useState } from "react";
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
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const {
    assistantHistory,
    assistantHistoryReady,
    assistantHistoryGeneration,
    assistantBusy,
    copyText,
    clearAssistantHistory,
    finishAssistantRequest,
    isSignedIn,
    profile,
    saveAssistantMessage,
    showToast,
    startAssistantRequest,
  } = useAppState();
  const messageId = useRef(0);
  const conversationRef = useRef(null);
  const conversationMessages = [...assistantHistory, ...messages];

  useEffect(() => {
    const conversation = conversationRef.current;
    if (conversation) conversation.scrollTo({ top: conversation.scrollHeight, behavior: "smooth" });
  }, [assistantHistory, messages]);

  useEffect(() => {
    setMessages([]);
  }, [profile.email, assistantHistoryGeneration]);

  const submit = async (event) => {
    event.preventDefault();
    if (isLoading) return;
    const text = prompt.trim();
    if (!text) {
      showToast("Tell the assistant what you’re designing");
      return;
    }
    const id = ++messageId.current;
    try {
      startAssistantRequest();
    } catch (error) {
      showToast(error.message);
      return;
    }
    setIsLoading(true);
    setPrompt("");
    setMessages((current) => [...current, {
      id,
      prompt: text,
      mode,
      loading: true,
    }]);
    try {
      const response = await requestAssistant({
        mode,
        prompt: text,
        ...(mode === "recommend" ? { palettes } : {}),
      });
      const savedMessage = { ...response, id, prompt: text, loading: false };
      setMessages((current) => current.map((message) => (
        message.id === id ? savedMessage : message
      )));
      if (isSignedIn) {
        try {
          await saveAssistantMessage(savedMessage);
          setMessages((current) => current.filter((message) => message.id !== id));
        } catch (error) {
          console.error("Could not save the AI conversation:", error);
          showToast(`AI replied, but the conversation could not be saved: ${error.message}`);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "The assistant could not complete your request.";
      setMessages((current) => current.map((entry) => (
        entry.id === id ? { ...entry, loading: false, error: message } : entry
      )));
      showToast(message);
    } finally {
      finishAssistantRequest();
      setIsLoading(false);
    }
  };

  const clearConversation = async () => {
    if (isLoading || assistantBusy || !conversationMessages.length) return;
    const confirmation = isSignedIn
      ? "Delete this AI conversation from your account?"
      : "Delete this AI conversation? This cannot be undone.";
    if (!window.confirm(confirmation)) return;
    try {
      await clearAssistantHistory();
      setMessages([]);
      showToast("AI conversation deleted");
    } catch (error) {
      console.error("Could not delete the AI conversation:", error);
      showToast(`Could not delete the AI conversation: ${error.message}`);
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
      {conversationMessages.length > 0 && (
        <div className="assistant-conversation-actions">
          <span>YOUR CONVERSATION</span>
          <button type="button" onClick={clearConversation} disabled={isLoading || assistantBusy}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6m4-6v6M6 7l1 14h10l1-14M9 7V4h6v3" /></svg>
            Clear chat
          </button>
        </div>
      )}
      <div ref={conversationRef} className={`assistant-conversation${conversationMessages.length ? " has-messages" : ""}`} aria-live="polite">
        {!assistantHistoryReady && isSignedIn ? (
          <div className="assistant-conversation-empty" role="status">Restoring your AI conversation…</div>
        ) : conversationMessages.length === 0 ? (
          <div className="assistant-conversation-empty">
            <span className="assistant-empty-mark" aria-hidden="true">✳</span>
            <strong>Your color copilot is ready.</strong>
            <p>Ask a question, describe a palette, or find a match.</p>
          </div>
        ) : conversationMessages.map((message) => (
          <div className="assistant-conversation-turn" key={message.id}>
            <div className="assistant-user-bubble">{message.prompt}</div>
            <div className="assistant-bot-row">
              <span className="assistant-avatar" aria-hidden="true">✳</span>
              <div className="assistant-bot-content">
                {message.loading ? (
                  <div className="assistant-bot-bubble assistant-thinking" role="status">
                    <span className="assistant-typing-dots" aria-hidden="true"><i /><i /><i /></span>
                    <span>Thinking through your colors…</span>
                  </div>
                ) : (
                  <div className={`assistant-bot-bubble${message.error ? " is-error" : ""}`}>
                    {message.error ? <p>{message.error}</p> : <p>{message.answer}</p>}
                  </div>
                )}
                {message.palette && (
                  <div className="assistant-reply-palette">
                    <div className="assistant-swatch-row">
                      {message.palette.colors.map((color, index) => (
                        <button
                          key={`${color}-${index}`}
                          type="button"
                          style={{ backgroundColor: color }}
                          onClick={() => copyText(color, `${color} copied to clipboard`)}
                          aria-label={`Copy ${color}`}
                        />
                      ))}
                    </div>
                    <strong>{message.palette.name}</strong>
                    <span>{message.palette.description}</span>
                    {message.mode === "recommend" && (
                      <Link to={`/palette/${message.palette.id}`}>Explore palette <span>↗</span></Link>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        {assistantHistoryReady && conversationMessages.length === 0 && (
          <div className="assistant-prompt-suggestions">
            <span className="assistant-hint">TRY ONE OF THESE</span>
            {prompts.slice(0, 2).map((item) => (
              <button key={item} type="button" onClick={() => setPrompt(item)} disabled={isLoading}>
                <span aria-hidden="true">✧</span>{item}
              </button>
            ))}
          </div>
        )}
      </div>
      <form className="assistant-panel-form" onSubmit={submit}>
        <label className="visually-hidden" htmlFor="workspace-assistant-prompt">Ask about colors or describe a palette</label>
        <textarea
          id="workspace-assistant-prompt"
          rows="2"
          maxLength={1000}
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="Ask anything about color..."
          disabled={isLoading || assistantBusy}
        />
        <div className="assistant-composer-tools">
          <span className="assistant-mode-label">{modes.find((item) => item.value === mode)?.label}</span>
          <button type="submit" disabled={isLoading || assistantBusy || !prompt.trim()} aria-label={isLoading ? "Assistant is responding" : "Send prompt"}>
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
            disabled={isLoading || assistantBusy}
          >
            {item.label}
          </button>
        ))}
      </div>
      <Link className="assistant-full-link" to="/assistant">Open full assistant <span>→</span></Link>
    </aside>
  );
}
