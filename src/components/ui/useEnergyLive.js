"use client";

import { useEffect, useState } from "react";

// Ein gemeinsamer Abruf pro Seitenaufruf, egal wie viele Widgets ihn nutzen.
let zwischenspeicher = null;
let laufend = null;

export function ladeEnergie(voll = false) {
  if (!voll && zwischenspeicher && Date.now() - zwischenspeicher.zeit < 5 * 60000) {
    return Promise.resolve(zwischenspeicher.daten);
  }
  if (!voll && laufend) return laufend;
  const p = fetch(`/api/energie/live${voll ? "?voll=1" : ""}`)
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => {
      if (d && !voll) zwischenspeicher = { zeit: Date.now(), daten: d };
      return d;
    })
    .catch(() => null)
    .finally(() => {
      if (!voll) laufend = null;
    });
  if (!voll) laufend = p;
  return p;
}

/** Live-Strommarktdaten (Kennzahlen). Aktualisiert alle 5 Minuten. */
export default function useEnergyLive({ voll = false, intervall = 5 * 60000 } = {}) {
  const [daten, setDaten] = useState(null);

  useEffect(() => {
    let aktiv = true;
    const holen = () => ladeEnergie(voll).then((d) => aktiv && d && setDaten(d));
    holen();
    const t = setInterval(holen, intervall);
    return () => {
      aktiv = false;
      clearInterval(t);
    };
  }, [voll, intervall]);

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
