"use client";

import { useEffect, useRef, useState } from "react";
import { ladeEnergie } from "@/components/ui/useEnergyLive";
import { useSeitenLand } from "@/components/Land/LandKontext";

// Alle Dashboard-Bausteine einer Seite teilen sich einen Abruf der vollen
// Zeitreihen (`/api/energie/live?voll=1`) statt ihn je Baustein zu wiederholen.
// Je Land getrennt (Seite /at/energie-live zeigt die österreichischen Daten).
const zwischenspeicher = new Map(); // land -> { zeit, daten }
const laufend = new Map(); // land -> Promise

function ladeVoll(land) {
  const key = land === "AT" || land === "CH" ? land : "DE";
  const alt = zwischenspeicher.get(key);
  if (alt && Date.now() - alt.zeit < 60000) return Promise.resolve(alt.daten);
  if (laufend.has(key)) return laufend.get(key);
  const p = ladeEnergie(true, key)
    .then((d) => {
      if (d) zwischenspeicher.set(key, { zeit: Date.now(), daten: d });
      return d;
    })
    .finally(() => {
      laufend.delete(key);
    });
  laufend.set(key, p);
  return p;
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
  const land = useSeitenLand();

  useEffect(() => {
    let aktiv = true;
    const holen = () => ladeVoll(land).then((d) => aktiv && d && setLive(d));
    holen();
    setJetzt(Date.now());
    const t1 = setInterval(holen, intervall);
    const t2 = setInterval(() => setJetzt(Date.now()), 60000);
    return () => {
      aktiv = false;
      clearInterval(t1);
      clearInterval(t2);
    };
  }, [intervall, land]);

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
