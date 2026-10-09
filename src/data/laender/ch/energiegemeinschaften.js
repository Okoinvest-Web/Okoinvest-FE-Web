// Länderinhalt CH für /energiegemeinschaften (Ländermodell, Inhalte CH – Gruppe 1).
// Grundlage: Stromgesetz (Mantelerlass, Volksabstimmung 09.06.2024) – LEG seit 01.01.2026 mit Abschlag auf
// das Netznutzungsentgelt (40 % gleiche Netzebene, 20 % über die Transformationsebene), vZEV seit 2025;
// geprüfte Stammdaten in src/components/Gemeinschaft/laender.js und src/data/regionen/schweiz.js.
// Querverweise ohne Rechner, die für die Schweiz noch den LandHinweis zeigen (Energy-Sharing-Rechner,
// EG-Ersparnisrechner) und ohne die österreichbezogene Software-Seite.

export const ENERGIEGEMEINSCHAFTEN_CH = {
  metadata: {
    title: "Lokale Elektrizitätsgemeinschaft (LEG) und vZEV in der Schweiz | ÖkoInvest",
    description:
      "LEG oder virtuellen ZEV in der Schweiz gründen oder mit Solarstrom aus der Gemeinde versorgen: Abschlag auf das Netznutzungsentgelt, Voraussetzungen und Grenzen – im Vergleich zu Deutschland und Österreich.",
    openGraph: {
      type: "website",
      locale: "de_CH",
      siteName: "ÖkoInvest",
      title: "LEG und vZEV in der Schweiz | ÖkoInvest",
      description: "Lokale Elektrizitätsgemeinschaft seit 1. Januar 2026: Strom innerhalb der Gemeinde teilen, Netznutzungsentgelt senken.",
    },
  },
  querverweise: [
    { href: "/regionen/schweiz", titel: "Solarpark und Agri-PV in der Schweiz", text: "Art. 24ter RPG, LEG und vZEV, HEIV-Auktionen und Kantone – mit Quellen." },
    { href: "/ratgeber/energy-sharing-energiegemeinschaften", titel: "Energy Sharing im Vergleich", text: "LEG, ZEV, EEG, BEG und § 42c EnWG ausführlich erklärt." },
    { href: "/kommunen", titel: "Gemeinden", text: "Wertschöpfung und Beteiligung vor Ort – mit Solaranlagen in der eigenen Gemeinde." },
    { href: "/genossenschaft", titel: "Energiegenossenschaft", text: "Bürgerinnen, Bürger, Landwirte und Gemeinden als Miteigentümer der Anlagen." },
    { href: "/virtuelles-kraftwerk", titel: "Virtuelles Kraftwerk", text: "Wie Erzeugung, Speicher und Verbrauch im Verbund zusammenwirken." },
  ],
};

// Englische Fassung (Sprachmodell): gleicher Inhalt, gleiche Reihenfolge; Links wie oben (über uebersetze()).
export const ENERGIEGEMEINSCHAFTEN_CH_EN = {
  metadata: {
    title: "Local electricity community (LEG) and vZEV in Switzerland | ÖkoInvest",
    description:
      "Found an LEG or virtual ZEV in Switzerland, or supply one with solar power from the municipality: discount on the grid usage fee, requirements and limits – compared with Germany and Austria.",
    openGraph: {
      locale: "en_GB",
      title: "LEG and vZEV in Switzerland | ÖkoInvest",
      description: "Local electricity community since 1 January 2026: share power within the municipality, lower the grid usage fee.",
    },
  },
  querverweise: [
    { titel: "Solar parks and agrivoltaics in Switzerland", text: "Art. 24ter RPG (Spatial Planning Act), LEG and vZEV, HEIV auctions and cantons – with sources." },
    { titel: "Energy sharing compared", text: "LEG, ZEV, EEG, BEG and § 42c EnWG explained in detail." },
    { titel: "Municipalities", text: "Local value creation and participation – with solar installations in your own municipality." },
    { titel: "Energy cooperative", text: "Citizens, farmers and municipalities as co-owners of the installations." },
    { titel: "Virtual power plant", text: "How generation, storage and consumption work together in a network." },
  ],
};
