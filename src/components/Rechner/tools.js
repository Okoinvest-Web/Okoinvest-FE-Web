import { Calculator, BatteryCharging, Building2, Cable, Car, Factory, Gauge, Warehouse, FileSearch, HandCoins, Handshake, Landmark, LineChart, MapPinned, Scale, Share2, Sprout, Users, Receipt, LandPlot, Repeat } from "lucide-react";
import { pfad, schreibweiseFuer } from "@/lib/land";

/**
 * Länder, in denen ein Rechner auf der Länderfassung (/de, /at, /ch) richtig reagiert: mit eigenen,
 * an der Quelle geprüften Werten oder über die Länder-Sperre der Länder-Engine (Region/Land wird
 * vorgewählt, ungeprüfte Werte erscheinen nicht). In allen anderen Ländern zeigt RechnerSeite den
 * LandHinweis statt des Rechners (Ländermodell, src/lib/land/inhalte.js).
 */
const DACH = ["DE", "AT", "CH"];

/** Alle Rechner & Tools – eine Quelle für Hub, Querverweise und Schema. */
export const TOOLS = [
  { id: "flaechencheck", laender: DACH, href: pfad("/flaechencheck"), titel: "Flächencheck", kurz: "Eignung und Pachtspanne Ihrer Fläche", text: "Lage, Größe, Nutzung und Netzentfernung eingeben – Sie erhalten eine Ampel-Einschätzung, mögliche Anlagengröße und Pachtspanne.", icon: MapPinned, zielgruppe: "Eigentümer", tag: "Einstieg" },
  { id: "pacht", laender: DACH, href: pfad("/rechner/pacht"), titel: "Pachtrechner", kurz: "Solarpacht über 30 Jahre vs. Ackerbau", text: "Was bringt Ihre Fläche über die gesamte Laufzeit – fest, indexiert oder mit Umsatzbeteiligung? Im Vergleich zu Ackerpacht und Deckungsbeitrag.", icon: HandCoins, zielgruppe: "Eigentümer" },
  { id: "agri-pv", laender: DACH, href: pfad("/rechner/agri-pv"), titel: "Agri-PV-Rechner", kurz: "Verpachten, selbst investieren oder beteiligen", text: "Drei Wege für Landwirte im direkten Vergleich: Pacht, Eigeninvestition und Beteiligung über die Genossenschaft – inklusive GAP-Direktzahlungen.", icon: Sprout, zielgruppe: "Landwirte", tag: "Neu" },
  { id: "solarpark", laender: DACH, href: pfad("/rechner/solarpark"), titel: "Solarpark-Renditerechner", kurz: "IRR, LCOE und Cashflow über 30 Jahre", text: "Investition, Finanzierung, EEG oder PPA: Projekt- und Eigenkapitalrendite, Stromgestehungskosten und Cashflow-Verlauf eines Solarparks.", icon: LineChart, zielgruppe: "Investoren", tag: "Profi" },
  { id: "projektbewertung", laender: ["DE"], href: pfad("/rechner/projektbewertung"), titel: "Projektbewertung", kurz: "Was ist ein Projekt in welcher Phase wert?", text: "Kaufpreisspanne je kWp nach Entwicklungsstand, Netzanschluss und Größe – für Verkäufer und Käufer von Projektrechten.", icon: Scale, zielgruppe: "Investoren" },
  { id: "reststrom", laender: ["DE"], href: pfad("/rechner/reststrom"), titel: "Reststrom-Rechner", kurz: "Ersparnis durch den Strompool", text: "Jahresverbrauch und heutiger Preis – was der Pool aus Bündelung, Solar-PPA und Flexibilität bei Ihrem Reststrom einsparen kann.", icon: Factory, zielgruppe: "Unternehmen" },
  { id: "solarcarport", laender: DACH, href: pfad("/rechner/solarcarport"), titel: "Carport-Rechner", kurz: "Parkplatz-PV mit Ladepunkten", text: "Stellplätze eingeben – Leistung, Ertrag, Investition, Eigenverbrauch und Amortisation eines Solarcarports mit Ladeinfrastruktur.", icon: Car, zielgruppe: "Unternehmen" },
  { id: "kommune", laender: DACH, href: pfad("/rechner/kommune"), titel: "Kommunal-Rechner", kurz: "Einnahmen der Gemeinde aus dem Solarpark", text: "§ 6 EEG-Beteiligung, Gewerbesteuer und Pacht auf Gemeindeflächen – was ein Solarpark der Standortgemeinde über 20 Jahre bringt.", icon: Landmark, zielgruppe: "Kommunen" },
  { id: "pachtangebot-check", laender: DACH, href: pfad("/rechner/pachtangebot-check"), titel: "Pachtangebot prüfen", kurz: "Klausel-Check mit Ampel und Barwert", text: "Angebot eines Projektierers eingeben – Summe, Barwert, Marktvergleich, Ampel für jede Klausel und die Fragen, die Sie stellen sollten. Mit Druckansicht.", icon: FileSearch, zielgruppe: "Eigentümer", tag: "Neu" },
  { id: "netzanschluss", laender: DACH, href: pfad("/rechner/netzanschluss"), titel: "Netzanschluss-Check", kurz: "Kosten, Zeitrahmen und Risiken", text: "Größe, Entfernung, Spannungsebene und Kapazität – grobe Kosten für Trasse, Stationen und Umspannwerk, mit Überbauung, Speicher und Tipps zu § 8 EEG.", icon: Cable, zielgruppe: "Eigentümer" },
  { id: "ppa", laender: ["DE"], href: pfad("/rechner/ppa"), titel: "PPA-Rechner", kurz: "Solarstrom zum Festpreis für Unternehmen", text: "Verbrauch, Lastprofil und PPA-Angebot – Ersparnis und Risiko in drei Börsenpreis-Szenarien, Preisabsicherung und CO₂.", icon: Handshake, zielgruppe: "Unternehmen" },
  { id: "grossspeicher", laender: ["DE"], href: pfad("/rechner/grossspeicher"), titel: "Großspeicher-Rechner", kurz: "BESS-Rendite mit Erlösmix", text: "Arbitrage, aFRR und FCR, Co-Location oder Stand-alone, Baukostenzuschuss und Netzentgelte – IRR, Amortisation und Cashflow.", icon: BatteryCharging, zielgruppe: "Investoren", tag: "Profi" },
  { id: "beteiligung", laender: DACH, href: pfad("/rechner/beteiligung"), titel: "Beteiligungsrechner", kurz: "Genossenschaft: Ausschüttung in drei Szenarien", text: "Wie aus dem Cashflow eines Solarparks eine Ausschüttung entstehen kann – vorsichtig gerechnet, Risiken offen, keine Anlageberatung.", icon: Users, zielgruppe: "Bürger" },
  { id: "energy-sharing", laender: ["DE"], href: pfad("/rechner/energy-sharing"), titel: "Energy-Sharing-Rechner", kurz: "Energiegemeinschaft in DE, AT und CH", text: "Anlage und Teilnehmende eingeben – geteilter Strom, Netzentgelt-Abschlag, Vorteil je Teilnehmer und Erlös für den Erzeuger.", icon: Share2, zielgruppe: "Kommunen" },
  { id: "eg-ersparnis", laender: ["AT"], href: pfad("/energiegemeinschaften/rechner"), titel: "Ersparnis-Rechner Energiegemeinschaft", kurz: "EEG, BEG oder GEA in Österreich", text: "Verbrauch, Netzgebiet und Erzeugung eingeben – Anteil Gemeinschaftsstrom, Netzentgelt-Ersparnis nach ElWG und Ersparnis je Mitglied.", icon: Calculator, zielgruppe: "Kommunen", tag: "Neu" },
  { id: "dachpacht", laender: DACH, href: pfad("/rechner/dachpacht"), titel: "Dachpacht-Rechner", kurz: "Pachtspanne und Ertrag Ihres Gewerbedachs", text: "Dachfläche, Dachart, Ausrichtung und Region eingeben – Leistung, Ertrag und Pachtspanne, dazu Dachpacht, Dachstrom-PPA und Eigeninvestition im Vergleich.", icon: Warehouse, zielgruppe: "Eigentümer", tag: "Neu" },
  { id: "bestandsanlage", laender: DACH, href: pfad("/rechner/bestandsanlage"), titel: "Bestandsanlagen-Bewertung", kurz: "Ertragswert laufender PV-Anlagen", text: "Förderrestlaufzeit, gemessener Ertrag, Betriebskosten, Pacht, Wechselrichtertausch und Marktpreis nach Förderende – Ertragswert mit Spanne, Wert je kWp und Sensitivität.", icon: Gauge, zielgruppe: "Investoren", tag: "Profi" },
  // Welle 3, Paket B5 – nur DE; AT (SNE-VO 2027) und CH zeigen den Länderhinweis der Seite
  // Paket ATSNE (Welle 4): AT zeigt die Vorbereitungs-Maske (SNE-VO 2027), gerechnet wird in AT noch nichts
  { id: "gewerbestrom-check", laender: ["DE", "AT"], href: pfad("/rechner/gewerbestrom-check"), titel: "Rechnungs-Check Gewerbestrom", kurz: "Stromrechnung zerlegen, Energiepreis einordnen", text: "Arbeitspreis, Grundpreis und Verbrauch eingeben – amtliche Umlagen, Steuern und Börsenwert (SMARD) gegen Ihren Energieanteil. Lastgang optional, wird nur im Browser ausgewertet.", icon: Receipt, zielgruppe: "Unternehmen", tag: "Neu" },
  // Welle 3, Paket B6 – Flächenpass Stufe 1 (DE, AT, CH; ohne Geldwerte)
  { id: "flaechenpass", laender: DACH, href: pfad("/rechner/flaechenpass"), titel: "Flächenpass", kurz: "Fläche einzeichnen, Eignung und Restriktionen", text: "Fläche auf der Karte einzeichnen oder Größe angeben – Hektar, Leistung, Stromertrag, grobe Eignung und die Restriktionen Ihres Bundeslandes mit Quellen.", icon: LandPlot, zielgruppe: "Eigentümer", tag: "Neu" },
  // Welle 3, Paket B7 – nur AT (EG-Software nach ElWG); DE und CH zeigen den Länderhinweis der Seite
  { id: "eg-wechsel-check", laender: ["AT"], href: pfad("/energiegemeinschaften/software/wechsel-check"), titel: "Wechsel-Check Energiegemeinschaft", kurz: "Software-Anbieter wechseln: sinnvoll und möglich?", text: "Sieben Fragen für bestehende Gemeinschaften in Österreich – ob sich ein Anbieterwechsel lohnt, was vorher zu klären ist und was für alle Anbieter gilt.", icon: Repeat, zielgruppe: "Kommunen", tag: "Neu" },
  // Welle 3, Paket B8 – Kommunal 2.0: Ratsvorlage für DE und AT (CH: Länderhinweis der Seite), Widmungskit nur AT
  { id: "ratsvorlage", laender: ["DE", "AT"], href: pfad("/kommunen/ratsvorlage"), titel: "Ratsvorlage Solarpark", kurz: "Kommunal-Rechner 2.0 mit Landesrecht", text: "Einnahmen der Gemeinde, Beteiligungsgesetz Ihres Bundeslands mit Quelle – und eine druckfertige Ratsvorlage als Muster. Für Österreich mit den Widmungsschritten des Landes.", icon: Scale, zielgruppe: "Kommunen", tag: "Neu" },
  { id: "widmungskit", laender: ["AT"], href: pfad("/kommunen/widmungskit"), titel: "Widmungskit Österreich", kurz: "Umwidmung für PV je Bundesland", text: "Ablauf, beteiligte Stellen und Prüfpunkte der Widmung für eine PV-Freiflächenanlage – je Bundesland, mit Quelle zu jedem Punkt, zum Abhaken und Drucken.", icon: MapPinned, zielgruppe: "Kommunen", tag: "Neu" },
  // Welle 4, Paket GEBAEUDE – DE, AT, CH (nur Energiemengen, keine Geldwerte)
  { id: "gebaeudestrom", laender: DACH, href: pfad("/rechner/gebaeudestrom"), titel: "Gebäudestrom-Rechner", kurz: "PV auf dem Mehrparteienhaus: Wer nutzt wie viel?", text: "Einheiten, Verbrauch und Dachfläche eingeben – mögliche Anlagengröße, im Gebäude genutzter Solarstrom und Deckung je Modell: Mieterstrom und § 42b EnWG, GEA in Österreich, ZEV/vZEV in der Schweiz.", icon: Building2, zielgruppe: "Eigentümer", tag: "Neu" },
];

// Englisch (Sprachmodell): Texte je Rechner-id – hrefs, Icons, Länder und Zielgruppen-Schlüssel
// bleiben aus TOOLS. Für die Übersetzer der Rechnerseiten: hier ergänzen, nicht kopieren.
export const TOOLS_EN = {
  flaechencheck: { titel: "Land check", kurz: "Suitability and lease range of your land", text: "Enter location, size, use and distance to the grid – you get a traffic-light assessment, a possible plant size and a lease range." },
  pacht: { titel: "Lease calculator", kurz: "Solar lease over 30 years vs. arable farming", text: "What does your land earn over the full term – fixed, indexed or with a revenue share? Compared with arable lease and gross margin." },
  "agri-pv": { titel: "Agrivoltaics calculator", kurz: "Lease, invest yourself or participate", text: "Three options for farmers compared directly: lease, own investment and participation via the cooperative – including CAP direct payments." },
  solarpark: { titel: "Solar park return calculator", kurz: "IRR, LCOE and cash flow over 30 years", text: "Investment, financing, EEG or PPA: project and equity return, levelised cost of electricity and cash flow of a solar park." },
  projektbewertung: { titel: "Project valuation", kurz: "What is a project worth in which phase?", text: "Purchase price range per kWp by development stage, grid connection and size – for sellers and buyers of project rights." },
  reststrom: { titel: "Residual power calculator", kurz: "Savings through the power pool", text: "Annual consumption and current price – what the pool can save on your residual power through pooling, solar PPA and flexibility." },
  solarcarport: { titel: "Carport calculator", kurz: "Car park PV with charging points", text: "Enter parking spaces – capacity, yield, investment, self-consumption and payback of a solar carport with charging infrastructure." },
  kommune: { titel: "Municipal calculator", kurz: "Municipal income from the solar park", text: "Participation under § 6 EEG, trade tax and lease on municipal land – what a solar park brings the host municipality over 20 years." },
  "pachtangebot-check": { titel: "Check a lease offer", kurz: "Clause check with traffic light and present value", text: "Enter a developer’s offer – total, present value, market comparison, a traffic light for every clause and the questions you should ask. With print view." },
  netzanschluss: { titel: "Grid connection check", kurz: "Costs, time frame and risks", text: "Size, distance, voltage level and capacity – rough costs for cable route, stations and substation, with overbuilding, storage and tips on § 8 EEG." },
  ppa: { titel: "PPA calculator", kurz: "Solar power at a fixed price for businesses", text: "Consumption, load profile and PPA offer – savings and risk in three exchange-price scenarios, price hedging and CO₂." },
  grossspeicher: { titel: "Battery storage calculator", kurz: "BESS return with revenue mix", text: "Arbitrage, aFRR and FCR, co-location or stand-alone, construction cost contribution and grid fees – IRR, payback and cash flow." },
  beteiligung: { titel: "Participation calculator", kurz: "Cooperative: distributions in three scenarios", text: "How a distribution can arise from a solar park’s cash flow – calculated cautiously, risks disclosed, no investment advice." },
  "energy-sharing": { titel: "Energy sharing calculator", kurz: "Energy community in DE, AT and CH", text: "Enter the plant and participants – shared power, grid fee discount, benefit per participant and revenue for the producer." },
  "eg-ersparnis": { titel: "Energy community savings calculator", kurz: "EEG, BEG or GEA in Austria", text: "Enter consumption, grid area and generation – share of community power, grid fee savings under the ElWG and savings per member." },
  dachpacht: { titel: "Roof lease calculator", kurz: "Lease range and yield of your commercial roof", text: "Enter roof area, roof type, orientation and region – capacity, yield and lease range, plus roof lease, rooftop PPA and own investment compared." },
  bestandsanlage: { titel: "Operating asset valuation", kurz: "Income value of operating PV plants", text: "Remaining subsidy term, measured yield, operating costs, lease, inverter replacement and market price after the subsidy ends – income value with range, value per kWp and sensitivity." },
  "gewerbestrom-check": { titel: "Commercial electricity bill check", kurz: "Break down your bill, place your energy price", text: "Enter energy price, standing charge and consumption – official levies, taxes and the exchange value (SMARD) against your energy component. Load profile optional, analysed in your browser only." },
  "eg-wechsel-check": { titel: "Energy community switch check", kurz: "Switch software provider: worthwhile and possible?", text: "Seven questions for existing communities in Austria – whether switching provider pays off, what to clarify first and what applies to all providers." },
  flaechenpass: { titel: "Land passport", kurz: "Draw your land, suitability and restrictions", text: "Draw your land on the map or enter its size – hectares, capacity, power yield, rough suitability and your federal state’s restrictions with sources." },
  ratsvorlage: { titel: "Council paper for solar parks", kurz: "Municipal calculator 2.0 with state law", text: "Municipal income, the participation law of your federal state with source – and a ready-to-print council paper template. For Austria with the state’s zoning steps." },
  widmungskit: { titel: "Zoning kit Austria", kurz: "Rezoning for PV per federal state", text: "Procedure, authorities involved and checkpoints for zoning a ground-mounted PV plant – per federal state, with a source for every point, to tick off and print." },
  gebaeudestrom: { titel: "Building power calculator", kurz: "PV on an apartment building: who uses how much?", text: "Enter units, consumption and roof area – possible plant size, solar power used in the building and coverage per model: tenant electricity and § 42b EnWG, GEA in Austria, ZEV/vZEV in Switzerland." },
};

/** Zielgruppen und Markierungen auf Englisch (Schlüssel = deutscher Wert in TOOLS). */
export const TOOL_BEGRIFFE_EN = {
  zielgruppe: { Alle: "All", "Eigentümer": "Owners", Landwirte: "Farmers", Investoren: "Investors", Unternehmen: "Businesses", Kommunen: "Municipalities", "Bürger": "Citizens" },
  tag: { Einstieg: "Starting point", Neu: "New", Profi: "Pro", "Guter Einstieg": "Good starting point" },
};

/** TOOLS in einer Sprache (gleiche Reihenfolge, gleiche ids; Rückfall Deutsch). */
export function toolsFuer(sprache = "de", land = null) {
  // land "CH": Schweizer Schreibweise ohne „ß“ (src/lib/land/schreibweise.js)
  if (sprache !== "en") return schreibweiseFuer(TOOLS, land);
  return schreibweiseFuer(TOOLS.map((t) => ({ ...t, ...(TOOLS_EN[t.id] || {}) })), land);
}
