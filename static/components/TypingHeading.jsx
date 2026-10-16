import React, { useEffect, useState } from "react";

export default function TypingHeading({
  text,
  accentText = "",
  id,
  className,
}) {
  const [visibleCharacters, setVisibleCharacters] = useState(0);
  const characters = Array.from(text);
  const accentStart = accentText ? text.lastIndexOf(accentText) : -1;
  const accentStartCharacter = accentStart >= 0
    ? Array.from(text.slice(0, accentStart)).length
    : -1;

  useEffect(() => {
    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (motionPreference.matches) {
      setVisibleCharacters(characters.length);
      return undefined;
    }

    setVisibleCharacters(0);
    let visible = 0;
    let timeoutId;
    const typeNextCharacter = () => {
      visible += 1;
      setVisibleCharacters(visible);
      if (visible < characters.length) {
        const character = characters[visible - 1];
        const delay = ".!?".includes(character) ? 150 : character === " " ? 9 : 27;
        timeoutId = window.setTimeout(typeNextCharacter, delay);
      }
    };

    timeoutId = window.setTimeout(typeNextCharacter, 120);
    const showImmediately = (event) => {
      if (event.matches) {
        window.clearTimeout(timeoutId);
        setVisibleCharacters(characters.length);
      }
    };
    motionPreference.addEventListener("change", showImmediately);

    return () => {
      window.clearTimeout(timeoutId);
      motionPreference.removeEventListener("change", showImmediately);
    };
  }, [text]);

  return (
    <h1 id={id} className={className}>
      <span className="visually-hidden">{text}</span>
      <span aria-hidden="true">
        {characters.map((character, index) => {
          const isAccent = accentStartCharacter >= 0 && index >= accentStartCharacter;
          return (
            <span
              className={isAccent ? "typing-heading-accent" : undefined}
              key={`${index}-${character}`}
              style={{ visibility: index < visibleCharacters ? "visible" : "hidden" }}
            >
              {character}
            </span>
          );
        })}
      </span>
    </h1>
  );
}
