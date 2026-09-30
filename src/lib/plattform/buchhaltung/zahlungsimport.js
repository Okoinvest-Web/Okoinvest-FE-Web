// src/lib/plattform/buchhaltung/zahlungsimport.js
//
// Zahlungseingang: Kontoauszug einlesen (CAMT.053/.054 ISO 20022 oder CSV-Export des Online-Bankings) und
// Buchungen den offenen Belegen zuordnen – reine Funktionen. Python-Gegenstück: plattform/buchhaltung_kern.py
//
// Zuordnung (Vorschlag, Übernahme immer durch die Buchhaltung):
//   sicher   Belegnummer im Verwendungszweck/End-to-End-Referenz UND Betrag = offener Betrag
//   nummer   Belegnummer gefunden, Betrag weicht ab (Teil-/Überzahlung → prüfen)
//   betrag   genau EIN offener Beleg mit diesem Betrag und passendem Namen
//   keiner   manuell zuordnen oder ignorieren
// Eingänge (CRDT) → Rechnungen; Ausgänge (DBIT) → angewiesene Gutschriften (SEPA-EndToEndId = Belegnummer).

import { istDatum, rund2 } from "../finanzen/basis.js";

export const IMPORT_MAX_ZEILEN = 2000;
const NUMMER = /\b([A-Z]{2})-(20\d\d)-(\d{5})\b/g;

// ------------------------------------------------------------------ Hilfen

/** „1.234,56“ / „-1234.56“ / „1 234,56 €“ → Zahl (NaN bei Unsinn) */
export function betragLesen(s) {
  let t = String(s ?? "").replace(/[€\s ]|EUR/gi, "").trim();
  if (!t) return NaN;
  let neg = false;
  if (/^\(.*\)$/.test(t)) { neg = true; t = t.slice(1, -1); }
  if (t.endsWith("-")) { neg = true; t = t.slice(0, -1); }
  if (t.startsWith("+")) t = t.slice(1);
  if (t.startsWith("-")) { neg = !neg; t = t.slice(1); }
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(t) || /^\d+,\d+$/.test(t)) t = t.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(t)) t = t.replace(/,/g, "");
  if (!/^\d+(\.\d+)?$/.test(t)) return NaN;
  const x = Number(t);
  return neg ? -x : x;
}

/** „30.09.2026“ / „30.09.26“ / „2026-09-30“ / „20260930“ → ISO-Tag oder "" */
export function datumLesen(s) {
  const t = String(s ?? "").trim();
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(t);
  if (m) return istDatum(`${m[1]}-${m[2]}-${m[3]}`) ? `${m[1]}-${m[2]}-${m[3]}` : "";
  m = /^(\d{1,2})\.(\d{1,2})\.(\d{2}|\d{4})$/.exec(t);
  if (m) {
    const j = m[3].length === 2 ? `20${m[3]}` : m[3];
    const iso = `${j}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
    return istDatum(iso) ? iso : "";
  }
  m = /^(\d{4})(\d{2})(\d{2})$/.exec(t);
  if (m) return istDatum(`${m[1]}-${m[2]}-${m[3]}`) ? `${m[1]}-${m[2]}-${m[3]}` : "";
  return "";
}

const XML_ENT = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
const xmlText = (s) => String(s ?? "").replace(/&(#x?[0-9a-f]+|\w+);/gi, (g, e) => (e[0] === "#" ? String.fromCodePoint(e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : Number(e.slice(1))) : XML_ENT[e] ?? g)).replace(/\s+/g, " ").trim();
const P = "(?:[A-Za-z0-9_]+:)?"; // optionales Namensraum-Präfix
const bloecke = (xml, tag) => [...String(xml).matchAll(new RegExp(`<${P}${tag}\\b[^>]*>([\\s\\S]*?)</${P}${tag}>`, "g"))].map((m) => m[1]);
const erster = (xml, pfad) => {
  let teil = String(xml ?? "");
  for (const tag of pfad) {
    const b = bloecke(teil, tag);
    if (!b.length) return "";
    teil = b[0];
  }
  return xmlText(teil.replace(/<[^>]+>/g, " "));
};

/** Eindeutiger Schlüssel je Buchung (Doppelimport erkennen) */
export function buchungSchluessel(z) {
  return [z.datum, rund2(z.betrag).toFixed(2), z.richtung, (z.referenz || "").slice(0, 60), (z.zweck || "").slice(0, 140).toUpperCase(), (z.iban || "").slice(-8)].join("|");
}

// ------------------------------------------------------------------ CAMT.053 / CAMT.054

/** CAMT.053/.054 (ISO 20022) → Buchungen { datum, valuta, betrag, waehrung, richtung, zweck, name, iban, referenz } */
export function camtLesen(xml) {
  const text = String(xml || "");
  if (!/<(?:[A-Za-z0-9_]+:)?(BkToCstmrStmt|BkToCstmrDbtCdtNtfctn|BkToCstmrAcctRpt)\b/.test(text)) throw new Error("Keine CAMT-Datei (BkToCstmrStmt/…Ntfctn fehlt).");
  const aus = [];
  for (const ntry of bloecke(text, "Ntry")) {
    const status = erster(ntry, ["Sts", "Cd"]) || erster(ntry, ["Sts"]);
    if (status && !/^BOOK/i.test(status)) continue; // nur gebuchte Umsätze
    const richtung = erster(ntry, ["CdtDbtInd"]) === "DBIT" ? "ausgang" : "eingang";
    const datum = datumLesen(erster(ntry, ["BookgDt", "Dt"]) || erster(ntry, ["BookgDt", "DtTm"]));
    const valuta = datumLesen(erster(ntry, ["ValDt", "Dt"]) || erster(ntry, ["ValDt", "DtTm"]));
    const amtN = /<(?:[A-Za-z0-9_]+:)?Amt\b[^>]*Ccy="([A-Z]{3})"[^>]*>([^<]+)</.exec(ntry);
    const refN = erster(ntry, ["AcctSvcrRef"]);
    const txs = bloecke(ntry, "TxDtls");
    const liste = txs.length ? txs : [ntry];
    for (const tx of liste) {
      const amtT = txs.length > 1 ? /<(?:[A-Za-z0-9_]+:)?Amt\b[^>]*Ccy="([A-Z]{3})"[^>]*>([^<]+)</.exec(tx) : null;
      const amt = amtT || amtN;
      if (!amt) continue;
      const partei = richtung === "eingang" ? "Dbtr" : "Cdtr";
      const zweck = [...bloecke(tx, "Ustrd").map(xmlText), erster(tx, ["CdtrRefInf", "Ref"])].filter(Boolean).join(" ");
      aus.push({
        datum: datum || valuta,
        valuta: valuta || datum,
        betrag: rund2(Number(amt[2])),
        waehrung: amt[1],
        richtung,
        zweck: zweck.slice(0, 500),
        name: (erster(tx, ["RltdPties", partei, "Pty", "Nm"]) || erster(tx, ["RltdPties", partei, "Nm"])).slice(0, 140),
        iban: erster(tx, ["RltdPties", `${partei}Acct`, "Id", "IBAN"]).replace(/\s+/g, "").toUpperCase(),
        referenz: (erster(tx, ["Refs", "EndToEndId"]).replace(/^NOTPROVIDED$/i, "") || erster(tx, ["Refs", "AcctSvcrRef"]) || refN).slice(0, 80),
      });
    }
  }
  return aus;
}

// ------------------------------------------------------------------ CSV

function csvZeilen(text) {
  const t = String(text || "").replace(/^﻿/, "");
  const kopfzeile = t.split(/\r?\n/).find((z) => z.trim()) || "";
  const trenner = [";", "\t", ","].map((c) => [c, kopfzeile.split(c).length]).sort((a, b) => b[1] - a[1])[0][0];
  const zeilen = [];
  let feld = "";
  let zeile = [];
  let inQ = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (inQ) {
      if (c === '"' && t[i + 1] === '"') { feld += '"'; i++; }
      else if (c === '"') inQ = false;
      else feld += c;
    } else if (c === '"') inQ = true;
    else if (c === trenner) { zeile.push(feld); feld = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && t[i + 1] === "\n") i++;
      zeile.push(feld);
      if (zeile.some((x) => x.trim())) zeilen.push(zeile);
      zeile = [];
      feld = "";
    } else feld += c;
    if (zeilen.length > IMPORT_MAX_ZEILEN + 30) break;
  }
  zeile.push(feld);
  if (zeile.some((x) => x.trim())) zeilen.push(zeile);
  return zeilen;
}

const SPALTEN = {
  datum: ["buchungstag", "buchungsdatum", "buchung", "datum", "date", "booking date"],
  valuta: ["valuta", "wertstellung", "value date"],
  betrag: ["betrag", "umsatz", "amount", "betrag (eur)", "betrag eur"],
  haben: ["haben", "gutschrift", "eingang", "credit"],
  soll: ["soll", "lastschrift", "belastung", "ausgang", "debit"],
  zweck: ["verwendungszweck", "buchungstext", "zahlungsreferenz", "zweck", "text", "remittance", "beschreibung"],
  name: ["auftraggeber", "zahlungspflichtiger", "beguenstigter", "begünstigter", "empfänger", "name", "gegenpartei", "partner"],
  iban: ["iban", "kontonummer", "gegenkonto", "iban auftraggeber"],
  referenz: ["end-to-end", "endtoend", "e2e", "referenz", "bankreferenz", "kundenreferenz"],
  waehrung: ["währung", "waehrung", "currency", "wkz"],
};

function spalteFinden(kopf, namen, belegt) {
  const k = kopf.map((x) => x.trim().toLowerCase());
  for (const n of namen) {
    const i = k.findIndex((x, idx) => !belegt.has(idx) && x === n);
    if (i >= 0) return i;
  }
  for (const n of namen) {
    const i = k.findIndex((x, idx) => !belegt.has(idx) && x.includes(n));
    if (i >= 0) return i;
  }
  return -1;
}

/** CSV-Kontoauszug → Buchungen; Spalten werden über die Kopfzeile erkannt */
export function csvLesen(text) {
  const zeilen = csvZeilen(text);
  if (zeilen.length < 2) throw new Error("Die CSV-Datei enthält keine Buchungen.");
  // Kopfzeile: erste Zeile mit einer Datums- und einer Betragsspalte (manche Banken setzen Kontoinfos davor)
  let ki = zeilen.findIndex((z) => z.some((x) => /datum|buchung|date/i.test(x)) && z.some((x) => /betrag|umsatz|amount|haben|soll/i.test(x)));
  if (ki < 0) throw new Error("Kopfzeile nicht erkannt – erwartet werden Spalten wie „Buchungsdatum“, „Betrag“, „Verwendungszweck“.");
  const kopf = zeilen[ki];
  const belegt = new Set();
  const idx = {};
  for (const [feld, namen] of Object.entries(SPALTEN)) {
    const i = spalteFinden(kopf, namen, belegt);
    idx[feld] = i;
    if (i >= 0) belegt.add(i);
  }
  if (idx.datum < 0 || (idx.betrag < 0 && idx.haben < 0)) throw new Error("Spalten für Datum und Betrag nicht gefunden.");
  const aus = [];
  for (const z of zeilen.slice(ki + 1, ki + 1 + IMPORT_MAX_ZEILEN)) {
    const wert = (f) => (idx[f] >= 0 ? String(z[idx[f]] ?? "").trim() : "");
    const datum = datumLesen(wert("datum"));
    let betrag = idx.betrag >= 0 ? betragLesen(wert("betrag")) : NaN;
    if (!Number.isFinite(betrag)) {
      const h = betragLesen(wert("haben"));
      const s = betragLesen(wert("soll"));
      betrag = Number.isFinite(h) && h !== 0 ? Math.abs(h) : Number.isFinite(s) ? -Math.abs(s) : NaN;
    }
    if (!datum || !Number.isFinite(betrag) || betrag === 0) continue;
    const w = wert("waehrung").toUpperCase();
    aus.push({
      datum,
      valuta: datumLesen(wert("valuta")) || datum,
      betrag: rund2(Math.abs(betrag)),
      waehrung: /^[A-Z]{3}$/.test(w) ? w : "EUR",
      richtung: betrag < 0 ? "ausgang" : "eingang",
      zweck: wert("zweck").replace(/\s+/g, " ").slice(0, 500),
      name: wert("name").slice(0, 140),
      iban: wert("iban").replace(/\s+/g, "").toUpperCase().slice(0, 34),
      referenz: wert("referenz").slice(0, 80),
    });
  }
  return aus;
}

/** Format erkennen und lesen: { format: "camt"|"csv", buchungen } */
export function auszugLesen(inhalt, { format = "" } = {}) {
  const t = String(inhalt || "");
  if (!t.trim()) throw new Error("Die Datei ist leer.");
  const camt = format === "camt" || (format !== "csv" && /^\s*(<\?xml|<(?:[A-Za-z0-9_]+:)?Document\b)/.test(t));
  const buchungen = camt ? camtLesen(t) : csvLesen(t);
  if (buchungen.length > IMPORT_MAX_ZEILEN) throw new Error(`Höchstens ${IMPORT_MAX_ZEILEN} Buchungen je Import.`);
  return { format: camt ? "camt" : "csv", buchungen };
}

// ------------------------------------------------------------------ Zuordnung

const namensTeile = (s) => String(s || "").toLowerCase().replace(/[^a-zäöüß0-9 ]/g, " ").split(/\s+/).filter((x) => x.length >= 4 && !["gmbh", "demo", "fiktiv", "und", "co", "kg"].includes(x));
const nameAehnlich = (a, b) => {
  const x = new Set(namensTeile(a));
  return namensTeile(b).some((t) => x.has(t));
};

/** Belegnummern im Text (Verwendungszweck, Referenz; SEPA-IDs ohne Sonderzeichen) */
export function nummernIn(text) {
  const t = String(text || "").toUpperCase().replace(/\b([A-Z]{2})[\s/]?(20\d\d)[\s/-]?(\d{5})\b/g, "$1-$2-$3");
  return [...new Set([...t.matchAll(NUMMER)].map((m) => `${m[1]}-${m[2]}-${m[3]}`))];
}

/**
 * Vorschlag je Buchung. belege: [{ id, nummer, beleg, status, brutto, offen, partei:{name} }] (offener Betrag als `offen`).
 * Rückgabe { art: sicher|nummer|betrag|keiner, belegId, nummer, differenz, text }
 */
export function zuordnen(buchung, belege) {
  const eingang = buchung.richtung !== "ausgang";
  const kandidaten = belege.filter((b) => (eingang ? b.beleg === "rechnung" && b.status === "offen" : b.beleg === "gutschrift" && ["angewiesen", "offen"].includes(b.status)));
  const nummern = nummernIn(`${buchung.zweck} ${buchung.referenz}`);
  const treffer = kandidaten.filter((b) => nummern.includes(b.nummer));
  if (buchung.waehrung && buchung.waehrung !== "EUR") return { art: "keiner", text: `Fremdwährung ${buchung.waehrung} – bitte manuell prüfen.` };
  if (treffer.length === 1) {
    const b = treffer[0];
    const soll = rund2(b.offen ?? b.brutto);
    const differenz = rund2(buchung.betrag - soll);
    if (Math.abs(differenz) < 0.01) return { art: "sicher", belegId: b.id, nummer: b.nummer, differenz: 0, text: `Belegnummer und Betrag stimmen (${b.nummer}).` };
    return { art: "nummer", belegId: b.id, nummer: b.nummer, differenz, text: differenz < 0 ? `Teilzahlung zu ${b.nummer}: es fehlen ${(-differenz).toFixed(2).replace(".", ",")} €.` : `Überzahlung zu ${b.nummer}: ${differenz.toFixed(2).replace(".", ",")} € zu viel – Erstattung/Verrechnung klären.` };
  }
  if (treffer.length > 1) return { art: "keiner", text: `Mehrere Belegnummern (${treffer.map((b) => b.nummer).join(", ")}) – bitte manuell aufteilen.` };
  const gleich = kandidaten.filter((b) => Math.abs(rund2(b.offen ?? b.brutto) - buchung.betrag) < 0.01);
  const passend = gleich.filter((b) => nameAehnlich(b.partei?.name, buchung.name));
  if (passend.length === 1) return { art: "betrag", belegId: passend[0].id, nummer: passend[0].nummer, differenz: 0, text: `Betrag und Name passen zu ${passend[0].nummer} (ohne Belegnummer im Zweck) – bitte bestätigen.` };
  if (gleich.length === 1 && !buchung.name) return { art: "betrag", belegId: gleich[0].id, nummer: gleich[0].nummer, differenz: 0, text: `Einziger offener Beleg mit diesem Betrag: ${gleich[0].nummer} – bitte bestätigen.` };
  return { art: "keiner", text: eingang ? "Keine offene Rechnung erkannt – manuell zuordnen oder ignorieren." : "Ausgang ohne passende Gutschrift – ignorieren oder manuell zuordnen." };
}
