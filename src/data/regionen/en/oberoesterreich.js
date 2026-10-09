// Englische Fassung der Regionalseite Oberösterreich (Sprachmodell) – Struktur wie die deutsche Datei.
// Befristete Fristen-Einträge (fristenAT) übersetzt die Regionalseite selbst über das Faktenregister.
const region = {
  seoTitel: "Solar park & agrivoltaics in Upper Austria: lease | ÖkoInvest",
  beschreibung:
    "Leasing land for a solar park in Upper Austria: special designation on grassland from 50 m², criteria catalogue on soil fertility, agrivoltaics requirement and Netz OÖ at a glance.",
  lead:
    "In Upper Austria, a state-wide criteria catalogue decides whether land can be zoned for ground-mounted PV. Soil fertility and proximity to a substation are the keys.",
  akzent: "with a criteria catalogue.",
  ertrag: {
    ort: "in the Welser Heide near Marchtrenk",
    spanne: "around 1,130 kWh/kWp (Welser Heide) to 1,140 kWh/kWp (Innviertel near Ried)",
    hinweis:
      "According to PVGIS, the Alpine foothills between the Innviertel and the Hausruckviertel are fairly uniform in yield; valley locations in the south can be lower because of shading by the horizon.",
  },
  einleitung: [
    "Upper Austria is both an agricultural and an industrial state: just under 500,000 hectares are used for agriculture, and the permanent settlement area covers around 57 percent of the state’s area. The Alpine foothills with the Innviertel, Hausruckviertel, Traunviertel and the Linz area offer gently sloping, well-developed land. At the same time, pressure on land from settlement, businesses and transport is high, and the soils in the central region are among the most productive in the state.",
    "The state has set out its approach in the **Upper Austria Photovoltaic Strategy 2030**: rooftops and previously affected land have top priority. Ground-mounted installations on agricultural and forestry land are possible, but are examined in the zoning procedure according to a criteria catalogue based above all on natural soil fertility and the distance to the nearest substation. On medium soils, only agrivoltaics with genuine agricultural dual use is provided for.",
    "For landowners this means: not every flat, sunny meadow can be zoned. Anyone who knows the soil fertility level of their land and its location relative to the substation can assess the chances well – the state provides the data for this in the DORIS geographic information system.",
  ],
  recht: [
    {
      titel: "Special designation on grassland from 50 m² of module area",
      text: "Free-standing PV installations with more than 50 m² of module area may only be built on grassland if the zoning plan provides for a special designation (§ 30a(3) Oö. ROG 1994, the Upper Austrian Spatial Planning Act). Installations for the farm’s own use are exempt. Up to 50 m², free-standing installations are permitted on grassland and in all building land categories.",
    },
    {
      titel: "Criteria catalogue: soil fertility decides",
      text: "The criteria catalogue of the Upper Austria PV Strategy 2030 applies primarily in the zoning procedure. Soils with high to very high natural soil fertility (levels 4 and 5) and the two highest categories in each municipality are ruled out. Pure ground-mounted installations without agricultural dual use should only be built on soils of the lowest level 1; on levels 2 and 3, agrivoltaics is provided for.",
    },
    {
      titel: "Energy-sector priority around substations",
      text: "Within a radius of 5 km around existing substations, “energy-sector priority 1” applies, up to 7.5 km “priority 2”. In these areas, dual use is also possible on soils of levels 3 and 4; soils of the highest level 5 remain excluded. In Upper Austria, proximity to the grid therefore improves not only connection costs but also the chances of zoning.",
    },
    {
      titel: "Electricity law above 1,000 kW, nature conservation above 500 m²",
      text: "Installations above 1,000 kW of bottleneck capacity that are not on artificial structures need a permit under § 6 Oö. ElWOG 2006 from the Office of the State Government. Under nature conservation law, free-standing installations on grassland outside closed settlements require a permit from more than 500 m² of collector area (§ 5 no. 21 Oö. NSchG 2001), and must be notified from 2 to 500 m². Under building law, PV installations are exempt from permits and notification.",
    },
    {
      titel: "Acceleration areas: zoning dropped, ordinance in preparation",
      text: "Upper Austria has already stipulated by law that free-standing PV installations including ancillary facilities and battery storage in designated acceleration areas (§ 11(3b) Oö. ROG) count as zoning-neutral structures – the zoning requirement is dropped. According to the state, the ordinances for acceleration areas and for PV exclusion zones were still being drawn up in June 2026, with adoption planned for 2026.",
    },
    {
      titel: "EAG deduction of 25 % – agrivoltaics can be exempt",
      text: "For ground-mounted installations on agricultural land or grassland, the award value of the EAG market premium is reduced by 25 % (§ 33 EAG), and likewise for the investment grant. For certain agrivoltaic installations, landfills, contaminated sites and infrastructure sites, the deduction does not apply; for the investment grant, certain agrivoltaic installations receive an additional 30 % surcharge.",
    },
  ],
  kulisse: {
    text: "In Upper Austria, the land available results less from fixed zones than from the interplay of soil fertility, landscape sensitivity and proximity to the grid. The state provides the criteria as map layers in the DORIS system, so that a first assessment can be made for every plot.",
    gut: [
      "Soils of the lowest fertility level 1 (also for pure ground-mounted PV)",
      "Land within a radius of 5 km around a substation (priority 1), where agrivoltaics is also possible on levels 3 and 4",
      "Previously affected land such as landfills, contaminated sites and extraction sites",
      "Agrivoltaic concepts with at least 75 % of the land used for agriculture",
    ],
    schwierig: [
      "Highly fertile soils (levels 4 and 5) and the two best categories in each municipality",
      "Regional green zones in the Eferding and Linz-Umland spatial planning programmes",
      "Diverse cultural and natural landscapes with a high density of landscape elements",
      "Areas flooded on average every 30 years, forest and forest edges (at least 30 m distance)",
      "500 m lakeshore protection zone in the Salzkammergut and at other lakes",
    ],
  },
  ablauf: {
    text: "In Upper Austria, the municipality designates a grassland special designation for PV in the zoning plan; the state reviews it as supervisory authority according to the criteria catalogue. Beforehand, it is worth looking at the fertility level, landscape assessment, distances to forest and water and the distance to the substation. This is followed by the nature conservation permit from the district authority, for more than 1,000 kW the electricity law permit from the state (with an opinion from the grid operator), and possibly water, forestry and road law – installations within 8 m of public roads under the Upper Austrian Roads Act require the consent of the road administration.",
    behoerden: [
      { name: "Municipality (municipal council)", rolle: "Grassland special designation for PV in the zoning plan" },
      { name: "Office of the Upper Austrian State Government – Spatial Planning Department", rolle: "Supervision of zoning, application of the criteria catalogue" },
      { name: "Office of the Upper Austrian State Government – Department of Installation, Environmental and Water Law", rolle: "Electricity law permit under Oö. ElWOG 2006 above 1,000 kW" },
      { name: "District authority / municipal authority (Magistrat)", rolle: "Nature conservation (permit above 500 m² of collector area), water and forestry law" },
      { name: "Netz Oberösterreich / Linz Netz", rolle: "Grid access and opinion in the permit procedure" },
    ],
  },
  agri: [
    "In Upper Austria, agrivoltaics is not an extra but often the only option: on soils of the medium fertility levels 2 and 3 – and near substations also on level 4 – the criteria catalogue only permits installations with agricultural dual use. The state defines this as at least 75 % of the zoned area being used for agriculture with locally customary crops and cultivated with conventional machinery.",
    "For funding, the EAG requirements also apply: installations on agricultural land must be fully reversible, the lower edge of the modules must be at least 80 cm above the ground and row spacing must be at least two metres (except for innovative and tracking installations). For grassland and arable farms in the Innviertel and Hausruckviertel, vertical installations or widely spaced rows with grassland use are therefore the main options.",
  ],
  netz: {
    hinweis:
      "At the end of 2023, Netz OÖ was temporarily unable to take additional solar power in seven substation areas; it has been expanding since then. The available capacities per substation are published quarterly; the grid comprises 62 substations and switching stations (as of 10/2025).",
  },
  besonderheiten: [
    {
      titel: "Soil fertility as the guiding function",
      text: "Unlike Lower Austria, Upper Austria does not work with designated zones but with an assessment of natural soil fertility in five levels. The best soils in each municipality remain excluded regardless of PV use – which protects the vegetable and arable land especially in the central region and the Eferding basin.",
    },
    {
      titel: "Lakes and the Salzkammergut",
      text: "At all lakes including their shores, a nature conservation permit may be required up to 500 m inland for any significant change to the landscape, and protection zones of 50 or 200 m apply along rivers and streams. In the Salzkammergut with the Attersee, Traunsee and Mondsee, ground-mounted installations are therefore hardly realistic.",
    },
    {
      titel: "Proximity to a substation counts twice",
      text: "Priority 1 within 5 km of substations opens up dual use even on better soils. Anyone with land near a substation with available capacity has a clear advantage in Upper Austria.",
    },
  ],
  pacht: {
    begruendung:
      "High soil values and competition for land in the Alpine foothills contrast with the agrivoltaics requirement on medium soils and the EAG deduction. The lease is therefore usually in the middle range; land near substations with free capacity is in greater demand.",
  },
  faq: [
    {
      q: "How much lease does a solar park pay in Upper Austria?",
      a: "In Upper Austria, the lease depends heavily on whether a pure ground-mounted installation or only agrivoltaics is permitted on the land, and how close the nearest substation with free capacity is. The lease calculator shows the framework for your land; whether it can be zoned is only clarified by the assessment under the criteria catalogue.",
    },
    {
      q: "When does a PV installation on grassland in Upper Austria need zoning?",
      a: "From more than 50 m² of module area, a grassland special designation in the zoning plan is required. Installations for the farm’s own use are exempt. In acceleration areas designated in future, the zoning requirement will be dropped.",
    },
    {
      q: "How do I find out the soil fertility of my land?",
      a: "The state shows the criteria of the catalogue, including natural soil fertility, in the DORIS geographic information system. Level 1 allows pure ground-mounted installations, levels 2 and 3 only agrivoltaics, and levels 4 and 5 are generally excluded – with exceptions near substations for levels 3 and 4.",
    },
    {
      q: "What counts as agrivoltaics in Upper Austria?",
      a: "According to the criteria catalogue, at least 75 % of the zoned area must remain in agricultural use with locally customary crops and be workable by machine. For EAG funding, technical requirements such as a minimum height of 80 cm for the lower edge of the modules and two metres between rows are added.",
    },
    {
      q: "Does a solar park in Upper Austria need a nature conservation permit?",
      a: "On grassland outside closed settlements, yes, from more than 500 m² of collector area. The district authority or the municipal authority is responsible. Separate rules apply in lakeshore and water protection areas.",
    },
    {
      q: "Are there zones for solar parks in Upper Austria?",
      a: "There are currently no fixed suitability zones as in Lower Austria. The state is working on ordinances for acceleration areas and exclusion zones, with adoption planned for 2026. Until then, the criteria catalogue decides in the zoning procedure.",
    },
  ],
};

export default region;
