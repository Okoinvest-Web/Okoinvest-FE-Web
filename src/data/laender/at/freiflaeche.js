// Länderinhalt AT für /freiflaeche (Ländermodell, Inhalte AT – Gruppe 1).
//
// Nur Aussagen mit Primärquelle bzw. aus den geprüften Regionsdateien (src/data/regionen/*.js,
// Recherche 29.09.2026, Prüfung Paket E):
//   § 33 EAG (RIS, abgerufen 04.10.2026): Abschlag 25 % auf den Zuschlagswert für PV auf landwirtschaftlich
//     genutzten Flächen oder im Grünland; entfällt ganz oder teilweise u. a. für Agri-PV, Gebäude, künstliche
//     Gewässer, Deponien/Altlasten, Bergbau- und Infrastrukturstandorte, militärische Flächen.
//   EAG-Abwicklungsstelle, 2. PV-Ausschreibung 2026 (bezuschlagt 10.07.2026): 179.033 kWp, Gebote bis 6,69 ct/kWh.
//   Regionsdateien: NÖ 116 Zonen, außerhalb in der Regel max. 2 ha; Bgld nur in Eignungszonen (95, davon 19
//     Beschleunigungsgebiete, LGBl. 55/2026); Ktn 4 ha je zusammenhängender Fläche, vorbelastet bis 10 ha
//     (K-PhV 2024); Stmk Vorrangzonen für Parks über 10 ha (SAPRO); OÖ Kriterienkatalog; HQ30/rote Zone.
//   Faktenregister at.js: region.at.ertrag 1.120 kWh/kWp (PVGIS, geprüft).
// NICHT geprüft für AT (→ kein Wert, LandHinweis): Pacht/Reservierungsprämie in €, Kabel- und Rückbaukosten,
// Zeitplan. Stückzahl der Vorrangzonen Steiermark (36 oder 37) bewusst ohne Zahl.

import { FileCheck2, Landmark, Layers, MapPinned, Mountain, Scale, Sprout } from "lucide-react";
import { FREIFLAECHE } from "@/lib/invest/markt";
import { fmt } from "@/lib/rechner/annahmen";
import { fmtZahl } from "@/lib/sprache/format";

const ERTRAG_AT = 1120; // kWh/kWp·a, Faktenregister region.at.ertrag (PVGIS, Flach- und Hügelland)
const STAND_AT = "04.10.2026";
const mwhJeHa = (ERTRAG_AT / FREIFLAECHE.haProMwp) * 1; // MWh je Hektar und Jahr (1 MWp ≙ haProMwp ha)

export const QUELLEN_AT = Object.freeze({
  eag33: "https://www.ris.bka.gv.at/eli/bgbl/i/2021/150/P33/NOR40236790",
  marktpraemie2026: "https://www.eag-abwicklungsstelle.at/artikel/die-2-ausschreibung-zur-marktpraemie-fuer-pv-anlagen-wurde-mit-10-juli-2026-bezuschlagt/",
});

/** Inhalte der Seite /freiflaeche für Österreich (Rückfall auf gemeinsam über inhaltFuer()). */
export const FREIFLAECHE_AT = {
  hero: {
    marke: "AT",
    pille: `Freiflächen-Photovoltaik in Österreich ab rund ${FREIFLAECHE.mindestHa} Hektar`,
    lead: "Wir entwickeln Freiflächenanlagen in Österreich: von der Flächensicherung über Widmung, Bewilligungen und Netzanschluss bis zum Bau und Betrieb – als Teil einer Gruppe mit Sitz in Oberösterreich, die seit 2012 eigene Solarparks baut.",
    zusagen: ["Flächensicherung bis Betrieb aus einer Hand", "Widmung und Zonen des Bundeslandes geprüft", "Rückbau vertraglich und per Bürgschaft gesichert", "Naturverträglich geplant"],
    ertragKwhProKwp: ERTRAG_AT,
    stromLabel: "Strom (AT)",
    drittWert: { label: "Ertrag (PVGIS)", einheit: "kWh/kWp", wert: ERTRAG_AT },
    bildunterschrift: `Schematische Darstellung · Ertrag mit dem Rechenwert ${fmt(ERTRAG_AT)} kWh/kWp für Flach- und Hügelland in Österreich (PVGIS)`,
  },
  fakten4: { icon: Scale, wert: "25 %", einheit: "EAG-Abschlag", text: "auf Acker- und Grünland bei der Marktprämie – nicht für Agri-PV und vorbelastete Flächen" },
  kette: {
    Baurecht: "Widmung durch den Gemeinderat nach den Zonen und Kriterien des Landes, elektrizitäts- und gegebenenfalls naturschutzrechtliche Bewilligung.",
    "Vermarktung & Finanzierung": "EAG-Marktprämie per Ausschreibung oder Stromliefervertrag (PPA), Bankfinanzierung, Eigenbetrieb oder Verkauf an Investoren.",
  },
  kriterien: {
    "Größe & Zuschnitt": {
      text: "In Österreich setzt oft das Landesrecht die Grenze: in Niederösterreich außerhalb der PV-Zonen in der Regel höchstens 2 ha, in Kärnten grundsätzlich 4 ha je zusammenhängender Fläche, im Burgenland nur in Eignungszonen. Kompakte Zuschnitte sind günstiger, mehrere Eigentümer können Flächen bündeln.",
    },
    Netzentfernung: {
      text: "Je kürzer die Leitung zum Umspannwerk, desto besser. Die Verteilernetzbetreiber veröffentlichen ihre freien Anschlusskapazitäten je Umspannwerk – vielerorts sind sie knapp. Wir prüfen die Lage für Ihren Standort.",
    },
    "Planungsrecht & Kulisse": {
      text: "Flächenwidmung der Gemeinde, PV-Zonen bzw. Eignungs- und Vorrangzonen des Landes und die Haltung der Gemeinde. Vorbelastete Flächen – Deponien, Altlasten, Schottergruben, Infrastruktur – haben die besten Chancen und sind vom EAG-Abschlag ausgenommen.",
    },
  },
  ampel: [
    {
      titel: "Gute Voraussetzungen",
      ton: "gruen",
      punkte: ["Flächen in PV-Zonen, Eignungs- oder Vorrangzonen des Landes", "Deponien, Altlasten, Schottergruben und andere vorbelastete Flächen", "Umspannwerk mit freier Kapazität in der Nähe", "Agri-PV mit weiterlaufender Bewirtschaftung", "Gemeinde, die eine Widmung unterstützt"],
    },
    {
      titel: "Genau prüfen",
      ton: "gelb",
      punkte: ["Flächen außerhalb von Zonen (Größengrenzen je Bundesland)", "Hochwertige Agrarböden – Agri-PV als Alternative", "Landschaftsschutz- und Natura-2000-Gebiete", "Angrenzender Wald, Hangneigung, Drainagen", "Ausgelastete Umspannwerke"],
    },
    {
      titel: "Meist ausgeschlossen",
      ton: "rot",
      punkte: ["Nationalpark, Naturschutzgebiet", "Burgenland: Flächen außerhalb der Eignungszonen", "Rote Gefahrenzonen und 30-jährlicher Hochwasserabflussbereich", "Wald"],
    },
  ],
  kulisse: {
    eyebrow: "Österreich · EAG und Raumordnung der Länder",
    titel: "Widmung und Zone entscheiden über den Standort.",
    lead: "Ob ein Solarpark gebaut werden darf, regelt in Österreich die Raumordnung des Bundeslandes: Die Gemeinde widmet die Fläche, das Land gibt Zonen, Kriterien und Größengrenzen vor. Gefördert werden Parks über die Marktprämie nach dem EAG, die die EAG-Abwicklungsstelle ausschreibt – außerhalb davon finanzieren sie sich über Stromlieferverträge (PPA).",
    box: {
      titel: "25 % Abschlag auf Acker- und Grünland",
      text: "Für Anlagen auf landwirtschaftlich genutzten Flächen oder im Grünland sinkt der Zuschlagswert der Marktprämie um 25 % (§ 33 EAG). Der Abschlag entfällt ganz oder teilweise für Agri-PV, Deponien und Altlasten, Bergbau- und Infrastrukturstandorte sowie Anlagen auf Gebäuden.",
    },
    punkte: [
      { icon: MapPinned, t: "Niederösterreich: Zonen", x: "116 PV-Zonen im Sektoralen Raumordnungsprogramm. Außerhalb davon ist eine Widmung für Freiflächen-PV in der Regel nur bis 2 ha möglich." },
      { icon: Landmark, t: "Burgenland: Eignungszonen", x: "Freiflächenanlagen über Hausgartengröße nur in Eignungszonen, die das Land per Verordnung festlegt – derzeit 95, davon 19 Beschleunigungsgebiete." },
      { icon: Mountain, t: "Kärnten: 4-ha-Grenze", x: "Widmungen im Grünland grundsätzlich bis 4 ha je zusammenhängender Fläche, auf vorbelasteten Flächen bis 10 ha (Photovoltaikanlagen-Verordnung 2024)." },
      { icon: Layers, t: "Steiermark und Oberösterreich", x: "Steiermark: Vorrangzonen des Sachprogramms Solarenergie für Parks über 10 ha. Oberösterreich: landesweiter Kriterienkatalog mit Bodenfruchtbarkeit und Nähe zum Umspannwerk." },
      { icon: Sprout, t: "Agri-PV ohne Abschlag", x: "Agri-PV-Anlagen sind vom 25-%-Abschlag ausgenommen, sofern die landwirtschaftliche Hauptnutzung nicht oder nur geringfügig beeinträchtigt wird (§ 33 EAG)." },
      { icon: FileCheck2, t: "Marktprämie 2026", x: "In der 2. Ausschreibung 2026 (bezuschlagt am 10. Juli 2026, 179.033 kWp) kamen Gebote bis 6,69 ct/kWh zum Zug." },
    ],
    fuss: `Ob Ihre Fläche in einer Zone liegt und welche Grenzen Ihr Bundesland setzt, prüfen wir grundstücksgenau. Stand ${STAND_AT}, ohne Gewähr – maßgeblich sind EAG, Raumordnungsgesetze und Verordnungen der Länder in der geltenden Fassung.`,
  },
  oekologieText2:
    "In Österreich knüpfen einzelne Länder die Widmung an ökologische Auflagen – in Niederösterreich etwa an ein Ökologiekonzept für Anlagen in den PV-Zonen. Welche Maßnahmen ein Park umsetzt, steht im Pflegekonzept des jeweiligen Projekts.",
  rueckbau: {
    kacheln: {
      "Dienstbarkeit im Grundbuch": "Eine im Grundbuch eingetragene Dienstbarkeit sichert den Betrieb – und bindet auch jeden Rechtsnachfolger an die vertragliche Rückbaupflicht.",
      Wiederherstellung: "Pfosten ziehen, Kabel bergen, Boden lockern – die Fläche geht in landwirtschaftlich nutzbarem Zustand zurück. Die Kosten sichert die Rückbaubürgschaft.",
    },
  },
  zeitplanLead: "Viele Schritte laufen parallel – mit Gemeinde, Land und Netzbetreiber.",
  faq: [
    {
      q: "Ab welcher Flächengröße lohnt sich ein Solarpark?",
      a: `Wir entwickeln Solarparks in der Regel ab rund ${FREIFLAECHE.mindestHa} Hektar. In Österreich gibt aber oft das Landesrecht die Größe vor: In Niederösterreich ist außerhalb der PV-Zonen in der Regel nur eine Widmung bis 2 ha möglich, in Kärnten grundsätzlich bis 4 ha je zusammenhängender Fläche, im Burgenland nur in Eignungszonen. Kleinere Flächen können sich mit Agri-PV oder als Teil eines Verbunds lohnen.`,
    },
    {
      q: "Wie viel Strom erzeugt ein Hektar Solarpark in Österreich?",
      a: `Mit dem Rechenwert von ${fmt(ERTRAG_AT)} kWh je kWp für Flach- und Hügelland (PVGIS) erzeugt ein Hektar mit rund ${fmt(1 / FREIFLAECHE.haProMwp, 1)} MWp etwa ${fmt(Math.round(mwhJeHa / 10) * 10)} MWh im Jahr. Der tatsächliche Ertrag hängt von Lage, Ausrichtung und Verschattung ab.`,
    },
    {
      q: "Braucht ein Solarpark in Österreich eine Umwidmung?",
      a: "In der Regel ja: Die Gemeinde widmet die Fläche im Grünland für Photovoltaik – die Bezeichnung unterscheidet sich je Bundesland. Das Land gibt dafür Zonen, Kriterien und Größengrenzen vor. Dazu kommen je nach Größe elektrizitätsrechtliche und gegebenenfalls naturschutzrechtliche Bewilligungen.",
    },
    {
      q: "Was bedeutet der Abschlag nach § 33 EAG?",
      a: "Für Photovoltaikanlagen auf einer landwirtschaftlich genutzten Fläche oder im Grünland verringert sich der Zuschlagswert der Marktprämie um 25 %. Der Abschlag entfällt ganz oder teilweise für Agri-PV-Anlagen, bei denen die landwirtschaftliche Nutzung nicht oder nur geringfügig beeinträchtigt wird, sowie für Anlagen auf Deponien, Altlasten, Bergbau- und Infrastrukturstandorten und auf Gebäuden.",
    },
    {
      q: "Wie wird ein Solarpark in Österreich gefördert?",
      a: "Größere Anlagen bewerben sich in den Ausschreibungen der EAG-Abwicklungsstelle um eine Marktprämie. In der 2. Ausschreibung 2026 (bezuschlagt am 10. Juli 2026) kamen Gebote bis 6,69 ct/kWh zum Zug. Kleinere Anlagen können einen Investitionszuschuss beantragen. Ohne Förderung finanziert sich ein Park über einen Stromliefervertrag (PPA).",
    },
    {
      q: "Wie lange dauert es bis zum fertigen Solarpark?",
      a: "Das hängt in Österreich vor allem von Widmung, Bewilligungen und Netzanschluss ab – und unterscheidet sich je Bundesland und Umspannwerk deutlich. Einen realistischen Zeitplan für Ihre Fläche nennen wir Ihnen nach der Prüfung.",
    },
    {
      q: "Wer baut den Solarpark nach Vertragsende zurück?",
      a: "Der Betreiber. Der Rückbau samt Entsorgung und Wiederherstellung der landwirtschaftlichen Nutzbarkeit ist im Pachtvertrag geregelt und über eine Rückbaubürgschaft einer Bank oder Versicherung abgesichert.",
    },
    {
      q: "Was hat die Gemeinde vom Solarpark?",
      a: "Die Gemeinde entscheidet über die Widmung. Sie kann über die Pacht von Gemeindeflächen, Beteiligungsmodelle für Bürger oder eine Erneuerbare-Energie-Gemeinschaft profitieren. Die Zahlung an die Gemeinde nach § 6 EEG ist deutsches Recht und gilt in Österreich nicht.",
    },
    {
      q: "Wie ist das in Deutschland und der Schweiz?",
      a: "In Deutschland braucht ein Solarpark in der Regel einen Bebauungsplan der Gemeinde; gefördert wird er über die EEG-Ausschreibung oder er finanziert sich über einen PPA. In der Schweiz sind Freiflächenanlagen außerhalb der Bauzone nur eingeschränkt möglich – vor allem als standortgebundene Anlagen, etwa Agri-PV mit Vorteil für die Landwirtschaft.",
    },
  ],
  querverweise: [
    { href: "/regionen", titel: "Regionen in Österreich", text: "Widmung, Zonen und Bewilligungen je Bundesland – mit Quellen." },
    { href: "/flaechencheck", titel: "Flächencheck", text: "Erste Einschätzung zu Ihrer Fläche in zwei Minuten." },
    { href: "/agri-pv", titel: "Agri-PV", text: "Ohne EAG-Abschlag, wenn die Landwirtschaft auf der Fläche weitergeht." },
    { href: "/energiegemeinschaften", titel: "Energiegemeinschaften", text: "Strom aus dem Park für Gemeinde, Betriebe und Bürger im Nahebereich." },
    { href: "/prozess", titel: "Unser Prozess", text: "Wie wir Projekte Schritt für Schritt zur Baureife bringen." },
  ],
  cta: {
    text: "Grundstücksnummern nennen, wir prüfen Widmung, Zonen, Netz und Schutzgebiete am Kartentisch – und sagen Ihnen ehrlich, ob es sich lohnt. Offen gesagt: Wir sind selbst Projektentwickler und haben Interesse an geeigneten Flächen.",
    secondary: { label: "Regionen in Österreich", href: "/regionen" },
  },
};


// Englisch (Sprachmodell): Übersetzung von FREIFLAECHE_AT – gleiche Quellen, keine zusätzlichen Werte.
// Nur Texte; Icons, hrefs und Zahlenwerte kommen aus FREIFLAECHE_AT (Zusammenführung in inhaltFuerSprache()).
// Österreichische Rechtsbegriffe werden erklärt statt ersetzt (Widmung = zoning designation).
const zEn = (n, stellen = 0) => fmtZahl(n, stellen, "en");

export const FREIFLAECHE_AT_EN = {
  hero: {
    pille: `Ground-mounted photovoltaics in Austria from around ${FREIFLAECHE.mindestHa} hectares`,
    lead: "We develop ground-mounted plants in Austria: from securing the land through zoning (Widmung), permits and grid connection to construction and operation – as part of a group based in Upper Austria that has been building its own solar parks since 2012.",
    zusagen: ["Securing the land through to operation from a single source", "Zoning and zones of the federal state checked", "Decommissioning secured by contract and bank guarantee", "Planned to be nature-friendly"],
    stromLabel: "Power (AT)",
    drittWert: { label: "Yield (PVGIS)" },
    bildunterschrift: `Schematic illustration · yield based on the reference value of ${zEn(ERTRAG_AT)} kWh/kWp for lowland and hill country in Austria (PVGIS)`,
  },
  fakten4: { einheit: "EAG reduction", text: "on arable land and grassland under the market premium – not for agrivoltaics or pre-impacted land" },
  kette: {
    Baurecht: "Zoning designation (Widmung) by the municipal council in line with the state’s zones and criteria, plus permits under electricity law and, where applicable, nature conservation law.",
    "Vermarktung & Finanzierung": "EAG market premium via tender or power purchase agreement (PPA), bank financing, own operation or sale to investors.",
  },
  kriterien: {
    "Größe & Zuschnitt": {
      text: "In Austria, state law often sets the limit: in Lower Austria, outside the PV zones, generally no more than 2 ha; in Carinthia, in principle 4 ha per contiguous area; in Burgenland, only within suitability zones. Compact plots are cheaper, and several owners can pool their land.",
    },
    Netzentfernung: {
      text: "The shorter the line to the substation, the better. Distribution system operators publish their free connection capacity per substation – in many places it is scarce. We check the situation for your site.",
    },
    "Planungsrecht & Kulisse": {
      text: "The municipality’s zoning plan, PV zones or the state’s suitability and priority zones, and the municipality’s stance. Pre-impacted land – landfills, contaminated sites, gravel pits, infrastructure – has the best chances and is exempt from the EAG reduction.",
    },
  },
  ampel: [
    {
      titel: "Good conditions",
      punkte: ["Land in PV zones, suitability or priority zones of the federal state", "Landfills, contaminated sites, gravel pits and other pre-impacted land", "Substation with free capacity nearby", "Agrivoltaics with continued farming", "A municipality that supports rezoning"],
    },
    {
      titel: "Check carefully",
      punkte: ["Land outside zones (size limits vary by federal state)", "High-quality farmland – agrivoltaics as an alternative", "Landscape protection and Natura 2000 areas", "Adjacent forest, slopes, drainage", "Substations at full capacity"],
    },
    {
      titel: "Usually ruled out",
      punkte: ["National park, nature reserve", "Burgenland: land outside the suitability zones", "Red hazard zones and the 30-year flood discharge area", "Forest"],
    },
  ],
  kulisse: {
    eyebrow: "Austria · EAG and state spatial planning",
    titel: "Zoning and zones decide on the site.",
    lead: "Whether a solar park may be built is governed in Austria by the spatial planning law of the federal state: the municipality designates the land (Widmung), and the state sets zones, criteria and size limits. Parks are funded through the market premium under the EAG (Austrian Renewable Energy Expansion Act), which the EAG settlement agency (EAG-Abwicklungsstelle) puts out to tender – otherwise they are financed through power purchase agreements (PPAs).",
    box: {
      titel: "25 % reduction on arable land and grassland",
      text: "For plants on agriculturally used land or in grassland, the award value of the market premium is reduced by 25 % (§ 33 EAG). The reduction does not apply, in whole or in part, to agrivoltaics, landfills and contaminated sites, mining and infrastructure sites, and plants on buildings.",
    },
    punkte: [
      { t: "Lower Austria: zones", x: "116 PV zones in the sectoral spatial planning programme. Outside these, zoning for ground-mounted PV is generally only possible up to 2 ha." },
      { t: "Burgenland: suitability zones", x: "Ground-mounted plants larger than a domestic garden only in suitability zones designated by the state by ordinance – currently 95, 19 of them acceleration areas." },
      { t: "Carinthia: 4 ha limit", x: "Zoning in grassland in principle up to 4 ha per contiguous area, on pre-impacted land up to 10 ha (Photovoltaic Plants Ordinance 2024)." },
      { t: "Styria and Upper Austria", x: "Styria: priority zones of the sectoral programme for solar energy for parks over 10 ha. Upper Austria: a state-wide catalogue of criteria including soil fertility and proximity to the substation." },
      { t: "Agrivoltaics without reduction", x: "Agrivoltaic plants are exempt from the 25 % reduction, provided the main agricultural use is not impaired or only slightly impaired (§ 33 EAG)." },
      { t: "Market premium 2026", x: `In the 2nd tender of 2026 (awarded on 10 July 2026, ${zEn(179033)} kWp), bids of up to 6.69 ct/kWh were successful.` },
    ],
    fuss: `Whether your land lies in a zone and which limits your federal state sets, we check plot by plot. As of 4 October 2026, without guarantee – the EAG, the spatial planning acts and the ordinances of the federal states in their current versions are authoritative.`,
  },
  oekologieText2:
    "In Austria, some federal states tie zoning to ecological conditions – in Lower Austria, for example, to an ecology concept for plants in the PV zones. Which measures a park implements is set out in the management plan of the respective project.",
  rueckbau: {
    kacheln: {
      "Dienstbarkeit im Grundbuch": "An easement (Dienstbarkeit) entered in the land register secures operation – and also binds every legal successor to the contractual decommissioning obligation.",
      Wiederherstellung: "Pulling the piles, recovering the cables, loosening the soil – the land is returned in a condition fit for farming. The decommissioning guarantee secures the costs.",
    },
  },
  zeitplanLead: "Many steps run in parallel – with the municipality, the federal state and the grid operator.",
  faq: [
    {
      q: "From what size of land is a solar park worthwhile?",
      a: `We usually develop solar parks from around ${FREIFLAECHE.mindestHa} hectares. In Austria, however, state law often dictates the size: in Lower Austria, outside the PV zones, zoning is generally only possible up to 2 ha; in Carinthia, in principle up to 4 ha per contiguous area; in Burgenland, only within suitability zones. Smaller plots can be worthwhile with agrivoltaics or as part of a cluster.`,
    },
    {
      q: "How much power does one hectare of solar park generate in Austria?",
      a: `With the reference value of ${zEn(ERTRAG_AT)} kWh per kWp for lowland and hill country (PVGIS), one hectare with around ${zEn(1 / FREIFLAECHE.haProMwp, 1)} MWp generates about ${zEn(Math.round(mwhJeHa / 10) * 10)} MWh a year. The actual yield depends on location, orientation and shading.`,
    },
    {
      q: "Does a solar park in Austria need rezoning?",
      a: "As a rule, yes: the municipality designates the land in grassland for photovoltaics (Widmung) – the term differs from state to state. The state sets zones, criteria and size limits for this. Depending on size, permits under electricity law and, where applicable, nature conservation law are also needed.",
    },
    {
      q: "What does the reduction under § 33 EAG mean?",
      a: "For photovoltaic plants on agriculturally used land or in grassland, the award value of the market premium is reduced by 25 %. The reduction does not apply, in whole or in part, to agrivoltaic plants where agricultural use is not impaired or only slightly impaired, or to plants on landfills, contaminated sites, mining and infrastructure sites and on buildings.",
    },
    {
      q: "How is a solar park funded in Austria?",
      a: "Larger plants bid for a market premium in the tenders of the EAG settlement agency (EAG-Abwicklungsstelle). In the 2nd tender of 2026 (awarded on 10 July 2026), bids of up to 6.69 ct/kWh were successful. Smaller plants can apply for an investment grant. Without funding, a park is financed through a power purchase agreement (PPA).",
    },
    {
      q: "How long does it take until the solar park is finished?",
      a: "In Austria, this depends above all on zoning, permits and the grid connection – and differs considerably between federal states and substations. We will give you a realistic timeline for your land after our assessment.",
    },
    {
      q: "Who dismantles the solar park when the contract ends?",
      a: "The operator. Decommissioning, including disposal and restoring the land for agricultural use, is set out in the lease agreement and secured by a decommissioning guarantee from a bank or insurer.",
    },
    {
      q: "What does the municipality gain from the solar park?",
      a: "The municipality decides on the zoning. It can benefit from leasing municipal land, participation models for citizens or a renewable energy community. The payment to the municipality under § 6 EEG is German law and does not apply in Austria.",
    },
    {
      q: "How does it work in Germany and Switzerland?",
      a: "In Germany, a solar park generally needs a development plan (Bebauungsplan) from the municipality; it is funded through the EEG tender or financed through a PPA. In Switzerland, ground-mounted plants outside the building zone are only possible to a limited extent – mainly as site-bound installations, such as agrivoltaics that benefit agriculture.",
    },
  ],
  querverweise: [
    { titel: "Regions in Austria", text: "Zoning, zones and permits by federal state – with sources." },
    { titel: "Land check", text: "An initial assessment of your land in two minutes." },
    { titel: "Agrivoltaics", text: "No EAG reduction if farming continues on the land." },
    { titel: "Energy communities", text: "Power from the park for the municipality, businesses and citizens nearby." },
    { titel: "Our process", text: "How we bring projects step by step to ready-to-build status." },
  ],
  cta: {
    text: "Give us the plot numbers and we will check zoning, zones, grid and protected areas at our desk – and tell you honestly whether it is worthwhile. To be open: we are project developers ourselves and are interested in suitable land.",
    secondary: { label: "Regions in Austria" },
  },
};
