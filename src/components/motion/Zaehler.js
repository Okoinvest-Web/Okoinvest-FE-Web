"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/components/ui/cn";
import { useSprache } from "@/components/Sprache/SpracheKontext";

const formatierer = new Map();
function format(sprache, nachkomma) {
  const key = `${sprache}|${nachkomma}`;
  if (!formatierer.has(key)) {
    formatierer.set(key, new Intl.NumberFormat(sprache, { minimumFractionDigits: nachkomma, maximumFractionDigits: nachkomma }));
  }
  return formatierer.get(key);
}

/**
 * Zaehler – zählt eine Zahl hoch, sobald sie zur Hälfte im Bild ist.
 *
 * - Server-HTML enthält bereits den Endwert (SEO, ohne JS korrekt, kein Hydration-Mismatch).
 * - Kein Layout-Sprung: Ein unsichtbarer Platzhalter mit dem Endwert reserviert die Breite.
 * - Kein React-Rendern pro Frame: Die Ziffern werden direkt per rAF ins DOM geschrieben.
 * - Reduzierte Bewegung, schon vorbeigescrollt oder Wert 0 → steht sofort auf dem Endwert.
 * - Ändert sich `wert` später (z. B. Rechner), springt die Anzeige ohne erneutes Zählen.
 *
 * NUR Werte zählen, die ohnehin auf der Seite stehen (kein erfundener Social Proof,
 * keine Live-Zähler).
 *
 * @param {object} p
 * @param {number} p.wert              Endwert (Zahl, nicht String).
 * @param {number} [p.nachkomma=0]     Nachkommastellen.
 * @param {string} [p.vor]             Text davor, z. B. "+" oder "€ ".
 * @param {string} [p.nach]            Text danach, z. B. " MWp" oder " %".
 * @param {number} [p.dauer=1400]      Dauer in ms.
 * @param {number} [p.verzoegerung=0]  Startversatz in ms (z. B. für Kennzahlen-Reihen).
 * @param {string} [p.sprache]        Zahlenformat; ohne Angabe nach Sprache der Seite ("de-DE" bzw. "en-GB").
 * @param {string} [p.className]
 *
 * @example
 * <p className="ov-kpi-l"><Zaehler wert={48.6} nachkomma={1} nach=" MWp" /></p>
 */
export default function Zaehler({ wert, nachkomma = 0, vor = "", nach = "", dauer = 1400, verzoegerung = 0, sprache, className }) {
  const seitenSprache = useSprache();
  const ref = useRef(null);
  const gezaehlt = useRef(false); // nur der erste Eintritt zählt – spätere Wertänderungen springen direkt
  const ziel = Number(wert) || 0;
  const fmt = format(sprache ?? (seitenSprache === "en" ? "en-GB" : "de-DE"), nachkomma);
  const endText = `${vor}${fmt.format(ziel)}${nach}`;

  useEffect(() => {
    const el = ref.current;
    if (!el || !ziel || gezaehlt.current || typeof IntersectionObserver === "undefined") return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;

    let raf = 0;
    let timer = 0;
    let laeuft = false;
    // Den von React verwalteten Textknoten beschreiben (nicht ersetzen), damit
    // spätere Re-Renders ihn weiter aktualisieren können.
    const knoten = el.firstChild;
    const setzen = (text) => {
      if (knoten) knoten.nodeValue = text;
    };
    const schreiben = (v) => setzen(`${vor}${fmt.format(v)}${nach}`);
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        gezaehlt.current = true;
        laeuft = true;
        schreiben(0);
        timer = setTimeout(() => {
          const start = performance.now();
          const schritt = (t) => {
            const p = Math.min((t - start) / dauer, 1);
            // expo-out: schnell los, weich ankommen
            const k = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
            schreiben(ziel * k);
            if (p < 1) raf = requestAnimationFrame(schritt);
            else {
              laeuft = false;
              setzen(endText);
            }
          };
          raf = requestAnimationFrame(schritt);
        }, verzoegerung);
      },
      { threshold: 0.5 }
    );
    // Schon oberhalb des Viewports (Zurück-Navigation)? Dann nicht mehr zählen.
    if (el.getBoundingClientRect().bottom > 0) io.observe(el);
    return () => {
      io.disconnect();
      clearTimeout(timer);
      cancelAnimationFrame(raf);
      // Abbruch mitten im Zählen: aktuellen Endwert aus dem Platzhalter übernehmen
      // (React hat ihn beim Commit bereits aktualisiert).
      if (laeuft) setzen(el.previousSibling?.textContent ?? endText);
    };
  }, [ziel, dauer, verzoegerung, vor, nach, fmt, endText]);

  return (
    <span className={cn("ov-num inline-grid", className)}>
      <span aria-hidden="true" className="invisible [grid-area:1/1]">
        {endText}
      </span>
      <span ref={ref} className="text-right [grid-area:1/1]">
        {endText}
      </span>
    </span>
  );
}
