// src/lib/plattform/backend/demo/seed.js
//
// Beispieldaten für das Demo-Backend. ALLES FIKTIV und als Demo gekennzeichnet:
// Personen heißen „… (Demo)“, E-Mail-Adressen liegen unter example.com
// (für Dokumentation reservierte Domain), Projekte tragen `demo: true` und
// werden in der Oberfläche als Demo-Projekte markiert. Preise leiten sich aus
// den Spannen in src/lib/invest/markt.js ab (Mitte der Phasen-Spanne).

import { PACHT, PHASEN, PROVISION } from "@/lib/invest/markt";
import { passwortHash } from "../../server/passwort";
import { demoPdf } from "./pdf";
import { neueId, sha256, slugify, vorTagen } from "./hilfen";
import { uploadSchreiben } from "./speicher";

export const DEMO_PASSWORT = () => process.env.PLATTFORM_DEMO_PASSWORT || "Demo-2026!";

export const DEMO_KONTEN = [
  { schluessel: "admin", email: "admin@example.com", vorname: "Backoffice", nachname: "Demo", firma: "ÖkoInvest (Demo-Konto)", rollen: ["admin"] },
  { schluessel: "flaeche", email: "flaeche@example.com", vorname: "Erika", nachname: "Musterfrau (Demo)", firma: "", rollen: ["flaeche"] },
  { schluessel: "landwirt", email: "landwirt@example.com", vorname: "Josef", nachname: "Beispiel (Demo)", firma: "Demo-Hof Beispiel GbR", rollen: ["landwirt", "mitglied"] },
  { schluessel: "investor", email: "investor@example.com", vorname: "Clara", nachname: "Probe (Demo)", firma: "Demo Capital GmbH (fiktiv)", rollen: ["investor"] },
  { schluessel: "anbieter", email: "anbieter@example.com", vorname: "Paul", nachname: "Platzhalter (Demo)", firma: "Muster Projektentwicklung GmbH (fiktiv)", rollen: ["anbieter"] },
  { schluessel: "unternehmen", email: "unternehmen@example.com", vorname: "Uta", nachname: "Unternehmerin (Demo)", firma: "Beispiel Metallbau GmbH (fiktiv)", rollen: ["unternehmen"] },
  { schluessel: "mitglied", email: "mitglied@example.com", vorname: "Max", nachname: "Mitglied (Demo)", firma: "", rollen: ["mitglied"] },
];

const mitte = (phaseId) => {
  const p = PHASEN.find((x) => x.id === phaseId);
  return Math.round((p.preisProKwp.min + p.preisProKwp.max) / 2);
};

function verlauf(eintraege, adminId) {
  return eintraege.map(([status, tage, kommentar, von = "admin"]) => ({
    status,
    am: vorTagen(tage),
    vonId: von === "admin" ? adminId : null,
    vonRolle: von,
    kommentar: kommentar || "",
  }));
}

export async function seedErstellen() {
  const hash = await passwortHash(DEMO_PASSWORT());
  const n = {};
  const nutzer = DEMO_KONTEN.map((k, i) => {
    const u = {
      id: neueId("U"),
      email: k.email,
      vorname: k.vorname,
      nachname: k.nachname,
      firma: k.firma,
      telefon: "",
      rollen: k.rollen,
      passwortHash: hash,
      sitzungVersion: 0,
      aktiv: true,
      emailBestaetigt: true,
      erstelltAm: vorTagen(120 - i * 5),
      letzterLogin: null,
      suchprofil: null,
      demo: true,
    };
    n[k.schluessel] = u;
    return u;
  });
  const admin = n.admin.id;

  n.investor.suchprofil = {
    mwpMin: 5,
    mwpMax: 50,
    phasen: ["satzung", "rtb", "cod"],
    laender: ["DE", "AT"],
    typen: ["freiflaeche", "agri", "hybrid"],
    ticketMin: 500000,
    ticketMax: 15000000,
    benachrichtigen: true,
  };

  // ---------------------------------------------------------------- Projekte
  const P = (x) => ({
    id: neueId("P"),
    anbieterId: n.anbieter.id,
    mwhSpeicher: null,
    flaecheHa: null,
    preis: null,
    preisProKwp: null,
    highlights: [],
    vertraulich: {},
    provisionAkzeptiert: { am: vorTagen(60), ip: "", version: "2026-09", text: PROVISION.verkaeufer.text },
    provisionSatz: PROVISION.verkaeufer.min,
    ablehnGrund: "",
    aufrufe: 0,
    zustaendigId: admin,
    veroeffentlichtAm: null,
    erstelltAm: vorTagen(70),
    geaendertAm: vorTagen(10),
    demo: true,
    ...x,
  });

  const projekte = [
    P({
      titel: "Freiflächen-PV 24 MWp in Niederbayern",
      typ: "freiflaeche", land: "DE", bundesland: "Bayern", region: "Niederbayern", mwp: 24, flaecheHa: 26,
      phase: "satzung", netzanschluss: "zusage", codGeplant: "2028-06", preisModus: "proKwp", preisProKwp: mitte("satzung"),
      beschreibung: "Demo-Projekt: Freiflächenanlage auf Ackerflächen in benachteiligtem Gebiet. Satzungsbeschluss des Bebauungsplans liegt vor, Netzanschlusszusage des Verteilnetzbetreibers ist erteilt. Geeignet für Investoren, die Baurecht mit überschaubarem Restrisiko suchen.",
      highlights: ["Satzungsbeschluss liegt vor", "Netzzusage Mittelspannung", "Pachtverträge 30 Jahre + Option"],
      vertraulich: { gemeinde: "Demo-Gemeinde (fiktiv)", gemarkung: "Musterfeld", flurstuecke: "Fl.-Nr. 101, 102, 104 (fiktiv)", netzbetreiber: "Demo-Netz GmbH (fiktiv)", einspeisepunkt: "UW Musterfeld, 20 kV", entfernungNetzKm: 2.4, sicherung: "Pachtverträge unterzeichnet", planungsrecht: "B-Plan Satzungsbeschluss", ertragKwhKwp: 1100, verguetung: "EEG-Ausschreibung oder PPA offen" },
      status: "veroeffentlicht", veroeffentlichtAm: vorTagen(40), aufrufe: 184,
      statusVerlauf: verlauf([["entwurf", 70, "", "eigentuemer"], ["pruefung", 45, "", "eigentuemer"], ["veroeffentlicht", 40, "Unterlagen geprüft, freigegeben."]], admin),
    }),
    P({
      titel: "Agri-PV 8,5 MWp in Oberschwaben",
      typ: "agri", land: "DE", bundesland: "Baden-Württemberg", region: "Oberschwaben", mwp: 8.5, flaecheHa: 14,
      phase: "aufstellung", netzanschluss: "angefragt", codGeplant: "2029", preisModus: "anfrage",
      beschreibung: "Demo-Projekt: Vertikale, bifaziale Agri-PV nach DIN SPEC 91434 auf Grünland mit fortgesetzter Bewirtschaftung. Aufstellungsbeschluss gefasst, frühzeitige Beteiligung abgeschlossen. Netzanfrage gestellt, Antwort ausstehend.",
      highlights: ["Landwirtschaft bleibt Hauptnutzung", "Aufstellungsbeschluss gefasst", "Segment besondere Solaranlagen"],
      vertraulich: { gemeinde: "Demo-Dorf (fiktiv)", netzbetreiber: "Demo-Netz Süd (fiktiv)", planungsrecht: "Aufstellungsbeschluss", details: "Weidebetrieb bleibt erhalten." },
      status: "veroeffentlicht", veroeffentlichtAm: vorTagen(25), aufrufe: 96,
      statusVerlauf: verlauf([["entwurf", 40, "", "eigentuemer"], ["pruefung", 28, "", "eigentuemer"], ["veroeffentlicht", 25, ""]], admin),
    }),
    P({
      titel: "Freiflächen-PV 42 MWp in der Uckermark",
      typ: "freiflaeche", land: "DE", bundesland: "Brandenburg", region: "Uckermark", mwp: 42, flaecheHa: 45,
      phase: "netz", netzanschluss: "zusage", codGeplant: "2029-12", preisModus: "gesamt", preis: 42000 * mitte("netz"),
      beschreibung: "Demo-Projekt: Großflächiges Projekt in früher Phase mit bereits vorliegender Netzanschlusszusage. Flächen über Nutzungsverträge gesichert, Bauleitplanung noch nicht begonnen. Für Investoren mit Entwicklungskompetenz und längerem Horizont.",
      highlights: ["Netzzusage liegt vor", "Flächen gesichert", "Skalierbar"],
      vertraulich: { gemeinde: "Demo-Amt Nord (fiktiv)", netzbetreiber: "Demo-Übertragung (fiktiv)", einspeisepunkt: "UW Demo, 110 kV", entfernungNetzKm: 6.8, sicherung: "Nutzungsverträge", planungsrecht: "noch offen" },
      status: "veroeffentlicht", veroeffentlichtAm: vorTagen(12), aufrufe: 58,
      statusVerlauf: verlauf([["entwurf", 20, "", "eigentuemer"], ["pruefung", 15, "", "eigentuemer"], ["veroeffentlicht", 12, ""]], admin),
    }),
    P({
      titel: "Freiflächen-PV 6,2 MWp im Innviertel",
      typ: "freiflaeche", land: "AT", bundesland: "Oberösterreich", region: "Innviertel", mwp: 6.2, flaecheHa: 7,
      phase: "rtb", netzanschluss: "reserviert", codGeplant: "2027-09", preisModus: "proKwp", preisProKwp: mitte("rtb"),
      beschreibung: "Demo-Projekt: Baureifes Projekt mit Widmung Grünland-Photovoltaik und reservierter Netzkapazität. Alle Genehmigungen liegen vor. Aktuell in exklusiven Gesprächen mit einem Investor.",
      highlights: ["Ready-to-Build", "Widmung Grünland-PV", "Netzkapazität reserviert"],
      vertraulich: { gemeinde: "Demo-Markt (fiktiv)", netzbetreiber: "Demo-Netz OÖ (fiktiv)", planungsrecht: "Widmung + Baubewilligung", ertragKwhKwp: 1120 },
      status: "reserviert", veroeffentlichtAm: vorTagen(55), aufrufe: 211,
      statusVerlauf: verlauf([["entwurf", 80, "", "eigentuemer"], ["pruefung", 60, "", "eigentuemer"], ["veroeffentlicht", 55, ""], ["reserviert", 6, "LOI angenommen."]], admin),
    }),
    P({
      titel: "PV mit Speicher 15 MWp / 20 MWh in der Altmark",
      typ: "hybrid", land: "DE", bundesland: "Sachsen-Anhalt", region: "Altmark", mwp: 15, mwhSpeicher: 20, flaecheHa: 17,
      phase: "flaeche", netzanschluss: "offen", codGeplant: "2030", preisModus: "proKwp", preisProKwp: mitte("flaeche"),
      beschreibung: "Demo-Projekt: Flächen für eine Kombination aus Freiflächen-PV und Batteriespeicher sind gesichert. Netzanfrage und Bauleitplanung stehen noch aus – Einstieg in sehr früher Phase mit entsprechendem Risiko und Preis.",
      highlights: ["Flächen gesichert", "Speicher-Option", "Früher Einstieg"],
      vertraulich: { gemeinde: "Demo-Stadt (fiktiv)", sicherung: "Optionsverträge" },
      status: "veroeffentlicht", veroeffentlichtAm: vorTagen(5), aufrufe: 22,
      statusVerlauf: verlauf([["entwurf", 9, "", "eigentuemer"], ["pruefung", 7, "", "eigentuemer"], ["veroeffentlicht", 5, ""]], admin),
    }),
    P({
      titel: "Solarpark im Bestand 4,8 MWp in Thüringen",
      typ: "freiflaeche", land: "DE", bundesland: "Thüringen", region: "Nordthüringen", mwp: 4.8, flaecheHa: 6,
      phase: "cod", netzanschluss: "vorhanden", codGeplant: "2019", preisModus: "gesamt", preis: 4800 * mitte("cod"),
      beschreibung: "Demo-Projekt: Bestandsanlage mit mehrjähriger Betriebshistorie und EEG-Vergütung. Wartungs- und Direktvermarktungsverträge laufen. Geeignet für Investoren, die planbare Cashflows ohne Entwicklungsrisiko suchen.",
      highlights: ["Betriebsdaten seit Inbetriebnahme", "EEG-Vergütung", "Kein Entwicklungsrisiko"],
      vertraulich: { gemeinde: "Demo-Flur (fiktiv)", ertragKwhKwp: 1010, verguetung: "EEG-Festvergütung (Demo)" },
      status: "veroeffentlicht", veroeffentlichtAm: vorTagen(30), aufrufe: 143,
      statusVerlauf: verlauf([["entwurf", 35, "", "eigentuemer"], ["pruefung", 32, "", "eigentuemer"], ["veroeffentlicht", 30, ""]], admin),
    }),
    P({
      titel: "Solarcarport 1,9 MWp im Schweizer Mittelland",
      typ: "carport", land: "CH", bundesland: "Aargau", region: "Mittelland", mwp: 1.9,
      phase: "satzung", netzanschluss: "zusage", codGeplant: "2027", preisModus: "anfrage",
      beschreibung: "Demo-Projekt: Überdachung einer großen Parkfläche eines Gewerbestandorts mit Ladeinfrastruktur. Baubewilligung liegt vor, Eigenverbrauch über einen Zusammenschluss zum Eigenverbrauch (ZEV) vorgesehen.",
      highlights: ["Baubewilligung liegt vor", "Eigenverbrauch vor Ort", "Ladeinfrastruktur"],
      vertraulich: { gemeinde: "Demo-Gemeinde AG (fiktiv)" },
      status: "pruefung", provisionSatz: null,
      statusVerlauf: verlauf([["entwurf", 6, "", "eigentuemer"], ["pruefung", 2, "", "eigentuemer"]], admin),
    }),
    P({
      titel: "Batteriegroßspeicher 20 MW im Weinviertel",
      typ: "speicher", land: "AT", bundesland: "Niederösterreich", region: "Weinviertel", mwp: 20, mwhSpeicher: 40,
      phase: "netz", netzanschluss: "zusage", codGeplant: "2028", preisModus: "anfrage",
      beschreibung: "Demo-Projekt im Entwurf.",
      status: "entwurf", provisionAkzeptiert: null, provisionSatz: null,
      statusVerlauf: verlauf([["entwurf", 1, "", "eigentuemer"]], admin),
    }),
    P({
      titel: "Freiflächen-PV 9,6 MWp in Schwaben",
      typ: "freiflaeche", land: "DE", bundesland: "Bayern", region: "Schwaben", mwp: 9.6, flaecheHa: 10,
      phase: "rtb", netzanschluss: "zusage", codGeplant: "2027-03", preisModus: "proKwp", preisProKwp: mitte("rtb"),
      beschreibung: "Demo-Projekt: Baureifes Projekt, über die Projektbörse an einen Investor verkauft. Dient in der Vorführung als Beispiel für Abschluss und Provisionsabrechnung.",
      highlights: ["Verkauft über die Projektbörse"],
      status: "verkauft", veroeffentlichtAm: vorTagen(90), aufrufe: 402, provisionSatz: 0.025,
      statusVerlauf: verlauf([["entwurf", 110, "", "eigentuemer"], ["pruefung", 100, "", "eigentuemer"], ["veroeffentlicht", 90, ""], ["reserviert", 50, ""], ["verkauft", 14, "Kaufvertrag unterzeichnet."]], admin),
    }),
  ];
  // Zweiter Anbieter für das Carport-Projekt
  projekte.forEach((p) => (p.slug = `${slugify(p.titel)}-${p.id.slice(-4).toLowerCase()}`));

  const [p1, p2, p3, p4, , p6, , , p9] = projekte;

  // ---------------------------------------------------------------- Interessen
  const I = (projekt, status, extra = {}) => ({
    id: neueId("I"),
    projektId: projekt.id,
    investorId: n.investor.id,
    status,
    gemerkt: true,
    nda: status === "gemerkt" ? null : { version: "2026-09", am: vorTagen(20), ip: "", userAgent: "Demo" },
    loi: null,
    ablehnGrund: "",
    erstelltAm: vorTagen(30),
    geaendertAm: vorTagen(3),
    ...extra,
  });
  const interessen = [
    I(p1, "nda_freigegeben", { statusVerlauf: verlauf([["gemerkt", 30, "", "eigentuemer"], ["nda_angefragt", 20, "", "eigentuemer"], ["nda_freigegeben", 19, "Datenraum freigeschaltet."]], admin) }),
    I(p2, "gemerkt", { statusVerlauf: verlauf([["gemerkt", 4, "", "eigentuemer"]], admin) }),
    I(p3, "nda_angefragt", { statusVerlauf: verlauf([["gemerkt", 3, "", "eigentuemer"], ["nda_angefragt", 1, "", "eigentuemer"]], admin) }),
    I(p4, "loi_angenommen", {
      loi: { betrag: Math.round(6200 * mitte("rtb")), text: "Unverbindliche Absichtserklärung (Demo).", bedingungen: "Vorbehaltlich Due Diligence", am: vorTagen(9) },
      statusVerlauf: verlauf([["gemerkt", 40, "", "eigentuemer"], ["nda_angefragt", 38, "", "eigentuemer"], ["nda_freigegeben", 37, ""], ["loi_abgegeben", 9, "", "eigentuemer"], ["loi_angenommen", 6, "Exklusivität 8 Wochen."]], admin),
    }),
    I(p6, "loi_abgegeben", {
      loi: { betrag: Math.round(4800 * PHASEN.find((x) => x.id === "cod").preisProKwp.min), text: "Indikatives Angebot (Demo).", bedingungen: "Technische Due Diligence, Finanzierungszusage", am: vorTagen(2) },
      statusVerlauf: verlauf([["gemerkt", 20, "", "eigentuemer"], ["nda_angefragt", 18, "", "eigentuemer"], ["nda_freigegeben", 17, ""], ["loi_abgegeben", 2, "", "eigentuemer"]], admin),
    }),
    I(p9, "abgeschlossen", {
      loi: { betrag: Math.round(9600 * mitte("rtb")), text: "Absichtserklärung (Demo).", bedingungen: "", am: vorTagen(55) },
      statusVerlauf: verlauf([["gemerkt", 85, "", "eigentuemer"], ["nda_angefragt", 84, "", "eigentuemer"], ["nda_freigegeben", 83, ""], ["loi_abgegeben", 55, "", "eigentuemer"], ["loi_angenommen", 50, ""], ["abgeschlossen", 14, "Kauf abgeschlossen.", "system"]], admin),
    }),
  ];

  const kaufpreis9 = Math.round(9600 * mitte("rtb"));
  const provisionen = [
    {
      id: neueId("PV"),
      projektId: p9.id,
      anbieterId: p9.anbieterId,
      investorId: n.investor.id,
      interesseId: interessen[5].id,
      kaufpreis: kaufpreis9,
      satz: 0.025,
      betrag: Math.round(kaufpreis9 * 0.025),
      status: "in_rechnung",
      statusVerlauf: verlauf([["offen", 14, "Automatisch bei Verkauf berechnet.", "system"], ["in_rechnung", 10, "Rechnung gestellt (Demo)."]], admin),
      erstelltAm: vorTagen(14),
    },
  ];

  // ---------------------------------------------------------------- Vorgänge & Flächen
  const V = (x) => ({
    id: neueId("V"),
    nutzerId: null,
    kontakt: {},
    daten: {},
    herkunft: { kanal: "Direkt" },
    ip: "",
    einwilligung: { am: vorTagen(x.alter || 10), text: "Einwilligung Anfrageformular (Demo)" },
    zustaendigId: admin,
    flaecheId: null,
    erstelltAm: vorTagen(x.alter || 10),
    geaendertAm: vorTagen(1),
    demo: true,
    ...x,
  });
  const kontaktVon = (u) => ({ vorname: u.vorname, nachname: u.nachname, email: u.email, firma: u.firma });

  const F = (x) => ({
    id: neueId("F"),
    nutzerId: null,
    vorgangId: null,
    land: "DE",
    bundesland: "",
    gemarkung: "",
    flurstuecke: [],
    nutzung: "acker",
    agri: false,
    eigentum: "eigentum",
    hinweise: "",
    pachtangebot: null,
    ablehnGrund: "",
    zustaendigId: admin,
    erstelltAm: vorTagen(30),
    geaendertAm: vorTagen(2),
    demo: true,
    ...x,
  });

  const flaechen = [
    F({
      nutzerId: n.flaeche.id, bezeichnung: "Acker am Mühlweg (Demo)", bundesland: "Bayern", plz: "86825", ort: "Demo-Ort", gemarkung: "Musterfeld",
      flurstuecke: [{ gemarkung: "Musterfeld", flur: "3", nummer: "211" }, { gemarkung: "Musterfeld", flur: "3", nummer: "212" }], ha: 18.5,
      status: "pachtangebot",
      pachtangebot: { euroProHaJahr: PACHT.freiflaecheProHa.mittel, laufzeitJahre: PACHT.laufzeit, verlaengerung: PACHT.verlaengerung, text: "Indexierte Pacht, Reservierungsprämie bis Baubeginn. Rückbauverpflichtung mit Sicherheitsleistung. (Demo)", am: vorTagen(3) },
      statusVerlauf: verlauf([["eingegangen", 28, "", "eigentuemer"], ["vorpruefung", 25, "Keine Schutzgebiete, benachteiligtes Gebiet."], ["standortanalyse", 15, "Netzverknüpfungspunkt in 2,1 km."], ["pachtangebot", 3, "Pachtangebot im Dokumentenbereich."]], admin),
    }),
    F({
      nutzerId: n.flaeche.id, bezeichnung: "Wiese Hinterfeld (Demo)", bundesland: "Bayern", plz: "86825", ort: "Demo-Ort", nutzung: "gruenland", ha: 4.2,
      status: "vorpruefung", erstelltAm: vorTagen(6),
      statusVerlauf: verlauf([["eingegangen", 6, "", "eigentuemer"], ["vorpruefung", 4, ""]], admin),
    }),
    F({
      nutzerId: n.landwirt.id, bezeichnung: "Agri-PV Schlag Nord (Demo)", land: "AT", bundesland: "Oberösterreich", plz: "5120", ort: "Demo-Gemeinde", agri: true, ha: 9.8,
      status: "standortanalyse",
      statusVerlauf: verlauf([["eingegangen", 20, "", "eigentuemer"], ["vorpruefung", 16, ""], ["standortanalyse", 8, "Widmung Grünland-PV wird mit der Gemeinde abgestimmt."]], admin),
    }),
    F({
      bezeichnung: "Fläche 5,5 ha (aus Anfrage)", bundesland: "Niedersachsen", plz: "29525", ort: "Demo-Heide", ha: 5.5, status: "eingegangen", erstelltAm: vorTagen(1),
      statusVerlauf: verlauf([["entwurf", 2, "", "system"], ["eingegangen", 1, "Vom Backoffice übernommen."]], admin),
    }),
    F({
      bezeichnung: "Konversionsfläche Altdepot (Demo)", bundesland: "Sachsen", plz: "04416", ort: "Demo-Stadt", nutzung: "konversion", ha: 31, status: "planung",
      statusVerlauf: verlauf([["eingegangen", 200, ""], ["vorpruefung", 190, ""], ["standortanalyse", 170, ""], ["pachtangebot", 150, ""], ["vertrag", 140, ""], ["planung", 90, "Aufstellungsbeschluss gefasst."]], admin),
    }),
    F({
      bezeichnung: "Hangfläche Süd (Demo)", bundesland: "Baden-Württemberg", plz: "88400", ort: "Demo-Tal", nutzung: "gruenland", ha: 2.1, status: "abgelehnt",
      ablehnGrund: "Fläche unter der wirtschaftlichen Mindestgröße und im Landschaftsschutzgebiet.",
      statusVerlauf: verlauf([["eingegangen", 40, ""], ["vorpruefung", 38, ""], ["abgelehnt", 35, "Fläche unter der wirtschaftlichen Mindestgröße und im Landschaftsschutzgebiet."]], admin),
    }),
    F({
      bezeichnung: "Solarpark Demo-Feld", bundesland: "Thüringen", plz: "99706", ort: "Demo-Flur", ha: 12, status: "betrieb",
      statusVerlauf: verlauf([["eingegangen", 900, ""], ["vertrag", 800, ""], ["planung", 700, ""], ["bau", 420, ""], ["betrieb", 360, "In Betrieb (Demo)."]], admin),
    }),
  ];
  const [f1, f2, f3, f4] = flaechen;

  const vorgaenge = [
    V({ typ: "flaeche", nutzerId: n.flaeche.id, email: n.flaeche.email, kontakt: kontaktVon(n.flaeche), daten: { ha: 18.5, plz: "86825" }, status: "qualifiziert", flaecheId: f1.id, alter: 30,
      statusVerlauf: verlauf([["eingegangen", 30, "", "eigentuemer"], ["in_pruefung", 29, ""], ["qualifiziert", 25, "Fläche geeignet – Details im Flächenbereich."]], admin) }),
    V({ typ: "agri", nutzerId: n.landwirt.id, email: n.landwirt.email, kontakt: kontaktVon(n.landwirt), daten: { ha: 9.8, modell: "verpachten" }, status: "in_pruefung", flaecheId: f3.id, alter: 21,
      statusVerlauf: verlauf([["eingegangen", 21, "", "eigentuemer"], ["in_pruefung", 20, ""]], admin) }),
    V({ typ: "genossenschaft", nutzerId: n.landwirt.id, email: n.landwirt.email, kontakt: kontaktVon(n.landwirt), daten: { anteile: 5 }, status: "eingegangen", alter: 2,
      statusVerlauf: verlauf([["eingegangen", 2, "", "eigentuemer"]], admin) }),
    V({ typ: "investor", nutzerId: n.investor.id, email: n.investor.email, kontakt: kontaktVon(n.investor), daten: { ticket: "1–15 Mio. €" }, status: "abgeschlossen", alter: 100,
      statusVerlauf: verlauf([["eingegangen", 100, "", "eigentuemer"], ["in_pruefung", 99, ""], ["qualifiziert", 98, ""], ["angebot", 97, ""], ["abgeschlossen", 90, "Zugang zur Projektbörse eingerichtet."]], admin) }),
    V({ typ: "projekt", nutzerId: n.anbieter.id, email: n.anbieter.email, kontakt: kontaktVon(n.anbieter), daten: {}, status: "abgeschlossen", alter: 120,
      statusVerlauf: verlauf([["eingegangen", 120, "", "eigentuemer"], ["qualifiziert", 118, ""], ["abgeschlossen", 115, "Anbieterkonto freigeschaltet."]], admin) }),
    V({ typ: "reststrom", nutzerId: n.unternehmen.id, email: n.unternehmen.email, kontakt: kontaktVon(n.unternehmen), daten: { verbrauchMwh: 850, standorte: 2 }, status: "angebot", alter: 18,
      statusVerlauf: verlauf([["eingegangen", 18, "", "eigentuemer"], ["in_pruefung", 17, ""], ["qualifiziert", 12, "Lastgang ausgewertet."], ["angebot", 4, "Angebot für den Reststrom-Pool liegt im Dokumentenbereich."]], admin) }),
    V({ typ: "carport", nutzerId: n.unternehmen.id, email: n.unternehmen.email, kontakt: kontaktVon(n.unternehmen), daten: { stellplaetze: 120 }, status: "eingegangen", alter: 1,
      statusVerlauf: verlauf([["eingegangen", 1, "", "eigentuemer"]], admin) }),
    V({ typ: "energiegemeinschaft", nutzerId: n.mitglied.id, email: n.mitglied.email, kontakt: kontaktVon(n.mitglied), daten: { land: "AT" }, status: "qualifiziert", alter: 15,
      statusVerlauf: verlauf([["eingegangen", 15, "", "eigentuemer"], ["in_pruefung", 14, ""], ["qualifiziert", 10, "Beitritt zur Energiegemeinschaft möglich, sobald sie gegründet ist."]], admin) }),
    V({ typ: "flaeche", email: "anfrage1@example.com", kontakt: { vorname: "Friedrich", nachname: "Fiktiv (Demo)", email: "anfrage1@example.com", plz: "29525" }, daten: { ha: 5.5 }, status: "eingegangen", flaecheId: f4.id, alter: 2,
      statusVerlauf: verlauf([["eingegangen", 2, "", "eigentuemer"]], admin) }),
    V({ typ: "kommune", email: "gemeinde@example.com", kontakt: { vorname: "Greta", nachname: "Gemeinde (Demo)", email: "gemeinde@example.com", firma: "Demo-Gemeinde (fiktiv)" }, daten: { thema: "Bürgersolarpark" }, status: "in_pruefung", alter: 7,
      statusVerlauf: verlauf([["eingegangen", 7, "", "eigentuemer"], ["in_pruefung", 5, ""]], admin) }),
    V({ typ: "speicher", email: "speicher@example.com", kontakt: { vorname: "Stefan", nachname: "Speicher (Demo)", email: "speicher@example.com", firma: "Demo Logistik AG (fiktiv)" }, daten: { mw: 2 }, status: "abgelehnt", alter: 25,
      statusVerlauf: verlauf([["eingegangen", 25, "", "eigentuemer"], ["in_pruefung", 24, ""], ["abgelehnt", 20, "Netzanschluss am Standort nicht ausreichend."]], admin) }),
    V({ typ: "kontakt", email: "kontakt@example.com", kontakt: { vorname: "Klara", nachname: "Kontakt (Demo)", email: "kontakt@example.com" }, daten: { nachricht: "Allgemeine Frage zur Projektbörse (Demo)." }, status: "eingegangen", alter: 0,
      statusVerlauf: verlauf([["eingegangen", 0, "", "eigentuemer"]], admin) }),
  ];
  f1.vorgangId = vorgaenge[0].id;
  f3.vorgangId = vorgaenge[1].id;
  f4.vorgangId = vorgaenge[8].id;
  void f2;

  // ---------------------------------------------------------------- Nachrichten
  const M = (bezugArt, bezugId, vonId, textInhalt, tage, { vonAdmin = false, system = false, gelesenNutzer = true, gelesenAdmin = true } = {}) => ({
    id: neueId("M"), bezugArt, bezugId, vonId, vonAdmin, system, text: textInhalt, am: vorTagen(tage), gelesenNutzer, gelesenAdmin,
  });
  const nachrichten = [
    M("flaeche", f1.id, admin, "Status: „Standortanalyse“ → „Pachtangebot“. Pachtangebot im Dokumentenbereich.", 3, { vonAdmin: true, system: true, gelesenNutzer: false }),
    M("flaeche", f1.id, admin, "Guten Tag Frau Musterfrau, anbei unser Pachtangebot. Bei Fragen antworten Sie gern direkt hier. (Demo)", 3, { vonAdmin: true, gelesenNutzer: false }),
    M("flaeche", f3.id, n.landwirt.id, "Können wir die Reihenabstände an unsere Maschinenbreite anpassen? (Demo)", 7, { gelesenAdmin: false }),
    M("interesse", interessen[0].id, admin, "Status: „NDA angefragt“ → „Datenraum frei“. Datenraum freigeschaltet.", 19, { vonAdmin: true, system: true }),
    M("interesse", interessen[4].id, n.investor.id, "Wir haben ein indikatives Angebot abgegeben und freuen uns auf Rückmeldung. (Demo)", 2, { gelesenAdmin: false }),
    M("vorgang", vorgaenge[5].id, admin, "Status: „Qualifiziert“ → „Angebot / Gespräch“. Angebot für den Reststrom-Pool liegt im Dokumentenbereich.", 4, { vonAdmin: true, system: true, gelesenNutzer: false }),
    M("projekt", p1.id, admin, "Ihr Projekt wurde 184-mal aufgerufen, ein Investor hat den Datenraum erhalten. (Demo)", 8, { vonAdmin: true }),
    M("projekt", projekte[6].id, n.anbieter.id, "Unterlagen zur Baubewilligung folgen diese Woche. (Demo)", 2, { gelesenAdmin: false }),
  ];

  // ---------------------------------------------------------------- Dokumente (erzeugte Demo-PDFs)
  const dokumente = [];
  async function doc(bezugArt, bezugId, name, kategorie, titel, zeilen, vonId, tage) {
    const daten = demoPdf(titel, zeilen);
    const datei = `${neueId("D")}-${sha256(name + Math.random()).slice(0, 12)}.pdf`;
    await uploadSchreiben(datei, daten);
    dokumente.push({ id: neueId("D"), bezugArt, bezugId, name, mime: "application/pdf", groesse: daten.length, datei, kategorie, hochgeladenVon: vonId, am: vorTagen(tage), sha256: sha256(daten) });
  }
  await doc("projekt", p1.id, "Demo-Exposé Niederbayern.pdf", "datenraum", "Exposé Freiflächen-PV 24 MWp", ["Projektsteckbrief (fiktiv)", "Leistung: 24 MWp", "Phase: Satzungsbeschluss", "Netz: Zusage liegt vor"], n.anbieter.id, 40);
  await doc("projekt", p1.id, "Demo-Lageplan.pdf", "datenraum", "Lageplan (Demo)", ["Übersichtsplan – fiktiv"], n.anbieter.id, 40);
  await doc("projekt", p1.id, "Demo-Projektsteckbrief öffentlich.pdf", "allgemein", "Projektsteckbrief (Demo)", ["Nur interne Ablage des Anbieters"], n.anbieter.id, 41);
  await doc("flaeche", f1.id, "Demo-Pachtangebot.pdf", "vertrag", "Pachtangebot (Demo)", [`Pacht: ${PACHT.freiflaecheProHa.mittel} € je ha und Jahr`, `Laufzeit: ${PACHT.laufzeit} Jahre, ${PACHT.verlaengerung}`], admin, 3);
  await doc("vorgang", vorgaenge[5].id, "Demo-Angebot Reststrom-Pool.pdf", "vertrag", "Angebot Reststrom-Pool (Demo)", ["Indikatives Angebot – fiktiv"], admin, 4);

  const aktivitaeten = [
    { id: neueId("A"), am: vorTagen(14), nutzerId: admin, aktion: "status", objektArt: "projekt", objektId: p9.id, text: "Projekt verkauft, Provision berechnet", ip: "" },
    { id: neueId("A"), am: vorTagen(3), nutzerId: admin, aktion: "status", objektArt: "flaeche", objektId: f1.id, text: "Pachtangebot gesendet", ip: "" },
    { id: neueId("A"), am: vorTagen(1), nutzerId: n.investor.id, aktion: "nda", objektArt: "interesse", objektId: interessen[2].id, text: "NDA akzeptiert", ip: "" },
  ];

  return {
    erstelltAm: new Date().toISOString(),
    hinweis: "Demo-Datenbank der ÖkoInvest-Plattform – alle Daten fiktiv.",
    nutzer,
    vorgaenge,
    flaechen,
    projekte,
    interessen,
    provisionen,
    nachrichten,
    dokumente,
    aktivitaeten,
    tokens: [],
    demoLinks: [],
  };
}
