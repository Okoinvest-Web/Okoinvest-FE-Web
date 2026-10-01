"use client";

// Motion-Helfer des Design-Systems 2.0 (siehe docs/DESIGN.md, Abschnitt Motion).
// Keine Bibliothek – nur IntersectionObserver, View Transitions und matchMedia.

import { useEffect, useState } from "react";

/** Dauern und Kurven als JS-Werte (z. B. für die Web Animations API). */
export const DAUER = { xs: 120, s: 180, m: 240, l: 420, xl: 700, zahl: 1400 };
export const KURVE = {
  out: "cubic-bezier(0.22, 1, 0.36, 1)",
  inOut: "cubic-bezier(0.65, 0, 0.35, 1)",
  feder: "cubic-bezier(0.34, 1.56, 0.64, 1)",
};

/** true, wenn das Betriebssystem „Bewegung reduzieren“ meldet. Server: false. */
export function bewegungReduziert() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Hook-Variante, reagiert auf Umschalten der Systemeinstellung. */
export function useReduzierteBewegung() {
  const [reduziert, setReduziert] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const aktualisieren = () => setReduziert(mq.matches);
    aktualisieren();
    mq.addEventListener?.("change", aktualisieren);
    return () => mq.removeEventListener?.("change", aktualisieren);
  }, []);
  return reduziert;
}

/**
 * Zustandswechsel mit View Transition (weiches Überblenden zwischen zwei
 * Ansichten, z. B. Filter, Tabs, Listen ↔ Karten). Ohne Browser-Unterstützung
 * oder bei reduzierter Bewegung wird `aenderung` direkt ausgeführt.
 *
 *   mitUebergang(() => setAnsicht("karte"));
 */
export function mitUebergang(aenderung) {
  if (typeof document === "undefined" || !document.startViewTransition || bewegungReduziert()) {
    aenderung();
    return;
  }
  document.startViewTransition(() => {
    aenderung();
  });
}

/**
 * true, sobald das Element einmal sichtbar war (für Diagramm-Einlauf,
 * Ringe, Zähler). `einmal: false` meldet auch das Verlassen.
 */
export function useSichtbar(ref, { schwelle = 0.25, einmal = true, rand = "0px 0px -8% 0px" } = {}) {
  const [sichtbar, setSichtbar] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setSichtbar(true);
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setSichtbar(true);
          if (einmal) io.disconnect();
        } else if (!einmal) {
          setSichtbar(false);
        }
      },
      { threshold: schwelle, rootMargin: rand }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, schwelle, einmal, rand]);
  return sichtbar;
}

/**
 * Kurzes Aufmerksamkeits-Signal per Web Animations API (nur transform),
 * z. B. wenn ein Wert sich ändert oder ein Feld fehlerhaft ist.
 * art: "puls" (kurz größer) | "schuetteln" (Fehler) | "hoch" (neu eingetroffen)
 */
export function signal(el, art = "puls") {
  if (!el?.animate || bewegungReduziert()) return;
  const frames = {
    puls: [{ transform: "scale(1)" }, { transform: "scale(1.06)" }, { transform: "scale(1)" }],
    schuetteln: [
      { transform: "translateX(0)" },
      { transform: "translateX(-6px)" },
      { transform: "translateX(5px)" },
      { transform: "translateX(-3px)" },
      { transform: "translateX(0)" },
    ],
    hoch: [{ transform: "translateY(6px)", opacity: 0.4 }, { transform: "none", opacity: 1 }],
  }[art];
  el.animate(frames, { duration: art === "schuetteln" ? 380 : DAUER.l, easing: KURVE.out });
}
