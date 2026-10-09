// Englische Fassung der Regionalseite Hessen (Sprachmodell) – Struktur wie die deutsche Datei.
const region = {
  seoTitel: "Solar park & agrivoltaics in Hesse: lease, law | ÖkoInvest",
  beschreibung:
    "Leasing land for a solar park in Hesse: ground-mounted PV ordinance, regional plans with soil value limits, deviation procedures and agrivoltaics – ground-mounted PV explained for owners.",
  lead:
    "In Hesse, regional planning decides more than elsewhere whether a solar park on arable land is possible. Soil value figures, priority areas for agriculture and municipal caps set the framework.",
  akzent: "with soil value and regional plan.",
  ertrag: {
    ort: "in the Wetterau near Friedberg",
    spanne: "around 1,040 to 1,090 kWh/kWp",
    hinweis:
      "Further PVGIS points: Hessian Ried near Groß-Gerau around 1,090 kWh/kWp, North Hesse near Fritzlar around 1,040 kWh/kWp (optimally tilted, fixed-mount modules, 14 % system losses).",
  },
  einleitung: [
    "At the end of 2018, like Bavaria and Baden-Württemberg before it, Hesse opened arable land and grassland in less-favoured areas for solar parks, though cautiously at first with 35 MW per year. Today, according to the LandesEnergieAgentur (the state energy agency), around **530,000 ha** of agricultural land in Hesse is classified as less-favoured. At the end of 2024, more than 320,000 PV installations with a combined capacity of around 4.7 GW were installed in the state, most of them on rooftops. According to the Fachagentur Wind und Solar, the state government aims to make 1 percent of the state’s area available for photovoltaics, with at least half of the capacity to be built on rooftops.",
    "For open land in Hesse, the regional planning of the three regional councils in Kassel, Giessen and Darmstadt is decisive above all. It works with specific soil value limits and clearly protects land with high yield potential. Owners of land with medium or weaker soils therefore often have good prospects; those farming top-quality soils less so.",
  ],
  recht: [
    {
      titel: "Less-favoured areas: open since 2018, nationwide standard since 2024",
      text: "The Hessian ground-mounted solar installations ordinance (FSV) of 19 November 2018 allowed bids on arable land and grassland in less-favoured areas, initially for **35 MW per calendar year**. With Solar Package I (May 2024), this land is in principle eligible for support nationwide; states can only exclude it by ordinance if more than 1 percent of agricultural land is covered. According to our research, there is no Hessian exclusion ordinance.",
    },
    {
      titel: "Central Hesse: policy paper with soil value limits (June 2025)",
      text: "The Giessen regional council summarised the requirements in its policy paper of 27 June 2025. It requires an assessment of alternatives and sets an order of priority: first remaining land in commercial areas, then reserve areas for ground-mounted PV, then reserve areas for agriculture. In priority areas for agriculture, a deviation procedure must be examined; soils with soil values predominantly **above 60**, in less-favoured areas already **above 50**, are usually excluded there.",
    },
    {
      titel: "Central Hesse: at most 2 percent of agricultural land per municipality",
      text: "The Central Hesse energy sub-regional plan limits the land take by ground-mounted PV per municipality to **2 percent** of the priority and reserve areas for agriculture. The Giessen regional council regards this as a fundamental principle of the plan from which no deviation is possible. Privileged installations along motorways and railway lines and installations under 5 ha are also counted; for agrivoltaics, only the share of land actually taken out of farming counts, usually around 10 to 15 percent.",
    },
    {
      titel: "North-east Hesse: guide value of 45 for the yield index",
      text: "The Kassel regional council steers ground-mounted PV towards agricultural land of lower soil quality; an average **yield index (Ertragsmesszahl) of 45** per are serves as the threshold. For the privileged 200-metre corridors along motorways and two-track railway lines, the regional council provides potential maps for each district. A new draft regional plan for North-east Hesse was on public display from October to November 2024.",
    },
    {
      titel: "Decree of April 2025: deviation for privileged corridors",
      text: "On 15 April 2025, the highest state planning authority issued a decree that eases the deviation procedure for installations in the privileged strips under § 35(1) no. 8 b BauGB that lie in priority areas for agriculture. The exact conditions follow from the text of the decree; in individual cases, the responsible regional council provides information.",
    },
  ],
  kulisse: {
    text: "The Hessian land categories can be read well from the regional plans: reserve areas for ground-mounted PV are coordinated in spatial planning terms, reserve areas for agriculture are possible with good justification, and priority areas for agriculture only exceptionally and only without top-quality soils. In addition, Central Hesse caps expansion per municipality. Before any negotiation, it is therefore worth looking at the soil value figures of your own plots and at what the regional plan sets out.",
    gut: [
      "Reserve areas for ground-mounted PV in the regional plan (e.g. Central Hesse energy sub-regional plan)",
      "Reserve areas for agriculture with below-average soil value figures",
      "Land below a yield index of 45 (North-east Hesse) or with a soil value below 50 to 60 (Central Hesse)",
      "Privileged 200-metre corridors along motorways and two-track railway lines",
    ],
    schwierig: [
      "Priority areas for agriculture with high to very high yield potential (site suitability A1/G1)",
      "Municipalities that have already used up the 2 % limit in Central Hesse",
      "Natura 2000 sites, nature reserves, protected biotopes",
      "Sites without a comprehensible assessment of alternatives in the municipal area",
    ],
  },
  ablauf: {
    text: "The municipality passes the resolution to draw up a plan, amends the land-use plan and draws up a development plan. In parallel, the regional council as the higher state planning authority checks compatibility with the regional plan. If the land lies in a priority area for agriculture, a deviation procedure is required before the development plan, decided by the regional assembly. The building permit is then issued by the lower building supervisory authority at the district or the special-status town. Because the criteria differ by administrative district, early coordination with the responsible regional council is worthwhile.",
    behoerden: [
      { name: "Municipality / town", rolle: "Land-use plan, development plan, assessment of alternatives in the municipal area" },
      { name: "Kassel regional council (North-east Hesse)", rolle: "Higher state planning authority, North-east Hesse regional plan, deviation" },
      { name: "Giessen regional council (Central Hesse)", rolle: "Higher state planning authority, energy sub-regional plan, policy paper on ground-mounted PV" },
      { name: "Darmstadt regional council (South Hesse)", rolle: "Higher state planning authority for South Hesse" },
      { name: "District – lower building supervisory and nature conservation authority", rolle: "Building permit, nature conservation matters" },
    ],
  },
  agri: [
    "In Hesse, agrivoltaics is above all an instrument for being able to plan at all in agriculturally valuable locations. In Central Hesse, agrivoltaic installations in priority areas for agriculture are compatible with spatial planning without a deviation procedure if largely unrestricted farming is demonstrated on at least **80 percent of the planning area** and no soils with high yield security are affected. For the 2 % limit, only the share of land taken out of agriculture counts. The Giessen regional council refers to DIN SPEC 91434 for arable farming and DIN SPEC 91492 for grazing.",
    "Hesse is a pioneer in viticulture: according to the state, Germany’s first agrivoltaic installation over vines in a vineyard stands at Geisenheim University in the Rheingau, and the environment ministry is funding the “VitiVoltaic” project from 2020 to 2026 with up to €300,000. Investment support from the state for agrivoltaics is in principle possible via the ERDF programme “Innovative Energy Projects”, but only if EEG support is waived and the approach is sufficiently innovative. The LandesEnergieAgentur advises on agrivoltaics.",
  ],
  netz: {
    hinweis:
      "In Hesse, the distribution grid is divided among many regional operators. Which grid operator is responsible for your land and where feed-in capacity is available should be clarified before any lease commitment.",
  },
  besonderheiten: [
    {
      titel: "Three administrative districts, three yardsticks",
      text: "Whether land is suitable in Hesse depends noticeably on the administrative district: North-east Hesse works with the guide value of a yield index of 45, Central Hesse with soil value limits and a 2 % cap per municipality. According to the Kassel regional council, at the beginning of 2024 installations in priority areas for agriculture could only be built in North-east Hesse with a deviation, and in South and Central Hesse after a case-by-case assessment.",
    },
    {
      titel: "Obligation to assess alternatives",
      text: "The Giessen regional council requires an assessment of alternatives in every land-use planning procedure for ground-mounted PV, ideally as an overall spatial concept for the entire municipal area. Municipalities with such a concept can answer enquiries faster and with greater legal certainty.",
    },
    {
      titel: "Viticulture and special crops",
      text: "The Rheingau and the Bergstrasse are wine-growing regions. With the Geisenheim trial over vines, Hesse has practical experience of how agrivoltaics can be combined with permanent crops.",
    },
  ],
  pacht: {
    begruendung:
      "Irradiation is slightly below that of southern Germany, and regional planning often excludes good soils. On suitable land with a grid connection, there is nevertheless demand; in the individual case, the soil value figure, the regional plan and the grid are decisive.",
  },
  faq: [
    {
      q: "How much lease income does a solar park bring in Hesse?",
      a: "That depends on the land, the grid connection and the prospects of obtaining permits. Because soil quality helps decide whether a permit can be obtained in Hesse, medium and weaker sites in particular are interesting for project developers. Make sure you are guaranteed a fixed minimum amount per hectare and year.",
    },
    {
      q: "Has Hesse opened up the less-favoured areas?",
      a: "Yes, with the ground-mounted solar installations ordinance of November 2018, initially with 35 MW per year. Since Solar Package I, less-favoured areas have in principle been eligible for support nationwide; no Hessian exclusion ordinance is known.",
    },
    {
      q: "Which soil values are still possible for a solar park in Hesse?",
      a: "The Kassel regional council uses an average yield index of 45 per are as a guide. In Central Hesse, soils with a soil value predominantly above 60, or above 50 in less-favoured areas, are usually excluded in priority areas for agriculture.",
    },
    {
      q: "What does the 2 % limit in Central Hesse mean?",
      a: "In each municipality, ground-mounted PV may take up at most 2 percent of the priority and reserve areas for agriculture. Once the quota has been used up, a further installation is not possible under regional planning; the Giessen regional council rules out a deviation here.",
    },
    {
      q: "Do I need a deviation procedure in Hesse?",
      a: "If the land lies in a priority area for agriculture and is not overlaid by a reserve area for PV, usually yes. For privileged corridors along motorways and railway lines, a decree with simplifications has been in place since April 2025; separate rules apply to agrivoltaics in Central Hesse.",
    },
    {
      q: "Is agrivoltaics supported in Hesse?",
      a: "Investment support is in principle possible via the ERDF programme “Innovative Energy Projects” if EEG support is waived. In addition, the state funds research such as the viticulture project at Geisenheim University.",
    },
  ],
};

export default region;
