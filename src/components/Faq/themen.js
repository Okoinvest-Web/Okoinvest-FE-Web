// Symbole und Kurztexte je FAQ-Gruppe (ids aus src/data/faq.js → FAQ_GRUPPEN).
import { HelpCircle, LineChart, MapPinned, ShieldCheck, Store, Tractor, Zap } from "lucide-react";

// `weiter`: passender nächster Schritt am Ende jeder Gruppe (Conversion-Plan: Kontext statt Standard-CTA)
export const THEMEN = {
  flaecheneigentuemer: {
    icon: MapPinned,
    kurz: "Eignung, Pacht, Laufzeit",
    weiter: { text: "Eignung und Pachtspanne Ihrer Fläche in wenigen Minuten.", primaer: { label: "Flächencheck starten", href: "/flaechencheck" }, sekundaer: { label: "Pacht berechnen", href: "/rechner/pacht" } },
  },
  landwirte: {
    icon: Tractor,
    kurz: "Agri-PV, GAP, Bebauungsplan",
    weiter: { text: "Pacht, Eigeninvestition oder Beteiligung selbst durchrechnen.", primaer: { label: "Agri-PV-Rechner", href: "/rechner/agri-pv" }, sekundaer: { label: "Konto als Landwirt", href: "/registrieren?rolle=landwirt" } },
  },
  investoren: {
    icon: LineChart,
    kurz: "Projekte, Unterlagen, Rendite",
    weiter: { text: "Suchprofil hinterlegen und passende Projekte im Portal sehen.", primaer: { label: "Suchprofil anlegen", href: "/registrieren?rolle=investor" }, sekundaer: { label: "Zur Projektbörse", href: "/projektboerse" } },
  },
  projektboerse: {
    icon: Store,
    kurz: "Inserat, Vertraulichkeit, Preis",
    weiter: { text: "Eckdaten genügen für den Start – geprüft und vertraulich.", primaer: { label: "Projekt anbieten", href: "/projektboerse/anbieten" }, sekundaer: { label: "Projektwert berechnen", href: "/rechner/projektbewertung" } },
  },
  strom: {
    icon: Zap,
    kurz: "Reststrom, Kraftwerk, Gemeinden",
    weiter: { text: "Mit Jahresverbrauch und aktuellem Preis die Ersparnis abschätzen.", primaer: { label: "Ersparnis berechnen", href: "/rechner/reststrom" }, sekundaer: { label: "Anfrage stellen", href: "/kontakt?anliegen=reststrom" } },
  },
  portal: {
    icon: ShieldCheck,
    kurz: "Zugang, Kosten, Daten",
    weiter: { text: "Anfragen, Status und Dokumente an einem Ort.", primaer: { label: "Zugang anlegen", href: "/registrieren" }, sekundaer: { label: "Anmelden", href: "/login" } },
  },
};

export const themaIcon = (id) => THEMEN[id]?.icon || HelpCircle;
