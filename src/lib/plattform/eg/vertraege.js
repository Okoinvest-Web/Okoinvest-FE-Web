// src/lib/plattform/eg/vertraege.js
//
// WP5 – Dokumentgenerator für Energiegemeinschaften: Musterstatuten, Musterverträge, Vollmachten, Anzeigen und
// Mitgliederinformationen aus den Vorlagen unter ./vorlagen/** (reine Daten mit Platzhaltern {{feld}} und Bedingungen).
// Reine Funktionen (Browser, Server, Node-Tests). Python-Spiegel: plattform/eg_gruendung_kern.py (vorlage_rendern,
// dokument_daten; gleiche Testvektoren unter eg/testdaten/gruendung/vorlagen.json; Vorlagendaten als JSON-Export
// plattform/eg_gruendung_daten.json über scripts/eg-gruendung-export.mjs).
//
// Jedes erzeugte Dokument ist ein MUSTER zur rechtlichen Prüfung (Rechtsstand ElWG 01.10.2026) – keine Rechts- oder
// Steuerberatung. Grundlagen: Fachkonzept 2.3, 2.4, 2.6, 3.15 (docs/EG-FACHKONZEPT.md), Muster der Koordinationsstelle
// (energiegemeinschaften.gv.at/downloadbereich) und des Beratungsservice Erneuerbare Energie Wien.
//
// Vorlagenformat (vorlagen/*.js):
//   Objekt mit id, titel, untertitel, art, modelle?, rechtsformen?, wenn?, quelle, stand, nummerierung (paragraph | abschnitt | keine),
//   felder (Liste mit id, label, pflicht?), abschnitte (Liste mit titel, wenn?, ohneNummer?, absaetze), unterschriften (Liste).
//   Ein Absatz ist ein Text, ein Objekt mit text und wenn oder ein Objekt mit liste (Aufzählung) und wenn.
//   Bedingung `wenn`: "feld" (wahr) · "!feld" · "feld=a,b" · "feld!=a" · mehrere mit „&“ verknüpft.

import { EG_MODELLE, LIEFERANTENPFLICHT_KW, ZONELEVEL } from "./modell.js";
import { VORLAGEN } from "./vorlagen/index.js";

export { VORLAGEN };
export const VORLAGEN_STAND = "2026-10-01";
export const MUSTER_HINWEIS =
  "MUSTER zur rechtlichen Prüfung – kein Ersatz für Rechts- oder Steuerberatung. Rechtsstand ElWG 01.10.2026 (§§ 65–72 ElWG, EAG § 79). Vor Verwendung durch eine befugte Stelle prüfen lassen.";
/** Organisator / Auftragnehmer (BRIEFING.md „Unternehmen“) */
export const OEKOINVEST = { name: "ÖkoInvest GmbH", anschrift: "Gewerbegebiet 10, 5121 Ostermiething", firmenbuch: "FN 541505g, Landesgericht Ried im Innkreis", geschaeftsfuehrung: "Andreas Wegscheider, Manuel Thaler" };
export const LUECKE = "……";

const PLATZ = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

/** Wert für den Text: Zahlen ohne Nachkommastellen-Rauschen, Wahrheitswerte als ja/nein */
function textWert(v) {
  if (v === true) return "ja";
  if (v === false) return "nein";
  if (typeof v === "number") return Number.isInteger(v) ? String(v) : String(v).replace(".", ",");
  return String(v);
}
const leer = (v) => v === undefined || v === null || v === "";

/** Wahrheitswert einer Angabe für Bedingungen */
export function istWahr(v) {
  if (v === true) return true;
  if (v === false || leer(v)) return false;
  if (typeof v === "number") return v !== 0;
  return !["nein", "false", "0"].includes(String(v));
}

/** Bedingung auswerten (siehe Kopf) */
export function bedingungErfuellt(wenn, daten = {}) {
  if (!wenn) return true;
  return String(wenn).split("&").every((roh) => {
    const t = roh.trim();
    if (!t) return true;
    if (t.includes("!=")) {
      const [k, v] = t.split("!=");
      return !v.split(",").includes(leer(daten[k.trim()]) ? "" : textWert(daten[k.trim()]));
    }
    if (t.includes("=")) {
      const [k, v] = t.split("=");
      return v.split(",").includes(leer(daten[k.trim()]) ? "" : textWert(daten[k.trim()]));
    }
    if (t.startsWith("!")) return !istWahr(daten[t.slice(1).trim()]);
    return istWahr(daten[t]);
  });
}

/** Platzhalter ersetzen; fehlende Angaben werden als „……“ gesetzt und gesammelt */
export function platzhalterErsetzen(text, daten = {}, fehlend = []) {
  return String(text).replace(PLATZ, (_, k) => {
    if (leer(daten[k])) {
      if (!fehlend.includes(k)) fehlend.push(k);
      return LUECKE;
    }
    return textWert(daten[k]);
  });
}

/** Ist eine Vorlage für die Gemeinschaft passend (Modell, Rechtsform, Bedingung)? */
export function vorlagePasst(v, daten = {}) {
  if (!v) return false;
  if (v.modelle && daten.modell && !v.modelle.includes(daten.modell)) return false;
  if (v.rechtsformen && daten.rechtsform && !v.rechtsformen.includes(daten.rechtsform)) return false;
  return bedingungErfuellt(v.wenn, daten);
}

/**
 * Vorlage zu einem Dokument rendern.
 * @returns {{id:string, titel:string, untertitel:string, kennzeichnung:string, quelle:string, stand:string, abschnitte:{titel:string, absaetze:string[]}[], unterschriften:string[], fehlend:string[], pflichtFehlend:string[], text:string}}
 */
export function vorlageRendern(vorlage, daten = {}) {
  if (!vorlage) throw new Error("Unbekannte Vorlage.");
  const fehlend = [];
  const nr = vorlage.nummerierung || "keine";
  const abschnitte = [];
  let i = 0;
  for (const a of vorlage.abschnitte || []) {
    if (!bedingungErfuellt(a.wenn, daten)) continue;
    const absaetze = [];
    const roh = (a.absaetze || []).filter((x) => typeof x === "string" || bedingungErfuellt(x.wenn, daten));
    const textAnzahl = roh.filter((x) => typeof x === "string" || x.text !== undefined).length;
    let j = 0;
    for (const x of roh) {
      if (typeof x === "string" || x.text !== undefined) {
        j++;
        const t = platzhalterErsetzen(typeof x === "string" ? x : x.text, daten, fehlend);
        absaetze.push(nr === "paragraph" && !a.ohneNummer && textAnzahl > 1 ? `(${j}) ${t}` : t);
      } else if (Array.isArray(x.liste)) {
        for (const p of x.liste) {
          if (typeof p !== "string" && !bedingungErfuellt(p.wenn, daten)) continue;
          absaetze.push(`– ${platzhalterErsetzen(typeof p === "string" ? p : p.text, daten, fehlend)}`);
        }
      }
    }
    let titel = platzhalterErsetzen(a.titel || "", daten, fehlend);
    if (!a.ohneNummer && titel) {
      i++;
      if (nr === "paragraph") titel = `§ ${i} ${titel}`;
      else if (nr === "abschnitt") titel = `${i}. ${titel}`;
    }
    abschnitte.push({ titel, absaetze });
  }
  const titel = platzhalterErsetzen(vorlage.titel || "", daten, fehlend);
  const untertitel = platzhalterErsetzen(vorlage.untertitel || "", daten, fehlend);
  const unterschriften = (vorlage.unterschriften || []).map((u) => platzhalterErsetzen(u, daten, fehlend));
  const pflicht = (vorlage.felder || []).filter((f) => f.pflicht).map((f) => f.id);
  const dok = {
    id: vorlage.id, titel, untertitel, kennzeichnung: MUSTER_HINWEIS, quelle: vorlage.quelle || "", stand: vorlage.stand || VORLAGEN_STAND,
    abschnitte, unterschriften, fehlend, pflichtFehlend: pflicht.filter((k) => leer(daten[k])),
  };
  dok.text = kanonisch(dok);
  return dok;
}

/** Kanonischer Text (Grundlage der Prüfsumme SHA-256 und der Versionierung) */
export function kanonisch(dok) {
  return [dok.titel, dok.untertitel, ...dok.abschnitte.flatMap((a) => [a.titel, ...a.absaetze]), ...dok.unterschriften].join("\n");
}

// ---------------------------------------------------------------- Daten für die Vorlagen

const datumDe = (iso) => (iso ? String(iso).slice(0, 10).split("-").reverse().join(".") : "");
const zahlDe = (x, stellen = 2) => {
  const n = Number(x);
  if (!Number.isFinite(n)) return "";
  const f = 10 ** stellen;
  const r = Math.round(n * f + (n >= 0 ? 1e-9 : -1e-9)) / f;
  const [g, k = ""] = Math.abs(r).toFixed(stellen).split(".");
  const tausend = g.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${r < 0 ? "-" : ""}${tausend}${stellen ? `,${k}` : ""}`;
};
const eurDe = (x) => (leer(x) || !Number.isFinite(Number(x)) ? "" : `${zahlDe(x, 2)} €`);
/** Cent je kWh mit 2–4 Nachkommastellen (Tarife bis 4 NK, Fachkonzept 3.10) */
const ctDe = (x) => {
  if (leer(x) || !Number.isFinite(Number(x))) return "";
  const [g, k] = zahlDe(x, 4).split(",");
  let n = k;
  while (n.length > 2 && n.endsWith("0")) n = n.slice(0, -1);
  return `${g},${n} ct/kWh`;
};
export const formatDe = { datumDe, zahlDe, eurDe, ctDe };

const RECHTSGRUNDLAGE = { eeg: "§ 66 ElWG in Verbindung mit § 79 EAG", beg: "§ 67 ElWG", gea: "§§ 68 und 70 Abs. 6 Z 1 ElWG", p2p: "§ 68 Abs. 1 ElWG", eigenversorgung: "§ 65 Abs. 2 ElWG" };
const MITGLIEDERKREIS = {
  eeg: "natürliche Personen, Gemeinden, lokale Behörden und sonstige juristische Personen des öffentlichen Rechts sowie kleine und mittlere Unternehmen; bei Privatunternehmen darf die Teilnahme nicht deren gewerbliche oder berufliche Haupttätigkeit sein. Großunternehmen (ElWG § 6 Abs. 1 Z 61) können nicht Mitglied werden",
  beg: "natürliche und juristische Personen sowie Gebietskörperschaften; Großunternehmen nur mit Erzeugungsanlagen bis 6 MW je Zählpunkt",
  gea: "Netzbenutzer, deren Verbrauchsanlagen über dieselbe Hauptleitung wie die gemeinschaftliche Erzeugungsanlage versorgt werden",
  p2p: "aktive Kunden als Vertragspartner",
  eigenversorgung: "der aktive Kunde selbst an einem anderen Standort",
};
const RHYTHMUS = { monat: "monatlich", quartal: "vierteljährlich", jahr: "jährlich" };
const GV_TURNUS = { 1: "jährlich", 2: "alle zwei Jahre", 3: "alle drei Jahre", 4: "alle vier Jahre", 5: "mindestens alle fünf Jahre" };

/**
 * Flache Daten für eine Vorlage aus Gemeinschaft, Netzbetreiber, Tarif, Mitglied usw. und freien Eingaben (Eingaben
 * überschreiben Abgeleitetes). Datums- und Betragsfelder werden deutsch formatiert, damit JS und Python gleich rendern.
 */
export function dokumentDaten({ gemeinschaft = null, netzbetreiber = [], tarif = null, mitglied = null, zaehlpunkt = null, anlage = null, auftrag = null, organe = [], eingaben = {}, heute = "" } = {}) {
  const g = gemeinschaft || {};
  const modell = g.modell || eingaben.modell || auftrag?.modell || "";
  const nb = netzbetreiber.filter((x) => (g.netzbetreiber || []).includes(x.id) || x.id === auftrag?.netzbetreiberId);
  const zl = Number(g.zonelevel || eingaben.zonelevel || auftrag?.zonelevel) || 0;
  const leistungKw = Number(eingaben.erzeugungsleistungKw ?? g.kennzahlen?.erzeugungsleistungKw ?? auftrag?.erzeugungKwp) || 0;
  const person = mitglied?.person || {};
  const organName = (f) => organe.filter((o) => o.funktion === f && o.status !== "beendet").map((o) => o.personName || o.name).filter(Boolean).join(", ");
  const d = {
    heute: datumDe(heute), ort: g.sitzAdresse?.ort || auftrag?.ort || "",
    name: g.name || auftrag?.arbeitsname || "", kurzname: g.kurzname || "",
    modell, modellLabel: EG_MODELLE[modell]?.label || "", modellKurz: EG_MODELLE[modell]?.kurz || "",
    rechtsform: g.rechtsform || auftrag?.rechtsform || "", rechtsgrundlage: RECHTSGRUNDLAGE[modell] || "",
    zonelevel: zl || "", nahebereichLabel: ZONELEVEL[zl]?.label || "", nahebereichRef: g.nahebereichRef || "",
    nahebereichText: modell === "eeg" ? `im ${ZONELEVEL[zl]?.label || "Nahebereich"}${g.nahebereichRef ? ` (${g.nahebereichRef})` : ""} laut Auskunft des Netzbetreibers` : modell === "beg" ? `im Netzgebiet von ${nb.map((x) => x.name).join(" bzw. ") || "……"}` : ZONELEVEL[zl]?.label || "",
    mitgliederkreisText: MITGLIEDERKREIS[modell] || "",
    sitzOrt: g.sitzAdresse?.ort || auftrag?.ort || "", sitzAdresse: [g.sitzAdresse?.strasse, [g.sitzAdresse?.plz, g.sitzAdresse?.ort].filter(Boolean).join(" ")].filter(Boolean).join(", "),
    email: g.email || "", zvrZahl: g.zvrZahl || "", firmenbuchnummer: g.firmenbuchnummer || "", uid: g.uid || "",
    marktpartnerId: g.marktpartnerId || "", gemeinschaftsId: g.gemeinschaftsId || "", verteilmodell: g.verteilmodell || "dynamisch",
    netzbetreiberName: nb.map((x) => x.name).join(", "), netzbetreiberEmail: nb.map((x) => x.kontaktEmail).filter(Boolean).join(", "),
    obmann: organName("obmann"), kassier: organName("kassier"), schriftfuehrer: organName("schriftfuehrer"), rechnungspruefer: organName("rechnungspruefer"),
    organisator: !!g.dienstleistung?.aktiv || ["komplett", "wechsel"].includes(auftrag?.paket), organisatorName: OEKOINVEST.name, organisatorAnschrift: OEKOINVEST.anschrift, organisatorFirmenbuch: OEKOINVEST.firmenbuch,
    erzeugungsleistungKw: leistungKw ? zahlDe(leistungKw, 1) : "", lieferantenpflicht: leistungKw > LIEFERANTENPFLICHT_KW.allgemein || eingaben.lieferantenpflicht === true,
    abrechnungsrhythmus: RHYTHMUS[g.abrechnungsrhythmus] || "monatlich",
    bezugspreisCt: tarif ? ctDe(tarif.bezugspreisCt) : "", einspeisepreisCt: tarif ? ctDe(tarif.einspeisepreisCt) : "", tarifAb: tarif ? datumDe(tarif.gueltigAb) : "",
    mitgliedsbeitrag: tarif && Number(tarif.mitgliedsbeitragJahr) ? `${eurDe(tarif.mitgliedsbeitragJahr)} pro Jahr` : "", beitrittsgebuehr: tarif && Number(tarif.einmalgebuehrBeitritt) ? eurDe(tarif.einmalgebuehrBeitritt) : "",
    mitgliedName: person.firma || [person.vorname, person.nachname].filter(Boolean).join(" "), mitgliedAnschrift: [person.strasse, [person.plz, person.ort].filter(Boolean).join(" ")].filter(Boolean).join(", "),
    mitgliedsnummer: mitglied?.mitgliedsnummer ? String(mitglied.mitgliedsnummer) : "", mitgliedEmail: person.email || "",
    zaehlpunkt: zaehlpunkt?.zaehlpunktnummer || "", teilnahmefaktor: eingaben.teilnahmefaktor ? String(eingaben.teilnahmefaktor) : "100",
    anlageBezeichnung: anlage?.bezeichnung || "", anlageKwp: anlage ? zahlDe(anlage.kwp ?? anlage.engpassleistungKw, 1) : "", nutzungsmodell: anlage?.nutzungsmodell || "ueberschuss",
    paket: auftrag?.paket || "", paketLabel: auftrag?.paketLabel || "", auftraggeberName: auftrag?.auftraggeber?.name || "", auftraggeberAnschrift: auftrag?.auftraggeber?.anschrift || "",
    angebotNetto: auftrag?.angebot ? eurDe(auftrag.angebot.betragNetto) : "", angebotUst: auftrag?.angebot ? eurDe(auftrag.angebot.ustEur) : "", angebotBrutto: auftrag?.angebot ? eurDe(auftrag.angebot.betragBrutto) : "",
    angebotGueltigBis: auftrag?.angebot ? datumDe(auftrag.angebot.gueltigBis) : "", angebotNummer: auftrag?.angebot?.nummer || "", auftragId: auftrag?.id || "",
    leistungenText: (auftrag?.angebot?.leistungen || []).join("; "),
    // Statuten-Vorgaben (Standard laut Fachkonzept 2.3/2.4; änderbar über Eingaben)
    funktionsperiodeJahre: "3", einladungsfristTage: "14", kuendigungsfristWochen: "6", gvTurnusText: GV_TURNUS[1], onlineGv: true, tarifeDurch: "vorstand",
    leitungText: "der Obfrau bzw. dem Obmann, deren bzw. dessen Stellvertretung, der Kassierin bzw. dem Kassier und der Schriftführerin bzw. dem Schriftführer (mindestens zwei Personen)",
    vermoegensempfaenger: "eine gemeinnützige Organisation oder Gebietskörperschaft, die gleiche oder ähnliche Zwecke verfolgt",
    geschaeftsanteilEur: "", kuendigungsfristMonate: "6", revisionsverband: "", aufsichtsrat: false,
    datenschutzKontakt: g.email || "",
  };
  for (const [k, v] of Object.entries(eingaben || {})) {
    if (v === undefined || v === null) continue;
    if (k === "gvTurnusJahre") d.gvTurnusText = GV_TURNUS[Number(v)] || d.gvTurnusText;
    else d[k] = typeof v === "number" ? String(v) : v;
  }
  for (const k of ["stichtag", "letzteAltabrechnung", "frist", "versammlungAm", "ab"]) if (eingaben?.[k]) d[`${k}De`] = datumDe(eingaben[k]);
  return d;
}

/** Vorlagen, die zur Gemeinschaft bzw. zum Auftrag passen (für Auswahllisten) */
export function vorlagenFuer(daten = {}) {
  return Object.values(VORLAGEN).filter((v) => vorlagePasst(v, daten)).map((v) => ({ id: v.id, titel: v.kurz || v.titel.replace(/„\{\{.*?\}\}“|\{\{.*?\}\}/g, "").replace(/\s+/g, " ").trim(), art: v.art, quelle: v.quelle, gruppe: v.gruppe || "vertrag" }));
}
