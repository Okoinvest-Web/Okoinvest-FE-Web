// Englische Fassung der Regionalseite Bremen (Sprachmodell) – Struktur wie die deutsche Datei.
const region = {
  seoTitel: "Solar park & agrivoltaics in Bremen: land, law | ÖkoInvest",
  beschreibung:
    "Ground-mounted PV in Bremen: why the city state has hardly any solar park land, what role brownfields, ports and grassland play, and what applies to solar park leases.",
  lead:
    "Bremen is a city state with little farmland and a lot of grassland under nature protection. Large solar parks are the exception here – realistic opportunities lie on brownfields, railway and port land or in the surrounding Lower Saxony area.",
  akzent: "honestly assessed.",
  ertrag: {
    ort: "in the Blockland (Bremen north/west)",
    hinweis: "The PVGIS value is at the level of the north-west German lowlands and slightly below southern German sites.",
  },
  einleitung: [
    "The State of Bremen consists of the cities of Bremen and Bremerhaven and covers around 420 square kilometres. According to the 2025 land use survey, only about 7,800 hectares are used for agriculture, farmed by around 130 farms. The ports alone occupy more than 30 square kilometres. Bremen is therefore hardly the right place for conventional solar parks on arable land of the kind built in the area states.",
    "That does not mean ground-mounted PV plays no role in Bremen. The **Climate Protection Strategy 2038** provides for 500 MW of photovoltaics by 2030 and 1,000 MW by 2038; at the end of 2024, according to the Fachagentur Wind und Solar, around 135 MW were installed. Most of it is to be built on rooftops, but according to the 2023–2027 coalition agreement, priority areas for solar are also to be identified – with priority for land that is already sealed and for brownfields.",
  ],
  recht: [
    {
      titel: "Solar obligation under the BremSolarG",
      text: "Since 1 July 2024, the Bremen Solar Act has required the installation of a PV system when a roof is fundamentally renovated, and since 1 July 2025 the obligation has applied to all new buildings; new buildings must cover at least 50 percent of the gross roof area. Alternatively, an installation on **outdoor areas** is possible. The obligation shows the state’s direction: solar first on buildings and sealed land.",
    },
    {
      titel: "Climate Protection and Energy Act and expansion targets",
      text: "The Bremen Climate Protection and Energy Act (BremKEG) has been in force since April 2023. The Climate Protection Strategy 2038 of November 2022 sets solar targets of 500 MW by 2030 and 1,000 MW by 2038. We did not find a separate land target specifically for ground-mounted installations.",
    },
    {
      titel: "Land-use plan: solar combined with green space",
      text: "According to the state overview by the Fachagentur Wind und Solar, Bremen’s land-use plan provides for combining photovoltaics with green spaces and biotopes, in particular on **former railway land**. The coalition agreement also mentions an agrivoltaics model project and a ground-mounted installation at the airport.",
    },
    {
      titel: "Less-favoured areas: no state law, federal law applies",
      text: "Bremen was not one of the states that opened less-favoured areas for EEG bids by ordinance before 2024. Since Solar Package I, such land has in principle been permitted nationwide. Whether individual plots in Bremen fall within the category must be checked case by case.",
    },
  ],
  kulisse: {
    text: "Bremen’s few outer-zone areas are mainly grassland in wet marshes, often with protected status and of great importance for meadow birds. The Blockland in the north-west of the city, for example, is flat marshland 0.7 to 1.8 metres above sea level and is used almost exclusively as grassland for dairy farming; the Untere Wümme and Kuhgrabensee nature reserves are located here. In Bremerhaven, most of the Luneplate (around 1,470 hectares) is a bird protection area and ecological compensation area for the container port. Realistic sites are therefore more likely to be found in built-up and port areas.",
    gut: [
      "Former railway and commercial brownfields, as provided for in the land-use plan",
      "Sealed land, car parks and storage areas in ports and commercial areas",
      "Airport and infrastructure land, where operations and safety allow",
      "500 m strips along motorways and railway lines, where open land is available there",
    ],
    schwierig: [
      "Wet grassland in the Blockland, Werderland and Niedervieland with meadow-bird and nature conservation functions",
      "Nature reserves and EU bird protection areas, such as Untere Wümme or Luneplate",
      "Compensation areas for port and infrastructure projects",
      "Flood plains and land in front of dykes along the Weser, Lesum and Wümme",
      "Small plots of under a few hectares, which are often too small for an economical solar park",
    ],
  },
  ablauf: {
    text: "Bremen has no districts and no separate regional planning as in the area states: city and state coincide. The land-use plan and the development plans for the City of Bremen are prepared by the responsible Senate department for urban development and adopted by the city parliament (Stadtbürgerschaft); in Bremerhaven, land-use planning lies with the city executive (Magistrat) and the city council. Nature conservation and water law are reviewed by the respective municipal or Senate authorities. For land on the edge of the city, it is often worth looking across the state border, because different rules apply there.",
    behoerden: [
      { name: "Senate department for urban development / city parliament (City of Bremen)", rolle: "Land-use plan, development plans, adoption" },
      { name: "Bremerhaven city executive / city council", rolle: "Land-use planning in Bremerhaven" },
      { name: "Senator for Environment, Climate and Science", rolle: "Climate protection strategy, solar portal, nature conservation and water law" },
      { name: "Bremen Chamber of Agriculture", rolle: "Agricultural interests of grassland farms" },
    ],
  },
  agri: [
    "Because Bremen’s agriculture consists almost entirely of grassland and dairy farms, conventional agrivoltaics over arable crops is hardly an issue. Installations on grassland with continued mowing or grazing are conceivable, for example with vertically mounted modules – but only where meadow-bird protection and protected area ordinances do not stand in the way. The 2023–2027 coalition agreement expressly mentions an agrivoltaics model project; according to the current state of research, it is open whether and where it will be implemented.",
    "For farmers with land in the area around Bremen, the situation is different: the neighbouring Lower Saxony districts such as Osterholz, Verden, Diepholz, Wesermarsch and Cuxhaven are subject to the Lower Saxony State Spatial Planning Programme, the acceptance levy under the NWindPVBetG and the land target of the Lower Saxony Climate Act. Anyone farming land on both sides of the state border should have it assessed separately.",
  ],
  netz: {
    hinweis: "Within the city, grid connection points are usually closer than in rural regions; what matters is the available capacity at the respective substation.",
  },
  besonderheiten: [
    {
      titel: "Ports and logistics as solar sites",
      text: "With more than 30 square kilometres of port land, Bremen has large sealed areas. One example of their use is the rooftop installation of BLG’s C3 logistics centre with around 9 MW, which went into operation in 2023. Installations similar to ground-mounted ones on storage and parking areas follow the same logic.",
    },
    {
      titel: "Luneplate: nature conservation instead of a solar park",
      text: "The former Weser island of Luneplate became part of Bremerhaven in 2010. Around 940 hectares are an EU bird protection area and nature reserve, and large parts have been rewetted as compensation areas since 2003/2004; only an area of about 2 square kilometres in the north is earmarked for commercial use.",
    },
    {
      titel: "Surrounding Lower Saxony",
      text: "Most ground-mounted projects around Bremen are being built across the state border. There, Lower Saxony planning law and the mandatory levy to municipalities apply – a different framework from that of the city state.",
    },
  ],
  pacht: {
    begruendung:
      "There are only very few suitable open sites in Bremen, so no separate market situation can be derived; lease offers depend on the size, grid connection and prior use of the individual site.",
  },
  faq: [
    {
      q: "Can I lease my meadow in Bremen for a solar park?",
      a: "In individual cases yes, but it is often difficult: many grassland areas lie in protected areas or are important for meadow birds. In addition, a development plan from the city is required. The best chances exist for previously affected land near transport routes or commercial areas.",
    },
    {
      q: "Has Bremen opened up the less-favoured areas?",
      a: "Bremen had no opening ordinance of its own. Since Solar Package I in 2024, less-favoured areas have in principle been permitted for EEG bids nationwide; whether a plot in Bremen is included must be checked case by case.",
    },
    {
      q: "Which land does Bremen itself consider suitable for solar?",
      a: "Primarily sealed land and brownfields. The land-use plan provides for solar combined with green spaces, especially on former railway land, and the coalition agreement also mentions an installation at the airport.",
    },
    {
      q: "How much lease does a solar site bring in Bremen?",
      a: "Because there are so few comparable projects, there is no benchmark for Bremen. Decisive are the size of the land, the grid connection and whether the land falls within the EEG category. An assessment is only possible after examining the specific site.",
    },
    {
      q: "I have land in the surrounding Lower Saxony area – what applies there?",
      a: "Lower Saxony law applies there: the State Spatial Planning Programme, the district’s regional planning and the acceptance levy of 0.2 ct/kWh to the host municipality under the NWindPVBetG.",
    },
  ],
};

export default region;
