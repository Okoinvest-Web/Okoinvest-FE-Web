"use client";

// src/components/formular/CodeEingabe.js
//
// Einmalcode (z. B. 2FA) als Einzelfelder: Tippen springt weiter, Rücktaste zurück, Pfeiltasten,
// Einfügen verteilt den ganzen Code, Autofill (autocomplete="one-time-code") im ersten Feld.
//   <CodeEingabe id="code" label="Code aus der App" wert={code} onChange={setCode} onKomplett={pruefen} fehler={…} />
// Bei neuem `fehler` schüttelt die Gruppe und das erste Feld erhält den Fokus.

import { useEffect, useRef } from "react";
import { cn } from "@/components/ui/cn";
import { signal } from "@/components/ui/motion";
import { FeldMeldung } from "./FeldRahmen";
import { labelKlasse } from "./stil";

const nurZiffern = (s) => String(s || "").replace(/\D+/g, "");

export default function CodeEingabe({ id, label = "Bestätigungscode", hinweis, wert = "", onChange, onKomplett, laenge = 6, fehler, deaktiviert = false, autoFocus = false, dunkel = false, className }) {
  const felder = useRef([]);
  const gruppe = useRef(null);
  const ziffern = Array.from({ length: laenge }, (_, i) => wert[i] || "");

  useEffect(() => {
    if (autoFocus) felder.current[0]?.focus();
  }, [autoFocus]);

  useEffect(() => {
    if (!fehler) return;
    signal(gruppe.current, "schuetteln");
    felder.current[0]?.focus();
  }, [fehler]);

  const setzeWert = (neu) => {
    const w = nurZiffern(neu).slice(0, laenge);
    onChange?.(w);
    if (w.length === laenge) onKomplett?.(w);
    return w;
  };

  const fokus = (i) => {
    const el = felder.current[Math.max(0, Math.min(laenge - 1, i))];
    el?.focus();
    el?.select?.();
  };

  const eingabe = (i, roh) => {
    const neu = nurZiffern(roh);
    if (!neu) return;
    if (neu.length > 1) {
      // Autofill/Einfügen in ein Feld: ab Position i verteilen
      const w = setzeWert((wert.slice(0, i) + neu).slice(0, laenge));
      fokus(Math.min(w.length, laenge - 1));
      return;
    }
    // Werte bleiben lückenlos: getippt wird höchstens an die nächste freie Stelle
    const pos = Math.min(i, wert.length);
    setzeWert(wert.slice(0, pos) + neu + wert.slice(pos + 1));
    if (pos < laenge - 1) fokus(pos + 1);
  };

  const taste = (i, e) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      if (wert[i]) {
        onChange?.(wert.slice(0, i) + wert.slice(i + 1));
      } else if (i > 0) {
        onChange?.(wert.slice(0, i - 1) + wert.slice(i));
        fokus(i - 1);
      }
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      fokus(i - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      fokus(i + 1);
    } else if (e.key === "Home") {
      e.preventDefault();
      fokus(0);
    } else if (e.key === "End") {
      e.preventDefault();
      fokus(laenge - 1);
    }
  };

  const einfuegen = (e) => {
    const text = nurZiffern(e.clipboardData?.getData("text"));
    if (!text) return;
    e.preventDefault();
    const w = setzeWert(text);
    fokus(Math.min(w.length, laenge - 1));
  };

  const beschreibung = fehler ? `${id}-fehler` : hinweis ? `${id}-hinweis` : undefined;

  return (
    <div className={cn("min-w-0", className)}>
      <p id={`${id}-label`} className={labelKlasse(dunkel)}>{label}</p>
      <div ref={gruppe} role="group" aria-labelledby={`${id}-label`} aria-describedby={beschreibung} className="flex gap-2 sm:gap-2.5">
        {ziffern.map((z, i) => (
          <input
            key={i}
            ref={(el) => {
              felder.current[i] = el;
            }}
            id={i === 0 ? id : `${id}-${i}`}
            type="text"
            inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            maxLength={i === 0 ? laenge : 1}
            disabled={deaktiviert}
            value={z}
            aria-label={`Ziffer ${i + 1} von ${laenge}`}
            aria-invalid={fehler ? true : undefined}
            onChange={(e) => eingabe(i, e.target.value)}
            onKeyDown={(e) => taste(i, e)}
            onPaste={einfuegen}
            onFocus={(e) => e.target.select()}
            className={cn(
              "h-14 w-full min-w-0 max-w-[3.5rem] flex-1 rounded-2xl text-center font-display text-[24px] font-bold outline-none ring-1 ring-inset transition-shadow duration-150 ease-ov-out ov-num focus-visible:ring-2 disabled:opacity-60 sm:h-16",
              dunkel ? "bg-white/[0.07] text-white ring-white/15 focus-visible:ring-ov-300" : "bg-white text-ink-900 ring-ink-400 hover:ring-ink-500 focus-visible:ring-ov-500",
              z && !fehler && (dunkel ? "ring-ov-300/60" : "bg-ov-50/60 ring-ov-300"),
              fehler && "ring-2 ring-danger-500",
              i === Math.floor(laenge / 2) - 1 && laenge === 6 && "mr-1.5 sm:mr-3"
            )}
          />
        ))}
      </div>
      <FeldMeldung id={id} fehler={fehler} hinweis={hinweis} dunkel={dunkel} />
    </div>
  );
}
