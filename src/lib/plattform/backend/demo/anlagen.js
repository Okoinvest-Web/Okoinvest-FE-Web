// src/lib/plattform/backend/demo/anlagen.js
//
// Anlagen & Monitoring im Demo-Backend – Referenz für die Frappe-Methoden in plattform/api/anlagen.py
// (Vertrag: docs/API.md, Abschnitt 10; Architektur: docs/ANLAGEN-IOT.md).
// Stammdaten und Prozesse: Anlage, Komponenten, Messpunkte/Zähler, Gerätezugänge (MQTT), Störungsfälle, Wartungen,
// Contracting-Vertrag, Zählerstand-Monatswerte. Messdaten (Zeitreihen) liefert NICHT das Backend, sondern
// src/lib/plattform/messdaten (Ingest-Dienst bzw. Simulator).
//
// Daten unter db.anlagen (eigene Sammlung, beim ersten Zugriff mit Demo-Daten ergänzt – siehe anlagen-seed.js).
//
// Rechte (jede Operation prüft Rolle UND Eigentum selbst):
//   Backoffice   – Rolle admin mit Bereich „anlagen“ (rechte.js): lesen ≥ 1 sieht alle Anlagen, schreiben = 2 pflegt
//                  Stammdaten, Geräte, quittiert/bearbeitet Störungen (Unterrollen leitung, betrieb)
//   Kunde        – Konto `kundeId` der Anlage oder Mitglied der Organisation `organisationId` (jede Teamrolle liest);
//                  kommentieren Störungen ab Teamrolle „Mitglied“ bzw. als Kundenkonto. Sieht nie Gerätezugänge
//                  und keine internen Kommentare.
//   sonst        – 403 (Seiten: 404)

import { PlattformFehler, konflikt, nichtGefunden, ungueltig, verboten } from "../../fehler";
import * as v from "../../validierung";
import { darfLesen, darfSchreiben } from "../../rechte";
import { darfTeamSchreiben } from "../../organisation";
import {
  ANLAGE_STATUS, ANLAGE_TYPEN, KOMPONENTEN_ARTEN, LASTPROFILE, MESSPUNKT_ARTEN, MESSSTELLEN, STOERUNG_OFFEN, STOERUNG_REGELN, STOERUNG_SCHWERE,
  STOERUNG_STATUS, WARTUNG_ARTEN, WARTUNG_STATUS, mqttBenutzer, mqttTopicBasis, regionFuer,
} from "../../anlagen";
import { LAENDER, BUNDESLAENDER } from "../../konstanten";
import { passwortHash } from "../../server/passwort";
import { intern } from "../demo";
import { aendern, lesen } from "./speicher";
import { jetzt, neueId, sha256 } from "./hilfen";
import { teamRolle } from "./teams";
import { anlagenSeed } from "./anlagen-seed";
import { zaehlerMonat } from "../../messdaten/simulator";
import { kycSperre } from "./kycRegeln"; // KYC/KYB: Contracting-Vertrag nur mit verifiziertem Kunden
import { randomBytes } from "node:crypto";
import { BETRIEBSFUEHRER_STANDARD, DIENSTBARKEIT_STATUS, ENDSCHAFT, INDEX_BASIS } from "../../anlagen"; // Eigentum/Betrieb/Dienstbarkeit, Vertragsdetails
import { eigentumErgaenzen } from "./anlagen-eigentum"; // Demo: Eigentümergesellschaften einmalig ergänzen

const { benachrichtigen, protokoll, nutzerById, nameVon } = intern;

const istAdmin = (n) => !!n?.rollen?.includes("admin");
const boLesen = (n) => istAdmin(n) && darfLesen(n, "anlagen");
const boSchreiben = (n) => istAdmin(n) && darfSchreiben(n, "anlagen");

function angemeldet(n) {
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
}
function schreibNoetig(n) {
  angemeldet(n);
  if (!boSchreiben(n)) throw verboten(istAdmin(n) ? "Ihre Backoffice-Rolle erlaubt im Bereich „Anlagen & Monitoring“ kein Schreiben." : "Nur für das Backoffice (Betrieb).");
}
function leseNoetig(n) {
  angemeldet(n);
  if (!boLesen(n)) throw verboten("Nur für das Backoffice (Betrieb).");
}

// ================================================================ Datenbestand

function leer() {
  return { v: 1, anlagen: [], komponenten: [], messpunkte: [], zugaenge: [], stoerungen: [], wartungen: [], vertraege: [], monatswerte: [] };
}

async function lesenBereit() {
  const db = await lesen();
  if (db.anlagen?.v && db.anlagen.eigentum) return db;
  await aendern(async (d) => {
    if (!d.anlagen?.v) {
      d.anlagen = leer();
      try {
        await anlagenSeed(d, { melden: (dd, s) => stoerungMelden(dd, s, "neu", { mail: false }) });
      } catch (e) {
        console.warn("[plattform-demo] Anlagen-Demodaten nicht ergänzt:", e?.message);
      }
    }
    if (!d.anlagen.eigentum) {
      eigentumErgaenzen(d); // Eigentümergesellschaft, Betriebsführer, Dachgeber, Dienstbarkeit (Bestandsdaten)
      d.anlagen.eigentum = 1;
    }
  });
  return lesen();
}

async function aendernBereit(fn) {
  await lesenBereit();
  return aendern(fn);
}

// ================================================================ Rechte & Ausgabe

/** Zugriff des Nutzers auf die Anlage: "backoffice" | "kunde" | "team-schreiben" | "team-lesen" | null */
function zugriff(db, n, a) {
  if (!n || !a) return null;
  if (boLesen(n)) return "backoffice";
  if (a.kundeId && a.kundeId === n.id) return "kunde";
  const r = a.organisationId ? teamRolle(db, n.id, a.organisationId) : null;
  if (r) return darfTeamSchreiben(r) ? "team-schreiben" : "team-lesen";
  return null;
}

function anlageLaden(db, n, id) {
  angemeldet(n);
  const a = db.anlagen.anlagen.find((x) => x.id === v.kennung(id));
  if (!a) throw nichtGefunden("Anlage nicht gefunden.");
  if (!zugriff(db, n, a)) throw verboten("Diese Anlage gehört nicht zu Ihrem Konto.");
  return a;
}

const orgName = (db, id) => (db.organisationen || []).find((o) => o.id === id)?.name || "";

function kundeAusgabe(db, a) {
  const u = a.kundeId ? nutzerById(db, a.kundeId) : null;
  return {
    kunde: u ? { id: u.id, name: nameVon(db, u.id), firma: u.firma || "", email: u.email } : null,
    organisation: a.organisationId ? { id: a.organisationId, name: orgName(db, a.organisationId) } : null,
  };
}

function vertragAusgabe(c) {
  if (!c) return null;
  const ende = c.beginn ? `${Number(c.beginn.slice(0, 4)) + (Number(c.laufzeitJahre) || 0)}${c.beginn.slice(4)}` : "";
  return { ...c, ende };
}

function zugangAusgabe(z) {
  return {
    id: z.id, anlageId: z.anlageId, bezeichnung: z.bezeichnung, benutzer: z.benutzer, topic: z.topic,
    status: z.gesperrt ? "gesperrt" : z.verbunden ? "verbunden" : "wartet",
    gesperrt: !!z.gesperrt, erstelltAm: z.erstelltAm, letzteVerbindung: z.letzteVerbindung || null, letzteNachricht: z.letzteNachricht || null,
    // Nur Fingerabdruck des Hashes – weder Passwort noch Hash verlassen das Backend
    hash: { algorithmus: String(z.passwortHash || "").split("$")[0] || "scrypt", fingerabdruck: sha256(String(z.passwortHash || "")).slice(0, 16) },
  };
}

function stoerungAusgabe(db, n, s, zg) {
  const a = db.anlagen.anlagen.find((x) => x.id === s.anlageId);
  const bo = zg === "backoffice";
  const z = s.zustaendigId ? nutzerById(db, s.zustaendigId) : null;
  const alterH = (Date.now() - new Date(s.erkanntAm).getTime()) / 3600e3;
  const stufe = STOERUNG_SCHWERE[s.schwere]?.stufe ?? 0;
  return {
    id: s.id, anlageId: s.anlageId, anlage: a ? { id: a.id, name: a.name, typ: a.typ, ort: a.ort } : null,
    regel: s.regel, regelLabel: STOERUNG_REGELN[s.regel]?.label || s.regel, schwere: s.schwere, schwereLabel: STOERUNG_SCHWERE[s.schwere]?.label || s.schwere,
    titel: s.titel, text: s.text, status: s.status, statusLabel: STOERUNG_STATUS[s.status]?.label || s.status,
    erkanntAm: s.erkanntAm, zuletztAm: s.zuletztAm || s.erkanntAm, anzahl: s.anzahl || 1, behobenAm: s.behobenAm || null,
    quittiert: !!s.quittiertAm, quittiertAm: s.quittiertAm || null, quittiertVon: s.quittiertVon ? nameVon(db, s.quittiertVon) : null,
    zustaendig: z ? { id: z.id, name: nameVon(db, z.id) } : null,
    // Priorität: Schwere zuerst, dann Alter (je 6 h ein Punkt, gedeckelt), unquittiert +2
    prioritaet: STOERUNG_OFFEN.includes(s.status) ? stufe * 10 + Math.min(8, Math.floor(alterH / 6)) + (s.quittiertAm ? 0 : 2) : 0,
    kommentare: (s.kommentare || []).filter((k) => bo || !k.intern).map((k) => ({ id: k.id, vonName: k.backoffice && !bo ? "ÖkoInvest Betrieb" : k.vonName, backoffice: !!k.backoffice, am: k.am, text: k.text, intern: !!k.intern })),
    verlauf: bo ? s.verlauf || [] : undefined,
    darfKommentieren: bo ? boSchreiben(n) : zg === "kunde" || zg === "team-schreiben",
    darfBearbeiten: boSchreiben(n),
  };
}

function anlageAusgabe(db, n, a, { detail = false } = {}) {
  const zg = zugriff(db, n, a);
  const offen = db.anlagen.stoerungen.filter((s) => s.anlageId === a.id && STOERUNG_OFFEN.includes(s.status));
  const vertrag = db.anlagen.vertraege.find((c) => c.anlageId === a.id) || null;
  const basis = {
    id: a.id, name: a.name, typ: a.typ, typLabel: ANLAGE_TYPEN[a.typ]?.label || a.typ, status: a.status, statusLabel: ANLAGE_STATUS[a.status]?.label || a.status,
    land: a.land, bundesland: a.bundesland, ort: a.ort, regionId: a.regionId, kwp: a.kwp, speicherKwh: a.speicherKwh, speicherKw: a.speicherKw,
    inbetriebnahme: a.inbetriebnahme, lastprofil: a.lastprofil, lastJahrKwh: a.lastJahrKwh, wechselrichterAnzahl: a.wechselrichterAnzahl, beschreibung: a.beschreibung || "",
    // Demo: Szenario des Simulators (offline, Teilausfall, Minderleistung) – Frappe kennt das Feld nicht
    simulation: a.simulation || null,
    ...kundeAusgabe(db, a),
    // Eigentum & Betrieb: Anlage gehört ÖkoInvest bzw. einer Projektgesellschaft, der Kunde ist Stromabnehmer
    eigentuemer: a.eigentuemer || "", eigentuemerId: a.eigentuemerId || null, betriebsfuehrer: a.betriebsfuehrer || BETRIEBSFUEHRER_STANDARD,
    dachgeber: a.dachgeberIstKunde ? (orgName(db, a.organisationId) || kundeAusgabe(db, a).kunde?.firma || "Stromabnehmer") : a.dachgeber || "", dachgeberIstKunde: !!a.dachgeberIstKunde,
    dienstbarkeitStatus: a.dienstbarkeitStatus || "", dienstbarkeitStatusLabel: DIENSTBARKEIT_STATUS[a.dienstbarkeitStatus]?.label || "",
    dienstbarkeitDatum: a.dienstbarkeitDatum || "", dienstbarkeitDokumentId: a.dienstbarkeitDokumentId || null, dienstbarkeitHinweis: a.dienstbarkeitHinweis || "",
    finanziertDurch: zg === "backoffice" ? a.finanziertDurch || "" : undefined,
    offeneStoerungen: offen.map((s) => ({ id: s.id, schwere: s.schwere, status: s.status, titel: s.titel, regel: s.regel })),
    vertrag: vertrag ? { strompreisCt: vertrag.strompreisCt, grundgebuehrMonat: vertrag.grundgebuehrMonat, status: vertrag.status } : null,
    meinZugriff: zg,
    darfBearbeiten: boSchreiben(n),
    erstelltAm: a.erstelltAm, geaendertAm: a.geaendertAm,
  };
  if (!detail) return basis;
  const bo = zg === "backoffice";
  return {
    ...basis,
    vertrag: vertragAusgabe(vertrag),
    // Technische Tiefe (Komponenten, Monitoring-Messpunkte) nur fürs Backoffice; Kunden sehen die abrechnungsrelevanten Zähler
    komponenten: bo ? db.anlagen.komponenten.filter((k) => k.anlageId === a.id).map((k) => ({ ...k, artLabel: KOMPONENTEN_ARTEN[k.art] || k.art })) : undefined,
    messpunkte: db.anlagen.messpunkte.filter((m) => m.anlageId === a.id && (bo || m.abrechnungsrelevant)).map((m) => ({ ...m, artLabel: MESSPUNKT_ARTEN[m.art]?.label || m.art, messstelleLabel: MESSSTELLEN[m.messstelle] || m.messstelle })),
    wartungen: db.anlagen.wartungen.filter((w) => w.anlageId === a.id).sort((x, y) => String(y.datum).localeCompare(String(x.datum))).map((w) => ({ ...w, artLabel: WARTUNG_ARTEN[w.art] || w.art, statusLabel: WARTUNG_STATUS[w.status] || w.status, ...(bo ? {} : { kostenEur: undefined }) })),
    stoerungen: db.anlagen.stoerungen.filter((s) => s.anlageId === a.id).sort((x, y) => String(y.erkanntAm).localeCompare(String(x.erkanntAm))).map((s) => stoerungAusgabe(db, n, s, zg)),
    geraete: bo ? db.anlagen.zugaenge.filter((z) => z.anlageId === a.id).map(zugangAusgabe) : undefined,
    datenVerbunden: db.anlagen.zugaenge.some((z) => z.anlageId === a.id && z.verbunden && !z.gesperrt),
  };
}

// ================================================================ Lesen

/** Anlagen, die der Nutzer sehen darf (Backoffice: alle) */
export async function anlagen(n, { q = "", typ = "", status = "" } = {}) {
  angemeldet(n);
  const db = await lesenBereit();
  const such = v.text(q, 80).toLowerCase();
  return db.anlagen.anlagen
    .filter((a) => zugriff(db, n, a))
    .filter((a) => !typ || a.typ === typ)
    .filter((a) => !status || a.status === status)
    .filter((a) => !such || [a.name, a.ort, a.bundesland, a.id, orgName(db, a.organisationId), a.eigentuemer].join(" ").toLowerCase().includes(such))
    .sort((x, y) => x.name.localeCompare(y.name, "de"))
    .map((a) => anlageAusgabe(db, n, a));
}

export async function anlage(n, id) {
  const db = await lesenBereit();
  const a = anlageLaden(db, n, id);
  return anlageAusgabe(db, n, a, { detail: true });
}

/** Auswahllisten für die Zuordnung (Backoffice): Konten mit Rolle „unternehmen“ und Organisationen */
export async function anlagenKunden(n) {
  leseNoetig(n);
  const db = await lesenBereit();
  return {
    konten: db.nutzer.filter((u) => u.aktiv && u.rollen.includes("unternehmen")).map((u) => ({ id: u.id, name: nameVon(db, u.id), firma: u.firma || "", email: u.email })).sort((a, b) => a.name.localeCompare(b.name, "de")),
    organisationen: (db.organisationen || []).map((o) => ({ id: o.id, name: o.name, art: o.art })).sort((a, b) => a.name.localeCompare(b.name, "de")),
    betrieb: db.nutzer.filter((u) => u.aktiv && u.rollen.includes("admin") && darfLesen(u, "anlagen")).map((u) => ({ id: u.id, name: nameVon(db, u.id) })),
    // Eigentümergesellschaften aus dem Gesellschaftsverzeichnis (falls vorhanden)
    gesellschaften: (db.dienste?.gesellschaften || []).filter((g) => g.status !== "aufgeloest").map((g) => ({ id: g.id, name: g.name, status: g.status })).sort((a, b) => a.name.localeCompare(b.name, "de")),
  };
}

// ================================================================ Stammdaten pflegen (Backoffice)

function anlageFelder(db, d, alt = {}) {
  const has = (k) => Object.hasOwn(d, k);
  const f = {};
  if (has("name") || !alt.id) f.name = v.text(d.name, 120);
  if (has("typ") || !alt.id) f.typ = v.auswahl(d.typ, ANLAGE_TYPEN, alt.typ || "");
  if (has("status") || !alt.id) f.status = v.auswahl(d.status, ANLAGE_STATUS, alt.status || "betrieb");
  if (has("land") || !alt.id) f.land = v.auswahl(d.land, LAENDER, alt.land || "DE");
  const land = f.land || alt.land;
  if (has("bundesland") || !alt.id) f.bundesland = v.auswahl(d.bundesland, BUNDESLAENDER[land] || [], "");
  if (has("ort")) f.ort = v.text(d.ort, 80);
  for (const [k, max] of [["kwp", 500000], ["speicherKwh", 1000000], ["speicherKw", 500000], ["lastJahrKwh", 1e9]]) {
    if (has(k)) f[k] = v.zahl(d[k], { min: 0, max, stellen: 1 }) ?? 0;
  }
  if (has("wechselrichterAnzahl")) f.wechselrichterAnzahl = Math.round(v.zahl(d.wechselrichterAnzahl, { min: 1, max: 999 }) ?? 1);
  if (has("lastprofil") || !alt.id) f.lastprofil = v.auswahl(d.lastprofil, LASTPROFILE, alt.lastprofil || "gewerbe");
  if (has("inbetriebnahme")) f.inbetriebnahme = /^20\d\d-\d\d-\d\d$/.test(String(d.inbetriebnahme || "")) ? d.inbetriebnahme : "";
  if (has("beschreibung")) f.beschreibung = v.mehrzeilig(d.beschreibung, 2000);
  if (has("kundeId")) {
    const k = v.kennung(d.kundeId);
    if (k && !nutzerById(db, k)) throw ungueltig("Kundenkonto nicht gefunden.");
    f.kundeId = k || null;
  }
  if (has("organisationId")) {
    const o = v.kennung(d.organisationId);
    if (o && !(db.organisationen || []).some((x) => x.id === o)) throw ungueltig("Organisation nicht gefunden.");
    f.organisationId = o || null;
  }
  // Eigentum & Betrieb (Pflicht: Eigentümergesellschaft – ÖkoInvest GmbH oder Projektgesellschaft/SPV)
  if (has("eigentuemer") || !alt.id) f.eigentuemer = v.text(d.eigentuemer, 160);
  if (has("eigentuemerId")) {
    // Gesellschaftsverzeichnis (db.dienste.gesellschaften, Team Dienste): Kennung prüfen, Name übernehmen
    f.eigentuemerId = v.kennung(d.eigentuemerId) || null;
    if (f.eigentuemerId) {
      const g = (db.dienste?.gesellschaften || []).find((x) => x.id === f.eigentuemerId);
      if (!g) throw ungueltig("Gesellschaft nicht im Gesellschaftsverzeichnis gefunden.");
      f.eigentuemer = g.name;
    }
  }
  if (has("betriebsfuehrer") || !alt.id) f.betriebsfuehrer = v.text(d.betriebsfuehrer, 160) || alt.betriebsfuehrer || BETRIEBSFUEHRER_STANDARD;
  if (has("dachgeberIstKunde")) f.dachgeberIstKunde = v.wahr(d.dachgeberIstKunde);
  if (has("dachgeber")) f.dachgeber = v.text(d.dachgeber, 160);
  if (has("dienstbarkeitStatus")) f.dienstbarkeitStatus = v.auswahl(d.dienstbarkeitStatus, DIENSTBARKEIT_STATUS, "");
  if (has("dienstbarkeitDatum")) f.dienstbarkeitDatum = /^20\d\d-\d\d-\d\d$/.test(String(d.dienstbarkeitDatum || "")) ? d.dienstbarkeitDatum : "";
  if (has("dienstbarkeitDokumentId")) f.dienstbarkeitDokumentId = v.kennung(d.dienstbarkeitDokumentId) || null;
  if (has("dienstbarkeitHinweis")) f.dienstbarkeitHinweis = v.text(d.dienstbarkeitHinweis, 200);
  if (has("finanziertDurch")) f.finanziertDurch = v.text(d.finanziertDurch, 160);
  const neu = { ...alt, ...f };
  v.pflicht((neu.eigentuemer || "").length >= 3, "Bitte geben Sie die Eigentümergesellschaft an (ÖkoInvest GmbH oder Projektgesellschaft).");
  if (["beantragt", "eingetragen"].includes(neu.dienstbarkeitStatus)) v.pflicht(!!neu.dienstbarkeitDatum, "Bitte geben Sie das Datum des Antrags bzw. der Eintragung der Dienstbarkeit an.");
  v.pflicht(neu.name?.length >= 3, "Bitte geben Sie eine Bezeichnung an (mind. 3 Zeichen).");
  v.pflicht(!!neu.typ, "Bitte wählen Sie den Anlagentyp.");
  v.pflicht(!!neu.bundesland, "Bitte wählen Sie Bundesland bzw. Kanton.");
  if (neu.typ === "speicher") v.pflicht((neu.speicherKwh || 0) > 0, "Ein Batteriespeicher braucht eine Kapazität in kWh.");
  else v.pflicht((neu.kwp || 0) > 0, "Bitte geben Sie die Leistung in kWp an.");
  if (neu.status === "betrieb") v.pflicht(!!neu.inbetriebnahme, "Für Anlagen in Betrieb ist das Inbetriebnahmedatum Pflicht.");
  neu.regionId = regionFuer(neu.land, neu.bundesland);
  return neu;
}

export async function anlageAnlegen(n, daten = {}) {
  schreibNoetig(n);
  return aendernBereit((db) => {
    const t = jetzt();
    const a = anlageFelder(db, { speicherKwh: 0, speicherKw: 0, lastJahrKwh: 0, wechselrichterAnzahl: 1, ort: "", beschreibung: "", inbetriebnahme: "", kundeId: null, organisationId: null, ...daten }, {});
    a.id = neueId("AL");
    a.erstelltAm = t;
    a.geaendertAm = t;
    // Demo: bis zur ersten Nachricht eines Geräts gibt es keine Messdaten
    a.simulation = { keineDaten: true };
    db.anlagen.anlagen.push(a);
    protokoll(db, n, "anlage_angelegt", "anlage", a.id, `Anlage angelegt: ${a.name}`);
    return anlageAusgabe(db, n, a, { detail: true });
  });
}

export async function anlageAendern(n, id, daten = {}) {
  schreibNoetig(n);
  return aendernBereit((db) => {
    const a = anlageLaden(db, n, id);
    const neu = anlageFelder(db, daten, a);
    Object.assign(a, neu, { geaendertAm: jetzt() });
    protokoll(db, n, "anlage_geaendert", "anlage", a.id, `Stammdaten geändert: ${Object.keys(daten).filter((k) => k !== "id").join(", ")}`.slice(0, 280));
    return anlageAusgabe(db, n, a, { detail: true });
  });
}

const datumOk = (s) => (/^20\d\d-\d\d-\d\d$/.test(String(s || "")) ? String(s) : "");

const EINTRAG = {
  komponente: {
    sammlung: "komponenten", praefix: "AK",
    felder(d) {
      const k = {
        art: v.auswahl(d.art, KOMPONENTEN_ARTEN, ""), hersteller: v.text(d.hersteller, 80), modell: v.text(d.modell, 120), seriennummer: v.text(d.seriennummer, 80),
        anzahl: Math.round(v.zahl(d.anzahl, { min: 1, max: 100000 }) ?? 1), leistungKw: v.zahl(d.leistungKw, { min: 0, max: 500000, stellen: 1 }),
        kapazitaetKwh: v.zahl(d.kapazitaetKwh, { min: 0, max: 1000000, stellen: 1 }), inbetriebnahme: datumOk(d.inbetriebnahme), garantieBis: datumOk(d.garantieBis), bemerkung: v.text(d.bemerkung, 300),
      };
      v.pflicht(!!k.art, "Bitte wählen Sie die Art der Komponente.");
      v.pflicht(!!(k.hersteller || k.modell), "Bitte geben Sie Hersteller oder Modell an.");
      return k;
    },
  },
  messpunkt: {
    sammlung: "messpunkte", praefix: "MP",
    felder(d) {
      const m = {
        bezeichnung: v.text(d.bezeichnung, 100), zaehlernummer: v.text(d.zaehlernummer, 40), art: v.auswahl(d.art, MESSPUNKT_ARTEN, ""),
        messstelle: v.auswahl(d.messstelle, MESSSTELLEN, "monitoring"), abrechnungsrelevant: v.wahr(d.abrechnungsrelevant), msb: v.text(d.msb, 100),
        smgw: v.wahr(d.smgw), eichgueltigBis: datumOk(d.eichgueltigBis), bemerkung: v.text(d.bemerkung, 300),
      };
      v.pflicht(!!m.zaehlernummer, "Bitte geben Sie die Zählernummer an.");
      v.pflicht(!!m.art, "Bitte wählen Sie die Art des Messpunkts.");
      // Abrechnung nur mit geeichter Messstelle / Smart-Meter-Gateway – MQTT-Werte sind reines Monitoring
      if (m.abrechnungsrelevant && m.messstelle !== "geeicht") throw ungueltig("Abrechnungsrelevant sind nur geeichte Messstellen bzw. Smart-Meter-Gateways – MQTT-Werte dienen ausschließlich dem Monitoring.");
      m.bezeichnung ||= MESSPUNKT_ARTEN[m.art].label;
      return m;
    },
  },
  wartung: {
    sammlung: "wartungen", praefix: "WA",
    felder(d) {
      const w = {
        art: v.auswahl(d.art, WARTUNG_ARTEN, ""), datum: datumOk(d.datum), status: v.auswahl(d.status, WARTUNG_STATUS, "geplant"), dienstleister: v.text(d.dienstleister, 100),
        bericht: v.mehrzeilig(d.bericht, 2000), naechsteFaelligkeit: datumOk(d.naechsteFaelligkeit), kostenEur: v.zahl(d.kostenEur, { min: 0, max: 10000000, stellen: 2 }),
      };
      v.pflicht(!!w.art, "Bitte wählen Sie die Art der Wartung.");
      v.pflicht(!!w.datum, "Bitte geben Sie das Datum an.");
      return w;
    },
  },
  vertrag: {
    sammlung: "vertraege", praefix: "CV", einzeln: true,
    felder(d) {
      const c = {
        nummer: v.text(d.nummer, 40), beginn: datumOk(d.beginn), laufzeitJahre: Math.round(v.zahl(d.laufzeitJahre, { min: 1, max: 40 }) ?? 0),
        strompreisCt: v.zahl(d.strompreisCt, { min: 0, max: 100, stellen: 3 }), grundgebuehrMonat: v.zahl(d.grundgebuehrMonat, { min: 0, max: 1000000, stellen: 2 }),
        indexierungPct: v.zahl(d.indexierungPct, { min: 0, max: 10, stellen: 2 }) ?? 0, kuendigungsfristMonate: Math.round(v.zahl(d.kuendigungsfristMonate, { min: 0, max: 36 }) ?? 6),
        status: v.auswahl(d.status, ["aktiv", "gekuendigt", "beendet"], "aktiv"), bemerkung: v.text(d.bemerkung, 300),
        // Vertragsdetails: Preisgleitung, Mindestabnahme (Take-or-Pay), Endschaftsregelung/Kaufoption
        indexBasis: v.auswahl(d.indexBasis, INDEX_BASIS, Number(d.indexierungPct) > 0 ? "prozent" : "fest"),
        mindestabnahmeKwhJahr: v.zahl(d.mindestabnahmeKwhJahr, { min: 0, max: 1e9, stellen: 0 }),
        endschaft: v.auswahl(d.endschaft, ENDSCHAFT, ""),
        kaufoptionEur: v.zahl(d.kaufoptionEur, { min: 0, max: 1e9, stellen: 0 }),
        endschaftText: v.text(d.endschaftText, 300),
      };
      v.pflicht(!!c.beginn, "Bitte geben Sie den Vertragsbeginn an.");
      v.pflicht(c.laufzeitJahre > 0, "Bitte geben Sie die Laufzeit in Jahren an (1–40).");
      v.pflicht(c.strompreisCt !== null, "Bitte geben Sie den Strompreis in ct/kWh an (0 bei reiner Monatsrate).");
      v.pflicht(c.grundgebuehrMonat !== null, "Bitte geben Sie die Grundgebühr je Monat an (0 möglich).");
      return c;
    },
  },
  monatswert: {
    sammlung: "monatswerte", praefix: "ZM",
    felder(d, db, a) {
      const mp = db.anlagen.messpunkte.find((m) => m.id === v.kennung(d.messpunktId) && m.anlageId === a.id);
      if (!mp) throw ungueltig("Messpunkt nicht gefunden.");
      if (!mp.abrechnungsrelevant) throw ungueltig("Monatswerte für die Abrechnung nur für abrechnungsrelevante (geeichte) Messpunkte.");
      const register = v.auswahl(d.register, MESSPUNKT_ARTEN[mp.art].register.map((r) => r.id), "");
      const w = { messpunktId: mp.id, zaehlernummer: mp.zaehlernummer, monat: /^20\d\d-(0[1-9]|1[0-2])$/.test(String(d.monat || "")) ? d.monat : "", register, stand: v.zahl(d.stand, { min: 0, max: 1e12, stellen: 3 }), quelle: v.text(d.quelle, 80) || "Messstellenbetreiber", geprueft: v.wahr(d.geprueft) };
      v.pflicht(!!w.monat && !!w.register && w.stand !== null, "Bitte Monat, Register und Zählerstand angeben.");
      const vorher = db.anlagen.monatswerte.filter((x) => x.messpunktId === mp.id && x.register === register && x.monat < w.monat).sort((x, y) => y.monat.localeCompare(x.monat))[0];
      if (vorher && w.stand < vorher.stand) throw ungueltig(`Zählerstand kleiner als im Vormonat (${vorher.monat}) – bitte prüfen (Zählertausch als neuen Messpunkt anlegen).`);
      w.menge = vorher ? Math.round((w.stand - vorher.stand) * 1000) / 1000 : null;
      return w;
    },
  },
};

/** Eintrag an einer Anlage anlegen/ändern: art komponente|messpunkt|wartung|vertrag|monatswert */
export async function anlageEintragSpeichern(n, anlageId, { art, id, daten = {} } = {}) {
  schreibNoetig(n);
  const def = EINTRAG[art];
  if (!def) throw ungueltig("Unbekannte Art.");
  return aendernBereit((db) => {
    const a = anlageLaden(db, n, anlageId);
    const liste = db.anlagen[def.sammlung];
    const felder = def.felder(daten || {}, db, a);
    if (art === "vertrag" && felder.status === "aktiv" && (a.kundeId || a.organisationId) && !db.anlagen.vertraege.some((x) => x.anlageId === a.id && x.status === "aktiv")) kycSperre(db, "contracting", { kontoId: a.kundeId || null, organisationId: a.organisationId || null, text: "Contracting-Vertrag nicht möglich: Der Kunde ist noch nicht verifiziert (KYB)." }); // KYC/KYB
    let e = def.einzeln ? liste.find((x) => x.anlageId === a.id) : id ? liste.find((x) => x.id === v.kennung(id) && x.anlageId === a.id) : null;
    if (id && !e && !def.einzeln) throw nichtGefunden("Eintrag nicht gefunden.");
    if (art === "monatswert" && !e) e = liste.find((x) => x.messpunktId === felder.messpunktId && x.register === felder.register && x.monat === felder.monat) || null;
    if (e) Object.assign(e, felder, { geaendertAm: jetzt() });
    else {
      e = { id: neueId(def.praefix), anlageId: a.id, ...felder, erstelltAm: jetzt(), geaendertAm: jetzt() };
      liste.push(e);
    }
    protokoll(db, n, `anlage_${art}`, "anlage", a.id, `${art} gespeichert (${e.id})`);
    return e;
  });
}

export async function anlageEintragLoeschen(n, anlageId, { art, id } = {}) {
  schreibNoetig(n);
  const def = EINTRAG[art];
  if (!def || def.einzeln) throw ungueltig("Dieser Eintrag kann nicht gelöscht werden.");
  return aendernBereit((db) => {
    const a = anlageLaden(db, n, anlageId);
    const liste = db.anlagen[def.sammlung];
    const idx = liste.findIndex((x) => x.id === v.kennung(id) && x.anlageId === a.id);
    if (idx < 0) throw nichtGefunden("Eintrag nicht gefunden.");
    if (art === "messpunkt" && db.anlagen.monatswerte.some((m) => m.messpunktId === liste[idx].id)) throw konflikt("Für diesen Messpunkt liegen Monatswerte vor – er kann nicht gelöscht werden.");
    const [weg] = liste.splice(idx, 1);
    protokoll(db, n, `anlage_${art}_geloescht`, "anlage", a.id, `${art} gelöscht (${weg.id})`);
    return { ok: true };
  });
}

/**
 * Zählerstand-Monatswerte (Abrechnung) je abrechnungsrelevantem Messpunkt. Demo: fehlende Monate werden aus der
 * Simulation abgeleitet und als solche gekennzeichnet (im Betrieb liefert sie der Messstellenbetreiber).
 */
export async function zaehlerMonatswerte(n, anlageId) {
  const db = await lesenBereit();
  const a = anlageLaden(db, n, anlageId);
  const mps = db.anlagen.messpunkte.filter((m) => m.anlageId === a.id && m.abrechnungsrelevant);
  const gespeichert = db.anlagen.monatswerte.filter((m) => m.anlageId === a.id);
  const sim = a.simulation?.keineDaten ? [] : await zaehlerMonat(anlageAusgabe(db, n, a), { monate: 13 }).catch(() => []);
  const zeilen = [];
  for (const mp of mps) {
    for (const r of MESSPUNKT_ARTEN[mp.art]?.register || []) {
      const feld = mp.art === "erzeugung" ? "erzeugungKwh" : mp.art === "zweirichtung" ? (r.id === "1.8.0" ? "netzbezugKwh" : "einspeisungKwh") : null;
      const monate = new Set([...gespeichert.filter((g) => g.messpunktId === mp.id && g.register === r.id).map((g) => g.monat), ...sim.filter((s) => s.vollstaendig).map((s) => s.monat)]);
      for (const monat of [...monate].sort()) {
        const g = gespeichert.find((x) => x.messpunktId === mp.id && x.register === r.id && x.monat === monat);
        const s = sim.find((x) => x.monat === monat && x.vollstaendig);
        if (g) zeilen.push({ id: g.id, monat, messpunktId: mp.id, zaehlernummer: mp.zaehlernummer, bezeichnung: mp.bezeichnung, register: r.id, registerLabel: r.label, stand: g.stand, menge: g.menge, quelle: g.quelle, geprueft: !!g.geprueft });
        else if (s && feld) zeilen.push({ id: null, monat, messpunktId: mp.id, zaehlernummer: mp.zaehlernummer, bezeichnung: mp.bezeichnung, register: r.id, registerLabel: r.label, stand: Math.round(s.ende[feld]), menge: Math.round(s[feld]), quelle: "Messstellenbetreiber (Demo – aus Simulation abgeleitet)", geprueft: false });
      }
    }
  }
  return zeilen.sort((x, y) => y.monat.localeCompare(x.monat) || x.zaehlernummer.localeCompare(y.zaehlernummer) || x.register.localeCompare(y.register));
}

// ================================================================ Gerätezugänge (MQTT)

const MQTT_HOST = () => process.env.ANLAGEN_MQTT_HOST || "mqtt.example.com";
const MQTT_PORT = () => Number(process.env.ANLAGEN_MQTT_PORT) || 8883;

/** Neues, zufälliges Gerätepasswort (32 Zeichen, ≈ 190 Bit) */
const geraetPasswort = () => randomBytes(24).toString("base64url");

function zugangLaden(db, n, id) {
  const z = db.anlagen.zugaenge.find((x) => x.id === v.kennung(id));
  if (!z) throw nichtGefunden("Gerätezugang nicht gefunden.");
  anlageLaden(db, n, z.anlageId);
  return z;
}

const broker = () => ({ host: MQTT_HOST(), port: MQTT_PORT(), tls: true });

/** Neuer Gerätezugang – das Passwort steht NUR in dieser Antwort (danach nur noch der Hash) */
export async function geraetZugangAnlegen(n, anlageId, { bezeichnung = "" } = {}) {
  schreibNoetig(n);
  const passwort = geraetPasswort();
  const hash = await passwortHash(passwort);
  return aendernBereit((db) => {
    const a = anlageLaden(db, n, anlageId);
    if (db.anlagen.zugaenge.filter((z) => z.anlageId === a.id).length >= 20) throw konflikt("Höchstens 20 Gerätezugänge je Anlage.");
    const id = neueId("GZ");
    const z = {
      id, anlageId: a.id, bezeichnung: v.text(bezeichnung, 80) || "Datenlogger", benutzer: mqttBenutzer(a.id, id), topic: `${mqttTopicBasis(a.id, id)}/#`,
      passwortHash: hash, gesperrt: false, verbunden: false, erstelltAm: jetzt(), erstelltVon: n.id, letzteVerbindung: null, letzteNachricht: null,
    };
    db.anlagen.zugaenge.push(z);
    protokoll(db, n, "geraet_angelegt", "anlage", a.id, `Gerätezugang ${z.benutzer} angelegt`);
    return { zugang: zugangAusgabe(z), passwort, einmalig: true, broker: broker() };
  });
}

export async function geraetZugang(n, id) {
  const db = await lesenBereit();
  leseNoetig(n);
  return { zugang: zugangAusgabe(zugangLaden(db, n, id)), broker: broker() };
}

/** aktion: sperren | entsperren | neu (neues Passwort, einmalig) | testnachricht (nur Demo: simuliert die erste Nachricht) */
export async function geraetZugangAktion(n, id, { aktion, mitFehlercode = false } = {}) {
  schreibNoetig(n);
  const passwort = aktion === "neu" ? geraetPasswort() : null;
  const hash = passwort ? await passwortHash(passwort) : null;
  return aendernBereit((db) => {
    const z = zugangLaden(db, n, id);
    const a = db.anlagen.anlagen.find((x) => x.id === z.anlageId);
    if (aktion === "sperren") {
      z.gesperrt = true;
      protokoll(db, n, "geraet_gesperrt", "anlage", a.id, `Gerätezugang ${z.benutzer} gesperrt`);
    } else if (aktion === "entsperren") {
      z.gesperrt = false;
      protokoll(db, n, "geraet_entsperrt", "anlage", a.id, `Gerätezugang ${z.benutzer} entsperrt`);
    } else if (aktion === "neu") {
      z.passwortHash = hash;
      z.verbunden = false;
      z.letzteVerbindung = null;
      protokoll(db, n, "geraet_neu", "anlage", a.id, `Neues Passwort für ${z.benutzer} erzeugt (altes ungültig)`);
      return { zugang: zugangAusgabe(z), passwort, einmalig: true, broker: broker() };
    } else if (aktion === "testnachricht") {
      if (z.gesperrt) throw konflikt("Der Zugang ist gesperrt – der Broker weist die Verbindung ab.");
      const t = jetzt();
      z.verbunden = true;
      z.letzteVerbindung = t;
      z.letzteNachricht = t;
      if (a.simulation?.keineDaten) a.simulation = null; // ab jetzt liefert der Simulator Werte (inkl. Historie aus dem Datenlogger)
      if (mitFehlercode) stoerungAnlegenIntern(db, { anlageId: a.id, geraetId: z.id, regel: "fehlercode", titel: "Fehlercode am Wechselrichter", text: "Testnachricht mit Fehlercode E-2031 Netzüberspannung (Demo)." });
      protokoll(db, n, "geraet_test", "anlage", a.id, `Testnachricht von ${z.benutzer} empfangen (Demo)`);
    } else throw ungueltig("Unbekannte Aktion.");
    return { zugang: zugangAusgabe(z), broker: broker() };
  });
}

// ================================================================ Störungen

/** Benachrichtigung (Glocke + ggf. E-Mail ohne Inhalte) an Kunde/Team und Betrieb */
function stoerungMelden(db, s, anlass = "neu", { mail = true } = {}) {
  const a = db.anlagen.anlagen.find((x) => x.id === s.anlageId);
  if (!a) return;
  const stufe = STOERUNG_SCHWERE[s.schwere]?.stufe ?? 0;
  const link = `/portal/anlagen/${a.id}?tab=stoerungen`;
  const titel = anlass === "behoben" ? `Störung behoben: ${a.name}` : `Störung: ${a.name}`;
  const text = `${STOERUNG_SCHWERE[s.schwere]?.label || ""} – ${s.titel}`;
  const empfaenger = new Map();
  // Kunde und Team: ab Schwere „mittel“ bzw. bei Behebung
  if (stufe >= 2 || anlass === "behoben") {
    if (a.kundeId) empfaenger.set(a.kundeId, nutzerById(db, a.kundeId));
    for (const m of (db.mitgliedschaften || []).filter((x) => x.organisationId && x.organisationId === a.organisationId)) empfaenger.set(m.nutzerId, nutzerById(db, m.nutzerId));
  }
  // Betrieb: zuständige Person bzw. alle Backoffice-Konten mit Leserecht „Anlagen“
  if (anlass === "neu") {
    const z = s.zustaendigId ? nutzerById(db, s.zustaendigId) : null;
    const bo = z ? [z] : db.nutzer.filter((u) => u.aktiv && u.rollen.includes("admin") && darfLesen(u, "anlagen"));
    for (const u of bo) empfaenger.set(u.id, u);
  }
  for (const u of empfaenger.values()) {
    if (!u) continue;
    benachrichtigen(db, u, { art: "stoerung", titel, text, link, objektArt: "anlage", objektId: a.id }, {
      mail,
      mailBetreff: anlass === "behoben" ? "Störung an Ihrer Anlage behoben – ÖkoInvest" : "Störung an einer Anlage – ÖkoInvest",
      mailText: anlass === "behoben" ? "Eine Störung an einer Anlage wurde behoben. Details finden Sie im Portal." : "An einer Anlage wurde eine Störung erkannt. Details finden Sie im Portal.",
    });
  }
}

/**
 * Störung anlegen (intern, innerhalb einer Schreibtransaktion). Doppelte offene Störungen derselben Regel an derselben
 * Anlage werden zusammengefasst (Zähler + zuletztAm); `schluessel` verhindert Wiederholungen desselben Ereignisses.
 */
function stoerungAnlegenIntern(db, { anlageId, geraetId = null, regel = "manuell", schwere, titel, text = "", schluessel = null, von = null }) {
  const offen = regel !== "manuell" && db.anlagen.stoerungen.find((s) => s.anlageId === anlageId && s.regel === regel && STOERUNG_OFFEN.includes(s.status));
  if (offen) {
    offen.anzahl = (offen.anzahl || 1) + 1;
    offen.zuletztAm = jetzt();
    return { stoerung: offen, neu: false };
  }
  if (schluessel && db.anlagen.stoerungen.some((s) => s.schluessel === schluessel)) return { stoerung: null, neu: false };
  const t = jetzt();
  const s = {
    id: neueId("ST"), anlageId, geraetId, regel: v.auswahl(regel, STOERUNG_REGELN, "manuell"), schwere: v.auswahl(schwere, STOERUNG_SCHWERE, STOERUNG_REGELN[regel]?.schwere || "mittel"),
    titel: v.text(titel, 140) || STOERUNG_REGELN[regel]?.label || "Störung", text: v.mehrzeilig(text, 2000), status: "offen", erkanntAm: t, zuletztAm: t, anzahl: 1,
    quittiertAm: null, quittiertVon: null, zustaendigId: null, behobenAm: null, kommentare: [], verlauf: [{ am: t, text: von ? `Manuell erfasst von ${nameVon(db, von)}` : "Störung erkannt" }], schluessel,
  };
  db.anlagen.stoerungen.push(s);
  if (db.anlagen.stoerungen.length > 5000) {
    const idx = db.anlagen.stoerungen.findIndex((x) => x.status === "behoben");
    if (idx >= 0) db.anlagen.stoerungen.splice(idx, 1);
  }
  stoerungMelden(db, s, "neu");
  return { stoerung: s, neu: true };
}

/** Störungen: Backoffice alle (bzw. je Anlage), Kunde nur eigene Anlagen. status: offen (offen+in_arbeit) | behoben | alle */
export async function stoerungen(n, { anlageId = "", status = "offen", limit = 200 } = {}) {
  angemeldet(n);
  const db = await lesenBereit();
  const aid = v.kennung(anlageId);
  if (aid) anlageLaden(db, n, aid);
  const liste = db.anlagen.stoerungen
    .filter((s) => (!aid || s.anlageId === aid))
    .filter((s) => (status === "alle" ? true : status === "behoben" ? s.status === "behoben" : STOERUNG_OFFEN.includes(s.status)))
    .map((s) => ({ s, zg: zugriff(db, n, db.anlagen.anlagen.find((a) => a.id === s.anlageId)) }))
    .filter((x) => x.zg)
    .map(({ s, zg }) => stoerungAusgabe(db, n, s, zg))
    .sort((x, y) => y.prioritaet - x.prioritaet || String(y.erkanntAm).localeCompare(String(x.erkanntAm)));
  return liste.slice(0, Math.min(500, Math.max(1, Number(limit) || 200)));
}

/** Manuell erfasste Störung (Backoffice) */
export async function stoerungAnlegen(n, { anlageId, schwere, titel, text } = {}) {
  schreibNoetig(n);
  v.pflicht(v.text(titel, 140).length >= 3, "Bitte beschreiben Sie die Störung kurz (Titel).");
  return aendernBereit((db) => {
    const a = anlageLaden(db, n, anlageId);
    const { stoerung } = stoerungAnlegenIntern(db, { anlageId: a.id, regel: "manuell", schwere, titel, text, von: n.id });
    protokoll(db, n, "stoerung_angelegt", "anlage", a.id, `Störung erfasst: ${stoerung.titel}`);
    return stoerungAusgabe(db, n, stoerung, "backoffice");
  });
}

/**
 * Nur serverseitig (Demo): Befund der nachgebildeten Regeln des Ingest-Dienstes (messdaten/auswertung.js).
 * Kein Nutzerkontext, nie aus Nutzereingaben aufrufen. Im Betrieb meldet der Ingest-Dienst direkt an Frappe.
 */
export async function stoerungSystem(befund = {}) {
  const aid = v.kennung(befund.anlageId);
  if (!aid || !STOERUNG_REGELN[befund.regel] || befund.regel === "manuell") return null;
  // Ohne Schreibzugriff abbrechen, wenn nichts Neues zu tun ist (Aufruf bei jedem Seitenabruf)
  const vorab = await lesenBereit();
  const offen = vorab.anlagen.stoerungen.find((s) => s.anlageId === aid && s.regel === befund.regel && STOERUNG_OFFEN.includes(s.status));
  if (offen && Date.now() - new Date(offen.zuletztAm || offen.erkanntAm).getTime() < 10 * 60e3) return { id: offen.id, neu: false };
  if (!offen && befund.schluessel && vorab.anlagen.stoerungen.some((s) => s.schluessel === befund.schluessel)) return null;
  return aendernBereit((db) => {
    if (!db.anlagen.anlagen.some((a) => a.id === aid)) return null;
    const { stoerung, neu } = stoerungAnlegenIntern(db, { ...befund, anlageId: aid });
    return stoerung ? { id: stoerung.id, neu } : null;
  });
}

/**
 * Aktion an einer Störung:
 *   kommentar {text, intern?}   – Kunde (Konto/Team ab „Mitglied“) und Betrieb; intern nur Betrieb
 *   quittieren                   – Betrieb (schreiben)
 *   status {status}              – Betrieb: offen | in_arbeit | behoben
 *   zuweisen {zustaendigId}      – Betrieb (Konto mit Leserecht „Anlagen“ oder leer)
 *   schwere {schwere}            – Betrieb
 */
export async function stoerungAktion(n, id, daten = {}) {
  angemeldet(n);
  return aendernBereit((db) => {
    const s = db.anlagen.stoerungen.find((x) => x.id === v.kennung(id));
    if (!s) throw nichtGefunden("Störung nicht gefunden.");
    const a = anlageLaden(db, n, s.anlageId);
    const zg = zugriff(db, n, a);
    const t = jetzt();
    const aktion = daten.aktion;
    const wer = nameVon(db, n.id);
    if (aktion === "kommentar") {
      const ok = zg === "backoffice" ? boSchreiben(n) : zg === "kunde" || zg === "team-schreiben";
      if (!ok) throw verboten("Sie können diese Störung nur ansehen.");
      const text = v.mehrzeilig(daten.text, 2000);
      v.pflicht(text.length >= 2, "Bitte geben Sie einen Kommentar ein.");
      s.kommentare = s.kommentare || [];
      if (s.kommentare.length >= 200) throw konflikt("Zu viele Kommentare an dieser Störung.");
      const internK = zg === "backoffice" && v.wahr(daten.intern);
      s.kommentare.push({ id: neueId("KO"), von: n.id, vonName: wer, backoffice: zg === "backoffice", am: t, text, intern: internK });
      // Kundenkommentar → zuständige Person bzw. Betrieb informieren (ohne E-Mail-Inhalt)
      if (zg !== "backoffice") {
        const z = s.zustaendigId ? nutzerById(db, s.zustaendigId) : null;
        const bo = z ? [z] : db.nutzer.filter((u) => u.aktiv && u.rollen.includes("admin") && darfSchreiben(u, "anlagen"));
        for (const u of bo) benachrichtigen(db, u, { art: "stoerung", titel: `Kommentar zur Störung: ${a.name}`, text: `${wer}: ${text.slice(0, 160)}`, link: `/portal/anlagen/${a.id}?tab=stoerungen`, objektArt: "anlage", objektId: a.id }, { mail: false });
      }
    } else {
      if (!boSchreiben(n)) throw verboten(zg === "backoffice" ? "Ihre Backoffice-Rolle erlaubt im Bereich „Anlagen & Monitoring“ kein Schreiben." : "Störungen quittiert und bearbeitet der Betrieb von ÖkoInvest.");
      if (aktion === "quittieren") {
        if (s.quittiertAm) throw konflikt("Die Störung ist bereits quittiert.");
        s.quittiertAm = t;
        s.quittiertVon = n.id;
        if (s.status === "offen") s.status = "in_arbeit";
        if (!s.zustaendigId) s.zustaendigId = n.id;
        s.verlauf.push({ am: t, text: `Quittiert von ${wer}` });
      } else if (aktion === "status") {
        const neu = v.auswahl(daten.status, STOERUNG_STATUS, "");
        if (!neu) throw ungueltig("Unbekannter Status.");
        if (neu === s.status) throw konflikt("Die Störung hat diesen Status bereits.");
        s.status = neu;
        if (neu === "behoben") {
          s.behobenAm = t;
          if (!s.quittiertAm) {
            s.quittiertAm = t;
            s.quittiertVon = n.id;
          }
          stoerungMelden(db, s, "behoben");
        } else s.behobenAm = null;
        s.verlauf.push({ am: t, text: `Status: ${STOERUNG_STATUS[neu].label} (${wer})${daten.text ? ` – ${v.text(daten.text, 200)}` : ""}` });
      } else if (aktion === "zuweisen") {
        const zid = v.kennung(daten.zustaendigId);
        const z = zid ? nutzerById(db, zid) : null;
        if (zid && !(z && z.aktiv && z.rollen.includes("admin") && darfLesen(z, "anlagen"))) throw ungueltig("Zuständig kann nur ein Backoffice-Konto mit Zugriff auf Anlagen sein.");
        s.zustaendigId = z?.id || null;
        s.verlauf.push({ am: t, text: z ? `Zugewiesen: ${nameVon(db, z.id)}` : "Zuweisung entfernt" });
        if (z && z.id !== n.id) benachrichtigen(db, z, { art: "stoerung", titel: `Störung zugewiesen: ${a.name}`, text: s.titel, link: `/portal/anlagen/${a.id}?tab=stoerungen`, objektArt: "anlage", objektId: a.id }, { mail: false });
      } else if (aktion === "schwere") {
        const neu = v.auswahl(daten.schwere, STOERUNG_SCHWERE, "");
        if (!neu) throw ungueltig("Unbekannte Schwere.");
        s.schwere = neu;
        s.verlauf.push({ am: t, text: `Schwere: ${STOERUNG_SCHWERE[neu].label} (${wer})` });
      } else throw ungueltig("Unbekannte Aktion.");
      protokoll(db, n, `stoerung_${aktion}`, "anlage", a.id, `Störung ${s.id}: ${aktion}`);
    }
    return stoerungAusgabe(db, n, s, zg);
  });
}

/** Störungs-Leitstand (Backoffice): offene Störungen nach Priorität + Kennzahlen */
export async function anlagenLeitstand(n) {
  leseNoetig(n);
  const liste = await stoerungen(n, { status: "offen", limit: 500 });
  const db = await lesen();
  const zaehler = {
    offen: liste.filter((s) => s.status === "offen").length,
    inArbeit: liste.filter((s) => s.status === "in_arbeit").length,
    unquittiert: liste.filter((s) => !s.quittiert).length,
    kritisch: liste.filter((s) => ["hoch", "kritisch"].includes(s.schwere)).length,
    anlagen: db.anlagen.anlagen.length,
    geraeteWartend: db.anlagen.zugaenge.filter((z) => !z.verbunden && !z.gesperrt).length,
    wartungenFaellig: db.anlagen.wartungen.filter((w) => w.status === "geplant" && w.datum <= new Date(Date.now() + 14 * 86400e3).toISOString().slice(0, 10)).length,
  };
  return { stoerungen: liste, zaehler };
}
