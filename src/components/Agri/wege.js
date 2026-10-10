// Die vier Wege für Landwirte – eine Quelle für Vergleich, Entscheider und Rechner.
import { HandCoins, Handshake, Tractor, Users } from "lucide-react";
import { pfad, schreibweiseFuer } from "@/lib/land";
import { zusammenfuehren } from "@/lib/sprache/woerterbuch";

export const WEGE = [
  {
    id: "pacht",
    buchstabe: "A",
    icon: HandCoins,
    titel: "Fläche verpachten",
    kurz: "Solarpark auf Ihrer Fläche – Sie erhalten Pacht.",
    text: "Ein Betreiber baut einen klassischen Solarpark. Sie erhalten 30 Jahre eine feste oder indexierte Pacht; die Fläche wird extensiv gepflegt, oft durch Beweidung.",
    invest: "keine",
    einnahmen: "Pacht Freifläche, meist die höchste je Hektar",
    risiko: "sehr gering",
    bewirtschaftung: "nur Pflege/Beweidung",
    aufwand: "sehr gering",
    fuer: "Flächen, die Sie ohnehin abgeben oder extensivieren möchten",
    href: pfad("/flaeche-verpachten"),
  },
  {
    id: "eigen",
    buchstabe: "B",
    icon: Tractor,
    titel: "Selbst investieren",
    kurz: "Ihre Anlage – wir planen, bauen und vermarkten.",
    text: "Sie sind Eigentümer der Agri-PV-Anlage. Wir übernehmen Planung, Genehmigung, Bau, Betriebsführung und Direktvermarktung; Sie finanzieren mit Eigenkapital und Bankdarlehen.",
    invest: "hoch – Eigenkapital + Bankdarlehen",
    einnahmen: "Stromerlöse abzgl. Kosten, plus Ernte und GAP",
    risiko: "unternehmerisch",
    bewirtschaftung: "voll, auf rund 85–90 % der Fläche",
    aufwand: "mittel – Entscheidungen, Finanzierung",
    fuer: "Betriebe mit Eigenkapital, die Wertschöpfung auf dem Hof halten wollen",
    href: pfad("/rechner/agri-pv"),
  },
  {
    id: "investor",
    buchstabe: "C",
    icon: Handshake,
    titel: "Investor baut, Sie bewirtschaften",
    kurz: "Agri-PV durch einen Investor – Sie erhalten Pacht und ernten weiter.",
    text: "Ein Investor finanziert und betreibt die Agri-PV-Anlage. Sie erhalten eine Pacht und bewirtschaften die Fläche zwischen oder unter den Modulen weiter – die GAP-Förderung bleibt in der Regel zum größten Teil erhalten.",
    invest: "keine",
    einnahmen: "Agri-Pacht plus Ernte plus GAP",
    risiko: "gering",
    bewirtschaftung: "voll, auf rund 85–90 % der Fläche",
    aufwand: "gering – Abstimmung der Bewirtschaftung",
    fuer: "Betriebe, die weiter wirtschaften und ohne Kapital ein Standbein aufbauen wollen",
    href: pfad("/agri-pv"),
  },
  {
    id: "genossenschaft",
    buchstabe: "D",
    icon: Users,
    titel: "Beteiligung über die Genossenschaft",
    kurz: "Pacht + Miteigentum als Mitglied der Genossenschaft.",
    text: "Die Anlage gehört ganz oder teilweise einer Genossenschaft, in der Sie – und auf Wunsch Nachbarn und Gemeinde – Mitglied sind. Sie erhalten Pacht, bewirtschaften weiter und sind über Ihre Anteile am Ertrag beteiligt.",
    invest: "wählbar – Anteile",
    einnahmen: "Pacht plus Ausschüttung plus Ernte und GAP",
    risiko: "mittel, gestreut",
    bewirtschaftung: "voll, auf rund 85–90 % der Fläche",
    aufwand: "gering – Mitgliedschaft",
    fuer: "Betriebe, die mitverdienen wollen, ohne alles allein zu stemmen",
    href: pfad("/genossenschaft"),
  },
];

export const wegById = (id) => WEGE.find((w) => w.id === id);

/** Englisch (Sprachmodell): nur Texte, gleiche Reihenfolge wie WEGE; Icons, ids und hrefs aus WEGE. */
const WEGE_EN_TEXTE = [
  {
    titel: "Lease your land",
    kurz: "A solar park on your land – you receive a lease.",
    text: "An operator builds a conventional solar park. You receive a fixed or indexed lease for 30 years; the land is managed extensively, often through grazing.",
    invest: "none",
    einnahmen: "Ground-mounted lease, usually the highest per hectare",
    risiko: "very low",
    bewirtschaftung: "maintenance/grazing only",
    aufwand: "very low",
    fuer: "Land you want to give up or farm less intensively anyway",
  },
  {
    titel: "Invest yourself",
    kurz: "Your installation – we plan, build and market it.",
    text: "You own the agrivoltaic installation. We take care of planning, permitting, construction, operational management and direct marketing; you finance it with equity and a bank loan.",
    invest: "high – equity + bank loan",
    einnahmen: "Power revenue minus costs, plus harvest and CAP",
    risiko: "entrepreneurial",
    bewirtschaftung: "full, on around 85–90 % of the land",
    aufwand: "medium – decisions, financing",
    fuer: "Farms with equity that want to keep the added value on the farm",
  },
  {
    titel: "Investor builds, you farm",
    kurz: "Agrivoltaics by an investor – you receive a lease and keep harvesting.",
    text: "An investor finances and operates the agrivoltaic installation. You receive a lease and continue to farm the land between or under the modules – CAP support is usually largely retained.",
    invest: "none",
    einnahmen: "Agri lease plus harvest plus CAP",
    risiko: "low",
    bewirtschaftung: "full, on around 85–90 % of the land",
    aufwand: "low – coordinating the farming",
    fuer: "Farms that want to keep farming and build a second income without capital",
  },
  {
    titel: "Participation via the cooperative",
    kurz: "Lease + co-ownership as a member of the cooperative.",
    text: "The installation is wholly or partly owned by a cooperative in which you – and, if you wish, neighbours and the municipality – are members. You receive a lease, keep farming and share in the yield through your shares.",
    invest: "your choice – shares",
    einnahmen: "Lease plus distribution plus harvest and CAP",
    risiko: "medium, spread",
    bewirtschaftung: "full, on around 85–90 % of the land",
    aufwand: "low – membership",
    fuer: "Farms that want to share in the earnings without shouldering everything alone",
  },
];

export const WEGE_EN = zusammenfuehren(WEGE, WEGE_EN_TEXTE);

/**
 * Schweiz (Ländermodell, W3-0): Die GAP (EU-Agrarförderung) gilt dort nicht. Statt einer Zusage zu
 * Direktzahlungen der neutrale Stand aus src/data/laender/ch/agri-pv.js (beitragsberechtigt nur bei
 * rechtskräftiger Bewilligung als Agri-PV, vorab mit dem kantonalen Landwirtschaftsamt klären).
 */
const WEGE_CH = {
  de: {
    eigen: { einnahmen: "Stromerlöse abzgl. Kosten, plus Ernte" },
    investor: {
      text: "Ein Investor finanziert und betreibt die Agri-PV-Anlage. Sie erhalten eine Pacht und bewirtschaften die Fläche zwischen oder unter den Modulen weiter. Ob die Fläche beitragsberechtigt bleibt, hängt von der Bewilligung als Agri-PV ab – das klären wir vorab mit dem kantonalen Landwirtschaftsamt.",
      einnahmen: "Agri-Pacht plus Ernte",
    },
    genossenschaft: { einnahmen: "Pacht plus Ausschüttung plus Ernte" },
  },
  en: {
    eigen: { einnahmen: "Power revenue minus costs, plus harvest" },
    investor: {
      text: "An investor finances and operates the agrivoltaic installation. You receive a lease and continue to farm the land between or under the modules. Whether the land remains eligible for direct payments depends on the permit as agrivoltaics – we clarify this in advance with the cantonal agricultural office.",
      einnahmen: "Agri lease plus harvest",
    },
    genossenschaft: { einnahmen: "Lease plus distribution plus harvest" },
  },
};

/** Die vier Wege in der Sprache der Seite ("de" | "en"); land "CH": ohne GAP, ohne „ß“. */
export const wegeFuer = (sprache, land = null) => {
  const wege = sprache === "en" ? WEGE_EN : WEGE;
  if (land !== "CH") return wege;
  const ch = WEGE_CH[sprache === "en" ? "en" : "de"];
  return schreibweiseFuer(
    wege.map((w) => (ch[w.id] ? { ...w, ...ch[w.id] } : w)),
    "CH",
  );
};
