// Englische Fassung der Regionalseite Tirol (Sprachmodell) – Struktur wie die deutsche Datei.
// Befristete Fristen-Einträge (fristenAT) übersetzt die Regionalseite selbst über das Faktenregister.
const region = {
  seoTitel: "Solar park & agrivoltaics in Tyrol: lease, law | ÖkoInvest",
  beschreibung:
    "Leasing land for a solar park in Tyrol: ground-mounted PV above 250 kW via a TEG permit, nature conservation from 2,500 m², agrivoltaics as the benchmark, car parks and landfills.",
  lead:
    "In Tyrol, large solar parks on agricultural land are the exception. Opportunities lie in previously affected land, infrastructure and agrivoltaics in the Inn valley – with very good yields.",
  akzent: "with little valley floor.",
  ertrag: {
    ort: "in the Inn valley between Innsbruck and Hall",
    spanne: "around 1,110 kWh/kWp near Kufstein to 1,370 kWh/kWp in the central Inn valley",
    hinweis:
      "According to PVGIS, the central Inn valley is well above the lower Inn valley near Kufstein; in narrow valleys, shading by the horizon sometimes reduces the yield considerably. PVGIS takes terrain shading at the respective point into account.",
  },
  einleitung: [
    "Tyrol is the Austrian state with the smallest permanent settlement area: only just under 13 percent of its area is available for agriculture, settlement and transport. The agricultural land of around 226,000 hectares consists largely of alpine pastures and grassland. The flat valley floors in the Inn valley, the lower Inn valley (Unterland) and East Tyrol are scarce and fiercely contested – by settlement, commerce, transport and an agriculture that urgently needs its best land.",
    "**Large ground-mounted solar parks on meadows and arable land are therefore hardly realistic in Tyrol**, and the state says so openly: rooftops remain preferred, and for open land Tyrol relies on already paved or previously affected land such as large car parks, landfills and ski areas. A state potential study from 2022 concluded that a large part of the required ground-mounted solar power can be generated on land that is already used, sealed or of low value.",
    "For landowners, Tyrol is nevertheless not uninteresting. Irradiation in the central Inn valley is among the best in Austria, permit law for installations above 250 kW is bundled in electricity law, and the energy authority uses agrivoltaics as the benchmark for compatibility with agriculture. Anyone with previously affected land, land along transport infrastructure or a farm with special crops should take a closer look.",
  ],
  recht: [
    {
      titel: "Tyrolean Electricity Act: permit above 250 kW",
      text: "Under the TEG 2012 (Tyrolean Electricity Act), PV installations up to 50 kW are exempt, from over 50 to 250 kW they must be notified to the district administrative authority, and above 250 kW they require a permit. The district authority is generally responsible, and the state government for installations above 500 kW. The act does not distinguish between rooftop and ground-mounted installations.",
    },
    {
      titel: "Special area up to 250 kWp, no zoning requirement above",
      text: "Free-standing installations in open land with more than 100 m² of collector area need special-area zoning, such as “special area photovoltaic installation” – but only up to 250 kWp. According to the state’s procedural handbook, larger installations subject to the TEG do not fall under the building code and the Spatial Planning Act; there is then no zoning requirement.",
    },
    {
      titel: "Protection objectives in the TEG: landscape and spatial planning programmes",
      text: "For ground-mounted installations, two requirements of § 5 TEG 2012 are decisive: nature, landscape and townscape must not be significantly impaired, and there must be no conflict with a spatial planning programme. Particularly relevant are the regional programmes with agricultural reserve areas (Vorsorgeflächen), which exist state-wide in Tyrol at the level of the planning associations.",
    },
    {
      titel: "Nature conservation from 2,500 m² of built-up area",
      text: "Outside closed settlements, a PV installation with more than 2,500 m² of contiguous built-up area requires a permit under § 6 lit. a TNSchG 2005 (Tyrolean Nature Conservation Act). Regardless of size, the permit requirement applies along natural watercourses (including a 5 m shore strip), in the 500 m strip around standing waters over 2,000 m², in floodplain forests, wetlands and protected areas. Such energy installations are prohibited in the Hohe Tauern National Park.",
    },
    {
      titel: "Acceleration areas: car parks, landfills, ski areas",
      text: "With the Tyrolean acceleration ordinance for photovoltaic installations (TBVO-PV), the state intends to designate acceleration areas under RED III (the EU Renewable Energy Directive) on paved land such as large car parks, on landfills and in ski areas under the cable car and ski area programme. The draft was on display in the municipalities from 3 June to 16 July 2026. Tyrol rejects acceleration areas for wind power.",
    },
    {
      titel: "EAG deduction of 25 % on grassland",
      text: "For installations on agricultural land or grassland, the award value of the EAG market premium is reduced by 25 % (§ 33 EAG). Landfills, infrastructure sites and qualified agrivoltaic installations are exempt – an additional argument for previously affected land in Tyrol’s site logic.",
    },
  ],
  kulisse: {
    text: "The land available for ground-mounted PV in Tyrol is small and clearly geared towards prior use. The state’s 2022 potential study estimated the realistically developable potential away from alpine pastures and high mountains at around 730 GWh per year: 283 GWh from roofing large car parks, 246 GWh from roofing roadways, 91 GWh on land beside transport routes, 56 GWh on landfills and 50 GWh on noise barriers, sewage treatment plants and bridges.",
    gut: [
      "Large car parks and other paved areas (acceleration areas planned)",
      "Landfills and land beside motorways and railway lines",
      "Land in ski areas under the cable car and ski area programme",
      "Agrivoltaics on valley land with an agricultural operating concept",
    ],
    schwierig: [
      "Agricultural reserve areas in the regional programmes",
      "High-quality soils (the authority requires avoiding a soil climate index of 60/50)",
      "Alpine pastures and high-alpine land (landscape, ecology, accessibility)",
      "Hohe Tauern National Park, glaciers and their forefields, protected areas",
      "Shore areas, floodplain forests, wetlands, forest (clearing permit from 1,000 m²)",
    ],
  },
  ablauf: {
    text: "The procedure in Tyrol depends on capacity. Up to 250 kWp, a ground-mounted installation needs the municipality’s special-area zoning; admissibility is assessed against the objectives of the TROG 2022 (Tyrolean Spatial Planning Act), possibly with expert opinions from Energie Tirol and an examination of alternative sites. Above 250 kWp, the installation is approved in the electricity law procedure under the TEG 2012, which also covers the building permit. There, the authority examines landscape, spatial planning programmes, glare, noise, structural safety, flood risk and a grid-compatible connection. The state’s contact point for renewable energy supports the procedure.",
    behoerden: [
      { name: "Municipality", rolle: "Special-area zoning for installations up to 250 kWp" },
      { name: "District authority (Bezirkshauptmannschaft)", rolle: "Notification and permit under TEG 2012 up to 500 kW, nature conservation, clearing" },
      { name: "Office of the Tyrolean State Government – Department of Water, Forestry and Energy Law", rolle: "Renewable energy contact point, permit under the TEG for installations above 500 kW" },
      { name: "TINETZ – Tiroler Netze", rolle: "Grid access and proof of a grid-compatible connection" },
    ],
  },
  agri: [
    "Agrivoltaics has a special role in the Tyrolean permit procedure: the energy authority uses an agrivoltaic installation as the reference installation that it assumes does not conflict with the regional programmes with agricultural reserve areas. Deviations from it are assessed individually. The benchmark is the funding criteria of the EAG investment grants ordinance: complete reversibility, a module lower edge of at least 80 cm, at least two metres between rows, agricultural main use, even distribution of modules and at most 7 % loss of land through structures and infrastructure.",
    "In addition, the authority requires an agricultural operating concept, an assessment of the landscape and the avoidance of high-quality soils. The state points to possible advantages such as hail protection, rainwater use and lower evaporation. For fruit growing, berry crops and grassland in the Inn valley, agrivoltaics can therefore be the most realistic route to a ground-mounted installation.",
  ],
  netz: {
    hinweis:
      "Like all Austrian grid operators, the Tyrolean distribution system operators publish their available feed-in capacities per substation quarterly; in the TEG procedure, a grid connection without adverse effects must be demonstrated.",
  },
  besonderheiten: [
    {
      titel: "High yields in the Inn valley, shading in narrow valleys",
      text: "PVGIS gives around 1,370 kWh/kWp in the central Inn valley – considerably more than in the Alpine foothills. In narrow side valleys, mountains shorten the hours of sunshine, especially in winter; near Kufstein, PVGIS gives only around 1,110 kWh/kWp. A site-specific yield calculation with a horizon profile is indispensable in Tyrol.",
    },
    {
      titel: "Ski areas and alpine PV",
      text: "The state highlights ski areas as particularly efficient because alpine installations deliver high yields in winter. High-alpine land and alpine pastures have enormous theoretical potential, but shape the landscape, are partly of high ecological value and difficult to develop; the potential study calls for careful examination here.",
    },
    {
      titel: "Landscape without a weighing of interests",
      text: "According to the state’s information sheet, the TEG does not provide for a weighing of interests if nature, landscape or townscape would be significantly impaired – the permit must then be refused. In tourist regions, a careful landscape assessment is therefore central.",
    },
  ],
  pacht: {
    begruendung:
      "Small available areas, agrivoltaics as the benchmark and higher construction and connection costs on slopes and in valleys limit the lease a project can bear. Previously affected land with a good grid connection in the Inn valley can achieve more.",
  },
  faq: [
    {
      q: "Can I lease my meadow in Tyrol for a solar park?",
      a: "Only in individual cases. Larger installations on meadows and arable land in Tyrol come up against the agricultural reserve areas of the regional programmes and strict requirements for the landscape. Realistic options are above all agrivoltaics with continued farming or land with prior use, for example next to transport infrastructure.",
    },
    {
      q: "How much lease is possible for PV land in Tyrol?",
      a: "Because of the small areas and the agrivoltaics requirements, the lease tends to be in the lower part of the usual range; well-connected, previously affected land in the Inn valley can achieve more. The lease calculator gives a first estimate.",
    },
    {
      q: "Does a solar park in Tyrol need zoning?",
      a: "Up to 250 kWp, special-area zoning is required in open land for more than 100 m² of collector area. According to the state’s procedural handbook, larger installations are approved in the electricity law procedure and do not need separate zoning – but the authority examines spatial planning programmes and the landscape there.",
    },
    {
      q: "When is a nature conservation permit required in Tyrol?",
      a: "Outside closed settlements, from more than 2,500 m² of contiguous built-up area. Along waters, in floodplain forests, wetlands and protected areas, the permit requirement applies regardless of size.",
    },
    {
      q: "What requirements does Tyrol set for agrivoltaics?",
      a: "The authority follows the EAG funding criteria: a module lower edge of at least 80 cm, two metres between rows, agricultural main use and at most 7 % loss of land. In addition, an agricultural operating concept and a landscape assessment are required.",
    },
    {
      q: "Where does Tyrol want to accelerate photovoltaics?",
      a: "The draft Tyrolean acceleration ordinance for photovoltaics provides for large car parks, landfills and ski areas. According to the information available, agricultural land is not intended as an acceleration area.",
    },
  ],
};

export default region;
