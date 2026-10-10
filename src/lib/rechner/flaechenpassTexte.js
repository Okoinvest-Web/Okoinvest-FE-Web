// src/lib/rechner/flaechenpassTexte.js – Texte des Flächenpasses (Welle 3, Paket B6), Deutsch und Englisch
//
// Gemeinsam für den Assistenten im Browser und den Bericht (Server, nur Deutsch). Rechtliche Aussagen stammen
// ausschließlich aus bereits veröffentlichten Texten der Website (Freiflächen-Seite, Flächencheck, Regionsdaten
// src/data/regionen/*.js mit Quelle) – alles andere heißt „wird im Gespräch geprüft“.
// Schweizer Schreibweise (ohne „ß“) setzt die Seite über chTexte()/SchweizerSchreibweise.

import { fmtZahl } from "../sprache/format.js";

const U = "unbekannt";

const DE = {
  ampel: { gruen: "Gut geeignet", gelb: "Bedingt geeignet", rot: "Eher schwierig" },
  ampelText: {
    gruen: "Ihre Fläche bringt gute Voraussetzungen mit. Jetzt lohnt die genaue Prüfung.",
    gelb: "Möglich – aber einzelne Punkte müssen wir genau prüfen, bevor es konkret wird.",
    rot: "Als klassischer Solarpark schwierig. Oft gibt es trotzdem Wege – etwa Agri-PV oder Nachbarflächen.",
  },
  optionen: {
    nutzung: { acker: "Acker", gruenland: "Grünland", konversion: "Konversion", sonstige: "Sonstige" },
    neigung: { eben: "eben", leicht: "leicht", deutlich: "deutlich", steil: "steil" },
    exposition: { sued: "Süd", ostwest: "Ost/West", nord: "Nord" },
    schutz: { nein: "keines", landschaft: "Landschaftsschutz", wasser: "Wasserschutz", naturNah: "Naturschutz angrenzend", natur: "Naturschutz auf der Fläche", [U]: "weiß ich nicht" },
    siedlung: { lt100: "unter 100 m", "100-300": "100–300 m", gt300: "über 300 m", [U]: "weiß ich nicht" },
    netz: { lt1: "unter 1 km", "1-3": "1–3 km", "3-5": "3–5 km", "5-10": "5–10 km", gt10: "über 10 km", [U]: "weiß ich nicht" },
    verkehr: { bis200: "bis 200 m", bis500: "200–500 m", weiter: "weiter weg", [U]: "weiß ich nicht" },
    benachteiligt: { ja: "ja", nein: "nein", [U]: "weiß ich nicht" },
    zone: { ja: "in einer Zone", angrenzend: "angrenzend", nein: "außerhalb", [U]: "weiß ich nicht" },
    uw: { bis5: "bis 5 km", bis7_5: "5–7,5 km", weiter: "weiter", [U]: "weiß ich nicht" },
    eignung: { ja: "ja", nein: "nein", [U]: "weiß ich nicht" },
    vorbelastet: { ja: "ja", nein: "nein", [U]: "weiß ich nicht" },
    fff: { ja: "ja", nein: "nein", [U]: "weiß ich nicht" },
  },
  optionSub: {
    nutzung: { acker: "in Bewirtschaftung", gruenland: "Wiese, Weide", konversion: "Gewerbe, Bahn, Militär", sonstige: "Brache, gemischt" },
    neigung: { eben: "bis 3°", leicht: "3–7°", deutlich: "7–12°", steil: "über 15°" },
  },
  fragen: {
    nutzung: "Heutige Nutzung",
    neigung: "Gelände",
    exposition: "Hang zeigt nach",
    schutz: "Schutzgebiet auf oder an der Fläche?",
    siedlung: "Abstand zur nächsten Wohnbebauung",
    netz: "Entfernung zum Stromnetz",
    netzHinweis: "Nächste Mittelspannungsleitung, Trafostation oder Umspannwerk.",
    verkehr: "Abstand zu Autobahn oder Bahnstrecke",
    verkehrHinweis: "200 m: Autobahn oder zweigleisige Bahn · 500 m: Autobahn oder Schienenweg.",
    benachteiligt: "Liegt die Fläche in einem benachteiligten Gebiet?",
    zone: "Liegt die Fläche in einer verordneten PV-Zone des Landes?",
    uw: "Entfernung zum nächsten Umspannwerk",
    eignung: "Im kantonalen Eignungsgebiet für Solaranlagen?",
    vorbelastet: "Vorbelastet (an Strasse, Bahn, Kiesgrube, Deponie …)?",
    fff: "Ist die Fläche Fruchtfolgefläche?",
  },
  kriterien: {
    groesse: "Größe",
    form: "Form",
    neigung: "Gelände",
    nutzung: "Nutzung",
    siedlung: "Abstand Siedlung",
    netz: "Netzentfernung",
    kosten: "Netzanschluss im Verhältnis zur Größe",
    widmung: { DE: "Planungsrecht", AT: "Widmungslage", CH: "Raumplanung" },
    kulisse: { DE: "EEG-Flächenkulisse", CH: "Eignung und Vorbelastung" },
    einstrahlung: "Einstrahlung",
    schutz: "Schutzgebiet",
    schutzNah: "Nähe Schutzgebiet",
    fff: "Fruchtfolgefläche",
    widmung_max: "Größengrenze der Widmung",
    kapazitaet: "Netzkapazität",
  },
  detail: {
    gezeichnet: "eingezeichnet",
    angegeben: "Ihre Angabe",
    formGut: "kompakt, gut belegbar",
    formMittel: "brauchbare Form",
    formSchlecht: "schmal oder zerklüftet",
    formAnnahme: "nicht eingezeichnet – brauchbare Form angenommen",
    unbekannt: "unbekannt – mittlerer Wert, wird im Gespräch geprüft",
    netzAnnahme: (km) => `unbekannt – vorsichtig ${km} km angenommen`,
    kosten: "Schätzung aus Größe und Entfernung",
    einstrahlung: (w) => `≈ ${w} kWh/kWp im Jahr (PVGIS)`,
    widmung: {
      DE: { zone: "200-m-Streifen: privilegiert", angrenzend: "teilweise privilegiert", unklar: "Bebauungsplan der Gemeinde nötig", ausserhalb: "außerhalb" },
      AT: { zone: "in einer Zone bzw. Priorität 1", angrenzend: "angrenzend bzw. Priorität 2", ausserhalb: "außerhalb der Zonen", unklar: "Einzelfallprüfung" },
      CH: { zone: "im kantonalen Eignungsgebiet", angrenzend: "teilweise im Eignungsgebiet", ausserhalb: "ausserhalb", unklar: "Einzelfall mit Kanton und Gemeinde" },
    },
    kulisseJa: "nach Ihrer Angabe erfüllt",
    kulisseNein: "nach Ihrer Angabe nicht erfüllt",
    kulisseOffen: "offen – wird im Gespräch geprüft",
    schutz: { landschaft: "Landschaftsschutz – Bewilligung erschwert", wasser: "Wasserschutz – Bewilligung erschwert", natur: "Naturschutz auf der Fläche – in der Regel ausgeschlossen", naturNah: "angrenzend – Verträglichkeitsprüfung wahrscheinlich" },
    fff: "Fruchtfolgefläche – Interessenabwägung nötig",
    widmungMax: "Obergrenze je Widmung im Land – Teilfläche oder Ausnahme",
  },
  ko: {
    groesse: "Unter 2 ha ist Freiflächen-PV meist unwirtschaftlich.",
    neigung: "Sehr steil – eine wirtschaftliche Aufständerung ist kaum möglich.",
    schutz: "Naturschutzgebiet auf der Fläche – ein Solarpark ist dort in der Regel ausgeschlossen.",
    widmung: "Außerhalb der Zonen ist die Fläche nach den Regeln des Landes nur eingeschränkt oder gar nicht widmungsfähig.",
  },
  angaben: {
    kulisseDE: {
      titel: "EEG-Flächenkulisse",
      gut: (w) => `Nach Ihren Angaben liegt die Fläche in der Kulisse (${w}). Das EEG legt fest, auf welchen Flächen ein Solarpark eine Marktprämie aus den Ausschreibungen der Bundesnetzagentur bekommen kann.`,
      pruefen: "Nach Ihren Angaben liegt die Fläche außerhalb der Kulisse. Außerhalb der Kulisse kann ein Park über einen Stromliefervertrag (PPA) finanziert werden; Agri-PV zählt zu den besonderen Solaranlagen.",
      offen: "Ob die Fläche in der Kulisse liegt (Randstreifen bis 500 m, Konversion, benachteiligtes Gebiet), wird im Gespräch flurstückgenau geprüft.",
      teile: { randstreifen: "Randstreifen", konversion: "Konversion", benachteiligt: "benachteiligtes Gebiet" },
      // Freiflächen-Seite (Fußnote Kulisse): Länder können die Öffnung benachteiligter Gebiete einschränken
      benachteiligtHinweis: "Ob Ihr Bundesland die Öffnung benachteiligter Gebiete eingeschränkt hat, prüfen wir flurstückgenau.",
      quelle: { titel: "§ 37 EEG 2023", url: "https://www.gesetze-im-internet.de/eeg_2014/__37.html" },
    },
    privilegiert: {
      titel: "Baurecht: 200-m-Streifen",
      gut: "Bis 200 m entlang von Autobahnen und zweigleisigen Schienenwegen sind Solarparks im Außenbereich privilegiert (§ 35 Abs. 1 Nr. 8 b BauGB) und brauchen nur eine Baugenehmigung.",
      pruefen: "Außerhalb des 200-m-Streifens braucht ein Solarpark in Deutschland in aller Regel einen Bebauungsplan der Gemeinde.",
      offen: "Ob ein Bebauungsplan nötig ist, wird im Gespräch geprüft.",
      quelle: { titel: "§ 35 BauGB", url: "https://www.gesetze-im-internet.de/bbaug/__35.html" },
    },
    zoneAT: {
      titel: "Widmung: PV-Zonen des Landes",
      gut: (r) => `Nach Ihrer Angabe liegt die Fläche in einer verordneten Zone. Was das in ${r} bedeutet, steht im Rechtsrahmen.`,
      pruefen: (r) => `Nach Ihrer Angabe grenzt die Fläche an eine Zone. Welche Regeln in ${r} dafür gelten, steht im Rechtsrahmen.`,
      kritisch: (r) => `Nach Ihrer Angabe liegt die Fläche außerhalb der Zonen. In ${r} ist das nur eingeschränkt möglich – siehe Rechtsrahmen.`,
      offen: "Ob die Fläche in einer Zone liegt, wird im Gespräch geprüft.",
    },
    uwAT: {
      titel: "Kriterienkatalog: Nähe zum Umspannwerk",
      gut: "Im Radius von 5 km um bestehende Umspannwerke gilt „energiewirtschaftliche Priorität 1“ – nach Ihrer Angabe trifft das zu.",
      pruefen: "Bis 7,5 km gilt „Priorität 2“ – nach Ihrer Angabe trifft das zu.",
      kritisch: "Nach Ihrer Angabe liegt die Fläche außerhalb der Prioritätsradien (5 bzw. 7,5 km um Umspannwerke).",
      offen: "Die Entfernung zum Umspannwerk wird im Gespräch geprüft.",
    },
    einzelfallAT: {
      titel: "Widmung im Einzelfall",
      offen: (r) => `Die Widmung klären wir im Einzelfall mit Gemeinde und Land – die Grundlagen für ${r} stehen im Rechtsrahmen.`,
    },
    standortCH: {
      titel: "Standortgebundenheit (Art. 24ter RPG)",
      gut: "Nach Ihren Angaben liegt die Fläche im Eignungsgebiet oder ist vorbelastet. Ausserhalb der Bauzone gelten freistehende Solaranlagen nur in wenig empfindlichen oder vorbelasteten Gebieten als standortgebunden.",
      pruefen: "Nach Ihren Angaben weder Eignungsgebiet noch vorbelastet. Dann ist die Standortgebundenheit schwer nachzuweisen; Agri-PV braucht einen belegten Vorteil für die Landwirtschaft.",
      offen: "Ob die Fläche als standortgebunden gelten kann, wird im Gespräch mit Gemeinde und Kanton geprüft.",
      quelle: { titel: "Raumplanungsgesetz RPG, Art. 24ter", url: "https://www.lexfind.ch/tolv/257906/de" },
    },
    fffCH: {
      titel: "Fruchtfolgeflächen",
      gut: "Nach Ihrer Angabe keine Fruchtfolgefläche.",
      kritisch: "Fruchtfolgefläche: Ertragspotenzial und maschinelle Bewirtschaftbarkeit müssen voll erhalten bleiben.",
      offen: "Ob die Fläche Fruchtfolgefläche ist, wird im Gespräch geprüft.",
    },
    parzelleCH: {
      titel: "Parzelle",
      offen: "Zonenzugehörigkeit, Eigentum und Dienstbarkeiten klären wir parzellengenau mit Gemeinde und Kanton.",
    },
    schutz: {
      titel: "Schutzgebiete",
      gut: "Nach Ihrer Angabe kein Schutzgebiet.",
      pruefen: "Landschaftsschutzgebiete und angrenzende Schutzgebiete sind im Einzelfall möglich – das prüfen wir genau.",
      kritisch: "Naturschutz-, FFH- und Wasserschutzgebiete schließen einen Solarpark meist aus.",
      offen: "Schutzgebiete prüfen wir flächengenau im Gespräch.",
    },
    siedlung: {
      titel: "Abstand zur Wohnbebauung",
      gut: "Über 300 m Abstand – gute Voraussetzung für Akzeptanz.",
      pruefen: "100 bis 300 m – Blendung und Sichtschutz planen wir mit.",
      kritisch: "Unter 100 m sind Blendung und Akzeptanz kritisch.",
      offen: "Den Abstand zur Bebauung prüfen wir im Gespräch.",
    },
    netz: {
      titel: "Netzanschluss",
      gut: "Netzanschluss nah: geringe Kosten für Kabeltrasse und Übergabestation.",
      pruefen: "Längere Kabeltrasse – die Kosten fallen bei kleinen Parks je Kilowatt stärker ins Gewicht.",
      offen: "Entfernung zum Netz unbekannt – wir fragen die Anschlusskapazität beim Netzbetreiber an.",
    },
    kapazitaet: {
      titel: "Freie Netzkapazität",
      offen: "Ob das Netz Kapazität frei hat, weiß nur der Netzbetreiber – wir fragen sie an.",
    },
    klein: {
      titel: "Mindestgröße",
      kritisch: "Unter 2 ha ist Freiflächen-PV meist unwirtschaftlich – Nachbarflächen können helfen.",
    },
  },
  stufe: { gut: "erfüllt", pruefen: "prüfen", kritisch: "kritisch", offen: "wird im Gespräch geprüft" },
  quelle: "Quelle",
};

const EN = {
  ampel: { gruen: "Well suited", gelb: "Partly suited", rot: "Rather difficult" },
  ampelText: {
    gruen: "Your land has good prerequisites. A detailed assessment is now worthwhile.",
    gelb: "Possible – but we need to check individual points carefully before it becomes concrete.",
    rot: "Difficult as a classic solar park. There are often other ways – such as agrivoltaics or neighbouring land.",
  },
  optionen: {
    nutzung: { acker: "Arable", gruenland: "Grassland", konversion: "Conversion", sonstige: "Other" },
    neigung: { eben: "flat", leicht: "gentle", deutlich: "moderate", steil: "steep" },
    exposition: { sued: "South", ostwest: "East/West", nord: "North" },
    schutz: { nein: "none", landschaft: "Landscape protection", wasser: "Water protection", naturNah: "Nature reserve adjacent", natur: "Nature reserve on the land", [U]: "don’t know" },
    siedlung: { lt100: "under 100 m", "100-300": "100–300 m", gt300: "over 300 m", [U]: "don’t know" },
    netz: { lt1: "under 1 km", "1-3": "1–3 km", "3-5": "3–5 km", "5-10": "5–10 km", gt10: "over 10 km", [U]: "don’t know" },
    verkehr: { bis200: "up to 200 m", bis500: "200–500 m", weiter: "further away", [U]: "don’t know" },
    benachteiligt: { ja: "yes", nein: "no", [U]: "don’t know" },
    zone: { ja: "in a zone", angrenzend: "adjacent", nein: "outside", [U]: "don’t know" },
    uw: { bis5: "up to 5 km", bis7_5: "5–7.5 km", weiter: "further", [U]: "don’t know" },
    eignung: { ja: "yes", nein: "no", [U]: "don’t know" },
    vorbelastet: { ja: "yes", nein: "no", [U]: "don’t know" },
    fff: { ja: "yes", nein: "no", [U]: "don’t know" },
  },
  optionSub: {
    nutzung: { acker: "farmed", gruenland: "meadow, pasture", konversion: "industry, rail, military", sonstige: "fallow, mixed" },
    neigung: { eben: "up to 3°", leicht: "3–7°", deutlich: "7–12°", steil: "over 15°" },
  },
  fragen: {
    nutzung: "Current use",
    neigung: "Terrain",
    exposition: "Slope faces",
    schutz: "Protected area on or next to the land?",
    siedlung: "Distance to the nearest homes",
    netz: "Distance to the power grid",
    netzHinweis: "Nearest medium-voltage line, transformer station or substation.",
    verkehr: "Distance to a motorway or railway",
    verkehrHinweis: "200 m: motorway or double-track railway · 500 m: motorway or railway.",
    benachteiligt: "Is the land in a less-favoured area?",
    zone: "Is the land in a PV zone designated by the federal state?",
    uw: "Distance to the nearest substation",
    eignung: "In a cantonal suitability area for solar installations?",
    vorbelastet: "Pre-impacted (next to a road, railway, gravel pit, landfill …)?",
    fff: "Is the land crop rotation land (FFF)?",
  },
  kriterien: {
    groesse: "Size",
    form: "Shape",
    neigung: "Terrain",
    nutzung: "Use",
    siedlung: "Distance to settlement",
    netz: "Grid distance",
    kosten: "Grid connection relative to size",
    widmung: { DE: "Planning law", AT: "Zoning", CH: "Spatial planning" },
    kulisse: { DE: "EEG land category", CH: "Suitability and pre-impact" },
    einstrahlung: "Irradiation",
    schutz: "Protected area",
    schutzNah: "Near a protected area",
    fff: "Crop rotation land",
    widmung_max: "Zoning size limit",
    kapazitaet: "Grid capacity",
  },
  detail: {
    gezeichnet: "drawn",
    angegeben: "your input",
    formGut: "compact, easy to fill",
    formMittel: "workable shape",
    formSchlecht: "narrow or irregular",
    formAnnahme: "not drawn – workable shape assumed",
    unbekannt: "unknown – medium value, checked in a conversation",
    netzAnnahme: (km) => `unknown – cautiously assumed ${km} km`,
    kosten: "estimate from size and distance",
    einstrahlung: (w) => `≈ ${w} kWh/kWp per year (PVGIS)`,
    widmung: {
      DE: { zone: "200 m strip: privileged", angrenzend: "partly privileged", unklar: "municipal development plan needed", ausserhalb: "outside" },
      AT: { zone: "in a zone or priority 1", angrenzend: "adjacent or priority 2", ausserhalb: "outside the zones", unklar: "case-by-case assessment" },
      CH: { zone: "in the cantonal suitability area", angrenzend: "partly in the suitability area", ausserhalb: "outside", unklar: "case by case with canton and municipality" },
    },
    kulisseJa: "met according to your input",
    kulisseNein: "not met according to your input",
    kulisseOffen: "open – checked in a conversation",
    schutz: { landschaft: "landscape protection – permit more difficult", wasser: "water protection – permit more difficult", natur: "nature reserve on the land – usually ruled out", naturNah: "adjacent – compatibility assessment likely" },
    fff: "crop rotation land – balancing of interests needed",
    widmungMax: "upper limit per zoning in the federal state – partial area or exemption",
  },
  ko: {
    groesse: "Under 2 ha, ground-mounted PV is usually not economical.",
    neigung: "Very steep – economical mounting is hardly possible.",
    schutz: "Nature reserve on the land – a solar park is usually ruled out there.",
    widmung: "Outside the zones, the land can only be zoned to a limited extent or not at all under the federal state’s rules.",
  },
  angaben: {
    kulisseDE: {
      titel: "EEG land category",
      gut: (w) => `According to your input, the land is within the land category (${w}). The EEG (German Renewable Energy Sources Act) defines on which land a solar park can receive a market premium from the Federal Network Agency’s tenders.`,
      pruefen: "According to your input, the land is outside the land category. Outside it, a park can be financed through a power purchase agreement (PPA); agrivoltaics counts as a special solar installation.",
      offen: "Whether the land is within the land category (strip up to 500 m, conversion, less-favoured area) will be checked plot by plot in a conversation.",
      teile: { randstreifen: "strip along transport routes", konversion: "conversion", benachteiligt: "less-favoured area" },
      benachteiligtHinweis: "Whether your federal state has restricted the opening of less-favoured areas will be checked plot by plot.",
      quelle: { titel: "§ 37 EEG 2023", url: "https://www.gesetze-im-internet.de/eeg_2014/__37.html" },
    },
    privilegiert: {
      titel: "Building law: 200 m strip",
      gut: "Up to 200 m along motorways and double-track railways, solar parks are privileged in the outer zone (§ 35 (1) no. 8 b BauGB, German Federal Building Code) and only need a building permit.",
      pruefen: "Outside the 200 m strip, a solar park in Germany generally needs a municipal development plan.",
      offen: "Whether a development plan is needed will be checked in a conversation.",
      quelle: { titel: "§ 35 BauGB", url: "https://www.gesetze-im-internet.de/bbaug/__35.html" },
    },
    zoneAT: {
      titel: "Zoning: the federal state’s PV zones",
      gut: (r) => `According to your input, the land is in a designated zone. What this means in ${r} is set out in the legal framework.`,
      pruefen: (r) => `According to your input, the land is adjacent to a zone. The rules that apply in ${r} are set out in the legal framework.`,
      kritisch: (r) => `According to your input, the land is outside the zones. In ${r} this is only possible to a limited extent – see the legal framework.`,
      offen: "Whether the land is in a zone will be checked in a conversation.",
    },
    uwAT: {
      titel: "Criteria catalogue: proximity to a substation",
      gut: "Within a 5 km radius of existing substations, “energy-industry priority 1” applies – according to your input, this is the case.",
      pruefen: "Up to 7.5 km, “priority 2” applies – according to your input, this is the case.",
      kritisch: "According to your input, the land is outside the priority radii (5 or 7.5 km around substations).",
      offen: "The distance to the substation will be checked in a conversation.",
    },
    einzelfallAT: {
      titel: "Case-by-case zoning",
      offen: (r) => `We clarify zoning case by case with the municipality and the federal state – the basics for ${r} are in the legal framework.`,
    },
    standortCH: {
      titel: "Site-bound status (Art. 24ter RPG)",
      gut: "According to your input, the land is in a suitability area or pre-impacted. Outside the building zone, free-standing solar installations are only considered site-bound in insensitive or pre-impacted areas.",
      pruefen: "According to your input, neither a suitability area nor pre-impacted. Site-bound status is then hard to prove; agrivoltaics needs a proven benefit for farming.",
      offen: "Whether the land can be considered site-bound will be checked with the municipality and canton.",
      quelle: { titel: "Spatial Planning Act RPG, Art. 24ter", url: "https://www.lexfind.ch/tolv/257906/de" },
    },
    fffCH: {
      titel: "Crop rotation land",
      gut: "According to your input, not crop rotation land.",
      kritisch: "Crop rotation land: yield potential and mechanical cultivability must be fully preserved.",
      offen: "Whether the land is crop rotation land will be checked in a conversation.",
    },
    parzelleCH: {
      titel: "Parcel",
      offen: "We clarify zone status, ownership and easements parcel by parcel with the municipality and canton.",
    },
    schutz: {
      titel: "Protected areas",
      gut: "According to your input, no protected area.",
      pruefen: "Landscape protection areas and adjacent protected areas are possible case by case – we check this carefully.",
      kritisch: "Nature reserves, Habitats Directive sites and water protection areas usually rule out a solar park.",
      offen: "We check protected areas precisely in a conversation.",
    },
    siedlung: {
      titel: "Distance to homes",
      gut: "More than 300 m – a good basis for acceptance.",
      pruefen: "100 to 300 m – we plan glare and screening accordingly.",
      kritisch: "Under 100 m, glare and acceptance are critical.",
      offen: "We check the distance to buildings in a conversation.",
    },
    netz: {
      titel: "Grid connection",
      gut: "Grid connection close by: low costs for cable route and transfer station.",
      pruefen: "Longer cable route – for small parks the costs weigh more heavily per kilowatt.",
      offen: "Distance to the grid unknown – we will ask the grid operator about connection capacity.",
    },
    kapazitaet: {
      titel: "Free grid capacity",
      offen: "Only the grid operator knows whether the grid has free capacity – we will ask.",
    },
    klein: {
      titel: "Minimum size",
      kritisch: "Under 2 ha, ground-mounted PV is usually not economical – neighbouring land can help.",
    },
  },
  stufe: { gut: "met", pruefen: "check", kritisch: "critical", offen: "checked in a conversation" },
  quelle: "Source",
};

export const FLAECHENPASS_TEXTE = Object.freeze({ de: DE, en: EN });
export const textePass = (sprache = "de") => (sprache === "en" ? EN : DE);

/** Text einer Antwort (Option) */
export const optionText = (t, feld, id) => t.optionen[feld]?.[id] ?? id;

/**
 * Zeile eines Bewertungskriteriums: { label, text } – Texte aus den Antworten, nie aus der Engine
 * (die internen Texte der Scoring-Engine enthalten Hinweise, die öffentlich nicht geprüft sind).
 */
export function kriteriumZeile(k, pass, t, sprache = "de") {
  const e = pass.eingaben;
  const z = (n, s = 0) => fmtZahl(n, s, sprache);
  const id = k.id;
  const lbl = (x) => (typeof x === "object" ? x[pass.land] || Object.values(x)[0] : x);
  const quelle = (feld) => (e[feld] === U ? t.detail.unbekannt : `${optionText(t, feld, e[feld])} (${t.detail.angegeben})`);
  if (id === "groesse") return { label: t.kriterien.groesse, text: `${z(pass.ha, pass.ha < 10 ? 2 : 1)} ha (${pass.gezeichnet ? t.detail.gezeichnet : t.detail.angegeben})` };
  if (id === "form") return { label: t.kriterien.form, text: pass.kompaktheitAngenommen ? t.detail.formAnnahme : pass.kompaktheit >= 0.85 ? t.detail.formGut : pass.kompaktheit >= 0.65 ? t.detail.formMittel : t.detail.formSchlecht };
  if (id === "neigung") return { label: t.kriterien.neigung, text: e.neigung === "eben" ? optionText(t, "neigung", "eben") : `${optionText(t, "neigung", e.neigung)}, ${optionText(t, "exposition", e.exposition)}` };
  if (id === "nutzung") return { label: t.kriterien.nutzung, text: optionText(t, "nutzung", e.nutzung) };
  if (id === "siedlung") return { label: t.kriterien.siedlung, text: quelle("siedlung") };
  if (id === "netz") return { label: t.kriterien.netz, text: pass.netzAngenommen ? t.detail.netzAnnahme(z(pass.netzKm)) : `${optionText(t, "netz", e.netz)} (${t.detail.angegeben})` };
  if (id === "kosten") return { label: t.kriterien.kosten, text: t.detail.kosten };
  if (id === "widmung") return { label: lbl(t.kriterien.widmung), text: t.detail.widmung[pass.land][pass.widmung.status] || t.detail.widmung[pass.land].unklar };
  if (id === "kulisse") {
    const ja = k.punkte > 0;
    const alleOffen = pass.land === "DE" ? e.verkehr === U && e.benachteiligt === U && e.nutzung !== "konversion" : e.eignung === U && e.vorbelastet === U;
    return { label: lbl(t.kriterien.kulisse), text: ja ? t.detail.kulisseJa : alleOffen ? t.detail.kulisseOffen : t.detail.kulisseNein };
  }
  if (id === "einstrahlung") return { label: t.kriterien.einstrahlung, text: t.detail.einstrahlung(z(pass.ertragKwhProKwp)) };
  if (id.startsWith("schutz_")) {
    const nah = e.schutz === "naturNah";
    return { label: nah ? t.kriterien.schutzNah : t.kriterien.schutz, text: t.detail.schutz[e.schutz] || "" };
  }
  if (id === "fff") return { label: t.kriterien.fff, text: t.detail.fff };
  if (id === "widmung_max") return { label: t.kriterien.widmung_max, text: t.detail.widmungMax };
  if (id === "kapazitaet") return { label: t.kriterien.kapazitaet, text: t.angaben.kapazitaet.offen };
  return { label: id, text: "" };
}

/** K.-o.-Hinweis als Satz */
export function koText(ko, t) {
  if (ko.id === "groesse") return t.ko.groesse;
  if (ko.id === "neigung") return t.ko.neigung;
  if (ko.id === "widmung") return t.ko.widmung;
  if (ko.id.startsWith("schutz_")) return t.ko.schutz;
  return "";
}

/** Text einer Checklisten-Angabe: { titel, text, quelle? } */
export function angabeText(a, pass, t, regionName = pass.region.name) {
  const d = t.angaben[a.id];
  if (!d) return { titel: a.id, text: "" };
  const s = a.stufe;
  let text = d[s] ?? d.offen ?? "";
  if (a.id === "kulisseDE" && s === "gut") {
    const e = pass.eingaben;
    const w = [
      e.verkehr === "bis200" || e.verkehr === "bis500" ? d.teile.randstreifen : null,
      e.nutzung === "konversion" ? d.teile.konversion : null,
      e.benachteiligt === "ja" ? d.teile.benachteiligt : null,
    ].filter(Boolean);
    text = d.gut(w.join(", "));
    if (e.benachteiligt === "ja" && w.length === 1) text = `${text} ${d.benachteiligtHinweis}`;
  } else if (typeof text === "function") text = text(regionName);
  return { titel: d.titel, text, quelle: d.quelle || null };
}
