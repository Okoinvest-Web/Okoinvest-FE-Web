// Ratgeber: Moor-PV – Photovoltaik auf wiedervernässten Moorböden
// Recherchestand 29.09.2026: EEG 2023 §§ 3 Nr. 34a, 37 Abs. 1 Nr. 3 e, 37b Abs. 2, 37d, 48 Abs. 1 Nr. 5 e;
// Bundesnetzagentur, Festlegung besondere Solaranlagen Grünland/Moor (Az. 4.08.01.01/1#4, 01.07.2023);
// Clearingstelle EEG|KWKG, Häufige Rechtsfrage 232; Bundesumweltministerium (Moorschutz);
// Fraunhofer ISE (Moor-PV, Handreichung 07/2026, Projekt MoorPower). Marktzahlen aus src/lib/invest/markt.js.

import { FREIFLAECHE, REGIONEN, PACHT, ALLGEMEIN, ERLOESE, STAND } from "@/lib/invest/markt";
import { fmt, fmtPct } from "@/lib/rechner/annahmen";
import { pfad } from "../../lib/land/index.js";

/* Werte, die (noch) nicht in markt.js stehen – Vorschlag zur Übernahme */
// Bundesumweltministerium, Moorschutz: Moorböden ca. 18.400 km², rund 53 Mio. t CO₂-Äq. jährlich, ~7,5 % der Emissionen
const MOOR_FLAECHE_HA = 1840000;
const MOOR_EMISSIONEN_T = 53e6;
const MOOR_ANTEIL_EMISSIONEN = 0.075;
// Nationale Moorschutzstrategie (Kabinett 09.11.2022): mindestens 5 Mio. t CO₂-Äq. weniger bis 2030
const MOORSCHUTZ_ZIEL_T = 5e6;
// Clearingstelle EEG|KWKG, Häufige Rechtsfrage 232 (nach BNetzA-Festlegung): Mindestwasserstände unter Flur
const WASSER_WINTER_CM = 10;
const WASSER_SOMMER_CM = 30;
// Fraunhofer ISE, Handreichung Moor-PV (07/2026, laut Solarserver 22.07.2026): technisches Potenzial
const POTENZIAL_GWP = { min: 134, max: 268 };
const POTENZIAL_HA = 334500;
// EEG § 37b Abs. 2: Höchstwert besondere Solaranlagen, Obergrenze ct/kWh; § 48 Abs. 1: anzulegender Wert bis 1 MW (vor Degression)
const HOECHSTWERT_BESONDERE_CT = 9.5;
const ANZULEGENDER_WERT_KLEIN_CT = 7.0;
// BMBF-Projekt MoorPower (Fraunhofer ISE u. a.): Förderung, Laufzeit, Versuchsfläche MV
const MOORPOWER_MIO = 7;
const MOORPOWER_VERSUCH_HA = 6;

/* Klimawirkung je Hektar (Beispielrechnung) */
const REGION = REGIONEN.find((r) => r.id === "de-nord"); // Moore liegen überwiegend in Norddeutschland
const MWP_HA = 1 / FREIFLAECHE.haProMwp;
const MWH_HA = MWP_HA * REGION.ertrag;
const CO2_STROM_T = (MWH_HA * 1000 * ALLGEMEIN.co2KgProKwh) / 1000;
const CO2_BODEN_T = MOOR_EMISSIONEN_T / MOOR_FLAECHE_HA; // rechnerischer Durchschnitt aller Moorböden

const artikel = {
  slug: "moor-pv",
  title: "Moor-PV: Solarpark auf wiedervernässtem Moor – Regeln und Technik",
  seoTitle: "Moor-PV: Photovoltaik auf Moorböden | ÖkoInvest",
  kurzTitel: "Moor-PV",
  description:
    "Moor-PV: Voraussetzungen im EEG für Solarparks auf wiedervernässten Moorböden, Wasserstände, Förderung, Technik auf nassen Böden, Pilotprojekte und Grenzen.",
  excerpt:
    "Entwässerte Moore gehören zu den größten Emissionsquellen der Landwirtschaft. Moor-PV verbindet Wiedervernässung und Solarstrom. Was das EEG verlangt, wie gebaut wird und was Eigentümer wissen sollten.",
  hauptKeyword: "moor pv",
  keywords: [
    "Moor-PV",
    "Photovoltaik Moorboden",
    "Solarpark wiedervernässtes Moor",
    "Moor-Photovoltaik EEG",
    "besondere Solaranlagen Moor",
    "Wiedervernässung Photovoltaik",
    "Moor-PV Pacht",
  ],
  veroeffentlicht: "2026-09-29",
  aktualisiert: "2026-09-29",
  kategorie: "Fläche & Pacht",
  bild: "/img/montage-freiflaeche.jpg",
  bildAlt: "Monteur mit Schutzhelm befestigt Solarmodule auf einer Unterkonstruktion über einer Wiese",
  badge: { wert: `${fmt(MOOR_EMISSIONEN_T / 1e6)} Mio. t`, text: "CO₂-Äquivalente jährlich aus Moorböden in Deutschland" },

  kurzFazit: [
    "**Moor-PV ist nach § 37 Abs. 1 Nr. 3 e EEG eine besondere Solaranlage auf Moorböden, die entwässert und landwirtschaftlich genutzt wurden und mit dem Bau dauerhaft wiedervernässt werden.**",
    `Nach der Festlegung der Bundesnetzagentur müssen Mindestwasserstände erreicht werden – laut Clearingstelle höchstens rund ${fmt(WASSER_WINTER_CM)} cm unter Flur im Winter und ${fmt(WASSER_SOMMER_CM)} cm im Sommer; die Wasserbehörde bestätigt die Wiedervernässung.`,
    `Entwässerte Moorböden verursachen rund **${fmt(MOOR_EMISSIONEN_T / 1e6)} Mio. t CO₂-Äquivalente im Jahr**, etwa ${fmtPct(MOOR_ANTEIL_EMISSIONEN)} der deutschen Emissionen. Moor-PV kann die Wiedervernässung finanzieren.`,
    `Das Fraunhofer ISE beziffert das technische Potenzial auf **${fmt(POTENZIAL_GWP.min)} bis ${fmt(POTENZIAL_GWP.max)} GWp** auf landwirtschaftlich genutzten Moorböden ohne naturschutzrechtliche Einschränkungen.`,
    "Technisch anspruchsvoll sind Gründung, Korrosion und Befahrbarkeit. Für Eigentümer ist die Wiedervernässung praktisch eine Entscheidung auf Dauer – das gehört in Pacht und Bewertung.",
  ],

  abschnitte: [
    {
      id: "antwort",
      titel: "Was ist Moor-PV?",
      tocLabel: "Kurze Antwort",
      bloecke: [
        {
          typ: "p",
          text: "**Moor-PV bezeichnet Photovoltaikanlagen auf Moorböden, die bisher entwässert und landwirtschaftlich genutzt wurden und beim Bau des Solarparks dauerhaft wieder vernässt werden.** Der Strom finanziert die Wiedervernässung, und der nasse Boden hört auf, Kohlenstoff als CO₂ freizusetzen. Im EEG zählt Moor-PV seit 2023 zu den [besonderen Solaranlagen](/wissen/lexikon#besondere-solaranlagen) und darf an der Ausschreibung teilnehmen.",
        },
        {
          typ: "p",
          text: "Für landwirtschaftliche Betriebe in Moorregionen – vor allem in der Norddeutschen Tiefebene und im Alpenvorland – ist das eine neue Option. Die klassische Nutzung als Acker oder intensives Grünland setzt Entwässerung voraus; nach der Wiedervernässung bleibt meist nur eine nasse Bewirtschaftung, etwa Paludikultur. Moor-PV kann dafür eine langfristige Einnahmequelle schaffen. Einen Überblick über alle Nutzungsformen im Moor und auf Wasser gibt der Ratgeber [Floating-PV](/ratgeber/floating-pv) für künstliche Gewässer.",
        },
        {
          typ: "kennzahl",
          wert: `${fmt(POTENZIAL_GWP.min)}–${fmt(POTENZIAL_GWP.max)} GWp`,
          titel: "technisches Potenzial für Moor-PV in Deutschland",
          text: `Fraunhofer ISE, Handreichung Moor-PV (Juli 2026), bezogen auf rund ${fmt(POTENZIAL_HA)} ha landwirtschaftlich genutzte Moorböden ohne naturschutzrechtliche Einschränkungen.`,
        },
      ],
    },
    {
      id: "klimaschutz",
      titel: "Warum Moor-PV doppelt Klimaschutz leisten kann",
      tocLabel: "Klimawirkung",
      bloecke: [
        {
          typ: "p",
          text: `**Ein wiedervernässtes Moor stoppt die Zersetzung des Torfs, und die Solaranlage ersetzt fossil erzeugten Strom – beides zusammen ergibt einen doppelten Klimaeffekt.** Laut Bundesumweltministerium nehmen Moorböden nur rund 5 % der Fläche Deutschlands ein, verursachen aber etwa ${fmt(MOOR_EMISSIONEN_T / 1e6)} Mio. t CO₂-Äquivalente im Jahr. Die Nationale Moorschutzstrategie will diese Emissionen bis 2030 um mindestens ${fmt(MOORSCHUTZ_ZIEL_T / 1e6)} Mio. t senken.`,
        },
        {
          typ: "tabelle",
          caption: "Klimawirkung je Hektar – überschlägige Beispielrechnung",
          kopf: ["Effekt", "Größenordnung je ha und Jahr", "Herleitung"],
          zeilen: [
            ["Vermiedene Emissionen durch Solarstrom", `rund ${fmt(CO2_STROM_T)} t CO₂`, `${fmt(MWP_HA, 2)} MWp/ha × ${fmt(REGION.ertrag)} kWh/kWp × ${fmt(ALLGEMEIN.co2KgProKwh, 2)} kg CO₂/kWh (UBA)`],
            ["Emissionen entwässerter Moorböden (Durchschnitt)", `rund ${fmt(CO2_BODEN_T)} t CO₂-Äq.`, `${fmt(MOOR_EMISSIONEN_T / 1e6)} Mio. t ÷ ${fmt(MOOR_FLAECHE_HA / 1e6, 2)} Mio. ha Moorböden (BMUV); Acker auf Moor liegt deutlich darüber`],
            ["Wirkung der Wiedervernässung", "ein großer Teil der Bodenemissionen entfällt", "abhängig von Wasserstand, Vegetation und Ausgangszustand; Methan kann zunächst steigen"],
          ],
          hervorheben: 1,
          minBreite: 700,
          fussnote: "Grobe Orientierung. Die Belegungsdichte einer Moor-PV-Anlage kann niedriger sein als bei klassischen Parks; die Bodenemissionen je Hektar schwanken stark mit Nutzung und Torfzustand.",
        },
        {
          typ: "p",
          text: "Rechnerisch ist der Stromeffekt je Hektar größer als der Bodeneffekt. Der Bodeneffekt hat aber einen besonderen Wert: Er ist über Jahrzehnte gesichert, solange der Wasserstand gehalten wird, und er hilft im Landnutzungssektor, in dem Deutschland seine Ziele sonst kaum erreicht. Genau deshalb bindet das EEG die Förderung an die dauerhafte Wiedervernässung und nicht nur an den Standort.",
        },
      ],
    },
    {
      id: "eeg-voraussetzungen",
      titel: "Voraussetzungen im EEG: Wann ein Moor-Solarpark förderfähig ist",
      tocLabel: "Voraussetzungen EEG",
      bloecke: [
        {
          typ: "p",
          text: "**Förderfähig ist eine Anlage auf einem Moorboden, der entwässert und landwirtschaftlich genutzt worden ist, wenn die Fläche mit der Errichtung dauerhaft wiedervernässt wird (§ 37 Abs. 1 Nr. 3 e und § 48 Abs. 1 Nr. 5 e EEG).** Was ein Moorboden ist, bestimmt § 3 Nr. 34a EEG über den Verweis auf § 11 Abs. 2 der GAP-Konditionalitäten-Verordnung – also dieselbe Kulisse, die auch in der Agrarförderung gilt.",
        },
        {
          typ: "tabelle",
          caption: "Anforderungen an Moor-PV nach EEG und BNetzA-Festlegung, Stand September 2026",
          kopf: ["Anforderung", "Inhalt", "Nachweis"],
          zeilen: [
            ["Moorboden", "Boden im Sinne von § 11 Abs. 2 GAP-Konditionalitäten-Verordnung (§ 3 Nr. 34a EEG)", "Kulisse der Agrarverwaltung, ggf. Bodengutachten"],
            ["Vorherige Nutzung", "entwässert und landwirtschaftlich genutzt", "Nutzungshistorie, z. B. Agrarantragsdaten"],
            ["Dauerhafte Wiedervernässung", `Mindestwasserstände: nach Clearingstelle höchstens rund ${fmt(WASSER_WINTER_CM)} cm unter Flur im Winter, ${fmt(WASSER_SOMMER_CM)} cm im Sommer`, "Bestätigung der zuständigen Wasserbehörde gegenüber dem Netzbetreiber"],
            ["Zeitpunkt", "Bau darf noch auf entwässertem Boden erfolgen; Wiedervernässung vor Inbetriebnahme beginnen und danach unverzüglich abschließen", "Dokumentation der Maßnahmen"],
            ["Nutzung der Fläche", "standortangepasste nasse Bewirtschaftung bleibt zulässig", "keine Pflicht zur Paludikultur"],
            ["Errichtung und Betrieb", "Anforderungen an Bauweise und Betrieb nach der BNetzA-Festlegung (Az. 4.08.01.01/1#4)", "Nachweise nach Festlegung"],
          ],
          minBreite: 760,
          fussnote: "Quellen: EEG 2023; Bundesnetzagentur, Festlegung zu besonderen Solaranlagen auf Grünland und Moorböden vom 01.07.2023; Clearingstelle EEG|KWKG, Häufige Rechtsfrage 232. Maßgeblich ist der Wortlaut der Festlegung.",
        },
        {
          typ: "kasten",
          variant: "recht",
          titel: "Wasserrecht und Nachbarn",
          text: "Eine Wiedervernässung verändert den Wasserhaushalt – oft auch auf angrenzenden Flächen. Je nach Maßnahme (Gräben verschließen, Stauwehre, Pumpen abstellen) sind wasserrechtliche Erlaubnisse oder Genehmigungen nötig, und Nachbarn, Wasser- und Bodenverbände müssen eingebunden werden. Das ist häufig der aufwendigste Teil der Projektentwicklung.",
        },
        {
          typ: "p",
          text: "Baurechtlich braucht Moor-PV wie jeder größere Solarpark in der Regel einen [Bebauungsplan](/wissen/lexikon#bebauungsplan). Moorflächen liegen zudem häufig in oder neben Schutzgebieten; Artenschutz und Landschaftsbild spielen eine große Rolle. Den Ablauf des Verfahrens erklärt der Ratgeber [Solarpark-Genehmigung](/ratgeber/solarpark-genehmigung-bebauungsplan), die naturschutzfachliche Seite der Ratgeber [Artenschutz im Solarpark](/ratgeber/solarpark-artenschutz-biodiversitaet).",
        },
      ],
    },
    {
      id: "foerderung",
      titel: "Förderung: Ausschreibung, Höchstwert und Untersegment",
      tocLabel: "Förderung",
      bloecke: [
        {
          typ: "p",
          text: `**Moor-PV über 1 MW nimmt an der [EEG-Ausschreibung](/wissen/lexikon#ausschreibung-eeg) für Solaranlagen des ersten Segments teil; für besondere Solaranlagen sieht das Gesetz einen eigenen Höchstwert von bis zu ${fmt(HOECHSTWERT_BESONDERE_CT, 1)} ct/kWh vor (§ 37b Abs. 2 EEG).** Das eigene Untersegment nach § 37d EEG steht nach Angaben der Bundesnetzagentur unter dem Vorbehalt der beihilferechtlichen Genehmigung; bis dahin konkurrieren besondere Solaranlagen nach unserem Recherchestand im regulären Verfahren.`,
        },
        {
          typ: "tabelle",
          caption: `Vermarktungswege für Moor-PV, Stand ${STAND}`,
          kopf: ["Weg", "Anlagengröße", "Vergütung", "Einordnung"],
          zeilen: [
            ["EEG-Ausschreibung (erstes Segment)", "über 1 MW", `Zuschlag zum eigenen Gebotswert; Freifläche zuletzt um ${fmt(ERLOESE.eegFreiflaecheCt, 1)} ct/kWh`, "höhere Kosten der Moor-PV müssen im Wettbewerb getragen werden"],
            ["Untersegment besondere Solaranlagen (§ 37d)", "über 1 MW", `Höchstwert bis ${fmt(HOECHSTWERT_BESONDERE_CT, 1)} ct/kWh vorgesehen`, "unter beihilferechtlichem Vorbehalt"],
            ["Gesetzlich bestimmter anzulegender Wert", "bis 1 MW", `im Gesetz ${fmt(ANZULEGENDER_WERT_KLEIN_CT, 2)} ct/kWh, verringert um die halbjährliche Degression`, "für kleinere Pilotanlagen"],
            ["PPA / Direktlieferung", "beliebig", `Solar-PPA etwa ${fmt(ERLOESE.ppaCt.min, 1)}–${fmt(ERLOESE.ppaCt.max, 1)} ct/kWh`, "Klimanutzen kann für Abnehmer ein Argument sein"],
          ],
          hervorheben: 2,
          minBreite: 760,
          fussnote: "Quellen: §§ 37b, 37d, 48 EEG; Bundesnetzagentur, Bekanntmachungen zu den Gebotsterminen. Zuschlagswerte und Höchstwerte ändern sich je Termin.",
        },
        {
          typ: "p",
          text: "Ob sich ein Projekt trägt, hängt stark davon ab, ob das Untersegment mit höherem Höchstwert tatsächlich startet. Im regulären Wettbewerb mit günstigen Ackerparks haben Moor-PV-Projekte es schwer, weil Gründung, Wasserbau und Genehmigung mehr kosten. Ergänzende Mittel aus Förderprogrammen für Moorklimaschutz können helfen; welche Programme greifen, unterscheidet sich je Land. Die allgemeinen Regeln der Ausschreibung erklärt der Ratgeber [EEG-Ausschreibung für Freiflächen](/ratgeber/eeg-ausschreibung-freiflaeche).",
        },
      ],
    },
    {
      id: "technik",
      titel: "Technik: Wie baut man einen Solarpark auf nassem Moorboden?",
      tocLabel: "Technik",
      bloecke: [
        {
          typ: "p",
          text: "**Die größten technischen Herausforderungen sind nach Fraunhofer ISE die geringe Tragfähigkeit des Torfs, die schwankende Torfmächtigkeit, Korrosion im nassen, oft sauren Milieu und die Befahrbarkeit während Bau und Betrieb.** Es gibt dafür Lösungen, aber keine Standardbauweise wie beim Ackerpark.",
        },
        {
          typ: "tabelle",
          caption: "Herausforderungen und typische Lösungsansätze bei Moor-PV",
          kopf: ["Herausforderung", "Warum", "Lösungsansätze"],
          zeilen: [
            ["Gründung", "Torf trägt kaum, setzt sich und quillt", "Rammpfähle, die bis in den tragfähigen mineralischen Untergrund reichen – bei geringer Torfmächtigkeit gut machbar, bei tiefem Torf aufwendig; Schraub- oder Sonderfundamente"],
            ["Korrosion", "dauerhaft nasser, teils saurer Boden", "Materialwahl und Beschichtung auf das Bodenmilieu abstimmen, Korrosionsgutachten"],
            ["Befahrbarkeit", "schwere Maschinen sinken ein, Torf wird verdichtet", "Bau vor der Wiedervernässung (zulässig), leichte Kettenfahrzeuge, Baustraßen, Matten"],
            ["Aufständerung", "Wasser, Vegetation und Pflege unter den Modulen", "höhere Unterkonstruktion, größere Reihenabstände, ggf. Pflege mit angepasster Technik"],
            ["Kabel und Wechselrichter", "Feuchtigkeit, Setzungen", "erhöhte Kabelführung, Stationen auf Fundamenten außerhalb der nassesten Bereiche"],
          ],
          minBreite: 760,
          fussnote: "Nach Fraunhofer ISE (Moor-PV) und allgemeiner Baupraxis; konkrete Auslegung immer mit Bodengutachten und Tragwerksplanung.",
        },
        {
          typ: "p",
          text: "Weil der Bau vor der Wiedervernässung erfolgen darf, planen viele Projekte die Reihenfolge bewusst: erst Rammung und Montage auf dem noch entwässerten Boden, dann Gräben schließen und Wasserstände anheben. Für den Betrieb heißt das: Wartung und Grünpflege müssen im nassen Zustand funktionieren. Wie die Betriebskosten sonst aussehen, zeigt die Annahme von rund " + fmt(FREIFLAECHE.opexProKwp) + " €/kWp und Jahr für klassische Parks – bei Moor-PV ist mit Aufschlägen zu rechnen.",
        },
      ],
    },
    {
      id: "pilotprojekte",
      titel: "Pilot- und Forschungsprojekte zu Moor-PV",
      tocLabel: "Pilotprojekte",
      bloecke: [
        {
          typ: "p",
          text: "**Moor-PV steht in Deutschland noch am Anfang; die Erfahrungen stammen vor allem aus Pilotanlagen und Forschungsprojekten.** Das Fraunhofer ISE nennt eine Pilotanlage in Lottorf (Schleswig-Holstein), die von der Firma Wattmanufactur betrieben wird.",
        },
        {
          typ: "karten",
          cols: 3,
          items: [
            { titel: "Pilotanlage Lottorf (SH)", text: "Vom Fraunhofer ISE begleitete Moor-PV-Anlage in Schleswig-Holstein, Betreiber Wattmanufactur." },
            { titel: "Forschungsprojekt MoorPower", text: `Fraunhofer ISE, Universitäten Greifswald und Hohenheim sowie Thünen-Institut; rund ${fmt(MOORPOWER_MIO)} Mio. € Förderung des Bundes. Versuchsfläche von ${fmt(MOORPOWER_VERSUCH_HA)} ha in Mecklenburg-Vorpommern mit unterschiedlichen Aufständerungen und Fundamenten.` },
            { titel: "Handreichung Moor-PV", text: "Fraunhofer ISE mit Greifswald Moor Centrum und weiteren Partnern (Juli 2026): Stand der Technik für Planung, Bau, Wartung und Rückbau." },
          ],
        },
        {
          typ: "p",
          text: "Die Forschung soll vor allem klären, wie sich Wasserstand, Treibhausgasbilanz und Vegetation unter den Modulen entwickeln und ob sich Moor-PV mit Paludikultur kombinieren lässt. Belastbare Langzeitwerte über Erträge, Betriebskosten und Emissionsminderung gibt es nach aktuellem Stand noch nicht – das sollten Investoren und Eigentümer bei der Bewertung berücksichtigen.",
        },
      ],
    },
    {
      id: "eigentuemer",
      titel: "Was Moor-PV für Eigentümer und Pacht bedeutet",
      tocLabel: "Eigentümer & Pacht",
      bloecke: [
        {
          typ: "p",
          text: `**Für Moor-PV gibt es noch keinen etablierten Pachtmarkt; als Orientierung dienen die Spannen für Freiflächen von ${fmt(PACHT.freiflaecheProHa.min)} bis ${fmt(PACHT.freiflaecheProHa.max)} €/ha, wobei höhere Bau- und Wasserbaukosten den Spielraum eher begrenzen.** Wichtiger als die Zahl je Hektar ist die Frage, was nach der Wiedervernässung mit der Fläche geschieht.`,
        },
        {
          typ: "checkliste",
          punkte: [
            "**Dauerhaftigkeit:** Eine Wiedervernässung ist praktisch kaum umkehrbar. Nach Ende der Pacht bleibt in der Regel eine nasse Fläche – mit anderem Verkehrswert als ein entwässertes Grünland.",
            "**Rückbau regeln:** Wer baut die Anlage zurück, und wie wird der Boden danach hinterlassen? Eine Rückbausicherheit gehört in jeden Vertrag, siehe [Pachtvertrag Solarpark](/ratgeber/pachtvertrag-solarpark).",
            "**Nachbarflächen:** Steigt der Wasserstand auch bei Nachbarn, braucht es deren Zustimmung oder eine Abgrenzung – sonst droht Streit.",
            "**Agrarförderung klären:** Ob und in welchem Umfang die Fläche für GAP-Zahlungen förderfähig bleibt, hängt von Nutzung und Landesregeln ab; siehe [GAP-Direktzahlungen](/wissen/lexikon#gap-direktzahlungen).",
            "**Steuern prüfen:** Verpachtung und Nutzungsänderung können Folgen für Erbschaft- und Grundsteuer haben; siehe [Erbschaft- und Grundsteuer bei PV-Pacht](/ratgeber/pv-pacht-erbschaftsteuer-grundsteuer).",
            "**Grundbuch sichern:** Solarpark und Wasserstand werden über lange Zeit per Dienstbarkeit gesichert, siehe [Dienstbarkeit im Grundbuch](/ratgeber/dienstbarkeit-grundbuch-pv-pacht).",
          ],
        },
        {
          typ: "tool",
          href: pfad("/rechner/pacht"),
          titel: "Pacht für Ihre Fläche abschätzen",
          text: "Fest- und Umsatzpacht über die Laufzeit berechnen – als erste Orientierung auch für Sonderstandorte.",
          label: "Zum Pachtrechner",
        },
      ],
    },
    {
      id: "grenzen",
      titel: "Grenzen und Risiken von Moor-PV",
      tocLabel: "Grenzen",
      bloecke: [
        {
          typ: "p",
          text: "**Moor-PV eignet sich nicht für jedes Moor: Naturnahe und geschützte Moore sind tabu, und auf tiefgründigem Torf werden Gründung und Wasserbau schnell unwirtschaftlich.** Zudem ist die Förderung an Bedingungen geknüpft, deren Einhaltung über die gesamte Laufzeit nachgewiesen werden muss.",
        },
        {
          typ: "liste",
          punkte: [
            "**Kosten:** Mehrkosten für Gründung, Korrosionsschutz, Wasserbau und Monitoring – im regulären Ausschreibungswettbewerb schwer zu tragen.",
            "**Genehmigung:** Wasserrecht, Naturschutz und Bebauungsplan müssen zusammenpassen; Verfahren dauern oft länger als bei Ackerparks.",
            "**Betriebsrisiko:** Werden die Wasserstände nicht gehalten, kann der Förderanspruch gefährdet sein.",
            "**Datenlage:** Langzeiterfahrungen zu Ertrag, Setzungen und Treibhausgasbilanz fehlen noch.",
            "**Netz:** Moorregionen liegen oft abseits großer Umspannwerke; die Kosten der Anbindung erklärt der Ratgeber [Netzanschluss für Solarparks](/ratgeber/netzanschluss-solarpark).",
          ],
        },
        {
          typ: "p",
          text: "In **Österreich** und der **Schweiz** gibt es nach unserem Recherchestand keine eigene Förderkategorie für Moor-PV. In der Schweiz stehen Moore von besonderer Schönheit und nationaler Bedeutung zudem unter dem Schutz der Bundesverfassung (Art. 78 Abs. 5 BV); Solaranlagen kommen dort nicht in Betracht. Für Flächen in Deutschland lohnt eine erste Einschätzung im [Flächencheck](/flaechencheck).",
        },
      ],
    },
  ],

  faq: [
    {
      q: "Was ist Moor-PV?",
      a: "Eine Photovoltaikanlage auf einem zuvor entwässerten und landwirtschaftlich genutzten Moorboden, der mit dem Bau dauerhaft wiedervernässt wird. Im EEG ist sie eine besondere Solaranlage (§ 37 Abs. 1 Nr. 3 e).",
    },
    {
      q: "Welche Wasserstände muss Moor-PV einhalten?",
      a: `Die Bundesnetzagentur hat Mindestwasserstände festgelegt. Laut Clearingstelle EEG|KWKG darf der Wasserstand im Winter höchstens rund ${fmt(WASSER_WINTER_CM)} cm und im Sommer höchstens rund ${fmt(WASSER_SOMMER_CM)} cm unter Flur liegen. Maßgeblich ist der Wortlaut der Festlegung.`,
    },
    {
      q: "Wird Moor-PV besser gefördert als ein normaler Solarpark?",
      a: `Das EEG sieht für besondere Solaranlagen einen höheren Höchstwert von bis zu ${fmt(HOECHSTWERT_BESONDERE_CT, 1)} ct/kWh und ein eigenes Untersegment vor. Dieses steht nach Angaben der Bundesnetzagentur unter beihilferechtlichem Vorbehalt; bis dahin konkurrieren die Anlagen im regulären Verfahren.`,
    },
    {
      q: "Darf ich auf meinem Moor weiter Landwirtschaft betreiben?",
      a: "Eine standortangepasste nasse Bewirtschaftung, etwa Paludikultur, bleibt nach der BNetzA-Festlegung zulässig. Klassischer Ackerbau oder intensives Grünland sind mit den geforderten Wasserständen in der Regel nicht vereinbar.",
    },
    {
      q: "Wie wird ein Solarpark auf Moorboden gegründet?",
      a: "Meist mit Rammpfählen, die bis in den tragfähigen Untergrund reichen, oder mit Sonderfundamenten. Gebaut werden darf noch auf dem entwässerten Boden, die Wiedervernässung folgt vor bzw. unmittelbar nach der Inbetriebnahme.",
    },
    {
      q: "Wie viel Pacht bringt Moor-PV?",
      a: `Belastbare Marktwerte gibt es noch nicht. Als Orientierung dienen die Freiflächen-Spannen von ${fmt(PACHT.freiflaecheProHa.min)} bis ${fmt(PACHT.freiflaecheProHa.max)} €/ha; höhere Baukosten und die dauerhafte Wiedervernässung sollten in Vertrag und Bewertung einfließen.`,
    },
  ],

  passend: [
    { href: "/ratgeber/floating-pv", titel: "Floating-PV", text: "Schwimmende Solarparks auf Baggerseen und Tagebauseen." },
    { href: "/ratgeber/eeg-ausschreibung-freiflaeche", titel: "EEG-Ausschreibung Freifläche", text: "Termine, Zuschläge und Flächenkulisse." },
    { href: "/ratgeber/benachteiligte-gebiete-pv-freiflaeche", titel: "Benachteiligte Gebiete", text: "Die größte Kulisse für Solarparks auf Agrarland." },
    { href: pfad("/landwirte"), titel: "Für Landwirte", text: "Verpachten, selbst investieren oder beteiligen." },
    { href: pfad("/flaeche-verpachten"), titel: "Fläche für Solarpark verpachten", text: "Pachtmodelle, Vertrag und Ablauf für Eigentümer." },
    { href: pfad("/rechner/pacht"), titel: "Pachtrechner", text: "Pacht über die Laufzeit berechnen." },
  ],

  quellen: [
    { titel: "EEG 2023, § 37 – Gebote für Solaranlagen des ersten Segments (Nr. 3 e Moorböden)", url: "https://www.gesetze-im-internet.de/eeg_2014/__37.html", stand: "09/2026" },
    { titel: "EEG 2023, § 48 – Solaranlagen (anzulegender Wert, Nr. 5 e)", url: "https://www.gesetze-im-internet.de/eeg_2014/__48.html", stand: "09/2026" },
    { titel: "Bundesnetzagentur – Erlass der Festlegung für besondere Solaranlagen auf Grünland und Moorböden (PM 28.06.2023)", url: "https://www.bundesnetzagentur.de/SharedDocs/Pressemitteilungen/DE/2023/20230628_SolarGruenlandMoor.html", stand: "09/2026" },
    { titel: "Clearingstelle EEG|KWKG – Unter welchen Voraussetzungen sind Solaranlagen auf Moorböden förderfähig?", url: "https://www.clearingstelle-eeg-kwkg.de/haeufige-rechtsfrage/232", stand: "09/2026" },
    { titel: "Fraunhofer ISE – Moor-Photovoltaik (Moor-PV)", url: "https://www.ise.fraunhofer.de/de/geschaeftsfelder/solarkraftwerke-und-integrierte-photovoltaik/integrierte-photovoltaik/moor-photovoltaik-moor-pv.html", stand: "09/2026" },
    { titel: "Bundesumweltministerium – Moorschutz und Nationale Moorschutzstrategie", url: "https://www.bundesumweltministerium.de/themen/naturschutz/moorschutz", stand: "09/2026" },
    { titel: "Bundesnetzagentur – Besondere Solaranlagen (Anforderungen und Festlegungen)", url: "https://www.bundesnetzagentur.de/DE/Fachthemen/ElektrizitaetundGas/Ausschreibungen/Solaranlagen1/BesondereSolaranlagen/start.html", stand: "09/2026" },
  ],

  seitenCta: {
    titel: "Moorfläche im Besitz?",
    text: "Kulisse, Netz und Planungsrecht Ihrer Fläche vorprüfen.",
    href: pfad("/flaechencheck"),
    label: "Zum Flächencheck",
  },
  cta: {
    title: "Moor, Grünland oder Acker – lassen Sie Ihre Fläche einschätzen.",
    text: "Wir prüfen, welche EEG-Kategorie für Ihre Fläche in Frage kommt, und wie es um Netz und Planungsrecht steht. Für Flächeneigentümer ist die Plattform von ÖkoInvest kostenfrei.",
    primary: { label: "Zum Flächencheck", href: pfad("/flaechencheck") },
    secondary: { label: "Für Landwirte", href: pfad("/landwirte") },
  },
};

export default artikel;
