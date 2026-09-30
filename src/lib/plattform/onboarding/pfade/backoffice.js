// src/lib/plattform/onboarding/pfade/backoffice.js – Einarbeitung im Backoffice je Unterrolle
// Untertyp = Unterrolle des Kontos (rechte.js BACKOFFICE_ROLLEN) – nicht frei wählbar, nur zwischen eigenen Unterrollen.

import { benachrichtigungenSchritt, profilSchritt, schnellsucheSchritt, zweiFaktorSchritt } from "./gemeinsam";

const ALLE = ["leitung", "akquise", "transaktion", "buchhaltung", "betrieb", "compliance", "energie", "lesen", "projektleitung"];
const ohne = (...r) => ALLE.filter((x) => !r.includes(x));

/** Modul-Kurzanleitung als Einarbeitungsschritt */
const modul = (id, nurFuer, titel, text, punkte, links, pflicht = false) => ({
  id, titel, kurz: titel, art: "info", text, punkte, links, nurFuer,
  pflicht: pflicht ? nurFuer : false, kriterium: { merker: true }, bestaetigbar: true, bestaetigenText: "Kennengelernt",
});

export const backoffice = {
  id: "backoffice",
  gruppe: "intern",
  titel: "Einarbeitung im Backoffice",
  text: "Aufgaben-Checkliste für die ersten Tage: Sicherheit, Werkzeuge, Vorlagen und eine erste echte Aufgabe – mit Kurzanleitungen je Modul.",
  rollen: ["admin"],
  untertypAus: "unterrolle",
  untertypen: {
    leitung: { label: "Leitung" }, akquise: { label: "Akquise" }, transaktion: { label: "Transaktion" }, buchhaltung: { label: "Buchhaltung" },
    betrieb: { label: "Betrieb" }, compliance: { label: "Compliance" }, energie: { label: "Energie" }, lesen: { label: "Nur lesen" }, projektleitung: { label: "Projektleitung" },
  },
  schritte: [
    zweiFaktorSchritt({ pflicht: true, text: "Pflicht für alle Backoffice-Konten: Sie sehen personenbezogene und vertrauliche Daten. Einrichtung unter „Sicherheit“ mit einer Authenticator-App, Wiederherstellungscodes sicher ablegen." }),
    profilSchritt({ text: "Name und Durchwahl – erscheinen bei Zuweisungen, in Vorlagen (Platzhalter) und für Kolleginnen und Kollegen in der Vertretung." }),
    schnellsucheSchritt(),
    benachrichtigungenSchritt("Neue Anfragen, zugewiesene Aufgaben und Wiedervorlagen – wählen Sie, was per E-Mail kommen soll."),
    // Leitung
    modul("rechte", ["leitung"], "Rechte und Unterrollen", "Unterrollen steuern, wer welchen Bereich lesen oder ändern darf. Die Matrix zeigt jede Stufe; Änderungen wirken sofort und stehen im Revisionsprotokoll.",
      ["Neue Kolleginnen und Kollegen: Konto unter „Nutzer & Protokoll“, Unterrolle unter „Rechte“.", "Einarbeitungsstand des Teams sehen Sie unter „Einarbeitung“."],
      [{ href: "/portal/admin/rechte", label: "Rechte öffnen" }, { href: "/portal/admin/einarbeitung", label: "Einarbeitung des Teams" }], true),
    modul("steuerung", ["leitung"], "Automationen und Berichte", "Wenn–Und–Dann-Regeln (mit Testlauf ohne Wirkung) nehmen Routine ab; Berichte zeigen Trichter, Pipeline, Provisionen und Durchlaufzeiten – als CSV oder Monatsbericht-PDF.",
      ["Regeln erst im Testlauf prüfen, dann aktivieren.", "Revisionsprotokoll: Hash-Kette regelmäßig prüfen."],
      [{ href: "/portal/admin/automationen", label: "Automationen" }, { href: "/portal/admin/berichte", label: "Berichte" }]),
    // Akquise
    { ...modul("gebiete", ["akquise"], "Gebiete zuordnen lassen", "Anfragen aus Ihrem Gebiet werden Ihnen automatisch zugewiesen. Prüfen Sie unter „Akquise & Gebiete“, welche Bundesländer bzw. Kantone Ihnen zugeordnet sind.",
      ["SLA: Erstkontakt innerhalb von 2 Werktagen – die Ampel zeigt überfällige Anfragen.", "Tasten j/k blättern, a/b/c setzt die Priorität."],
      [{ href: "/portal/admin/akquise", label: "Akquise & Gebiete" }, { href: "/portal/admin/akquise/karte", label: "Akquise-Karte" }], true), kriterium: { eines: [{ fakt: "gebiete" }, { merker: true }] }, bestaetigenText: "Zuordnung geklärt" },
    modul("vorlagen", ["akquise", "transaktion"], "Vorlagen kennenlernen", "E-Mail- und Nachrichtenvorlagen mit Platzhaltern ({{vorname}}, {{flaeche}} …), Vorschau und Versionen – für Eingangsbestätigung, Nachforderung, Pachtangebot, NDA-Freigabe.",
      ["Vor dem Senden immer die Vorschau prüfen – Platzhalter ohne Wert bleiben sichtbar."],
      [{ href: "/portal/admin/vorlagen", label: "Vorlagen öffnen" }], true),
    modul("pipeline", ["akquise"], "Flächen-Pipeline und CRM", "Kanban je Status mit Pflichtbegründung beim Statuswechsel; CRM-Kontakte entstehen automatisch aus jeder Anfrage (Dubletten per E-Mail zusammengeführt).",
      ["Pachtangebot nur mit allen Pflichtpunkten (Indexierung, Rückbau, Dienstbarkeit) – der Eigentümer sieht eine Ampel je Punkt."],
      [{ href: "/portal/admin/flaechen", label: "Flächen-Pipeline" }, { href: "/portal/admin/crm", label: "CRM" }]),
    // Transaktion
    modul("freigabe", ["transaktion"], "Projektfreigabe und NDA & LOI", "Vor der Veröffentlichung: Anonymität von Titel und Region, Plausibilität des Datenblatts, Provisionssatz 1,5–3 %. NDA-Anfragen freigeben, LOIs strukturiert beantworten.",
      ["Vor Datenraum und LOI den KYC-Status des Investors prüfen – das Gating sperrt sonst automatisch.", "Bonitätsauskunft nur mit berechtigtem Interesse und Protokoll."],
      [{ href: "/portal/admin/projekte", label: "Projekt-Freigabe" }, { href: "/portal/admin/interessen", label: "NDA & LOI" }, { href: "/portal/admin/dealroom", label: "Deal-Room" }], true),
    modul("closing", ["transaktion"], "Deal-Abschluss", "Closing-Raum mit Checkliste der Vollzugsbedingungen, Kaufvertragsentwurf, Notartermin und automatischer Provisionsrechnung.",
      [], [{ href: "/portal/admin/closing", label: "Deal-Abschluss" }]),
    // Buchhaltung
    modul("finanzen", ["buchhaltung"], "Provisionen und Abrechnung", "Provisionen entstehen automatisch mit dem Verkauf; Pacht-Gutschriften, Contracting-Rechnungen und Zahlungsstatus laufen über „Finanzen & Abrechnung“ (ERPNext, falls angebunden).",
      ["Exporte (CSV) sind protokolliert und formelgeschützt für Excel.", "Zahlungsläufe erst nach KYC-Freigabe des Empfängers (IBAN geprüft)."],
      [{ href: "/portal/admin/deals", label: "Deals & Provisionen" }, { href: "/portal/admin/finanzen", label: "Finanzen & Abrechnung" }], true),
    // Betrieb
    modul("leitstand", ["betrieb"], "Störungs-Leitstand und Anlagen", "Störungen nach Schwere, Quittieren mit Kommentar, Zuweisung; Anlagen mit Komponenten, Messpunkten und Wartung. Kunden sehen nur „Mein Solarstrom“.",
      ["Aus einer Störung lässt sich direkt ein Support-Ticket erzeugen."],
      [{ href: "/portal/admin/anlagen", label: "Anlagen & Störungen" }, { href: "/portal/admin/support", label: "Support-Tickets" }], true),
    // Compliance
    modul("kyc", ["compliance"], "KYC-Warteschlange und Vier-Augen-Prinzip", "Fälle prüfen (Ausweis, Register, wirtschaftlich Berechtigte, IBAN, Eigentum), Sanktions-/PEP-Abgleich, Risikoeinstufung. Hohe Risiken gehen in die Zweitprüfung.",
      ["Unterlagen nur ansehen, wenn nötig – jeder Abruf wird protokolliert.", "Fristen (Ausweis-Ablauf, Wiederholungsprüfung) erscheinen als Aufgaben."],
      [{ href: "/portal/admin/compliance", label: "Compliance (KYC)" }], true),
    // Energie
    modul("handelsdesk", ["energie"], "Handelsdesk und Ausschreibungen", "Spot- und Terminmarkt, Beschaffungsstrategien je Kunde, Ausschreibung unter Versorgern mit Runden und Vergleich, Kündigungsfristen-Alarm.",
      ["Zuschlag nur nach Freigabe des Kunden im Portal.", "Lieferantenstamm pflegen – Einladungen gehen per E-Mail mit Angebotslink."],
      [{ href: "/portal/admin/energie", label: "Energie-Handelsdesk" }, { href: "/portal/admin/energie/ausschreibungen", label: "Ausschreibungen" }], true),
    // Projektleitung
    modul("entwicklung", ["projektleitung"], "Projektentwicklung", "Entwicklungsakte je Projekt mit Gantt, Meilensteinen, Risiken, Budget und Gutachter-Einladung; Übergabe an Börse oder Betrieb.",
      [], [{ href: "/portal/admin/entwicklung", label: "Projektentwicklung" }], true),
    // Nur lesen
    modul("ueberblick", ["lesen"], "Überblick verschaffen", "Sie sehen alle Bereiche außer der Rechteverwaltung, ändern aber nichts. Einstieg: Cockpit für Kennzahlen, Berichte für Entwicklungen, Revisionsprotokoll für Nachvollziehbarkeit.",
      [], [{ href: "/portal/admin", label: "Cockpit" }, { href: "/portal/admin/berichte", label: "Berichte" }], true),
    modul("wissen", ALLE, "Wissensdatenbank", "Interne Anleitungen, Prozessbeschreibungen und Musterantworten – bitte ergänzen, wenn Sie etwas zum zweiten Mal erklären.",
      [], [{ href: "/portal/admin/wissen", label: "Wissensdatenbank" }]),
    {
      id: "aufgabe", titel: "Erste Aufgabe erledigen", kurz: "Erste Aufgabe", art: "aktion",
      text: "Übernehmen Sie eine Aufgabe aus „Meine Aufgaben“ (oder lassen Sie sich eine zuweisen) und schließen Sie sie ab – so kennen Sie den Ablauf von Zuweisung, Wiedervorlage und Erledigung.",
      links: [{ href: "/portal/admin/aufgaben", label: "Aufgaben öffnen", primaer: true }],
      pflicht: ohne("lesen"), kriterium: { fakt: "aufgabenErledigt" }, nurFuer: ohne("lesen"),
    },
  ],
};
