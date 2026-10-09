// Englische Anzeigetexte für den öffentlichen Ersparnis-Rechner (Sprachmodell).
// Nur Darstellung: Die Rechnung (rechnerOeffentlich in src/lib/plattform/eg/interesse.js) bleibt unverändert;
// hier werden ihre deutschen Beschriftungen über die ids auf Englisch abgebildet. Fehlt eine Zuordnung,
// bleibt der deutsche Text stehen (Rückfall wie in src/lib/sprache/woerterbuch.js).
// Österreichische Rechtsbegriffe bleiben im Original und werden kurz erklärt (SNE-V = Systemnutzungsentgelte-
// Verordnung, ElWG = Elektrizitätswirtschaftsgesetz).

export const ROLLEN_EN = { verbraucher: "I consume", erzeuger: "I generate", prosumer: "Both" };

export const PROFILE_EN = {
  haushalt: { label: "Household", sub: "often out during the day" },
  haushalt_flex: { label: "Flexible household", sub: "heat pump, e-car, home office" },
  gewerbe: { label: "Business", sub: "consumption on weekdays during the day" },
  landwirtschaft: { label: "Agriculture", sub: "milking, cooling, drying" },
};

export const MODELLE_EN = {
  eeg_lokal: { label: "EEG local", sub: "same transformer station" },
  eeg_regional: { label: "EEG regional", sub: "same substation" },
  beg: { label: "BEG", sub: "throughout Austria" },
  gea: { label: "GEA", sub: "in the same building" },
};

export const DECKUNG_EN = {
  knapp: { label: "Little generation", sub: "≈ 30 %" },
  ausgewogen: { label: "Balanced", sub: "≈ 70 %" },
  reichlich: { label: "Plenty of generation", sub: "≈ 150 %" },
};

const QUELLEN_EN = {
  "SNE-V 2018 § 5 Abs. 1a (EEG lokal, NE 6/7)": "SNE-V 2018 (system usage fees ordinance) § 5(1a) (EEG local, grid levels 6/7)",
  "SNE-V 2018 § 5 Abs. 1a (EEG regional, NE 6/7)": "SNE-V 2018 (system usage fees ordinance) § 5(1a) (EEG regional, grid levels 6/7)",
  "SNE-V 2018 § 5 Abs. 1a (EEG regional, NE 4/5)": "SNE-V 2018 (system usage fees ordinance) § 5(1a) (EEG regional, grid levels 4/5)",
  "Eigendeckung hinter dem Netzanschluss ohne Netznutzung (ElWG § 68; Koordinationsstelle)": "Self-coverage behind the grid connection without using the grid (ElWG § 68; coordination office)",
  "SNE-V 2018 § 5 Abs. 1a gilt nur für EEG": "SNE-V 2018 § 5(1a) only applies to EEGs",
  "Arbeitshypothese Fachkonzept 1.3: keine Netzkosten für Eigendeckung (neue SNE-VO)": "Working hypothesis (concept 1.3): no grid costs for self-coverage (new SNE ordinance)",
  "Arbeitshypothese Fachkonzept 1.3 (Lokalbereich, neue SNE-VO)": "Working hypothesis (concept 1.3) (local area, new SNE ordinance)",
  "Arbeitshypothese Fachkonzept 1.3 (Regionalbereich NE 6/7, neue SNE-VO)": "Working hypothesis (concept 1.3) (regional area, grid levels 6/7, new SNE ordinance)",
  "Arbeitshypothese Fachkonzept 1.3 (Regionalbereich NE 4/5, neue SNE-VO)": "Working hypothesis (concept 1.3) (regional area, grid levels 4/5, new SNE ordinance)",
  "Arbeitshypothese Fachkonzept 1.3 (keine Verbindung)": "Working hypothesis (concept 1.3) (no connection)",
  "keine Reduktion": "no reduction",
};
export const quelleEn = (q) => QUELLEN_EN[q] ?? q;

/** Text der Netzentgelt-Regel (aus reduktionPct und Status neu zusammengesetzt, gleiche Aussage). */
export function regelTextEn(regel) {
  const pct = regel?.reduktionPct || 0;
  return `${pct > 0 ? `−${pct} % grid usage energy charge` : "no grid fee reduction"}${regel?.status === "platzhalter" ? " (placeholder until the new SNE ordinance)" : ""}`;
}

/** Bestandteile des Vorteils (ids wie in rechnerOeffentlich). */
export function teilEn(t, reduktionPct = 0) {
  const label =
    t.id === "energie"
      ? "Lower energy price"
      : t.id === "netz"
        ? reduktionPct > 0
          ? `Reduced grid fee (−${reduktionPct} % energy charge)`
          : "Grid fee (no reduction)"
        : t.id === "abgaben"
          ? "Electricity levy waived"
          : t.id === "erzeuger"
            ? "Additional revenue for contributed power"
            : t.label;
  return { ...t, label };
}

const HINWEISE_EN = {
  luecke: "Oct–Dec 2026: whether the reduced grid fees under SNE-V 2018 continue to apply during the transition is presented differently – your grid bill is decisive (to be confirmed).",
  platzhalter: "From 2027, the grid fee will depend on the proximity area; the values of the new ordinance are still pending – calculated here as a working hypothesis.",
  beg: "As things stand, citizens’ energy communities (BEG) receive no grid fee reduction and no levy exemption – the advantage comes from the price.",
  negativ: "With these assumptions, the benefits do not cover the fees. More flexible consumption or a lower community price improves the result.",
};
export const hinweisEn = (h) => ({ ...h, text: HINWEISE_EN[h.id] ?? h.text });
