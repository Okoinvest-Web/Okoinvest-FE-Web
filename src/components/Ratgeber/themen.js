// Gestaltungsdaten der fünf Ratgeber-Themenbereiche (Symbol, Tönung, Anker-Kürzel).
// Die Themenbereiche selbst stehen in src/lib/ratgeber.js (KATEGORIEN).
import { BookOpen, Coins, Map as KarteIcon, Scale, Sprout, Zap } from "lucide-react";

export const THEMEN = {
  "Fläche & Pacht": { icon: KarteIcon, kurz: "flaeche", ton: "gruen", text: "Pachthöhe, Vertrag, Grundbuch und Steuern für Flächeneigentümer." },
  "Agri-PV & Landwirtschaft": { icon: Sprout, kurz: "agri", ton: "sonne", text: "Agri-PV, Förderung und Bewirtschaftung unter und zwischen Modulen." },
  "Investieren & Projektbörse": { icon: Coins, kurz: "invest", ton: "navy", text: "Projektrechte, Bewertung, Rendite und Due Diligence." },
  "Recht & Genehmigung": { icon: Scale, kurz: "recht", ton: "sand", text: "Bebauungsplan, Netzanschluss, Ausschreibung und Auflagen." },
  "Strom, Markt & Gemeinschaft": { icon: Zap, kurz: "strom", ton: "himmel", text: "Vermarktung, PPA, Speicher und Energiegemeinschaften." },
};

const FALLBACK = { icon: BookOpen, kurz: "sonstiges", ton: "sand", text: "" };

export const thema = (kategorie) => THEMEN[kategorie] || FALLBACK;

/** Englische Kurzbeschreibung je Themenbereich (Sprachmodell) */
const TEXT_EN = {
  "Fläche & Pacht": "Lease level, contract, land register and taxes for landowners.",
  "Agri-PV & Landwirtschaft": "Agri-PV, support and farming under and between the modules.",
  "Investieren & Projektbörse": "Project rights, valuation, returns and due diligence.",
  "Recht & Genehmigung": "Development plans, grid connection, tenders and conditions.",
  "Strom, Markt & Gemeinschaft": "Marketing, PPAs, storage and energy communities.",
};

/** Kurzbeschreibung eines Themenbereichs in der Sprache */
export const themaText = (kategorie, sprache = "de") => (sprache === "en" && TEXT_EN[kategorie]) || thema(kategorie).text;

/** Anker, über den Themenkarten die Artikelliste vorfiltern (#thema-flaeche …) */
export const themaAnker = (kategorie) => `thema-${thema(kategorie).kurz}`;

/** Tönung je Thema: Symbolfläche, Balken, Lichtfleck */
export const TON = {
  gruen: { icon: "bg-ov-50 text-ov-700 ring-ov-200", balken: "bg-ov-500", licht: "bg-ov-200/70", punkt: "#669933" },
  sonne: { icon: "bg-sun-50 text-sun-700 ring-sun-200", balken: "bg-sun-400", licht: "bg-sun-200/70", punkt: "#ffc53d" },
  navy: { icon: "bg-navy-50 text-navy-600 ring-navy-100", balken: "bg-navy-600", licht: "bg-navy-200/60", punkt: "#1f5aa1" },
  sand: { icon: "bg-sand-100 text-ink-800 ring-sand-200", balken: "bg-ink-700", licht: "bg-sand-200/90", punkt: "#394050" },
  himmel: { icon: "bg-navy-50 text-navy-500 ring-navy-100", balken: "bg-navy-400", licht: "bg-navy-100/80", punkt: "#4a7cbd" },
};
