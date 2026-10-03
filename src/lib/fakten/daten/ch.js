// src/lib/fakten/daten/ch.js
//
// Fakten SCHWEIZ – Welle 2, Paket B1. Geldwerte in CHF bzw. Rappen. Nur Werte, für die
// markt.js oder der Ratgeber freiflaechen-pv-schweiz.js heute schon eine Quelle nennen.
// Kein belegter CHF-Pachtwert: pacht.* fehlt bewusst (Lücke, Länder-Sperre bleibt).
// Vertrag: ../schema.js. NUR über src/lib/fakten/index.js importieren.

const PAKET_E = "2026-10-03";
/** Recherchestand Ratgeber freiflaechen-pv-schweiz.js */
const RATGEBER = "2026-09-29";
const OFFEN = "TODO-E6 · Fachprüfung Team Schweiz";

const Q = {
  pvgis: { titel: "EU JRC – PVGIS 5.3 (API PVcalc, SARAH3, 14 % Systemverluste, optimaler Winkel)", url: "https://re.jrc.ec.europa.eu/pvg_tools/de/" },
  pronovo: { titel: "Pronovo – PV-Auktionen, Runde Q4/2026 (laut Ratgeber freiflaechen-pv-schweiz.js)", url: null, art: "primaer" },
  bfe: { titel: "BFE / Pronovo – Hohe Einmalvergütung (HEIV) für Photovoltaik", url: null, art: "primaer" },
};

const recht = (id, wert, einheit, quelle, notiz, extra = {}) => ({
  id, wert, einheit, land: "CH", quelle, abruf: RATGEBER, gueltigAb: null, gueltigBis: null, status: "zu_pruefen", pruefer: OFFEN, klasse: "A", notiz, ...extra,
});

const FAKTEN = [
  {
    id: "region.ch.ertrag",
    wert: 1130,
    einheit: "kWh/kWp·a",
    land: "CH",
    quelle: Q.pvgis,
    abruf: PAKET_E,
    gueltigAb: null,
    gueltigBis: null,
    status: "geprueft",
    pruefer: "Paket E (Welle 1, Prüfung am Original) · Zweitprüfung TODO-E6",
    klasse: "B",
    notiz: "Mittelland: PVGIS-Mittel ~1.211 kWh/kWp (Bern 1.231, Zürich-Land 1.157, Payerne 1.255, St. Gallen-Rheintal 1.202) × mittlerer Abschlag der übrigen Regionen 0,935 = 1.132 → 1.130.",
  },
  recht("recht.ch.heiv.maxAnteil", 0.6, "Anteil der Investitionskosten (Referenzanlage)", Q.bfe, "HEIV bis 60 % der Investitionskosten von Referenzanlagen. Fundstelle (Verordnung/Pronovo-Seite) mit URL nachtragen."),
  recht("recht.ch.auktion.abKw", 150, "kW", Q.pronovo, "Auktionen HEIV / gleitende Marktprämie für Anlagen ab 150 kW ohne Eigenverbrauch."),
  recht("recht.ch.heiv.hoechstgebotChfKw", 620, "CHF/kW", Q.pronovo, "Höchstgebot HEIV-Auktion Runde Q4/2026 (Volumen 50 MW). Gilt nur für diese Runde.", { gueltigBis: "2026-12-31" }),
  recht("recht.ch.gmp.hoechstgebotRp", 10, "Rp./kWh", Q.pronovo, "Höchstgebot gleitende Marktprämie (GMP), Runde Q4/2026 (Volumen 10 MW). Gilt nur für diese Runde.", { gueltigBis: "2026-12-31" }),
  recht(
    "recht.ch.gmp",
    "Gleitende Marktprämie (GMP) für grosse Anlagen ohne Eigenverbrauch über Auktionen (Pronovo); alternativ hohe Einmalvergütung (HEIV).",
    "Text",
    Q.pronovo,
    "Förderdauer, Referenzmarktpreis und Regeln bei negativen Preisen noch nicht im Register – nicht erfinden, an Fedlex/Pronovo erheben."
  ),
];

const MODUL = {
  name: "ch",
  land: "CH",
  fakten: FAKTEN,
  quellen: {
    allgemein: [{ titel: "EU JRC – PVGIS Photovoltaic Geographical Information System", url: Q.pvgis.url }],
  },
};

export default MODUL;
