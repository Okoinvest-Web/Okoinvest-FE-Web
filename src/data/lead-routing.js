// src/data/lead-routing.js
//
// Routing-Matrix für eingehende Anfragen (Welle 2, Paket B3; Masterplan Abschnitt 5 Punkt 4 und 5):
//   Land (DE | AT | CH | unbekannt) × Typ (flaeche, agri, dach, kommune, investor, speicher, …) × Größe → Lead-Desk,
//   Vertretung, SLA-Klasse. Die Auflösung macht src/lib/anfrage/routing.js (reine Funktion).
//
// ┌─────────────────────────────────────────────────────────────────────────────────────────────────────────┐
// │ ENTWURF. Personen, Vertretungen und Postfächer je Land sind NICHT besetzt (TODO Inhaber, Entscheidung E7 │
// │ und offene Frage „Postfächer je Land“). Solange ein Desk leer ist, greift das vorhandene Gebiets-Routing   │
// │ (Backoffice → Akquise & Gebiete); ohne Treffer ist die Anfrage sichtbar „ohne Zuständigkeit“.            │
// │ Keine echten Adressen in dieser Datei.                                                                    │
// └─────────────────────────────────────────────────────────────────────────────────────────────────────────┘
//
// SLA-Zielwerte (nur intern, nie öffentlich – Welle-1-Regel „keine Zeitzusagen“), Masterplan 5.5:
//   A-Lead mit Rückrufwunsch < 1 Geschäftsstunde · Großspeicher, Investor, Kommune 4 Geschäftsstunden ·
//   Fläche ab 20 ha am selben Tag · Rest 2 Werktage. Die SLA gilt nur, wenn Personen eingeplant sind (E7).
//
// Größenklassen: 20 ha stammt aus dem Masterplan. Alle anderen Schwellen sind interne Arbeitswerte zur
// Priorisierung (keine Aussage nach außen) – TODO Vertrieb: bestätigen oder anpassen.

export const ROUTING_STAND = "ENTWURF-2026-10-03";

export const LEAD_LAENDER = Object.freeze(["DE", "AT", "CH", "unbekannt"]);

/** Lead-Typen (Vorgangstyp, „dach“ = Fläche mit daten.art = "dach") und ihre Desk-Gruppe */
export const LEAD_TYPEN = Object.freeze({
  flaeche: { label: "Freifläche", gruppe: "flaeche" },
  agri: { label: "Agri-PV", gruppe: "flaeche" },
  dach: { label: "Dachfläche", gruppe: "flaeche" },
  carport: { label: "Solarcarport", gruppe: "flaeche" },
  kommune: { label: "Kommune", gruppe: "kommune" },
  energiegemeinschaft: { label: "Energiegemeinschaft", gruppe: "kommune" },
  genossenschaft: { label: "Genossenschaft", gruppe: "kommune" },
  investor: { label: "Investor", gruppe: "kapital" },
  projekt: { label: "Projekt anbieten", gruppe: "kapital" },
  speicher: { label: "Großspeicher", gruppe: "energie" },
  reststrom: { label: "Reststrom-Pool", gruppe: "energie" },
  kontakt: { label: "Allgemeine Anfrage", gruppe: "allgemein" },
});
export const LEAD_TYP_IDS = Object.freeze(Object.keys(LEAD_TYPEN));

/**
 * Größenklassen je Typ: Einheit, Quelle in `daten` und Grenzen (bis = ausschließlich).
 * Auswahlwerte der Formulare (z. B. Großspeicher „10-50“ MW, Investor-Ticket „20-50“ MWp) sind auf eine Klasse abgebildet.
 */
export const GROESSEN = Object.freeze({
  flaeche: { einheit: "ha", grenzen: [["klein", 5], ["mittel", 20], ["gross", Infinity]] },
  agri: { einheit: "ha", grenzen: [["klein", 5], ["mittel", 20], ["gross", Infinity]] },
  dach: { einheit: "m²", grenzen: [["klein", 1000], ["mittel", 5000], ["gross", Infinity]] },
  carport: { einheit: "Stellplätze", grenzen: [["klein", 50], ["mittel", 250], ["gross", Infinity]] },
  speicher: { einheit: "MW", grenzen: [["klein", 10], ["mittel", 50], ["gross", Infinity]], auswahl: { bis10: "klein", "10-50": "mittel", ueber50: "gross" } },
  reststrom: { einheit: "MWh/a", grenzen: [["klein", 100], ["mittel", 1000], ["gross", Infinity]] },
  investor: { einheit: "MWp", grenzen: [["klein", 5], ["mittel", 20], ["gross", Infinity]], auswahl: { bis5: "klein", "5-20": "mittel", "20-50": "gross", ueber50: "gross" } },
  projekt: { einheit: "MWp", grenzen: [["klein", 5], ["mittel", 20], ["gross", Infinity]] },
});
export const GROESSEN_KLASSEN = Object.freeze(["klein", "mittel", "gross", "unbekannt"]);
/** Fläche ab dieser Größe: Erstkontakt am selben Tag (Masterplan 5.5) */
export const FLAECHE_SELBER_TAG_HA = 20;

/**
 * Lead-Desks je Land und Gruppe. person/vertretung = Konto-ID (Backoffice), postfach = Funktionspostfach.
 * Alle null bis zur Entscheidung des Inhabers. rolle = Backoffice-Rolle, aus der die Person kommen soll.
 */
const GRUPPEN = Object.freeze({
  flaeche: { label: "Flächen", rolle: "akquise" },
  kommune: { label: "Kommunen & Gemeinschaften", rolle: "akquise" },
  kapital: { label: "Kapital & Projekte", rolle: "transaktion" },
  energie: { label: "Energie & Speicher", rolle: "energie" },
  allgemein: { label: "Allgemein", rolle: "leitung" },
});
const LAND_LABEL = { DE: "Deutschland", AT: "Österreich", CH: "Schweiz", unbekannt: "Land unbekannt" };
const TODO_DESK = "TODO Inhaber: Person, Vertretung und Postfach benennen (E7, Postfächer je Land)";

export const LEAD_DESKS = Object.freeze(
  Object.fromEntries(
    LEAD_LAENDER.flatMap((land) =>
      (land === "unbekannt" ? [["clearing", { label: "Clearing", rolle: "leitung" }]] : Object.entries(GRUPPEN)).map(([gruppe, g]) => {
        const id = `${land.toLowerCase()}-${gruppe}`;
        return [id, Object.freeze({ id, land, gruppe, label: `${LAND_LABEL[land]} · ${g.label}`, rolle: g.rolle, person: null, vertretung: null, postfach: null, todo: TODO_DESK })];
      })
    )
  )
);

/** SLA-Klasse aus Typ und Größe (ohne Score; „h1“ für A-Leads mit Rückruf setzt sla.js) */
function slaBasis(typ, groesse) {
  if (typ === "speicher" || typ === "investor" || typ === "kommune") return "h4";
  if ((typ === "flaeche" || typ === "agri") && groesse === "gross") return "taggleich";
  return "wt2";
}

/** Vollständige Matrix (alle Kombinationen), deterministisch erzeugt – eine Zeile je Land × Typ × Größe */
export const ROUTING_MATRIX = Object.freeze(
  LEAD_LAENDER.flatMap((land) =>
    LEAD_TYP_IDS.flatMap((typ) =>
      GROESSEN_KLASSEN.map((groesse) =>
        Object.freeze({
          land,
          typ,
          groesse,
          desk: land === "unbekannt" ? "unbekannt-clearing" : `${land.toLowerCase()}-${LEAD_TYPEN[typ].gruppe}`,
          slaKlasse: slaBasis(typ, groesse),
        })
      )
    )
  )
);

/**
 * Absagecodes (Begründung an den Interessenten; Wortlaut ENTWURF – Prüfung Rechtsabteilung).
 * Keine automatische Absage: Der Score priorisiert nur, ein Mensch entscheidet (Art. 22 DSGVO, Art. 21 revDSG).
 */
export const ABSAGE_CODES = Object.freeze({
  groesse: { label: "Größe passt nicht", text: "Die Fläche bzw. das Vorhaben passt in der Größe derzeit nicht zu unseren Projekten." },
  netz: { label: "Kein Netzanschluss absehbar", text: "Für den Standort ist nach unserer Prüfung derzeit kein wirtschaftlicher Netzanschluss absehbar." },
  lage: { label: "Lage / Planungsrecht", text: "Die Lage ist nach unserer ersten Prüfung planungsrechtlich derzeit nicht geeignet." },
  region: { label: "Region nicht betreut", text: "Diese Region betreuen wir derzeit nicht." },
  angebot: { label: "Kein passendes Angebot", text: "Für Ihr Anliegen haben wir derzeit kein passendes Angebot." },
  dublette: { label: "Doppelte Anfrage", text: "Ihre Anfrage liegt uns bereits vor und wird unter der ersten Vorgangsnummer bearbeitet." },
  nicht_erreicht: { label: "Nicht erreicht", text: "Wir konnten Sie leider mehrfach nicht erreichen. Melden Sie sich gern erneut." },
  sonstiges: { label: "Sonstiges (Begründung Pflicht)", text: "" },
});
