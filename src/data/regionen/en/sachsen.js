// Englische Fassung der Regionalseite Sachsen (Sprachmodell) – Struktur wie die deutsche Datei.
const region = {
  seoTitel: "Solar park & agrivoltaics in Saxony: lease, law | ÖkoInvest",
  beschreibung:
    "Leasing land for a solar park in Saxony: ground-mounted PV and agrivoltaics on arable land, grassland and former mining land – regional plans, soil value limits, eligible land, process.",
  lead:
    "In Saxony, it is above all the regional plans and soil quality that decide whether a solar park on arable land is possible – the former lignite mining areas around Leipzig and in Lusatia show what can be done on previously affected land.",
  akzent: "with regional plan and soil value.",
  ertrag: {
    ort: "near Wurzen (Leipzig district)",
    spanne: "around 1,070 to 1,080 kWh/kWp",
    hinweis:
      "A second PVGIS point near Löbau (Upper Lusatia) gives around 1,070 kWh/kWp; on the ridges of the Ore Mountains, different values must be expected because of altitude, snow and terrain.",
  },
  einleitung: [
    "In 2023, around 6,500 farms in Saxony worked about 897,200 hectares of agricultural land. At 78.3 %, the share of arable land is significantly higher than the national average, and at an average of 138 hectares the farms are a good twice as large. The landscape ranges from the fertile loess areas of central Saxony through the heath and pond landscapes of Lusatia to the low mountain ranges of the Ore Mountains and the Vogtland – suitability for solar parks varies accordingly.",
    "Saxony opened arable land and grassland in less-favoured areas for EEG tenders by state ordinance as early as 2021. Since Solar Package I, the nationwide opening has applied, superseding the state ordinance. Today, the real steering in Saxony is done mainly through the State Development Plan and the regional plans of the four planning associations, some of which contain hard exclusion criteria for ground-mounted installations – right down to limit values for the soil value.",
    "At the same time, one of Europe’s largest solar parks is located in Saxony: the Witznitz energy park in the area south of Leipzig, with around 650 MW on a former lignite opencast mine. It shows the role former mining land plays in the Free State. For owners of agricultural land: good planning starts with a look at the applicable regional plan.",
  ],
  recht: [
    {
      titel: "Less-favoured areas: PVFVO 2021, superseded by federal law since May 2024",
      text: "The Saxon photovoltaic ground-mounted ordinance (PVFVO) came into force on 23 September 2021 and opened arable land and grassland in less-favoured areas with an annual cap of 180 MW; Natura 2000 sites were excluded. Since Solar Package I (16 May 2024), the new § 37c EEG has taken precedence: less-favoured areas are in principle open nationwide, and the Saxon annual cap no longer applies. The state could only impose restrictions if more than 1 % of agricultural land were covered by ground-mounted installations – according to the Free State, Saxony is still far from that.",
    },
    {
      titel: "State Development Plan: 35 % priority areas for agriculture",
      text: "Under objective 4.2.1.1 of the State Development Plan, the regional plans must designate at least **35 % of the regional agricultural area as priority areas for agriculture**. Large solar parks are usually excluded in these priority areas. According to the state planning guide, a deviation is not possible if it would reduce the share below 35 %. From a spatial planning perspective, however, agrivoltaics is considered compatible in principle even on priority and reserve areas for agriculture.",
    },
    {
      titel: "Regional plans with hard exclusions",
      text: "The **Leipzig-Westsachsen (2021)** regional plan excludes ground-mounted installations, among other things, on agricultural land with a **soil value above 50**, in priority areas for agriculture, green belts, cold air generation areas and areas at high risk of water erosion. The **Chemnitz Region** regional plan names as exclusions, among other things, arable values above 70, forest areas with a 200 m buffer and landscape-defining ridges and slopes. The **Oberlausitz-Niederschlesien (2023)** regional plan has so far refrained from making its own PV designations, but expects conflicts, for example with priority areas for agriculture – expressly not as a rule in the case of agrivoltaics.",
    },
    {
      titel: "Deviation: favourable factors are a soil value below 36 and up to 20 MW",
      text: "If an objective of spatial planning stands in the way, the Saxony State Directorate can permit a deviation. According to the planning guide, factors in favour of a positive decision include location within the EEG support category, a **soil value below 36**, a limit of **20 MW** and ruling out any threat to the existence of farms. Soils with soil values above 50 are only possible in absolutely exceptional cases.",
    },
    {
      titel: "Profit participation of municipalities by state law",
      text: "The Renewable Energy Profit Participation Act (EEErtrBetG) has been in force since 29 June 2024 and applies to ground-mounted installations from 1 MW approved from 1 January 2025. In the original version, operators pay the host municipality 0.1 cents per kilowatt hour fed in; individual agreements, for example under § 6 EEG, are possible. The act was amended in September 2025.",
    },
  ],
  kulisse: {
    text: "The Saxon land categories result from the interplay between the EEG category and spatial planning. State planning recommends an assessment of alternatives before using arable land; favourable are sites close to a grid connection point, along transport routes, next to high-voltage lines or wind farms and with low soil values. The exclusions differ considerably depending on the planning region.",
    gut: [
      "Former lignite mining areas south of Leipzig and in Lusatia",
      "Spoil heaps, closed landfills and sealed conversion sites",
      "Arable land with a low soil value in less-favoured areas",
      "Land along motorways, railway lines, high-voltage lines or wind farms",
      "Agrivoltaics also on land secured for agriculture (compatible with spatial planning)",
    ],
    schwierig: [
      "Priority areas for agriculture (at least 35 % of the agricultural area per region)",
      "Soils with a soil value above 50 (Leipzig-Westsachsen: excluded)",
      "Regional green belts, green buffers and cold air generation areas",
      "Landscape-defining hilltops, ridges and slopes, forest",
      "Priority areas for lignite mining, flood protection, species and biotope protection",
    ],
  },
  ablauf: {
    text: "A solar park in Saxony usually needs a development plan from the municipality. State planning recommends that municipalities draw up a site concept, for which the planning guide contains a template. In the procedure, the responsible regional planning association and the Saxony State Directorate as the spatial planning authority give their opinions; if an objective stands in the way, a deviation procedure at the State Directorate is required, which the municipality can apply for itself. The lower agricultural authority gives an opinion on agricultural structure, and the district office is involved as building and nature conservation authority. According to the planning guide, you should involve the grid operator as early as the first project idea.",
    behoerden: [
      { name: "Town / municipality", rolle: "Site concept, land-use and development plan, possibly application for a deviation" },
      { name: "Regional planning association (four regions)", rolle: "Regional plan with exclusion criteria, opinion" },
      { name: "Saxony State Directorate", rolle: "Spatial planning authority, deviation procedure" },
      { name: "District office / independent city", rolle: "Building supervision, nature conservation, lower agricultural authority" },
    ],
  },
  agri: [
    "Saxon state planning sees agrivoltaics as a contribution to reconciling agriculture and photovoltaics. According to the 2024 planning guide, agrivoltaic installations are in principle also possible on priority and reserve areas for agriculture from a spatial planning perspective; the Oberlausitz-Niederschlesien regional plan also generally expects no conflict with agriculture in the case of agrivoltaics. For land with good soils, where a conventional solar park fails because of the soil value, agrivoltaics is therefore often the more realistic route.",
    "Smaller agrivoltaic installations up to 2.5 hectares can be privileged without a development plan under § 35(1) no. 9 BauGB if they are spatially and functionally linked to a farm. The State Office for Environment, Agriculture and Geology has published information on agrivoltaics, and the agriculture ministry provides information on the legal framework. With rapeseed accounting for 16.1 % of arable land and a high share of cereals, arable crops and grassland are the main starting point.",
  ],
  netz: {
    hinweis:
      "MITNETZ STROM is the distribution system operator in large parts of Saxony, SachsenNetze in Dresden and eastern Saxony; in larger cities there are also municipal grid companies. In the MITNETZ area, the share of renewable energy in electricity consumption was already 113 % in 2024.",
  },
  besonderheiten: [
    {
      titel: "Witznitz energy park: a solar park on a former opencast mine",
      text: "In the area south of Leipzig, the Witznitz energy park with around 650 MW, spread over about 5 km², was connected to the grid in 2024 on a former lignite opencast mine. For neighbouring regions this means: former mining land is used preferentially, and agricultural land has to hold its own through proximity to the grid, soil quality and acceptance.",
    },
    {
      titel: "The planning region decides",
      text: "Whether arable land is possible depends heavily on the region in Saxony: Leipzig-Westsachsen draws the line at a soil value of 50, the Chemnitz region at an arable value of 70, and Oberlausitz-Niederschlesien has no PV steering of its own so far. It is worth checking the regional plan map for your own plot.",
    },
    {
      titel: "The less-favoured area categories are being updated",
      text: "The Saxon categories of less-favoured areas were adjusted on 1 January 2023 and can be viewed via the Free State’s map services. The map also overlays forest, settlements and water bodies; what counts is the actual use of the plot.",
    },
  ],
  pacht: {
    begruendung:
      "Good irradiation and many previously affected sites contrast with strict regional planning exclusions on good soils; the range depends heavily on region, soil value and grid connection.",
  },
  faq: [
    {
      q: "Has Saxony opened up the less-favoured areas for solar parks?",
      a: "Yes, as early as 2021 with the PVFVO and an annual cap of 180 MW. Since Solar Package I in May 2024, the nationwide opening under § 37c EEG has applied, and the Saxon cap has thus been dropped.",
    },
    {
      q: "Which soil value is too high for a solar park in Saxony?",
      a: "That is regulated by the regional plan. In Leipzig-Westsachsen, land with a soil value above 50 is excluded, in the Chemnitz region arable values above 70. For deviations, a soil value below 36 is considered a favourable factor.",
    },
    {
      q: "How much lease does a solar park pay in Saxony?",
      a: "That depends on the region, soil value, grid connection and marketing. Within the usual range, Saxony is in the middle; a reliable figure is only available for the specific land.",
    },
    {
      q: "My land lies in a priority area for agriculture – is that the end of it?",
      a: "For a conventional solar park, usually yes. However, Saxon state planning considers agrivoltaics compatible in principle even there. A deviation is possible, but not if the regional share of priority areas would fall below 35 %.",
    },
    {
      q: "Does the municipality in Saxony receive money from the solar park?",
      a: "Yes. Under the Saxon Profit Participation Act, operators of new ground-mounted installations from 1 MW pay the host municipality an amount per kilowatt hour fed in; alternatively, individual agreements are possible. The money is paid by the operator, not the owner.",
    },
    {
      q: "Who decides on a solar park in Saxony?",
      a: "The municipality, via the development plan. The regional planning association and the Saxony State Directorate check spatial planning, and the district office checks building and nature conservation matters.",
    },
  ],
};

export default region;
