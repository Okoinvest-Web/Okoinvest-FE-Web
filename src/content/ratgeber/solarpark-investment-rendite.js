// Ratgeber: Solarpark als Investment – Rendite, Erlöse, Kosten, Risiken, Einstiegswege, Due Diligence
// Recherchestand 29.09.2026. Rechenbeispiele mit demselben Rechenkern wie /rechner/solarpark
// (src/lib/rechner/solarpark.js), alle Standardwerte aus src/lib/invest/markt.js.
// Marktwerte 2025: netztransparenz.de via DGS; Solarspitzengesetz (pv magazine 24.02.2025);
// Fraunhofer ISE Stromgestehungskosten (Juli 2024).

import { FREIFLAECHE, ERLOESE, FINANZIERUNG, PACHT, PHASEN, PROVISION, annuitaet, irr, npv, phaseById } from "@/lib/invest/markt";
import { rechneSolarpark, STANDARD } from "@/lib/rechner/solarpark";
import { fmt, fmtEur, fmtMio, fmtPct, fmtCt } from "@/lib/rechner/annahmen";
import { pfad } from "../../lib/land/index.js";

/* Werte, die (noch) nicht in markt.js stehen – Vorschlag für markt.js siehe Bericht */
// Jahresmarktwert Solar 2025 und Jahresmarktwert Strom (Spot) 2025, ct/kWh (netztransparenz.de, ausgewertet von DGS)
const MW_SOLAR_2025_CT = 4.508;
const MW_STROM_2025_CT = 8.932;
const CAPTURE_2025 = MW_SOLAR_2025_CT / MW_STROM_2025_CT;

/* ---------- Rechenbeispiele (10 MWp, Süddeutschland, Standardannahmen) ---------- */
const BASIS = rechneSolarpark();
const OHNE_BANK = rechneSolarpark({ dscrBegrenzen: false });
const OHNE_FK = rechneSolarpark({ fkQuote: 0 });
const GUT = rechneSolarpark({ capexKwp: FREIFLAECHE.capexProKwp.min, preisCt: ERLOESE.ppaCt.max });
const GUT_OHNE_FK = rechneSolarpark({ capexKwp: FREIFLAECHE.capexProKwp.min, preisCt: ERLOESE.ppaCt.max, fkQuote: 0 });
const PPA = rechneSolarpark({ modell: "ppa", preisCt: ERLOESE.ppaCt.mittel, vertragJahre: 10 });
const MERCHANT = rechneSolarpark({ modell: "merchant", vertragJahre: 0 });

const RTB = phaseById("rtb");
const RTB_MITTEL = (RTB.preisProKwp.min + RTB.preisProKwp.max) / 2;
const MIT_RTB_KAUF = rechneSolarpark({ entwicklungKwp: RTB_MITTEL });

// Fremdkapital-Wunsch (75 %) gegen Bankpraxis (DSCR)
const RATE_WUNSCH = annuitaet(BASIS.fkWunsch, FINANZIERUNG.zins, FINANZIERUNG.tilgungJahre);
const EBITDA_1 = BASIS.jahre[0].ebitda;
const DSCR_WUNSCH = EBITDA_1 / RATE_WUNSCH;

// Kontrolle mit irr()/npv() aus markt.js direkt auf den Cashflows des Basisfalls
const CF_PROJEKT = [-BASIS.investition.summe, ...BASIS.jahre.map((j) => j.cfProjekt)];
const IRR_KONTROLLE = irr(CF_PROJEKT);
const NPV_BASIS = npv(FINANZIERUNG.diskont, CF_PROJEKT);

const pct = (x) => (x == null ? "–" : fmtPct(x, 1));

const SENS = [
  { label: "Basisfall", r: BASIS },
  { label: "Strompreis −10 %", r: rechneSolarpark({ preisCt: STANDARD.preisCt * 0.9, merchantCt: STANDARD.merchantCt * 0.9 }) },
  { label: "Strompreis +10 %", r: rechneSolarpark({ preisCt: STANDARD.preisCt * 1.1, merchantCt: STANDARD.merchantCt * 1.1 }) },
  { label: "Capex −10 %", r: rechneSolarpark({ capexKwp: STANDARD.capexKwp * 0.9 }) },
  { label: "Capex +10 %", r: rechneSolarpark({ capexKwp: STANDARD.capexKwp * 1.1 }) },
  { label: "Zins −1 Prozentpunkt", r: rechneSolarpark({ zins: STANDARD.zins - 0.01 }) },
  { label: "Zins +1 Prozentpunkt", r: rechneSolarpark({ zins: STANDARD.zins + 0.01 }) },
  { label: `Günstig: ${fmt(FREIFLAECHE.capexProKwp.min)} €/kWp, ${fmtCt(ERLOESE.ppaCt.max)}`, r: GUT },
];

const phasenZeilen = PHASEN.map((p) => [
  p.label,
  `${fmt(p.preisProKwp.min)}–${fmt(p.preisProKwp.max)} €/kWp`,
  p.risiko,
  p.id === "cod" ? "sofort Erlöse" : p.monateBisRtb === 0 ? "Bau kann starten" : `ca. ${fmt(p.monateBisRtb)} Monate bis Baureife`,
]);

const artikel = {
  slug: "solarpark-investment-rendite",
  title: "Solarpark als Investment: Rendite, Risiken und Einstiegswege",
  seoTitle: "Solarpark Investment: Rendite & Risiken | ÖkoInvest",
  kurzTitel: "Solarpark als Investment",
  description:
    "Solarpark als Investment: Projekt- und Eigenkapital-IRR, Erlöse aus EEG, PPA und Markt, Rechenbeispiel 10 MWp, Sensitivitäten, Risiken und Due-Diligence-Check.",
  excerpt:
    "Solarparks gelten als solide Sachwertanlage – doch die Rendite hängt an wenigen Stellschrauben. Ein offen gerechnetes 10-MWp-Beispiel zeigt, wann der Hebel über Fremdkapital wirkt und wann er schadet.",
  hauptKeyword: "solarpark investment rendite",
  keywords: [
    "Solarpark Investment",
    "Solarpark Rendite",
    "In Solarpark investieren",
    "Photovoltaik Freifläche Rendite",
    "Solarpark kaufen",
    "Eigenkapitalrendite Solarpark",
    "Capture Rate Solar",
  ],
  veroeffentlicht: "2026-09-29",
  aktualisiert: "2026-09-29",
  kategorie: "Investieren & Projektbörse",
  bild: "/img/investoren-vor-ort.jpg",
  bildAlt: "Drei Personen mit weißen Schutzhelmen und Plänen gehen zwischen aufgeständerten Solarmodulen über eine Wiese",
  badge: { wert: pct(GUT.ekIrr), text: "Eigenkapital-IRR im günstigen Szenario, vor Steuern" },

  kurzFazit: [
    `**Solarparks rentieren sich nur bei guten Eckdaten.** Mit unseren Standardannahmen (10 MWp, ${fmt(STANDARD.capexKwp)} €/kWp, EEG-Zuschlag ${fmtCt(STANDARD.preisCt)}) liegt die Projektrendite bei rund **${pct(BASIS.projektIrr)}** vor Steuern – im günstigen Szenario (${fmt(FREIFLAECHE.capexProKwp.min)} €/kWp, ${fmtCt(ERLOESE.ppaCt.max)}) bei **${pct(GUT.projektIrr)}**.`,
    `**Fremdkapital hebelt nur, wenn die Projektrendite über dem Kreditzins liegt.** Im günstigen Szenario steigt die Eigenkapitalrendite mit ${fmtPct(FINANZIERUNG.fremdkapitalQuote, 0)} Fremdkapital auf **${pct(GUT.ekIrr)}**; im Basisfall senkt der Kredit sie.`,
    `Die größten Stellschrauben sind **Strompreis und Baukosten**: ±10 % beim Preis verschieben die Projektrendite im Beispiel um mehr als einen Prozentpunkt.`,
    `Solarstrom verliert am Markt an Wert: 2025 lag der Marktwert Solar bei ${fmtCt(MW_SOLAR_2025_CT, 2)} – nur rund **${fmtPct(CAPTURE_2025, 0)}** des durchschnittlichen Börsenstrompreises.`,
    "Einstieg ist über Bestandsparks, baureife Projekte, frühe Projektrechte oder Beteiligungen möglich – mit sehr unterschiedlichem Risiko. **Dieser Artikel ist keine Anlageberatung.**",
  ],

  abschnitte: [
    {
      id: "antwort",
      titel: "Wie viel Rendite bringt ein Solarpark?",
      tocLabel: "Kurze Antwort",
      bloecke: [
        {
          typ: "p",
          text: `**Ein Freiflächen-Solarpark in Deutschland erzielt je nach Baukosten, Erlösmodell und Finanzierung heute eine Projektrendite zwischen wenigen Prozent und rund 7 % vor Steuern; die Eigenkapitalrendite kann mit Fremdkapital deutlich darüber liegen – oder darunter.** Die Spanne ist groß, weil ein Solarpark eine einfache Kostenstruktur hat: Fast alles wird am Anfang bezahlt, danach fließen 30 Jahre lang Erlöse abzüglich überschaubarer Betriebskosten. Schon kleine Änderungen bei Preis oder Investition wirken sich deshalb stark aus.`,
        },
        {
          typ: "p",
          text: `Zwei Kennzahlen muss man auseinanderhalten: Die **Projekt-IRR** ([interner Zinsfuß](/wissen/lexikon#irr)) beschreibt die Rendite der gesamten Investition, unabhängig davon, wie sie finanziert ist. Die **Eigenkapital-IRR** zeigt, was beim Investor ankommt, nachdem die Bank Zinsen und Tilgung erhalten hat. Beide Werte liefert auch unser [Solarpark-Rechner](/rechner/solarpark), der mit denselben Annahmen arbeitet wie dieser Artikel. Wer bereits konkrete Projekte vergleicht, findet Angebote in der [Projektbörse](/projektboerse).`,
        },
        {
          typ: "kasten",
          variant: "wichtig",
          titel: "Keine Anlageberatung",
          text: "Dieser Ratgeber erklärt Zusammenhänge und rechnet mit Orientierungswerten. Er ist **keine Anlage-, Steuer- oder Rechtsberatung** und keine Empfehlung, in ein bestimmtes Projekt zu investieren. Beteiligungen an Solarparks sind unternehmerische Investitionen mit Verlustrisiko bis hin zum Totalverlust. Lassen Sie jede Investitionsentscheidung von unabhängigen Fachleuten prüfen.",
        },
      ],
    },
    {
      id: "erloese-kosten",
      titel: "Woher die Erlöse kommen – und was ein Solarpark kostet",
      tocLabel: "Erlöse & Kosten",
      bloecke: [
        {
          typ: "p",
          text: "**Ein Solarpark verdient Geld auf drei Wegen: über die EEG-Marktprämie, über einen Stromliefervertrag (PPA) oder direkt am Strommarkt (Merchant).** In der Praxis werden sie oft kombiniert, etwa ein PPA für die ersten zehn Jahre und danach Marktvermarktung.",
        },
        {
          typ: "karten",
          cols: 3,
          items: [
            { titel: "EEG-Zuschlag", text: `Wer in der [EEG-Ausschreibung](/ratgeber/eeg-ausschreibung-freiflaeche) einen Zuschlag erhält, bekommt 20 Jahre lang mindestens den [anzulegenden Wert](/wissen/lexikon#anzulegender-wert) – zuletzt rund ${fmtCt(ERLOESE.eegFreiflaecheCt)} im ersten Segment. Liegt der Marktwert darüber, bleibt der Marktwert.` },
            { titel: "PPA", text: `Ein [Power Purchase Agreement](/ratgeber/ppa-fuer-unternehmen) mit einem Unternehmen oder Versorger sichert einen festen Preis, aktuell etwa ${fmt(ERLOESE.ppaCt.min, 1)}–${fmtCt(ERLOESE.ppaCt.max)} für 10 Jahre. Das Risiko liegt dann bei der Bonität des Abnehmers.` },
            { titel: "Merchant", text: `Ohne Vertrag erlöst der Park den Marktwert Solar. Wir rechnen konservativ mit ${fmtCt(ERLOESE.merchantCt)}, leicht steigend. Merchant-Erlöse schwanken stark und sind kaum finanzierbar.` },
          ],
        },
        {
          typ: "h3",
          text: "Capture Rate und negative Preise",
        },
        {
          typ: "p",
          text: `Solarstrom wird vor allem mittags erzeugt – dann, wenn alle Solaranlagen gleichzeitig einspeisen. Der erzielte Preis liegt deshalb unter dem Durchschnittspreis. Diese Quote heißt [Capture Rate](/wissen/lexikon#capture-rate): 2025 lag der Jahresmarktwert Solar laut Übertragungsnetzbetreibern bei ${fmtCt(MW_SOLAR_2025_CT, 2)}, der durchschnittliche Spotpreis bei ${fmtCt(MW_STROM_2025_CT, 2)} – eine Capture Rate von rund ${fmtPct(CAPTURE_2025, 0)}. Hinzu kommen Stunden mit [negativen Strompreisen](/wissen/lexikon#negative-strompreise): Neue Anlagen erhalten seit dem Solarspitzengesetz (Februar 2025) in diesen Zeiten keine Marktprämie; die ausgefallenen Zeiträume werden nach aktuellem Stand an das Ende des Förderzeitraums angehängt. Ein Batteriespeicher am Park kann Strom in teurere Stunden verschieben – mehr dazu im Ratgeber [Großspeicher-Erlöse](/ratgeber/grossspeicher-erloese).`,
        },
        {
          typ: "tabelle",
          caption: "Kosten eines Freiflächen-Solarparks, Orientierungswerte Stand September 2026",
          kopf: ["Kostenblock", "Wert", "Bemerkung"],
          zeilen: [
            ["Errichtung (EPC, schlüsselfertig)", `${fmt(FREIFLAECHE.capexProKwp.min)}–${fmt(FREIFLAECHE.capexProKwp.max)} €/kWp`, `Mittelwert ${fmt(FREIFLAECHE.capexProKwp.mittel)} €/kWp, ohne Netzanschluss`],
            ["Netzanschluss", `${fmtEur(FREIFLAECHE.netzanschlussFixProMwp)} je MWp + ${fmt(FREIFLAECHE.kabelProMeter)} €/m Kabeltrasse`, "stark abhängig von Entfernung und Spannungsebene"],
            ["Entwicklung bis Baureife", `${fmt(FREIFLAECHE.entwicklungProKwp.min)}–${fmt(FREIFLAECHE.entwicklungProKwp.max)} €/kWp`, `beim Kauf baureifer Projekte stattdessen ${fmt(RTB.preisProKwp.min)}–${fmt(RTB.preisProKwp.max)} €/kWp Entwicklungsprämie`],
            ["Betrieb (Opex, ohne Pacht)", `${fmt(FREIFLAECHE.opexProKwp)} €/kWp und Jahr`, `Wartung, Versicherung, Direktvermarktung, Verwaltung; +${fmtPct(FREIFLAECHE.inflation, 0)} p. a.`],
            ["Pacht", `${fmtEur(PACHT.freiflaecheProHa.min)}–${fmtEur(PACHT.freiflaecheProHa.max)} je ha und Jahr`, `rund ${fmt(FREIFLAECHE.haProMwp, 1)} ha je MWp; Details im Ratgeber [Pacht pro Hektar](/ratgeber/solarpark-pacht-pro-hektar)`],
            ["Rückbau", `${fmt(FREIFLAECHE.rueckbauProKwp)} €/kWp`, "als Rücklage über die Laufzeit angespart"],
          ],
          minBreite: 720,
          fussnote: "Quelle: Marktannahmen der ÖkoInvest-Rechner (src/lib/invest/markt.js). Orientierungswerte ohne Umsatzsteuer, keine Angebote.",
        },
      ],
    },
    {
      id: "rechenbeispiel",
      titel: "Rechenbeispiel: 10-MWp-Solarpark in Süddeutschland",
      tocLabel: "Rechenbeispiel 10 MWp",
      bloecke: [
        {
          typ: "p",
          text: `**Im Basisfall kostet der Park ${fmtMio(BASIS.investition.summe)} (${fmt(BASIS.investProKwp)} €/kWp inklusive Netzanschluss und Entwicklung), erzeugt im ersten Jahr ${fmt(BASIS.ertragJahr1 / 1e6, 1)} GWh und erwirtschaftet nach Betriebskosten, Pacht und Rückbaurücklage rund ${fmtEur(Math.round(EBITDA_1 / 1000) * 1000)} Cashflow.** Mit einem EEG-Zuschlag von ${fmtCt(STANDARD.preisCt)} über 20 Jahre und danach Marktvermarktung ergibt sich über ${fmt(FREIFLAECHE.laufzeit)} Jahre eine Projekt-IRR von ${pct(IRR_KONTROLLE)} vor Steuern. Die Stromgestehungskosten ([LCOE](/wissen/lexikon#lcoe)) liegen bei ${fmtCt(BASIS.lcoeCt, 2)} – also über dem Zuschlagswert. Das ist ehrlich gerechnet der Grund, warum viele Projekte mit Durchschnittswerten heute knapp sind.`,
        },
        {
          typ: "h3",
          text: "Warum die Bank nicht 75 % finanziert",
        },
        {
          typ: "p",
          text: `Wünscht der Investor ${fmtPct(FINANZIERUNG.fremdkapitalQuote, 0)} Fremdkapital (${fmtMio(BASIS.fkWunsch)}), betrüge die Annuität bei ${fmtPct(FINANZIERUNG.zins, 1)} Zins und ${fmt(FINANZIERUNG.tilgungJahre)} Jahren Laufzeit rund ${fmtEur(Math.round(RATE_WUNSCH / 1000) * 1000)} pro Jahr. Der Cashflow deckt das nur zu ${fmt(DSCR_WUNSCH, 2)}-fach – Banken verlangen aber einen Schuldendienstdeckungsgrad ([DSCR](/wissen/lexikon#dscr)) von mindestens ${fmt(FINANZIERUNG.dscrZiel, 2)}. Die Bank kürzt das Darlehen deshalb auf ${fmtMio(BASIS.fk)}, das sind nur ${fmtPct(BASIS.fkQuoteEff, 0)} der Investition.`,
        },
        {
          typ: "tabelle",
          caption: "Rendite des 10-MWp-Beispiels nach Szenario, vor Steuern",
          kopf: ["Szenario", "Invest €/kWp", "FK-Quote", "Projekt-IRR", "EK-IRR"],
          zeilen: [
            ["Basis: EEG " + fmtCt(STANDARD.preisCt) + ", Bank begrenzt Kredit", fmt(BASIS.investProKwp), fmtPct(BASIS.fkQuoteEff, 0), pct(BASIS.projektIrr), pct(BASIS.ekIrr)],
            ["Basis ohne Fremdkapital", fmt(OHNE_FK.investProKwp), "0 %", pct(OHNE_FK.projektIrr), pct(OHNE_FK.ekIrr)],
            ["Basis mit 75 % Kredit (DSCR unter 1)", fmt(OHNE_BANK.investProKwp), fmtPct(OHNE_BANK.fkQuoteEff, 0), pct(OHNE_BANK.projektIrr), pct(OHNE_BANK.ekIrr)],
            ["Baureifes Projekt gekauft (RTB-Prämie " + fmt(RTB_MITTEL) + " €/kWp)", fmt(MIT_RTB_KAUF.investProKwp), fmtPct(MIT_RTB_KAUF.fkQuoteEff, 0), pct(MIT_RTB_KAUF.projektIrr), pct(MIT_RTB_KAUF.ekIrr)],
            ["PPA " + fmtCt(ERLOESE.ppaCt.mittel) + " für 10 Jahre", fmt(PPA.investProKwp), fmtPct(PPA.fkQuoteEff, 0), pct(PPA.projektIrr), pct(PPA.ekIrr)],
            ["Nur Merchant " + fmtCt(ERLOESE.merchantCt), fmt(MERCHANT.investProKwp), fmtPct(MERCHANT.fkQuoteEff, 0), pct(MERCHANT.projektIrr), pct(MERCHANT.ekIrr)],
            ["Günstig: " + fmt(FREIFLAECHE.capexProKwp.min) + " €/kWp, " + fmtCt(ERLOESE.ppaCt.max) + " über 20 Jahre", fmt(GUT.investProKwp), fmtPct(GUT.fkQuoteEff, 0), pct(GUT.projektIrr), pct(GUT.ekIrr)],
            ["Günstig ohne Fremdkapital", fmt(GUT_OHNE_FK.investProKwp), "0 %", pct(GUT_OHNE_FK.projektIrr), pct(GUT_OHNE_FK.ekIrr)],
          ],
          hervorheben: 4,
          markierteZeile: 6,
          minBreite: 760,
          fussnote: `Annahmen: 10 MWp Süd, fest, ${fmt(BASIS.spezErtrag)} kWh/kWp, Degradation ${fmtPct(FREIFLAECHE.degradation, 1)} p. a., Pacht ${fmtEur(PACHT.freiflaecheProHa.mittel)}/ha, Zins ${fmtPct(FINANZIERUNG.zins, 1)}, Tilgung ${fmt(FINANZIERUNG.tilgungJahre)} Jahre, Mindest-DSCR ${fmt(FINANZIERUNG.dscrZiel, 2)}, Laufzeit ${fmt(FREIFLAECHE.laufzeit)} Jahre, Renditen vor Steuern. Rechenkern identisch mit dem Solarpark-Rechner.`,
        },
        {
          typ: "p",
          text: `**Das Beispiel zeigt den Hebeleffekt in beide Richtungen.** Im günstigen Szenario liegt die Projektrendite von ${pct(GUT.projektIrr)} über dem Kreditzins von ${fmtPct(FINANZIERUNG.zins, 1)}: Jeder geliehene Euro verdient mehr, als er kostet, und die Eigenkapitalrendite steigt auf ${pct(GUT.ekIrr)}. Im Basisfall liegt die Projektrendite darunter – dann drückt der Kredit die Eigenkapitalrendite von ${pct(OHNE_FK.ekIrr)} auf ${pct(BASIS.ekIrr)}. Der Kapitalwert des Basisfalls bei ${fmtPct(FINANZIERUNG.diskont, 1)} Diskontsatz beträgt ${fmtMio(NPV_BASIS)}: Zu diesen Konditionen würde ein Investor mit dieser Renditeerwartung nicht bauen.`,
        },
        {
          typ: "tool",
          href: pfad("/rechner/solarpark"),
          titel: "Rechnen Sie Ihr eigenes Szenario",
          text: "Region, Baukosten, Erlösmodell, Pacht und Finanzierung anpassen – mit Cashflow je Jahr, DSCR und Sensitivitätsmatrix.",
          label: "Zum Solarpark-Rechner",
        },
      ],
    },
    {
      id: "sensitivitaeten",
      titel: "Sensitivitäten: Was die Rendite am stärksten bewegt",
      tocLabel: "Sensitivitäten",
      bloecke: [
        {
          typ: "p",
          text: "**Strompreis und Baukosten bewegen die Rendite am stärksten, der Zins wirkt vor allem auf das Eigenkapital.** Weil die Bank das Darlehen an der Deckung des Schuldendienstes ausrichtet, verändert jede Annahme auch die mögliche Fremdkapitalquote.",
        },
        {
          typ: "tabelle",
          caption: "Sensitivität des 10-MWp-Beispiels, vor Steuern",
          kopf: ["Veränderung", "Projekt-IRR", "EK-IRR", "FK-Quote (DSCR-begrenzt)"],
          zeilen: SENS.map((s) => [s.label, pct(s.r.projektIrr), pct(s.r.ekIrr), fmtPct(s.r.fkQuoteEff, 0)]),
          markierteZeile: 0,
          minBreite: 620,
          fussnote: "Strompreis: Zuschlagswert und späterer Marktwert gemeinsam verändert. Capex: Errichtungskosten je kWp. Zins: Darlehenszins bei sonst gleichen Annahmen.",
        },
      ],
    },
    {
      id: "risiken",
      titel: "Die wichtigsten Risiken eines Solarpark-Investments",
      tocLabel: "Risiken",
      bloecke: [
        {
          typ: "karten",
          cols: 2,
          items: [
            { titel: "Netz und Abregelung", text: "Fehlende Netzkapazität verzögert Projekte um Jahre. Im Betrieb kann der Netzbetreiber abregeln ([Redispatch](/wissen/lexikon#redispatch)); die Entschädigung ist geregelt, aber nicht immer vollständig." },
            { titel: "Kannibalisierung", text: "Je mehr Solarleistung im Netz ist, desto niedriger ist der Marktwert zur Mittagszeit. Das trifft vor allem Merchant-Erlöse nach dem Ende von EEG oder PPA." },
            { titel: "Zinsen", text: "Steigende Zinsen senken den Kredit, den die Bank gewährt, und erhöhen den Eigenkapitalbedarf. Zinssicherung vor Financial Close ist üblich." },
            { titel: "Regulierung", text: "Änderungen bei EEG, Netzentgelten für Einspeiser oder Steuern verändern die Rechnung. Bestandsschutz gilt meist, aber nicht für jede Detailregel." },
            { titel: "Technik und Ertrag", text: "Ertragsgutachten mit P50/P90-Werten, Moduldegradation, Wechselrichtertausch und Versicherungsschäden (Hagel, Diebstahl) gehören in jede Planung. Mehr zu [P50/P90](/wissen/lexikon#p50-p90)." },
            { titel: "Gegenparteien", text: "Die Qualität von EPC-Unternehmer, Betriebsführer, Direktvermarkter und PPA-Abnehmer entscheidet über das Risiko. Auch Insolvenzen in der Lieferkette sind ein reales Risiko." },
          ],
        },
        {
          typ: "kasten",
          variant: "info",
          titel: "Steuern nicht vergessen",
          text: `Alle Renditen in diesem Artikel sind vor Steuern. Für eine Projektgesellschaft in Deutschland rechnen die Rechner vereinfacht mit rund ${fmtPct(FINANZIERUNG.steuer, 0)} Körperschaft- und Gewerbesteuer; Abschreibungen mindern die Last in den ersten Jahren. In Österreich und der Schweiz gelten andere Sätze. Lassen Sie die steuerliche Struktur von einer Steuerberatung prüfen.`,
        },
      ],
    },
    {
      id: "einstieg",
      titel: "Einstiegswege: Bestandspark, baureifes Projekt oder Projektrechte",
      tocLabel: "Einstiegswege",
      bloecke: [
        {
          typ: "p",
          text: "**Je früher Sie einsteigen, desto günstiger ist der Preis je kWp – und desto höher das Risiko, dass das Projekt nie gebaut wird.** Bestandsparks ([COD](/wissen/lexikon#cod)) kosten am meisten, liefern aber sofort Erlöse und belastbare Ertragsdaten. Baureife Projekte ([RTB](/wissen/lexikon#rtb)) verbinden kalkulierbares Risiko mit Gestaltungsspielraum bei Bau und Vermarktung. Frühe [Projektrechte](/wissen/lexikon#projektrechte) sind günstig, können aber an Bebauungsplan oder Netzanschluss scheitern.",
        },
        {
          typ: "tabelle",
          caption: "Übliche Preise für Freiflächenprojekte nach Entwicklungsstand, DACH 2025/26",
          kopf: ["Phase", "Preis (Entwicklungsprämie)", "Risiko", "Zeit"],
          zeilen: phasenZeilen,
          markierteZeile: 4,
          minBreite: 680,
          fussnote: "Bei Bestandsparks ist der Preis der Gesamtkaufpreis je kWp, bei allen anderen Phasen die Prämie für die Projektrechte zusätzlich zu den Baukosten. Breite Spannen, stark abhängig von Netzanschluss, Größe, Tarif und Standort.",
        },
        {
          typ: "p",
          text: `Wer kleinere Beträge investieren möchte, kann sich über eine Bürgerenergie-[Genossenschaft](/genossenschaft) oder eine Beteiligungsgesellschaft beteiligen. Das Risiko ist dann gestreut, dafür haben Sie weniger Einfluss und oft eingeschränkte Handelbarkeit der Anteile. Wie Kaufverträge für Projekte aufgebaut sind, erklärt der Ratgeber [Projektrechte kaufen](/ratgeber/projektrechte-kaufen-due-diligence). In der ÖkoInvest-Projektbörse zahlen Investoren keine Provision; der Verkäufer trägt ${PROVISION.verkaeufer.text}.`,
        },
      ],
    },
    {
      id: "due-diligence",
      titel: "Due-Diligence-Kurzcheck vor dem Kauf",
      tocLabel: "Due Diligence",
      bloecke: [
        {
          typ: "checkliste",
          punkte: [
            "**Flächensicherung:** Pachtverträge mit ausreichender Laufzeit, eingetragene Dienstbarkeiten, Zufahrt und Kabeltrasse gesichert.",
            "**Baurecht:** Bebauungsplan rechtskräftig oder Privilegierung belegt, Baugenehmigung, Auflagen aus Umweltbericht und Ausgleichsflächen.",
            "**Netzanschluss:** verbindliche [Netzanschlusszusage](/wissen/lexikon#netzanschlusszusage) mit Kapazität, Kosten und Zeitplan für Übergabestation und Umspannwerk.",
            "**Ertrag:** unabhängiges Ertragsgutachten (P50/P90), Verschattung, Bodenbeschaffenheit für die Rammung.",
            "**Erlöse:** EEG-Zuschlag oder PPA-Vertrag mit Preis, Laufzeit, Mengenregeln und Bonität des Abnehmers.",
            "**Verträge und Kosten:** EPC-Festpreis, Gewährleistung, Betriebsführung, Versicherung, Rückbausicherheit.",
            "**Gesellschaft und Steuern:** bei Share Deals Altverbindlichkeiten, Grunderwerbsteuer und Steuerstatus prüfen lassen.",
          ],
        },
        {
          typ: "ablauf",
          schritte: [
            ["Suchprofil festlegen", "Phase, Größe, Region, Erlösmodell und Renditeziel definieren – etwa über die Seite [Investoren](/investoren)."],
            ["Projekt vorprüfen", "Teaser und Eckdaten mit dem [Projektbewertungs-Rechner](/rechner/projektbewertung) grob einordnen."],
            ["NDA und Datenraum", "Nach Vertraulichkeitsvereinbarung vollständige Unterlagen im [Datenraum](/wissen/lexikon#datenraum) sichten."],
            ["Due Diligence", "Technische, rechtliche, steuerliche und kaufmännische Prüfung durch Fachleute."],
            ["Finanzierung und Kauf", "Bankgespräche, Zinssicherung, Kaufvertrag mit Meilensteinzahlungen, Closing."],
          ],
        },
      ],
    },
  ],

  faq: [
    {
      q: "Wie hoch ist die Rendite eines Solarparks?",
      a: `Das hängt vor allem von Baukosten, Strompreis und Finanzierung ab. In unserem 10-MWp-Beispiel liegt die Projektrendite vor Steuern zwischen ${pct(BASIS.projektIrr)} (Durchschnittswerte) und ${pct(GUT.projektIrr)} (günstige Baukosten, ${fmtCt(ERLOESE.ppaCt.max)}). Die Eigenkapitalrendite kann mit Fremdkapital höher oder niedriger sein.`,
    },
    {
      q: "Was ist der Unterschied zwischen Projekt-IRR und Eigenkapital-IRR?",
      a: "Die Projekt-IRR bewertet die gesamte Investition unabhängig von der Finanzierung. Die Eigenkapital-IRR berücksichtigt Zinsen und Tilgung und zeigt, was beim Investor ankommt. Liegt die Projektrendite über dem Kreditzins, steigt die Eigenkapitalrendite durch Fremdkapital (Hebeleffekt), sonst sinkt sie.",
    },
    {
      q: "Wie viel Eigenkapital braucht man für einen Solarpark?",
      a: `Banken finanzieren nur so viel, wie der Cashflow mit Sicherheitsabstand bedienen kann – üblich ist ein DSCR von mindestens ${fmt(FINANZIERUNG.dscrZiel, 2)}. Je nach Projekt sind das 50 bis 80 % der Investition. Im Basisfall unseres Beispiels bleiben ${fmtMio(BASIS.ek)} Eigenkapital für ${fmt(STANDARD.mwp)} MWp.`,
    },
    {
      q: "Ist ein Solarpark eine sichere Geldanlage?",
      a: "Solarparks haben planbare Erträge und gesetzlich abgesicherte Mindestpreise, wenn sie einen EEG-Zuschlag haben. Sicher im Sinne einer garantierten Rendite sind sie nicht: Netz, Strompreise, Zinsen, Technik und Vertragspartner bergen Risiken bis zum Totalverlust. Dieser Artikel ist keine Anlageberatung.",
    },
    {
      q: "Lohnt sich der Kauf eines bestehenden Solarparks?",
      a: `Bestandsparks kosten derzeit etwa ${fmt(PHASEN.find((p) => p.id === "cod").preisProKwp.min)}–${fmt(PHASEN.find((p) => p.id === "cod").preisProKwp.max)} €/kWp. Dafür gibt es sofort Erlöse und echte Ertragsdaten. Wichtig sind Restlaufzeit von Förderung und Pacht, Zustand der Anlage und die Frage, wie viel Förderung noch übrig ist.`,
    },
    {
      q: "Kann ich mich mit kleineren Beträgen an einem Solarpark beteiligen?",
      a: "Ja, zum Beispiel über eine Energiegenossenschaft oder eine Beteiligungsgesellschaft. Achten Sie auf Prospekt- oder Informationsblattpflichten, Kosten, Laufzeit, Kündigungsmöglichkeiten und die Frage, ob es sich um Eigenkapital oder ein Nachrangdarlehen handelt. Mehr auf der Seite [Genossenschaft](/genossenschaft).",
    },
  ],

  passend: [
    { href: "/ratgeber/projektrechte-kaufen-due-diligence", titel: "Projektrechte kaufen", text: "Preise, Vertragsstruktur und Due Diligence." },
    { href: "/ratgeber/eeg-ausschreibung-freiflaeche", titel: "EEG-Ausschreibung Freifläche", text: "Wie Gebote, Zuschläge und Fristen funktionieren." },
    { href: "/ratgeber/ppa-fuer-unternehmen", titel: "PPA für Unternehmen", text: "Stromlieferverträge als Erlös- und Absicherungsweg." },
    { href: "/investoren", titel: "Für Investoren", text: "Suchprofil anlegen und passende Projekte finden." },
    { href: pfad("/bestandsanlagen"), titel: "Bestandsanlagen kaufen", text: "Laufende Solarparks auf dem Zweitmarkt." },
    { href: pfad("/rechner/solarpark"), titel: "Solarpark-Renditerechner", text: "IRR, LCOE und DSCR mit eigenen Werten." },
  ],

  quellen: [
    { titel: "Deutsche Gesellschaft für Sonnenenergie – Der Jahresmarktwert Solar 2025", url: "https://www.dgs.de/newsletter/der-jahresmarktwert-solar-2025/", stand: "09/2026" },
    { titel: "Bundesnetzagentur – Ausschreibungen Solaranlagen erstes Segment", url: "https://www.bundesnetzagentur.de/DE/Fachthemen/ElektrizitaetundGas/Ausschreibungen/Solaranlagen1/start.html", stand: "09/2026" },
    { titel: "pv magazine – Solarspitzen-Gesetz im Bundesgesetzblatt veröffentlicht (24.02.2025)", url: "https://www.pv-magazine.de/2025/02/24/solarspitzen-gesetz-im-bundesgesetzblatt-veroeffentlicht-neuregelung-gelten-ab-25-februar/", stand: "09/2026" },
    { titel: "Fraunhofer ISE – Stromgestehungskosten erneuerbare Energien (Juli 2024)", url: "https://www.ise.fraunhofer.de/de/veroeffentlichungen/studien/studie-stromgestehungskosten-erneuerbare-energien.html", stand: "09/2026" },
  ],

  seitenCta: { titel: "Eigenes Szenario rechnen", text: "Projekt- und EK-IRR, DSCR und Cashflow über 30 Jahre.", href: pfad("/rechner/solarpark"), label: "Zum Solarpark-Rechner" },
  cta: {
    title: "Passende Projekte finden – für Investoren kostenfrei.",
    text: "Legen Sie ein Suchprofil an: Phase, Größe, Region und Erlösmodell. Angebote aus der Projektbörse erhalten Sie nach NDA mit vollständigen Unterlagen.",
    primary: { label: "Zur Projektbörse", href: "/projektboerse" },
    secondary: { label: "Solarpark rechnen", href: pfad("/rechner/solarpark") },
  },
};

export default artikel;
