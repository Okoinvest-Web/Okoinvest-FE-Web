// scripts/eg-gruendung-export.mjs – WP5: Daten und Testvektoren für den Python-Spiegel (plattform/eg_gruendung_kern.py)
//
//   node scripts/eg-gruendung-export.mjs            # schreibt plattform/eg_gruendung_daten.json und eg/testdaten/gruendung/vektoren.json
//   node scripts/eg-gruendung-export.mjs --pruefen  # Exit 1, wenn eine der Dateien veraltet ist
//
// Daten (Vorlagen, Schrittvorlagen, Programme, Anbieterprofile …) kommen aus src/lib/plattform/eg/**, damit es nur EINE
// Quelle gibt. Die Testvektoren rechnet die JS-Implementierung; JS- und Python-Tests vergleichen dagegen (Gleichheitstest).

import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";

const WURZEL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EG = path.join(WURZEL, "src", "lib", "plattform", "eg");
const lade = (d) => import(pathToFileURL(path.join(EG, d)).href);
const ZIEL_DATEN = path.join(WURZEL, "Backend-Import", "oekoinvest_app", "oekoinvest_app", "plattform", "eg_gruendung_daten.json");
const ZIEL_VEKTOREN = path.join(EG, "testdaten", "gruendung", "vektoren.json");

const G = await lade("gruendung.js");
const W = await lade("wechsel.js");
const V = await lade("verein.js");
const S = await lade("statuten.js");
const T = await lade("vertraege.js");
const F = await lade("foerder.js");
const L = await lade("lieferantenpflichten.js");
const NB = (await lade("netzbetreiber.js")).NETZBETREIBER;

// ---------------------------------------------------------------- Daten für Python
export const daten = {
  stand: G.GR_STAND,
  GR_PAKETE: G.GR_PAKETE, GR_STATUS: G.GR_STATUS, GR_AKTIV: G.GR_AKTIV, SCHRITT_STATUS: G.SCHRITT_STATUS, SCHRITT_FERTIG: G.SCHRITT_FERTIG, ZUSTAENDIG: G.ZUSTAENDIG, PHASEN: G.PHASEN,
  GR_SCHRITTE: G.GR_SCHRITTE, WECHSEL_SCHRITTE: G.WECHSEL_SCHRITTE, BUNDESLAENDER_GR: G.BUNDESLAENDER_GR, ALTDIENSTLEISTER: G.ALTDIENSTLEISTER, ZONELEVEL_STANDARD: G.ZONELEVEL_STANDARD,
  SCHRITT_AKTIONEN: G.SCHRITT_AKTIONEN, AUFTRAG_UEBERGAENGE: G.AUFTRAG_UEBERGAENGE, RECHTSFORM_PROFIL: G.RECHTSFORM_PROFIL, UST_SATZ_PCT: G.UST_SATZ_PCT,
  IMPORT_FELDER: W.IMPORT_FELDER, ANBIETER_PROFILE: W.ANBIETER_PROFILE, WP1_CSV_SPALTEN: W.WP1_CSV_SPALTEN, IMPORT_STATUS: W.IMPORT_STATUS, IMPORT_MAX_ZEILEN: W.IMPORT_MAX_ZEILEN,
  BESCHLUSS_GREMIEN: V.BESCHLUSS_GREMIEN, BESCHLUSS_KATEGORIEN: V.BESCHLUSS_KATEGORIEN, BEITRAG_STATUS: V.BEITRAG_STATUS, BEITRAG_ARTEN: V.BEITRAG_ARTEN, BEITRAG_EINHEBUNG: V.BEITRAG_EINHEBUNG,
  VERG_PFLICHTINHALTE: S.VERG_PFLICHTINHALTE,
  VORLAGEN: T.VORLAGEN, MUSTER_HINWEIS: T.MUSTER_HINWEIS, OEKOINVEST: T.OEKOINVEST, VORLAGEN_STAND: T.VORLAGEN_STAND,
  FOERDER_PROGRAMME: F.FOERDER_PROGRAMME, EAG_PV_KATEGORIEN: F.EAG_PV_KATEGORIEN, FOERDER_ERGEBNIS: F.FOERDER_ERGEBNIS, FOERDER_STAND: F.FOERDER_STAND,
  AENDERUNG_VORLAUF_TAGE: L.AENDERUNG_VORLAUF_TAGE,
};

// ---------------------------------------------------------------- Testvektoren
const H = "2026-10-01";
const M = { G, W, V, S, T, F, L };
const faelle = [];
function fall(modul, fn, ...args) {
  const f = { id: `${modul}.${fn}#${faelle.filter((x) => x.fn === fn).length + 1}`, modul, fn, args: JSON.parse(JSON.stringify(args)) };
  try {
    f.erwartet = JSON.parse(JSON.stringify(M[modul][fn](...structuredClone(args))));
  } catch (e) {
    f.fehler = { status: e.status || 0, text: e.message };
  }
  faelle.push(f);
  return f.erwartet;
}

// Gründung
const aBasis = { paket: "gruendung", arbeitsname: "Sonne Musterdorf", plz: "5121", ort: "Ostermiething", modell: "eeg", netzbetreiberId: "ENB-OOE", erzeugungKwp: 85, ansprechpartner: { name: "A", email: "A@Example.com" } };
const a1 = fall("G", "auftragBereinigen", aBasis);
fall("G", "auftragBereinigen", { ...aBasis, plz: "51" });
fall("G", "auftragBereinigen", { ...aBasis, zonelevel: 6 });
fall("G", "auftragBereinigen", { ...aBasis, modell: "gea", rechtsform: "verein" });
fall("G", "auftragBereinigen", { ...aBasis, modell: "gea", zonelevel: 1 });
fall("G", "auftragBereinigen", { ...aBasis, paket: "wechsel", bestehend: { name: "EEG Alt", altdienstleister: "eegfaktura", marktpartnerId: "rc 105163", mitglieder: "42", letzteAbrechnung: "2026-08" } });
fall("G", "auftragBereinigen", { ...aBasis, paket: "wechsel", bestehend: { name: "EEG Alt", marktpartnerId: "CC105163" } });
fall("G", "auftragBereinigen", { ...aBasis, paket: "x" });
fall("G", "auftragHinweise", { ...a1, erzeugungKwp: 150, gemeindeBeteiligt: true }, { heute: H });
fall("G", "auftragHinweise", { ...a1, modell: "beg", zonelevel: 7 }, { heute: "2026-10-06" });
fall("G", "auftragHinweise", { ...a1, paket: "wechsel", bestehend: { verteilmodell: "statisch" } }, { heute: H });
fall("G", "angebotBereinigen", { betragNetto: "1990,50", gueltigTage: 30 }, { heute: H, paket: "gruendung" });
fall("G", "angebotBereinigen", { betragNetto: 100, gueltigBis: "2026-09-01" }, { heute: H, paket: "check" });
fall("G", "angebotBereinigen", {}, { heute: H, paket: "check" });
fall("G", "plusTage", "2026-02-27", 2);
fall("G", "tageBis", "2026-10-01", "2026-12-25");
const aufAuftrag = { ...a1, auftragAm: "2026-09-01", status: "beauftragt" };
const s1 = fall("G", "schritteErzeugen", aufAuftrag);
fall("G", "schritteErzeugen", { ...a1, paket: "komplett", modell: "beg", zonelevel: 6, rechtsform: "egen", erzeugungKwp: 150 });
fall("G", "schritteErzeugen", { ...a1, modell: "gea", zonelevel: 1, rechtsform: "keine" });
fall("G", "schritteErzeugen", { ...a1, paket: "check" });
fall("G", "schritteErzeugen", { ...a1, paket: "wechsel", erzeugungKwp: 135, organisator: true });
fall("G", "schritteErzeugen", { ...a1, modell: "p2p", zonelevel: 3, rechtsform: "keine" });
const vorhanden = s1.map((x) => (x.schluessel === "interessenten" ? { ...x, status: "erledigt", datum: "2026-09-10" } : x.schluessel === "vereinsanzeige" ? { ...x, status: "in_arbeit", gestartetAm: "2026-09-20" } : x));
const s2 = fall("G", "schritteErzeugen", { ...aufAuftrag, rechtsform: "egen" }, { vorhanden });
const reif = s1.map((x) => {
  if (["interessenten", "nb_auskunft", "smart_meter", "simulation", "rechtsform", "statuten", "gruendungsversammlung"].includes(x.schluessel)) return { ...x, status: "erledigt", datum: "2026-09-15", gestartetAm: "2026-09-10" };
  if (x.schluessel === "vereinsanzeige") return { ...x, status: "erledigt", datum: "2026-09-18" };
  if (x.schluessel === "zvr") return { ...x, status: "wartet_extern", gestartetAm: "2026-09-18" };
  if (x.schluessel === "organe") return { ...x, status: "in_arbeit", gestartetAm: "2026-09-16", fristManuell: "2026-09-25" };
  return x;
});
fall("G", "schritteAnreichern", reif, aufAuftrag, { heute: H });
fall("G", "schrittFrist", reif.find((x) => x.schluessel === "zvr"), reif, aufAuftrag);
fall("G", "fristAmpel", "2026-10-05", H, "offen");
fall("G", "fristAmpel", "2026-09-05", H, "erledigt");
fall("G", "auftragStatusAusSchritten", aufAuftrag, reif);
fall("G", "auftragStatusAusSchritten", { ...aufAuftrag, status: "angebot" }, reif);
fall("G", "auftragStatusAusSchritten", aufAuftrag, reif.map((x) => ({ ...x, status: "erledigt" })));
fall("G", "auftragFortschritt", reif, { heute: H, auftrag: aufAuftrag });
const zvr = reif.find((x) => x.schluessel === "zvr");
fall("G", "schrittAktion", zvr, "erledigen", { wert: "123 456 789", heute: H, von: "U-1", paket: "gruendung" });
fall("G", "schrittAktion", zvr, "erledigen", { wert: "12", heute: H });
fall("G", "schrittAktion", zvr, "erledigen", { wert: "123456789", datum: "2026-10-02", heute: H });
fall("G", "schrittAktion", reif.find((x) => x.schluessel === "bank"), "starten", { heute: H });
fall("G", "schrittAktion", reif.find((x) => x.schluessel === "bank"), "entfaellt", { heute: H });
fall("G", "schrittAktion", reif.find((x) => x.schluessel === "creditor_id"), "entfaellt", { heute: H, grund: "keine Lastschrift" });
fall("G", "schrittAktion", reif.find((x) => x.schluessel === "interessenten"), "wiedereroeffnen", { heute: H });
fall("G", "schrittAktion", reif.find((x) => x.schluessel === "interessenten"), "starten", { heute: H });
fall("G", "schrittAktion", reif.find((x) => x.schluessel === "bank"), "frist", { heute: H, frist: "2026-11-01" });
fall("G", "schrittAktion", reif.find((x) => x.schluessel === "datenschutz"), "erledigen", { heute: H, notiz: "VVT angelegt", nachweis: { titel: "VVT", dokumentId: "D-1" } });
fall("G", "schrittAktion", reif.find((x) => x.schluessel === "vertraege"), "erledigen", { heute: H });
fall("G", "schrittAktion", reif.find((x) => x.schluessel === "bank"), "xyz", { heute: H });
fall("G", "schrittAktion", reif.find((x) => x.schluessel === "betreibervertrag"), "erledigen", { heute: H, gemeinschaft: { modell: "eeg", marktpartnerId: "RC104444", gemeinschaftsId: "AT00300005121RC104444000000000099" } });
for (const [f, w, o] of [["zvrZahl", "1234567890"], ["firmenbuchnummer", "FN 541505g"], ["firmenbuchnummer", "541505"], ["iban", "AT61 1904 3002 3457 3201"], ["iban", "AT611904300234573202"], ["creditorId", "at98zzz00000000417"], ["creditorId", "AT98ZZZ1"], ["marktpartnerId", "RC123456", { modell: "eeg" }], ["marktpartnerId", "CC123456", { modell: "eeg" }], ["gemeinschaftsId", "ATCC9999DYNAMCC123456000000000001", { modell: "beg" }], ["gemeinschaftsId", "AT0030000512", { modell: "eeg" }], ["uid", "atu 12345678"], ["uid", "ATU1"], ["edaAnbindung", "kep"], ["edaAnbindung", "fax"], ["steuernummer", " 12 345/6789 "], ["zvrZahl", ""]]) fall("G", "feldwertPruefen", f, w, o || {});
for (const s of ["betreibervertrag", "organisator_anzeige", "organisator_vollmacht", "ust_option", "statuten", "zvr", "eda_bereit"]) {
  const x = { ...(reif.find((y) => y.schluessel === s) || {}), schluessel: s, status: "erledigt", datum: "2026-10-01", wert: s === "ust_option" ? "ATU12345678" : s === "zvr" ? "123456789" : "" };
  fall("G", "schrittWirkung", x, { auftrag: aufAuftrag, gemeinschaft: { dienstleistung: { seit: "2026-05-01" } } });
}
fall("G", "schrittWirkung", { schluessel: "dl_vertrag_avv", status: "erledigt", datum: H, wert: "" }, { auftrag: { ...aufAuftrag, paket: "wechsel" }, gemeinschaft: null });
for (const [v, n] of [["interesse", "in_gruendung"], ["in_gruendung", "vertrag_nb"], ["interesse", "marktpartner"], ["in_gruendung", "aktiv"], ["aktiv", "in_gruendung"], ["rechtsperson", "rechtsperson"], ["foo", "aktiv"]]) fall("G", "statusPfad", v, n);
const gTeil = { modell: "eeg", rechtsform: "verein", zvrZahl: "123456789", marktpartnerId: "", gemeinschaftsId: "", netzbetreiber: ["ENB-OOE"], edaAnbindung: "anwenderportal", dienstleistung: { aktiv: true }, organisatorAngezeigtAm: "", status: "rechtsperson" };
fall("G", "edaBereitPruefen", gTeil, { schritte: reif, organisator: true });
fall("G", "edaBereitPruefen", { ...gTeil, marktpartnerId: "RC1", gemeinschaftsId: "AT1", organisatorAngezeigtAm: H, status: "vertrag_nb" }, { schritte: reif.map((x) => ({ ...x, status: "erledigt" })) });
fall("G", "edaBereitPruefen", null, {});
fall("G", "rechtsformEmpfehlung", { modell: "eeg", erwarteteMitglieder: 40 });
fall("G", "rechtsformEmpfehlung", { modell: "beg", investitionGeplant: true, erzeugungKwp: 300, gemeindeBeteiligt: true, erwarteteMitglieder: 500 });
fall("G", "rechtsformEmpfehlung", { modell: "eeg", erwarteteMitglieder: 400 });
fall("G", "rechtsformEmpfehlung", { modell: "gea" });
const gVoll = { name: "EEG Sonne (Test)", modell: "eeg", zonelevel: 3, rechtsform: "verein", sitzAdresse: { strasse: "Weg 1", plz: "5121", ort: "Ostermiething" }, zvrZahl: "123456789", iban: "AT611904300234573201", steuernummer: "", ustStatus: "kleinunternehmer", marktpartnerId: "RC104444", gemeinschaftsId: "", netzbetreiber: ["ENB-OOE"], verteilmodell: "dynamisch", nahebereichRef: "TS-1", dienstleistung: { aktiv: true }, email: "eg@example.com", kennzahlen: { erzeugungsleistungKw: 120 } };
const organe = [{ funktion: "obmann", personName: "Otto O", funktionLabel: "Obmann / Obfrau", status: "aktiv" }, { funktion: "kassier", name: "Karin K", status: "aktiv" }, { funktion: "rechnungspruefer", name: "Paul P", status: "aktiv" }];
for (const art of ["vereinsanzeige", "finanzamt", "ust", "elabg", "ebutilities", "betreibervertrag", "eda_zugang", "rechtsform", "unbekannt"]) fall("G", "formularHilfe", art, { gemeinschaft: gVoll, netzbetreiber: NB, organe, auftrag: { ...a1, erwarteteMitglieder: 120 }, zaehlpunkte: 0 });
fall("G", "formularHilfe", "betreibervertrag", { gemeinschaft: null, netzbetreiber: NB, auftrag: { ...a1, modell: "beg", rechtsform: "verein" } });
fall("G", "auftraegeKennzahlen", [{ ...aufAuftrag, schritte: reif }, { ...a1, status: "anfrage", schritte: [] }, { ...a1, status: "angebot", paket: "wechsel", schritte: [] }, { ...a1, status: "uebergeben", schritte: [] }], { heute: H });
fall("G", "auftragUebergang", { status: "angebot", angebot: { gueltigBis: "2026-09-30" } }, "annehmen", { heute: H });
fall("G", "auftragUebergang", { status: "angebot", angebot: { gueltigBis: "2026-10-30" } }, "annehmen", { heute: H });
fall("G", "auftragUebergang", { status: "beauftragt" }, "annehmen", { heute: H });
fall("G", "auftragUebergang", { status: "eda" }, "abbrechen", { heute: H });

// Wechsel
for (const s of ["Zählpunkt-Nummer", " E-Mail ", "Teilnahme_Faktor (%)", "Straße"]) fall("W", "spalteNormalisieren", s);
const csv1 = '﻿Mitgliedsnr;Vorname;Nachname;Firma;E-Mail;IBAN;Mandatsreferenz;Mandatsdatum;Zählpunkt;Energierichtung;Teilnahmefaktor;Consent-ID;Aktiv seit;kWp;Bezugspreis;Einspeisepreis;Saldo;Status;Mitgliedsart;Steuerstatus;UID\n'
  + '001;Max;Muster;;max@example.com;AT611904300234573201;M-1;01.02.2024;AT0030000000000000000000000000001;Bezug;100;C-1;01.03.2024;;11,5;8,5;-12,40;aktiv;privat;;\n'
  + '001;Max;Muster;;max@example.com;AT611904300234573201;M-1;01.02.2024;AT 003000 00000 000000000000000000002;Einspeisung;0,6;Migration;2022-09-01;9,9;11,5;8,5;;aktiv;privat;Kleinunternehmer;\n'
  + '2;"Huber; Anna";Huber;;anna@example.com;AT611904300234573202;;;AT0030000000000000000000000000003;Verbrauch;100;;;;11,5;8,5;;aktiv;;;\n'
  + '3;;;"Metall Groß GmbH";info@example.com;;;;AT0030000000000000000000000000003;CONSUMPTION;150;;;;12;9;;aktiv;Großunternehmen;regelbesteuert;\n'
  + '4;Lisa;Lang;;lisa@example.com;;;;ATX;Bezug;50;;;;;;;neu;;;\n'
  + '5;Karl;Klein;;;;;;;;;;;;;;20;aktiv;;;\n';
const t1 = fall("W", "tabelleLesen", csv1);
fall("W", "tabelleLesen", "Name\tZählpunkt\tTF\nA\tAT0030000000000000000000000000009\t40\n\nB\t\t");
fall("W", "tabelleLesen", "a,b\n\"x,1\",\"he said \"\"hi\"\"\"\n");
fall("W", "tabelleLesen", "");
fall("W", "anbieterErkennen", t1.kopfNorm);
fall("W", "anbieterErkennen", ["participantnumber", "meteringpoint", "participationfactor", "firstname"]);
fall("W", "anbieterErkennen", ["foo"]);
const z1 = fall("W", "zuordnungVorschlagen", t1.kopfNorm);
fall("W", "zuordnungVorschlagen", ["name", "vorname", "zaehlpunktnummer", "tnf", "leistungkwp"]);
fall("W", "zuordnungVorschlagen", ["name", "zp", "anteil"]);
fall("W", "zuordnungBereinigen", { vorname: 1, nachname: "2", foo: 3, email: 99, zaehlpunkt: 1 }, 5);
for (const v of ["1.234,5", "1234.5", "12 %", "", "abc", "8,5 ct", "-12,40"]) fall("W", "zahlLesen", v);
for (const v of ["01.03.2024", "1.3.24", "2024-03-01", "31.02.2024", "x"]) fall("W", "datumLesen", v);
for (const v of ["100", "100 %", "0,6", "1", "60.5", ""]) fall("W", "tfLesen", v);
const ds1 = fall("W", "zeilenAbbilden", t1.zeilen, z1);
const gEeg = { modell: "eeg", netzbetreiber: ["ENB-OOE"], verteilmodell: "dynamisch" };
fall("W", "plausibilitaet", ds1, { gemeinschaft: gEeg, netzbetreiber: NB, bestandZaehlpunkte: ["AT0030000000000000000000000000001"] });
fall("W", "plausibilitaet", ds1, { gemeinschaft: { modell: "gea", netzbetreiber: ["ENB-WIEN"], verteilmodell: "statisch" }, netzbetreiber: NB });
fall("W", "importPlan", ds1, { bestand: [{ mitgliedsnummer: 7, email: "anna@example.com" }], ausschliessen: [5, 6] });
fall("W", "importPlan", [], {});
fall("W", "umstellungsplan", { stichtag: "2026-12-01", heute: H });
fall("W", "umstellungsplan", { stichtag: "2026-10-15", heute: H });
fall("W", "umstellungsplan", { stichtag: "", heute: H });
fall("W", "kontrollVergleich", [{ schluessel: "1", name: "A", kwh: 100, betragEur: 11.5 }, { schluessel: "2", kwh: 50, betragEur: 5.75 }, { schluessel: "3", kwh: 10, betragEur: 1 }], [{ schluessel: "1", kwh: 100.2, betragEur: 11.52 }, { schluessel: "2", kwh: 60, betragEur: 6.9 }, { schluessel: "4", kwh: 5, betragEur: 0.5 }], {});
fall("W", "kontrollVergleich", [{ schluessel: "1", kwh: 10, betragEur: 1 }], [{ schluessel: "1", kwh: 10, betragEur: 1.2 }], { toleranzEur: 0.1 });
// Integration WP4 → WP5: Probe-Periode und Belege der Probe-Abrechnung als Kontrollwerte
fall("W", "probePeriode", { von: "2026-09-01", bis: "2026-09-30" });
fall("W", "probePeriode", { von: "2026-07-01", bis: "2026-09-30" });
fall("W", "probePeriode", { von: "2026-01-01", bis: "2026-09-30" });
fall("W", "probePeriode", {});
fall("W", "probeKontrollwerte", [{ mitgliedsnummer: 1, typ: "rechnung", empfaenger: { name: "A" }, energie: { eigendeckung: 120.5 }, summen: { netto: 13.86 } }, { mitgliedsnummer: 1, typ: "gutschrift", empfaenger: { name: "A" }, energie: { eingebracht: 300 }, summen: { netto: 24 } }, { mitgliedsnummer: 2, typ: "rechnung", summen: { netto: 5 } }, { typ: "rechnung" }]);
fall("W", "probeKontrollwerte", null);
fall("W", "elwgAnpassung", { ...gVoll, modell: "beg", kennzahlen: { lieferantenpflichten: true }, organisatorAngezeigtAm: "" }, { mitglieder: [{ status: "aktiv", abrechnungsrhythmus: "" }, { status: "ausgeschieden" }], dokumente: [{ vorlage: "datenschutz", stand: "2026-10-01" }, { vorlage: "agb", stand: "2025-01-01" }], stichtag: "2027-01-01" });
fall("W", "elwgAnpassung", { modell: "eeg", rechtsform: "verein", statutenVersion: "Statuten ElWG 2026", zonelevel: 3, nahebereichRef: "TS", kennzahlen: {} }, { mitglieder: [{ status: "aktiv", art: "grossunternehmen" }] });
fall("W", "wechselNachricht", { name: "EEG X", stichtag: "2026-12-01", altdienstleister: "EEG Faktura" });
fall("W", "wechselNachricht", {});

// Verein
const og = (f, k, von, bis = "", extra = {}) => ({ id: `O-${f}-${k}`, gemeinschaftId: "G1", funktion: f, kontoId: k, name: k ? "" : `Name ${f}`, von, bis, status: "aktiv", zeichnungsberechtigt: false, ...extra });
const organeV = [og("obmann", "U1", "2024-01-01", "", { zeichnungsberechtigt: true, personName: "Otto" }), og("kassier", "U2", "2023-10-15", "", { zeichnungsberechtigt: true }), og("rechnungspruefer", null, "2025-01-01"), og("rechnungspruefer", "U1", "2025-01-01"), og("schriftfuehrer", "U3", "2020-01-01", "2026-09-30"), { ...og("vorstand", "U9", "2026-01-01"), gemeinschaftId: "G2" }];
fall("V", "organCheck", { id: "G1", rechtsform: "verein" }, organeV, { heute: H });
fall("V", "organCheck", { id: "G1", rechtsform: "verein" }, organeV, { heute: H, funktionsperiodeJahre: 2, vorlaufTage: 30 });
fall("V", "organCheck", { id: "G1", rechtsform: "egen" }, [og("vorstand", "U1", "2025-01-01")], { heute: H });
fall("V", "organCheck", { id: "G1", rechtsform: "gmbh" }, [], { heute: H });
fall("V", "gvKonfig", { name: "X", rechtsform: "verein" }, { onlineGv: false, einladungsfristTage: "21" });
fall("V", "gvPflicht", { rechtsform: "verein", versammlungen: [{ status: "abgeschlossen", art: "ordentlich", datum: "2024-05-10T19:00" }, { status: "abgeschlossen", art: "ausserordentlich", datum: "2026-01-10T19:00" }], heute: H, turnusJahre: 3 });
fall("V", "gvPflicht", { rechtsform: "egen", versammlungen: [{ status: "abgeschlossen", datum: "2025-06-01T18:00" }], heute: H });
fall("V", "gvPflicht", { rechtsform: "verein", versammlungen: [], heute: H, gegruendetAm: "" });
fall("V", "gvPflicht", { rechtsform: "verein", versammlungen: [], heute: H, turnusJahre: 9, gegruendetAm: "2022-01-01" });
fall("V", "gvTagesordnungVorlage", { art: "ordentlich", rechtsform: "verein", wahl: true, tarif: true, beitrag: true, elwg: true, organisator: true, wechsel: true });
fall("V", "gvTagesordnungVorlage", { art: "ausserordentlich", rechtsform: "egen", aufloesung: true });
fall("V", "beschlussBereinigen", { gremium: "vorstand", datum: "2026-09-30", gegenstand: "Tarif 2027", kategorie: "tarif", ja: 3, nein: 1, text: "Zeile 1\r\nZeile 2" }, { heute: H });
fall("V", "beschlussBereinigen", { gremium: "gv", datum: "2026-09-30", gegenstand: "Statuten ElWG", kategorie: "statuten", ja: 20, nein: 10, mehrheit: "einfach" }, { heute: H });
fall("V", "beschlussBereinigen", { gremium: "vorstand", datum: "2026-09-30", gegenstand: "Statuten", kategorie: "statuten", ja: 3 }, { heute: H });
fall("V", "beschlussBereinigen", { gremium: "umlauf", datum: "2026-09-30", gegenstand: "Wahl", kategorie: "wahl", ja: 3 }, { heute: H });
fall("V", "beschlussBereinigen", { gremium: "gv", datum: "2026-10-02", gegenstand: "X Y", ja: 1 }, { heute: H });
fall("V", "beschlussBereinigen", { gremium: "gv", datum: "2026-09-02", gegenstand: "X Y" }, { heute: H });
fall("V", "beschlussBereinigen", { gremium: "x" }, { heute: H });
const gvT = { id: "GV1", datum: "2026-09-20T19:00", tagesordnung: [{ id: "T1", titel: "Beschluss über Tarife und Preisblatt", beschluss: true, mehrheit: "einfach", satzung: false }, { id: "T2", titel: "Änderung der Statuten", beschluss: true, mehrheit: "zweidrittel", satzung: true }, { id: "T3", titel: "Wahl des Vorstands", beschluss: true }, { id: "T4", titel: "Freiwillige Auflösung", beschluss: true, satzung: true }] };
fall("V", "beschluesseAusVersammlung", gvT, { tops: [{ id: "T1", titel: "Beschluss über Tarife und Preisblatt", ja: 10, nein: 2, enthaltung: 1, mehrheit: "einfach", angenommen: true }, { id: "T2", titel: "Änderung der Statuten", ja: 5, nein: 5, enthaltung: 0, mehrheit: "zweidrittel", angenommen: false }, { id: "T3", titel: "Wahl des Vorstands", ja: 9, nein: 0, enthaltung: 0, mehrheit: "einfach", angenommen: true }, { id: "T4", titel: "Freiwillige Auflösung", ja: 1, nein: 9, enthaltung: 0, mehrheit: "zweidrittel", angenommen: false }] });
const mgl = [{ id: "M1", status: "aktiv", beitrittAm: "2024-03-01" }, { id: "M2", status: "aufgenommen", beitrittAm: "2026-07-15" }, { id: "M3", status: "gekuendigt", beitrittAm: "2023-01-01", austrittZum: "2025-12-31" }, { id: "M4", status: "antrag" }, { id: "M5", status: "aktiv", beitrittAm: "2027-01-01" }, { id: "M6", status: "aktiv", beitrittAm: "" }];
const bt = fall("V", "beitraegeVorschreiben", { mitglieder: mgl, jahr: 2026, betragJahr: 12, beitrittsgebuehr: 20, anteilig: true, vorhandene: [{ mitgliedId: "M6", jahr: 2026, art: "jahresbeitrag" }] });
fall("V", "beitraegeVorschreiben", { mitglieder: mgl, jahr: "2026", betragJahr: 0, beitrittsgebuehr: 20, faelligAm: "2026-11-30", vorhandene: [{ mitgliedId: "M2", jahr: 2025, art: "beitrittsgebuehr" }] });
fall("V", "beitraegeVorschreiben", { mitglieder: mgl, jahr: 1999 });
fall("V", "beitragsUebersicht", [...bt.map((b, i) => ({ ...b, status: i === 0 ? "bezahlt" : i === 1 ? "erlassen" : "offen" })), { jahr: 2025, betragEur: 5, status: "offen" }], { jahr: 2026 });
fall("V", "beitragsUebersicht", [], {});
fall("V", "aufloesungCheckliste", { rechtsform: "verein", modell: "eeg", dienstleistung: { aktiv: true } }, { teilnahmenAktiv: 3, offenePosten: 2, stand: { beschluss: { erledigt: true, am: H, notiz: "GV" }, vermoegen: { erledigt: true } } });
fall("V", "aufloesungCheckliste", { rechtsform: "keine", modell: "gea" }, { teilnahmenAktiv: 0, offenePosten: 0, stand: Object.fromEntries(["beschluss", "betreibervertrag", "schlussabrechnung", "vermoegen", "ebutilities", "aufbewahrung"].map((k) => [k, { erledigt: true }])) });

// Statuten und Vorlagen
const e1 = fall("S", "statutenEingaben", { taetigkeitsgebiet: "  Gemeinde   X ", kuendigungsfristWochen: "12", funktionsperiodeJahre: 9, einladungsfristTage: 5, gvTurnusJahre: 3, onlineGv: "nein", tarifeDurch: "gv", geschaeftsanteilEur: "250.4", aufsichtsrat: "ja" });
fall("S", "statutenEingaben", {});
const dGemeinschaft = { ...gVoll, kennzahlen: { erzeugungsleistungKw: 120 }, netzbetreiber: ["ENB-OOE"] };
const tarif = { bezugspreisCt: 11.5, einspeisepreisCt: 8.25, gueltigAb: "2026-07-01", mitgliedsbeitragJahr: 12, einmalgebuehrBeitritt: 20 };
const mitglied = { mitgliedsnummer: 7, person: { vorname: "Mia", nachname: "Muster", strasse: "Gasse 2", plz: "5121", ort: "Ostermiething", email: "mia@example.com" } };
const dd = fall("T", "dokumentDaten", { gemeinschaft: dGemeinschaft, netzbetreiber: NB, tarif, mitglied, zaehlpunkt: { zaehlpunktnummer: "AT0030000000000000000000000000001" }, anlage: { bezeichnung: "PV Dach", kwp: 9.9, nutzungsmodell: "ueberschuss" }, organe, eingaben: { ...e1, ab: "2026-10-01", stichtag: "2026-12-01", letzteAltabrechnung: "2026-11-01", frist: "2026-11-15", versammlungAm: "2026-09-12", anwesende: 12, teilnahmefaktor: 80, gvTurnusJahre: 2, beschwerdeKontakt: "eg@example.com", pachtzins: "500 €", laufzeitJahre: "10" }, heute: H });
fall("T", "dokumentDaten", { auftrag: { ...a1, id: "EGA-1", paketLabel: "Gründung bis EDA-bereit", auftraggeber: { name: "Gemeinde X", anschrift: "Platz 1" }, angebot: { nummer: "ANG-2026-0001", betragNetto: 1990.5, ustEur: 398.1, betragBrutto: 2388.6, gueltigBis: "2026-10-31", leistungen: ["A", "B"] } }, netzbetreiber: NB, heute: H });
fall("T", "dokumentDaten", {});
for (const [w, d] of [["modell=eeg,beg", { modell: "beg" }], ["modell!=gea", { modell: "gea" }], ["onlineGv", { onlineGv: "nein" }], ["!aufsichtsrat", {}], ["lieferantenpflicht&organisator", { lieferantenpflicht: true, organisator: 1 }], ["x=", { x: "" }], ["", {}]]) fall("T", "bedingungErfuellt", w, d);
fall("T", "platzhalterErsetzen", "A {{a}} B {{ b }} C {{c}} {{a}}", { a: 1.5, b: true, c: "" }, []);
const vorlagenHash = {};
for (const id of Object.keys(T.VORLAGEN)) {
  const dok = fall("T", "vorlageRendern", T.VORLAGEN[id], id === "gruendungsauftrag" ? faelle.find((f) => f.fn === "dokumentDaten" && f.args[0].auftrag)?.erwartet : dd);
  vorlagenHash[id] = createHash("sha256").update(dok.text).digest("hex");
}
fall("T", "vorlageRendern", T.VORLAGEN.statuten_verein, { ...dd, modell: "beg", zweckZusatz: "", onlineGv: false, tarifeDurch: "gv" });
fall("T", "vorlagenFuer", { modell: "gea", rechtsform: "keine" });
fall("T", "vorlagenFuer", { modell: "eeg", rechtsform: "egen" });
const dokS = faelle.find((f) => f.fn === "vorlageRendern" && f.args[0].id === "statuten_verein").erwartet;
fall("S", "statutenPruefen", { modell: "eeg", rechtsform: "verein", name: "X", sitzOrt: "Y" }, e1, dokS);
fall("S", "statutenPruefen", { modell: "gea", rechtsform: "gmbh" }, S.statutenEingaben({}), null);
fall("S", "statutenPruefen", { modell: "beg", rechtsform: "egen", name: "X", sitzAdresse: { ort: "Y" } }, S.statutenEingaben({ taetigkeitsgebiet: "A", gvTurnusJahre: 1 }), { abschnitte: [{ titel: "§ 1 Name, Sitz und Tätigkeitsbereich" }], fehlend: ["a"] });

// Förderung und Lieferantenpflichten
fall("F", "foerderCheck", { modell: "eeg", bundesland: "O", antragsteller: "eg", anlagen: [{ art: "pv", kwp: 8, bezeichnung: "Dach A" }, { art: "pv", kwp: 85.5, status: "in_bau" }, { art: "pv", kwp: 1500 }, { art: "speicher", speicherKwh: 30 }, { art: "pv", kwp: 20, status: "in_betrieb" }] });
fall("F", "foerderCheck", { modell: "beg", bundesland: "K", antragsteller: "gemeinde", gemeindeBeteiligt: true, anlagen: [{ art: "wasser", kwp: 200, status: "in_betrieb" }] });
fall("F", "foerderCheck", { modell: "eeg", antragsteller: "privat", anlagen: [{ art: "pv", kwp: 10, status: "in_betrieb" }] });
fall("F", "foerderCheck", {});
const anl = [{ art: "pv", kwp: 60, status: "aktiv", haushalt: false }, { art: "pv", engpassleistungKw: 45, status: "aktiv", haushalt: true }, { art: "pv", kwp: 50, status: "geplant" }, { art: "speicher", kwp: 100, status: "aktiv" }];
fall("L", "lieferantenpflichten", { anlagen: anl, organisator: true, organisatorAngezeigtAm: "", dokumente: [{ vorlage: "agb", stand: "2026-10-01" }], mitglieder: [{ status: "aktiv", abrechnungsrhythmus: "monat" }, { status: "aktiv" }, { status: "ausgeschieden" }], tarife: [{ status: "beschlossen", gueltigAb: "2026-10-20" }], heute: H });
fall("L", "lieferantenpflichten", { anlagen: [{ art: "pv", kwp: 80, status: "aktiv" }, { art: "pv", kwp: 30, status: "geplant" }], heute: H });
fall("L", "lieferantenpflichten", { anlagen: [{ art: "pv", kwp: 20, status: "aktiv" }], heute: H });

const vektoren = { stand: H, erzeugt: "scripts/eg-gruendung-export.mjs", faelle, vorlagenHash };

// ---------------------------------------------------------------- Schreiben bzw. prüfen
const jDaten = JSON.stringify(daten, null, 1) + "\n";
const jVekt = JSON.stringify(vektoren, null, 1) + "\n";
if (process.argv.includes("--pruefen")) {
  const alt1 = fs.existsSync(ZIEL_DATEN) ? fs.readFileSync(ZIEL_DATEN, "utf8") : "";
  const alt2 = fs.existsSync(ZIEL_VEKTOREN) ? fs.readFileSync(ZIEL_VEKTOREN, "utf8") : "";
  const ok = alt1 === jDaten && alt2 === jVekt;
  console.log(ok ? "eg_gruendung_daten.json und vektoren.json aktuell" : "VERALTET – bitte node scripts/eg-gruendung-export.mjs ausführen");
  process.exit(ok ? 0 : 1);
}
fs.mkdirSync(path.dirname(ZIEL_VEKTOREN), { recursive: true });
fs.writeFileSync(ZIEL_DATEN, jDaten);
fs.writeFileSync(ZIEL_VEKTOREN, jVekt);
console.log(`geschrieben: ${path.relative(WURZEL, ZIEL_DATEN)} (${jDaten.length} B), ${path.relative(WURZEL, ZIEL_VEKTOREN)} (${faelle.length} Fälle)`);
