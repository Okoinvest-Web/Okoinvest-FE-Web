// Länderinhalt CH für /freiflaeche (Ländermodell, Inhalte CH – Gruppe 1).
//
// Nur Aussagen, die in den geprüften Stammdaten der Regionsseite Schweiz belegt sind
// (src/data/regionen/schweiz.js, Recherche 29.09.2026, Nachprüfung 03.10.2026):
//   RPG Stand 01.01.2026 (Art. 24ter, Art. 25 Abs. 2), Kanton Luzern Merkblatt Solaranlagen (ab 01.01.2026,
//   u. a. Art. 32c RPV), BFE Faktenblatt Energierecht 2025 (Art. 9a EnV, 5 GWh Winter; Netzverstärkungen),
//   Pronovo PV-Auktionen 2026 (HEIV, CHF 300, 24 Monate), Kanton Graubünden Leitfaden Solarexpress
//   (Art. 71a EnG, Baugesuch bis 31.12.2025 aufgelegt), Appenzell Ausserrhoden Richtplan (1 MW), PVGIS v5.3.
// Werte ohne Schweizer Prüfung (Pacht, Reservierungsprämie, Kabel- und Rückbaukosten in €, Zeitplan)
// erscheinen auf /ch NICHT – dort steht der LandHinweis.
// Schreibweise: Schweizer Rechtschreibung (ss statt ß), Begriffe Parzelle, Gemeinde, Kanton, Franken.

import { Factory, FileCheck2, Landmark, Mountain, Sprout, TrainFront } from "lucide-react";
import SCHWEIZ from "../../regionen/schweiz.js";
import { chZahl } from "./schreibung.js";
import { fmtZahl } from "../../../lib/sprache/format.js";

const ERTRAG_MITTELLAND = SCHWEIZ.ertrag.kwhProKwp; // PVGIS, nördlich Bern

export const QUELLEN_CH = Object.freeze({
  rpg: "https://www.lexfind.ch/tolv/257906/de",
  luzern: "https://rawi.lu.ch/-/media/RAWI/Dokumente/Downloads/baubewilligungen/Merkblatt_Solaranlagen.pdf",
  bfe: "https://pubdb.bfe.admin.ch/de/publication/download/11913",
  pronovo: "https://pronovo.ch/de/foerderung/photovoltaik/auktionen/",
});

/** Inhalte der Seite /freiflaeche für die Schweiz (Rückfall auf gemeinsam über inhaltFuer()). */
export const FREIFLAECHE_CH = {
  hero: {
    marke: "CH",
    pille: "Freiflächen-Photovoltaik in der Schweiz",
    lead: "In der Schweiz ist eine Solaranlage ausserhalb der Bauzone die Ausnahme: Sie muss als standortgebunden gelten (Art. 24ter RPG). Wir prüfen, ob Ihre Parzelle dafür in Frage kommt – vorbelastete Flächen, Infrastruktur oder Agri-PV mit Vorteil für die Landwirtschaft – und begleiten Baugesuch, Netzanschluss, Bau und Betrieb.",
    zusagen: ["Flächensicherung bis Betrieb aus einer Hand", "Standortgebundenheit nach Art. 24ter RPG geprüft", "Rückbau vertraglich und per Bürgschaft gesichert", "Naturverträglich geplant"],
    ertragKwhProKwp: ERTRAG_MITTELLAND,
    stromLabel: "Strom (Mittelland)",
    drittWert: { label: "Ertrag (PVGIS)", einheit: "kWh/kWp", wert: ERTRAG_MITTELLAND },
    sprache: "de-CH",
    bildunterschrift: `Schematische Darstellung · Ertrag nach PVGIS im Berner Mittelland (${chZahl(ERTRAG_MITTELLAND)} kWh/kWp)`,
  },
  fakten4: { wert: "5 GWh", einheit: "Winterstrom", text: "ab dieser Produktion Oktober bis März ist eine Anlage von nationalem Interesse" },
  kette: {
    Netzanschluss: "Netzanfrage beim Verteilnetzbetreiber, Trassenplanung, Anschluss an Unterwerk oder Mittelspannung – Leitungen und Trafostationen mit Plangenehmigung des ESTI.",
    Baurecht: "Baugesuch bei der Gemeinde, kantonale Ausnahmebewilligung für standortgebundene Anlagen (Art. 24ter RPG) – je nach Kanton mit Nutzungsplanung.",
    "Vermarktung & Finanzierung": "HEIV-Auktion bei Pronovo oder gleitende Marktprämie, Stromabnahmevertrag (PPA), Eigenbetrieb oder Verkauf an Investoren.",
  },
  kriterienLead: "Keine Fläche ist perfekt. Entscheidend ist das Zusammenspiel aus Standort, Bauzone, Netz und Schutzinteressen – das prüfen wir kostenfrei, bevor wir über Verträge sprechen.",
  kriterien: {
    "Größe & Zuschnitt": { title: "Grösse & Zuschnitt", text: "Kompakte Zuschnitte sind günstiger als lange, schmale Streifen. Mehrere Eigentümer können Parzellen bündeln. Massgeblich ist in der Schweiz aber weniger die Grösse als die Frage, ob der Standort als standortgebunden gilt." },
    Netzentfernung: { text: "Je kürzer die Leitung zum Anschlusspunkt, desto besser – der Aufwand für Erschliessung und Netzanschluss muss nach Art. 24ter RPG im Verhältnis zur Leistung angemessen sein. Netzverstärkungen auf Mittelspannung werden seit 2025 mit Bewilligung der ElCom über Swissgrid verteilt." },
    "Planungsrecht & Kulisse": { text: "Bauzone oder nicht, kantonaler Richtplan (Teil Energie), Fruchtfolgeflächen und die Haltung der Gemeinde. Vorbelastete Standorte und Agri-PV mit Vorteil für die Produktion haben gute Chancen." },
  },
  ampel: [
    { titel: "Gute Voraussetzungen", ton: "gruen", punkte: SCHWEIZ.kulisse.gut },
    { titel: "Genau prüfen", ton: "gelb", punkte: ["Fruchtfolgeflächen: Ertragspotenzial und Bewirtschaftbarkeit müssen voll erhalten bleiben", "BLN-Landschaften, Waldareal und Ortsbilder von nationaler Bedeutung (ISOS)", "Offenes Acker- und Grünland ohne belegten Vorteil für die Produktion", "Abgelegene Lagen mit langem Netzanschluss"] },
    { titel: "Meist ausgeschlossen", ton: "rot", punkte: ["Moorlandschaften", "Biotope von nationaler Bedeutung", "Wasser- und Zugvogelreservate", "Neue alpine Grossanlagen über den Solarexpress (nur noch Altprojekte)"] },
  ],
  kulisse: {
    eyebrow: "Schweiz · RPG und Energiegesetz",
    titel: "Die Standortgebundenheit entscheidet über die Bewilligung.",
    lead: "Ausserhalb der Bauzone braucht eine Solaranlage eine Ausnahmebewilligung des Kantons – und die gibt es nur, wenn sie als standortgebunden gilt. Seit 1. Januar 2026 regelt Art. 24ter RPG, wann das für freistehende Anlagen und für Agri-PV zutrifft.",
    box: {
      titel: "Nationales Interesse ab 5 GWh Winterstrom",
      text: "Neue Solaranlagen sind seit 2025 von nationalem Interesse, wenn sie von Oktober bis März im Mittel mindestens 5 GWh erzeugen (Art. 9a EnV). In den Eignungsgebieten des kantonalen Richtplans geniessen sie einen grundsätzlichen Vorrang in der Interessenabwägung.",
    },
    punkte: [
      { icon: TrainFront, t: "Freistehend, vorbelastet", x: "Ausserhalb der Bauzone und der landwirtschaftlichen Nutzfläche: in wenig empfindlichen oder bereits mit Bauten und Anlagen belasteten Gebieten, bei angemessenem Erschliessungsaufwand (Art. 24ter Abs. 1 RPG)." },
      { icon: Sprout, t: "Agri-PV mit Vorteil", x: "Auf landwirtschaftlicher Nutzfläche nur, wenn die Anlage der Produktion Vorteile bringt oder Versuchs- und Forschungszwecken dient – mit umfassender Interessenabwägung (Art. 24ter Abs. 2 RPG)." },
      { icon: Factory, t: "Auf Infrastruktur", x: "Nicht freistehende Anlagen, die optisch eine Einheit mit bestehenden Bauten bilden – Lärmschutzwände, Staumauern, Parkplätze, Böschungen (Art. 32c RPV)." },
      { icon: Landmark, t: "Eignungsgebiete im Richtplan", x: "Die Kantone legen Eignungsgebiete für Anlagen von nationalem Interesse fest und berücksichtigen dabei Landschaft, Wald und Fruchtfolgeflächen." },
      { icon: Mountain, t: "Solarexpress beendet", x: "Erleichterungen nach Art. 71a EnG gelten nur für alpine Projekte, deren Baugesuch bis 31. Dezember 2025 öffentlich aufgelegt wurde. Neue Projekte folgen den ordentlichen Regeln." },
      { icon: FileCheck2, t: "Förderung per Auktion", x: "Anlagen ab 150 kW ohne Eigenverbrauch bewerben sich bei Pronovo um die hohe Einmalvergütung (HEIV) oder die gleitende Marktprämie; Gebühr CHF 300 je Gebot, 24 Monate bis zur Inbetriebnahme." },
    ],
    fuss: "Ob Ihre Parzelle in der Bauzone, auf Fruchtfolgeflächen oder in einem Eignungsgebiet liegt, prüfen wir parzellengenau. Stand 03.10.2026, ohne Gewähr – massgeblich sind das geltende Bundesrecht und die kantonalen Vorgaben.",
  },
  verfahrenCh: [
    "Ausserhalb der Bauzone nur, wenn die Anlage standortgebunden ist (Art. 24ter RPG)",
    "Agri-PV: nur bei Vorteilen für die landwirtschaftliche Produktion oder zu Versuchs- und Forschungszwecken",
    "Baugesuch bei der Gemeinde, öffentliche Auflage; die kantonale Behörde erteilt die Ausnahmebewilligung (Art. 25 Abs. 2 RPG)",
    "Solarexpress (Art. 71a EnG) nur noch für alpine Projekte, deren Baugesuch bis Ende 2025 aufgelegt wurde",
    "Förderung über HEIV-Auktion oder gleitende Marktprämie bei Pronovo, sonst PPA",
  ],
  oekologieText2:
    "In der Schweiz gehört eine umfassende Interessenabwägung zur Bewilligung – unter anderem zu Landschaft, Bodenschutz und Fruchtfolgeflächen. Anlagen über 5 MW, die nicht an Gebäuden angebracht sind, brauchen zudem eine Umweltverträglichkeitsprüfung.",
  rueckbau: {
    lead: "Die wichtigste Frage vieler Eigentümer: Was, wenn der Betreiber nicht mehr existiert? Die Antwort steht im Gesetz, im Vertrag und im Grundbuch.",
    kacheln: {
      "Dienstbarkeit im Grundbuch": "Ein im Grundbuch eingetragenes Recht sichert den Betrieb – und bindet auch jeden Rechtsnachfolger an die vertragliche Rückbaupflicht.",
      "Recycling statt Deponie": "Module, Stahl, Aluminium und Kupfer werden verwertet statt deponiert.",
      Wiederherstellung: "Nach Art. 24ter RPG muss eine Anlage bei endgültiger Ausserbetriebnahme zurückgebaut und die Ausgangslage wiederhergestellt werden. Pfosten ziehen, Kabel bergen, Boden lockern – die Parzelle geht in landwirtschaftlich nutzbarem Zustand zurück.",
    },
  },
  faq: [
    {
      q: "Darf man in der Schweiz einen Solarpark auf einer Wiese bauen?",
      a: "Nur ausnahmsweise. Ausserhalb der Bauzone muss die Anlage standortgebunden sein. Nach Art. 24ter RPG gilt das für freistehende Anlagen ausserhalb der landwirtschaftlichen Nutzfläche in wenig empfindlichen oder vorbelasteten Gebieten mit angemessenem Erschliessungsaufwand. Auf landwirtschaftlicher Nutzfläche braucht es zusätzlich einen Vorteil für die Produktion oder einen Forschungszweck.",
    },
    {
      q: "Wie läuft die Bewilligung ab?",
      a: "Das Baugesuch wird bei der Gemeinde eingereicht, dort öffentlich aufgelegt und nach allfälligen Einsprachen an den Kanton weitergeleitet. Die kantonale Behörde für Bauten ausserhalb der Bauzonen entscheidet über die Standortgebundenheit und erteilt die Ausnahmebewilligung (Art. 25 Abs. 2 RPG). Grössere Anlagen brauchen je nach Kanton eine Nutzungsplanung oder eine Grundlage im Richtplan; Leitungen und Trafostationen laufen über die Plangenehmigung des ESTI.",
    },
    {
      q: "Wie viel Strom erzeugt ein Solarpark in der Schweiz?",
      a: `Nach PVGIS liegt der spezifische Ertrag im Berner Mittelland bei rund ${chZahl(ERTRAG_MITTELLAND)} kWh je kWp und Jahr, je nach Lage zwischen rund 1’150 kWh/kWp im Thurgauer Mittelland und rund 1’420 kWh/kWp im Walliser Rhonetal. Für die Schweizer Energiepolitik zählt bei grossen Anlagen zudem der Winterstrom von Oktober bis März.`,
    },
    {
      q: "Ab wann ist eine Solaranlage von nationalem Interesse?",
      a: "Wenn ihre mittlere erwartete Produktion von Oktober bis März mindestens 5 GWh beträgt (Art. 9a EnV). In den Eignungsgebieten des kantonalen Richtplans hat eine solche Anlage einen grundsätzlichen Vorrang in der Interessenabwägung; eine Einzelfallprüfung bleibt.",
    },
    {
      q: "Kann ein neues Projekt den Solarexpress noch nutzen?",
      a: "Nein. Begünstigt sind nur alpine Projekte, deren Baugesuch bis 31. Dezember 2025 öffentlich aufgelegt wurde. Neue Grossanlagen laufen über die Regeln für Anlagen von nationalem Interesse oder Art. 24ter RPG und werden über HEIV oder Marktprämie gefördert.",
    },
    {
      q: "Wie wird ein Solarpark in der Schweiz gefördert?",
      a: "Anlagen ab 150 kW ohne Eigenverbrauch bewerben sich bei Pronovo in Auktionen um die hohe Einmalvergütung (HEIV) oder die gleitende Marktprämie. Je Gebot fällt eine Teilnahmegebühr von CHF 300 an, das Projekt muss baureif sein, und ab Rechtskraft der Zuschlagsverfügung bleiben 24 Monate bis zur Inbetriebnahme.",
    },
    {
      q: "Wer baut den Solarpark nach Vertragsende zurück?",
      a: "Der Betreiber. Nach Art. 24ter RPG muss eine Anlage bei endgültiger Ausserbetriebnahme zurückgebaut und die Ausgangslage wiederhergestellt werden. Wir regeln den Rückbau zusätzlich im Vertrag und sichern ihn über eine Bürgschaft ab.",
    },
    {
      q: "Wie ist das in Deutschland und Österreich?",
      a: "In Deutschland braucht ein Solarpark in der Regel einen Bebauungsplan der Gemeinde; gefördert wird er über die EEG-Ausschreibung oder er finanziert sich über einen PPA. In Österreich braucht er meist eine Widmung als Grünland-Photovoltaik und muss in die Zonierung bzw. die Kriterien des jeweiligen Bundeslandes passen; die Förderung erfolgt über das EAG.",
    },
  ],
  querverweise: {
    "/agri-pv": "Wenn die Landwirtschaft auf der Parzelle weitergehen soll.",
    "/flaechencheck": "Erste Einschätzung zu Ihrer Parzelle in zwei Minuten.",
  },
  querverweisRegion: { href: "/regionen/schweiz", titel: "Solarpark und Agri-PV in der Schweiz", text: "Art. 24ter RPG, Solarexpress, HEIV-Auktionen und Kantone – mit Quellen." },
  cta: {
    text: "Parzellen nennen, wir prüfen Bauzone, Richtplan, Netz und Schutzgebiete am Kartentisch – und sagen Ihnen ehrlich, ob eine Bewilligung realistisch ist. Offen gesagt: Wir sind selbst Projektentwickler und haben Interesse an geeigneten Flächen.",
    secondary: { label: "Region Schweiz", href: "/regionen/schweiz" },
  },
};


// Englisch (Sprachmodell): Übersetzung von FREIFLAECHE_CH – gleiche Quellen, keine zusätzlichen Werte.
// Nur Texte; Icons, hrefs und Zahlenwerte kommen aus FREIFLAECHE_CH (Zusammenführung in inhaltFuerSprache()).
// Schweizer Rechtsbegriffe werden erklärt (RPG = Swiss Spatial Planning Act, Bauzone = building zone …).
const zEn = (n, stellen = 0) => fmtZahl(n, stellen, "en");

export const FREIFLAECHE_CH_EN = {
  hero: {
    pille: "Ground-mounted photovoltaics in Switzerland",
    lead: "In Switzerland, a solar installation outside the building zone is the exception: it must qualify as site-bound (Art. 24ter RPG, Swiss Spatial Planning Act). We check whether your plot is eligible – pre-impacted land, infrastructure or agrivoltaics that benefit farming – and support you through the building application, grid connection, construction and operation.",
    zusagen: ["Securing the land through to operation from a single source", "Site-bound status under Art. 24ter RPG checked", "Decommissioning secured by contract and bank guarantee", "Planned to be nature-friendly"],
    stromLabel: "Power (Swiss Plateau)",
    drittWert: { label: "Yield (PVGIS)" },
    sprache: "en-GB",
    bildunterschrift: `Schematic illustration · yield according to PVGIS on the Bernese Plateau (${zEn(ERTRAG_MITTELLAND)} kWh/kWp)`,
  },
  fakten4: { einheit: "Winter power", text: "from this output between October and March, a plant is of national interest" },
  kette: {
    Netzanschluss: "Grid request to the distribution system operator, cable route planning, connection to a substation or the medium-voltage grid – lines and transformer stations with plan approval from ESTI (Federal Inspectorate for Heavy Current Installations).",
    Baurecht: "Building application to the municipality, cantonal exemption permit for site-bound installations (Art. 24ter RPG) – depending on the canton, with land use planning.",
    "Vermarktung & Finanzierung": "HEIV auction (high one-off remuneration) at Pronovo or a sliding market premium, power purchase agreement (PPA), own operation or sale to investors.",
  },
  kriterienLead: "No site is perfect. What matters is the interplay of location, building zone, grid and protection interests – we check this free of charge before we talk about contracts.",
  kriterien: {
    "Größe & Zuschnitt": { title: "Size & shape", text: "Compact plots are cheaper than long, narrow strips. Several owners can pool their plots. In Switzerland, however, size matters less than whether the site qualifies as site-bound." },
    Netzentfernung: { text: "The shorter the line to the connection point, the better – under Art. 24ter RPG, the effort for access and grid connection must be reasonable in relation to the output. Since 2025, medium-voltage grid reinforcements have been allocated via Swissgrid with the approval of ElCom (Federal Electricity Commission)." },
    "Planungsrecht & Kulisse": { text: "Building zone or not, the cantonal structure plan (energy section), crop rotation areas and the municipality’s stance. Pre-impacted sites and agrivoltaics that benefit production have good chances." },
  },
  ampel: [
    { titel: "Good conditions", punkte: ["Pre-impacted land along transport routes, gravel pits, landfills, dams or ski areas", "Non-free-standing installations on infrastructure: noise barriers, car parks, embankments, artificial water bodies", "Agrivoltaics over special and permanent crops such as berries or fruit, with protection against hail and weather", "Suitability areas for solar installations of national interest in the cantonal structure plan, where designated"] },
    { titel: "Check carefully", punkte: ["Crop rotation areas: yield potential and workability must be fully preserved", "BLN landscapes (Federal Inventory of Landscapes), forest areas and townscapes of national importance (ISOS)", "Open arable land and grassland without a proven benefit for production", "Remote locations with a long grid connection"] },
    { titel: "Usually ruled out", punkte: ["Moorland landscapes", "Biotopes of national importance", "Waterbird and migratory bird reserves", "New large alpine plants via the Solarexpress (only legacy projects)"] },
  ],
  kulisse: {
    eyebrow: "Switzerland · RPG and Energy Act",
    titel: "Site-bound status decides on the permit.",
    lead: "Outside the building zone, a solar installation needs an exemption permit from the canton – and this is only granted if it qualifies as site-bound. Since 1 January 2026, Art. 24ter RPG has governed when this applies to free-standing installations and to agrivoltaics.",
    box: {
      titel: "National interest from 5 GWh of winter power",
      text: "Since 2025, new solar installations have been of national interest if they generate an average of at least 5 GWh between October and March (Art. 9a EnV, Swiss Energy Ordinance). In the suitability areas of the cantonal structure plan, they enjoy priority in principle when interests are weighed.",
    },
    punkte: [
      { t: "Free-standing, pre-impacted", x: "Outside the building zone and the utilised agricultural area: in less sensitive areas or areas already impacted by buildings and installations, with reasonable access effort (Art. 24ter (1) RPG)." },
      { t: "Agrivoltaics with a benefit", x: "On utilised agricultural area only if the installation benefits production or serves trial and research purposes – with a comprehensive weighing of interests (Art. 24ter (2) RPG)." },
      { t: "On infrastructure", x: "Non-free-standing installations that visually form a unit with existing structures – noise barriers, dams, car parks, embankments (Art. 32c RPV, Spatial Planning Ordinance)." },
      { t: "Suitability areas in the structure plan", x: "The cantons designate suitability areas for installations of national interest, taking landscape, forest and crop rotation areas into account." },
      { t: "Solarexpress ended", x: "The relief under Art. 71a EnG (Energy Act) only applies to alpine projects whose building application was publicly displayed by 31 December 2025. New projects follow the ordinary rules." },
      { t: "Funding by auction", x: "Installations from 150 kW without self-consumption bid at Pronovo for the high one-off remuneration (HEIV) or the sliding market premium; fee CHF 300 per bid, 24 months until commissioning." },
    ],
    fuss: "Whether your plot lies in the building zone, on crop rotation areas or in a suitability area, we check plot by plot. As of 3 October 2026, without guarantee – applicable federal law and cantonal requirements are authoritative.",
  },
  verfahrenCh: [
    "Outside the building zone only if the installation is site-bound (Art. 24ter RPG)",
    "Agrivoltaics: only if it benefits agricultural production or serves trial and research purposes",
    "Building application to the municipality, public display; the cantonal authority grants the exemption permit (Art. 25 (2) RPG)",
    "Solarexpress (Art. 71a EnG) only for alpine projects whose building application was displayed by the end of 2025",
    "Funding via HEIV auction or sliding market premium at Pronovo, otherwise PPA",
  ],
  oekologieText2:
    "In Switzerland, a comprehensive weighing of interests is part of the permit – including landscape, soil protection and crop rotation areas. Installations over 5 MW that are not attached to buildings also require an environmental impact assessment.",
  rueckbau: {
    lead: "The most important question for many owners: what if the operator no longer exists? The answer is in the law, in the contract and in the land register.",
    kacheln: {
      "Dienstbarkeit im Grundbuch": "A right entered in the land register secures operation – and also binds every legal successor to the contractual decommissioning obligation.",
      "Recycling statt Deponie": "Modules, steel, aluminium and copper are recycled instead of landfilled.",
      Wiederherstellung: "Under Art. 24ter RPG, an installation must be dismantled and the original condition restored when it is permanently taken out of service. Pulling the piles, recovering the cables, loosening the soil – the plot is returned in a condition fit for farming.",
    },
  },
  faq: [
    {
      q: "Can you build a solar park on a meadow in Switzerland?",
      a: "Only by way of exception. Outside the building zone, the installation must be site-bound. Under Art. 24ter RPG, this applies to free-standing installations outside the utilised agricultural area in less sensitive or pre-impacted areas with reasonable access effort. On utilised agricultural area, a benefit for production or a research purpose is also required.",
    },
    {
      q: "How does the permit procedure work?",
      a: "The building application is submitted to the municipality, publicly displayed there and, after any objections, forwarded to the canton. The cantonal authority for construction outside the building zones decides on site-bound status and grants the exemption permit (Art. 25 (2) RPG). Depending on the canton, larger installations need land use planning or a basis in the structure plan; lines and transformer stations go through plan approval by ESTI.",
    },
    {
      q: "How much power does a solar park generate in Switzerland?",
      a: `According to PVGIS, the specific yield on the Bernese Plateau is around ${zEn(ERTRAG_MITTELLAND)} kWh per kWp per year – depending on location, between around 1,150 kWh/kWp on the Thurgau Plateau and around 1,420 kWh/kWp in the Rhône Valley in Valais. For Swiss energy policy, winter power from October to March also counts for large installations.`,
    },
    {
      q: "When is a solar installation of national interest?",
      a: "When its average expected output from October to March is at least 5 GWh (Art. 9a EnV). In the suitability areas of the cantonal structure plan, such an installation has priority in principle when interests are weighed; a case-by-case assessment remains.",
    },
    {
      q: "Can a new project still use the Solarexpress?",
      a: "No. Only alpine projects whose building application was publicly displayed by 31 December 2025 benefit. New large installations follow the rules for installations of national interest or Art. 24ter RPG and are funded via HEIV or the market premium.",
    },
    {
      q: "How is a solar park funded in Switzerland?",
      a: "Installations from 150 kW without self-consumption bid at Pronovo in auctions for the high one-off remuneration (HEIV) or the sliding market premium. A participation fee of CHF 300 applies per bid, the project must be ready-to-build, and from the date the award decision becomes final there are 24 months until commissioning.",
    },
    {
      q: "Who dismantles the solar park when the contract ends?",
      a: "The operator. Under Art. 24ter RPG, an installation must be dismantled and the original condition restored when it is permanently taken out of service. We also set out decommissioning in the contract and secure it with a bank guarantee.",
    },
    {
      q: "How does it work in Germany and Austria?",
      a: "In Germany, a solar park generally needs a development plan (Bebauungsplan) from the municipality; it is funded through the EEG tender or financed through a PPA. In Austria, it usually needs a zoning designation as ‘Grünland-Photovoltaik’ and has to fit the zoning or criteria of the respective federal state; funding is provided under the EAG.",
    },
  ],
  querverweise: {
    "/agri-pv": "When farming on the plot is to continue.",
    "/flaechencheck": "An initial assessment of your plot in two minutes.",
  },
  querverweisRegion: { titel: "Solar parks and agrivoltaics in Switzerland", text: "Art. 24ter RPG, Solarexpress, HEIV auctions and cantons – with sources." },
  cta: {
    text: "Give us the plot numbers and we will check building zone, structure plan, grid and protected areas at our desk – and tell you honestly whether a permit is realistic. To be open: we are project developers ourselves and are interested in suitable land.",
    secondary: { label: "Region Switzerland" },
  },
};
