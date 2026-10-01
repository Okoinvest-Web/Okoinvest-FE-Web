// src/lib/plattform/eg/stamm.js
//
// Stammdaten der Gemeinschaft und ihrer Organe (Fachkonzept 3.4, 3.5), Zulässigkeitsprüfungen (1.2), Kennzahlen und
// kontextbezogene Hinweise (§ 69, EDA-Portalgrenze, Verteilmodell ab 10/2026 …). Reine Funktionen. Python-Spiegel:
// plattform/eg_stamm_kern.py. Rechtliche Hinweise sind KEINE Rechtsberatung („zu bestätigen“-Stellen siehe Fachkonzept 9).

import { auswahl, datum, fehler, iban as ibanPruefen, mehrzeilig, text, wahr } from "../mitglied/basis.js";
import {
  ABRECHNUNGSRHYTHMEN, EDA_ANBINDUNGEN, EG_MODELLE, GEMEINSCHAFT_STATUS, MARKTPHASEN, MITGLIED_AKTIV, ORGAN_FUNKTIONEN, RECHTSFORMEN, UST_STATUS,
  VERTEILMODELLE, ZONELEVEL,
} from "./modell.js";
import { gemeinschaftsIdPruefen, marktpartnerIdPruefen } from "./zaehlpunkt.js";
import { erzeugungsleistung } from "./anlage.js";
import { organWirksam } from "./rechte.js";

export const EDA_PORTAL_GRENZE_ZP = 50; // Anwenderportal kostenlos bis 50 Zählpunkte (zu bestätigen)
const UID = /^ATU\d{8}$/;
export const uidPruefen = (v) => {
  const s = String(v || "").toUpperCase().replace(/\s/g, "");
  return UID.test(s) ? s : "";
};
const plz4 = (v) => (/^\d{4}$/.test(String(v || "").trim()) ? String(v).trim() : "");

/**
 * Gemeinschaft bereinigen und prüfen (wirft 422 mit Feld).
 * @param {object} d Eingabe
 * @param {{alt?:object, netzbetreiberIds?:string[]}} [o]
 */
export function gemeinschaftBereinigen(d = {}, { alt = null, netzbetreiberIds = [] } = {}) {
  const modell = auswahl(d.modell, EG_MODELLE, alt?.modell || "");
  if (!modell) throw fehler("Bitte wählen Sie das Modell (EEG, BEG, GEA, P2P oder Eigenversorgung).", "modell");
  const g = {
    name: text(d.name, 140),
    kurzname: text(d.kurzname, 40),
    modell,
    zonelevel: Number(d.zonelevel) || Number(alt?.zonelevel) || 0,
    nahebereichRef: text(d.nahebereichRef, 80),
    rechtsform: auswahl(d.rechtsform, RECHTSFORMEN, EG_MODELLE[modell].rechtsperson ? "verein" : "keine"),
    zvrZahl: text(d.zvrZahl, 20).replace(/\s/g, ""),
    firmenbuchnummer: text(d.firmenbuchnummer, 20).replace(/\s/g, "").toLowerCase(),
    sitzAdresse: { strasse: text(d.sitzAdresse?.strasse, 120), plz: plz4(d.sitzAdresse?.plz), ort: text(d.sitzAdresse?.ort, 80) },
    email: text(d.email, 160).toLowerCase(),
    telefon: text(d.telefon, 40),
    uid: uidPruefen(d.uid),
    steuernummer: text(d.steuernummer, 30),
    finanzamt: text(d.finanzamt, 80),
    ustStatus: auswahl(d.ustStatus, UST_STATUS, "kleinunternehmer"),
    ustOptionSeit: datum(d.ustOptionSeit),
    iban: d.iban ? ibanPruefen(d.iban) : "",
    bic: text(d.bic, 11).toUpperCase().replace(/\s/g, ""),
    creditorId: text(d.creditorId, 35).toUpperCase().replace(/\s/g, ""),
    netzbetreiber: [...new Set((Array.isArray(d.netzbetreiber) ? d.netzbetreiber : [d.netzbetreiber]).map((x) => text(x, 40)).filter(Boolean))].slice(0, 12),
    marktpartnerId: "",
    gemeinschaftsId: "",
    verteilmodell: auswahl(d.verteilmodell, VERTEILMODELLE, "dynamisch"),
    edaAnbindung: auswahl(d.edaAnbindung, EDA_ANBINDUNGEN, "anwenderportal"),
    organisatorAngezeigtAm: datum(d.organisatorAngezeigtAm),
    dienstleistung: { aktiv: wahr(d.dienstleistung?.aktiv), paket: text(d.dienstleistung?.paket, 40), seit: datum(d.dienstleistung?.seit), avvAm: datum(d.dienstleistung?.avvAm) },
    abrechnungsrhythmus: auswahl(d.abrechnungsrhythmus, ABRECHNUNGSRHYTHMEN, "monat"),
    statutenVersion: text(d.statutenVersion, 40),
    betreibervertragDatum: datum(d.betreibervertragDatum),
    beschreibung: mehrzeilig(d.beschreibung, 2000),
    gruendungsauftragId: text(d.gruendungsauftragId, 40) || alt?.gruendungsauftragId || "", // WP5
  };
  if (!g.name) throw fehler("Bitte geben Sie den Namen der Gemeinschaft an.", "name");
  if (d.iban && !g.iban) throw fehler("Die IBAN ist ungültig (Prüfsumme).", "iban");
  if (d.uid && !g.uid) throw fehler("Die UID-Nummer hat das Format ATU + 8 Ziffern.", "uid");
  if (!ZONELEVEL[g.zonelevel]) throw fehler("Bitte wählen Sie den Nahebereich (Zonelevel 1–7).", "zonelevel");
  if (!ZONELEVEL[g.zonelevel].modelle.includes(modell)) throw fehler(`Zonelevel ${g.zonelevel} („${ZONELEVEL[g.zonelevel].label}“) ist für ${EG_MODELLE[modell].kurz} nicht zulässig.`, "zonelevel");
  if (g.rechtsform === "keine" && EG_MODELLE[modell].rechtsperson) throw fehler(`Eine ${EG_MODELLE[modell].kurz} braucht eine Rechtsperson (Verein, Genossenschaft, GmbH, OG/KG).`, "rechtsform");
  const mp = marktpartnerIdPruefen(d.marktpartnerId, modell);
  if (!mp.ok) throw fehler(mp.fehler, "marktpartnerId");
  g.marktpartnerId = mp.wert;
  const gid = gemeinschaftsIdPruefen(d.gemeinschaftsId, { modell, marktpartnerId: g.marktpartnerId, verteilmodell: g.verteilmodell });
  if (!gid.ok) throw fehler(gid.fehler, "gemeinschaftsId");
  g.gemeinschaftsId = gid.wert;
  if (netzbetreiberIds.length && g.netzbetreiber.some((x) => !netzbetreiberIds.includes(x))) throw fehler("Unbekannter Netzbetreiber.", "netzbetreiber");
  if (!g.netzbetreiber.length && modell !== "p2p") throw fehler("Bitte wählen Sie den Netzbetreiber.", "netzbetreiber");
  if (g.netzbetreiber.length > 1 && ![5, 7].includes(g.zonelevel) && modell !== "beg") throw fehler("Mehrere Netzbetreiber sind nur bei BEG bzw. Zonelevel 5 oder 7 möglich.", "netzbetreiber");
  if (g.ustStatus === "regelbesteuert" && !g.uid) throw fehler("Bei Regelbesteuerung bitte die UID-Nummer angeben.", "uid");
  return g;
}

/** Organ bereinigen (Fachkonzept 3.5) */
export function organBereinigen(d = {}) {
  const o = {
    kontoId: text(d.kontoId, 40) || null,
    name: text(d.name, 120),
    email: text(d.email, 160).toLowerCase(),
    funktion: auswahl(d.funktion, ORGAN_FUNKTIONEN, ""),
    von: datum(d.von),
    bis: datum(d.bis),
    gewaehltIn: text(d.gewaehltIn, 40),
    zeichnungsberechtigt: wahr(d.zeichnungsberechtigt),
  };
  if (!o.funktion) throw fehler("Bitte wählen Sie die Funktion.", "funktion");
  if (!o.kontoId && !o.name && !o.email) throw fehler("Bitte Person angeben (Konto, E-Mail oder Name).", "name");
  if (!o.von) throw fehler("Bitte den Beginn der Funktionsperiode angeben.", "von");
  if (o.bis && o.bis < o.von) throw fehler("Das Ende der Funktionsperiode liegt vor dem Beginn.", "bis");
  return o;
}

/** Hinweise zur Besetzung der Organe (Verein: ≥ 2 Leitungsorgan, 2 Rechnungsprüfer außerhalb des Leitungsorgans) (VerG §§ 5, 21, zu bestätigen) */
export function organHinweise(g, organe = [], heute) {
  const h = [];
  const wirksam = organe.filter((o) => o.gemeinschaftId === g.id && organWirksam(o, heute));
  const person = (o) => o.kontoId || o.name;
  const leitung = new Set(wirksam.filter((o) => ORGAN_FUNKTIONEN[o.funktion]?.leitung).map(person));
  const pruefer = new Set(wirksam.filter((o) => o.funktion === "rechnungspruefer").map(person));
  if (g.rechtsform === "verein") {
    if (leitung.size < 2) h.push({ stufe: "warn", text: "Das Leitungsorgan eines Vereins besteht aus mindestens 2 Personen (VerG § 5) (zu bestätigen)." });
    if (pruefer.size < 2) h.push({ stufe: "warn", text: "Ein Verein braucht 2 Rechnungsprüfer (VerG § 21) (zu bestätigen)." });
    if ([...pruefer].some((p) => leitung.has(p))) h.push({ stufe: "fehler", text: "Rechnungsprüfer dürfen nicht dem Leitungsorgan angehören." });
  }
  if (["egen", "gmbh"].includes(g.rechtsform) && leitung.size < 2 && g.rechtsform === "egen") h.push({ stufe: "warn", text: "Der Vorstand einer Genossenschaft besteht aus mindestens 2 Personen (GenG) (zu bestätigen)." });
  if (!wirksam.some((o) => o.zeichnungsberechtigt) && EG_MODELLE[g.modell]?.rechtsperson) h.push({ stufe: "info", text: "Noch keine zeichnungsberechtigte Person – Vier-Augen-Freigaben (Abrechnung, Zahlungsdateien) brauchen mindestens zwei." });
  return h;
}

/** Kennzahlen einer Gemeinschaft (Liste und Kopf der Detailseite) */
export function kennzahlen(g, { mitglieder = [], zaehlpunkte = [], teilnahmen = [], anlagen = [] } = {}) {
  const t = teilnahmen.filter((x) => x.gemeinschaftId === g.id);
  const aktiv = t.filter((x) => x.status === "aktiv");
  const zp = new Map(zaehlpunkte.map((z) => [z.id, z]));
  const leistung = erzeugungsleistung(anlagen.filter((a) => a.gemeinschaftId === g.id));
  return {
    mitgliederAktiv: mitglieder.filter((m) => m.gemeinschaftId === g.id && MITGLIED_AKTIV.includes(m.status)).length,
    mitgliederOffen: mitglieder.filter((m) => m.gemeinschaftId === g.id && ["interessent", "antrag", "geprueft"].includes(m.status)).length,
    zaehlpunkteAktiv: aktiv.length,
    verbrauchAktiv: aktiv.filter((x) => zp.get(x.zaehlpunktId)?.richtung === "verbrauch").length,
    erzeugungAktiv: aktiv.filter((x) => zp.get(x.zaehlpunktId)?.richtung === "erzeugung").length,
    teilnahmenOffen: t.filter((x) => ["entwurf", "angefragt", "zustimmung_offen", "zugestimmt", "wartet_technik"].includes(x.status)).length,
    erzeugungsleistungKw: leistung.gesamtKw,
    lieferantenpflichten: leistung.lieferantenpflichten,
  };
}

/** Kontextbezogene Hinweise (Stufe info|warn|fehler) für Backoffice und Organe */
export function gemeinschaftHinweise(g, k = {}, { heute } = {}) {
  const h = [];
  const z = kennzahlen(g, k);
  if (z.lieferantenpflichten) h.push({ stufe: "warn", text: `Erzeugungsleistung ${z.erzeugungsleistungKw.toLocaleString("de-DE")} kW: Lieferantenpflichten nach § 69 ElWG (AGB, Informationsblatt, Rechnungsinhalte, Wahl Monats-/Jahresrechnung). Ein Organisator kann sie übernehmen.` });
  if (g.edaAnbindung === "anwenderportal" && z.zaehlpunkteAktiv + z.teilnahmenOffen > EDA_PORTAL_GRENZE_ZP) h.push({ stufe: "info", text: `Mehr als ${EDA_PORTAL_GRENZE_ZP} Zählpunkte: Das EDA-Anwenderportal ist darüber kostenpflichtig – E-Mail- oder KEP-Anbindung prüfen (zu bestätigen).` });
  if (g.verteilmodell === "statisch" && (!g.status || ["interesse", "machbarkeit", "in_gruendung", "rechtsperson", "marktpartner", "vertrag_nb"].includes(g.status)) && String(heute || "") >= MARKTPHASEN[1]) h.push({ stufe: "warn", text: "Neu aktivierte Gemeinschaften erhalten ab 05.10.2026 voraussichtlich nur noch das dynamische Modell (zu bestätigen)." });
  if (EG_MODELLE[g.modell]?.rechtsperson && GEMEINSCHAFT_STATUS[g.status] && ["aktiv", "aufnahmestopp"].includes(g.status) && z.mitgliederAktiv < 2) h.push({ stufe: "fehler", text: "Eine EEG bzw. BEG braucht mindestens 2 Mitglieder." });
  if (g.dienstleistung?.aktiv && !g.organisatorAngezeigtAm) h.push({ stufe: "warn", text: "ÖkoInvest ist als Organisator tätig – die Anzeige an den Netzbetreiber (§ 68 Abs. 2 ElWG) ist noch nicht vermerkt." });
  if (["aktiv", "aufnahmestopp"].includes(g.status) && !g.gemeinschaftsId && ["eeg", "beg", "gea"].includes(g.modell)) h.push({ stufe: "fehler", text: "Aktive Gemeinschaft ohne Gemeinschafts-ID – bitte aus dem Betreibervertrag übernehmen." });
  if (g.modell === "eeg" && (k.mitglieder || []).some((m) => m.gemeinschaftId === g.id && m.art === "grossunternehmen" && MITGLIED_AKTIV.includes(m.status))) h.push({ stufe: "fehler", text: "Großunternehmen dürfen nicht Mitglied einer EEG sein (ElWG § 6 Abs. 1 Z 61; EAG § 79 Abs. 2)." });
  return h;
}

// ---------------------------------------------------------------- CSV (Import mit Vorschau)

/**
 * CSV lesen (Trenner ; oder , automatisch, Anführungszeichen, BOM, CRLF). Liefert { kopf[], zeilen[{…}] }; Kopf normalisiert
 * (klein, ohne Leer-/Sonderzeichen, Umlaute ausgeschrieben). Höchstens 5.000 Zeilen.
 */
export function csvLesen(roh, { maxZeilen = 5000 } = {}) {
  const s = String(roh || "").replace(/^﻿/, "");
  const ersteZeile = s.split(/\r?\n/, 1)[0] || "";
  const trenner = (ersteZeile.match(/;/g) || []).length >= (ersteZeile.match(/,/g) || []).length ? ";" : ",";
  const zeilen = [];
  let feld = "";
  let zeile = [];
  let inQ = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQ) {
      if (c === '"' && s[i + 1] === '"') { feld += '"'; i++; }
      else if (c === '"') inQ = false;
      else feld += c;
    } else if (c === '"') inQ = true;
    else if (c === trenner) { zeile.push(feld); feld = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && s[i + 1] === "\n") i++;
      zeile.push(feld);
      feld = "";
      if (zeile.some((x) => x.trim() !== "")) zeilen.push(zeile);
      zeile = [];
      if (zeilen.length > maxZeilen) break;
    } else feld += c;
  }
  if (feld !== "" || zeile.length) { zeile.push(feld); if (zeile.some((x) => x.trim() !== "")) zeilen.push(zeile); }
  if (!zeilen.length) return { kopf: [], zeilen: [] };
  const norm = (k) => String(k).trim().toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss").replace(/\W+/g, "");
  const kopf = zeilen[0].map(norm);
  return { kopf, zeilen: zeilen.slice(1, maxZeilen + 1).map((z) => Object.fromEntries(kopf.map((k, i) => [k, String(z[i] ?? "").trim()]))) };
}
