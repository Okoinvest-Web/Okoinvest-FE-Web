// src/lib/plattform/onboarding/pfade/weitere.js – kurze Pfade: Mitglied, Gutachter/Planer, Lieferant (Energieversorger), Bank

import { benachrichtigungenSchritt, kycSchritt, profilSchritt, zweiFaktorSchritt } from "./gemeinsam";

export const mitglied = {
  id: "mitglied",
  titel: "Einstieg für Mitglieder",
  text: "Genossenschaft oder Energiegemeinschaft: Interesse vormerken, Pflichthinweise kennen, Status verfolgen.",
  rollen: ["mitglied"],
  schritte: [
    profilSchritt({ text: "Name und Telefon. Für eine spätere Zeichnung von Anteilen brauchen wir zusätzlich Ihre Anschrift – das erfragen wir erst, wenn die Genossenschaft zeichnungsbereit ist." }),
    {
      id: "beteiligung", titel: "Beteiligung vormerken", kurz: "Beteiligung", art: "aktion",
      text: "Genossenschaft (Anteile an Solarparks in der Region) oder Energiegemeinschaft (Strom gemeinsam erzeugen und nutzen) – mit den Stammdaten Ihres Landes (z. B. 33-stellige Zählpunktnummer in Österreich).",
      links: [{ href: "/portal/beteiligung", label: "Beteiligung öffnen", primaer: true }],
      pflicht: true, kriterium: { fakt: "beteiligung" },
    },
    {
      id: "pflichthinweise", titel: "Pflichthinweise zur Genossenschaft", kurz: "Pflichthinweise", art: "info", begriff: "nachschusspflicht",
      text: "Die Genossenschaft ist im Aufbau – eine Zeichnung ist noch nicht möglich, Sie merken Ihr Interesse unverbindlich vor.",
      punkte: [
        "Geschäftsanteile sind unternehmerische Beteiligungen: Verlust ist möglich; eine Nachschusspflicht regelt die Satzung.",
        "Kündigung und Auszahlung richten sich nach Satzung und Gesetz (DE u. a. §§ 65, 73 GenG) – das Geld ist nicht täglich verfügbar.",
        "ÖkoInvest erbringt keine Anlageberatung.",
      ],
      pflicht: true, kriterium: { merker: true }, bestaetigbar: true, bestaetigenText: "Zur Kenntnis genommen",
    },
    kycSchritt({ pflicht: false, text: "Für die spätere Zeichnung ist eine Identitätsprüfung nötig. Sie können sie jetzt schon anstoßen – oder später, wenn die Genossenschaft zeichnungsbereit ist." }),
    benachrichtigungenSchritt(),
  ],
};

export const gutachter = {
  id: "gutachter",
  titel: "Einstieg für Gutachter und Planer",
  text: "Zugewiesene Gutachten und Meilensteine, Upload der Ergebnisse, Rückfragen – mehr nicht, und das sicher.",
  rollen: ["gutachter"],
  schritte: [
    profilSchritt({ firmaPflicht: true, firmaLabel: "Büro / Sachverständigenbüro", text: "Büro und Ansprechperson. Qualifikation (z. B. öffentlich bestellt, Fachkunde Artenschutz) bitte bei der ersten Rückfrage nennen – sie wird am Auftrag vermerkt." }),
    zweiFaktorSchritt({ pflicht: true, text: "Sie sehen vertrauliche Projektunterlagen – deshalb ist die Zwei-Faktor-Anmeldung für Gutachter Pflicht." }),
    {
      id: "auftraege", titel: "Aufträge ansehen", kurz: "Aufträge", art: "aktion",
      text: "Unter „Aufträge & Projekte“ sehen Sie nur die Meilensteine, die Ihnen zugewiesen wurden – mit Frist, Unterlagen und Rückfragen.",
      links: [{ href: "/portal/entwicklung", label: "Aufträge öffnen", primaer: true }],
      pflicht: true, kriterium: { eines: [{ fakt: "auftraege" }, { merker: true }] }, bestaetigbar: true, bestaetigenText: "Noch kein Auftrag",
    },
    {
      id: "regeln", titel: "So melden Sie Ergebnisse", kurz: "Ablauf", art: "info",
      text: "Laden Sie das Gutachten am Meilenstein hoch und melden Sie „eingereicht“ – erst mit Upload möglich. „Erledigt“ setzt die Projektleitung nach Prüfung.",
      punkte: ["Rückfragen direkt am Meilenstein – so bleibt der Verlauf nachvollziehbar.", "Unterlagen nur für den Auftrag verwenden; Weitergabe nur nach Absprache."],
      pflicht: false, kriterium: { merker: true }, bestaetigbar: true, bestaetigenText: "Verstanden",
    },
    benachrichtigungenSchritt("Neue Aufträge, Fristen und Rückfragen – wählen Sie, was per E-Mail kommen soll."),
  ],
};

export const lieferant = {
  id: "lieferant",
  titel: "Einstieg für Energieversorger",
  text: "Angebotsanfragen mit anonymisierten Lastgängen, Preisblatt, Fristen und Runden – bis zum Zuschlag.",
  rollen: ["lieferant"],
  schritte: [
    profilSchritt({ firmaPflicht: true, firmaLabel: "Energieversorger", text: "Firma und Ansprechperson im Vertrieb (Großkunden/B2B), an die Angebotsanfragen gehen." }),
    zweiFaktorSchritt({ text: "Empfohlen: Preisblätter sind wettbewerbsrelevant – schützen Sie den Zugang mit einem zweiten Faktor." }),
    {
      id: "anfragen", titel: "Angebotsanfragen ansehen", kurz: "Anfragen", art: "aktion",
      text: "Jede Anfrage enthält Lastgang bzw. Verbrauch (anonymisiert), Lieferzeitraum, Preisstruktur und Frist. Sie geben je Runde ein Preisblatt ab und können es bis zur Frist ändern.",
      links: [{ href: "/portal/ausschreibungen", label: "Angebotsanfragen öffnen", primaer: true }],
      pflicht: true, kriterium: { eines: [{ fakt: "ausschreibungen" }, { merker: true }] }, bestaetigbar: true, bestaetigenText: "Noch keine Anfrage",
    },
    {
      id: "regeln", titel: "Regeln der Ausschreibung", kurz: "Regeln", art: "info",
      text: "Alle Versorger erhalten dieselben Informationen. Fragen stellen Sie im Portal – Antworten sehen alle Bieter anonym.",
      punkte: ["Bindefrist des Angebots bitte realistisch angeben – der Kunde gibt den Zuschlag im Portal frei.", "Nach dem Zuschlag erhalten Sie Firmendaten und Vollmacht des Kunden für den Vertrag."],
      pflicht: false, kriterium: { merker: true }, bestaetigbar: true, bestaetigenText: "Verstanden",
    },
    benachrichtigungenSchritt("Neue Angebotsanfragen, Fristen, Runden und Zuschläge – wählen Sie, was per E-Mail kommen soll."),
  ],
};

export const bank = {
  id: "bank",
  titel: "Einstieg für Finanzierungspartner",
  text: "Finanzierungsanfragen mit freigegebenem Bankenpaket, Term Sheet abgeben, Rückfragen stellen.",
  rollen: ["bank"],
  schritte: [
    profilSchritt({ firmaPflicht: true, firmaLabel: "Bank / Institut", text: "Institut und Ansprechperson (z. B. Projekt- oder Erneuerbare-Energien-Finanzierung)." }),
    zweiFaktorSchritt({ pflicht: true, text: "Bankenpakete enthalten Financial Model, Ertragsgutachten und Verträge – deshalb ist die Zwei-Faktor-Anmeldung Pflicht." }),
    {
      id: "anfragen", titel: "Finanzierungsanfragen ansehen", kurz: "Anfragen", art: "aktion",
      text: "Sie sehen nur Anfragen, zu denen Ihr Institut eingeladen wurde – mit dem jeweils freigegebenen Bankenpaket.",
      links: [{ href: "/portal/bank", label: "Finanzierungsanfragen öffnen", primaer: true }],
      pflicht: true, kriterium: { eines: [{ fakt: "bankAnfragen" }, { merker: true }] }, bestaetigbar: true, bestaetigenText: "Noch keine Anfrage",
    },
    {
      id: "vertraulichkeit", titel: "Vertraulichkeit und Protokoll", kurz: "Vertraulichkeit", art: "info",
      text: "Jeder Abruf eines Bausteins wird protokolliert. Term Sheets, Absagen und Rückfragen geben Sie im Portal ab – so bleibt die Entscheidung nachvollziehbar.",
      punkte: ["Covenants (DSCR, LLCR) werden im Betrieb aus Anlagen-Messdaten überwacht; Frühwarnungen erhalten Sie nach Kreditvertrag."],
      pflicht: false, kriterium: { merker: true }, bestaetigbar: true, bestaetigenText: "Verstanden",
    },
    benachrichtigungenSchritt("Neue Anfragen, Rückfragen und Covenant-Frühwarnungen – wählen Sie, was per E-Mail kommen soll."),
  ],
};
