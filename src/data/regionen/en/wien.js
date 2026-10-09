// Englische Fassung der Regionalseite Wien (Sprachmodell) – Struktur wie die deutsche Datei.
// Befristete Fristen-Einträge (fristenAT) übersetzt die Regionalseite selbst über das Faktenregister.
const region = {
  seoTitel: "Solar park & agrivoltaics in Vienna: lease, law | ÖkoInvest",
  beschreibung:
    "Leasing land for a solar park in Vienna: why large ground-mounted PV is rare in Vienna, what the building code and the WElWG require, and where agrivoltaics on Viennese fields becomes possible.",
  lead: "For solar power, Vienna relies above all on rooftops, facades and infrastructure. Ground-mounted installations are the exception – but they exist, for example in the Donaustadt, and the city still has agricultural land in the south, north and east.",
  akzent: "with little land, but potential.",
  ertrag: {
    ort: "in the Donaustadt",
    spanne: "around 1,180 to 1,190 kWh/kWp",
    hinweis: "Second PVGIS point in Floridsdorf north of the Danube.",
  },
  einleitung: [
    "To be honest from the outset: **Vienna is not a place for large solar parks.** On 415 km² of city area, residential and commercial areas, the Vienna Woods, the Danube Island, the Lobau and recreational areas compete for every hectare. With its solar power offensive (Sonnenstrom-Offensive), the city therefore relies above all on rooftops, facades, car parks and municipal infrastructure. The target is 800 MWp of installed PV capacity by 2030; according to the city, more than 330 MWp had been reached in February 2026, up from around 50 MWp in 2020.",
    "Nevertheless, Vienna has real agriculture: according to the 2023 agricultural structure survey, 455 farms worked around 6,300 ha. According to the city, around a third of Vienna’s green space is used for agriculture – arable farming mainly on the southern edge in Favoriten and in Floridsdorf and the Donaustadt, market gardens in Simmering and the Donaustadt, and viticulture on the Kahlenberg, Nussberg and Bisamberg. According to its own information, Vienna is the only major city with viticulture within its city limits and leads Austria in greenhouse fruit vegetables.",
    "For landowners this means: a conventional ground-mounted installation on good arable soil is the exception in Vienna. Realistic starting points are previously affected land such as former landfills, land next to infrastructure and agrivoltaic concepts that preserve agricultural use. The best-known example is Wien Energie’s installation on Schafflerhofstrasse in the Donaustadt.",
  ],
  recht: [
    {
      titel: "Zoning: rural areas are intended for agriculture",
      text: "In Vienna, the municipal council sets the use in the zoning and development plan. Under § 6 of the Vienna Building Code, rural areas are intended for agricultural, forestry or professional horticultural use; buildings for these purposes and for public purposes are permitted there. § 6 does not provide for a separate zoning category for ground-mounted PV, as other Austrian states have. Whether a ground-mounted installation is permitted on a particular plot therefore depends heavily on the specific zoning and an assessment by the city.",
    },
    {
      titel: "Building code: permit in the green-belt protection area",
      text: "Since the 2023 amendment of the building code (in force 14 December 2023), PV installations are generally exempt from permits under § 62a BO. However, a building permit is always required in the **green-belt protection area** (Grünland-Schutzgebiet) and in areas with a building ban, and in certain cases in protection zones and for installations above 15 kW that are not examined under electricity law or other specialist laws. Free-standing modules on lawns in allotment areas are not permitted.",
    },
    {
      titel: "Electricity law: permit from as little as 250 kW",
      text: "Under the Vienna Electricity Industry Act 2005 (WElWG 2005), PV installations of more than 15 kW up to 50 kW must be notified, a simplified procedure applies above 50 kW up to 250 kW, and a permit is required above 250 kW. The municipal department MA 64 is responsible. The threshold is thus considerably lower than in the area states, where the state permit usually only applies from 500 or 1,000 kW.",
    },
    {
      titel: "Solar power offensive: 800 MWp by 2030",
      text: "The city wants to have PV installations with a total of 800 MWp installed by 2030, which requires annual additions on the scale of around 200 football pitches. The city builds installations on its own buildings and land and is expanding advice and funding for private owners, developers and businesses. The focus is clearly on land that is already in use.",
    },
    {
      titel: "EAG: 25 % deduction in Vienna too",
      text: "In Vienna too, the award value of the EAG market premium for installations on agricultural land or grassland is reduced by 25 %. Agrivoltaic installations whose main use is not or only slightly impaired and previously affected land such as landfills can be exempt – the obvious cases in Vienna.",
    },
  ],
  kulisse: {
    text: "Vienna’s largest ground-mounted installation stands on a former municipal gravel landfill. The other ground-mounted installations on Wien Energie’s list of the ten largest Viennese solar power plants each have less than 1 MWp, for example in Liesing, at the Donaustadt power plant, at the Central Cemetery or at the Leopoldau gas storage facility. For private landowners, this indicates where projects are realistic: on previously affected or technically used land and in agrivoltaic concepts on the edge of the city.",
    gut: [
      "Previously affected land such as former landfills or gravel pits",
      "Land next to power plants, substations and operational sites",
      "Arable land on the edge of the city for agrivoltaics with continued farming",
      "Land with grazing or extensive grassland use",
    ],
    schwierig: [
      "Green-belt protection areas, the Vienna woods and meadows belt",
      "Donau-Auen National Park (Lobau) and Wienerwald Biosphere Park",
      "Vineyards on the Kahlenberg, Nussberg and Bisamberg",
      "Land in urban development areas with foreseeable rezoning",
      "Allotment areas (modules on open land not permitted)",
    ],
  },
  ablauf: {
    text: "Because Vienna is both a state and a municipality, zoning and state procedures are handled by one administration: urban planning checks whether the use is compatible with the zoning and development plan, and changes are adopted by the municipal council. For installations above 250 kW, the electricity law permit from MA 64 follows, and in the green-belt protection area also a building permit from MA 37. Nature conservation issues must be clarified separately in protected areas. The grid connection is provided by Wiener Netze.",
    behoerden: [
      { name: "Municipal council and urban planning (zoning)", rolle: "Zoning and development plan, assessment of admissibility" },
      { name: "MA 64 (energy law)", rolle: "Notification and permit under WElWG 2005" },
      { name: "MA 37 – building authority", rolle: "Building permit in the green-belt protection area, in building bans and special cases" },
      { name: "Wiener Netze", rolle: "Grid access and grid connection" },
    ],
  },
  agri: [
    "Vienna has a well-known agrivoltaics test field: on Schafflerhofstrasse in the Donaustadt, Wien Energie has operated a ground-mounted installation since 2021, which was expanded in 2023 to around 17 MW and 16.8 ha. Around 150 sheep graze between the south-facing rows, and there are also around 400 bifacial, vertically mounted modules between which crops can be grown. The agricultural dual use is being researched together with the University of Natural Resources and Life Sciences (BOKU).",
    "For Viennese farmers with arable land on the southern edge, in Floridsdorf or the Donaustadt, vertical installations or elevated systems are the obvious form, because cereal, sugar beet and vegetable growing can continue. In terms of support, genuine agrivoltaic use can avoid the 25 % deduction under the EAG. How agrivoltaic installations fit with the “rural area” zoning should be clarified with urban planning before any contractual commitment.",
  ],
  netz: {
    hinweis: "No reliable information on grid bottlenecks in Vienna was available; the connection point and free capacity must be requested from Wiener Netze in the individual case.",
  },
  besonderheiten: [
    { titel: "Landfill instead of arable land", text: "Vienna’s largest ground-mounted installation stands on a former municipal gravel landfill. Previously affected land is the most important type of land for ground-mounted PV in Vienna – and is exempt from the EAG deduction in terms of support." },
    { titel: "Vegetables and greenhouses", text: "According to the city, Vienna ranks first in Austria for fruit vegetables such as cucumbers, tomatoes and aubergines, grown in the open and under glass; the market gardens are mainly in Simmering and the Donaustadt. For market gardens, PV on rooftops and ancillary areas is more obvious than on the growing area itself." },
    { titel: "Viticulture in the city", text: "Vienna’s vineyards on the Kahlenberg, Nussberg and Bisamberg shape the landscape and tourism. As things stand, ground-mounted installations play no role there." },
  ],
  pacht: {
    begruendung: "Few suitable sites, short grid connections and high demand for solar power contrast with competition from urban development and nature conservation as well as the EAG deduction; in Vienna, almost everything depends on the individual case.",
  },
  faq: [
    { q: "Can I lease my land in Vienna for a solar park?", a: "In principle yes, but only in individual cases. Vienna relies above all on rooftops and infrastructure; larger ground-mounted installations have so far mainly been built on previously affected or municipal land. Whether your land is suitable depends on zoning, protected areas and grid connection." },
    { q: "What is the largest ground-mounted PV installation in Vienna?", a: "According to Wien Energie, the installation on Schafflerhofstrasse in the Donaustadt with around 17 MW on 16.8 ha, built on a former gravel landfill and combined with sheep grazing and an agrivoltaics test area." },
    { q: "Which permits does a PV installation in Vienna need?", a: "Under the WElWG 2005, a notification above 15 kW, a simplified procedure above 50 kW and a permit from MA 64 above 250 kW. In the green-belt protection area and in building bans, a building permit is also required." },
    { q: "Is agrivoltaics possible in Vienna?", a: "Yes, Wien Energie is testing vertical bifacial modules on Schafflerhofstrasse together with BOKU University. For your own land, compatibility with the “rural area” zoning should be clarified with the city early on." },
    { q: "What expansion target does Vienna have for photovoltaics?", a: "The city’s solar power offensive provides for 800 MWp by 2030. According to the city, more than 330 MWp were installed in February 2026." },
    { q: "How much lease is realistic in Vienna?", a: "That can hardly be said in general terms for Vienna, because only a few sites are suitable and each is assessed individually. Zoning, prior use and eligibility for support are decisive. The lease calculator gives a first orientation." },
  ],
};

export default region;
