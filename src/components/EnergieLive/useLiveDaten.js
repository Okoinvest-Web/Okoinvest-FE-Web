"use client";

import { useEffect, useRef, useState } from "react";
import { ladeEnergie } from "@/components/ui/useEnergyLive";

// Alle Dashboard-Bausteine einer Seite teilen sich einen Abruf der vollen
// Zeitreihen (`/api/energie/live?voll=1`) statt ihn je Baustein zu wiederholen.
let zwischenspeicher = null;
let laufend = null;

function ladeVoll() {
  if (zwischenspeicher && Date.now() - zwischenspeicher.zeit < 60000) return Promise.resolve(zwischenspeicher.daten);
  if (laufend) return laufend;
  laufend = ladeEnergie(true)
    .then((d) => {
      if (d) zwischenspeicher = { zeit: Date.now(), daten: d };
      return d;
    })
    .finally(() => {
      laufend = null;
    });
  return laufend;
}

/**
 * Live-Daten mit Server-Startwert.
 * - Erstes Rendern = Server-HTML (SEO, keine Hydration-Abweichung).
 * - Danach alle 5 Minuten aktualisiert; „jetzt" läuft minütlich weiter.
 * - Liefert ein Abruf leere Reihen (Quelle kurz gestört), bleiben die
 *   bisherigen Werte stehen – Diagramme werden nie leer.
 */
export default function useLiveDaten(initial, { intervall = 5 * 60000 } = {}) {
  const [live, setLive] = useState(null);
  const [jetzt, setJetzt] = useState(null);

  useEffect(() => {
    let aktiv = true;
    const holen = () => ladeVoll().then((d) => aktiv && d && setLive(d));
    holen();
    setJetzt(Date.now());
    const t1 = setInterval(holen, intervall);
    const t2 = setInterval(() => setJetzt(Date.now()), 60000);
    return () => {
      aktiv = false;
      clearInterval(t1);
      clearInterval(t2);
    };
  }, [intervall]);

  const preisOk = live?.preis?.punkte?.length > 0;
  const erzeugungOk = live?.erzeugung?.zeitpunkt != null;
  const daten = {
    stand: (preisOk || erzeugungOk ? live.stand : initial?.stand) || null,
    preis: preisOk ? live.preis : initial?.preis || null,
    erzeugung: erzeugungOk ? live.erzeugung : initial?.erzeugung || null,
  };
  const standMs = daten.stand ? Date.parse(daten.stand) : 0;
  return { daten, jetzt: jetzt ?? standMs, live: preisOk || erzeugungOk };
}

/** Breite eines Elements in px (für pixelgenaue SVG-Diagramme ohne Verzerrung) */
export function useBreite(standard = 960) {
  const ref = useRef(null);
  const [breite, setBreite] = useState(standard);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([e]) => {
      const w = Math.round(e.contentRect.width);
      if (w > 0) setBreite(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, breite];
}
