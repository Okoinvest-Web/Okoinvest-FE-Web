// Englische Fassung der Regionalseite Steiermark (Sprachmodell) – Struktur wie die deutsche Datei.
// Befristete Fristen-Einträge (fristenAT) übersetzt die Regionalseite selbst über das Faktenregister.
const region = {
  seoTitel: "Solar park & agrivoltaics in Styria: lease, law | ÖkoInvest",
  beschreibung:
    "Leasing land for a solar park in Styria: priority zones of the Solar Energy Sector Programme, zoning in open land, agrivoltaics rules and grid – ground-mounted PV for landowners.",
  lead: "In Styria, the Solar Energy Sector Programme decides where large ground-mounted installations may be built: 36 priority zones for parks above 10 ha, and outside them considerably smaller zonings by the municipality.",
  akzent: "with priority zone and zoning.",
  ertrag: {
    ort: "near Leibnitz (South Styria)",
    spanne: "around 1,220 to 1,230 kWh/kWp",
    hinweis: "Second PVGIS point near Feldbach in the Styrian Vulkanland; in the alpine north of the state, ground-mounted PV hardly plays a role.",
  },
  einleitung: [
    "Styria was one of the first Austrian states to decide the question of sites for large solar parks state-wide in advance. With the **Development Programme for the Renewable Energy – Solar Energy sector** (SAPRO Solarenergie for short, LGBl. No. 52/2023, effective since 7 June 2023), the state designated 36 priority zones for ground-mounted photovoltaic installations requiring more than 10 ha. At the same time, exclusion zones protect high-quality agricultural production land and valuable natural and landscape areas. The 1st amendment to the programme was promulgated with LGBl. No. 12/2026 and has been in force since 13 February 2026.",
    "For landowners this means: if your land lies in a priority zone, it is already “reserved” for a large park, and a separate zoning procedure by the municipality is not required. Outside the priority zones, the municipality remains responsible – and it may only designate considerably smaller areas, usually up to 2 ha and at most 10 ha. This is the most important difference from states in which the municipality alone decides on size.",
    "Agriculture in Styria is characterised by small farm structures, grassland in the north and west, and arable, fruit and wine growing in the south and east. According to the 2023 agricultural structure survey, 19,549 farms worked around 346,000 ha of agricultural land. For ground-mounted PV, the main options are the Graz and Leibnitz basins (Grazer Feld, Leibnitzer Feld), the Vulkanland and the valleys of the Mur, Raab and Feistritz – slopes, special crops and hail are separate issues there.",
  ],
  recht: [
    {
      titel: "Solar Energy Sector Programme: 36 priority zones, exclusion zones",
      text: "For ground-mounted installations requiring more than 10 ha, the SAPRO Solarenergie designates 36 priority zones in the public interest state-wide, according to the state around 780 ha. In the priority zones, ground-mounted PV installations may be built without a separate local spatial planning procedure; there is no obligation to implement them. In exclusion zones, designations in the zoning plan and the local development concept for ground-mounted installations are not permitted.",
    },
    {
      titel: "Zoning outside the zones: special use from 400 m²",
      text: "Under the Styrian Spatial Planning Act (StROG), installations up to 400 m² of gross module area may be built in open land without separate zoning (not in areas to be kept free). Above that, a **special use in open land for energy generation installations** is required. From a zoning area of more than 3,000 m², a designation as a suitability zone in the local development concept (ÖEK) is also needed. At local level, the upper limits of 2 ha and at most 10 ha apply.",
    },
    {
      titel: "Electricity law: state permit above 1,000 kW",
      text: "Installations above 1,000 kW need a permit from the state government under § 5 Stmk. ElWOG 2005; a separate building procedure at the municipality is then not required. Below that, the Styrian Building Act applies: depending on size, notification, a simplified or an ordinary building permit procedure at the municipality. According to the state, in priority zones the procedure is concentrated under the ElWOG.",
    },
    {
      titel: "Nature and species protection from 2,500 m²",
      text: "In protected areas and their relevant surroundings, a nature conservation permit under the StNSchG 2017 is required, and in landscape protection areas also for installations outside closed settlements. Independently of this, for ground-mounted installations of 2,500 m² or more, documents for the species protection assessment must be submitted at least three months before construction starts – usually an ecological report, which often requires one growing season of surveys.",
    },
    {
      titel: "Acceleration areas: StROG amendment 2026",
      text: "With the amendment LGBl. No. 20/2026 (in force since 28 February 2026), Styria included acceleration areas under the EU directive RED III in the Spatial Planning Act (§ 13b StROG). Natura 2000 sites and nature reserves, national parks and main bird migration routes are excluded, and artificial and sealed land is to be considered first. The state regards the priority zones of the sector programme as an already established steering instrument. Which areas will specifically become acceleration areas by ordinance was still open at the time of research.",
    },
    {
      titel: "EAG: 25 % deduction on agricultural land and grassland",
      text: "As throughout Austria, the award value of the EAG market premium for installations on agricultural land or grassland is reduced by 25 %. Exemptions can include agrivoltaic installations in which the main agricultural use is not or only slightly impaired, and previously affected land.",
    },
  ],
  kulisse: {
    text: "Examples named by the state itself are the Dornau priority zone in Halbenrain and the Dobl-Zwaring solar park south-west of Graz; according to the state, the zones comprise largely homogeneous areas. Selection criteria included a minimum size of 10 ha and proximity to a grid connection point. Outside the zones, the municipality decides within the 2 or 10 ha limits. Whether land lies in a priority or exclusion zone is shown in the state’s Digital Atlas (GIS Steiermark).",
    gut: [
      "Land within one of the 36 priority zones",
      "Previously affected land such as former gravel pits, landfills or land along transport infrastructure",
      "Flat or gently sloping arable land and grassland in the Graz and Leibnitz basins and in the Vulkanland",
      "Areas up to 2 ha in municipalities with an ÖEK suitability zone for energy generation",
      "Agrivoltaics in fruit growing or with grazing, with farming continuing",
    ],
    schwierig: [
      "Exclusion zones for high-quality agricultural soils and landscape areas",
      "Areas to be kept free in the zoning plan",
      "Natura 2000, nature and landscape protection areas and their surroundings",
      "Steep slopes and sites prone to landslides",
      "Flood discharge areas along the Mur, Raab and Feistritz (water law permit)",
    ],
  },
  ablauf: {
    text: "In a priority zone, a large park goes straight into the electricity law permit procedure at the state level without a local zoning procedure; the state also examines nature and species protection aspects. Outside the zones, the municipality comes first: from 3,000 m², a suitability zone must be designated in the ÖEK and the zoning plan amended to include the special use, both by municipal council resolution and with review by the state. Depending on capacity, this is followed by the municipality’s building procedure or the ElWOG permit, plus nature conservation, water and forestry law. The state’s “Renewable Energy” contact point answers questions on procedures.",
    behoerden: [
      { name: "Municipality (municipal council, mayor)", rolle: "ÖEK suitability zone, special use in the zoning plan, building permit up to 1,000 kW" },
      { name: "Office of the Styrian State Government, A17 State and Regional Development", rolle: "Solar Energy Sector Programme, priority zones, acceleration areas" },
      { name: "Styrian State Government (energy law)", rolle: "Permit under Stmk. ElWOG above 1,000 kW" },
      { name: "District authority (Bezirkshauptmannschaft)", rolle: "Nature conservation, species protection, water and forestry law (in Graz, the municipal authority)" },
    ],
  },
  agri: [
    "The StROG defines agrivoltaics in its own terms: agricultural production must remain the main use, the modules must be evenly distributed over the area, and at least 75 % of the total area must continue to serve crop or livestock production. An agricultural and forestry business may build an agrivoltaic installation on up to 0.5 ha of farmed land **once per farm** without separate zoning. Larger agrivoltaic installations need the special use “energy generation and energy supply installation” in the zoning plan.",
    "Practical experience comes from fruit growing: at the Haidegg research station in Graz, an agrivoltaic installation over fruit trees is running on around 5,000 m². In 2024, the research station reported less need for crop protection under the modules, but also that the modules only provide limited protection against hail – hailstones bounced into the neighbouring rows, which is why hail nets should be added. For fruit and wine growers in the south and east of the state, agrivoltaics can therefore be an option, but does not automatically replace hail protection.",
  ],
  netz: {
    hinweis: "The grid operator sets the permissible feed-in capacity; according to the state’s procedural handbook, it varies greatly by region depending on grid expansion. The priority zones were selected partly on the basis of the distance to the grid connection point.",
  },
  besonderheiten: [
    { titel: "Hail and fruit growing", text: "South and East Styria is a centre of Austrian fruit growing. In 2023 and 2024, hail events at the Haidegg research station damaged both modules and trees. For parks and agrivoltaics, hail resistance of the modules and insurance belong in every plan." },
    { titel: "Slopes and landslides", text: "Much of the land in the hill country is sloping. Slope stability, erosion and surface water are separate points of assessment in the procedure; flat valley land, on the other hand, often lies in flood zones or counts as protected agricultural soil." },
    { titel: "Small zoning sizes", text: "Outside the priority zones, parks are limited to a few hectares. For landowners with larger contiguous areas, it is therefore worth first looking at the zone map and the ÖEK designations of their own municipality." },
  ],
  pacht: {
    begruendung: "Good irradiation and clear priority zones contrast with small zoning sizes outside the zones and the EAG deduction; better terms are more likely in priority zones close to the grid.",
  },
  faq: [
    { q: "How large may a solar park in Styria be?", a: "Outside the priority zones, municipalities may usually designate up to 2 ha and at most 10 ha. Installations requiring more than 10 ha are generally reserved for the 36 priority zones of the Solar Energy Sector Programme." },
    { q: "Do I still need zoning by the municipality in a priority zone?", a: "No. In the priority zones, ground-mounted PV installations may be built without a separate local zoning procedure. The permit is issued under electricity law by the state; nature and species protection still have to be examined." },
    { q: "When does a ground-mounted installation in Styria need zoning?", a: "From more than 400 m² of gross module area in open land, a special use for energy generation installations is required, and from 3,000 m² of zoning area also a suitability zone in the local development concept." },
    { q: "What applies to agrivoltaics in Styria?", a: "At least 75 % of the land must remain in agricultural use. A farm may build once on up to 0.5 ha without separate zoning; above that, a special use in the zoning plan is required." },
    { q: "What changed in 2026?", a: "On 13 February 2026, the 1st amendment of the Solar Energy Sector Programme came into force, and on 28 February 2026 a StROG amendment introducing acceleration areas under the EU directive RED III. Which areas will specifically be designated was still open at the time of research." },
    { q: "How much lease is realistic for a solar park in Styria?", a: "Zone location, grid connection and eligibility for support are decisive. Land in priority zones close to the grid is most valuable for project developers; on agricultural land, the 25 % deduction from the EAG market premium weighs on profitability. The lease calculator gives an orientation." },
  ],
};

export default region;
