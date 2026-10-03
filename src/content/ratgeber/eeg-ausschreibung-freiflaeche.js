// Ratgeber: EEG-Ausschreibung Freifläche (Solaranlagen des ersten Segments)
// Ergebnisse: Bundesnetzagentur, Beendete Ausschreibungen / Statistiken und Pressemitteilungen
// vom 12.05.2026 und 18.08.2026 (abgerufen 09/2026). Recht: EEG 2023 §§ 37, 37a, 37c, 37d, 51, 51a, 54, 55.

import { ERLOESE, FREIFLAECHE, KOMMUNE, regionById, npv, FINANZIERUNG } from "@/lib/invest/markt";
import { fmt, fmtEur, fmtCt } from "@/lib/rechner/annahmen";
import { pfad } from "../../lib/land/index.js";

/**
 * Ergebnisse der letzten Gebotstermine im ersten Segment (Bundesnetzagentur).
 * Volumen/Gebote/Zuschläge in MW, Werte in ct/kWh. Vorschlag für markt.js (ERLOESE.eegRunden).
 */
const RUNDEN = [
  { termin: "01.03.2025", volumen: 2625, gebote: 3839, zuschlag: 2638, min: 3.99, max: 4.88, schnitt: 4.66, hoechstwert: 6.8 },
  { termin: "01.07.2025", volumen: 2266, gebote: 2820, zuschlag: 2271, min: 4.0, max: 6.26, schnitt: 4.84, hoechstwert: 6.8 },
  { termin: "01.12.2025", volumen: 2328, gebote: 5247, zuschlag: 2341, min: 4.4, max: 5.3, schnitt: 5.0, hoechstwert: 6.8 },
  { termin: "01.03.2026", volumen: 2295, gebote: 4622, zuschlag: 2299, min: 3.99, max: 5.1, schnitt: 4.94, hoechstwert: 5.79 },
  { termin: "01.07.2026", volumen: 2135, gebote: 3170, zuschlag: 2135, min: 4.38, max: 4.97, schnitt: 4.79, hoechstwert: 5.9 },
];
const LETZTE = RUNDEN[RUNDEN.length - 1];

// Rechtliche Eckwerte EEG 2023 (gesetze-im-internet.de / Bundesnetzagentur, 09/2026)
const SICHERHEIT_EUR_KW = 50; // § 37a EEG
const SICHERHEIT_BPLAN_EUR_KW = 25; // § 37a Satz 2 EEG
const GEBUEHR_EUR = 624; // Gebühr je Gebot laut Bundesnetzagentur
const ABSCHLAG_CT = 0.3; // § 54 Abs. 1 EEG
const RANDSTREIFEN_M = 500; // § 37 Abs. 1 Nr. 2 c EEG
const ACKER_DECKEL_GW = 80; // § 37 Abs. 4 EEG
const LAENDER_QUOTE = 0.01; // § 37c Abs. 2 EEG: 1 % der landwirtschaftlichen Fläche vor 2031

// Rechenbeispiel 10 MWp Süddeutschland
const KWP = 10000;
const REGION = regionById("de-sued");
const MWH = (KWP * REGION.ertrag) / 1000;
const erloes = (ct) => (MWH * 1000 * ct) / 100;
const SICHERHEIT = KWP * SICHERHEIT_EUR_KW;
const SICHERHEIT_BPLAN = KWP * SICHERHEIT_BPLAN_EUR_KW;
const VERLUST_ABSCHLAG = erloes(ABSCHLAG_CT);
const BARWERT_ABSCHLAG = npv(FINANZIERUNG.diskont, [0, ...Array.from({ length: 20 }, (_, t) => VERLUST_ABSCHLAG * Math.pow(1 - FREIFLAECHE.degradation, t))]);
const KOMMUNAL = erloes(KOMMUNE.beteiligungCt);

const artikel = {
  slug: "eeg-ausschreibung-freiflaeche",
  title: "EEG-Ausschreibung Freifläche: Termine, Zuschläge und Regeln",
  seoTitle: "EEG-Ausschreibung Freifläche 2026 | ÖkoInvest",
  kurzTitel: "EEG-Ausschreibung Freifläche",
  description:
    "EEG-Ausschreibung für Freiflächen-PV: Gebotstermine, Höchstwert und Zuschlagswerte 2025/2026, Flächenkulisse, Sicherheiten, Fristen und Alternativen wie PPA.",
  excerpt:
    "Wie Solarparks in Deutschland an die Marktprämie kommen: Gebotstermine, aktuelle Zuschlagswerte der Bundesnetzagentur, welche Flächen zulässig sind, was Sicherheiten und Fristen kosten und wann ein PPA die bessere Wahl ist.",
  hauptKeyword: "eeg ausschreibung freifläche",
  keywords: [
    "EEG-Ausschreibung Freifläche",
    "Ausschreibung Solar erstes Segment",
    "Zuschlagswert Photovoltaik 2026",
    "Höchstwert Solarausschreibung",
    "Gebotstermin Bundesnetzagentur Solar",
    "Flächenkulisse EEG § 37",
    "benachteiligte Gebiete Photovoltaik",
  ],
  veroeffentlicht: "2026-09-29",
  aktualisiert: "2026-09-29",
  kategorie: "Investieren & Projektbörse",
  bild: "/img/solarpark-himmel.jpg",
  bildAlt: "Freiflächen-Solarpark mit langen, schräg aufgeständerten Modulreihen unter blauem Himmel mit Schleierwolken",
  badge: { wert: fmtCt(LETZTE.schnitt, 2), text: `durchschnittlicher Zuschlagswert, Gebotstermin ${LETZTE.termin}` },

  kurzFazit: [
    "**Solarparks ab 1 MW erhalten in Deutschland eine Marktprämie nur über die Ausschreibung der Bundesnetzagentur.** Gebotstermine im ersten Segment sind jeweils der **1. März, 1. Juli und 1. Dezember**.",
    `Der mengengewichtete Zuschlagswert lag zuletzt bei **${fmtCt(LETZTE.schnitt, 2)}** (Gebotstermin ${LETZTE.termin}), der Höchstwert bei ${fmtCt(LETZTE.hoechstwert, 2)}. Seit 2024 bewegen sich die Durchschnittswerte grob zwischen 4,7 und 5,1 ct/kWh.`,
    `Gebote sind nur auf zulässigen Flächen möglich: u. a. versiegelte und Konversionsflächen, **Randstreifen bis ${RANDSTREIFEN_M} m** an Autobahnen und Schienenwegen, benachteiligte Gebiete (je nach Land) und besondere Solaranlagen wie Agri-PV.`,
    `Bieter hinterlegen **${SICHERHEIT_EUR_KW} €/kW** Sicherheit (${SICHERHEIT_BPLAN_EUR_KW} €/kW mit beschlossenem B-Plan). Wer nicht baut, zahlt eine Pönale in derselben Größenordnung.`,
  ],

  abschnitte: [
    {
      id: "antwort",
      titel: "Wie funktioniert die EEG-Ausschreibung für Freiflächen?",
      tocLabel: "So funktioniert sie",
      bloecke: [
        {
          typ: "p",
          text: "**In der EEG-Ausschreibung bieten Projektierer auf den anzulegenden Wert in Cent je Kilowattstunde; die günstigsten Gebote erhalten einen Zuschlag, bis das ausgeschriebene Volumen erreicht ist.** Jedes Gebot wird mit seinem eigenen Wert bezuschlagt („pay as bid“). Der Zuschlag sichert für 20 Jahre eine gleitende Marktprämie.",
        },
        {
          typ: "p",
          text: "Die [Ausschreibung](/wissen/lexikon#ausschreibung-eeg) für „Solaranlagen des ersten Segments“ umfasst Freiflächenanlagen und Anlagen auf sonstigen baulichen Anlagen. Dachanlagen laufen im zweiten Segment mit eigenen Terminen. Teilnehmen müssen alle Freiflächenanlagen, die eine Marktprämie wollen und größer als 1 MW sind; das Mindestgebot liegt nach Angaben der Bundesnetzagentur bei 1.001 kWp. Kleinere Anlagen erhalten den gesetzlich festgelegten Wert ohne Ausschreibung.",
        },
        {
          typ: "karten",
          cols: 3,
          items: [
            { titel: "Gebotstermine", text: "1. März, 1. Juli, 1. Dezember – dreimal im Jahr, jeweils mit eigenem Volumen." },
            { titel: "Voraussetzung", text: "Mindestens ein Aufstellungsbeschluss für den Bebauungsplan, dazu Sicherheit und Gebühr." },
            { titel: "Ergebnis", text: "Zuschlag mit eigenem Gebotswert als anzulegender Wert für 20 Jahre ab Inbetriebnahme." },
          ],
        },
        {
          typ: "p",
          text: "Wie ein Projekt überhaupt bis zum Aufstellungsbeschluss kommt, beschreibt der Ratgeber [Solarpark-Genehmigung und Bebauungsplan](/wissen/ratgeber/solarpark-genehmigung-bebauungsplan).",
        },
      ],
    },
    {
      id: "ergebnisse",
      titel: "Gebotstermine und Ergebnisse 2025/2026",
      tocLabel: "Ergebnisse",
      bloecke: [
        {
          typ: "p",
          text: `**Die Runden sind seit Jahren überzeichnet, die Zuschlagswerte bleiben stabil knapp unter 5 ct/kWh.** Zum Gebotstermin ${LETZTE.termin} gingen ${fmt(LETZTE.gebote)} MW Gebote für ${fmt(LETZTE.volumen)} MW Volumen ein. Die Zuschläge lagen zwischen ${fmtCt(LETZTE.min, 2)} und ${fmtCt(LETZTE.max, 2)}.`,
        },
        {
          typ: "tabelle",
          caption: "Ausschreibungen Solaranlagen erstes Segment: Ergebnisse 2025 und 2026 (Bundesnetzagentur)",
          kopf: ["Gebotstermin", "Volumen", "Gebotsmenge", "Zuschläge", "Spanne Zuschlagswerte", "Ø Zuschlagswert", "Höchstwert"],
          zeilen: RUNDEN.map((r) => [
            r.termin,
            `${fmt(r.volumen)} MW`,
            `${fmt(r.gebote)} MW`,
            `${fmt(r.zuschlag)} MW`,
            `${fmt(r.min, 2)}–${fmt(r.max, 2)} ct`,
            `${fmt(r.schnitt, 2)} ct`,
            `${fmt(r.hoechstwert, 2)} ct`,
          ]),
          hervorheben: 5,
          markierteZeile: RUNDEN.length - 1,
          minBreite: 760,
          fussnote: "Quelle: Bundesnetzagentur, Beendete Ausschreibungen / Statistiken sowie Pressemitteilungen vom 12.05.2026 und 18.08.2026. Werte gerundet; Ø = mengengewichteter durchschnittlicher Zuschlagswert. Nächster Gebotstermin: 1. Dezember 2026.",
        },
        {
          typ: "p",
          text: `Der **Höchstwert** begrenzt, was geboten werden darf. 2025 lag er bei 6,80 ct/kWh, 2026 bei ${fmt(RUNDEN[3].hoechstwert, 2)} bzw. ${fmt(LETZTE.hoechstwert, 2)} ct/kWh. Nach Angaben der Bundesnetzagentur ergibt er sich inzwischen aus dem Durchschnitt der höchsten bezuschlagten Gebote der vorangegangenen drei Runden zuzüglich eines gesetzlichen Aufschlags. Regional dominieren Bayern, Baden-Württemberg und Niedersachsen; in der Märzrunde 2026 entfiel mit über 1 GW der größte Anteil auf Flächen an Autobahnen und Schienenwegen.`,
        },
        {
          typ: "kasten",
          variant: "info",
          titel: "Unsere Rechenannahme",
          text: `In den Rechnern dieser Website setzen wir für Freiflächenanlagen einen [Zuschlagswert](/wissen/lexikon#zuschlagswert) von ${fmtCt(ERLOESE.eegFreiflaecheCt)} an – das entspricht dem Mittel der letzten Runden. Für ein konkretes Gebot zählen Standort, Kosten und Wettbewerb am jeweiligen Termin.`,
        },
      ],
    },
    {
      id: "flaechen",
      titel: "Welche Flächen sind in der Ausschreibung zulässig?",
      tocLabel: "Flächenkulisse",
      bloecke: [
        {
          typ: "p",
          text: "**Nicht jede Fläche darf an der Ausschreibung teilnehmen: § 37 EEG legt eine abschließende Flächenkulisse fest.** Ackerland ist nur in benachteiligten Gebieten oder als besondere Solaranlage zulässig – und auch das nur, soweit das jeweilige Land nichts anderes regelt.",
        },
        {
          typ: "tabelle",
          caption: "Flächenkulisse für Gebote im ersten Segment nach § 37 Abs. 1 EEG (Stand September 2026)",
          kopf: ["Flächenart", "Regel", "Hinweis"],
          zeilen: [
            ["Sonstige bauliche Anlagen", "Nr. 1", "z. B. Deponien, Lärmschutzwälle, sofern nicht zur Stromerzeugung errichtet"],
            ["Versiegelte Flächen", "Nr. 2 a", "bereits versiegelt beim Beschluss über den B-Plan"],
            ["Konversionsflächen", "Nr. 2 b", "aus wirtschaftlicher, verkehrlicher, wohnungsbaulicher oder militärischer Nutzung"],
            ["Randstreifen", "Nr. 2 c", `bis ${RANDSTREIFEN_M} m an Autobahnen und Schienenwegen, gemessen vom äußeren Fahrbahnrand`],
            ["Gewerbe-/Industriegebiete, alte B-Pläne, Bundesflächen", "Nr. 2 d–g", "mit Stichtagen und besonderen Voraussetzungen"],
            ["Acker- und Grünland in benachteiligten Gebieten", "Nr. 2 h, i", "ohne Natura 2000, geschützte Biotope und Schutzgebiete; Länder können beschränken (§ 37c)"],
            ["Besondere Solaranlagen", "Nr. 3 a–f", "Agri-PV (Acker, Dauerkultur, Grünland), Parkplätze, wiedervernässte Moore, künstliche Gewässer"],
          ],
          minBreite: 680,
          fussnote: `Quelle: § 37 EEG (gesetze-im-internet.de). Nach § 37 Abs. 4 EEG sind Gebote auf Ackerflächen unzulässig, sobald Freiflächenanlagen mit mehr als ${ACKER_DECKEL_GW} GW (Zubau ab 2023) in Betrieb sind; ab 2031 gilt eine höhere Schwelle.`,
        },
        { typ: "h3", text: "Benachteiligte Gebiete und Länderöffnungsklausel" },
        {
          typ: "p",
          text: `[Benachteiligte Gebiete](/wissen/lexikon#benachteiligte-gebiete) sind landwirtschaftlich ertragsschwächere Regionen nach EU-Abgrenzung. Seit dem Solarpaket I sind sie grundsätzlich geöffnet; die Länder können sie nach § 37c EEG per Verordnung wieder schließen – etwa sobald Solaranlagen mehr als ${fmt(LAENDER_QUOTE * 100)} % der landwirtschaftlich genutzten Fläche belegen, oder für Landschaftsschutzgebiete und Naturparks. Ob eine Fläche „drin“ ist, entscheidet also die aktuelle Landesverordnung. Prüfen Sie das vor jeder Pachtzusage.`,
        },
        { typ: "h3", text: "Besondere Solaranlagen" },
        {
          typ: "p",
          text: "[Besondere Solaranlagen](/wissen/lexikon#besondere-solaranlagen) wie Agri-PV nach DIN SPEC 91434, Parkplatz-PV oder Anlagen auf wiedervernässten Moorböden sind in der Ausschreibung zugelassen. Das Solarpaket I sieht für sie eine eigene Unterausschreibung mit höherem Höchstwert und einem Bonus für hoch aufgeständerte Agri-PV vor (§ 37d EEG); dieser Teil stand unter beihilferechtlichem Vorbehalt. Nach unserem Recherchestand konkurrieren besondere Solaranlagen derzeit im regulären ersten Segment – in der Märzrunde 2026 erhielten sie 439 MW Zuschläge. Fehlt später der Nachweis der landwirtschaftlichen Nutzung, sinkt der Zuschlagswert nach § 54 Abs. 3 EEG um 2,5 ct/kWh. Mehr dazu im Ratgeber [Agri-PV-Wirtschaftlichkeit](/wissen/ratgeber/agri-pv-wirtschaftlichkeit).",
        },
      ],
    },
    {
      id: "sicherheiten",
      titel: "Sicherheiten, Fristen und Pönalen",
      tocLabel: "Sicherheiten & Fristen",
      bloecke: [
        {
          typ: "p",
          text: `**Wer bietet, hinterlegt ${SICHERHEIT_EUR_KW} € je Kilowatt Gebotsleistung als Sicherheit – mit beschlossenem Bebauungsplan nur ${SICHERHEIT_BPLAN_EUR_KW} €/kW (§ 37a EEG).** Die frühere Aufteilung in Erst- und Zweitsicherheit gibt es im ersten Segment nicht mehr; es ist eine einzige Sicherheit. Hinzu kommt eine Gebühr von ${fmtEur(GEBUEHR_EUR)} je Gebot.`,
        },
        {
          typ: "tabelle",
          caption: "Fristen und Abschläge nach Zuschlag (erstes Segment, Stand September 2026)",
          kopf: ["Regel", "Inhalt", "Grundlage"],
          zeilen: [
            ["Realisierungsfrist", "Inbetriebnahme innerhalb von 24 Monaten nach Bekanntgabe des Zuschlags; danach erlischt der Zuschlag", "Bundesnetzagentur"],
            ["Zahlungsberechtigung", "Antrag bei der Bundesnetzagentur; nach deren Angaben spätestens innerhalb von 26 Monaten", "Bundesnetzagentur"],
            ["Abschlag bei später Realisierung", `Antrag auf Zahlungsberechtigung erst nach 18 Monaten: Zuschlagswert minus ${fmt(ABSCHLAG_CT, 1)} ct/kWh`, "§ 54 Abs. 1 EEG"],
            ["Abschlag Standortwechsel", `Anlage nicht auf den im Gebot genannten Flurstücken: minus ${fmt(ABSCHLAG_CT, 1)} ct/kWh`, "§ 54 Abs. 2 EEG"],
            ["Pönale", `Werden mehr als 5 % der Gebotsmenge entwertet: ${SICHERHEIT_EUR_KW} €/kW (bzw. ${SICHERHEIT_BPLAN_EUR_KW} €/kW) für die entwertete Menge`, "§ 55 Abs. 2 EEG"],
            ["Gebotsgröße", "höchstens 50 MW je Gebot; laut Bundesnetzagentur bis zur beihilferechtlichen Genehmigung faktisch 20 MW", "§ 37 Abs. 3 EEG"],
          ],
          minBreite: 680,
          fussnote: "Vereinfacht dargestellt. Maßgeblich sind das EEG in der jeweils geltenden Fassung und die Festlegungen der Bundesnetzagentur zum Gebotstermin.",
        },
        {
          typ: "p",
          text: `Für ein 10-MWp-Projekt heißt das: ${fmtEur(SICHERHEIT)} Sicherheit bei Gebot mit Aufstellungsbeschluss, ${fmtEur(SICHERHEIT_BPLAN)} mit beschlossenem B-Plan. Der Abschlag von ${fmt(ABSCHLAG_CT, 1)} ct/kWh klingt klein, kostet bei rund ${fmt(MWH)} MWh Jahresertrag aber etwa **${fmtEur(VERLUST_ABSCHLAG)} pro Jahr** – über 20 Jahre abgezinst mit ${fmt(FINANZIERUNG.diskont * 100, 1)} % rund ${fmtEur(BARWERT_ABSCHLAG)}. Wer mit Netzanschluss oder Lieferketten in Verzug gerät, verliert also schnell sechsstellige Beträge.`,
        },
      ],
    },
    {
      id: "marktpraemie",
      titel: "Marktprämie, anzulegender Wert und negative Preise",
      tocLabel: "Marktprämie & § 51",
      bloecke: [
        {
          typ: "p",
          text: "**Der Zuschlagswert ist kein fester Tarif, sondern der anzulegende Wert: Die Marktprämie gleicht nur die Differenz zwischen diesem Wert und dem monatlichen Marktwert Solar aus.** Den Strom verkauft ein Direktvermarkter an der Börse. Liegt der Marktwert Solar über dem anzulegenden Wert, entfällt die Prämie – der Betreiber behält aber nach aktuellem Recht die höheren Markterlöse.",
        },
        {
          typ: "p",
          text: "Die Prämie berechnet sich monatlich aus dem [anzulegenden Wert](/wissen/lexikon#anzulegender-wert) minus dem [Marktwert Solar](/wissen/lexikon#marktwert-solar). Weil Solaranlagen alle gleichzeitig produzieren, liegt ihr Marktwert meist unter dem Durchschnittspreis – die sogenannte [Capture Rate](/wissen/lexikon#capture-rate). Die [Marktprämie](/wissen/lexikon#marktpraemie) sichert genau dieses Risiko ab.",
        },
        {
          typ: "kasten",
          variant: "recht",
          titel: "§ 51 EEG: keine Förderung bei negativen Preisen",
          text: "Für Zeiträume, in denen der Spotmarktpreis negativ ist, verringert sich der anzulegende Wert auf null (§ 51 Abs. 1 EEG). Für Neuanlagen gilt das seit dem Solarspitzengesetz für jede negative Viertelstunde. Als Ausgleich verlängert sich der Förderzeitraum nach § 51a EEG; bei Solaranlagen wird die Zahl der betroffenen Viertelstunden dafür mit dem Faktor 0,5 gewichtet und über ein Zeitkontingent ans Ende der 20 Jahre gehängt. In der Praxis lohnt sich deshalb ein Speicher oder eine Abregelung bei [negativen Strompreisen](/wissen/lexikon#negative-strompreise). Dies ist keine Rechtsberatung.",
        },
        {
          typ: "p",
          text: "Die EU-Strommarktreform sieht für neue Förderregelungen künftig grundsätzlich zweiseitige Differenzverträge vor, bei denen Mehrerlöse über dem anzulegenden Wert zurückfließen. Wie und ab wann Deutschland das im EEG umsetzt, sollten Sie vor jeder Investitionsentscheidung aktuell prüfen.",
        },
      ],
    },
    {
      id: "alternativen",
      titel: "Alternativen: PPA, Merchant und die Kombination",
      tocLabel: "PPA & Merchant",
      bloecke: [
        {
          typ: "p",
          text: `**Die Ausschreibung ist nicht der einzige Weg: Ein Stromliefervertrag (PPA) oder der reine Marktverkauf sind echte Alternativen – oft auch als Kombination.** Wir rechnen für Solar-PPA mit ${fmt(ERLOESE.ppaCt.min, 1)} bis ${fmt(ERLOESE.ppaCt.max, 1)} ct/kWh und nach Förderende konservativ mit ${fmtCt(ERLOESE.merchantCt)} Marktwert.`,
        },
        {
          typ: "tabelle",
          caption: "Vermarktungswege für einen Solarpark im Vergleich (Orientierungswerte September 2026)",
          kopf: ["", "EEG-Zuschlag", "PPA", "Merchant"],
          zeilen: [
            ["Erlös (ct/kWh)", `~${fmt(ERLOESE.eegFreiflaecheCt, 1)} als Untergrenze`, `${fmt(ERLOESE.ppaCt.min, 1)}–${fmt(ERLOESE.ppaCt.max, 1)} fest`, `~${fmt(ERLOESE.merchantCt, 1)}, schwankend`],
            ["Laufzeit", "20 Jahre", "meist 5–15 Jahre", "offen"],
            ["Preisrisiko", "gering (Mindesterlös)", "gering bis mittel (Profil, Bonität)", "hoch"],
            ["Flächenkulisse", "nur § 37-Flächen", "jede genehmigte Fläche", "jede genehmigte Fläche"],
            ["Finanzierbarkeit", "sehr gut", "gut, abhängig vom Abnehmer", "eingeschränkt"],
            ["Herkunftsnachweise", "nicht verkaufbar", "verkaufbar", "verkaufbar"],
          ],
          hervorheben: 1,
          minBreite: 620,
          fussnote: "Erlöswerte aus den zentralen Annahmen dieser Website (ERLOESE), keine Angebote. Herkunftsnachweise: Für geförderten Strom gilt das Doppelvermarktungsverbot.",
        },
        {
          typ: "p",
          text: `Viele Projekte kombinieren: Ein Teil des Parks geht mit Zuschlag in die Marktprämie, ein anderer Teil liefert per [PPA](/wissen/ratgeber/ppa-fuer-unternehmen) an ein Unternehmen – zum Beispiel über den [Reststrom-Pool](/de/reststrom). Flächen außerhalb der Kulisse, etwa Äcker außerhalb benachteiligter Gebiete, sind ohnehin nur über PPA oder Merchant realisierbar. Unabhängig vom Vermarktungsweg kann die Gemeinde nach § 6 EEG beteiligt werden; bei 10 MWp in Süddeutschland wären das rund ${fmtEur(KOMMUNAL)} pro Jahr.`,
        },
        {
          typ: "tool",
          href: pfad("/rechner/solarpark"),
          titel: "EEG, PPA oder Merchant – was trägt Ihr Projekt?",
          text: "Leistung, Region, Kosten und Erlösweg eingeben und Rendite, Kapitalwert und Cashflow vergleichen.",
          label: "Zum Solarpark-Rechner",
        },
      ],
    },
    {
      id: "fehler",
      titel: "Typische Fehler und Grenzen",
      tocLabel: "Fehler & Grenzen",
      bloecke: [
        {
          typ: "checkliste",
          punkte: [
            "**Zu aggressiv geboten:** Pay as bid bestraft Gebote unter den eigenen Kosten 20 Jahre lang. Rechnen Sie mit realistischen Capex- und Zinsannahmen.",
            "**Flächenkulisse nicht geprüft:** Eine geänderte Landesverordnung zu benachteiligten Gebieten kann ein Projekt über Nacht aus der Förderung nehmen.",
            "**Netzanschluss zu spät:** Die 24-Monats-Frist läuft ab Zuschlag, nicht ab Netzzusage. Ohne Netzanschlusstermin droht Abschlag oder Pönale.",
            "**Negative Preise ignoriert:** Bei wachsendem Solarzubau steigt die Zahl der Stunden ohne Prämie. Speicher und Abregelstrategie gehören in die Kalkulation.",
            "**Flurstücke im Gebot falsch:** Wer später auf anderen Flurstücken baut, verliert 0,3 ct/kWh.",
          ],
        },
        {
          typ: "kasten",
          variant: "info",
          titel: "Österreich und Schweiz",
          text: "In Österreich vergibt die EAG-Förderabwicklungsstelle Marktprämien ebenfalls per Ausschreibung, daneben gibt es Investitionszuschüsse – siehe [Freiflächen-PV in Österreich](/wissen/ratgeber/freiflaechen-pv-oesterreich). In der Schweiz dominieren Einmalvergütungen, für große alpine Anlagen galt der Solarexpress – siehe [Freiflächen-PV in der Schweiz](/wissen/ratgeber/freiflaechen-pv-schweiz).",
        },
      ],
    },
    {
      id: "vorgehen",
      titel: "So bereiten Sie ein Gebot vor",
      tocLabel: "Vorgehen",
      bloecke: [
        {
          typ: "ablauf",
          schritte: [
            ["Fläche und Kulisse prüfen", "Liegt die Fläche in der Kulisse nach § 37 EEG? Gilt eine Landesverordnung zu benachteiligten Gebieten?"],
            ["Aufstellungsbeschluss sichern", "Ohne Aufstellungsbeschluss kein Gebot; mit Satzungsbeschluss halbiert sich die Sicherheit."],
            ["Kosten und Gebotswert kalkulieren", "Capex, Netzanschluss, Pacht, Opex, Finanzierung und negative Preise realistisch ansetzen."],
            ["Sicherheit und Gebot einreichen", "Sicherheit rechtzeitig vor dem Gebotstermin hinterlegen, Gebühr zahlen, Gebot formgerecht abgeben."],
            ["Nach Zuschlag zügig bauen", "Realisierungsplan mit Netzbetreiber und EPC abstimmen, Zahlungsberechtigung vor Ablauf von 18 Monaten beantragen."],
          ],
        },
        {
          typ: "p",
          text: "Wer lieber baureife oder bezuschlagte Projekte erwirbt, statt selbst zu bieten, findet sie auf der [Projektbörse](/projektboerse). Für Investoren ist die Nutzung kostenfrei; eine Provision zahlen nur Verkäufer bei Abschluss. Mehr zur Einordnung der Rendite im Ratgeber [Solarpark-Investment](/wissen/ratgeber/solarpark-investment-rendite).",
        },
      ],
    },
  ],

  faq: [
    {
      q: "Wann sind die Gebotstermine für Freiflächen-PV?",
      a: "Im ersten Segment jeweils am 1. März, 1. Juli und 1. Dezember. Die Bundesnetzagentur veröffentlicht vorab Volumen und Höchstwert. Der nächste Termin nach Redaktionsstand ist der 1. Dezember 2026.",
    },
    {
      q: "Wie hoch ist der Zuschlagswert für Solarparks 2026?",
      a: `Der mengengewichtete Durchschnitt lag im März 2026 bei ${fmtCt(RUNDEN[3].schnitt, 2)} und im Juli 2026 bei ${fmtCt(LETZTE.schnitt, 2)}. Die einzelnen Zuschläge reichten zuletzt von ${fmt(LETZTE.min, 2)} bis ${fmt(LETZTE.max, 2)} ct/kWh.`,
    },
    {
      q: "Muss ich für eine EEG-Ausschreibung schon Baurecht haben?",
      a: "Nein, ein Aufstellungsbeschluss für den Bebauungsplan genügt. Mit beschlossenem Bebauungsplan sinkt die Sicherheit aber von 50 auf 25 €/kW – und das Risiko, die 24-Monats-Frist zu verpassen, ist deutlich geringer.",
    },
    {
      q: "Darf ich auf Ackerland an der Ausschreibung teilnehmen?",
      a: "Nur in benachteiligten Gebieten (sofern das Land sie nicht per Verordnung ausschließt), im Randstreifen bis 500 m an Autobahnen und Schienenwegen oder als besondere Solaranlage, etwa Agri-PV. Übrige Äcker sind nur über PPA oder Merchant vermarktbar.",
    },
    {
      q: "Was passiert, wenn ich den Solarpark nach Zuschlag nicht baue?",
      a: "Der Zuschlag erlischt, und es wird eine Pönale fällig, sobald mehr als 5 % der bezuschlagten Menge entwertet werden – 50 €/kW bzw. 25 €/kW für die entwertete Menge. Die Pönale wird in der Regel aus der hinterlegten Sicherheit gezahlt.",
    },
    {
      q: "Lohnt sich ein PPA mehr als die EEG-Förderung?",
      a: `Das hängt vom Preis und vom Risiko ab. Solar-PPA liegen nach unseren Annahmen bei ${fmt(ERLOESE.ppaCt.min, 1)} bis ${fmt(ERLOESE.ppaCt.max, 1)} ct/kWh, der EEG-Zuschlag sichert eine Untergrenze für 20 Jahre. Viele Projekte kombinieren beides; der [Solarpark-Rechner](/de/rechner/solarpark) zeigt den Vergleich.`,
    },
  ],

  passend: [
    { href: "/wissen/ratgeber/solarpark-genehmigung-bebauungsplan", titel: "Solarpark-Genehmigung", text: "Der Bebauungsplan Schritt für Schritt." },
    { href: "/wissen/ratgeber/ppa-fuer-unternehmen", titel: "PPA für Unternehmen", text: "Wie Solar-Stromlieferverträge funktionieren." },
    { href: "/wissen/ratgeber/solarpark-investment-rendite", titel: "Solarpark-Investment", text: "Rendite, Risiken und Kennzahlen." },
    { href: "/projektboerse", titel: "Projektbörse", text: "Projekte in allen Entwicklungsphasen finden." },
    { href: pfad("/marktdaten"), titel: "Marktdaten Solar", text: "Zuschlagswerte seit 2017 und Marktwert Solar mit Quellen." },
    { href: "/investoren", titel: "Solarprojekte kaufen", text: "Phasenmodell, Preise und Datenraum für Investoren." },
  ],

  quellen: [
    { titel: "Bundesnetzagentur – Beendete Ausschreibungen / Statistiken Solaranlagen erstes Segment", url: "https://www.bundesnetzagentur.de/DE/Fachthemen/ElektrizitaetundGas/Ausschreibungen/Solaranlagen1/BeendeteAusschreibungen/start.html", stand: "09/2026" },
    { titel: "Bundesnetzagentur – Pressemitteilung: Überzeichnung der Ausschreibung für PV-Freiflächenanlagen zum Gebotstermin 1. Juli 2026", url: "https://www.bundesnetzagentur.de/SharedDocs/Pressemitteilungen/DE/2026/20260818_Solar1.html", stand: "09/2026" },
    { titel: "Bundesnetzagentur – Pressemitteilung: Deutliche Überzeichnung zum Gebotstermin 1. März 2026", url: "https://www.bundesnetzagentur.de/SharedDocs/Pressemitteilungen/DE/2026/20260512_Solar1.html", stand: "09/2026" },
    { titel: "Bundesnetzagentur – Ausschreibungsverfahren Solaranlagen erstes Segment", url: "https://www.bundesnetzagentur.de/DE/Fachthemen/ElektrizitaetundGas/Ausschreibungen/Solaranlagen1/Ausschreibungsverfahren/start.html", stand: "09/2026" },
    { titel: "EEG 2023 § 37 – Gebote für Solaranlagen des ersten Segments", url: "https://www.gesetze-im-internet.de/eeg_2014/__37.html", stand: "09/2026" },
    { titel: "EEG 2023 § 37c – Besondere Zuschlagsvoraussetzung für benachteiligte Gebiete", url: "https://www.gesetze-im-internet.de/eeg_2014/__37c.html", stand: "09/2026" },
    { titel: "EEG 2023 § 51 und § 51a – Negative Preise und Verlängerung des Vergütungszeitraums", url: "https://www.gesetze-im-internet.de/eeg_2014/__51.html", stand: "09/2026" },
    { titel: "EEG 2023 § 54 – Verringerung des Zahlungsanspruchs bei Solaranlagen", url: "https://www.gesetze-im-internet.de/eeg_2014/__54.html", stand: "09/2026" },
  ],

  seitenCta: { titel: "Trägt Ihr Projekt einen Zuschlag?", text: "EEG, PPA und Merchant mit Ihren Werten vergleichen.", href: pfad("/rechner/solarpark"), label: "Zum Solarpark-Rechner" },
  cta: {
    title: "Projekte mit und ohne Zuschlag finden.",
    text: "Auf der Projektbörse stehen Solarparks in allen Phasen – vom Aufstellungsbeschluss bis zum bezuschlagten, baureifen Projekt. Für Investoren kostenfrei.",
    primary: { label: "Zur Projektbörse", href: "/projektboerse" },
    secondary: { label: "Für Investoren", href: "/investoren" },
  },
};

export default artikel;
