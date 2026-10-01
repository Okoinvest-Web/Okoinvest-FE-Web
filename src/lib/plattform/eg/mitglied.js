// src/lib/plattform/eg/mitglied.js
//
// Mitglied (Fachkonzept 3.6), Zählpunkt (3.7) und Zählpunkt-Teilnahme (3.8) mit Teilnahmefaktor-Regeln und
// Mehrfachteilnahme (bis 5 gemeinsame Energienutzungen je Zählpunkt, Σ TF ≤ 100 %, ElWG § 71 Abs. 5).
// Reine Funktionen. Python-Spiegel: plattform/eg_stamm_kern.py (Testvektoren eg/testdaten/stamm/teilnahme.json).

import { auswahl, datum, fehler, ganz, iban as ibanPruefen, konfliktFehler, text, wahr, zahl } from "../mitglied/basis.js";
import {
  ABRECHNUNGSRHYTHMEN, GROSSUNTERNEHMEN, MAX_TEILNAHMEN_JE_ZP, MITGLIED_AKTIV, MITGLIED_ARTEN, NETZEBENEN, RECHNUNGSWEGE, SMART_METER,
  STEUERSTATUS_ERZEUGER, TEILNAHME_ZAEHLT, TF_MAX, TF_MIN, ZP_RICHTUNGEN,
} from "./modell.js";
import { zaehlpunktPruefen } from "./zaehlpunkt.js";
import { uidPruefen } from "./stamm.js";

/** Großunternehmen nach ElWG § 6 Abs. 1 Z 61 (≥ 250 MA oder Umsatz > 50 Mio. € und Bilanzsumme > 43 Mio. €) – Auslegung zu bestätigen */
export function istGrossunternehmen({ mitarbeiter, umsatzMioEur, bilanzMioEur } = {}) {
  const ma = Number(mitarbeiter);
  if (Number.isFinite(ma) && ma >= GROSSUNTERNEHMEN.mitarbeiter) return true;
  return Number(umsatzMioEur) > GROSSUNTERNEHMEN.umsatzMioEur && Number(bilanzMioEur) > GROSSUNTERNEHMEN.bilanzMioEur;
}

/**
 * Mitglied bereinigen (wirft 422). `gemeinschaft` für die Zulässigkeit (Großunternehmen in der EEG).
 * Die Art „grossunternehmen“ wird bei passender Unternehmensgröße automatisch gesetzt.
 */
export function mitgliedBereinigen(d = {}, { gemeinschaft = null } = {}) {
  const groesse = {
    mitarbeiter: zahl(d.unternehmensgroesse?.mitarbeiter, 0, 1e7, 0),
    umsatzMioEur: zahl(d.unternehmensgroesse?.umsatzMioEur, 0, 1e6, 2),
    bilanzMioEur: zahl(d.unternehmensgroesse?.bilanzMioEur, 0, 1e6, 2),
    nachweis: text(d.unternehmensgroesse?.nachweis, 200),
  };
  let art = auswahl(d.art, MITGLIED_ARTEN, "");
  if (["kmu", "grossunternehmen"].includes(art)) art = istGrossunternehmen(groesse) ? "grossunternehmen" : art;
  const p = d.person || {};
  const m = {
    kontoId: text(d.kontoId, 40) || null,
    art,
    person: {
      vorname: text(p.vorname, 80), nachname: text(p.nachname, 80), firma: text(p.firma, 140),
      strasse: text(p.strasse, 120), plz: /^\d{4}$/.test(String(p.plz || "").trim()) ? String(p.plz).trim() : "", ort: text(p.ort, 80),
      email: text(p.email, 160).toLowerCase(), telefon: text(p.telefon, 40),
    },
    unternehmensgroesse: groesse,
    steuerstatusErzeuger: auswahl(d.steuerstatusErzeuger, STEUERSTATUS_ERZEUGER, "kleinunternehmer"),
    uid: uidPruefen(d.uid),
    schutzbeduerftig: wahr(d.schutzbeduerftig),
    iban: d.iban ? ibanPruefen(d.iban) : "",
    sepaMandat: { referenz: text(d.sepaMandat?.referenz, 35), datum: datum(d.sepaMandat?.datum), status: auswahl(d.sepaMandat?.status, { aktiv: 1, widerrufen: 1 }, "") },
    rechnungsweg: auswahl(d.rechnungsweg, RECHNUNGSWEGE, "portal"),
    abrechnungsrhythmus: auswahl(d.abrechnungsrhythmus, ABRECHNUNGSRHYTHMEN, ""),
    beitrittAm: datum(d.beitrittAm),
  };
  if (!m.art) throw fehler("Bitte wählen Sie die Mitgliedsart.", "art");
  if (!m.person.nachname && !m.person.firma) throw fehler("Bitte Name bzw. Firma des Mitglieds angeben.", "person.nachname");
  if (d.iban && !m.iban) throw fehler("Die IBAN ist ungültig (Prüfsumme).", "iban");
  if (d.uid && !m.uid) throw fehler("Die UID-Nummer hat das Format ATU + 8 Ziffern.", "uid");
  if (STEUERSTATUS_ERZEUGER[m.steuerstatusErzeuger]?.uidPflicht && !m.uid) throw fehler("Für regelbesteuerte Erzeuger bzw. Gemeinden mit BgA ist die UID-Nummer Pflicht (Reverse Charge).", "uid");
  if (m.sepaMandat.status === "aktiv" && (!m.iban || !m.sepaMandat.referenz || !m.sepaMandat.datum)) throw fehler("Ein aktives SEPA-Mandat braucht IBAN, Mandatsreferenz und Datum.", "sepaMandat.referenz");
  const h = mitgliedHindernisse(m, gemeinschaft);
  if (h.length) throw konfliktFehler(h[0]);
  return m;
}

/** Zulässigkeit eines Mitglieds in der Gemeinschaft (Fachkonzept 1.2, Teilnehmerkreis) */
export function mitgliedHindernisse(m, g) {
  const h = [];
  if (!g) return h;
  if (g.modell === "eeg" && !MITGLIED_ARTEN[m.art]?.eeg) h.push("Großunternehmen dürfen nicht Mitglied einer Erneuerbare-Energie-Gemeinschaft sein (ElWG § 6 Abs. 1 Z 61, EAG § 79 Abs. 2) – möglich ist eine BEG.");
  return h;
}

/** Nächste freie Mitgliedsnummer der Gemeinschaft (fortlaufend, nie wiederverwendet) */
export const naechsteMitgliedsnummer = (mitglieder, gemeinschaftId) => 1 + mitglieder.filter((m) => m.gemeinschaftId === gemeinschaftId).reduce((mx, m) => Math.max(mx, Number(m.mitgliedsnummer) || 0), 0);

export const mitgliedName = (m) => (m?.person ? m.person.firma || [m.person.vorname, m.person.nachname].filter(Boolean).join(" ") : "");
export const mitgliedAktiv = (m) => MITGLIED_AKTIV.includes(m?.status);

// ---------------------------------------------------------------- Zählpunkt

/** Zählpunkt bereinigen; leitet Netzbetreiber und PLZ aus der Nummer ab (Hinweise statt Fehler bei unbekannter NB-Nummer) */
export function zaehlpunktBereinigen(d = {}, { netzbetreiber = [] } = {}) {
  const p = zaehlpunktPruefen(d.zaehlpunktnummer, { netzbetreiber });
  if (!p.ok) throw fehler(p.fehler, "zaehlpunktnummer");
  const z = {
    zaehlpunktnummer: p.wert,
    nbNummer: p.nbNummer,
    plz: p.plz,
    netzbetreiberId: p.netzbetreiberId || text(d.netzbetreiberId, 40),
    richtung: auswahl(d.richtung, ZP_RICHTUNGEN, ""),
    anlageId: text(d.anlageId, 40) || null,
    inhaberKontoId: text(d.inhaberKontoId, 40) || null,
    inhaberName: text(d.inhaberName, 140),
    smartMeter: auswahl(d.smartMeter, SMART_METER, "unbekannt"),
    qhAktiv: wahr(d.qhAktiv),
    nahebereichRef: text(d.nahebereichRef, 80),
    auskunftAm: datum(d.auskunftAm),
    netzebene: NETZEBENEN[Number(d.netzebene)] ? Number(d.netzebene) : null,
    lieferant: text(d.lieferant, 120),
    energieabnehmer: text(d.energieabnehmer, 120),
  };
  if (!z.richtung) throw fehler("Bitte die Energierichtung wählen (Verbrauch oder Erzeugung).", "richtung");
  return { zaehlpunkt: z, hinweise: p.hinweise };
}

// ---------------------------------------------------------------- Teilnahme (Teilnahmefaktor, Mehrfachteilnahme)

/** Teilnahme-Entwurf bereinigen (Status setzt nur eg/status.js teilnahmeUebergang) */
export function teilnahmeBereinigen(d = {}, { gemeinschaft = null } = {}) {
  const t = {
    zaehlpunktId: text(d.zaehlpunktId, 40),
    mitgliedId: text(d.mitgliedId, 40),
    teilnahmefaktor: ganz(d.teilnahmefaktor ?? 100, TF_MIN, TF_MAX),
    aufteilungsschluesselPct: gemeinschaft?.verteilmodell === "statisch" ? zahl(d.aufteilungsschluesselPct, 0.1, 100, 1) : null,
    consentId: text(d.consentId, 80),
  };
  if (!t.zaehlpunktId) throw fehler("Bitte den Zählpunkt wählen.", "zaehlpunktId");
  if (!t.mitgliedId) throw fehler("Bitte das Mitglied wählen.", "mitgliedId");
  if (t.teilnahmefaktor === null) throw fehler(`Der Teilnahmefaktor ist eine ganze Zahl von ${TF_MIN} bis ${TF_MAX} %.`, "teilnahmefaktor");
  if (gemeinschaft?.verteilmodell === "statisch" && t.aufteilungsschluesselPct === null && d.aufteilungsschluesselPct !== undefined && d.aufteilungsschluesselPct !== "") throw fehler("Aufteilungsschlüssel: 0,1 bis 100 % (eine Nachkommastelle).", "aufteilungsschluesselPct");
  return t;
}

/**
 * Regeln der Mehrfachteilnahme für einen Zählpunkt (über alle der Plattform bekannten Gemeinschaften; fremde EGs kennt nur
 * der Netzbetreiber – `fremdTf`: vom Mitglied angegebener TF-Anteil außerhalb der Plattform).
 * @param {object[]} teilnahmen alle Teilnahmen des Zählpunkts
 * @param {{id?:string, gemeinschaftId:string, teilnahmefaktor:number}} neu geplante bzw. geänderte Teilnahme
 * @returns {{ok:boolean, fehler:string, summeTf:number, anzahl:number, freiTf:number}}
 */
export function teilnahmeRegeln(teilnahmen = [], neu, { fremdTf = 0, fremdAnzahl = 0 } = {}) {
  const andere = teilnahmen.filter((t) => t.id !== neu.id && TEILNAHME_ZAEHLT.includes(t.status));
  const summe = andere.reduce((s, t) => s + (Number(t.teilnahmefaktor) || 0), 0) + (Number(fremdTf) || 0);
  const anzahl = andere.length + (Number(fremdAnzahl) || 0) + 1;
  const tf = Number(neu.teilnahmefaktor) || 0;
  const r = { ok: true, fehler: "", summeTf: summe + tf, anzahl, freiTf: Math.max(0, TF_MAX - summe) };
  if (andere.some((t) => t.gemeinschaftId === neu.gemeinschaftId)) return { ...r, ok: false, fehler: "Der Zählpunkt nimmt an dieser Gemeinschaft bereits teil (bzw. eine Anmeldung läuft)." };
  if (anzahl > MAX_TEILNAHMEN_JE_ZP) return { ...r, ok: false, fehler: `Ein Zählpunkt darf an höchstens ${MAX_TEILNAHMEN_JE_ZP} gemeinsamen Energienutzungen teilnehmen (ElWG § 71 Abs. 5).` };
  if (summe + tf > TF_MAX) return { ...r, ok: false, fehler: `Die Summe der Teilnahmefaktoren dieses Zählpunkts läge bei ${summe + tf} % – höchstens ${TF_MAX} % (frei: ${Math.max(0, TF_MAX - summe)} %).` };
  return r;
}

/** Teilnahmefaktor am Stichtag aus der Historie (sonst aktueller Wert) */
export function tfAm(t, stichtag) {
  const d = String(stichtag || "").slice(0, 10);
  const h = (t?.tfHistorie || []).filter((x) => x.gueltigAb <= d).sort((a, b) => a.gueltigAb.localeCompare(b.gueltigAb));
  return h.length ? h[h.length - 1].tf : Number(t?.teilnahmefaktor) || 0;
}
