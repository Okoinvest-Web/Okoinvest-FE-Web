// Englische Fassung der Regionalseite Bayern (Sprachmodell). Gleiche Struktur und Reihenfolge wie
// src/data/regionen/bayern.js; wird über uebersetze() darübergelegt (Quellen, Zahlen und Links bleiben aus
// der deutschen Datei). Landesbegriffe im Original mit Erklärung beim ersten Auftreten.
const region = {
  seoTitel: "Solar park & agrivoltaics in Bavaria: lease, law | ÖkoInvest",
  beschreibung:
    "Leasing land for a solar park in Bavaria: less-favoured areas, the state guidance on ground-mounted PV, regional planning, compensation and agrivoltaics – what landowners should know.",
  lead:
    "Bavaria is the German state with the most awards for ground-mounted PV. Anyone who wants to lease land here needs one thing above all: a municipality that plans along, and a site that fits the Bavarian criteria.",
  akzent: "with zoning and a concept.",
  ertrag: {
    ort: "in the Gäuboden near Straubing",
    spanne: "around 1,110 to 1,130 kWh/kWp",
    hinweis:
      "Further PVGIS points: Lower Franconia near Würzburg around 1,120 kWh/kWp, Landshut area around 1,110 kWh/kWp (optimally tilted, fixed-mount modules, 14 % system losses).",
  },
  eckdaten: { hauptstadt: "Munich" },
  einleitung: [
    "For years, Bavaria has been the most important market for ground-mounted photovoltaics in Germany. According to the analysis by the Fachagentur Wind und Solar (the federal agency for wind and solar), around **2,197 MW** – a good 30 percent of the capacity awarded nationwide – went to Bavaria in the 2025 tender rounds. The share is falling because other states are catching up, but the absolute volume has risen significantly since 2021. The reasons are comparatively high solar irradiation, land categories opened up early and an administration that has long been familiar with the subject.",
    "For landowners this means: demand for suitable arable land and grassland is high, but so is competition for grid connections and for the municipalities’ approval. Many municipalities now steer expansion through their own site concepts or criteria catalogues. Whether your land fits into such a framework is therefore often decided long before the first draft plan.",
    "Legally, almost every larger project in Bavaria goes through a development plan (Bebauungsplan) drawn up by the municipality. The key guidance comes from the joint notes of the state ministries on the “planning and regional-planning treatment of ground-mounted photovoltaic installations”, together with the State Development Programme (LEP) and the 18 regional plans.",
  ],
  recht: [
    {
      titel: "Less-favoured areas: open since 2017, nationwide standard since 2024",
      text: "Bavaria made early use of the state opening clause: its ground-mounted PV ordinance has applied since 1 January 2017 and was extended on 1 July 2020 to up to **200 awards per calendar year** in less-favoured areas. With Solar Package I (May 2024), arable land and grassland in less-favoured areas are in principle eligible for support nationwide; the states can now only exclude them by ordinance (opt-out), and only once more than 1 percent of agricultural land is covered by ground-mounted installations (from 2031: 1.5 percent). According to our research, there is no Bavarian exclusion ordinance.",
    },
    {
      titel: "State guidance: land-use planning is the rule",
      text: "According to the guidance of the Bavarian building ministry (StMB), ground-mounted installations are generally not privileged under § 35(1) BauGB (Federal Building Code) and, as other projects in the outer zone, are as a rule not permitted. Exceptions apply to the strips along motorways and two-track railway lines that are privileged under federal law. All other sites need a development plan, usually a project-related plan with an implementation contract, which can also regulate decommissioning and subsequent agricultural use.",
    },
    {
      titel: "Exclusion and restriction areas listed in the annex to the circular",
      text: "The guidance names **sites that are generally unsuitable**, including nature reserves, legally protected biotopes, meadow-bird breeding areas, flood plains, Alpine Plan zone C and **agricultural soils of above-average quality**. Considered to be of limited suitability are, among others, landscape protection areas (including former protection zones in nature parks), landscape priority areas and regional green belts, widely visible hilltops and slopes, and archaeological monuments.",
    },
    {
      titel: "State planning: previously used sites preferred, review from 30 ha",
      text: "The LEP provides for ground-mounted PV to be built preferably on sites already affected by prior use. The regional plans can designate priority and reserve areas for photovoltaics. According to the Energie-Atlas Bayern, ground-mounted installations are regularly incompatible with priority areas for agriculture, with the exception of agrivoltaics under DIN SPEC 91434. From around 30 ha, it is regularly examined whether a spatial compatibility assessment is required.",
    },
    {
      titel: "Compensation: since December 2024 usually no additional requirement",
      text: "The revised Bavarian guidance on the impact mitigation rules makes installations without additional compensation the norm, provided, among other things, that the footprint is at most 25 ha, less than 2.5 percent is sealed, the modules stand on driven piles and have at least 80 cm ground clearance. If the criteria are not met, the report says compensation of 10 percent of the area is applied. For owners this means fewer additional compensation areas, which would otherwise often come from their own land.",
    },
    {
      titel: "Municipal participation from 5 MW: mandatory since 2026",
      text: "Since 1 January 2026, developers of new ground-mounted PV installations above 5 MW must give municipalities a financial participation (BayWiVG, Bavaria’s wind and PV participation act). The value of the participation should be at least 0.2 to around 0.3 cents per kilowatt hour; the 0.2 cents can be provided through an agreement under § 6 EEG. Anyone who breaches the obligation can be ordered by official notice to pay a compensatory levy totalling 0.3 cents per kilowatt hour. According to the Bavarian ministry of economic affairs, exemptions include installations without EEG support, agrivoltaics and citizens’ energy companies. Citizen participation is voluntary. The payment is borne by the operator, not the landowner.",
    },
  ],
  kulisse: {
    text: "Bavarian practice follows three steps: strike out exclusion areas, weigh up restriction areas, then assess the suitable areas against criteria such as soil quality, visibility and grid connection. Many municipalities record the result in a site concept that later binds them in land-use planning. District governments such as that of Lower Franconia also provide planning aids with thematic maps; however, these explicitly do not designate priority or exclusion areas.",
    gut: [
      "Arable land and grassland of below-average soil quality, ideally in less-favoured areas",
      "Previously affected locations: along motorways, railway lines, commercial areas or high-voltage routes",
      "Land without long-distance visibility, for example in hollows or behind forest edges",
      "Sites within reach of a substation or medium-voltage grid with available capacity",
      "Land within a municipal site concept or a regional reserve area for PV",
    ],
    schwierig: [
      "Soils of above-average quality (exclusion criterion according to the state guidance)",
      "Meadow-bird breeding areas, flood plains, water protection areas with conflicting requirements",
      "Landscape protection areas and former nature park protection zones without a zoning concept",
      "Priority areas for agriculture in the regional plan (except agrivoltaics)",
      "Hilltops, slopes, Alpine Plan zones and areas with archaeological monuments",
    ],
  },
  ablauf: {
    text: "It almost always starts with a conversation with the mayor and the municipal council. If the municipality agrees, it passes a resolution to draw up a plan, amends the land-use plan (Flächennutzungsplan) in parallel and draws up a (usually project-related) development plan. The district government as the higher state planning authority and the regional planning association check compatibility with the LEP and the regional plan; the Office for Food, Agriculture and Forestry contributes the agricultural interests. The building permit is then issued by the district office or the independent city. An early enquiry to the grid operator is part of site selection in Bavaria; the circular expressly recommends taking grid capacity into account in the site concept.",
    behoerden: [
      { name: "Municipality / town", rolle: "Planning authority: site concept, land-use plan, development plan, urban development contract" },
      { name: "Regional planning association (18 regions)", rolle: "Regional plan, possibly priority/reserve areas or steering concepts for ground-mounted PV" },
      { name: "District government (e.g. Lower Franconia) – higher state planning authority", rolle: "State planning opinion, possibly spatial compatibility assessment, planning aids" },
      { name: "District office / independent city", rolle: "Building permit, lower nature conservation and monument protection authority" },
      { name: "Office for Food, Agriculture and Forestry (AELF)", rolle: "Public body representing agriculture and agricultural structure" },
    ],
  },
  agri: [
    "Agrivoltaics has a special planning status in Bavaria: in priority areas for agriculture, where conventional ground-mounted installations are regularly ruled out, an agrivoltaic installation under DIN SPEC 91434 can be compatible according to the Energie-Atlas. The state circular also points out that privileged status as part of a farm only comes into question if power generation remains subordinate and mainly benefits the farm. Larger agrivoltaic projects therefore usually also go through a project-related development plan.",
    "The Free State conducts its own research: on land of the Bavarian state estates in Grub, the Technology and Support Centre (TFZ) and the State Research Centre for Agriculture (LfL) operate an agrivoltaic test installation of around 940 kW, consisting of one vertical and two tracking systems. In the Hallertau, agrivoltaics is being tested over hops, and the State Institute for Viticulture and Horticulture is studying fruit and vegetable crops under modules. For farms with special crops such as hops, soft fruit or vegetables, agrivoltaics can therefore be a serious option to combine their own cultivation with lease income.",
  ],
  netz: {
    uenb: ["TenneT TSO", "Amprion (parts of Bavarian Swabia)"],
    vnb: ["Bayernwerk Netz", "LEW Verteilnetz", "N-ERGIE Netz", "numerous municipal utilities and regional suppliers"],
    hinweis:
      "Bayernwerk Netz reported the most feed-in points nationwide for 2024. With the “Einspeisesteckdose” (feed-in socket), Bayernwerk Netz and LEW Verteilnetz are testing pooled connection capacities at substations to make grid connections faster and cheaper.",
  },
  besonderheiten: [
    {
      titel: "Municipal site concepts",
      text: "The circular expressly recommends that municipalities adopt urban planning site concepts for their entire area. If your land lies within such a concept, the review of alternatives in the development plan has largely been done already. If it lies outside, things become considerably harder.",
    },
    {
      titel: "Meadow birds and peatland",
      text: "Meadow-bird breeding areas are an exclusion criterion in Bavaria. Peat soils with a largely degraded soil structure, by contrast, are listed as restriction areas – so they are not excluded from the outset but must be weighed up case by case.",
    },
    {
      titel: "Landscape protection areas with zoning",
      text: "In landscape protection areas, the circular recommends zoning concepts by the responsible authority that designate suitable PV sites. Removing land from the protected area, on the other hand, is generally not regarded as a suitable instrument.",
    },
    {
      titel: "Return to agriculture",
      text: "According to the Bavarian guidance, a pure PV installation with mowing or grazing does not create permanent grassland within the meaning of the conversion ban. After decommissioning, the land can in principle be used as arable land again; only after at least five further years of use as grassland would it become permanent grassland.",
    },
  ],
  pacht: {
    begruendung:
      "Bavaria combines good irradiation with the largest award volume nationwide; demand from project developers for permit-ready land with a grid connection is correspondingly high. On good soils or where grid capacity is lacking, however, the achievable lease can be significantly lower or a project can be ruled out altogether.",
  },
  faq: [
    {
      q: "How much lease income does a solar park bring in Bavaria?",
      a: "That depends above all on the grid connection, size of the land, soil quality and the chances of obtaining permits. Because demand is high, Bavarian offers tend to be in the upper part of the usual range. Serious offers state a fixed minimum amount per hectare and year plus a clear term.",
    },
    {
      q: "Has Bavaria opened up the less-favoured areas?",
      a: "Yes, as early as 2017 with its ground-mounted PV ordinance, and since 2020 with up to 200 awards per year. Since Solar Package I (May 2024), less-favoured areas have been eligible for support nationwide in principle; according to our research, Bavaria has not excluded them.",
    },
    {
      q: "Do I need a development plan for a solar park in Bavaria?",
      a: "As a rule, yes. Exceptions are the privileged 200-metre strips along motorways and two-track railway lines, as well as small farm-related agrivoltaic installations. Everything else goes through the municipality’s land-use planning.",
    },
    {
      q: "Is my land with good soils in Bavaria suitable?",
      a: "Not really for a conventional ground-mounted installation. The state ministries’ guidance lists agricultural soils of above-average quality as generally unsuitable. For such land, agrivoltaics can be the better choice.",
    },
    {
      q: "Do I have to provide additional compensation areas in Bavaria?",
      a: "Since December 2024, as a rule no longer, if the installation meets the Bavarian criteria (among others at most 25 ha, little sealing, driven piles, 80 cm ground clearance and ecological maintenance). Otherwise, the report says compensation of about 10 percent of the area is applied.",
    },
    {
      q: "Who decides on a solar park in Bavaria?",
      a: "The municipality, via the development plan. The district government checks compatibility with state planning, and the district office issues the building permit. Without the approval of the municipal council, there is no right to build.",
    },
  ],
};

export default region;
