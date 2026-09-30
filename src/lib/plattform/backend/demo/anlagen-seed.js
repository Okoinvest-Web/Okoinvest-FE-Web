// src/lib/plattform/backend/demo/anlagen-seed.js
//
// Demo-Daten „Anlagen & Monitoring“ – ALLES FIKTIV (Namen mit „(Demo)“, Adressen unter example.com, neutrale
// Hersteller). Wird beim ersten Zugriff auf db.anlagen einmalig ergänzt (backend/demo/anlagen.js → bereit());
// die übrige Demo-Datenbank bleibt unverändert, bestehende Objekte werden nicht umgehängt.
//
//  - Organisation „Muster Logistik GmbH (fiktiv)“, Inhaber unternehmen@example.com – sechs Anlagen
//    (Gewerbedach mit Speicher, Carport mit Wechselrichter-Teilausfall, Freifläche mit Direktleitung,
//     Agri-PV mit Minderleistung, Batteriespeicher, Gewerbedach offline)
//  - Organisation „Beispiel Handels AG (fiktiv)“ ohne Portal-Mitglieder – eine Anlage (nur Backoffice sieht sie)
//  - Backoffice-Konto bo-betrieb@example.com mit Unterrolle „Betrieb“ (Passwort wie alle Demo-Konten)

import { jetzt, neueId, vorTagen } from "./hilfen";
import { mqttBenutzer, mqttTopicBasis, regionFuer } from "../../anlagen";
import { passwortHash } from "../../server/passwort";
import { randomBytes } from "node:crypto";

const MAIL_AUS = { status: false, nachricht: false, nda: false, suchprofil: false, anfrage: false, aufgabe: false, stoerung: false };
const vorStunden = (h) => new Date(Date.now() - h * 3600e3).toISOString();
const datum = (iso) => String(iso).slice(0, 10);
const inTagen = (t) => new Date(Date.now() + t * 86400e3).toISOString().slice(0, 10);

const ANLAGEN = [
  {
    key: "dach", name: "Gewerbedach Logistikzentrum Augsburg (Demo)", typ: "dach", land: "DE", bundesland: "Bayern", ort: "Raum Augsburg",
    kwp: 750, speicherKwh: 500, speicherKw: 250, lastprofil: "gewerbe", lastJahrKwh: 1200000, wechselrichterAnzahl: 6, inbetriebnahme: "2023-05-15",
    beschreibung: "Ost/West-Aufständerung auf zwei Hallendächern, Speicher im Technikraum. Contracting mit Lieferung des PV-Stroms an den Standort.",
    vertrag: { strompreisCt: 12.4, grundgebuehrMonat: 390, laufzeitJahre: 20 },
  },
  {
    key: "carport", name: "Solarcarport Mitarbeiterparkplatz (Demo)", typ: "carport", land: "DE", bundesland: "Bayern", ort: "Raum Augsburg",
    kwp: 320, speicherKwh: 0, speicherKw: 0, lastprofil: "gewerbe", lastJahrKwh: 450000, wechselrichterAnzahl: 3, inbetriebnahme: "2024-04-02",
    beschreibung: "Carport mit 180 Stellplätzen, Ladepunkte für Dienstwagen. Ein Wechselrichter meldet derzeit einen Isolationsfehler.",
    simulation: { szenario: "wr_teilausfall", stunden: 5 },
    vertrag: { strompreisCt: 13.9, grundgebuehrMonat: 180, laufzeitJahre: 20 },
  },
  {
    key: "freiflaeche", name: "Freifläche mit Direktleitung Werk Nord (Demo)", typ: "freiflaeche", land: "DE", bundesland: "Niedersachsen", ort: "Raum Hannover",
    kwp: 4200, speicherKwh: 0, speicherKw: 0, lastprofil: "industrie", lastJahrKwh: 6500000, wechselrichterAnzahl: 20, inbetriebnahme: "2022-08-01",
    beschreibung: "Freiflächenanlage neben dem Werk, Direktleitung zur Übergabestation des Werks, Überschuss wird eingespeist.",
    vertrag: { strompreisCt: 9.8, grundgebuehrMonat: 900, laufzeitJahre: 25 },
  },
  {
    key: "agri", name: "Agri-PV Obstplantage Bodensee (Demo)", typ: "agri", land: "DE", bundesland: "Baden-Württemberg", ort: "Bodenseekreis",
    kwp: 1450, speicherKwh: 800, speicherKw: 400, lastprofil: "landwirtschaft", lastJahrKwh: 600000, wechselrichterAnzahl: 8, inbetriebnahme: "2025-06-20",
    beschreibung: "Hoch aufgeständerte Agri-PV über Apfelkulturen (Hagelschutz), Kühlhaus und Sortieranlage als Verbraucher.",
    simulation: { szenario: "minderleistung", stunden: 52 },
    vertrag: { strompreisCt: 11.5, grundgebuehrMonat: 450, laufzeitJahre: 20 },
  },
  {
    key: "speicher", name: "Batteriespeicher Werk Süd (Demo)", typ: "speicher", land: "AT", bundesland: "Oberösterreich", ort: "Raum Wels",
    kwp: 0, speicherKwh: 2000, speicherKw: 1000, lastprofil: "industrie", lastJahrKwh: 6000000, wechselrichterAnzahl: 2, inbetriebnahme: "2025-03-01",
    beschreibung: "Lastspitzenkappung: nachts laden, Spitzen über der Leistungsgrenze abfangen – senkt den Leistungspreis.",
    vertrag: { strompreisCt: 0, grundgebuehrMonat: 2400, laufzeitJahre: 15 },
  },
  {
    key: "offline", name: "Gewerbedach Kühlhaus Linz (Demo)", typ: "dach", land: "AT", bundesland: "Oberösterreich", ort: "Raum Linz",
    kwp: 980, speicherKwh: 0, speicherKw: 0, lastprofil: "gewerbe", lastJahrKwh: 1600000, wechselrichterAnzahl: 8, inbetriebnahme: "2024-09-10",
    beschreibung: "Dachanlage auf dem Kühlhaus. Seit wenigen Stunden keine Messwerte – vermutlich Mobilfunk-Router des Datenloggers.",
    simulation: { szenario: "offline", stunden: 3 },
    vertrag: { strompreisCt: 12.9, grundgebuehrMonat: 420, laufzeitJahre: 20 },
  },
  {
    key: "fremd", name: "Dach Lebensmittelmarkt Thurgau (Demo)", typ: "dach", land: "CH", bundesland: "Thurgau", ort: "Raum Frauenfeld",
    kwp: 210, speicherKwh: 0, speicherKw: 0, lastprofil: "gewerbe", lastJahrKwh: 320000, wechselrichterAnzahl: 2, inbetriebnahme: "2024-03-18",
    beschreibung: "Dachanlage eines anderen Contracting-Kunden (nur für das Backoffice sichtbar).",
    fremd: true,
    vertrag: { strompreisCt: 14.5, grundgebuehrMonat: 150, laufzeitJahre: 20 },
  },
];

async function betriebKonto(db) {
  const admin = db.nutzer.find((u) => u.email === "admin@example.com");
  let u = db.nutzer.find((x) => x.email === "bo-betrieb@example.com");
  if (u || !admin) return u || null;
  u = {
    id: neueId("U"),
    email: "bo-betrieb@example.com",
    vorname: "Bernd",
    nachname: "Betrieb (Demo)",
    firma: "ÖkoInvest (Demo-Konto)",
    telefon: "",
    rollen: ["admin"],
    backofficeRollen: ["betrieb"],
    passwortHash: admin.passwortHash,
    sitzungVersion: 0,
    aktiv: true,
    emailBestaetigt: true,
    erstelltAm: vorTagen(40),
    letzterLogin: null,
    suchprofil: null,
    mailEinstellungen: MAIL_AUS,
    demo: true,
  };
  db.nutzer.push(u);
  return u;
}

/** Ergänzt db.anlagen (leer angelegt vom Aufrufer) um die Demo-Daten */
export async function anlagenSeed(db, { melden } = {}) {
  const A = db.anlagen;
  const t = jetzt();
  const kunde = db.nutzer.find((u) => u.email === "unternehmen@example.com");
  const betrieb = await betriebKonto(db);
  db.organisationen ||= [];
  db.mitgliedschaften ||= [];

  let orgKunde = db.organisationen.find((o) => o.name === "Muster Logistik GmbH (fiktiv)");
  if (!orgKunde && kunde) {
    orgKunde = { id: neueId("O"), name: "Muster Logistik GmbH (fiktiv)", art: "betrieb", suchprofil: null, erstelltVon: kunde.id, erstelltAm: t, geaendertAm: t, demo: true };
    db.organisationen.push(orgKunde);
    db.mitgliedschaften.push({ id: neueId("MG"), organisationId: orgKunde.id, nutzerId: kunde.id, rolle: "inhaber", seit: t, eingeladenVon: null });
  }
  let orgFremd = db.organisationen.find((o) => o.name === "Beispiel Handels AG (fiktiv)");
  if (!orgFremd) {
    orgFremd = { id: neueId("O"), name: "Beispiel Handels AG (fiktiv)", art: "betrieb", suchprofil: null, erstelltVon: null, erstelltAm: t, geaendertAm: t, demo: true };
    db.organisationen.push(orgFremd);
  }

  const ids = {};
  let wrNr = 1;
  for (const d of ANLAGEN) {
    const id = neueId("AL");
    ids[d.key] = id;
    const sim = d.simulation ? { szenario: d.simulation.szenario, seit: vorStunden(d.simulation.stunden) } : null;
    const a = {
      id, name: d.name, typ: d.typ, status: "betrieb", land: d.land, bundesland: d.bundesland, ort: d.ort, regionId: regionFuer(d.land, d.bundesland),
      kwp: d.kwp, speicherKwh: d.speicherKwh, speicherKw: d.speicherKw, lastprofil: d.lastprofil, lastJahrKwh: d.lastJahrKwh,
      wechselrichterAnzahl: d.wechselrichterAnzahl, inbetriebnahme: d.inbetriebnahme, beschreibung: d.beschreibung,
      kundeId: d.fremd ? null : kunde?.id || null, organisationId: d.fremd ? orgFremd.id : orgKunde?.id || null,
      simulation: sim, erstelltAm: vorTagen(400), geaendertAm: t, demo: true,
    };
    A.anlagen.push(a);

    // Vertrag
    A.vertraege.push({
      id: neueId("CV"), anlageId: id, nummer: `CV-DEMO-${String(A.anlagen.length).padStart(3, "0")}`, beginn: d.inbetriebnahme, laufzeitJahre: d.vertrag.laufzeitJahre,
      strompreisCt: d.vertrag.strompreisCt, grundgebuehrMonat: d.vertrag.grundgebuehrMonat, indexierungPct: 1.5, kuendigungsfristMonate: 6, status: "aktiv",
      bemerkung: d.typ === "speicher" ? "Speicher-Contracting: feste Monatsrate, kein Arbeitspreis." : "Arbeitspreis für den vor Ort genutzten PV-Strom, Überschuss vermarktet ÖkoInvest.",
      erstelltAm: t, geaendertAm: t,
    });

    // Komponenten
    const K = (art, daten) => A.komponenten.push({ id: neueId("AK"), anlageId: id, art, anzahl: 1, hersteller: "Beispielhersteller (Demo)", modell: "", seriennummer: "", leistungKw: null, kapazitaetKwh: null, inbetriebnahme: d.inbetriebnahme, garantieBis: "", bemerkung: "", ...daten });
    if (d.kwp) {
      const leistung = Math.round((d.kwp / d.wechselrichterAnzahl) * 0.95);
      for (let i = 1; i <= Math.min(d.wechselrichterAnzahl, 4); i++) {
        K("wechselrichter", { modell: `String-Wechselrichter ${leistung} kW`, seriennummer: `DEMO-WR-${String(wrNr++).padStart(5, "0")}`, leistungKw: leistung, garantieBis: `${Number(d.inbetriebnahme.slice(0, 4)) + 10}${d.inbetriebnahme.slice(4)}`, bemerkung: i === 1 && d.key === "carport" ? "Isolationsfehler gemeldet – Techniker beauftragt." : "" });
      }
      if (d.wechselrichterAnzahl > 4) K("wechselrichter", { modell: `String-Wechselrichter ${leistung} kW`, anzahl: d.wechselrichterAnzahl - 4, seriennummer: "siehe Wartungsprotokoll", leistungKw: leistung });
      K("modul", { modell: d.typ === "agri" ? "Glas-Glas bifazial, semitransparent" : "Glas-Glas 440 Wp", anzahl: Math.round((d.kwp * 1000) / 440), leistungKw: d.kwp });
    }
    if (d.speicherKwh) K("speicher", { modell: `Lithium-Eisenphosphat ${d.speicherKwh} kWh`, seriennummer: `DEMO-BAT-${String(A.anlagen.length).padStart(4, "0")}`, leistungKw: d.speicherKw, kapazitaetKwh: d.speicherKwh });
    K("datenlogger", { modell: "Datenlogger mit MQTT/TLS", seriennummer: `DEMO-LOG-${String(A.anlagen.length).padStart(4, "0")}`, bemerkung: "Sendet alle 10 s an den ÖkoInvest-Broker." });

    // Messpunkte: NVP-Zweirichtungszähler (geeicht, abrechnungsrelevant), Erzeugungszähler (geeicht), Monitoring
    const nr = String(A.anlagen.length).padStart(4, "0");
    A.messpunkte.push({ id: neueId("MP"), anlageId: id, bezeichnung: "Netzverknüpfungspunkt", zaehlernummer: `1DEMO00${nr}01`, art: "zweirichtung", messstelle: "geeicht", abrechnungsrelevant: true, msb: "Messstellenbetreiber (Demo)", smgw: true, eichgueltigBis: "2031-12-31", bemerkung: "" });
    if (d.kwp) A.messpunkte.push({ id: neueId("MP"), anlageId: id, bezeichnung: "PV-Erzeugung", zaehlernummer: `1DEMO00${nr}02`, art: "erzeugung", messstelle: "geeicht", abrechnungsrelevant: true, msb: "Messstellenbetreiber (Demo)", smgw: true, eichgueltigBis: "2031-12-31", bemerkung: "Grundlage der Contracting-Abrechnung (Erzeugung − Einspeisung)." });
    A.messpunkte.push({ id: neueId("MP"), anlageId: id, bezeichnung: "Monitoring Datenlogger", zaehlernummer: `MON-${nr}`, art: d.kwp ? "erzeugung" : "speicher", messstelle: "monitoring", abrechnungsrelevant: false, msb: "", smgw: false, eichgueltigBis: "", bemerkung: "MQTT-Werte, nur Überwachung." });

    // Wartungen
    A.wartungen.push({ id: neueId("WA"), anlageId: id, art: "inspektion", datum: datum(vorTagen(120)), status: "erledigt", dienstleister: "Service-Partner (Demo)", bericht: "Sichtprüfung, Drehmomente Stichprobe, keine Mängel.", naechsteFaelligkeit: inTagen(245), kostenEur: 680 });
    if (d.kwp) A.wartungen.push({ id: neueId("WA"), anlageId: id, art: "thermografie", datum: datum(vorTagen(60)), status: "erledigt", dienstleister: "Drohnen-Service (Demo)", bericht: d.key === "agri" ? "Auffällige Verschmutzung (Pollen, Vogelkot) in Reihe 3–7." : "2 Module mit Hotspot getauscht.", naechsteFaelligkeit: "", kostenEur: 950 });
    A.wartungen.push({ id: neueId("WA"), anlageId: id, art: d.key === "agri" ? "reinigung" : "pruefung", datum: inTagen(d.key === "agri" ? 3 : 40), status: "geplant", dienstleister: "Service-Partner (Demo)", bericht: "", naechsteFaelligkeit: "", kostenEur: null });

    // Gerätezugang (Passwort nie gespeichert – nur scrypt-Hash eines zufälligen Wertes)
    const gid = neueId("GZ");
    A.zugaenge.push({
      id: gid, anlageId: id, bezeichnung: "Datenlogger", benutzer: mqttBenutzer(id, gid), topic: `${mqttTopicBasis(id, gid)}/#`,
      passwortHash: await passwortHash(randomBytes(24).toString("base64url")), gesperrt: false, erstelltAm: vorTagen(300), erstelltVon: betrieb?.id || null,
      letzteVerbindung: sim?.szenario === "offline" ? sim.seit : vorStunden(0.2), letzteNachricht: sim?.szenario === "offline" ? sim.seit : t, verbunden: true,
    });
  }

  // Störungen (fiktiv)
  const S = (key, daten, bis = null) => {
    const s = {
      id: neueId("ST"), anlageId: ids[key], geraetId: null, regel: "manuell", schwere: "mittel", titel: "", text: "", status: "offen",
      erkanntAm: t, zuletztAm: t, anzahl: 1, quittiertAm: null, quittiertVon: null, zustaendigId: null, behobenAm: null, kommentare: [], verlauf: [], schluessel: null, ...daten,
    };
    s.verlauf = s.verlauf.length ? s.verlauf : [{ am: s.erkanntAm, text: "Störung erkannt", von: null }];
    A.stoerungen.push(s);
    return s;
  };
  const s1 = S("carport", { regel: "fehlercode", schwere: "hoch", titel: "Fehlercode am Wechselrichter", text: "E-1107 Isolationswiderstand zu gering – ein Wechselrichter speist nicht ein.", erkanntAm: vorStunden(5), zuletztAm: t });
  S("agri", {
    regel: "minderleistung", schwere: "mittel", titel: "Leistung deutlich unter Erwartung", text: "Ertrag seit zwei Tagen rund 45 % unter der Erwartung bei Sonne. Thermografie zeigte Verschmutzung.",
    erkanntAm: vorStunden(50), zuletztAm: t, status: "in_arbeit", quittiertAm: vorStunden(46), quittiertVon: betrieb?.id || null, zustaendigId: betrieb?.id || null,
    kommentare: [
      { id: neueId("KO"), von: betrieb?.id || null, vonName: "Bernd Betrieb (Demo)", backoffice: true, am: vorStunden(46), text: "Reinigung der Module ist beauftragt, Termin in drei Tagen.", intern: false },
      { id: neueId("KO"), von: betrieb?.id || null, vonName: "Bernd Betrieb (Demo)", backoffice: true, am: vorStunden(45), text: "Dienstleister bestätigt, Hubsteiger nötig (Reihenhöhe 4,5 m).", intern: true },
    ],
    verlauf: [{ am: vorStunden(50), text: "Störung erkannt" }, { am: vorStunden(46), text: "Quittiert und zugewiesen: Bernd Betrieb (Demo)" }],
  });
  const s3 = S("offline", { regel: "offline", schwere: "hoch", titel: "Keine Daten (offline)", text: "Seit über 15 Minuten keine Nachricht vom Datenlogger.", erkanntAm: vorStunden(2.7), zuletztAm: t });
  S("dach", { regel: "offline", schwere: "niedrig", titel: "Kommunikation Datenlogger unterbrochen", text: "35 Minuten ohne Daten nach Firmware-Update des Routers.", erkanntAm: vorTagen(26), status: "behoben", behobenAm: vorTagen(26, -1), quittiertAm: vorTagen(26, -0.5), quittiertVon: betrieb?.id || null, verlauf: [{ am: vorTagen(26), text: "Störung erkannt" }, { am: vorTagen(26, -1), text: "Behoben: Daten laufen wieder" }] });

  if (melden) for (const s of [s1, s3]) melden(db, s);
  return ids;
}
