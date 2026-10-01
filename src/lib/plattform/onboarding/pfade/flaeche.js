// src/lib/plattform/onboarding/pfade/flaeche.js – Flächeneigentümer, Landwirt (Agri-PV) und Dacheigentümer

import { benachrichtigungenSchritt, kycSchritt, profilSchritt, terminSchritt, untertypSchritt } from "./gemeinsam";

export const flaeche = {
  id: "flaeche",
  titel: "Einstieg für Flächen- und Dacheigentümer",
  text: "Fläche oder Dach mit den Angaben anlegen, die Planer wirklich brauchen – kostenlose Vorprüfung, Pachtangebot im Portal, Besichtigung vor Ort.",
  rollen: ["flaeche", "landwirt"],
  untertypen: {
    eigentuemer: { label: "Flächeneigentümer", text: "Acker, Grünland, Konversions- oder Gewerbefläche verpachten." },
    landwirt: { label: "Landwirt (Agri-PV)", text: "Landwirtschaft bleibt Hauptnutzung – verpachten, selbst investieren oder beteiligen." },
    dach: { label: "Dacheigentümer", text: "Hallen- oder Gewerbedach verpachten bzw. Solarstrom vor Ort nutzen." },
  },
  schritte: [
    untertypSchritt("Was möchten Sie einbringen?", "Die Auswahl bestimmt, welche Fachangaben wir abfragen – Agri-PV nach DIN SPEC 91434, Dächer mit Statik und Brandschutz."),
    profilSchritt({ text: "Name und Telefon – für die Besichtigung und Rückfragen zu Grundbuch und Bewirtschaftung. Bei Erbengemeinschaften oder Gesellschaften bitte die Person, die für alle spricht." }),
    {
      id: "flaechencheck", titel: "Flächencheck-Ergebnis übernehmen", kurz: "Flächencheck", art: "aktion",
      text: "Sie haben den kostenlosen Flächencheck schon genutzt? Dann liegt das Ergebnis als Anfrage in Ihrem Konto (zugeordnet über Ihre bestätigte E-Mail-Adresse) – im nächsten Schritt übernehmen Sie Größe, Region und Nutzung per Klick, statt sie neu einzugeben. Noch nicht? Der Check dauert zwei Minuten.",
      links: [{ href: "/flaechencheck", label: "Flächencheck starten" }, { href: "/portal/anfragen", label: "Meine Anfragen" }],
      pflicht: false, kriterium: { eines: [{ fakt: "flaechencheck" }, { merker: true }] }, bestaetigbar: true, bestaetigenText: "Nicht nötig",
      nurFuer: ["eigentuemer", "landwirt"],
    },
    {
      id: "flaeche", titel: "Fläche bzw. Dach anlegen", kurz: "Fläche", art: "formular", formular: "flaeche",
      text: "Bezeichnung, Ort und ungefähre Größe genügen für den Anfang. Die Fläche wird als Entwurf gespeichert.",
      texte: {
        landwirt: "Bezeichnung, Ort und ungefähre Größe. Agri-PV ist vorausgewählt – Kultur, Bewirtschaftung und Durchfahrtshöhe ergänzen Sie im nächsten Schritt.",
        dach: "Bezeichnung, Ort und Dachfläche in m² (wird in Hektar umgerechnet). Dachart, Asbest und Statik folgen im nächsten Schritt.",
      },
      pflicht: true, kriterium: { fakt: "flaechen" },
    },
    {
      id: "fachdaten", titel: "Fachangaben ergänzen und zur Vorprüfung einreichen", kurz: "Fachangaben", art: "aktion",
      text: "Auf der Flächenseite nutzen Sie die Fach-Formulare: Flurstücke je Land (DE Gemarkung/Flur, AT KG/EZ, CH Parzelle/E-GRID), Eigentum und Vertretung, Belastungen im Grundbuch, laufende Pacht und Förderbindungen.",
      punkteJe: {
        eigentuemer: ["Katasterfläche angeben – eine Größe über 110 % der Katasterfläche blockiert das Einreichen.", "Grundschulden brauchen später einen Rangrücktritt der Bank – früh klären spart Monate."],
        landwirt: ["Agri-PV: Kategorie nach DIN SPEC 91434, Kultur (Pflicht), Arbeitsbreite, lichte Höhe, Referenzertrag.", "Laufende Förderbindungen (AUKM/ÖPUL) und Pachtverträge mit Ende und Kündigungsfrist angeben – sonst droht Rückforderung."],
        dach: ["Pflicht: Dachart, Asbest (asbesthaltige Dächer können nicht belegt werden), Nutzer des Gebäudes.", "Hilfreich: Baujahr/Restnutzungsdauer der Eindeckung, Statik-Reserve in kN/m², Brandwände, Trafo/Netzanschluss."],
      },
      links: [{ href: "/portal/flaechen", label: "Meine Flächen", primaer: true }],
      pflicht: true, kriterium: { fakt: "flaechenEingereicht" },
    },
    kycSchritt({
      titel: "Eigentumsnachweis und Bankverbindung", text: "Bevor wir Pacht auszahlen oder einen Vertrag schließen, prüfen wir Identität, Eigentum und IBAN. Sie laden die Nachweise einmal im Portal hoch.",
      punkte: ["Grundbuchauszug (DE) bzw. Grundbuchsauszug (AT) oder Grundstücksbeschreibung (CH) – ein aktueller Auszug genügt.", "IBAN des Kontos, auf das die Pacht fließen soll; Kontoinhaber muss Eigentümer bzw. bevollmächtigt sein.", "Bei Erbengemeinschaft oder Miteigentum: Vollmacht aller Beteiligten."],
    }),
    {
      id: "ablauf", titel: "So geht es weiter", kurz: "Ablauf", art: "info",
      text: "Nach dem Einreichen verfolgen Sie jeden Schritt in der Pipeline Ihrer Fläche – mit Erklärung, was passiert und wie lange es in der Regel dauert.",
      punkte: [
        "Vorprüfung (kostenlos): Lage, Netz, Schutzgebiete, Planungsrecht – meist wenige Wochen.",
        "Pachtangebot im Portal mit Ampel je Punkt (Indexierung, Rückbausicherheit, Dienstbarkeit) – prüfen Sie es gern mit Anwalt oder Steuerberatung.",
        "Planung und Genehmigung dauern je nach Land und Verfahren (B-Plan, Umwidmung, Nutzungsplanung) oft ein bis drei Jahre – Dauern sind Erfahrungswerte, keine Zusagen.",
      ],
      punkteJe: { dach: ["Bei Dächern mit Stromnutzung vor Ort: Dachnutzungsvertrag mit Dienstbarkeit und optional Solarstrom-Liefervertrag (Contracting)."] },
      links: [{ href: "/portal/flaechen", label: "Pipeline ansehen" }],
      pflicht: false, kriterium: { merker: true }, bestaetigbar: true, bestaetigenText: "Verstanden",
    },
    terminSchritt({
      art: "besichtigung", titel: "Besichtigung vereinbaren", label: "Besichtigung buchen",
      text: "Gemeinsamer Termin vor Ort (ca. 90 Minuten): Zufahrt, Netzanschluss-Möglichkeiten, Besonderheiten der Fläche bzw. des Dachs und die nächsten Schritte.",
    }),
    benachrichtigungenSchritt("Statuswechsel Ihrer Fläche, Pachtangebote, Nachrichten und Pachtabrechnungen – wählen Sie, was per E-Mail kommen soll."),
  ],
};
