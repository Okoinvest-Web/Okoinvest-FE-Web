// Englische Fassung der Regionalseite Saarland (Sprachmodell) – Struktur wie die deutsche Datei.
const region = {
  seoTitel: "Solar park & agrivoltaics in Saarland: lease, law | ÖkoInvest",
  beschreibung:
    "Leasing land for a solar park in Saarland: VOEPV categories, less-favoured areas after Solar Package I, state planning and grid connection – ground-mounted PV explained.",
  lead:
    "Saarland has installed more photovoltaics per square kilometre than almost any other state. For open land there are pre-assessed eligible areas, but grid capacity and state planning set the limits.",
  akzent: "with pre-assessed eligible areas.",
  ertrag: {
    ort: "near Saarlouis",
    spanne: "around 1,070 to 1,080 kWh/kWp",
    hinweis: "Further PVGIS point: northern Saarland near St. Wendel around 1,070 kWh/kWp (optimally tilted, fixed-mount modules, 14 % system losses).",
  },
  einleitung: [
    "Saarland is small, but far ahead in photovoltaics. According to the energy ministry’s evaluation, around **1,222 MW** of PV capacity had been installed by the end of March 2026, corresponding to **465.9 kW per square kilometre** and well above the national average of 327.7 kW/km². Around 485 MW of this is accounted for by ground-mounted installations, i.e. almost 40 percent. Most ground-mounted capacity is in the districts of St. Wendel and Merzig-Wadern, followed by the district of Saarlouis.",
    "The basis for this was an early and carefully prepared opening of land: at the end of 2018, with the ordinance on PV on agricultural land (VOEPV), the state released less-favoured areas for solar parks – not across the board, but via **eligible areas** (Angebotskulisse) agreed at a round table. Since Solar Package I, less-favoured areas have been eligible for support nationwide. For owners in Saarland, the old categories nevertheless remain an important indication of which land is considered suitable from the point of view of state planning and nature conservation.",
  ],
  recht: [
    {
      titel: "VOEPV: eligible areas since 2018, limited until the end of 2025",
      text: "With the VOEPV (December 2018), Saarland opened less-favoured areas for EEG tenders, initially with a volume of 100 MWp, and after an amendment by a further 250 MWp to a total of **350 MWp**. Of the original roughly 57,000 ha of less-favoured areas, about one seventh remained in the eligible categories after deducting exclusion areas. The ordinance expired at the end of 2025; bids received by the Federal Network Agency by 31 December 2025 remain eligible for consideration.",
    },
    {
      titel: "Since Solar Package I: less-favoured areas eligible in principle",
      text: "Since 16 May 2024, the opt-out model has applied: less-favoured arable land and grassland is eligible under the EEG nationwide, as long as a state does not exclude it by ordinance. Under § 37c EEG, this is only permitted once more than 1 percent of agricultural land is covered by ground-mounted installations (from 2031: 1.5 percent), or for landscape protection areas and nature parks. The ministry has announced that it is examining an adjustment or new regulation and refers to federal law until then.",
    },
    {
      titel: "What the VOEPV categories excluded",
      text: "Excluded were, among others, nature reserves, FFH and bird protection areas, landscape protection areas, forest, core and buffer zones of the Bliesgau Biosphere Reserve, core areas of the major nature conservation project “Landscape of Industrial Culture North”, and priority areas designated in the State Development Plan, including for agriculture, open-space protection, nature conservation, groundwater protection and flood protection. The state emphasises that the land in the categories continues to be considered suitable after review under state planning and nature conservation law.",
    },
    {
      titel: "Saarland Solar Package 2024",
      text: "In May 2024, the state government announced a solar package. For open land, it provides, among other things, for: agrivoltaics also in priority areas for agriculture, faster procedures for installations along motorways and railway lines, municipal participation in the proceeds of solar parks, and around 25 ha of former mining land in cooperation with RAG. Municipal participation has been in force with the SGBG since July 2024 (see below); whether the other points have been implemented should be checked case by case.",
    },
    {
      titel: "Municipal Participation Act (SGBG): participation is mandatory",
      text: "Since July 2024, the **Saarland Municipal Participation Act (SGBG)** has applied. Developers of new ground-mounted PV installations must give the host municipality a share in the proceeds; the aim is a participation agreement. If none is reached, according to the overview by the Fachagentur Wind und Solar, a substitute payment of 0.2 cents per kilowatt hour fed in becomes due. Municipalities must use the income for measures to increase acceptance. The payment is borne by the operator, not the landowner.",
    },
  ],
  kulisse: {
    text: "In Saarland, the suitability of land can be pre-assessed well: the VOEPV eligible areas can be viewed in the state’s geoportal and show where agriculture, nature and landscape protection, monument protection and drinking water protection have already been weighed up. Land outside these categories but in a less-favoured area is eligible under the EEG after Solar Package I, but needs stronger justification in the development plan and towards state planning. The exact suitability is checked by the municipality in the land-use planning procedure in any case.",
    gut: [
      "Arable land and grassland within the former VOEPV eligible areas",
      "Privileged strips along motorways and two-track railway lines",
      "Conversion and former mining land",
      "Sites near substations with available capacity (data provided by grid operators in the geoportal)",
    ],
    schwierig: [
      "Priority areas of the State Development Plan, for example for agriculture, open-space protection or groundwater protection",
      "Landscape protection areas, forest, Natura 2000 sites and nature reserves",
      "Core and buffer zones of the Bliesgau Biosphere Reserve",
      "Land with rare arable weed communities or protected biotopes",
      "Sites in grid areas that are reaching their capacity limit",
    ],
  },
  ablauf: {
    text: "In Saarland too, a solar park outside the privileged corridors needs a development plan from the municipality, usually with a parallel amendment of the land-use plan. The yardstick for spatial planning is the State Development Plan; if land lies in one of its priority areas, a deviation procedure is required, as the VOEPV categories have already taken into account in individual cases. The building permit is issued by the lower building supervisory authority. Questions on the support categories are answered by the energy policy department of the energy ministry.",
    behoerden: [
      { name: "Municipality / town", rolle: "Land-use plan, development plan, review of the specific suitability of the land" },
      { name: "Saarland state planning authority", rolle: "Compatibility with the State Development Plan, possibly deviation procedure" },
      { name: "Ministry for Economic Affairs, Innovation, Digital and Energy (MWIDE)", rolle: "Energy policy, VOEPV categories, grid working group (AG Netze)" },
      { name: "Lower building supervisory authority (district / Saarbrücken Regional Association)", rolle: "Building permit, involvement of specialist authorities" },
    ],
  },
  agri: [
    "Because priority areas for agriculture in the State Development Plan were excluded from the VOEPV categories, agrivoltaics in Saarland is above all interesting for land on which a conventional solar park does not fit in spatial planning terms. In the 2024 solar package, the state government announced that it would also allow agrivoltaic installations in priority areas for agriculture, thereby linking up with the EEG rules for special solar installations.",
    "For farms with grassland and grazing, vertical installations that allow grazing between the module rows are an option in addition to elevated ones. Technical requirements follow from DIN SPEC 91434 (arable farming) and DIN SPEC 91492 (grazing). How the State Development Plan treats agrivoltaics in the individual case should be agreed with the municipality and state planning before a lease agreement.",
  ],
  netz: {
    vnb: ["VSE Verteilnetz", "energis-Netzgesellschaft", "Stadtwerke Saarbrücken Netz", "Pfalzwerke Netz", "other municipal utilities"],
    hinweis:
      "According to the energy ministry, the distribution grids in Saarland are increasingly reaching their capacity limits. In the grid working group (AG Netze), the state, transmission and distribution system operators signed a joint declaration of intent in November 2024; the capacities of the substations are provided in the geoportal.",
  },
  besonderheiten: [
    {
      titel: "PV density at the top",
      text: "With 465.9 kW per square kilometre, Saarland is among the leading German states. This shows acceptance, but also means: in some municipalities and grid areas, a lot of capacity is already connected.",
    },
    {
      titel: "Former mining and industrial land",
      text: "The legacy of coal and steel offers conversion sites that are suitable for solar parks. In the 2024 solar package, the state announced that it would make around 25 ha of former mining land available for solar use together with RAG.",
    },
    {
      titel: "Bliesgau Biosphere Reserve",
      text: "The Bliesgau Biosphere Reserve lies in the south-east of the state. Its core and buffer zones were excluded from the VOEPV categories; in the development zone, the individual case must be examined.",
    },
  ],
  pacht: {
    begruendung:
      "Irradiation is solid, but the plots are small-scale and limited grid capacity can delay projects. Within the pre-assessed categories and with a secured grid connection, demand is good.",
  },
  faq: [
    {
      q: "How much lease income does a solar park bring in Saarland?",
      a: "That depends above all on the grid connection, land size and location relative to the former VOEPV categories. Land with pre-assessed suitability and a connection nearby is most interesting for project developers. Agree a fixed minimum amount per hectare and year.",
    },
    {
      q: "Has Saarland opened up the less-favoured areas?",
      a: "Yes, at the end of 2018 with the VOEPV, but only for agreed eligible areas covering around one seventh of the less-favoured areas. Since Solar Package I, less-favoured areas have in principle been eligible for support nationwide; the VOEPV expired at the end of 2025.",
    },
    {
      q: "Where can I see whether my land lies within the VOEPV categories?",
      a: "The state shows the land covered by the ordinance in the Saarland geoportal. The categories are eligible areas; the final suitability is checked by the municipality in the development plan procedure.",
    },
    {
      q: "Do I need a development plan for a solar park in Saarland?",
      a: "Usually yes. Exceptions apply to the strips along motorways and two-track railway lines privileged under federal law and to small farm-related agrivoltaic installations.",
    },
    {
      q: "Are there grid connection problems in Saarland?",
      a: "The energy ministry points out that the distribution grids are increasingly reaching their limits. Before making a commitment, clarify with which grid operator and at which substation capacity is available.",
    },
    {
      q: "Is agrivoltaics possible in Saarland?",
      a: "Yes. In 2024, the state government announced that it would also allow agrivoltaics in priority areas for agriculture. How this is implemented in the State Development Plan should be clarified with state planning before concluding a contract.",
    },
  ],
};

export default region;
