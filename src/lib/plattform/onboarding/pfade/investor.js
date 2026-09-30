// src/lib/plattform/onboarding/pfade/investor.js – Investor je Typ (Family Office, Fonds/AIF, Stadtwerk/EVU, IPP, Privatinvestor)

import { benachrichtigungenSchritt, kycSchritt, profilSchritt, terminSchritt, untertypSchritt } from "./gemeinsam";

export const investor = {
  id: "investor",
  titel: "Einstieg für Investoren",
  text: "In rund zehn Minuten zum arbeitsfähigen Konto: Suchprofil mit Matching, Verifizierung für Datenraum und LOI, Termin mit dem Transaktionsteam.",
  rollen: ["investor"],
  untertypen: {
    family_office: { label: "Family Office", text: "Eigenes Vermögen, flexible Tickets, oft Co-Investments." },
    fonds: { label: "Fonds / AIF / Asset Manager", text: "Spezialfonds, AIF, Versicherer – Mandat, Gremien, ESG-Vorgaben." },
    stadtwerk: { label: "Stadtwerk / EVU", text: "Kommunale Versorger und Energieversorger – Erzeugung im Netzgebiet, Direktvermarktung." },
    ipp: { label: "IPP / Stromerzeuger", text: "Unabhängige Erzeuger mit eigenem Betrieb, oft Co-Development." },
    privat: { label: "Privatinvestor", text: "Natürliche Person – kleinere Tickets, meist Bestandsanlagen oder baureife Projekte." },
  },
  schritte: [
    untertypSchritt("Welcher Investorentyp sind Sie?", "Die Auswahl bestimmt die folgenden Schritte (z. B. KYB mit wirtschaftlich Berechtigten für Gesellschaften) und wird als Investorentyp in Ihr Suchprofil übernommen."),
    profilSchritt({
      firmaPflicht: true, firmaAusser: ["privat"], firmaLabel: "Gesellschaft / Investmentvehikel",
      text: "Unter welchem Namen investieren Sie? Bei Gesellschaften die vollständige Firma laut Register – sie erscheint in NDA, LOI und Exposé-Wasserzeichen.",
    }),
    {
      id: "suchprofil", titel: "Suchprofil fachlich anlegen", kurz: "Suchprofil", art: "formular", formular: "suchprofil",
      text: "Projekttypen, Länder, Größe und Phasen – daraus berechnen wir für jedes Projekt einen Matching-Score und melden neue Treffer.",
      texte: {
        stadtwerk: "Projekttypen, Länder, Größe und Phasen. Tipp: Regionen auf Ihr Netz- bzw. Versorgungsgebiet eingrenzen – Direktvermarktung und Bürgerbeteiligung lassen sich im Profil als ESG-Kriterium ergänzen.",
        fonds: "Projekttypen, Länder, Größe und Phasen laut Anlagerichtlinie. Taxonomie-/SFDR-Anforderungen ergänzen Sie im nächsten Schritt.",
        privat: "Projekttypen, Länder und Größe. Für den Einstieg eignen sich meist Bestandsanlagen (Phase „In Betrieb“) oder baureife Projekte mit geringem Entwicklungsrisiko.",
      },
      pflicht: true, kriterium: { fakt: "suchprofil" },
    },
    {
      id: "ticket", titel: "Ticketgröße und Deal-Struktur", kurz: "Ticket & Struktur", art: "formular", formular: "ticket",
      text: "Wie viel Eigenkapital je Transaktion, Asset oder Share Deal, Rendite-Ziel und Finanzierungsweise – damit wir nur passende Projekte vorschlagen.",
      punkte: [
        "Asset Deal: Kauf der Anlage bzw. Rechte einzeln – Verträge müssen übertragen werden.",
        "Share Deal: Kauf der Projektgesellschaft (SPV) mit allen Verträgen – übliche Form bei Projektrechten.",
        "Rendite-Ziel: bitte Basis angeben (Projekt-IRR oder Eigenkapital-IRR) – sie wird im Bewertungswerkzeug vorbelegt.",
      ],
      punkteJe: {
        fonds: ["ESG: EU-Taxonomie und Art. 8/9 SFDR im Suchprofil markieren – Projekte ohne Nachweise werden als „prüfen“ gekennzeichnet."],
        ipp: ["Co-Development: Wenn Sie Projekte in früher Phase gemeinsam weiterentwickeln wollen, im Suchprofil „Co-Development gewünscht“ wählen."],
        privat: ["Als Privatperson prüfen Sie bitte mit Steuerberatung, ob der Kauf gewerblich ist (Einkünfte aus Gewerbebetrieb) – keine Anlageberatung durch ÖkoInvest."],
      },
      pflicht: true, kriterium: { eines: [{ fakt: "suchprofilTicket" }, { fakt: "suchprofilStruktur" }] },
    },
    kycSchritt({
      text: "Vor Datenraum-Zugriff, LOI und Zuschlag prüfen wir Identität bzw. Gesellschaft (Geldwäschegesetz). Starten Sie jetzt – die Prüfung läuft parallel zu Ihrer Projektsuche.",
      punkteJe: {
        family_office: ["KYB: Registerauszug (nicht älter als 3 Monate), wirtschaftlich Berechtigte ab 25 %, Ausweis der vertretungsberechtigten Person."],
        fonds: ["KYB: Registerauszug der Fondsgesellschaft bzw. KVG, Nachweis der Vertretung, wirtschaftlich Berechtigte bzw. fiktiv wirtschaftlich Berechtigte (Geschäftsleitung), sofern keine natürliche Person ≥ 25 % hält."],
        stadtwerk: ["KYB: Registerauszug, Beteiligungsverhältnisse (kommunale Gesellschafter), Vertretungsnachweis. Bei mehrheitlich öffentlicher Hand nach aktuellem Stand vereinfachte Prüfung möglich – die Compliance entscheidet im Einzelfall."],
        ipp: ["KYB: Registerauszug, Gesellschafterstruktur bis zu den wirtschaftlich Berechtigten, Vertretungsnachweis."],
        privat: ["KYC: amtlicher Lichtbildausweis (Vorder- und Rückseite), Meldeadresse; optional Online-Identifizierung per Video."],
      },
    }),
    {
      id: "nda", titel: "NDA-Rahmen verstehen", kurz: "NDA", art: "info", begriff: "nda",
      text: "Projekte erscheinen anonym. Vertrauliche Angaben, Datenblatt und Datenraum öffnen sich erst nach Klick-NDA je Projekt und Freigabe durch das Transaktionsteam.",
      punkte: [
        "Die Klick-NDA gilt je Projekt; Zeitpunkt, IP-Adresse und Textversion werden als Nachweis gespeichert.",
        "Jeder Datenraum-Download und jedes Exposé wird protokolliert; Exposés tragen Ihren Namen als Wasserzeichen.",
        "Vertrauliche Inhalte nicht weitergeben – auch nicht an Finanzierer, bevor diese selbst eine NDA gezeichnet haben.",
        "Für Investoren ist die Plattform kostenfrei – die Provision trägt der Verkäufer, und nur bei Abschluss.",
      ],
      pflicht: true, kriterium: { eines: [{ fakt: "interessen" }, { merker: true }] }, bestaetigbar: true, bestaetigenText: "Verstanden",
      links: [{ href: "/portal/boerse", label: "Projektbörse ansehen" }],
    },
    {
      id: "bonitaet", titel: "Hinweis zur Bonitätsprüfung", kurz: "Bonität", art: "info",
      text: "Vor einer LOI bzw. vor dem Zuschlag in einem Bieterverfahren kann das Transaktionsteam eine Bonitätsauskunft einholen (z. B. KSV1870, Creditreform, CRIF) – nur mit berechtigtem Interesse und nach den Datenschutzvorgaben.",
      punkte: [
        "Halten Sie Finanzierungsnachweis bzw. Eigenkapitalbestätigung (Bank, Gremienbeschluss) bereit – das beschleunigt Exklusivität und Zuschlag.",
        "Ergebnisse sieht nur das Backoffice (Transaktion, Compliance, Leitung) – sie erscheinen nicht beim Verkäufer.",
      ],
      punkteJe: { privat: ["Bei Privatpersonen erfolgt eine Auskunft nur mit Ihrer ausdrücklichen Zustimmung."] },
      pflicht: false, kriterium: { merker: true }, bestaetigbar: true, bestaetigenText: "Verstanden",
    },
    {
      id: "finanzierung", titel: "Finanzierungs-Cockpit kennenlernen", kurz: "Finanzierung", art: "aktion",
      text: "Rendite je Projekt nach Login, Vergleich Eigenkapital, Annuitäten- und Förderkredit, Leasing und Mietkauf, Szenarien speichern und als PDF weitergeben.",
      punkte: ["Fremdkapital wird auf P90 und Mindest-DSCR bemessen – so rechnen auch die meisten Banken.", "Zahlen im Cockpit sind Modellrechnungen vor Steuern und ersetzen keine Bank- oder Steuerberatung."],
      links: [{ href: "/portal/finanzierung", label: "Cockpit öffnen", primaer: true }],
      pflicht: false, kriterium: { merker: true }, bestaetigbar: true, bestaetigenText: "Angesehen",
    },
    benachrichtigungenSchritt("Neue Treffer zu Ihrem Suchprofil, NDA-Freigaben und LOI-Antworten – wählen Sie, was per E-Mail kommen soll."),
    terminSchritt({
      art: "beratung_video", titel: "Kennenlernen mit dem Transaktionsteam",
      text: "30–45 Minuten per Video: Investitionskriterien, aktuelle Pipeline, Ablauf von NDA bis Closing. Danach meldet sich eine feste Ansprechperson.",
      label: "Videotermin buchen",
    }),
  ],
};
