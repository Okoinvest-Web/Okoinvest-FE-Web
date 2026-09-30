// src/lib/plattform/csv.js
//
// CSV-Export für Excel (deutsch): UTF-8 mit BOM, Semikolon als Trenner, CRLF, Dezimalkomma,
// Datum TT.MM.JJJJ HH:MM (Europe/Vienna). Schutz vor Formel-Injektion: Werte, die mit
// = + - @ Tab oder CR beginnen, werden mit ' eingeleitet (Excel führt sie sonst aus).
// Spalten-Definitionen je Export in EXPORTE (Quelle: Listen-Operationen des Backends).

import { VORGANG_TYPEN, PROJEKT_TYPEN, LAENDER, NETZANSCHLUSS, FLAECHE_NUTZUNG } from "./konstanten";
import { statusLabel } from "./prozesse";
import { phaseById } from "@/lib/invest/markt";

const TZ = "Europe/Vienna";
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

function datumZeitCsv(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: TZ }).replace(",", "");
}

/** Einzelwert → CSV-Feld */
export function csvWert(v) {
  if (v === null || v === undefined) return "";
  let s;
  if (typeof v === "number") s = Number.isFinite(v) ? String(Math.round(v * 10000) / 10000).replace(".", ",") : "";
  else if (typeof v === "boolean") s = v ? "ja" : "nein";
  else if (Array.isArray(v)) s = v.join(", ");
  else s = String(v);
  if (typeof v === "string" && ISO.test(v)) s = datumZeitCsv(v);
  if (/^[=+\-@\t\r]/.test(s) && typeof v !== "number") s = `'${s}`;
  if (/[;"\r\n]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Tabelle → CSV-Text mit BOM */
export function csv(spalten, zeilen) {
  const kopf = spalten.map((s) => csvWert(s.label)).join(";");
  const koerper = zeilen.map((z) => spalten.map((s) => csvWert(typeof s.wert === "function" ? s.wert(z) : z[s.wert])).join(";"));
  return "﻿" + [kopf, ...koerper].join("\r\n") + "\r\n";
}

const name = (k) => (k ? [k.vorname, k.nachname].filter(Boolean).join(" ") : "");

/** Spalten je Export – `wert` ist Feldname oder Funktion */
export const EXPORTE = {
  vorgaenge: {
    titel: "Vorgänge",
    spalten: [
      { label: "Vorgang", wert: "id" },
      { label: "Typ", wert: (x) => VORGANG_TYPEN[x.typ] || x.typ },
      { label: "Status", wert: (x) => statusLabel("vorgang", x.status) },
      { label: "Vorname", wert: (x) => x.kontakt?.vorname },
      { label: "Nachname", wert: (x) => x.kontakt?.nachname },
      { label: "Firma", wert: (x) => x.kontakt?.firma },
      { label: "E-Mail", wert: (x) => x.kontakt?.email },
      { label: "Konto", wert: (x) => x.nutzerId || "" },
      { label: "Zuständig", wert: (x) => name(x.zustaendig) },
      { label: "Fläche", wert: (x) => x.flaecheId || "" },
      { label: "Letzter Kommentar", wert: "letzterKommentar" },
      { label: "Eingegangen", wert: "erstelltAm" },
      { label: "Geändert", wert: "geaendertAm" },
    ],
  },
  flaechen: {
    titel: "Flächen",
    spalten: [
      { label: "Fläche", wert: "id" },
      { label: "Bezeichnung", wert: "bezeichnung" },
      { label: "Status", wert: (x) => statusLabel("flaeche", x.status) },
      { label: "Hektar", wert: "ha" },
      { label: "Nutzung", wert: (x) => FLAECHE_NUTZUNG[x.nutzung] || x.nutzung },
      { label: "Agri-PV", wert: "agri" },
      { label: "Land", wert: (x) => LAENDER[x.land] || x.land },
      { label: "Bundesland", wert: "bundesland" },
      { label: "PLZ", wert: "plz" },
      { label: "Ort", wert: "ort" },
      { label: "Eigentümer", wert: (x) => name(x.eigentuemer) },
      { label: "E-Mail Eigentümer", wert: (x) => x.eigentuemer?.email },
      { label: "Pacht €/ha/Jahr", wert: (x) => x.pachtangebot?.euroProHaJahr ?? "" },
      { label: "Laufzeit (Jahre)", wert: (x) => x.pachtangebot?.laufzeitJahre ?? "" },
      { label: "Unterlagen vollständig (%)", wert: (x) => x.checkliste?.quote ?? "" },
      { label: "Zuständig", wert: (x) => name(x.zustaendig) },
      { label: "Angelegt", wert: "erstelltAm" },
      { label: "Geändert", wert: "geaendertAm" },
    ],
  },
  projekte: {
    titel: "Projekte",
    spalten: [
      { label: "Projekt", wert: "id" },
      { label: "Titel", wert: "titel" },
      { label: "Status", wert: (x) => statusLabel("projekt", x.status) },
      { label: "Typ", wert: (x) => PROJEKT_TYPEN[x.typ] || x.typ },
      { label: "MWp", wert: "mwp" },
      { label: "MWh Speicher", wert: "mwhSpeicher" },
      { label: "Phase", wert: (x) => (x.phase ? phaseById(x.phase).label : "") },
      { label: "Land", wert: (x) => LAENDER[x.land] || x.land },
      { label: "Bundesland", wert: "bundesland" },
      { label: "Region", wert: "region" },
      { label: "Netzanschluss", wert: (x) => NETZANSCHLUSS[x.netzanschluss] || x.netzanschluss },
      { label: "COD geplant", wert: "codGeplant" },
      { label: "Preismodus", wert: "preisModus" },
      { label: "Preis gesamt €", wert: "preis" },
      { label: "Preis €/kWp", wert: "preisProKwp" },
      { label: "Provisionssatz", wert: "provisionSatz" },
      { label: "Aufrufe", wert: (x) => x.statistik?.aufrufe ?? x.aufrufe },
      { label: "Merker", wert: (x) => x.statistik?.merker },
      { label: "NDA-Anfragen", wert: (x) => x.statistik?.ndaAnfragen },
      { label: "LOIs", wert: (x) => x.statistik?.lois },
      { label: "Datenraum-Qualität (%)", wert: (x) => x.checkliste?.quote ?? "" },
      { label: "Anbieter", wert: (x) => name(x.anbieter) },
      { label: "Firma Anbieter", wert: (x) => x.anbieter?.firma },
      { label: "Veröffentlicht", wert: "veroeffentlichtAm" },
      { label: "Geändert", wert: "geaendertAm" },
    ],
  },
  interessen: {
    titel: "Interessen",
    spalten: [
      { label: "Interesse", wert: "id" },
      { label: "Projekt", wert: "projektId" },
      { label: "Projekttitel", wert: (x) => x.projekt?.titel },
      { label: "Status", wert: (x) => statusLabel("interesse", x.status) },
      { label: "Gemerkt", wert: "gemerkt" },
      { label: "Investor", wert: (x) => name(x.investor) },
      { label: "Firma Investor", wert: (x) => x.investor?.firma },
      { label: "E-Mail Investor", wert: (x) => x.investor?.email },
      { label: "NDA akzeptiert", wert: (x) => x.nda?.am || "" },
      { label: "NDA-Version", wert: (x) => x.nda?.version || "" },
      { label: "LOI Betrag €", wert: (x) => x.loi?.betrag ?? "" },
      { label: "LOI abgegeben", wert: (x) => x.loi?.am || "" },
      { label: "Ablehnungsgrund", wert: "ablehnGrund" },
      { label: "Angelegt", wert: "erstelltAm" },
      { label: "Geändert", wert: "geaendertAm" },
    ],
  },
  provisionen: {
    titel: "Provisionen",
    spalten: [
      { label: "Provision", wert: "id" },
      { label: "Projekt", wert: "projektId" },
      { label: "Projekttitel", wert: (x) => x.projekt?.titel },
      { label: "Status", wert: (x) => statusLabel("provision", x.status) },
      { label: "Kaufpreis €", wert: "kaufpreis" },
      { label: "Satz", wert: "satz" },
      { label: "Betrag €", wert: "betrag" },
      { label: "Anbieter", wert: (x) => name(x.anbieter) },
      { label: "Firma Anbieter", wert: (x) => x.anbieter?.firma },
      { label: "Käufer", wert: (x) => name(x.investor) },
      { label: "Firma Käufer", wert: (x) => x.investor?.firma },
      { label: "Erstellt", wert: "erstelltAm" },
    ],
  },
};
export const EXPORT_ARTEN = Object.keys(EXPORTE);
