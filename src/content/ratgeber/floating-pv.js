// Ratgeber: Floating-PV – schwimmende Solarparks auf Baggerseen und Tagebau-Restseen
// Recherchestand 29.09.2026: WHG § 3 Nr. 4/5, § 36 Abs. 3 (15 % Bedeckung, 40 m Uferabstand – Fassung
// gesetze-im-internet.de 09/2026 unverändert); EEG 2023 §§ 37 Abs. 1 Nr. 3 f, 37b Abs. 2, 37d, 48 Abs. 1 Nr. 5 f;
// Fraunhofer ISE (Potenzial 44 GWp; Studie Baggerseen Baden-Württemberg 07/2022). Projektbeispiele nach
// öffentlich zugänglichen Angaben (Cottbuser Ostsee, Grafenwörth). Marktzahlen aus src/lib/invest/markt.js.

import { FREIFLAECHE, FINANZIERUNG, REGIONEN, ERLOESE, PACHT, STAND, annuitaet } from "@/lib/invest/markt";
import { fmt, fmtEur, fmtPct, fmtCt } from "@/lib/rechner/annahmen";
import { pfad } from "../../lib/land/index.js";

/* Werte, die (noch) nicht in markt.js stehen – Vorschlag zur Übernahme */
// § 36 Abs. 3 WHG: Grenzen für Solaranlagen auf künstlichen und erheblich veränderten Gewässern
const BEDECKUNG_MAX = 0.15;
const UFERABSTAND_M = 40;
// Fraunhofer ISE: technisches Potenzial Floating-PV auf künstlichen Gewässern in Deutschland (GWp)
const ISE_POTENZIAL_GWP = 44;
// Fraunhofer ISE (07/2022, im Auftrag des Umweltministeriums BW): 69 Baggerseen in Auskiesung, 280–1.070 MW
const BW_SEEN = 69;
const BW_POTENZIAL_MW = { min: 280, max: 1070 };
// Cottbuser Ostsee (gefluteter Tagebau): rund 29 MWp auf etwa 16 ha, fertiggestellt 2024 → Belegungsdichte
const COTTBUS_MWP = 29;
const COTTBUS_HA = 16;
const HA_PRO_MWP_FLOATING = COTTBUS_HA / COTTBUS_MWP;
// Grafenwörth (Niederösterreich): 24,5 MWp, Inbetriebnahme 2023 (EVN, ecowind)
const GRAFENWOERTH_MWP = 24.5;
// EEG § 37b Abs. 2 (Höchstwert besondere Solaranlagen, Obergrenze) und § 48 Abs. 1 (bis 1 MW, vor Degression), ct/kWh
const HOECHSTWERT_BESONDERE_CT = 9.5;
const ANZULEGENDER_WERT_KLEIN_CT = 7.0;

/* Rechenbeispiel 1: Wie viel Leistung passt auf einen Baggersee? */
const SEEN = [10, 25, 50, 100].map((ha) => {
  const radius = Math.sqrt((ha * 10000) / Math.PI); // vereinfachend kreisrunder See
  const innenHa = (Math.PI * Math.pow(Math.max(radius - UFERABSTAND_M, 0), 2)) / 10000;
  const belegbar = Math.min(ha * BEDECKUNG_MAX, innenHa);
  return { ha, innenHa, belegbar, mwp: belegbar / HA_PRO_MWP_FLOATING };
});
const SEE50 = SEEN[2];

/* Rechenbeispiel 2: Kapitalkosten je kWh bei höheren Errichtungskosten (Szenario, keine Marktangabe) */
const REGION = REGIONEN.find((r) => r.id === "de-sued");
const kapitalCt = (capex) => (annuitaet(capex, FINANZIERUNG.zins, 20) / REGION.ertrag) * 100;
const SZENARIEN = [0, 0.2, 0.4, 0.6].map((auf) => {
  const capex = FREIFLAECHE.capexProKwp.mittel * (1 + auf);
  return { auf, capex, ct: kapitalCt(capex) };
});

const artikel = {
  slug: "floating-pv",
  title: "Floating-PV: Schwimmende Solarparks auf Baggerseen und Tagebauseen",
  seoTitle: "Floating-PV: schwimmende Solarparks | ÖkoInvest",
  kurzTitel: "Floating-PV",
  description:
    "Floating-PV auf Baggersee und Tagebausee: 15-%-Grenze und 40 m Uferabstand nach WHG, EEG-Förderung, Kosten, Genehmigung und Chancen für Kiesgrubenbesitzer.",
  excerpt:
    "Schwimmende Solaranlagen nutzen Wasserflächen, die sonst brachliegen. Was das Wasserhaushaltsgesetz erlaubt, wie das EEG fördert, was Floating-PV kostet und worauf Eigentümer von Kiesgruben und Tagebauseen achten sollten.",
  hauptKeyword: "floating pv",
  keywords: [
    "Floating-PV",
    "schwimmende Photovoltaik",
    "Floating-PV Baggersee",
    "§ 36 WHG Solaranlage",
    "Floating-PV Kiesgrube",
    "schwimmender Solarpark Tagebausee",
    "Floating-PV Österreich",
  ],
  veroeffentlicht: "2026-09-29",
  aktualisiert: "2026-09-29",
  kategorie: "Fläche & Pacht",
  bild: "/img/floating-pv.jpg",
  bildAlt: "Luftaufnahme einer schwimmenden Solaranlage mit weißen und blauen Schwimmkörpern, zwei Techniker mit Helm und Laptop auf einem Wartungssteg",
  badge: { wert: `${fmtPct(BEDECKUNG_MAX, 0)} / ${fmt(UFERABSTAND_M)} m`, text: "max. Bedeckung und Mindest-Uferabstand nach § 36 WHG" },

  kurzFazit: [
    `**Floating-PV ist in Deutschland nur auf künstlichen oder erheblich veränderten Gewässern zulässig**, etwa Baggerseen und gefluteten Tagebauen; auf natürlichen Seen verbietet § 36 Abs. 3 WHG Solaranlagen.`,
    `Die Anlage darf höchstens **${fmtPct(BEDECKUNG_MAX, 0)} der Wasserfläche** bedecken und muss mindestens **${fmt(UFERABSTAND_M)} m Abstand zum Ufer** halten – Stand ${STAND} unverändert.`,
    `Im EEG ist Floating-PV eine besondere Solaranlage (§ 37 Abs. 1 Nr. 3 f); für diese Kategorie ist ein Höchstwert von bis zu ${fmt(HOECHSTWERT_BESONDERE_CT, 1)} ct/kWh und ein eigenes Untersegment vorgesehen, das noch unter beihilferechtlichem Vorbehalt steht.`,
    `Das Fraunhofer ISE schätzt das technische Potenzial in Deutschland auf rund **${fmt(ISE_POTENZIAL_GWP)} GWp**; auf einem 50-ha-Baggersee passen unter der 15-%-Regel etwa ${fmt(SEE50.mwp, 0)} MWp.`,
    "Besonders interessant ist Floating-PV für **Kieswerke mit hohem Eigenstrombedarf**. Für Eigentümer zählen Rekultivierungsauflagen, Folgenutzung und Naturschutz mehr als die Pacht je Hektar.",
  ],

  abschnitte: [
    {
      id: "antwort",
      titel: "Was ist Floating-PV und wo ist sie erlaubt?",
      tocLabel: "Kurze Antwort",
      bloecke: [
        {
          typ: "p",
          text: "**Floating-PV sind Solaranlagen auf Schwimmkörpern, die auf einer Wasserfläche verankert sind; in Deutschland sind sie nur auf künstlichen oder erheblich veränderten Gewässern wie Baggerseen, Kiesgruben, Tagebau-Restseen oder Speicherbecken zulässig.** Natürliche Seen sind nach § 36 Abs. 3 WHG ausgeschlossen. Künstlich ist ein Gewässer, das von Menschen geschaffen wurde (§ 3 Nr. 4 WHG); erheblich verändert ist ein natürliches Gewässer, dessen Charakter durch den Menschen wesentlich verändert wurde (§ 3 Nr. 5 WHG).",
        },
        {
          typ: "p",
          text: "Der Reiz liegt auf der Hand: Die Anlage beansprucht keine Agrarfläche, das Wasser kühlt die Module, und viele Baggerseen liegen direkt neben einem stromintensiven Kieswerk. Dem stehen höhere Kosten, strenge Flächengrenzen und ein vielschichtiges Genehmigungsverfahren gegenüber. Für die Einordnung neben anderen Sonderstandorten lohnt ein Blick in den Ratgeber [Moor-PV](/wissen/ratgeber/moor-pv) und auf die Übersicht der [besonderen Solaranlagen](/wissen/lexikon#besondere-solaranlagen).",
        },
        {
          typ: "kennzahl",
          wert: `${fmt(ISE_POTENZIAL_GWP)} GWp`,
          titel: "technisches Floating-PV-Potenzial in Deutschland",
          text: "Fraunhofer ISE: auf künstlichen Seen wie gefluteten Tagebauen, Kiesgruben und teilweise Stauseen – ohne zusätzliche Landfläche zu belegen.",
        },
      ],
    },
    {
      id: "whg",
      titel: "§ 36 Abs. 3 WHG: 15 % Bedeckung und 40 Meter Uferabstand",
      tocLabel: "WHG-Grenzen",
      bloecke: [
        {
          typ: "p",
          text: `**Nach § 36 Abs. 3 WHG darf eine Solaranlage auf einem künstlichen oder erheblich veränderten Gewässer nicht mehr als ${fmtPct(BEDECKUNG_MAX, 0)} der Gewässerfläche bedecken, und der Abstand zum Ufer muss mindestens ${fmt(UFERABSTAND_M)} m betragen.** Die Regel gilt seit 2023 und ist in der Fassung auf gesetze-im-internet.de zum Stand September 2026 unverändert. Sie wird in der Branche als sehr streng kritisiert, weil andere Länder deutlich höhere Bedeckungsgrade zulassen; eine Lockerung ist Stand heute nicht beschlossen.`,
        },
        {
          typ: "tabelle",
          caption: `Wie viel Floating-PV passt auf einen Baggersee? Beispielrechnung, Stand ${STAND}`,
          kopf: ["Seefläche", `Fläche jenseits ${fmt(UFERABSTAND_M)} m Uferabstand`, `Belegbar (max. ${fmtPct(BEDECKUNG_MAX, 0)})`, "Leistung (Orientierung)"],
          zeilen: SEEN.map((s) => [
            `${fmt(s.ha)} ha`,
            `${fmt(s.innenHa, 1)} ha`,
            `${fmt(s.belegbar, 1)} ha`,
            `rund ${fmt(s.mwp, 1)} MWp`,
          ]),
          hervorheben: 3,
          markierteZeile: 2,
          minBreite: 640,
          fussnote: `Vereinfachend kreisrunder See. Belegungsdichte ${fmt(HA_PRO_MWP_FLOATING, 2)} ha je MWp, abgeleitet aus der Anlage am Cottbuser Ostsee (rund ${fmt(COTTBUS_MWP)} MWp auf etwa ${fmt(COTTBUS_HA)} ha); je nach System und Reihenabstand deutlich abweichend. Zum Vergleich an Land: rund ${fmt(FREIFLAECHE.haProMwp, 1)} ha je MWp.`,
        },
        {
          typ: "p",
          text: "Die Beispiele zeigen: Bei üblichen Baggerseen begrenzt fast immer die 15-%-Regel, nicht der Uferabstand. Erst bei sehr kleinen oder langgestreckten Gewässern wird der 40-m-Streifen zum Engpass. Wirtschaftlich interessant werden Projekte deshalb vor allem auf großen Seen – Tagebau-Restseen haben oft mehrere hundert bis tausend Hektar – oder dort, wo der Strom direkt vor Ort verbraucht wird.",
        },
        {
          typ: "kasten",
          variant: "recht",
          titel: "Rechtslage in Deutschland (Stand September 2026)",
          text: "§ 36 Abs. 3 WHG verbietet Solaranlagen in und über oberirdischen Gewässern, die weder künstlich noch erheblich verändert sind, und begrenzt sie auf allen übrigen Gewässern auf 15 % Bedeckung und 40 m Uferabstand. Daneben bleibt die allgemeine Anforderung, dass Anlagen in Gewässern keine schädlichen Gewässerveränderungen verursachen dürfen. Genehmigungspflicht und Verfahren regelt das Landeswasserrecht.",
        },
      ],
    },
    {
      id: "eeg",
      titel: "EEG: Floating-PV als besondere Solaranlage",
      tocLabel: "EEG-Förderung",
      bloecke: [
        {
          typ: "p",
          text: `**Floating-PV auf künstlichen oder erheblich veränderten Gewässern zählt nach § 37 Abs. 1 Nr. 3 f EEG zu den besonderen Solaranlagen und darf an der Ausschreibung des ersten Segments teilnehmen.** Kleinere Anlagen bis 1 MW erhalten nach § 48 Abs. 1 Nr. 5 f EEG einen gesetzlich bestimmten anzulegenden Wert, der im Gesetz mit ${fmt(ANZULEGENDER_WERT_KLEIN_CT, 2)} ct/kWh angesetzt ist und sich durch die halbjährliche Degression verringert.`,
        },
        {
          typ: "p",
          text: `Für besondere Solaranlagen sieht § 37b Abs. 2 EEG einen eigenen Höchstwert von bis zu ${fmt(HOECHSTWERT_BESONDERE_CT, 1)} ct/kWh vor, § 37d EEG ein eigenes Zuschlagsverfahren. Dieses steht laut Bundesnetzagentur unter dem Vorbehalt der beihilferechtlichen Genehmigung; bis dahin konkurrieren Floating-Projekte nach unserem Recherchestand mit klassischen Freiflächen, deren Zuschläge zuletzt um ${fmt(ERLOESE.eegFreiflaecheCt, 1)} ct/kWh lagen. Wie die Ausschreibung abläuft, erklärt der Ratgeber [EEG-Ausschreibung für Freiflächen](/wissen/ratgeber/eeg-ausschreibung-freiflaeche).`,
        },
        {
          typ: "p",
          text: "Oft attraktiver als die Einspeisung ist die **Direktversorgung eines Kieswerks**: Der Strom ersetzt Netzbezug zu Gewerbestrompreisen. Das Fraunhofer ISE hat 2022 für Baden-Württemberg " + fmt(BW_SEEN) + " Baggerseen in aktiver Auskiesung untersucht und ein Potenzial von " + fmt(BW_POTENZIAL_MW.min) + " bis " + fmt(BW_POTENZIAL_MW.max) + " MW ermittelt – mit dem Hinweis, dass die Kieswerke meist einen hohen Strombedarf haben. Wie sich Direktlieferverträge gestalten lassen, zeigt der Ratgeber [PPA für Unternehmen](/wissen/ratgeber/ppa-fuer-unternehmen).",
        },
      ],
    },
    {
      id: "technik-kosten",
      titel: "Technik, Ertrag und Kosten schwimmender Solarparks",
      tocLabel: "Technik & Kosten",
      bloecke: [
        {
          typ: "p",
          text: "**Eine Floating-Anlage besteht aus Schwimmkörpern mit aufgesetzten Modulen, einer Verankerung am Gewässergrund oder am Ufer und einem Kabel an Land; die Kühlung durch das Wasser kann den Wirkungsgrad der Module verbessern.** Dafür kosten Schwimmkörper, Verankerung, Wasserbau und Montage vom Boot aus mehr als eine Rammgründung an Land.",
        },
        {
          typ: "liste",
          punkte: [
            "**Verankerung:** muss Wind, Wellen, Eis und schwankende Wasserstände aufnehmen – in Tagebauseen steigt der Wasserspiegel während der Flutung oft über Jahre.",
            "**Ausrichtung:** Viele Systeme nutzen flache Ost-West-Anordnungen mit hoher Belegungsdichte; es gibt auch vertikale bifaziale Varianten.",
            "**Elektrik:** Kabel schwimmend oder am Grund an Land, Wechselrichter meist am Ufer; hohe Anforderungen an Feuchte- und Blitzschutz.",
            "**Betrieb:** Wartung per Steg oder Boot; Vogelkot und Algenbewuchs erfordern angepasste Reinigung.",
            "**Rückbau:** Schwimmkörper sind vergleichsweise leicht zu entfernen – ein Vorteil gegenüber festen Fundamenten.",
          ],
        },
        {
          typ: "tabelle",
          caption: "Szenario: Kapitalkosten je kWh bei höheren Errichtungskosten als an Land",
          kopf: ["Szenario", "Errichtung je kWp", "Kapitalkosten je kWh (20 J.)", "Einordnung"],
          zeilen: SZENARIEN.map((s, i) => [
            i === 0 ? "Freifläche an Land (Referenz)" : `Floating, ${fmtPct(s.auf, 0)} Aufschlag`,
            `${fmt(s.capex)} €`,
            fmtCt(s.ct, 2),
            i === 0 ? `Mittelwert der ÖkoInvest-Marktübersicht` : "Rechenszenario, keine Marktangabe",
          ]),
          hervorheben: 2,
          markierteZeile: 0,
          minBreite: 680,
          fussnote: `Annuität bei ${fmt(FINANZIERUNG.zins * 100, 1)} % Zins über 20 Jahre, Ertrag ${fmt(REGION.ertrag)} kWh/kWp ohne Kühlungsbonus, ohne Betriebskosten, Netzanschluss und Pacht. Die Aufschläge sind bewusst als Spanne gewählt, weil belastbare Kostendaten für deutsche Floating-Parks bislang kaum öffentlich sind.`,
        },
        {
          typ: "p",
          text: `Die Tabelle zeigt, warum Floating-PV im Wettbewerb mit Ackerparks um ${fmt(ERLOESE.eegFreiflaecheCt, 1)} ct/kWh schwer mithalten kann, solange kein eigenes Untersegment mit höherem Höchstwert greift – und warum der Eigenverbrauch im Kieswerk so wichtig ist. Mit eigenen Annahmen rechnen Sie im [Solarpark-Rechner](/de/rechner/solarpark); den Einfluss der Anbindung ans Netz erklärt der Ratgeber [Netzanschluss für Solarparks](/wissen/ratgeber/netzanschluss-solarpark).`,
        },
      ],
    },
    {
      id: "genehmigung",
      titel: "Genehmigung: Wasserrecht, Baurecht, Naturschutz und Abbaurecht",
      tocLabel: "Genehmigung",
      bloecke: [
        {
          typ: "p",
          text: "**Ein schwimmender Solarpark braucht in der Regel eine wasserrechtliche Genehmigung nach Landesrecht, einen Bebauungsplan und eine naturschutzfachliche Prüfung; auf Gewässern im aktiven Abbau kommen Abbau- bzw. Bergrecht und Rekultivierungsauflagen hinzu.** Floating-PV ist im Außenbereich nach herrschender Einschätzung nicht nach § 35 BauGB privilegiert.",
        },
        {
          typ: "tabelle",
          caption: "Typische Verfahren für Floating-PV in Deutschland",
          kopf: ["Rechtsgebiet", "Worum es geht", "Zuständig (typisch)"],
          zeilen: [
            ["Wasserrecht", "Anlage im Gewässer, Einhaltung § 36 WHG, Verankerung, Gewässerökologie", "untere Wasserbehörde"],
            ["Baurecht", "Bebauungsplan (Sondergebiet), ggf. Änderung des Flächennutzungsplans", "Gemeinde"],
            ["Naturschutz", "Wasservögel, Rastgebiete, Amphibien, Uferzonen; Eingriffsregelung und ggf. [UVP](/wissen/lexikon#uvp)", "Naturschutzbehörde"],
            ["Abbau- und Bergrecht", "Vereinbarkeit mit laufender Auskiesung, Rekultivierungs- und Folgenutzungsplan", "Bergbehörde bzw. Abgrabungsbehörde"],
            ["Netz und Energierecht", "Anschluss oder Eigenversorgung des Kieswerks, EEG-Kategorie", "Netzbetreiber, ggf. Bundesnetzagentur"],
          ],
          minBreite: 700,
          fussnote: "Zuständigkeiten unterscheiden sich je Land. Früh eine gemeinsame Antragskonferenz mit allen Behörden anfragen.",
        },
        {
          typ: "p",
          text: "Gewässerökologisch wird vor allem diskutiert, wie sich Beschattung auf Wassertemperatur, Schichtung und Sauerstoffhaushalt auswirkt; das Fraunhofer ISE forscht dazu mit hydroökologischen Simulationen. Bei der 15-%-Grenze gelten die Effekte nach bisherigem Kenntnisstand als begrenzt. Den Ablauf eines Bebauungsplans erklärt der Ratgeber [Solarpark-Genehmigung](/wissen/ratgeber/solarpark-genehmigung-bebauungsplan), die naturschutzfachliche Seite der Ratgeber [Artenschutz im Solarpark](/wissen/ratgeber/solarpark-artenschutz-biodiversitaet).",
        },
      ],
    },
    {
      id: "eigentuemer",
      titel: "Kiesgruben und Tagebauseen: Chancen für Eigentümer",
      tocLabel: "Eigentümer",
      bloecke: [
        {
          typ: "p",
          text: `**Eigentümer von Baggerseen sind meist Kieswerke, Gemeinden oder private Grundbesitzer, bei Tagebau-Restseen häufig Bergbau- oder Sanierungsgesellschaften; sie können die Wasserfläche verpachten, selbst investieren oder den Strom im eigenen Betrieb nutzen.** Einen etablierten Pachtmarkt für Wasserflächen gibt es nach unserem Recherchestand noch nicht; die Spannen für Freiflächen an Land (${fmt(PACHT.freiflaecheProHa.min)}–${fmt(PACHT.freiflaecheProHa.max)} €/ha) sind nur ein grober Anhaltspunkt, weil die belegbare Fläche höchstens ${fmtPct(BEDECKUNG_MAX, 0)} des Sees ausmacht.`,
        },
        {
          typ: "checkliste",
          punkte: [
            "**Rekultivierungsauflagen prüfen:** Viele Abbaugenehmigungen schreiben eine Folgenutzung vor (Naturschutz, Naherholung, Fischerei). Sie muss mit der Solaranlage vereinbar sein.",
            "**Abbauphase einplanen:** Solange ausgekiest wird, dürfen Anlage und Verankerung den Betrieb nicht behindern.",
            "**Eigenverbrauch rechnen:** Ein Kieswerk mit hohem Tagesverbrauch kann den Solarstrom direkt nutzen – oft der wirtschaftlich stärkste Hebel.",
            "**Wasserrechte und Dritte:** Fischerei-, Bade- oder Angelrechte und Nachbarn berücksichtigen.",
            "**Sicherheiten vereinbaren:** Rückbausicherheit und Haftung für Schäden am Gewässer vertraglich regeln; siehe [Pachtvertrag Solarpark](/wissen/ratgeber/pachtvertrag-solarpark).",
          ],
        },
        {
          typ: "p",
          text: "Für Flächeneigentümer mit Kiesgruben oder Uferflächen lohnt sich oft eine Kombination: Landflächen am Ufer für Wechselrichter, Speicher oder eine Freiflächenanlage, der See für die schwimmende Anlage. Wie ÖkoInvest Flächen einschätzt, erfahren Sie unter [Fläche verpachten](/de/flaeche-verpachten); die Pacht für Landflächen können Sie im [Pachtrechner](/de/rechner/pacht) abschätzen.",
        },
      ],
    },
    {
      id: "beispiele",
      titel: "Beispiele für Floating-PV in Deutschland, Österreich und der Schweiz",
      tocLabel: "Beispiele DACH",
      bloecke: [
        {
          typ: "p",
          text: "**Die größten schwimmenden Anlagen im DACH-Raum liegen auf gefluteten Tagebauen und Baggerseen.** Die folgenden Beispiele beruhen auf öffentlich zugänglichen Angaben:",
        },
        {
          typ: "karten",
          cols: 3,
          items: [
            { titel: "Cottbuser Ostsee (Brandenburg)", text: `Auf dem gefluteten Braunkohletagebau entstand bis 2024 eine schwimmende Anlage mit rund ${fmt(COTTBUS_MWP)} MWp auf etwa ${fmt(COTTBUS_HA)} ha – nach damaligen Angaben die größte Deutschlands.` },
            { titel: "Grafenwörth (Niederösterreich)", text: `Seit 2023 in Betrieb, ${fmt(GRAFENWOERTH_MWP, 1)} MWp auf Baggerseen, errichtet von EVN und ecowind – bei Inbetriebnahme als größte Floating-PV Mitteleuropas beschrieben.` },
            { titel: "Lac des Toules (Wallis)", text: "Alpine Pilotanlage auf einem Stausee auf rund 1.800 m Höhe, die auch mit abgesenktem Wasserspiegel im Winter betrieben wird." },
          ],
        },
        {
          typ: "p",
          text: "Daneben gibt es in Deutschland zahlreiche kleinere Anlagen auf Baggerseen, häufig im Megawatt-Bereich, die überwiegend das angrenzende Kieswerk versorgen – etwa am Silbersee III in Haltern am See.",
        },
      ],
    },
    {
      id: "oesterreich-schweiz",
      titel: "Floating-PV in Österreich und der Schweiz",
      tocLabel: "Österreich & Schweiz",
      bloecke: [
        {
          typ: "p",
          text: "**In Österreich ist uns eine starre bundesweite Bedeckungsgrenze wie in § 36 WHG nicht bekannt; maßgeblich sind die wasserrechtliche Bewilligung nach dem Wasserrechtsgesetz 1959 sowie Naturschutz- und Raumordnungsrecht der Länder.** Gefördert wird wie bei anderen Anlagen über das EAG. Zu Widmung, Zonierung und Förderung im Überblick: Ratgeber [Freiflächen-PV in Österreich](/wissen/ratgeber/freiflaechen-pv-oesterreich).",
        },
        {
          typ: "p",
          text: "In der **Schweiz** kommen vor allem Stauseen und künstliche Becken in Betracht; Gewässerschutz und Landschaftsschutz sind streng. Die alpine Pilotanlage am Lac des Toules zeigt die technische Machbarkeit. Einordnung der Rahmenbedingungen im Ratgeber [Freiflächen-PV in der Schweiz](/wissen/ratgeber/freiflaechen-pv-schweiz).",
        },
      ],
    },
    {
      id: "vorgehen",
      titel: "So prüfen Sie ein Floating-PV-Projekt",
      tocLabel: "Vorgehen",
      bloecke: [
        {
          typ: "ablauf",
          schritte: [
            ["Gewässer einordnen", "Künstlich oder erheblich verändert? Seefläche, Tiefe, Wasserstandsschwankungen und Uferverlauf erfassen."],
            ["Belegbare Fläche rechnen", `${fmtPct(BEDECKUNG_MAX, 0)} der Wasserfläche, ${fmt(UFERABSTAND_M)} m Uferabstand – daraus folgt die mögliche Leistung.`],
            ["Nutzung und Auflagen klären", "Laufender Abbau, Rekultivierungsplan, Fischerei, Baden, Naturschutz."],
            ["Stromabnahme festlegen", "Eigenverbrauch im Kieswerk, PPA oder EEG-Einspeisung; Netzanschluss anfragen."],
            ["Behörden früh einbinden", "Wasserbehörde, Gemeinde, Naturschutz und ggf. Bergbehörde an einen Tisch holen."],
          ],
        },
        {
          typ: "p",
          text: "Eine erste Einschätzung für Uferflächen und angrenzende Grundstücke liefert der [Flächencheck](/de/flaechencheck). Wer ein Projekt in fortgeschrittenem Stadium sucht oder anbieten möchte, findet dafür die [Projektbörse](/projektboerse).",
        },
      ],
    },
  ],

  faq: [
    {
      q: "Darf man auf jedem See eine schwimmende Solaranlage bauen?",
      a: "Nein. Auf natürlichen Seen sind Solaranlagen nach § 36 Abs. 3 WHG verboten. Zulässig sind sie nur auf künstlichen oder erheblich veränderten Gewässern wie Baggerseen, Tagebau-Restseen oder Speicherbecken.",
    },
    {
      q: "Wie viel Prozent eines Sees darf mit Floating-PV bedeckt werden?",
      a: `Höchstens ${fmtPct(BEDECKUNG_MAX, 0)} der Gewässerfläche, und der Abstand zum Ufer muss mindestens ${fmt(UFERABSTAND_M)} m betragen. Stand ${STAND} gelten diese Grenzen unverändert.`,
    },
    {
      q: "Wird Floating-PV im EEG gefördert?",
      a: `Ja, als besondere Solaranlage nach § 37 Abs. 1 Nr. 3 f EEG in der Ausschreibung; bis 1 MW gilt ein gesetzlich bestimmter anzulegender Wert. Ein eigenes Untersegment mit Höchstwert bis ${fmt(HOECHSTWERT_BESONDERE_CT, 1)} ct/kWh ist vorgesehen, steht aber unter beihilferechtlichem Vorbehalt.`,
    },
    {
      q: "Ist Floating-PV teurer als ein Solarpark an Land?",
      a: "In der Regel ja, weil Schwimmkörper, Verankerung und Montage auf dem Wasser mehr kosten. Die Kühlung durch das Wasser kann den Ertrag verbessern, gleicht die Mehrkosten aber meist nicht vollständig aus. Besonders wirtschaftlich ist die Direktversorgung eines Kieswerks.",
    },
    {
      q: "Wie viel Leistung passt auf einen 50-Hektar-Baggersee?",
      a: `Unter der 15-%-Grenze etwa ${fmt(SEE50.belegbar, 1)} ha belegbare Fläche und damit – je nach System – grob ${fmt(SEE50.mwp, 0)} MWp. Das ist eine Orientierung; Form des Sees, Tiefe und Auflagen können das deutlich ändern.`,
    },
    {
      q: "Was bekommt der Eigentümer eines Baggersees?",
      a: "Einen etablierten Pachtmarkt für Wasserflächen gibt es noch nicht. Üblich sind individuelle Nutzungsverträge; für Kieswerke ist die Eigenversorgung mit günstigem Strom oft wertvoller als eine Pacht.",
    },
  ],

  passend: [
    { href: "/wissen/ratgeber/moor-pv", titel: "Moor-PV", text: "Solarparks auf wiedervernässten Moorböden." },
    { href: "/wissen/ratgeber/netzanschluss-solarpark", titel: "Netzanschluss für Solarparks", text: "Ablauf, Kosten und Überbauung." },
    { href: "/wissen/ratgeber/ppa-fuer-unternehmen", titel: "PPA für Unternehmen", text: "Solarstrom direkt an Kieswerk und Gewerbe liefern." },
    { href: pfad("/flaeche-verpachten"), titel: "Fläche verpachten", text: "Ablauf und Voraussetzungen für Eigentümer." },
  ],

  quellen: [
    { titel: "Wasserhaushaltsgesetz, § 36 – Anlagen in, an, über und unter oberirdischen Gewässern", url: "https://www.gesetze-im-internet.de/whg_2009/__36.html", stand: "09/2026" },
    { titel: "Wasserhaushaltsgesetz, § 3 – Begriffsbestimmungen (künstliche und erheblich veränderte Gewässer)", url: "https://www.gesetze-im-internet.de/whg_2009/__3.html", stand: "09/2026" },
    { titel: "EEG 2023, § 37 – Gebote für Solaranlagen des ersten Segments (Nr. 3 f Gewässer)", url: "https://www.gesetze-im-internet.de/eeg_2014/__37.html", stand: "09/2026" },
    { titel: "EEG 2023, § 48 – Solaranlagen (anzulegender Wert bis 1 MW)", url: "https://www.gesetze-im-internet.de/eeg_2014/__48.html", stand: "09/2026" },
    { titel: "Fraunhofer ISE – Schwimmende Photovoltaik (FPV)", url: "https://www.ise.fraunhofer.de/de/geschaeftsfelder/solarkraftwerke-und-integrierte-photovoltaik/integrierte-photovoltaik/schwimmende-photovoltaik-fpv.html", stand: "09/2026" },
    { titel: "Fraunhofer ISE – Large potential for floating PV on pit lakes in the Upper Rhine Valley (07/2022)", url: "https://www.ise.fraunhofer.de/en/press-media/news/2022/large-potential-for-floating-pv-on-pit-lakes-in-the-upper-rhine-valley.html", stand: "09/2026" },
    { titel: "Bundesnetzagentur – Besondere Solaranlagen", url: "https://www.bundesnetzagentur.de/DE/Fachthemen/ElektrizitaetundGas/Ausschreibungen/Solaranlagen1/BesondereSolaranlagen/start.html", stand: "09/2026" },
  ],

  seitenCta: {
    titel: "Baggersee oder Uferfläche?",
    text: "Belegbare Fläche, Netz und Planungsrecht einschätzen lassen.",
    href: pfad("/flaechencheck"),
    label: "Zum Flächencheck",
  },
  cta: {
    title: "Wasserfläche oder Kiesgrube – lassen Sie das Potenzial prüfen.",
    text: "Wir schätzen ein, ob sich Ihr Gewässer oder Ihre Uferfläche für Floating-PV oder einen Solarpark eignet. Für Flächeneigentümer ist die Plattform von ÖkoInvest kostenfrei.",
    primary: { label: "Zum Flächencheck", href: pfad("/flaechencheck") },
    secondary: { label: "Fläche verpachten", href: pfad("/flaeche-verpachten") },
  },
};

export default artikel;
