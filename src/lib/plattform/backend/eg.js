// src/lib/plattform/backend/eg.js
//
// Fassade des Moduls Energiegemeinschaften (ElWG §§ 65–72). EINE Schnittstelle für alle Arbeitspakete; jedes Paket
// implementiert seine Operationen in eigenen Dateien (Demo und Frappe mit identischen Signaturen):
//   WP1 Stamm      backend/demo/eg-stamm.js      · backend/frappe/eg-stamm.js      (Frappe: plattform/api/eg_stamm.py)
//   WP2 EDA        backend/demo/eg-eda.js        · backend/frappe/eg-eda.js        (plattform/api/eg_eda.py)
//   WP3 Energie    backend/demo/eg-energie.js    · backend/frappe/eg-energie.js    (plattform/api/eg_energie.py)
//   WP4 Abrechnung backend/demo/eg-abrechnung.js · backend/frappe/eg-abrechnung.js (plattform/api/eg_abrechnung.py)
//   WP5 Gründung   backend/demo/eg-gruendung.js  · backend/frappe/eg-gruendung.js  (plattform/api/eg_gruendung.py)
//   WP6 Portale    backend/demo/eg-portal.js     · backend/frappe/eg-portal.js     (plattform/api/eg_portal.py)
// Vertrag (Signaturen, Rückgaben, Rechte): docs/EG-SCHNITTSTELLEN.md und docs/API.md, Abschnitt „Energiegemeinschaften“.
// Datenmodell: src/lib/plattform/eg/modell.js. Diese Datei pflegt WP1; andere Pakete ändern nur ihre Zeile in EG_OPERATIONEN
// per Patch (docs/eg/<paket>.md).
//
// Auswahl wie backend(): Frappe bei PLATTFORM_BACKEND=frappe, sonst Demo (503 im Produktions-Build ohne PLATTFORM_DEMO=1).
// n = angemeldeter Nutzer (aus route()/portalNutzer), SYSTEM-Aufrufe (Scheduler, Ereignisse) mit egSystem().
// Nur serverseitig verwenden.

import * as demoStamm from "./demo/eg-stamm";
import * as demoEda from "./demo/eg-eda";
import * as demoEnergie from "./demo/eg-energie";
import * as demoAbrechnung from "./demo/eg-abrechnung";
import * as demoGruendung from "./demo/eg-gruendung";
import * as demoPortal from "./demo/eg-portal";
import * as frappeStamm from "./frappe/eg-stamm";
import * as frappeEda from "./frappe/eg-eda";
import * as frappeEnergie from "./frappe/eg-energie";
import * as frappeAbrechnung from "./frappe/eg-abrechnung";
import * as frappeGruendung from "./frappe/eg-gruendung";
import * as frappePortal from "./frappe/eg-portal";
import { backendName, KONFIG_FEHLER } from "./index";
import { PlattformFehler } from "../fehler";
import { EG_EREIGNISSE } from "../eg/modell";

/**
 * Operationen je Paket (Signaturen: docs/EG-SCHNITTSTELLEN.md, Abschnitt 4).
 *
 * WP1 Stamm (Lesen für alle Pakete, Schreiben Stammdaten):
 *   egKontext(n,{gemeinschaftId?}) → {gemeinschaften:[{id,name,modell,status,rollen[]}]}  Rollen des Kontos je Gemeinschaft
 *   egGemeinschaften(n,{status?,modell?,q?}) → {gemeinschaften[], kennzahlen, darfSchreiben}   Backoffice-Liste mit Kennzahlen
 *   egGemeinschaft(n,id) → {gemeinschaft, organe[], mitglieder[], zaehlpunkte[], teilnahmen[], anlagen[], tarife[], verteilschluessel[], netzbetreiber[], rollen[], rechte{}, hinweise[]}
 *   egGemeinschaftSpeichern(n,{id?,daten}) → gemeinschaft          egGemeinschaftStatus(n,id,{nach,grund?}) → gemeinschaft
 *   egOrganSpeichern(n,{gemeinschaftId,id?,daten}) → organ         egOrganBeenden(n,id,{bis}) → organ
 *   egMitgliedSpeichern(n,{gemeinschaftId,id?,daten}) → mitglied   egMitgliedStatus(n,id,{nach,grund?,zum?}) → mitglied
 *   egZaehlpunktSpeichern(n,{gemeinschaftId,id?,daten}) → zaehlpunkt
 *   egTeilnahmeSpeichern(n,{gemeinschaftId,id?,daten}) → teilnahme   (nur Entwurf bzw. TF-Wunsch; Status nur per Übergang)
 *   egTeilnahmeUebergang(n,teilnahmeId,{ereignis,datum?,consentId?,teilnahmefaktor?,responsecode?,prozessId?,grund?}) → teilnahme
 *   egAnlageSpeichern(n,{gemeinschaftId,id?,daten}) → anlage       egTarifSpeichern(n,{gemeinschaftId,id?,daten}) → tarif
 *   egVerteilschluesselSpeichern(n,{gemeinschaftId,id?,daten}) → verteilschluessel · egVerteilschluesselStatus(n,id,{status,edaProzessId}) (WP2)
 *   egMassenaktion(n,gemeinschaftId,{aktion,ids[],werte{}}) → {geaendert, fehler[]}
 *   egCsvImport(n,gemeinschaftId,{art,csv,ausfuehren}) → {vorschau[], fehler[], angelegt, geaendert}
 *   egCsvExport(n,gemeinschaftId,{art}) → {dateiname, csv}
 *   egNetzbetreiber(n) → {netzbetreiber[]}                         egNetzentgeltRegeln(n,{stichtag?}) → {regeln[]}
 *   egVerwaltung(n,gemeinschaftId) → Organe-Sicht (Vorstand/Kassier/Schriftführung/Rechnungsprüfung)
 *   egMigrationVorschau(n) · egMigrationAusfuehren(n) → {gemeinschaften, mitglieder, zaehlpunkte, teilnahmen, warnungen[]}
 * WP2 EDA:
 *   edaProzesse(n,gemeinschaftId,{status?,code?}) · edaProzess(n,id) · edaAnmelden(n,gemeinschaftId,{teilnahmeIds[],offline?})
 *   edaTfAendern(n,gemeinschaftId,{aenderungen:[{teilnahmeId,teilnahmefaktor,ab}]}) · edaAbmelden(n,gemeinschaftId,{teilnahmeIds[],zum})
 *   edaVerteilschluesselSenden(n,verteilschluesselId) · edaPodlistAnfordern(n,gemeinschaftId) · edaNachforderung(n,{zaehlpunktId,von,bis})
 *   edaNachrichtEingang(sys,{xml,quelle}) · edaFristenLauf(sys) · edaGemeinschaftBereit(sys,{gemeinschaftId})
 * WP3 Energie:
 *   enMessreihen(n,{gemeinschaftId,zaehlpunktId?,von,bis,groessen?}) · enEnergiedatenEmpfangen(sys,payload)
 *   enPeriodenwerte(n,gemeinschaftId,von,bis) → {zaehlpunkte:[{zaehlpunktId,teilnahmeId,groessen{groesse:kWh},vollstaendig,anteilL3}]}
 *   enQualitaet(n,gemeinschaftId,{monat}) · enAbweichungsbericht(n,gemeinschaftId,{monat}) · enCsvImport(n,gemeinschaftId,{csv})
 *   enSimulation(n,{daten}) · enSimulationen(n,{gemeinschaftId?}) · enPrognose(n,gemeinschaftId) · enOptimierung(n,{zaehlpunktId})
 * WP4 Abrechnung:
 *   abPerioden(n,gemeinschaftId) · abPeriodeAnlegen(n,gemeinschaftId,{von,bis,art}) · abPeriodeAktion(n,id,{aktion,…})
 *   abBelege(n,{gemeinschaftId?,mitgliedId?,periodeId?}) · abBelegPdf(n,id) · abZahlungslauf(n,gemeinschaftId,{art,belegIds[]})
 *   abCamtImport(n,gemeinschaftId,{xml}) · abMahnlauf(n,gemeinschaftId) · abBuchungen(n,gemeinschaftId,{jahr})
 *   abExport(n,gemeinschaftId,{art,jahr}) · abKleinunternehmer(n,gemeinschaftId) · abJahresbescheinigung(n,mitgliedId,{jahr})
 * WP5 Gründung:
 *   grAuftraege(n) · grAuftrag(n,id) · grAuftragAnlegen(n,{daten}) · grAuftragAktion(n,id,{aktion,…}) · grSchrittAktion(n,id,{schritt,aktion,…})
 *   grDokumentErzeugen(n,{gemeinschaftId,auftragId,vorlage,daten,dokumentId,speichern}) · grImportVorschau(n,gemeinschaftId,{csv,anbieter,zuordnung,importId,auftragId,dateiname})
 *   grImportAusfuehren(n,importId,{ohneFehlerzeilen,tarifUebernehmen}) · grFoerdercheck(n,{gemeinschaftId,auftragId,daten,speichern})
 *   grVersammlungen(n,gemeinschaftId,{aktion?,id?,daten?}) (ohne aktion lesen) · grAufloesung(n,gemeinschaftId,{aktion})
 * WP6 Portale:
 *   ptUebersicht(n) · ptGemeinschaft(n,gemeinschaftId) · ptBeitrittAntrag(n,gemeinschaftId,{daten},{ip}) · ptKuendigung(n,mitgliedId,{zum})
 *   ptTfWunsch(n,teilnahmeId,{teilnahmefaktor}) · ptInteresse(null|n,{daten},{ip}) · ptGemeindeSicht(n) · ptDatenauskunft(n)
 *   ptRechner(null,{daten}) (öffentlich, ohne Personendaten) · ptBelege(n) · ptEnergie(n,{zaehlpunktId,von,bis})
 */
export const EG_OPERATIONEN = {
  stamm: [
    "egKontext", "egGemeinschaften", "egGemeinschaft", "egGemeinschaftSpeichern", "egGemeinschaftStatus", "egOrganSpeichern", "egOrganBeenden",
    "egMitgliedSpeichern", "egMitgliedStatus", "egZaehlpunktSpeichern", "egTeilnahmeSpeichern", "egTeilnahmeUebergang", "egAnlageSpeichern",
    "egTarifSpeichern", "egVerteilschluesselSpeichern", "egVerteilschluesselStatus", "egMassenaktion", "egCsvImport", "egCsvExport", "egNetzbetreiber", "egNetzentgeltRegeln",
    "egVerwaltung", "egMigrationVorschau", "egMigrationAusfuehren",
  ],
  eda: ["edaProzesse", "edaProzess", "edaAnmelden", "edaTfAendern", "edaAbmelden", "edaVerteilschluesselSenden", "edaPodlistAnfordern", "edaNachforderung", "edaNachrichtEingang", "edaFristenLauf", "edaGemeinschaftBereit",
    "edaUebersicht", "edaJournal", "edaFreigaben", "edaFreigeben", "edaErneutAnstossen", "edaErinnern", "edaReklamation", "edaSimulator", "edaAusgang", "edaAusgangQuittung"], // WP2-Ergänzung
  energie: ["enMessreihen", "enEnergiedatenEmpfangen", "enPeriodenwerte", "enQualitaet", "enAbweichungsbericht", "enCsvImport", "enSimulation", "enSimulationen", "enPrognose", "enOptimierung", "enDashboard"], // WP3-Ergänzung: enDashboard(n, gemeinschaftId)
  abrechnung: ["abPerioden", "abPeriodeAnlegen", "abPeriodeAktion", "abBelege", "abBelegPdf", "abZahlungslauf", "abCamtImport", "abMahnlauf", "abBuchungen", "abExport", "abKleinunternehmer", "abJahresbescheinigung",
    "abZahlungslaufAktion", "abZahlungErfassen", "abMandate", "abBuchungSpeichern", "abPruefvermerk", "abEinstellungenSpeichern"], // WP4-Ergänzung
  gruendung: ["grAuftraege", "grAuftrag", "grAuftragAnlegen", "grAuftragAktion", "grSchrittAktion", "grDokumentErzeugen", "grImportVorschau", "grImportAusfuehren", "grFoerdercheck", "grVersammlungen", "grAufloesung"],
  portal: ["ptUebersicht", "ptGemeinschaft", "ptBeitrittAntrag", "ptKuendigung", "ptTfWunsch", "ptInteresse", "ptGemeindeSicht", "ptDatenauskunft", "ptRechner", "ptBelege", "ptEnergie"],
};
export const EG_ALLE_OPERATIONEN = Object.values(EG_OPERATIONEN).flat();

const DEMO = { ...demoStamm, ...demoEda, ...demoEnergie, ...demoAbrechnung, ...demoGruendung, ...demoPortal };
const FRAPPE = { ...frappeStamm, ...frappeEda, ...frappeEnergie, ...frappeAbrechnung, ...frappeGruendung, ...frappePortal };

if (process.env.NODE_ENV !== "production") {
  for (const [name, impl] of [["demo", DEMO], ["frappe", FRAPPE]]) {
    const fehlt = EG_ALLE_OPERATIONEN.filter((op) => typeof impl[op] !== "function");
    if (fehlt.length) console.warn(`[plattform] Energiegemeinschaften ${name}: fehlende Operationen ${fehlt.join(", ")}`);
  }
}

/** Aktive Implementierung (alle Pakete) oder 503 */
export function egBackend() {
  const n = backendName();
  if (n === "frappe") return FRAPPE;
  if (n === "demo") return DEMO;
  throw new PlattformFehler(503, KONFIG_FEHLER);
}

/** Systemkonto für Scheduler und Ereignisse (wirkt wie Backoffice-Leitung; Operationen protokollieren „System“) */
export const egSystem = () => ({ id: "system-eg", rollen: ["admin"], backofficeRollen: ["leitung"], system: true });

/**
 * Ereignis an das zuständige Paket weiterreichen (modell.js EG_EREIGNISSE). Ohne Empfänger-Operation (nur Information)
 * → { zugestellt: false }. Fehler des Empfängers werden NICHT verschluckt (Absender entscheidet über Wiederholung).
 */
export async function egEreignisSenden(name, payload = {}) {
  const e = EG_EREIGNISSE[name];
  if (!e) throw new PlattformFehler(422, `Unbekanntes Ereignis „${name}“.`);
  if (!e.operation) return { zugestellt: false };
  const b = egBackend();
  return { zugestellt: true, ergebnis: await b[e.operation](egSystem(), e.argument ? payload?.[e.argument] : payload) };
}
