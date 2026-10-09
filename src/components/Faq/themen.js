// Symbole und Kurztexte je FAQ-Gruppe (ids aus src/data/faq.js → FAQ_GRUPPEN).
import { HelpCircle, LineChart, MapPinned, ShieldCheck, Store, Tractor, Zap } from "lucide-react";
import { pfad } from "@/lib/land";

// `weiter`: passender nächster Schritt am Ende jeder Gruppe (Conversion-Plan: Kontext statt Standard-CTA)
export const THEMEN = {
  flaecheneigentuemer: {
    icon: MapPinned,
    kurz: "Eignung, Pacht, Laufzeit",
    weiter: { text: "Eignung und Pachtspanne Ihrer Fläche in wenigen Minuten.", primaer: { label: "Flächencheck starten", href: pfad("/flaechencheck") }, sekundaer: { label: "Pacht berechnen", href: pfad("/rechner/pacht") } },
  },
  landwirte: {
    icon: Tractor,
    kurz: "Agri-PV, GAP, Bebauungsplan",
    weiter: { text: "Pacht, Eigeninvestition oder Beteiligung selbst durchrechnen.", primaer: { label: "Agri-PV-Rechner", href: pfad("/rechner/agri-pv") }, sekundaer: { label: "Konto als Landwirt", href: "/registrieren?rolle=landwirt" } },
  },
  investoren: {
    icon: LineChart,
    kurz: "Projekte, Unterlagen, Rendite",
    weiter: { text: "Suchprofil hinterlegen und passende Projekte im Portal sehen.", primaer: { label: "Suchprofil anlegen", href: "/registrieren?rolle=investor" }, sekundaer: { label: "Zur Projektbörse", href: "/projektboerse" } },
  },
  projektboerse: {
    icon: Store,
    kurz: "Inserat, Vertraulichkeit, Preis",
    weiter: { text: "Eckdaten genügen für den Start – geprüft und vertraulich.", primaer: { label: "Projekt anbieten", href: "/projektboerse/anbieten" }, sekundaer: { label: "Projektwert berechnen", href: pfad("/rechner/projektbewertung") } },
  },
  strom: {
    icon: Zap,
    kurz: "Reststrom, Kraftwerk, Gemeinden",
    weiter: { text: "Mit Jahresverbrauch und aktuellem Preis die Ersparnis abschätzen.", primaer: { label: "Ersparnis berechnen", href: pfad("/rechner/reststrom") }, sekundaer: { label: "Anfrage stellen", href: "/kontakt?anliegen=reststrom" } },
  },
  portal: {
    icon: ShieldCheck,
    kurz: "Zugang, Kosten, Daten",
    weiter: { text: "Anfragen, Status und Dokumente an einem Ort.", primaer: { label: "Zugang anlegen", href: "/registrieren" }, sekundaer: { label: "Anmelden", href: "/login" } },
  },
};

// Englische Fassung (Sprachmodell): gleiche ids, hrefs bleiben aus THEMEN
const THEMEN_EN = {
  flaecheneigentuemer: {
    kurz: "Suitability, lease, term",
    weiter: { text: "Suitability and lease range for your land in a few minutes.", primaer: { label: "Start land check" }, sekundaer: { label: "Calculate lease" } },
  },
  landwirte: {
    kurz: "Agri-PV, CAP, development plan",
    weiter: { text: "Work out lease, own investment or participation yourself.", primaer: { label: "Agri-PV calculator" }, sekundaer: { label: "Account as a farmer" } },
  },
  investoren: {
    kurz: "Projects, documents, returns",
    weiter: { text: "Save a search profile and see matching projects in the portal.", primaer: { label: "Create search profile" }, sekundaer: { label: "To the project exchange" } },
  },
  projektboerse: {
    kurz: "Listing, confidentiality, price",
    weiter: { text: "Key data is enough to get started – reviewed and confidential.", primaer: { label: "Offer a project" }, sekundaer: { label: "Calculate project value" } },
  },
  strom: {
    kurz: "Residual power, power plant, municipalities",
    weiter: { text: "Estimate the savings from your annual consumption and current price.", primaer: { label: "Calculate savings" }, sekundaer: { label: "Send an enquiry" } },
  },
  portal: {
    kurz: "Access, costs, data",
    weiter: { text: "Enquiries, status and documents in one place.", primaer: { label: "Create access" }, sekundaer: { label: "Sign in" } },
  },
};

/** Themen in der Seitensprache (Texte englisch, Links und Symbole unverändert) */
export function themaFuer(id, sprache = "de") {
  const de = THEMEN[id];
  const en = sprache === "en" ? THEMEN_EN[id] : null;
  if (!de || !en) return de;
  return {
    ...de,
    kurz: en.kurz,
    weiter: de.weiter && {
      text: en.weiter.text,
      primaer: { ...de.weiter.primaer, label: en.weiter.primaer.label },
      sekundaer: de.weiter.sekundaer && { ...de.weiter.sekundaer, label: en.weiter.sekundaer.label },
    },
  };
}

export const themaIcon = (id) => THEMEN[id]?.icon || HelpCircle;
