// src/lib/plattform/backend/index.js
//
// Einheitliche Backend-Schnittstelle der Plattform. Zwei Implementierungen:
//   frappe.js – Frappe-App `oekoinvest_app` (Produktion), Auswahl mit PLATTFORM_BACKEND=frappe
//   demo.js   – JSON-Datei unter .data/plattform.json (Entwicklung/Vorführung)
//
// Im Produktions-Build wird das Demo-Backend NUR genutzt, wenn PLATTFORM_DEMO=1 gesetzt ist –
// sonst gibt es eine klare Fehlermeldung (HTTP 503) statt stiller Demo-Daten.
//
// Nur serverseitig verwenden (Route-Handler, Server-Komponenten).
//
// Alle Operationen (Signaturen identisch in beiden Implementierungen; n = angemeldeter Nutzer):
//   Konto:     anmelden({email,passwort}) · nutzerFuerSitzung(id) · registrieren({...}) · emailBestaetigen({token})
//              passwortVergessen({email,basisUrl,ip}) · passwortSetzen({token,passwort,ip}) · passwortAendern(n,{alt,neu})
//              profilSpeichern(n,daten) · suchprofilSpeichern(n,profil)
//   Anfrage:   anfrageAnlegen({typ,kontakt,daten,herkunft,ip,einwilligungText,nutzer})
//   Vorgänge:  vorgaenge(n,{alle,status,typ,q}) · vorgang(n,id)
//   Flächen:   flaechen(n,{alle,status}) · flaeche(n,id) · flaecheAnlegen(n,daten,{ip}) · flaecheAendern(n,id,daten)
//   Projekte:  projekte(n,{alle,status}) · projekt(n,id) · projektAnlegen(n,daten,{ip}) · projektAendern(n,id,daten)
//              provisionAkzeptieren(n,id,{ip})
//   Börse:     boerse(n|null,filter) · boerseDetail(n|null,slugOderId,{zaehlen})
//   Interesse: merken(n,projektId,an) · ndaAnfragen(n,projektId,{akzeptiert,ip,userAgent}) · interessen(n,{alle,status,projektId})
//   Prozess:   statusWechsel(n,{art,id,nach,als,extra,ip})
//   Nachricht: nachrichtenThreads(n) · nachrichten(n,bezugArt,bezugId,{markieren}) · nachrichtSenden(n,{bezugArt,bezugId,text})
//   Dokument:  dokumente(n,{bezugArt,bezugId}) · dokumentLesen(n,id) · dokumentSpeichern(n,{...,daten}) · dokumentLoeschen(n,id)
//   Admin:     zuweisen · nutzerListe · nutzerAendern · provisionen · aktivitaeten · adminKonten · adminUebersicht · demoLinks
//   Hinweise:  benachrichtigungen(n,{nurUngelesen,limit}) · benachrichtigungenGelesen(n,{ids,alle}) · mailEinstellungenSpeichern(n,einstellungen)
//   Aufgaben:  aufgaben(n,{zustaendigId,status,bezugArt,bezugId,nurUeberfaellig}) · aufgabeAnlegen(n,daten) · aufgabeAendern(n,id,daten)
//   Exposé:    exposeDaten(n,id,{ip}) (Rechte + Protokoll, PDF erzeugt die Website) · protokollEintrag(n,{aktion,objektArt,objektId,text,ip})
//   Nur Demo:  postausgang(n,{limit}) (E-Mails, die Frappe versenden würde; im Frappe-Adapter [])

import * as demo from "./demo";
import * as frappe from "./frappe";
import { PlattformFehler } from "../fehler";
import { BACKOFFICE_OPERATIONEN } from "./frappe/backoffice";

export const OPERATIONEN = [
  "anmelden", "nutzerFuerSitzung", "registrieren", "emailBestaetigen", "passwortVergessen", "passwortSetzen", "passwortAendern",
  "profilSpeichern", "suchprofilSpeichern", "anfrageAnlegen", "vorgaenge", "vorgang", "flaechen", "flaeche", "flaecheAnlegen",
  "flaecheAendern", "projekte", "projekt", "projektAnlegen", "projektAendern", "provisionAkzeptieren", "boerse", "boerseDetail",
  "merken", "ndaAnfragen", "interessen", "statusWechsel", "nachrichtenThreads", "nachrichten", "nachrichtSenden", "dokumente",
  "dokumentLesen", "dokumentSpeichern", "dokumentLoeschen", "zuweisen", "nutzerListe", "nutzerAendern", "provisionen",
  "aktivitaeten", "adminKonten", "adminUebersicht", "demoLinks", "benachrichtigungen", "benachrichtigungenGelesen",
  "mailEinstellungenSpeichern", "postausgang", "aufgaben", "aufgabeAnlegen", "aufgabeAendern", "exposeDaten", "protokollEintrag",
  ...BACKOFFICE_OPERATIONEN, // Backoffice: CRM, Akquise, Automationen, Vorlagen, Berichte, Rechte (backend/frappe/backoffice.js)
];

if (process.env.NODE_ENV !== "production") {
  for (const [name, impl] of [["demo", demo], ["frappe", frappe]]) {
    const fehlt = OPERATIONEN.filter((op) => typeof impl[op] !== "function");
    if (fehlt.length) console.warn(`[plattform] Backend ${name}: fehlende Operationen ${fehlt.join(", ")}`);
  }
}

export const KONFIG_FEHLER =
  "Das Plattform-Backend ist nicht konfiguriert. Für den Betrieb PLATTFORM_BACKEND=frappe setzen (siehe docs/PLATTFORM.md) – oder PLATTFORM_DEMO=1 für eine reine Vorführung.";

export function backendName() {
  if (process.env.PLATTFORM_BACKEND === "frappe") return "frappe";
  if (process.env.NODE_ENV === "production" && process.env.PLATTFORM_DEMO !== "1") return null;
  return "demo";
}

/** Liefert die aktive Implementierung oder wirft 503 */
export function backend() {
  const n = backendName();
  if (n === "frappe") return frappe;
  if (n === "demo") return demo;
  throw new PlattformFehler(503, KONFIG_FEHLER);
}

export const istDemo = () => backendName() === "demo";
