// Englische Fassung der Regionalseite Schleswig-Holstein (Sprachmodell) – Struktur wie die deutsche Datei.
const region = {
  seoTitel: "Solar park & agrivoltaics in Schleswig-Holstein | ÖkoInvest",
  beschreibung:
    "Leasing land for a solar park in Schleswig-Holstein: what the 2024 solar decree and the LEP require for ground-mounted PV, which land fits and what the grid can take.",
  lead:
    "Schleswig-Holstein is wind country, but is catching up considerably on solar parks. The 2024 solar decree steers ground-mounted PV towards previously affected land, along motorways and railway lines, and protects good soils, peatland and meadow-bird areas.",
  akzent: "between Knick hedgerow and grid node.",
  ertrag: {
    ort: "near Rendsburg",
    spanne: "around 980 to 1,110 kWh/kWp",
    hinweis: "Inland, values are around 980 kWh/kWp, on Fehmarn and the Baltic coast considerably higher (PVGIS around 1,110 kWh/kWp).",
  },
  einleitung: [
    "Schleswig-Holstein is known above all for its wind farms, but photovoltaics is catching up fast. At the end of 2025, around 4.6 GW of solar capacity was installed in the state. Just under half of it, a good 2.1 GW in a little over 700 installations, is ground-mounted. In 2025 alone, a good 800 MW were added. However, the state government wants to steer solar parks in a targeted way: primarily onto contaminated or sealed land and along motorways, railway lines and power lines. High-quality arable soils are to remain reserved for agriculture.",
    "For landowners, the decisive question is therefore less whether solar parks are possible in the state than where. The framework is set by the **State Development Plan (LEP) 2021** with its chapter 4.5.2 “Solar energy” and the joint **solar decree** (Solar-Erlass) of the interior and energy transition ministries, most recently revised and in force since 9 September 2024 (limited until 1 October 2027). The decree divides the outer zone into suitable search areas, areas requiring special assessment and areas with an exclusionary effect under specialist law.",
    "Then there is the grid: although the distribution grid has been heavily expanded for wind energy in many places, this capacity is only available to a limited extent for solar power. Early coordination with the grid operator is therefore part of the land assessment from the outset in Schleswig-Holstein.",
  ],
  recht: [
    {
      titel: "Less-favoured areas: previously closed, open in principle since Solar Package I",
      text: "Unlike Bavaria, for example, Schleswig-Holstein did not use the state opening clause for less-favoured areas before 2024. Since Solar Package I (16 May 2024), arable land and grassland in less-favoured areas have in principle been eligible for support nationwide, as long as the state does not exclude them by ordinance under § 37c EEG. According to our research, no such restriction ordinance is known for Schleswig-Holstein. Whether land actually lies within the EU area categories must be checked plot by plot.",
    },
    {
      titel: "LEP 2021: priority for previously affected land, bands of up to 1,000 metres",
      text: "Under chapter 4.5.2 LEP, spatially significant solar parks should primarily be built on sealed land, conversion sites and landfills, along motorways, federal roads and supra-regional railway lines or on otherwise previously affected land. Individual and neighbouring installations should not exceed a **total length of 1,000 metres**; otherwise landscape windows must be kept free. Excluded as an objective are priority areas for nature conservation, reserve areas for nature and landscape, regional green belts and green buffers, and focal areas for tourism and recreation (exception: previously affected land).",
    },
    {
      titel: "No more spatial planning procedure from 20 hectares",
      text: "The LEP usually provided for a spatial planning procedure for solar parks of 20 hectares or more. On 13 September 2022, the cabinet decided to dispense with this for individual and cluster plans. This speeds up larger projects. However, the state planning opinion in the land-use planning procedure is still required.",
    },
    {
      titel: "Privileged 200-metre strip along motorway and railway",
      text: "In the 200-metre strip under § 35(1) no. 8 b BauGB, the state applies the LEP exclusion objective only as a principle until the LEP is amended, because of the priority of renewables (§ 2 EEG). However, priority areas for wind energy or raw material extraction usually still stand in the way there. Outside the strip, the LEP objective applies unchanged.",
    },
    {
      titel: "Good soils: a heavy burden of justification for the municipality",
      text: "For land with regionally high yield capacity, the decree requires close justification: among other things, the municipality should explain whether there are sealed alternative sites in the municipal area. The soil points can be read precisely in the environment portal. For agrivoltaics with simultaneous crop cultivation, the assessment may turn out differently.",
    },
  ],
  kulisse: {
    text: "The solar decree expressly names suitable search areas and areas that are ruled out from the outset. In between lies a broad category requiring special weighing and assessment. This includes landscape protection areas, nature parks, biotope network areas, resting areas for migratory birds and peat soils. Solar parks are not prohibited there, but can only be implemented after careful case-by-case assessment.",
    gut: [
      "Land in the 200-metre strip along motorways and supra-regional railway lines",
      "Conversion sites, commercial and industrial brownfields, former extraction sites (observe conditions)",
      "Landfills – there are more than 25 landfill sites in different phases in the state",
      "Previously affected land, e.g. in wind farms or priority areas for wind energy",
      "Lower-yielding arable sites, especially on the Geest, with a nearby grid connection point",
    ],
    schwierig: [
      "Nature reserves, Wadden Sea National Park, Natura 2000, protected biotopes (excluded under specialist law)",
      "Land in the meadow-bird categories – usually not permissible under species protection law according to the decree",
      "Flood plains, the coastal protection building ban strip and dyke protection strips",
      "Regional green belts, green buffers and focal areas for tourism and recreation",
      "Permanent grassland on peat and semi-peat soils, old grassland and fallow sites with high nature conservation value",
    ],
  },
  ablauf: {
    text: "Outside the privileged strips, a solar park in Schleswig-Holstein needs an amendment of the land-use plan and a development plan, often as a project-related plan with an implementation contract. The municipality decides whether to draw one up. According to the LEP, it should coordinate with neighbouring municipalities to avoid excessive clusters of installations. Many municipalities and administrative offices work with their own site or potential studies. For this, the interior ministry provides them with the land management cadastre (FMK SH) with a ground-mounted PV atlas. State planning gives its opinion in the procedure. The districts are involved as lower building supervisory and nature conservation authorities. The decree recommends involving the grid operator even before the resolution to draw up a plan.",
    behoerden: [
      { name: "Municipality / administrative office (Amt)", rolle: "Planning authority: resolution to draw up a plan, land-use plan amendment, development plan, urban development contract" },
      { name: "Ministry of the Interior, Municipal Affairs, Housing and Sport – state planning", rolle: "State planning opinion, deviation under § 13 LaplaG, FMK SH" },
      { name: "District (lower building supervision, lower nature conservation authority)", rolle: "Building permit, impact mitigation rules, species protection, landscape protection areas" },
      { name: "Ministry for Energy Transition, Climate Protection, Environment and Nature (MEKUN)", rolle: "Co-publisher of the solar decree, nature, peatland and soil protection at state level" },
      { name: "Grid operator (usually Schleswig-Holstein Netz)", rolle: "Grid compatibility assessment, grid connection point, expansion planning" },
    ],
  },
  agri: [
    "The solar decree contains a separate section on “special solar installations”. It makes clear that agrivoltaics under DIN SPEC 91434 can be built elevated or vertically in rows. Vegetable, fruit and special crops in particular, which increasingly suffer from hail, frost and drought, could benefit from partial roofing. The state’s specialist authorities consider agrivoltaics that also meets the requirements of the CAP direct payments ordinance to be preferable. There, the requirements for agricultural use are stricter than for the EEG’s special solar installations.",
    "Farm-related agrivoltaics with a footprint of up to **2.5 hectares** is possible without a development plan under § 35(1) no. 9 BauGB, one installation per farmstead. Larger agrivoltaic installations are either privileged in the 200-metre strip or need a development plan. On better soils, where conventional solar parks face a heavy burden of justification, agrivoltaics with simultaneous crop cultivation can be assessed more favourably in the weighing. For high elevations, the decree points out possible additional effects on the landscape scenery.",
  ],
  netz: {
    vnb: ["Schleswig-Holstein Netz", "municipal utility grids (e.g. Kiel, Lübeck, Flensburg, Neumünster)"],
    hinweis:
      "Schleswig-Holstein Netz reports connection requests for solar parks of more than 18 GW. That is many times the supply capacity of the distribution grid, and for expansions in the extra-high-voltage grid, the solar decree mentions waiting times of up to ten years. Curtailment of onshore renewables, on the other hand, has fallen sharply: in 2025 it was 825 GWh, about a quarter of the 2019 peak.",
  },
  besonderheiten: [
    {
      titel: "Peatland PV on rewetted land",
      text: "The solar decree expressly covers peatland PV: solar parks on previously drained, agriculturally used peat and semi-peat soils are possible if the land is rewetted. There is a separate EEG support category for this. The feasibility of rewetting must be demonstrated in the development plan procedure, if necessary with a hydrological report. According to the Federal Network Agency’s requirements, minimum water levels of 10 cm below ground level in winter and 30 cm in summer apply. Legally protected peatlands are excluded.",
    },
    {
      titel: "Meadow birds, resting birds and the coast",
      text: "Especially in the marshes of the west coast, there are meadow-bird areas, resting areas for migratory birds and building ban zones under coastal protection law. According to the decree, land in the meadow-bird categories is usually considered excluded under species protection law. An early check of the nature conservation categories saves a lot of planning effort here.",
    },
    {
      titel: "Knicks and landscape scenery",
      text: "The typical hedge banks (Knicks) shape large parts of the state. The decree names Knicks as traditional landscape elements that must be taken into account and recommends screening with native woody plants. Together with the LEP’s 1,000-metre rule, this tends to lead to several compact sub-areas rather than long bands of modules.",
    },
    {
      titel: "Citizen energy and acceptance",
      text: "The state supports citizen energy projects for ground-mounted PV through a citizen energy fund. The requirement is an association of at least seven people from different households. Independently of this, operators can give the host municipality a financial share under § 6 EEG.",
    },
  ],
  pacht: {
    begruendung:
      "Inland irradiation is slightly lower than in the south, but demand for land close to the grid is high. The lease depends above all on the grid connection, location in the privileged strip and soil quality.",
  },
  faq: [
    {
      q: "Has Schleswig-Holstein opened up the less-favoured areas for solar parks?",
      a: "Not before 2024; the state did not use the former opening clause. Since Solar Package I, however, less-favoured areas have in principle been open to the EEG tender nationwide, as long as a state does not exclude them by ordinance. As far as we know, no such ordinance exists for Schleswig-Holstein. Eligibility for support says nothing yet about planning feasibility: the LEP, the solar decree and the municipality decide whether building is allowed.",
    },
    {
      q: "How much lease income does a solar park bring in Schleswig-Holstein?",
      a: "That depends above all on the grid connection, the location (for example in the 200-metre strip along a motorway or railway), the size of the land and the marketing route. In Schleswig-Holstein, the grid connection determines the value of land particularly strongly. Land with a secured connection is worth considerably more than land without one. We calculate specific values on this page from current market data.",
    },
    {
      q: "Do I need a spatial planning procedure for a solar park in Schleswig-Holstein?",
      a: "As a rule, no. Since the cabinet decision of 13 September 2022, the state has dispensed with spatial planning procedures for solar parks of 20 hectares or more. The objectives and principles of the LEP still apply and are checked via the state planning opinion in the land-use planning procedure.",
    },
    {
      q: "May a solar park be built on peat soil?",
      a: "On drained, agriculturally used peat and semi-peat soils yes, but as peatland PV with rewetting and demonstrated feasibility. Permanent grassland on peat soils and the protected peat soil categories are subject to special assessment. Legally protected peatlands are excluded.",
    },
    {
      q: "Why does grid connection often take so long in Schleswig-Holstein?",
      a: "The grid was expanded for wind power, and this capacity is only partly available for solar power. Solar parks usually need their own grid connection points with new transformers, often with expansion requirements reaching into the transmission grid. That is why the solar decree recommends involving the grid operator early.",
    },
    {
      q: "How long may a solar park in Schleswig-Holstein be?",
      a: "According to the principle in the LEP, individual and neighbouring installations together should not be longer than 1,000 metres. Beyond that, sufficiently large landscape windows should remain free. This is a principle, not a strict ban, but it is regularly taken into account in the weighing.",
    },
  ],
};

export default region;
