// src/app/kommunen/page.js – Solarparks für Gemeinden und Stadtwerke
//
// Sprachmodell: feste Texte im Wörterbuch TEXTE (en nur Texte), Länderinhalt AT über inhaltFuerSprache().
import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import Faq from "@/components/ui/Faq";
import CtaBand from "@/components/ui/CtaBand";
import Querverweise from "@/components/Reusable/Querverweise";
import Hero from "@/components/Kommune/Seite/Hero";
import Fakten from "@/components/Kommune/Seite/Fakten";
import Wertschoepfung from "@/components/Kommune/Seite/Wertschoepfung";
import Verfahren from "@/components/Kommune/Seite/Verfahren";
import Kriterien from "@/components/Kommune/Seite/Kriterien";
import Partner from "@/components/Kommune/Seite/Partner";
import Anfrage from "@/components/Kommune/Seite/Anfrage";
import { BEISPIEL as beispiel, tsd, tsdEn } from "@/components/Kommune/Seite/daten";
import { abs, SITE } from "@/data/site";
import { KOMMUNE } from "@/lib/invest/markt";
import { fmt } from "@/lib/rechner/annahmen";
import JsonLd from "@/components/JsonLd";
import { pfad } from "@/lib/land";
import { faqFuerLand } from "@/components/Land/Laenderteile";
import { seitenLand, seitenMetadata, spracheDerAnfrage } from "@/lib/land/seite";
import { inhaltFuerSprache, uebersetze } from "@/lib/sprache/woerterbuch";
import { fmtZahl } from "@/lib/sprache/format";

const PFAD = pfad("/kommunen");
const TITEL = "Solarpark für Gemeinden: Planung & Beteiligung | ÖkoInvest";
const BESCHREIBUNG =
  "Was Solarparks Gemeinden bringen: Gewerbesteuer zu 90 % am Standort, § 6 EEG mit 0,2 ct/kWh, Pacht, Bürgerbeteiligung – dazu Bauleitplanung und Kriterien.";

const metadata = {
  title: TITEL,
  description: BESCHREIBUNG,
  keywords: ["Solarpark Gemeinde", "Kommunalbeteiligung § 6 EEG", "Gewerbesteuer Solarpark", "Bauleitplanung Freiflächen-PV", "Kriterienkatalog Freiflächen-Photovoltaik", "Stadtwerke Solarpark", "Bürgerbeteiligung Solarpark"],
  alternates: { canonical: abs(PFAD) },
  openGraph: { type: "website", url: abs(PFAD), siteName: "ÖkoInvest", title: TITEL, description: BESCHREIBUNG, images: [{ url: abs("/img/solarpark-baeume.jpg"), width: 1280, height: 852, alt: "Solarpark mit Bäumen am Rand" }] },
};


const FAQ = [
  {
    q: "Was bringt ein Solarpark einer Gemeinde konkret?",
    nurDE: true, // deutsches Recht: gemeinsame Seite mit „(gilt für Deutschland)“ (W3-0)
    a: `Drei direkte Einnahmen: die freiwillige Zahlung nach § 6 EEG von bis zu ${fmt(KOMMUNE.beteiligungCt, 1)} ct/kWh ab dem ersten Jahr, die Gewerbesteuer – bei Solaranlagen zu ${fmt(KOMMUNE.gewerbesteuerStandort * 100)} % an der Standortgemeinde – und Pacht, wenn Gemeindeflächen genutzt werden. Bei einem 20-MWp-Park kommen allein aus § 6 EEG rund ${tsd(beispiel.jahre[0].p6)} im Jahr zusammen. In mehreren Bundesländern – etwa Bayern (ab 5 MW), Brandenburg, Mecklenburg-Vorpommern, Niedersachsen, Saarland, Sachsen und Sachsen-Anhalt – schreiben Landesgesetze eine Beteiligung der Gemeinde vor; Details stehen im Ratgeber zur Kommunalbeteiligung. Dazu kommen Aufträge für regionale Betriebe und Beteiligungsmöglichkeiten für Bürger.`,
  },
  {
    q: "Wie läuft das Bauleitplanverfahren?",
    nurDE: true, // deutsches Recht: gemeinsame Seite mit „(gilt für Deutschland)“ (W3-0)
    a: "In der Regel stellt die Gemeinde einen vorhabenbezogenen oder angebotsbezogenen Bebauungsplan auf und ändert parallel den Flächennutzungsplan. Nach dem Aufstellungsbeschluss folgen die frühzeitige Beteiligung von Öffentlichkeit und Behörden, der Entwurf mit Umweltbericht, die Veröffentlichung im Internet (§ 3 Abs. 2 BauGB), die Abwägung und der Satzungsbeschluss. Eine Vereinbarung über die § 6-Zahlung darf erst nach dem Satzungsbeschluss geschlossen werden (§ 6 Abs. 4 EEG). Die Planungskosten trägt üblicherweise der Projektentwickler über einen städtebaulichen Vertrag. Realistisch sind ein bis zwei Jahre.",
  },
  {
    q: "Braucht jeder Solarpark einen Bebauungsplan?",
    nurDE: true, // deutsches Recht: gemeinsame Seite mit „(gilt für Deutschland)“ (W3-0)
    a: "Nicht jeder. Nach § 35 Abs. 1 Nr. 8 b BauGB sind Freiflächenanlagen in einem 200-Meter-Streifen entlang von Autobahnen und Schienenwegen des übergeordneten Netzes mit mindestens zwei Hauptgleisen privilegiert. Kleine Agri-PV-Anlagen bis 2,5 ha Grundfläche mit räumlich-funktionalem Bezug zu einem landwirtschaftlichen Betrieb sind ebenfalls privilegiert. Auch dann bleibt die Gemeinde über ihr Einvernehmen beteiligt – und viele Betreiber bieten die § 6-Zahlung trotzdem an.",
  },
  {
    q: "Wozu ein Kriterienkatalog?",
    a: "Ein vom Gemeinderat beschlossener Kriterienkatalog macht transparent, welche Flächen für Solarparks in Frage kommen und welche Anforderungen gelten – etwa zu Bodengüte, Abstand zur Wohnbebauung, Landschaftsbild, Naturschutz, Größe, Bürgerbeteiligung und Rückbausicherheit. Das spart Zeit im Verfahren und schafft Akzeptanz, weil alle Projektträger nach denselben Regeln bewertet werden.",
  },
  {
    q: "Wie können sich Bürger beteiligen?",
    nurDE: true, // deutsches Recht: gemeinsame Seite mit „(gilt für Deutschland)“ (W3-0)
    a: "Über eine Genossenschaft mit kleinen Anteilen, über Nachrangdarlehen oder über vergünstigte Stromtarife. Mit Energy Sharing nach § 42c EnWG können Bürger und Gemeinde künftig Strom aus Anlagen in der Region gemeinsam nutzen. Einige Bundesländer verlangen inzwischen ausdrücklich Beteiligungsangebote für Bürger und Gemeinden.",
  },
  {
    q: "Wie ist die Lage in Österreich und der Schweiz?",
    a: "In Österreich widmet die Gemeinde Flächen für Photovoltaik (z. B. als Grünland-Photovoltaik) im Rahmen der Raumordnung des Bundeslandes; dazu kommen je nach Größe elektrizitäts- und naturschutzrechtliche Bewilligungen des Landes. Einen eigenen UVP-Tatbestand für Photovoltaik kennt das UVP-G nach aktuellem Stand nicht. Eine Gewerbesteuer gibt es nicht – im Vordergrund stehen Pacht, Beteiligung und Erneuerbare-Energie-Gemeinschaften. In der Schweiz braucht eine Anlage ausserhalb der Bauzone ein Baugesuch bei der Gemeinde und eine kantonale Ausnahmebewilligung, die es nur für standortgebundene Anlagen gibt (Art. 24ter RPG); eine Nutzungsplanung verlangen einzelne Kantone ab bestimmten Grössen. Anlagen über 5 MW, die nicht an Gebäuden angebracht sind, sind UVP-pflichtig. Seit 2026 können lokale Elektrizitätsgemeinschaften (LEG) Strom innerhalb der Gemeinde teilen.",
  },
];

// ---------------------------------------------------------------------------------------------
// Österreich (Länderinhalt, src/lib/land/inhalte.js): § 6 EEG, Gewerbesteuer und BauGB gelten nicht.
// Quellen: § 33 EAG (RIS, abgerufen 04.10.2026); Koordinationsstelle Energiegemeinschaften, FAQ zum ElWG
// (abgerufen 04.10.2026); Regionsdateien NÖ/OÖ/Bgld/Ktn (Widmung, Behörden). AT-Frage aus der gemeinsamen FAQ.
// ---------------------------------------------------------------------------------------------
const FAQ_AT = [
  {
    q: "Was bringt ein Solarpark einer Gemeinde in Österreich?",
    a: "Pacht, wenn Gemeindeflächen genutzt werden, Strom aus dem Park über eine Erneuerbare-Energie-Gemeinschaft im Nahebereich und Beteiligungsmodelle für Gemeinde und Bürger. Dazu kommen Aufträge für regionale Betriebe. Eine Gewerbesteuer wie in Deutschland gibt es nicht, und die Zahlung nach § 6 EEG ist deutsches Recht.",
  },
  {
    q: "Wie läuft die Widmung für einen Solarpark?",
    a: "Die Gemeinde ändert ihren Flächenwidmungsplan bzw. ihr örtliches Raumordnungsprogramm, etwa zu Grünland-Photovoltaik. Das Land gibt dafür Zonen, Kriterien und Größengrenzen vor und prüft die Widmung als Aufsichtsbehörde. Dazu kommen je nach Größe die elektrizitätsrechtliche Bewilligung des Landes und eine naturschutzrechtliche Bewilligung, meist bei der Bezirkshauptmannschaft.",
  },
  {
    q: "Welche Regeln setzt das Land?",
    a: "Das ist je Bundesland verschieden: Niederösterreich hat 116 PV-Zonen, außerhalb davon ist eine Widmung in der Regel nur bis 2 ha möglich. Im Burgenland sind Freiflächenanlagen nur in Eignungszonen zulässig, Kärnten begrenzt Widmungen im Grünland grundsätzlich auf 4 ha je zusammenhängender Fläche, Oberösterreich bewertet nach einem landesweiten Kriterienkatalog.",
  },
  {
    q: "Was bedeutet der EAG-Abschlag für Gemeindeflächen?",
    a: "Bei der Marktprämie sinkt der Zuschlagswert für PV auf landwirtschaftlich genutzten Flächen oder im Grünland um 25 % (§ 33 EAG). Vorbelastete Flächen – Deponien, Altlasten, Bergbau- und Infrastrukturstandorte – sind ausgenommen, ebenso Agri-PV. Solche Gemeindeflächen sind daher besonders interessant.",
  },
  {
    q: "Kann die Gemeinde Mitglied einer Energiegemeinschaft werden?",
    a: "Ja. Gemeinden können sich an Erneuerbare-Energie-Gemeinschaften beteiligen. Seit 1. Oktober 2026 regelt das ElWG die gemeinsame Energienutzung neu – mit zusätzlichen Modellen. Neue Modelle erhalten bis Ende 2026 keine reduzierten Netzentgelte; die Sätze ab 2027 legt die neue Systemnutzungsentgelte-Verordnung fest.",
  },
  {
    q: "Wozu ein Kriterienkatalog der Gemeinde?",
    a: FAQ.find((f) => f.q === "Wozu ein Kriterienkatalog?").a,
  },
  {
    q: "Wie ist die Lage in Deutschland und der Schweiz?",
    a: "In Deutschland stellt die Gemeinde in der Regel einen Bebauungsplan auf; sie kann nach § 6 EEG bis zu 0,2 ct/kWh erhalten und bekommt einen Großteil der Gewerbesteuer. In der Schweiz braucht eine Anlage außerhalb der Bauzone ein Baugesuch bei der Gemeinde und eine kantonale Ausnahmebewilligung, die es nur für standortgebundene Anlagen gibt (Art. 24ter RPG).",
  },
];

const QUERVERWEISE_AT = [
  { href: "/energiegemeinschaften", titel: "Energiegemeinschaften", text: "EEG, BEG und die neuen Modelle nach ElWG – mit Strom aus dem Park." },
  { href: "/regionen", titel: "Regionen in Österreich", text: "Widmung, Zonen und Behörden je Bundesland – mit Quellen." },
  { href: "/genossenschaft", titel: "Genossenschaft", text: "Bürger und Landwirte beteiligen sich am Solarpark vor Ort." },
  { href: "/freiflaeche", titel: "Freiflächen-PV", text: "Widmung, Zonen und EAG-Abschlag im Überblick." },
  { href: "/prozess", titel: "Projektablauf", text: "Von der Fläche bis zur Inbetriebnahme – alle Schritte im Überblick." },
];

// ---------------------------------------------------------------------------------------------
// Schweiz (Länderinhalt): § 6 EEG, Gewerbesteuer und BauGB gelten nicht. Quellen: RPG Stand 01.01.2026
// (Art. 24ter), LEG seit 01.01.2026 mit Abschlag auf das Netznutzungsentgelt (src/components/Gemeinschaft/laender.js);
// Aussagen zur Schweiz aus der gemeinsamen FAQ (Welle 1). Ohne Pacht-, Kosten- und Zeitwerte. Schreibweise ohne ß.
// ---------------------------------------------------------------------------------------------
const FAQ_CH = [
  {
    q: "Was bringt ein Solarpark einer Gemeinde in der Schweiz?",
    a: "Pacht, wenn Gemeindeflächen genutzt werden, Strom aus Anlagen in der Gemeinde über eine lokale Elektrizitätsgemeinschaft (LEG) und Beteiligungsmodelle für Gemeinde und Bürger. Dazu kommen Aufträge für regionale Betriebe. Die Zahlung nach § 6 EEG und die Gewerbesteuer sind deutsches Recht und gelten in der Schweiz nicht.",
  },
  {
    q: "Wie läuft die Bewilligung für einen Solarpark?",
    a: "Das Baugesuch wird bei der Gemeinde eingereicht und öffentlich aufgelegt. Ausserhalb der Bauzone braucht die Anlage eine kantonale Ausnahmebewilligung, die es nur für standortgebundene Anlagen gibt (Art. 24ter RPG); eine Nutzungsplanung verlangen einzelne Kantone ab bestimmten Grössen. Anlagen über 5 MW, die nicht an Gebäuden angebracht sind, sind UVP-pflichtig.",
  },
  {
    q: "Was ist eine lokale Elektrizitätsgemeinschaft?",
    a: "Seit 1. Januar 2026 können Teilnehmende innerhalb derselben Gemeinde und Netzebene Strom aus erneuerbaren Anlagen teilen. Dafür gibt es einen Abschlag auf das Netznutzungsentgelt – 40 % auf derselben Netzebene, 20 % über mehrere Ebenen.",
  },
  {
    q: "Wozu ein Kriterienkatalog der Gemeinde?",
    a: FAQ.find((f) => f.q === "Wozu ein Kriterienkatalog?").a.replace(/ß/g, "ss"),
  },
  {
    q: "Wie ist die Lage in Deutschland und Österreich?",
    a: "In Deutschland stellt die Gemeinde in der Regel einen Bebauungsplan auf; sie kann nach § 6 EEG bis zu 0,2 ct/kWh erhalten und bekommt einen Grossteil der Gewerbesteuer. In Österreich widmet die Gemeinde Flächen für Photovoltaik (z. B. als Grünland-Photovoltaik) im Rahmen der Raumordnung des Bundeslandes; eine Gewerbesteuer gibt es dort nicht.",
  },
];

const QUERVERWEISE_CH = [
  { href: "/energiegemeinschaften", titel: "LEG und vZEV", text: "Lokale Elektrizitätsgemeinschaft und virtueller ZEV – Strom innerhalb der Gemeinde teilen." },
  { href: "/regionen/schweiz", titel: "Solarpark und Agri-PV in der Schweiz", text: "Art. 24ter RPG, HEIV-Auktionen und Kantone – mit Quellen." },
  { href: "/genossenschaft", titel: "Genossenschaft", text: "Bürger und Landwirte beteiligen sich am Solarpark vor Ort." },
  { href: "/freiflaeche", titel: "Freiflächen-PV", text: "Standortgebundenheit nach Art. 24ter RPG und Bewilligung im Überblick." },
  { href: "/prozess", titel: "Projektablauf", text: "Von der Fläche bis zur Inbetriebnahme – alle Schritte im Überblick." },
];

// ---------------------------------------------------------------------------------------------
// Englisch (Sprachmodell): inhaltlich identisch, deutsche und österreichische Rechtsbegriffe erklärt
// ---------------------------------------------------------------------------------------------
const z = (n, stellen = 0) => fmtZahl(n, stellen, "en");
const TITEL_EN = "Solar parks for municipalities: planning & participation | ÖkoInvest";
const BESCHREIBUNG_EN =
  "What solar parks bring municipalities: 90 % of trade tax at the site, § 6 EEG with 0.2 ct/kWh, lease, citizen participation – plus zoning and criteria.";
const metadataEn = {
  title: TITEL_EN,
  description: BESCHREIBUNG_EN,
  keywords: ["solar park municipality", "municipal participation § 6 EEG", "trade tax solar park", "zoning ground-mounted PV", "catalogue of criteria ground-mounted photovoltaics", "municipal utility solar park", "citizen participation solar park"],
  openGraph: { title: TITEL_EN, description: BESCHREIBUNG_EN, images: [{ alt: "Solar park with trees along the edge" }] },
};

const FAQ_EN = [
  {
    q: "What exactly does a solar park bring a municipality?",
    a: `Three direct sources of income: the voluntary payment under § 6 EEG (German Renewable Energy Sources Act) of up to ${z(KOMMUNE.beteiligungCt, 1)} ct/kWh from the first year, trade tax – for solar installations, ${z(KOMMUNE.gewerbesteuerStandort * 100)} % goes to the host municipality – and lease income if municipal land is used. For a 20 MWp park, § 6 EEG alone brings in around ${tsdEn(beispiel.jahre[0].p6)} a year. In several federal states – such as Bavaria (from 5 MW), Brandenburg, Mecklenburg-Western Pomerania, Lower Saxony, Saarland, Saxony and Saxony-Anhalt – state laws require municipal participation; details are in the guide on municipal participation. In addition, there are contracts for regional businesses and participation opportunities for citizens.`,
  },
  {
    q: "How does the zoning procedure work?",
    a: "As a rule, the municipality draws up a project-related or general development plan (Bebauungsplan) and amends the land use plan in parallel. The resolution to draw up the plan is followed by early participation of the public and authorities, the draft with an environmental report, publication online (§ 3 (2) BauGB, German Federal Building Code), the weighing of interests and adoption as a by-law. An agreement on the § 6 payment may only be concluded after adoption of the by-law (§ 6 (4) EEG). The project developer usually bears the planning costs via an urban development contract. One to two years is realistic.",
  },
  {
    q: "Does every solar park need a development plan?",
    a: "Not every one. Under § 35 (1) no. 8 b BauGB, ground-mounted installations in a 200-metre strip along motorways and main-network railways with at least two main tracks are privileged. Small agrivoltaic installations with a footprint of up to 2.5 ha that are spatially and functionally linked to a farm are also privileged. Even then, the municipality remains involved through its consent – and many operators offer the § 6 payment anyway.",
  },
  {
    q: "What is a catalogue of criteria for?",
    a: "A catalogue of criteria adopted by the municipal council makes it transparent which land is suitable for solar parks and which requirements apply – for example on soil quality, distance to housing, landscape, nature conservation, size, citizen participation and decommissioning security. This saves time in the procedure and builds acceptance, because all project developers are assessed according to the same rules.",
  },
  {
    q: "How can citizens participate?",
    a: "Through a cooperative with small shares, through subordinated loans or through discounted power tariffs. With energy sharing under § 42c EnWG (German Energy Industry Act), citizens and the municipality will in future be able to share power from installations in the region. Some federal states now expressly require participation offers for citizens and municipalities.",
  },
  {
    q: "What is the situation in Austria and Switzerland?",
    a: "In Austria, the municipality zones land for photovoltaics (e.g. as ‘Grünland-Photovoltaik’) within the spatial planning framework of the federal state; depending on size, permits under the state’s electricity and nature conservation law are also needed. According to the current status, the Environmental Impact Assessment Act (UVP-G) does not have a separate category for photovoltaics. There is no trade tax – the focus is on lease, participation and renewable energy communities. In Switzerland, an installation outside the building zone needs a building application to the municipality and a cantonal exemption permit, which is only granted for site-bound installations (Art. 24ter RPG, Spatial Planning Act); some cantons require land use planning above certain sizes. Installations over 5 MW that are not attached to buildings require an environmental impact assessment. Since 2026, local electricity communities (LEG) have been able to share power within the municipality.",
  },
];

// Österreich auf Englisch: Übersetzung von FAQ_AT (gleiche Quellen, Reihenfolge wie FAQ_AT)
const FAQ_AT_EN = [
  {
    q: "What does a solar park bring a municipality in Austria?",
    a: "Lease income if municipal land is used, power from the park via a renewable energy community nearby, and participation models for the municipality and citizens. In addition, there are contracts for regional businesses. There is no trade tax as in Germany, and the payment under § 6 EEG is German law.",
  },
  {
    q: "How does zoning for a solar park work?",
    a: "The municipality amends its zoning plan (Flächenwidmungsplan) or its local spatial planning programme, for example to ‘Grünland-Photovoltaik’. The state sets zones, criteria and size limits for this and reviews the zoning as the supervisory authority. Depending on size, the state’s permit under electricity law and a permit under nature conservation law, usually from the district authority (Bezirkshauptmannschaft), are also required.",
  },
  {
    q: "What rules does the federal state set?",
    a: "This differs from state to state: Lower Austria has 116 PV zones, outside of which zoning is generally only possible up to 2 ha. In Burgenland, ground-mounted installations are only permitted in suitability zones; Carinthia limits zoning in grassland to 4 ha per contiguous area in principle; Upper Austria assesses according to a state-wide catalogue of criteria.",
  },
  {
    q: "What does the EAG reduction mean for municipal land?",
    a: "Under the market premium, the award value for PV on agriculturally used land or in grassland is reduced by 25 % (§ 33 EAG, Renewable Energy Expansion Act). Pre-impacted land – landfills, contaminated sites, mining and infrastructure sites – is exempt, as are agrivoltaics. Such municipal land is therefore particularly interesting.",
  },
  {
    q: "Can the municipality become a member of an energy community?",
    a: "Yes. Municipalities can participate in renewable energy communities. Since 1 October 2026, the ElWG (Electricity Industry Act) has reorganised shared energy use – with additional models. New models will not receive reduced grid fees until the end of 2026; the rates from 2027 will be set by the new system usage charges ordinance.",
  },
  {
    q: "What is a municipal catalogue of criteria for?",
    a: FAQ_EN[3].a,
  },
  {
    q: "What is the situation in Germany and Switzerland?",
    a: "In Germany, the municipality generally draws up a development plan (Bebauungsplan); under § 6 EEG it can receive up to 0.2 ct/kWh and it gets most of the trade tax. In Switzerland, an installation outside the building zone needs a building application to the municipality and a cantonal exemption permit, which is only granted for site-bound installations (Art. 24ter RPG).",
  },
];

const QUERVERWEISE_AT_EN = [
  { titel: "Energy communities", text: "EEG, BEG and the new models under the ElWG – with power from the park." },
  { titel: "Regions in Austria", text: "Zoning, zones and authorities by federal state – with sources." },
  { titel: "Cooperative", text: "Citizens and farmers participate in the local solar park." },
  { titel: "Ground-mounted PV", text: "Zoning, zones and the EAG reduction at a glance." },
  { titel: "Project process", text: "From the land to commissioning – all steps at a glance." },
];

// Schweiz auf Englisch: Übersetzung von FAQ_CH (gleiche Quellen, gleiche Reihenfolge)
const FAQ_CH_EN = [
  {
    q: "What does a solar park bring a municipality in Switzerland?",
    a: "Lease income if municipal land is used, power from installations in the municipality via a local electricity community (LEG), and participation models for the municipality and citizens. In addition, there are contracts for regional businesses. The payment under § 6 EEG and trade tax are German law and do not apply in Switzerland.",
  },
  {
    q: "How does the permit for a solar park work?",
    a: "The building application is submitted to the municipality and put on public display. Outside the building zone, the installation needs a cantonal exemption permit, which is only granted for site-bound installations (Art. 24ter RPG, Spatial Planning Act); some cantons require land use planning above certain sizes. Installations over 5 MW that are not attached to buildings require an environmental impact assessment.",
  },
  {
    q: "What is a local electricity community?",
    a: "Since 1 January 2026, participants within the same municipality and grid level can share power from renewable installations. In return, there is a discount on the grid usage fee – 40 % on the same grid level, 20 % across several levels.",
  },
  {
    q: "What is a municipal catalogue of criteria for?",
    a: FAQ_EN.find((f) => f.q === "What is a catalogue of criteria for?").a,
  },
  {
    q: "What is the situation in Germany and Austria?",
    a: "In Germany, the municipality usually draws up a development plan (Bebauungsplan); it can receive up to 0.2 ct/kWh under § 6 EEG and gets a large share of the trade tax. In Austria, the municipality zones land for photovoltaics (e.g. as ‘Grünland-Photovoltaik’) within the spatial planning framework of the federal state; there is no trade tax there.",
  },
];

const QUERVERWEISE_CH_EN = [
  { titel: "LEG and vZEV", text: "Local electricity community and virtual self-consumption group – share power within the municipality." },
  { titel: "Solar parks and agrivoltaics in Switzerland", text: "Art. 24ter RPG, HEIV auctions and cantons – with sources." },
  { titel: "Cooperative", text: "Citizens and farmers participate in the local solar park." },
  { titel: "Ground-mounted PV", text: "Site-bound status under Art. 24ter RPG and permits at a glance." },
  { titel: "Project process", text: "From the land to commissioning – all steps at a glance." },
];

/** Feste Texte der Seite (en nur Texte, Listen je Index). */
const TEXTE = {
  de: {
    schema: { name: "Solarparks und Beteiligungsmodelle für Kommunen und Stadtwerke", serviceType: "Projektentwicklung Freiflächen-PV mit kommunaler Beteiligung", audience: "Kommunen, Stadtwerke, Gemeinderäte", description: BESCHREIBUNG },
    faqKopf: { eyebrow: "Häufige Fragen", titel: "Solarparks in der Gemeinde" },
    querverweise: [
      { titel: "Kommunal-Rechner", text: "§ 6 EEG, Gewerbesteuer und Pacht mit Ihrem Hebesatz – Jahr für Jahr." },
      { titel: "Genossenschaft", text: "Bürger und Landwirte beteiligen sich am Solarpark vor Ort." },
      { titel: "Solarcarports", text: "Parkplätze an Rathaus, Schule und Bad – Solarpflicht und Ladepunkte." },
      { titel: "Projektablauf", text: "Von der Fläche bis zur Inbetriebnahme – alle Schritte im Überblick." },
      { titel: "Kommunale Beteiligung § 6 EEG", text: "Was die Gemeinde erhält und wie der Vertrag aussieht." },
      { titel: "Bürgerenergie und Akzeptanz", text: "Solarparks gemeinsam mit der Region planen." },
    ],
    cta: {
      eyebrow: "Für Kommunen",
      titel: "Planungshoheit bei Ihnen, Arbeit bei uns.",
      textAt: "Wir entwickeln Solarparks mit der Gemeinde – mit Beteiligungsangebot, Energiegemeinschaft und offenen Zahlen. Die Planungskosten trägt der Entwickler.",
      textCh: "Wir entwickeln Solarparks mit der Gemeinde – mit Beteiligungsangebot, lokaler Elektrizitätsgemeinschaft und offenen Zahlen. Die Planungskosten trägt der Entwickler.",
      text: "Wir entwickeln Solarparks mit der Gemeinde – mit § 6-Vertrag, Beteiligungsangebot und offenen Zahlen. Die Planungskosten trägt der Entwickler.",
      primaer: "Gespräch anfragen",
      sekAt: "Energiegemeinschaften",
      sek: "Kommunal-Rechner",
    },
  },
  en: {
    schema: { name: "Solar parks and participation models for municipalities and municipal utilities", serviceType: "Project development of ground-mounted PV with municipal participation", audience: "Municipalities, municipal utilities, municipal councils", description: BESCHREIBUNG_EN },
    faqKopf: { eyebrow: "Frequently asked questions", titel: "Solar parks in the municipality" },
    querverweise: [
      { titel: "Municipal calculator", text: "§ 6 EEG, trade tax and lease with your multiplier – year by year." },
      { titel: "Cooperative", text: "Citizens and farmers participate in the local solar park." },
      { titel: "Solar carports", text: "Car parks at the town hall, school and pool – solar obligation and charging points." },
      { titel: "Project process", text: "From the land to commissioning – all steps at a glance." },
      { titel: "Municipal participation § 6 EEG", text: "What the municipality receives and what the contract looks like." },
      { titel: "Community energy and acceptance", text: "Planning solar parks together with the region." },
    ],
    cta: {
      eyebrow: "For municipalities",
      titel: "Planning authority with you, the work with us.",
      textAt: "We develop solar parks together with the municipality – with a participation offer, an energy community and open figures. The developer bears the planning costs.",
      textCh: "We develop solar parks together with the municipality – with a participation offer, a local electricity community and open figures. The developer bears the planning costs.",
      text: "We develop solar parks together with the municipality – with a § 6 agreement, a participation offer and open figures. The developer bears the planning costs.",
      primaer: "Request a meeting",
      sekAt: "Energy communities",
      sek: "Municipal calculator",
    },
  },
};

export default async function KommunenSeite({ params }) {
  const land = await seitenLand(params);
  const sprache = spracheDerAnfrage();
  const w = uebersetze(TEXTE, sprache);
  const at = land === "AT";
  const ch = land === "CH";
  const faq = inhaltFuerSprache({ de: { gemeinsam: FAQ, AT: FAQ_AT, CH: FAQ_CH }, en: { gemeinsam: FAQ_EN, AT: () => FAQ_AT_EN, CH: () => FAQ_CH_EN } }, land, sprache);
  const querverweiseAt = sprache === "en" ? QUERVERWEISE_AT.map((q, i) => ({ ...q, ...QUERVERWEISE_AT_EN[i] })) : QUERVERWEISE_AT;
  const querverweiseCh = sprache === "en" ? QUERVERWEISE_CH.map((q, i) => ({ ...q, ...QUERVERWEISE_CH_EN[i] })) : QUERVERWEISE_CH;
  const schema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: w.schema.name,
    serviceType: w.schema.serviceType,
    provider: { "@id": `${SITE.url}/#organization` },
    areaServed: ["DE", "AT", "CH"],
    audience: { "@type": "Audience", audienceType: w.schema.audience },
    url: abs(PFAD),
    description: w.schema.description,
  };

  return (
    // Spannungsbogen: Hero (navy) → Fakten → Wertschöpfung (white) → Bauleitplanung (sand) → Kriterien (white)
    // → Akzeptanz & Stadtwerke (navy, Anker Mitte) → Anfrage (sand) → FAQ (white) → Querverweise → CTA.
    <div className="[&_.ov-lead]:hyphens-manual [&_h2]:hyphens-manual! lg:[&_p]:hyphens-manual">
      <JsonLd daten={schema} />

      <Hero />
      <Fakten />
      <Wertschoepfung />
      <Verfahren />
      <Kriterien />
      <Partner />
      <Anfrage />

      {/* ---------------- FAQ ---------------- */}
      <Section tone="white" space="lg">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <SectionHeading eyebrow={w.faqKopf.eyebrow} title={w.faqKopf.titel} />
          <Faq items={faqFuerLand(faq, land, { sprache })} />
        </div>
      </Section>

      <Querverweise
        items={at ? querverweiseAt : ch ? querverweiseCh : [
          { href: pfad("/rechner/kommune"), ...w.querverweise[0] },
          { href: pfad("/genossenschaft"), ...w.querverweise[1] },
          { href: pfad("/solarcarport"), ...w.querverweise[2] },
          { href: pfad("/prozess"), ...w.querverweise[3] },
          { href: "/ratgeber/kommunale-beteiligung-6-eeg", ...w.querverweise[4] },
          { href: "/ratgeber/buergerenergie-solarpark-akzeptanz", ...w.querverweise[5] },
        ]}
      />

      <CtaBand
        eyebrow={w.cta.eyebrow}
        title={w.cta.titel}
        text={at ? w.cta.textAt : ch ? w.cta.textCh : w.cta.text}
        primary={{ label: w.cta.primaer, href: "#anfrage" }}
        secondary={at || ch ? { label: w.cta.sekAt, href: pfad("/energiegemeinschaften") } : { label: w.cta.sek, href: pfad("/rechner/kommune") }}
      />
    </div>
  );
}

export const generateMetadata = seitenMetadata("/kommunen", metadata, { en: metadataEn });
