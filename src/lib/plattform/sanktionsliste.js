// src/lib/plattform/sanktionsliste.js
//
// Sanktionslisten-Abgleich (KYC/KYB): Einlesen der konsolidierten EU-Finanzsanktionsliste und unscharfer
// Namens-/Geburtsdatums-Abgleich. Reine Funktionen ohne Node-/Alias-Importe – nutzbar im Server (Demo-Backend)
// und im Import-Skript scripts/kyc-sanktionsliste-import.mjs. Python-Gegenstück: plattform/kyc_kern.py.
//
// Offizielle Datenquelle (Download NICHT automatisch im Code – dokumentierter Import, siehe docs/PLATTFORM.md):
//   „Consolidated list of persons, groups and entities subject to EU financial sanctions“ (Financial Sanctions Files, FSF)
//   der Europäischen Kommission, https://webgate.ec.europa.eu/fsd/fsf – Formate XML (v1.1) und CSV (v1.1).
//   Auch verzeichnet auf data.europa.eu. Maßgeblich sind die im Amtsblatt der EU veröffentlichten Rechtsakte.
// Die Struktur (Elemente sanctionEntity / nameAlias / birthdate bzw. CSV-Spalten Entity_LogicalId, NameAlias_WholeName,
// BirthDate_BirthDate …) ist vor dem Produktiveinsatz gegen die aktuelle Datei zu prüfen.
//
// Ergebnis eines Treffers ist NIE eine automatische Entscheidung – nur „manuelle Prüfung“ durch Compliance.

import { nameNormalisieren } from "./kyc.js";

// ================================================================ Einlesen

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
const entschaerfen = (s) => String(s || "").replace(/&(#x?[0-9a-f]+|amp|lt|gt|quot|apos);/gi, (_, e) => {
  if (e[0] === "#") return String.fromCodePoint(e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
  return ENTITIES[e.toLowerCase()] || "";
});

function attribute(tag) {
  const a = {};
  for (const m of tag.matchAll(/([\w:.-]+)\s*=\s*"([^"]*)"/g)) a[m[1].replace(/^.*:/, "")] = entschaerfen(m[2]);
  return a;
}

/** EU-FSF-XML (v1.1) → [{ id, euRef, typ, namen[], geburtsdaten[], laender[], programm }] */
export function euXmlLesen(xml) {
  const text = String(xml || "");
  const eintraege = [];
  for (const m of text.matchAll(/<(?:\w+:)?sanctionEntity\b([^>]*)>([\s\S]*?)<\/(?:\w+:)?sanctionEntity>/g)) {
    const kopf = attribute(m[1]);
    const inhalt = m[2];
    const namen = [];
    for (const n of inhalt.matchAll(/<(?:\w+:)?nameAlias\b([^>]*?)\/?>/g)) {
      const a = attribute(n[1]);
      const ganz = a.wholeName || [a.firstName, a.middleName, a.lastName].filter(Boolean).join(" ");
      if (ganz && !namen.includes(ganz)) namen.push(ganz);
    }
    const geburtsdaten = [];
    for (const b of inhalt.matchAll(/<(?:\w+:)?birthdate\b([^>]*?)\/?>/g)) {
      const a = attribute(b[1]);
      const d = a.birthdate || (a.year ? `${a.year}${a.monthOfYear ? `-${String(a.monthOfYear).padStart(2, "0")}${a.dayOfMonth ? `-${String(a.dayOfMonth).padStart(2, "0")}` : ""}` : ""}` : "");
      if (d && !geburtsdaten.includes(d)) geburtsdaten.push(d);
    }
    const laender = [...new Set([...inhalt.matchAll(/countryIso2Code="([A-Z]{2})"/g)].map((x) => x[1]))];
    const typ = /<(?:\w+:)?subjectType\b[^>]*code="([^"]+)"/.exec(inhalt)?.[1] || "";
    const programm = /<(?:\w+:)?regulation\b[^>]*programme="([^"]+)"/.exec(inhalt)?.[1] || "";
    if (namen.length) eintraege.push({ id: String(kopf.logicalId || kopf.euReferenceNumber || eintraege.length + 1), euRef: kopf.euReferenceNumber || "", typ: typ === "person" ? "person" : typ ? "organisation" : "", namen, geburtsdaten, laender, programm });
  }
  return eintraege;
}

function csvZeilen(text, trenner) {
  const zeilen = [];
  let zeile = [];
  let feld = "";
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"' && text[i + 1] === '"') { feld += '"'; i++; }
      else if (c === '"') inQ = false;
      else feld += c;
    } else if (c === '"') inQ = true;
    else if (c === trenner) { zeile.push(feld); feld = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      zeile.push(feld); feld = "";
      if (zeile.some((x) => x !== "")) zeilen.push(zeile);
      zeile = [];
    } else feld += c;
  }
  zeile.push(feld);
  if (zeile.some((x) => x !== "")) zeilen.push(zeile);
  return zeilen;
}

/** EU-FSF-CSV (v1.1, Semikolon; eine Zeile je Alias/Datum) → Einträge gruppiert nach Entity_LogicalId */
export function euCsvLesen(csv) {
  const text = String(csv || "").replace(/^﻿/, "");
  const trenner = (text.split(/\r?\n/)[0].match(/;/g) || []).length >= (text.split(/\r?\n/)[0].match(/,/g) || []).length ? ";" : ",";
  const zeilen = csvZeilen(text, trenner);
  if (!zeilen.length) return [];
  const kopf = zeilen[0].map((h) => h.trim());
  const spalte = (...namen) => {
    for (const n of namen) {
      const i = kopf.findIndex((h) => h.toLowerCase() === n.toLowerCase());
      if (i >= 0) return i;
    }
    return -1;
  };
  const iId = spalte("Entity_LogicalId", "id");
  const iRef = spalte("Entity_EU_ReferenceNumber", "euRef");
  const iName = spalte("NameAlias_WholeName", "name");
  const iVor = spalte("NameAlias_FirstName");
  const iNach = spalte("NameAlias_LastName");
  const iGeb = spalte("BirthDate_BirthDate", "geburtsdatum");
  const iJahr = spalte("BirthDate_Year");
  const iTyp = spalte("Entity_SubjectType", "Entity_SubjectType_ClassificationCode", "typ");
  const iProg = spalte("Entity_Regulation_Programme", "programm");
  const iLand = spalte("Citizenship_CountryIso2Code", "Address_CountryIso2Code", "land");
  if (iId < 0 || (iName < 0 && iNach < 0)) throw new Error("CSV-Kopfzeile unbekannt: Spalten Entity_LogicalId und NameAlias_WholeName erwartet.");
  const map = new Map();
  for (const z of zeilen.slice(1)) {
    const id = String(z[iId] || "").trim();
    if (!id) continue;
    const e = map.get(id) || { id, euRef: iRef >= 0 ? z[iRef] || "" : "", typ: "", namen: [], geburtsdaten: [], laender: [], programm: iProg >= 0 ? z[iProg] || "" : "" };
    const name = (iName >= 0 ? z[iName] : "") || [iVor >= 0 ? z[iVor] : "", iNach >= 0 ? z[iNach] : ""].filter(Boolean).join(" ");
    if (name && !e.namen.includes(name.trim())) e.namen.push(name.trim());
    const geb = (iGeb >= 0 ? z[iGeb] : "") || (iJahr >= 0 ? z[iJahr] : "");
    if (geb && !e.geburtsdaten.includes(geb.trim())) e.geburtsdaten.push(geb.trim());
    const land = iLand >= 0 ? String(z[iLand] || "").trim() : "";
    if (/^[A-Z]{2}$/.test(land) && !e.laender.includes(land)) e.laender.push(land);
    const typ = iTyp >= 0 ? String(z[iTyp] || "").toLowerCase() : "";
    if (typ && !e.typ) e.typ = typ === "person" || typ === "p" ? "person" : "organisation";
    map.set(id, e);
  }
  return [...map.values()].filter((e) => e.namen.length);
}

// ================================================================ Abgleich

/** Jaro-Winkler-Ähnlichkeit (0–1) */
export function jaroWinkler(a, b) {
  if (a === b) return a ? 1 : 0;
  if (!a || !b) return 0;
  const weite = Math.max(0, Math.floor(Math.max(a.length, b.length) / 2) - 1);
  const ta = new Array(a.length).fill(false);
  const tb = new Array(b.length).fill(false);
  let treffer = 0;
  for (let i = 0; i < a.length; i++) {
    for (let j = Math.max(0, i - weite); j < Math.min(b.length, i + weite + 1); j++) {
      if (tb[j] || a[i] !== b[j]) continue;
      ta[i] = tb[j] = true;
      treffer++;
      break;
    }
  }
  if (!treffer) return 0;
  let k = 0;
  let wechsel = 0;
  for (let i = 0; i < a.length; i++) {
    if (!ta[i]) continue;
    while (!tb[k]) k++;
    if (a[i] !== b[k]) wechsel++;
    k++;
  }
  const jaro = (treffer / a.length + treffer / b.length + (treffer - wechsel / 2) / treffer) / 3;
  let praefix = 0;
  while (praefix < 4 && a[praefix] && a[praefix] === b[praefix]) praefix++;
  return jaro + praefix * 0.1 * (1 - jaro);
}

const tokens = (s) => nameNormalisieren(s).split(" ").filter((t) => t.length > 1);

/**
 * Namensähnlichkeit unabhängig von Reihenfolge: jedes Token des kürzeren Namens sucht sein bestes Gegenstück.
 * Mittelwert der besten Paare, Abzug bei fehlenden Tokens (z. B. nur Nachname gleich).
 */
export function namensAehnlichkeit(a, b) {
  const ta = tokens(a);
  const tb = tokens(b);
  if (!ta.length || !tb.length) return 0;
  if (ta.join(" ") === tb.join(" ")) return 1;
  const [kurz, lang] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
  const frei = [...lang];
  let summe = 0;
  for (const t of kurz) {
    let best = 0;
    let bi = -1;
    frei.forEach((x, i) => {
      const s = jaroWinkler(t, x);
      if (s > best) { best = s; bi = i; }
    });
    summe += best;
    if (bi >= 0) frei.splice(bi, 1);
  }
  const deckung = kurz.length / lang.length;
  return (summe / kurz.length) * (0.85 + 0.15 * deckung);
}

function geburtsdatumVergleich(soll, liste = []) {
  const s = String(soll || "").slice(0, 10);
  if (!s || !liste.length) return "unbekannt";
  if (liste.some((d) => d === s)) return "gleich";
  if (liste.some((d) => d.length === 4 && s.startsWith(d))) return "jahr";
  if (liste.some((d) => d.slice(0, 4) === s.slice(0, 4))) return "jahr";
  return "abweichend";
}

/**
 * Person/Firma gegen die Liste prüfen.
 * pruefling: { name, geburtsdatum?, art: person|organisation, rolle?: "Person"|"Wirtschaftlich Berechtigter"|… }
 * Liefert Treffer [{ eintragId, euRef, name, score, geburtsdatum: gleich|jahr|abweichend|unbekannt, programm }] ≥ Schwelle.
 */
export function sanktionsAbgleich(pruefling, eintraege = [], { schwelle = 0.88 } = {}) {
  const treffer = [];
  const name = pruefling?.name || "";
  if (tokens(name).length === 0) return treffer;
  for (const e of eintraege) {
    if (pruefling.art === "organisation" && e.typ === "person") continue;
    if (pruefling.art === "person" && e.typ && e.typ !== "person") continue;
    let best = 0;
    let bestName = "";
    for (const n of e.namen || []) {
      const s = namensAehnlichkeit(name, n);
      if (s > best) { best = s; bestName = n; }
    }
    if (best < schwelle - 0.08) continue;
    const gd = pruefling.art === "person" ? geburtsdatumVergleich(pruefling.geburtsdatum, e.geburtsdaten) : "unbekannt";
    let score = best;
    if (gd === "gleich") score = Math.min(1, score + 0.08);
    else if (gd === "jahr") score = Math.min(1, score + 0.03);
    else if (gd === "abweichend") score -= 0.12;
    if (score >= schwelle) treffer.push({ eintragId: e.id, euRef: e.euRef || "", name: bestName, score: Math.round(score * 1000) / 1000, geburtsdatum: gd, programm: e.programm || "", pruefling: pruefling.rolle || "" });
  }
  return treffer.sort((a, b) => b.score - a.score).slice(0, 10);
}

/** Alle prüfpflichtigen Namen eines KYC-Falls (Person, Firma, wirtschaftlich Berechtigte, Vertreter) */
export function prueflingeAusFall(fall) {
  const f = fall || {};
  const liste = [];
  const p = f.person || {};
  if (p.vorname || p.nachname) liste.push({ name: `${p.vorname || ""} ${p.nachname || ""}`.trim(), geburtsdatum: p.geburtsdatum, art: "person", rolle: "Person" });
  if (f.kontotyp === "unternehmen" && f.firma?.name) liste.push({ name: f.firma.name, art: "organisation", rolle: "Unternehmen" });
  for (const u of f.ubos || []) liste.push({ name: `${u.vorname || ""} ${u.nachname || ""}`.trim(), geburtsdatum: u.geburtsdatum, art: "person", rolle: "Wirtschaftlich Berechtigter" });
  for (const x of f.vertreter || []) liste.push({ name: `${x.vorname || ""} ${x.nachname || ""}`.trim(), geburtsdatum: x.geburtsdatum, art: "person", rolle: "Vertreter" });
  const gesehen = new Set();
  return liste.filter((x) => {
    const k = `${nameNormalisieren(x.name)}|${x.geburtsdatum || ""}|${x.art}`;
    if (!x.name || gesehen.has(k)) return false;
    gesehen.add(k);
    return true;
  });
}

/** Demo: kleine, FIKTIVE Testliste (keine echten Personen) – nur für Vorführung und Tests */
export const DEMO_SANKTIONSLISTE = {
  quelle: "Fiktive Testliste (Demo) – keine echten Einträge",
  stand: "2026-09-01",
  eintraege: [
    { id: "DEMO-1", euRef: "EU.DEMO.1", typ: "person", namen: ["Viktor Fiktivow", "Viktor Fiktivov"], geburtsdaten: ["1961-04-12"], laender: ["XX"], programm: "DEMO" },
    { id: "DEMO-2", euRef: "EU.DEMO.2", typ: "person", namen: ["Boris Beispielmann"], geburtsdaten: ["1970"], laender: ["XX"], programm: "DEMO" },
    { id: "DEMO-3", euRef: "EU.DEMO.3", typ: "organisation", namen: ["Schattenhandel Test Holding Ltd"], geburtsdaten: [], laender: ["XX"], programm: "DEMO" },
    { id: "DEMO-4", euRef: "EU.DEMO.4", typ: "person", namen: ["Sanktio Musterfall"], geburtsdaten: ["1980-01-01"], laender: ["XX"], programm: "DEMO" },
  ],
};
