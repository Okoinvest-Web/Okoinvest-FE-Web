// Englische Fassung der Regionalseite Hamburg (Sprachmodell) – Struktur wie die deutsche Datei.
const region = {
  seoTitel: "Solar park & agrivoltaics in Hamburg: land, law | ÖkoInvest",
  beschreibung:
    "Ground-mounted PV and agrivoltaics in Hamburg: why large solar parks are hardly possible, and what works in the Vier- und Marschlande, the Altes Land, on landfills and over car parks.",
  lead:
    "Hamburg is a city state, and the city says so itself: there is hardly any land for conventional solar parks. Opportunities lie in agrivoltaics on horticultural and fruit land, on landfills and over car parks.",
  akzent: "small, but not without opportunities.",
  ertrag: {
    ort: "in Kirchwerder (Vierlande)",
    spanne: "around 970 to 1,010 kWh/kWp",
    hinweis: "In the north of the city, PVGIS gives around 970 kWh/kWp, in the Vier- und Marschlande around 1,010 kWh/kWp.",
  },
  einleitung: [
    "Hamburg has around 14,000 hectares of agricultural land and a good 500 farms. That is a lot for a city of millions, but little for solar parks. The Authority for Environment, Climate, Energy and Agriculture (BUKEA) itself writes that the federal goal of splitting solar expansion equally between rooftops and open land cannot be transferred to Hamburg. Competition for land is fierce, and there are only a few sites that are suitable and not under nature protection.",
    "The **Photovoltaic Strategy for Hamburg** therefore relies on rooftops, but expressly includes agricultural and open land. By 2030, 500 to 800 MWp are to be installed in the city, and 1 to 1.5 GWp by 2035. In July 2025 there were a good 220 MWp. After rooftops, **agrivoltaics represents Hamburg’s second-largest solar potential**. By contrast, the strategy considers conventional ground-mounted PV to be of rather low availability, because nature conservation, landscape protection, recreation and agricultural use have to be taken into account.",
    "For owners of farmland in Hamburg this means: a large solar park on arable land is the exception. More realistic are agrivoltaics on vegetable, fruit and horticultural land, installations on landfills and conversion sites, and car park PV. Anyone who owns larger areas in the surrounding metropolitan region falls under the planning law of Schleswig-Holstein or Lower Saxony.",
  ],
  recht: [
    {
      titel: "Land-use plan instead of regional plan",
      text: "In Berlin, Bremen and Hamburg, the land-use plan can take on the function of the state-wide spatial plan (§ 13(1) ROG). Hamburg therefore has no separate regional planning with solar priority areas. Whether a site is suitable is decided by the land-use plan, the landscape programme, protected areas and the development plan.",
    },
    {
      titel: "PV obligation on rooftops and over parking spaces",
      text: "Under §§ 16 and 16a of the Hamburg Climate Protection Act, a PV obligation has applied since 1 January 2024 to new buildings and roof renovations, usually for at least 30 percent of the roof area. For new or extended car parks with more than 35 parking spaces, 40 percent of the suitable area must be covered with PV canopies. From 2027, an obligation for solar green roofs will be added.",
    },
    {
      titel: "Photovoltaic strategy: the outer zone as a separate field of action",
      text: "The Senate’s PV strategy treats “photovoltaics in the outer zone” as a separate field of action. Building on the AgriChance research project, it aims to show specific implementation options for agrivoltaics and make less suitable land usable through technical, legal and economic measures. For conventional solar parks, measures promoting biodiversity are to be examined.",
    },
    {
      titel: "Municipal land and the Hamburg urban green contract",
      text: "The city intends to check land owned by public companies for the fullest possible PV coverage. In doing so, it takes into account agreements such as the contract for Hamburg’s urban green spaces. Green spaces are therefore only available to a limited extent for solar parks.",
    },
  ],
  kulisse: {
    text: "On behalf of BUKEA, Fraunhofer ISE has studied where agrivoltaics is possible in Hamburg. The focus was on the traditional cultural landscapes: the Vier- und Marschlande, the Elbe islands of Wilhelmsburg and Finkenwerder, and Hamburg’s part of the Altes Land. In addition to open-field land, greenhouse horticulture areas were also expressly considered. Conventional solar parks remain the exception.",
    gut: [
      "Vegetable, ornamental plant and fruit growing land for agrivoltaics that protects against hail, storms and heavy rain",
      "Landfills and old waste deposits – for example the Energieberg Georgswerder with wind and PV",
      "Large car park and parking areas, including existing ones",
      "Sealed commercial land and land owned by public companies",
    ],
    schwierig: [
      "Nature reserves, Natura 2000 sites and legally protected biotopes",
      "Landscape protection areas and recreational areas under high pressure of use",
      "Meadow and grassland areas in the Elbe marshes that are important for meadow birds",
      "Small, fragmented plots and competition for land with housing and commerce",
    ],
  },
  ablauf: {
    text: "Because Hamburg is both city and state, planning and permits are largely handled within the city administration. For installations in the outer zone that are not privileged, an amendment to the land-use plan and a development plan are required. In Hamburg, development plans are usually prepared and adopted by the district offices, with the specialist authorities involved. Farm-related agrivoltaics up to 2.5 hectares can be permitted without a development plan under § 35(1) no. 9 BauGB. Agricultural and energy matters lie with BUKEA, which also provides the contact point for the PV strategy.",
    behoerden: [
      { name: "District office (e.g. Bergedorf, Harburg)", rolle: "Development plan procedure, building permit, district nature conservation matters" },
      { name: "Authority for Environment, Climate, Energy and Agriculture (BUKEA)", rolle: "PV strategy, agrivoltaics, nature conservation and agricultural matters, PV obligation" },
      { name: "Authority for Urban Development and Housing", rolle: "Land-use plan and landscape programme at city-wide level" },
      { name: "Hamburger Energienetze", rolle: "Grid connection in the distribution grid" },
    ],
  },
  agri: [
    "Agrivoltaics is not a fringe idea in Hamburg but part of the Senate’s strategy. Fraunhofer ISE’s **AgriChance** research project ran from November 2022 to August 2025 on behalf of BUKEA’s agriculture office. Using GIS analysis, it examined which land is suitable for agrivoltaics, including the open-field land of horticulture and agriculture as well as greenhouse horticulture. Another aim was to show income prospects for young farm managers. The final report is available from the city.",
    "For Hamburg farms, the strengths lie where crops need protection anyway: fruit in the Altes Land, vegetables and ornamental plants in the Vier- und Marschlande. The city mentions protection from too much sun, drought, heavy rain and storms, the use of rainwater for irrigation and, alternatively, keeping animals under the modules. Because the plots are small, farm-related installations up to 2.5 hectares or combinations with existing greenhouse structures are often an option.",
  ],
  netz: {
    hinweis:
      "Since 1 September 2024, Stromnetz Hamburg and Gasnetz Hamburg have merged to form Hamburger Energienetze GmbH, a fully municipally owned grid operator. The electricity distribution grid is more than 30,000 kilometres long.",
  },
  besonderheiten: [
    {
      titel: "Energieberg Georgswerder",
      text: "Since 2009 and 2011, the former landfill in Wilhelmsburg (around 45 hectares, 40 metres high) has carried photovoltaics with a combined capacity of around 900 kW on its southern slope, as well as wind turbines. It shows that landfills are among the few larger open sites for solar energy in Hamburg, usually in municipal ownership.",
    },
    {
      titel: "Car park PV as a substitute for open land",
      text: "With the obligation for new car parks with more than 35 spaces and the stated aim of including existing car parks as well, large parking facilities are one of the most important open areas for solar power in Hamburg. Owners of commercial and retail sites can lease out a canopy or operate it themselves.",
    },
    {
      titel: "Metropolitan region instead of city area",
      text: "Hamburg farms or owners with larger areas in the surrounding region plan there under the law of the respective state, for example under the solar decree in Schleswig-Holstein or the Lower Saxony requirements. Fraunhofer ISE emphasises that the Hamburg findings on agrivoltaics can be transferred to comparable locations in the metropolitan region.",
    },
  ],
  pacht: {
    begruendung:
      "Land is scarce and projects are usually small. For the rare suitable sites, the lease depends heavily on the individual case, for example on the grid connection, the agrivoltaics concept and competing uses.",
  },
  faq: [
    {
      q: "Can a solar park be built on open land in Hamburg?",
      a: "In principle yes, but only rarely. The city rates the availability of conventional open land as rather low, because nature and landscape protection, recreation and agriculture have to be taken into account. Realistic options are mainly landfills, sealed land, car parks and agrivoltaics on farmland.",
    },
    {
      q: "Is agrivoltaics worthwhile in the Vier- und Marschlande or the Altes Land?",
      a: "That depends on the crop, the size of the land and the grid connection. After rooftops, the city sees agrivoltaics as Hamburg’s second-largest solar potential. Fraunhofer ISE has named these cultural landscapes as the focus of study for possible pilot installations. The protective function for fruit and vegetables is particularly interesting.",
    },
    {
      q: "How much lease is paid for a solar site in Hamburg?",
      a: "Because there are so few projects, there are no reliable comparative values for Hamburg. The lease depends on the individual case, especially on the grid connection, size and whether agricultural use continues. We calculate specific values on this page from central market data.",
    },
    {
      q: "Is there a solar obligation for car parks in Hamburg?",
      a: "Yes. For new or extended parking facilities with more than 35 spaces, 40 percent of the suitable area must be covered with photovoltaic canopies (§ 16a HmbKliSchG). There are exceptions, for example where costs would be disproportionate.",
    },
    {
      q: "Which authority is responsible for solar parks in Hamburg?",
      a: "For development plans and building permits, usually the district office; for energy, agriculture and nature conservation matters, BUKEA. The grid connection is checked by Hamburger Energienetze.",
    },
  ],
};

export default region;
