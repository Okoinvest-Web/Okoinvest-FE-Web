// src/lib/widgets/fristenTicker.js
//
// Fristen-Ticker (Welle 4, Paket WIDGETS): die nächsten Fristen eines Landes aus dem Faktenregister,
// aufbereitet für das Embed /widgets/fristen.
//
//  - Auswahl und Datumstexte kommen aus dem bestehenden Baustein src/components/Fakten/FristenListe.js
//    (fristenFuer: keine Entwürfe, keine abgelaufenen Einträge, nach Datum sortiert) – KEINE eigene
//    Auswahl-Logik, damit Website und Widget nie auseinanderlaufen.
//  - Wie dort gilt: keine Countdowns, keine Dringlichkeits-Floskeln – nur Datum, Titel, Quelle, Stand.
//  - Reine Funktionen ohne I/O (testbar mit node --test über das Faktenregister oder eine eigene Liste).

import { fristenFuer, terminText } from "../../components/Fakten/FristenListe.js";
import { anzeigeStatus } from "../fakten/index.js";
import { datumKurzEn, faktEn, quelleTitelEn, terminTextEn } from "../sprache/faktenEn.js";

const datumDe = (iso) => (iso ? `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}` : "");

/**
 * Einträge des Tickers für ein Land ("de" | "at" | "ch"), begrenzt auf `max` (Standard 5).
 * @returns {Array<{ id, titel, terminText, quelleTitel, quelleUrl, stand, geprueft }>}
 */
export function tickerEintraege(landKlein, { heute = new Date(), max = 5, sprache = "de", liste } = {}) {
  const land = String(landKlein || "").toUpperCase();
  if (!["DE", "AT", "CH"].includes(land)) return [];
  const en = sprache === "en";
  return fristenFuer(land, { heute, liste })
    .slice(0, Math.max(1, max))
    .map((f) => {
      const status = anzeigeStatus(f, heute);
      return {
        id: f.id,
        titel: (en && faktEn(f.id, "titel")) || f.wert.titel || "",
        terminText: en ? terminTextEn(f.wert) : terminText(f.wert),
        quelleTitel: en ? quelleTitelEn(f.quelle) : f.quelle?.titel || "",
        quelleUrl: f.quelle?.url || "",
        stand: f.abruf ? (en ? `As at ${datumKurzEn(f.abruf)}` : `Stand ${datumDe(f.abruf)}`) : "",
        geprueft: status === "geprueft",
      };
    });
}
