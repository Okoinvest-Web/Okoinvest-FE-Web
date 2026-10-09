// Englische Fassung der Regionalseite Kärnten (Sprachmodell) – Struktur wie die deutsche Datei.
// Befristete Fristen-Einträge (fristenAT) übersetzt die Regionalseite selbst über das Faktenregister.
const region = {
  seoTitel: "Solar park & agrivoltaics in Carinthia: lease, law | ÖkoInvest",
  beschreibung:
    "Leasing land for a solar park in Carinthia: 4 ha limit of the 2024 Photovoltaic Installations Ordinance, “grassland – PV” zoning, agrivoltaics with grazing or fruit growing, grid and procedure.",
  lead: "With the 2024 Photovoltaic Installations Ordinance, Carinthia has set tight limits for ground-mounted PV: zonings on grassland are generally limited to 4 ha per contiguous area, but agrivoltaics has its own rules for the first time.",
  akzent: "with a 4 ha limit and agrivoltaics.",
  ertrag: {
    ort: "in the Zollfeld north of Klagenfurt",
    spanne: "around 1,230 to 1,240 kWh/kWp",
    hinweis: "Second PVGIS point in the lower Lavant valley; according to PVGIS, the Carinthian basins are thus slightly above the values for Burgenland or Vienna.",
  },
  einleitung: [
    "In Carinthia, the **Carinthian Photovoltaic Installations Ordinance 2024 (K-PhV 2024)** has regulated where and how large photovoltaic installations may be since 15 August 2024. It replaces the 2013 ordinance and at the same time implements requirements of the EU directive RED III. The state thus expressly pursues a gradual, grid-compatible expansion that protects the landscape structure: many installations on buildings, car parks, infrastructure and operational sites are permitted without their own zoning, whereas large parks on grassland are not.",
    "For landowners, the key figure is the **4 ha limit**: a contiguous “grassland – photovoltaic installation” zoning area may generally be at most 4 ha, and a distance of 1,000 m must be kept between two zoning areas. On previously affected or sealed land and for pilot installations, up to 10 ha are possible, and more in particularly justified individual cases. Large solar parks as in Lower Austria or Burgenland are therefore the exception in Carinthia.",
    "Agriculture in Carinthia is strongly shaped by grassland and livestock farming; according to the 2023 agricultural structure survey, 9,068 farms worked around 204,000 ha. Because of the mountainous location, ground-mounted PV is mainly an option in basins and valley floors, such as the Klagenfurt basin or the Lavant valley – and it is precisely there that the ordinance expressly protects high-quality soils.",
  ],
  recht: [
    {
      titel: "“Grassland – photovoltaic installation” zoning, max. 4 ha",
      text: "Ground-mounted installations that do not fall under the exceptions may only be built on land zoned as “grassland – photovoltaic installation” in the zoning plan. The contiguous zoning area may not exceed 4 ha; for pilot and research installations and on previously affected or sealed land, up to 10 ha are permitted, and more in particularly justified individual cases. A minimum distance of 1,000 m applies between zoning areas (§ 5 K-PhV 2024).",
    },
    {
      titel: "Sites: proximity to infrastructure, exclusion areas",
      text: "Sites must be chosen so that no significant environmental impacts are to be expected; high-quality soils should be protected as far as possible. To protect the open landscape, parks – except agrivoltaics with grazing – must be planned close to existing infrastructure, for example at sewage treatment plants, waste treatment, district heating and hydropower plants, substations or motorway maintenance depots. Excluded are, among others, wildlife corridors, contiguous high-quality agricultural areas of 30 ha or more, red hazard zones and inner drinking water protection areas (§ 6 K-PhV 2024).",
    },
    {
      titel: "Electricity law: permit above 500 kW",
      text: "Under § 6 K-ElWOG (Carinthian Electricity Act) as amended since 15 August 2024, generating installations with more than 500 kW of bottleneck capacity require an electricity law permit from the state government; PV installations on existing structures are exempt. The application must include, among other things, a statement from the municipality that the project complies with the zoning plan or the Photovoltaic Installations Ordinance.",
    },
    {
      titel: "Nature conservation: permit on zoned grassland",
      text: "According to the PV checklist of the Carinthian Chamber of Commerce, PV installations on zoned grassland generally require a permit under the Carinthian Nature Conservation Act 2002; the district administrative authority is responsible. Additional requirements apply in alpine regions, wetlands, nature, landscape and European protected areas.",
    },
    {
      titel: "Acceleration areas: no further ones planned for PV",
      text: "According to the state in February 2026, no further designation of acceleration areas for photovoltaics is planned in Carinthia; the relevant land is said to be already exempt from zoning requirements through the Photovoltaic Installations Ordinance. The ordinance itself must be evaluated no later than three years after it came into force, i.e. by August 2027.",
    },
    {
      titel: "EAG: 25 % deduction, exception for agrivoltaics",
      text: "For installations on agricultural land or grassland, the award value of the EAG market premium is reduced by 25 %. Agrivoltaic installations in which the main agricultural use is not or only slightly impaired can be exempt – an additional argument for agrivoltaics in Carinthia.",
    },
  ],
  kulisse: {
    text: "Because the zoning area is limited to 4 ha, Carinthia is less about large areas than about the right site: close to existing infrastructure, outside protection and hazard zones and not on the best soils. Previously affected land has a double advantage, because up to 10 ha are possible there. The requirement for proximity to infrastructure does not apply to agrivoltaics with grazing.",
    gut: [
      "Land next to substations, sewage treatment plants, hydropower plants or motorway maintenance depots",
      "Previously affected or sealed land (up to 10 ha of zoning area)",
      "Pasture for agrivoltaics with sufficient livestock",
      "Intensive orchards with stone or pome fruit, poultry farming or fish farming (agrivoltaics without separate zoning)",
    ],
    schwierig: [
      "Contiguous high-quality agricultural areas of 30 ha or more with particularly important soils",
      "National parks, nature parks, biosphere parks, Natura 2000, nature and landscape protection areas",
      "Wildlife corridors and red hazard zones of torrent and river basin planning",
      "Slopes at risk of landslides, debris flows or rockfall",
      "Land within 1,000 m of an existing PV zoning",
    ],
  },
  ablauf: {
    text: "It starts with the municipality: it must zone the land as “grassland – photovoltaic installation” or “grassland – agri-photovoltaic installation”, and the state reviews the zoning as supervisory authority. In parallel, the grid enquiry should be made to KNG-Kärnten Netz. Above 500 kW, the permit under the K-ElWOG from the state government follows, usually together with the nature conservation permit from the district authority and possibly water and forestry law. The ordinance expressly allows municipalities to take private-law measures, such as spatial planning contracts with site criteria.",
    behoerden: [
      { name: "Municipality (municipal council)", rolle: "Grassland PV or grassland agri-PV zoning, statement on the ElWOG application, spatial planning contracts" },
      { name: "Office of the Carinthian State Government (spatial planning)", rolle: "Supervision of zonings, Photovoltaic Installations Ordinance" },
      { name: "Carinthian State Government (energy law)", rolle: "Permit under the K-ElWOG above 500 kW" },
      { name: "District authority (Bezirkshauptmannschaft)", rolle: "Nature conservation, water and forestry law" },
    ],
  },
  agri: [
    "For the first time, the K-PhV 2024 distinguishes between agrivoltaics and other ground-mounted installations. Agrivoltaics is an installation on sustainably farmed agricultural land that either serves to **protect and shade intensive orchards with stone and pome fruit, poultry farming or fish farming**, or is located on pasture with at least **1.5 livestock units per hectare on at least 120 days a year**. Sustainability must be demonstrated with an agricultural operating concept; the municipality can request a copy of the multiple application (Mehrfachantrag, the annual subsidy application) every five years.",
    "For the first group – fruit growing, poultry, fish farming – no separate zoning is required. Pasture agrivoltaics, on the other hand, is only permitted on land zoned “grassland – agri-photovoltaic installation”, but does not have to be close to infrastructure. For farms with grazing livestock, pasture agrivoltaics can therefore be the most realistic route to PV use of their land – provided the required livestock density is actually kept.",
  ],
  netz: {
    hinweis: "The state also justifies the 4 ha limit with grid-compatible expansion; for larger parks, grid capacity at the nearest substation must be clarified early.",
  },
  besonderheiten: [
    { titel: "Lake and tourism landscape", text: "Around the large lakes and in valleys shaped by tourism, the landscape carries particular weight. The ordinance therefore deliberately steers ground-mounted installations towards existing infrastructure; landscape protection areas are only an option if the installation is compatible with the protection purpose." },
    { titel: "Natural hazards in a mountainous state", text: "A large part of Carinthia is alpine. Sites highly susceptible to rockfall, landslides, debris flows or avalanches, as well as red hazard zones, are expressly excluded – which narrows the land available to basins and valley floors." },
    { titel: "Evaluation by 2027", text: "The ordinance must be evaluated for its effectiveness in energy terms no later than three years after it came into force. Changes to the 4 ha limit are therefore not ruled out, but had not been decided at the time of research." },
  ],
  pacht: {
    begruendung: "The limit of 4 ha per zoning area with 1,000 m distance and the EAG deduction make projects small-scale; the very good irradiation only partly compensates for this.",
  },
  faq: [
    { q: "How large may a solar park in Carinthia be?", a: "A contiguous zoning area for PV may generally be at most 4 ha. On previously affected or sealed land and for pilot installations, up to 10 ha are possible, and more in particularly justified individual cases. A distance of 1,000 m must be kept between two zoning areas." },
    { q: "Do I need zoning for a ground-mounted installation in Carinthia?", a: "Yes, except in the exceptional cases of the ordinance, for example on infrastructure and operational sites, over car parks or for agrivoltaics in fruit growing, poultry and fish farming. Otherwise, the zoning “grassland – photovoltaic installation” or, for pasture agrivoltaics, “grassland – agri-photovoltaic installation” is required." },
    { q: "What counts as agrivoltaics in Carinthia?", a: "Installations that protect or shade intensive orchards with stone and pome fruit, poultry farming or fish farming, or installations on pasture with at least 1.5 livestock units per hectare on at least 120 days a year. Agricultural use must be demonstrated with an operating concept." },
    { q: "Which land is excluded in Carinthia?", a: "Among others, wildlife corridors, contiguous high-quality agricultural areas of 30 ha or more, protected areas where the installation contradicts the protection purpose, red hazard zones, inner drinking water protection areas and slopes highly susceptible to mass movements." },
    { q: "When is a permit under electricity law required?", a: "Under the K-ElWOG, from more than 500 kW of bottleneck capacity. The Carinthian state government is responsible; in the application, the municipality confirms that the project complies with the zoning." },
    { q: "Is leasing for a solar park in Carinthia worthwhile?", a: "Because of the small permissible areas, it is more likely for sites close to infrastructure or the grid, previously affected land and agrivoltaics. The lease calculator can be used to check what an area of a few hectares realistically brings." },
  ],
};

export default region;
