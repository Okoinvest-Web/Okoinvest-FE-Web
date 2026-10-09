// Englische Fassung der Regionalseite Baden-Württemberg (Sprachmodell) – Struktur wie die deutsche Datei.
const region = {
  seoTitel: "Solar park & agrivoltaics in Baden-Württemberg | ÖkoInvest",
  beschreibung:
    "Leasing land for a solar park in Baden-Württemberg: 0.2 % land target, Flurbilanz soil rating, less-favoured areas and agrivoltaics in fruit growing – ground-mounted PV explained.",
  lead:
    "Baden-Württemberg was slow to expand ground-mounted PV for a long time and is now catching up through regional plans with a fixed land target. For owners, what counts most is the rating in the Flurbilanz and the new PV areas of the regional associations.",
  akzent: "with regional plan and Flurbilanz.",
  ertrag: {
    ort: "in the Kraichgau near Sinsheim",
    spanne: "around 1,130 to 1,160 kWh/kWp",
    hinweis:
      "Further PVGIS points: Upper Swabia near Biberach around 1,130 kWh/kWp, Hegau near Lake Constance around 1,160 kWh/kWp (optimally tilted, fixed-mount modules, 14 % system losses).",
  },
  einleitung: [
    "In the south-west, ground-mounted photovoltaics played a minor role for a long time. According to the environment ministry’s guide, ground-mounted installations accounted for only around 8 percent of installed PV capacity in the state at the end of 2018, compared with around 25 percent nationwide at the time. Since then, the state has pulled several levers: higher caps in less-favoured areas, a statutory land target for regional planning and procedural simplifications in the state building code. In the 2025 tenders, according to the analysis by the Fachagentur Wind und Solar, around 534 MW of awards went to Baden-Württemberg, compared with only around 75 MW in 2021.",
    "At the same time, farming in the state is small-scale, the soils in the Gäu landscapes, the Kraichgau or the Upper Rhine Plain are often of high quality, and special crops such as fruit and wine shape entire areas. That is precisely why regional associations and the agricultural administration pay close attention to which land is suitable for solar parks. As an owner, it pays to look early at the Flurbilanz and at the regional plan for your region.",
  ],
  recht: [
    {
      titel: "Less-favoured areas: open since 2017, nationwide standard since 2024",
      text: "The ground-mounted PV opening ordinance (FFÖ-VO) of 7 March 2017 initially allowed up to 100 MW per year on arable land and grassland in less-favoured areas; in 2022 the limit was raised to **500 MW per year**. With Solar Package I (spring 2024), less-favoured areas are in principle eligible for support nationwide; according to the environment ministry, the FFÖ-VO thereby loses its scope. An opt-out under § 37c EEG is only possible once more than 1 percent of the state’s agricultural land is covered by ground-mounted installations.",
    },
    {
      titel: "KlimaG BW: at least 0.2 percent of the regional area for ground-mounted PV",
      text: "Under § 21 of the state Climate Protection and Adaptation Act (KlimaG BW), the twelve regional associations must designate at least **0.2 percent of their area** for ground-mounted PV, together with 1.8 percent for wind energy (§ 20). The deadline was 30 September 2025. The regions can choose whether to designate priority or reserve areas. Unlike for wind energy, the PV areas have **no exclusionary effect**: municipalities can also plan outside them.",
    },
    {
      titel: "State building code: ground-mounted PV exempt from permits since June 2025",
      text: "With the “Schnelles Bauen” (fast building) reform of the state building code (LBO), ground-mounted PV installations have been exempt from building permits since 28 June 2025, and since March 2026 so have the associated fencing and technical ancillary facilities. However, this replaces neither planning law nor specialist law: in the outer zone, outside the privileged strips, a development plan is still required, and nature, monument, water and soil protection continue to apply depending on the site.",
    },
    {
      titel: "Flurbilanz 2022: keep priority farmland free where possible",
      text: "The digital Flurbilanz of the agricultural administration classifies farmland into priority land (Vorrangflur) and reserve land I and II. This land is to remain reserved for agriculture in the long term. For their solar sub-plans, regional associations mainly use the marginal and sub-marginal land of the Flurbilanz as the starting point. How your land is classified is therefore one of the first questions in any site assessment.",
    },
    {
      titel: "Guide for ground-mounted solar installations",
      text: "In February 2018, the environment ministry sent a guidance letter to the municipal planning authorities, and in September 2019 it published the guide for ground-mounted solar installations. It is aimed at municipalities, planners and project developers and covers site selection, economic viability and above all ecological design, including ground-mounted solar thermal installations for heating networks.",
    },
  ],
  kulisse: {
    text: "Baden-Württemberg has around 2,508 cadastral districts that are wholly or partly classified as less-favoured areas. That is the EEG support category, but says nothing yet about whether a permit can be obtained. What matters are the regional plans with their new PV areas, the Flurbilanz and the protected areas. The Stuttgart region, for example, adopted around 0.7 percent of its area as priority areas for ground-mounted PV in December 2025, leaving out forests, core areas of the biotope network and high-quality landscapes.",
    gut: [
      "Land in the new priority or reserve areas for PV in the regional plan",
      "Marginal and sub-marginal land according to the Flurbilanz, often in less-favoured areas",
      "Privileged 200-metre strips along motorways and two-track railway lines",
      "Previously affected locations near commercial areas, substations or transport routes",
    ],
    schwierig: [
      "Priority land in the Flurbilanz and high-quality soils, for example in the Gäu landscapes and Kraichgau",
      "Nature reserves, protected biotopes, core areas of the biotope network, forest",
      "Landscape protection areas (rather “conditionally suitable” according to the Energieatlas)",
      "Visible slopes and landscapes of high importance for the landscape scenery",
    ],
  },
  ablauf: {
    text: "The procedure starts with the municipality: resolution to draw up a plan, amendment of the land-use plan (in many places via a municipal administrative association or an agreed administrative partnership) and development plan. If the land lies in a PV area of the regional plan, coordination with spatial planning has largely been done in advance. Outside such areas, the regional association and the regional council check whether objectives of the regional plan, such as regional green belts, stand in the way. Because ground-mounted PV has been exempt from permits since June 2025, the procedure ends with the legally binding development plan and the necessary specialist-law permissions; a separate building permit is no longer required.",
    behoerden: [
      { name: "Municipality / municipal administrative association", rolle: "Land-use plan, development plan, urban development contract" },
      { name: "Regional association (12 regions, e.g. Verband Region Stuttgart)", rolle: "Regional plan with PV areas under § 21 KlimaG BW, opinion in the procedure" },
      { name: "Regional council (Stuttgart, Karlsruhe, Freiburg, Tübingen)", rolle: "Higher spatial planning authority, possibly deviation from objectives, approval of land-use plans" },
      { name: "District office", rolle: "Lower nature conservation, water and agricultural authority; specialist opinions" },
    ],
  },
  agri: [
    "Baden-Württemberg focuses on special crops for agrivoltaics. In 2021, the agriculture and environment ministries, together with Fraunhofer ISE, launched the “Agri-PV Model Region Baden-Württemberg” and funded five pilot installations with around €2.5 million, focusing on pome and soft fruit. The sites are Ravensburg, Weinsberg, Karlsruhe, Kressbronn on Lake Constance and Nußbach. The aim is to make agrivoltaics practical, especially in special crop cultivation, and to study the interactions between modules and crops.",
    "For fruit and berry farms on Lake Constance, in the Heilbronn area or in the Ortenau, agrivoltaics can therefore be more than just leased land, because the installation is planned together with the permanent crop and cultivation continues. Because regional associations give great weight to agricultural interests in their PV categories, agrivoltaics planned under DIN SPEC 91434 has better prospects than a conventional solar park even on better soils. Whether it is permissible in a priority area for agriculture in the individual case is clarified by the respective regional association.",
  ],
  netz: {
    uenb: ["TransnetBW"],
    vnb: ["Netze BW", "naturenergie netze (South Baden)", "numerous municipal utilities and local grid operators"],
    hinweis:
      "Netze BW is the largest distribution system operator in the state and is working with the transmission system operator TransnetBW on joint target grid planning across the voltage levels.",
  },
  besonderheiten: [
    {
      titel: "Regional plans with PV areas",
      text: "Baden-Württemberg is one of the few states with a statutory minimum land target for ground-mounted PV in regional planning. According to an initial evaluation, all twelve regions are planning above the minimum. Because the areas have no exclusionary effect, the municipality can still act outside them.",
    },
    {
      titel: "No more building application, but the development plan remains",
      text: "The permit exemption under the state building code saves one procedural step. The real hurdle – the municipality’s land-use planning with environmental report and public participation – remains.",
    },
    {
      titel: "Ground-mounted solar thermal",
      text: "The state’s guide expressly also covers ground-mounted solar thermal installations that feed the heating networks of towns and municipalities. For land close to built-up areas, this can be an alternative to photovoltaics.",
    },
  ],
  pacht: {
    begruendung:
      "Good irradiation and growing award volumes contrast with small plots, high-quality soils and strict assessment of agricultural interests. In the individual case, the Flurbilanz rating, the regional plan and the grid connection are decisive.",
  },
  faq: [
    {
      q: "How much lease income does a solar park bring in Baden-Württemberg?",
      a: "The lease depends on size, grid connection and the chances of obtaining permits. Land in a PV area of the regional plan with a connection nearby is particularly sought after. Look for a fixed minimum amount per hectare, indexation and decommissioning security.",
    },
    {
      q: "Has Baden-Württemberg opened up the less-favoured areas?",
      a: "Yes, in 2017 with the ground-mounted PV opening ordinance, and since 2022 with up to 500 MW per year. Since Solar Package I, less-favoured areas have been eligible for support nationwide in principle; according to the environment ministry, the state ordinance has thereby lost its scope.",
    },
    {
      q: "Is my land in a PV area of the regional plan?",
      a: "This is shown in the regional plans of the twelve regional associations, which were to designate at least 0.2 percent of their area for ground-mounted PV by the end of September 2025. The maps are published by the respective regional association; the less-favoured areas are shown in the Energieatlas BW.",
    },
    {
      q: "Can a solar park also be built outside the regional plan areas?",
      a: "In principle, yes. The PV areas under § 21 KlimaG BW have no exclusionary effect. Outside them, however, the municipality must justify particularly carefully why the site is suitable and observe other objectives of the regional plan.",
    },
    {
      q: "Do I still need a building permit in Baden-Württemberg?",
      a: "Since 28 June 2025, no: ground-mounted PV is exempt from permits under the state building code. A development plan is still usually required in the outer zone, as are nature conservation or water law permissions depending on the site.",
    },
    {
      q: "Has agrivoltaics been tested in fruit growing in Baden-Württemberg?",
      a: "Yes. Five funded pilot installations have been running in the Agri-PV model region since 2021, mainly over apples and berries, including in Kressbronn on Lake Constance and in Weinsberg.",
    },
  ],
};

export default region;
