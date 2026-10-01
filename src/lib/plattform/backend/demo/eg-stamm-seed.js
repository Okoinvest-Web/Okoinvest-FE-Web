// src/lib/plattform/backend/demo/eg-stamm-seed.js
//
// Demo-Grundgerüst des Moduls Energiegemeinschaften (WP1) – alles FIKTIV, Namen mit „(Demo)“, Adressen erfunden,
// E-Mails unter example.com. Zählpunktnummern im AT-Format (AT + Netzbetreibernummer + PLZ + 20 Zeichen), Gemeinschafts-
// und Marktpartner-IDs im Format laut HA II, aber frei erfunden (keine echten Kennungen).
//
//  1. „Sonnenland Innviertel (Demo)“ – EEG lokal (Zonelevel 3), Verein, Netz OÖ, aktiv, 25 Mitglieder, ~30 Zählpunkte,
//     ÖkoInvest als Organisator; Organe mit Portalkonten (Obmann, Kassier, Rechnungsprüfer); § 69-Schwelle überschritten.
//  2. „Bürgerenergie Alpenvorland (Demo)“ – BEG im Aufbau (Zonelevel 7, Netz OÖ + Salzburg Netz), Gründungsberatung.
//  3. „GEA Wohnhausanlage Linzer Straße (Demo)“ – GEA im Mehrparteienhaus (Zonelevel 1), Wiener Netze, 8 Wohnungen.
//
// Andere Pakete ergänzen eigene Demo-Daten in EIGENEN Seed-Dateien (z. B. demo/eg-eda-seed.js) und lesen diese Kennungen
// über die Felder `seedSchluessel` (stabil, z. B. "sonnenland") – nie über zufällige IDs.

import { NETZBETREIBER } from "../../eg/netzbetreiber.js";
import { NETZENTGELT_REGELN } from "../../eg/netzentgelt.js";

export const EG_SEED_VERSION = 2; // 2: Bestandsteilnahmen Sonnenland mit 13 Monaten Historie (WP3)
export const DEMO_KONTEN_EG = [
  { email: "eg-obmann@example.com", vorname: "Otto", nachname: "Obmann (Demo)" },
  { email: "eg-kassier@example.com", vorname: "Karin", nachname: "Kassier (Demo)" },
  { email: "eg-pruefer@example.com", vorname: "Paul", nachname: "Prüfer (Demo)" },
];

const ZEICHEN = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
function id(praefix, n) {
  // stabile, aber nicht aufzählbare Demo-Kennungen (Präfix-26-XXXXXX)
  let x = (n * 2654435761) >>> 0;
  let s = "";
  for (let i = 0; i < 6; i++) { s += ZEICHEN[x % 32]; x = Math.floor(x / 32) + (i + 7) * 131; }
  return `${praefix}-26-${s}`;
}
const zp = (nb, plz, nr) => `AT${nb}${plz}0000000000000D${String(nr).padStart(6, "0")}`;

/**
 * Seed-Daten erzeugen. `konten`: { mitglied, landwirt, kommune, obmann, kassier, pruefer } → Konto-IDs (oder null).
 * `tag(t)`: Datum relativ zu heute (t Tage in der Vergangenheit), `iso(t)` Zeitpunkt.
 */
export function egSeed({ konten = {}, tag, iso }) {
  let z = 1;
  const nid = (p) => id(p, z++);
  const meta = (t = 400) => ({ erstelltAm: iso(t), erstelltVon: null, geaendertAm: iso(Math.max(1, t - 30)), geaendertVon: null, demo: true });
  const e = { v: EG_SEED_VERSION, gemeinschaften: [], organe: [], mitglieder: [], zaehlpunkte: [], teilnahmen: [], anlagen: [], tarife: [], verteilschluessel: [], netzbetreiber: structuredClone(NETZBETREIBER), netzentgeltRegeln: structuredClone(NETZENTGELT_REGELN), migration: null, importe: [] };

  // ------------------------------------------------------------ 1) EEG Sonnenland Innviertel
  const g1 = {
    id: nid("EGG"), seedSchluessel: "sonnenland", name: "Sonnenland Innviertel (Demo)", kurzname: "Sonnenland", modell: "eeg", zonelevel: 3, nahebereichRef: "TS-4910-0417 (Demo)",
    rechtsform: "verein", zvrZahl: "999000417", firmenbuchnummer: "", sitzAdresse: { strasse: "Hauptplatz 1 (Demo)", plz: "4910", ort: "Ried im Innkreis" }, email: "sonnenland@example.com", telefon: "",
    uid: "", steuernummer: "", finanzamt: "Finanzamt Österreich (Demo)", ustStatus: "kleinunternehmer", ustOptionSeit: "", iban: "AT611904300234573201", bic: "", creditorId: "AT98ZZZ00000000417",
    netzbetreiber: ["ENB-OOE"], marktpartnerId: "RC109417", gemeinschaftsId: "AT00300004910RC109417000000000001", verteilmodell: "dynamisch", vorgaengerId: null, nachfolgerId: null,
    edaAnbindung: "anwenderportal", organisatorOrgId: null, organisatorAngezeigtAm: tag(300), dienstleistung: { aktiv: true, paket: "rundum", seit: tag(320), avvAm: tag(320) },
    abrechnungsrhythmus: "monat", statutenVersion: "Statuten 2024 (Demo)", betreibervertragDatum: tag(330), beschreibung: "Fiktive lokale EEG an der Trafostation Ried-Nord für die Vorführung. Alle Daten erfunden.", status: "aktiv", ...meta(420),
  };
  e.gemeinschaften.push(g1);
  const P1 = [
    // [vorname, nachname/firma, art, konto, ZP: [richtung, kWp?, tf, status]]
    ["Mia", "Mitglied (Demo)", "privat", konten.mitglied, [["verbrauch", null, 100, "aktiv"]]],
    ["Lukas", "Landwirt (Demo)", "landwirt", konten.landwirt, [["verbrauch", null, 100, "aktiv"], ["erzeugung", 28, 60, "aktiv"]], { steuerstatusErzeuger: "pauschalierter_landwirt" }],
    ["", "Gemeinde Sonnendorf (Demo)", "gemeinde", konten.kommune, [["verbrauch", null, 100, "aktiv", "Gemeindeamt"], ["verbrauch", null, 100, "aktiv", "Volksschule"], ["verbrauch", null, 100, "aktiv", "Kläranlage"], ["erzeugung", 45, 100, "aktiv", "PV Volksschule"]], { steuerstatusErzeuger: "gemeinde_bga", uid: "ATU99999917" }],
    ["Otto", "Obmann (Demo)", "privat", konten.obmann, [["verbrauch", null, 100, "aktiv"], ["erzeugung", 9.9, 100, "aktiv"]]],
    ["Karin", "Kassier (Demo)", "privat", konten.kassier, [["verbrauch", null, 100, "aktiv"]]],
    ["Paul", "Prüfer (Demo)", "privat", konten.pruefer, [["verbrauch", null, 100, "aktiv"]]],
    ["", "Bäckerei Morgenrot (Demo)", "kmu", null, [["verbrauch", null, 100, "aktiv"]]],
    ["", "Gasthof Zur Linde (Demo)", "kmu", null, [["verbrauch", null, 100, "aktiv"], ["erzeugung", 19.5, 100, "aktiv"]], { steuerstatusErzeuger: "regelbesteuert", uid: "ATU99999918" }],
    ["Anna", "Ahorn (Demo)", "privat", null, [["verbrauch", null, 100, "aktiv"]]],
    ["Bernd", "Birke (Demo)", "privat", null, [["verbrauch", null, 50, "aktiv"]], { schutzbeduerftig: true }],
    ["Clara", "Celler (Demo)", "privat", null, [["verbrauch", null, 100, "aktiv"], ["erzeugung", 8.2, 100, "aktiv"]]],
    ["David", "Dachs (Demo)", "privat", null, [["verbrauch", null, 100, "aktiv"]]],
    ["Eva", "Esche (Demo)", "privat", null, [["verbrauch", null, 100, "zustimmung_offen"]], { status: "aufgenommen" }],
    ["Franz", "Fichte (Demo)", "privat", null, [["verbrauch", null, 100, "aktiv"], ["erzeugung", 10, 100, "aktiv"]]],
    ["Gerda", "Gabler (Demo)", "privat", null, [["verbrauch", null, 100, "aktiv"]]],
    ["Hannes", "Holler (Demo)", "privat", null, [["verbrauch", null, 100, "wartet_technik"]], { status: "aufgenommen" }],
    ["Ida", "Ilg (Demo)", "privat", null, [["verbrauch", null, 100, "aktiv"]]],
    ["Josef", "Jungwirth (Demo)", "landwirt", null, [["verbrauch", null, 100, "aktiv"], ["erzeugung", 6.5, 100, "aktiv"]], { steuerstatusErzeuger: "pauschalierter_landwirt" }],
    ["Katharina", "Kiefer (Demo)", "privat", null, [["verbrauch", null, 100, "aktiv"]]],
    ["Leopold", "Linde (Demo)", "privat", null, [["verbrauch", null, 100, "beendet"]], { status: "ausgeschieden" }],
    ["Maria", "Moser (Demo)", "privat", null, [["verbrauch", null, 100, "aktiv"]]],
    ["Norbert", "Nussbaum (Demo)", "privat", null, [["verbrauch", null, 100, "entwurf"]], { status: "antrag" }],
    ["", "Tischlerei Holzwurm (Demo)", "kmu", null, [["verbrauch", null, 100, "aktiv"]]],
    ["Olivia", "Ortner (Demo)", "privat", null, [["verbrauch", null, 100, "aktiv"]]],
    ["Peter", "Pichler (Demo)", "privat", null, [["verbrauch", null, 100, "zustimmung_offen"]], { status: "aufgenommen" }],
  ];
  let zpNr = 1;
  P1.forEach(([vorname, nachname, art, kontoId, zps, extra = {}], i) => {
    const firma = vorname ? "" : nachname;
    const m = {
      id: nid("EMG"), gemeinschaftId: g1.id, kontoId: kontoId || null, mitgliedsnummer: i + 1, art,
      person: { vorname, nachname: vorname ? nachname : "", firma, strasse: `Sonnenweg ${i + 1} (Demo)`, plz: i % 3 ? "4910" : "4911", ort: i % 3 ? "Ried im Innkreis" : "Tumeltsham", email: kontoId ? "" : `eg-mitglied${i + 1}@example.com`, telefon: "" },
      unternehmensgroesse: { mitarbeiter: art === "kmu" ? 6 + i : null, umsatzMioEur: null, bilanzMioEur: null, nachweis: "" },
      steuerstatusErzeuger: extra.steuerstatusErzeuger || "kleinunternehmer", uid: extra.uid || "", schutzbeduerftig: !!extra.schutzbeduerftig,
      iban: "AT611904300234573201", sepaMandat: { referenz: `SONNENLAND-${String(i + 1).padStart(4, "0")}`, datum: tag(300 - i), status: "aktiv" },
      rechnungsweg: kontoId ? "portal" : "email", abrechnungsrhythmus: "", vertraege: [{ art: "beitritt", dokumentId: "", version: "2024-1", am: tag(300 - i) }],
      beitrittAm: tag(300 - i * 5), austrittZum: extra.status === "ausgeschieden" ? tag(20) : "", status: extra.status || "aktiv", ...meta(310 - i),
    };
    e.mitglieder.push(m);
    for (const [richtung, kwp, tf, st, bez] of zps) {
      const nr = zpNr++;
      let anlageId = null;
      if (richtung === "erzeugung") {
        const a = { id: nid("EAN"), gemeinschaftId: g1.id, bezeichnung: bez || `PV ${m.person.firma || m.person.nachname}`, art: "pv", engpassleistungKw: kwp, kwp, ausrichtung: 0, neigung: 30, standort: { lat: 48.2, lon: 13.49, adresse: m.person.strasse }, eigentuemerMitgliedId: m.id, betreiber: m.person.firma || `${m.person.vorname} ${m.person.nachname}`, betriebsfuehrung: "", nutzungsmodell: "ueberschuss", foerderung: kwp > 20 ? "investzuschuss" : "keine", inbetriebnahme: tag(700 + nr), hknRegistriert: kwp > 20, speicherKwh: null, speicherLadequelle: "", iotQuelle: "", haushalt: art === "privat", status: "aktiv", ...meta(400) };
        e.anlagen.push(a);
        anlageId = a.id;
      }
      const z1 = { id: nid("EZP"), zaehlpunktnummer: zp("003000", m.person.plz === "4911" ? "04911" : "04910", nr), netzbetreiberId: "ENB-OOE", nbNummer: "003000", plz: m.person.plz === "4911" ? "04911" : "04910", richtung, anlageId, inhaberKontoId: m.kontoId, inhaberName: m.person.firma || `${m.person.vorname} ${m.person.nachname}`, bezeichnung: bez || "", smartMeter: st === "wartet_technik" ? "nein" : "ja", qhAktiv: st !== "wartet_technik", nahebereichRef: g1.nahebereichRef, auskunftAm: tag(340), netzebene: 7, lieferant: "", energieabnehmer: richtung === "erzeugung" ? "OeMAG (Demo)" : "", ...meta(300) };
      e.zaehlpunkte.push(z1);
      const ab = st === "aktiv" || st === "beendet" ? tag(410 - nr) : "";
      e.teilnahmen.push({
        id: nid("ETN"), zaehlpunktId: z1.id, gemeinschaftId: g1.id, mitgliedId: m.id, teilnahmefaktor: tf, aufteilungsschluesselPct: null, consentId: st === "entwurf" ? "" : `CONSENT-DEMO-${String(nr).padStart(5, "0")}`,
        gueltigAb: ab, gueltigBis: st === "beendet" ? tag(20) : "", tfHistorie: ab ? [{ gueltigAb: ab, tf, prozessId: "" }] : [], status: st, beendetGrund: st === "beendet" ? "abmeldung" : "", responsecode: st === "wartet_technik" ? "175" : "", fristBis: st === "zustimmung_offen" ? tag(-24) : "",
        verlauf: [{ am: iso(300), von: "entwurf", nach: st, ereignis: "seed", prozessId: "", text: "Demo-Bestand", vonKonto: null }], ...meta(300),
      });
    }
  });
  // Organe (Funktionsperiode 2024–2028)
  const o = (funktion, kontoId, name, zeichnungsberechtigt = false) => e.organe.push({ id: nid("EGO"), gemeinschaftId: g1.id, kontoId: kontoId || null, name, email: "", funktion, von: tag(400), bis: "", gewaehltIn: "", zeichnungsberechtigt, status: "aktiv", ...meta(400) });
  o("obmann", konten.obmann, "Otto Obmann (Demo)", true);
  o("obmann_stv", null, "Sabine Stellvertretung (Demo)", true);
  o("kassier", konten.kassier, "Karin Kassier (Demo)", true);
  o("schriftfuehrer", null, "Simon Schriftführer (Demo)");
  o("rechnungspruefer", konten.pruefer, "Paul Prüfer (Demo)");
  o("rechnungspruefer", null, "Renate Revision (Demo)");
  // Tarife: alter (abgelöst) und aktueller mit Mittagsstrom
  e.tarife.push({ id: nid("ETF"), gemeinschaftId: g1.id, bezeichnung: "Preisblatt 2025 (Demo)", gueltigAb: tag(420), gueltigBis: tag(91), beschluss: { art: "gv", datum: tag(425), referenz: "GV 2025 (Demo)" }, bezugspreisCt: 11, einspeisepreisCt: 8, zeitfenster: [], grundgebuehrMonat: 1.5, zaehlpunktgebuehrMonat: 0, einmalgebuehrBeitritt: 20, mitgliedsbeitragJahr: 12, sozialtarif: { bezugspreisCt: null, kontingentPct: null }, individuell: [], status: "abgeloest", ...meta(425) });
  e.tarife.push({ id: nid("ETF"), gemeinschaftId: g1.id, bezeichnung: "Preisblatt 2026 mit Mittagsstrom (Demo)", gueltigAb: tag(90), gueltigBis: "", beschluss: { art: "vorstand", datum: tag(100), referenz: "Vorstandsbeschluss 3/2026 (Demo)" }, bezugspreisCt: 11.5, einspeisepreisCt: 8.5, zeitfenster: [{ id: "Z1", label: "Mittagsstrom", tage: [], von: "11:00", bis: "15:00", monate: [4, 5, 6, 7, 8, 9], bezugspreisCt: 9.5, einspeisepreisCt: null }], grundgebuehrMonat: 1.5, zaehlpunktgebuehrMonat: 0, einmalgebuehrBeitritt: 20, mitgliedsbeitragJahr: 12, sozialtarif: { bezugspreisCt: 7.5, kontingentPct: 10 }, individuell: [], status: "aktiv", ...meta(100) });

  // ------------------------------------------------------------ 2) BEG im Aufbau
  const g2 = {
    id: nid("EGG"), seedSchluessel: "alpenvorland", name: "Bürgerenergie Alpenvorland (Demo)", kurzname: "Alpenvorland", modell: "beg", zonelevel: 7, nahebereichRef: "NONE",
    rechtsform: "verein", zvrZahl: "", firmenbuchnummer: "", sitzAdresse: { strasse: "Am Anger 3 (Demo)", plz: "5121", ort: "Ostermiething" }, email: "alpenvorland@example.com", telefon: "",
    uid: "", steuernummer: "", finanzamt: "", ustStatus: "kleinunternehmer", ustOptionSeit: "", iban: "", bic: "", creditorId: "",
    netzbetreiber: ["ENB-OOE", "ENB-SBG"], marktpartnerId: "", gemeinschaftsId: "", verteilmodell: "dynamisch", vorgaengerId: null, nachfolgerId: null,
    edaAnbindung: "email", organisatorOrgId: null, organisatorAngezeigtAm: "", dienstleistung: { aktiv: false, paket: "gruendung", seit: tag(40), avvAm: "" },
    abrechnungsrhythmus: "quartal", statutenVersion: "Entwurf Musterstatuten BEG (Demo)", betreibervertragDatum: "", beschreibung: "Fiktive BEG über zwei Netzgebiete (Innviertel und Flachgau), Gründung läuft. Netzgebietsübergreifend erst ab Phase 2 (04/2027).", status: "in_gruendung", ...meta(60),
  };
  e.gemeinschaften.push(g2);
  [["Gerhard", "Gründer (Demo)", "privat", "antrag"], ["", "Sägewerk Waldrand (Demo)", "kmu", "antrag"], ["Lukas", "Landwirt (Demo)", "landwirt", "interessent", konten.landwirt], ["Hilde", "Hofer (Demo)", "privat", "interessent"], ["", "Molkerei Talblick (Demo)", "grossunternehmen", "geprueft"]].forEach(([vorname, nachname, art, status, kontoId], i) => {
    e.mitglieder.push({ id: nid("EMG"), gemeinschaftId: g2.id, kontoId: kontoId || null, mitgliedsnummer: i + 1, art, person: { vorname, nachname: vorname ? nachname : "", firma: vorname ? "" : nachname, strasse: `Dorfstraße ${i + 2} (Demo)`, plz: i % 2 ? "5121" : "5110", ort: i % 2 ? "Ostermiething" : "Oberndorf bei Salzburg", email: kontoId ? "" : `eg-beg${i + 1}@example.com`, telefon: "" }, unternehmensgroesse: { mitarbeiter: art === "grossunternehmen" ? 320 : art === "kmu" ? 14 : null, umsatzMioEur: null, bilanzMioEur: null, nachweis: art === "grossunternehmen" ? "Selbstauskunft (Demo)" : "" }, steuerstatusErzeuger: "kleinunternehmer", uid: "", schutzbeduerftig: false, iban: "", sepaMandat: { referenz: "", datum: "", status: "" }, rechnungsweg: "email", abrechnungsrhythmus: "", vertraege: [], beitrittAm: "", austrittZum: "", status, ...meta(50 - i) });
  });
  // Landwirt bringt 40 % seiner Erzeugung in die BEG ein (Mehrfachteilnahme: 60 % Sonnenland + 40 % Alpenvorland = 100 %)
  const lwZp = e.zaehlpunkte.find((x) => x.richtung === "erzeugung" && e.mitglieder.find((m) => m.id === e.teilnahmen.find((t) => t.zaehlpunktId === x.id)?.mitgliedId)?.art === "landwirt");
  const lwMg = e.mitglieder.find((m) => m.gemeinschaftId === g2.id && m.art === "landwirt");
  if (lwZp && lwMg) e.teilnahmen.push({ id: nid("ETN"), zaehlpunktId: lwZp.id, gemeinschaftId: g2.id, mitgliedId: lwMg.id, teilnahmefaktor: 40, aufteilungsschluesselPct: null, consentId: "", gueltigAb: "", gueltigBis: "", tfHistorie: [], status: "entwurf", beendetGrund: "", responsecode: "", fristBis: "", verlauf: [{ am: iso(30), von: "entwurf", nach: "entwurf", ereignis: "seed", prozessId: "", text: "Wunsch: 40 % der Erzeugung in die BEG", vonKonto: null }], ...meta(30) });
  e.organe.push({ id: nid("EGO"), gemeinschaftId: g2.id, kontoId: null, name: "Gerhard Gründer (Demo)", email: "", funktion: "obmann", von: tag(20), bis: "", gewaehltIn: "", zeichnungsberechtigt: true, status: "aktiv", ...meta(20) });

  // ------------------------------------------------------------ 3) GEA im Mehrparteienhaus
  const g3 = {
    id: nid("EGG"), seedSchluessel: "linzerstrasse", name: "GEA Wohnhausanlage Linzer Straße (Demo)", kurzname: "GEA Linzer Straße", modell: "gea", zonelevel: 1, nahebereichRef: "Anschlussobjekt 1140-0815 (Demo)",
    rechtsform: "keine", zvrZahl: "", firmenbuchnummer: "", sitzAdresse: { strasse: "Linzer Straße 99 (Demo)", plz: "1140", ort: "Wien" }, email: "hausverwaltung@example.com", telefon: "",
    uid: "", steuernummer: "", finanzamt: "", ustStatus: "kleinunternehmer", ustOptionSeit: "", iban: "", bic: "", creditorId: "",
    netzbetreiber: ["ENB-WIEN"], marktpartnerId: "GC100733", gemeinschaftsId: "AT00100001140GC100733000000000001", verteilmodell: "statisch", vorgaengerId: null, nachfolgerId: null,
    edaAnbindung: "anwenderportal", organisatorOrgId: null, organisatorAngezeigtAm: tag(200), dienstleistung: { aktiv: true, paket: "begleitet", seit: tag(210), avvAm: tag(210) },
    abrechnungsrhythmus: "quartal", statutenVersion: "", betreibervertragDatum: tag(220), beschreibung: "Fiktive gemeinschaftliche Erzeugungsanlage am Dach eines Wohnhauses mit 8 Wohnungen und Allgemeinstrom (statischer Aufteilungsschlüssel, Bestand).", status: "aktiv", ...meta(230),
  };
  e.gemeinschaften.push(g3);
  const hv = { id: nid("EMG"), gemeinschaftId: g3.id, kontoId: null, mitgliedsnummer: 1, art: "verein", person: { vorname: "", nachname: "", firma: "Hausverwaltung Ringstraße (Demo)", strasse: "Linzer Straße 99 (Demo)", plz: "1140", ort: "Wien", email: "hausverwaltung@example.com", telefon: "" }, unternehmensgroesse: { mitarbeiter: 12, umsatzMioEur: null, bilanzMioEur: null, nachweis: "" }, steuerstatusErzeuger: "regelbesteuert", uid: "ATU99999933", schutzbeduerftig: false, iban: "", sepaMandat: { referenz: "", datum: "", status: "" }, rechnungsweg: "email", abrechnungsrhythmus: "", vertraege: [], beitrittAm: tag(220), austrittZum: "", status: "aktiv", ...meta(220) };
  e.mitglieder.push(hv);
  const pv3 = { id: nid("EAN"), gemeinschaftId: g3.id, bezeichnung: "PV Dach Linzer Straße 99 (Demo)", art: "pv", engpassleistungKw: 30, kwp: 30, ausrichtung: 10, neigung: 15, standort: { lat: 48.196, lon: 16.31, adresse: "Linzer Straße 99 (Demo), 1140 Wien" }, eigentuemerMitgliedId: hv.id, betreiber: "Hausverwaltung Ringstraße (Demo)", betriebsfuehrung: "ÖKOVOLT Betriebsführung (Demo)", nutzungsmodell: "ueberschuss", foerderung: "investzuschuss", inbetriebnahme: tag(240), hknRegistriert: true, speicherKwh: null, speicherLadequelle: "", iotQuelle: "", haushalt: false, status: "aktiv", ...meta(240) };
  e.anlagen.push(pv3);
  const zpGea = (nr, richtung, inhaber, anlageId = null) => ({ id: nid("EZP"), zaehlpunktnummer: zp("001000", "01140", 900 + nr), netzbetreiberId: "ENB-WIEN", nbNummer: "001000", plz: "01140", richtung, anlageId, inhaberKontoId: null, inhaberName: inhaber, bezeichnung: "", smartMeter: "ja", qhAktiv: true, nahebereichRef: g3.nahebereichRef, auskunftAm: tag(230), netzebene: 7, lieferant: "", energieabnehmer: richtung === "erzeugung" ? "Reststromabnahme (Demo)" : "", ...meta(220) });
  const zErz = zpGea(0, "erzeugung", "Hausverwaltung Ringstraße (Demo)", pv3.id);
  const zAllg = zpGea(9, "verbrauch", "Allgemeinstrom (Demo)");
  e.zaehlpunkte.push(zErz, zAllg);
  const tl = (z1, m, schluessel) => ({ id: nid("ETN"), zaehlpunktId: z1.id, gemeinschaftId: g3.id, mitgliedId: m.id, teilnahmefaktor: 100, aufteilungsschluesselPct: schluessel, consentId: `CONSENT-GEA-${z1.zaehlpunktnummer.slice(-4)}`, gueltigAb: tag(210), gueltigBis: "", tfHistorie: [{ gueltigAb: tag(210), tf: 100, prozessId: "" }], status: "aktiv", beendetGrund: "", responsecode: "", fristBis: "", verlauf: [{ am: iso(210), von: "entwurf", nach: "aktiv", ereignis: "seed", prozessId: "", text: "Demo-Bestand", vonKonto: null }], ...meta(210) });
  e.teilnahmen.push(tl(zErz, hv, null), tl(zAllg, hv, 16));
  const positionen = [{ teilnahmeId: e.teilnahmen[e.teilnahmen.length - 1].id, pct: 16 }];
  for (let w = 1; w <= 8; w++) {
    const m = { ...structuredClone(hv), id: nid("EMG"), mitgliedsnummer: w + 1, art: "privat", person: { vorname: ["Alma", "Boris", "Cem", "Dora", "Emil", "Fatma", "Gustav", "Hana"][w - 1], nachname: `Wohnung ${w} (Demo)`, firma: "", strasse: `Linzer Straße 99/${w} (Demo)`, plz: "1140", ort: "Wien", email: `eg-gea${w}@example.com`, telefon: "" }, unternehmensgroesse: { mitarbeiter: null, umsatzMioEur: null, bilanzMioEur: null, nachweis: "" }, steuerstatusErzeuger: "kleinunternehmer", uid: "", rechnungsweg: "email" };
    e.mitglieder.push(m);
    const z1 = zpGea(w, "verbrauch", `${m.person.vorname} ${m.person.nachname}`);
    e.zaehlpunkte.push(z1);
    const t = tl(z1, m, 10.5);
    e.teilnahmen.push(t);
    positionen.push({ teilnahmeId: t.id, pct: 10.5 });
  }
  e.verteilschluessel.push({ id: nid("EVS"), gemeinschaftId: g3.id, gueltigAb: tag(210), positionen, summePct: Math.round(positionen.reduce((s, p) => s + p.pct, 0) * 10) / 10, edaProzessId: "", status: "gueltig", ...meta(210) });
  return e;
}
