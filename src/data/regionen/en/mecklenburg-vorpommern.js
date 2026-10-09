// Englische Fassung der Regionalseite Mecklenburg-Vorpommern (Sprachmodell) – Struktur wie die deutsche Datei.
const region = {
  seoTitel: "Solar park & agrivoltaics in Mecklenburg-Western Pomerania | ÖkoInvest",
  beschreibung:
    "Leasing land for a solar park in Mecklenburg-Western Pomerania: deviation procedure, 10,000 ha quota, soil point limit and citizen participation – what applies to ground-mounted PV in 2026.",
  lead:
    "Mecklenburg-Western Pomerania has plenty of land but protects arable land strictly. Solar parks on farmland are usually only possible via a deviation procedure, and since April 2026 new, stricter criteria have applied.",
  akzent: "with quota and criteria.",
  ertrag: {
    ort: "near Neubrandenburg",
    spanne: "around 1,000 to 1,060 kWh/kWp",
    hinweis:
      "South-west Mecklenburg is at the lower end (around 1,000 kWh/kWp near Ludwigslust), Western Pomerania and Rügen at the upper end (around 1,050 to 1,060 kWh/kWp).",
  },
  einleitung: [
    "Just under 60 percent of the state’s area is used for agriculture, around 1.35 million hectares, three quarters of it arable land. With an average of 283 hectares, farms are the largest in Germany (national average: 65 hectares). For solar parks this means: an owner or farmer often negotiates over contiguous areas that elsewhere would first have to be put together from many individual plots.",
    "Nevertheless, Mecklenburg-Western Pomerania is not an easy solar state when it comes to arable land. As an objective of spatial planning, the **State Spatial Development Programme (LEP M-V) 2016** only allows ground-mounted PV on agricultural land in a **110-metre strip** on either side of motorways, federal roads and railway lines. Land with a soil value of 50 or more may not be converted at all. Everything else is only possible via a **deviation procedure** (Zielabweichungsverfahren). For this, the state government has released a land quota since 2021, which was doubled to 10,000 hectares in April 2026.",
    "In mid-2025, a good 4.5 GW of photovoltaics was installed in the state. The LEP and the regional spatial development programmes are currently being updated. According to the interior ministry, the area restrictions for solar parks are not to be dropped entirely, but changed considerably. Until then, the criteria for deviation procedures serve as a transitional solution.",
  ],
  recht: [
    {
      titel: "LEP 2016: arable land only in the 110-metre strip, taboo from soil value 50",
      text: "Programme clause 5.3 (9) LEP M-V: agricultural land may only be used for solar parks in a strip of 110 metres on either side of motorways, federal roads and railway lines (objective). Under programme clause 4.5 (2), agricultural use from a soil value of 50 may not be converted to other uses (objective). Objectives of spatial planning are binding on the municipality and cannot be overridden by weighing.",
    },
    {
      titel: "Deviation: quota of 10,000 hectares since April 2026",
      text: "Outside these categories, a solar park on farmland requires a deviation granted by the economics ministry as the highest state planning authority. New criteria have applied since 13 April 2026. The quota was increased by 5,000 to **10,000 hectares**. Requirements include the documented consent of the municipality and the farmer, the **operating company’s registered office in the state**, at most **150 hectares** per installation (total planned area), financial participation for the municipality or citizens, and the possibility of returning the land to agricultural use.",
    },
    {
      titel: "Soil points: upper limit lowered from 40 to 25",
      text: "The planned areas may have an average of at most **25 soil points** (Bodenpunkte), grassland at most 30. At least 80 percent of the area must be below these values. Previously the limit was 40 soil points. The new limit applies immediately to applications after the criteria were announced; the other criteria only from the seventh month thereafter (transitional rule).",
    },
    {
      titel: "Participation act applies to solar parks from 1 MW since 2026",
      text: "The revised **Citizens’ and Municipalities’ Participation Act (BüGembeteilG M-V)** of 23 April 2026 covers ground-mounted installations from 1,000 kW for the first time. The developer must offer the host municipality €1,000 per full megawatt each year and the residents also €1,000 per megawatt, as a credit on the electricity bill or as a direct payment. If no agreement is reached, a substitute payment of €2,000 per megawatt becomes due. Exemptions include citizens’ energy companies and special solar installations under § 37(1) no. 3 EEG, i.e. agrivoltaics and peatland PV, for example.",
    },
    {
      titel: "Less-favoured areas: EEG category open, spatial planning decides",
      text: "Mecklenburg-Western Pomerania did not use the former opening clause for less-favoured areas. Since Solar Package I (May 2024), they have in principle been eligible for support nationwide, as long as a state does not restrict them by ordinance under § 37c EEG. According to our research, no such ordinance is known for Mecklenburg-Western Pomerania. Important: eligibility under the EEG does not replace spatial planning. The 110-metre strip and the deviation procedure also apply in less-favoured areas.",
    },
  ],
  kulisse: {
    text: "The criteria of April 2026 name positive areas on which solar parks can be permitted, and areas in which a deviation is ruled out. On farmland outside the positive list, a project should also benefit the state: for example grid-supportive with storage, with regional supply to commercial and industrial areas, or integrated into hydrogen or heat projects.",
    gut: [
      "110-metre strips along motorways, federal roads and railway lines (compliant with objectives) and the 200-metre EEG corridor with an easier deviation",
      "Rehabilitated old waste deposits, closed landfills, sealed and conversion land",
      "Land combined with wind farms, biogas, electrolysers or storage",
      "Land connected to industrial and commercial areas, suitable peatland with rewetting",
      "Sandy, low-yield sites below 25 soil points (grassland below 30)",
    ],
    schwierig: [
      "Land with a soil value of 50 or more – excluded by state planning",
      "Priority and reserve areas for nature conservation and landscape management",
      "Priority areas for coastal and flood protection, flood polders",
      "Priority areas for drinking water protection and drinking water protection zones I and II",
      "Installations over 150 hectares of planned area and projects without the operating company’s registered office in the state",
    ],
  },
  ablauf: {
    text: "In Mecklenburg-Western Pomerania, solar parks of 5 hectares or more are considered spatially significant. The municipality must notify the responsible Office for Spatial Planning and State Planning of the preparation of a land-use plan (§ 17 LPlG). On the basis of this notification, the office usually already states whether an objective of spatial planning stands in the way. If so, the interior ministry recommends initially working out the development plan only as far as necessary for the deviation application. The application is submitted by the municipality, or by the developer for privileged projects. Only after a positive decision by the economics ministry is the full development plan procedure with environmental report worthwhile. In parallel, a participation agreement under the BüGembeteilG must be concluded within the statutory deadline.",
    behoerden: [
      { name: "Municipality / administrative office (Amt)", rolle: "Resolution to draw up a plan or written consent, land-use and development plan, urban development contract, participation agreement" },
      { name: "Office for Spatial Planning and State Planning (lower state planning authority)", rolle: "Planning notification under § 17 LPlG, state planning opinion" },
      { name: "Ministry for Economic Affairs, Infrastructure, Tourism and Labour (highest state planning authority)", rolle: "Decision on deviation procedures and the quota" },
      { name: "District (building supervision, lower nature conservation and water authority)", rolle: "Building permit, impact mitigation rules, species protection, water law issues for peatland PV" },
      { name: "Ministry for Climate Protection, Agriculture, Rural Areas and Environment", rolle: "Co-author of the soil point and peatland criteria" },
    ],
  },
  agri: [
    "Mecklenburg-Western Pomerania is comparatively open to agrivoltaics: according to the criteria of April 2026, projects in which commercial farming continues as the primary and permanent use and photovoltaics is only added as a secondary use **do not need a deviation procedure**. For this, agricultural use must be permanently guaranteed by contract and anchored as a condition in the building permit. The interior ministry assesses development plans for agrivoltaics as “generally” compliant with objectives, but they must still be notified.",
    "Two points are important for farmers. As a special solar installation, agrivoltaics is exempt from the participation act, which lowers the project’s running costs. Farm-related agrivoltaics up to 2.5 hectares under § 35(1) no. 9 BauGB is not considered spatially significant and is not bound by objectives. Large arable farms can therefore test agrivoltaics step by step at several sites. Which crops and systems (vertical rows, elevated) fit depends on crop rotation and machine widths.",
  ],
  netz: {
    vnb: ["E.DIS Netz", "WEMAG Netz", "municipal utility grids (e.g. Rostock, Schwerin, Neubrandenburg)"],
    hinweis:
      "The state requires solar parks to be built as close to consumption and as grid-compatibly as possible. On farmland outside the positive categories, a grid-supportive design with storage is one of the criteria with which a project can establish the state’s interest.",
  },
  besonderheiten: [
    {
      titel: "Peatland PV only with permanent rewetting",
      text: "The state has many drained peat sites under agricultural use. Since April 2026, suitable peatland has been on the positive list, but only with **permanent rewetting that enables peat growth**. Solar parks should preferably lie on the edges of carbon-rich soils and be accessed from outside. For owners, peatland PV can be a source of income on land that would otherwise hardly be usable after rewetting.",
    },
    {
      titel: "Operators tied to the state",
      text: "A special feature of the deviation criteria is that the operating company must have its registered office in the state. Project companies are therefore often founded with their registered office in Mecklenburg-Western Pomerania. For landowners this changes little in the lease, but it should be taken into account in the contract.",
    },
    {
      titel: "Coast, lagoons and flood protection",
      text: "Along the Baltic coast, lagoons (Bodden) and bays (Haffs), there are priority areas for coastal and flood protection and flood polders. A deviation is ruled out there. Inland, large nature and landscape protection areas, for example in the Mecklenburg Lake District, further restrict the choice of site.",
    },
    {
      titel: "The municipality and residents share in the proceeds",
      text: "With the BüGembeteilG, the financial participation of the host municipality and its residents in solar parks from 1 MW is regulated by law. The deviation criteria additionally require participation for the municipality or citizens. This increases acceptance, but must be taken into account in the project calculation and therefore also in the lease.",
    },
  ],
  pacht: {
    begruendung:
      "Large, contiguous areas and good irradiation in Western Pomerania contrast with strict land criteria, the state participation requirements and a limited quota. The lease depends heavily on whether the land complies with the objectives or requires a deviation.",
  },
  faq: [
    {
      q: "Can I lease my arable land in Mecklenburg-Western Pomerania for a solar park?",
      a: "Yes, but usually only under conditions. A solar park on arable land only complies with the objectives in the 110-metre strip along motorways, federal roads and railway lines. Outside this, a deviation procedure is required: the land may have an average of at most 25 soil points (grassland 30), the installation may be at most 150 hectares, and the municipality and farmer must agree. From a soil value of 50, conversion is ruled out.",
    },
    {
      q: "How much lease income does a solar park bring in Mecklenburg-Western Pomerania?",
      a: "That depends on planning law, grid connection, size and marketing route. Land along a transport route that complies with the objectives is usually worth more than land for which a deviation still has to be applied for. We calculate specific values on this page from current market data.",
    },
    {
      q: "Has Mecklenburg-Western Pomerania opened up the less-favoured areas?",
      a: "The state itself did not open them before 2024. Since Solar Package I, however, they have in principle been permitted nationwide for the EEG tender, and we are not aware of a restriction ordinance for Mecklenburg-Western Pomerania. Spatial planning remains decisive: the 110-metre strip, the soil value 50 limit and the deviation criteria also apply there.",
    },
    {
      q: "What does the Citizens’ and Municipalities’ Participation Act change for solar parks?",
      a: "Since the revision of April 2026, developers of solar parks from 1 MW must offer the host municipality and the residents an annual participation of €1,000 per megawatt each. The act applies to installations for which the resolution to draw up the development plan was passed after it came into force. Agrivoltaics, peatland PV and citizens’ energy companies are exempt.",
    },
    {
      q: "Do I need a deviation for agrivoltaics in Mecklenburg-Western Pomerania?",
      a: "No, if farming continues as the primary and permanent use and this is secured by contract and as a condition of the building permit. The economics ministry clarified this in the criteria of April 2026. A development plan is still required for larger installations, and the planning must be notified to state planning.",
    },
    {
      q: "Is peatland PV possible in Mecklenburg-Western Pomerania?",
      a: "Yes, suitable peatland is on state planning’s positive list, but only with permanent rewetting that enables peat growth. Installations should preferably lie on the edge of carbon-rich soils. Legally protected peatlands are excluded.",
    },
  ],
};

export default region;
