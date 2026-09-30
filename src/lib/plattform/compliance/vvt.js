// src/lib/plattform/compliance/vvt.js
//
// Verzeichnis der Verarbeitungstätigkeiten (Art. 30 Abs. 1 DSGVO) der Plattform und Löschkonzept – ENTWURF aus dem
// Funktionsumfang der Plattform. Vor Verwendung durch Datenschutzbeauftragte/Rechtsberatung prüfen und ergänzen
// (Auftragsverarbeiter mit Namen, TOM-Dokument, Drittlandtransfers). Keine Rechtsbehauptung über den Betrieb.
// Python-Gegenstück: plattform/compliance_kern.py (VVT identisch, Abgleich im Test).

export const VVT_STAND = "2026-09-30";
export const VVT_VERANTWORTLICHER = "ÖkoInvest GmbH, Gewerbegebiet 10, 5121 Ostermiething, Österreich (FN 541505g)";

const DSGVO = (x) => `Art. 6 Abs. 1 lit. ${x} DSGVO`;

export const VVT = [
  {
    id: "konto", titel: "Portal-Konto, Anmeldung und Sicherheit", zweck: "Registrierung, Anmeldung, Zwei-Faktor, Sitzungen, Missbrauchsschutz", rechtsgrundlage: `${DSGVO("b")} (Nutzungsvertrag), ${DSGVO("f")} (IT-Sicherheit)`,
    betroffene: "Nutzerinnen und Nutzer des Portals", daten: "Name, E-Mail, Telefon, Firma, Rollen, Passwort-Hash, 2FA-Status, IP-Adresse, Geräte, Anmeldezeitpunkte", empfaenger: "Hosting-/Betriebsdienstleister (Auftragsverarbeitung)",
    drittland: "nicht vorgesehen", loeschung: "Konto bis Löschung durch Nutzer; Sitzungen/Einladungen 30 Tage, Anmeldehistorie 180 Tage nach Ende", module: ["sicherheit"],
  },
  {
    id: "anfragen", titel: "Anfragen und Vorgänge (Formulare, Nachrichten)", zweck: "Bearbeitung von Anfragen zu Flächen, Projekten, Investitionen, Energie; Kommunikation", rechtsgrundlage: `${DSGVO("b")} (vorvertraglich), ${DSGVO("a")} (Einwilligung Formular)`,
    betroffene: "Interessenten, Flächeneigentümer, Landwirte, Unternehmen, Kommunen", daten: "Kontaktdaten, Anfrageinhalte, Flächenangaben, Nachrichten, Dokumente", empfaenger: "intern (Backoffice), Hosting",
    drittland: "nicht vorgesehen", loeschung: "Anfragen ohne Konto in Endstatus: Anonymisierung nach 3 Jahren; mit Konto: bis Kontolöschung bzw. Ende der Aufbewahrungspflicht", module: ["vorgaenge", "nachrichten"],
  },
  {
    id: "boerse", titel: "Projektbörse, NDA, Datenraum und Bieterverfahren", zweck: "Vermittlung von PV-Projekten, Vertraulichkeit, Nachweis der Datenraumzugriffe", rechtsgrundlage: `${DSGVO("b")}, ${DSGVO("f")} (Nachweis NDA/Zugriffe)`,
    betroffene: "Anbieter, Investoren und deren Vertreter", daten: "Kontakt-/Firmendaten, NDA-Akzeptanz (Zeit, IP), LOI/Gebote, Zugriffsprotokolle", empfaenger: "Gegenpartei nur nach Kontaktfreigabe; Hosting",
    drittland: "nicht vorgesehen", loeschung: "Nachweise bis Ablauf der Verjährung bzw. handelsrechtlichen Aufbewahrung des Geschäfts", module: ["projekte", "interessen", "dealroom"],
  },
  {
    id: "kyc", titel: "KYC/KYB – Identifizierung, wirtschaftlich Berechtigte, Sanktions-/PEP-Abgleich", zweck: "Sorgfaltspflichten zur Verhinderung von Geldwäsche und Terrorismusfinanzierung, Betrugsschutz bei Auszahlungen", rechtsgrundlage: `${DSGVO("c")} (GwG, soweit Verpflichtete), sonst ${DSGVO("f")}`,
    betroffene: "Kunden, Vertreter, wirtschaftlich Berechtigte", daten: "Identitätsdaten, Ausweiskopie (verschlüsselt), Register-/Transparenzauszug, PEP-Status, Mittelherkunft, IBAN, Prüfergebnisse", empfaenger: "Identifizierungsdienstleister (falls aktiviert), Registerabruf, Meldestelle nur im Verdachtsfall",
    drittland: "nicht vorgesehen", loeschung: "5 Jahre nach Ende der Geschäftsbeziehung (Löschung ab 01.01. des sechsten Jahres, DE § 8 Abs. 4 GwG; AT/CH entsprechend)", module: ["compliance"],
  },
  {
    id: "verdacht", titel: "Geldwäsche-Verdachtsfälle (intern)", zweck: "Prüfung und Dokumentation von Verdachtsmomenten, ggf. Meldung durch die/den Geldwäschebeauftragte/n", rechtsgrundlage: `${DSGVO("c")} (GwG-Meldepflicht, soweit anwendbar)`,
    betroffene: "Kunden und beteiligte Personen", daten: "Sachverhalt, Anlass, Abwägung, Meldedatum, Aktenzeichen", empfaenger: "zuständige Meldestelle (FIU/A-FIU/MROS) – nur manuell über deren Portal",
    drittland: "nicht vorgesehen", loeschung: "5 Jahre nach Abschluss (CH 10 Jahre); keine Auskunft an Betroffene während des Verfahrens (Tipping-off-Verbot)", module: ["compliance"],
  },
  {
    id: "bonitaet", titel: "Bonitätsauskünfte", zweck: "Prüfung des Ausfallrisikos vor LOI/Vertrag", rechtsgrundlage: `${DSGVO("f")}; keine ausschließlich automatisierte Entscheidung (Art. 22 DSGVO)`,
    betroffene: "Investoren, Vertragspartner mit Ausfallrisiko", daten: "Firmendaten, Score/Ampel, Anlass, Entscheidung und Begründung", empfaenger: "Auskunftei (falls beauftragt)",
    drittland: "nicht vorgesehen", loeschung: "mit Ende der Vertragsanbahnung bzw. nach Aufbewahrungsfrist des Geschäfts", module: ["bonitaet"],
  },
  {
    id: "finanzen", titel: "Abrechnung, Zahlungen, Mahnwesen und Buchführung", zweck: "Pacht-Gutschriften, Contracting- und Provisionsrechnungen, Zahlungseingang, SEPA-Auszahlungen, Mahnungen, Exporte an die Steuerberatung", rechtsgrundlage: `${DSGVO("b")}, ${DSGVO("c")} (BAO/UGB, AO/HGB, OR)`,
    betroffene: "Eigentümer, Contracting-Kunden, Anbieter", daten: "Name, Anschrift, UID, IBAN (aus Verifizierung), Beträge, Zählerstände, Zahlungen", empfaenger: "Banken (SEPA), Steuerberatung, ggf. ERPNext (eigener Server)",
    drittland: "nicht vorgesehen", loeschung: "AT 7 Jahre (§ 132 BAO, § 212 UGB; Grundstücksbezug bis 22 Jahre), DE 10 Jahre (§ 147 AO, § 257 HGB), CH 10 Jahre (Art. 958f OR)", module: ["finanzen"],
  },
  {
    id: "akquise", titel: "Flächenakquise und Direktansprache", zweck: "Ansprache von Eigentümern geeigneter Flächen (Brief, Angebotsseite), Sperrliste", rechtsgrundlage: `${DSGVO("f")} (Direktwerbung, Widerspruchsrecht Art. 21 Abs. 2)`,
    betroffene: "Grundeigentümer potenziell geeigneter Flächen", daten: "Name, Anschrift, Flurstück, Kampagnenstatus, Widerspruch", empfaenger: "Druck-/Versanddienstleister (falls beauftragt)",
    drittland: "nicht vorgesehen", loeschung: "ohne Rückmeldung nach Kampagnenende; Sperrliste dauerhaft (nur Hashwert)", module: ["akquise"], offen: "Zweckbindung eingesehener Grundbuchdaten durch Datenschutzberatung klären",
  },
  {
    id: "energie", titel: "Energiebeschaffung und Lastgänge", zweck: "Beschaffungsstrategie, Ausschreibung unter Energieversorgern, Wechselanalyse", rechtsgrundlage: `${DSGVO("b")}`,
    betroffene: "Ansprechpartner der Kunden (Unternehmen)", daten: "Kontaktdaten, Lastgänge je Abnahmestelle, Verträge", empfaenger: "Energieversorger – nur anonymisierte Lastgänge",
    drittland: "nicht vorgesehen", loeschung: "Ende des Beschaffungsmandats + handelsrechtliche Aufbewahrung der Verträge", module: ["energie"],
  },
  {
    id: "anlagen", titel: "Anlagenbetrieb, Monitoring und Service", zweck: "Überwachung, Störungen, Wartung, Tickets", rechtsgrundlage: `${DSGVO("b")}, ${DSGVO("f")}`,
    betroffene: "Kunden, Ansprechpartner vor Ort, Techniker", daten: "Kontaktdaten, Standort, Messwerte (Anlagen-, keine Personendaten), Ticketinhalte", empfaenger: "Servicepartner (falls beauftragt)",
    drittland: "nicht vorgesehen", loeschung: "Vertragsende + Gewährleistungs-/Aufbewahrungsfristen", module: ["anlagen", "support"],
  },
  {
    id: "signatur", titel: "Elektronische Unterschrift und Termine", zweck: "Unterzeichnung von Dokumenten, Terminbuchung", rechtsgrundlage: `${DSGVO("b")}`,
    betroffene: "Unterzeichnende, Terminbuchende", daten: "Name, E-Mail, Signaturbild, Zeitstempel, IP, Hashwerte", empfaenger: "Hosting",
    drittland: "nicht vorgesehen", loeschung: "wie das unterzeichnete Dokument (Vertrags-/Aufbewahrungsfrist)", module: ["signatur", "kalender"],
  },
  {
    id: "protokoll", titel: "Revisionsprotokoll (Hash-Kette)", zweck: "Nachvollziehbarkeit und Integrität von Änderungen und Zugriffen", rechtsgrundlage: `${DSGVO("c")} und ${DSGVO("f")}`,
    betroffene: "Nutzer und Backoffice", daten: "Zeit, Konto, Aktion, Objekt, IP", empfaenger: "intern",
    drittland: "nicht vorgesehen", loeschung: "nicht löschbar (Integrität); kontrollierte Archivierung nach Ablauf der längsten Aufbewahrungsfrist", module: ["protokoll"],
  },
  {
    id: "ki", titel: "KI-Assistent (optional)", zweck: "Formulierungshilfe, Zusammenfassungen im Backoffice", rechtsgrundlage: `${DSGVO("f")}`,
    betroffene: "Backoffice-Nutzer; ggf. in Texten genannte Personen", daten: "Nutzungsprotokoll ohne Inhalte", empfaenger: "KI-Anbieter (falls aktiviert)",
    drittland: "zu prüfen (Anbieter/Standort)", loeschung: "Nutzungsprotokoll 1 Jahr", module: ["ki"], offen: "Drittlandtransfer und Auftragsverarbeitung klären",
  },
  {
    id: "personal", titel: "Team, Zeiten und Abwesenheiten", zweck: "Personaleinsatz, Vertretung", rechtsgrundlage: `${DSGVO("b")}, § 26 BDSG bzw. entsprechende nationale Regeln`,
    betroffene: "Beschäftigte", daten: "Name, Rolle, Abwesenheiten, Zeiteinträge", empfaenger: "Lohnverrechnung (falls beauftragt)",
    drittland: "nicht vorgesehen", loeschung: "nach arbeits-/steuerrechtlichen Fristen", module: ["team"],
  },
];

/** Löschkonzept: Aufbewahrungsklassen (Anzeige; technische Umsetzung siehe aufbewahrung.py/kycFristen/Scheduler) */
export const LOESCHKLASSEN = [
  { id: "sitzung", titel: "Sitzungen, Einladungen", frist: "30 Tage nach Ablauf", umsetzung: "täglicher Job (sicherheit.aufraeumen)" },
  { id: "anmeldung", titel: "Anmeldehistorie", frist: "180 Tage", umsetzung: "täglicher Job (sicherheit.aufraeumen)" },
  { id: "benachrichtigung", titel: "Benachrichtigungen", frist: "gelesen 1 Jahr, alle 2 Jahre", umsetzung: "täglicher Job (aufbewahrung.py)" },
  { id: "vorgang", titel: "Anfragen ohne Konto (Endstatus)", frist: "3 Jahre → anonymisieren", umsetzung: "täglicher Job (aufbewahrung.py)" },
  { id: "kyc", titel: "KYC/KYB-Unterlagen", frist: "5 Jahre nach Ende der Geschäftsbeziehung", umsetzung: "Fristen-Lauf Compliance (kycFristen, täglich)" },
  { id: "verdacht", titel: "Verdachtsfälle", frist: "5 Jahre nach Abschluss (CH 10)", umsetzung: "Löschvormerkung in der Verdachtsakte" },
  { id: "dsgvo", titel: "Betroffenenanfragen (Nachweis)", frist: "3 Jahre nach Erledigung", umsetzung: "Löschvormerkung in der Anfrage" },
  { id: "belege", titel: "Belege, Buchungen, Verträge", frist: "AT 7 / DE 10 / CH 10 Jahre (Grundstücksbezug AT bis 22)", umsetzung: "nicht löschbar in der Anwendung – Archivierung nach Fristablauf" },
  { id: "protokoll", titel: "Revisionsprotokoll", frist: "längste Aufbewahrungsfrist", umsetzung: "Archivierung (GO-LIVE.md, Löschkonzept)" },
];

const csvFeld = (v) => {
  let s = String(v ?? "");
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[;"\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** VVT als Excel-CSV (UTF-8 mit BOM) */
export function vvtCsv(liste = VVT) {
  const kopf = ["Nr.", "Verarbeitungstätigkeit", "Zweck", "Rechtsgrundlage", "Betroffene", "Datenkategorien", "Empfänger", "Drittland", "Löschfrist", "Offene Punkte"];
  const zeilen = liste.map((v, i) => [i + 1, v.titel, v.zweck, v.rechtsgrundlage, v.betroffene, v.daten, v.empfaenger, v.drittland, v.loeschung, v.offen || ""].map(csvFeld).join(";"));
  return "﻿" + [`Verzeichnis der Verarbeitungstätigkeiten (Art. 30 DSGVO) – Entwurf, Stand ${VVT_STAND};;;;;;;;;`, `Verantwortlicher: ${csvFeld(VVT_VERANTWORTLICHER)};;;;;;;;;`, kopf.join(";"), ...zeilen].join("\r\n") + "\r\n";
}

/** VVT als JSON (für Dokumentation/Archiv) */
export function vvtJson(liste = VVT) {
  return { format: "oekoinvest-vvt-1", stand: VVT_STAND, entwurf: true, verantwortlicher: VVT_VERANTWORTLICHER, hinweis: "Entwurf aus dem Funktionsumfang der Plattform – vor Verwendung durch Datenschutzbeauftragte/Rechtsberatung prüfen.", taetigkeiten: liste, loeschkonzept: LOESCHKLASSEN };
}
