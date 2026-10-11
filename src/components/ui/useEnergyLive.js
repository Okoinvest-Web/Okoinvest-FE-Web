"use client";

import { useEffect, useState } from "react";
import { useSeitenLand } from "@/components/Land/LandKontext";

// Ein gemeinsamer Abruf pro Seitenaufruf und Land, egal wie viele Widgets ihn nutzen.
const zwischenspeicher = new Map(); // land -> { zeit, daten }
const laufend = new Map(); // land -> Promise

/** "DE" | "AT" | "CH" aus dem Seitenland (null = gemeinsame Seite → DE) */
const landKey = (land) => (land === "AT" || land === "CH" ? land : "DE");

export function ladeEnergie(voll = false, land = null) {
  const key = landKey(land);
  const url = `/api/energie/live?land=${key.toLowerCase()}${voll ? "&voll=1" : ""}`;
  const alt = zwischenspeicher.get(key);
  if (!voll && alt && Date.now() - alt.zeit < 5 * 60000) {
    return Promise.resolve(alt.daten);
  }
  if (!voll && laufend.has(key)) return laufend.get(key);
  const p = fetch(url)
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => {
      if (d && !voll) zwischenspeicher.set(key, { zeit: Date.now(), daten: d });
      return d;
    })
    .catch(() => null)
    .finally(() => {
      if (!voll) laufend.delete(key);
    });
  if (!voll) laufend.set(key, p);
  return p;
}

/**
 * Live-Strommarktdaten (Kennzahlen) des Landes der Seite. Aktualisiert alle 5 Minuten.
 * `land` überstimmt das Seitenland (z. B. Marktdaten-Seite: immer "DE", weil die
 * Vergleichswerte dort deutsche Daten sind).
 */
export default function useEnergyLive({ voll = false, intervall = 5 * 60000, land = null } = {}) {
  const [daten, setDaten] = useState(null);
  const seitenLand = useSeitenLand();
  const key = landKey(land || seitenLand);

  useEffect(() => {
    let aktiv = true;
    const holen = () => ladeEnergie(voll, key).then((d) => aktiv && d && setDaten(d));
    holen();
    const t = setInterval(holen, intervall);
    return () => {
      aktiv = false;
      clearInterval(t);
    };
  }, [voll, intervall, key]);

  return daten;
}

// sprache "en" → englisches Zahlenformat (Sprachmodell); ohne Angabe Deutsch wie bisher
const LOC = (sprache) => (sprache === "en" ? "en-GB" : "de-DE");

export const fmtCt = (eurMwh, stellen = 1, sprache = "de") =>
  (eurMwh / 10).toLocaleString(LOC(sprache), { minimumFractionDigits: stellen, maximumFractionDigits: stellen });

export const fmtGw = (mw, sprache = "de") =>
  (mw / 1000).toLocaleString(LOC(sprache), { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export const fmtUhr = (t) =>
  new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" }).format(new Date(t));
