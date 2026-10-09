// Englische Fassung der Regionalseite Burgenland (Sprachmodell) – Struktur wie die deutsche Datei.
// Befristete Fristen-Einträge (fristenAT) übersetzt die Regionalseite selbst über das Faktenregister.
const region = {
  seoTitel: "Solar park & agrivoltaics in Burgenland: lease, law | ÖkoInvest",
  beschreibung:
    "Leasing land for a solar park in Burgenland: ground-mounted PV only in suitability zones, 19 acceleration areas, photovoltaic levy, agrivoltaics requirements and Netz Burgenland.",
  lead: "In Burgenland, ground-mounted installations beyond small domestic systems are only permitted in suitability zones designated by the state by ordinance – currently 95 zones, 19 of which also count as acceleration areas.",
  akzent: "only in the suitability zone.",
  ertrag: {
    ort: "on the Parndorf plateau",
    spanne: "around 1,210 kWh/kWp in northern and southern Burgenland",
    hinweis: "Second PVGIS point near Oberwart; the values in the north and south of the state are almost the same.",
  },
  einleitung: [
    "Burgenland steers ground-mounted PV more strictly at state level than any other Austrian state. Under § 22d of the Burgenland Spatial Planning Act 2019 (Bgld. RPG 2019), photovoltaic installations are primarily to be built on rooftops or integrated into buildings. Without a suitability zone, only small installations for a building’s own use are permitted on open land – up to 35 m² of module area, and up to 200 m² on commercial and industrial land. Anything larger is only possible in **suitability zones** (Eignungszonen) designated by the state government by ordinance.",
    "These zones are listed in the Burgenland suitability zone ordinance for photovoltaic and solar ground-mounted installations. Since it was issued in 2021, it has been extended several times; in the version LGBl. No. 55/2026 (since 11 July 2026), annex 1 comprises **95 suitability zones** in municipalities from the Seewinkel and the Parndorf plateau to southern Burgenland. Each zone has its own conditions, for example on biodiversity, wildlife corridors or landscape.",
    "With around 177,000 ha of agricultural land (2023 agricultural structure survey), Burgenland is also a state of arable farming and viticulture. There are also the wind farms in the north – the Spatial Planning Act expressly names combined grid use with wind power as a criterion for a “qualified use” of PV land.",
  ],
  recht: [
    {
      titel: "Ground-mounted PV only in suitability zones",
      text: "Installations exceeding the limits of 35 m² (or 200 m² on commercial and industrial land) are only permitted in suitability zones. When designating them, the state takes into account exclusion and conflict criteria, meteorological conditions and grid feed-in. Preference is given to concepts with a “qualified use”: operation by a citizens’ or renewable energy community, citizen participation, continued farming, combined grid use with wind power, storage or a direct line to businesses in Burgenland (§ 22d(3) Bgld. RPG 2019).",
    },
    {
      titel: "Additional zoning below 10 ha",
      text: "The suitability zone is shown in the zoning plan. Installations taking up more than 10 ha may only be approved if they do not contradict the ordinance. Installations under 10 ha additionally need zoning within the zone as green space with a separate designation for photovoltaics (§ 40(2) Bgld. RPG 2019). According to the state, it only zones technically suitable areas of generally at least 10 ha; there is no legal entitlement to a zone.",
    },
    {
      titel: "19 suitability zones are acceleration areas",
      text: "With the amendment LGBl. No. 106/2025, the state included acceleration areas under the EU directive RED III in the Spatial Planning Act (§ 22g). Since the ordinance amendment LGBl. No. 26/2026 (March 2026), suitability zones no. 5, 31 to 34, 41, 64, 73, 76, 81, 82 and 85 to 92 count as acceleration areas – without any change to zone boundaries or conditions.",
    },
    {
      titel: "Photovoltaic levy per megawatt",
      text: "As compensation for the impact on the landscape, the state charges an annual **photovoltaic levy** (Photovoltaikabgabe), calculated on the installed capacity (euros per megawatt), not on the area. The basic amount is set in the ordinance on the assessment basis and is increased depending on market prices, for 2025 by 36.61 %, for example. A fixed share per megawatt goes to the host municipality, the rest to the state’s climate and social fund. The levy is payable by the permit holder, i.e. usually the operator – not the lessor.",
    },
    {
      titel: "Electricity law: permit above 500 kWp",
      text: "Under § 5 of the Burgenland Electricity Act 2006, photovoltaic installations of more than 500 kWpeak require an electricity law installation permit, as do energy storage systems with a capacity of more than 1 MWh.",
    },
    {
      titel: "EAG: 25 % deduction, agrivoltaics can be exempt",
      text: "On agricultural land and grassland, the award value of the EAG market premium is reduced by 25 %. Agrivoltaics whose main use is not or only slightly impaired can be exempt – often relevant in Burgenland, because zones on good soils require agricultural use anyway.",
    },
  ],
  kulisse: {
    text: "The decisive question is simply: does the land lie in one of the 95 suitability zones? The zones are defined on plans at a scale of 1:15,000 and shown in the municipality’s zoning plan. Outside them, a ground-mounted installation larger than garden size is not permitted. Anyone who has suitable land of at least 10 ha outside the zones can submit documents to state planning – whether it is included in a future amendment of the ordinance is decided by the state.",
    gut: [
      "Land within a suitability zone, especially in the 19 acceleration areas",
      "Projects with participation of citizens or energy communities",
      "Land near existing wind farms with shared grid use",
      "Combination with storage or a direct line to a business in Burgenland",
      "Agrivoltaics or extensive grassland use on better soils",
    ],
    schwierig: [
      "All land outside the suitability zones",
      "Natura 2000 sites, Neusiedler See – Seewinkel National Park and main bird migration routes",
      "Surroundings of the Fertő/Neusiedler See World Heritage site (conditions in individual zones)",
      "HQ30 and HQ100 flood zones along streams",
      "Areas under 10 ha that do not adjoin a zone",
    ],
  },
  ablauf: {
    text: "If the land is part of a suitability zone, installations under 10 ha are followed by zoning by the municipality; above that, compliance with the ordinance is sufficient. Then the electricity law permit above 500 kWp, the nature conservation assessments and possibly water and forestry law must be obtained; the zone-specific conditions from annex 1 must be implemented. In parallel, the grid enquiry to Netz Burgenland should start early. After commissioning, the photovoltaic levy becomes due annually.",
    behoerden: [
      { name: "Office of the Burgenland State Government, Department 2 – State Planning", rolle: "Suitability zones and acceleration areas, submission of new zone proposals" },
      { name: "Municipality (municipal council)", rolle: "Zoning as green space with a separate designation for photovoltaics for installations under 10 ha" },
      { name: "Burgenland State Government (electricity law)", rolle: "Installation permit above 500 kWp under Bgld. ElWG 2006" },
      { name: "District authority / nature conservation authority", rolle: "Nature conservation, ecological monitoring under zone conditions" },
    ],
  },
  agri: [
    "The state considers secondary agricultural use through agrivoltaics or extensive grassland use desirable and makes it mandatory in zones with high soil quality. The conditions in annex 1 of the ordinance differ by zone: in some, arable use must be replaced by extensive meadows or flowering areas with mowing or grazing; in others, agricultural use – for example as organic farming – must continue.",
    "Typical requirements for the installation layout are working aisles of at least 3 m between the rows and a module lower edge of at least 0.8 m, so that the land is preserved as habitat for ground-nesting meadow birds. Newly sealed areas may not exceed 0.5 % of the zone area, fences should generally be avoided, and ecological monitoring with an annual report is required over the entire operating life. For farmers this means: continued farming is often part of the concept – and should be regulated in the lease.",
  ],
  netz: {
    hinweis: "The Spatial Planning Act requires current and future feed-in options to be taken into account when designating zones, and rates shared grid use with wind power and storage positively.",
  },
  besonderheiten: [
    { titel: "Combination with wind power", text: "There are many wind farms in northern Burgenland. Combined grid use of PV and wind is expressly named in the act as a qualified use – land in the vicinity of existing wind farms can therefore have advantages when zones are designated." },
    { titel: "Lake Neusiedl and bird migration", text: "The Seewinkel and Lake Neusiedl are a national park, a Natura 2000 site and a World Heritage site. For zones nearby, the ordinance sometimes requires coordination with ICOMOS, wildlife corridors or protective distances; main bird migration routes are excluded from acceleration areas." },
    { titel: "The levy as a cost factor", text: "The annual photovoltaic levy falls on the operator and is part of its calculation. For lessors, it is important that it is not passed on to the landowner in the lease." },
  ],
  pacht: {
    begruendung: "Within the suitability zones, good irradiation and large contiguous areas meet additional costs from the state levy, biodiversity conditions and the EAG deduction; outside the zones, no lease for ground-mounted PV is possible.",
  },
  faq: [
    { q: "Can I lease my land in Burgenland for a solar park?", a: "Only if it lies in one of the suitability zones of the Burgenland suitability zone ordinance or is included in future. Outside the zones, ground-mounted installations are only permitted up to 35 m² of module area for a building’s own use." },
    { q: "How many suitability zones for PV are there in Burgenland?", a: "In the version LGBl. No. 55/2026, annex 1 of the ordinance lists 95 suitability zones. Since March 2026, 19 of them have also counted as acceleration areas under the EU directive RED III." },
    { q: "Can I apply for a new suitability zone?", a: "There is no legal entitlement. The state only zones technically suitable areas of generally at least 10 ha; documents can be submitted to state planning." },
    { q: "As the lessor, do I have to pay the photovoltaic levy?", a: "Under the Spatial Planning Act, the levy is payable by the holder of the electricity law permit or building permit, i.e. usually the operator. The lease should make this clear." },
    { q: "Is agrivoltaics mandatory in Burgenland?", a: "In suitability zones with high soil quality, the state requires secondary agricultural use through agrivoltaics or extensive grassland use. In other zones, zone-specific biodiversity conditions apply." },
    { q: "From what size does a solar park need an electricity law permit?", a: "Under the Burgenland Electricity Act 2006, from more than 500 kWpeak; energy storage from more than 1 MWh of capacity." },
  ],
};

export default region;
