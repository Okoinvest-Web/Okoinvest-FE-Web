// src/app/page.js (Startseite ÖkoInvest)
//
// Sprachmodell: dieselbe Seite unter /, /de|at|ch, /en und /en/de|at|ch. Alle Texte stehen im
// Wörterbuch TEXTE (de vollständig, en nur Texte – Icons, Bilder, hrefs und Zahlen aus de;
// Regeln: src/lib/sprache/woerterbuch.js). Länderinhalt AT (FAQ, Reststrom-Hinweis) über
// inhaltFuerSprache(): Englisch + AT nur mit eigener englischer AT-Fassung.

import Image from "next/image";
import Link from "@/components/Land/Link";
import {
  ArrowRight, ArrowUpRight, BatteryCharging, Building2, Car, Check, ClipboardCheck, FileSignature, Handshake,
  HardHat, LineChart, MapPinned, Network, Search, ShieldCheck, Sprout, Sun, Users,
} from "lucide-react";

import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import Button from "@/components/ui/Button";
import Reveal from "@/components/ui/Reveal";
import CountUp from "@/components/ui/CountUp";
import Steps from "@/components/ui/Steps";
import Faq from "@/components/ui/Faq";
import RollenCtaBand from "@/components/Home/RollenCtaBand";
import { PfadZeichnen, TextEnthuellung, Zaehler } from "@/components/motion";
import s from "@/components/Home/startseite.module.css";
import ZielgruppenWahl from "@/components/Home/ZielgruppenWahl";
import WerkzeugFinder from "@/components/Home/WerkzeugFinder";
import Werttreppe from "@/components/Home/Werttreppe";
import Kreislauf from "@/components/Home/Kreislauf";
import HomeBoerse from "@/components/Home/HomeBoerse";
import HeroTiefe from "@/components/Home/HeroTiefe";
import Sprungnavigation from "@/components/Home/Sprungnavigation";
import Vertrauensleiste from "@/components/Home/Vertrauensleiste";
import Stagger from "@/components/ui/Stagger";
import { SpotGrossspeicher, SpotSolarcarport } from "@/components/illustrationen";
import { TOOLS } from "@/components/Rechner/tools";
import { KENNZAHLEN, SITE, abs } from "@/data/site";
import { FREIFLAECHE, PACHT, PROVISION, STROM } from "@/lib/invest/markt";
import { fmt } from "@/lib/rechner/annahmen";
import JsonLd from "@/components/JsonLd";
import { pfad, seitenPfad } from "@/lib/land";
import { LandHinweis } from "@/components/Land/LandHinweis";
import { seitenLand, seitenMetadata, spracheDerAnfrage } from "@/lib/land/seite";
import { chText } from "@/data/laender/ch/schreibung";
import { inhaltFuerSprache, uebersetze } from "@/lib/sprache/woerterbuch";
import { fmtZahl } from "@/lib/sprache/format";

// Ländermodell (Entscheidung 6): „/“ nie zwischenspeichern – mit Cookie „land“ leitet die
// Middleware auf das gewählte Land um, ohne Cookie (auch Suchmaschinen) nie.
export const dynamic = "force-dynamic";

const META = {
  title: "Solarpark, Agri-PV & Projektbörse im DACH-Raum | ÖkoInvest",
  description:
    "Fläche verpachten, Agri-PV umsetzen, PV-Projekte kaufen oder verkaufen: ÖkoInvest entwickelt Solarparks in DE, AT und CH. Jetzt Fläche kostenlos prüfen.",
};

const META_EN = {
  title: "Solar parks, agri-PV & project exchange DACH | ÖkoInvest",
  description:
    "Lease your land, implement agrivoltaics, buy or sell PV projects: ÖkoInvest develops solar parks in DE, AT and CH. Check your land free of charge now.",
};

const metadata = {
  title: META.title,
  description: META.description,
  openGraph: {
    type: "website",
    locale: "de_DE",
    url: abs("/"),
    siteName: "ÖkoInvest",
    title: META.title,
    description: META.description,
    images: [{ url: abs("/img/solarpark-himmel.jpg"), width: 1280, height: 852, alt: "Solarpark unter blauem Himmel" }],
  },
};

const metadataEn = {
  title: META_EN.title,
  description: META_EN.description,
  openGraph: { title: META_EN.title, description: META_EN.description, images: [{ alt: "Solar park under a blue sky" }] },
};

const LOESUNGEN = [
  { titel: "Freiflächen-PV", text: "Solarparks ab rund 3 Hektar – von der Flächensicherung über Bauleitplanung und Netzanschluss bis zum Betrieb.", href: pfad("/freiflaeche"), bild: "/img/solarpark-himmel.jpg", icon: Sun, gross: true },
  { titel: "Agri-PV", text: "Landwirtschaft und Stromerzeugung auf derselben Fläche.", href: pfad("/agri-pv"), bild: "/img/freiflaeche-begehung.jpg", icon: Sprout },
  { titel: "Solarcarports", text: "Parkplätze als Kraftwerk – mit Ladepunkten.", href: pfad("/solarcarport"), icon: Car, ton: "gruen", spot: SpotSolarcarport },
  { titel: "Großspeicher", text: "Batteriespeicher am Park und am Netzknoten.", href: pfad("/grossspeicher"), icon: BatteryCharging, ton: "navy", spot: SpotGrossspeicher },
  { titel: "Virtuelles Kraftwerk", text: "Erzeugung, Speicher und Verbrauch im Pool.", href: pfad("/virtuelles-kraftwerk"), bild: "/img/pv-wind-abend.jpg", icon: Network },
];

const FAQ = [
  {
    q: "Was verdient man mit der Verpachtung einer Fläche für einen Solarpark?",
    a: `Für Freiflächen-Photovoltaik werden in Deutschland heute meist etwa ${fmt(PACHT.freiflaecheProHa.min)} bis ${fmt(PACHT.freiflaecheProHa.max)} € je Hektar und Jahr gezahlt – ein Vielfaches der landwirtschaftlichen Pacht. Entscheidend sind Netzanschluss, Größe, Lage in der EEG-Flächenkulisse und das Pachtmodell (fest, indexiert oder mit Umsatzbeteiligung). Der Flächencheck zeigt Ihnen die Spanne für Ihre Fläche.`,
  },
  {
    q: "Wie groß muss eine Fläche für einen Solarpark sein?",
    a: `Wirtschaftlich wird ein Solarpark meist ab rund ${FREIFLAECHE.mindestHa} Hektar; pro Megawatt-Peak werden etwa ${fmt(FREIFLAECHE.haProMwp, 1)} Hektar benötigt. Kleinere Flächen können sich lohnen, wenn ein Netzanschluss sehr nah ist oder sie sich mit Nachbarflächen bündeln lassen – das übernehmen wir.`,
  },
  {
    q: "Wie lange dauert es von der Anfrage bis zum fertigen Solarpark?",
    a: "Ehrlich gesagt: meist zwei bis vier Jahre. Bauleitplanung, Gutachten, Netzanschluss und Ausschreibung brauchen ihre Zeit. Die Pacht beginnt in der Regel mit dem Baubeginn; viele Verträge sehen vorher eine Reservierungsprämie vor. Den Stand sehen Sie jederzeit im Portal.",
  },
  {
    q: "Was kostet die Projektbörse?",
    a: `Für Investoren und Flächeneigentümer ist die Plattform kostenfrei. Anbieter von Projekten zahlen eine Erfolgsprovision von ${PROVISION.verkaeufer.text}. Einzelheiten stehen in der Provisionsvereinbarung, die vor der Veröffentlichung abgeschlossen wird.`,
  },
  {
    q: "Wie senkt der Reststrom-Pool die Stromkosten meines Unternehmens?",
    a: "Netzentgelte, Umlagen und Steuern sind für alle gleich. Der Hebel liegt bei der Beschaffung: Im Pool kaufen viele Unternehmen gemeinsam und strukturiert ein, Tagesstrom kommt per Liefervertrag aus Solarparks der Gruppe und Flexibilität wird gemeinsam vermarktet. Wie viel das bei Ihnen ausmacht, zeigt der Reststrom-Rechner.",
  },
  {
    q: "Ist ÖkoInvest ein eigenständiges Unternehmen?",
    a: "Ja. Die ÖkoInvest GmbH mit Sitz in Ostermiething (Österreich) ist die Projektgesellschaft der ÖKOVOLT Gruppe für Freiflächen-PV, Agri-PV, Contracting und Stromlieferverträge. Die Gruppe plant, baut und betreibt Solarkraftwerke seit 2010.",
  },
];

// Österreich (Länderinhalt, src/lib/land/inhalte.js): ohne ungeprüfte Pacht- und Zeitwerte, EAG statt EEG.
// Quellen: § 33 EAG (RIS, abgerufen 04.10.2026); Reststrom-Pool „Standort zunächst in Deutschland“ (/reststrom).
const FAQ_AT = FAQ.map((f, i) => {
  if (i === 0)
    return {
      q: f.q,
      a: "Pachtwerte für Österreich werden geprüft – Ihr Angebot erhalten Sie nach der Prüfung Ihrer Fläche. Entscheidend sind Widmung bzw. Lage in einer PV-Zone, Netzanschluss, Größe und das Pachtmodell (fest, indexiert oder mit Umsatzbeteiligung). Wichtig: Bei der EAG-Marktprämie sinkt der Zuschlagswert für Anlagen auf Acker- und Grünland um 25 % (§ 33 EAG) – Agri-PV und vorbelastete Flächen sind ausgenommen. Der Flächencheck gibt Ihnen eine erste Einschätzung.",
    };
  if (i === 2)
    return {
      q: f.q,
      a: "Ehrlich gesagt: meist mehrere Jahre. Widmung, Bewilligungen, Netzanschluss und gegebenenfalls die EAG-Ausschreibung brauchen ihre Zeit – wie lange, hängt in Österreich stark von Bundesland und Umspannwerk ab. Die Pacht beginnt in der Regel mit dem Baubeginn; viele Verträge sehen vorher eine Reservierungsprämie vor. Den Stand sehen Sie jederzeit im Portal.",
    };
  if (i === 4) return { q: f.q, a: `${f.a} Der Pool startet zunächst in Deutschland; Standorte in Österreich prüfen wir im Einzelfall.` };
  return f;
});

// Schweiz (Länderinhalt): ohne ungeprüfte Pacht- und Zeitwerte, Begriffe nach RPG (src/data/laender/ch/freiflaeche.js).
// Projektdauer bewusst ohne Zahl (für die Schweiz nicht geprüft). Schreibweise ohne ß.
const FAQ_CH = FAQ.map((f, i) => {
  if (i === 0)
    return {
      q: f.q,
      a: "Pachtwerte für die Schweiz werden geprüft – Ihr Angebot erhalten Sie nach der Prüfung Ihrer Parzelle. Entscheidend sind Zone und Bewilligungsfähigkeit (ausserhalb der Bauzone nur unter den Voraussetzungen von Art. 24ter RPG), Netzanschluss, Grösse und das Pachtmodell (fest, indexiert oder mit Umsatzbeteiligung). Der Flächencheck gibt Ihnen eine erste Einschätzung.",
    };
  if (i === 1) return { q: chText(f.q), a: chText(f.a) };
  if (i === 2)
    return {
      q: f.q,
      a: "Ehrlich gesagt: meist mehrere Jahre. Richtplan, Baubewilligung durch Gemeinde und Kanton, Netzanschluss und Förderung brauchen ihre Zeit – wie lange, hängt in der Schweiz stark vom Kanton und vom Standort ab. Den Stand sehen Sie jederzeit im Portal.",
    };
  if (i === 4) return { q: f.q, a: `${chText(f.a)} Der Pool richtet sich derzeit an Betriebe in Deutschland; Standorte in der Schweiz prüfen wir im Einzelfall.` };
  return { q: chText(f.q), a: chText(f.a) };
});

// Englisch (Sprachmodell): inhaltlich identisch mit der deutschen Fassung, Zahlen im englischen Format.
const z = (n, stellen = 0) => fmtZahl(n, stellen, "en");
const PROVISION_EN = `${z(PROVISION.verkaeufer.min * 100, 1)}–${z(PROVISION.verkaeufer.max * 100)} % of the purchase price, only on successful closing`;

const FAQ_EN = [
  {
    q: "How much can you earn by leasing land for a solar park?",
    a: `For ground-mounted photovoltaics, landowners in Germany today are typically paid around €${z(PACHT.freiflaecheProHa.min)} to €${z(PACHT.freiflaecheProHa.max)} per hectare per year – many times the agricultural lease. What matters are the grid connection, size, location within the EEG land categories (German Renewable Energy Sources Act) and the lease model (fixed, indexed or with a revenue share). The land check shows you the range for your land.`,
  },
  {
    q: "How large does land need to be for a solar park?",
    a: `A solar park usually becomes economical from around ${FREIFLAECHE.mindestHa} hectares; about ${z(FREIFLAECHE.haProMwp, 1)} hectares are needed per megawatt peak. Smaller sites can be worthwhile if a grid connection is very close or they can be combined with neighbouring land – we take care of that.`,
  },
  {
    q: "How long does it take from the enquiry to a finished solar park?",
    a: "To be honest: usually two to four years. Zoning, expert reports, grid connection and tendering take time. The lease usually starts when construction begins; many contracts provide for a reservation fee beforehand. You can see the status in the portal at any time.",
  },
  {
    q: "What does the project exchange cost?",
    a: `The platform is free of charge for investors and landowners. Sellers of projects pay a success fee of ${PROVISION_EN}. The details are set out in the commission agreement, which is concluded before publication.`,
  },
  {
    q: "How does the residual power pool lower my company’s power costs?",
    a: "Grid fees, levies and taxes are the same for everyone. The lever is procurement: in the pool, many companies buy together in a structured way, daytime power comes from the group’s solar parks under a supply contract, and flexibility is marketed jointly. The residual power calculator shows what this means for you.",
  },
  {
    q: "Is ÖkoInvest an independent company?",
    a: "Yes. ÖkoInvest GmbH, based in Ostermiething (Austria), is the project company of the ÖKOVOLT Group for ground-mounted PV, agrivoltaics, contracting and power purchase agreements. The group has been planning, building and operating solar power plants since 2010.",
  },
];

// Österreich auf Englisch: Übersetzung von FAQ_AT (gleiche Quellen, keine zusätzlichen Werte)
const FAQ_AT_EN = FAQ_EN.map((f, i) => {
  if (i === 0)
    return {
      q: f.q,
      a: "Lease rates for Austria are being reviewed – you will receive your offer once we have assessed your land. What matters are the zoning or location in a PV zone, the grid connection, size and the lease model (fixed, indexed or with a revenue share). Important: under the EAG market premium (Austrian Renewable Energy Expansion Act), the award value for plants on arable land and grassland is reduced by 25 % (§ 33 EAG) – agrivoltaics and pre-impacted land are exempt. The land check gives you an initial assessment.",
    };
  if (i === 2)
    return {
      q: f.q,
      a: "To be honest: usually several years. Zoning, permits, grid connection and, where applicable, the EAG tender take time – how long depends heavily on the federal state and the substation in Austria. The lease usually starts when construction begins; many contracts provide for a reservation fee beforehand. You can see the status in the portal at any time.",
    };
  if (i === 4) return { q: f.q, a: `${f.a} The pool starts in Germany first; we assess sites in Austria case by case.` };
  return f;
});

// Schweiz auf Englisch: Übersetzung von FAQ_CH (keine zusätzlichen Werte)
const FAQ_CH_EN = FAQ_EN.map((f, i) => {
  if (i === 0)
    return {
      q: f.q,
      a: "Lease rates for Switzerland are being reviewed – you will receive your offer once we have assessed your plot. What matters are the zone and whether a permit can be granted (outside the building zone only under the conditions of Art. 24ter RPG, Swiss Spatial Planning Act), the grid connection, size and the lease model (fixed, indexed or with a revenue share). The land check gives you an initial assessment.",
    };
  if (i === 2)
    return {
      q: f.q,
      a: "To be honest: usually several years. The cantonal structure plan, the building permit from the municipality and canton, the grid connection and funding take time – how long depends heavily on the canton and the site in Switzerland. You can see the status in the portal at any time.",
    };
  if (i === 4) return { q: f.q, a: `${f.a} The pool is currently aimed at businesses in Germany; we assess sites in Switzerland case by case.` };
  return f;
});

/** Alle Texte der Startseite. en enthält nur Texte; Listen werden je Index zusammengeführt. */
const TEXTE = {
  de: {
    meta: META,
    heroBild: "Reihen eines großen Solarparks",
    heroBadge: "Projektentwicklung der ÖKOVOLT Gruppe",
    heroZeile1: "Aus Flächen",
    heroZeile2: "werden",
    heroZeile2b: "Kraftwerke.",
    heroLead: "Wir entwickeln Solarparks, Agri-PV und Solarcarports – und bringen auf einer Plattform zusammen, was dafür nötig ist: Flächen, Projekte, Kapital und Abnehmer für den Strom.",
    heroPrimaer: "Fläche kostenlos prüfen",
    heroSekundaer: "Zur Projektbörse",
    heroPunkte: ["Entwicklung, Bau & Betrieb aus einer Gruppe", "Für Eigentümer & Investoren kostenfrei", "Status jederzeit im Portal"],
    kennzahlen: [
      { einheit: "MWp", label: "gehen pro Jahr neu in die Entwicklung" },
      { einheit: "Jahre", label: "Erfahrung der ÖKOVOLT Gruppe" },
      { einheit: "Länder", label: "Deutschland, Österreich, Schweiz" },
      { einheit: "Jahre", label: "typische Pachtlaufzeit – plus Optionen" },
    ],
    kreislauf: {
      eyebrow: "Eine Plattform, vier Seiten",
      titelA: "Jeder bringt etwas mit.",
      titelB: "Wir machen daraus ein Kraftwerk.",
      lead: "Ein Solarpark braucht vier Dinge: eine Fläche, ein genehmigtes Projekt, Kapital und jemanden, der den Strom abnimmt. Wir entwickeln selbst – und verbinden auf der Plattform alle, die eines davon haben oder suchen.",
      karten: [
        { k: "Fläche", t: "Flächeneigentümer & Landwirte", x: "Pacht, Agri-PV oder Beteiligung" },
        { k: "Projekt", t: "Projektentwickler", x: "Projekte vermarkten über die Börse" },
        { k: "Kapital", t: "Investoren", x: "Auf Plausibilität vorgeprüfte Projekte" },
        { k: "Strom", t: "Unternehmen & Bürger", x: "Strom aus dem Pool, Genossenschaft" },
      ],
      unterschrift: "Pacht, Rendite und günstiger Strom fließen an die zurück, die etwas einbringen.",
    },
    loesungen: {
      eyebrow: "Was wir entwickeln",
      titelA: "Vom Acker bis zum Parkplatz.",
      titelB: "Jede Fläche zählt.",
      lead: `Rund ${KENNZAHLEN.entwicklungMwProJahr} MWp gehen bei uns jedes Jahr neu in die Entwicklung – Freiflächen, Agri-PV, Parkplätze und Speicher. Baureif werden sie Schritt für Schritt über die folgenden Jahre.`,
      button: "So entsteht ein Projekt",
      mehr: "Mehr erfahren",
      liste: LOESUNGEN,
    },
    boerse: {
      eyebrow: "Projektbörse",
      titelA: "Der Marktplatz für PV-Projekte",
      titelB: "im DACH-Raum.",
      lead: "Projektrechte, baureife Projekte und Bestandsanlagen – geprüft, vertraulich und mit klarem Ablauf von der ersten Anfrage bis zum Closing.",
      punkte: [
        { icon: ClipboardCheck, t: "Geprüft veröffentlicht", x: "Jedes Projekt durchläuft vor der Freigabe eine Plausibilitätsprüfung." },
        { icon: ShieldCheck, t: "Vertraulich bis zur NDA", x: "Genaue Lage und Unterlagen sehen nur freigegebene Investoren." },
        { icon: FileSignature, t: "Vom Datenraum zum LOI", x: "Anfragen, Dokumente und Absichtserklärungen digital im Portal." },
        { icon: Handshake, t: "Faire Provision", x: `Für Käufer kostenfrei. Verkäufer zahlen ${PROVISION.verkaeufer.text}.` },
      ],
      primaer: "Projekte entdecken",
      sekundaer: "Projekt anbieten",
    },
    energie: {
      eyebrow: "Reststrom-Pool für den Mittelstand",
      titelA: "Was die eigene Anlage nicht schafft,",
      titelB: "kaufen wir gemeinsam ein.",
      lead: "Auch mit Photovoltaik und Speicher bleibt Strom, den ein Betrieb aus dem Netz beziehen muss. Im virtuellen Kraftwerk von ÖkoInvest bündeln wir diesen Reststrom vieler Unternehmen – mit strukturierter Beschaffung, Solarstrom aus Parks der Gruppe und gemeinsam vermarkteter Flexibilität.",
      primaer: "Ersparnis berechnen",
      sekundaer: "So funktioniert der Pool",
      hebelTitel: "Hebel auf die Beschaffung",
      hebel: STROM.poolHebel.map((h) => h.label),
      potenzial: "Potenzial je kWh, je nach Profil",
      fuss: "Netzentgelte, Umlagen und Steuern bleiben unverändert.",
    },
    tools: {
      eyebrow: "Rechner & Tools",
      titelA: "Erst rechnen.",
      titelB: "Dann entscheiden.",
      lead: `${TOOLS.length} kostenlose Werkzeuge für Eigentümer, Landwirte, Investoren, Unternehmen und Gemeinden – mit offengelegten Annahmen.`,
      einstieg: "Guter Einstieg",
      check: "Flächencheck in wenigen Minuten",
    },
    prozess: {
      eyebrow: "Von der Fläche zum Kraftwerk",
      titel: "Ein klarer Weg – und Sie sehen jeden Schritt.",
      lead: "Jede Anfrage wird ein Vorgang mit festem Ansprechpartner. Status, Dokumente und Nachrichten finden Sie im Portal.",
      button: "Prozess im Detail",
      schritte: [
        { icon: Search, title: "Prüfen", text: "Flächencheck, Netzanfrage, Restriktionen – in wenigen Wochen wissen Sie, ob und wie es geht." },
        { icon: FileSignature, title: "Sichern", text: "Pacht- oder Kooperationsvertrag mit Dienstbarkeit, Rückbausicherheit und klaren Fristen." },
        { icon: ClipboardCheck, title: "Entwickeln", text: "Bauleitplanung mit der Gemeinde, Gutachten, Netzanschluss, Ausschreibung oder PPA." },
        { icon: HardHat, title: "Bauen & Betreiben", text: "Errichtung mit der ÖKOVOLT Gruppe, danach Betrieb, Direktvermarktung und Monitoring." },
      ],
    },
    gruppe: {
      bild: "Firmensitz der ÖKOVOLT Gruppe mit Servicefahrzeugen",
      seit: "seit",
      zeitleiste: ["Planung und Bau von Photovoltaik in DE und AT", "betreibt die Gruppe eigene Solarparks"],
      eyebrow: "ÖKOVOLT Gruppe",
      titel: "Wir entwickeln, was wir selbst bauen und betreiben würden.",
      lead: "ÖkoInvest ist die Projektgesellschaft der ÖKOVOLT Gruppe. Seit 2010 plant und baut die Gruppe Photovoltaik in Deutschland und Österreich, seit 2012 auch eigene Solarparks – mit eigener Montage und eigener Rammtechnik für die Fundamente.",
      punkte: [
        { icon: Sun, t: "Entwicklung aus Betreibersicht", x: "Wir planen Parks so, wie wir sie selbst 30 Jahre betreiben wollen – Ertrag, Wartung, Rückbau inklusive." },
        { icon: HardHat, t: "Bau in der Gruppe", x: "Planung, Montage und Rammtechnik kommen aus einem Verbund – weniger Schnittstellen, mehr Verlässlichkeit." },
        { icon: ShieldCheck, t: "Digital und transparent", x: "Vorgänge, Dokumente und Status laufen über die Plattform – für alle Beteiligten nachvollziehbar." },
      ],
      button: "Über ÖkoInvest",
    },
    faq: {
      eyebrow: "Häufige Fragen",
      titel: "Kurz und ehrlich beantwortet",
      lead: "Mehr Antworten finden Sie in den FAQ und im Ratgeber.",
      alle: "Alle FAQ",
      ratgeber: "Ratgeber",
    },
    reststromAt: "Der Reststrom-Pool startet zunächst in Deutschland; Standorte in Österreich prüfen wir im Einzelfall. Rechenwerte für Österreich werden geprüft – Ergebnis auf Anfrage.",
    reststromCh: "Der Reststrom-Pool richtet sich derzeit an Betriebe in Deutschland; Standorte in der Schweiz prüfen wir im Einzelfall. Rechenwerte für die Schweiz werden geprüft – Ergebnis auf Anfrage.",
  },
  en: {
    meta: META_EN,
    heroBild: "Rows of a large solar park",
    heroBadge: "Project development of the ÖKOVOLT Group",
    heroZeile1: "Turning land",
    heroZeile2: "into",
    heroZeile2b: "power plants.",
    heroLead: "We develop solar parks, agrivoltaics and solar carports – and bring together on one platform everything this takes: land, projects, capital and buyers for the power.",
    heroPrimaer: "Check your land free of charge",
    heroSekundaer: "To the project exchange",
    heroPunkte: ["Development, construction & operation from one group", "Free of charge for owners & investors", "Status in the portal at any time"],
    kennzahlen: [
      { label: "enter development every year" },
      { einheit: "years", label: "experience of the ÖKOVOLT Group" },
      { einheit: "countries", label: "Germany, Austria, Switzerland" },
      { einheit: "years", label: "typical lease term – plus options" },
    ],
    kreislauf: {
      eyebrow: "One platform, four sides",
      titelA: "Everyone brings something.",
      titelB: "We turn it into a power plant.",
      lead: "A solar park needs four things: land, an approved project, capital and someone to buy the power. We develop ourselves – and connect everyone on the platform who has or is looking for one of them.",
      karten: [
        { k: "Land", t: "Landowners & farmers", x: "Lease, agrivoltaics or participation" },
        { k: "Project", t: "Project developers", x: "Market projects via the exchange" },
        { k: "Capital", t: "Investors", x: "Projects pre-checked for plausibility" },
        { k: "Power", t: "Businesses & citizens", x: "Power from the pool, cooperative" },
      ],
      unterschrift: "Lease income, returns and affordable power flow back to those who contribute.",
    },
    loesungen: {
      eyebrow: "What we develop",
      titelA: "From farmland to car parks.",
      titelB: "Every site counts.",
      lead: `Around ${KENNZAHLEN.entwicklungMwProJahr} MWp enter development with us every year – ground-mounted sites, agrivoltaics, car parks and storage. They become ready-to-build step by step over the following years.`,
      button: "How a project comes about",
      mehr: "Learn more",
      liste: [
        { titel: "Ground-mounted PV", text: "Solar parks from around 3 hectares – from securing the land through zoning and grid connection to operation." },
        { titel: "Agrivoltaics", text: "Farming and power generation on the same land." },
        { titel: "Solar carports", text: "Car parks as power plants – with charging points." },
        { titel: "Battery storage", text: "Battery storage at the park and at the grid node." },
        { titel: "Virtual power plant", text: "Generation, storage and consumption in a pool." },
      ],
    },
    boerse: {
      eyebrow: "Project exchange",
      titelA: "The marketplace for PV projects",
      titelB: "in the DACH region.",
      lead: "Project rights, ready-to-build projects and operating assets – checked, confidential and with a clear process from the first enquiry to closing.",
      punkte: [
        { t: "Published after review", x: "Every project undergoes a plausibility check before approval." },
        { t: "Confidential until the NDA", x: "Only approved investors see the exact location and documents." },
        { t: "From data room to LOI", x: "Enquiries, documents and letters of intent online in the portal." },
        { t: "Fair commission", x: `Free of charge for buyers. Sellers pay ${PROVISION_EN}.` },
      ],
      primaer: "Discover projects",
      sekundaer: "Offer a project",
    },
    energie: {
      eyebrow: "Residual power pool for SMEs",
      titelA: "What your own plant cannot cover,",
      titelB: "we buy together.",
      lead: "Even with photovoltaics and storage, a business still has to draw some power from the grid. In ÖkoInvest’s virtual power plant, we pool this residual power from many companies – with structured procurement, solar power from the group’s parks and jointly marketed flexibility.",
      primaer: "Calculate savings",
      sekundaer: "How the pool works",
      hebelTitel: "Levers on procurement",
      hebel: ["Pooling & structured procurement", "Solar power from the group’s parks (PPA)", "Flexibility & storage in the virtual power plant"],
      potenzial: "Potential per kWh, depending on profile",
      fuss: "Grid fees, levies and taxes remain unchanged.",
    },
    tools: {
      eyebrow: "Calculators & tools",
      titelA: "Calculate first.",
      titelB: "Then decide.",
      lead: `${TOOLS.length} free tools for owners, farmers, investors, businesses and municipalities – with disclosed assumptions.`,
      einstieg: "Good starting point",
      check: "Land check in a few minutes",
    },
    prozess: {
      eyebrow: "From land to power plant",
      titel: "A clear path – and you see every step.",
      lead: "Every enquiry becomes a case with a dedicated contact person. You will find status, documents and messages in the portal.",
      button: "The process in detail",
      schritte: [
        { title: "Check", text: "Land check, grid enquiry, restrictions – within a few weeks you will know whether and how it works." },
        { title: "Secure", text: "Lease or cooperation agreement with easement, decommissioning security and clear deadlines." },
        { title: "Develop", text: "Zoning with the municipality, expert reports, grid connection, tender or PPA." },
        { title: "Build & operate", text: "Construction with the ÖKOVOLT Group, followed by operation, direct marketing and monitoring." },
      ],
    },
    gruppe: {
      bild: "Head office of the ÖKOVOLT Group with service vehicles",
      seit: "since",
      zeitleiste: ["planning and building photovoltaics in DE and AT", "the group has operated its own solar parks"],
      eyebrow: "ÖKOVOLT Group",
      titel: "We develop what we would build and operate ourselves.",
      lead: "ÖkoInvest is the project company of the ÖKOVOLT Group. Since 2010 the group has been planning and building photovoltaics in Germany and Austria, and since 2012 also its own solar parks – with its own installation teams and its own pile-driving equipment for the foundations.",
      punkte: [
        { t: "Development from an operator’s perspective", x: "We plan parks the way we want to operate them ourselves for 30 years – yield, maintenance and decommissioning included." },
        { t: "Construction within the group", x: "Planning, installation and pile driving come from one network – fewer interfaces, more reliability." },
        { t: "Digital and transparent", x: "Cases, documents and status run via the platform – traceable for everyone involved." },
      ],
      button: "About ÖkoInvest",
    },
    faq: {
      eyebrow: "Frequently asked questions",
      titel: "Answered briefly and honestly",
      lead: "You will find more answers in the FAQ and in the guides.",
      alle: "All FAQ",
      ratgeber: "Guides",
    },
    reststromAt: "The residual power pool starts in Germany first; we assess sites in Austria case by case. Figures for Austria are being reviewed – result on request.",
    reststromCh: "The residual power pool is currently aimed at businesses in Germany; we assess sites in Switzerland case by case. Figures for Switzerland are being reviewed – result on request.",
  },
};

export default async function HomePage({ params }) {
  const land = await seitenLand(params);
  const sprache = spracheDerAnfrage();
  const en = sprache === "en";
  const t = uebersetze(TEXTE, sprache);
  const faq = inhaltFuerSprache({ de: { gemeinsam: FAQ, AT: FAQ_AT, CH: FAQ_CH }, en: { gemeinsam: FAQ_EN, AT: FAQ_AT_EN, CH: FAQ_CH_EN } }, land, sprache);
  const zahl = (n, stellen = 0) => (en ? fmtZahl(n, stellen, "en") : fmt(n, stellen));
  const poolMin = STROM.poolHebel.reduce((s, h) => s + h.ct.min, 0);
  const poolMax = STROM.poolHebel.reduce((s, h) => s + h.ct.max, 0);

  const kennzahlen = [
    { value: KENNZAHLEN.entwicklungMwProJahr, prefix: "~", einheit: t.kennzahlen[0].einheit, label: t.kennzahlen[0].label },
    { value: new Date().getFullYear() - KENNZAHLEN.erfahrungSeit, suffix: "+", einheit: t.kennzahlen[1].einheit, label: t.kennzahlen[1].label },
    { value: 3, einheit: t.kennzahlen[2].einheit, label: t.kennzahlen[2].label },
    { value: PACHT.laufzeit, einheit: t.kennzahlen[3].einheit, label: t.kennzahlen[3].label },
  ];

  // Gemeinsame deutsche Seite wie vor Welle 2 (@id …/#webpage); Länder- und Sprachfassungen mit eigener URL
  const seitenUrl = abs(seitenPfad("/", land, sprache));
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${seitenUrl}/#webpage`,
    url: seitenUrl,
    name: t.meta.title,
    description: t.meta.description,
    ...(en ? { inLanguage: "en" } : {}),
    isPartOf: { "@id": `${SITE.url}/#website` },
    about: { "@id": `${SITE.url}/#organization` },
    primaryImageOfPage: abs("/img/solarpark-reihen.jpg"),
  };

  return (
    <div>
      <JsonLd daten={schema} />

      {/* ================= HERO ================= */}
      <section className="relative isolate overflow-hidden bg-navy-950 text-white">
        <Image src="/img/solarpark-reihen.jpg" alt={t.heroBild} fill priority sizes="100vw" className="-z-30 object-cover" />
        <div aria-hidden="true" className="absolute inset-0 -z-20 bg-gradient-to-r from-navy-950 via-navy-950/85 to-navy-950/30" />
        <div aria-hidden="true" className="ov-grid-bg absolute inset-0 -z-20 opacity-40" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-ov-300/40 to-transparent" />
        <div aria-hidden="true" className="absolute inset-0 -z-20 bg-gradient-to-t from-navy-950 via-transparent to-navy-950/40" />
        <HeroTiefe />

        <div className="ov-container grid items-center gap-12 pb-16 pt-14 md:pb-24 md:pt-20 lg:grid-cols-[1.15fr_1fr] lg:gap-14 lg:pb-28 lg:pt-24">
          <div>
            <div className="ov-hero-in">
              <span className="ov-glass inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[13px] font-medium text-white/90">
                <Building2 aria-hidden="true" className="h-3.5 w-3.5 text-ov-300" />
                {t.heroBadge}<span className="hidden sm:inline"> · DE · AT · CH</span>
              </span>
            </div>
            {/* Wort für Wort, reines CSS: erstes Wort nach ~100 ms sichtbar (LCP-sicher, ohne JS vollständig) */}
            <h1 className="ov-display mt-7">
              <TextEnthuellung className="block" verzoegerung={60} schritt={70}>{t.heroZeile1}</TextEnthuellung>
              {" "}
              <TextEnthuellung className="block" verzoegerung={200} schritt={110}>
                {t.heroZeile2} <span className="ov-text-gradient-light">{t.heroZeile2b}</span>
              </TextEnthuellung>
            </h1>
            <p className="ov-lead ov-hero-in mt-7 max-w-xl text-white/75" style={{ "--ov-delay": "180ms" }}>
              {t.heroLead}
            </p>
            <div className="ov-hero-in mt-9 flex flex-col gap-3 sm:flex-row" style={{ "--ov-delay": "260ms" }}>
              <Button href={pfad("/flaechencheck")} size="lg" pfeil magnetisch>{t.heroPrimaer}</Button>
              <Button href="/projektboerse" size="lg" variant="outlineLight">{t.heroSekundaer}</Button>
            </div>
            <ul className="ov-hero-in mt-10 flex max-w-2xl flex-col gap-x-7 gap-y-3 border-t border-white/10 pt-7 text-[14px] leading-snug text-white/85 sm:flex-row sm:flex-wrap" style={{ "--ov-delay": "340ms" }}>
              {t.heroPunkte.map((x) => (
                <li key={x} className="flex items-start gap-2.5">
                  <span aria-hidden="true" className="mt-px flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-ov-400/15 ring-1 ring-inset ring-ov-300/40">
                    <Check className="h-2.5 w-2.5 text-ov-300" strokeWidth={3.5} />
                  </span>
                  {x}
                </li>
              ))}
            </ul>
          </div>

          <div className="ov-hero-in relative" style={{ "--ov-delay": "220ms" }}>
            {/* Lichtschein hinter der Weiche: hebt die Karte als vorderste Ebene ab */}
            <div aria-hidden="true" className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-ov-500/10 blur-2xl" />
            <ZielgruppenWahl />
          </div>
        </div>

        {/* Kennzahlen */}
        <div className="relative border-t border-white/10 bg-navy-950/60 backdrop-blur-md">
          <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-ov-300/40 to-transparent" />
          <Stagger as="dl" delay={420} schritt={90} className="ov-container grid grid-cols-2 gap-y-7 py-8 md:grid-cols-4 md:py-10">
            {kennzahlen.map((k, i) => (
              <div key={k.label} className={`flex flex-col-reverse px-2 md:px-6 ${i > 0 ? "md:border-l md:border-white/10" : ""}`}>
                <dt className="mt-2 text-[13.5px] leading-snug text-white/75">{k.label}</dt>
                <dd className="ov-kpi-l leading-none text-white">
                  <CountUp value={k.value} prefix={k.prefix} suffix={k.suffix} locale={en ? "en-GB" : undefined} />
                  <span className="ov-einheit">{k.einheit}</span>
                </dd>
              </div>
            ))}
          </Stagger>
        </div>
      </section>

      <Sprungnavigation />

      <Vertrauensleiste />

      {/* ================= KREISLAUF ================= */}
      <Section tone="white" space="lg">
        <div className={`${s.block} grid items-center gap-12 lg:grid-cols-[1fr_1fr] lg:gap-20`}>
          <div>
            <SectionHeading
              eyebrow={t.kreislauf.eyebrow}
              title={<>{t.kreislauf.titelA} <span className="ov-text-gradient">{t.kreislauf.titelB}</span></>}
              lead={t.kreislauf.lead}
            />
            <Stagger as="ul" className="mt-10 grid gap-3 sm:grid-cols-2">
              {[
                { id: "flaeche", icon: MapPinned, href: pfad("/flaeche-verpachten") },
                { id: "projekt", icon: Search, href: "/projektboerse/anbieten" },
                { id: "kapital", icon: LineChart, href: "/investoren" },
                { id: "strom", icon: Users, href: pfad("/reststrom") },
              ].map((z0, i) => ({ ...z0, ...t.kreislauf.karten[i] })).map((z, i) => (
                <li key={z.t}>
                  <Link href={z.href} data-kl={z.id} className="group ov-lift ov-press flex h-full items-start gap-4 rounded-3xl bg-sand-50 p-5 ring-1 ring-ink-200/60 transition-colors hover:bg-white hover:ring-ov-200">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-ov-600 ring-1 ring-ink-100 transition-colors group-hover:bg-ov-500 group-hover:text-white">
                      <z.icon aria-hidden="true" className="h-5 w-5" />
                    </span>
                    <span>
                      <span className="ov-num block text-[11.5px] font-semibold uppercase tracking-[0.14em] text-ov-700">0{i + 1} · {z.k}</span>
                      <span className="mt-1 block font-display text-[16.5px] font-bold leading-snug text-ink-900">{z.t}</span>
                      <span className="mt-0.5 block text-[14px] text-ink-500">{z.x}</span>
                    </span>
                    <ArrowUpRight aria-hidden="true" className="ml-auto h-4 w-4 shrink-0 text-ink-400 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ov-600" />
                  </Link>
                </li>
              ))}
            </Stagger>
          </div>
          <Reveal dir="scale" className="relative mx-auto w-full max-w-[560px]">
            <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-b from-ov-50 to-sand-50 p-6 ring-1 ring-ov-100 sm:p-10">
              <div aria-hidden="true" className="ov-grid-bg-light absolute inset-0 opacity-70" />
              <div aria-hidden="true" className="absolute left-1/2 top-1/2 h-3/4 w-3/4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/80 blur-3xl" />
              <div className="relative">
                <Kreislauf />
              </div>
              <p className="relative mt-4 text-center text-[13px] leading-snug text-ink-500">{t.kreislauf.unterschrift}</p>
            </div>
          </Reveal>
        </div>
      </Section>

      {/* ================= LÖSUNGEN BENTO ================= */}
      <Section id="loesungen" tone="sand" space="lg" className="scroll-mt-32 md:scroll-mt-28">
        <div className="mb-12 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <SectionHeading
            eyebrow={t.loesungen.eyebrow}
            title={<>{t.loesungen.titelA} <span className="ov-text-gradient">{t.loesungen.titelB}</span></>}
            lead={t.loesungen.lead}
          />
          <Reveal delay={100}>
            <Button href={pfad("/prozess")} variant="secondary" pfeil>{t.loesungen.button}</Button>
          </Reveal>
        </div>

        <Stagger schritt={80} className="grid auto-rows-[220px] grid-cols-2 gap-3 sm:auto-rows-[260px] md:grid-cols-4 md:gap-4 md:auto-rows-[280px]">
          {t.loesungen.liste.map((p) => (
            <div key={p.href} className={p.gross ? "col-span-2 row-span-2" : ""}>
              <Link
                href={p.href}
                data-ton="dunkel"
                className={`ov-spotlight group relative flex h-full flex-col justify-end overflow-hidden rounded-3xl p-4 text-white sm:p-6 md:rounded-[2rem] md:p-8 ${
                  p.ton === "gruen" ? "bg-gradient-to-br from-ov-600 to-ov-800" : "bg-navy-950"
                }`}
              >
                {/* Lichtkegel folgt der Maus (MotionInteraktion, nur Zeigegeräte, nicht bei reduzierter Bewegung) */}
                <span aria-hidden="true" className="ov-spot-licht" />
                {p.bild ? (
                  <>
                    <Image src={p.bild} alt="" fill sizes={p.gross ? "(max-width: 768px) 100vw, 50vw" : "(max-width: 768px) 50vw, 25vw"} className={`object-cover opacity-90 transition-transform duration-[1200ms] ease-out group-hover:scale-105 motion-reduce:transition-none`} />
                    <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-navy-950/95 via-navy-950/35 to-transparent" />
                  </>
                ) : (
                  <>
                    <div aria-hidden="true" className="ov-grid-bg absolute inset-0 opacity-70" />
                    <div aria-hidden="true" className={`absolute -right-10 -top-10 h-40 w-40 rounded-full blur-3xl transition-transform duration-700 group-hover:scale-125 ${p.ton === "gruen" ? "bg-sun-300/30" : "bg-ov-500/40"}`} />
                    {p.spot && (
                      <div aria-hidden="true" className="absolute right-3 top-14 w-20 transition-transform duration-500 ease-ov-out group-hover:-translate-y-1 sm:w-24 md:right-6 md:top-16 md:w-28">
                        <p.spot ton="dunkel" />
                      </div>
                    )}
                  </>
                )}
                <span className="ov-glass absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-2xl sm:h-11 sm:w-11 md:left-6 md:top-6">
                  <p.icon aria-hidden="true" className="h-5 w-5 text-ov-300" />
                </span>
                <span className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full bg-white text-ink-900 translate-y-1 opacity-0 transition-[opacity,transform] duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100 md:right-6 md:top-6">
                  <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
                </span>
                <div className="relative">
                  <h3 className={`font-display font-extrabold tracking-tight ${p.gross ? "text-[clamp(1.75rem,1.3rem+1.6vw,2.75rem)]" : "text-[17px] sm:text-[22px]"}`}>{p.titel}</h3>
                  <p className={`mt-2 text-white/75 ${p.gross ? "max-w-md text-[16.5px]" : "hidden text-[14.5px] sm:block"}`}>{p.text}</p>
                  {p.gross && (
                    <span className="mt-6 inline-flex items-center gap-2 text-[15px] font-semibold text-ov-300">
                      {t.loesungen.mehr} <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </span>
                  )}
                </div>
                {/* Lichtkante: feine Innenlinie, oben heller – gibt der Kachel Tiefe */}
                <span aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-white/10" />
                <span aria-hidden="true" className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
              </Link>
            </div>
          ))}
        </Stagger>
      </Section>

      {/* ================= PROJEKTBÖRSE ================= */}
      <Section id="boerse" tone="white" space="lg" className="scroll-mt-32 md:scroll-mt-28">
        <div className="grid items-start gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:gap-16 xl:gap-20">
          <div>
            <SectionHeading
              eyebrow={t.boerse.eyebrow}
              title={<>{t.boerse.titelA} <span className="ov-text-gradient">{t.boerse.titelB}</span></>}
              lead={t.boerse.lead}
            />
            <Stagger as="ul" className="mt-10 grid gap-x-8 gap-y-7 border-t border-ink-100 pt-8 sm:grid-cols-2">
              {t.boerse.punkte.map((s) => (
                <li key={s.t}>
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ov-50 text-ov-700 ring-1 ring-inset ring-ov-100">
                    <s.icon aria-hidden="true" className="h-5 w-5" />
                  </span>
                  <p className="mt-4 font-display text-[16.5px] font-bold text-ink-900">{s.t}</p>
                  <p className="mt-1 text-[14.5px] leading-relaxed text-ink-600">{s.x}</p>
                </li>
              ))}
            </Stagger>
            <Reveal delay={200} className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button href="/projektboerse" pfeil>{t.boerse.primaer}</Button>
              <Button href="/projektboerse/anbieten" variant="secondary">{t.boerse.sekundaer}</Button>
            </Reveal>
          </div>
          <Reveal dir="right" className="lg:sticky lg:top-28">
            <Werttreppe />
          </Reveal>
        </div>
        <HomeBoerse />
      </Section>

      {/* ================= RESTSTROM-POOL ================= */}
      <Section id="energie" tone="navy" space="lg" className="ov-noise scroll-mt-32 overflow-hidden md:scroll-mt-28">
        <div aria-hidden="true" className="ov-grid-bg absolute inset-0" />
        <div aria-hidden="true" className="absolute -right-32 -top-20 h-[460px] w-[460px] rounded-full bg-ov-500/20 blur-[130px]" />
        <div className="relative grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-20">
          <div>
            <SectionHeading
              dark
              eyebrow={t.energie.eyebrow}
              title={<>{t.energie.titelA} <span className="ov-text-gradient-light">{t.energie.titelB}</span></>}
              lead={t.energie.lead}
            />
            <Reveal delay={150} className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button href={pfad("/rechner/reststrom")} pfeil>{t.energie.primaer}</Button>
              <Button href={pfad("/reststrom")} variant="outlineLight">{t.energie.sekundaer}</Button>
            </Reveal>
          </div>
          {/* Reststrom-Pool zunächst in Deutschland – in AT/CH ohne deutsche ct-Werte (LandHinweis) */}
          {land === "AT" || land === "CH" ? (
            <LandHinweis land={land} text={land === "CH" ? TEXTE.de.reststromCh : TEXTE.de.reststromAt} textEn={land === "CH" ? TEXTE.en.reststromCh : TEXTE.en.reststromAt} />
          ) : (
          <Reveal dir="scale" className="ov-glass rounded-[2rem] p-6 md:p-8">
            <p className="text-[12.5px] font-semibold uppercase tracking-[0.16em] text-ov-300">{t.energie.hebelTitel}</p>
            <ul className="mt-6 space-y-5">
              {STROM.poolHebel.map((h, i) => (
                <li key={h.id}>
                  <div className="flex items-baseline justify-between gap-4 text-[14.5px]">
                    <span className="text-white/85">{t.energie.hebel[i]}</span>
                    <span className="ov-num shrink-0 font-semibold text-white">
                      {zahl(h.ct.min, 1)}–{zahl(h.ct.max, 1)} ct
                    </span>
                  </div>
                  <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/10">
                    {/* Balken läuft beim Einscrollen ein (scaleX über ov-balken-x, Auslöser: umgebendes Reveal) */}
                    <div className="ov-balken-x h-full rounded-full bg-gradient-to-r from-ov-400 to-ov-300" style={{ width: `${(h.ct.max / 2) * 100}%`, "--i": i * 2 }} />
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-7 flex flex-col gap-3 border-t border-white/10 pt-6 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
              <div>
                <p className="text-[13px] text-white/60">{t.energie.potenzial}</p>
                <p className="ov-num whitespace-nowrap font-display text-[34px] font-extrabold leading-none tracking-tight">
                  <Zaehler wert={poolMin} nachkomma={1} dauer={1100} sprache={en ? "en-GB" : undefined} />–<Zaehler wert={poolMax} nachkomma={1} dauer={1300} sprache={en ? "en-GB" : undefined} /> <span className="text-[18px] text-white/70">ct</span>
                </p>
              </div>
              <p className="text-[12px] leading-snug text-white/50 sm:max-w-[12rem] sm:text-right">{t.energie.fuss}</p>
            </div>
          </Reveal>
          )}
        </div>
      </Section>

      {/* ================= TOOLS ================= */}
      <Section id="tools" tone="white" space="lg" className="scroll-mt-32 md:scroll-mt-28">
        <div className="mb-12 flex flex-col justify-between gap-6 md:mb-14 lg:flex-row lg:items-end">
          <SectionHeading
            eyebrow={t.tools.eyebrow}
            title={<>{t.tools.titelA} <span className="ov-text-gradient">{t.tools.titelB}</span></>}
            lead={t.tools.lead}
          />
          <Reveal delay={100} className="shrink-0">
            <Link
              href={pfad("/flaechencheck")}
              className="group ov-lift flex items-center gap-4 rounded-2xl bg-navy-950 p-4 pr-5 text-white shadow-e3 ring-1 ring-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ov-500"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ov-600 text-white">
                <MapPinned aria-hidden="true" className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-[11.5px] font-semibold uppercase tracking-[0.14em] text-sun-300">{t.tools.einstieg}</span>
                <span className="mt-0.5 block font-display text-[16.5px] font-bold">{t.tools.check}</span>
              </span>
              <ArrowRight aria-hidden="true" className="ml-2 h-5 w-5 shrink-0 text-ov-300 transition-transform group-hover:translate-x-1 motion-reduce:transition-none" />
            </Link>
          </Reveal>
        </div>
        <WerkzeugFinder />
      </Section>

      {/* ================= PROZESS ================= */}
      <Section tone="green" space="lg">
        <div className="mb-14 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <SectionHeading
            eyebrow={t.prozess.eyebrow}
            title={t.prozess.titel}
            lead={t.prozess.lead}
          />
          <Reveal delay={100}><Button href={pfad("/prozess")} pfeil>{t.prozess.button}</Button></Reveal>
        </div>
        <div className="relative">
          {/* Energielinie: zeichnet sich durch die vier Schritte, während diese nacheinander erscheinen (nur ab lg, wo die Schritte in einer Reihe stehen) */}
          <PfadZeichnen dauer={1300} verzoegerung={80} className="pointer-events-none absolute inset-x-0 top-7 z-0 hidden -translate-y-px lg:block">
            <svg aria-hidden="true" viewBox="0 0 100 2" preserveAspectRatio="none" className="block h-[2px] w-full overflow-visible">
              <line x1="0" y1="1" x2="100" y2="1" pathLength="1" stroke="var(--color-ov-500)" strokeWidth="2" />
            </svg>
          </PfadZeichnen>
          <Steps
          items={t.prozess.schritte}
          />
        </div>
      </Section>

      {/* ================= GRUPPE ================= */}
      <Section tone="white" space="lg">
        <div className="grid items-center gap-14 lg:grid-cols-[1fr_1.05fr] lg:gap-20">
          <Reveal dir="left" className="relative pb-10 sm:pb-6 lg:pb-0">
            <div aria-hidden="true" className="absolute -left-6 -top-6 h-40 w-40 rounded-full bg-ov-100 blur-3xl" />
            <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] shadow-e4 ring-1 ring-ink-200/60 lg:aspect-[5/6]">
              <Image src="/img/firmensitz.jpg" alt={t.gruppe.bild} fill sizes="(max-width: 1024px) 100vw, 45vw" className="object-cover" />
              <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-navy-950/50 to-transparent" />
            </div>
            {/* Zeitleiste aus belegten Daten (Gründung, eigene Parks) */}
            <ol className="absolute -bottom-2 left-4 right-4 grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-ink-200/70 shadow-e4 ring-1 ring-ink-200/70 sm:left-auto sm:right-6 sm:w-[340px] lg:-right-8">
              {[
                { j: KENNZAHLEN.erfahrungSeit, t: t.gruppe.zeitleiste[0] },
                { j: 2012, t: t.gruppe.zeitleiste[1] },
              ].map((z) => (
                <li key={z.j} className="bg-white p-4">
                  <p className="ov-num font-display text-[26px] font-extrabold leading-none tracking-tight text-ov-600">{t.gruppe.seit} {z.j}</p>
                  <p className="mt-2 text-[12.5px] leading-snug text-ink-600">{z.t}</p>
                </li>
              ))}
            </ol>
          </Reveal>
          <div>
            <SectionHeading
              eyebrow={t.gruppe.eyebrow}
              title={t.gruppe.titel}
              lead={t.gruppe.lead}
            />
            <Stagger as="ul" schritt={90} className="mt-10 divide-y divide-ink-100 border-y border-ink-100">
              {t.gruppe.punkte.map((k) => (
                <li key={k.t} className="flex gap-5 py-6">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ov-50 text-ov-700 ring-1 ring-inset ring-ov-100">
                    <k.icon aria-hidden="true" className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="font-display text-[17.5px] font-bold text-ink-900">{k.t}</h3>
                    <p className="mt-1 text-[15px] leading-relaxed text-ink-600">{k.x}</p>
                  </div>
                </li>
              ))}
            </Stagger>
            <Reveal delay={200} className="mt-8">
              <Button href="/unternehmen" variant="secondary" pfeil>{t.gruppe.button}</Button>
            </Reveal>
          </div>
        </div>
      </Section>

      {/* ================= FAQ ================= */}
      <Section id="faq" tone="sand" space="lg" className="scroll-mt-32 md:scroll-mt-28">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <div>
            <SectionHeading eyebrow={t.faq.eyebrow} title={t.faq.titel} lead={t.faq.lead} />
            <Reveal delay={120} className="mt-8 flex flex-wrap gap-3">
              <Button href={pfad("/faq")} variant="secondary" size="sm" pfeil>{t.faq.alle}</Button>
              <Button href="/ratgeber" variant="ghost" size="sm">{t.faq.ratgeber}</Button>
            </Reveal>
          </div>
          <Faq items={faq} />
        </div>
      </Section>

      <RollenCtaBand />
    </div>
  );
}

export const generateMetadata = seitenMetadata("/", metadata, { en: metadataEn });
