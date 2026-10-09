// Englische Fassung der Regionalseite Sachsen-Anhalt (Sprachmodell) – Struktur wie die deutsche Datei.
const region = {
  seoTitel: "Solar park & agrivoltaics in Saxony-Anhalt: lease | ÖkoInvest",
  beschreibung:
    "Leasing land for a solar park in Saxony-Anhalt: ground-mounted PV and agrivoltaics on arable land, grassland and former mining land – eligible land, municipal participation, Börde soils, process.",
  lead:
    "Saxony-Anhalt is arable farming country: almost 85 % of agricultural land is arable, from the top-quality soils of the Magdeburg Börde to sandy sites in the Altmark and Fläming – the prospects for a solar park vary accordingly.",
  akzent: "between Börde and mining area.",
  ertrag: {
    ort: "near Wanzleben (Magdeburg Börde)",
    spanne: "around 1,080 to 1,090 kWh/kWp",
    hinweis:
      "A second PVGIS point north of Halle (Saale) gives around 1,090 kWh/kWp – the south of the state is one of the sunnier regions of central Germany.",
  },
  einleitung: [
    "According to the 2023 agricultural structure survey, Saxony-Anhalt has around 1.15 million hectares of agricultural land, including 976,900 hectares of arable land. The roughly 4,150 farms work an average of just under 278 hectares – more than four times the national average. Large, well-shaped fields make the state interesting for solar parks; at the same time, the Magdeburg Börde contains some of Germany’s most productive arable soils, whose conversion is hardly politically acceptable.",
    "In 2022, the state opened less-favoured areas for EEG tenders with its ground-mounted installations ordinance (FFAVO) – but only for arable land and with an annual cap. Since Solar Package I, the nationwide opening has applied. New since October 2025 is an **Acceptance and Participation Act** that obliges operators to make payments to the host municipality. According to the Fachagentur Wind und Solar, a new State Development Plan is planned by the end of 2026.",
    "The ÖKOVOLT Group, to which ÖkoInvest belongs, operates its own solar parks in the Kyffhäuser region, including in Tilleda (part of Kelbra, Mansfeld-Südharz district).",
  ],
  recht: [
    {
      titel: "Less-favoured areas: FFAVO 2022, open nationwide since Solar Package I",
      text: "The FFAVO came into force on 26 February 2022. It allowed bids for solar parks on **arable land** in less-favoured areas, limited to an award volume of 100 MW per calendar year; excluded were, among others, Natura 2000 sites, protected parts of nature and landscape and legally protected biotopes. The annex lists 296 less-favoured areas (municipalities or parts of municipalities as of 13 March 1997). With Solar Package I (16 May 2024), less-favoured areas are in principle open nationwide, and the states can only restrict them under § 37c EEG. We did not find a new restriction ordinance for Saxony-Anhalt.",
    },
    {
      titel: "Acceptance and Participation Act: payment to the municipality",
      text: "For ground-mounted installations commissioned from 1 October 2025, the **Act on Increasing Acceptance and Participation in the Expansion of Renewable Energy (AuBG)** applies. Operators pay the municipality in whose area the installation stands 0.3 cents per kilowatt hour fed in, but at least €2.50 per kilowatt peak – whichever is higher. Individual agreements between the municipality and the operator are possible. The payment is borne by the operator, not the landowner.",
    },
    {
      titel: "State planning: rooftops and conversion first, arable land possible",
      text: "According to the state overview by the Fachagentur Wind und Solar, ground-mounted installations in Saxony-Anhalt should primarily be built on rooftops and conversion sites, but should also be possible on agricultural land; large installations remain permissible only with a development plan. The infrastructure ministry has published a planning guide for municipalities on the spatial steering of large ground-mounted photovoltaic installations. A new State Development Plan is in preparation.",
    },
    {
      titel: "Privileged status along motorways and railway lines",
      text: "Ground-mounted installations in the strip along motorways and railway lines of the main network are designated as privileged projects in the outer zone under federal law. The state energy agency expressly points this out in its FAQ. For owners with land along the A 2, A 9, A 14 or A 38 or along major railway lines, this can considerably shorten the route to a permit.",
    },
  ],
  kulisse: {
    text: "In Saxony-Anhalt, the prospects for land depend heavily on the soil: where soils are less productive, for example in parts of the Altmark, the Fläming or the Dübener Heide, and where the land lies within the less-favoured area category, projects are easier to justify than on top-quality soils. Previously affected sites such as former mining, military or industrial sites come first in planning terms.",
    gut: [
      "Former mining and conversion land, e.g. in the central German mining area",
      "Arable land in less-favoured areas with low soil quality",
      "Strips along motorways and railway lines (privileged status)",
      "Land close to substations and existing high-voltage routes",
      "Agrivoltaics on arable land and grassland with continued farming",
    ],
    schwierig: [
      "Top-quality soils of the Magdeburg Börde and other loess areas",
      "Natura 2000 sites, protected biotopes and nature reserves",
      "Priority areas in the regional plans for agriculture, nature and landscape or flood protection",
      "The Harz and the Saale-Unstrut region with their special landscape scenery",
      "Land without an accessible grid connection point",
    ],
  },
  ablauf: {
    text: "A solar park in Saxony-Anhalt almost always needs a development plan. The municipality decides on the resolution to draw up a plan and on the planning, usually based on a site concept. The regional planning association checks compatibility with the regional plan, state planning the objectives of the State Development Plan; the district is involved as building, nature conservation and agricultural authority. Since October 2025, the agreement on municipal participation under the AuBG has in practice been part of every new project. The state energy agency (LENA) offers advice to municipalities.",
    behoerden: [
      { name: "Town / municipality", rolle: "Land-use and development plan, participation agreement under the AuBG" },
      { name: "Regional planning association", rolle: "Regional plan, opinion in the procedure" },
      { name: "Ministry of Infrastructure and Digital Affairs", rolle: "State Development Plan, planning guide on spatial steering" },
      { name: "District / independent city", rolle: "Building supervision, nature conservation, agricultural authority" },
      { name: "Saxony-Anhalt State Energy Agency (LENA)", rolle: "Renewable energy service point, advice" },
    ],
  },
  agri: [
    "According to the state overview by the Fachagentur Wind und Solar, state policy regards agrivoltaics as a special form of land use and wants to speed up and simplify permits for it. For Saxony-Anhalt, with its very high share of arable land, agrivoltaics is above all interesting where a conventional solar park cannot be pushed through because of good soils or priority areas for agriculture: the land largely remains in production, and the farm keeps its land base.",
    "Smaller agrivoltaic installations up to 2.5 hectares that are spatially and functionally linked to a farm are privileged in the outer zone under § 35(1) no. 9 BauGB. Larger installations, like conventional solar parks, need a development plan and must meet the requirements of DIN SPEC 91434 to be recognised as a special solar installation in the EEG tender.",
  ],
  netz: {
    hinweis:
      "The north and west are mainly supplied by Avacon Netz; MITNETZ STROM is responsible for Wittenberg, Dessau-Rosslau, Saalekreis, Halle, Mansfeld-Südharz and Burgenlandkreis, among others, as well as parts of the Harz, Anhalt-Bitterfeld and Salzlandkreis. In the MITNETZ area, the share of renewable energy in electricity consumption was already 113 % in 2024.",
  },
  besonderheiten: [
    {
      titel: "Börde soils: a solar park usually only as an exception",
      text: "The Magdeburg Börde is one of Germany’s best arable locations. Resistance to the loss of productive land is strong here; agrivoltaic concepts or land along transport routes are more realistic. In regions with lighter soils, the situation looks quite different.",
    },
    {
      titel: "Former mining landscapes in the south",
      text: "In the central German lignite mining area south of Halle and around Bitterfeld, there are large former mining areas that are considered previously affected in planning terms. They compete with agricultural sites for grid connections, but often offer less potential for conflict.",
    },
    {
      titel: "Municipal participation higher than the EEG standard",
      text: "At 0.3 cents per kilowatt hour, the minimum participation under the AuBG is above the 0.2 cents that § 6 EEG permits as a voluntary payment. This makes a solar park financially noticeable for municipalities – a factor that can make approval in the municipal council easier.",
    },
  ],
  pacht: {
    begruendung:
      "Large fields, good irradiation and open EEG categories contrast with high soil values in the Börde and grid bottlenecks; the range between sites is correspondingly wide.",
  },
  faq: [
    {
      q: "Has Saxony-Anhalt opened up the less-favoured areas?",
      a: "Yes, in 2022 with the FFAVO for arable land and a cap of 100 MW per year. Since Solar Package I in May 2024, less-favoured areas have in principle been open nationwide; we have not found a new restriction by the state.",
    },
    {
      q: "How much lease income does a solar park bring in Saxony-Anhalt?",
      a: "That depends on soil quality, land category, grid connection and marketing. Within the usual range, Saxony-Anhalt is in the middle – for a specific statement we examine the individual site.",
    },
    {
      q: "Does the solar park have to pay the municipality?",
      a: "Yes, for installations commissioned from 1 October 2025 under the AuBG: 0.3 cents per kilowatt hour, at least €2.50 per kilowatt peak. This is paid by the operator, not the owner of the land.",
    },
    {
      q: "Is a solar park possible on Börde soil?",
      a: "Only in exceptional cases. On very good soils, a conventional solar park is difficult to push through in planning terms. Agrivoltaics or land in the privileged strip along motorways and railway lines are more likely options.",
    },
    {
      q: "Who decides on a solar park in Saxony-Anhalt?",
      a: "The municipality, via the development plan. The regional planning association and state planning check spatial planning, and the district checks building, nature conservation and agricultural matters.",
    },
    {
      q: "Which grid operator is responsible for my land?",
      a: "In the north and west usually Avacon Netz, in the south and east usually MITNETZ STROM; in towns also municipal grid operators. The transmission system operator is 50Hertz.",
    },
  ],
};

export default region;
