// Englische Fassung der Regionalseite Salzburg (Sprachmodell) – Struktur wie die deutsche Datei.
// Befristete Fristen-Einträge (fristenAT) übersetzt die Regionalseite selbst über das Faktenregister.
const region = {
  seoTitel: "Solar park & agrivoltaics in Salzburg: lease, law | ÖkoInvest",
  beschreibung:
    "Leasing land for a solar park in Salzburg: designation from 200 m², points system based on soil quality, previously affected land, acceleration areas along the A1 and A10, agrivoltaics requirement.",
  lead:
    "Salzburg only allows ground-mounted PV via a designation by the municipality and a points system that protects good soils. Previously affected land and agrivoltaics take priority.",
  akzent: "with a points system.",
  ertrag: {
    ort: "in the Flachgau north of the city of Salzburg",
    spanne: "around 1,140 kWh/kWp in the Flachgau to 1,230 kWh/kWp in the Saalfelden basin",
    hinweis:
      "In the mountainous south (Innergebirg), PVGIS values in open basins such as Saalfelden are sometimes above the Flachgau; in narrow valleys, shading by the horizon can reduce the yield considerably.",
  },
  einleitung: [
    "Salzburg is a mountainous state with little flat land: only around 22 percent of its area belongs to the permanent settlement area, and almost a quarter consists of alpine pastures. The agricultural land of around 161,000 hectares is mainly grassland. Larger flat areas are found above all in the Flachgau north of the state capital, in the Salzach valley of the Tennengau and in individual basins such as the Saalfelden basin in the Pinzgau.",
    "State policy clearly focuses on rooftops. Ground-mounted installations on grassland with a collector area of 200 m² or more require a **designation (Kennzeichnung) by the municipality** under the Spatial Planning Act, and since November 2023 a state-wide points system has decided whether a site is suitable. Productive soils are to remain free of PV, while previously affected land along major roads and railway lines is considered favourable.",
    "In 2026, Salzburg also created the basis for acceleration areas – exclusively for photovoltaics and mainly along the motorways. For landowners, Salzburg thus remains a market with few, well-justified sites, in which agrivoltaics and previously affected land have the best chances.",
  ],
  recht: [
    {
      titel: "Designation from 200 m² of collector area",
      text: "Under § 36(7) ROG 2009 (Salzburg Spatial Planning Act), free-standing solar installations with more than 200 m² of collector area on grassland are only permitted if the site has a designation under § 39b. The collector areas of several installations in close proximity are added together. Requirements include that the spatial development concept does not stand in the way and that a grid connection is technically possible.",
    },
    {
      titel: "Points system of the photovoltaic designation ordinance",
      text: "On unaffected grassland, site suitability under the 2023 photovoltaic designation ordinance is required. Depending on the category of the soil function assessment (production function), minimum points must be reached: 20 points for soils of categories 1 to 3, 30 points for category 4, 40 points for category 5. Points are awarded for location, land efficiency, type and size of the installation.",
    },
    {
      titel: "Previously affected land: simplified procedure",
      text: "Under § 5 no. 15a ROG, previously affected land includes, among others, extraction sites, storage and deposit sites, emission protection strips, sports facilities, campsites and ski slopes in the area of lifts. The same criteria apply there as in building land, and the designation does not require acknowledgement by the supervisory authority, only notification to the state.",
    },
    {
      titel: "State Electricity Act: no permit if installed by a specialist firm",
      text: "Under § 45(3) of the 1999 State Electricity Act, PV installations require neither notification nor a permit, regardless of their capacity, if they are built by an authorised company. Only otherwise does the scale apply: below 150 kW exempt, 150 to 500 kW notification, above 500 kW permit.",
    },
    {
      titel: "Nature conservation: only in protected areas and habitats",
      text: "The Salzburg Nature Conservation Act has no general permit requirement for PV. A permit is required for installations in protected areas and protected habitats under § 24 (such as bogs, wet meadows, nutrient-poor sites over 2,000 m², shore areas) and for terrain changes over 5,000 m². Under § 50a, PV installations including access, grid connection and storage are in the particular public interest.",
    },
    {
      titel: "Acceleration areas only for PV, along the A1 and A10",
      text: "With an amendment to the Spatial Planning Act (February 2026), Salzburg created the basis for RED III acceleration areas – exclusively for photovoltaics. Around 135 ha along the West and Tauern motorways in eight municipalities are planned; on land not yet sealed, only agrivoltaics is planned. According to media reports, the ordinance with the specific areas was still a draft in August 2026.",
    },
  ],
  kulisse: {
    text: "The land available in Salzburg is narrow. There are hardly any large open areas, and the points system favours sites with prior use and low soil function. Realistic options are above all projects in the Flachgau and Tennengau along the motorway, on extraction and storage sites, and agrivoltaics on grassland with continued farming.",
    gut: [
      "Land along the A1 and A10 (planned acceleration areas)",
      "Previously affected land: extraction sites, storage and deposit sites, emission protection strips",
      "Ski slopes in the area of lifts and sports facilities",
      "Soils in the lower categories of the soil function assessment",
      "Agrivoltaics with continued grassland use",
    ],
    schwierig: [
      "Productive soils of categories 4 and 5 (high minimum score)",
      "Hohe Tauern National Park, nature, landscape and European protected areas",
      "Bogs, wet meadows, shore areas and other protected habitats",
      "Areas flooded on average every 30 years and drinking water protection areas",
      "Narrow, heavily shaded valley locations",
    ],
  },
  ablauf: {
    text: "In Salzburg, a solar park goes through the municipality: if the spatial development concept (REK) stands in the way of the designation, it must first be amended – with an environmental significance assessment, six weeks of public display and approval by the state government as supervisory authority. The municipality then adopts the designation in the zoning plan; on previously affected land, notification to the state is sufficient. The state’s central contact point “Renewable Energy” advises throughout the procedure and coordinates the authorities’ schedules.",
    behoerden: [
      { name: "Municipality (municipal council)", rolle: "Spatial development concept, designation for free-standing solar installations under § 39b ROG" },
      { name: "Salzburg state government (supervisory authority)", rolle: "Supervisory approval or acknowledgement of the plan amendment" },
      { name: "Contact point “Renewable Energy” (Office of the State Government, Unit 4/04)", rolle: "Advice, coordination, procedural handbook" },
      { name: "District authority (Bezirkshauptmannschaft)", rolle: "Nature conservation, water law and forestry law, where affected" },
      { name: "Salzburg Netz", rolle: "Grid access and connection point" },
    ],
  },
  agri: [
    "Agrivoltaics has a special position in Salzburg: in the planned acceleration areas, the state only provides for agrivoltaics on land not yet sealed, in order to avoid soil sealing and preserve agricultural use. State councillor Martin Zauner justified this with the principle that photovoltaics belongs primarily on rooftops.",
    "Since Salzburg is a grassland state, it is usually about installations under which mowing or grazing can take place – for example vertical module rows or elevated systems. In the points system of the designation ordinance, the type of installation counts; genuine dual use improves the chances. In terms of support, the 25 % deduction from the EAG market premium can be waived for qualified agrivoltaics.",
  ],
  netz: {
    hinweis:
      "Like all Austrian grid operators, Salzburg Netz publishes the available feed-in capacities per substation quarterly on ebutilities.at.",
  },
  besonderheiten: [
    {
      titel: "Only 135 hectares of acceleration areas",
      text: "The planned acceleration areas are in Eugendorf, Wals-Siezenheim and Hallwang (Flachgau), Golling and Kuchl (Tennengau), Flachau and Werfen (Pongau) and Zederhaus (Lungau) – around 0.18 percent of the state’s area. Excluded are, among others, protected areas, the Hohe Tauern National Park, bird migration corridors, forest, bogs, high-quality soils and natural hazard zones. The PV industry criticises the areas as too small.",
    },
    {
      titel: "Expansion target and criticism",
      text: "According to PV Austria, Salzburg ranks seventh among the Austrian states with around 470 MW of installed PV capacity; the association considers the state target of 600 MW too low. This points to continued scarcity of open land, but also to political pressure to develop suitable sites.",
    },
    {
      titel: "Tourism, slopes and landscape",
      text: "Ski slopes in the area of lifts count as previously affected land in Salzburg. At the same time, townscape and landscape carry great weight in tourist regions; a designation requires that they are not significantly impaired.",
    },
  ],
  pacht: {
    begruendung:
      "Few areas eligible for designation, mostly small installation sizes and the agrivoltaics requirement on unsealed land increase project costs. Well-located, previously affected land along the motorway can achieve more.",
  },
  faq: [
    {
      q: "How much lease do I get in Salzburg for a solar park?",
      a: "In Salzburg, what a project can bear is determined above all by eligibility for designation, installation size and whether only agrivoltaics is permitted. Since many installations are smaller and more complex than in flat country, the lease tends to be in the lower range; the lease calculator shows the framework.",
    },
    {
      q: "From what size does a PV installation on grassland in Salzburg need a designation?",
      a: "From more than 200 m² of collector area, with neighbouring installations added together. The designation is adopted by the municipality in the zoning plan.",
    },
    {
      q: "How does the points system work in Salzburg?",
      a: "The 2023 photovoltaic designation ordinance requires a minimum score depending on the soil function assessment: 20 points for soils of categories 1 to 3, 30 for category 4 and 40 for category 5. Points are awarded for location, land efficiency, type and size of the installation – good soils can therefore hardly be used.",
    },
    {
      q: "Where are the acceleration areas in Salzburg?",
      a: "Around 135 ha along the A1 and A10 are planned in Eugendorf, Wals-Siezenheim, Hallwang, Golling, Kuchl, Flachau, Werfen and Zederhaus. On unsealed land, only agrivoltaics is provided for there. The ordinance had not yet been adopted in summer 2026.",
    },
    {
      q: "Does a solar park in Salzburg need an electricity law permit?",
      a: "If the installation is built by an authorised company, it requires neither notification nor a permit under the State Electricity Act, regardless of capacity. Nature conservation, water and forestry law may nevertheless require permits.",
    },
    {
      q: "Is there a contact point for PV projects in Salzburg?",
      a: "Yes. The contact point “Renewable Energy” in the Office of the State Government gives applicants legal and technical advice and works towards swift handling of procedures.",
    },
  ],
};

export default region;
