// Ratgeber: Kommunale Beteiligung nach § 6 EEG in der Praxis – Empfänger, Erstattung, Vertrag,
// Haushalt, Landesgesetze, Gewerbesteuer. Recherchestand 29.09.2026: EEG 2023 § 6; GewStG § 29;
// BbgEESG vom 27.11.2025; BüGembeteilG M-V vom 23.04.2026 (GVOBl. M-V 2026 Nr. 12);
// FA Wind und Solar (Übersicht Landesregelungen PV, Stand 17.07.2026; Kommunalbefragung § 6 EEG).
// Rechenbeispiel mit dem Rechenkern des Kommunal-Rechners (src/lib/rechner/kommune.js).
// Nachprüfung 03.10.2026 (Paket G): § 6 Abs. 4 EEG (gesetze-im-internet.de), NWindPVBetG (klimaschutz-niedersachsen.de),
// AuBG (MWU Sachsen-Anhalt, Erläuterungen), EEErtrBetG (REVOSax, Stand 25.09.2025), BayWiVG (StMWi Bayern),
// SGBG (MWIDE-Meldung 19.07.2024; Höhe 0,2 ct nur über FA Wind und Solar, Länderinfo 12/2025).

import { KOMMUNE, ERLOESE, STAND } from "@/lib/invest/markt";
import { rechneKommune } from "@/lib/rechner/kommune";
import { fmt, fmtEur, fmtPct, fmtCt } from "@/lib/rechner/annahmen";
import { pfad } from "../../lib/land/index.js";

/* ------------------------------------------------------------------ */
/* Werte, die (noch) nicht in markt.js stehen – Vorschlag zur Übernahme */
/* ------------------------------------------------------------------ */

// BbgEESG vom 27.11.2025, § 2 Abs. 2 Nr. 3: Sonderabgabe PV-Freifläche > 1 MW, Inbetriebnahme nach 31.12.2024
const BB_EUR_PRO_MW = 2000;
// BüGembeteilG M-V vom 23.04.2026, § 8 Abs. 2 und § 11: Angebot je volles MW und Jahr (Gemeinde / Einwohner) bzw. Ersatzzahlung
const MV_GEMEINDE_EUR_PRO_MW = 1000;
const MV_EINWOHNER_EUR_PRO_MW = 1000;
const MV_ERSATZ_EUR_PRO_MW = 2000;
// Landesgesetze gelten jeweils erst ab 1 MW installierter Leistung (BbgEESG § 1 Abs. 3; BüGembeteilG M-V § 1 Abs. 2)
const LAND_SCHWELLE_MW = 1;
// FA Wind und Solar, Kommunalbefragung § 6 EEG (forsa, 1.655 Befragte; Windenergie): Anteile der Bürgermeister
const FA_BEFRAGUNG = { bekannt: 0.85, erstattungUnbekannt: 0.42, zufriedenUmsetzung: 0.26 };

/* ------------------------------------------------------------------ */
/* Rechenbeispiel mit dem Kommunal-Rechner                             */
/* ------------------------------------------------------------------ */

const MWP = 10;
const R = rechneKommune({ mwp: MWP, regionId: "de-sued", paragraph6: true, gemeindeflaeche: false });
const R_SITZ = rechneKommune({ mwp: MWP, regionId: "de-sued", paragraph6: true, sitzInGemeinde: true });
const P6_JAHR = R.jahre1.p6;
const GWH = R.ertragJahr1 / 1e6;
const BB_JAHR = BB_EUR_PRO_MW * MWP;
const MV_JAHR = (MV_GEMEINDE_EUR_PRO_MW + MV_EINWOHNER_EUR_PRO_MW) * MWP;
const rund = (n, s = 1000) => fmtEur(Math.round(n / s) * s);

const artikel = {
  slug: "kommunale-beteiligung-6-eeg",
  title: "Kommunale Beteiligung nach § 6 EEG: So profitieren Gemeinden",
  seoTitle: "Kommunale Beteiligung § 6 EEG Solarpark | ÖkoInvest",
  kurzTitel: "Kommunale Beteiligung § 6 EEG",
  description:
    "§ 6 EEG in der Praxis: wer die 0,2 ct/kWh bekommt, wie die Erstattung läuft, was in den Vertrag gehört und welche Landesgesetze zusätzlich gelten.",
  excerpt:
    "Bis zu 0,2 Cent je Kilowattstunde darf ein Solarpark der Standortgemeinde zahlen – bei geförderten Anlagen erstattet der Netzbetreiber. Vertrag, Haushalt, Landesgesetze und Gewerbesteuer im Überblick.",
  hauptKeyword: "kommunale beteiligung § 6 eeg",
  keywords: [
    "§ 6 EEG Kommunalbeteiligung",
    "kommunale Beteiligung Solarpark",
    "0,2 Cent Gemeinde Solarpark",
    "§ 6 EEG Vertrag Gemeinde",
    "Erstattung § 6 EEG Netzbetreiber",
    "Beteiligungsgesetz Solar Bundesland",
    "Gewerbesteuer Solarpark Gemeinde",
  ],
  veroeffentlicht: "2026-09-29",
  aktualisiert: "2026-10-03", // Rechtsstand nachgeprüft (Welle 1, Paket G)
  kategorie: "Strom, Markt & Gemeinschaft",
  bild: "/img/team-praesentation.jpg",
  bildAlt: "Zwei Frauen stellen einer Gesprächsrunde am Tisch ein kleines Solarmodul vor, daneben ein Flipchart",
  badge: { wert: `${fmt(KOMMUNE.beteiligungCt, 1)} ct/kWh`, text: "Kommunalbeteiligung nach § 6 EEG" },

  kurzFazit: [
    `**Nach § 6 EEG dürfen Betreiber von Freiflächenanlagen der Standortgemeinde bis zu ${fmt(KOMMUNE.beteiligungCt, 1)} ct je tatsächlich eingespeister Kilowattstunde zahlen** – freiwillig und ohne Gegenleistung. Vereinbart werden darf sie schon vor der Genehmigung, bei einem Bebauungsplan aber **nicht vor dessen Beschluss** (§ 6 Abs. 4 EEG).`,
    `Für einen Park mit ${MWP} MWp in Süddeutschland sind das rund **${fmtEur(P6_JAHR)} im Jahr** und über ${KOMMUNE.betrachtungJahre} Jahre gut ${rund(R.gesamt.p6, 10000)}.`,
    "Der Betreiber kann sich die Zahlung **für EEG-geförderte Strommengen vom Netzbetreiber erstatten** lassen. Für PPA-Strom und Zeiträume ohne Marktprämie gibt es keine Erstattung.",
    "Mehrere Länder machen die Beteiligung inzwischen **zur Pflicht**, etwa Brandenburg (2.000 € je MW und Jahr), Mecklenburg-Vorpommern (je 1.000 € je MW für Gemeinde und Einwohner), Niedersachsen, Sachsen-Anhalt, Sachsen, das Saarland und seit 2026 Bayern (ab 5 MW).",
    `Die **Gewerbesteuer** steht bei Solaranlagen zu ${fmtPct(KOMMUNE.gewerbesteuerStandort, 0)} der Standortgemeinde zu, fällt wegen Abschreibung und Zinsen aber oft erst nach vielen Jahren nennenswert an.`,
  ],

  abschnitte: [
    {
      id: "antwort",
      titel: "Wer bekommt die Kommunalbeteiligung nach § 6 EEG – und wie viel?",
      tocLabel: "Kurze Antwort",
      bloecke: [
        {
          typ: "p",
          text: `**Empfänger ist bei Freiflächenanlagen die Gemeinde, auf deren Gebiet die Anlage steht; sie kann insgesamt bis zu ${fmt(KOMMUNE.beteiligungCt, 1)} ct je tatsächlich eingespeister Kilowattstunde erhalten.** Liegt die Anlage in einem gemeindefreien Gebiet, tritt der Landkreis an die Stelle der Gemeinde. Verteilt sich ein Park auf mehrere Gemeinden, wird der Betrag aufgeteilt.`,
        },
        {
          typ: "p",
          text: `Die [Kommunalbeteiligung](/wissen/lexikon#kommunalbeteiligung) ist keine Pacht und keine Steuer, sondern eine **einseitige Zuwendung ohne Gegenleistung**. Seit dem EEG 2023 darf sie auch für Bestandsanlagen und für Anlagen ohne EEG-Förderung gezahlt werden. Wie viel Pacht ein Flächeneigentümer daneben erhält, steht im Ratgeber [Solarpark-Pacht pro Hektar](/ratgeber/solarpark-pacht-pro-hektar); die Zahlung nach § 6 fließt immer an die Gemeinde, nie an Verpächter.`,
        },
        {
          typ: "kennzahl",
          wert: fmtEur(P6_JAHR),
          titel: `pro Jahr für die Gemeinde bei ${MWP} MWp`,
          text: `Rund ${fmt(GWH, 1)} GWh Einspeisung in Süddeutschland × ${fmt(KOMMUNE.beteiligungCt, 1)} ct/kWh, im ersten Betriebsjahr. Mit eigenen Werten rechnen Sie im Kommunal-Rechner.`,
        },
        {
          typ: "tool",
          href: pfad("/rechner/kommune"),
          titel: "Was bringt ein Solarpark Ihrer Gemeinde?",
          text: "Leistung, Region, Hebesatz und Gemeindeflächen eingeben – der Kommunal-Rechner zeigt § 6-Zahlung, Gewerbesteuer und Pacht über die Laufzeit.",
          label: "Zum Kommunal-Rechner",
        },
      ],
    },
    {
      id: "erstattung",
      titel: "Erstattung durch den Netzbetreiber: Welche Strommengen zählen?",
      tocLabel: "Erstattung",
      bloecke: [
        {
          typ: "p",
          text: "**Der Betreiber kann sich den im Vorjahr an die Gemeinde gezahlten Betrag im Rahmen der Endabrechnung vom Netzbetreiber erstatten lassen – allerdings nur für Strommengen, für die er eine EEG-Förderung in Anspruch genommen hat (§ 6 Abs. 5 EEG).** Für den Betreiber ist die Zahlung dann weitgehend kostenneutral; wirtschaftlich tragen sie die EEG-Mittel des Bundes.",
        },
        {
          typ: "tabelle",
          caption: "Erstattungsfähigkeit der § 6-Zahlung nach Strommenge",
          kopf: ["Strommenge", "Zahlung an die Gemeinde zulässig?", "Erstattung durch Netzbetreiber?"],
          zeilen: [
            ["Geförderte Direktvermarktung mit Marktprämie", "ja", "**ja**"],
            ["Sonstige Direktvermarktung (PPA, Merchant)", "ja", "nein"],
            ["Viertelstunden mit negativen Preisen ohne Förderung (§ 51 EEG)", "ja", "nein"],
            ["Zeiträume, in denen der Marktwert über dem anzulegenden Wert liegt und keine Prämie ausgezahlt wird", "ja", "nach Auslegung der FA Wind und Solar nein – im Vertrag regeln"],
            ["Bestandsanlagen mit EEG-Förderung", "ja, seit 2023", "ja, für geförderte Mengen"],
          ],
          hervorheben: 2,
          markierteZeile: 0,
          minBreite: 680,
          fussnote: "Zusammenstellung nach § 6 Abs. 5 EEG und der Analyse der FA Wind und Solar zur Umsetzung von § 6 EEG 2023. Einzelfragen sind umstritten; keine Rechtsberatung.",
        },
        {
          typ: "p",
          text: "Für die Gemeinde folgt daraus eine praktische Frage: Bietet der Betreiber die Zahlung für **alle** eingespeisten Mengen an oder nur für die erstattungsfähigen? Laut der Kommunalbefragung der FA Wind und Solar (zur Windenergie) werden Zahlungen häufig nur für die erstattungsfähigen Mengen angeboten. Bei Solarparks mit PPA oder vielen Stunden ohne Prämie macht das einen spürbaren Unterschied. Wie Marktprämie und PPA zusammenspielen, erklärt der Ratgeber [Direktvermarktung für Solarparks](/ratgeber/direktvermarktung-solarpark); zu den Zeiträumen ohne Förderung siehe [negative Strompreise](/ratgeber/negative-strompreise-solarspitzengesetz).",
        },
      ],
    },
    {
      id: "vertrag",
      titel: "Der Vertrag: Form, Zeitpunkt und Mustervertrag",
      tocLabel: "Vertrag & Muster",
      bloecke: [
        {
          typ: "p",
          text: "**Die Vereinbarung braucht die Schriftform oder elektronische Form und darf vor der Genehmigung der Anlage geschlossen werden – wird für die Fläche ein Bebauungsplan aufgestellt, aber erst nach dem Beschluss des Bebauungsplans.** So steht es in § 6 Abs. 4 Satz 1 Nr. 2 EEG. Nur Vereinbarungen nach diesem Paragrafen gelten ausdrücklich nicht als Vorteil im Sinne der Korruptionsdelikte (§§ 331 bis 334 StGB); für einen Vertrag, der vor dem Satzungsbeschluss geschlossen wird, greift diese Klarstellung nach dem Wortlaut nicht. Lassen Sie den Zeitpunkt deshalb rechtlich prüfen.",
        },
        {
          typ: "p",
          text: `Das ist wichtig, weil die Gemeinde zugleich über den [Bebauungsplan](/wissen/lexikon#bebauungsplan) entscheidet. Die Zahlung darf trotzdem nicht an ein bestimmtes Abstimmungsverhalten geknüpft sein. Bei Freiflächenanlagen darf die Vereinbarung zusätzlich Anforderungen an die naturverträgliche Gestaltung enthalten. Die FA Wind und Solar stellt ihren Mustervertrag nur für Windenergie bereit; für Freiflächen-PV verweist sie auf einen kostenlosen **Mustervertrag des Bundesverbands Neue Energiewirtschaft (bne)**. Wie das Planverfahren abläuft, zeigt der Ratgeber [Genehmigung und Bebauungsplan](/ratgeber/solarpark-genehmigung-bebauungsplan).`,
        },
        {
          typ: "checkliste",
          punkte: [
            "**Anlage genau bezeichnen:** Standort, Leistung, Nummer im [Marktstammdatenregister](/wissen/lexikon#marktstammdatenregister), Erweiterungen.",
            `**Höhe und Bemessung:** ${fmt(KOMMUNE.beteiligungCt, 1)} ct/kWh auf alle eingespeisten Mengen oder nur auf erstattungsfähige – ausdrücklich festlegen.`,
            "**Abrechnung und Nachweis:** Messwerte des Netzbetreibers, jährliche Abrechnung, Fälligkeit, Einsichtsrecht der Gemeinde.",
            "**Laufzeit:** in der Regel die gesamte Betriebszeit, nicht nur 20 Jahre Förderung.",
            "**Rechtsnachfolge:** Übergang der Pflicht bei Verkauf des Parks oder der Projektgesellschaft.",
            "**Mehrere Gemeinden:** Aufteilungsschlüssel und Zahlungsweg.",
            "**Verhältnis zu Landesgesetzen:** ob und wie § 6-Zahlungen auf eine landesrechtliche Pflicht angerechnet werden.",
          ],
        },
      ],
    },
    {
      id: "haushalt",
      titel: "Haushaltsrecht: Was darf die Gemeinde mit dem Geld machen?",
      tocLabel: "Haushaltsrecht",
      bloecke: [
        {
          typ: "p",
          text: "**Das Geld aus § 6 EEG ist eine allgemeine Einnahme der Gemeinde und nach Bundesrecht nicht zweckgebunden.** Laut den FAQ der FA Wind und Solar kann es grundsätzlich auch zur Schuldentilgung verwendet werden. Zweckbindungen können sich aber aus Landesrecht ergeben.",
        },
        {
          typ: "liste",
          punkte: [
            "**Gemeinderatsbeschluss:** Abschluss und Annahme erfolgen in der Regel durch Beschluss des Gemeinderats. Mitglieder, die selbst Flächen verpachten oder am Projekt beteiligt sind, können nach der jeweiligen Kommunalordnung befangen sein.",
            "**Haushaltsplanung:** Die Zahlungen schwanken mit Ertrag und Erstattungsfähigkeit. Planen Sie vorsichtig und nicht mit dem Maximalwert.",
            "**Transparenz:** Viele Gemeinden machen die Verwendung öffentlich, etwa für Vereine, Dorfgemeinschaftshaus oder Energieprojekte – das stärkt die Akzeptanz.",
            "**Finanzausgleich und Kreisumlage:** Wie solche Einnahmen im kommunalen Finanzausgleich des Landes behandelt werden, sollte die Kämmerei mit der Kommunalaufsicht klären.",
          ],
        },
        {
          typ: "kasten",
          variant: "info",
          titel: "Was die Kommunalbefragung zeigt",
          text: `In der repräsentativen Befragung der FA Wind und Solar (forsa, zur Windenergie) kannten ${fmtPct(FA_BEFRAGUNG.bekannt, 0)} der Bürgermeisterinnen und Bürgermeister die Regelung, aber ${fmtPct(FA_BEFRAGUNG.erstattungUnbekannt, 0)} wussten nichts von der Erstattungsfähigkeit. Mit der Umsetzung zufrieden waren nur ${fmtPct(FA_BEFRAGUNG.zufriedenUmsetzung, 0)} – vor allem wegen der Freiwilligkeit. Für Gemeinden heißt das: aktiv nachfragen, auch bei bestehenden Parks.`,
        },
      ],
    },
    {
      id: "laender",
      titel: "Landesgesetze: Wo die Beteiligung Pflicht ist",
      tocLabel: "Landesgesetze",
      bloecke: [
        {
          typ: "p",
          text: "**Weil der Bund § 6 EEG nach einem Rechtsgutachten des BMWK nicht verpflichtend machen kann, haben mehrere Länder eigene Beteiligungsgesetze erlassen – mit sehr unterschiedlicher Höhe und Systematik.** Laut Übersicht der FA Wind und Solar (Stand Juli 2026) gibt es für Freiflächen-PV Regelungen unter anderem in Bayern, Brandenburg, Mecklenburg-Vorpommern, Niedersachsen, im Saarland, in Sachsen und Sachsen-Anhalt; Hessen plant ein Gesetz.",
        },
        {
          typ: "tabelle",
          caption: `Beispiele für Landesregelungen bei Freiflächen-PV, Stand ${STAND}`,
          kopf: ["Land", "Gesetz", "Pflicht", "Verhältnis zu § 6 EEG"],
          zeilen: [
            ["Brandenburg", "BbgEESG vom 27.11.2025 (zuvor BbgPVAbgG)", `Sonderabgabe **${fmt(BB_EUR_PRO_MW)} € je MW und Jahr** an die Standortgemeinde, Anlagen über ${LAND_SCHWELLE_MW} MW mit Inbetriebnahme ab 2025; Mittel zweckgebunden für Akzeptanzmaßnahmen`, "eigenständige Abgabe; nach FA-Übersicht keine Anrechnung"],
            ["Mecklenburg-Vorpommern", "BüGembeteilG M-V vom 23.04.2026", `Angebot von **${fmt(MV_GEMEINDE_EUR_PRO_MW)} € je MW** für die Gemeinde und **${fmt(MV_EINWOHNER_EUR_PRO_MW)} € je MW** für Einwohner (Gutschrift oder Direktzahlung) ab ${LAND_SCHWELLE_MW} MW; ohne Einigung Ersatzzahlung ${fmt(MV_ERSATZ_EUR_PRO_MW)} € je MW`, "§ 6-Zahlungen können nach § 3 Abs. 8 angerechnet werden"],
            ["Niedersachsen", "NWindPVBetG (2024)", "ab 1 MW Akzeptanzabgabe **0,2 ct/kWh** (eingespeiste Menge) an die Gemeinde, zweckgebunden für Akzeptanzmaßnahmen; ab 5 MW zusätzlich ein Beteiligungsangebot für die Bevölkerung (angemessen z. B. 0,1 ct/kWh oder 20 % Beteiligung)", "Akzeptanzabgabe entfällt bei einer § 6-Vereinbarung über mindestens 0,2 ct/kWh"],
            ["Sachsen-Anhalt", "AuBG (Anlagen ab Inbetriebnahme 01.10.2025)", "Zahlung an die Standortgemeinde: **0,3 ct je eingespeister kWh**, mindestens aber 2,50 € je kWp – es gilt der höhere Betrag", "§ 6-Zahlungen als alternatives Modell anrechenbar, bis höchstens 0,3 ct/kWh"],
            ["Sachsen", "EEErtrBetG (geändert 10.09.2025)", "ab 1 MW, genehmigt nach dem 31.12.2024: **0,1 ct je eingespeister kWh** an die Standortgemeinde", "anderes Beteiligungsmodell schriftlich vereinbar, wenn wirtschaftlich angemessen"],
            ["Saarland", "SGBG (2024)", "Pflicht zur Beteiligung der Standortgemeinde; ohne Vereinbarung Ersatzzahlung 0,2 ct/kWh (laut FA Wind und Solar); Einnahmen zweckgebunden", "Ziel ist eine Beteiligungsvereinbarung"],
            ["Bayern", "BayWiVG (seit 01.01.2026)", "Anlagen über **5 MW**: Beteiligung der Gemeinden im Wert von mindestens 0,2 bis etwa 0,3 ct/kWh; bei Verstoß Ausgleichsabgabe 0,3 ct/kWh; ausgenommen u. a. Agri-PV, Anlagen ohne EEG-Förderung, Bürgerenergie", "die 0,2 ct können über § 6 EEG erbracht werden"],
            ["Übrige Länder", "keine Pflicht für Solar bekannt (Hessen plant ein Gesetz)", "freiwillige Zahlung nach § 6 EEG", "–"],
          ],
          hervorheben: 2,
          minBreite: 760,
          fussnote: "MV: gilt für Freiflächenanlagen, deren Aufstellungsbeschluss nach Inkrafttreten (29.04.2026) gefasst wird; Bürgerenergiegesellschaften und besondere Solaranlagen wie Agri-PV und Moor-PV sind ausgenommen. BB: Anlagen bis einschließlich 1 MW sind befreit. NI laut Klimaschutz- und Energieagentur Niedersachsen, ST laut Erläuterungen des MWU Sachsen-Anhalt, SN laut Gesetzestext (REVOSax, Stand 25.09.2025), BY laut StMWi Bayern, SL laut MWIDE und FA Wind und Solar (Länderinfo 12/2025; Höhe der Ersatzzahlung nicht am Gesetzestext geprüft). Maßgeblich sind die jeweiligen Gesetzestexte.",
        },
        {
          typ: "p",
          text: `Zur Größenordnung für ${MWP} MWp: In Brandenburg kämen zur freiwilligen § 6-Zahlung von rund ${fmtEur(P6_JAHR)} weitere ${fmtEur(BB_JAHR)} Sonderabgabe hinzu. In Mecklenburg-Vorpommern müssen insgesamt ${fmtEur(MV_JAHR)} im Jahr angeboten werden, auf die § 6-Zahlungen angerechnet werden können. Dass [besondere Solaranlagen](/wissen/lexikon#besondere-solaranlagen) wie Agri-PV und Anlagen von [Bürgerenergiegesellschaften](/wissen/lexikon#buergerenergiegesellschaft) in MV ausgenommen sind, verschiebt die Projektrechnung spürbar.`,
        },
      ],
    },
    {
      id: "gewerbesteuer",
      titel: "Gewerbesteuer: 90 % für die Standortgemeinde – aber oft spät",
      tocLabel: "Gewerbesteuer & Beispiel",
      bloecke: [
        {
          typ: "p",
          text: `**Bei Solaranlagen wird der Gewerbesteuermessbetrag zu ${fmtPct(KOMMUNE.gewerbesteuerStandort, 0)} nach dem Sachanlagevermögen und nur zu 10 % nach den Arbeitslöhnen zerlegt (§ 29 Abs. 1 Nr. 2 GewStG).** Damit steht der Großteil der Gewerbesteuer der Standortgemeinde zu, auch wenn die Betreibergesellschaft anderswo sitzt.`,
        },
        {
          typ: "p",
          text: `Wie viel tatsächlich fließt, hängt am Gewinn. Ein fremdfinanzierter Park schreibt in den ersten Jahren durch Abschreibung und Zinsen oft kaum Gewinne; Verlustvorträge verschieben die Steuer weiter nach hinten. Der Kommunal-Rechner bildet das vereinfacht ab. Das Beispiel: ${MWP} MWp in Süddeutschland, Erlös ${fmtCt(ERLOESE.eegFreiflaecheCt, 1)} aus der Ausschreibung, Hebesatz ${fmt(KOMMUNE.hebesatz * 100)} %.`,
        },
        {
          typ: "tabelle",
          caption: `Einnahmen der Standortgemeinde aus ${MWP} MWp Solarpark, Rechenkern des Kommunal-Rechners`,
          kopf: ["Einnahme", `Summe ${KOMMUNE.betrachtungJahre} Jahre`, `Summe ${R.L} Jahre`, "Hinweis"],
          zeilen: [
            [`§ 6 EEG (${fmt(KOMMUNE.beteiligungCt, 1)} ct/kWh)`, rund(R.gesamt.p6), rund(R.gesamtLaufzeit.p6), "sofort ab Inbetriebnahme, sinkt leicht mit der Degradation"],
            [`Gewerbesteuer (${fmtPct(KOMMUNE.gewerbesteuerStandort, 0)} Anteil)`, rund(R.gesamt.gewSt), rund(R.gesamtLaufzeit.gewSt), R.ersteGewSt ? `erstmals etwa im Jahr ${R.ersteGewSt}, danach rund ${rund(R.gewStNachAfa)} je Jahr` : "im Betrachtungszeitraum keine"],
            ["Gewerbesteuer bei Sitz in der Gemeinde (100 %)", rund(R_SITZ.gesamt.gewSt), rund(R_SITZ.gesamtLaufzeit.gewSt), "wenn die Betreibergesellschaft in der Gemeinde sitzt"],
            ["**Summe (90 %-Fall)**", `**${rund(R.gesamt.summe)}**`, `**${rund(R.gesamtLaufzeit.summe)}**`, "ohne Pacht auf Gemeindeflächen und ohne Landesabgaben"],
          ],
          hervorheben: 2,
          markierteZeile: 3,
          minBreite: 720,
          fussnote: "Vereinfachte Modellrechnung mit den Standardannahmen der Website (Kapitalkosten, Finanzierung, lineare AfA über 20 Jahre, Hinzurechnung von Zinsen, Verlustvortrag). Tatsächliche Steuer hängt von Finanzierung, Gesellschaftsstruktur und Erlösen ab. Keine Steuerberatung.",
        },
        {
          typ: "p",
          text: "Die Rechnung macht deutlich, warum § 6 für Gemeinden so wichtig ist: Er bringt ab dem ersten Betriebsjahr planbares Geld, während die Gewerbesteuer oft erst in der zweiten Hälfte der Laufzeit relevant wird. Liegen Flächen der Gemeinde im Park, kommt Pacht hinzu. Eine Übersicht aller Hebel finden Sie auf der Seite für [Kommunen](/kommunen).",
        },
      ],
    },
    {
      id: "vorgehen",
      titel: "So gehen Gemeinden vor",
      tocLabel: "Vorgehen",
      bloecke: [
        {
          typ: "ablauf",
          schritte: [
            ["Beteiligung früh ansprechen", "Schon beim [Aufstellungsbeschluss](/wissen/lexikon#aufstellungsbeschluss) offen klären, ob der Projektierer eine Vereinbarung nach § 6 EEG anbieten wird – und für welche Strommengen. Unterschrieben wird sie erst nach dem Beschluss des Bebauungsplans, und sie darf nie an das Abstimmungsverhalten geknüpft sein."],
            ["Landesrecht prüfen", "Gibt es eine Pflichtabgabe oder ein Beteiligungsgesetz? Welche Fristen gelten, und wird § 6 angerechnet?"],
            ["Vertrag prüfen lassen", "Mustervertrag als Grundlage nehmen, Laufzeit, Rechtsnachfolge und Abrechnung sichern; Befangenheiten im Gemeinderat klären."],
            ["Bürger mitdenken", "Neben der Gemeinde können Einwohner über Genossenschaft, Nachrangdarlehen oder Stromtarif profitieren – mehr im Ratgeber [Bürgerenergie und Akzeptanz](/ratgeber/buergerenergie-solarpark-akzeptanz) und unter [Genossenschaft](/genossenschaft)."],
            ["Bestandsparks nachverhandeln", "Auch bestehende Anlagen dürfen seit 2023 zahlen. Fragen Sie Betreiber auf Ihrem Gemeindegebiet aktiv an."],
          ],
        },
      ],
    },
  ],

  faq: [
    {
      q: "Ist die Zahlung nach § 6 EEG für Solarparks Pflicht?",
      a: "Nach Bundesrecht nein, sie ist freiwillig. Mehrere Länder – darunter Bayern (ab 5 MW), Brandenburg, Mecklenburg-Vorpommern, Niedersachsen, das Saarland, Sachsen und Sachsen-Anhalt – haben aber eigene Pflichten eingeführt. In der Praxis erwarten Gemeinden die Zahlung zunehmend als Teil eines fairen Projekts.",
    },
    {
      q: "Wie viel bekommt eine Gemeinde für einen Solarpark nach § 6 EEG?",
      a: `Bis zu ${fmt(KOMMUNE.beteiligungCt, 1)} ct je eingespeister Kilowattstunde. Für ${MWP} MWp in Süddeutschland sind das rund ${fmtEur(P6_JAHR)} pro Jahr. Eigene Werte berechnet der [Kommunal-Rechner](/rechner/kommune).`,
    },
    {
      q: "Wer zahlt die 0,2 Cent am Ende?",
      a: "Der Betreiber zahlt an die Gemeinde und kann sich den Betrag für EEG-geförderte Strommengen vom Netzbetreiber erstatten lassen. Für Strom, der per PPA ohne Förderung verkauft wird, trägt er die Zahlung selbst.",
    },
    {
      q: "Darf der Vertrag vor dem Satzungsbeschluss geschlossen werden?",
      a: "Nein, wenn für den Solarpark ein Bebauungsplan aufgestellt wird. § 6 Abs. 4 EEG erlaubt Vereinbarungen zwar vor der Genehmigung der Anlage, aber nicht vor dem Beschluss des Bebauungsplans. Die strafrechtliche Klarstellung, dass die Vereinbarung kein Vorteil ist, gilt nach dem Wortlaut nur für solche Vereinbarungen. Die Zahlung darf außerdem nie an eine bestimmte Entscheidung des Gemeinderats geknüpft werden.",
    },
    {
      q: "Bekommen auch Nachbargemeinden Geld?",
      a: "Bei Freiflächenanlagen ist nach § 6 EEG nur die Gemeinde betroffen, auf deren Gebiet die Anlage steht. Liegt ein Park auf mehreren Gemeindegebieten, wird aufgeteilt. Anders ist es bei Windenergie mit einem Umkreis von 2,5 km.",
    },
    {
      q: "Wie viel Gewerbesteuer zahlt ein Solarpark?",
      a: `Die Standortgemeinde erhält ${fmtPct(KOMMUNE.gewerbesteuerStandort, 0)} des Messbetrags. Wegen Abschreibung und Zinsen fällt in den ersten Jahren oft wenig an; im Beispiel mit ${MWP} MWp fließt nennenswerte Gewerbesteuer erst ab etwa dem Jahr ${R.ersteGewSt ?? "20"}.`,
    },
  ],

  passend: [
    { href: pfad("/kommunen"), titel: "Für Kommunen", text: "Wie Gemeinden von Solarparks profitieren." },
    { href: pfad("/rechner/kommune"), titel: "Kommunal-Rechner", text: "§ 6-Zahlung, Gewerbesteuer und Pacht berechnen." },
    { href: "/ratgeber/buergerenergie-solarpark-akzeptanz", titel: "Bürgerenergie und Akzeptanz", text: "Beteiligungsmodelle für Bürgerinnen und Bürger." },
    { href: "/ratgeber/solarpark-genehmigung-bebauungsplan", titel: "Genehmigung und Bebauungsplan", text: "Das Verfahren Schritt für Schritt." },
  ],

  quellen: [
    { titel: "EEG 2023, § 6 – Finanzielle Beteiligung der Kommunen am Ausbau", url: "https://www.gesetze-im-internet.de/eeg_2014/__6.html", stand: "09/2026" },
    { titel: "Gewerbesteuergesetz, § 29 – Zerlegungsmaßstab", url: "https://www.gesetze-im-internet.de/gewstg/__29.html", stand: "09/2026" },
    { titel: "FA Wind und Solar – Regelungen zur finanziellen Teilhabe bei PV-Freiflächenanlagen (Übersicht Bund und Länder)", url: "https://www.fachagentur-wind-solar.de/solar/finanzielle-teilhabe/regelungen-zur-finanziellen-teilhabe", stand: "09/2026" },
    { titel: "FA Wind und Solar – Analyse: § 6 EEG 2023 in der Umsetzung (repräsentative Kommunalbefragung)", url: "https://www.fachagentur-wind-solar.de/fileadmin/Veroeffentlichungen/Wind/Beteiligung/FA_Wind_Solar_Kommunalbefragung_Paragraph_6_eeg.pdf", stand: "09/2026" },
    { titel: "FA Wind und Solar – Mustervertrag finanzielle Teilhabe nach § 6 EEG 2023 (mit FAQ)", url: "https://www.fachagentur-wind-solar.de/veroeffentlichungen/mustervertraege/finanzielle-teilhabe-6-eeg-2023", stand: "09/2026" },
    { titel: "bne – Kostenloser Mustervertrag für Kommunen (§ 6 EEG, Freiflächen-PV)", url: "https://sonne-sammeln.de/kommunen/kostenloser-mustervertrag/", stand: "09/2026" },
    { titel: "Land Brandenburg – Gesetz zur Zahlung einer Sonderabgabe für Windenergie- und Photovoltaik-Freiflächenanlagen (BbgEESG)", url: "https://bravors.brandenburg.de/gesetze/bbgeesg", stand: "09/2026" },
    { titel: "Gesetz- und Verordnungsblatt M-V Nr. 12/2026 – Bürger- und Gemeindenbeteiligungsgesetz (BüGembeteilG M-V)", url: "https://www.regierung-mv.de/static/Regierungsportal/Justizministerium/Inhalte/Rechtliches/GVOBI.M-V/GVOBl.%20Nr.%2012%20v.%2028.4.2026.pdf", stand: "09/2026" },
  ],

  seitenCta: {
    titel: "Was bringt der Park Ihrer Gemeinde?",
    text: "§ 6-Zahlung, Gewerbesteuer und Pacht über die Laufzeit.",
    href: pfad("/rechner/kommune"),
    label: "Zum Kommunal-Rechner",
  },
  cta: {
    title: "Solarpark in Ihrer Gemeinde?",
    text: "Wir zeigen Gemeinden, wie Planung, Beteiligung und Einnahmen zusammenpassen – von der ersten Flächenprüfung bis zum Bebauungsplan.",
    primary: { label: "Für Kommunen", href: pfad("/kommunen") },
    secondary: { label: "Kommunal-Rechner", href: pfad("/rechner/kommune") },
  },
};

export default artikel;
