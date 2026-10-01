// scripts/eg-testdaten-stamm.mjs – erzeugt die gemeinsamen Testvektoren WP1 (JS ↔ Python) aus den JS-Regeln:
//   node scripts/eg-testdaten-stamm.mjs            # schreibt src/lib/plattform/eg/testdaten/stamm/vektoren.json
//   node scripts/eg-testdaten-stamm.mjs --pruefen  # Exit 1, wenn die JS-Regeln andere Ergebnisse liefern als die Datei
// Python liest dieselbe Datei (plattform/tests/test_eg_stamm_kern.py) und muss identische Ergebnisse liefern.
// Format: [{ fn, a: [Argumente], erwartet } | { fn, a, fehler: {status, text} }]. Argument "§NB" = Netzbetreiber-Stammliste.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const WURZEL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ZIEL = path.join(WURZEL, "src", "lib", "plattform", "eg", "testdaten", "stamm", "vektoren.json");
const E = await import(pathToFileURL(path.join(WURZEL, "src", "lib", "plattform", "eg", "index.js")).href);

const HEUTE = "2026-10-01";
const NB = "§NB";
const g1 = { id: "EGG-26-AAAAAA", name: "Test-EEG", modell: "eeg", zonelevel: 3, rechtsform: "verein", netzbetreiber: ["ENB-OOE"], verteilmodell: "dynamisch", edaAnbindung: "anwenderportal", status: "aktiv", dienstleistung: { aktiv: true }, gemeinschaftsId: "AT00300004910RC109417000000000001", organisatorAngezeigtAm: "" };
const zpV = { id: "EZP-1", richtung: "verbrauch" };
const zpE = { id: "EZP-2", richtung: "erzeugung" };
const kontextDaten = {
  mitglieder: [
    { id: "M1", gemeinschaftId: g1.id, kontoId: "U-1", art: "privat", status: "aktiv" },
    { id: "M2", gemeinschaftId: g1.id, kontoId: "U-2", art: "gemeinde", status: "aktiv" },
    { id: "M3", gemeinschaftId: g1.id, kontoId: "U-3", art: "privat", status: "antrag" },
    { id: "M4", gemeinschaftId: g1.id, kontoId: null, art: "grossunternehmen", status: "aktiv" },
  ],
  zaehlpunkte: [zpV, zpE],
  teilnahmen: [
    { id: "T1", gemeinschaftId: g1.id, zaehlpunktId: "EZP-1", status: "aktiv", teilnahmefaktor: 100 },
    { id: "T2", gemeinschaftId: g1.id, zaehlpunktId: "EZP-2", status: "aktiv", teilnahmefaktor: 60 },
    { id: "T3", gemeinschaftId: g1.id, zaehlpunktId: "EZP-1", status: "zustimmung_offen", teilnahmefaktor: 50 },
  ],
  anlagen: [
    { gemeinschaftId: g1.id, art: "pv", engpassleistungKw: 80, status: "aktiv" },
    { gemeinschaftId: g1.id, art: "pv", kwp: 31.25, status: "aktiv", haushalt: true },
    { gemeinschaftId: g1.id, art: "pv", kwp: 500, status: "geplant" },
  ],
  organe: [
    { gemeinschaftId: g1.id, kontoId: "U-5", funktion: "kassier", von: "2025-01-01", bis: "", status: "aktiv", name: "K" },
    { gemeinschaftId: g1.id, kontoId: "U-6", funktion: "obmann", von: "2025-01-01", bis: "2026-06-30", status: "aktiv", name: "O alt" },
    { gemeinschaftId: g1.id, kontoId: "U-7", funktion: "rechnungspruefer", von: "2027-01-01", bis: "", status: "aktiv", name: "R neu" },
  ],
};
const t0 = { id: "T9", status: "entwurf", teilnahmefaktor: 40, tfHistorie: [], verlauf: [], gueltigBis: "" };

const F = {
  zaehlpunktPruefen: (s, nb) => E.zaehlpunktPruefen(s, { netzbetreiber: nb || [] }),
  plzAusZaehlpunkt: E.plzAusZaehlpunkt,
  marktpartnerIdPruefen: E.marktpartnerIdPruefen,
  gemeinschaftsIdPruefen: (s, modell, mp, vm) => E.gemeinschaftsIdPruefen(s, { modell, marktpartnerId: mp, verteilmodell: vm }),
  netzentgeltRegel: (datum, modell, zonelevel, netzebene) => E.netzentgeltRegel({ datum, modell, zonelevel, netzebene }),
  reduzierterAp: E.reduzierterAp,
  rundeCt2: E.rundeCt2,
  egRollen: (nutzer, heute) => E.egRollen({ nutzer, gemeinschaft: g1, organe: kontextDaten.organe, mitglieder: kontextDaten.mitglieder, heute }),
  egStufe: E.egStufe,
  erzeugungsleistung: E.erzeugungsleistung,
  anlageBereinigen: E.anlageBereinigen,
  gemeinschaftBereinigen: (d) => E.gemeinschaftBereinigen(d, { netzbetreiberIds: E.NETZBETREIBER.map((x) => x.id) }),
  organBereinigen: E.organBereinigen,
  organHinweise: (g, heute) => E.organHinweise(g, kontextDaten.organe, heute),
  kennzahlen: (g) => E.kennzahlen(g, kontextDaten),
  gemeinschaftHinweise: (g, heute) => E.gemeinschaftHinweise(g, kontextDaten, { heute }),
  istGrossunternehmen: E.istGrossunternehmen,
  mitgliedBereinigen: (d, g) => E.mitgliedBereinigen(d, { gemeinschaft: g }),
  naechsteMitgliedsnummer: (liste, gid) => E.naechsteMitgliedsnummer(liste, gid),
  zaehlpunktBereinigen: (d, nb) => E.zaehlpunktBereinigen(d, { netzbetreiber: nb || [] }),
  teilnahmeBereinigen: (d, g) => E.teilnahmeBereinigen(d, { gemeinschaft: g }),
  teilnahmeRegeln: (liste, neu, fremdTf, fremdAnzahl) => E.teilnahmeRegeln(liste, neu, { fremdTf, fremdAnzahl }),
  tfAm: E.tfAm,
  tarifBereinigen: E.tarifBereinigen,
  tarifAm: E.tarifAm,
  tarifVersionieren: E.tarifVersionieren,
  preisFuer: (t, lokal, mid) => E.preisFuer(t, lokal, { mitgliedId: mid }),
  verteilschluesselBereinigen: E.verteilschluesselBereinigen,
  gemeinschaftUebergang: (g, nach, grund) => E.gemeinschaftUebergang(g, nach, { grund }),
  mitgliedUebergang: (m, nach, grund, zum) => E.mitgliedUebergang(m, nach, { grund, zum }),
  teilnahmeUebergang: (t, ereignis, o) => E.teilnahmeUebergang(t, ereignis, o),
  migrationAusPrototyp: (alt, heute) => {
    let i = 0;
    return E.migrationAusPrototyp(alt, { neueId: (p) => `${p}-26-${String(++i).padStart(6, "0")}`, heute, namen: (id) => (id === "U-1" ? { vorname: "Mia", nachname: "Muster", email: "mia@example.com" } : null) });
  },
};

const ZP = "AT0030000491000000000000000D000001";
const ZP_OK = "AT003000049100000000000000D000001".padEnd(33, "0").slice(0, 33);
const tarif = { id: "TA", status: "aktiv", gueltigAb: "2026-01-01", gueltigBis: "", bezugspreisCt: 11.5, einspeisepreisCt: 8.5, zeitfenster: [{ id: "Z1", label: "Mittag", tage: [], von: "11:00", bis: "15:00", monate: [4, 5, 6, 7, 8, 9], bezugspreisCt: 9.5, einspeisepreisCt: null }, { id: "Z2", label: "Nacht", tage: ["sa", "so"], von: "22:00", bis: "06:00", monate: [], bezugspreisCt: 10, einspeisepreisCt: 7 }], individuell: [{ mitgliedId: "M1", bezugspreisCt: 9, einspeisepreisCt: null, grund: "Sozialtarif" }] };
const FAELLE = [
  ["zaehlpunktPruefen", [ZP_OK, NB]], ["zaehlpunktPruefen", ["at 003000 04910 0000000000000D000001", NB]], ["zaehlpunktPruefen", [ZP, NB]], ["zaehlpunktPruefen", ["", NB]],
  ["zaehlpunktPruefen", ["DE0030000491000000000000000D00000", NB]], ["zaehlpunktPruefen", ["AT0099990491000000000000000D0000a", NB]], ["zaehlpunktPruefen", ["AT00999904910000000000000D0000001", NB]],
  ["zaehlpunktPruefen", ["AT00300051210000000000000D0000001", NB]], ["zaehlpunktPruefen", ["AT00300000000000000000000D0000001", null]], ["zaehlpunktPruefen", ["AT0010000114000000000000000000009", NB]],
  ["plzAusZaehlpunkt", [ZP_OK]], ["plzAusZaehlpunkt", ["AT00300000000000000000000D0000001"]],
  ["marktpartnerIdPruefen", ["RC100015", "eeg"]], ["marktpartnerIdPruefen", ["cc 123456", "beg"]], ["marktpartnerIdPruefen", ["RC100015", "beg"]], ["marktpartnerIdPruefen", ["", "eeg"]], ["marktpartnerIdPruefen", ["PP123456", "p2p"]], ["marktpartnerIdPruefen", ["P123", "p2p"]],
  ["gemeinschaftsIdPruefen", ["AT00300004910RC109417000000000001", "eeg", "RC109417", "dynamisch"]], ["gemeinschaftsIdPruefen", ["AT00300004910RC109417000000000001", "eeg", "RC100015", ""]], ["gemeinschaftsIdPruefen", ["AT00300004910GC109417000000000001", "eeg", "", ""]],
  ["gemeinschaftsIdPruefen", ["ATCC9999DYNAMCC123456ABCDEF123456", "beg", "CC123456", "statisch"]], ["gemeinschaftsIdPruefen", ["ATCC9999XXXXXCC123456ABCDEF123456", "beg", "", ""]], ["gemeinschaftsIdPruefen", ["AT00100001140GC100733000000000001", "gea", "GC100733", "statisch"]],
  ["gemeinschaftsIdPruefen", ["AT123", "eeg", "", ""]], ["gemeinschaftsIdPruefen", ["AT0000000000000000000000000000001", "p2p", "", ""]], ["gemeinschaftsIdPruefen", ["", "eeg", "", ""]],
  ...[["2026-11-03", "eeg", 3, 7], ["2026-11-03", "eeg", 4, 6], ["2026-11-03", "eeg", 5, 4], ["2026-11-03", "beg", 6, 7], ["2026-11-03", "gea", 1, 7], ["2026-12-31", "eeg", 3, 6], ["2027-01-01", "eeg", 3, 7], ["2027-01-01", "beg", 3, 7], ["2027-03-01", "beg", 1, 7], ["2027-03-01", "p2p", 6, 5], ["2026-11-03", "eeg", 3, 5], ["2026-11-03", "eeg", 3, null]].map((a) => ["netzentgeltRegel", a]),
  ["reduzierterAp", [5.005, 57]], ["reduzierterAp", [4.3, 28]], ["reduzierterAp", [3.125, 64]], ["reduzierterAp", [6, 0]], ["rundeCt2", [1.005]], ["rundeCt2", [2.675]], ["rundeCt2", [-1.005]],
  ["egRollen", [{ id: "U-1", rollen: ["mitglied"] }, HEUTE]], ["egRollen", [{ id: "U-2", rollen: ["kommune"] }, HEUTE]], ["egRollen", [{ id: "U-3", rollen: ["mitglied"] }, HEUTE]], ["egRollen", [{ id: "U-5", rollen: ["mitglied"] }, HEUTE]],
  ["egRollen", [{ id: "U-6", rollen: ["mitglied"] }, HEUTE]], ["egRollen", [{ id: "U-6", rollen: ["mitglied"] }, "2026-06-30"]], ["egRollen", [{ id: "U-7", rollen: ["mitglied"] }, HEUTE]], ["egRollen", [{ id: "A", rollen: ["admin"] }, HEUTE]],
  ["egRollen", [{ id: "A", rollen: ["admin"], backofficeRollen: ["lesen"] }, HEUTE]], ["egRollen", [{ id: "A", rollen: ["admin"], backofficeRollen: ["akquise"] }, HEUTE]], ["egRollen", [{ id: "A", rollen: ["admin"], backofficeRollen: ["eg"] }, HEUTE]],
  ...[["kassier", "abrechnung_freigabe_1"], ["kassier", "abrechnung_freigabe_2"], ["vorstand", "abrechnung_freigabe_2"], ["rechnungspruefer", "buchhaltung_pruefen"], ["mitglied", "mitgliederliste"], ["organisator", "eda_ausloesen"]].map(([r, recht]) => ["egStufe", [{ rollen: [r], backofficeStufe: 0 }, recht]]),
  ["egStufe", [{ rollen: ["organisator"], backofficeStufe: 1 }, "eda_ausloesen"]], ["egStufe", [{ rollen: ["vorstand"], backofficeStufe: 0, selbstverwaltung: true }, "abrechnung_versand"]], ["egStufe", [{ rollen: ["kassier"], backofficeStufe: 0, selbstverwaltung: false }, "abrechnung_versand"]], ["egStufe", [{ rollen: ["rechnungspruefer"], selbstverwaltung: true }, "abrechnung_versand"]], ["egStufe", [{ rollen: ["organisator"], backofficeStufe: 2, selbstverwaltung: false }, "abrechnung_versand"]], ["egStufe", [{ rollen: [], backofficeStufe: 2 }, "stammdaten"]], ["egStufe", [{ rollen: [], backofficeStufe: 2 }, "sepa"]], ["egStufe", [{ rollen: ["mitglied", "kassier"], backofficeStufe: 0 }, "sepa"]], ["egStufe", [{ rollen: ["x"] }, "unbekannt"]],
  ["erzeugungsleistung", [kontextDaten.anlagen]], ["erzeugungsleistung", [[{ art: "pv", kwp: 30.5, status: "aktiv", haushalt: true }]]], ["erzeugungsleistung", [[{ art: "speicher", speicherKwh: 200, status: "aktiv" }, { art: "wind", engpassleistungKw: 100, status: "aktiv" }]]],
  ["anlageBereinigen", [{ bezeichnung: "PV Dach", art: "pv", kwp: "9,9", ausrichtung: 10.4, standort: { lat: 48.2, lon: 13.5 } }]], ["anlageBereinigen", [{ bezeichnung: "PV", art: "pv" }]], ["anlageBereinigen", [{ bezeichnung: "Speicher", art: "speicher" }]], ["anlageBereinigen", [{ bezeichnung: "Groß", art: "wind", engpassleistungKw: 7000 }]], ["anlageBereinigen", [{ art: "pv", kwp: 1 }]],
  ["gemeinschaftBereinigen", [{ name: "Neu (Test)", modell: "eeg", zonelevel: 3, netzbetreiber: ["ENB-OOE"], marktpartnerId: "rc109417", gemeinschaftsId: "AT00300004910RC109417000000000001", sitzAdresse: { plz: "4910" }, iban: "AT61 1904 3002 3457 3201", uid: "atu12345678", dienstleistung: { aktiv: true, seit: "2026-01-01" } }]],
  ["gemeinschaftBereinigen", [{ name: "X", modell: "eeg", zonelevel: 6, netzbetreiber: ["ENB-OOE"] }]], ["gemeinschaftBereinigen", [{ name: "X", modell: "eeg", zonelevel: 3, rechtsform: "keine", netzbetreiber: ["ENB-OOE"] }]], ["gemeinschaftBereinigen", [{ name: "X", modell: "gea", zonelevel: 1, netzbetreiber: ["ENB-WIEN"] }]],
  ["gemeinschaftBereinigen", [{ name: "X", modell: "eeg", zonelevel: 3, netzbetreiber: ["ENB-OOE", "ENB-SBG"] }]], ["gemeinschaftBereinigen", [{ name: "X", modell: "beg", zonelevel: 7, netzbetreiber: ["ENB-OOE", "ENB-SBG"], gemeinschaftsId: "ATCC9999DYNAMCC123456ABCDEF123456", marktpartnerId: "CC123456" }]], ["gemeinschaftBereinigen", [{ name: "X", modell: "beg", zonelevel: 7, netzbetreiber: ["ENB-XYZ"] }]],
  ["gemeinschaftBereinigen", [{ modell: "eeg", zonelevel: 3, netzbetreiber: ["ENB-OOE"] }]], ["gemeinschaftBereinigen", [{ name: "X", zonelevel: 3 }]], ["gemeinschaftBereinigen", [{ name: "X", modell: "eeg", zonelevel: 3, netzbetreiber: ["ENB-OOE"], ustStatus: "regelbesteuert" }]], ["gemeinschaftBereinigen", [{ name: "X", modell: "eeg", zonelevel: 3, netzbetreiber: ["ENB-OOE"], iban: "AT00123" }]],
  ["gemeinschaftBereinigen", [{ name: "X", modell: "eeg", zonelevel: 3, netzbetreiber: [], marktpartnerId: "CC100015" }]], ["gemeinschaftBereinigen", [{ name: "P", modell: "p2p", zonelevel: 6, netzbetreiber: [] }]], ["gemeinschaftBereinigen", [{ name: "X", modell: "eeg", zonelevel: "abc", netzbetreiber: ["ENB-OOE"] }]],
  ["organBereinigen", [{ funktion: "kassier", name: "K", von: "2026-01-01", zeichnungsberechtigt: true }]], ["organBereinigen", [{ funktion: "x", name: "K", von: "2026-01-01" }]], ["organBereinigen", [{ funktion: "obmann", von: "2026-01-01" }]], ["organBereinigen", [{ funktion: "obmann", name: "O", von: "2026-05-01", bis: "2026-01-01" }]],
  ["organHinweise", [g1, HEUTE]], ["organHinweise", [{ ...g1, rechtsform: "egen" }, HEUTE]], ["organHinweise", [{ ...g1, rechtsform: "keine", modell: "gea" }, HEUTE]],
  ["kennzahlen", [g1]], ["gemeinschaftHinweise", [g1, HEUTE]], ["gemeinschaftHinweise", [{ ...g1, id: "LEER", status: "in_gruendung", verteilmodell: "statisch", gemeinschaftsId: "", dienstleistung: { aktiv: false } }, "2026-10-05"]], ["gemeinschaftHinweise", [{ ...g1, id: "LEER2", status: "aktiv", gemeinschaftsId: "" }, HEUTE]],
  ["istGrossunternehmen", [{ mitarbeiter: 250 }]], ["istGrossunternehmen", [{ mitarbeiter: 249, umsatzMioEur: 60, bilanzMioEur: 40 }]], ["istGrossunternehmen", [{ umsatzMioEur: 51, bilanzMioEur: 44 }]], ["istGrossunternehmen", [{}]], ["istGrossunternehmen", [{ mitarbeiter: null, umsatzMioEur: 51 }]],
  ["mitgliedBereinigen", [{ art: "privat", person: { vorname: "Mia", nachname: "Muster", plz: "4910", email: "MIA@Example.com" }, iban: "AT611904300234573201", sepaMandat: { referenz: "R1", datum: "2026-01-02", status: "aktiv" } }, g1]],
  ["mitgliedBereinigen", [{ art: "kmu", person: { firma: "Groß AG" }, unternehmensgroesse: { mitarbeiter: 300 } }, g1]], ["mitgliedBereinigen", [{ art: "kmu", person: { firma: "Groß AG" }, unternehmensgroesse: { mitarbeiter: 300 } }, { ...g1, modell: "beg" }]],
  ["mitgliedBereinigen", [{ art: "landwirt", person: { nachname: "L" }, steuerstatusErzeuger: "regelbesteuert" }, g1]], ["mitgliedBereinigen", [{ art: "privat", person: {} }, g1]], ["mitgliedBereinigen", [{ person: { nachname: "X" } }, g1]], ["mitgliedBereinigen", [{ art: "privat", person: { nachname: "X" }, sepaMandat: { status: "aktiv" } }, g1]],
  ["naechsteMitgliedsnummer", [[{ gemeinschaftId: "A", mitgliedsnummer: 7 }, { gemeinschaftId: "A", mitgliedsnummer: 3 }, { gemeinschaftId: "B", mitgliedsnummer: 99 }], "A"]], ["naechsteMitgliedsnummer", [[], "A"]],
  ["zaehlpunktBereinigen", [{ zaehlpunktnummer: ZP_OK, richtung: "verbrauch", netzebene: "7", smartMeter: "ja" }, NB]], ["zaehlpunktBereinigen", [{ zaehlpunktnummer: ZP_OK }, NB]], ["zaehlpunktBereinigen", [{ zaehlpunktnummer: "AT1", richtung: "verbrauch" }, NB]], ["zaehlpunktBereinigen", [{ zaehlpunktnummer: ZP_OK, richtung: "erzeugung", netzebene: 9 }, NB]],
  ["teilnahmeBereinigen", [{ zaehlpunktId: "Z", mitgliedId: "M" }, g1]], ["teilnahmeBereinigen", [{ zaehlpunktId: "Z", mitgliedId: "M", teilnahmefaktor: "60" }, g1]], ["teilnahmeBereinigen", [{ zaehlpunktId: "Z", mitgliedId: "M", teilnahmefaktor: 0 }, g1]], ["teilnahmeBereinigen", [{ zaehlpunktId: "Z", mitgliedId: "M", teilnahmefaktor: 101 }, g1]],
  ["teilnahmeBereinigen", [{ zaehlpunktId: "Z", mitgliedId: "M", aufteilungsschluesselPct: "10,55" }, { verteilmodell: "statisch" }]], ["teilnahmeBereinigen", [{ zaehlpunktId: "Z", mitgliedId: "M", aufteilungsschluesselPct: 0 }, { verteilmodell: "statisch" }]], ["teilnahmeBereinigen", [{ mitgliedId: "M" }, g1]],
  ["teilnahmeRegeln", [kontextDaten.teilnahmen.filter((t) => t.zaehlpunktId === "EZP-2"), { gemeinschaftId: "B", teilnahmefaktor: 40 }, 0, 0]], ["teilnahmeRegeln", [kontextDaten.teilnahmen.filter((t) => t.zaehlpunktId === "EZP-2"), { gemeinschaftId: "B", teilnahmefaktor: 41 }, 0, 0]],
  ["teilnahmeRegeln", [kontextDaten.teilnahmen.filter((t) => t.zaehlpunktId === "EZP-2"), { gemeinschaftId: g1.id, teilnahmefaktor: 10 }, 0, 0]], ["teilnahmeRegeln", [[1, 2, 3, 4].map((i) => ({ id: `X${i}`, gemeinschaftId: `G${i}`, status: "aktiv", teilnahmefaktor: 10 })), { gemeinschaftId: "G5", teilnahmefaktor: 10 }, 0, 0]],
  ["teilnahmeRegeln", [[1, 2, 3, 4].map((i) => ({ id: `X${i}`, gemeinschaftId: `G${i}`, status: "aktiv", teilnahmefaktor: 10 })), { gemeinschaftId: "G5", teilnahmefaktor: 10 }, 0, 1]], ["teilnahmeRegeln", [[{ id: "X1", gemeinschaftId: "G1", status: "beendet", teilnahmefaktor: 100 }, { id: "X2", gemeinschaftId: "G2", status: "aktiv", teilnahmefaktor: 30 }], { id: "X2", gemeinschaftId: "G2", teilnahmefaktor: 100 }, 0, 0]],
  ["teilnahmeRegeln", [[{ id: "X2", gemeinschaftId: "G2", status: "aktiv", teilnahmefaktor: 30 }], { gemeinschaftId: "G3", teilnahmefaktor: 50 }, 25, 1]],
  ["tfAm", [{ teilnahmefaktor: 70, tfHistorie: [{ gueltigAb: "2026-01-01", tf: 100 }, { gueltigAb: "2026-06-01", tf: 70 }] }, "2026-03-01"]], ["tfAm", [{ teilnahmefaktor: 70, tfHistorie: [{ gueltigAb: "2026-06-01", tf: 70 }] }, "2026-01-01"]],
  ["tarifBereinigen", [{ bezeichnung: "P", gueltigAb: "2026-01-01", bezugspreisCt: "11,12345", einspeisepreisCt: 8, zeitfenster: [{ label: "Mittag", von: "11:00", bis: "15:00", bezugspreisCt: 9.5, tage: ["mo", "xx", "mo"], monate: [5, 4, 13] }], status: "beschlossen", beschluss: { art: "gv", datum: "2025-12-01" } }]],
  ["tarifBereinigen", [{ gueltigAb: "2026-01-01", bezugspreisCt: 8, einspeisepreisCt: 9 }]], ["tarifBereinigen", [{ bezugspreisCt: 8, einspeisepreisCt: 7 }]], ["tarifBereinigen", [{ gueltigAb: "2026-01-01", bezugspreisCt: 8, einspeisepreisCt: 7, status: "aktiv" }]], ["tarifBereinigen", [{ gueltigAb: "2026-01-01", bezugspreisCt: 8, einspeisepreisCt: 7, zeitfenster: [{ label: "x", von: "11:10", bis: "12:00", bezugspreisCt: 1 }] }]],
  ["tarifBereinigen", [{ gueltigAb: "2026-01-01", bezugspreisCt: 8, einspeisepreisCt: 7, individuell: [{ mitgliedId: "M1", bezugspreisCt: 7 }] }]], ["tarifBereinigen", [{ gueltigAb: "2026-05-01", gueltigBis: "2026-01-01", bezugspreisCt: 8, einspeisepreisCt: 7 }]],
  ["tarifAm", [[{ id: "A", status: "abgeloest", gueltigAb: "2025-01-01", gueltigBis: "2025-12-31" }, { id: "B", status: "aktiv", gueltigAb: "2026-01-01", gueltigBis: "" }, { id: "C", status: "entwurf", gueltigAb: "2026-02-01" }], "2026-03-01"]], ["tarifAm", [[{ id: "B", status: "aktiv", gueltigAb: "2026-01-01", gueltigBis: "" }], "2025-12-31"]],
  ["tarifVersionieren", [[{ id: "A", status: "aktiv", gueltigAb: "2025-01-01", gueltigBis: "" }, { id: "B", status: "entwurf", gueltigAb: "2025-06-01", gueltigBis: "" }], { id: "N", status: "aktiv", gueltigAb: "2026-03-01" }]],
  ...["2026-07-15T12:00", "2026-07-15T15:00", "2026-01-10T23:00", "2026-01-10T05:45", "2026-01-12T23:00", "2026-03-01T12:00"].map((l) => ["preisFuer", [tarif, l, ""]]), ["preisFuer", [tarif, "2026-07-15T12:00", "M1"]], ["preisFuer", [null, "2026-07-15T12:00", ""]],
  ["verteilschluesselBereinigen", [{ gueltigAb: "2026-01-01", positionen: [{ teilnahmeId: "A", pct: 40 }, { teilnahmeId: "B", pct: "60,04" }] }]], ["verteilschluesselBereinigen", [{ gueltigAb: "2026-01-01", positionen: [{ teilnahmeId: "A", pct: 40 }, { teilnahmeId: "B", pct: 90 }] }]], ["verteilschluesselBereinigen", [{ gueltigAb: "2026-01-01", positionen: [{ teilnahmeId: "A", pct: 40 }, { teilnahmeId: "A", pct: 10 }] }]], ["verteilschluesselBereinigen", [{ gueltigAb: "2026-01-01", positionen: [] }]],
  ["gemeinschaftUebergang", [{ status: "in_gruendung", rechtsform: "verein" }, "rechtsperson", ""]], ["gemeinschaftUebergang", [{ status: "in_gruendung", rechtsform: "verein", zvrZahl: "1" }, "rechtsperson", ""]], ["gemeinschaftUebergang", [{ status: "aktiv" }, "interesse", ""]], ["gemeinschaftUebergang", [{ status: "aktiv" }, "in_aufloesung", ""]], ["gemeinschaftUebergang", [{ status: "aktiv" }, "aufnahmestopp", ""]], ["gemeinschaftUebergang", [{ status: "vertrag_nb" }, "xyz", ""]], ["gemeinschaftUebergang", [{ status: "marktpartner" }, "vertrag_nb", ""]],
  ["mitgliedUebergang", [{ status: "antrag" }, "geprueft", "", ""]], ["mitgliedUebergang", [{ status: "aktiv" }, "gekuendigt", "", "2026-12-31"]], ["mitgliedUebergang", [{ status: "aktiv" }, "gekuendigt", "", ""]], ["mitgliedUebergang", [{ status: "antrag" }, "abgelehnt", "", ""]], ["mitgliedUebergang", [{ status: "ausgeschieden" }, "aktiv", "", ""]],
  ["teilnahmeUebergang", [t0, "senden", { heute: HEUTE, am: "2026-10-01T08:00:00.000Z" }]], ["teilnahmeUebergang", [{ ...t0, status: "angefragt" }, "anforderung_econ", { heute: HEUTE, datum: "2026-10-02", prozessId: "EDP-1", responsecode: "99", am: "X" }]],
  ["teilnahmeUebergang", [{ ...t0, status: "zustimmung_offen", fristBis: "2026-11-01" }, "zustimmung_econ", { heute: HEUTE, consentId: "C-1", am: "X" }]], ["teilnahmeUebergang", [{ ...t0, status: "zugestimmt" }, "abschluss_econ", { heute: HEUTE, am: "X" }]], ["teilnahmeUebergang", [{ ...t0, status: "zugestimmt" }, "abschluss_econ", { heute: HEUTE, datum: "2026-10-10", prozessId: "EDP-2", am: "X" }]],
  ["teilnahmeUebergang", [{ ...t0, status: "aktiv", tfHistorie: [{ gueltigAb: "2026-10-10", tf: 40, prozessId: "" }] }, "tf_geaendert", { heute: HEUTE, datum: "2026-10-10", teilnahmefaktor: 50, am: "X" }]], ["teilnahmeUebergang", [{ ...t0, status: "aktiv", tfHistorie: [{ gueltigAb: "2026-10-10", tf: 40, prozessId: "" }] }, "tf_geaendert", { heute: HEUTE, datum: "2026-10-11", teilnahmefaktor: 50, am: "X" }]],
  ["teilnahmeUebergang", [{ ...t0, status: "aktiv" }, "tf_geaendert", { heute: HEUTE, teilnahmefaktor: 0.5, am: "X" }]], ["teilnahmeUebergang", [{ ...t0, status: "aktiv" }, "cm_rev_sp", { heute: HEUTE, datum: "2026-09-30", am: "X" }]], ["teilnahmeUebergang", [{ ...t0, status: "aktiv" }, "cm_rev_sp", { heute: HEUTE, datum: "2026-10-31", am: "X" }]],
  ["teilnahmeUebergang", [{ ...t0, status: "abmeldung_angefragt", gueltigBis: "2026-10-31" }, "abmeldung_ok", { heute: HEUTE, am: "X" }]], ["teilnahmeUebergang", [{ ...t0, status: "aktiv" }, "cm_rev_cus", { heute: HEUTE, datum: "2026-10-05", am: "X", grund: "Widerruf" }]], ["teilnahmeUebergang", [{ ...t0, status: "aktiv" }, "senden", { heute: HEUTE, am: "X" }]],
  ["teilnahmeUebergang", [{ ...t0, status: "abgelaufen", consentId: "C", fristBis: "x" }, "erneut", { heute: HEUTE, am: "X", von: "U-1" }]], ["teilnahmeUebergang", [{ ...t0, status: "abmeldung_angefragt", gueltigBis: "2026-10-31" }, "abmeldung_abgelehnt", { heute: HEUTE, am: "X" }]],
  ["migrationAusPrototyp", [{
    gemeinschaften: [
      { id: "EGM-1", name: "Alt-EEG (Demo)", land: "AT", form: "eeg_regional", status: "aktiv", rechtsform: "Verein (Demo)", netzbetreiber: "Netzbetreiber Oberösterreich (Demo)", gebiet: "UW Süd", plzListe: ["5120"], tarifBezugCt: 11, tarifEinspeisungCt: 9, grundgebuehrMonat: 1.5, verteilschluessel: "dynamisch", gemeinschaftsId: "AT00300000RC100000000000000000001 (Demo)", info: "Info", demo: true },
      { id: "EGM-2", name: "DE (Demo)", land: "DE", form: "energy_sharing", status: "aufbau" },
      { id: "EGM-3", name: "GEA alt", land: "AT", form: "gea", status: "geschlossen", rechtsform: "", netzbetreiber: "Wiener Netze", verteilschluessel: "statisch", gemeinschaftsId: "", tarifBezugCt: null },
    ],
    teilnahmen: [
      { id: "ET-1", egId: "EGM-1", nutzerId: "U-1", status: "aktiv", ab: "2026-03-01", stamm: { rolle: "bezug", zaehlpunkt: "AT0030000000000000000000000054321", plz: "5121", smartMeter: true } },
      { id: "ET-2", egId: "EGM-1", nutzerId: null, name: "Hofladen Demo (Demo)", status: "beendet", ab: "2026-01-01", bis: "2026-08-31", stamm: { rolle: "beides", zaehlpunkt: "AT0030000000000000000000000077702", zaehlpunktEinspeisung: "AT0030000000000000000000000077703", anlageKwp: 30 } },
      { id: "ET-3", egId: "EGM-1", nutzerId: "U-9", status: "beantragt", stamm: { rolle: "bezug", zaehlpunkt: "falsch" } },
      { id: "ET-4", egId: "EGM-3", nutzerId: null, name: "Top 1", status: "angemeldet", anteilPct: 12.5, stamm: { rolle: "bezug", zaehlpunkt: "AT0010000114000000000000000000009", smartMeter: "nein" } },
      { id: "ET-5", egId: "EGM-3", nutzerId: null, name: "Top 2", status: "abgelehnt", stamm: { rolle: "bezug" } },
    ],
  }, HEUTE]],
];

const NBL = E.NETZBETREIBER;
const ersetze = (a) => a.map((x) => (x === NB ? NBL : x));
function ausfuehren() {
  return FAELLE.map(([fn, a]) => {
    try {
      return { fn, a, erwartet: JSON.parse(JSON.stringify(F[fn](...ersetze(structuredClone(a))) ?? null)) };
    } catch (e) {
      if (e?.status === undefined) throw e;
      return { fn, a, fehler: { status: e.status, text: e.message } };
    }
  });
}

const vektoren = ausfuehren();
const json = JSON.stringify(vektoren, null, 1) + "\n";
if (process.argv.includes("--pruefen")) {
  const ist = fs.existsSync(ZIEL) ? fs.readFileSync(ZIEL, "utf8") : "";
  if (ist !== json) {
    console.error("Testvektoren weichen von den JS-Regeln ab – node scripts/eg-testdaten-stamm.mjs ausführen und Python prüfen.");
    process.exit(1);
  }
  console.log(`Testvektoren aktuell (${vektoren.length}).`);
} else {
  fs.mkdirSync(path.dirname(ZIEL), { recursive: true });
  fs.writeFileSync(ZIEL, json);
  console.log(`geschrieben: ${path.relative(WURZEL, ZIEL)} (${vektoren.length} Vektoren, ${vektoren.filter((v) => v.fehler).length} Fehlerfälle)`);
}
