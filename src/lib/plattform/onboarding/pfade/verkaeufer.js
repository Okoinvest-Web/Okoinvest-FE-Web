// src/lib/plattform/onboarding/pfade/verkaeufer.js – Verkäufer: Projektentwickler (Projektrechte) und Bestandsanlagen (getrennte Pfade)

import { benachrichtigungenSchritt, kycSchritt, profilSchritt, terminSchritt, untertypSchritt } from "./gemeinsam";

export const verkaeufer = {
  id: "verkaeufer",
  titel: "Einstieg für Verkäufer",
  text: "Vom ersten Projekt bis zur geprüften Veröffentlichung: Datenblatt, Unterlagen, Provisionsvereinbarung und Verifizierung.",
  rollen: ["anbieter"],
  untertypen: {
    projektentwickler: { label: "Projektrechte verkaufen", text: "Projektentwickler: Rechte von der Flächensicherung bis Ready-to-Build (RTB)." },
    bestand: { label: "Bestandsanlage verkaufen", text: "Eigentümer einer Anlage in Betrieb (COD) – Zweitmarkt nach Ist-Ertrag." },
  },
  schritte: [
    untertypSchritt("Was möchten Sie verkaufen?", "Projektrechte und Bestandsanlagen werden unterschiedlich bewertet – deshalb gibt es zwei Wege mit eigenen Mindestdaten."),
    profilSchritt({ firmaPflicht: true, firmaLabel: "Verkaufende Gesellschaft", text: "Die verkaufende Gesellschaft (bzw. die Projektgesellschaft) laut Register – sie erscheint in Provisionsvereinbarung und Kaufvertragsentwurf." }),
    {
      id: "provision", titel: "Provisionsvereinbarung verstehen", kurz: "Provision", art: "info",
      text: "Die Plattform ist für Sie nur im Erfolgsfall kostenpflichtig: Die Verkäuferprovision von 1,5–3 % des Kaufpreises fällt ausschließlich bei Abschluss an. Den Satz legt das Backoffice bei der Freigabe fest.",
      punkte: [
        "Sie akzeptieren die Vereinbarung beim Einreichen jedes Projekts (Zeitpunkt, IP und Textversion werden gespeichert).",
        "Die Provisionsrechnung entsteht automatisch mit dem Verkauf – vorher gibt es keine Kosten.",
        "Käufer aus Ihrem eigenen Netzwerk? Bitte vor dem Einreichen im Projekt vermerken, damit wir das sauber regeln.",
      ],
      pflicht: true, kriterium: { eines: [{ fakt: "provision" }, { merker: true }] }, bestaetigbar: true, bestaetigenText: "Verstanden",
    },
    {
      id: "projekt", titel: "Erstes Projekt mit Datenblatt anlegen", kurz: "Projekt", art: "aktion",
      text: "Titel anonym halten (keine Gemeinde, kein Flurstück). Das Datenblatt verlangt je Phase unterschiedliche Mindestdaten – der Entwurf ist jederzeit speicherbar.",
      texte: { bestand: "Bestandsanlage als Projekt in Phase „In Betrieb (COD / Bestand)“ anlegen. Für den Zweitmarkt zählen Ist-Erträge, Verfügbarkeit und Restlaufzeiten – das Datenblatt fragt sie im Bereich „Bestandsanlage“ ab." },
      punkteJe: {
        projektentwickler: [
          "Flächensicherung: Anteil gesichert in %, Laufzeit und Optionen der Nutzungsverträge.",
          "Ab Netzanschlusszusage: Netzbetreiber, Zusage (Datum, MW, Befristung), Spannungsebene, Entfernung zum Verknüpfungspunkt.",
          "Ab Aufstellungsbeschluss: Genehmigungsweg und Meilensteine mit Datum (Aufstellung, frühzeitige Beteiligung, Offenlage, Satzung).",
          "Ab RTB: Ertragsgutachten mit P50/P90, Gutachter und Datum; EEG-/EAG-Zuschlag bzw. PPA-Stand.",
        ],
        bestand: [
          "Inbetriebnahme (COD), installierte Leistung DC/AC, Einspeisetarif bzw. Direktvermarkter.",
          "Ist-Erträge je Jahr gegen Prognose, technische Verfügbarkeit, O&M-Vertrag und Versicherung.",
          "Wechselrichter-Tausch, Ende der Förderung und Ende der Pacht – die Pacht sollte die Förderdauer abdecken.",
        ],
      },
      links: [{ href: "/portal/projekte/neu", label: "Projekt anlegen", primaer: true }],
      pflicht: true, kriterium: { eines: [{ alle: [{ untertyp: ["bestand"] }, { fakt: "projekteBestand" }] }, { alle: [{ untertyp: ["projektentwickler"] }, { fakt: "projekte" }] }] },
    },
    {
      id: "unterlagen", titel: "Dokumenten-Checkliste abarbeiten", kurz: "Unterlagen", art: "aktion",
      text: "Auf der Projektseite zeigt die Checkliste je Phase, welche Unterlagen Investoren erwarten. Laden Sie Unterlagen direkt am Punkt hoch – das erhöht die Datenraum-Qualität (70 % Unterlagen, 30 % Datenblatt).",
      punkteJe: {
        projektentwickler: ["Typisch: Nutzungsverträge, Lageplan, Netzanschlusszusage, Beschlüsse zur Bauleitplanung, Gutachten (Artenschutz, Blendung, Baugrund)."],
        bestand: ["Typisch: Inbetriebnahmeprotokoll, Einspeise- und Direktvermarktungsverträge, Ertragsberichte, O&M- und Versicherungsvertrag, Pachtvertrag, Wartungsprotokolle."],
      },
      links: [{ href: "/portal/projekte", label: "Meine Projekte" }],
      pflicht: false, kriterium: { eines: [{ fakt: "datenblatt" }, { merker: true }] }, bestaetigbar: true, bestaetigenText: "Später ergänzen",
    },
    {
      id: "qualitaet", titel: "So läuft die Qualitätsprüfung", kurz: "Qualitätsprüfung", art: "info",
      text: "Vor der Veröffentlichung prüft das Transaktionsteam Anonymität, Plausibilität und Vollständigkeit. Offensichtliche Unstimmigkeiten (z. B. DC/AC-Verhältnis, Ertrag über dem Regionsrichtwert) zeigt das Datenblatt schon beim Ausfüllen.",
      punkte: [
        "Prüfhinweise erscheinen als Fehler, Warnung oder Info – Warnungen blockieren nicht, werden aber Investoren gegenüber erklärt.",
        "Renditeangaben gelten als Anbieterangabe und werden als „ungeprüft“ gekennzeichnet.",
        "Nach der Freigabe sehen Sie Aufrufe, Merker und NDA-Anfragen live; Fragen der Investoren beantworten Sie im Deal-Room.",
      ],
      pflicht: false, kriterium: { merker: true }, bestaetigbar: true, bestaetigenText: "Verstanden",
    },
    kycSchritt({
      titel: "Verifizierung der Gesellschaft (KYB)", text: "Vor Reservierung und Verkauf prüfen wir die verkaufende Gesellschaft: Registerauszug, wirtschaftlich Berechtigte, Vertretung. Frühzeitig starten spart Zeit im Closing.",
      punkte: ["Bei Share Deals zusätzlich die Projektgesellschaft (SPV) – Unterlagen dazu fordert das Transaktionsteam an."],
    }),
    benachrichtigungenSchritt("NDA-Anfragen, Fragen im Deal-Room, Statuswechsel Ihrer Projekte – wählen Sie, was per E-Mail kommen soll."),
    terminSchritt({ art: "beratung_video", titel: "Vermarktung besprechen", text: "Videotermin mit dem Transaktionsteam: Preisvorstellung, Käuferkreis, Bieterverfahren oder Direktansprache.", label: "Videotermin buchen" }),
  ],
};
