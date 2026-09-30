// src/lib/plattform/backend/demo/entwicklung-seed.js
//
// Demo-Daten „Projektentwicklung“ – ALLES FIKTIV (Namen mit „(Demo)“, Adressen unter example.com). Wird beim ersten
// Zugriff auf db.entwicklung einmalig ergänzt (demo/entwicklung.js → lesenBereit); übrige Demo-Daten bleiben unverändert.
//
//  - 7 Entwicklungsprojekte DE/AT/CH in allen Phasen (Akquise bis Baureife), Pläne aus den Meilenstein-Vorlagen,
//    erledigte Meilensteine mit Ist-Terminen, überfällige Meilensteine auf dem kritischen Pfad
//  - Verknüpfungen: „Acker am Mühlweg (Demo)“ (flaeche@example.com), „Agri-PV Schlag Nord (Demo)“ (landwirt@example.com)
//  - Co-Development-Freigabe für investor@example.com (Solarpark Mühlweg)
//  - Konten: bo-projektleitung@example.com (Unterrolle Projektleitung), gutachter@example.com (Gutachter/Planer,
//    Artenschutzgutachten Mühlweg) – Passwort wie alle Demo-Konten
//  - CRM-Kontakte der Behörden/Stakeholder (Gemeinde, Netzbetreiber, Landratsamt, Naturschutz)

import { neueId, jetzt, vorTagen } from "./hilfen";
import { boSicher } from "./bo-kern";
import { heuteIso, planBerechnen, plusMonate, topologisch, vorlage } from "../../entwicklung";

const MAIL_AUS = { status: false, nachricht: false, nda: false, suchprofil: false, anfrage: false, aufgabe: false, stoerung: false, entwicklung: false };
const tag = (t) => new Date(Date.now() + t * 86400e3).toISOString().slice(0, 10);
const minIso = (a, b) => (a < b ? a : b);

function konto(db, { email, vorname, nachname, firma, rollen, backofficeRollen }) {
  let u = db.nutzer.find((x) => x.email === email);
  if (u) return u;
  const admin = db.nutzer.find((x) => x.email === "admin@example.com");
  if (!admin) return null;
  u = {
    id: neueId("U"), email, vorname, nachname, firma, telefon: "", rollen, ...(backofficeRollen ? { backofficeRollen } : {}),
    passwortHash: admin.passwortHash, sitzungVersion: 0, aktiv: true, emailBestaetigt: true, erstelltAm: vorTagen(60), letzterLogin: null,
    suchprofil: null, mailEinstellungen: MAIL_AUS, demo: true,
  };
  db.nutzer.push(u);
  return u;
}

function crmKontakt(db, { vorname, nachname, firma, funktion, rolle, ort, email }) {
  boSicher(db);
  let k = db.bo.kontakte.find((x) => x.email === email);
  if (k) return k;
  k = {
    id: neueId("K"), anrede: "", titel: "", vorname, nachname, firma, funktion, email, telefon: "", plz: "", ort, land: "DE", organisationId: null,
    rollen: [rolle], tags: ["Projektentwicklung"], notiz: "", zustaendigId: null, nutzerId: null, quelle: "manuell", herkunft: "", bezuege: [], erstelltAm: jetzt(), geaendertAm: jetzt(),
  };
  db.bo.kontakte.push(k);
  return k;
}

/** Projekt mit Plan anlegen; `erledigt` (Schlüssel) mit Ist-Terminen, `inArbeit` gestartet. verspaetet: Schlüssel → Tage */
function bauen(db, d, { projektleiterId, erledigt = [], inArbeit = [], verspaetet = {}, entfallen = [] }) {
  const p = {
    id: neueId("EP"), titel: d.titel, typ: d.typ, land: d.land, bundesland: d.bundesland, gemeinde: d.gemeinde || "", landkreis: d.landkreis || "",
    mwp: d.mwp || 0, mwh: d.mwh || 0, nvp: d.nvp || "", netzbetreiber: d.netzbetreiber || "", zielCod: d.zielCod || "", vermarktung: d.vermarktung || "eeg",
    status: d.status || "aktiv", projektleiterId, beschreibung: d.beschreibung || "", wahrscheinlichkeit: null, start: tag(-d.vorTagen),
    kontakte: [], freigaben: [], boerseProjektId: null, anlageId: null, erpProjekt: null, erstelltVon: projektleiterId, erstelltAm: vorTagen(d.vorTagen), geaendertAm: vorTagen(3),
  };
  db.entwicklung.projekte.push(p);
  const schritte = vorlage(p.land, p.typ);
  const idVon = new Map(schritte.map((s) => [s.schluessel, neueId("MS")]));
  let liste = schritte.map((s, i) => ({
    id: idVon.get(s.schluessel), projektId: p.id, schluessel: s.schluessel, titel: s.titel, kategorie: s.kategorie, dauerMonate: s.dauerMonate,
    nach: s.nach.map((x) => idVon.get(x)).filter(Boolean), phase: s.phase, dokumentPflicht: s.dokumentPflicht, externTitel: s.externTitel, gutachten: s.gutachten,
    status: "offen", sollStart: null, sollEnde: null, sollFix: false, istStart: null, istEnde: null, verantwortlichId: null, gutachterIds: [], notiz: "",
    eingereichtAm: null, nachweisVerzicht: "", erinnert: {}, reihenfolge: i,
  }));
  liste = planBerechnen(liste, { start: p.start, prognose: false });
  const heute = heuteIso();
  for (const m of topologisch(liste)) {
    if (!erledigt.includes(m.schluessel) && !entfallen.includes(m.schluessel)) continue;
    const x = liste.find((y) => y.id === m.id);
    if (entfallen.includes(m.schluessel)) {
      x.status = "entfaellt";
      x.istEnde = x.sollStart;
    } else {
      x.status = "erledigt";
      x.istStart = x.sollStart;
      x.istEnde = minIso(plusMonate(x.sollEnde, (verspaetet[m.schluessel] || 0) / 30.4), tag(-2));
      if (x.istEnde < x.istStart) x.istEnde = x.istStart;
      x.nachweisVerzicht = "Demo-Daten: Nachweise liegen in der Projektakte (fiktiv).";
    }
    liste = planBerechnen(liste, { start: p.start, prognose: false });
  }
  for (const s of inArbeit) {
    const x = liste.find((y) => y.schluessel === s);
    if (!x) continue;
    x.status = "in_arbeit";
    x.istStart = minIso(x.sollStart, heute);
  }
  db.entwicklung.meilensteine.push(...liste);
  if (!p.zielCod) {
    const cod = liste.find((m) => m.phase === "cod");
    p.zielCod = cod?.sollEnde?.slice(0, 7) || "";
  }
  return { p, m: (s) => liste.find((y) => y.schluessel === s) };
}

const risiko = (db, p, x) => db.entwicklung.risiken.push({ id: neueId("RK"), projektId: p.id, kategorie: "sonstige", eintritt: 3, auswirkung: 3, massnahme: "", verantwortlichId: p.projektleiterId, status: "offen", extern: false, meilensteinId: null, erstelltAm: vorTagen(40), geaendertAm: vorTagen(5), ...x });
const budget = (db, p, x) => db.entwicklung.budget.push({ id: neueId("BP"), projektId: p.id, bezeichnung: "", istQuelle: "manuell", notiz: "", istEur: 0, ...x });
const entscheidung = (db, p, x) => db.entwicklung.entscheidungen.push({ id: neueId("EN"), projektId: p.id, art: "go", begruendung: "", beteiligte: "", vonId: p.projektleiterId, am: vorTagen(30), ...x });
function pflaeche(db, p, x) {
  const e = { id: neueId("PF"), projektId: p.id, flaecheId: null, bezeichnung: "", eigentuemerName: "", ha: 0, pachtStatus: "angefragt", pachtBeginn: "", pachtEnde: "", pachtEurHa: null, notiz: "", ...x };
  db.entwicklung.flaechen.push(e);
  return e;
}

export async function entwicklungSeed(db) {
  const admin = db.nutzer.find((u) => u.email === "admin@example.com");
  if (!admin) return;
  const pl = konto(db, { email: "bo-projektleitung@example.com", vorname: "Paula", nachname: "Projektleitung (Demo)", firma: "ÖkoInvest (Demo-Konto)", rollen: ["admin"], backofficeRollen: ["projektleitung"] });
  const gutachter = konto(db, { email: "gutachter@example.com", vorname: "Gerd", nachname: "Gutachter (Demo)", firma: "Demo Umweltplanung GbR (fiktiv)", rollen: ["gutachter"] });
  if (gutachter && !(db.entwicklung.gutachterProfile ||= []).some((x) => x.nutzerId === gutachter.id)) {
    db.entwicklung.gutachterProfile.push({ nutzerId: gutachter.id, fachgebiete: ["artenschutz", "umwelt", "ffh", "landschaft"], qualifikation: "fachbuero", buero: "Demo Umweltplanung GbR (fiktiv)", nachweis: "Referenzliste liegt vor (fiktiv)", geaendertAm: jetzt() });
  }
  const investor = db.nutzer.find((u) => u.email === "investor@example.com");
  const flaecheEig = db.nutzer.find((u) => u.email === "flaeche@example.com");
  const landwirt = db.nutzer.find((u) => u.email === "landwirt@example.com");
  const fMuehl = db.flaechen.find((f) => f.bezeichnung === "Acker am Mühlweg (Demo)" && f.nutzerId === flaecheEig?.id);
  const fNord = db.flaechen.find((f) => f.bezeichnung === "Agri-PV Schlag Nord (Demo)" && f.nutzerId === landwirt?.id);
  const fDepot = db.flaechen.find((f) => f.bezeichnung === "Konversionsfläche Altdepot (Demo)");
  const leiter = pl?.id || admin.id;

  const kGemeinde = crmKontakt(db, { vorname: "Bernhard", nachname: "Bürgermeister (Demo)", firma: "Gemeinde Demo-Ort (fiktiv)", funktion: "Erster Bürgermeister", rolle: "gemeinde", ort: "Demo-Ort", email: "gemeinde-demo-ort@example.com" });
  const kNetz = crmKontakt(db, { vorname: "Nina", nachname: "Netzplanung (Demo)", firma: "Demo Netz GmbH (fiktiv)", funktion: "Netzanschlussmanagement", rolle: "netzbetreiber", ort: "Demo-Stadt", email: "netz-demo@example.com" });
  const kLra = crmKontakt(db, { vorname: "Lars", nachname: "Landratsamt (Demo)", firma: "Landratsamt Demo-Kreis (fiktiv)", funktion: "Bauleitplanung", rolle: "behoerde", ort: "Demo-Kreisstadt", email: "lra-demo@example.com" });
  const kNatur = crmKontakt(db, { vorname: "Ute", nachname: "Naturschutz (Demo)", firma: "Untere Naturschutzbehörde Demo-Kreis (fiktiv)", funktion: "Sachgebiet Artenschutz", rolle: "behoerde", ort: "Demo-Kreisstadt", email: "unb-demo@example.com" });

  // 1) Solarpark Mühlweg – Aufstellungsbeschluss, Netzzusage überfällig, Artenschutz beim Gutachter, Co-Investor
  const a = bauen(db, {
    titel: "Solarpark Mühlweg (Demo)", typ: "freiflaeche", land: "DE", bundesland: "Bayern", gemeinde: "Demo-Ort", landkreis: "Demo-Kreis", mwp: 16.5, vorTagen: 560,
    nvp: "UW Demo-Ort, 20 kV (fiktiv)", netzbetreiber: "Demo Netz GmbH (fiktiv)", vermarktung: "eeg",
    beschreibung: "Freiflächenanlage auf zwei Ackerschlägen im benachteiligten Gebiet (Länderöffnungsklausel Bayern). B-Plan-Verfahren läuft, Netzzusage steht noch aus.",
  }, { projektleiterId: leiter, erledigt: ["flaechensicherung", "netzanfrage", "netzvertraeglichkeit", "gemeinde_vorgespraech", "aufstellungsbeschluss", "gutachten_boden", "fruehzeitige_beteiligung", "gutachten_blendung", "gutachten_ffh", "gutachten_landschaft"], inArbeit: ["netzzusage", "gutachten_artenschutz", "gutachten_archaeologie"], verspaetet: { aufstellungsbeschluss: 40 } });
  if (fMuehl) pflaeche(db, a.p, { flaecheId: fMuehl.id, bezeichnung: fMuehl.bezeichnung, eigentuemerName: [flaecheEig.vorname, flaecheEig.nachname].join(" "), ha: fMuehl.ha || 12, pachtStatus: "option", pachtBeginn: tag(-420), pachtEurHa: 1800 });
  pflaeche(db, a.p, { bezeichnung: "Nachbarschlag Flur 7 (Demo)", eigentuemerName: "Familie Beispiel (Demo)", ha: 6.4, pachtStatus: "verhandlung", notiz: "Zweites Gespräch nach der Ernte vereinbart." });
  if (gutachter) {
    a.m("gutachten_artenschutz").gutachterIds = [gutachter.id];
    a.m("gutachten_artenschutz").notiz = "Kartierung Feldlerche/Rebhuhn läuft seit März (fiktiv).";
    db.entwicklung.rueckfragen.push({ id: neueId("RF"), projektId: a.p.id, meilensteinId: a.m("gutachten_artenschutz").id, vonId: gutachter.id, anId: null, backoffice: false, text: "Liegt der Geltungsbereich inkl. Ausgleichsflächen schon als Shape-Datei vor?", am: vorTagen(9) });
    db.entwicklung.rueckfragen.push({ id: neueId("RF"), projektId: a.p.id, meilensteinId: a.m("gutachten_artenschutz").id, vonId: leiter, anId: gutachter.id, backoffice: true, text: "Ja – wir stellen sie diese Woche im Portal bereit (Demo).", am: vorTagen(8) });
  }
  a.m("netzzusage").verantwortlichId = leiter;
  a.m("netzzusage").notiz = "Netzbetreiber prüft Überbauung; Rückmeldung mehrfach verschoben (fiktiv).";
  a.p.kontakte = [
    { id: neueId("EK"), kontaktId: kGemeinde.id, rolle: "gemeinde", notiz: "Positiv, wünscht Bürgerbeteiligung (§ 6 EEG)." },
    { id: neueId("EK"), kontaktId: kNetz.id, rolle: "netzbetreiber", notiz: "" },
    { id: neueId("EK"), kontaktId: kLra.id, rolle: "landratsamt", notiz: "" },
    { id: neueId("EK"), kontaktId: kNatur.id, rolle: "naturschutz", notiz: "Abstimmung Untersuchungsrahmen Artenschutz." },
  ];
  if (investor) a.p.freigaben = [{ id: neueId("FG"), art: "codev", nutzerId: investor.id, organisationId: null, risiken: true, dokumente: true, seit: vorTagen(60), vonId: admin.id }];
  risiko(db, a.p, { titel: "Netzzusage verzögert sich – Kapazität am UW ausgeschöpft", kategorie: "netz", eintritt: 4, auswirkung: 4, massnahme: "Überbauung und Einspeisebegrenzung anbieten; alternativen Verknüpfungspunkt prüfen lassen.", extern: true, meilensteinId: a.m("netzzusage").id });
  risiko(db, a.p, { titel: "Feldlerchen-Reviere im Plangebiet", kategorie: "natur", eintritt: 3, auswirkung: 3, massnahme: "CEF-Maßnahmen (Lerchenfenster, Blühstreifen) früh einplanen.", extern: true, meilensteinId: a.m("gutachten_artenschutz").id });
  risiko(db, a.p, { titel: "Einwände aus der Nachbarschaft (Blickbeziehung Ortsrand)", kategorie: "akzeptanz", eintritt: 2, auswirkung: 3, massnahme: "Eingrünung 5 m, Bürgerinformation vor der Offenlage." });
  entscheidung(db, a.p, { datum: tag(-470), titel: "Go für das Bauleitplanverfahren", art: "go", beschluss: "Städtebaulichen Vertrag mit der Gemeinde schließen, Budget Gutachten freigegeben.", beteiligte: "Geschäftsführung, Projektleitung" });
  entscheidung(db, a.p, { datum: tag(-60), titel: "Co-Development mit Investor", art: "strategie", beschluss: "Co-Development-Freigabe für Demo Capital GmbH (fiktiv); Risiken und Dokumente sichtbar.", beteiligte: "Geschäftsführung" });
  budget(db, a.p, { kategorie: "gutachten", bezeichnung: "Artenschutz, Blendung, Boden", planEur: 45000, istEur: 28500, istQuelle: "demo" });
  budget(db, a.p, { kategorie: "planung", bezeichnung: "Planungsbüro B-Plan", planEur: 60000, istEur: 22000, istQuelle: "demo" });
  budget(db, a.p, { kategorie: "netz", bezeichnung: "Netzanfrage, Netzplanung", planEur: 8000, istEur: 6200, istQuelle: "demo" });
  budget(db, a.p, { kategorie: "recht", bezeichnung: "Pacht- und städtebaulicher Vertrag", planEur: 15000, istEur: 9400, istQuelle: "demo" });
  budget(db, a.p, { kategorie: "personal", bezeichnung: "Eigenleistung Projektleitung", planEur: 40000, istEur: 31000, istQuelle: "demo", notiz: "Im Betrieb aus ERPNext-Timesheets." });

  // 2) Agri-PV Schlag Nord (AT) – Flächensicherung, Gespräch mit der Gemeinde läuft
  const b = bauen(db, {
    titel: "Agri-PV Schlag Nord (Demo)", typ: "agri", land: "AT", bundesland: "Oberösterreich", gemeinde: "Demo-Gemeinde", mwp: 5.5, vorTagen: 230,
    netzbetreiber: "Demo Netz OÖ (fiktiv)", vermarktung: "eeg", beschreibung: "Hoch aufgeständerte Agri-PV über Ackerbau; Landwirt bleibt Bewirtschafter.",
  }, { projektleiterId: admin.id, erledigt: ["flaechensicherung", "netzanfrage"], inArbeit: ["gemeinde_vorgespraech", "nutzungskonzept_agri"] });
  if (fNord) pflaeche(db, b.p, { flaecheId: fNord.id, bezeichnung: fNord.bezeichnung, eigentuemerName: [landwirt.vorname, landwirt.nachname].join(" "), ha: fNord.ha || 9.8, pachtStatus: "pachtvertrag", pachtBeginn: tag(-200), pachtEurHa: 1500 });
  risiko(db, b.p, { titel: "Umwidmung „Grünland-Photovoltaik“ ungewiss (Landesvorgaben)", kategorie: "genehmigung", eintritt: 3, auswirkung: 5, massnahme: "Frühzeitig mit der Raumordnung des Landes abstimmen." });
  budget(db, b.p, { kategorie: "planung", bezeichnung: "Widmungsunterlagen", planEur: 25000, istEur: 3000, istQuelle: "demo" });

  // 3) Solarpark Altdepot – Satzungsbeschluss, Rechtskraft läuft
  const c = bauen(db, {
    titel: "Solarpark Altdepot (Demo)", typ: "freiflaeche", land: "DE", bundesland: "Sachsen", gemeinde: "Demo-Stadt", mwp: 28, vorTagen: 900,
    nvp: "UW Demo-Stadt Nord, 110 kV (fiktiv)", netzbetreiber: "Demo Netz GmbH (fiktiv)", vermarktung: "ppa", beschreibung: "Konversionsfläche (ehemaliges Depot) – EEG-förderfähig, PPA mit Industriekunden in Verhandlung.",
  }, { projektleiterId: leiter, erledigt: ["flaechensicherung", "netzanfrage", "netzvertraeglichkeit", "netzzusage", "gemeinde_vorgespraech", "aufstellungsbeschluss", "fruehzeitige_beteiligung", "gutachten_artenschutz", "gutachten_ffh", "gutachten_landschaft", "gutachten_blendung", "gutachten_schall", "gutachten_entwaesserung", "gutachten_archaeologie", "gutachten_boden", "umweltbericht", "offenlage", "abwaegung", "satzungsbeschluss"], inArbeit: ["rechtskraft", "vermarktung"], verspaetet: { offenlage: 25, gutachten_artenschutz: 60 } });
  pflaeche(db, c.p, { flaecheId: fDepot?.id || null, bezeichnung: "Konversionsfläche Altdepot (Demo)", eigentuemerName: "Demo Liegenschaften GmbH (fiktiv)", ha: fDepot?.ha || 31, pachtStatus: "pachtvertrag", pachtBeginn: tag(-860), pachtEurHa: 2200 });
  c.p.kontakte = [{ id: neueId("EK"), kontaktId: kNetz.id, rolle: "netzbetreiber", notiz: "Netzzusage 110 kV liegt vor (fiktiv)." }];
  risiko(db, c.p, { titel: "Altlasten im Untergrund (Kampfmittel)", kategorie: "technik", eintritt: 2, auswirkung: 4, massnahme: "Kampfmittelfreigabe vor Baubeginn, Rammtiefen begrenzen.", extern: true });
  risiko(db, c.p, { titel: "PPA-Preis unter Planannahme", kategorie: "markt", eintritt: 3, auswirkung: 3, massnahme: "Alternative EEG-Ausschreibung vorbereiten." });
  entscheidung(db, c.p, { datum: tag(-40), titel: "Vermarktung über PPA", art: "strategie", beschluss: "PPA mit Industriekunden verhandeln, EEG-Gebot als Rückfallebene.", beteiligte: "Geschäftsführung, Projektleitung" });
  budget(db, c.p, { kategorie: "gutachten", bezeichnung: "Gutachten gesamt", planEur: 70000, istEur: 74500, istQuelle: "demo" });
  budget(db, c.p, { kategorie: "planung", bezeichnung: "Planungsbüro B-Plan", planEur: 85000, istEur: 81000, istQuelle: "demo" });
  budget(db, c.p, { kategorie: "gebuehren", bezeichnung: "Sicherheit Netzbetreiber", planEur: 50000, istEur: 50000, istQuelle: "demo" });

  // 4) Solarcarport Logistikpark (AT) – Flächensicherung erledigt, Netzanfrage läuft
  const d = bauen(db, {
    titel: "Solarcarport Logistikpark Wels (Demo)", typ: "carport", land: "AT", bundesland: "Oberösterreich", gemeinde: "Raum Wels", mwp: 2.4, vorTagen: 140, vermarktung: "ppa",
    beschreibung: "Carport über 900 Stellplätzen; Strom geht per PPA an den Standortbetreiber.",
  }, { projektleiterId: admin.id, erledigt: ["flaechensicherung"], inArbeit: ["netzanfrage", "gutachten_statik"] });
  pflaeche(db, d.p, { bezeichnung: "Parkplatz Logistikpark (Demo)", eigentuemerName: "Demo Logistik AG (fiktiv)", ha: 2.3, pachtStatus: "pachtvertrag" });

  // 5) Batteriespeicher Umspannwerk Nord – Netzzusage erledigt, Gemeindegespräch überfällig
  const e = bauen(db, {
    titel: "Batteriespeicher Umspannwerk Nord (Demo)", typ: "speicher", land: "DE", bundesland: "Niedersachsen", gemeinde: "Demo-Heide", mwp: 20, mwh: 40, vorTagen: 330,
    nvp: "UW Demo-Heide, 110 kV (fiktiv)", netzbetreiber: "Demo Übertragung GmbH (fiktiv)", vermarktung: "merchant", beschreibung: "Großspeicher direkt am Umspannwerk; Vermarktung über Arbitrage und Regelenergie.",
  }, { projektleiterId: leiter, erledigt: ["flaechensicherung", "netzanfrage", "netzvertraeglichkeit", "netzzusage", "gutachten_boden"], inArbeit: ["gemeinde_vorgespraech", "gutachten_schall"] });
  pflaeche(db, e.p, { bezeichnung: "Grundstück am UW (Demo)", eigentuemerName: "Landwirt Demo (fiktiv)", ha: 1.2, pachtStatus: "option" });
  risiko(db, e.p, { titel: "Baurecht Speicher im Außenbereich unklar", kategorie: "genehmigung", eintritt: 4, auswirkung: 5, massnahme: "Rechtsgutachten zur Privilegierung einholen; Alternativ B-Plan mit der Gemeinde.", extern: false });
  risiko(db, e.p, { titel: "Erlöse aus Regelenergie sinken", kategorie: "markt", eintritt: 3, auswirkung: 3, massnahme: "Tolling-Angebote einholen." });
  budget(db, e.p, { kategorie: "netz", bezeichnung: "Netzanschlussplanung 110 kV", planEur: 30000, istEur: 27000, istQuelle: "demo" });
  budget(db, e.p, { kategorie: "recht", bezeichnung: "Rechtsgutachten Baurecht", planEur: 12000, istEur: 0, istQuelle: "manuell" });

  // 6) Freifläche Thurgau (CH) – Akquise
  const f = bauen(db, {
    titel: "Freifläche Thurgau (Demo)", typ: "freiflaeche", land: "CH", bundesland: "Thurgau", gemeinde: "Raum Frauenfeld", mwp: 8, vorTagen: 45, vermarktung: "eeg",
    beschreibung: "Freiflächenpotenzial entlang einer Autobahn; Abstimmung mit dem Kanton steht am Anfang.",
  }, { projektleiterId: admin.id, erledigt: [], inArbeit: ["flaechensicherung"] });
  pflaeche(db, f.p, { bezeichnung: "Parzellen an der A7 (Demo)", eigentuemerName: "Erbengemeinschaft Demo (fiktiv)", ha: 9, pachtStatus: "angefragt" });

  // 7) Solarpark Randstreifen – baureif, Vermarktung läuft (Übergabe an Börse möglich)
  const g = bauen(db, {
    titel: "Solarpark Randstreifen Autobahn (Demo)", typ: "freiflaeche", land: "DE", bundesland: "Baden-Württemberg", gemeinde: "Demo-Tal", mwp: 12, vorTagen: 960,
    nvp: "UW Demo-Tal, 20 kV (fiktiv)", netzbetreiber: "Demo Netz GmbH (fiktiv)", vermarktung: "eeg", beschreibung: "Randstreifen 500 m an der Autobahn (EEG-Flächenkulisse), B-Plan rechtskräftig, baureif.",
  }, { projektleiterId: leiter, erledigt: ["flaechensicherung", "netzanfrage", "netzvertraeglichkeit", "netzzusage", "gemeinde_vorgespraech", "aufstellungsbeschluss", "fruehzeitige_beteiligung", "gutachten_artenschutz", "gutachten_ffh", "gutachten_landschaft", "gutachten_blendung", "gutachten_schall", "gutachten_entwaesserung", "gutachten_archaeologie", "gutachten_boden", "gutachten_kampfmittel", "umweltbericht", "offenlage", "abwaegung", "satzungsbeschluss", "rechtskraft", "baugenehmigung"], inArbeit: ["vermarktung"] });
  pflaeche(db, g.p, { bezeichnung: "Randstreifen Nord und Süd (Demo)", eigentuemerName: "Zwei Eigentümer (fiktiv)", ha: 13.5, pachtStatus: "pachtvertrag" });
  entscheidung(db, g.p, { datum: tag(-20), titel: "Verkauf baureif prüfen", art: "strategie", beschluss: "Parallel zum EEG-Gebot Übergabe an die Projektbörse vorbereiten.", beteiligte: "Geschäftsführung" });
  budget(db, g.p, { kategorie: "planung", bezeichnung: "B-Plan gesamt", planEur: 90000, istEur: 88000, istQuelle: "demo" });
  budget(db, g.p, { kategorie: "gutachten", bezeichnung: "Gutachten gesamt", planEur: 55000, istEur: 52000, istQuelle: "demo" });
}
