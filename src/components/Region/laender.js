// src/components/Region/laender.js
//
// Länderrahmen der Regionalseiten: was bundesweit (DE), österreichweit (AT) bzw.
// schweizweit (CH) gleich ist. Bewusst kurz – die Regionalseiten tragen den
// regionsspezifischen Inhalt aus src/data/regionen/<slug>.js.

import { ClipboardCheck, FileSignature, Gavel, Hammer, Landmark, PlugZap, Scale, Sprout, Vote } from "lucide-react";
import { AGRI } from "@/lib/invest/markt";
import { fmt } from "@/lib/rechner/annahmen";
import { fmtZahl } from "@/lib/sprache/format";
import { uebersetze } from "@/lib/sprache/woerterbuch";

export const LAND = {
  DE: {
    name: "Deutschland",
    code: "DE",
    ratgeber: [
      { href: "/ratgeber/solarpark-genehmigung-bebauungsplan", titel: "Ratgeber Genehmigung", text: "Bebauungsplan, Privilegierung und Verfahrensschritte in Deutschland." },
      { href: "/ratgeber/eeg-ausschreibung-freiflaeche", titel: "Ratgeber EEG-Ausschreibung", text: "Flächenkulisse, benachteiligte Gebiete und Zuschlagswerte." },
    ],
    schritte: [
      { icon: ClipboardCheck, title: "Fläche & Netz prüfen", text: "Flächenkulisse, Schutzgebiete, Regionalplan und Netzverknüpfungspunkt klären; Netzanschlussanfrage beim Verteilnetzbetreiber." },
      { icon: Vote, title: "Aufstellungsbeschluss", text: "Der Gemeinderat beschließt, einen Bebauungsplan aufzustellen – meist mit Änderung des Flächennutzungsplans im Parallelverfahren." },
      { icon: Scale, title: "Beteiligung & Gutachten", text: "Frühzeitige und förmliche Beteiligung von Öffentlichkeit und Behörden, Umweltbericht, Artenschutz, Blendgutachten." },
      { icon: Gavel, title: "Satzungsbeschluss", text: "Mit dem Satzungsbeschluss entsteht Baurecht; danach Bauantrag bzw. Genehmigungsfreistellung nach Landesbauordnung." },
      { icon: PlugZap, title: "Zuschlag oder PPA, Bau", text: "Gebot in der EEG-Ausschreibung oder Stromliefervertrag, Rückbaubürgschaft, Bau und Netzanschluss." },
    ],
    schritteHinweis: "Ausnahme: Anlagen im 200-m-Streifen an Autobahnen und zweigleisigen Schienenwegen sowie kleine Agri-PV-Anlagen mit Hofbezug sind im Außenbereich privilegiert (§ 35 Abs. 1 Nr. 8 und 9 BauGB) und brauchen keinen Bebauungsplan.",
    agri: [
      { t: "GAP-Direktzahlungen", k: `${fmt(AGRI.gapFoerderfaehig * 100)} %`, x: "der Fläche bleiben bei Agri-PV nach DIN SPEC 91434 förderfähig." },
      { t: "Privilegierung", k: `bis ${fmt(AGRI.privilegierungHa, 1)} ha`, x: "Grundfläche mit Hofbezug ohne Bebauungsplan (§ 35 Abs. 1 Nr. 9 BauGB)." },
      { t: "EEG", k: "besondere Solaranlage", x: "Agri-PV darf auch außerhalb der Flächenkulisse an der Ausschreibung teilnehmen." },
    ],
  },
  AT: {
    name: "Österreich",
    code: "AT",
    ratgeber: [
      { href: "/ratgeber/freiflaechen-pv-oesterreich", titel: "Ratgeber Österreich", text: "Widmung je Bundesland, Bewilligungen, EAG-Marktprämie und Abschlag." },
    ],
    schritte: [
      { icon: ClipboardCheck, title: "Zonen & Netz prüfen", text: "Überörtliche PV-Zonen oder Kriterienkatalog des Landes, Bodengüte, Schutzgebiete; Netzzugangsanfrage beim Verteilernetzbetreiber." },
      { icon: Vote, title: "Widmung durch die Gemeinde", text: "Der Gemeinderat ändert den Flächenwidmungsplan (Grünland-Photovoltaik bzw. Sonderwidmung); das Land prüft als Aufsichtsbehörde." },
      { icon: Landmark, title: "Bewilligungen", text: "Naturschutzrechtliche und – ab der Landesschwelle – elektrizitätsrechtliche Bewilligung, dazu je nach Fall Wasser-, Forst- und Straßenrecht." },
      { icon: FileSignature, title: "Förderung & Vermarktung", text: "EAG-Marktprämie per Ausschreibung (mit oder ohne Abschlag), Investitionszuschuss für kleinere Anlagen oder Stromliefervertrag." },
      { icon: Hammer, title: "Bau & Netzanschluss", text: "Rückbausicherheit, Bau und Inbetriebnahme innerhalb der Frist ab Zuschlag." },
    ],
    schritteHinweis: "Raumordnung, Naturschutz und Elektrizitätsrecht für Erzeugungsanlagen sind in Österreich Landessache – Schwellen und Zonen unterscheiden sich je Bundesland.",
    agri: [
      { t: "EAG-Abschlag", k: `−${fmt(AGRI.eagAbschlagAt * 100)} %`, x: "auf den Zuschlagswert bei PV auf Agrar- und Grünland – qualifizierte Agri-PV kann davon ausgenommen sein (§ 33 EAG)." },
      { t: "Doppelnutzung", k: "Hauptnutzung bleibt", x: "Die landwirtschaftliche Nutzung muss tatsächlich weiterlaufen; Details regelt die Marktprämienverordnung." },
      { t: "Widmung", k: "Landesrecht", x: "Mehrere Länder bevorzugen Agri-PV oder schreiben sie auf guten Böden vor." },
    ],
  },
  CH: {
    name: "Schweiz",
    code: "CH",
    ratgeber: [
      { href: "/ratgeber/freiflaechen-pv-schweiz", titel: "Ratgeber Schweiz", text: "Raumplanung, Solarexpress, Einmalvergütung und Auktionen." },
    ],
    schritte: [
      { icon: ClipboardCheck, title: "Vorabklärung", text: "Kantonaler Richtplan (Teil Energie), Schutzinventare, Fruchtfolgeflächen und Netzanschluss mit Gemeinde und kantonaler Fachstelle klären." },
      { icon: FileSignature, title: "Baugesuch", text: "Baugesuch bei der Gemeinde; außerhalb der Bauzone entscheidet die kantonale Behörde über die Bewilligung nach Art. 24ter RPG." },
      { icon: Scale, title: "Interessenabwägung", text: "Landschaft, Natur, Kulturland und Energieinteresse werden umfassend abgewogen; Einsprachen sind möglich." },
      { icon: PlugZap, title: "Förderung", text: "Einmalvergütung, Auktion für Anlagen ohne Eigenverbrauch oder Rückliefervergütung – je nach Größe und Modell." },
      { icon: Sprout, title: "Bau & Betrieb", text: "Bau, Netzanschluss beim Verteilnetzbetreiber, Betrieb – bei Agri-PV mit Nachweis des landwirtschaftlichen Nutzens." },
    ],
    schritteHinweis: "Die Schweiz trennt Bau- und Nichtbaugebiet streng. Klassische Solarparks auf Ackerland sind die Ausnahme; die Verfahren regeln die Kantone.",
    agri: [
      { t: "Voraussetzung", k: "Vorteil nötig", x: "Agri-PV auf landwirtschaftlicher Nutzfläche muss der Produktion Vorteile bringen oder der Forschung dienen (Art. 24ter Abs. 2 RPG)." },
      { t: "Typische Kulturen", k: "Beeren, Obst", x: "Schutz vor Hagel, Starkregen und Sonnenbrand ist der häufigste Nutzen-Nachweis." },
      { t: "Fruchtfolgeflächen", k: "streng", x: "Auf den besten Ackerböden sind die Hürden besonders hoch." },
    ],
  },
};

/* Sprachmodell: englische Fassung (gleiche Reihenfolge; Rechtsbegriffe im Original mit Erklärung) */
const en = (n, s = 0) => fmtZahl(n, s, "en");
const LAND_EN = {
  DE: {
    name: "Germany",
    ratgeber: [
      { titel: "Guide: permits", text: "Development plan, privileged status and procedural steps in Germany." },
      { titel: "Guide: EEG tender", text: "Eligible land categories, less-favoured areas and award values." },
    ],
    schritte: [
      { title: "Check land & grid", text: "Clarify eligible land categories, protected areas, regional plan and grid connection point; grid connection enquiry to the distribution system operator." },
      { title: "Resolution to draw up a plan", text: "The municipal council resolves to draw up a development plan (Bebauungsplan) – usually with an amendment to the land-use plan in a parallel procedure." },
      { title: "Consultation & reports", text: "Early and formal participation of the public and authorities, environmental report, species protection, glare assessment." },
      { title: "Statutory resolution", text: "The statutory resolution creates the right to build; then a building application or exemption from the permit requirement under the state building code." },
      { title: "Award or PPA, construction", text: "Bid in the EEG tender or power supply contract, decommissioning guarantee, construction and grid connection." },
    ],
    schritteHinweis: "Exception: installations in the 200 m strip along motorways and two-track railway lines, as well as small farm-related agrivoltaic installations, are privileged in the outer zone (§ 35(1) nos. 8 and 9 BauGB, the Federal Building Code) and do not need a development plan.",
    agri: [
      { t: "CAP direct payments", k: `${en(AGRI.gapFoerderfaehig * 100)} %`, x: "of the land remain eligible for support with agrivoltaics under DIN SPEC 91434." },
      { t: "Privileged status", k: `up to ${en(AGRI.privilegierungHa, 1)} ha`, x: "footprint linked to the farm without a development plan (§ 35(1) no. 9 BauGB)." },
      { t: "EEG", k: "special solar installation", x: "Agrivoltaics may take part in the tender even outside the eligible land categories." },
    ],
  },
  AT: {
    name: "Austria",
    ratgeber: [{ titel: "Guide: Austria", text: "Zoning (Widmung) per federal state, permits, EAG market premium and deduction." }],
    schritte: [
      { title: "Check zones & grid", text: "Supra-local PV zones or the state’s criteria catalogue, soil quality, protected areas; grid access enquiry to the distribution system operator." },
      { title: "Zoning by the municipality", text: "The municipal council amends the zoning plan (Flächenwidmungsplan) to “grassland – photovoltaics” or a special designation; the state reviews it as supervisory authority." },
      { title: "Permits", text: "Nature conservation permit and – above the state threshold – an electricity law permit, plus water, forestry and road law depending on the case." },
      { title: "Support & marketing", text: "EAG market premium by tender (with or without deduction), investment grant for smaller installations or power supply contract." },
      { title: "Construction & grid connection", text: "Decommissioning security, construction and commissioning within the deadline after the award." },
    ],
    schritteHinweis: "In Austria, spatial planning, nature conservation and electricity law for generating installations are matters for the federal states – thresholds and zones differ from state to state.",
    agri: [
      { t: "EAG deduction", k: `−${en(AGRI.eagAbschlagAt * 100)} %`, x: "on the award value for PV on agricultural land and grassland – qualified agrivoltaics can be exempt (§ 33 EAG, Austria’s Renewable Expansion Act)." },
      { t: "Dual use", k: "main use continues", x: "Agricultural use must actually continue; details are set out in the market premium ordinance." },
      { t: "Zoning", k: "state law", x: "Several states favour agrivoltaics or require it on good soils." },
    ],
  },
  CH: {
    name: "Switzerland",
    ratgeber: [{ titel: "Guide: Switzerland", text: "Spatial planning, Solarexpress, one-off remuneration and auctions." }],
    schritte: [
      { title: "Preliminary clarification", text: "Clarify the cantonal structure plan (energy section), protection inventories, crop rotation areas and grid connection with the municipality and the cantonal office." },
      { title: "Building application", text: "Building application to the municipality; outside the building zone, the cantonal authority decides on the permit under Art. 24ter RPG (Spatial Planning Act)." },
      { title: "Balancing of interests", text: "Landscape, nature, farmland and the energy interest are weighed up comprehensively; objections are possible." },
      { title: "Support", text: "One-off remuneration, auction for installations without self-consumption or feed-in remuneration – depending on size and model." },
      { title: "Construction & operation", text: "Construction, grid connection with the distribution system operator, operation – for agrivoltaics with proof of the agricultural benefit." },
    ],
    schritteHinweis: "Switzerland strictly separates building and non-building zones. Conventional solar parks on arable land are the exception; the procedures are regulated by the cantons.",
    agri: [
      { t: "Requirement", k: "benefit needed", x: "Agrivoltaics on agricultural land must benefit production or serve research (Art. 24ter(2) RPG)." },
      { t: "Typical crops", k: "berries, fruit", x: "Protection against hail, heavy rain and sunburn is the most common proof of benefit." },
      { t: "Crop rotation areas", k: "strict", x: "On the best arable soils, the hurdles are particularly high." },
    ],
  },
};

/** Länderrahmen in der Sprache der Seite */
export const landFuer = (code, sprache = "de") => (sprache === "en" ? uebersetze({ de: LAND[code], en: LAND_EN[code] }, "en") : LAND[code]);
