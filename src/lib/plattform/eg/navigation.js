import { pfad as seitenPfad } from "../../land/index.js";
// src/lib/plattform/eg/navigation.js
//
// Seiten und Reiter des Moduls Energiegemeinschaften – EINE Liste für Menü (PortalRahmen.js), Reiterleiste je Gemeinschaft
// (components/Portal/EG/Stamm/EgReiter.js) und Brotkrumen. Eigentümer: WP1; neue Seiten melden die Pakete per Patch.
// `recht`: Kontext-Recht aus eg/rechte.js, ab dem der Reiter erscheint (Portal); Backoffice sieht alle Reiter mit Bereich „eg“.

/** Reiter je Gemeinschaft im Backoffice: /portal/admin/eg/[id]/<pfad> (pfad "" = Stammdaten-Seite von WP1) */
export const EG_ADMIN_REITER = [
  { id: "stammdaten", label: "Stammdaten", pfad: "", wp: "WP1" },
  { id: "mitglieder", label: "Mitglieder & Zählpunkte", pfad: "?reiter=mitglieder", wp: "WP1" },
  { id: "anlagen", label: "Anlagen & Tarife", pfad: "?reiter=anlagen", wp: "WP1" },
  { id: "organe", label: "Organe", pfad: "/organe", wp: "WP5" },
  { id: "versammlungen", label: "Versammlungen", pfad: "/versammlungen", wp: "WP5" },
  { id: "eda", label: "EDA", pfad: "/eda", wp: "WP2" },
  { id: "energiedaten", label: "Energiedaten", pfad: "/energiedaten", wp: "WP3" },
  { id: "abrechnung", label: "Abrechnung", pfad: "/abrechnung", wp: "WP4" },
  { id: "buchhaltung", label: "Buchhaltung", pfad: "/buchhaltung", wp: "WP4" },
];

/** Reiter der Organe-Sicht /portal/eg/[id]/<pfad> (Vorstand, Kassier, Schriftführung, Rechnungsprüfung) */
export const EG_ORGAN_REITER = [
  { id: "verwaltung", label: "Verwaltung", pfad: "/verwaltung", recht: "mitgliederliste", wp: "WP1" },
  { id: "abrechnung", label: "Abrechnung & Freigaben", pfad: "/abrechnung", recht: "abrechnung_vorschau", wp: "WP4" },
  { id: "kasse", label: "Kassa & Buchhaltung", pfad: "/kasse", recht: "buchhaltung", wp: "WP4" },
  { id: "versammlungen", label: "Versammlungen", pfad: "/versammlungen", recht: "gv", wp: "WP5" },
  { id: "energie", label: "Energiedaten", pfad: "/energie", recht: "qh_aggregiert", wp: "WP3" },
];

/** Seiten außerhalb einer Gemeinschaft */
export const EG_SEITEN = {
  adminListe: { href: "/portal/admin/eg", label: "Energiegemeinschaften", wp: "WP1" },
  adminNetz: { href: "/portal/admin/eg/netzbetreiber", label: "Netzbetreiber & Netzentgelte", wp: "WP1" },
  adminGruendung: { href: "/portal/admin/eg/gruendung", label: "Gründungsaufträge", wp: "WP5" },
  adminSimulation: { href: "/portal/admin/eg/simulation", label: "Simulation", wp: "WP3" },
  portal: { href: "/portal/eg", label: "Energiegemeinschaft", wp: "WP6" },
  portalGruendung: { href: "/portal/eg/gruendung", label: "Gemeinschaft gründen", wp: "WP5" },
  oeffentlichRechner: { href: seitenPfad("/energiegemeinschaften/rechner"), label: "Rechner Energiegemeinschaft", wp: "WP6" },
};

/** Brotkrumen-Bezeichnungen (Pfadteile) – PortalRahmen.js übernimmt sie in LABELS */
export const EG_BROTKRUMEN = {
  eg: "Energiegemeinschaften",
  stammdaten: "Stammdaten",
  mitglieder: "Mitglieder",
  organe: "Organe",
  versammlungen: "Versammlungen",
  eda: "EDA",
  energiedaten: "Energiedaten",
  abrechnung: "Abrechnung",
  buchhaltung: "Buchhaltung",
  simulation: "Simulation",
  gruendung: "Gründung",
  netzbetreiber: "Netzbetreiber",
  verwaltung: "Verwaltung",
  kasse: "Kassa",
  journal: "Nachrichtenjournal", // WP2
  reklamation: "Reklamationen", // WP2
  beitritt: "Beitritt", // WP6
  gemeinde: "Gemeinde", // WP6
  mehrfach: "Mehrfachteilnahme", // WP6
  energie: "Energiedaten", // WP3 (Organ-Reiter /portal/eg/[id]/energie)
  neu: "Neue Anfrage", // WP5
  foerdercheck: "Förder-Check", // WP5
  verein: "Verein", // WP5
};
