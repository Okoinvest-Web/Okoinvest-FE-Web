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
          { name: "Login", href: "/login", icon: "LogIn", text: "Portal für Partner und Kunden" },
        ],
      },
    ],
  },
];
