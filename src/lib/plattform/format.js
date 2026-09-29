// src/lib/plattform/format.js
//
// Anzeigeformate der Plattform (Datum, Leistung, Preis). Zahlformate aus
// src/lib/rechner/annahmen.js. Client- und serverseitig nutzbar.

import { fmt, fmtEur, fmtMio } from "@/lib/rechner/annahmen";
import { PREIS_MODUS } from "./konstanten";

const TZ = "Europe/Vienna";

export function datum(iso) {
  if (!iso) return "–";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "–" : d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: TZ });
}

export function datumZeit(iso) {
  if (!iso) return "–";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "–"
    : d.toLocaleString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: TZ });
}

/** „vor 5 Min.“, „vor 3 Std.“, sonst Datum */
export function relativ(iso, jetzt = Date.now()) {
  if (!iso) return "–";
  const diff = (jetzt - new Date(iso).getTime()) / 1000;
  if (!Number.isFinite(diff)) return "–";
  if (diff < 60) return "gerade eben";
  if (diff < 3600) return `vor ${Math.floor(diff / 60)} Min.`;
  if (diff < 86400) return `vor ${Math.floor(diff / 3600)} Std.`;
  if (diff < 86400 * 7) return `vor ${Math.floor(diff / 86400)} Tg.`;
  return datum(iso);
}

export const mwp = (n) => (Number.isFinite(Number(n)) ? `${fmt(Number(n), Number(n) < 10 ? 1 : 0)} MWp` : "–");
export const ha = (n) => (Number.isFinite(Number(n)) ? `${fmt(Number(n), Number.isInteger(Number(n)) ? 0 : 1)} ha` : "–");
export const eur = (n) => (Number.isFinite(Number(n)) ? fmtEur(Number(n)) : "–");
export const prozent = (n, stellen = 1) => (Number.isFinite(Number(n)) ? `${fmt(Number(n) * 100, stellen)} %` : "–");

/** Preisindikation eines Projekts für Karten und Exposé */
export function preisText(p) {
  if (!p || p.preisModus === "anfrage" || (!p.preis && !p.preisProKwp)) return PREIS_MODUS.anfrage;
  if (p.preisModus === "proKwp" && p.preisProKwp) return `${fmt(p.preisProKwp)} €/kWp`;
  if (p.preis) return p.preis >= 1e6 ? fmtMio(p.preis, 2) : fmtEur(p.preis);
  return PREIS_MODUS.anfrage;
}

/** Kaufpreis gesamt (für Ticket-Abgleich), null wenn „auf Anfrage“ */
export function preisGesamt(p) {
  if (!p || p.preisModus === "anfrage") return null;
  if (p.preisModus === "proKwp" && p.preisProKwp && p.mwp) return p.preisProKwp * p.mwp * 1000;
  return p.preis || null;
}

export function name(n) {
  if (!n) return "–";
  return [n.vorname, n.nachname].filter(Boolean).join(" ") || n.email || "–";
}

export function initialen(n) {
  const s = [n?.vorname?.[0], n?.nachname?.[0]].filter(Boolean).join("");
  return (s || n?.email?.[0] || "?").toUpperCase();
}

const FELD_LABELS = {
  ha: "Fläche (ha)",
  hektar: "Fläche (ha)",
  flaecheHa: "Fläche (ha)",
  nachricht: "Nachricht",
  verbrauchMwh: "Verbrauch (MWh/Jahr)",
  verbrauch: "Verbrauch",
  standorte: "Standorte",
  stellplaetze: "Stellplätze",
  anteile: "Anteile",
  ticket: "Ticket",
  modell: "Modell",
  mw: "Leistung (MW)",
  kwp: "Leistung (kWp)",
  mwp: "Leistung (MWp)",
  land: "Land",
  thema: "Thema",
  nutzung: "Nutzung",
  bundesland: "Bundesland",
};

/** Lesbare Bezeichnung für freie Zusatzdaten einer Anfrage */
export function feldLabel(k) {
  if (FELD_LABELS[k]) return FELD_LABELS[k];
  const s = String(k).replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function wertText(v) {
  if (v === true) return "Ja";
  if (v === false) return "Nein";
  if (typeof v === "number") return Number.isInteger(v) ? v.toLocaleString("de-DE") : v.toLocaleString("de-DE", { maximumFractionDigits: 2 });
  if (Array.isArray(v)) return v.map(wertText).join(", ");
  if (v && typeof v === "object") return Object.entries(v).map(([k, x]) => `${feldLabel(k)}: ${wertText(x)}`).join(" · ");
  return String(v ?? "");
}

export function dateigroesse(b) {
  if (!Number.isFinite(b)) return "–";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${fmt(b / 1024, 0)} KB`;
  return `${fmt(b / 1024 / 1024, 1)} MB`;
}
