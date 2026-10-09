// src/data/lexikon-en.js – englische Fassung des Fachlexikons (Sprachmodell)
//
// Gleiche ids wie src/data/lexikon.js (Anker bleiben stabil), nur Texte. Je Eintrag:
//   b  Begriff (englisch; der deutsche Fachbegriff bleibt in Klammern, wo er im DACH-Raum gesucht wird)
//   k  Kurzdefinition (ein zitierfähiger Satz)
//   t  Erklärung
//   s  zusätzliche englische Suchbegriffe (der deutsche Begriff und die deutschen Synonyme bleiben durchsuchbar)
//   l  Linktext (href kommt aus lexikon.js)
// Zahlen kommen wie im deutschen Lexikon aus src/lib/invest/markt.js, im englischen Zahlenformat.
// Länderbegriffe werden erklärt statt übersetzt, z. B. „Widmung (zoning designation)“.

import { PACHT, AGRI, CARPORT, PHASEN, PROVISION, KOMMUNE, ERLOESE, FREIFLAECHE, STROM, FINANZIERUNG } from "@/lib/invest/markt";
import { fmtZahl } from "@/lib/sprache/format";
import { provisionTextEn } from "@/lib/sprache/rechnerBegriffe";
import { BEGRIFFE, KATEGORIEN } from "./lexikon.js";

const fmt = (n, d = 0) => fmtZahl(n, d, "en");
const phase = (id) => PHASEN.find((p) => p.id === id);
const pct = (x, stellen = 0) => `${fmt(x * 100, stellen)}%`;
const spanne = (p) => `€${fmt(p.preisProKwp.min)} to €${fmt(p.preisProKwp.max)}/kWp`;
const STROMSTEUER_REGEL = STROM.bestandteile.find((b) => b.id === "stromsteuer").ct;

export const KATEGORIEN_EN = {
  planung: "Planning & permits",
  flaeche: "Land & agriculture",
  technik: "Technology & grid",
  markt: "Power market & marketing",
  invest: "Investment & transactions",
  gemeinschaft: "Communities & DACH",
};

export const LEXIKON_EN = {
  // ---------------------------------------------------------------- A
  "agri-pv": {
    b: "Agri-photovoltaics (agri-PV)",
    k: "Agri-PV is the simultaneous use of the same land for agricultural production and solar power generation, with farming remaining the main use.",
    t: `Common designs are elevated systems above special crops and vertical, bifacial module rows on arable land or grassland, with farming between the rows. In Germany, DIN SPEC 91434 sets out the requirements; if the criteria are met, around ${pct(AGRI.gapFoerderfaehig)} of the area currently remains eligible for CAP payments. Under the EEG, agri-PV counts as a special solar installation, and up to ${fmt(AGRI.privilegierungHa, 1)} ha with a link to the farm it can be privileged under building law in the outer zone (Außenbereich).`,
    s: ["agrivoltaics", "agrophotovoltaics", "APV"],
    l: "Agri-PV with ÖkoInvest",
  },
  anlagenzertifikat: {
    b: "Plant certificate (Anlagenzertifikat)",
    k: "The plant certificate confirms that a generation or storage plant meets the grid requirements of the relevant VDE application rule at the grid connection point.",
    t: "For plants connected to the medium-voltage grid (VDE-AR-N 4110) and the high-voltage grid (VDE-AR-N 4120), the network operator usually requires a plant certificate above a certain plant size, and in some cases a simplified procedure for smaller plants. It is issued by an accredited certification body on the basis of unit certificates and grid calculations and is a prerequisite for final commissioning. Time and costs therefore belong in the project plan at an early stage.",
    s: ["unit certificate", "certificate of conformity", "grid code compliance"],
    l: "Project process",
  },
  "anzulegender-wert": {
    b: "Reference value (anzulegender Wert)",
    k: "Under the EEG, the reference value is the amount in cents per kilowatt-hour on which the market premium of a subsidised plant is calculated.",
    t: `For plants that must take part in tenders, it equals the plant's own award value; for smaller plants it is set by law. The market premium is the difference between the reference value and the solar market value and is usually paid for 20 years. For orientation: in the first segment, average award values were recently around ${fmt(ERLOESE.eegFreiflaecheCt, 1)} ct/kWh.`,
    s: ["strike price EEG", "applicable value"],
    l: "EEG tenders explained",
  },
  arbitrage: {
    b: "Arbitrage (power trading)",
    k: "Arbitrage means exploiting price differences on the power market by charging a storage system when prices are low and discharging it when they are high.",
    t: "For utility-scale battery storage, arbitrage in day-ahead and intraday trading is the most important revenue source alongside balancing power. Revenues depend on price volatility, efficiency and the number of cycles; high solar feed-in at midday and negative prices widen the price spread. In practice, the storage system is marketed via an optimiser or a virtual power plant.",
    s: ["energy arbitrage", "spread trading", "intraday trading"],
    l: "Revenues of utility-scale storage",
  },
  "asset-deal": {
    b: "Asset deal",
    k: "In an asset deal, the investor buys individual assets of a project – such as contracts, permits and plant components – instead of shares in the project company.",
    t: "The buyer can choose which rights and obligations to take over and so avoids unknown legacy liabilities of the company. In return, every contract has to be transferred individually, which may require the consent of lessors, the network operator or authorities. In project development, the share deal is therefore more common.",
    s: ["asset purchase"],
    l: "Buying project rights",
  },
  aufstellungsbeschluss: {
    b: "Decision to draw up a development plan (Aufstellungsbeschluss)",
    k: "The Aufstellungsbeschluss is the municipal council's decision to draw up a development plan (Bebauungsplan) for a specific area, and it starts the formal land-use planning procedure.",
    t: `With it, the municipality declares its intention to plan; it does not yet create any entitlement to building rights. For solar parks it is an important milestone because it shows that the municipality supports the project in principle – projects in this phase trade, for orientation, at around ${spanne(phase("aufstellung"))}. An urban development contract (städtebaulicher Vertrag) on covering the planning costs is often concluded in parallel.`,
    s: ["planning resolution", "decision to prepare a zoning plan"],
    l: "Development plan procedure",
  },
  ausgleichsflaechen: {
    b: "Compensation areas (Ausgleichsflächen)",
    k: "Compensation areas are areas on which impacts on nature and landscape are offset under the nature conservation impact regulation.",
    t: "In the development plan procedure for a solar park, the impact is assessed and compensation is set. Because extensively managed grassland under and between the module rows is often ecologically upgraded, a large part of the compensation can usually be provided within the plant area, for example through flower strips, hedges or grazing. The scope and crediting are regulated differently by federal states and municipalities.",
    s: ["ecological compensation", "offset areas", "impact regulation"],
    l: "Ground-mounted PV",
  },
  "ausschreibung-eeg": {
    b: "Tender (EEG)",
    k: "In the EEG tender, the Bundesnetzagentur (Federal Network Agency) determines competitively which solar projects receive a market premium and at what reference value.",
    t: "Ground-mounted plants above 1 MW usually take part in the tenders of the first segment; projects submit a sealed price in ct/kWh, and the cheapest bids up to the tender volume receive an award at their own bid value (pay-as-bid). Requirements include land within the eligible area, at least an adopted decision on a development plan and a security deposit. After the award, the plant must be built within a deadline, otherwise penalties apply.",
    s: ["solar auction", "first segment", "Federal Network Agency", "auction"],
    l: "EEG tenders for ground-mounted PV",
  },

  // ---------------------------------------------------------------- B
  baukostenzuschuss: {
    b: "Construction cost contribution (Baukostenzuschuss, BKZ)",
    k: "The construction cost contribution is a one-off payment that a network operator can charge at grid connection for the proportionate costs of upstream grid expansion.",
    t: "For pure generation plants such as solar parks, there is usually no construction cost contribution in Germany. For utility-scale batteries that also draw power from the grid, however, network operators may charge a BKZ following a ruling of the Federal Court of Justice (2025); its amount depends on the grid level and connection capacity and can significantly affect profitability. For storage projects it therefore belongs in the calculation early on.",
    s: ["BKZ", "grid connection contribution", "grid cost contribution"],
    l: "Utility-scale storage",
  },
  bebauungsplan: {
    b: "Development plan (Bebauungsplan, B-Plan)",
    k: "The development plan is the municipal bylaw that sets out in a binding way what may be built in a specific area – for most solar parks it is the basis of the building rights.",
    t: "Because ground-mounted PV in the outer zone is privileged only in exceptional cases, the municipality usually creates building rights through a project-related or a general development plan, mostly as a special area for photovoltaics. The procedure comprises the decision to draw up the plan, early and formal participation, an environmental report and the adoption as a bylaw, and typically takes one to two years. The land-use plan (Flächennutzungsplan) is often amended in a parallel procedure.",
    s: ["zoning plan", "local development plan", "special area photovoltaics", "land-use planning"],
    l: "Permitting a solar park",
  },
  "benachteiligte-gebiete": {
    b: "Less-favoured areas (benachteiligte Gebiete)",
    k: "Less-favoured areas are agricultural areas with unfavourable natural conditions, delimited under EU agricultural law, on which ground-mounted PV can take part in EEG tenders.",
    t: "Originally, the federal states had to open these arable and grassland areas for solar parks by ordinance (state opening clause). Since Solar Package I, they are in principle part of the eligible area; according to the current status, the states can restrict them again under certain conditions. Whether a plot lies in a less-favoured area can be checked with the state agricultural administration.",
    s: ["disadvantaged areas", "areas with natural constraints", "state opening clause"],
    l: "Check your land",
  },
  "besondere-solaranlagen": {
    b: "Special solar installations (besondere Solaranlagen)",
    k: "Under the EEG, special solar installations are agri-PV, floating, peatland and car park PV plants, which have their own requirements and their own tender segment with a separate maximum value.",
    t: `Because these plants cost more than conventional ground-mounted plants, they do not compete directly with them in the tender; award values have recently been noticeably higher, for orientation around ${fmt(ERLOESE.eegBesondereCt, 1)} ct/kWh. The Bundesnetzagentur sets the detailed technical requirements; for agri-PV, reference is usually made to DIN SPEC 91434.`,
    s: ["floating PV", "peatland PV", "car park PV", "agri-PV segment"],
    l: "Agri-PV economics",
  },
  bifazial: {
    b: "Bifacial modules",
    k: "Bifacial solar modules absorb light on the front and rear, so they also use light reflected from the ground.",
    t: "The additional yield compared with monofacial modules is usually in the single-digit percentage range, depending on ground reflection and mounting. Bifacial modules are a prerequisite for vertical agri-PV plants with an east-west orientation: they produce peaks in the morning and afternoon, when power is often worth more than at midday.",
    s: ["bifaciality", "glass-glass modules", "vertical agri-PV"],
    l: "Agri-PV calculator",
  },
  buergerenergiegemeinschaft: {
    b: "Citizens' energy community (Bürgerenergiegemeinschaft, BEG, Austria)",
    k: "In Austria, the citizens' energy community is a community that may generate, store and share electricity among its members – including from non-renewable sources – and is not limited to a local grid area.",
    t: "Unlike the renewable energy community, a BEG can operate across several grid areas throughout Austria, but in return it does not receive reduced network charges. Natural and legal persons can take part; large companies may not control the community. According to the current status, a participant can be a member of several communities at the same time. The BEG must be distinguished from the German term “Bürgerenergiegesellschaft” (citizens' energy company) in the EEG.",
    s: ["BEG", "energy community Austria", "citizen energy community"],
    l: "Energy communities",
  },

  // ---------------------------------------------------------------- C
  "capture-rate": {
    b: "Capture rate",
    k: "The capture rate is the ratio between the generation-weighted average price that a technology achieves on the power market and the average baseload power price.",
    t: "Because many solar plants feed in at the same time, prices fall in sunny hours – solar power therefore earns less than the average, and the capture rate is well below 100%. It is a key assumption for PPA prices and merchant revenues after the end of subsidies. Storage as well as east-west or vertical plants can improve the value.",
    s: ["capture price", "cannibalisation effect", "solar value factor"],
    l: "Power market live",
  },
  cod: {
    b: "Commercial operation date (COD)",
    k: "The commercial operation date is the day on which a plant fully enters commercial operation and is handed over from the contractor to the operator.",
    t: `The COD usually marks the start of remuneration or PPA periods, warranty periods and operational management. For investors it marks the switch from construction risk to operating risk; operating plants are no longer valued on the basis of a development premium but on their income value – for orientation around ${spanne(phase("cod"))}.`,
    s: ["commissioning", "commercial commissioning", "operating plant"],
    l: "Value a project",
  },

  // ---------------------------------------------------------------- D
  datenraum: {
    b: "Data room",
    k: "A data room is a secure digital repository in which a seller provides prospective buyers with all documents relevant to reviewing a project in a structured way.",
    t: "Typical contents are lease and use agreements, land register extracts, planning and permit documents, the grid connection commitment, expert reports and yield forecasts. Access is logged and is usually granted only after a confidentiality agreement has been signed. A complete data room speeds up due diligence considerably.",
    s: ["virtual data room", "VDR"],
    l: "To the project exchange",
  },
  dscr: {
    b: "Debt service coverage ratio (DSCR)",
    k: "The DSCR is the ratio of the cash flow available for debt service to interest and repayment in a period, and it is the key metric in project finance.",
    t: `Banks size the debt of solar parks so that, on the basis of a cautious yield forecast (often P90), the DSCR does not fall below a minimum value – often in the range of about 1.1 to 1.3. This determines the possible debt ratio, which the ÖkoInvest calculators simplify to ${pct(FINANZIERUNG.fremdkapitalQuote)}. Secured revenues via the EEG or a PPA usually allow lower minimum values than pure market prices.`,
    s: ["debt service cover ratio", "coverage ratio"],
    l: "Solar park returns",
  },
  degradation: {
    b: "Degradation",
    k: "Degradation is the gradual decline in the output of solar modules over their service life.",
    t: `Modern crystalline modules usually lose less than 0.5% of their output per year; the ÖkoInvest calculators assume ${fmt(FREIFLAECHE.degradation * 100, 1)}% per year. Manufacturers usually guarantee a residual output of around 80 to 90% after 25 to 30 years. Degradation feeds into yield forecasts, financing models and valuations.`,
    s: ["performance loss", "module degradation"],
    l: "Solar park calculator",
  },
  dienstbarkeit: {
    b: "Easement (beschränkte persönliche Dienstbarkeit)",
    k: "The limited personal easement is a right entered in the land register that secures the plant operator's use of someone else's land for the construction, operation and cables of a solar park as a right in rem.",
    t: "It protects the operator and the financing bank from the lease agreement coming to nothing, for example if the land is sold or auctioned in a foreclosure, and is therefore usually mandatory for financing. Easements are common for the plant area and for cable routes across neighbouring land, often supplemented by a step-in right for the bank. Comparable instruments are used in Austria and Switzerland (Dienstbarkeit and Servitut respectively).",
    s: ["servitude", "right of way", "land register", "cable easement"],
    l: "Solar park lease agreement",
  },
  "din-spec-91434": {
    b: "DIN SPEC 91434",
    k: "DIN SPEC 91434 sets out the requirements for agri-PV plants so that agricultural use remains the main use of the land despite the solar installation.",
    t: `It distinguishes category I (elevated, farming under the modules) and category II (close to the ground, farming between the module rows). Land lost to structures may not exceed ${pct(AGRI.flaechenverlustMaxKat1)} (cat. I) or ${pct(AGRI.flaechenverlustMaxKat2)} (cat. II), and the agricultural yield must reach at least ${pct(AGRI.mindestErtrag)} of the reference yield. An agricultural use concept is also required; for livestock farming, DIN SPEC 91492 supplements the requirements.`,
    s: ["agri-PV standard", "category I", "category II"],
    l: "DIN SPEC 91434 in detail",
  },
  direktvermarktung: {
    b: "Direct marketing (Direktvermarktung)",
    k: "In direct marketing, a plant operator sells its power via a direct marketer on the power exchange or to buyers, instead of leaving it to the network operator in return for a fixed feed-in tariff.",
    t: "In Germany it is mandatory for new plants from 100 kW; support is then paid as a market premium on top of the market revenue. The direct marketer takes care of forecasting, the balancing group and trading for a fee and must be able to control the plant remotely. Unsubsidised plants with a PPA are also usually handled via a direct marketer.",
    s: ["direct marketer", "subsidised direct marketing", "route to market"],
    l: "Virtual power plant",
  },
  "due-diligence": {
    b: "Due diligence",
    k: "Due diligence is the careful review of a project or a project company by the buyer before a purchase agreement is signed.",
    t: "For solar and storage projects it covers legal aspects (land security, easements, building rights), technical aspects (grid connection, yield report, plant design), commercial aspects (tariff, PPA, costs) and tax aspects. Its results feed into the purchase price, warranties and conditions of the purchase agreement. A well-prepared data room shortens it considerably.",
    s: ["DD", "legal due diligence", "technical due diligence"],
    l: "Due diligence for project rights",
  },

  // ---------------------------------------------------------------- E
  eag: {
    b: "EAG (Renewable Energy Expansion Act, Austria)",
    k: "The Renewable Energy Expansion Act (Erneuerbaren-Ausbau-Gesetz) is Austria's central law on supporting green electricity through market premiums and investment grants and on regulating energy communities.",
    t: "Under the EAG, photovoltaics is usually supported through investment grants; larger plants can apply for a market premium in tenders, which is paid as a sliding premium on top of the market price. According to the current status, the law provides for deductions for ground-mounted plants on agricultural land unless an exception such as agri-PV applies. Support is administered by the EAG funding settlement agency (OeMAG).",
    s: ["Renewable Energy Expansion Act", "OeMAG", "investment grant Austria"],
    l: "Ground-mounted PV in Austria",
  },
  "eeg-gemeinschaft": {
    b: "Renewable energy community (Erneuerbare-Energie-Gemeinschaft, EEG, Austria)",
    k: "In Austria, a renewable energy community is an association of at least two participants who jointly generate electricity from renewable sources and use it among themselves via the public grid.",
    t: "A distinction is made between local communities (low-voltage area of a transformer) and regional communities (medium voltage up to the substation); both receive reduced network charges for the electricity used jointly, local ones more than regional ones. The community needs a legal form, such as an association or a cooperative, and may not be primarily profit-oriented. Not to be confused with the German Renewable Energy Sources Act (also abbreviated EEG).",
    s: ["renewable energy community", "REC", "energy community Austria", "local REC", "regional REC"],
    l: "Energy communities compared",
  },
  "eeg-2023": {
    b: "EEG 2023 (Renewable Energy Sources Act, Germany)",
    k: "The Renewable Energy Sources Act (Erneuerbare-Energien-Gesetz) in its 2023 version governs support, tenders and grid feed-in of electricity from renewable energies in Germany.",
    t: "Particularly relevant for ground-mounted PV are the eligible area (Section 37), the tenders of the first segment, direct marketing with a market premium, municipal participation (Section 6) and the rules for negative prices (Section 51). The law states that renewable energies are in the overriding public interest (Section 2), which carries weight in balancing decisions. Since 2023 it has been amended several times, including by Solar Package I (2024) and the Solar Peak Act (Solarspitzengesetz, 2025).",
    s: ["Renewable Energy Sources Act", "Solar Package I", "German renewables law"],
    l: "EEG tenders",
  },
  einmalverguetung: {
    b: "One-off remuneration (Einmalvergütung, Switzerland)",
    k: "In Switzerland, the one-off remuneration is a one-time federal investment contribution to new photovoltaic plants, administered by Pronovo.",
    t: "It usually covers part of the investment costs of a reference plant; for plants without self-consumption there is a higher one-off remuneration, and for large plants the amount is set by auction. For large alpine plants under the Solarexpress, contributions of up to 60% of the investment costs are possible – but only for projects whose building application was publicly displayed by the end of 2025. In addition, plants from 150 kW without self-consumption can receive the sliding market premium, which is awarded by auction and fixed for 20 years; power fed into the grid is also purchased by the network operator at the feed-in remuneration (Rückliefervergütung).",
    s: ["EIV", "KLEIV", "GREIV", "HEIV", "Pronovo", "one-off payment"],
    l: "Ground-mounted PV in Switzerland",
  },
  energiegenossenschaft: {
    b: "Energy cooperative (Energiegenossenschaft)",
    k: "An energy cooperative is a registered cooperative through which citizens, farmers, businesses or municipalities jointly invest in plants that generate renewable energy.",
    t: "Each member acquires shares and usually has one vote at the general meeting regardless of the size of the contribution; profits are distributed as dividends. The legal form is widespread in Germany, Austria and Switzerland and is supervised by auditing associations. In agri-PV, a cooperative can, for example, involve the farmer on whose land the plant stands in its operation; in Austria it is also often used as the legal form of a renewable energy community.",
    s: ["community energy", "citizen participation", "cooperative", "eG"],
    l: "To the cooperative",
  },
  "energy-sharing": {
    b: "Energy sharing (Section 42c EnWG)",
    k: "In Germany, energy sharing is the joint use of electricity from renewable plants by several final consumers via the public grid under Section 42c of the Energy Industry Act (EnWG).",
    t: "According to the current status, sharing has been possible since June 2026 within the grid area of a distribution system operator, and from 2028 also in directly adjacent grid areas. Participants need smart metering systems; they continue to buy their remaining electricity from a supplier. Unlike in Austria, reduced network charges are not yet provided for; the advantage comes mainly from the electricity price within the community.",
    s: ["joint use", "energy community Germany", "peer-to-peer sharing"],
    l: "Energy sharing explained",
  },
  epc: {
    b: "EPC (engineering, procurement, construction)",
    k: "An EPC contract is a general contractor agreement under which a contractor takes over the design, procurement and construction of a plant on a turnkey basis at a fixed price and by a fixed date.",
    t: `For investors and banks, the EPC contract bundles construction and interface risks with one contractual partner, secured through warranties, contractual penalties and guarantees. According to current market observations, EPC costs of a ground-mounted plant are around €${fmt(FREIFLAECHE.capexProKwp.min)} to €${fmt(FREIFLAECHE.capexProKwp.max)}/kWp, excluding the grid connection. Acceptance is usually followed by an O&M contract.`,
    s: ["general contractor", "turnkey construction", "EPC contract"],
    l: "Calculate a solar park",
  },

  // ---------------------------------------------------------------- F
  flaechenkulisse: {
    b: "Eligible area (Flächenkulisse, Section 37 EEG)",
    k: "Section 37 EEG defines the eligible area: the land on which ground-mounted plants can take part in the tenders and receive a market premium.",
    t: "It includes, among others, already sealed land, conversion sites, strips of up to 500 m along motorways and railways, arable land and grassland in less-favoured areas, and land for special solar installations such as agri-PV, peatland or car park PV. Nature reserves and national parks are excluded. The eligible area does not apply to unsubsidised plants with a PPA, but building rights must still be created.",
    s: ["EEG eligible land", "eligible sites", "conversion site"],
    l: "Start the land check",
  },
  flaechennutzungsplan: {
    b: "Land-use plan (Flächennutzungsplan, FNP)",
    k: "The land-use plan is the preparatory land-use plan that outlines the intended type of land use for the entire municipal area.",
    t: "Development plans must be derived from the land-use plan; if a plot is shown there as agricultural land, the plan usually has to be amended for a solar park – mostly in a procedure parallel to the development plan. In some cases the amendment requires approval by the higher administrative authority. Some municipalities steer solar parks in advance through a site concept.",
    s: ["FNP", "preparatory land-use plan", "parallel procedure"],
    l: "For municipalities",
  },
  flaechenpacht: {
    b: "Land lease (solar park)",
    k: "The land lease is the payment that the operator of a solar park makes to the landowner for the use of their land over the entire operating period.",
    t: `According to the current status, around €${fmt(PACHT.freiflaecheProHa.min)} to €${fmt(PACHT.freiflaecheProHa.max)} per hectare and year is common in Germany for ground-mounted PV, usually less for agri-PV because farming continues; alternatively, a revenue share of ${pct(PACHT.umsatzbeteiligung.min)} to ${pct(PACHT.umsatzbeteiligung.max)} of power revenues is agreed. Lease agreements usually run for around ${PACHT.laufzeit} years with extension options and are secured by an easement in the land register. For comparison: arable land in Germany is leased for around €${fmt(PACHT.ackerProHa)} per hectare on average.`,
    s: ["solar lease", "lease per hectare", "solar park lease agreement", "land rent"],
    l: "Calculate the lease",
  },
  "fruehzeitige-beteiligung": {
    b: "Early participation (frühzeitige Beteiligung)",
    k: "Early participation is the step in the land-use planning procedure in which the public and authorities are first informed about the planning and can comment (Section 3(1) and Section 4(1) of the Federal Building Code, BauGB).",
    t: "It usually takes place shortly after the decision to draw up the plan, on the basis of a preliminary draft, and serves to identify concerns early – for example about nature conservation, glare or the landscape. The authorities also comment on the scope and level of detail of the environmental assessment. Early participation is followed by formal participation with public display of the draft.",
    s: ["public participation", "scoping", "consultation of authorities"],
    l: "Development plan procedure step by step",
  },

  // ---------------------------------------------------------------- G
  "gap-direktzahlungen": {
    b: "CAP direct payments (GAP-Direktzahlungen)",
    k: "CAP direct payments are area-based payments from the EU Common Agricultural Policy that farmers receive for eligible agricultural land.",
    t: `On conventional ground-mounted solar parks, eligibility is usually lost. For agri-PV under DIN SPEC 91434, according to the current status ${pct(AGRI.gapFoerderfaehig)} of the area remains eligible in Germany, provided agricultural use is not significantly restricted. Austria and Switzerland have their own rules, which need to be clarified with the agricultural authority on a case-by-case basis.`,
    s: ["direct payments", "basic income support", "CAP", "Common Agricultural Policy", "farm subsidy"],
    l: "Agri-PV and CAP support",
  },
  gebotstermin: {
    b: "Bidding date (Gebotstermin)",
    k: "The bidding date is the deadline by which bids in an EEG tender must have reached the Bundesnetzagentur.",
    t: "For ground-mounted plants of the first segment there are, according to the current status, three bidding dates a year: 1 March, 1 July and 1 December. The Bundesnetzagentur publishes the volume and maximum value in advance and the results a few weeks after the date. By the bidding date, the documents must be complete and the security deposited.",
    s: ["tender date", "bid deadline", "maximum value", "ceiling price"],
    l: "Bidding dates and procedure",
  },
  grossspeicher: {
    b: "Utility-scale storage (battery energy storage system)",
    k: "A utility-scale battery is a grid-connected battery storage system in the megawatt range that stores electricity temporarily and earns revenues on the power and balancing markets.",
    t: "Utility-scale batteries are operated as standalone plants, for example at a substation, or together with a solar park (co-location). Their revenues come from arbitrage, balancing power and increasingly from grid services; they depend heavily on the market and are often secured through an optimiser or long-term tolling agreements. The grid connection and, where applicable, a construction cost contribution are the critical development steps.",
    s: ["BESS", "battery storage", "standalone storage", "co-location", "grid-scale battery"],
    l: "Developing utility-scale storage",
  },
  "gruenland-photovoltaik": {
    b: "Grünland-Photovoltaik (zoning designation, Austria)",
    k: "In Austria, Grünland-Photovoltaik is a zoning designation (Widmung) within green land that makes ground-mounted PV plants above a size set by state law permissible under spatial planning law.",
    t: "Spatial planning is a matter for the federal states, so each state sets its own thresholds, criteria and procedures; some states also steer sites through zoning or criteria catalogues. The designation is made by the municipality in its zoning plan (Flächenwidmungsplan) and usually requires approval by the state as the supervisory authority. Permits under nature conservation and electricity law may also be required.",
    s: ["zoning designation PV", "Widmung", "land zoning Austria", "special PV zoning"],
    l: "Zoning in Austria",
  },

  // ---------------------------------------------------------------- H
  herkunftsnachweis: {
    b: "Guarantee of origin (Herkunftsnachweis, HKN)",
    k: "A guarantee of origin is an electronic certificate that proves that a certain quantity of electricity was generated from renewable sources and is used for electricity disclosure.",
    t: "In Germany, the Federal Environment Agency (Umweltbundesamt) maintains the register of guarantees of origin; for electricity that receives an EEG market premium, guarantees of origin are usually not issued because of the ban on double marketing. Unsubsidised plants, for example with a PPA, can generate guarantees of origin and pass them on to buyers together with the electricity. In Austria, E-Control issues them, in Switzerland Pronovo.",
    s: ["GoO", "guarantee of origin", "green power certificate", "REC"],
    l: "PPAs for businesses",
  },

  // ---------------------------------------------------------------- I
  irr: {
    b: "Internal rate of return (IRR)",
    k: "The internal rate of return is the discount rate at which the net present value of all payments of an investment is exactly zero – it indicates the average annual return on the capital employed.",
    t: "For solar parks, a distinction is made between project IRR (before financing) and equity IRR (after interest and repayment, usually higher due to leverage). The IRR depends heavily on the purchase price, revenue assumptions, operating costs and term and should always be considered together with the net present value and several scenarios. The ÖkoInvest calculators show it as an indicative value.",
    s: ["IRR", "return on equity", "project return", "equity IRR"],
    l: "Calculate returns",
  },

  // ---------------------------------------------------------------- K
  kapitalwert: {
    b: "Net present value (NPV, Kapitalwert)",
    k: "The net present value is the sum of all cash inflows and outflows of an investment discounted to today.",
    t: `A positive net present value means that the investment earns more than the required minimum return; the ÖkoInvest calculators simplify this with a discount rate of ${pct(FINANZIERUNG.diskont, 1)}. When valuing project rights, the net present value shows which purchase price is still viable for a given return expectation.`,
    s: ["NPV", "net present value", "present value", "discounted cash flow"],
    l: "Project valuation",
  },
  kommunalbeteiligung: {
    b: "Municipal participation (Section 6 EEG)",
    k: `Municipal participation under Section 6 EEG allows operators of ground-mounted plants to pay the host municipality, on a voluntary basis, up to ${fmt(KOMMUNE.beteiligungCt, 1)} ct per kilowatt-hour actually fed into the grid.`,
    t: `The agreement must be in written or electronic form and may be concluded before the permit – if a development plan is drawn up for the land, but not before the decision to adopt it (Section 6(4) EEG). For EEG-supported electricity volumes, the operator can have the payment reimbursed by the network operator; under federal law the money is not earmarked for the municipality. Several federal states, including Brandenburg, Mecklenburg-Western Pomerania, Lower Saxony, Saarland, Saxony and Saxony-Anhalt, have their own participation laws with mandatory payments. In addition, there is trade tax (Gewerbesteuer), ${pct(KOMMUNE.gewerbesteuerStandort)} of which goes to the host municipality for solar plants.`,
    s: ["community benefit payment", "municipal levy", "acceptance payment"],
    l: "Municipal calculator",
  },

  // ---------------------------------------------------------------- L
  "landwirtschaftliches-vermoegen": {
    b: "Agricultural and forestry assets (solar lease and tax)",
    k: "Agricultural and forestry assets are an asset class under German valuation law that is usually valued much lower than real property for inheritance, gift and property tax – for leased PV land, the classification is therefore economically significant.",
    t: "In Germany, the tax authorities usually classify land leased to conventional solar parks as real property (Grundvermögen), so it is valued much higher; the lease can also jeopardise inheritance tax reliefs. The Annual Tax Act 2024 did add to Section 158(2) of the Valuation Act (BewG), but according to its wording it only covers making land available for producing plants and animals – according to the current status (09/2026) it contains no special rule for conventional ground-mounted PV. Agri-PV with continued agricultural use is treated more favourably; have your situation reviewed by a tax adviser before signing a contract.",
    s: ["inheritance tax solar park", "property tax PV land", "Annual Tax Act 2024", "Valuation Act"],
    l: "Lease, inheritance and property tax",
  },
  lcoe: {
    b: "LCOE (levelised cost of electricity)",
    k: "The levelised cost of electricity indicates what one kilowatt-hour costs on average over the entire life of a plant when all investment, operating and capital costs are spread over the energy generated.",
    t: "In Central Europe, large ground-mounted plants are among the cheapest new sources of electricity; according to Fraunhofer ISE, their LCOE are in the mid single-digit cent range per kilowatt-hour, depending on location and costs. Agri-PV and solar carports are higher because of their more complex substructure. Comparing the LCOE with the expected revenues from an award, a PPA or the market value is a first economic test.",
    s: ["levelised cost of energy", "generation costs", "cost of electricity"],
    l: "Solar park calculator",
  },
  loi: {
    b: "Letter of intent (LOI)",
    k: "The letter of intent is a declaration of intent in which buyer and seller record the key points of a planned transaction before the purchase agreement is negotiated.",
    t: "It typically contains the purchase price or price mechanism, a timetable, the scope of due diligence and often a time-limited exclusivity. Apart from individual clauses such as confidentiality and exclusivity, it is usually not legally binding. Similar documents are called a term sheet or an indicative offer.",
    s: ["LOI", "memorandum of understanding", "term sheet", "indicative offer"],
    l: "Projects on the exchange",
  },
  leg: {
    b: "Local electricity community (Lokale Elektrizitätsgemeinschaft, LEG, Switzerland)",
    k: "Since 1 January 2026, the local electricity community in Switzerland has allowed producers and consumers within a municipality to sell locally generated electricity to each other via the distribution grid.",
    t: "Unlike a ZEV, the public grid is used; according to the current status, a reduced grid usage charge applies to the electricity consumed within the community. Requirements include that all participants are located in the area of the same network operator and the same municipality and that the production capacity is sufficiently large in relation to consumption. The LEG is part of the so-called Mantelerlass (omnibus act) on the Electricity Act.",
    s: ["LEG", "electricity community", "Mantelerlass", "local energy community Switzerland"],
    l: "Energy communities DACH",
  },

  // ---------------------------------------------------------------- M
  marktpraemie: {
    b: "Market premium (Marktprämie)",
    k: "The market premium is the support that a directly marketing plant operator receives on top of its market revenue to close the gap between the market value and the reference value.",
    t: "In Germany it is calculated as a sliding market premium: reference value minus solar market value, never negative; if the market value is higher, it is not paid for that period. Austria also pays a sliding market premium under the EAG, whose level for photovoltaics is usually set through tenders. Under current law, it is not paid for new plants during periods of negative prices.",
    s: ["sliding market premium", "market premium model", "contract for difference"],
    l: "Support via tenders",
  },
  marktstammdatenregister: {
    b: "Core energy market data register (Marktstammdatenregister, MaStR)",
    k: "The Marktstammdatenregister is the official register of the Bundesnetzagentur in which all electricity and gas generation plants and storage systems in Germany are recorded with their master data.",
    t: "Operators usually have to register their plant within one month of commissioning; without registration, payment claims under the EEG may lapse or be reduced. The register, which is largely open to the public, is also an important data source for market analyses, for example on additions in a region.",
    s: ["MaStR", "plant register", "market master data register"],
    l: "Buying and selling operating PV plants",
  },
  "marktwert-solar": {
    b: "Solar market value (Marktwert Solar)",
    k: "The solar market value is the average exchange electricity price of a month or year, weighted by solar feed-in, as published by the transmission system operators.",
    t: `It serves as the reference for calculating the market premium and shows what solar power is actually worth on the market. Because many plants feed in at the same time, it is usually below the average price (capture rate). For revenues without support after it ends, the ÖkoInvest calculators cautiously assume around ${fmt(ERLOESE.merchantCt, 1)} ct/kWh.`,
    s: ["monthly market value", "annual market value", "merchant revenue", "solar capture price"],
    l: "Power prices live",
  },

  // ---------------------------------------------------------------- N
  nda: {
    b: "NDA (non-disclosure agreement)",
    k: "A non-disclosure agreement obliges the recipient to use confidential project information only for the agreed purpose and not to pass it on to third parties.",
    t: "In project sales, it is usually a prerequisite for prospective buyers to see the location, contracts and data room – among other things, this prevents landowners or network operators from being approached behind the seller's back. In the ÖkoInvest project exchange, project details are released after login and NDA; this is free of charge for investors.",
    s: ["non-disclosure agreement", "confidentiality agreement", "CA"],
    l: "Project exchange",
  },
  "negative-strompreise": {
    b: "Negative electricity prices",
    k: "Negative electricity prices occur when supply on the power exchange exceeds demand so much that generators pay to have their electricity taken.",
    t: "They occur mainly around midday on sunny days with low consumption and have increased significantly with the expansion of solar. Under Section 51 EEG, plants commissioned since the Solar Peak Act (2025) receive no market premium for periods with negative prices; according to the current status, the lost periods are added at the end of the support period. Storage, east-west orientation and flexible curtailment reduce the risk.",
    s: ["Section 51 EEG", "solar peaks", "negative prices", "Solar Peak Act"],
    l: "Energy live",
  },
  netzanschlusszusage: {
    b: "Grid connection commitment (Netzanschlusszusage)",
    k: "The grid connection commitment is the network operator's binding confirmation that a plant with a certain capacity can be connected at a specified grid connection point.",
    t: `Because grid capacity is scarce in many regions, it is regarded as one of the most valuable milestones in project development; projects with a grid commitment trade, for orientation, at around ${spanne(phase("netz"))}, pure land-securing at ${spanne(phase("flaeche"))}. Commitments are often time-limited and tied to reservation fees or proof of progress. In Austria and Switzerland, the distribution system operator's connection confirmation is the equivalent.`,
    s: ["grid offer", "connection offer", "grid reservation", "grid enquiry"],
    l: "Project value by phase",
  },
  netzverknuepfungspunkt: {
    b: "Grid connection point (Netzverknüpfungspunkt, NVP)",
    k: "The grid connection point is the point in the public grid at which a generation or storage plant is technically connected to the grid.",
    t: `Under the EEG, the connection point that is most economical overall, as named by the network operator, must in principle be chosen. Distance and voltage level largely determine the costs: in the ÖkoInvest calculators, a medium-voltage cable route costs around €${fmt(FREIFLAECHE.kabelProMeter)} per metre; larger parks are often connected to the high-voltage grid via their own substation.`,
    s: ["point of connection", "POC", "feed-in point", "interconnection point"],
    l: "Include the grid connection",
  },

  // ---------------------------------------------------------------- O
  "o-und-m": {
    b: "O&M (operations & maintenance)",
    k: "O&M means the technical and commercial management as well as the servicing and maintenance of an energy plant after commissioning.",
    t: `This includes remote monitoring, fault clearance, inspections, vegetation management, security services and reporting. O&M contracts usually include availability or performance guarantees with bonus-malus rules. In the ÖkoInvest calculators, ongoing operating costs excluding the lease are set at around €${fmt(FREIFLAECHE.opexProKwp)}/kWp per year.`,
    s: ["operations and maintenance", "asset management", "servicing", "operational management"],
    l: "For investors",
  },

  // ---------------------------------------------------------------- P
  "p50-p90": {
    b: "P50 / P90",
    k: "P50 and P90 are yield values from a yield forecast that are reached or exceeded with a probability of 50% and 90% respectively.",
    t: "P50 is the expected mean value and the basis for valuations and return expectations; P90 is a cautious value on which banks size financing and the DSCR. The gap between the two depends on the uncertainty of the irradiation data, the modelling and year-to-year variation. Independent yield reports are standard in transactions.",
    s: ["yield report", "energy yield assessment", "P75", "P99", "yield forecast"],
    l: "Returns and risks",
  },
  "parkplatz-solarpflicht": {
    b: "Car park solar obligation (Parkplatz-Solarpflicht)",
    k: "In several German federal states, the car park solar obligation requires developers to install photovoltaics when building or fundamentally renovating larger open car parks.",
    t: "Thresholds, for example from a certain number of parking spaces, exemptions and deadlines are regulated differently by each state; pioneers include Baden-Württemberg and North Rhine-Westphalia. The obligation is usually fulfilled with solar carports. Even without an obligation, car parks can be economically attractive, for example with charging infrastructure and self-consumption.",
    s: ["solar mandate car park", "solar carport obligation", "solar carport"],
    l: "Solar obligation by federal state",
  },
  "performance-ratio": {
    b: "Performance ratio (PR)",
    k: "The performance ratio is the ratio between the energy actually generated and the theoretically possible yield for a given irradiation, and so describes the quality of a PV plant largely independently of its location.",
    t: "Modern ground-mounted plants usually achieve a performance ratio of about 80 to 90%; losses arise from temperature, soiling, cables, inverters and outages. It is a typical metric in O&M contracts and in technical due diligence.",
    s: ["PR", "system efficiency", "quality factor"],
    l: "Calculate yield",
  },
  ppa: {
    b: "Power purchase agreement (PPA)",
    k: "A PPA is a long-term electricity supply contract in which a generator sells its electricity directly to a buyer or trader at an agreed price.",
    t: `In a physical PPA, electricity is actually delivered; in a financial (virtual) PPA, only price differences are settled. For solar parks, PPAs enable financing without EEG support; companies secure predictable prices and green electricity with guarantees of origin. Solar PPAs in Germany were recently around ${fmt(ERLOESE.ppaCt.min, 1)} to ${fmt(ERLOESE.ppaCt.max, 1)} ct/kWh (pay-as-produced, term of around 10 years).`,
    s: ["corporate PPA", "solar PPA", "offtake agreement", "virtual PPA"],
    l: "PPAs for businesses",
  },
  "privilegierung-aussenbereich": {
    b: "Privileged status in the outer zone (Section 35 BauGB)",
    k: "Privileged projects under Section 35(1) of the Federal Building Code (BauGB) are permissible in the outer zone (Außenbereich) without a development plan, provided public interests do not conflict and access and utilities are secured.",
    t: `According to the current status, this applies to solar plants in two cases: on a 200-metre strip along motorways and railways of the main network with at least two main tracks (no. 8 b), and for agri-PV up to ${fmt(AGRI.privilegierungHa, 1)} ha of ground area in a spatial and functional connection with a farm (no. 9, one plant per farmstead). In these cases a building permit is sufficient, which can shorten development considerably. Separate land rules apply to EEG support.`,
    s: ["Section 35 BauGB", "outer zone privilege", "200 m corridor"],
    l: "Permit routes",
  },
  projektrechte: {
    b: "Project rights (Projektrechte)",
    k: "Project rights are all the contractual and public-law positions that make an energy project feasible – above all land security, grid connection commitment, building rights and expert reports.",
    t: `They are usually bundled in a project company and traded in different development phases; the price rises as the risk falls, for orientation from around ${spanne(phase("flaeche"))} with secured land to ${spanne(phase("rtb"))} when ready to build (highly case-dependent). In the ÖkoInvest project exchange, sellers pay a commission of ${provisionTextEn(PROVISION.verkaeufer.text)}.`,
    s: ["development rights", "development premium", "pipeline", "project company", "SPV"],
    l: "Project exchange",
  },

  // ---------------------------------------------------------------- R
  randstreifen: {
    b: "Corridor strips (Randstreifen, motorway and railway)",
    k: "Under the EEG, corridor strips are areas up to 500 metres along motorways and railways on which ground-mounted plants can receive support.",
    t: "According to the current status, the distance is measured from the outer edge of the carriageway or track; a narrow corridor directly next to the route usually has to be kept clear. Corridor strips are part of the eligible area under Section 37 EEG and, for plants not subject to tendering, under Section 48 EEG. This must be distinguished from the privileged status under building law on a 200 m strip under Section 35 BauGB.",
    s: ["500 m corridor", "motorway strip", "railway corridor", "Section 48 EEG"],
    l: "Is your land in the corridor?",
  },
  rtb: {
    b: "Ready-to-build (RTB)",
    k: "Ready-to-build describes a project that meets all the requirements for starting construction – secured land, building rights, grid connection commitment and usually a remuneration or marketing perspective.",
    t: `RTB is the classic handover point between project developer and investor or operator, because the development risks have then largely been eliminated. For orientation, ready-to-build ground-mounted projects in the DACH region trade at a development premium of around ${spanne(phase("rtb"))}. It usually takes several years from securing the land to ready-to-build status.`,
    s: ["RTB", "ready to build", "shovel-ready project"],
    l: "Value an RTB project",
  },
  redispatch: {
    b: "Redispatch 2.0",
    k: "Redispatch 2.0 is the procedure by which network operators in Germany have, since October 2021, adjusted generation plants from 100 kW upwards or downwards on a planned basis to avoid grid congestion.",
    t: "Plant operators or their dispatch managers must provide master and planning data and make the plant controllable. Curtailed energy is usually compensated financially, but according to set procedures that do not reflect every loss of revenue exactly. Frequent curtailment is a site risk that is considered in due diligence.",
    s: ["redispatch", "feed-in management", "curtailment", "congestion management"],
    l: "Control in the virtual power plant",
  },
  regelenergie: {
    b: "Balancing power (Regelenergie)",
    k: "Balancing power is capacity that can be called up at short notice, with which transmission system operators offset deviations between generation and consumption and keep the grid frequency stable.",
    t: "A distinction is made between frequency containment reserve (FCR), automatic frequency restoration reserve (aFRR) and manual frequency restoration reserve (mFRR), which are procured through auctions. Utility-scale batteries are particularly well suited because of their fast response; however, prices have fallen as more storage has been added and fluctuate strongly. Smaller plants usually take part pooled via a virtual power plant.",
    s: ["FCR", "aFRR", "mFRR", "ancillary services", "frequency response", "balancing energy"],
    l: "Storage revenues",
  },
  reststrom: {
    b: "Residual power (residual power pool)",
    k: "Residual power is the electricity demand that a company still has to draw from the grid and buy despite its own photovoltaics and storage.",
    t: `At ÖkoInvest, the residual power of medium-sized companies is pooled in the residual power pool and procured via the virtual power plant in order to achieve better terms. Only the procurement component can be influenced; network charges, levies and electricity tax (standard rate ${fmt(STROMSTEUER_REGEL, 2)} ct/kWh) remain.`,
    s: ["residual demand", "residual supply", "power pooling", "residual power pool"],
    l: "Residual power pool",
  },
  rueckbauverpflichtung: {
    b: "Decommissioning obligation (Rückbauverpflichtung)",
    k: "The decommissioning obligation is the operator's duty to remove a plant completely after use has permanently ceased and to restore the land to its original condition.",
    t: `For privileged projects it is prescribed in Section 35(5) BauGB; for development plan projects it is usually regulated in the urban development contract and the lease agreement. It is commonly secured by a bank guarantee or a reserve; the ÖkoInvest calculators budget around €${fmt(FREIFLAECHE.rueckbauProKwp)}/kWp for this. For landowners, this security is a key point to check in the lease agreement.`,
    s: ["decommissioning bond", "decommissioning security", "dismantling obligation"],
    l: "What belongs in the lease agreement",
  },

  // ---------------------------------------------------------------- S
  satzungsbeschluss: {
    b: "Adoption as a bylaw (Satzungsbeschluss)",
    k: "The Satzungsbeschluss is the municipal council's final decision by which a development plan is adopted as a bylaw.",
    t: `With the subsequent public announcement, the development plan enters into force and building rights arise; this is followed by the building permit or the procedure provided for under state law. For the valuation of project rights, it is a key value driver – projects with building rights trade, for orientation, at around ${spanne(phase("satzung"))}.`,
    s: ["building rights", "plan adoption", "development plan in force"],
    l: "From field to building rights",
  },
  "share-deal": {
    b: "Share deal",
    k: "In a share deal, the investor acquires the shares in the project company that holds all the contracts, rights and permits of the project.",
    t: "Contracts, the grid connection commitment and permits remain in the company and do not have to be transferred individually, which simplifies the transaction. In return, the buyer also takes over unknown liabilities, which is why due diligence and warranties in the purchase agreement are particularly important. In project development, the share deal is the usual form of transaction.",
    s: ["share purchase", "SPV sale", "project company"],
    l: "Buying project rights",
  },
  spa: {
    b: "Share purchase agreement (SPA)",
    k: "The share purchase agreement is the purchase contract for company shares in a share deal.",
    t: "It governs the purchase price and its adjustment, conditions precedent, the seller's warranties, liability and indemnities. For projects before ready-to-build status, the purchase price is often paid in instalments linked to milestones such as the adoption of the development plan, the grid connection or the award. The SPA is usually signed after due diligence has been completed.",
    s: ["SPA", "share purchase contract", "purchase agreement"],
    l: "For investors",
  },
  solarcarport: {
    b: "Solar carport",
    k: "A solar carport is a roof over parking spaces whose roof consists of photovoltaic modules, so car parks are also used to generate electricity.",
    t: `Around ${fmt(CARPORT.kwpProStellplatz, 1)} kWp can be installed per parking space; because of the steel structure, foundations and drainage, costs of around €${fmt(CARPORT.capexProKwp.min)} to €${fmt(CARPORT.capexProKwp.max)}/kWp are well above those of a ground-mounted plant. A carport becomes economical mainly through self-consumption on site, charging infrastructure or a PPA with the user of the site. Several federal states have a solar obligation for larger car parks; under the EEG, car park plants count as special solar installations.`,
    s: ["car park PV", "solar canopy", "PV canopy", "parking canopy"],
    l: "Solar carports",
  },
  solarexpress: {
    b: "Solarexpress (Switzerland)",
    k: "The Solarexpress was a Swiss rule limited until 31 December 2025 (Art. 71a Energy Act, EnG) that supported large alpine photovoltaic plants for winter electricity supply with simplified permitting and a one-off remuneration of up to 60% of the investment costs – it is closed to new projects.",
    t: "Plants with an annual production of at least 10 GWh and a high share of winter electricity are supported. Following the relaxation of March 2025, only projects whose building application was publicly displayed by 31 December 2025 benefit; the Solarexpress is closed to new projects. Many projects have been delayed or stopped because of costs, access or local opposition.",
    s: ["alpine solar plants", "winter electricity", "alpine PV"],
    l: "Ground-mounted PV in Switzerland",
  },
  "spezifischer-ertrag": {
    b: "Specific yield",
    k: "The specific yield indicates how many kilowatt-hours a PV plant generates per year for each installed kilowatt of peak capacity (kWh/kWp).",
    t: "In Germany, well-planned ground-mounted plants achieve roughly 950 to 1,150 kWh/kWp depending on the region, similar or slightly higher in Austria and the Swiss Plateau, and considerably more at alpine sites. The value depends on irradiation, orientation, module technology and losses and is the basis of every profitability calculation.",
    s: ["annual yield", "full-load hours", "kWh/kWp"],
    l: "Yield by region",
  },
  stromsteuer: {
    b: "Electricity tax (Stromsteuer)",
    k: `Electricity tax is an excise duty on electricity drawn in Germany; the standard rate is ${fmt(STROMSTEUER_REGEL, 2)} ct/kWh.`,
    t: `Since 2026, according to the current status, it has been reduced to the EU minimum rate of ${fmt(STROM.stromsteuerProduzierend, 2)} ct/kWh for manufacturing companies as well as agriculture and forestry. Electricity from smaller plants that is consumed on site or nearby can be exempt under certain conditions. Companies should clarify which relief applies in their case with the main customs office (Hauptzollamt) or their tax adviser.`,
    s: ["StromStG", "electricity tax relief", "electricity tax exemption", "power tax"],
    l: "Residual power calculator",
  },

  // ---------------------------------------------------------------- T
  tracker: {
    b: "Tracker (tracking system)",
    k: "A tracker is a mounting structure that moves solar modules to follow the position of the sun during the day in order to increase yield.",
    t: "Single-axis trackers with a north-south axis are common in ground-mounted plants; in Central Europe they usually increase yield by about 10 to 20% compared with fixed mounting and spread generation more evenly over the day. This is offset by higher investment and maintenance costs and a larger land requirement. In agri-PV, trackers can also control the shading of crops.",
    s: ["solar tracking", "single-axis tracker", "sun tracking"],
    l: "Ground-mounted PV",
  },

  // ---------------------------------------------------------------- U
  umspannwerk: {
    b: "Substation (Umspannwerk, UW)",
    k: "A substation connects grids of different voltage levels and transforms electricity, for example from medium to high voltage.",
    t: "Larger solar parks and storage systems are often connected to an existing substation or receive their own substation or transfer bay. In many regions, free capacity at the substation is the bottleneck of project development. Increasingly, several projects share a common substation to reduce costs and permitting effort.",
    s: ["UW", "transfer station", "transformer station", "customer substation"],
    l: "Storage at the substation",
  },
  umweltbericht: {
    b: "Environmental report (Umweltbericht)",
    k: "The environmental report is the legally required part of the explanatory statement of a land-use plan that presents the results of the environmental assessment.",
    t: "It describes the condition of soil, water, fauna, flora, landscape and people, assesses the effects of the solar park and sets out avoidance and compensation measures. It is often based on specialist reports such as a species protection assessment or a glare study. It is put on public display together with the draft plan.",
    s: ["environmental assessment", "species protection assessment", "glare study", "strategic environmental assessment"],
    l: "Expert reports in the procedure",
  },
  uvp: {
    b: "Environmental impact assessment (Umweltverträglichkeitsprüfung, UVP)",
    k: "The environmental impact assessment is a formal procedure in which the environmental effects of a major project are comprehensively identified and assessed before it is approved.",
    t: "In Germany, for solar parks it is usually covered by the environmental assessment in the development plan procedure; for large projects in what was previously the outer zone, screening or EIA obligations may apply under the EIA Act (UVPG). In Austria, according to the current status, the EIA Act (UVP-G) has no specific category for ground-mounted PV; the zoning designation (Widmung) and state nature conservation and electricity procedures are decisive. In Switzerland, photovoltaic plants with more than 5 MW of installed capacity that are not attached to buildings require an EIA (Annex no. 21.9 EIA Ordinance, UVPV); the canton determines the procedure.",
    s: ["EIA", "UVPG", "UVP-G", "screening"],
    l: "Permitting ground-mounted PV",
  },

  // ---------------------------------------------------------------- V
  "virtuelles-kraftwerk": {
    b: "Virtual power plant",
    k: "A virtual power plant is a digital network of many decentralised generation plants, storage systems and flexible consumers that are controlled centrally and marketed together on the power market.",
    t: "Pooling allows smaller plants to take part in exchange trading and balancing markets, forecasting errors offset each other, and flexibility can be shifted specifically into expensive or cheap quarter-hours. ÖkoInvest uses a virtual power plant to procure the residual power of companies in the residual power pool on a pooled basis.",
    s: ["VPP", "aggregator", "virtuelles Kraftwerk"],
    l: "Virtual power plant explained",
  },

  // ---------------------------------------------------------------- Z
  zev: {
    b: "Self-consumption association (Zusammenschluss zum Eigenverbrauch, ZEV / vZEV, Switzerland)",
    k: "In Switzerland, a ZEV is an association of several end consumers who jointly use the solar power of a plant on or at their property and appear to the network operator as a single customer.",
    t: "The ZEV organises metering and billing internally and needs its own metering infrastructure behind the grid connection for this purpose. With the virtual ZEV (vZEV), possible since 2025, the network operator's metering infrastructure can, according to the current status, be used; however, participants must still be connected via their connection lines. Since 2026, the LEG has been available for exchange via the public grid.",
    s: ["ZEV", "vZEV", "virtual ZEV", "self-consumption community"],
    l: "Energy communities",
  },
  zuschlagswert: {
    b: "Award value (Zuschlagswert)",
    k: "The award value is the bid value in ct/kWh at which a project received an award in an EEG tender, and it forms the project's reference value.",
    t: `After each bidding date, the Bundesnetzagentur publishes the lowest, highest and volume-weighted average award value. For ground-mounted plants, the average values were recently around ${fmt(ERLOESE.eegFreiflaecheCt, 1)} ct/kWh, and higher for special solar installations. The award is usually tied to the site and transferable only to a limited extent.`,
    s: ["bid value", "award", "auction result", "clearing price"],
    l: "Tender results",
  },

  // ---------------------------------------------------------------- Ausbaustufe 2
  anbauverbotszone: {
    b: "Building-free zone and building restriction zone (Anbauverbotszone)",
    k: "The building-free zone is a strip along roads in which structures may in principle not be erected; in the adjoining building restriction zone, structures require the consent of the road authority.",
    t: "Along federal motorways, the zones under Section 9 of the Federal Trunk Roads Act (FStrG) extend 40 m and 100 m respectively, along federal roads 20 m and 40 m from the outer edge of the carriageway. Since 29 December 2023, the building ban and building restriction along federal trunk roads no longer apply to solar plants (Section 9(2c) FStrG); instead, the road authority is involved in the permit procedure or the project is notified before construction begins. Along state, regional and district roads, the zones of the respective state road law continue to apply.",
    s: ["building ban zone", "road setback", "Section 9 FStrG", "40 m zone"],
    l: "Solar parks along motorways and railways",
  },
  baulast: {
    b: "Public-law building encumbrance (Baulast)",
    k: "A Baulast is a public-law obligation of a landowner towards the building supervisory authority that is entered in the register of building encumbrances and also binds legal successors.",
    t: "For privileged solar plants in the outer zone, the building permit authority is to secure the decommissioning obligation under Section 35(5) BauGB through a Baulast provided for under state law or in another way. Not all federal states have the Baulast – Bavaria, for example, has no register of building encumbrances; there, decommissioning is usually secured through a guarantee. The Baulast does not replace financial security in case the operator defaults.",
    s: ["register of building encumbrances", "decommissioning encumbrance"],
    l: "Decommissioning and decommissioning bond",
  },
  blendgutachten: {
    b: "Glare study (Blendgutachten)",
    k: "A glare study calculates whether, and for how long, sunlight reflected by solar modules reaches houses, roads, railway lines or airfields.",
    t: "For residential buildings in Germany, the benchmark is the guidance of the Federal/State Working Group on Immission Control (LAI) on light immissions with Annex 2 of 2015: critical are mainly receptors west or east of a plant at a distance of less than about 100 m; significant nuisance may exist from 30 minutes a day or 30 hours a year of astronomically possible glare. Along transport routes, road authorities and the railway require freedom from glare. Remedies include screening at the height of the top edge of the modules, adjusted orientation or low-reflection modules.",
    s: ["glare", "reflection study", "LAI light guideline", "light immissions", "glint and glare"],
    l: "Distance and glare study",
  },
  "cef-massnahme": {
    b: "CEF measure",
    k: "CEF measures (continuous ecological functionality) are advance compensation measures in species protection that create replacement habitat before an intervention starts, so that the ecological function of affected breeding and resting sites is maintained.",
    t: "The legal basis is Section 44(5) of the Federal Nature Conservation Act (BNatSchG). For solar parks on arable land, CEF measures often concern ground-nesting birds such as the skylark, for example through flower strips, fallow land or skylark plots on neighbouring land. The measures must be effective before construction starts, are usually set out in the development plan or urban development contract and secured over the term; their effectiveness is often demonstrated by monitoring.",
    s: ["advance compensation measure", "continuous ecological functionality", "species protection compensation"],
    l: "Species protection and biodiversity",
  },
  "cable-pooling": {
    b: "Cable pooling",
    k: "Cable pooling means the joint use of a grid connection point and the connection line by several generation or storage plants, for example a solar park at the connection of a wind farm.",
    t: "Because wind and sun feed in at different times, an existing connection can be used more fully, and a separate cable route or substation may not be needed. In Germany the model is based on the plant operator's right of choice under Section 8(2) EEG and is often combined with a flexible grid connection agreement under Section 8a EEG. The consent of the existing operator and clear rules on metering, feed-in limits and liability are required.",
    s: ["shared grid connection", "sharing a grid connection", "co-location", "hybrid connection"],
    l: "Grid connection for solar parks",
  },
  "flexible-netzanschlussvereinbarung": {
    b: "Flexible grid connection agreement (overbuilding)",
    k: "A flexible grid connection agreement contractually limits the feed-in capacity at the grid connection and in return allows more generation or storage capacity to be connected than is available at that point (overbuilding).",
    t: "Since 25 February 2025, the legal basis has been Section 8a EEG, and for storage Section 17(2b) EnWG (Solar Peak Act). Among other things, the agreement governs the level and duration of the limit, time-varying limits, technical requirements and liability in case of exceedance. Because a solar park rarely reaches its rated capacity, overbuilding with low curtailment losses can enable a faster and cheaper connection.",
    s: ["overbuilding grid connection", "FCA", "flexible connection agreement", "Section 8a EEG"],
    l: "Grid connection for solar parks",
  },
  "moor-pv": {
    b: "Peatland PV (Moor-PV)",
    k: "Peatland PV is a photovoltaic plant on previously drained and agriculturally used peat soil that is permanently rewetted when the plant is built.",
    t: "Under the EEG, peatland PV counts as a special solar installation (Section 37(1) no. 3 e EEG) and may take part in the tender. In 2023, the Bundesnetzagentur set minimum water levels and proof requirements; the competent water authority confirms the rewetting. Because drained peat soils in Germany cause around 53 million tonnes of CO₂ equivalent a year, peatland PV combines solar power with peatland climate protection; foundations, corrosion and hydraulic engineering make the plants more complex, however.",
    s: ["peatland photovoltaics", "PV on peat soils", "solar park on peatland", "rewetting"],
    l: "Guide to peatland PV",
  },
  "floating-pv": {
    b: "Floating PV",
    k: "Floating PV plants are photovoltaic plants on anchored floats that in Germany may only be built on artificial or heavily modified water bodies such as quarry lakes and residual lakes from open-cast mining.",
    t: "Under Section 36(3) of the Federal Water Act (WHG), the plant may cover no more than 15% of the water surface and must keep a distance of at least 40 m from the shore; it is prohibited on natural lakes. Under the EEG, floating PV is a special solar installation (Section 37(1) no. 3 f EEG). It is particularly interesting for gravel works that consume the electricity directly; Fraunhofer ISE estimates the technical potential in Germany at around 44 GWp.",
    s: ["floating photovoltaics", "floating solar", "FPV"],
    l: "Guide to floating PV",
  },
  bilanzkreis: {
    b: "Balancing group (Bilanzkreis)",
    k: "A balancing group is a virtual energy account in the power grid in which feed-ins and withdrawals are compared for each quarter-hour and deviations are settled as balancing energy.",
    t: "Each balancing group has a responsible party who ensures balanced volumes vis-à-vis the transmission system operator; for solar parks, this is usually the direct marketer. For the market premium, Section 20 EEG requires subsidised electricity to be managed in a balancing group or sub-balancing group in which only such electricity is balanced. Forecasting errors lead to balancing energy costs, which are reflected in the direct marketing fee.",
    s: ["balance responsible party", "BRP", "sub-balancing group", "balancing energy"],
    l: "Direct marketing for solar parks",
  },
  buergerenergiegesellschaft: {
    b: "Citizens' energy company (Bürgerenergiegesellschaft, Section 3 no. 15 EEG)",
    k: "Under the EEG, a citizens' energy company is a cooperative or company with at least 50 natural persons as voting members, whose voting rights are mainly held by people living near the plant.",
    t: "At least 75% of the voting rights must be held by natural persons registered within 50 km of the plant; the remaining voting rights may only be held by small and medium-sized enterprises or municipalities, and no member may hold more than 10% of the voting rights. Under Section 22(3) and Section 22b EEG, solar parks of citizens' energy companies are exempt from tendering up to and including 6 MW, other operators only up to 1 MW. It must be distinguished from the Austrian term “Bürgerenergiegemeinschaft” (citizens' energy community).",
    s: ["community energy", "citizens' solar park", "Section 22b EEG", "BEG (Germany)"],
    l: "Community energy and acceptance",
  },
  direktvermarktungsentgelt: {
    b: "Direct marketing fee (Direktvermarktungsentgelt)",
    k: "The direct marketing fee is the remuneration that a direct marketer charges the plant operator for forecasting, balancing group management, trading and remote control, usually in euros per megawatt-hour.",
    t: "For solar parks, according to ÖkoInvest's assessment, it is usually in the order of a few euros per megawatt-hour; there are no official statistics. What matters is which risks are covered – for example balancing energy, profile deviations from the solar market value or negative prices – and which costs are passed on in addition. In EEG tenders, the fee must be factored into the bid value.",
    s: ["marketing fee", "direct marketing charge", "management premium", "route-to-market fee"],
    l: "Direct marketing for solar parks",
  },
  fernsteuerbarkeit: {
    b: "Remote controllability (Section 10b EEG)",
    k: "Remote controllability means that a direct marketer can retrieve a plant's actual feed-in at any time and reduce its feed-in capacity remotely; under Section 10b EEG it is mandatory for directly marketed plants above 25 kW.",
    t: "Technically, this is done via telecontrol technology, a control box from the direct marketer or the park controller; from 2028, the smart meter gateway can be used once a smart metering system has been installed. The obligation applies at the latest from the second calendar month after the first feed-in. In the event of breaches, the operator must pay €10 per kilowatt of installed capacity and calendar month under Section 52 EEG.",
    s: ["Section 10b EEG", "control box", "telecontrol", "remote control"],
    l: "Virtual power plant explained",
  },
  betriebsunterbrechungsversicherung: {
    b: "Business interruption insurance",
    k: "Business interruption insurance replaces the revenues that a solar park loses after insured property damage until the plant is producing again.",
    t: "For photovoltaics, it is usually taken out as loss-of-revenue cover together with all-risks or electronics insurance. Important contract points are the indemnity period, the time deductible and the basis of calculation, such as the tariff or PPA price and the irradiation during the outage. Curtailment by the network operator is not property damage and is therefore not insured; damage outside the park only with a contingent business interruption clause. Banks require a sufficient indemnity period so that debt service is secured even in the event of a loss.",
    s: ["loss of revenue insurance", "BI insurance", "loss of profit"],
    l: "Solar park insurance",
  },
  "discounted-cash-flow": {
    b: "Discounted cash flow (DCF)",
    k: "The discounted cash flow method determines the value of a plant or company as the present value of all future cash surpluses.",
    t: "Each expected cash flow is discounted to today at a required return and added up. For solar parks, yield and degradation, the tariff or PPA price, market value after the end of support, operating costs, lease and decommissioning are included year by year; the remaining term is limited by technical life, lease and easement. The DCF method is the standard for valuing operating plants; metrics such as price per kWp are only used as a plausibility check.",
    s: ["DCF", "DCF method", "present value method", "income value"],
    l: "Value of an operating plant",
  },
  ertragsgutachten: {
    b: "Energy yield assessment (Ertragsgutachten)",
    k: "An energy yield assessment forecasts the long-term electricity yield of a PV plant and quantifies its uncertainty.",
    t: "It is based on an irradiation data set for the site, a simulation of the plant with all losses and an analysis of the uncertainties arising from the data set, the model and the weather. The results are values such as P50, P75 and P90, usually for a single year and for several years. Banks size the debt on this basis, buyers the price. Bankable assessments come from independent experts and disclose data sources and loss assumptions.",
    s: ["energy yield assessment", "EYA", "yield forecast", "yield report"],
    l: "Energy yield assessment P50/P90",
  },
  repowering: {
    b: "Repowering",
    k: "Repowering means replacing the old modules and inverters of an existing solar park with new, more powerful components.",
    t: "Under Section 38b(2) EEG, replacement modules up to the previous capacity take over the commissioning date, tariff and remaining term of the replaced plant; since Solar Package I (16 May 2024), a defect is no longer required for this. If the capacity is increased, the old rate applies only proportionately in the ratio of old to new capacity. Bottlenecks are often the grid connection, the development plan and the term of the lease agreement. The support period is not extended by the replacement.",
    s: ["revamping", "module replacement", "replacing solar plants"],
    l: "Repowering old solar parks",
  },
  grunddienstbarkeit: {
    b: "Praedial easement (Grunddienstbarkeit)",
    k: "A Grunddienstbarkeit is a right entered in the land register in favour of the current owner of another, dominant plot to use the encumbered plot in certain respects (Section 1018 of the German Civil Code, BGB).",
    t: "Unlike the limited personal easement, the Grunddienstbarkeit is not tied to a person but to a plot: if the dominant plot is sold, the right passes automatically. It must offer the dominant plot an advantage (Section 1019 BGB). For solar parks it is mainly used for access routes and cables, for example if the operator owns the plot with the transfer station and wants to secure the cable route across neighbouring land. It is entered in Part II (Abteilung II) of the land register for the encumbered plot.",
    s: ["right of way", "cable right", "Section 1018 BGB", "appurtenant easement"],
    l: "Easements and the land register in PV leases",
  },
  rangruecktritt: {
    b: "Subordination of rank (Rangrücktritt)",
    k: "With a Rangrücktritt, the creditor of a land charge declares that their right in the land register ranks behind another right – for solar parks usually behind the operator's easement (Section 880 BGB).",
    t: "In the land register, the rank between Part II and Part III is determined by the date of entry. A new solar park easement would therefore rank behind existing land charges and could be extinguished by the senior creditor in a foreclosure auction. The bank financing the solar park therefore requires first rank. The subordinating creditor and the owner must agree; the declarations are submitted to the land registry in certified form. The costs are usually borne by the operator.",
    s: ["change of rank", "priority", "first rank", "subordination agreement"],
    l: "Rank and subordination explained",
  },
  solarbeweidung: {
    b: "Solar grazing (Solarbeweidung)",
    k: "Solar grazing is the management of vegetation in a solar park by grazing animals, usually sheep, instead of mowing or mulching.",
    t: "The animals keep the vegetation under the modules short, protect the soil and, with good management, promote biodiversity. Requirements are a sufficient module height – the state agricultural institutes recommend a lower edge of at least 80 cm for commercial breeds –, sheep-proof cabling, a fence closed at ground level and a water supply. Operators and shepherds usually conclude a maintenance contract with a flat rate per hectare. A grazed solar park remains a ground-mounted plant in legal terms; in Germany, CAP direct payments are only available if the plant is proven to be an agri-PV plant.",
    s: ["sheep grazing solar park", "solar grazing", "grazing PV plant"],
    l: "Grazing in a solar park",
  },
  "nebenbetrieb-landwirtschaft": {
    b: "Agricultural and forestry ancillary business (Nebenbetrieb)",
    k: "For tax purposes, an ancillary business is a part of a business that serves and is shaped by the main agricultural and forestry business, for example the first processing stage of its own products (R 15.5(3) Income Tax Guidelines, EStR).",
    t: "Typical examples are processing mainly self-produced raw materials or producing biogas from own biomass. The ancillary business remains part of agriculture and forestry, whereas a second processing stage is commercial. Under R 15.5(12) EStR, generating electricity from sun, wind or water is not an ancillary business but always a commercial business – even if the plant stands on the farmer's own field. For other commercial side activities, standard limits of one third of total turnover and €51,500 per financial year apply (R 15.5(11) EStR).",
    s: ["ancillary business", "R 15.5 EStR", "agriculture vs. trade"],
    l: "Taxes for farmers with photovoltaics",
  },

  // ---------------------------------------------------------------- Kataster, Grundbuch, Boden, Bindungen, Kommune, Dach
  flurstueck: {
    b: "Cadastral parcel (Flurstück)",
    k: "A Flurstück is the smallest recording unit of the German real estate cadastre and is identified by the cadastral district (Gemarkung), where applicable the Flur, and the parcel number consisting of numerator and denominator (e.g. 211/3).",
    t: "A plot in the sense of the land register can consist of one or more parcels; they are listed with their official area in the inventory section of the land register folio. Bavaria has no Fluren – there, the cadastral district and parcel number are sufficient. For the preliminary check of a ground-mounted plant, the parcels are the most reliable key to planning law, protected areas and land register encumbrances.",
    s: ["parcel number", "cadastral district", "land parcel", "real estate cadastre"],
    l: "Check your land in the land check",
  },
  katastralgemeinde: {
    b: "Cadastral municipality (Katastralgemeinde, KG) and folio number (Einlagezahl, EZ)",
    k: "In Austria, plots are uniquely identified by the cadastral municipality with its five-digit KG number, the plot number and the folio number (EZ) of the land register entry.",
    t: "The land register entry consists of the A sheet (property inventory: plots and rights attached to ownership), the B sheet (ownership) and the C sheet (encumbrances such as easements, liens and pre-emption rights). Plot numbers of building land begin with a dot (e.g. “.12”). For a PV easement, registration (Einverleibung) in the C sheet of the servient property is applied for.",
    s: ["KG number", "folio number", "plot number", "land register extract Austria", "C sheet"],
  },
  egrid: {
    b: "E-GRID (Swiss federal property identifier)",
    k: "The E-GRID is the unique identifier of a plot throughout Switzerland, consisting of “CH” and twelve further characters, in addition to the municipality's parcel number.",
    t: "Parcel numbers are only unique within a municipality, whereas the E-GRID is unique nationwide. It can be used to retrieve the land register extract and the cadastre of public-law restrictions on landownership (ÖREB cadastre) with land-use planning and protection zones – both are needed for the preliminary check of a solar plant.",
    s: ["EGRID", "parcel number Switzerland", "ÖREB cadastre", "property identifier"],
  },
  "grundbuch-abteilungen": {
    b: "Land register: Part II and Part III (Abteilung II und III)",
    k: "In the German land register, Part II contains encumbrances and restrictions such as easements, usufruct, pre-emption rights and priority notices, and Part III contains land charges such as Grundschulden and mortgages.",
    t: "For a solar park, the operator's easement is entered in Part II. Financing banks require it to rank ahead of land charges – existing creditors from Part III must therefore declare a subordination of rank. An up-to-date land register extract (not older than three months) shows all entries including their rank.",
    s: ["Part II", "Part III", "land register extract", "encumbrances and restrictions", "land charge"],
    l: "Easements in the land register",
  },
  niessbrauch: {
    b: "Usufruct (Nießbrauch, in Austria Fruchtgenuss)",
    k: "Usufruct is the right, entered in the land register, to use someone else's land comprehensively and to receive its income – including lease income.",
    t: "Parents often reserve usufruct when handing over the farm. For a lease to a solar park, both the owner and the usufructuary must then take part: the usufructuary consents to the use agreement or becomes a party to it and subordinates their right to the easement. In Austria, the comparable right is called Fruchtgenussrecht.",
    s: ["usufructuary right", "life interest", "Fruchtgenussrecht"],
    l: "Leasing land: process and contract",
  },
  bodenschaetzung: {
    b: "Soil assessment (Bodenschätzung: Ackerzahl, Bodenklimazahl)",
    k: "Soil assessment rates the natural yield potential of agricultural soils – in Germany as the arable or grassland score (Ackerzahl, Grünlandzahl), in Austria as the soil climate score (Bodenklimazahl), each on a scale of up to about 100.",
    t: "The yield index (Ertragsmesszahl) is derived from the score and the area and is recorded in the real estate cadastre or plot register. Many regional plans, state requirements and municipal criteria catalogues exclude ground-mounted PV on above-average soils or direct it to low-yield sites; on good soils, agri-PV can be the more compatible solution.",
    s: ["soil score", "soil points", "soil quality", "yield index", "EMZ"],
    l: "Check the suitability of your land",
  },
  agrarumweltmassnahmen: {
    b: "Agri-environment and climate measures (AUKM, ÖPUL)",
    k: "Agri-environment and climate measures are voluntary multi-year commitments by farmers in return for a premium – in Germany as the federal states' AUKM, in Austria as ÖPUL, and in Switzerland comparably as biodiversity contributions.",
    t: "The commitments usually run for five years or over the programme period. If land leaves early – for example because a solar park is built – premiums already paid may be reclaimed. The end of the commitment therefore belongs in the schedule, and responsibility for any reclaims belongs in the lease agreement.",
    s: ["AECM", "agri-environment scheme", "ÖPUL", "clawback", "biodiversity area"],
    l: "Agri-PV and CAP support",
  },
  referenzertrag: {
    b: "Reference yield (agri-PV)",
    k: `The reference yield is the agricultural yield of a crop at the site without a solar plant; under DIN SPEC 91434, the yield with the plant must reach at least ${pct(AGRI.mindestErtrag)} of it.`,
    t: "It is documented with the farm's own records over several years, regional statistics or an uncovered comparison area. Together with the agricultural use concept (crop, machinery, working widths, clearance height), it is the basis for the land being recognised as agri-PV and remaining eligible for support.",
    s: ["66 per cent rule", "agricultural use concept", "reference area"],
  },
  "natura-2000": {
    b: "Natura 2000 (Habitats Directive and bird protection areas)",
    k: "Natura 2000 is the EU-wide network of protected areas under the Habitats and Birds Directives, in which projects are only permitted after an appropriate assessment.",
    t: "For solar parks in or near Natura 2000 sites, an appropriate assessment under the Habitats Directive (FFH-Verträglichkeitsprüfung) is required; significant adverse effects on the conservation objectives usually rule out the project. In Germany, Natura 2000 areas are also excluded from the EEG eligible area “less-favoured areas”.",
    s: ["FFH site", "special area of conservation", "special protection area", "appropriate assessment"],
    l: "Check restrictions on your land",
  },
  wasserschutzgebiet: {
    b: "Water protection area (Wasserschutzgebiet)",
    k: "A water protection area protects drinking water abstraction and is divided into zones – the wellhead area (zone I), the inner (zone II) and the outer protection zone (zone III).",
    t: "Structures are excluded in zone I and usually also in zone II, or allowed only with an exemption. In zone III, solar parks are often possible with conditions under the respective protection area ordinance: no substances hazardous to water, transformer stations with a collecting tray, module cleaning without additives and a careful construction method.",
    s: ["WSG", "protection zone III", "drinking water protection", "source protection zone"],
    l: "Check restrictions on your land",
  },
  reservierungspraemie: {
    b: "Reservation premium (Reservierungsprämie)",
    k: `The reservation premium is an annual payment to the landowner for the period between signing the contract and the start of construction; in Germany, €${fmt(PACHT.reservierungProHa.min)}–€${fmt(PACHT.reservierungProHa.max)} per hectare and year is common.`,
    t: `It usually takes several years to reach ready-to-build status, during which the land is tied up. The premium compensates for this; in addition, a latest deadline for the start of construction should be agreed (usually no more than ${PACHT.reservierungJahre.max} years), after which the contract ends and the easement is deleted. Farming usually continues until construction starts.`,
    s: ["option fee", "option premium", "reservation fee"],
    l: "Check a lease offer",
  },
  wertsicherung: {
    b: "Value protection (indexation of the lease)",
    k: "A value protection clause links the lease to a price index – usually the consumer price index – so that it does not lose purchasing power over 25 to 40 years.",
    t: `Adjustment to the consumer price index (in Switzerland the national consumer price index, LIK) or a fixed escalation of, for example, ${pct(PACHT.indexierung, 1)} per year is common. What matters are the base year, the rhythm and threshold of adjustment and whether a minimum lease is also indexed. In Germany, such clauses in long-term contracts are usually permissible under the Price Clause Act (Preisklauselgesetz).`,
    s: ["indexation", "index clause", "CPI", "escalation clause"],
    l: "Calculate an indexed lease",
  },
  landpachtvertrag: {
    b: "Agricultural lease (Landpachtvertrag, existing lease)",
    k: "An agricultural lease grants a farmer the use of land for agricultural purposes; before a solar park is built, it must end or be adjusted by mutual agreement.",
    t: "In Germany, open-ended agricultural leases can be terminated at the latest on the third working day of a lease year with effect from the end of the following lease year (Section 594a BGB); fixed-term leases run until the agreed end. In Switzerland, minimum lease terms apply under the Federal Act on Agricultural Leases. It is common for the previous tenant to continue farming until construction starts and to be compensated for the loss.",
    s: ["farm tenancy", "end of lease", "terminating an agricultural lease", "Section 594a BGB"],
    l: "Leasing land for a solar park",
  },
  kriterienkatalog: {
    b: "Criteria catalogue for ground-mounted PV (Kriterienkatalog)",
    k: "A criteria catalogue is a municipal council resolution setting out the criteria by which the municipality supports solar parks in its planning – for example soil quality, distance to housing, visibility, an upper limit on area and citizen participation.",
    t: "It is not a bylaw, but in practice it binds the municipality when deciding on decisions to draw up development plans and creates planning certainty for owners and developers. It is often combined with expectations of financial participation for the municipality (Section 6 EEG) and participation offers for citizens.",
    s: ["site concept", "solar criteria catalogue", "guidelines for ground-mounted PV"],
    l: "Solar parks for municipalities",
  },
  dachstatik: {
    b: "Structural reserve (roof)",
    k: "The structural reserve is the additional area load in kN/m² that a roof structure can safely carry beyond the existing loads – depending on the design, PV systems need about 0.10–0.25 kN/m².",
    t: "Roof-mounted systems on trapezoidal sheet metal are at the lower end, ballasted flat-roof systems at the upper end. Snow and wind loads at the site are decisive; the proof is provided by a structural engineer on the basis of the existing structural calculations. If the reserve is lacking, lighter systems, reinforcement or covering only parts of the roof can help.",
    s: ["roof load capacity", "roof load", "kN/m²", "structural engineering"],
    l: "Lease your roof",
  },

  // ---------------------------------------------------------------- Kapitalseite
  marktlokation: {
    b: "Market location (Marktlokation, MaLo ID)",
    k: "In Germany, the market location is the place where electricity is consumed or generated and billed; its 11-digit MaLo ID with a check digit identifies it in market communication.",
    t: "Suppliers, network operators and energy communities use the MaLo ID for the start of supply, switching and billing. It appears on the electricity bill or in the grid use contract. The last digit is a check digit – typing errors can therefore usually be spotted immediately. A market location can comprise several metering locations (meters).",
    s: ["MaLo", "MaLo ID", "market location ID"],
  },
  messlokation: {
    b: "Metering location (Messlokation, MeLo ID)",
    k: "In Germany, the metering location is the place where metering takes place; the 33-character MeLo ID (formerly metering point designation) starts with DE, followed by the network operator number and postcode.",
    t: "While the market location stands for billing, the metering location describes the specific meter or metering system. It often also has to be stated for load profiles, metering point operation and energy sharing. There is no check digit – the format is checked.",
    s: ["MeLo", "MeLo ID", "metering point designation"],
  },
  zaehlpunkt: {
    b: "Metering point number (Zählpunktnummer, Austria)",
    k: "In Austria, the metering point number is the 33-character identifier of a consumption or feed-in point – it starts with AT, followed by the network operator number and postcode.",
    t: "It appears on the grid bill and in the network operator's smart meter web portal. To take part in a renewable energy community, it is needed for consumption and – if you have your own plant – for surplus feed-in (separate metering point). In Switzerland, the counterpart is called the Messpunktbezeichnung (starts with CH).",
    s: ["metering point", "metering point number AT", "metering point CH"],
    l: "Software for energy communities",
  },
  rlm: {
    b: "Interval metering (registrierende Leistungsmessung, RLM)",
    k: "With interval metering, consumption is measured in quarter-hourly values and transmitted as a load profile – in Germany it is usually mandatory from an annual consumption of 100,000 kWh.",
    t: "In addition to the energy price, RLM customers pay a capacity price on their annual peak load. The load profile is the basis for structured procurement, PPA design and peak shaving. Smaller customers are billed using a standard load profile (SLP).",
    s: ["RLM", "load profile metering", "interval meter", "half-hourly metering"],
    l: "Residual power calculator with load profile",
  },
  slp: {
    b: "Standard load profile (SLP)",
    k: "A standard load profile models the typical consumption pattern of a customer group – for smaller offtake points it replaces quarter-hourly metering.",
    t: "Only the annual quantity is measured; the pattern over the day is assumed from the profile (e.g. commercial G0). For assessing PV self-consumption and pool procurement, a real load profile from RLM or a smart metering system is much more accurate.",
    s: ["SLP", "load profile", "standard profile"],
  },
  lastgang: {
    b: "Load profile (Lastgang)",
    k: "The load profile is the time series of an offtake point's power consumption, usually in quarter-hourly values over a year.",
    t: "From the load profile, annual consumption, peak load, utilisation hours, base load and midday load can be read – and it can be simulated how much solar power can be consumed on site. Network or metering point operators provide exports as CSV; pay attention to the unit (kW or kWh per interval) and daylight saving time changes.",
    s: ["load curve", "quarter-hourly values", "interval data", "consumption profile"],
    l: "Analyse your load profile in the portal",
  },
  benutzungsstunden: {
    b: "Utilisation hours (Benutzungsstunden)",
    k: "Utilisation hours are annual consumption divided by annual peak load – the higher they are, the more even the consumption.",
    t: "In Germany, they determine the network charge tariff group (below or from 2,500 hours) and are a prerequisite for an individual network charge for electricity-intensive grid use (at least 7,000 hours and more than 10 GWh at one offtake point). Peak shaving with storage increases the utilisation hours.",
    s: ["full-load hours", "annual utilisation period", "load factor"],
  },
  leistungspreis: {
    b: "Capacity price (Leistungspreis)",
    k: "The capacity price is the part of the network charges that depends on the highest quarter-hourly load in the year (euros per kW and year).",
    t: "It applies to customers with interval metering (RLM). A single load peak determines the amount for the whole year – which is why peak shaving with storage or load shifting often pays off quickly.",
    s: ["demand charge", "capacity charge", "grid capacity price"],
    l: "Residual power pool for SMEs",
  },
  "individuelles-netzentgelt": {
    b: "Individual network charge (Section 19 StromNEV)",
    k: "Under Section 19 of the Electricity Network Charges Ordinance (StromNEV), final consumers with atypical or particularly even, electricity-intensive grid use can agree a reduced, individual network charge.",
    t: "Atypical means that the annual peak load predictably falls outside the network operator's peak-load time windows. Electricity-intensive means at least 7,000 utilisation hours and more than 10 GWh of annual consumption at one offtake point. The rules are currently being revised by the Bundesnetzagentur – check the current status before applying.",
    s: ["Section 19 StromNEV", "atypical grid use", "baseload privilege"],
    l: "Residual power pool for SMEs",
  },
  "dc-ac-verhaeltnis": {
    b: "DC/AC ratio",
    k: "The DC/AC ratio compares the module capacity (MWp) with the inverter or connection capacity (MWac).",
    t: "Values of around 1.1 to 1.35 are common for ground-mounted plants: the connection is used more fully, and a little power is curtailed in the few peak hours. Very high values increase curtailment losses; they must be taken into account in the energy yield assessment.",
    s: ["DC/AC ratio", "inverter loading ratio", "ILR", "inverter overbuilding"],
    l: "Calculate grid connection and overbuilding",
  },
  spv: {
    b: "Project company (SPV)",
    k: "A project company (special purpose vehicle) is a company set up specifically to hold the rights, contracts and later the plant of a single solar park.",
    t: "In a share deal, the shares in the project company are transferred; contracts and permits usually remain in the company. This makes financing and sale easier; change-of-control clauses in lease and grid contracts must be checked. The usual legal form in Germany is the GmbH & Co. KG (a limited partnership with a limited company as general partner).",
    s: ["SPV", "special purpose vehicle", "project GmbH & Co. KG"],
    l: "Buying solar projects",
  },
  "earn-out": {
    b: "Earn-out and milestone payments",
    k: "With an earn-out or milestone payments, part of the purchase price only becomes due once agreed targets have been reached – for example the adoption of the development plan, ready-to-build status or commissioning.",
    t: "In this way, buyer and developer share the development risk: if successful, the developer receives a higher total price, and the buyer only pays for project progress actually achieved. Clear, verifiable milestones and deadlines in the purchase agreement are decisive.",
    s: ["earn-out", "milestone payment", "deferred consideration"],
    l: "Selling a solar project",
  },
  "enterprise-value": {
    b: "Enterprise value",
    k: "The enterprise value is the value of a project company independent of its financing; deducting net financial debt gives the purchase price for the shares.",
    t: "Offers for operating parks are often made “cash-free/debt-free” on the basis of the enterprise value. If the buyer takes over an existing bank loan, the equity purchase price falls accordingly. The bridge from enterprise to equity value should be stated explicitly in the LOI.",
    s: ["EV", "company value", "equity value"],
    l: "Value an operating plant",
  },
  "co-development": {
    b: "Co-development",
    k: "In co-development, an investor and a project developer develop a project further together – the investor finances the development and secures access to the finished project.",
    t: "Typical cases are early-stage projects from land security or the grid enquiry onwards. Budget, milestones, decision rights and the takeover at ready-to-build status are regulated. Entry prices are lower for investors, but the permitting and grid risk is higher.",
    s: ["joint development", "development partnership"],
    l: "Co-development for investors",
  },
  "eu-taxonomie": {
    b: "EU taxonomy",
    k: "The EU taxonomy defines when an economic activity is considered environmentally sustainable – electricity generation from photovoltaics can qualify if further criteria are met.",
    t: "In addition to the contribution to climate change mitigation, it requires that no other environmental objectives are significantly harmed (DNSH, e.g. biodiversity, circular economy) and that minimum social safeguards are met. Funds under Articles 8 and 9 of the Sustainable Finance Disclosure Regulation (SFDR) ask for this evidence in due diligence.",
    s: ["Taxonomy Regulation", "taxonomy alignment", "DNSH", "SFDR"],
  },
  realisierungsfrist: {
    b: "Realisation deadline (Realisierungsfrist)",
    k: "The realisation deadline is the period within which a plant that has won an award in an EEG tender must be commissioned – otherwise penalties and the expiry of the award are possible.",
    t: "For solar installations of the first segment, according to the current status, it is 24 months from the announcement of the award; delays reduce the award value or trigger penalty payments. Buyers therefore check the award, the deadline and a realistic construction schedule together.",
    s: ["EEG realisation deadline", "EEG penalty", "commissioning deadline"],
    l: "EEG tenders for ground-mounted PV",
  },
  verfuegbarkeit: {
    b: "Technical availability",
    k: "Technical availability indicates the share of time a PV plant was ready for operation – usually over 98 to 99 per cent for well-maintained parks.",
    t: "It is a key metric in O&M contracts, often with a guarantee and a contractual penalty. For buyers of operating plants, together with curtailment and degradation it explains why actual yields differ from the forecast.",
    s: ["availability", "plant availability", "uptime"],
  },
  mindestabnahme: {
    b: "Minimum offtake (take-or-pay)",
    k: "A minimum offtake obliges the customer of a supply or contracting agreement to take an agreed quantity of electricity per year or to compensate for the shortfall.",
    t: "It secures the financing of the plant because the operator can count on predictable revenues. For the customer, it is important that the quantity matches their own consumption and that exceptions (e.g. plant faults, shutdowns) are regulated.",
    s: ["take-or-pay", "minimum quantity", "offtake obligation"],
    l: "PPA calculator for businesses",
  },
  "energie-contracting": {
    b: "Energy contracting (PV supply model)",
    k: "In PV contracting, a contractor builds and operates a plant on or next to the customer's premises and sells the electricity generated to the customer at an agreed price.",
    t: "The plant remains the property of the contractor or its project company; the customer is the electricity buyer and often provides the roof, secured by an easement. The term, energy price and standing charge, price escalation, minimum offtake and the end-of-term arrangement – for example a purchase option for the customer at the end of the contract – are regulated.",
    s: ["contracting", "solar contracting", "on-site PPA", "energy-as-a-service"],
    l: "Solar carport via contracting",
  },
  endschaftsregelung: {
    b: "End-of-term arrangement (Endschaftsregelung)",
    k: "The end-of-term arrangement sets out what happens to the plant at the end of a contracting or lease agreement – purchase option, transfer, extension or decommissioning.",
    t: "A purchase option for the customer at an agreed residual value or an extension is common. Without a clear arrangement, disputes about decommissioning costs or the value of the plant are likely. For banks, the end-of-term arrangement is part of the residual value review.",
    s: ["end of term", "purchase option at end of contract", "reversion"],
    l: "Solar park lease agreement",
  },
  nachschusspflicht: {
    b: "Additional contribution obligation (Nachschusspflicht, cooperative)",
    k: "The additional contribution obligation requires members of a cooperative to make payments beyond their contribution in the event of insolvency – whether and to what extent is set out in the articles of association.",
    t: "In Germany, the articles must state whether additional contributions are unlimited, limited to a liability amount or excluded altogether (Section 6 no. 3 Cooperatives Act, GenG); exclusion is common for energy cooperatives. In Austria, members of a cooperative with limited liability are by law usually also liable for an amount equal to their shares, unless the articles provide otherwise.",
    s: ["additional contribution", "liability amount", "cooperative liability"],
    l: "Energy cooperative for solar parks",
  },
};

/** Sortierschlüssel: Umlaute wie Grundbuchstaben */
const BUCHSTABE_EN = (begriff) => {
  const c = String(begriff).trim().charAt(0).toUpperCase();
  return { Ä: "A", Ö: "O", Ü: "U" }[c] || c;
};

/**
 * Begriffe auf Englisch: gleiche ids, Kategorien und Links; deutscher Begriff und deutsche
 * Synonyme bleiben als Suchbegriffe erhalten (Fachbegriffe im DACH-Raum werden deutsch gesucht).
 */
export function begriffeEn() {
  return BEGRIFFE.map((b) => {
    const e = LEXIKON_EN[b.id];
    if (!e) return b;
    return {
      ...b,
      begriff: e.b,
      kurz: e.k,
      text: e.t,
      buchstabe: undefined,
      synonyme: [...new Set([...(e.s || []), b.begriff, ...(b.synonyme || [])])],
      ...(b.link ? { link: { ...b.link, label: e.l || b.link.label } } : {}),
    };
  });
}

/** Englische Begriffe alphabetisch, gruppiert nach Buchstaben */
export function begriffeNachBuchstabeEn() {
  const sortiert = begriffeEn().sort((a, b) => a.begriff.localeCompare(b.begriff, "en"));
  const gruppen = new Map();
  for (const b of sortiert) {
    const l = BUCHSTABE_EN(b.begriff);
    if (!gruppen.has(l)) gruppen.set(l, []);
    gruppen.get(l).push(b);
  }
  return [...gruppen.entries()].sort(([a], [b]) => a.localeCompare(b, "en"));
}

/** Kategorien mit englischen Bezeichnungen */
export const kategorienEn = () => KATEGORIEN.map((k) => ({ ...k, label: KATEGORIEN_EN[k.id] || k.label }));
