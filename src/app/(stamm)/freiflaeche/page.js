// src/app/freiflaeche/page.js – Freiflächen-PV & Solarparks
//
// Sprachmodell: dieselbe Seite unter /freiflaeche, /de|at|ch/…, /en/… und /en/de|at|ch/…. Feste Texte im
// Wörterbuch TEXTE (en nur Texte – Icons, hrefs und Zahlen aus de). Länderinhalt AT/CH über
// inhaltFuerSprache(): englische Länderfassungen FREIFLAECHE_AT_EN / FREIFLAECHE_CH_EN (gleiche Quellen).

import {
  Bird, CalendarRange, Factory, FileCheck2, Fence, Flower2, Gauge, Landmark, MapPinned, Recycle,
  ShieldAlert, Snowflake, Sprout, TrainFront, Trees, Waves,
} from "lucide-react";

import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import SplitMedia from "@/components/ui/SplitMedia";
import Reveal from "@/components/ui/Reveal";
import Faq from "@/components/ui/Faq";
import CtaBand from "@/components/ui/CtaBand";
import Querverweise from "@/components/Reusable/Querverweise";
import JsonLd from "@/components/JsonLd";
import SolarparkSchnitt from "@/components/Flaeche/SolarparkSchnitt";
import Zeitleiste from "@/components/Flaeche/Zeitleiste";
import { Faktenleiste } from "@/components/Flaeche/Seite/teile";
import Hero from "@/components/Flaeche/Freiflaeche/Hero";
import { Kriterien, Wertschoepfung } from "@/components/Flaeche/Freiflaeche/Abschnitte";
import { abs } from "@/data/site";
import { AGRI, FREIFLAECHE, KOMMUNE, PACHT, REGIONEN, STAND } from "@/lib/invest/markt";
import { fmt } from "@/lib/rechner/annahmen";
import { pfad } from "@/lib/land";
import { seitenLand, seitenMetadata, spracheDerAnfrage } from "@/lib/land/seite";
import { GiltFuer, LandHinweis } from "@/components/Land/LandHinweis";
import { FREIFLAECHE_CH, FREIFLAECHE_CH_EN } from "@/data/laender/ch/freiflaeche";
import { FREIFLAECHE_AT, FREIFLAECHE_AT_EN } from "@/data/laender/at/freiflaeche";
import { chTexte } from "@/data/laender/ch/schreibung";
import { inhaltFuerSprache, uebersetze } from "@/lib/sprache/woerterbuch";
import { datumText, fmtZahl } from "@/lib/sprache/format";

const PFAD = pfad("/freiflaeche");
const TITEL = "Freiflächen-PV & Solarparks entwickeln | ÖkoInvest";
const BESCHREIBUNG =
  "Solarparks ab rund 3 Hektar in DE, AT und CH: Flächenkriterien, EEG-Flächenkulisse, Genehmigung, Ökologie, Rückbau und Zeitplan. Jetzt Fläche prüfen.";

const metadata = {
  title: TITEL,
  description: BESCHREIBUNG,
  alternates: { canonical: abs(PFAD) },
  openGraph: {
    type: "website",
    locale: "de_DE",
    url: abs(PFAD),
    siteName: "ÖkoInvest",
    title: TITEL,
    description: BESCHREIBUNG,
    images: [{ url: abs("/img/solarpark-himmel.jpg"), width: 1280, height: 852, alt: "Solarpark unter blauem Himmel" }],
  },
};

const TITEL_EN = "Developing ground-mounted PV & solar parks | ÖkoInvest";
const BESCHREIBUNG_EN =
  "Solar parks from around 3 hectares in DE, AT and CH: site criteria, EEG land categories, permitting, ecology, decommissioning and timeline. Check your land now.";

const metadataEn = {
  title: TITEL_EN,
  description: BESCHREIBUNG_EN,
  openGraph: { title: TITEL_EN, description: BESCHREIBUNG_EN, images: [{ alt: "Solar park under a blue sky" }] },
};

// Länderinhalte (Ländermodell): gemeinsam = Stand vor Welle 2; CH = src/data/laender/ch/freiflaeche.js, AT = src/data/laender/at/freiflaeche.js
const INHALT = {
  de: { gemeinsam: {}, AT: FREIFLAECHE_AT, CH: FREIFLAECHE_CH },
  en: { gemeinsam: {}, AT: FREIFLAECHE_AT_EN, CH: FREIFLAECHE_CH_EN },
};

const metadataFuer = (land, p) => {
  const en = p?.sprache === "en";
  const basis = en ? uebersetze({ de: metadata, en: metadataEn }, "en") : metadata;
  if (land !== "CH") return basis;
  return en
    ? {
        ...basis,
        title: "Ground-mounted PV in Switzerland: Art. 24ter RPG & permits | ÖkoInvest",
        description: "Solar parks in Switzerland: when ground-mounted PV and agrivoltaics outside the building zone are site-bound (Art. 24ter RPG, Swiss Spatial Planning Act), permits, HEIV auction and Solarexpress.",
        openGraph: { ...basis.openGraph, title: "Ground-mounted PV in Switzerland | ÖkoInvest", description: "Art. 24ter RPG, permits from the municipality and canton, HEIV auction and Solarexpress at a glance." },
      }
    : {
        ...basis,
        title: "Freiflächen-PV in der Schweiz: Art. 24ter RPG & Bewilligung | ÖkoInvest",
        description: "Solarpark in der Schweiz: wann Freiflächen-PV und Agri-PV ausserhalb der Bauzone standortgebunden sind (Art. 24ter RPG), Bewilligung, HEIV-Auktion und Solarexpress.",
        openGraph: { ...basis.openGraph, locale: "de_CH", title: "Freiflächen-PV in der Schweiz | ÖkoInvest", description: "Art. 24ter RPG, Bewilligung durch Gemeinde und Kanton, HEIV-Auktion und Solarexpress im Überblick." },
      };
};

const mwpBei = (ha) => ha / FREIFLAECHE.haProMwp;
const z = (n, stellen = 0) => fmtZahl(n, stellen, "en");

/** Querverweise CH: ohne Pachtrechner und deutsche Ratgeber (Bebauungsplan, Rückbaubürgschaft) */
const querverweiseCh = (t, w) => [
  t.querverweisRegion,
  { href: "/ratgeber/freiflaechen-pv-schweiz", titel: w.ch.ratgeberTitel, text: w.ch.ratgeberText },
  { href: "/flaechencheck", titel: w.ch.check, text: t.querverweise["/flaechencheck"] },
  { href: "/agri-pv", titel: w.ch.agri, text: t.querverweise["/agri-pv"] },
  { href: "/prozess", titel: w.ch.prozessTitel, text: w.ch.prozessText },
];

/** Genehmigungskarten: Land der Seite zuerst, CH-Karte mit geprüften Punkten (Länderinhalt), Schweizer Schreibweise */
const verfahren = (karten, t, land) => {
  if (land === "AT") return [...karten].sort((a, b) => (a.kurz === "AT" ? -1 : b.kurz === "AT" ? 1 : 0));
  if (land !== "CH") return karten;
  const mitCh = karten.map((k) => (k.kurz === "CH" && t.verfahrenCh ? { ...k, punkte: t.verfahrenCh } : k));
  return chTexte([...mitCh].sort((a, b) => (a.kurz === "CH" ? -1 : b.kurz === "CH" ? 1 : 0)), land);
};
const sued = REGIONEN.find((r) => r.id === "de-sued");

const FAKTEN = [
  { icon: MapPinned, wert: `ab ${FREIFLAECHE.mindestHa} ha`, einheit: "Flächengröße", text: "darunter tragen sich Planung, Gutachten und Netzanschluss selten" },
  { icon: Gauge, wert: `${fmt(FREIFLAECHE.haProMwp, 1)} ha`, einheit: "je MWp Leistung", text: "mit heutigen Modulen, feste Aufständerung nach Süden" },
  { icon: Landmark, wert: `${FREIFLAECHE.laufzeit} J.`, einheit: "Betrieb & Pacht", text: "danach Rückbau – abgesichert über eine Bürgschaft" },
  { icon: CalendarRange, wert: "2–4 J.", einheit: "bis zum Betrieb", text: "Netz, Gemeinde und Artenschutz geben den Takt vor" },
];

const FAQ = [
  {
    q: "Ab welcher Flächengröße lohnt sich ein Solarpark?",
    a: `Wir entwickeln Solarparks in der Regel ab rund ${FREIFLAECHE.mindestHa} Hektar – das entspricht etwa ${fmt(mwpBei(FREIFLAECHE.mindestHa), 1)} MWp. Darunter tragen sich Planung, Gutachten und Netzanschluss selten. Kleinere Flächen können mit Nachbarflächen zusammengelegt oder als Agri-PV am Hof genutzt werden.`,
  },
  {
    q: "Wie viel Strom erzeugt ein Hektar Solarpark?",
    a: `Mit heutigen Modulen passt rund 1 MWp auf ${fmt(FREIFLAECHE.haProMwp, 1)} Hektar. In Süddeutschland erzeugt das etwa ${fmt(sued.ertrag)} MWh pro Jahr – je Hektar also rund ${fmt(sued.ertrag / FREIFLAECHE.haProMwp / 1000, 1)} GWh, genug für den Jahresbedarf von etwa ${fmt(Math.round(sued.ertrag / FREIFLAECHE.haProMwp / 3.5 / 10) * 10)} Haushalten.`,
  },
  {
    q: "Brauche ich für einen Solarpark immer einen Bebauungsplan?",
    a: "In Deutschland in aller Regel ja: Die Gemeinde stellt einen vorhabenbezogenen Bebauungsplan auf und ändert meist den Flächennutzungsplan. Ausnahme sind seit 2023 Flächen bis 200 m entlang von Autobahnen und zweigleisigen Schienenwegen sowie kleinere, hofnahe Agri-PV-Anlagen – sie sind im Außenbereich privilegiert (§ 35 BauGB) und brauchen nur eine Baugenehmigung.",
  },
  {
    q: "Was ist die EEG-Flächenkulisse?",
    a: "Das EEG legt fest, auf welchen Flächen ein Solarpark eine Marktprämie aus den Ausschreibungen der Bundesnetzagentur bekommen kann – etwa Randstreifen bis 500 m an Autobahnen und Schienenwegen, Konversionsflächen, versiegelte Flächen, Acker- und Grünland in benachteiligten Gebieten sowie besondere Solaranlagen wie Agri-PV. Außerhalb der Kulisse kann ein Park über einen Stromliefervertrag (PPA) finanziert werden.",
  },
  {
    q: "Wie lange dauert es von der Unterschrift bis zum Betrieb?",
    a: "Realistisch 2 bis 4 Jahre. Die längsten Posten sind Netzanschluss, Bauleitplanung mit Artenschutzkartierung über eine Vegetationsperiode und gegebenenfalls die Ausschreibung. Wir sagen das offen – und zahlen in dieser Zeit meist eine Reservierungsprämie, während Sie die Fläche weiter bewirtschaften.",
  },
  {
    q: "Wer baut den Solarpark nach 30 Jahren zurück?",
    a: "Der Betreiber. Der Rückbau samt Entsorgung und Wiederherstellung der landwirtschaftlichen Nutzbarkeit ist im Pachtvertrag geregelt und über eine Rückbaubürgschaft einer Bank oder Versicherung abgesichert. Rammpfosten ohne Beton lassen sich vollständig ziehen; unter extensivem Grünland kann sich der Boden in dieser Zeit erholen – wie stark, hängt von Standort und Pflege ab.",
  },
  {
    q: "Verdient auch die Gemeinde am Solarpark?",
    a: `Ja. Betreiber dürfen der Gemeinde nach § 6 EEG bis zu ${fmt(KOMMUNE.beteiligungCt, 1)} ct je erzeugter Kilowattstunde zahlen, und ${fmt(KOMMUNE.gewerbesteuerStandort * 100)} % der Gewerbesteuer aus Solarparks stehen der Standortgemeinde zu. Das erhöht die Akzeptanz im Gemeinderat erheblich.`,
  },
  {
    q: "Wie ist das in Österreich und der Schweiz?",
    a: "In Österreich braucht ein Solarpark in der Regel eine Widmung als Grünland-Photovoltaik und muss in die Zonierung bzw. die Kriterien des jeweiligen Bundeslandes passen; die Förderung erfolgt über das EAG. In der Schweiz sind Freiflächenanlagen außerhalb der Bauzone nur eingeschränkt möglich – vor allem als standortgebundene Anlagen, etwa Agri-PV mit Vorteil für die Landwirtschaft oder alpine Anlagen.",
  },
];

const FAQ_EN = [
  {
    q: "From what size of land is a solar park worthwhile?",
    a: `We usually develop solar parks from around ${FREIFLAECHE.mindestHa} hectares – roughly ${z(mwpBei(FREIFLAECHE.mindestHa), 1)} MWp. Below that, planning, expert reports and grid connection rarely pay off. Smaller plots can be combined with neighbouring land or used for agrivoltaics on the farm.`,
  },
  {
    q: "How much power does one hectare of solar park generate?",
    a: `With today’s modules, around 1 MWp fits on ${z(FREIFLAECHE.haProMwp, 1)} hectares. In southern Germany this generates about ${z(sued.ertrag)} MWh per year – around ${z(sued.ertrag / FREIFLAECHE.haProMwp / 1000, 1)} GWh per hectare, enough for the annual consumption of about ${z(Math.round(sued.ertrag / FREIFLAECHE.haProMwp / 3.5 / 10) * 10)} households.`,
  },
  {
    q: "Do I always need a development plan for a solar park?",
    a: "In Germany, as a rule, yes: the municipality draws up a project-related development plan (vorhabenbezogener Bebauungsplan) and usually amends the land use plan. Since 2023, exceptions apply to land up to 200 m alongside motorways and double-track railways and to smaller agrivoltaic plants close to the farm – they are privileged in the outer zone (§ 35 BauGB, German Federal Building Code) and only need a building permit.",
  },
  {
    q: "What are the EEG land categories?",
    a: "The EEG (German Renewable Energy Sources Act) defines on which land a solar park can receive a market premium from the tenders of the Federal Network Agency (Bundesnetzagentur) – for example strips up to 500 m alongside motorways and railways, conversion sites, sealed surfaces, arable land and grassland in less-favoured areas, and special solar installations such as agrivoltaics. Outside these categories, a park can be financed through a power purchase agreement (PPA).",
  },
  {
    q: "How long does it take from signing to operation?",
    a: "Realistically 2 to 4 years. The longest items are the grid connection, zoning with a species survey over one growing season and, where applicable, the tender. We say so openly – and during this period we usually pay a reservation fee while you continue to farm the land.",
  },
  {
    q: "Who dismantles the solar park after 30 years?",
    a: "The operator. Decommissioning, including disposal and restoring the land for agricultural use, is set out in the lease agreement and secured by a decommissioning guarantee from a bank or insurer. Driven piles without concrete can be pulled out completely; under extensive grassland the soil can recover during this period – how much depends on the site and its management.",
  },
  {
    q: "Does the municipality also earn from the solar park?",
    a: `Yes. Under § 6 EEG, operators may pay the municipality up to ${z(KOMMUNE.beteiligungCt, 1)} ct per kilowatt hour generated, and ${z(KOMMUNE.gewerbesteuerStandort * 100)} % of the trade tax from solar parks goes to the host municipality. This considerably increases acceptance in the municipal council.`,
  },
  {
    q: "How does it work in Austria and Switzerland?",
    a: "In Austria, a solar park generally needs a zoning designation as ‘Grünland-Photovoltaik’ (green land for photovoltaics) and has to fit the zoning or criteria of the respective federal state; funding is provided under the EAG (Austrian Renewable Energy Expansion Act). In Switzerland, ground-mounted plants outside the building zone are only possible to a limited extent – mainly as site-bound installations, such as agrivoltaics that benefit agriculture, or alpine plants.",
  },
];

/** Alle festen Texte der Seite. en enthält nur Texte; Listen werden je Index zusammengeführt. */
const TEXTE = {
  de: {
    fakten: FAKTEN,
    faq: FAQ,
    faktenTitel: "Eckdaten eines Solarparks",
    jsonLd: { name: "Projektentwicklung Freiflächen-Photovoltaik", serviceType: "Entwicklung, Bau und Betrieb von Solarparks", description: BESCHREIBUNG },
    schnitt: {
      eyebrow: "So sieht ein Solarpark aus",
      titel: "Ein Kraftwerk, das kaum Boden versiegelt.",
      lead: "Pfosten, Wege und Station berühren nur einen kleinen Bruchteil der Fläche – meist deutlich unter 5 %. Der Rest bleibt unversiegelt und wird als Grünland gepflegt.",
    },
    kulisse: {
      eyebrow: "Deutschland · EEG 2023",
      titel: "Die Flächenkulisse entscheidet über die Förderung.",
      lead: "Solarparks ab 1 MW erhalten eine Marktprämie nur über die Ausschreibungen der Bundesnetzagentur – und nur auf bestimmten Flächen. Außerhalb dieser Kulisse finanzieren sich Parks über langfristige Stromlieferverträge (PPA).",
      boxTitel: "Baurecht ohne Bebauungsplan",
      boxText: (
        <>
          Seit 2023 sind Solarparks auf einem <strong className="text-white">200-m-Streifen</strong> entlang von Autobahnen und zweigleisigen Schienenwegen im Außenbereich privilegiert (§ 35 Abs. 1 Nr. 8 b BauGB) – ebenso hofnahe Agri-PV bis {fmt(AGRI.privilegierungHa, 1)} ha Grundfläche. Das spart oft ein bis zwei Jahre.
        </>
      ),
      punkte: [
        { icon: TrainFront, t: "Randstreifen 500 m", x: "Flächen längs von Autobahnen und Schienenwegen bis 500 m Entfernung, gemessen vom äußeren Fahrbahnrand." },
        { icon: Factory, t: "Konversion & versiegelt", x: "Ehemals wirtschaftlich, verkehrlich, wohnungsbaulich oder militärisch genutzte Flächen; bereits versiegelte Flächen." },
        { icon: Sprout, t: "Benachteiligte Gebiete", x: "Seit dem Solarpaket I (Mai 2024) grundsätzlich förderfähig. Länder können sie per Verordnung ausschließen, sobald mehr als 1 % ihrer Agrarfläche mit Solarparks belegt ist." },
        { icon: Flower2, t: "Besondere Solaranlagen", x: "Agri-PV, Moor-PV, Parkplatz- und schwimmende Anlagen – teils mit Bonus; ein eigenes Untersegment ist vorgesehen, wartete zuletzt aber noch auf die beihilferechtliche Freigabe." },
        { icon: Landmark, t: "Gewerbe- & Industriegebiete", x: "Flächen in Bebauungsplänen für Gewerbe oder Industrie, die für Solar genutzt werden dürfen." },
        { icon: Bird, t: "Naturschutz-Mindestkriterien", x: "Geförderte Freiflächenanlagen müssen seit dem Solarpaket I mindestens drei von fünf naturschutzfachlichen Kriterien erfüllen." },
      ],
      fuss: `Welche Gebiete als „benachteiligt“ gelten, legt die EU-Gebietskulisse fest; ob Ihr Bundesland die Öffnung eingeschränkt hat, prüfen wir flurstückgenau. Stand ${STAND}, ohne Gewähr – maßgeblich ist der jeweils aktuelle Gesetzestext.`,
    },
    genehmigung: {
      eyebrow: "Genehmigung in DACH",
      titel: "Deutschland, Österreich, Schweiz: drei Verfahren.",
      lead: "Die Technik ist überall gleich – das Planungsrecht nicht. Die Übersicht zeigt die Grundzüge; welcher Weg für Ihre Fläche realistisch ist, klären wir im Einzelfall.",
      karten: [
        {
          land: "Deutschland",
          kurz: "DE",
          punkte: [
            "Aufstellungsbeschluss des Gemeinderats für einen (vorhabenbezogenen) Bebauungsplan",
            "Frühzeitige Beteiligung von Öffentlichkeit und Behörden, Umweltbericht, Artenschutz",
            "Satzungsbeschluss, meist parallele Änderung des Flächennutzungsplans",
            "Baugenehmigung; privilegierte Flächen (200-m-Streifen, hofnahe Agri-PV) ohne B-Plan",
            "Städtebaulicher Vertrag, Zahlung an die Gemeinde nach § 6 EEG",
          ],
        },
        {
          land: "Österreich",
          kurz: "AT",
          punkte: [
            "Umwidmung in „Grünland-Photovoltaik“ (Bezeichnung je Bundesland verschieden) durch den Gemeinderat",
            "Landesrechtliche Vorgaben: Zonierungen, Eignungs- und Ausschlusszonen, Mindest- oder Höchstgrößen",
            "Elektrizitätsrechtliche und ggf. naturschutzrechtliche Bewilligung",
            "Bei sehr großen Anlagen oder sensiblen Standorten: Prüfung der UVP-Pflicht",
            "Förderung über das EAG (Investitionszuschuss bzw. Marktprämie), sonst PPA",
          ],
        },
        {
          land: "Schweiz",
          kurz: "CH",
          punkte: [
            "Außerhalb der Bauzone nur, wenn die Anlage standortgebunden ist (Raumplanungsrecht)",
            "Agri-PV: nur bei Vorteilen für die landwirtschaftliche Produktion oder zu Versuchszwecken",
            // Quelle: BFE, Photovoltaik-Grossanlagen (Art. 71a EnG) – Teil-Einspeisung bis 31.12.2025 war Voraussetzung; vor Veröffentlichung juristisch bestätigen
            "Alpine Großanlagen: Der befristete „Solarexpress“ verlangte eine Teil-Einspeisung bis Ende 2025 und steht neuen Projekten nicht mehr offen",
            "Baubewilligung der Gemeinde mit Prüfung durch kantonale Fachstellen",
            "Förderung u. a. über die Einmalvergütung; Vermarktung zunehmend über PPA",
          ],
        },
      ],
      fuss: "Vereinfachte Übersicht ohne Anspruch auf Vollständigkeit. Landes- und kantonale Regeln ändern sich häufig – wir prüfen den aktuellen Stand für Ihren Standort. Keine Rechtsberatung.",
    },
    oekologie: {
      bildAlt: "Solarpark mit Bäumen und Grünland am Rand",
      eyebrow: "Ökologie & Biodiversität",
      titel: "Solarpark und Artenvielfalt: Es kommt auf die Planung an.",
      text1: "Unter und zwischen den Modulen kann über die Laufzeit ungedüngtes, extensiv gepflegtes Grünland entstehen. Ob ein Park die Artenvielfalt gegenüber der vorherigen Nutzung tatsächlich erhöht, hängt vom Standort, vom Pflegekonzept und von der Ausgangslage ab – das belegt erst ein Monitoring vor Ort.",
      text2: "Seit dem Solarpaket I gilt für geförderte Anlagen: mindestens drei von fünf naturschutzfachlichen Mindestkriterien. Welche Kriterien ein Park erfüllt, steht im Pflegekonzept des jeweiligen Projekts.",
      punkte: [
        { title: "Begrenzte Überbauung", text: "Modulfläche nur auf einem Teil der Grundfläche, breitere Reihenabstände." },
        { title: "Biodiversitätsförderndes Pflegekonzept", text: "Späte, gestaffelte Mahd oder Schafbeweidung." },
        { title: "Durchgängigkeit für Tiere", text: "Zaun mit Bodenabstand, Wildkorridore bei großen Parks." },
        { title: "Biotopelemente", text: "Hecken, Blühstreifen, Steinhaufen, Kleingewässer." },
        { title: "Bodenschonender Betrieb", text: "Kein Dünger, keine Pflanzenschutzmittel." },
      ],
      kacheln: [
        { icon: Fence, t: "Beweidung", x: "Schafe und – bei höherer Aufständerung – auch andere Weidetiere halten den Aufwuchs kurz. Die Fläche bleibt landwirtschaftlich nutzbar." },
        { icon: Trees, t: "Einbindung ins Landschaftsbild", x: "Hecken und Gehölzstreifen an Sichtachsen, Abstand zu Ortsrändern – das entscheidet oft über die Zustimmung vor Ort." },
        { icon: Waves, t: "Wasser & Boden", x: "Regen versickert zwischen den Modulen, unter dauerhaftem Bewuchs kann sich Humus aufbauen. Drainagen und Erosionsrinnen berücksichtigen wir in der Planung." },
      ],
    },
    rueckbau: {
      eyebrow: "Rückbau & Sicherheiten",
      titel: "Nach Vertragsende bekommen Sie Ihre Fläche zurück – abgesichert durch Vertrag, Grundbuch und Bürgschaft.",
      lead: "Die wichtigste Frage vieler Eigentümer: Was, wenn der Betreiber nicht mehr existiert? Die Antwort steht im Vertrag und im Grundbuch.",
      kacheln: [
        { icon: ShieldAlert, t: "Rückbaubürgschaft", x: "Spätestens vor Baubeginn hinterlegt der Betreiber eine Bürgschaft einer Bank oder Versicherung über die Rückbaukosten – regelmäßig angepasst." },
        { icon: FileCheck2, t: "Dienstbarkeit im Grundbuch", x: "Die beschränkte persönliche Dienstbarkeit sichert den Betrieb – und bindet auch jeden Rechtsnachfolger an die Rückbaupflicht." },
        { icon: Recycle, t: "Recycling statt Deponie", x: "Module, Stahl, Aluminium und Kupfer werden verwertet; Module fallen unter die Rücknahmepflicht des Elektrogesetzes." },
        { icon: Sprout, t: "Wiederherstellung", x: `Pfosten ziehen, Kabel bergen, Boden lockern – die Fläche geht in landwirtschaftlich nutzbarem Zustand zurück. Rechnerisch rund ${fmt(FREIFLAECHE.rueckbauProKwp)} €/kWp Rückbaukosten.` },
      ],
    },
    ablauf: {
      eyebrow: "Ablauf",
      titel: "Von der Flächensicherung bis zum Betrieb.",
      leadCh: "Viele Schritte laufen parallel – mit Gemeinde, Kanton, Netzbetreiber und ESTI.",
      lead: `Viele Schritte laufen parallel. Die Pacht beginnt mit dem Bau – davor zahlen wir in der Regel eine Reservierungsprämie von ${fmt(PACHT.reservierungProHa.min)}–${fmt(PACHT.reservierungProHa.max)} € je Hektar und Jahr.`,
      hinweisThema: "Zeitplan und Reservierungsprämie",
      hinweisThemaEn: "Timeline and reservation fee",
    },
    faqKopf: { eyebrow: "Häufige Fragen", titel: "Solarparks – gut zu wissen", lead: "Ihre Frage ist nicht dabei? Schreiben Sie uns über den Flächencheck – wir antworten persönlich." },
    querverweise: [
      { href: pfad("/flaechencheck"), titel: "Flächencheck", text: "Ampel, mögliche Leistung und Pachtspanne Ihrer Fläche in zwei Minuten." },
      { href: pfad("/flaeche-verpachten"), titel: "Fläche verpachten", text: "Pachtmodelle, Vertragsinhalte und der Weg bis zur ersten Zahlung." },
      { href: pfad("/agri-pv"), titel: "Agri-PV", text: "Wenn die Landwirtschaft auf der Fläche weitergehen soll." },
      { href: pfad("/prozess"), titel: "Unser Prozess", text: "Wie wir Projekte Schritt für Schritt zur Baureife bringen." },
      { href: "/ratgeber/solarpark-genehmigung-bebauungsplan", titel: "Solarpark-Genehmigung", text: "Der Bebauungsplan Schritt für Schritt." },
      { href: "/ratgeber/solarpark-rueckbau-rueckbaubuergschaft", titel: "Rückbau und Rückbaubürgschaft", text: "Pflicht, Sicherheit und echte Kosten nach 30 Jahren." },
    ],
    ch: {
      ratgeberTitel: "Freiflächen-PV in der Schweiz",
      ratgeberText: "Raumplanungsrecht, Agri-PV und Solarexpress ausführlich erklärt.",
      check: "Flächencheck",
      agri: "Agri-PV",
      prozessTitel: "Unser Prozess",
      prozessText: "Wie wir Projekte Schritt für Schritt zur Baureife bringen.",
    },
    cta: {
      eyebrow: "Kostenlos & unverbindlich",
      titel: "Hat Ihre Fläche das Zeug zum Solarpark?",
      text: "Flurstücke nennen, wir prüfen Kulisse, Netz und Restriktionen am Kartentisch – und sagen Ihnen ehrlich, ob es sich lohnt. Offen gesagt: Wir sind selbst Projektentwickler und haben Interesse an geeigneten Flächen.",
      primaer: "Fläche prüfen",
      sekundaer: "Pachtrechner",
    },
  },
  en: {
    fakten: [
      { wert: `from ${FREIFLAECHE.mindestHa} ha`, einheit: "Site size", text: "below this, planning, expert reports and grid connection rarely pay off" },
      { wert: `${z(FREIFLAECHE.haProMwp, 1)} ha`, einheit: "per MWp of capacity", text: "with today’s modules, fixed south-facing mounting" },
      { wert: `${FREIFLAECHE.laufzeit} yrs`, einheit: "Operation & lease", text: "followed by decommissioning – secured by a bank guarantee" },
      { wert: "2–4 yrs", einheit: "until operation", text: "the grid, the municipality and species protection set the pace" },
    ],
    faq: FAQ_EN,
    faktenTitel: "Key figures of a solar park",
    jsonLd: { name: "Project development for ground-mounted photovoltaics", serviceType: "Development, construction and operation of solar parks", description: BESCHREIBUNG_EN },
    schnitt: {
      eyebrow: "What a solar park looks like",
      titel: "A power plant that hardly seals any soil.",
      lead: "Piles, tracks and the substation touch only a small fraction of the land – usually well below 5 %. The rest remains unsealed and is managed as grassland.",
    },
    kulisse: {
      eyebrow: "Germany · EEG 2023",
      titel: "The land categories decide on funding.",
      lead: "Solar parks from 1 MW only receive a market premium through the tenders of the Federal Network Agency (Bundesnetzagentur) – and only on certain types of land. Outside these categories, parks are financed through long-term power purchase agreements (PPAs).",
      boxTitel: "Building rights without a development plan",
      boxText: (
        <>
          Since 2023, solar parks on a <strong className="text-white">200 m strip</strong> alongside motorways and double-track railways have been privileged in the outer zone (§ 35 (1) no. 8 b BauGB, German Federal Building Code) – as have agrivoltaic plants close to the farm with a footprint of up to {z(AGRI.privilegierungHa, 1)} ha. This often saves one to two years.
        </>
      ),
      punkte: [
        { t: "500 m strips", x: "Land alongside motorways and railways up to 500 m away, measured from the outer edge of the carriageway." },
        { t: "Conversion & sealed land", x: "Land formerly used for commercial, transport, residential or military purposes; land that is already sealed." },
        { t: "Less-favoured areas", x: "Eligible in principle since Solar Package I (May 2024). Federal states can exclude them by ordinance once more than 1 % of their agricultural land is covered by solar parks." },
        { t: "Special solar installations", x: "Agrivoltaics, PV on peatland, car park and floating installations – some with a bonus; a dedicated sub-segment is planned but was most recently still awaiting state-aid approval." },
        { t: "Commercial & industrial zones", x: "Land in development plans for commercial or industrial use that may be used for solar." },
        { t: "Minimum nature conservation criteria", x: "Since Solar Package I, subsidised ground-mounted plants must meet at least three of five nature conservation criteria." },
      ],
      fuss: `Which areas count as ‘less-favoured’ is set by the EU area classification; whether your federal state has restricted the opening, we check plot by plot. As of ${datumText(STAND, "en")}, without guarantee – the current legal text is authoritative.`,
    },
    genehmigung: {
      eyebrow: "Permitting in the DACH region",
      titel: "Germany, Austria, Switzerland: three procedures.",
      lead: "The technology is the same everywhere – planning law is not. The overview shows the basics; which route is realistic for your land, we clarify case by case.",
      karten: [
        {
          land: "Germany",
          punkte: [
            "Resolution of the municipal council to draw up a (project-related) development plan (Bebauungsplan)",
            "Early participation of the public and authorities, environmental report, species protection",
            "Adoption of the plan by by-law, usually with a parallel amendment of the land use plan",
            "Building permit; privileged sites (200 m strip, agrivoltaics close to the farm) without a development plan",
            "Urban development contract, payment to the municipality under § 6 EEG",
          ],
        },
        {
          land: "Austria",
          punkte: [
            "Rezoning to ‘Grünland-Photovoltaik’ (green land for photovoltaics – the term varies by federal state) by the municipal council",
            "State requirements: zoning plans, suitability and exclusion zones, minimum or maximum sizes",
            "Permit under electricity law and, where applicable, nature conservation law",
            "For very large plants or sensitive sites: screening for an environmental impact assessment (UVP)",
            "Funding under the EAG (investment grant or market premium), otherwise PPA",
          ],
        },
        {
          land: "Switzerland",
          punkte: [
            "Outside the building zone only if the installation is site-bound (spatial planning law)",
            "Agrivoltaics: only if it benefits agricultural production or serves trial purposes",
            "Large alpine plants: the time-limited ‘Solarexpress’ required partial grid feed-in by the end of 2025 and is no longer open to new projects",
            "Building permit from the municipality, reviewed by cantonal specialist agencies",
            "Funding including the one-off remuneration; marketing increasingly via PPAs",
          ],
        },
      ],
      fuss: "Simplified overview, not exhaustive. State and cantonal rules change frequently – we check the current position for your site. No legal advice.",
    },
    oekologie: {
      bildAlt: "Solar park with trees and grassland along the edge",
      eyebrow: "Ecology & biodiversity",
      titel: "Solar parks and biodiversity: it comes down to planning.",
      text1: "Under and between the modules, unfertilised, extensively managed grassland can develop over the term. Whether a park actually increases biodiversity compared with the previous use depends on the site, the management plan and the starting point – only on-site monitoring can prove it.",
      text2: "Since Solar Package I, subsidised plants must meet at least three of five minimum nature conservation criteria. Which criteria a park meets is set out in the management plan of the respective project.",
      punkte: [
        { title: "Limited coverage", text: "Modules on only part of the land, wider row spacing." },
        { title: "Biodiversity-friendly management plan", text: "Late, staggered mowing or sheep grazing." },
        { title: "Passage for wildlife", text: "Fence with ground clearance, wildlife corridors in large parks." },
        { title: "Biotope features", text: "Hedges, wildflower strips, stone piles, small ponds." },
        { title: "Soil-friendly operation", text: "No fertiliser, no pesticides." },
      ],
      kacheln: [
        { t: "Grazing", x: "Sheep – and, with higher mounting, other grazing animals too – keep the vegetation short. The land remains usable for agriculture." },
        { t: "Fitting into the landscape", x: "Hedges and tree strips along sight lines, distance to the edges of villages – this often decides local approval." },
        { t: "Water & soil", x: "Rain seeps away between the modules, and humus can build up under permanent vegetation. We take drainage and erosion channels into account in the planning." },
      ],
    },
    rueckbau: {
      eyebrow: "Decommissioning & securities",
      titel: "When the contract ends, you get your land back – secured by contract, land register and bank guarantee.",
      lead: "The most important question for many owners: what if the operator no longer exists? The answer is in the contract and in the land register.",
      kacheln: [
        { t: "Decommissioning guarantee", x: "Before construction starts at the latest, the operator deposits a guarantee from a bank or insurer covering the decommissioning costs – adjusted regularly." },
        { t: "Easement in the land register", x: "The limited personal easement (beschränkte persönliche Dienstbarkeit) secures operation – and also binds every legal successor to the decommissioning obligation." },
        { t: "Recycling instead of landfill", x: "Modules, steel, aluminium and copper are recycled; modules are subject to the take-back obligation of the German Electrical and Electronic Equipment Act (ElektroG)." },
        { t: "Restoration", x: `Pulling the piles, recovering the cables, loosening the soil – the land is returned in a condition fit for farming. Decommissioning costs of around €${z(FREIFLAECHE.rueckbauProKwp)}/kWp are calculated.` },
      ],
    },
    ablauf: {
      eyebrow: "Process",
      titel: "From securing the land to operation.",
      leadCh: "Many steps run in parallel – with the municipality, canton, grid operator and ESTI (Federal Inspectorate for Heavy Current Installations).",
      lead: `Many steps run in parallel. The lease starts with construction – before that, we usually pay a reservation fee of €${z(PACHT.reservierungProHa.min)}–${z(PACHT.reservierungProHa.max)} per hectare per year.`,
    },
    faqKopf: { eyebrow: "Frequently asked questions", titel: "Solar parks – good to know", lead: "Your question is not listed? Write to us via the land check – we will reply personally." },
    querverweise: [
      { titel: "Land check", text: "Traffic light, possible capacity and lease range for your land in two minutes." },
      { titel: "Lease your land", text: "Lease models, contract terms and the path to the first payment." },
      { titel: "Agrivoltaics", text: "When farming on the land is to continue." },
      { titel: "Our process", text: "How we bring projects step by step to ready-to-build status." },
      { titel: "Solar park permitting", text: "The development plan step by step." },
      { titel: "Decommissioning and guarantee", text: "Obligation, security and real costs after 30 years." },
    ],
    ch: {
      ratgeberTitel: "Ground-mounted PV in Switzerland",
      ratgeberText: "Spatial planning law, agrivoltaics and Solarexpress explained in detail.",
      check: "Land check",
      agri: "Agrivoltaics",
      prozessTitel: "Our process",
      prozessText: "How we bring projects step by step to ready-to-build status.",
    },
    cta: {
      eyebrow: "Free of charge & without obligation",
      titel: "Does your land have what it takes to become a solar park?",
      text: "Give us the plot numbers and we will check land categories, grid and restrictions at our desk – and tell you honestly whether it is worthwhile. To be open: we are project developers ourselves and are interested in suitable land.",
      primaer: "Check your land",
      sekundaer: "Lease calculator",
    },
  },
};

export default async function FreiflaechePage({ params }) {
  const land = await seitenLand(params);
  const sprache = spracheDerAnfrage();
  const w = uebersetze(TEXTE, sprache);
  const t = inhaltFuerSprache(INHALT, land, sprache);
  const ch = land === "CH";
  const tx = (x) => chTexte(x, land);
  const fakten = t.fakten4 ? [...w.fakten.slice(0, 3), { icon: Snowflake, ...t.fakten4 }] : w.fakten;
  // Rückbau-Kacheln: Länderinhalt nach dem deutschen Titel geschlüsselt
  const rueckbauKacheln = w.rueckbau.kacheln.map((k, i) => {
    const schluessel = TEXTE.de.rueckbau.kacheln[i].t;
    return t.rueckbau?.kacheln?.[schluessel] ? { ...k, x: t.rueckbau.kacheln[schluessel] } : k;
  });
  return (
    <div>
      <JsonLd
        daten={{
          "@context": "https://schema.org",
          "@type": "Service",
          name: w.jsonLd.name,
          serviceType: w.jsonLd.serviceType,
          provider: { "@id": `${abs("/")}/#organization` },
          areaServed: ["DE", "AT", "CH"],
          url: abs(PFAD),
          description: w.jsonLd.description,
        }}
      />

      <Hero t={t.hero} />
      <Faktenleiste titel={w.faktenTitel} fakten={tx(fakten)} />
      <Wertschoepfung t={t} />

      {/* Schnitt */}
      <Section tone="sand" space="lg">
        <SectionHeading eyebrow={w.schnitt.eyebrow} title={w.schnitt.titel} lead={w.schnitt.lead} className="mb-10" />
        <Reveal>
          <SolarparkSchnitt />
        </Reveal>
      </Section>

      <Kriterien t={t} />

      {/* EEG-Flächenkulisse */}
      <Section tone="navy" space="lg" className="ov-noise overflow-hidden">
        <div aria-hidden="true" className="ov-grid-bg absolute inset-0" />
        <div className="relative grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
          <div>
            <SectionHeading
              dark
              eyebrow={t.kulisse?.eyebrow ?? w.kulisse.eyebrow}
              title={t.kulisse?.titel ?? w.kulisse.titel}
              lead={t.kulisse?.lead ?? w.kulisse.lead}
            />
            <div className="mt-8 rounded-3xl bg-white/[0.06] p-6 ring-1 ring-white/10">
              <p className="font-display text-[17px] font-bold text-white">{t.kulisse?.box.titel ?? w.kulisse.boxTitel}</p>
              <p className="mt-2 text-[15px] leading-relaxed text-white/70">{t.kulisse ? t.kulisse.box.text : w.kulisse.boxText}</p>
            </div>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {(t.kulisse?.punkte ?? w.kulisse.punkte).map((k, i) => (
              <Reveal as="li" key={i} delay={i * 60} className="rounded-3xl bg-white/[0.04] p-5 ring-1 ring-white/10 md:p-6">
                <k.icon aria-hidden="true" className="h-6 w-6 text-ov-300" />
                <p className="mt-4 font-display text-[16.5px] font-bold text-white">{k.t}</p>
                <p className="mt-1.5 text-[14.5px] leading-relaxed text-white/65">{k.x}</p>
              </Reveal>
            ))}
          </ul>
        </div>
        <p className="relative mt-10 max-w-4xl text-[13.5px] leading-relaxed text-white/50">{t.kulisse?.fuss ?? w.kulisse.fuss}</p>
      </Section>

      {/* Genehmigung DACH */}
      <Section tone="white" space="lg">
        <SectionHeading eyebrow={w.genehmigung.eyebrow} title={w.genehmigung.titel} lead={w.genehmigung.lead} className="mb-12" />
        <div className="grid gap-5 lg:grid-cols-3">
          {verfahren(w.genehmigung.karten, t, land).map((l, i) => (
            <Reveal key={l.kurz} delay={i * 80} className="flex flex-col rounded-3xl bg-sand-50 p-6 ring-1 ring-ink-200/60 md:p-8">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-navy-950 font-display text-[14px] font-extrabold text-white">{l.kurz}</span>
                <h3 className="ov-h3 text-ink-900">{l.land}</h3>
              </div>
              <ol className="mt-6 space-y-3">
                {l.punkte.map((p, j) => (
                  <li key={p} className="flex gap-3 text-[15px] leading-snug text-ink-700">
                    <span className="ov-num mt-0.5 w-5 shrink-0 text-[13px] font-bold text-ov-700">{j + 1}.</span>
                    {p}
                  </li>
                ))}
              </ol>
            </Reveal>
          ))}
        </div>
        <p className="mt-8 max-w-4xl text-[13.5px] leading-relaxed text-ink-500">{w.genehmigung.fuss}</p>
      </Section>

      {/* Ökologie */}
      <Section tone="green" space="lg">
        <SplitMedia
          image={{ src: "/img/solarpark-baeume.jpg", alt: w.oekologie.bildAlt }}
          eyebrow={w.oekologie.eyebrow}
          title={w.oekologie.titel}
          text={[w.oekologie.text1, t.oekologieText2 ?? w.oekologie.text2]}
          points={tx(w.oekologie.punkte)}
        />
        <div className="mt-14 grid gap-4 sm:grid-cols-3">
          {tx(w.oekologie.kacheln).map((k, i) => (
            <Reveal key={i} delay={i * 70} className="rounded-3xl bg-white p-6 ring-1 ring-ov-100">
              <k.icon aria-hidden="true" className="h-6 w-6 text-ov-600" />
              <p className="mt-4 font-display text-[17px] font-bold text-ink-900">{k.t}</p>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-600">{k.x}</p>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* Rückbau & Sicherheiten */}
      <Section tone="white" space="lg">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <SectionHeading eyebrow={w.rueckbau.eyebrow} title={w.rueckbau.titel} lead={t.rueckbau?.lead ?? w.rueckbau.lead} />
          <ul className="grid gap-4 sm:grid-cols-2">
            {tx(rueckbauKacheln).map((k, i) => (
              <Reveal as="li" key={i} delay={i * 70} className="rounded-3xl bg-sand-50 p-6 ring-1 ring-ink-200/60">
                <k.icon aria-hidden="true" className="h-6 w-6 text-ov-600" />
                <p className="mt-4 font-display text-[17px] font-bold text-ink-900">{k.t}</p>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-600">{k.x}</p>
              </Reveal>
            ))}
          </ul>
        </div>
      </Section>

      {/* Zeitleiste */}
      <Section tone="sand" space="lg">
        <SectionHeading eyebrow={w.ablauf.eyebrow} title={w.ablauf.titel} lead={t.zeitplanLead ?? (ch ? w.ablauf.leadCh : w.ablauf.lead)} className="mb-10" />
        {/* Zeitplan und Reservierungsprämie sind für AT/CH nicht geprüft → LandHinweis statt deutscher Werte */}
        {ch || land === "AT" ? <LandHinweis land={land} thema={TEXTE.de.ablauf.hinweisThema} themaEn={TEXTE.de.ablauf.hinweisThemaEn} /> : <><Zeitleiste />{!land && <p className="mt-4 text-right"><GiltFuer /></p>}</>}
      </Section>

      {/* FAQ */}
      <Section tone="white" space="lg">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <SectionHeading eyebrow={w.faqKopf.eyebrow} title={w.faqKopf.titel} lead={w.faqKopf.lead} />
          <Faq items={t.faq ?? w.faq} />
        </div>
      </Section>

      <Querverweise items={ch ? querverweiseCh(t, w) : Array.isArray(t.querverweise) ? t.querverweise : w.querverweise} />

      <CtaBand
        eyebrow={w.cta.eyebrow}
        title={w.cta.titel}
        text={t.cta?.text ?? w.cta.text}
        primary={{ label: w.cta.primaer, href: pfad("/flaechencheck") }}
        secondary={t.cta?.secondary ?? { label: w.cta.sekundaer, href: pfad("/rechner/pacht") }}
      />
    </div>
  );
}

export const generateMetadata = seitenMetadata("/freiflaeche", metadataFuer);
