// Englische Fassung der Regionalseite Rheinland-Pfalz (Sprachmodell) – Struktur wie die deutsche Datei.
const region = {
  seoTitel: "Solar park & agrivoltaics in Rhineland-Palatinate: lease | ÖkoInvest",
  beschreibung:
    "Leasing land for a solar park in Rhineland-Palatinate: LEP IV with a 2 percent arable land limit, yield index, priority areas for agriculture and agrivoltaics in wine and fruit growing explained.",
  lead:
    "Rhineland-Palatinate is one of the states with the most awards in EEG tenders for ground-mounted PV. The State Development Programme steers this via the yield index, a state-wide limit for arable land and reserve areas in the regional plans.",
  akzent: "between vineyard slope and regional plan.",
  ertrag: {
    ort: "near Worms (Rhenish Hesse)",
    spanne: "around 1,090 to 1,110 kWh/kWp",
    hinweis:
      "A second PVGIS point near Mayen on the edge of the Eifel gives around 1,090 kWh/kWp; the Upper Rhine Graben is one of the sunnier locations in western Germany.",
  },
  einleitung: [
    "Rhineland-Palatinate is the most heavily forested German state – a good 40 percent of its area is wooded – and at the same time Germany’s wine state, with six wine-growing regions from the Ahr to the Palatinate. According to the State Statistical Office, in 2023 around 55 percent of agricultural land was arable, 35 percent permanent grassland and about 10 percent permanent crops such as vines and fruit. This mix also shapes solar planning: special crops, slopes and low mountain ranges require different answers than the arable plains of Rhenish Hesse.",
    "Rhineland-Palatinate has caught up strongly in EEG tenders for ground-mounted installations. According to the evaluation by the Fachagentur Wind und Solar, projects in the state received awards of 583 MW in 2025 – around 8 percent of the national volume and fourth place among the states. According to the State Climate Protection Act, the state aims to cover its electricity consumption entirely from renewable energy on balance by 2030.",
    "The spatial planning guardrails are set by the **fourth partial update of the State Development Programme (LEP IV)**, which came into force at the beginning of 2023. In January 2024, the interior ministry published a separate guide to planning and assessing ground-mounted PV from a spatial planning perspective. For owners, the decisive factors are above all the land’s yield index and whether it lies in a priority area for agriculture.",
  ],
  recht: [
    {
      titel: "LEP IV: reserve areas for ground-mounted PV in all regional plans",
      text: "With the 4th partial update, the regional plans must designate **reserve areas for ground-mounted PV**, including along linear infrastructure such as motorways, federal and state roads, railway lines or extra-high-voltage lines (Z 166 b). Priority areas for solar are also possible. In the core zones and buffer areas of the UNESCO World Heritage sites **Upper Middle Rhine Valley** and **Upper Germanic-Raetian Limes**, ground-mounted installations are excluded (Z 166 a); according to the guide, deviations from this are considered hopeless.",
    },
    {
      titel: "2 percent limit for arable land",
      text: "Under G 166 c, the use of arable land for further ground-mounted installations (reference date 31 December 2020) is to be limited state-wide to **2 percent of the arable area** and monitored. Individual municipalities may plan more, as long as local agriculture is not disproportionately affected. According to the guide, its interests are generally safeguarded if, when the 2 percent is exceeded, no priority areas for agriculture are used or no more than 5 percent of the local arable area in total.",
    },
    {
      titel: "Yield index as the yardstick",
      text: "Ground-mounted installations should primarily be built on low-yield, species-poor or previously affected arable land and grassland (G 166). The indicator used is the **yield index (Ertragsmesszahl, EMZ)**: according to the guide, the state average is 35, and land below this tends to be considered lower-yielding. What counts, however, is the comparison with the locally typical EMZ of the cadastral district. The values can be determined plot by plot from the real estate cadastre or via the State Tax Office.",
    },
    {
      titel: "Less-favoured areas: state ordinance since 2018, federal law today",
      text: "In 2018, Rhineland-Palatinate initially opened grassland in less-favoured areas for EEG bids with a state ordinance; the amendment at the end of 2021 increased the quota from 50 to 200 MW per year and included arable land of low soil quality. With Solar Package I (May 2024), less-favoured areas are in principle permitted nationwide, and the state ordinance is superseded in this respect. According to the guide, the implementation notes of the state ministries on agriculture, forestry and water management and nature conservation continue to apply in addition.",
    },
    {
      titel: "No state participation act for solar parks",
      text: "Unlike Lower Saxony, for example, Rhineland-Palatinate has, according to the current state of research, no law of its own on the financial participation of municipalities in solar parks. The voluntary payment under § 6 EEG of up to 0.2 ct/kWh to the host municipality applies, which in Rhineland-Palatinate is often part of the negotiations with the municipality.",
    },
  ],
  kulisse: {
    text: "The land categories in Rhineland-Palatinate are largely determined by the regional plans of the four planning associations and the Rhine-Neckar Regional Association. Priority areas for agriculture initially exclude ground-mounted PV; only a deviation procedure helps here. Favourable, on the other hand, are land with a below-average yield index, conversion sites and corridors along transport routes, for which the LEP expressly provides positive planning.",
    gut: [
      "Arable land and grassland with a yield index below the locally typical average",
      "200 m corridors along motorways, railway lines and extra-high-voltage lines, plus the 500 m strip of the EEG category",
      "Sealed conversion sites with little ecological function, such as former military or commercial land",
      "Landfills, where sealing and stability allow",
      "Reserve areas for ground-mounted PV in the updated regional plans",
    ],
    schwierig: [
      "Priority areas for agriculture – only via a deviation procedure, also for agrivoltaics",
      "Core zones and buffer areas of the Upper Middle Rhine Valley and Limes World Heritage sites",
      "Priority areas for the regional biotope network and securing raw materials",
      "Municipalities that have already planned more than 2 or 5 percent of their arable land for solar parks",
      "Steep, forested low mountain locations in the Eifel, Hunsrück, Westerwald and Palatinate Forest",
    ],
  },
  ablauf: {
    text: "In Rhineland-Palatinate, a solar park starts with a resolution of the local municipality (Ortsgemeinde); land-use planning usually lies with the collective municipality (Verbandsgemeinde). For larger projects, the district administration as the lower state planning authority checks in a simplified spatial planning review whether the project is compatible with the regional plan. If the land lies in a priority area, the higher state planning authority at SGD Nord or SGD Süd decides on a deviation; according to the guide, private individuals can also apply for this. A time limit with a defined subsequent agricultural use is a common argument.",
    behoerden: [
      { name: "Local municipality / collective municipality", rolle: "Development plan (local municipality), land-use plan (usually the collective municipality)" },
      { name: "District administration / independent city", rolle: "Lower state planning authority (simplified spatial planning review), nature conservation, building supervision" },
      { name: "SGD Nord (Koblenz) or SGD Süd (Neustadt an der Weinstraße)", rolle: "Higher state planning authority, deviation procedure" },
      { name: "Planning associations or Rhine-Neckar Regional Association", rolle: "Regional spatial plans, reserve and priority areas for ground-mounted PV" },
      { name: "Rural area service centres / Chamber of Agriculture", rolle: "Opinion on agricultural structure, assessment of yield capacity" },
    ],
  },
  agri: [
    "In Rhineland-Palatinate, agrivoltaics is above all interesting for **permanent crops**. The modules can protect vines and fruit from hail, heavy rain and sunburn – this is being studied by DLR Rheinpfalz in the Interreg Upper Rhine project on photovoltaics in viticulture, with pilot installations in Rhineland-Palatinate, Baden-Württemberg and Switzerland. In Grafschaft (Ahrweiler district), an agrivoltaic test installation over apple trees was built with state funding to study light management, yield and economic viability.",
    "In spatial planning terms, agrivoltaics in a priority area for agriculture is only compatible if largely unrestricted farming remains possible. Because the previous regional plans contained no rules on this, the guide also requires a deviation procedure for agrivoltaics in priority areas and recommends following DIN SPEC 91434. Important: mere grazing under a conventional solar park does not count as agrivoltaics within the meaning of the priority areas.",
  ],
  netz: {
    hinweis:
      "The distribution grids in Rhineland-Palatinate are spread over many operators. With the “Datenwerkstatt Rheinland-Pfalz” (data workshop), the environment ministry coordinates planning data from the grid operators; the connection question should be clarified early with the local operator.",
  },
  besonderheiten: [
    {
      titel: "World Heritage on the Middle Rhine and the Limes",
      text: "The Upper Middle Rhine Valley between Bingen and Koblenz and the Limes are off-limits for ground-mounted PV – including commercial and industrial areas within the World Heritage areas. Owners in these areas should check this before any project enquiry.",
    },
    {
      titel: "Yield index available plot by plot",
      text: "Rhineland-Palatinate provides the soil assessment data via a geodata service and the average EMZ per cadastral district via the State Tax Office. This makes it possible to assess, even before talking to the municipality, whether land is considered comparatively low-yielding.",
    },
    {
      titel: "Regional potential studies",
      text: "The planning associations are working on implementing the new reserve areas, for example with a potential study on ground-mounted PV by the Rheinhessen-Nahe planning association; in the Vorderpfalz, the Rhine-Neckar Regional Association maintains its own sub-regional plan for ground-mounted photovoltaics.",
    },
  ],
  pacht: {
    begruendung:
      "Above-average irradiation in the Upper Rhine Graben and lively participation in tenders support the lease; the arable land limit, priority areas for agriculture and small plots in the low mountain ranges have a dampening effect.",
  },
  faq: [
    {
      q: "Has Rhineland-Palatinate opened up the less-favoured areas?",
      a: "Yes, as early as 2018 by state ordinance, initially for grassland, and from the end of 2021 also for arable land of low soil quality. Since Solar Package I, less-favoured areas have in principle been permitted nationwide; the state ordinance has thereby lost importance.",
    },
    {
      q: "What does the 2 percent limit mean for my land?",
      a: "It is a state-wide principle: together, new solar parks should take up at most 2 percent of the state’s arable land. More may be possible in individual municipalities – up to 5 percent of the local arable area or outside priority areas for agriculture, the interests of agriculture are, according to the guide, generally considered safeguarded.",
    },
    {
      q: "My land lies in a priority area for agriculture – is a solar park still possible?",
      a: "Only via a deviation procedure at SGD Nord or Süd. There are prospects if only a small part of the priority area is affected, the installation is time-limited and agriculture is defined as the subsequent use. As things stand, agrivoltaics also needs a deviation there.",
    },
    {
      q: "How much lease income does a solar park bring in Rhineland-Palatinate?",
      a: "That depends on irradiation, grid connection, land size and yield index. Rhenish Hesse and the Vorderpfalz have good irradiation values, but land there is also particularly sought after for agriculture. A reliable assessment is only possible after examining the specific land.",
    },
    {
      q: "Is my vineyard suitable for agrivoltaics?",
      a: "This is being researched in principle, for example by DLR Rheinpfalz. Decisive factors are slope, row spacing, mechanised cultivation and the grid connection. To win an EEG award, the installation must meet the requirements for special solar installations.",
    },
    {
      q: "Must the municipality in Rhineland-Palatinate be given a share in the solar park?",
      a: "As things stand, there is no state law on this. The voluntary payment under § 6 EEG of up to 0.2 ct/kWh to the host municipality is customary.",
    },
  ],
};

export default region;
