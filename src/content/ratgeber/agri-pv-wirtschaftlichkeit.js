// Ratgeber: Agri-PV Wirtschaftlichkeit – Kosten, Erträge, Erlöse, Rendite, Modelle für Landwirte
// Recherchestand 29.09.2026. Quellen: Fraunhofer ISE, Stromgestehungskosten
// erneuerbare Energien (Juli 2024; Agri-PV erstmals enthalten), Fraunhofer ISE
// Agri-PV-Leitfaden (4. Aufl. 2025), BNetzA Gebotstermin 1. Juli 2026, § 38b EEG a. F.
// (Übergangsbonus). Alle Rechenwerte aus @/lib/invest/markt; die Renditerechnung
// nutzt denselben Rechenkern wie der Solarpark- und der Agri-PV-Rechner.

import { AGRI, BAUART, FREIFLAECHE, ERLOESE, PACHT, FINANZIERUNG, REGIONEN, STAND, npv } from "@/lib/invest/markt";
import { rechneSolarpark } from "@/lib/rechner/solarpark";
import { agriVergleich } from "@/lib/rechner/agriPv";
import { fmt, fmtEur, fmtMio, fmtPct, fmtCt } from "@/lib/rechner/annahmen";
import { pfad } from "../../lib/land/index.js";

/* ------------------------------------------------------------------ */
/* Werte, die (noch) nicht in markt.js stehen – mit Quelle             */
/* ------------------------------------------------------------------ */

// Fraunhofer ISE, Stromgestehungskosten erneuerbare Energien, Juli 2024 (ct/kWh, 2024)
const ISE_LCOE = {
  agri: { min: 5.2, max: 11.9, suedMax: 8.7, nordMin: 7.1 },
  frei: { min: 4.1, max: 6.9 },
};
// Fraunhofer ISE 2024: spezifische Investition Agri-PV 0,5–2 MWp bzw. Freifläche ab 1 MWp, €/kWp
const ISE_CAPEX = { agri: { min: 900, max: 1700 }, frei: { min: 700, max: 900 } };
// BNetzA, Gebotstermin 1. Juli 2026: mengengewichteter Zuschlagswert erstes Segment
const ZUSCHLAG_HEUTE_CT = 4.79;
// § 38b Abs. 1 Satz 2 EEG 2023 a. F.: Aufschlag hoch aufgeständerte Agri-PV (≥ 2,10 m) 2026–2028
const BONUS_HOCH_CT = 0.5;

/* ------------------------------------------------------------------ */
/* Rechenbeispiel: 5 MWp, Süddeutschland, beide Bauarten               */
/* ------------------------------------------------------------------ */

const MWP = 5;
const REGION = REGIONEN.find((r) => r.id === "de-sued");
const basis = { mwp: MWP, regionId: REGION.id, modell: "eeg", vertragJahre: 20, opexKwp: AGRI.opexProKwp, pachtHa: PACHT.agriProHa.mittel };
const V = rechneSolarpark({ ...basis, bauart: "agriVertikal", capexKwp: AGRI.capexProKwp.vertikal.mittel, preisCt: ERLOESE.eegBesondereCt });
const H = rechneSolarpark({ ...basis, bauart: "agriHoch", capexKwp: AGRI.capexProKwp.hoch.mittel, preisCt: ERLOESE.eegBesondereCt });
const F = rechneSolarpark({ mwp: MWP, regionId: REGION.id, bauart: "sued", modell: "eeg", vertragJahre: 20, capexKwp: FREIFLAECHE.capexProKwp.mittel, preisCt: ZUSCHLAG_HEUTE_CT });
// Heutiges Zuschlagsniveau (Übergang, erstes Segment) – vertikal ohne, hoch mit Aufschlag
const V_HEUTE = rechneSolarpark({ ...basis, bauart: "agriVertikal", capexKwp: AGRI.capexProKwp.vertikal.mittel, preisCt: ZUSCHLAG_HEUTE_CT });
const H_HEUTE = rechneSolarpark({ ...basis, bauart: "agriHoch", capexKwp: AGRI.capexProKwp.hoch.mittel, preisCt: ZUSCHLAG_HEUTE_CT + BONUS_HOCH_CT });
// Günstige Kosten (untere Spanne) bei Planungsannahme
const V_GUENSTIG = rechneSolarpark({ ...basis, bauart: "agriVertikal", capexKwp: AGRI.capexProKwp.vertikal.min, preisCt: ERLOESE.eegBesondereCt });

const pct = (x, s = 1) => (x == null || !Number.isFinite(x) ? "negativ" : x < 0 ? `−${fmtPct(-x, s)}` : fmtPct(x, s));
const ct2 = (x) => fmtCt(x, 1);
const gwh = (kwh) => `${fmt(kwh / 1e6, 2)} GWh`;
const kw = (x) => (x >= 0 ? fmtMio(x, 2) : `−${fmtMio(-x, 2)}`);
const j0 = (r) => r.jahre[0];

/* ------------------------------------------------------------------ */
/* Drei Wege für Landwirte: 10 ha Acker, vertikales System             */
/* ------------------------------------------------------------------ */

const LW_HA = 10;
const LW = agriVergleich({ ha: LW_HA, system: "vertikal", kulturId: "acker", regionId: REGION.id });
const [W_PACHT, W_EIGEN, W_GEN] = LW.wege;
// Barwert der Pachtzahlungen über die Laufzeit (Diskont = EK-Renditeerwartung)
const PACHT_REIHE = [0, ...Array.from({ length: LW.laufzeit }, (_, t) => LW.pachtJahr0 * Math.pow(1 + PACHT.indexierung, t))];
const PACHT_BARWERT = npv(FINANZIERUNG.diskont, PACHT_REIHE);
const pct0 = (n) => fmtPct(n, 0);

const artikel = {
  slug: "agri-pv-wirtschaftlichkeit",
  title: "Agri-PV Wirtschaftlichkeit: Kosten, Erlöse und Rendite ehrlich",
  seoTitle: "Agri-PV Wirtschaftlichkeit & Rendite | ÖkoInvest",
  kurzTitel: "Agri-PV Wirtschaftlichkeit",
  description:
    "Agri-PV Wirtschaftlichkeit 2026: Kosten vertikal vs. hoch aufgeständert, Erträge, Erlöse, Rendite einer 5-MWp-Anlage und drei Modelle für Landwirte.",
  excerpt:
    "Agri-PV ist teurer als ein Solarpark und braucht mehr Fläche je Megawatt. Wann sie sich trotzdem rechnet – durchgerechnet für vertikale und hoch aufgeständerte Anlagen.",
  hauptKeyword: "agri-pv wirtschaftlichkeit",
  keywords: [
    "Agri-PV Wirtschaftlichkeit",
    "Agri-PV Kosten pro kWp",
    "Agri-PV Rendite",
    "Agri-PV Stromgestehungskosten",
    "vertikale Agri-PV Kosten",
    "Agri-PV Landwirt verpachten oder selbst investieren",
    "Agri-PV lohnt sich",
  ],
  veroeffentlicht: "2026-09-29",
  aktualisiert: "2026-09-29",
  kategorie: "Agri-PV & Landwirtschaft",
  bild: "/img/module-sonne.jpg",
  bildAlt: "Nahaufnahme von Solarmodulen mit einfallendem Sonnenlicht",
  badge: { wert: `${fmt(ISE_LCOE.agri.min, 1)}–${fmt(ISE_LCOE.agri.max, 1)} ct`, text: "Stromgestehungskosten Agri-PV je kWh (Fraunhofer ISE 2024)" },

  kurzFazit: [
    `**Agri-PV ist je kWp deutlich teurer als ein Solarpark:** Wir rechnen mit ${fmt(AGRI.capexProKwp.vertikal.min)}–${fmt(AGRI.capexProKwp.vertikal.max)} €/kWp für vertikale und ${fmt(AGRI.capexProKwp.hoch.min)}–${fmt(AGRI.capexProKwp.hoch.max)} €/kWp für hoch aufgeständerte Anlagen, gegenüber ${fmt(FREIFLAECHE.capexProKwp.min)}–${fmt(FREIFLAECHE.capexProKwp.max)} €/kWp auf der Freifläche.`,
    `Fraunhofer ISE beziffert die Stromgestehungskosten von Agri-PV auf **${fmt(ISE_LCOE.agri.min, 1)} bis ${fmt(ISE_LCOE.agri.max, 1)} ct/kWh**. In unserem 5-MWp-Beispiel liegen sie bei **${ct2(V.lcoeCt)}** (vertikal) und **${ct2(H.lcoeCt)}** (hoch aufgeständert).`,
    `Zum heutigen Zuschlagsniveau von rund ${ct2(ZUSCHLAG_HEUTE_CT)} trägt sich keine der beiden Bauarten. **Agri-PV braucht höhere Erlöse** – über das Agri-PV-Untersegment des EEG, Direktlieferung oder PPA mit Aufschlag – oder spürbar niedrigere Kosten.`,
    `**Für Landwirte ist Verpachten meist der risikoärmste Weg:** Die Fläche bleibt in Bewirtschaftung, ${pct0(AGRI.gapFoerderfaehig)} der Direktzahlungen bleiben erhalten, dazu kommt eine Pacht von ${fmtEur(PACHT.agriProHa.min)}–${fmtEur(PACHT.agriProHa.max)} je ha.`,
    "Synergien wie Hagel- und Sonnenschutz sind bei Obst und Beeren echt, bei Getreide überwiegt meist der Ertragsverlust.",
  ],

  abschnitte: [
    {
      id: "antwort",
      titel: "Lohnt sich Agri-PV?",
      tocLabel: "Kurze Antwort",
      bloecke: [
        {
          typ: "p",
          text: `**Agri-PV lohnt sich heute vor allem dann, wenn die Anlage der Landwirtschaft einen echten Zusatznutzen bringt oder der Strom zu einem höheren Preis als im EEG-Standardsegment abgesetzt werden kann.** Als reines Stromprojekt steht sie wirtschaftlich schlechter da als ein klassischer [Solarpark](/freiflaeche): Die Anlage kostet je Kilowattpeak mehr, braucht mehr Fläche je Megawatt und erzeugt je kWp etwas weniger Strom. Dafür bleibt die Fläche landwirtschaftlich nutzbar, die [GAP-Direktzahlungen](/wissen/lexikon#gap-direktzahlungen) bleiben weitgehend erhalten, und Agri-PV kann auch auf Flächen gebaut werden, die für klassische Solarparks nicht in Frage kommen.`,
        },
        {
          typ: "p",
          text: "Wie groß die Lücke ist, hängt von Bauart, Standort und Erlösweg ab. Die folgenden Abschnitte rechnen das mit denselben Annahmen durch, die auch unseren Rechnern zugrunde liegen – offen gelegt und mit Quellen. Es sind Orientierungswerte für eine erste Einschätzung, keine Angebote.",
        },
        {
          typ: "kennzahl",
          wert: ct2(V.lcoeCt),
          titel: "Stromgestehungskosten einer vertikalen 5-MWp-Agri-PV-Anlage in Süddeutschland",
          text: `Hoch aufgeständert: ${ct2(H.lcoeCt)}. Zum Vergleich ein klassischer Solarpark gleicher Größe: ${ct2(F.lcoeCt)}. Eigene Rechnung mit den Werten aus unseren Rechnern, Stand ${STAND}.`,
        },
      ],
    },
    {
      id: "kosten",
      titel: "Was kostet Agri-PV? Vertikal und hoch aufgeständert im Vergleich",
      tocLabel: "Kosten",
      bloecke: [
        {
          typ: "p",
          text: `**Eine vertikale Agri-PV-Anlage kostet nach unseren Planungswerten rund ${fmt(AGRI.capexProKwp.vertikal.mittel)} €/kWp, eine hoch aufgeständerte rund ${fmt(AGRI.capexProKwp.hoch.mittel)} €/kWp – jeweils ohne Netzanschluss und Projektentwicklung.** Der Aufpreis gegenüber der Freifläche kommt vor allem aus dem Stahlbau: Hohe Systeme brauchen Stützen von mehr als 2,10 m, größere Spannweiten und stärkere Fundamente. Vertikale Systeme benötigen mehr Pfosten und Kabel je kWp, weil die Reihen weit auseinander stehen.`,
        },
        {
          typ: "tabelle",
          caption: "Kosten- und Flächenkennzahlen im Vergleich (Planungswerte DACH, Stand September 2026)",
          kopf: ["Kennzahl", "Freifläche (Süd, fest)", "Agri-PV vertikal", "Agri-PV hoch aufgeständert"],
          zeilen: [
            ["Errichtung (EPC), €/kWp", `${fmt(FREIFLAECHE.capexProKwp.min)}–${fmt(FREIFLAECHE.capexProKwp.max)}`, `${fmt(AGRI.capexProKwp.vertikal.min)}–${fmt(AGRI.capexProKwp.vertikal.max)}`, `${fmt(AGRI.capexProKwp.hoch.min)}–${fmt(AGRI.capexProKwp.hoch.max)}`],
            ["Flächenbedarf je MWp", `${fmt(BAUART.sued.haProMwp, 1)} ha`, `${fmt(BAUART.agriVertikal.haProMwp, 1)} ha`, `${fmt(BAUART.agriHoch.haProMwp, 1)} ha`],
            ["Ertrag gegenüber Süd, fest", "100 %", pct0(BAUART.agriVertikal.faktor), pct0(BAUART.agriHoch.faktor)],
            ["Betriebskosten ohne Pacht, €/kWp und Jahr", fmt(FREIFLAECHE.opexProKwp), fmt(AGRI.opexProKwp), fmt(AGRI.opexProKwp)],
            ["Übliche Pacht, €/ha und Jahr", `${fmt(PACHT.freiflaecheProHa.min)}–${fmt(PACHT.freiflaecheProHa.max)}`, `${fmt(PACHT.agriProHa.min)}–${fmt(PACHT.agriProHa.max)}`, `${fmt(PACHT.agriProHa.min)}–${fmt(PACHT.agriProHa.max)}`],
            ["Landwirtschaft auf der Fläche", "meist nur Pflege/Beweidung", "Acker, Grünland zwischen den Reihen", "Sonderkulturen, Acker unter den Modulen"],
          ],
          hervorheben: 2,
          minBreite: 700,
          fussnote: `Planungswerte aus unseren Rechnern. Fraunhofer ISE nennt für Agri-PV-Anlagen von 0,5–2 MWp ${fmt(ISE_CAPEX.agri.min)}–${fmt(ISE_CAPEX.agri.max)} €/kWp und für Freiflächenanlagen ab 1 MWp ${fmt(ISE_CAPEX.frei.min)}–${fmt(ISE_CAPEX.frei.max)} €/kWp (2024, inkl. Installation); größere Anlagen liegen darunter.`,
        },
        {
          typ: "p",
          text: `Hinzu kommen – wie bei jedem Solarpark – Kosten für Netzanschluss und Projektentwicklung. Für Übergabestation und Trafo rechnen wir mit rund ${fmtEur(FREIFLAECHE.netzanschlussFixProMwp)} je MWp, für die Mittelspannungstrasse mit ${fmtEur(FREIFLAECHE.kabelProMeter)} je Meter. Die Entwicklung bis zur Baureife – Gutachten, Bebauungsplan, Nutzungskonzept nach [DIN SPEC 91434](/ratgeber/agri-pv-din-spec-91434) – kostet typischerweise ${fmt(FREIFLAECHE.entwicklungProKwp.min)}–${fmt(FREIFLAECHE.entwicklungProKwp.max)} €/kWp. Die Betriebskosten liegen bei Agri-PV etwas höher, weil Arbeit unter und zwischen den Modulen mehr Abstimmung, Reinigung und Schutz vor Maschinenschäden erfordert.`,
        },
      ],
    },
    {
      id: "ertraege",
      titel: "Erträge: bifazial, Ost-West und hoch über der Kultur",
      tocLabel: "Erträge",
      bloecke: [
        {
          typ: "p",
          text: `**Vertikale Agri-PV erzeugt nach unseren Planungswerten rund ${pct0(BAUART.agriVertikal.faktor)} des Ertrags einer fest nach Süden ausgerichteten Anlage, hoch aufgeständerte Systeme rund ${pct0(BAUART.agriHoch.faktor)}.** In Süddeutschland mit ${fmt(REGION.ertrag)} kWh je kWp als Referenz sind das etwa ${fmt(V.spezErtrag)} bzw. ${fmt(H.spezErtrag)} kWh je kWp und Jahr ([spezifischer Ertrag](/wissen/lexikon#spezifischer-ertrag)).`,
        },
        {
          typ: "p",
          text: `Vertikale Anlagen arbeiten fast immer mit [bifazialen Modulen](/wissen/lexikon#bifazial), die in Ost-West-Richtung aufgestellt beidseitig Licht aufnehmen. Ihr Tagesprofil hat zwei Spitzen am Vormittag und am Nachmittag statt einer Mittagsspitze. Das ist ein echter Vorteil: Mittags drückt der Solarstrom die Börsenpreise, teilweise bis in den negativen Bereich. Strom in den Randstunden erzielt einen höheren Marktwert – die [Capture Rate](/wissen/lexikon#capture-rate) liegt tendenziell über der einer Südanlage. Im EEG-Marktprämienmodell spielt das kaum eine Rolle, bei PPA und in der Vermarktung nach Förderende dagegen schon.`,
        },
        {
          typ: "p",
          text: "Hoch aufgeständerte Anlagen stehen meist in Süd- oder Ost-West-Ausrichtung über der Kultur, teils mit größeren Abständen zwischen den Modulen, damit genug Licht auf die Pflanzen fällt. Das senkt den Ertrag je kWp leicht, erhöht aber je nach Design die Leistung je Hektar gegenüber vertikalen Systemen deutlich.",
        },
      ],
    },
    {
      id: "erloese",
      titel: "Erlöse: EEG, PPA und Direktlieferung",
      tocLabel: "Erlöse",
      bloecke: [
        {
          typ: "p",
          text: `**Die Erlösseite ist bei Agri-PV derzeit der Knackpunkt.** Das EEG kennt ein eigenes Untersegment für [besondere Solaranlagen](/wissen/lexikon#besondere-solaranlagen) mit höherem Höchstwert, doch dafür fehlt nach aktuellem Stand die EU-Beihilfegenehmigung. Bis dahin konkurrieren Agri-PV-Anlagen im ersten Segment mit klassischen Solarparks. Dort lag der mengengewichtete Zuschlagswert im Juli 2026 bei ${ct2(ZUSCHLAG_HEUTE_CT)}; hoch aufgeständerte Anlagen erhalten übergangsweise ${fmtCt(BONUS_HOCH_CT)} Aufschlag. Details im Ratgeber [Agri-PV Förderung & GAP](/ratgeber/agri-pv-foerderung-gap).`,
        },
        {
          typ: "liste",
          punkte: [
            `**EEG-Planungsannahme:** Unsere Rechner setzen für besondere Solaranlagen ${ct2(ERLOESE.eegBesondereCt)} an – ein Wert, der ein funktionierendes Agri-PV-Segment voraussetzt. Solange es nicht genehmigt ist, sollten Sie zusätzlich mit dem heutigen Zuschlagsniveau rechnen.`,
            `**PPA:** Solar-PPA mit zehn Jahren Laufzeit liegen in Deutschland grob bei ${fmt(ERLOESE.ppaCt.min, 1)}–${fmt(ERLOESE.ppaCt.max, 1)} ct/kWh. Abnehmer, die Wert auf regionale Herkunft und Doppelnutzung legen, zahlen teils Aufschläge – das ist Verhandlungssache. Mehr unter [PPA für Unternehmen](/ratgeber/ppa-fuer-unternehmen).`,
            "**Direktlieferung und Eigenverbrauch:** Wird Strom auf dem Hof oder an einen benachbarten Betrieb geliefert, ersetzt er Netzstrom zu deutlich höheren Preisen. Das ist der stärkste Hebel, betrifft aber meist nur einen kleinen Teil der Erzeugung.",
            `**Nach Förderende:** Für die Jahre nach dem EEG-Zeitraum rechnen wir konservativ mit einem Marktwert von ${ct2(ERLOESE.merchantCt)}.`,
          ],
        },
      ],
    },
    {
      id: "rechenbeispiel",
      titel: "Rechenbeispiel: 5 MWp vertikal und hoch aufgeständert",
      tocLabel: "Rechenbeispiel 5 MWp",
      bloecke: [
        {
          typ: "p",
          text: `**Mit mittleren Kosten und einem Erlös von ${ct2(ERLOESE.eegBesondereCt)} über 20 Jahre erreicht eine vertikale 5-MWp-Anlage in Süddeutschland eine Projektrendite von ${pct(V.projektIrr)}, eine hoch aufgeständerte bleibt ${H.projektIrr != null && H.projektIrr > 0 ? `bei ${pct(H.projektIrr)}` : "im negativen Bereich"}.** Beide liegen damit unter den Kapitalkosten von ${pct(V.wacc)}, die wir ansetzen. Zum Vergleich: Selbst ein klassischer Solarpark dieser Größe erreicht beim heutigen Zuschlagsniveau nur ${pct(F.projektIrr)} – Anlagen um 5 MWp sind generell knapp kalkuliert, weil Netzanschluss und Entwicklung stärker ins Gewicht fallen. Agri-PV liegt aber noch einmal deutlich darunter.`,
        },
        {
          typ: "tabelle",
          caption: `Beispielrechnung ${fmt(MWP)} MWp in Süddeutschland (${fmt(REGION.ertrag)} kWh/kWp Referenz), Laufzeit ${FREIFLAECHE.laufzeit} Jahre`,
          kopf: ["", "Agri-PV vertikal", "Agri-PV hoch", "Solarpark (Vergleich)"],
          zeilen: [
            ["Fläche", `${fmt(V.flaecheHa, 1)} ha`, `${fmt(H.flaecheHa, 1)} ha`, `${fmt(F.flaecheHa, 1)} ha`],
            ["Investition inkl. Netz und Entwicklung", fmtMio(V.investition.summe, 2), fmtMio(H.investition.summe, 2), fmtMio(F.investition.summe, 2)],
            ["Stromertrag im 1. Jahr", gwh(V.ertragJahr1), gwh(H.ertragJahr1), gwh(F.ertragJahr1)],
            ["Stromgestehungskosten (LCOE)", ct2(V.lcoeCt), ct2(H.lcoeCt), ct2(F.lcoeCt)],
            ["Angesetzter Erlös (20 Jahre)", ct2(ERLOESE.eegBesondereCt), ct2(ERLOESE.eegBesondereCt), ct2(ZUSCHLAG_HEUTE_CT)],
            ["Erlös im 1. Jahr", fmtEur(j0(V).erloes), fmtEur(j0(H).erloes), fmtEur(j0(F).erloes)],
            ["Betrieb, Pacht, Rückbau im 1. Jahr", fmtEur(j0(V).kosten), fmtEur(j0(H).kosten), fmtEur(j0(F).kosten)],
            ["Projekt-IRR vor Steuern", pct(V.projektIrr), pct(H.projektIrr), pct(F.projektIrr)],
            [`Kapitalwert bei ${pct(V.wacc)}`, kw(V.kapitalwert), kw(H.kapitalwert), kw(F.kapitalwert)],
            [`Projekt-IRR zum heutigen Zuschlagsniveau`, `${pct(V_HEUTE.projektIrr)} (${ct2(ZUSCHLAG_HEUTE_CT)})`, `${pct(H_HEUTE.projektIrr)} (${ct2(ZUSCHLAG_HEUTE_CT + BONUS_HOCH_CT)})`, pct(F.projektIrr)],
          ],
          hervorheben: 1,
          minBreite: 720,
          fussnote: `Eigene Rechnung mit dem Rechenkern unseres [Solarpark-Rechners](/rechner/solarpark): Errichtung ${fmt(AGRI.capexProKwp.vertikal.mittel)} bzw. ${fmt(AGRI.capexProKwp.hoch.mittel)} €/kWp (Solarpark ${fmt(FREIFLAECHE.capexProKwp.mittel)}), Netzanschluss 1 km, Entwicklung ${fmt(FREIFLAECHE.entwicklungProKwp.min)} €/kWp, Betriebskosten ${fmt(AGRI.opexProKwp)} €/kWp (Solarpark ${fmt(FREIFLAECHE.opexProKwp)}), Pacht ${fmt(PACHT.agriProHa.mittel)} €/ha (Solarpark ${fmt(PACHT.freiflaecheProHa.mittel)}), Degradation ${fmtPct(FREIFLAECHE.degradation, 1)} p. a., nach 20 Jahren Marktwert ${ct2(ERLOESE.merchantCt)}. Kapitalkosten (WACC) aus ${pct0(FINANZIERUNG.fremdkapitalQuote)} Fremdkapital zu ${fmtPct(FINANZIERUNG.zins, 1)} und Eigenkapital-Erwartung ${fmtPct(FINANZIERUNG.diskont, 1)}. Vor Steuern, ohne Förderzuschüsse.`,
        },
        {
          typ: "p",
          text: `Was die Tabelle zeigt: Die Stromgestehungskosten sind der Mindestpreis, den die Anlage über ihre gesamte Laufzeit im Schnitt erlösen muss, damit sich das eingesetzte Kapital zu den angesetzten Kosten verzinst. Für die vertikale Anlage sind das ${ct2(V.lcoeCt)}, für die hoch aufgeständerte ${ct2(H.lcoeCt)}. Beide Werte liegen im Band, das Fraunhofer ISE für Agri-PV ermittelt hat (${fmt(ISE_LCOE.agri.min, 1)}–${fmt(ISE_LCOE.agri.max, 1)} ct/kWh, in Süddeutschland bis ${fmt(ISE_LCOE.agri.suedMax, 1)} ct/kWh) – und deutlich über dem Band klassischer Freiflächenanlagen (${fmt(ISE_LCOE.frei.min, 1)}–${fmt(ISE_LCOE.frei.max, 1)} ct/kWh).`,
        },
        {
          typ: "p",
          text: `Die Stellschrauben sind klar: Mit Kosten am unteren Ende der Spanne (${fmt(AGRI.capexProKwp.vertikal.min)} €/kWp) sinken die Stromgestehungskosten der vertikalen Anlage auf ${ct2(V_GUENSTIG.lcoeCt)}, die Projektrendite steigt auf ${pct(V_GUENSTIG.projektIrr)}. Größere Anlagen senken die Fixkosten je kWp weiter. In Norddeutschland mit geringerer Einstrahlung wird es entsprechend schwieriger. Ihren eigenen Fall rechnen Sie im [Solarpark-Rechner](/rechner/solarpark) mit der Bauart „Agri-PV“ oder im [Agri-PV-Rechner](/rechner/agri-pv) aus Sicht des Landwirts durch.`,
        },
        {
          typ: "kasten",
          variant: "wichtig",
          titel: "Ehrliche Einordnung",
          text: "Ein Agri-PV-Projekt, das sich allein über eine EEG-Vergütung auf Freiflächenniveau refinanzieren soll, ist nach heutigem Stand kaum darstellbar. Tragfähige Projekte kombinieren meist mehrere Punkte: günstige Netzanbindung, ausreichende Größe, einen höheren Erlös (Agri-PV-Segment, PPA oder Direktlieferung) und einen landwirtschaftlichen Nutzen, der die Mehrkosten teilweise aufwiegt. Seien Sie skeptisch bei Angeboten, die zweistellige Renditen versprechen.",
        },
      ],
    },
    {
      id: "modelle",
      titel: "Drei Modelle für Landwirte: verpachten, investieren, beteiligen",
      tocLabel: "Modelle für Landwirte",
      bloecke: [
        {
          typ: "p",
          text: `**Für Landwirte gibt es drei Wege: die Fläche an einen Investor verpachten und weiter bewirtschaften, selbst investieren oder sich über eine [Genossenschaft](/genossenschaft) an einer Anlage beteiligen, die ein Investor baut und betreibt.** In allen drei Fällen bleibt die Landwirtschaft auf der Fläche, und ${pct0(AGRI.gapFoerderfaehig)} der Fläche bleiben für die Direktzahlungen förderfähig. Der Unterschied liegt in Kapitaleinsatz, Risiko und Aufwand.`,
        },
        {
          typ: "tabelle",
          caption: `Drei Wege im Vergleich: ${fmt(LW_HA)} ha Acker, vertikales System (${fmt(LW.anlage.kwp / 1000, 1)} MWp), Süddeutschland`,
          kopf: ["", "Verpachten", "Selbst investieren", `Beteiligung (${pct0(W_GEN.anteil)} Anteil)`],
          zeilen: [
            ["Eigenes Kapital", "keines", fmtMio(W_EIGEN.invest, 2), fmtMio(W_GEN.invest, 2)],
            ["Energie-Einnahmen im 1. Jahr", fmtEur(W_PACHT.energieJahr), fmtEur(W_EIGEN.energieJahr), fmtEur(W_GEN.energieJahr)],
            [`Überschuss über ${LW.laufzeit} Jahre (nach Kapitalrückfluss)`, fmtEur(W_PACHT.energieSumme), fmtEur(W_EIGEN.energieSumme), fmtEur(W_GEN.energieSumme)],
            ["Rendite auf eingesetztes Kapital", "–", pct(W_EIGEN.irr), pct(W_GEN.irr)],
            ["Risiko", "gering (Bonität des Pächters)", "hoch (Bau, Betrieb, Erlöse)", "mittel (anteilig)"],
            ["Aufwand", "gering", "hoch", "gering bis mittel"],
          ],
          hervorheben: 1,
          minBreite: 700,
          fussnote: `Werte aus unserem Agri-PV-Rechner, Erlös ${ct2(LW.ctFoerder)} (Planungsannahme), Pacht ${fmt(PACHT.agriProHa.mittel)} €/ha mit ${fmtPct(PACHT.indexierung, 1)} Indexierung, vor Steuern, ohne Fremdfinanzierung. Deckungsbeitrag und Direktzahlungen (${fmtEur(LW.landwirtschaft.gapJahr)} im Jahr auf der Fläche) laufen in allen drei Wegen weiter und sind hier nicht enthalten. Bei der Beteiligung zahlt die Anlage die Pacht an den Landwirt.`,
        },
        {
          typ: "p",
          text: `Das Ergebnis spiegelt die knappe Wirtschaftlichkeit des Stromprojekts wider: Wer selbst investiert, trägt das volle Risiko und erreicht mit unseren Annahmen nur ${pct(W_EIGEN.irr)} Rendite. Die Pacht dagegen fließt unabhängig vom Strompreis. Über ${LW.laufzeit} Jahre summieren sich ${fmtEur(W_PACHT.energieSumme)}, ihr Barwert beträgt bei ${fmtPct(FINANZIERUNG.diskont, 1)} Diskontsatz rund ${fmtEur(PACHT_BARWERT)}. Die Beteiligung verbindet eine feste Pacht mit einer Chance auf zusätzliche Erträge, wenn die Anlage besser läuft als geplant – etwa durch höhere Erlöse nach Einführung des Agri-PV-Segments.`,
        },
        {
          typ: "p",
          text: "Welcher Weg passt, hängt von Liquidität, Hofnachfolge und Risikoneigung ab. Bei der Eigeninvestition kommen Fragen zu Steuern (Gewerbebetrieb neben der Landwirtschaft) und zur Erbschaftsteuer hinzu, die Sie mit Ihrem Steuerberater klären sollten – Hinweise dazu im Ratgeber [PV-Pacht, Erbschaft- und Grundsteuer](/ratgeber/pv-pacht-erbschaftsteuer-grundsteuer). Einen Überblick über alle Wege finden Sie auf der Seite [für Landwirte](/landwirte).",
        },
      ],
    },
    {
      id: "synergien",
      titel: "Synergien: Wo die Landwirtschaft profitiert – und wo nicht",
      tocLabel: "Synergien & Grenzen",
      bloecke: [
        {
          typ: "p",
          text: "**Agri-PV kann der Landwirtschaft nutzen, aber nicht jeder Kultur.** Die Forschung – unter anderem aus den Versuchsanlagen des Fraunhofer ISE – zeigt ein gemischtes Bild. Wer die Wirtschaftlichkeit ehrlich rechnen will, sollte die Synergien nur dort ansetzen, wo sie für die eigene Kultur belegt sind.",
        },
        {
          typ: "karten",
          cols: 2,
          items: [
            { titel: "Hagel- und Starkregenschutz", text: "Bei Obst, Beeren und Wein können Module Hagelnetze oder Folientunnel ersetzen. Die eingesparte Investition verbessert die Gesamtrechnung spürbar – allerdings nur, wenn die Anlage wie ein Schutzdach geplant ist." },
            { titel: "Beschattung in heißen Sommern", text: "Weniger Sonnenbrand und geringere Verdunstung können in Trockenjahren Erträge stabilisieren. In Jahren mit normaler Witterung überwiegt bei lichtbedürftigen Kulturen der Minderertrag." },
            { titel: "Windschutz und Weide", text: "Vertikale Reihen bremsen Wind und bieten Weidetieren Schatten. Auf Grünland ist der Ertragsverlust meist gering." },
            { titel: "Grenzen bei Getreide und Mais", text: "Lichtbedürftige Ackerkulturen verlieren unter der Anlage Ertrag. Dazu kommen Einschränkungen bei Maschinenarbeit, Pflanzenschutz und Vorgewende." },
          ],
        },
        {
          typ: "p",
          text: `In unseren Planungswerten spiegelt sich das wider: Für Ackerbau rechnen wir mit ${pct0(AGRI.kulturen[0].ertrag.vertikal)} (vertikal) bzw. ${pct0(AGRI.kulturen[0].ertrag.hoch)} (hoch) des bisherigen Deckungsbeitrags, für Obst und Beeren unter hoch aufgeständerten Anlagen mit ${pct0(AGRI.kulturen[3].ertrag.hoch)}. Wer eine Sonderkultur mit Deckungsbeiträgen im vierstelligen Bereich je Hektar schützt, hat daher eine ganz andere Rechnung als ein Ackerbaubetrieb.`,
        },
      ],
    },
    {
      id: "fehler",
      titel: "Typische Rechenfehler bei Agri-PV",
      tocLabel: "Rechenfehler",
      bloecke: [
        {
          typ: "checkliste",
          punkte: [
            `**Freiflächenkosten angesetzt:** Wer mit rund ${fmt(FREIFLAECHE.capexProKwp.mittel)} €/kWp wie bei einem Solarpark rechnet, liegt deutlich daneben: Agri-PV kostet nach unseren Planungswerten ${pct0(AGRI.capexProKwp.vertikal.mittel / FREIFLAECHE.capexProKwp.mittel - 1)} (vertikal) bis ${pct0(AGRI.capexProKwp.hoch.mittel / FREIFLAECHE.capexProKwp.mittel - 1)} (hoch aufgeständert) mehr je kWp.`,
            "**Förderung vorweggenommen:** Das Agri-PV-Untersegment ist nach aktuellem Stand nicht genehmigt. Rechnen Sie immer auch mit dem heutigen Zuschlagsniveau.",
            "**Netzanschluss vergessen:** Eine lange Kabeltrasse oder ein ausgelastetes Umspannwerk kann ein Projekt kippen – unabhängig von der Bauart.",
            "**Landwirtschaft ausgeblendet:** Ertragsverluste, Mehraufwand bei der Bewirtschaftung und mögliche Einsparungen (Hagelnetz) gehören in die Rechnung.",
            "**Steuern ignoriert:** Alle Renditen hier sind vor Steuern. Gewerbe-, Einkommen- und Erbschaftsteuer können das Bild deutlich verändern.",
          ],
        },
      ],
    },
    {
      id: "vorgehen",
      titel: "So prüfen Sie die Wirtschaftlichkeit Ihrer Fläche",
      tocLabel: "Vorgehen",
      bloecke: [
        {
          typ: "ablauf",
          schritte: [
            ["Fläche und Netz prüfen", "Größe, Zuschnitt, Entfernung zum nächsten Netzverknüpfungspunkt – der [Flächencheck](/flaechencheck) gibt eine erste Einschätzung."],
            ["Kultur und Bauart abstimmen", "Vertikal für Acker und Grünland, hoch aufgeständert vor allem für Sonderkulturen – mit Blick auf die DIN SPEC 91434."],
            ["Drei Wege durchrechnen", "Im [Agri-PV-Rechner](/rechner/agri-pv) Pacht, Eigeninvestition und Beteiligung vergleichen, inklusive Direktzahlungen."],
            ["Erlösweg und Szenarien festlegen", "EEG heute, EEG mit Agri-PV-Segment, PPA – und prüfen, ab welchem Preis sich das Projekt trägt."],
            ["Verträge und Steuern klären", "Pachtvertrag, Bewirtschaftungspflichten und steuerliche Folgen mit Fachleuten prüfen."],
          ],
        },
        {
          typ: "tool",
          href: pfad("/rechner/agri-pv"),
          titel: "Agri-PV-Rechner",
          text: "Verpachten, selbst investieren oder beteiligen: drei Wege für Ihre Fläche im direkten Vergleich – mit Kultur, Bauart und Direktzahlungen.",
          label: "Jetzt durchrechnen",
        },
      ],
    },
  ],

  faq: [
    {
      q: "Was kostet eine Agri-PV-Anlage pro kWp?",
      a: `Nach unseren Planungswerten ${fmt(AGRI.capexProKwp.vertikal.min)}–${fmt(AGRI.capexProKwp.vertikal.max)} €/kWp für vertikale und ${fmt(AGRI.capexProKwp.hoch.min)}–${fmt(AGRI.capexProKwp.hoch.max)} €/kWp für hoch aufgeständerte Anlagen, jeweils ohne Netzanschluss und Entwicklung. Fraunhofer ISE nennt für kleinere Agri-PV-Anlagen von 0,5–2 MWp ${fmt(ISE_CAPEX.agri.min)}–${fmt(ISE_CAPEX.agri.max)} €/kWp.`,
    },
    {
      q: "Wie hoch sind die Stromgestehungskosten von Agri-PV?",
      a: `Fraunhofer ISE hat 2024 erstmals Werte für Agri-PV veröffentlicht: ${fmt(ISE_LCOE.agri.min, 1)} bis ${fmt(ISE_LCOE.agri.suedMax, 1)} ct/kWh in Süddeutschland und ${fmt(ISE_LCOE.agri.nordMin, 1)} bis ${fmt(ISE_LCOE.agri.max, 1)} ct/kWh in Norddeutschland. Klassische Freiflächenanlagen liegen bei ${fmt(ISE_LCOE.frei.min, 1)} bis ${fmt(ISE_LCOE.frei.max, 1)} ct/kWh.`,
    },
    {
      q: "Welche Rendite bringt Agri-PV?",
      a: `Das hängt stark vom Erlös ab. In unserem 5-MWp-Beispiel erreicht eine vertikale Anlage bei ${ct2(ERLOESE.eegBesondereCt)} eine Projektrendite von ${pct(V.projektIrr)} vor Steuern; zum heutigen Zuschlagsniveau ist sie negativ. Angemessene Renditen sind erst mit Erlösen um ${ct2(Math.ceil(V.lcoeCt))} und mehr oder deutlich niedrigeren Kosten erreichbar.`,
    },
    {
      q: "Was ist günstiger: vertikale oder hoch aufgeständerte Agri-PV?",
      a: `Vertikale Anlagen sind je kWp günstiger und erreichen in unserem Beispiel Stromgestehungskosten von ${ct2(V.lcoeCt)} gegenüber ${ct2(H.lcoeCt)}. Hoch aufgeständerte Anlagen brauchen weniger Fläche je MWp und können Sonderkulturen schützen – dort kann der landwirtschaftliche Nutzen die Mehrkosten teilweise ausgleichen.`,
    },
    {
      q: "Wie viel Pacht bekommt ein Landwirt für Agri-PV?",
      a: `Als Orientierung ${fmtEur(PACHT.agriProHa.min)} bis ${fmtEur(PACHT.agriProHa.max)} je Hektar und Jahr – weniger als bei einem klassischen Solarpark, weil die landwirtschaftliche Nutzung und ${pct0(AGRI.gapFoerderfaehig)} der Direktzahlungen beim Landwirt bleiben. Mehr dazu unter [Solarpark-Pacht pro Hektar](/ratgeber/solarpark-pacht-pro-hektar).`,
    },
    {
      q: "Lohnt sich Agri-PV für Obst und Beeren?",
      a: "Häufig eher als für Ackerbau, weil hoch aufgeständerte Module Hagelnetze oder Folientunnel ersetzen und Kulturen vor Sonnenbrand schützen können. Die Mehrkosten der Anlage sind dann teilweise durch den Schutz gedeckt. Entscheidend ist ein Anlagendesign, das auf die Kultur abgestimmt ist.",
    },
  ],

  passend: [
    { href: pfad("/rechner/agri-pv"), titel: "Agri-PV-Rechner", text: "Pacht, Eigeninvestition und Beteiligung im Vergleich." },
    { href: "/ratgeber/agri-pv-foerderung-gap", titel: "Agri-PV Förderung & GAP", text: "Direktzahlungen, EEG und Baurecht." },
    { href: "/ratgeber/solarpark-investment-rendite", titel: "Solarpark-Investment und Rendite", text: "Wie Investoren Solarparks bewerten." },
    { href: pfad("/agri-pv"), titel: "Agri-PV mit ÖkoInvest", text: "Systeme, Kulturen und Beteiligung." },
  ],

  quellen: [
    { titel: "Fraunhofer ISE – Stromgestehungskosten erneuerbare Energien (Juli 2024)", url: "https://www.ise.fraunhofer.de/de/veroeffentlichungen/studien/studie-stromgestehungskosten-erneuerbare-energien.html", stand: "09/2026" },
    { titel: "Fraunhofer ISE – Studie Stromgestehungskosten Erneuerbare Energien 2024 (PDF)", url: "https://www.ise.fraunhofer.de/content/dam/ise/de/documents/publications/studies/DE2024_ISE_Studie_Stromgestehungskosten_Erneuerbare_Energien.pdf", stand: "09/2026" },
    { titel: "Fraunhofer ISE – Agri-Photovoltaik: Chance für Landwirtschaft und Energiewende (Leitfaden)", url: "https://www.ise.fraunhofer.de/de/veroeffentlichungen/studien/agri-photovoltaik-chance-fuer-landwirtschaft-und-energiewende.html", stand: "09/2026" },
    { titel: "Bundesnetzagentur – Ausschreibung PV-Freiflächenanlagen zum Gebotstermin 1. Juli 2026", url: "https://www.bundesnetzagentur.de/SharedDocs/Pressemitteilungen/DE/2026/20260818_Solar1.html", stand: "09/2026" },
    { titel: "Clearingstelle EEG|KWKG – Unter welchen Voraussetzungen sind Agri-PV-Anlagen nach dem EEG förderfähig?", url: "https://www.clearingstelle-eeg-kwkg.de/haeufige-rechtsfrage/229", stand: "09/2026" },
    { titel: "GAP-Direktzahlungen-Verordnung (GAPDZV), § 12", url: "https://www.gesetze-im-internet.de/gapdzv/__12.html", stand: "09/2026" },
  ],

  seitenCta: {
    titel: "Rechnet sich Agri-PV auf Ihrer Fläche?",
    text: "Drei Wege mit Ihren Werten vergleichen.",
    href: pfad("/rechner/agri-pv"),
    label: "Zum Agri-PV-Rechner",
  },
  cta: {
    title: "Agri-PV ehrlich durchrechnen.",
    text: "ÖkoInvest entwickelt Freiflächen- und Agri-PV-Projekte und prüft für Ihre Fläche, welcher Weg sich trägt – auch dann, wenn die Antwort „noch nicht“ lautet. Für Flächeneigentümer kostenfrei.",
    primary: { label: "Flächencheck starten", href: pfad("/flaechencheck") },
    secondary: { label: "Agri-PV-Rechner", href: pfad("/rechner/agri-pv") },
  },
};

export default artikel;
