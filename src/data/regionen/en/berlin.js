// Englische Fassung der Regionalseite Berlin (Sprachmodell) – Struktur wie die deutsche Datei.
const region = {
  seoTitel: "Solar park & agrivoltaics in Berlin: land, law | ÖkoInvest",
  beschreibung:
    "Leasing land for a solar park in Berlin: why ground-mounted PV is the exception in the capital, what the Masterplan Solarcity and the Solar Act regulate, and where the surrounding area offers land.",
  lead:
    "Berlin leads in solar capacity per area, almost all of it on rooftops. With around 1,900 hectares of farmland within the city, solar parks in Berlin are the exception. The land for them is usually in Brandenburg.",
  akzent: "rooftops first, the surrounding area for parks.",
  ertrag: {
    ort: "near Blankenfelde (Pankow)",
    spanne: "around 1,040 to 1,060 kWh/kWp",
    hinweis: "Irradiation is uniform across the city and above the northern German average.",
  },
  einleitung: [
    "In 2023, only 46 farms in Berlin worked a combined 1,908 hectares, of which 1,075 hectares were arable land and 824 hectares permanent grassland. Around three quarters of this land is leased. That is less than a single large arable farm in Brandenburg works. Large solar parks in the classic sense are therefore hardly possible within the city.",
    "The state’s solar policy is consequently directed at rooftops. The Senate itself writes that land for renewables is only available to a limited extent and that rooftop potential should be activated first. The goal of the **Masterplan Solarcity**: by 2035 at the latest, 25 percent of Berlin’s electricity generation is to come from solar energy. At the end of 2025, around 55,900 installations with 487 MWp were installed in Berlin, arithmetically about 6 percent of Berlin’s gross electricity generation. With around 549 kWp per square kilometre, Berlin leads nationwide in capacity per area.",
    "For landowners in Berlin, it is mainly special sites that remain: large car park and commercial areas, sealed sites, brownfields and former landfills. Larger solar parks and agrivoltaics, on the other hand, are built in the surrounding Brandenburg area. There, the State of Berlin itself owns large agricultural areas through the state-owned Berliner Stadtgüter.",
  ],
  recht: [
    {
      titel: "Joint state planning with Brandenburg",
      text: "Berlin and Brandenburg have joint state planning. The framework is set by the **State Development Plan for the Capital Region Berlin-Brandenburg (LEP HR)**, in force since 1 July 2019. Within Berlin, the land-use plan also serves as the spatial plan. This is possible in city states under § 13(1) ROG (Federal Spatial Planning Act). Berlin has no separate regional planning with solar areas.",
    },
    {
      titel: "Berlin Solar Act: rooftop obligation since 2023",
      text: "Since 1 January 2023, a solar obligation has applied to new buildings and to major roof renovations of existing buildings with more than 50 square metres of usable floor area. New buildings must cover at least 30 percent of the gross roof area with PV, existing buildings 30 percent of the net roof area. The obligation can also be met with solar thermal or facade PV. As things stand, Berlin has no solar obligation for car parks.",
    },
    {
      titel: "Masterplan Solarcity 2025–2030",
      text: "The first master plan (2020–2024) comprised 27 measures in nine fields of action and, according to the Senate, was almost fully implemented. Since May 2025, the updated plan with five fields of action has applied. The focus is on large roof areas, especially on commercial buildings. Open land plays no separate role in the Senate documents.",
    },
    {
      titel: "Federal law also applies in the city",
      text: "For ground-mounted installations, the rules of the BauGB (Federal Building Code) and the EEG also apply in Berlin: solar parks usually need a development plan. In the 200-metre strip along motorways and certain railway lines, privileged status under § 35(1) no. 8 b BauGB can apply, and farm-related agrivoltaics up to 2.5 hectares under no. 9. Because of the dense development, however, there are only a few such strips in the outer zone within the city.",
    },
  ],
  kulisse: {
    text: "Within the city, open land competes with housing, commerce, recreation and nature conservation. Solar power on land outside buildings is therefore realistic above all where the land is already sealed or previously affected.",
    gut: [
      "Large car parks of retail, commercial and leisure facilities (voluntary car park PV)",
      "Sealed commercial and industrial areas, storage and logistics sites",
      "Brownfields, conversion areas and former landfills",
      "Noise barriers and areas along transport routes",
    ],
    schwierig: [
      "Remaining farmland on the edge of the city – small, often leased and under landscape protection",
      "Green spaces, allotments, forest and landscape protection areas",
      "Land with prospects for housing or commercial use in the land-use plan",
      "Natura 2000 sites and protected biotopes",
    ],
  },
  ablauf: {
    text: "Berlin has a two-tier administration consisting of the Senate and the districts. Development plans are usually drawn up by the districts, and by the Senate for projects of city-wide importance. The land-use plan is maintained at state level. The Senate Department for Economics, Energy and Public Enterprises is responsible for energy matters and the Solar Act. The SolarZentrum Berlin offers free advice. Anyone who owns land in Brandenburg plans there with the respective municipality under Brandenburg law and the regional planning of the Brandenburg planning regions.",
    behoerden: [
      { name: "District office (urban development office)", rolle: "Development plan, building permit, district nature conservation authority" },
      { name: "Senate Department for Urban Development", rolle: "Land-use plan, landscape programme, city-wide development plans" },
      { name: "Senate Department for Economics, Energy and Public Enterprises", rolle: "Masterplan Solarcity, Solar Act, SolarPLUS funding programme" },
      { name: "Joint State Planning Department Berlin-Brandenburg", rolle: "LEP HR, state planning opinions" },
      { name: "Stromnetz Berlin", rolle: "Grid connection in the distribution grid" },
    ],
  },
  agri: [
    "Within the city, agrivoltaics is a niche topic: the just under 1,100 hectares of arable land are spread over a few farms on the edge of the city, for example in the north near Blankenfelde or in the west near Gatow. For individual farms, farm-related agrivoltaics up to 2.5 hectares under § 35(1) no. 9 BauGB can still be interesting, for example over grassland with grazing animals or over special crops. Six farms with 292 hectares are managed organically, and agrivoltaics with extensive grazing can fit there too.",
    "Larger agrivoltaic projects with a Berlin connection are located in the surrounding area. The state-owned **Berliner Stadtgüter** manage around 16,700 hectares in Brandenburg and already operate wind and solar installations there. According to publicly available information, an agrivoltaic project is also being planned on their land. For private owners in the area around Berlin, the Brandenburg rules on ground-mounted PV, regional planning and municipal participation apply.",
  ],
  netz: {
    hinweis:
      "According to data from Stromnetz Berlin, Berlin’s electricity generation in 2025 was around 4,782 GWh. To reach the Solarcity target of 25 percent, around 4,400 MWp of solar capacity would be needed according to the 2019 expert recommendation.",
  },
  besonderheiten: [
    {
      titel: "Leader in solar capacity per area",
      text: "With around 549 kWp per square kilometre, Berlin led nationwide at the end of 2025, ahead of Saarland, Hamburg and Bavaria. This is due to the many rooftops, not to open land. Around 96 MWp were added in 2025, and the 500 MWp mark was passed in the first quarter of 2026.",
    },
    {
      titel: "Stadtgüter and former sewage farms in the surrounding area",
      text: "Historically, the Berliner Stadtgüter also include former sewage farms (Rieselfelder) in Brandenburg. According to publicly available information, short-rotation plantations stand there, among other things, and solar parks are operated on former airfield and construction rubble sites. Such previously affected land is an example of where solar parks for Berlin are actually being built.",
    },
    {
      titel: "Many tenants, few owners",
      text: "Around 76 percent of Berlin’s farmland is leased. Anyone wanting to use land for solar or agrivoltaics therefore usually has to bring owner and tenant together and take existing agricultural leases into account.",
    },
  ],
  pacht: {
    begruendung:
      "There are hardly any comparable projects within the city. The lease there depends on the individual case; in the surrounding area it depends on the conditions in Brandenburg.",
  },
  faq: [
    {
      q: "Are there ground-mounted solar parks in Berlin?",
      a: "Only isolated ones. With around 1,900 hectares of farmland and high pressure on land use, Berlin relies on rooftops. Within the city, ground-mounted PV is realistic mainly on sealed or previously affected land. Larger solar parks are built in the surrounding Brandenburg area.",
    },
    {
      q: "Can I lease my land in Berlin for photovoltaics?",
      a: "Yes, if it is large enough and suitable under planning law. This is most likely to apply to car parks, commercial areas, brownfields or former landfills. Farmland on the edge of the city often lies in landscape protection areas and is usually leased.",
    },
    {
      q: "How much lease does a solar site bring in Berlin?",
      a: "Because there are so few projects, there are no reliable comparative values for Berlin. Land size, grid connection and planning law are decisive. We calculate specific values on this page from central market data.",
    },
    {
      q: "Is there a solar obligation for car parks in Berlin?",
      a: "As things stand, no. The Berlin Solar Act only imposes obligations on buildings: new buildings and major roof renovations with more than 50 square metres of usable floor area must cover at least 30 percent of the roof area with PV.",
    },
    {
      q: "I own land in the area around Berlin. Which rules apply?",
      a: "The rules of the State of Brandenburg, its regional planning and the respective municipality. In terms of state planning, the joint LEP HR applies to Berlin and Brandenburg, but land-use planning is the responsibility of the Brandenburg municipality.",
    },
  ],
};

export default region;
