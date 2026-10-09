// src/data/navigation.js
// Zentrale Seitenstruktur – genutzt von Navigation, Footer und Sitemap.
// Icons werden als Namen gespeichert und in den Komponenten aufgelöst,
// damit diese Datei auch in Server-Komponenten importierbar bleibt.

export { KONTAKT } from "./site";

export const NAVIGATION = [
  {
    title: "Lösungen",
    slug: "loesungen",
    intro: "Wir entwickeln Solarkraftwerke – vom Acker bis zum Parkplatz.",
    groups: [
      {
        label: "Kraftwerke entwickeln",
        items: [
          { name: "Freiflächen-PV", href: "/freiflaeche", icon: "Sun", text: "Solarparks ab 1 MWp – Entwicklung bis Betrieb" },
          { name: "Agri-PV", href: "/agri-pv", icon: "Sprout", text: "Ernte und Strom auf derselben Fläche" },
          { name: "Solarcarports & Parkplätze", href: "/solarcarport", icon: "Car", text: "Parkflächen als Kraftwerk mit Ladepunkten" },
          { name: "Großspeicher", href: "/grossspeicher", icon: "BatteryCharging", text: "Batteriespeicher am Netzknoten und im Park" },
        ],
      },
      {
        label: "So arbeiten wir",
        items: [
          { name: "Projektprozess", href: "/prozess", icon: "Route", text: "Von der Fläche bis zur Inbetriebnahme" },
          { name: "Kommunen", href: "/kommunen", icon: "Landmark", text: "Wertschöpfung und Beteiligung vor Ort" },
        ],
      },
    ],
    feature: { title: "Fläche in 3 Minuten prüfen", text: "Lage, Größe, Netz – Sie erhalten sofort eine Ersteinschätzung mit Pachtspanne.", href: "/flaechencheck", cta: "Flächencheck starten" },
  },
  {
    title: "Für Sie",
    slug: "zielgruppen",
    intro: "Jeder bringt etwas mit. Wir machen daraus ein Kraftwerk.",
    groups: [
      {
        label: "Sie haben …",
        items: [
          { name: "Flächeneigentümer", href: "/flaeche-verpachten", icon: "MapPinned", text: "Fläche verpachten, sichere Pacht für 30+ Jahre" },
          { name: "Dacheigentümer", href: "/dachflaeche-verpachten", icon: "Warehouse", text: "Gewerbe- und Hallendächer verpachten" },
          { name: "Ihre Region", href: "/regionen", icon: "MapPinned", text: "Recht, Ertrag und Pacht je Bundesland" },
          { name: "Landwirte", href: "/landwirte", icon: "Tractor", text: "Agri-PV: verpachten, selbst investieren oder beteiligen" },
          { name: "Projektentwickler", href: "/projektboerse/anbieten", icon: "FolderUp", text: "Projekte über die Börse vermarkten" },
        ],
      },
      {
        label: "Sie suchen …",
        items: [
          { name: "Investoren", href: "/investoren", icon: "LineChart", text: "Projektrechte, baureife und Bestandsanlagen" },
          { name: "Unternehmen & Mittelstand", href: "/reststrom", icon: "Factory", text: "Günstiger Strom durch Pooling" },
          { name: "Bürger & Gemeinden", href: "/genossenschaft", icon: "Users", text: "Beteiligen über die Genossenschaft" },
        ],
      },
    ],
    feature: { title: "Ein Login für alles", text: "Flächen, Projekte, Investments und Strom – Status und Dokumente jederzeit im Portal.", href: "/registrieren", cta: "Zugang anlegen" },
  },
  {
    title: "Projektbörse",
    slug: "projektboerse",
    intro: "Der Marktplatz für PV-Projekte im DACH-Raum.",
    groups: [
      {
        label: "Projektbörse",
        items: [
          { name: "Projekte entdecken", href: "/projektboerse", icon: "LayoutGrid", text: "Von Projektrechten bis Bestandsanlage" },
          { name: "Börse auf der Karte", href: "/projektboerse/karte", icon: "Map", text: "Projekte nach Region in DACH" },
          { name: "Projekt anbieten", href: "/projektboerse/anbieten", icon: "FolderUp", text: "Inserieren, prüfen lassen, verkaufen" },
          { name: "Für Investoren", href: "/investoren", icon: "LineChart", text: "Suchprofil, NDA, Datenraum" },
          { name: "Bestandsanlagen", href: "/bestandsanlagen", icon: "Gauge", text: "Laufende Parks kaufen und verkaufen" },
          { name: "Projekt bewerten", href: "/rechner/projektbewertung", icon: "Scale", text: "Kaufpreis je kWp nach Projektphase" },
          { name: "Bestand bewerten", href: "/rechner/bestandsanlage", icon: "LineChart", text: "Ertragswert nach DCF" },
        ],
      },
    ],
    feature: { title: "Suchprofil anlegen", text: "Wir melden uns, sobald ein Projekt zu Ihrem Profil passt – bevor es öffentlich wird.", href: "/registrieren?rolle=investor", cta: "Als Investor registrieren" },
  },
  {
    title: "Energie",
    slug: "energie",
    intro: "Strom gemeinsam erzeugen, bündeln und günstiger beschaffen.",
    groups: [
      {
        label: "Strom",
        items: [
          { name: "Virtuelles Kraftwerk", href: "/virtuelles-kraftwerk", icon: "Network", text: "Erzeugung, Speicher und Verbrauch im Pool" },
          { name: "Reststrom-Pool Mittelstand", href: "/reststrom", icon: "Factory", text: "Was PV und Speicher nicht decken – gebündelt einkaufen" },
          { name: "Strommarkt live", href: "/energie-live", icon: "Activity", text: "Börsenpreis und Strommix in Echtzeit" },
        ],
      },
      {
        label: "Gemeinschaft",
        items: [
          { name: "Energiegemeinschaften", href: "/energiegemeinschaften", icon: "Share2", text: "Energy Sharing in DE, EEG in AT, LEG in CH" },
          { name: "Software für Energiegemeinschaften", href: "/energiegemeinschaften/software", icon: "LayoutDashboard", text: "Gründung, Abrechnung und Betrieb nach ElWG" },
          { name: "Genossenschaft", href: "/genossenschaft", icon: "Users", text: "Bürger und Landwirte als Miteigentümer" },
          { name: "Energy-Sharing-Rechner", href: "/rechner/energy-sharing", icon: "Share2", text: "Vorteil je Teilnehmer" },
        ],
      },
    ],
    feature: { title: "Stromkosten senken", text: "Verbrauch eingeben – wir zeigen, was der Pool gegenüber Ihrem Einzelvertrag spart.", href: "/rechner/reststrom", cta: "Ersparnis berechnen", live: true },
  },
  {
    title: "Rechner & Tools",
    slug: "rechner",
    intro: "Belastbare Zahlen, bevor Sie mit uns sprechen.",
    groups: [
      {
        label: "Fläche & Landwirtschaft",
        items: [
          { name: "Flächencheck", href: "/flaechencheck", icon: "MapPinned", text: "Eignung und Pachtspanne Ihrer Fläche" },
          { name: "Pachtrechner", href: "/rechner/pacht", icon: "HandCoins", text: "Pacht über 30 Jahre vs. Ackerbau" },
          { name: "Agri-PV-Rechner", href: "/rechner/agri-pv", icon: "Sprout", text: "Verpachten, investieren oder beteiligen" },
          { name: "Pachtangebot prüfen", href: "/rechner/pachtangebot-check", icon: "FileSearch", text: "Klausel-Check mit Ampel und Barwert" },
          { name: "Dachpacht-Rechner", href: "/rechner/dachpacht", icon: "Warehouse", text: "Gewerbedach: Pacht, PPA oder Invest" },
          { name: "Netzanschluss-Check", href: "/rechner/netzanschluss", icon: "Cable", text: "Kosten, Zeitrahmen, Risiken" },
        ],
      },
      {
        label: "Investition & Strom",
        items: [
          { name: "Solarpark-Renditerechner", href: "/rechner/solarpark", icon: "LineChart", text: "IRR, LCOE, Cashflow über 30 Jahre" },
          { name: "Projektbewertung", href: "/rechner/projektbewertung", icon: "Scale", text: "Was ist ein Projekt in welcher Phase wert?" },
          { name: "Reststrom-Rechner", href: "/rechner/reststrom", icon: "Factory", text: "Ersparnis durch den Strompool" },
          { name: "Carport-Rechner", href: "/rechner/solarcarport", icon: "Car", text: "Parkplatz-PV mit Ladepunkten" },
          { name: "Kommunal-Rechner", href: "/rechner/kommune", icon: "Landmark", text: "Einnahmen der Gemeinde aus dem Solarpark" },
          { name: "PPA-Rechner", href: "/rechner/ppa", icon: "Handshake", text: "Solarstrom zum Festpreis" },
          { name: "Großspeicher-Rechner", href: "/rechner/grossspeicher", icon: "BatteryCharging", text: "BESS-Rendite mit Erlösmix" },
        ],
      },
    ],
    feature: { title: "Alle Rechner auf einen Blick", text: "Werkzeuge für Eigentümer, Landwirte, Investoren und Unternehmen.", href: "/rechner", cta: "Zur Übersicht" },
  },
  {
    title: "Wissen",
    slug: "wissen",
    intro: "Fachwissen zu Flächen, Recht, Markt und Finanzierung.",
    groups: [
      {
        label: "Wissen",
        items: [
          { name: "Ratgeber", href: "/ratgeber", icon: "BookOpen", text: "Fachartikel für Eigentümer und Investoren" },
          { name: "Lexikon", href: "/wissen/lexikon", icon: "Library", text: "Von Aufstellungsbeschluss bis Zuschlagswert" },
          { name: "Marktdaten Solar", href: "/marktdaten", icon: "LineChart", text: "EEG-Zuschläge, Marktwert, Capture Rate, Zubau" },
          { name: "FAQ", href: "/faq", icon: "HelpCircle", text: "Die häufigsten Fragen – kurz beantwortet" },
        ],
      },
    ],
  },
  {
    title: "Unternehmen",
    slug: "unternehmen",
    intro: "Teil der ÖKOVOLT Gruppe. Seit 2010 im Solargeschäft.",
    groups: [
      {
        label: "Unternehmen",
        items: [
          { name: "Über ÖkoInvest", href: "/unternehmen", icon: "Building2", text: "Gruppe, Gesellschaften, Pipeline" },
          { name: "Referenzen", href: "/referenzen", icon: "BadgeCheck", text: "Seit 2012 eigene Solarparks – belegt" },
          { name: "Warum ÖkoInvest", href: "/warum-oekoinvest", icon: "Scale", text: "Marktplatz, Makler oder Entwickler-Plattform?" },
          { name: "English", href: "/en", icon: "Globe", text: "For international investors" },
          { name: "Kontakt", href: "/kontakt", icon: "MessageCircle", text: "Anfrage an das Projektteam" },
          { name: "Termin buchen", href: "/termin", icon: "CalendarDays", text: "Besichtigung, Telefon- oder Videoberatung" },
          { name: "Login", href: "/login", icon: "LogIn", text: "Portal für Partner und Kunden" },
        ],
      },
    ],
  },
];

// ---------------------------------------------------------------------------------------------
// Englisch (Sprachmodell, src/lib/sprache/woerterbuch.js): nur Texte, gleiche Reihenfolge wie
// NAVIGATION – hrefs, Icons und slugs kommen aus der deutschen Fassung. Seitenpfade bleiben
// deutsch (/en/freiflaeche); die Link-Komponente hängt /en und das Land selbst an.
export const NAVIGATION_EN = [
  {
    title: "Solutions",
    intro: "We develop solar power plants – from farmland to car parks.",
    groups: [
      {
        label: "Developing power plants",
        items: [
          { name: "Ground-mounted PV", text: "Solar parks from 1 MWp – development to operation" },
          { name: "Agrivoltaics", text: "Harvest and power on the same land" },
          { name: "Solar carports & car parks", text: "Car parks as power plants with charging points" },
          { name: "Battery storage", text: "Battery storage at grid nodes and in solar parks" },
        ],
      },
      {
        label: "How we work",
        items: [
          { name: "Project process", text: "From the land to commissioning" },
          { name: "Municipalities", text: "Local value creation and participation" },
        ],
      },
    ],
    feature: { title: "Check your land in 3 minutes", text: "Location, size, grid – you get an initial assessment with a lease range straight away.", cta: "Start land check" },
  },
  {
    title: "For you",
    intro: "Everyone brings something. We turn it into a power plant.",
    groups: [
      {
        label: "You have …",
        items: [
          { name: "Landowners", text: "Lease your land, secure lease income for 30+ years" },
          { name: "Roof owners", text: "Lease commercial and warehouse roofs" },
          { name: "Your region", text: "Law, yield and lease by federal state" },
          { name: "Farmers", text: "Agrivoltaics: lease, invest yourself or participate" },
          { name: "Project developers", text: "Market projects via the exchange" },
        ],
      },
      {
        label: "You are looking for …",
        items: [
          { name: "Investors", text: "Project rights, ready-to-build and operating assets" },
          { name: "Businesses & SMEs", text: "Cheaper power through pooling" },
          { name: "Citizens & municipalities", text: "Participate through the cooperative" },
        ],
      },
    ],
    feature: { title: "One login for everything", text: "Land, projects, investments and power – status and documents in the portal at any time.", cta: "Create access" },
  },
  {
    title: "Project exchange",
    intro: "The marketplace for PV projects in the DACH region.",
    groups: [
      {
        label: "Project exchange",
        items: [
          { name: "Discover projects", text: "From project rights to operating assets" },
          { name: "Exchange on the map", text: "Projects by region in DACH" },
          { name: "Offer a project", text: "List, have it reviewed, sell" },
          { name: "For investors", text: "Search profile, NDA, data room" },
          { name: "Operating assets", text: "Buy and sell operating parks" },
          { name: "Value a project", text: "Purchase price per kWp by project phase" },
          { name: "Value an operating asset", text: "Income value by DCF" },
        ],
      },
    ],
    feature: { title: "Create a search profile", text: "We get in touch as soon as a project matches your profile – before it goes public.", cta: "Register as an investor" },
  },
  {
    title: "Energy",
    intro: "Generate, pool and source power together – at lower cost.",
    groups: [
      {
        label: "Power",
        items: [
          { name: "Virtual power plant", text: "Generation, storage and consumption in a pool" },
          { name: "Residual power pool for SMEs", text: "What PV and storage do not cover – bought together" },
          { name: "Power market live", text: "Exchange price and power mix in real time" },
        ],
      },
      {
        label: "Community",
        items: [
          { name: "Energy communities", text: "Energy sharing in DE, EEG in AT, LEG in CH" },
          { name: "Software for energy communities", text: "Formation, billing and operation under the ElWG" },
          { name: "Cooperative", text: "Citizens and farmers as co-owners" },
          { name: "Energy sharing calculator", text: "Benefit per participant" },
        ],
      },
    ],
    feature: { title: "Cut power costs", text: "Enter your consumption – we show what the pool saves compared with your individual contract.", cta: "Calculate savings" },
  },
  {
    title: "Calculators & tools",
    intro: "Solid figures before you talk to us.",
    groups: [
      {
        label: "Land & farming",
        items: [
          { name: "Land check", text: "Suitability and lease range of your land" },
          { name: "Lease calculator", text: "Lease over 30 years vs. arable farming" },
          { name: "Agrivoltaics calculator", text: "Lease, invest or participate" },
          { name: "Check a lease offer", text: "Clause check with traffic light and present value" },
          { name: "Roof lease calculator", text: "Commercial roof: lease, PPA or invest" },
          { name: "Grid connection check", text: "Costs, time frame, risks" },
        ],
      },
      {
        label: "Investment & power",
        items: [
          { name: "Solar park return calculator", text: "IRR, LCOE, cash flow over 30 years" },
          { name: "Project valuation", text: "What is a project worth in which phase?" },
          { name: "Residual power calculator", text: "Savings through the power pool" },
          { name: "Carport calculator", text: "Car park PV with charging points" },
          { name: "Municipal calculator", text: "Municipal income from the solar park" },
          { name: "PPA calculator", text: "Solar power at a fixed price" },
          { name: "Battery storage calculator", text: "BESS return with revenue mix" },
        ],
      },
    ],
    feature: { title: "All calculators at a glance", text: "Tools for landowners, farmers, investors and businesses.", cta: "To the overview" },
  },
  {
    title: "Knowledge",
    intro: "Expertise on land, law, markets and financing.",
    groups: [
      {
        label: "Knowledge",
        items: [
          { name: "Guides", text: "Expert articles for owners and investors" },
          { name: "Glossary", text: "From zoning resolution to award value" },
          { name: "Solar market data", text: "EEG awards, market value, capture rate, additions" },
          { name: "FAQ", text: "The most common questions – answered briefly" },
        ],
      },
    ],
  },
  {
    title: "Company",
    intro: "Part of the ÖKOVOLT Group. In the solar business since 2010.",
    groups: [
      {
        label: "Company",
        items: [
          { name: "About ÖkoInvest", text: "Group, companies, pipeline" },
          { name: "References", text: "Own solar parks since 2012 – documented" },
          { name: "Why ÖkoInvest", text: "Marketplace, broker or developer platform?" },
          { name: "English", text: "For international investors" },
          { name: "Contact", text: "Enquiry to the project team" },
          { name: "Book an appointment", text: "Site visit, phone or video consultation" },
          { name: "Login", text: "Portal for partners and customers" },
        ],
      },
    ],
  },
];

/** Hinweis auf die englischen Seiten – entfällt auf Englisch (die Sprachwahl steht in der Kopfleiste). */
const istSprachEintrag = (s) => s.href === "/en";

/**
 * Navigation in einer Sprache (gleiche Struktur, gleiche hrefs und slugs; Rückfall Deutsch).
 * @param {"de"|"en"} sprache
 */
export function navigationFuer(sprache = "de") {
  if (sprache !== "en") return NAVIGATION;
  return NAVIGATION.map((n, i) => {
    const e = NAVIGATION_EN[i] || {};
    return {
      ...n,
      title: e.title || n.title,
      intro: e.intro || n.intro,
      groups: n.groups.map((g, j) => {
        const eg = e.groups?.[j] || {};
        return {
          ...g,
          label: eg.label || g.label,
          items: g.items.map((s, k) => ({ ...s, ...(eg.items?.[k] || {}) })).filter((s) => !istSprachEintrag(s)),
        };
      }),
      ...(n.feature ? { feature: { ...n.feature, ...(e.feature || {}) } } : {}),
    };
  });
}
