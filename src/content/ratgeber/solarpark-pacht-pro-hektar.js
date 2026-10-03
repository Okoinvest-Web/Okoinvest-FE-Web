// Ratgeber: Pacht pro Hektar für Solarparks 2026 – Spannen DE/AT/CH, Einflussfaktoren, Rechenbeispiel
// Recherchestand 29.09.2026 (Destatis Agrarstrukturerhebung 2023, Thünen Working Paper 204,
// LK Steiermark, EEG 2023 §§ 6, 37, 37c). Alle Marktzahlen aus src/lib/invest/markt.js.

import { PACHT, FREIFLAECHE, ERLOESE, REGIONEN, KOMMUNE, AGRI, STAND } from "@/lib/invest/markt";
import { fmt, fmtEur, fmtPct } from "@/lib/rechner/annahmen";
import { pfad } from "../../lib/land/index.js";

/* Werte, die (noch) nicht in markt.js stehen – Vorschlag zur Übernahme */
// Destatis, Pressemitteilung Nr. 153 vom 24.04.2024 (Agrarstrukturerhebung 2023):
// durchschnittliches Pachtentgelt je ha landwirtschaftlich genutzter Fläche 2023, alle Bestandsverträge.
const DESTATIS_PACHT_LF_2023 = 357;
// Destatis, ebenda: Spitzen- und Schlusslicht der Flächenländer 2023 (NRW / Saarland), €/ha.
const DESTATIS_PACHT_MAX_LAND = 560;
const DESTATIS_PACHT_MIN_LAND = 99;
// Landwirtschaftskammer Steiermark (17.05.2022): angebotene PV-Pachten in AT „im Schnitt zwischen 3.000 und 5.000 €/ha“.
const AT_PV_PACHT_ANGEBOTE = { min: 3000, max: 5000 };

/* ------------------------------------------------------------------ */
/* Rechenbeispiel: 10 ha in Süddeutschland, 30 Jahre                   */
/* ------------------------------------------------------------------ */

const HA = 10;
const JAHRE = PACHT.laufzeit;
const REGION = REGIONEN.find((r) => r.id === "de-sued");
const EEG_JAHRE = 20;

/** Summe einer jährlich indexierten Zahlung über n Jahre */
const summeIndexiert = (startbetrag, jahre, index) => {
  let s = 0;
  for (let t = 0; t < jahre; t++) s += startbetrag * Math.pow(1 + index, t);
  return s;
};

const mwp = HA / FREIFLAECHE.haProMwp;
const ertragJahr1 = mwp * 1000 * REGION.ertrag; // kWh im ersten Jahr

/** Stromerlöse je Jahr: 20 Jahre EEG-Zuschlagswert, danach konservativer Marktwert, mit Degradation */
const erloesJahr = (t) => {
  const kwh = ertragJahr1 * Math.pow(1 - FREIFLAECHE.degradation, t);
  const ct = t < EEG_JAHRE ? ERLOESE.eegFreiflaecheCt : ERLOESE.merchantCt;
  return (kwh * ct) / 100;
};
let erloesSumme = 0;
for (let t = 0; t < JAHRE; t++) erloesSumme += erloesJahr(t);

const R = {
  festMin: summeIndexiert(PACHT.freiflaecheProHa.min * HA, JAHRE, PACHT.indexierung),
  festMittel: summeIndexiert(PACHT.freiflaecheProHa.mittel * HA, JAHRE, PACHT.indexierung),
  festMax: summeIndexiert(PACHT.freiflaecheProHa.max * HA, JAHRE, PACHT.indexierung),
  umsatzMin: erloesSumme * PACHT.umsatzbeteiligung.min,
  umsatzMax: erloesSumme * PACHT.umsatzbeteiligung.max,
  umsatzJahr1Min: erloesJahr(0) * PACHT.umsatzbeteiligung.min,
  umsatzJahr1Max: erloesJahr(0) * PACHT.umsatzbeteiligung.max,
  acker: summeIndexiert(PACHT.ackerProHa * HA, JAHRE, PACHT.indexierung),
  kommuneJahr: (ertragJahr1 * KOMMUNE.beteiligungCt) / 100,
  festJahr1: PACHT.freiflaecheProHa.mittel * HA,
  festJahr30: PACHT.freiflaecheProHa.mittel * HA * Math.pow(1 + PACHT.indexierung, JAHRE - 1),
};
const faktorAcker = PACHT.freiflaecheProHa.mittel / PACHT.ackerProHa;
const eur = (n) => fmtEur(n);
const eurHa = (n) => `${fmt(n)} €/ha`;

const artikel = {
  slug: "solarpark-pacht-pro-hektar",
  title: "Pacht pro Hektar für Solarparks 2026: Spannen, Faktoren, Beispiel",
  seoTitle: "Solarpark Pacht pro Hektar 2026 | ÖkoInvest",
  kurzTitel: "Solarpark-Pacht pro Hektar",
  description:
    "Solarpark Pacht pro Hektar 2026: realistische Spannen für DE, AT und CH, Vergleich mit Ackerpacht, Festpacht vs. Umsatzpacht und Rechnung über 30 Jahre.",
  excerpt:
    "Was zahlen Solarparkbetreiber heute je Hektar – und warum liegen die Angebote so weit auseinander? Spannen, Einflussfaktoren, eine 30-Jahres-Rechnung und Warnsignale bei auffällig hohen Angeboten.",
  hauptKeyword: "solarpark pacht pro hektar",
  keywords: [
    "Solarpark Pacht pro Hektar",
    "Pacht Freiflächen-PV",
    "PV-Pacht Hektar 2026",
    "Fläche verpachten Solarpark",
    "Umsatzpacht Solarpark",
    "Pachtpreis Photovoltaik Acker",
    "Solarpark Pacht Österreich",
  ],
  veroeffentlicht: "2026-09-29",
  aktualisiert: "2026-09-29",
  kategorie: "Fläche & Pacht",
  bild: "/img/freiflaeche-begehung.jpg",
  bildAlt: "Zwei Fachleute mit Schutzhelm und Warnweste gehen zwischen aufgeständerten Modulreihen eines Solarparks",
  badge: { wert: `${fmt(PACHT.freiflaecheProHa.min)}–${fmt(PACHT.freiflaecheProHa.max)} €`, text: "Pacht je Hektar und Jahr, Freiflächen-PV" },

  kurzFazit: [
    `**Für Freiflächen-Solarparks werden 2026 in der Regel ${fmt(PACHT.freiflaecheProHa.min)} bis ${fmt(PACHT.freiflaecheProHa.max)} € je Hektar und Jahr gezahlt**, ein typischer Mittelwert liegt um ${eurHa(PACHT.freiflaecheProHa.mittel)}.`,
    `Das ist rund das **${fmt(faktorAcker, 0)}-Fache der üblichen Ackerpacht** von etwa ${eurHa(PACHT.ackerProHa)} – dafür ist die Fläche rund ${JAHRE} Jahre gebunden.`,
    `Über ${JAHRE} Jahre summiert sich die Pacht für 10 ha im Beispiel auf rund **${fmt(Math.round(R.festMittel / 1000) * 1000)} €** (Mittelwert, ${fmtPct(PACHT.indexierung)} Indexierung).`,
    "Den größten Einfluss auf die Pachthöhe haben **Netzanschluss** (Entfernung zum Umspannwerk, freie Kapazität), **Förderkulisse** und **Flächengröße** – nicht allein die Bodenqualität.",
    "Auffällig hohe Angebote sind oft an lange, unbezahlte Reservierungen oder einseitige Rücktrittsrechte gekoppelt. Entscheidend ist das Gesamtpaket, nicht die Zahl pro Hektar.",
  ],

  abschnitte: [
    {
      id: "antwort",
      titel: "Wie viel Pacht zahlt ein Solarpark pro Hektar?",
      tocLabel: "Kurze Antwort",
      bloecke: [
        {
          typ: "p",
          text: `**Für eine gut geeignete Fläche zahlen Solarparkbetreiber im DACH-Raum nach aktuellem Stand (${STAND}) meist zwischen ${fmt(PACHT.freiflaecheProHa.min)} und ${fmt(PACHT.freiflaecheProHa.max)} € je Hektar und Jahr.** Der Großteil der Verträge liegt im mittleren Bereich um ${eurHa(PACHT.freiflaecheProHa.mittel)}. Die Pacht wird in der Regel ab Baubeginn oder Inbetriebnahme gezahlt, über eine Laufzeit von ${JAHRE} Jahren mit Verlängerungsoptionen (häufig ${PACHT.verlaengerung}), und jährlich an die Inflation angepasst.`,
        },
        {
          typ: "p",
          text: "Eine einzige „richtige“ Zahl gibt es nicht. Die Pacht ist das Ergebnis einer Projektrechnung: Was ein Betreiber zahlen kann, hängt davon ab, wie teuer der Netzanschluss wird, welchen Strompreis er über Ausschreibung oder Stromliefervertrag erzielt und wie viele Megawatt auf die Fläche passen. Deshalb können zwei Äcker im selben Landkreis sehr unterschiedliche Angebote erhalten – der eine liegt 800 m vom [Umspannwerk](/wissen/lexikon#umspannwerk) entfernt, der andere 6 km.",
        },
        {
          typ: "kennzahl",
          wert: eurHa(PACHT.freiflaecheProHa.mittel),
          titel: "typische Solarpark-Pacht je Jahr",
          text: `Spanne ${fmt(PACHT.freiflaecheProHa.min)}–${fmt(PACHT.freiflaecheProHa.max)} €/ha. Zum Vergleich: Ackerpacht im Schnitt etwa ${eurHa(PACHT.ackerProHa)}, Agri-PV ${fmt(PACHT.agriProHa.min)}–${fmt(PACHT.agriProHa.max)} €/ha.`,
        },
        {
          typ: "tool",
          href: pfad("/rechner/pacht"),
          titel: "Pacht für Ihre Fläche abschätzen",
          text: "Fläche, Region und Pachtmodell eingeben – der Pachtrechner zeigt Jahres- und Gesamtpacht über die Laufzeit.",
          label: "Zum Pachtrechner",
        },
      ],
    },
    {
      id: "spannen-dach",
      titel: "Pachtspannen in Deutschland, Österreich und der Schweiz",
      tocLabel: "Spannen DE/AT/CH",
      bloecke: [
        {
          typ: "p",
          text: "**Deutschland ist der größte und transparenteste Markt für Freiflächen-PV im DACH-Raum, Österreich zieht nach, in der Schweiz spielen klassische Solarparks auf Ackerland kaum eine Rolle.** Die folgende Übersicht fasst die Größenordnungen zusammen:",
        },
        {
          typ: "tabelle",
          caption: `Pacht für Photovoltaik-Flächen im Vergleich, Stand ${STAND}`,
          kopf: ["Nutzung", "Typische Pacht je ha und Jahr", "Einordnung"],
          zeilen: [
            ["Freiflächen-PV Deutschland", `**${fmt(PACHT.freiflaecheProHa.min)}–${fmt(PACHT.freiflaecheProHa.max)} €**`, `Mittelwert um ${eurHa(PACHT.freiflaecheProHa.mittel)}; Spitzen an sehr guten Netzpunkten`],
            ["Freiflächen-PV Österreich", `oft ${fmt(AT_PV_PACHT_ANGEBOTE.min)}–${fmt(AT_PV_PACHT_ANGEBOTE.max)} € (Angebote)`, "laut Landwirtschaftskammer Steiermark; Widmung „Grünland-Photovoltaik“ je Bundesland nötig"],
            ["Freiflächen-PV Schweiz", "kein belastbarer Marktwert", "Freiflächen außerhalb der Bauzone nur ausnahmsweise; Fokus auf Dächer und alpine Anlagen"],
            ["Agri-PV (DACH)", `${fmt(PACHT.agriProHa.min)}–${fmt(PACHT.agriProHa.max)} €`, "niedriger, weil die landwirtschaftliche Nutzung beim Eigentümer bzw. Bewirtschafter bleibt"],
            ["Ackerpacht Deutschland (Durchschnitt)", `rund ${fmt(PACHT.ackerProHa)} €`, `Destatis 2023: ${eurHa(DESTATIS_PACHT_LF_2023)} im Schnitt aller Agrarflächen, Neupachten deutlich höher`],
          ],
          hervorheben: 1,
          minBreite: 680,
          fussnote: "Orientierungswerte ohne Umsatzsteuer, keine Angebote. Österreich-Werte beziehen sich auf von Energieversorgern angebotene Pachten (LK Steiermark 2022) und sind nicht mit abgeschlossenen Verträgen gleichzusetzen.",
        },
        {
          typ: "p",
          text: "In **Österreich** ist neben dem Netzanschluss die Flächenwidmung der Engpass: Eine Freiflächenanlage braucht je nach Bundesland eine Widmung als Grünland-Photovoltaik oder liegt in einer ausgewiesenen Vorrangzone. Mehr dazu im Ratgeber [Freiflächen-PV in Österreich](/wissen/ratgeber/freiflaechen-pv-oesterreich). In der **Schweiz** sind Solaranlagen außerhalb der Bauzonen raumplanerisch stark eingeschränkt; ein Pachtmarkt für Ackerflächen wie in Deutschland existiert praktisch nicht. Einordnung im Ratgeber [Freiflächen-PV in der Schweiz](/wissen/ratgeber/freiflaechen-pv-schweiz).",
        },
      ],
    },
    {
      id: "vergleich-acker",
      titel: "Solarpark-Pacht im Vergleich zur Ackerpacht",
      tocLabel: "Vergleich Ackerpacht",
      bloecke: [
        {
          typ: "p",
          text: `**Die Solarpacht liegt im Mittel beim ${fmt(faktorAcker, 0)}-Fachen der landwirtschaftlichen Pacht.** Laut Statistischem Bundesamt lag das durchschnittliche Pachtentgelt für landwirtschaftlich genutzte Flächen in Deutschland 2023 bei ${eurHa(DESTATIS_PACHT_LF_2023)} – mit großen Unterschieden zwischen ${eurHa(DESTATIS_PACHT_MIN_LAND)} im Saarland und ${eurHa(DESTATIS_PACHT_MAX_LAND)} in Nordrhein-Westfalen. Reines Ackerland liegt etwas darüber; wir rechnen mit rund ${eurHa(PACHT.ackerProHa)}.`,
        },
        {
          typ: "p",
          text: `Wer die Fläche bisher selbst bewirtschaftet, sollte nicht mit der Ackerpacht vergleichen, sondern mit dem **Deckungsbeitrag**: Im Ackerbau liegt er grob zwischen ${fmt(PACHT.deckungsbeitragAcker.min)} und ${fmt(PACHT.deckungsbeitragAcker.max)} € je Hektar und Jahr, stark abhängig von Kultur, Standort und Preisen. Hinzu kommen Direktzahlungen der GAP von grob ${eurHa(AGRI.direktzahlungProHa)}, die für Flächen unter einer klassischen Freiflächenanlage in der Regel entfallen – anders als bei [Agri-PV](/de/agri-pv), wo nach aktuellem Stand ${fmtPct(AGRI.gapFoerderfaehig, 0)} der Fläche förderfähig bleiben.`,
        },
        {
          typ: "kasten",
          variant: "info",
          titel: "Was das Thünen-Institut zur Wirkung auf den Bodenmarkt sagt",
          text: "Das Thünen-Institut hat 2022 den künftigen Flächenbedarf von Freiflächen-PV abgeschätzt und dabei festgestellt, dass Pachtgebote von über 2.500 € je Hektar weit über der landwirtschaftlichen Pacht liegen. Bundesweit geht es um einen kleinen Anteil der Agrarfläche, regional können hohe PV-Pachten den Bodenmarkt aber spürbar beeinflussen. Für Verpächter heißt das: Die Nachbarschaft schaut genau hin – ein offener Umgang mit dem Projekt zahlt sich aus.",
        },
      ],
    },
    {
      id: "einflussfaktoren",
      titel: "Die wichtigsten Einflussfaktoren auf die Pachthöhe",
      tocLabel: "Einflussfaktoren",
      bloecke: [
        {
          typ: "p",
          text: "**Was ein Betreiber je Hektar zahlen kann, entscheidet sich vor allem am Netzanschluss und am rechtlichen Rahmen der Fläche.** Die Bodengüte spielt – anders als bei der Landpacht – eher indirekt eine Rolle, weil hochwertige Böden planerisch schwerer durchzusetzen sind.",
        },
        {
          typ: "tabelle",
          caption: "Faktoren, die die Solarpark-Pacht erhöhen oder senken",
          kopf: ["Faktor", "Wirkt pachterhöhend", "Wirkt pachtsenkend"],
          zeilen: [
            ["Netzanschluss", "Umspannwerk oder Mittelspannungsleitung mit freier Kapazität in der Nähe", `lange Kabeltrasse (im Mittel rund ${fmt(FREIFLAECHE.kabelProMeter)} € je Meter), fehlende Kapazität, hoher Baukostenzuschuss`],
            ["EEG-Flächenkulisse", "[Randstreifen](/wissen/lexikon#randstreifen) bis 500 m an Autobahnen und zweigleisigen Schienenwegen, Konversionsflächen", "Fläche außerhalb der Kulisse – nur mit Stromliefervertrag (PPA) ohne Marktprämie finanzierbar"],
            ["Benachteiligte Gebiete", "Acker/Grünland in [benachteiligten Gebieten](/wissen/lexikon#benachteiligte-gebiete), wenn das Land nicht per Opt-out ausschließt", "Land hat die Öffnung nach § 37c EEG eingeschränkt"],
            ["Baurecht", "privilegierter 200-m-Korridor nach § 35 BauGB, Gemeinde unterstützt Bebauungsplan", "Schutzgebiete, Landschaftsbild, Vorrangflächen Landwirtschaft"],
            ["Flächengröße und Zuschnitt", "ab etwa 10–20 ha, kompakt, eben oder leicht südgeneigt", `unter etwa ${fmt(FREIFLAECHE.mindestHa)} ha, zerstückelt, Nordhang, Verschattung`],
            ["Einstrahlung", `Süddeutschland und Österreich mit rund ${fmt(REGION.ertrag)} kWh/kWp`, `Norddeutschland mit rund ${fmt(REGIONEN.find((r) => r.id === "de-nord").ertrag)} kWh/kWp`],
          ],
          minBreite: 760,
          fussnote: "Qualitative Einordnung. Der Netzanschluss ist der häufigste Grund, warum Flächen trotz guter Lage keinen Zuschlag finden.",
        },
        {
          typ: "p",
          text: "Die Netzfrage lässt sich überschlagen: Kostet die Anbindung eines 10-MW-Parks wegen einer 5 km langen Trasse mehrere Hunderttausend Euro mehr als bei einer Fläche direkt am [Netzverknüpfungspunkt](/wissen/lexikon#netzverknuepfungspunkt), fehlt dieses Geld über die Laufzeit in der Projektrechnung – und damit auch für die Pacht. Wie der Ausschreibungspreis zustande kommt, erklärt der Ratgeber [EEG-Ausschreibung für Freiflächen](/wissen/ratgeber/eeg-ausschreibung-freiflaeche).",
        },
      ],
    },
    {
      id: "pachtmodelle",
      titel: "Festpacht, Umsatzpacht, Indexierung und Reservierungsprämie",
      tocLabel: "Pachtmodelle",
      bloecke: [
        {
          typ: "h3",
          text: "Festpacht",
        },
        {
          typ: "p",
          text: `Die Festpacht ist ein fester Betrag je Hektar und Jahr, unabhängig vom Stromertrag. Für den Eigentümer ist sie planbar; das Ertrags- und Strompreisrisiko trägt der Betreiber. Üblich ist eine **jährliche Wertsicherung** am Verbraucherpreisindex; wir rechnen vereinfacht mit ${fmtPct(PACHT.indexierung)} pro Jahr. Aus ${eur(R.festJahr1)} im ersten Jahr werden so im Beispiel bis zum ${JAHRE}. Jahr rund ${eur(R.festJahr30)}.`,
        },
        {
          typ: "h3",
          text: "Umsatzpacht",
        },
        {
          typ: "p",
          text: `Bei der Umsatzpacht erhält der Eigentümer einen Anteil an den Stromerlösen, marktüblich etwa ${fmtPct(PACHT.umsatzbeteiligung.min, 0)} bis ${fmtPct(PACHT.umsatzbeteiligung.max, 0)}. Steigen die Strompreise, profitiert er mit; sinken sie, sinkt auch die Pacht. Häufig wird deshalb eine **Mindestpacht** vereinbart, die in jedem Fall gezahlt wird, plus Umsatzanteil oberhalb eines Schwellenwerts. Wichtig ist, genau festzulegen, welche Erlöse zählen (Marktprämie, Direktvermarktung, Stromliefervertrag, Herkunftsnachweise) und wie der Eigentümer sie prüfen kann.`,
        },
        {
          typ: "h3",
          text: "Reservierungsprämie bis zum Baubeginn",
        },
        {
          typ: "p",
          text: `Zwischen Vertragsunterzeichnung und Baubeginn vergehen oft zwei bis vier Jahre – für Bebauungsplan, Netzanschlusszusage und Ausschreibung. In dieser Zeit ist die Fläche gebunden, wird aber meist weiter landwirtschaftlich genutzt. Faire Verträge sehen dafür ein **Bereitstellungs- oder Reservierungsentgelt** vor, typischerweise ${fmt(PACHT.reservierungProHa.min)}–${fmt(PACHT.reservierungProHa.max)} € je Hektar, je nach Vertrag einmalig oder jährlich bis Baubeginn. Fehlt es ganz, trägt allein der Eigentümer das Risiko, dass das Projekt scheitert.`,
        },
      ],
    },
    {
      id: "rechenbeispiel",
      titel: `Rechenbeispiel: 10 Hektar über ${JAHRE} Jahre`,
      tocLabel: "Rechenbeispiel",
      bloecke: [
        {
          typ: "p",
          text: `**Auf 10 Hektar passen bei fester Süd-Aufständerung rund ${fmt(mwp, 1)} MWp; in Süddeutschland erzeugt die Anlage im ersten Jahr etwa ${fmt(ertragJahr1 / 1e6, 1)} Mio. kWh.** Wir unterstellen ${EEG_JAHRE} Jahre einen Zuschlagswert von ${fmt(ERLOESE.eegFreiflaecheCt, 1)} ct/kWh und danach einen vorsichtigen Marktwert von ${fmt(ERLOESE.merchantCt, 1)} ct/kWh, Moduldegradation ${fmtPct(FREIFLAECHE.degradation)} pro Jahr.`,
        },
        {
          typ: "tabelle",
          caption: `Pachteinnahmen für 10 ha über ${JAHRE} Jahre im Vergleich, Stand ${STAND}`,
          kopf: ["Modell", "Erstes Jahr", `Summe über ${JAHRE} Jahre`],
          zeilen: [
            [`Festpacht Minimum (${eurHa(PACHT.freiflaecheProHa.min)})`, eur(PACHT.freiflaecheProHa.min * HA), eur(R.festMin)],
            [`**Festpacht Mittelwert (${eurHa(PACHT.freiflaecheProHa.mittel)})**`, `**${eur(R.festJahr1)}**`, `**${eur(R.festMittel)}**`],
            [`Festpacht Maximum (${eurHa(PACHT.freiflaecheProHa.max)})`, eur(PACHT.freiflaecheProHa.max * HA), eur(R.festMax)],
            [`Umsatzpacht ${fmtPct(PACHT.umsatzbeteiligung.min, 0)} der Erlöse`, eur(R.umsatzJahr1Min), eur(R.umsatzMin)],
            [`Umsatzpacht ${fmtPct(PACHT.umsatzbeteiligung.max, 0)} der Erlöse`, eur(R.umsatzJahr1Max), eur(R.umsatzMax)],
            [`Zum Vergleich: Ackerpacht (${eurHa(PACHT.ackerProHa)})`, eur(PACHT.ackerProHa * HA), eur(R.acker)],
          ],
          hervorheben: 2,
          markierteZeile: 1,
          minBreite: 620,
          fussnote: `Festpacht und Ackerpacht mit ${fmtPct(PACHT.indexierung)} jährlicher Indexierung, Umsatzpacht ohne Mindestpacht. Nominale Summen ohne Abzinsung und ohne Steuern. Reservierungsentgelte vor Baubeginn sind nicht enthalten.`,
        },
        {
          typ: "p",
          text: `Die Rechnung zeigt zweierlei: Eine Umsatzpacht von ${fmtPct(PACHT.umsatzbeteiligung.min, 0)} bis ${fmtPct(PACHT.umsatzbeteiligung.max, 0)} landet in derselben Größenordnung wie die Festpacht – sie ist also kein Geschenk, sondern eine andere Risikoverteilung. Und nach Ende der Förderung sinkt der Umsatzanteil, wenn die Marktpreise niedriger liegen. Wer die Umsatzvariante wählt, sollte deshalb auf einer Mindestpacht bestehen. Mit eigenen Werten rechnen Sie im [Pachtrechner](/de/rechner/pacht).`,
        },
        {
          typ: "kasten",
          variant: "wichtig",
          titel: "Steuern nicht vergessen",
          text: "Die Pacht ist steuerpflichtiges Einkommen. Wichtiger ist in Deutschland oft die Frage, ob die Fläche ihren Status als land- und forstwirtschaftliches Vermögen verliert – mit Folgen für Erbschaft-, Schenkung- und Grundsteuer. Die Details erklärt der Ratgeber [Erbschaft- und Grundsteuer bei PV-Pacht](/wissen/ratgeber/pv-pacht-erbschaftsteuer-grundsteuer). Lassen Sie das vor Vertragsunterzeichnung steuerlich prüfen.",
        },
      ],
    },
    {
      id: "kommunalbeteiligung",
      titel: "§ 6 EEG: Kommunalbeteiligung ist keine Pacht",
      tocLabel: "§ 6 EEG vs. Pacht",
      bloecke: [
        {
          typ: "p",
          text: `**Die Zahlung nach § 6 EEG geht an die Gemeinde, nicht an den Flächeneigentümer.** Betreiber von Freiflächenanlagen dürfen den Gemeinden, auf deren Gebiet die Anlage steht, bis zu ${fmt(KOMMUNE.beteiligungCt, 1)} ct je tatsächlich eingespeister Kilowattstunde anbieten; bei geförderten Anlagen können sie sich den Betrag vom Netzbetreiber erstatten lassen. Im Beispiel wären das rund ${eur(R.kommuneJahr)} im Jahr für die Gemeindekasse.`,
        },
        {
          typ: "kasten",
          variant: "recht",
          titel: "Rechtslage in Deutschland (EEG 2023, Stand September 2026)",
          text: "§ 6 EEG erlaubt freiwillige Zahlungen an betroffene Gemeinden, § 37 Abs. 1 Nr. 2 EEG legt fest, auf welchen Flächen Freiflächenanlagen an den Ausschreibungen teilnehmen dürfen, und § 37c EEG erlaubt den Ländern, Acker- und Grünland in benachteiligten Gebieten ab bestimmten Schwellen auszuschließen. Maßgeblich ist jeweils die aktuelle Fassung auf gesetze-im-internet.de.",
        },
        {
          typ: "p",
          text: "Für Eigentümer ist die Kommunalbeteiligung trotzdem relevant: Sie erhöht die Akzeptanz in Gemeinderat und Nachbarschaft, und ohne Gemeinderat gibt es keinen Bebauungsplan. Wie Kommunen profitieren und was sie zusätzlich an Gewerbesteuer erhalten, zeigt die Seite für [Kommunen](/de/kommunen).",
        },
      ],
    },
    {
      id: "warnsignale",
      titel: "Warnsignale bei auffällig hohen Pachtangeboten",
      tocLabel: "Warnsignale",
      bloecke: [
        {
          typ: "p",
          text: `**Ein Angebot deutlich über ${eurHa(PACHT.freiflaecheProHa.max)} ist nicht automatisch unseriös – aber es sollte Sie zu besonders genauer Prüfung veranlassen.** Oft steckt hinter einer hohen Zahl ein Vertrag, der die Risiken beim Eigentümer lässt:`,
        },
        {
          typ: "checkliste",
          punkte: [
            "**Lange Reservierung ohne Entgelt:** Die Fläche ist fünf Jahre oder länger gebunden, gezahlt wird erst ab Inbetriebnahme.",
            "**Einseitige Rücktrittsrechte:** Der Entwickler kann jederzeit ohne Entschädigung aussteigen, Sie selbst nicht.",
            "**Pacht erst ab Einspeisung**, ohne Regel für den Fall, dass der Bau sich verzögert.",
            "**Keine Rückbausicherheit** (Bürgschaft oder Rücklage) für das Vertragsende.",
            "**Unklare Umsatzbasis** bei Umsatzpacht, ohne Prüf- und Einsichtsrechte.",
            "**Freie Übertragbarkeit** auf beliebige Gesellschaften ohne Bonitätsanforderung.",
            "**Gebühren oder Vorleistungen** vom Eigentümer – in seriösen Verträgen zahlt der Entwickler Gutachten und Planung.",
          ],
        },
        {
          typ: "p",
          text: "Worauf es in den einzelnen Klauseln ankommt, erklärt der Ratgeber [Pachtvertrag für Solarparks](/wissen/ratgeber/pachtvertrag-solarpark). Hintergrund zum Vorgehen aus Eigentümersicht finden Sie unter [Fläche verpachten](/de/flaeche-verpachten) und für landwirtschaftliche Betriebe unter [Landwirte](/de/landwirte).",
        },
      ],
    },
    {
      id: "vorgehen",
      titel: "So kommen Sie zu einer fairen Pacht",
      tocLabel: "Vorgehen",
      bloecke: [
        {
          typ: "ablauf",
          schritte: [
            ["Fläche einordnen", "Größe, Zuschnitt, Lage zu Autobahn oder Bahn, Entfernung zum nächsten Umspannwerk und Schutzgebiete notieren. Der [Flächencheck](/de/flaechencheck) hilft bei der ersten Einschätzung."],
            ["Größenordnung rechnen", "Mit dem [Pachtrechner](/de/rechner/pacht) Fest- und Umsatzpacht über die Laufzeit vergleichen."],
            ["Mehrere Angebote einholen", "Nicht nur die Zahl je Hektar vergleichen, sondern Reservierungsentgelt, Rücktrittsrechte, Rückbausicherheit und Indexierung."],
            ["Steuer und Recht prüfen lassen", "Vertrag von Anwalt oder Notar, steuerliche Folgen von Steuerberatung prüfen lassen – vor der Unterschrift."],
            ["Gemeinde früh einbinden", "Ohne Bebauungsplan kein Solarpark. Ein frühes Gespräch mit Bürgermeister und Gemeinderat spart Zeit."],
          ],
        },
      ],
    },
  ],

  faq: [
    {
      q: "Wie viel Pacht bekomme ich für 1 Hektar Solarpark?",
      a: `Nach aktuellem Stand meist zwischen ${fmt(PACHT.freiflaecheProHa.min)} und ${fmt(PACHT.freiflaecheProHa.max)} € je Jahr, im Mittel um ${eurHa(PACHT.freiflaecheProHa.mittel)}. Die Höhe hängt vor allem vom Netzanschluss, der Förderkulisse und der Flächengröße ab. Eine erste Schätzung liefert der [Pachtrechner](/de/rechner/pacht).`,
    },
    {
      q: "Ist eine Umsatzpacht besser als eine Festpacht?",
      a: `Nicht grundsätzlich. Mit ${fmtPct(PACHT.umsatzbeteiligung.min, 0)} bis ${fmtPct(PACHT.umsatzbeteiligung.max, 0)} der Erlöse liegt sie in derselben Größenordnung, schwankt aber mit Ertrag und Strompreis. Sinnvoll ist oft eine Kombination aus Mindestpacht und Umsatzanteil.`,
    },
    {
      q: "Ab wann wird die Pacht gezahlt?",
      a: "Die volle Pacht beginnt in der Regel mit Baubeginn oder Inbetriebnahme. Für die Planungsphase davor sollten Sie ein Bereitstellungs- oder Reservierungsentgelt vereinbaren, damit die Bindung der Fläche vergütet wird.",
    },
    {
      q: "Wie klein darf eine Fläche für einen Solarpark sein?",
      a: `Unter etwa ${fmt(FREIFLAECHE.mindestHa)} Hektar wird es selten wirtschaftlich, weil Netzanschluss und Planung Fixkosten verursachen. Kleinere Flächen können interessant sein, wenn sie an eine größere Planung angrenzen oder direkt am Netzverknüpfungspunkt liegen.`,
    },
    {
      q: "Bekomme ich als Eigentümer auch die 0,2 ct nach § 6 EEG?",
      a: "Nein. Die Zahlung nach § 6 EEG richtet sich an die Standortgemeinde, nicht an Verpächter. Sie verbessert aber die Akzeptanz des Projekts in der Gemeinde.",
    },
    {
      q: "Zahlen Solarparks in Österreich mehr Pacht als in Deutschland?",
      a: `Die von Energieversorgern angebotenen Pachten lagen laut Landwirtschaftskammer Steiermark im Schnitt bei ${fmt(AT_PV_PACHT_ANGEBOTE.min)} bis ${fmt(AT_PV_PACHT_ANGEBOTE.max)} € je Hektar – also im oberen Bereich der deutschen Spanne. Der Engpass ist in Österreich oft die Widmung. Mehr dazu unter [Freiflächen-PV in Österreich](/wissen/ratgeber/freiflaechen-pv-oesterreich).`,
    },
  ],

  passend: [
    { href: "/wissen/ratgeber/pachtvertrag-solarpark", titel: "Pachtvertrag Solarpark", text: "Die wichtigsten Klauseln und eine Checkliste für Eigentümer." },
    { href: "/wissen/ratgeber/pv-pacht-erbschaftsteuer-grundsteuer", titel: "Erbschaft- und Grundsteuer bei PV-Pacht", text: "Was die Verpachtung steuerlich auslösen kann." },
    { href: pfad("/rechner/pacht"), titel: "Pachtrechner", text: "Fest- und Umsatzpacht über die Laufzeit berechnen." },
    { href: pfad("/flaeche-verpachten"), titel: "Fläche verpachten", text: "Ablauf und Voraussetzungen für Flächeneigentümer." },
  ],

  quellen: [
    { titel: "Statistisches Bundesamt – Pachtpreise für landwirtschaftliche Flächen zwischen 2020 und 2023 um 9 % gestiegen (PM 153/2024)", url: "https://www.destatis.de/DE/Presse/Pressemitteilungen/2024/04/PD24_153_41.html", stand: "09/2026" },
    { titel: "Thünen-Institut – Working Paper 204: Abschätzung des zukünftigen Flächenbedarfs von PV-Freiflächenanlagen", url: "https://literatur.thuenen.de/digbib_extern/dn065640.pdf", stand: "09/2026" },
    { titel: "Landwirtschaftskammer Steiermark – Photovoltaik auf Freiflächen: Nicht alles ist Gold, was glänzt", url: "https://stmk.lko.at/photovoltaik-auf-freifl%C3%A4chen-nicht-alles-ist-gold-was-gl%C3%A4nzt+2400+3668154", stand: "09/2026" },
    { titel: "EEG 2023, § 6 – Finanzielle Beteiligung der Kommunen", url: "https://www.gesetze-im-internet.de/eeg_2014/__6.html", stand: "09/2026" },
    { titel: "EEG 2023, § 37 – Gebote für Solaranlagen des ersten Segments", url: "https://www.gesetze-im-internet.de/eeg_2014/__37.html", stand: "09/2026" },
    { titel: "EEG 2023, § 37c – Benachteiligte Gebiete, Länderöffnungsklausel", url: "https://www.gesetze-im-internet.de/eeg_2014/__37c.html", stand: "09/2026" },
    { titel: "Bundesnetzagentur – Ausschreibungen Solaranlagen erstes Segment", url: "https://www.bundesnetzagentur.de/DE/Fachthemen/ElektrizitaetundGas/Ausschreibungen/Solaranlagen1/start.html", stand: "09/2026" },
  ],

  seitenCta: {
    titel: "Was ist Ihre Fläche wert?",
    text: "Jahres- und Gesamtpacht mit Ihren Werten berechnen.",
    href: pfad("/rechner/pacht"),
    label: "Zum Pachtrechner",
  },
  cta: {
    title: "Lassen Sie Ihre Fläche kostenfrei einschätzen.",
    text: "Im Flächencheck prüfen wir Lage, Netzanschluss und Planungsrecht Ihrer Fläche. Für Flächeneigentümer ist die Plattform von ÖkoInvest kostenfrei.",
    primary: { label: "Zum Flächencheck", href: pfad("/flaechencheck") },
    secondary: { label: "Pacht selbst berechnen", href: pfad("/rechner/pacht") },
  },
};

export default artikel;
