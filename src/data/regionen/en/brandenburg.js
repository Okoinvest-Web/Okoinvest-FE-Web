// Englische Fassung der Regionalseite Brandenburg (Sprachmodell) – Struktur wie die deutsche Datei.
const region = {
  seoTitel: "Solar park & agrivoltaics in Brandenburg: lease, law | ÖkoInvest",
  beschreibung:
    "Leasing land for a solar park in Brandenburg: ground-mounted PV and agrivoltaics on arable land, grassland and former opencast mining areas – eligible land, solar levy, landscape protection rules and process.",
  lead:
    "Brandenburg is one of the most important area states for solar parks: large fields, many low-yield sandy soils and a statutory special levy that gives municipalities a direct share in the proceeds.",
  akzent: "with levy and planning guide.",
  ertrag: {
    ort: "near Cottbus (Lusatia)",
    spanne: "around 1,040 to 1,070 kWh/kWp",
    hinweis:
      "The second PVGIS point near Kyritz (Prignitz) is around 1,040 kWh/kWp; the south and east of the state perform slightly better than the north-west.",
  },
  einleitung: [
    "Brandenburg farms around 1.3 million hectares of agricultural land, about three quarters of it arable. With an average of around 242 hectares, farms are significantly larger than the national average, and a large share of the land is leased. For solar parks this means: contiguous areas are comparatively easy to find, but lease arrangements and coordination with the farming business play a major role.",
    "In its Energy Strategy 2040, the state is relying on a strong expansion of photovoltaics: 18 GW of installed capacity by 2030 and 33 GW by 2040. The focus is to be on rooftops and car parks, but according to the joint planning guide of the state ministries, ground-mounted installations as well as the special forms **agrivoltaics** and **peatland PV** are expressly an important component.",
    "In addition, there are special features found in only a few states: the large former opencast mining areas of Lusatia, a state-law **special levy paid to the municipalities** and a special approval procedure for solar parks in landscape protection areas. As early as 2020/2021, the Weesow-Willmersdorf solar park near Werneuchen (Barnim) with 187 MW was connected to the grid without EEG support – evidence that subsidy-free marketing via power purchase agreements has also been tested in practice in Brandenburg.",
  ],
  recht: [
    {
      titel: "Less-favoured areas: automatically open since Solar Package I",
      text: "Unlike Saxony or Thuringia, for example, Brandenburg had not used the state opening clause for arable land and grassland in less-favoured areas before 2024. Solar Package I (in force since 16 May 2024) reversed the principle: less-favoured areas are in principle open to EEG tenders nationwide, and the states can only restrict them again by ordinance under § 37c EEG, for example if more than 1 % of agricultural land is covered by ground-mounted installations. We did not find such a Brandenburg restriction ordinance in our research. Whether your land lies within the eligible category should nevertheless be checked before any commitment.",
    },
    {
      titel: "Special levy to municipalities: €2,000 per MW and year",
      text: "Brandenburg obliges operators by law to make a payment to the host municipality. Since 28 November 2025, the **BbgEESG** (special levy for wind energy and ground-mounted PV installations) has applied, replacing the earlier photovoltaic levy act of January 2024. For ground-mounted installations above 1 MW commissioned after 31 December 2024, the levy is **€2,000 per megawatt of installed capacity and year**; installations on lignite rehabilitation areas commissioned after 31 December 2025 are also included. The payment is due annually by 30 April of the following year. For owners this means: the municipality has a measurable interest of its own in the project – which often makes land-use planning easier.",
    },
    {
      titel: "Joint planning guide for ground-mounted PV with positive and exclusion criteria",
      text: "The ministries for agriculture/environment, infrastructure/state planning and economic affairs have published a joint planning guide for municipalities (as of August 2023). It is not a law, but it shapes municipal practice. According to it, **excluded** are, among others, the open-space network under objective 6.2 of the State Development Plan for the Capital Region (LEP HR), forest, nature reserves and FFH sites, legally protected biotopes, natural water bodies and water protection areas. Case-by-case assessment applies, for example, to locations on the edge of villages, low-disturbance areas and areas with high-value landscape scenery.",
    },
    {
      titel: "Landscape protection areas: ministerial approval possible",
      text: "An approval procedure has been introduced in Brandenburg’s landscape protection areas: the responsible environment ministry can exceptionally approve a specific development plan that conflicts with the protection purpose. The state parliament has resolved a site-specific opening for ground-mounted, agri- and peatland PV in large landscape protection areas; the ministry has published its own framework conditions for this. Land in a landscape protection area is therefore not automatically excluded, but requires considerably more justification.",
    },
    {
      titel: "Recommendations for installation design",
      text: "For reasons of the biotope network, the planning guide recommends not planning installations larger than **200 ha**. From 100 ha, contiguous module sub-areas should cover no more than 20 ha and a quarter of the total area should remain free; for installations of 500 m length or more, crossing corridors for wildlife should be provided, and edge strips of at least 3 m inside the fencing. These requirements influence how much of your land is actually covered with modules.",
    },
  ],
  kulisse: {
    text: "Brandenburg offers a lot of land, but not just any land: decisive are the exclusion criteria of the state planning guide, the open-space network of the joint state development plan with Berlin and the protected areas. Previously affected land and low-yield arable sites close to the grid have particularly good chances; for arable land outside the EEG categories, subsidy-free marketing via a PPA remains an option.",
    gut: [
      "Former opencast mining and recultivation areas in Lusatia",
      "Conversion areas (former military, commercial or transport land), unless valuable for nature conservation",
      "Low-yield sandy arable land in less-favoured areas",
      "Strips up to 500 m along motorways and railway lines",
      "Drained, agriculturally used peat soils – only as peatland PV with rewetting",
    ],
    schwierig: [
      "Open-space network under objective 6.2 LEP HR (regularly excluded)",
      "Forest, nature reserves and FFH sites, protected biotopes, water protection areas",
      "Landscape protection areas (only with ministerial approval of the development plan)",
      "High-value landscape scenery and low-disturbance areas according to the landscape programme",
      "Locations directly on the edge of villages without sufficient distance",
    ],
  },
  ablauf: {
    text: "As everywhere in Germany, a solar park in Brandenburg usually needs a development plan from the municipality. The municipality assesses the project against the state planning guide and often its own site concept. The Joint State Planning Department Berlin-Brandenburg checks compatibility with the objectives of spatial planning, in particular with the open-space network of the LEP HR; the five regional planning associations (such as Prignitz-Oberhavel with its own planning guide for PV installations) contribute regional interests. The district is involved as the lower building supervisory and nature conservation authority, and in landscape protection areas also the environment ministry. In parallel, the grid enquiry and the special levy are clarified with the municipality.",
    behoerden: [
      { name: "Town / municipality", rolle: "Resolution to draw up a plan, land-use and development plan, conclusion of participation agreements" },
      { name: "Joint State Planning Department Berlin-Brandenburg", rolle: "Review of spatial planning objectives (LEP HR, open-space network)" },
      { name: "Regional planning association", rolle: "Regional plan, opinion in the procedure" },
      { name: "District / independent city", rolle: "Lower building supervisory and nature conservation authority, building permit" },
      { name: "MLEUV Brandenburg (state environment ministry)", rolle: "Approval of development plans in landscape protection areas" },
    ],
  },
  agri: [
    "Brandenburg expressly names agrivoltaics and peatland PV as **preferred solutions of state policy**. The planning guide recommends that municipalities support multiple-use concepts with modules arranged in rows, between which farming can continue. With a design under DIN SPEC 91434, according to this source, roughly 85 to 90 % of the land can continue to be used for agriculture – an argument that often counts in municipal councils with strong farming interests.",
    "For owners whose land is leased to a farm, agrivoltaics is particularly interesting: the tenant can continue farming, and most of the leased land remains in agricultural use. According to the planning guide, peatland PV should only be supported in connection with the rewetting of drained, agriculturally used peatland; here the water authority and water law must be involved early.",
  ],
  netz: {
    hinweis:
      "The north-east and centre are mainly supplied by E.DIS Netz, the south (including Elbe-Elster, Oberspreewald-Lausitz, Spree-Neiße) partly by MITNETZ STROM. In the MITNETZ area, the share of renewable energy in electricity consumption was already 113 % in 2024; available grid capacity is therefore a central site criterion.",
  },
  besonderheiten: [
    {
      titel: "Former opencast mining areas in Lusatia",
      text: "On its former mining land, LEAG is planning wind and solar parks on a gigawatt scale with the “GigawattFactory”; as one component, a 133 MW solar park is being built in the Bohrau energy park on agriculturally recultivated land of the Jänschwalde opencast mine. For private owners of neighbouring land, this can affect the grid situation and competition for connection points.",
    },
    {
      titel: "Floating PV on the Cottbuser Ostsee",
      text: "On the Cottbuser Ostsee, a flooded opencast mine, LEAG has built a floating PV installation of around 29 MW; storm damage delayed commissioning in early 2025. Under the Federal Water Act, tight limits apply to floating PV: at most 15 % coverage and at least 40 m from the shore on artificial water bodies.",
    },
    {
      titel: "Much leased land, large farms",
      text: "Around two thirds of agricultural land in Brandenburg is leased. Owners should therefore clarify early how current agricultural leases can be terminated or coordinated with the solar project – or whether agrivoltaics with the existing tenant is the better solution.",
    },
  ],
  pacht: {
    begruendung:
      "A lot of available land and low-yield soils contrast with high demand from project developers and the levy paid to municipalities; the level depends above all on the grid connection and the land category in the individual case.",
  },
  faq: [
    {
      q: "Has Brandenburg opened up the less-favoured areas for solar parks?",
      a: "Not before 2024. Since Solar Package I (16 May 2024), less-favoured areas have in principle been open to EEG tenders nationwide, as long as a state does not restrict them again by ordinance under § 37c EEG. As things stand, we have not found such a Brandenburg ordinance – the specific land should nevertheless be checked.",
    },
    {
      q: "What is the Brandenburg solar levy?",
      a: "Operators of ground-mounted installations above 1 MW commissioned after 31 December 2024 pay the host municipality €2,000 per megawatt each year. The legal basis since November 2025 has been the BbgEESG. The levy is paid by the operator, not the landowner.",
    },
    {
      q: "How much lease income does a solar park bring in Brandenburg?",
      a: "The lease depends above all on the grid connection, the land category (EEG or PPA), the size and shape of the land. Within the usual range, Brandenburg tends to be in the middle; a specific assessment is only seriously possible for the individual site.",
    },
    {
      q: "Is my land in a landscape protection area excluded?",
      a: "Not automatically. In Brandenburg’s landscape protection areas, the environment ministry can approve a specific development plan if the conditions of the published framework are met. However, the procedure is more complex and the outcome is open.",
    },
    {
      q: "How large may a solar park in Brandenburg be?",
      a: "There is no fixed legal upper limit. However, the state planning guide recommends not planning installations larger than 200 ha and dividing larger installations into sub-areas of at most 20 ha.",
    },
    {
      q: "Is my peatland suitable for a solar park?",
      a: "Only as peatland PV combined with the rewetting of drained, agriculturally used peat soils. The state regards peatland PV as a preferred solution, but the water law requirements are high.",
    },
  ],
};

export default region;
