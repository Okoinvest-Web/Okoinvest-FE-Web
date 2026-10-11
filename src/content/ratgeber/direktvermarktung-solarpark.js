// Ratgeber: Direktvermarktung für Solarparks – Pflicht, Marktprämie, Jahresmarktwert, Entgelte, Wechsel
// Recherchestand 29.09.2026: EEG 2023 §§ 10b, 20, 21, 21b, 21c, 52, 53, Anlage 1 (Nr. 2: Jahresmarktwert
// für Anlagen mit Inbetriebnahme bzw. Zuschlag ab 1.1.2023), netztransparenz.de (Jahresmarktwerte Solar),
// Bundesnetzagentur/SMARD (Großhandelspreise 2024/2025). Marktzahlen aus src/lib/invest/markt.js.

import { ERLOESE, REGIONEN, STAND } from "@/lib/invest/markt";
import { fmt, fmtEur, fmtPct, fmtCt } from "@/lib/rechner/annahmen";
import { pfad } from "../../lib/land/index.js";

/* ------------------------------------------------------------------ */
/* Werte, die (noch) nicht in markt.js stehen – Vorschlag zur Übernahme */
/* ------------------------------------------------------------------ */

// § 21 Abs. 1 Nr. 1 EEG 2023: Einspeisevergütung nur bis 100 kW – darüber Pflicht zur Direktvermarktung
const DV_GRENZE_KW = 100;
// § 10b EEG 2023: Fernsteuerbarkeit für direktvermarktete Anlagen mit mehr als 25 kW
const FERNSTEUER_KW = 25;
// § 52 Abs. 2 EEG 2023: Zahlung bei Verstoß gegen § 10b in €/kW installierter Leistung und Kalendermonat
const SANKTION_EUR_KW_MONAT = 10;
// § 53 Abs. 3 EEG 2023: Abschlag auf den anzulegenden Wert während der Ausfallvergütung
const AUSFALL_ABSCHLAG = 0.2;
// netztransparenz.de / LfL Bayern: Jahresmarktwert Solar (JW Solar), ct/kWh
const JW_SOLAR = { 2024: 4.624, 2025: 4.508 };
// Bundesnetzagentur/SMARD (PM 03.01.2025 und 05.01.2026): Day-Ahead-Durchschnittspreis Base, ct/kWh
const BASE_CT = { 2024: 7.851, 2025: 8.932 };
// Direktvermarktungsentgelt für Solarparks im Marktprämienmodell, €/MWh – eigene vorsichtige
// Markteinschätzung (keine amtliche Statistik), stark abhängig von Größe, Profil und Vertragsmodell
const DV_ENTGELT_EUR_MWH = { min: 1.5, max: 5 };

/* ------------------------------------------------------------------ */
/* Rechenbeispiel: 20 MWp in Ostdeutschland im Marktprämienmodell       */
/* ------------------------------------------------------------------ */

const MWP = 20;
const REGION = REGIONEN.find((r) => r.id === "de-ost");
const MWH = MWP * REGION.ertrag; // MWh im ersten Jahr (MWp × kWh/kWp)
const AW = ERLOESE.eegFreiflaecheCt;
const JW = JW_SOLAR[2025];
const MP = Math.max(0, AW - JW);
const ENTGELT_MITTEL = (DV_ENTGELT_EUR_MWH.min + DV_ENTGELT_EUR_MWH.max) / 2; // €/MWh
const ENTGELT_CT = ENTGELT_MITTEL / 10;

// Profilwert der Anlage relativ zum Jahresmarktwert Solar (eigene Szenarien)
const SZENARIEN = [
  { name: "Ungünstiges Profil (z. B. viel Mittagsspitze, Abregelung)", faktor: 0.93 },
  { name: "Profil wie der Bundesdurchschnitt Solar", faktor: 1.0 },
  { name: "Günstiges Profil (z. B. Ost-West, Speicher)", faktor: 1.06 },
];
const szenario = (f) => {
  const markt = JW * f;
  const gesamt = markt + MP - ENTGELT_CT;
  return { markt, gesamt, eur: (gesamt / 100) * MWH * 1000 };
};

const CR = { 2024: JW_SOLAR[2024] / BASE_CT[2024], 2025: JW_SOLAR[2025] / BASE_CT[2025] };
const ENTGELT_JAHR = { min: DV_ENTGELT_EUR_MWH.min * MWH, max: DV_ENTGELT_EUR_MWH.max * MWH };
const SANKTION_MONAT = SANKTION_EUR_KW_MONAT * MWP * 1000;

const artikel = {
  slug: "direktvermarktung-solarpark",
  title: "Direktvermarktung für Solarparks: Pflicht, Marktprämie und Kosten",
  seoTitle: "Direktvermarktung Solarpark 2026 | ÖkoInvest",
  kurzTitel: "Direktvermarktung Solarpark",
  description:
    "Direktvermarktung für Solarparks: Pflicht ab 100 kW, Marktprämie mit Jahresmarktwert, Fernsteuerbarkeit, Entgelte und Wechsel zu PPA – mit Rechenbeispiel.",
  excerpt:
    "Warum jeder größere Solarpark einen Direktvermarkter braucht, wie die Marktprämie seit 2023 auf Basis des Jahresmarktwerts funktioniert und worauf es bei Entgelt, Profil und Vertrag ankommt.",
  hauptKeyword: "direktvermarktung solarpark",
  keywords: [
    "Direktvermarktung Solarpark",
    "Direktvermarkter PV Freifläche",
    "Marktprämienmodell Jahresmarktwert",
    "Direktvermarktungsentgelt",
    "Fernsteuerbarkeit § 10b EEG",
    "Profilwert Marktwert Solar",
    "Wechsel EEG PPA",
  ],
  veroeffentlicht: "2026-09-29",
  aktualisiert: "2026-09-29",
  kategorie: "Strom, Markt & Gemeinschaft",
  bild: "/img/planer-tablet.jpg",
  bildAlt: "Techniker mit weißem Schutzhelm prüft Daten auf einem Tablet vor aufgeständerten Solarmodulen",
  badge: { wert: `ab ${DV_GRENZE_KW} kW`, text: "Pflicht zur Direktvermarktung für neue Anlagen" },

  kurzFazit: [
    `**Solarparks mit mehr als ${DV_GRENZE_KW} kW müssen ihren Strom in Deutschland direkt vermarkten** – über einen Direktvermarkter an der Börse oder per Stromliefervertrag. Eine feste Einspeisevergütung gibt es für sie nur noch als Ausfall-Notlösung.`,
    `Die Förderung ist die **gleitende Marktprämie**: anzulegender Wert minus Marktwert. Für Anlagen mit Inbetriebnahme oder Zuschlag ab 2023 zählt der **Jahresmarktwert Solar** – 2025 lag er bei ${fmtCt(JW_SOLAR[2025], 3)}.`,
    `Was die eigene Anlage tatsächlich am Markt erlöst (**Profilwert**), weicht vom bundesweiten Marktwert ab. Diese Abweichung trägt beim Jahresmarktwert-Modell der Betreiber.`,
    `Direktvermarkter verlangen für Solarparks nach unserer Einschätzung meist **rund ${fmt(DV_ENTGELT_EUR_MWH.min, 1)} bis ${fmt(DV_ENTGELT_EUR_MWH.max)} €/MWh** – entscheidend sind aber Profil-, Prognose- und Abregelungsregeln im Vertrag.`,
    `Pflicht ist die **Fernsteuerbarkeit nach § 10b EEG**. Fehlt sie, drohen ${fmt(SANKTION_EUR_KW_MONAT)} € je kW und Monat – bei ${MWP} MWp also ${fmtEur(SANKTION_MONAT)} monatlich.`,
  ],

  abschnitte: [
    {
      id: "antwort",
      titel: "Was ist Direktvermarktung – und wann ist sie Pflicht?",
      tocLabel: "Kurze Antwort",
      bloecke: [
        {
          typ: "p",
          text: `**Direktvermarktung heißt: Der Betreiber verkauft den Strom seines Solarparks selbst – in der Praxis über einen Direktvermarkter an der Strombörse oder an einen Abnehmer –, statt ihn dem Netzbetreiber gegen eine feste Vergütung zu überlassen. Für neue Anlagen über ${DV_GRENZE_KW} kW ist das in Deutschland Pflicht.** Die Einspeisevergütung nach § 21 EEG steht nur Anlagen bis ${DV_GRENZE_KW} kW offen; größere Anlagen erhalten die EEG-Förderung ausschließlich als Marktprämie zusätzlich zum Markterlös.`,
        },
        {
          typ: "p",
          text: `Für einen Freiflächen-Solarpark ist die [Direktvermarktung](/wissen/lexikon#direktvermarktung) deshalb kein Wahlpunkt, sondern Standard. Offen ist nur, **in welcher Form**: gefördert über die [Marktprämie](/wissen/lexikon#marktpraemie) mit einem Zuschlag aus der [EEG-Ausschreibung](/ratgeber/eeg-ausschreibung-freiflaeche), ungefördert über einen Stromliefervertrag ([PPA](/wissen/lexikon#ppa)) oder rein am Spotmarkt (Merchant). Auch ein ungeförderter Park braucht in aller Regel einen Direktvermarkter, der Prognose, Bilanzkreis und Handel übernimmt.`,
        },
        {
          typ: "kasten",
          variant: "recht",
          titel: "Die Veräußerungsformen im EEG (Stand September 2026)",
          text: `§ 21b EEG kennt vier Veräußerungsformen: Marktprämie (§ 20), Einspeisevergütung (§ 21), Mieterstromzuschlag und sonstige Direktvermarktung (§ 21a). Für Anlagen über ${DV_GRENZE_KW} kW bleibt von der Einspeisevergütung nur die **Ausfallvergütung** als Notfallweg – zeitlich begrenzt und mit einem Abschlag von ${fmtPct(AUSFALL_ABSCHLAG, 0)} auf den anzulegenden Wert (§ 53 Abs. 3 EEG). Maßgeblich ist die aktuelle Fassung auf gesetze-im-internet.de.`,
        },
      ],
    },
    {
      id: "marktpraemie",
      titel: "So funktioniert das Marktprämienmodell mit Jahresmarktwert",
      tocLabel: "Marktprämie & Jahresmarktwert",
      bloecke: [
        {
          typ: "p",
          text: "**Im Marktprämienmodell verkauft der Direktvermarkter den Strom am Markt; der Netzbetreiber zahlt zusätzlich die Differenz zwischen anzulegendem Wert und Marktwert Solar.** Liegt der Marktwert über dem anzulegenden Wert, ist die Prämie null – der Betreiber behält dann nach aktuellem Recht den höheren Markterlös.",
        },
        {
          typ: "p",
          text: `Seit dem EEG 2023 hat sich die Bezugsgröße geändert: Nach Anlage 1 Nr. 2 EEG wird die Marktprämie für Anlagen, die ab dem 1. Januar 2023 in Betrieb genommen wurden oder ihren Zuschlag ab diesem Datum erhalten haben, anhand des **Jahresmarktwerts** berechnet. Für ältere Anlagen gilt weiter der **Monatsmarktwert**. Der [Marktwert Solar](/wissen/lexikon#marktwert-solar) ist der mit der bundesweiten Solareinspeisung gewichtete Durchschnitt der Day-Ahead-Preise; die Übertragungsnetzbetreiber veröffentlichen ihn auf netztransparenz.de.`,
        },
        {
          typ: "tabelle",
          caption: "Monatsmarktwert und Jahresmarktwert im Vergleich",
          kopf: ["Merkmal", "Monatsmarktwert (MW)", "Jahresmarktwert (JW)"],
          zeilen: [
            ["Gilt für", "Inbetriebnahme bzw. Zuschlag vor dem 1.1.2023", "**Inbetriebnahme bzw. Zuschlag ab dem 1.1.2023** – also alle heutigen Neuprojekte"],
            ["Berechnung der Prämie", "je Kalendermonat: anzulegender Wert minus Monatsmarktwert", "je Kalenderjahr: anzulegender Wert minus Jahresmarktwert"],
            ["Wirkung sonniger Monate", "Schwache Sommermonate erhöhen die Prämie genau dann, wenn viel erzeugt wird", "Sommer- und Winterpreise werden über das Jahr gemittelt"],
            ["Endgültige Höhe bekannt", "nach Monatsende", "nach Ablauf des Kalenderjahres; unterjährig in der Regel Abschläge"],
            ["Wer trägt Abweichungen", "Profil der Anlage gegenüber dem Monatsdurchschnitt", "Profil gegenüber dem Jahresdurchschnitt – das saisonale Risiko liegt stärker beim Betreiber"],
          ],
          hervorheben: 2,
          minBreite: 680,
          fussnote: "Nach Anlage 1 Nr. 2 Satz 3 EEG gilt der Jahresmarktwert auch für ältere Anlagen, wenn die Abgrenzungs- oder Pauschaloption für Speicher nach § 19 Abs. 3b oder 3c EEG genutzt wird. Vereinfachte Darstellung, keine Rechtsberatung.",
        },
        {
          typ: "p",
          text: `Zur Einordnung: Der Jahresmarktwert Solar lag 2024 bei ${fmtCt(JW_SOLAR[2024], 3)} und 2025 bei ${fmtCt(JW_SOLAR[2025], 3)}. Der durchschnittliche Day-Ahead-Preis betrug laut Bundesnetzagentur ${fmtCt(BASE_CT[2024], 2)} (2024) und ${fmtCt(BASE_CT[2025], 2)} (2025). Solarstrom erlöste also nur rund ${fmtPct(CR[2024], 0)} bzw. ${fmtPct(CR[2025], 0)} des Durchschnittspreises – die [Capture Rate](/wissen/lexikon#capture-rate) sinkt mit jedem Gigawatt Zubau. Liegt der Zuschlagswert eines Parks bei rund [${fmtCt(AW, 1)}](/quellen#fakt-de-erloese.eegFreiflaecheCt), fließt die Prämie deshalb heute in den meisten Jahren tatsächlich. Aktuelle Werte zeigen die [Marktdaten](/marktdaten).`,
        },
      ],
    },
    {
      id: "profilwert",
      titel: "Profilwert vs. Marktwert: Was Ihre Anlage wirklich erlöst",
      tocLabel: "Profilwert vs. Marktwert",
      bloecke: [
        {
          typ: "p",
          text: "**Der Profilwert ist der Durchschnittspreis, den genau Ihre Anlage mit ihrem eigenen Einspeiseprofil am Markt erzielt; der Marktwert Solar ist der Durchschnitt aller Solaranlagen in Deutschland.** Die Marktprämie gleicht nur die Lücke zum bundesweiten Marktwert aus – nicht die zu Ihrem Profilwert.",
        },
        {
          typ: "p",
          text: `Speist eine Anlage besonders stark in der Mittagsspitze ein, wird sie häufiger abgeregelt oder liegt im Süden mit anderen Wetterlagen als der Bundesdurchschnitt, liegt ihr Profilwert unter dem Marktwert. Ost-West-Anlagen, [nachgeführte Anlagen](/wissen/lexikon#tracker) oder ein gekoppelter Speicher verschieben Einspeisung in teurere Stunden und können darüber liegen. Das folgende Beispiel zeigt die Wirkung für einen Park mit ${MWP} MWp in Ostdeutschland (rund ${fmt(MWH)} MWh im ersten Jahr), einem anzulegenden Wert von ${fmtCt(AW, 1)} und dem Jahresmarktwert 2025.`,
        },
        {
          typ: "tabelle",
          caption: `Erlös je kWh im Marktprämienmodell, ${MWP} MWp, anzulegender Wert ${fmtCt(AW, 1)}, Jahresmarktwert ${fmtCt(JW, 3)}`,
          kopf: ["Szenario", "Profilwert der Anlage", "+ Marktprämie", "− DV-Entgelt", "= Erlös", "Jahreserlös"],
          zeilen: SZENARIEN.map((s, i) => {
            const r = szenario(s.faktor);
            const b = (x) => (i === 1 ? `**${x}**` : x);
            return [s.name, fmtCt(r.markt, 2), fmtCt(MP, 2), fmtCt(ENTGELT_CT, 2), b(fmtCt(r.gesamt, 2)), b(fmtEur(Math.round(r.eur / 1000) * 1000))];
          }),
          hervorheben: 4,
          markierteZeile: 1,
          minBreite: 760,
          fussnote: `Eigene Beispielrechnung: Profilwert als Faktor ${fmt(SZENARIEN[0].faktor, 2)}, ${fmt(SZENARIEN[1].faktor, 2)} und ${fmt(SZENARIEN[2].faktor, 2)} auf den Jahresmarktwert 2025; Entgelt ${fmt(ENTGELT_MITTEL, 2)} €/MWh (Mitte unserer Spanne). Ohne negative Preisstunden, Ausgleichsenergie und Degradation. Keine Prognose.`,
        },
        {
          typ: "p",
          text: `Die Spreizung von rund ${fmtEur(Math.round((szenario(SZENARIEN[2].faktor).eur - szenario(SZENARIEN[0].faktor).eur) / 1000) * 1000)} im Jahr zeigt, warum Investoren heute nicht nur auf den Zuschlagswert schauen. Hinzu kommt § 51 EEG: In Viertelstunden mit negativen Preisen entfällt für neue Anlagen die Prämie ganz. Wie stark das wirkt und welche Strategien helfen, erklärt der Ratgeber [negative Strompreise und Solarspitzengesetz](/ratgeber/negative-strompreise-solarspitzengesetz). Für die Ertragsseite lohnt ein Blick in das [Ertragsgutachten P50/P90](/ratgeber/ertragsgutachten-p50-p90).`,
        },
      ],
    },
    {
      id: "pflichten",
      titel: "Pflichten: Fernsteuerbarkeit, Bilanzkreis, Prognose und Redispatch",
      tocLabel: "Technische Pflichten",
      bloecke: [
        {
          typ: "p",
          text: `**Wer die Marktprämie will, muss vier Dinge sicherstellen: fernsteuerbare Technik nach § 10b EEG, Bilanzierung in einem reinen EEG-Bilanzkreis, eine belastbare Erzeugungsprognose und die Teilnahme am Redispatch.** Die meisten Pflichten übernimmt der Direktvermarkter operativ – haftbar bleibt der Betreiber.`,
        },
        {
          typ: "karten",
          cols: 2,
          items: [
            {
              titel: "Fernsteuerbarkeit (§ 10b EEG)",
              text: `Anlagen über ${FERNSTEUER_KW} kW in der Direktvermarktung müssen die Ist-Einspeisung übermitteln und sich vom Direktvermarkter ferngesteuert regeln lassen. Ab 2028 kann das nach Einbau eines intelligenten Messsystems über das Smart-Meter-Gateway laufen. Details im Lexikon unter [Fernsteuerbarkeit](/wissen/lexikon#fernsteuerbarkeit).`,
            },
            {
              titel: "Bilanzkreis (§ 20 EEG)",
              text: "Geförderter Strom muss in einem Bilanz- oder Unterbilanzkreis bilanziert werden, in dem nur solcher Strom liegt. Mit Speicher gelten gesonderte Regeln. Den [Bilanzkreis](/wissen/lexikon#bilanzkreis) führt in der Regel der Direktvermarkter.",
            },
            {
              titel: "Prognose und Handel",
              text: "Der Direktvermarkter verkauft die prognostizierte Menge am Day-Ahead-Markt und gleicht Abweichungen im Intraday-Handel aus. Was danach noch fehlt oder zu viel ist, wird als Ausgleichsenergie abgerechnet – ein Kostenpunkt, der sich im Entgelt wiederfindet.",
            },
            {
              titel: "Redispatch 2.0",
              text: "Anlagen ab 100 kW nehmen am [Redispatch](/wissen/lexikon#redispatch) teil: Der Netzbetreiber regelt bei Engpässen ab und gleicht den Ausfall finanziell aus. Stammdaten und Fahrpläne liefern Betreiber oder Direktvermarkter.",
            },
          ],
        },
        {
          typ: "kasten",
          variant: "wichtig",
          titel: "Teurer Formfehler",
          text: `Verstößt ein Betreiber gegen § 10b EEG, muss er nach § 52 EEG ${fmt(SANKTION_EUR_KW_MONAT)} € je Kilowatt installierter Leistung und Kalendermonat zahlen – bei ${MWP} MWp sind das ${fmtEur(SANKTION_MONAT)} pro Monat. Der Direktvermarkter fordert zunächst zur Nachbesserung auf und meldet den Verstoß nach vier Wochen dem Netzbetreiber. Fernwirktechnik, Parkregler und Kommunikationsweg gehören deshalb vor die Inbetriebnahme, nicht danach.`,
        },
        {
          typ: "p",
          text: "Wie Direktvermarkter viele Anlagen, Speicher und Verbraucher gemeinsam steuern, erklären der Ratgeber [virtuelles Kraftwerk](/ratgeber/virtuelles-kraftwerk) und die Seite zum [virtuellen Kraftwerk von ÖkoInvest](/virtuelles-kraftwerk).",
        },
      ],
    },
    {
      id: "entgelt",
      titel: "Was kostet ein Direktvermarkter?",
      tocLabel: "Kosten & Vertragsmodelle",
      bloecke: [
        {
          typ: "p",
          text: `**Für Solarparks im Marktprämienmodell liegen die Entgelte nach unserer Markteinschätzung meist in einer Größenordnung von ${fmt(DV_ENTGELT_EUR_MWH.min, 1)} bis ${fmt(DV_ENTGELT_EUR_MWH.max)} €/MWh.** Für den Beispielpark wären das ${fmtEur(ENTGELT_JAHR.min)} bis ${fmtEur(ENTGELT_JAHR.max)} im Jahr. Eine amtliche Statistik gibt es nicht; die Spanne ist Orientierung, kein Angebot.`,
        },
        {
          typ: "p",
          text: "Wichtiger als die Zahl vor dem Komma ist, **welche Risiken das Entgelt abdeckt**. Ein niedriges Entgelt mit Weitergabe aller Ausgleichsenergiekosten kann teurer sein als ein höheres Festentgelt. In den letzten Jahren sind Direktvermarkter bei Solar vorsichtiger geworden: Die Kosten für Prognosefehler, Profilabweichungen und negative Preise sind gestiegen, und manche Verträge geben sie ganz oder teilweise weiter.",
        },
        {
          typ: "tabelle",
          caption: "Übliche Vertragsmodelle mit Direktvermarktern",
          kopf: ["Modell", "Was der Betreiber erhält", "Wer trägt das Profilrisiko?", "Geeignet für"],
          zeilen: [
            ["Marktwert-Modell", "Jahres- bzw. Monatsmarktwert Solar minus Entgelt, dazu die Marktprämie vom Netzbetreiber", "Direktvermarkter", "Betreiber, die planbare Erlöse nahe am Zuschlagswert wollen"],
            ["Spot-Modell (Pass-through)", "tatsächliche Börsenerlöse der eigenen Einspeisung minus Entgelt, dazu die Marktprämie", "Betreiber", "Anlagen mit gutem Profil, Speicher, Ost-West"],
            ["Festpreis oder PPA", "fester Preis je MWh für einen Zeitraum, teils mit Mengenkorridor", "Abnehmer bzw. Händler (gegen Abschlag)", "ungeförderte Parks, Finanzierung ohne EEG"],
            ["Kombination", "Teil der Menge im PPA, Rest im Marktprämienmodell (prozentuale Aufteilung nach § 21b Abs. 2 EEG)", "geteilt", "Parks, die Zuschlag und Liefervertrag verbinden"],
          ],
          minBreite: 760,
          fussnote: "Vereinfachte Übersicht. Viele Verträge mischen Elemente, etwa Mindestpreise, Bonus-Malus bei Prognosegüte oder eigene Regeln für Viertelstunden mit negativen Preisen.",
        },
        {
          typ: "p",
          text: `Bei gesetzlich festgelegten anzulegenden Werten ist die Direktvermarktung eingepreist: Wer ersatzweise Einspeisevergütung nimmt, erhält bei Solar 0,4 ct/kWh weniger (§ 53 Abs. 1 EEG). In der Ausschreibung gibt es diesen Aufschlag nicht – das [Direktvermarktungsentgelt](/wissen/lexikon#direktvermarktungsentgelt) muss im Gebotswert kalkuliert sein. Wie sich Entgelt und Erlöspfad auf die Rendite auswirken, zeigt der [Solarpark-Rechner](/rechner/solarpark).`,
        },
      ],
    },
    {
      id: "wechsel",
      titel: "Wechsel von der Marktprämie zu PPA oder Merchant",
      tocLabel: "Wechsel zu PPA",
      bloecke: [
        {
          typ: "p",
          text: "**Ein Wechsel zwischen Marktprämie und sonstiger Direktvermarktung ist jeweils zum Ersten eines Kalendermonats möglich; er muss dem Netzbetreiber vor Beginn des vorangehenden Monats mitgeteilt werden (§ 21b, § 21c EEG).** Der Strom kann auch prozentual auf beide Formen aufgeteilt werden.",
        },
        {
          typ: "p",
          text: `Interessant wird das, wenn der Markt dauerhaft über dem anzulegenden Wert liegt – wie 2022 – oder wenn ein Abnehmer [Herkunftsnachweise](/wissen/lexikon#herkunftsnachweis) braucht. Für geförderten Strom werden keine Herkunftsnachweise ausgestellt; wer grüne Eigenschaften mitverkaufen will, muss die betreffende Menge in die sonstige Direktvermarktung überführen und verzichtet für diese Monate auf die Prämie. Die Förderdauer von 20 Jahren läuft dabei weiter. Wie ein Stromliefervertrag aufgebaut ist, erklärt der Ratgeber [PPA für Unternehmen](/ratgeber/ppa-fuer-unternehmen).`,
        },
        {
          typ: "liste",
          punkte: [
            "**Vor dem Wechsel rechnen:** Die Marktprämie ist eine Absicherung nach unten. Wer sie aufgibt, trägt das volle Preisrisiko – bei Bankfinanzierung meist nur mit Zustimmung der Bank.",
            "**Rückweg prüfen:** Der Wechsel zurück in die Marktprämie ist nach denselben Fristen möglich, sollte aber im PPA-Vertrag abgebildet sein (Laufzeit, Mengen, Kündigung).",
            "**Förderende einplanen:** Nach 20 Jahren entfällt die Prämie; der Park läuft dann über PPA oder Merchant weiter. Das bestimmt den Restwert – mehr im Ratgeber [Bestandsanlagen bewerten](/ratgeber/solarpark-bestandsanlage-wert).",
          ],
        },
      ],
    },
    {
      id: "auswahl",
      titel: "So wählen Sie einen Direktvermarkter aus",
      tocLabel: "Auswahl-Checkliste",
      bloecke: [
        {
          typ: "p",
          text: "**Vergleichen Sie Direktvermarkter nicht nur über das Entgelt, sondern über die gesamte Erlöskette: Prognosegüte, Umgang mit negativen Preisen, Abregelung, Abrechnung und Bonität.** Ein Park läuft 30 Jahre; der Vertrag meist ein bis fünf Jahre – Wechsel sind also normal.",
        },
        {
          typ: "checkliste",
          punkte: [
            "**Vergütungsbasis klar:** Monats- oder Jahresmarktwert, Spot-Pass-through oder Festpreis – und welche Kosten (Ausgleichsenergie, Börsengebühren) zusätzlich weitergegeben werden.",
            "**Negative Preise geregelt:** Wer entscheidet über Abregelung, wie wird sie vergütet, wie werden Viertelstunden ohne Prämie abgerechnet?",
            "**Technik und Schnittstellen:** Unterstützung Ihres Parkreglers bzw. Fernwirkgeräts, Kosten für die Steuerbox, Fristen für die Anbindung vor Inbetriebnahme.",
            "**Redispatch-Prozesse:** Übernimmt der Direktvermarkter die Rolle als Einsatzverantwortlicher bzw. Datenlieferant, und zu welchem Preis?",
            "**Transparenz:** Viertelstundengenaue Abrechnung, Einsicht in Prognose- und Handelsdaten, Online-Zugang.",
            "**Laufzeit und Kündigung:** Kurze Erstlaufzeit, klare Regeln für den Wechsel zu PPA, Sonderkündigung bei Gesetzesänderung.",
            "**Bonität und Sicherheiten:** Der Direktvermarkter schuldet Ihnen die Markterlöse – prüfen Sie Größe, Rating oder Sicherheiten.",
          ],
        },
        {
          typ: "tool",
          href: pfad("/rechner/solarpark"),
          titel: "Erlöspfade durchrechnen",
          text: "Zuschlagswert, PPA-Preis oder Merchant-Erlös eingeben – der Solarpark-Rechner zeigt Cashflow, Rendite und Schuldendienstdeckung.",
          label: "Zum Solarpark-Rechner",
        },
        {
          typ: "p",
          text: `In Österreich wird die EAG-Marktprämie ebenfalls als gleitende Prämie gezahlt, Direktvermarktung ist dort für größere Anlagen ebenso üblich. In der Schweiz setzen Freiflächenanlagen andere Förderinstrumente voraus. Überblick unter [Freiflächen-PV in Österreich](/ratgeber/freiflaechen-pv-oesterreich). Stand der Angaben: ${STAND}.`,
        },
      ],
    },
  ],

  faq: [
    {
      q: "Ab wann ist Direktvermarktung für Photovoltaik Pflicht?",
      a: `Für neue Anlagen mit mehr als ${DV_GRENZE_KW} kW installierter Leistung. Kleinere Anlagen können Einspeisevergütung wählen oder freiwillig direkt vermarkten. Ab ${FERNSTEUER_KW} kW müssen direktvermarktete Anlagen zudem fernsteuerbar sein.`,
    },
    {
      q: "Was ist der Unterschied zwischen Monatsmarktwert und Jahresmarktwert?",
      a: "Beide sind erzeugungsgewichtete Durchschnittspreise für Solarstrom. Für Anlagen mit Inbetriebnahme oder Zuschlag ab dem 1. Januar 2023 wird die Marktprämie mit dem Jahresmarktwert berechnet, für ältere mit dem Monatsmarktwert. Beim Jahresmarktwert trägt der Betreiber das saisonale Profilrisiko stärker selbst.",
    },
    {
      q: "Wie hoch ist die Marktprämie für einen Solarpark?",
      a: `Sie ergibt sich aus dem anzulegenden Wert minus dem Jahresmarktwert Solar. Beispiel: ${fmtCt(AW, 1)} Zuschlagswert und ${fmtCt(JW_SOLAR[2025], 3)} Jahresmarktwert 2025 ergeben rund ${fmtCt(MP, 2)} Prämie. In Viertelstunden mit negativen Preisen entfällt sie für neue Anlagen.`,
    },
    {
      q: "Was kostet ein Direktvermarkter für einen Solarpark?",
      a: `Nach unserer Einschätzung meist rund ${fmt(DV_ENTGELT_EUR_MWH.min, 1)} bis ${fmt(DV_ENTGELT_EUR_MWH.max)} €/MWh, je nach Größe, Profil und Vertragsmodell. Entscheidend ist, welche Kosten zusätzlich weitergegeben werden, etwa Ausgleichsenergie oder Profilabschläge.`,
    },
    {
      q: "Kann ich von der Marktprämie in ein PPA wechseln?",
      a: "Ja, zum Ersten eines Kalendermonats mit Mitteilung an den Netzbetreiber vor Beginn des Vormonats. Auch eine prozentuale Aufteilung ist möglich. Die 20-jährige Förderdauer läuft während der Zeit ohne Prämie weiter.",
    },
    {
      q: "Brauche ich auch ohne EEG-Förderung einen Direktvermarkter?",
      a: "In aller Regel ja. Jemand muss Prognose, Bilanzkreis und Handel übernehmen – bei einem PPA oft der Abnehmer oder dessen Händler, sonst ein Direktvermarkter. Die Fernsteuerbarkeit ist ebenfalls Voraussetzung für die Vermarktung.",
    },
  ],

  passend: [
    { href: "/ratgeber/negative-strompreise-solarspitzengesetz", titel: "Negative Strompreise", text: "§ 51 EEG, Solarspitzengesetz und Strategien für Freiflächen." },
    { href: "/ratgeber/eeg-ausschreibung-freiflaeche", titel: "EEG-Ausschreibung Freifläche", text: "Wie der anzulegende Wert zustande kommt." },
    { href: "/ratgeber/ppa-fuer-unternehmen", titel: "PPA für Unternehmen", text: "Stromlieferverträge als Alternative zur Marktprämie." },
    { href: pfad("/marktdaten"), titel: "Marktdaten", text: "Zuschlagswerte, Marktwert Solar und Capture Rate." },
  ],

  quellen: [
    { titel: "EEG 2023, Anlage 1 – Höhe der Marktprämie (Monats- und Jahresmarktwert)", url: "https://www.gesetze-im-internet.de/eeg_2014/anlage_1.html", stand: "09/2026" },
    { titel: "EEG 2023, § 10b – Vorgaben zur Direktvermarktung (Fernsteuerbarkeit)", url: "https://www.gesetze-im-internet.de/eeg_2014/__10b.html", stand: "09/2026" },
    { titel: "EEG 2023, § 21b – Zuordnung zu einer Veräußerungsform, Wechsel", url: "https://www.gesetze-im-internet.de/eeg_2014/__21b.html", stand: "09/2026" },
    { titel: "EEG 2023, § 52 – Zahlungen bei Pflichtverstößen", url: "https://www.gesetze-im-internet.de/eeg_2014/__52.html", stand: "09/2026" },
    { titel: "Netztransparenz (Übertragungsnetzbetreiber) – Marktwertübersicht", url: "https://www.netztransparenz.de/de-de/Erneuerbare-Energien-und-Umlagen/EEG/Transparenzanforderungen/Marktpr%C3%A4mie/Marktwert%C3%BCbersicht", stand: "09/2026" },
    { titel: "Bayerische Landesanstalt für Landwirtschaft – Solar/Photovoltaik: Strommarkt 2023 bis 2025", url: "https://www.lfl.bayern.de/iba/energie/372343/index.php", stand: "09/2026" },
    { titel: "Bundesnetzagentur – Bundesnetzagentur veröffentlicht Daten zum Strommarkt 2025 (SMARD)", url: "https://www.bundesnetzagentur.de/SharedDocs/Pressemitteilungen/DE/2026/20260105_Smard.html", stand: "09/2026" },
    { titel: "Bundesnetzagentur – Bundesnetzagentur veröffentlicht Daten zum Strommarkt 2024 (SMARD)", url: "https://www.bundesnetzagentur.de/SharedDocs/Pressemitteilungen/DE/2025/20250103_smard.html", stand: "09/2026" },
  ],

  seitenCta: {
    titel: "Welcher Erlöspfad trägt?",
    text: "EEG, PPA und Merchant mit Ihren Werten vergleichen.",
    href: pfad("/rechner/solarpark"),
    label: "Zum Solarpark-Rechner",
  },
  cta: {
    title: "Solarpark im Blick – mit Zuschlag oder PPA?",
    text: "In der Projektbörse finden Investoren Projekte in allen Entwicklungsphasen. Für Investoren ist die Suche kostenfrei.",
    primary: { label: "Zur Projektbörse", href: "/projektboerse" },
    secondary: { label: "Virtuelles Kraftwerk", href: pfad("/virtuelles-kraftwerk") },
  },
};

export default artikel;
