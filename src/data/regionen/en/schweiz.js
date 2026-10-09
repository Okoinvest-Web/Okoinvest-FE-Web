// Englische Fassung der Regionalseite Schweiz (Sprachmodell) – Struktur wie die deutsche Datei.
// Befristete Fristen-Einträge (fristenCH) übersetzt die Regionalseite selbst über das Faktenregister.
// Schweizer Rechtsbegriffe bleiben im Original und werden erklärt (RPG = Raumplanungsgesetz, EnG = Energiegesetz …).
const region = {
  seoTitel: "Solar park & agrivoltaics in Switzerland: law, lease | ÖkoInvest",
  beschreibung:
    "Leasing land for a solar park in Switzerland: when ground-mounted PV and agrivoltaics are permitted under Art. 24ter RPG, Solarexpress, HEIV auctions and the cantons at a glance.",
  lead:
    "In Switzerland, a solar installation on a green field is the exception: it must be considered location-dependent. Since 1 January 2026, Art. 24ter RPG (Spatial Planning Act) has regulated when this applies to free-standing installations and to agrivoltaics.",
  akzent: "with proof of location and canton.",
  ertrag: {
    ort: "in the Bernese Mittelland north of Bern",
    spanne: "around 1,150 to 1,420 kWh/kWp",
    hinweis:
      "PVGIS values (optimal tilt, 14 % losses): around 1,150 kWh/kWp in the Thurgau Mittelland, around 1,420 kWh/kWp in the Valais Rhône valley near Sion; high alpine locations are higher but were not queried here.",
  },
  einleitung: [
    "Switzerland strictly separates building and non-building zones. Anyone who wants to build outside the building zone needs an exceptional permit, and for solar installations this is only granted if they are considered **location-dependent** (standortgebunden). Conventional solar parks on arable land of the kind built in Germany via a development plan therefore hardly exist. Expansion takes place mainly on rooftops, facades and infrastructure. In its information sheet, the canton of Lucerne cites the federal target: photovoltaics is to grow to 34 TWh per year by 2050, around twelve times as much as in 2021.",
    "With the Electricity Act (Mantelerlass, the omnibus energy act) adopted by voters on 9 June 2024, the scope for open land has widened. Today there are three routes: **free-standing installations in areas of low sensitivity or already affected by prior use**, **agrivoltaics with a benefit for agriculture** and **large installations of national interest** in suitable areas of the cantonal structure plan (Richtplan). In addition, there are the alpine large-scale installations of the time-limited Solarexpress.",
    "The agricultural area covers around 1.04 million hectares, of which, according to the Federal Statistical Office, just under 40 % is arable land; the rest is mainly meadows and pastures. For owners this means: land is not suitable simply because it is large and sunny. Decisive are prior use, protection interests, crop rotation areas (Fruchtfolgeflächen) and the benefit for agriculture.",
  ],
  recht: [
    {
      titel: "Art. 24ter RPG: free-standing installations since 1 January 2026",
      text: "Solar installations that are not of national interest and are located on open land outside the building zone and outside the agricultural area are considered location-dependent if they stand in **areas of low sensitivity or areas already affected by buildings and installations** and the effort for access and grid connection is reasonable in relation to capacity. The provision came with the Electricity Act and, under the current RPG, has been in force since 1 January 2026. When finally decommissioned, the installation must be dismantled and the original condition restored.",
    },
    {
      titel: "Agrivoltaics only with a benefit for agriculture",
      text: "On agricultural land, a solar installation is only location-dependent under Art. 24ter(2) RPG if it does not impair agricultural interests **and** brings benefits to production – or if it serves agricultural trial and research purposes. In every case, a comprehensive weighing of interests is required, among other things regarding landscape, soil protection and crop rotation areas.",
    },
    {
      titel: "Non-free-standing installations: Art. 32c RPV",
      text: "Solar installations outside the building zone that visually form a unit with lawful buildings or installations expected to remain in place for the longer term – for example on noise barriers, dam walls, car parks or embankments – can be approved as location-dependent under Art. 32c RPV (Spatial Planning Ordinance). For landowners, this is often the most realistic route outside the building zone.",
    },
    {
      titel: "National interest from 5 GWh of winter power",
      text: "Since 2025, new solar installations have been of national interest if their average expected production from October to March is at least **5 GWh** (Art. 9a EnV, Energy Ordinance). The cantons must designate suitable areas for them in the structure plan, taking into account landscape, forest and agriculture, in particular crop rotation areas. In these areas, solar installations enjoy a general priority in the weighing of interests, but a case-by-case assessment remains.",
    },
    {
      titel: "Solarexpress: only existing projects",
      text: "Art. 71a EnG (Energy Act) facilitated alpine large-scale installations from 10 GWh of annual production and at least 500 kWh/kW in the winter half-year; crop rotation areas were excluded, and the municipality and landowners had to agree. After the relaxation of 21 March 2025, only projects whose building application was publicly displayed by 31 December 2025 benefit. New projects fall under the ordinary rules.",
    },
    {
      titel: "Support: HEIV auction from 150 kW",
      text: "Installations from 150 kW without self-consumption compete at Pronovo for the high one-off remuneration (HEIV) or the sliding market premium. The auctions take place in several rounds per year; a participation fee of CHF 300 is charged per bid. The project must be ready for construction; from the date the award decision becomes legally binding, 24 months remain for commissioning. For installations with self-consumption, there is the one-off remuneration (KLEIV/GREIV).",
    },
  ],
  kulisse: {
    text: "There are no nationwide land categories for ground-mounted PV. Suitability results from federal law, the cantonal structure plan (energy section) and the weighing of interests in the individual case. According to federal law and cantonal information sheets, previously affected sites and agrivoltaics with a clear agricultural benefit are the most promising. Installations above 5 MW that are not attached to buildings also require an environmental impact assessment.",
    gut: [
      "Previously affected land along transport routes, gravel pits, landfills, dams or ski areas",
      "Non-free-standing installations on infrastructure: noise barriers, car parks, embankments, artificial waters",
      "Agrivoltaics over special and permanent crops such as berries or fruit, with protection against hail and weather",
      "Suitable areas for solar installations of national interest in the cantonal structure plan, where designated",
    ],
    schwierig: [
      "Crop rotation areas: yield potential and mechanised cultivation must be fully preserved",
      "Mire landscapes, biotopes of national importance and waterbird and migratory bird reserves (exclusion areas)",
      "BLN landscapes (federal inventory of landscapes), forest and sites of national importance (ISOS)",
      "Open arable land and grassland without a demonstrated benefit for production",
      "Remote locations with a long grid connection and high access costs",
    ],
  },
  ablauf: {
    text: "The building application is submitted to the municipality, publicly displayed there and, after objections, forwarded to the canton. The cantonal authority for buildings outside the building zones (Art. 25(2) RPG) decides on location-dependence and issues the exceptional permit. Depending on the canton, larger installations may require land-use planning or a basis in the structure plan; Appenzell Ausserrhoden, for example, sets the planning requirement at 1 MW. Electrical installations such as lines and transformer stations run in parallel through the plan approval procedure of the ESTI (Federal Inspectorate for Heavy Current Installations).",
    behoerden: [
      { name: "Municipality (building authority)", rolle: "Receipt and preliminary review of the building application, public display, objections; for Solarexpress installations, consent of the host municipality" },
      { name: "Cantonal office for buildings outside the building zones (e.g. rawi Lucerne, ARE Graubünden)", rolle: "Exceptional permit, assessment of location-dependence and weighing of interests" },
      { name: "Canton (structure planning, energy section)", rolle: "Suitable areas for solar installations of national interest, thresholds for the planning requirement" },
      { name: "Federal Inspectorate for Heavy Current Installations (ESTI)", rolle: "Plan approval for connection lines and electrical installations" },
      { name: "Pronovo", rolle: "Executing agency for the one-off remuneration, HEIV auctions and sliding market premium" },
    ],
  },
  agri: [
    "Switzerland applies a stricter standard to agrivoltaics than Germany: it is not enough for farming to remain possible under the modules. The installation must bring a **benefit** to production, such as weather protection or an increase in yield or quality, or serve research. On crop rotation areas, the federal explanatory notes require yield potential and mechanised cultivation to be fully preserved; a purely financial benefit is not sufficient. The Swiss Farmers’ Union regards above all special and permanent crops as agrivoltaics, but not installations on arable land and grassland.",
    "Direct payments are important for farmers: land with solar installations generally does not count as agricultural area (Art. 16 LBV, Agricultural Terminology Ordinance). According to the Farmers’ Union’s position paper, exceptions are installations with a benefit for production or for research purposes for which a legally binding building permit exists; the land must be owned or leased in writing. Solarexpress land is excluded from the agricultural area. Practical examples according to the Swiss Federal Office of Energy (SFOE): trials by Agroscope in Conthey (VS) with berries and, since autumn 2025, fruit trees, a raspberry installation on more than 7,000 m² in Gelfingen (LU) and a 2 MWp installation over organic blueberries in the canton of Vaud.",
  ],
  netz: {
    hinweis:
      "Since 2025, the costs of grid reinforcements triggered by connecting renewable installations at medium voltage have been spread across all grid users via Swissgrid, with the approval of ElCom (the Federal Electricity Commission). In the mountains, long connection lines nevertheless drive up costs considerably.",
  },
  besonderheiten: [
    {
      titel: "Winter power instead of annual yield",
      text: "Swiss energy policy measures large solar installations by their winter power. National interest depends on 5 GWh from October to March, and the Solarexpress required 500 kWh/kW in the winter half-year. This winter threshold is mainly reached by high-altitude installations, which is why the Solarexpress projects concentrated on the Alps.",
    },
    {
      titel: "Solarexpress: target clearly missed",
      text: "According to an evaluation from October 2025, 23 of 53 announced alpine projects had been abandoned; four were under construction or partly in operation (Madrisa Solar, NalpSolar, Sedrun Solar in Graubünden, Sidenplangg in Uri). The remaining projects would together come to around 0.74 TWh per year, far below the target of 2 TWh. Reasons given include construction costs of around CHF 4,000 per kW, grid connections and objections.",
    },
    {
      titel: "Landscape protection and public say",
      text: "Environmental organisations such as Pro Natura, WWF or Mountain Wilderness can lodge objections, and municipalities vote on projects. In the Valais, voters rejected a decree to speed up procedures for alpine installations by 53.94 % on 10 September 2023.",
    },
    {
      titel: "Local marketing via LEG and vZEV",
      text: "Since 1 January 2026, producers and consumers in the same municipality and grid level can form a local electricity community (LEG); the grid usage fee for power shared internally falls by 40 %, or by 20 % when the transformation level is used. Since 2025, the virtual ZEV (self-consumption group) has allowed the use of connection lines. For installations on the edge of settlements, this can improve profitability.",
    },
  ],
  pacht: {
    begruendung:
      "For solar leases in Switzerland there are no reliable comparative values because there are hardly any ground-mounted installations, and the DACH range calculated in euros cannot be transferred directly because of the franc, land law (BGBB, the Federal Act on Rural Land Rights, and lease law) and case-by-case permits. High land values and the HEIV of up to 60 % tend to argue for higher fees, while small areas, long connections and, for agrivoltaics, dual use tend to argue for lower ones – hence the neutral classification; the specific project remains decisive.",
  },
  faq: [
    {
      q: "May a solar park be built on a meadow in Switzerland?",
      a: "Only exceptionally. Outside the building zone, the installation must be location-dependent. Under Art. 24ter RPG, this applies to free-standing installations outside the agricultural area in areas of low sensitivity or prior use with reasonable access costs. On agricultural land, a benefit for production or a research purpose is also required.",
    },
    {
      q: "How much lease does a solar park pay in Switzerland?",
      a: "Published comparative values hardly exist, because only a few ground-mounted installations exist. The fee depends on the site, type of installation, support (HEIV or market premium) and whether the land continues to be used for agriculture. Agricultural land is subject to rural land law and lease law; have the contract checked legally.",
    },
    {
      q: "Do I lose direct payments with agrivoltaics?",
      a: "Not necessarily. Land with solar installations generally does not count as agricultural area. According to the Swiss Farmers’ Union’s position paper, however, it remains eligible if the installation is approved with legal effect as agrivoltaics with a benefit for production or for research purposes and you farm the land as owner or under a written lease. Clarify this in advance with the cantonal agriculture office.",
    },
    {
      q: "When is a solar installation of national interest?",
      a: "When its average expected production from October to March is at least 5 GWh. Depending on the site, this corresponds roughly to 10 to 20 hectares. In the suitable areas of the cantonal structure plan, such an installation has a general priority in the weighing of interests.",
    },
    {
      q: "Can a new project still use the Solarexpress?",
      a: "No. Only alpine projects whose building application was publicly displayed by 31 December 2025 benefit. New large-scale installations follow the rules for installations of national interest or Art. 24ter RPG and are supported via the HEIV or market premium.",
    },
    {
      q: "Which canton is most open to ground-mounted PV?",
      a: "This cannot be said across the board. The SFOE notes that some cantons assess agrivoltaics rather openly and others very restrictively. For alpine large-scale installations, Graubünden and Uri have so far gone furthest; in the Mittelland, agrivoltaics over special crops and previously affected sites are in the foreground.",
    },
  ],
  kantone: [
    {
      name: "Bern",
      text: "There are alpine Solarexpress projects in the canton of Bern too; according to the October 2025 evaluation, Morgeten Solar has been approved at first instance. The canton has published its own information sheet on alpine large-scale photovoltaic installations. In the Mittelland, the federal rules for previously affected land and agrivoltaics apply.",
    },
    {
      name: "Lucerne",
      text: "Lucerne has an information sheet on solar installations (valid from 1 January 2026) with a flow chart: ground-mounted installations should mainly be built on secondary areas, on infrastructure and as weather protection or to increase yields in agriculture, with rooftops and facades taking priority. In Gelfingen, a farm is testing three agrivoltaic systems over three years on more than 7,000 m² of raspberries.",
    },
    {
      name: "Graubünden",
      text: "Graubünden has gone furthest with the Solarexpress: Madrisa Solar (Klosters) has been partly supplying power since September 2025, NalpSolar and Sedrun Solar (Tujetsch) are under construction, and Solar Magriel has been approved with legal effect. The cantonal government is responsible; the canton has issued its own guide to the permit procedure (supplement April 2025).",
    },
    {
      name: "Valais",
      text: "In the Valais, where the Solarexpress originated, there were still no legally binding permits in October 2025; Gondo Solar and Hohsaas had been approved at first instance. In 2023, a cantonal acceleration decree failed at the ballot box. In the Rhône valley, Agroscope in Conthey is researching agrivoltaics over berries and fruit.",
    },
    {
      name: "Uri and Central Switzerland",
      text: "With Sidenplangg, one of the four alpine Solarexpress installations under construction or partly in operation is in Uri – the only one outside Graubünden. Otherwise, the federal rules under Art. 24ter RPG and the requirements of the cantonal structure plan apply here too.",
    },
    {
      name: "Vaud and western Switzerland",
      text: "According to the SFOE, there is a 2 MWp agrivoltaic installation in the canton of Vaud over organic blueberries with semi-transparent modules that protect the crop from hail after heavy losses. In the Jura (Saint-Brais), according to the Farmers’ Union, there are plans for a large installation of national interest on agricultural land.",
    },
    {
      name: "Appenzell Ausserrhoden and eastern Switzerland",
      text: "Because of its small-scale topography and livestock farming, Appenzell Ausserrhoden sees no great potential for installations of national interest and is not designating suitable areas for them for the time being. The draft structure plan (as of October 2025) puts rooftops and infrastructure first and requires a cantonal energy zone with a special land-use plan for free-standing installations above 1 MW, and above 5 MW additionally a basis in the structure plan.",
    },
  ],
};

export default region;
