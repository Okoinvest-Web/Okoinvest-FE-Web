// Englische Fassung der Regionalseite Niederösterreich (Sprachmodell) – Struktur wie die deutsche Datei.
// Befristete Fristen-Einträge (fristenAT) übersetzt die Regionalseite selbst über das Faktenregister.
const region = {
  seoTitel: "Solar park & agrivoltaics in Lower Austria: lease | ÖkoInvest",
  beschreibung:
    "Leasing land for a solar park in Lower Austria: “grassland – photovoltaics” zoning, 116 PV zones, 2 ha limit, ecology concept, Netz NÖ and agrivoltaics – for landowners.",
  lead:
    "Lower Austria has the most farmland in Austria and its own zone programme for ground-mounted PV. Whether your land fits is decided by zone, size and substation.",
  akzent: "with zones and limits.",
  ertrag: {
    ort: "in the Marchfeld east of Vienna",
    spanne: "around 1,100 kWh/kWp in the Waldviertel to 1,190 kWh/kWp in the Marchfeld",
    hinweis:
      "The Marchfeld and the east of the state lead in yield; in the higher Waldviertel and in the Tullnerfeld (PVGIS around 1,130 kWh/kWp) it is slightly lower.",
  },
  einleitung: [
    "Lower Austria is the largest Austrian state by area and, according to the 2023 agricultural structure survey, farms around 880,000 hectares of agricultural land – a good third of Austria’s farmland. Around 60 percent of the state’s area belongs to the permanent settlement area, considerably more than in the Alpine states. The Weinviertel, Marchfeld, Tullnerfeld and Steinfeld offer flat, well-developed locations with high irradiation. The state has set itself the goal of generating around 4,500 GWh of electricity per year from photovoltaics by 2030.",
    "At the same time, Lower Austria is the state with the most differentiated rules for ground-mounted installations. **Anyone wanting to build more than 50 kW on grassland needs the zoning “grassland – photovoltaic installations” (Gpv).** Outside the zones designated by the state, such zoning is limited to 2 hectares; within the 116 zones of the sectoral spatial planning programme, up to 10 hectares are possible. For landowners this means: the location of a plot relative to a zone is often more important than its size.",
    "Then there is the grid question. Netz Niederösterreich publishes available feed-in capacities on a daily basis; individual substations are already fully booked. A serious project developer therefore checks the zone, soil conditions and grid connection before a lease is signed.",
  ],
  recht: [
    {
      titel: "Gpv zoning from more than 50 kW on grassland",
      text: "Under § 20(2) no. 21 NÖ ROG 2014 (Lower Austrian Spatial Planning Act), photovoltaic installations on grassland (except on buildings) need the zoning “grassland – photovoltaic installations” if, alone or together with spatially connected installations, they reach more than 50 kW of bottleneck capacity. The zoning is adopted by the municipal council in the local spatial planning programme; the state reviews it as supervisory authority.",
    },
    {
      titel: "Outside the zones: 2 ha and aggregation within 200 m",
      text: "Outside the zones, a Gpv zoning may cover at most 2 hectares. Areas less than 200 metres apart are added together (§ 20(3d) NÖ ROG 2014). An area of up to 2 ha may additionally adjoin a zone directly. Larger zonings outside zones are only possible in special cases under § 20(3e), for example on standing water bodies or for the self-supply of individual businesses.",
    },
    {
      titel: "116 PV zones: 5 ha, up to 10 ha with an ecology concept",
      text: "The sectoral spatial planning programme on photovoltaic installations on grassland (LGBl. No. 94/2022) designates 116 zones in which zonings of more than 2 ha are permitted. A total of 5 ha may be zoned per zone; extension to up to 10 ha requires an ecology concept for the part above 5 ha – preserving soil quality, an ecological greening share, permeability for small game and packages of measures on biodiversity or food production.",
    },
    {
      titel: "Previously affected land counts as a zone",
      text: "Under § 2(2) of the sectoral programme (SekRop PV), contaminated sites, approved landfills where waste has actually been deposited (excluding agriculturally used excavated soil landfills) and extraction sites also count as zones. If a gravel pit is not in one of the 116 zones, extraction must be completed and the bottom of the pit reached before PV can be zoned there.",
    },
    {
      titel: "Electricity law from 1 MWp, nature conservation at any size",
      text: "Installations up to 1 MWp built by authorised companies do not need an installation permit under § 5(2) no. 3 NÖ ElWG 2005; above that, an electricity law permit from the state is required. Outside built-up areas, a nature conservation permit is required under the Lower Austrian Nature Conservation Act 2000 regardless of size, and in Natura 2000 sites regularly an appropriate assessment (Naturverträglichkeitsprüfung).",
    },
    {
      titel: "EAG: 25 % deduction on grassland, exception for agrivoltaics",
      text: "Anyone seeking an EAG market premium must expect a deduction of 25 % from the award value on agricultural land and grassland (§ 33 EAG). The deduction does not apply, among others, to landfills, contaminated sites, mining and infrastructure sites, and to agrivoltaic installations that do not impair the main agricultural use, or only slightly – an important advantage for the previously affected Lower Austrian zones.",
    },
  ],
  kulisse: {
    text: "In Lower Austria, the land available is determined above all by the 116 zones and the 2 ha limit. Anyone who owns a larger arable area outside a zone can usually only use part of it for PV. Opportunities lie in land in or directly next to a zone, previously affected sites and combinations with agricultural use.",
    gut: [
      "Land within one of the 116 zones of the SekRop PV (up to 5 + 5 ha)",
      "Areas of up to 2 ha directly adjoining a zone",
      "Exhausted gravel pits, landfills with deposits, contaminated sites",
      "Flat locations in the Weinviertel, Marchfeld and Tullnerfeld with a substation that has free capacity",
    ],
    schwierig: [
      "Land in areas flooded on average every 30 years or in red hazard zones (Gpv not permitted under § 15(7) NÖ ROG)",
      "Buffer zones of the Wienerwald Biosphere Park",
      "Natura 2000 sites (appropriate assessment, high hurdles)",
      "Landscape features worth preserving in the regional spatial planning programmes",
      "Sites at fully booked substations",
    ],
  },
  ablauf: {
    text: "In Lower Austria, a solar park starts with the question of whether the land lies in a zone or stays below 2 ha. The municipality then amends its local spatial planning programme (Gpv zoning); for zonings between 3,000 m² and 1.5 ha a connection concept must be submitted, and in the zones checking substation capacity is recommended. The ecology concept for areas above 5 ha is secured by contract or a zoning addendum and applies for the entire operating life. In parallel, the nature conservation permit at the district authority, from 1 MWp the electricity law permit and the grid access request to Netz Niederösterreich are processed.",
    behoerden: [
      { name: "Municipality (municipal council)", rolle: "Amendment of the local spatial planning programme, “grassland – photovoltaic installations” zoning, contract on the ecology concept" },
      { name: "Office of the Lower Austrian State Government – Spatial Planning", rolle: "Supervisory authority for zoning, zones of the SekRop PV, guidelines" },
      { name: "District authority (Bezirkshauptmannschaft)", rolle: "Nature conservation permit and appropriate assessment" },
      { name: "Office of the Lower Austrian State Government – Electricity Law", rolle: "Installation permit under NÖ ElWG 2005 for installations above 1 MWp" },
      { name: "Netz Niederösterreich", rolle: "Grid access, capacity information per substation" },
    ],
  },
  agri: [
    "In Lower Austria, agrivoltaics is not a special route around zoning: an agrivoltaic installation above 50 kW on grassland also needs Gpv zoning under the NÖ ROG rules and is subject to the same area limits. Its advantage shows in the ecology concept, which expressly provides for packages of measures on food production in addition to biodiversity measures, and in EAG funding, where the 25 % deduction can be waived.",
    "On energie-noe.at, the state presents two examples: the agrivoltaics park in Bruck an der Leitha (2022, 5.5 ha, 3 MWp, around 80 % of the area still used for food production, 18 % flowering strips) and an eco-solar biotope in Pöchlarn with apple trees that are protected from hail under the modules. For arable farms in the Weinviertel or Marchfeld, vertical or elevated systems that allow mechanised cultivation are the main options.",
  ],
  netz: {
    hinweis:
      "Since February 2025, Netz NÖ has provided a daily updated capacity map; individual substations no longer show any free feed-in capacity. According to its 2024–2034 grid development plan, the grid operator is expanding substations.",
  },
  besonderheiten: [
    {
      titel: "Zone logic instead of case by case",
      text: "Unlike in most Austrian states, Lower Austria precisely designates where large ground-mounted installations may go. Within a zone, all Gpv zonings are added together regardless of distance; whoever zones first uses up the zone’s quota. For owners, an early look at the state’s zone map is worthwhile.",
    },
    {
      titel: "Gravel, sand and landfills",
      text: "The Vienna Basin and the Tullnerfeld are shaped by mineral extraction. The state’s FAQ make clear that PV and extraction can be combined in the 116 zones and that the gravel does not have to be extracted first; outside the zones, completed extraction with a closure plan is required.",
    },
    {
      titel: "Flood areas along the Danube, March and Thaya",
      text: "Areas flooded in a 30-year flood or lying in red hazard zones must be kept free as retention areas; Gpv zoning is ruled out there. In the river lowlands, this should be checked before any planning.",
    },
    {
      titel: "RED III: acceleration areas in preparation",
      text: "In addition to the SekRop PV, the state is preparing acceleration areas for ground-mounted PV under the EU directive RED III, with priority for previously affected and sealed land such as landfills and excluding Natura 2000 sites. Legal implementation was announced for the third quarter of 2026.",
    },
  ],
  pacht: {
    begruendung:
      "Good irradiation and flat locations contrast with small permissible zoning sizes outside the zones, the EAG deduction and in some places scarce grid capacity. The lease is therefore usually in the middle range, and rather above on zone land with free grid capacity.",
  },
  faq: [
    {
      q: "How much lease do I get for a solar park in Lower Austria?",
      a: "That depends above all on whether the land lies in a zone, how far away the nearest substation with free capacity is and whether the project is supported with or without the EAG deduction. The lease calculator gives an orientation for your land; it only becomes binding after checking whether it can be zoned and the grid.",
    },
    {
      q: "How large may a solar park in Lower Austria be?",
      a: "Outside the 116 zones, at most 2 ha per zoning, with areas within a radius of 200 m added together. Within a zone, a total of 5 ha is possible, up to 10 ha with an ecology concept. Special rules apply to standing water bodies and business self-supply.",
    },
    {
      q: "My land is not in a PV zone – is anything still possible?",
      a: "Yes, but usually only up to 2 ha, and there must be no other Gpv area within 200 m. If your land directly adjoins a zone, an area of up to 2 ha can additionally be zoned. Separate rules apply to previously affected land such as completed gravel pits.",
    },
    {
      q: "Does a solar park in Lower Austria need a nature conservation permit?",
      a: "Outside built-up areas, usually yes, regardless of size. The district authority is responsible. In Natura 2000 sites, an appropriate assessment is added, which in practice rarely turns out in favour of a ground-mounted installation.",
    },
    {
      q: "Can I continue farming on my land?",
      a: "With agrivoltaics yes – that is its purpose. Grazing, for example with sheep, is also common with conventional ground-mounted installations. The ecology concept for areas above 5 ha requires, among other things, preserving soil quality and can include food production measures.",
    },
    {
      q: "What does a fully booked substation mean for my project?",
      a: "Without free feed-in capacity, a connection is only possible after grid expansion, which can take years. Netz NÖ shows capacities daily on a map; a serious developer clarifies this before the lease.",
    },
  ],
};

export default region;
