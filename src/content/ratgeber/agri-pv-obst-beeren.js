// Ratgeber: Agri-PV für Sonderkulturen (Obst, Beeren, Wein) – Schutzfunktion statt Hagelnetz/Folie,
// hoch aufgeständerte Systeme, Lichtmanagement, Pilotanlagen (Fraunhofer ISE, Modellregion Agri-PV BW),
// DIN SPEC 91434 Kategorie I, Privilegierung § 35 Abs. 1 Nr. 9 BauGB, Wirtschaftlichkeit.
// Recherchestand 29.09.2026 (Fraunhofer ISE Agri-PV-Leitfaden 4. Aufl. 06/2025, Projektseite APV-Obstbau,
// Fraunhofer ISE News 2023 Heuchlingen). Rechnung über src/lib/rechner/agriPv.js.

import { AGRI, BAUART, ERLOESE, PACHT, STAND } from "@/lib/invest/markt";
import { fmt, fmtEur, fmtPct, fmtCt } from "@/lib/rechner/annahmen";
import { agriVergleich } from "@/lib/rechner/agriPv";
import { pfad } from "../../lib/land/index.js";

/* Werte, die (noch) nicht in markt.js stehen – Vorschlag zur Übernahme */
// DIN SPEC 91434: lichte Höhe ab 2,10 m für Kategorie I (vgl. agri-pv-din-spec-91434.js).
const LICHTE_HOEHE_M = 2.1;
// § 48 EEG / BNetzA: Aufschlag für hoch aufgeständerte Agri-PV 2026–2028 (vgl. agri-pv-foerderung-gap.js).
const BONUS_HOCH_CT = 0.5;
// Fraunhofer ISE, Leitfaden 06/2025, Kap. 3: Bei manchen Apfelsorten genügen 60–70 % des verfügbaren Lichts.
const APFEL_LICHTBEDARF = { min: 0.6, max: 0.7 };
// Fraunhofer ISE, Leitfaden 06/2025, Kap. 3: Ertragseinbußen sollten insgesamt 20 % nicht übersteigen (Empfehlung).
const ERTRAGSVERLUST_EMPFEHLUNG = 0.2;
// Fraunhofer ISE, Leitfaden 06/2025, Kap. 4.1: Annahmen für niedrige Dauerkulturen (Beeren) und Unterkonstruktionskosten.
const BEEREN_KWP_HA = 700;
const BEEREN_DURCHFAHRT_M = 3;
const UK_KOSTEN = { ffa: 76, hochUnter4m: { min: 243, max: 306 }, hochUeber4m: 372 };
// Fraunhofer ISE, Projektseite APV-Obstbau (Gelsdorf): spezifischer Ertrag und geschätzte technische Betriebskosten.
const GELSDORF = { kwp: 258, m2: 3552, ertragMittel: 1068, ertragMin: 1006, ertragMax: 1199, opex: { min: 16, max: 18 } };
// Fraunhofer ISE, Leitfaden 06/2025: technische Daten ausgewählter Pilotanlagen.
const PILOTEN = [
  { ort: "Gelsdorf (RP), 2021", kultur: "Bio-Äpfel, acht Sorten", kwp: 258, m2: 3552, besonders: "semitransparente Doppelglasmodule, teils nachgeführt; Vergleich mit Hagelnetz und Folie" },
  { ort: "Kressbronn (BW), 2022", kultur: "Äpfel, Vollertragsplantage", kwp: 239, m2: 4000, besonders: "Module mit 51 und 40 % Transparenz" },
  { ort: "Bavendorf (BW), 2022", kultur: "Bio-Äpfel, vier Sorten", kwp: 227, m2: 5000, besonders: "statischer und nachgeführter Teil, Referenzfläche" },
  { ort: "Heuchlingen (BW), 2023", kultur: "Himbeeren, Heidelbeeren, Erdbeeren u. a.", kwp: 113, m2: 2000, besonders: "geschlossener Wasser- und Nährstoffkreislauf" },
  { ort: "Augustenberg (BW), 2024", kultur: "Äpfel und Birnen", kwp: 490, m2: 10000, besonders: "vollständige Einnetzung gegen Schadinsekten" },
  { ort: "Bären-Steinbach (NRW), 2020", kultur: "Heidel-, Himbeeren, Äpfel", kwp: 740, m2: 4200, besonders: "Venlo-Dach, 3,2 m lichte Höhe, als Gewächshaus genehmigt" },
];

/* Rechenbeispiel: 2,5 ha Obst mit hoch aufgeständerter Anlage in Süddeutschland */
const HA = AGRI.privilegierungHa;
const R = agriVergleich({ ha: HA, system: "hoch", kulturId: "sonder", regionId: "de-sued" });
const SONDER = AGRI.kulturen.find((k) => k.id === "sonder");
const EIGEN = R.wege.find((w) => w.id === "eigen");
const kwpProHa = 1000 / BAUART.agriHoch.haProMwp;

const artikel = {
  slug: "agri-pv-obst-beeren",
  title: "Agri-PV im Obst- und Beerenanbau: Schutzdach, Ertrag, Kosten",
  seoTitle: "Agri-PV Obst und Beeren: Schutz & Ertrag | ÖkoInvest",
  kurzTitel: "Agri-PV für Obst & Beeren",
  description:
    "Agri-PV im Obst-, Beeren- und Weinbau: Schutz vor Hagel und Sonnenbrand, Pilotanlagen des Fraunhofer ISE, DIN SPEC Kategorie I, Baurecht und Wirtschaftlichkeit.",
  excerpt:
    "Solarmodule als Hagelnetz und Regendach: Was Pilotanlagen über Äpfel, Beeren und Reben zeigen, welche Bauweise Sonderkulturen brauchen, wo die Privilegierung hilft – und warum sich die Rechnung nur mit eingespartem Kulturschutz trägt.",
  hauptKeyword: "agri-pv obst beeren",
  keywords: [
    "Agri-PV Obstbau",
    "Agri-PV Beeren",
    "Photovoltaik statt Hagelnetz",
    "Agri-PV Apfel Ertrag",
    "Viti-PV Weinbau",
    "semitransparente Module Agri-PV",
    "Agri-PV Sonderkulturen Kosten",
  ],
  veroeffentlicht: "2026-09-29",
  aktualisiert: "2026-09-29",
  kategorie: "Agri-PV & Landwirtschaft",
  bild: "/img/solarpark-baeume.jpg",
  bildAlt: "Photovoltaikmodule im Vordergrund, dahinter eine Baumreihe unter blauem Himmel",
  badge: { wert: `ab ${fmt(LICHTE_HOEHE_M, 2)} m`, text: "lichte Höhe für Agri-PV der Kategorie I" },

  kurzFazit: [
    "**Im Obst- und Beerenanbau kann Agri-PV Hagelnetze und Folien teilweise ersetzen** und zugleich vor Starkregen und Sonnenbrand schützen. Genau hier sieht das Fraunhofer ISE das größte Synergiepotenzial.",
    `Nötig sind **hoch aufgeständerte Systeme der Kategorie I** (ab ${fmt(LICHTE_HOEHE_M, 2)} m lichter Höhe), oft mit semitransparenten Modulen. Sie kosten nach unseren Orientierungswerten ${fmt(AGRI.capexProKwp.hoch.min)}–${fmt(AGRI.capexProKwp.hoch.max)} € je kWp – rund doppelt so viel wie ein klassischer Solarpark.`,
    `Bei manchen Apfelsorten genügen laut Fraunhofer ISE bereits ${fmtPct(APFEL_LICHTBEDARF.min, 0)} bis ${fmtPct(APFEL_LICHTBEDARF.max, 0)} des verfügbaren Lichts für optimale Erträge. Belastbare mehrjährige Ertragsvergleiche aus den deutschen Pilotanlagen stehen aber noch aus.`,
    `Bis ${fmt(AGRI.privilegierungHa, 1)} ha an der Hofstelle ist Agri-PV im Außenbereich **privilegiert** (§ 35 Abs. 1 Nr. 9 BauGB) – das reicht für rund ${fmt((AGRI.privilegierungHa * kwpProHa) / 1000, 1)} MWp.`,
    `Allein aus Stromerlösen rechnet sich die teure Unterkonstruktion kaum: Im Beispiel liegt die Projektrendite bei rund ${fmtPct(EIGEN.irr ?? 0)}. Entscheidend sind eingesparte Schutzsysteme, Eigenverbrauch und stabilere Erträge.`,
  ],

  abschnitte: [
    {
      id: "antwort",
      titel: "Eignet sich Agri-PV für Obst, Beeren und Wein?",
      tocLabel: "Kurze Antwort",
      bloecke: [
        {
          typ: "p",
          text: "**Ja – Sonderkulturen gehören zu den aussichtsreichsten Anwendungen der Agri-PV, weil sie ohnehin Schutz vor Hagel, Starkregen und zu viel Sonne brauchen und je Hektar eine hohe Wertschöpfung haben.** Das Fraunhofer ISE schreibt im Agri-PV-Leitfaden, dass bei Wein-, Obst- und Gemüsebau „vermutlich das größte Potenzial für Synergieeffekte“ liegt. Die Unterkonstruktion übernimmt die Rolle von Hagelnetzgerüst oder Foliendach, die Module schützen die Kultur und erzeugen Strom.",
        },
        {
          typ: "p",
          text: "Einschränkend gilt: Die meisten deutschen Anlagen sind Forschungs- oder Pilotanlagen, die seit 2020 bis 2024 in Betrieb gegangen sind. Obstbäume brauchen Jahre bis zum Vollertrag, und Ergebnisse aus einzelnen Jahren lassen sich nicht verallgemeinern. Wer heute plant, sollte sich an belegten Teilergebnissen orientieren und die Anlage so auslegen, dass sie auch ohne optimistische Ertragsannahmen funktioniert. Die Grundlagen der Agri-PV erklärt die Seite [Agri-PV](/de/agri-pv).",
        },
        {
          typ: "kennzahl",
          wert: `${fmtPct(APFEL_LICHTBEDARF.min, 0)}–${fmtPct(APFEL_LICHTBEDARF.max, 0)}`,
          titel: "des verfügbaren Lichts genügen manchen Apfelsorten",
          text: "für optimale Erträge – laut Fraunhofer ISE (Agri-PV-Leitfaden, 4. Auflage 2025). Das macht Kernobst zu einem guten Partner für teilverschattende Module.",
        },
      ],
    },
    {
      id: "schutz",
      titel: "Schutzfunktion: Hagel, Starkregen, Frost und Sonnenbrand",
      tocLabel: "Schutzfunktion",
      bloecke: [
        {
          typ: "p",
          text: "**Im Erwerbsobstbau sind Hagelschutznetze und Folienüberdachungen längst Standard – Agri-PV kann diese Schutzkonstruktionen ersetzen oder mit ihnen kombiniert werden.** Die Module halten Hagel und Regen ab, die teilweise Beschattung mindert Sonnenbrand an Früchten und die Verdunstung. Weil die Blätter nach Regen weniger lange nass bleiben, erhofft man sich zudem weniger Pilzdruck und einen geringeren Pflanzenschutzmitteleinsatz. Ob das gelingt, wird in mehreren Pilotanlagen untersucht.",
        },
        {
          typ: "tabelle",
          caption: `Kulturschutz im Obst- und Beerenanbau im Vergleich, Stand ${STAND}`,
          kopf: ["Kriterium", "Hagelschutznetz", "Folienüberdachung / Folientunnel", "Agri-PV-Schutzdach"],
          zeilen: [
            ["Schutz vor Hagel", "ja", "ja", "ja"],
            ["Schutz vor Regen", "nein", "ja", "weitgehend (je nach Modulabstand und Abtropfkante)"],
            ["Beschattung", "leicht", "gering", "deutlich, über Transparenz und Modulabstand steuerbar"],
            ["Montageaufwand jährlich", "Öffnen und Schließen der Netze", "Auf- und Abbau, Folienwechsel", "keiner – dauerhafte Konstruktion"],
            ["Kunststoffeinsatz", "Netze", "hoch", "gering"],
            ["Einnahmen", "keine", "keine", "Stromerlöse bzw. Pacht über 20–30 Jahre"],
            ["Investition", "gering", "mittel", "hoch; Unterkonstruktion trägt Module"],
          ],
          hervorheben: 3,
          minBreite: 760,
          fussnote: "Qualitative Einordnung nach Fraunhofer ISE (Leitfaden 2025, Projekt APV-Obstbau). Beim Frostschutz ist die Wirkung eines Moduldachs begrenzt; für die Pilotanlage in Gelsdorf wurde deshalb ein zusätzliches Frostschutzsystem angedacht.",
        },
        {
          typ: "p",
          text: "Aus Gelsdorf berichtet das Fraunhofer ISE auch von Lernkurven: Die Abtropfkante der Module lag versetzt zwischen den Baumreihen und traf eine Fahrspur, und bei seitlichem Regen werden die unteren Blätter nass. Für den Landwirt positiv ist, dass die jährliche Montage von Netzen und Folien entfällt. Solche Details zeigen: Das Moduldach muss wie ein Kulturschutzsystem geplant werden, nicht wie ein aufgeständerter Solarpark.",
        },
      ],
    },
    {
      id: "system",
      titel: "Bauweise: Hoch aufgeständert, semitransparent, nachgeführt",
      tocLabel: "Bauweise",
      bloecke: [
        {
          typ: "p",
          text: `**Für Obst und Beeren kommen praktisch nur hoch aufgeständerte Systeme der DIN SPEC 91434, Kategorie I, in Frage – mit mindestens ${fmt(LICHTE_HOEHE_M, 2)} m lichter Höhe, bei Obst meist deutlich mehr.** Die Norm führt Dauerkulturen als Nutzungsart 1A. Vertikale Modulreihen (Kategorie II) sind für Sonderkulturen unüblich; in unserem Agri-PV-Rechner ist dieses System für Obst und Beeren daher nicht vorgesehen.`,
        },
        {
          typ: "liste",
          punkte: [
            `**Höhe:** Beim Obstbau muss der Traktor mit Anbaugeräten unter der Konstruktion arbeiten können. Für niedrige Dauerkulturen wie Beeren rechnet das Fraunhofer ISE mit ${fmt(BEEREN_DURCHFAHRT_M)} m Durchfahrtshöhe, im Weinbau mit zwei bis drei Metern Systemhöhe.`,
            "**Semitransparente Doppelglasmodule:** Sie lassen einen Teil des Lichts durch. In Kressbronn werden Module mit 51 und 40 Prozent Transparenz verglichen, in Gelsdorf, Bavendorf und Heuchlingen kommen ebenfalls semitransparente Module zum Einsatz.",
            "**Nachführung:** Einachsig nachgeführte Module können in lichtkritischen Phasen mehr Licht durchlassen und bei Hitze stärker beschatten. Das Fraunhofer ISE arbeitet an Algorithmen, die sich am Lichtbedarf der Pflanze orientieren.",
            `**Leistungsdichte:** Wir rechnen für hoch aufgeständerte Systeme mit rund ${fmt(kwpProHa, 0)} kWp je Hektar; das Fraunhofer ISE setzt für Beerenanlagen ${fmt(BEEREN_KWP_HA)} kWp je Hektar an.`,
            "**Integration weiterer Schutzelemente:** Die Unterkonstruktion kann Hagelnetze an den Seiten, Insektenschutznetze (etwa gegen die Kirschessigfliege oder die marmorierte Baumwanze) und Bewässerung aufnehmen.",
          ],
        },
        {
          typ: "p",
          text: `Im Lichtmanagement liegt der Kern der Planung: Zu viel Schatten mindert Farbe, Zuckergehalt und Ertrag, zu wenig verschenkt Schutzwirkung und Strom. Als Faustregel nennt das Fraunhofer ISE für Agri-PV insgesamt, dass Ertragseinbußen ${fmtPct(ERTRAGSVERLUST_EMPFEHLUNG, 0)} nicht übersteigen sollten. Die DIN SPEC 91434 verlangt mindestens ${fmtPct(AGRI.mindestErtrag, 0)} des Referenzertrags und höchstens ${fmtPct(AGRI.flaechenverlustMaxKat1, 0)} Flächenverlust in Kategorie I. Die Details der Norm erklärt der Ratgeber [DIN SPEC 91434](/wissen/ratgeber/agri-pv-din-spec-91434).`,
        },
      ],
    },
    {
      id: "pilotanlagen",
      titel: "Was zeigen Pilotanlagen in Deutschland?",
      tocLabel: "Pilotanlagen",
      bloecke: [
        {
          typ: "p",
          text: "**In Deutschland gibt es inzwischen rund ein Dutzend Forschungs- und Praxisanlagen über Obst, Beeren und Reben, vor allem in Baden-Württemberg und Rheinland-Pfalz.** Die Modellregion Agri-PV Baden-Württemberg hat unter Leitung des Fraunhofer ISE Pilotanlagen mit zusammen über 1.700 kWp an mehreren Standorten errichtet. Die folgende Tabelle fasst die technischen Daten ausgewählter Anlagen zusammen.",
        },
        {
          typ: "tabelle",
          caption: "Ausgewählte Agri-PV-Anlagen über Obst und Beeren in Deutschland (Fraunhofer ISE, Leitfaden 06/2025)",
          kopf: ["Standort, Baujahr", "Kultur", "Leistung", "Fläche", "Besonderheit"],
          zeilen: PILOTEN.map((p) => [p.ort, p.kultur, `${fmt(p.kwp)} kWp`, `${fmt(p.m2)} m²`, p.besonders]),
          hervorheben: 2,
          minBreite: 820,
          fussnote: "Hinzu kommen Anlagen im Weinbau (Tuniberg 300 kWp, Blankenhornsberg 268 kWp, Geisenheim 94 kWp, alle 2023) und über Süßkirschen (Heuchlingen 2024, 225 kWp). Leistungen gerundet.",
        },
        { typ: "h3", text: "Belegte Ergebnisse – und was noch fehlt" },
        {
          typ: "checkliste",
          punkte: [
            `**Stromertrag Gelsdorf:** Der spezifische Ertrag lag laut Fraunhofer ISE je nach Modul und Aufständerung zwischen ${fmt(GELSDORF.ertragMin)} und ${fmt(GELSDORF.ertragMax)} kWh je kWp, im Mittel bei ${fmt(GELSDORF.ertragMittel)} kWh je kWp – trotz semitransparenter Module ein solider Wert.`,
            `**Betriebskosten:** Die technischen Betriebskosten schätzt das Fraunhofer ISE für Gelsdorf auf ${fmt(GELSDORF.opex.min)}–${fmt(GELSDORF.opex.max)} € je kWp und Jahr – deutlich über einem Solarpark und noch nicht verifiziert.`,
            "**Beeren in Bären-Steinbach:** Nach Aussage der Landwirte haben Heidelbeeren in den ersten Jahren mit starken Erträgen überzeugt, bei Erdbeeren gab es im ersten Jahr leichte Einbußen. Für Äpfel lagen dort noch keine Ernteergebnisse vor.",
            "**Äpfel:** Mehrjährige, statistisch belastbare Ertragsvergleiche zwischen Agri-PV, Hagelnetz und Folie sind nach unserem Kenntnisstand noch nicht veröffentlicht. Die Projekte laufen teils bis Ende 2026.",
          ],
        },
        {
          typ: "p",
          text: "Auch international gibt es Beispiele: Das Fraunhofer ISE zeigt im Leitfaden ein Demoprojekt von BayWa r.e. im Beerenanbau, und in Frankreich werden Agri-PV-Anlagen im Weinbau gezielt gefördert. Für Ihre eigene Entscheidung zählt aber vor allem, wie sich Sorte, Standort und Anlagendesign zusammenfügen – dafür sind die Forschungsergebnisse der kommenden Jahre wichtiger als einzelne Rekordernten.",
        },
      ],
    },
    {
      id: "wein",
      titel: "Weinbau: Viti-PV gegen Sonnenbrand und zu frühe Reife",
      tocLabel: "Weinbau",
      bloecke: [
        {
          typ: "p",
          text: "**Im Weinbau soll Agri-PV die Reben vor Hitze, Starkregen, Hagel und Spätfrost schützen und die Traubenreife verzögern.** Mehr Sonneneinstrahlung erhöht den Zuckergehalt und damit den Alkoholgehalt – das kann die Qualität mindern. Teilverschattung kann bei hohen Temperaturen das Wachstum stabilisieren und ein vorzeitiges Abreifen verhindern. Weil über Reben nur zwei bis drei Meter Systemhöhe nötig sind, sinken die Kosten der Unterkonstruktion gegenüber dem Obstbau deutlich.",
        },
        {
          typ: "p",
          text: "Die Anlagen am Tuniberg, am Blankenhornsberg und in Geisenheim sind seit 2023 in Betrieb; das Staatliche Weinbauinstitut Freiburg und die Hochschule Geisenheim untersuchen Ertrag, Mostqualität und Mikroklima. Wie bei Obst gilt: Ergebnisse über mehrere Jahrgänge stehen noch aus.",
        },
      ],
    },
    {
      id: "recht",
      titel: "Baurecht, EEG und GAP: Was für Sonderkulturen gilt",
      tocLabel: "Recht und Förderung",
      bloecke: [
        {
          typ: "p",
          text: `**Agri-PV-Anlagen bis ${fmt(AGRI.privilegierungHa, 1)} ha Grundfläche sind im Außenbereich privilegiert, wenn sie in einem räumlich-funktionalen Zusammenhang mit einem landwirtschaftlichen Betrieb stehen und je Hofstelle nur eine solche Anlage betrieben wird (§ 35 Abs. 1 Nr. 9 BauGB).** Für viele Obstbaubetriebe passt das gut: ${fmt(AGRI.privilegierungHa, 1)} ha reichen bei hoch aufgeständerten Systemen für rund ${fmt(R.anlage.kwp / 1000, 1)} MWp. Ein Bebauungsplan ist dann nicht nötig, eine Baugenehmigung schon. Die Praxisanlage in Bären-Steinbach wurde übrigens als Gewächshaus für Sonderkulturen beantragt und als privilegiertes Vorhaben genehmigt.`,
        },
        {
          typ: "p",
          text: `Im EEG gelten Agri-PV-Anlagen auf Dauerkulturflächen als [besondere Solaranlagen](/wissen/lexikon#besondere-solaranlagen). Hoch aufgeständerte Anlagen ab ${fmt(LICHTE_HOEHE_M, 2)} m lichter Höhe erhalten nach aktuellem Stand in den Jahren 2026 bis 2028 einen Aufschlag von ${fmtCt(BONUS_HOCH_CT)} auf den Zuschlagswert; unsere Rechner setzen für besondere Solaranlagen ${fmtCt(ERLOESE.eegBesondereCt)} an. Bei den GAP-Direktzahlungen bleiben nach § 12 GAPDZV ${fmtPct(AGRI.gapFoerderfaehig, 0)} der Fläche förderfähig, wenn die Anlage die Bewirtschaftung nicht ausschließt und höchstens 15 % Fläche kostet. Alle Förderwege im Detail: [Agri-PV Förderung und GAP](/wissen/ratgeber/agri-pv-foerderung-gap).`,
        },
        {
          typ: "kasten",
          variant: "info",
          titel: "Kleine Fläche, eigener Strom",
          text: "Obstbaubetriebe haben oft einen hohen Strombedarf für Kühlung, Sortierung und Bewässerung. Eine privilegierte Hofanlage kann einen Teil davon direkt decken – das verbessert die Wirtschaftlichkeit deutlich gegenüber reiner Einspeisung. Wie Eigenverbrauch und Einspeisung zusammenspielen, zeigt der Ratgeber [Direktvermarktung für Solarparks](/wissen/ratgeber/direktvermarktung-solarpark).",
        },
      ],
    },
    {
      id: "wirtschaftlichkeit",
      titel: `Wirtschaftlichkeit: Rechenbeispiel ${fmt(HA, 1)} ha Obst`,
      tocLabel: "Wirtschaftlichkeit",
      bloecke: [
        {
          typ: "p",
          text: `**Eine hoch aufgeständerte Anlage über Obst kostet nach unseren Orientierungswerten ${fmt(AGRI.capexProKwp.hoch.min)} bis ${fmt(AGRI.capexProKwp.hoch.max)} € je kWp – der Mehrpreis gegenüber einem Solarpark steckt vor allem in der Unterkonstruktion.** Das Fraunhofer ISE schätzt deren Kosten bei Systemen über vier Metern auf durchschnittlich ${fmt(UK_KOSTEN.hochUeber4m)} € je kWp, unter vier Metern auf ${fmt(UK_KOSTEN.hochUnter4m.min)} bis ${fmt(UK_KOSTEN.hochUnter4m.max)} € je kWp – gegenüber ${fmt(UK_KOSTEN.ffa)} € je kWp bei einer Freiflächenanlage.`,
        },
        {
          typ: "tabelle",
          caption: `Beispiel: ${fmt(HA, 1)} ha Obst und Beeren mit hoch aufgeständerter Agri-PV in Süddeutschland, Stand ${STAND}`,
          kopf: ["Größe", "Wert", "Annahme"],
          zeilen: [
            ["Installierte Leistung", `${fmt(R.anlage.kwp)} kWp`, `${fmt(kwpProHa, 0)} kWp je ha`],
            ["Stromerzeugung im ersten Jahr", `${fmt(R.anlage.kwh / 1e6, 2)} Mio. kWh`, "Süddeutschland, hoch aufgeständert"],
            ["Investition inkl. Netzanschluss", fmtEur(R.anlage.capex), `${fmt(AGRI.capexProKwp.hoch.mittel)} €/kWp plus Anschluss und Entwicklung`],
            ["Stromerlös / Vergütung", fmtCt(R.ctFoerder), "besondere Solaranlage, 20 Jahre"],
            ["**Projektrendite (IRR) bei Eigeninvestition**", `**${fmtPct(EIGEN.irr ?? 0)}**`, `${R.laufzeit} Jahre, vor Steuern, ohne eingesparten Kulturschutz`],
            ["Alternative: Pacht an Investor", `${fmtEur(R.pachtJahr0)} pro Jahr`, `${fmt(PACHT.agriProHa.mittel)} €/ha, Bewirtschaftung bleibt beim Betrieb`],
            ["Deckungsbeitrag Obst & Beeren", `${fmtEur(SONDER.db * HA)} ohne Anlage, ${fmtEur(R.landwirtschaft.dbJahr)} mit Anlage`, `${fmt(SONDER.db)} €/ha, ${fmtPct(SONDER.ertrag.hoch, 0)} Ertrag unter dem System`],
          ],
          hervorheben: 1,
          markierteZeile: 4,
          minBreite: 700,
          fussnote: "Berechnet mit dem Rechenkern des Agri-PV-Rechners (Mittelwerte aus markt.js). Nicht enthalten: eingesparte Hagelnetze oder Folien, Eigenverbrauch auf dem Hof, Qualitätsprämien und mögliche Förderprogramme der Länder.",
        },
        {
          typ: "p",
          text: "Das Ergebnis ist ernüchternd und ehrlich: Mit Einspeisung allein trägt sich die teure Konstruktion auf kleiner Fläche kaum. Die Rechnung dreht sich, wenn die Anlage ein ohnehin nötiges Schutzsystem ersetzt, wenn ein großer Teil des Stroms auf dem Hof verbraucht wird und wenn die Kosten am unteren Ende der Spanne liegen. Für viele Betriebe ist deshalb das Modell interessant, bei dem ein Investor baut, der Betrieb Pacht erhält und das Schutzdach kostenlos mitnutzt – oder sich über eine [Genossenschaft](/de/genossenschaft) beteiligt. Die allgemeine Einordnung liefert der Ratgeber [Agri-PV Wirtschaftlichkeit](/wissen/ratgeber/agri-pv-wirtschaftlichkeit).",
        },
        {
          typ: "tool",
          href: pfad("/rechner/agri-pv"),
          titel: "Agri-PV für Ihre Obst- oder Beerenfläche rechnen",
          text: "Kultur „Obst & Beeren“ wählen, Fläche und Region eingeben und Pacht, Eigeninvestition und Beteiligung vergleichen.",
          label: "Zum Agri-PV-Rechner",
        },
      ],
    },
    {
      id: "vorgehen",
      titel: "So planen Sie Agri-PV über Sonderkulturen",
      tocLabel: "Vorgehen",
      bloecke: [
        {
          typ: "ablauf",
          schritte: [
            ["Kultur und Sorte festlegen", "Lichtbedarf, Erziehungssystem und Pflanzabstände bestimmen die Modulanordnung. Neupflanzungen lassen sich besser auf das System abstimmen als Bestandsanlagen."],
            ["Schutzziel definieren", "Soll die Anlage Hagelnetz, Foliendach oder beides ersetzen? Daraus folgen Überdeckungsgrad, Abtropfkanten und Seitennetze."],
            ["Nutzungskonzept nach DIN SPEC 91434", "Landwirtschaftliches Konzept, Flächenbilanz und Referenzertrag festhalten – Grundlage für GAP, EEG und Pachtvertrag."],
            ["Baurecht klären", `Bis ${fmt(AGRI.privilegierungHa, 1)} ha mit Hofbezug privilegiert; darüber Bebauungsplan der Gemeinde. Eine Bauvoranfrage schafft Klarheit.`],
            ["Modell wählen", "Verpachten, selbst investieren oder beteiligen. Überblick für Betriebe auf der Seite [Landwirte](/de/landwirte)."],
            ["Fläche prüfen lassen", "Netzanschluss und Planungsrecht früh klären – mit dem [Flächencheck](/de/flaechencheck)."],
          ],
        },
        {
          typ: "p",
          text: "Wer lieber verpachtet als selbst baut, sollte im Pachtvertrag festhalten, dass die Bewirtschaftung beim Betrieb bleibt und die Schutzfunktion der Anlage über die gesamte Laufzeit gewährleistet ist – einschließlich Reparaturen nach Sturm oder Hagel. Mehr dazu im Ratgeber [Pachtvertrag Solarpark](/wissen/ratgeber/pachtvertrag-solarpark).",
        },
      ],
    },
  ],

  faq: [
    {
      q: "Kann Agri-PV ein Hagelnetz im Obstbau ersetzen?",
      a: "Grundsätzlich ja: Die Module halten Hagel und Regen ab, die Konstruktion kann zusätzlich Seitennetze tragen. Ob der Schutz so gut ist wie bei einem Netz oder einer Folie, wird in Pilotanlagen wie Gelsdorf, Kressbronn und Bavendorf untersucht.",
    },
    {
      q: "Wie viel Licht brauchen Äpfel unter Solarmodulen?",
      a: `Laut Fraunhofer ISE genügen manchen Apfelsorten bereits ${fmtPct(APFEL_LICHTBEDARF.min, 0)} bis ${fmtPct(APFEL_LICHTBEDARF.max, 0)} des verfügbaren Lichts für optimale Erträge. Über Transparenz, Modulabstand und Nachführung lässt sich die Beschattung anpassen.`,
    },
    {
      q: "Welche Höhe braucht eine Agri-PV-Anlage über Obst?",
      a: `Für Kategorie I nach DIN SPEC 91434 mindestens ${fmt(LICHTE_HOEHE_M, 2)} m lichte Höhe. Im Obstbau ist wegen Baumhöhe und Maschinen meist mehr nötig; für Beeren rechnet das Fraunhofer ISE mit ${fmt(BEEREN_DURCHFAHRT_M)} m Durchfahrtshöhe, im Weinbau mit zwei bis drei Metern.`,
    },
    {
      q: "Was kostet Agri-PV über Sonderkulturen?",
      a: `Nach unseren Orientierungswerten ${fmt(AGRI.capexProKwp.hoch.min)} bis ${fmt(AGRI.capexProKwp.hoch.max)} € je kWp, also etwa doppelt so viel wie ein klassischer Solarpark. Der Mehrpreis steckt vor allem in der hohen Unterkonstruktion.`,
    },
    {
      q: "Brauche ich für Agri-PV über meiner Obstanlage einen Bebauungsplan?",
      a: `Nicht, wenn die Anlage höchstens ${fmt(AGRI.privilegierungHa, 1)} ha Grundfläche hat, im Zusammenhang mit Ihrem Betrieb steht und die einzige solche Anlage der Hofstelle ist. Dann ist sie nach § 35 Abs. 1 Nr. 9 BauGB privilegiert; eine Baugenehmigung brauchen Sie trotzdem.`,
    },
    {
      q: "Bekomme ich für die Obstfläche weiter GAP-Direktzahlungen?",
      a: `Ja, wenn die Anlage als Agri-PV-Anlage nach § 12 GAPDZV anerkannt wird: Dann bleiben ${fmtPct(AGRI.gapFoerderfaehig, 0)} der Fläche förderfähig. Mehr unter [Agri-PV Förderung und GAP](/wissen/ratgeber/agri-pv-foerderung-gap).`,
    },
  ],

  passend: [
    { href: "/wissen/ratgeber/agri-pv-din-spec-91434", titel: "DIN SPEC 91434 erklärt", text: "Kategorien, Flächenverlust und 66-%-Regel." },
    { href: "/wissen/ratgeber/agri-pv-wirtschaftlichkeit", titel: "Agri-PV Wirtschaftlichkeit", text: "Kosten, Erlöse und Rendite im Vergleich." },
    { href: pfad("/rechner/agri-pv"), titel: "Agri-PV-Rechner", text: "Drei Wege für Ihre Fläche im Vergleich." },
    { href: pfad("/agri-pv"), titel: "Agri-PV mit ÖkoInvest", text: "Systeme, Kulturen und Beteiligungsmodelle." },
  ],

  quellen: [
    { titel: "Fraunhofer ISE – Agri-Photovoltaik: Chance für Landwirtschaft und Energiewende (Leitfaden, 4. Auflage Juni 2025)", url: "https://www.ise.fraunhofer.de/content/dam/ise/de/documents/publications/studies/APV-Leitfaden.pdf", stand: "09/2026" },
    { titel: "Fraunhofer ISE – Forschungsprojekt APV-Obstbau (Gelsdorf)", url: "https://www.ise.fraunhofer.de/de/forschungsprojekte/apv-obstbau.html", stand: "09/2026" },
    { titel: "Fraunhofer ISE – Neue Forschungsanlage der Modellregion Agri-PV Baden-Württemberg für Beerenanbau (2023)", url: "https://www.ise.fraunhofer.de/de/presse-und-medien/news/2023/neue-forschungsanlage-modellregion-agri-photovoltaik-baden-wuerttemberg-beerenanbau.html", stand: "09/2026" },
    { titel: "Fraunhofer ISE / agri-pv.org – Forschungsprojekte zur Agri-PV (u. a. Modellregion Agri-PV BW)", url: "https://agri-pv.org/de/forschung-informationen/forschungsprojekte-ise/", stand: "09/2026" },
    { titel: "Baugesetzbuch § 35 (Bauen im Außenbereich, Abs. 1 Nr. 9)", url: "https://www.gesetze-im-internet.de/bbaug/__35.html", stand: "09/2026" },
    { titel: "GAP-Direktzahlungen-Verordnung (GAPDZV), § 12", url: "https://www.gesetze-im-internet.de/gapdzv/__12.html", stand: "09/2026" },
    { titel: "DIN Media – DIN SPEC 91434:2021-05, Agri-Photovoltaik-Anlagen – Anforderungen an die landwirtschaftliche Hauptnutzung", url: "https://www.dinmedia.de/en/technical-rule/din-spec-91434/337886742", stand: "09/2026" },
  ],

  seitenCta: {
    titel: "Rechnet sich Ihr Schutzdach?",
    text: "Obst & Beeren im Agri-PV-Rechner durchspielen.",
    href: pfad("/rechner/agri-pv"),
    label: "Zum Agri-PV-Rechner",
  },
  cta: {
    title: "Agri-PV für Ihren Obst- oder Beerenbetrieb prüfen.",
    text: "Im Flächencheck prüfen wir Lage, Netzanschluss und Planungsrecht Ihrer Fläche – für Landwirte kostenfrei.",
    primary: { label: "Zum Flächencheck", href: pfad("/flaechencheck") },
    secondary: { label: "Agri-PV entdecken", href: pfad("/agri-pv") },
  },
};

export default artikel;
