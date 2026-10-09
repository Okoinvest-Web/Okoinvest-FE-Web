// Englische Fassung der Regionalseite Vorarlberg (Sprachmodell) – Struktur wie die deutsche Datei.
// Befristete Fristen-Einträge (fristenAT) übersetzt die Regionalseite selbst über das Faktenregister.
const region = {
  seoTitel: "Solar park & agrivoltaics in Vorarlberg: lease, law | ÖkoInvest",
  beschreibung:
    "Leasing land for a solar park in Vorarlberg: ground-mounted PV only as a special zone, the state green zone in the Rhine valley and Walgau, permits above 500 kWp, acceleration areas.",
  lead:
    "Vorarlberg has little free valley floor and protects it with state green zones. Ground-mounted PV is therefore the exception – with opportunities on previously affected land and along infrastructure.",
  akzent: "with green zone and limits.",
  ertrag: {
    ort: "in the Rhine valley near Hohenems",
    spanne: "around 1,130 kWh/kWp in the Rhine valley to 1,200 kWh/kWp in the Walgau",
    hinweis:
      "According to PVGIS, the Walgau yields slightly more than the Rhine valley. In side valleys such as the Montafon or the Bregenzerwald, the yield depends heavily on shading by the horizon.",
  },
  einleitung: [
    "After Vienna, Vorarlberg is the smallest Austrian state, but it is densely populated: a good 412,000 people live on around 2,600 km², and the permanent settlement area covers only about 22 percent of the state’s area. Agricultural land amounts to around 70,000 hectares, mainly grassland and alpine pastures. Flat land is concentrated in the Rhine valley and the Walgau – exactly where settlements, industry, transport and agriculture compete for every square metre.",
    "Since the 1970s, the state has protected the remaining open spaces on the valley floors with **supra-local open spaces**, the so-called state green zone (Landesgrünzone) in the Rhine valley and the Walgau. In its 2019–2024 work programme, the state government also stated that no PV installations should be built on grassland and arable land in the future either. **Conventional solar parks on agricultural land are therefore practically not provided for in Vorarlberg.**",
    "That does not mean ground-mounted PV is ruled out. With the amendment LGBl. No. 21/2025, Vorarlberg introduced acceleration areas, shorter decision deadlines and procedural simplifications in April 2025, which expressly favour artificial, sealed and previously affected land. For owners of landfills, extraction sites, storage areas or land along motorways and railways, this can be interesting.",
  ],
  recht: [
    {
      titel: "Zoning as a special area in open land",
      text: "Vorarlberg’s Spatial Planning Act (RPG) has no separate PV zoning (Widmung). Under § 18(4) RPG, areas for installations generating energy from renewable sources, substations and transformer stations, among others, can be zoned as special areas. In the agricultural zone, on the other hand, building is only permitted insofar as it is necessary for soil-dependent agricultural and forestry use.",
    },
    {
      titel: "State green zone in the Rhine valley and Walgau",
      text: "The ordinances on supra-local open spaces on the valley floors of the Rhine valley and the Walgau secure land for a functioning natural balance, the landscape, local recreation and productive agriculture. In these areas, the municipalities may only zone open space, transport areas or reserved areas. In addition, there are supra-local open spaces for flood protection in the Rhine valley.",
    },
    {
      titel: "Electricity law: permit above 500 kWp",
      text: "Under § 5 of the state Electricity Industry Act, generating installations above 100 kW require a permit; for photovoltaics a higher threshold of more than 500 kWpeak applies. For energy transition projects, the authority must confirm that the application is complete within 30 days, or within 45 days outside acceleration areas (§ 19b).",
    },
    {
      titel: "Nature conservation: open landscape and shore protection",
      text: "Under § 33 of the Nature Conservation and Landscape Development Act, buildings with more than 800 m² of built-up area in the open landscape, among others, require a permit. Shore protection under § 24 covers a 500 m wide shore strip at Lake Constance, 50 m at other standing waters and 20 m along watercourses outside built-up areas.",
    },
    {
      titel: "Acceleration areas and short deadlines since April 2025",
      text: "Since 3 April 2025, the state government can designate acceleration areas for renewable energy in a state spatial plan under § 9 RPG – primarily on artificial, sealed or previously affected land, excluding protected areas and bird migration routes. There, procedural simplifications under nature conservation law apply (§ 56d). For PV on buildings and artificial structures, decision deadlines of three months apply, and of one month with deemed approval up to 100 kW (§ 56g).",
    },
    {
      titel: "EAG deduction of 25 % on grassland",
      text: "On agricultural land and grassland, the award value of the EAG market premium (Austria’s Renewable Expansion Act) is reduced by 25 % (§ 33 EAG). Exemptions include landfills, contaminated sites, mining and infrastructure sites as well as qualified agrivoltaic installations – which fits Vorarlberg’s approach of steering ground-mounted PV towards previously affected land.",
    },
  ],
  kulisse: {
    text: "The land available for ground-mounted PV in Vorarlberg is very limited. On the valley floors of the Rhine valley and the Walgau, a large part of the flat land lies in the state green zone, plus flood protection open spaces, marshland (Riede) and protected areas. Outside the valleys, slopes, forest and alpine pastures dominate. Realistic options are above all sites with prior use.",
    gut: [
      "Landfills, extraction and storage areas outside the green zone",
      "Land along motorways, expressways and railway lines",
      "Artificial structures, car parks and commercial land",
      "Future acceleration areas under § 9 RPG",
    ],
    schwierig: [
      "Supra-local open spaces (state green zone) in the Rhine valley and Walgau",
      "Supra-local open spaces for flood protection in the Rhine valley",
      "500 m shore strip at Lake Constance and protection strips along waters",
      "Agricultural zone and alpine pastures",
      "Protected areas, marshland and forest",
    ],
  },
  ablauf: {
    text: "A ground-mounted project in Vorarlberg starts with the question of whether the land lies in a supra-local open space. If it does not, the municipality can zone a special area for energy generation in the zoning plan (Flächenwidmungsplan); the state reviews this as supervisory authority. In parallel, the nature conservation permit, for more than 500 kWp the electricity law permit, and possibly water and forestry law must be clarified. In future acceleration areas, shorter deadlines and a simplified nature conservation assessment are to apply.",
    behoerden: [
      { name: "Municipality (municipal council)", rolle: "Zoning plan, zoning as a special area" },
      { name: "Vorarlberg state government", rolle: "Supervision of zoning, state spatial plans (state green zone, acceleration areas)" },
      { name: "District authority (Bezirkshauptmannschaft)", rolle: "Nature conservation procedure under the Nature Conservation and Landscape Development Act" },
      { name: "Vorarlberger Energienetze", rolle: "Grid access and connection point" },
    ],
  },
  agri: [
    "We could not find a specific Vorarlberg regulation or funding scheme for agrivoltaics. Legally, an agrivoltaic installation remains a generating installation that needs suitable zoning; in the agricultural zone only buildings for soil-dependent agriculture are permitted, and in the state green zone the municipalities’ room for manoeuvre is limited. Agrivoltaics is therefore not a lever for getting around the green zone in Vorarlberg.",
    "Where zoning is possible, agrivoltaics can still make sense: for qualified installations that do not impair the main agricultural use, or only slightly, the 25 % deduction from the EAG market premium can be waived. In a grassland state like Vorarlberg, the most suitable concepts are those in which mowing or grazing continues under the modules, for example with vertical module rows.",
  ],
  netz: {
    hinweis:
      "Like all Austrian grid operators, Vorarlberger Energienetze publishes its available feed-in capacities per substation quarterly on ebutilities.at.",
  },
  besonderheiten: [
    {
      titel: "State green zone since 1977",
      text: "The supra-local open spaces on the valley floor of the Rhine valley were designated in 1977 to secure the natural balance, landscape, local recreation and productive agriculture. Since then they have been a central instrument of Vorarlberg’s spatial planning and severely restrict large installations in the valleys.",
    },
    {
      titel: "Lake Constance and shore protection",
      text: "At Lake Constance, a 500 m wide shore protection strip applies outside built-up areas, 50 m at other lakes and 20 m along watercourses. Ground-mounted installations on the lake shore are therefore hardly conceivable.",
    },
    {
      titel: "Priority for rooftops and infrastructure",
      text: "Since 2025, Vorarlberg has above all shortened procedures for PV on buildings and artificial structures and relies on sealed and previously affected land for acceleration areas. For landowners with such land, this can result in faster procedures.",
    },
  ],
  pacht: {
    begruendung:
      "Because there are very few ground-mounted projects, there is no reliable regional trend for Vorarlberg. In the individual case, the possibility of zoning, prior use and grid connection are decisive.",
  },
  faq: [
    {
      q: "Can I lease agricultural land in Vorarlberg for a solar park?",
      a: "Only rarely. In the state green zone of the Rhine valley and the Walgau, municipalities may only zone open space, transport areas or reserved areas, and in the agricultural zone only buildings for agriculture are permitted. Previously affected land outside the green zone has the best chances.",
    },
    {
      q: "How much lease is possible in Vorarlberg?",
      a: "Because there are so few projects, a regional trend cannot be stated seriously. Decisive are the possibility of zoning, size, prior use and grid connection; the lease calculator gives an orientation.",
    },
    {
      q: "When does a PV installation in Vorarlberg need an electricity law permit?",
      a: "For photovoltaics above 500 kWpeak. For other generating installations, the threshold is 100 kW.",
    },
    {
      q: "Are there acceleration areas for photovoltaics in Vorarlberg?",
      a: "The legal basis has existed since April 2025: the state government can designate acceleration areas in a state spatial plan, primarily on artificial, sealed or previously affected land. At the time of research, no such state spatial plan could be found in the Legal Information System (RIS).",
    },
    {
      q: "Which nature conservation rules apply to ground-mounted PV in Vorarlberg?",
      a: "In the open landscape, buildings with more than 800 m² of built-up area, among others, require a permit. At Lake Constance a 500 m wide shore protection strip applies, at other lakes 50 m and along watercourses 20 m outside built-up areas.",
    },
  ],
};

export default region;
