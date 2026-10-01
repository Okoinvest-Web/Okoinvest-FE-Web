// src/lib/plattform/eg/statuten.js
//
// WP5 – Statuten-Generator: Eingaben prüfen, Vorgaben ergänzen und den Entwurf gegen die Pflichtinhalte prüfen.
// Pflichtinhalte Verein: VerG 2002 § 3 Abs. 2 Z 1–11; EEG/BEG-Besonderheiten: EAG § 79 Abs. 2, ElWG § 67 Abs. 2–3.
// Reine Funktionen; Python-Spiegel plattform/eg_gruendung_kern.py (statuten_eingaben, statuten_pruefen).
// Vorlagen: eg/vorlagen/statuten.js (Verein, eGen). Ergebnis ist ein MUSTER zur rechtlichen Prüfung.

import { EG_MODELLE } from "./modell.js";

/** Pflichtinhalte nach VerG § 3 Abs. 2 – Abgleich mit den Abschnittstiteln der Mustervorlage */
export const VERG_PFLICHTINHALTE = [
  { id: "name", text: "Vereinsname (Z 1)", abschnitt: "Name, Sitz und Tätigkeitsbereich" },
  { id: "sitz", text: "Vereinssitz (Z 2)", abschnitt: "Name, Sitz und Tätigkeitsbereich" },
  { id: "zweck", text: "Klare und umfassende Umschreibung des Vereinszwecks (Z 3)", abschnitt: "Zweck" },
  { id: "mittel", text: "Tätigkeiten und Aufbringung der finanziellen Mittel (Z 4)", abschnitt: "Mittel zur Erreichung des Vereinszwecks" },
  { id: "mitgliedschaft", text: "Erwerb und Beendigung der Mitgliedschaft (Z 5)", abschnitt: "Erwerb der Mitgliedschaft" },
  { id: "rechte", text: "Rechte und Pflichten der Mitglieder (Z 6)", abschnitt: "Rechte und Pflichten der Mitglieder" },
  { id: "organe", text: "Organe, Aufgaben, Geschäftsführung und Vertretung (Z 7)", abschnitt: "Vertretung und besondere Obliegenheiten" },
  { id: "bestellung", text: "Bestellung der Organe und Funktionsperiode (Z 8)", abschnitt: "Vorstand" },
  { id: "beschluesse", text: "Erfordernisse für gültige Beschlüsse (Z 9)", abschnitt: "Mitgliederversammlung" },
  { id: "schlichtung", text: "Schlichtung von Streitigkeiten (Z 10, § 8 VerG)", abschnitt: "Schiedsgericht" },
  { id: "aufloesung", text: "Freiwillige Auflösung und Vermögensverwertung (Z 11)", abschnitt: "Freiwillige Auflösung des Vereins" },
];

const ganzZahl = (v, min, max, std) => {
  const n = Number(v);
  return Number.isInteger(n) && n >= min && n <= max ? n : std;
};
const txt = (v, max = 300) => (v === undefined || v === null || typeof v === "object" ? "" : String(v).replace(/\s+/g, " ").trim().slice(0, max));

/**
 * Eingaben des Statuten-Generators bereinigen (Standardwerte laut Fachkonzept 2.3/2.4: Austritt 6 Wochen, Funktionsperiode
 * 3 Jahre, Einladung 14 Tage, jährliche Mitgliederversammlung, Online-Versammlung zulässig, Tarife durch den Vorstand).
 */
export function statutenEingaben(d = {}) {
  return {
    taetigkeitsgebiet: txt(d.taetigkeitsgebiet, 300),
    zweckZusatz: txt(d.zweckZusatz, 600),
    kuendigungsfristWochen: String(ganzZahl(d.kuendigungsfristWochen, 1, 26, 6)),
    funktionsperiodeJahre: String(ganzZahl(d.funktionsperiodeJahre, 1, 5, 3)),
    einladungsfristTage: String(ganzZahl(d.einladungsfristTage, 7, 60, 14)),
    gvTurnusJahre: ganzZahl(d.gvTurnusJahre, 1, 5, 1),
    onlineGv: d.onlineGv === undefined ? true : d.onlineGv === true || d.onlineGv === "ja" || d.onlineGv === "true",
    tarifeDurch: d.tarifeDurch === "gv" ? "gv" : "vorstand",
    vermoegensempfaenger: txt(d.vermoegensempfaenger, 300) || "eine gemeinnützige Organisation oder Gebietskörperschaft, die gleiche oder ähnliche Zwecke verfolgt",
    geschaeftsanteilEur: d.geschaeftsanteilEur === undefined || d.geschaeftsanteilEur === "" ? "" : String(ganzZahl(Math.round(Number(d.geschaeftsanteilEur)), 1, 100000, 100)),
    kuendigungsfristMonate: String(ganzZahl(d.kuendigungsfristMonate, 1, 24, 6)),
    revisionsverband: txt(d.revisionsverband, 160),
    aufsichtsrat: d.aufsichtsrat === true || d.aufsichtsrat === "ja",
  };
}

/**
 * Entwurf prüfen: Pflichtinhalte, EEG/BEG-Besonderheiten, Plausibilität der Fristen.
 * @param {{modell:string, rechtsform:string, name?:string, sitzOrt?:string}} g Stammdaten
 * @param {object} e bereinigte Eingaben (statutenEingaben)
 * @param {{abschnitte?:{titel:string}[]}} [dok] gerenderter Entwurf (vorlageRendern)
 * @returns {{ok:boolean, befunde:{stufe:"fehler"|"warn"|"info", text:string, quelle:string}[]}}
 */
export function statutenPruefen(g = {}, e = {}, dok = null) {
  const b = [];
  const f = (stufe, text, quelle) => b.push({ stufe, text, quelle });
  if (!EG_MODELLE[g.modell]?.rechtsperson) f("fehler", "Für dieses Modell sind keine Statuten nötig (keine eigene Rechtsperson, z. B. GEA oder P2P – dort genügen Verträge).", "ElWG § 68");
  if (!["verein", "egen"].includes(g.rechtsform)) f("warn", "Für GmbH bzw. OG/KG ist ein Gesellschaftsvertrag (bei der GmbH als Notariatsakt) nötig – der Generator erzeugt Vereinsstatuten und Genossenschaftssatzungen.", "GmbHG § 4 (zu bestätigen)");
  if (!txt(g.name)) f("fehler", "Der Name der Gemeinschaft fehlt.", "VerG § 3 Abs. 2 Z 1");
  if (!txt(g.sitzOrt || g.sitzAdresse?.ort)) f("fehler", "Der Sitz (Gemeinde) fehlt.", "VerG § 3 Abs. 2 Z 2");
  if (!e.taetigkeitsgebiet) f("fehler", "Bitte den Tätigkeitsbereich beschreiben (z. B. „das Gebiet der Gemeinde … im Bereich der Trafostation …“).", "VerG § 3 Abs. 2 Z 1–3");
  if (g.modell === "eeg") f("info", "EEG: Zweck „Hauptzweck nicht finanzieller Gewinn“, offener und freiwilliger Mitgliederkreis ohne Großunternehmen sind enthalten.", "EAG § 79 Abs. 2; ElWG § 66");
  if (g.modell === "beg") f("info", "BEG: Kontrollklausel (natürliche Personen, Gebietskörperschaften, kleine Unternehmen halten die satzungsändernde Mehrheit) ist enthalten.", "ElWG § 67 Abs. 3");
  if (Number(e.kuendigungsfristWochen) < 3 || Number(e.kuendigungsfristWochen) > 7) f("warn", `Austrittsfrist ${e.kuendigungsfristWochen} Wochen – üblich sind laut Koordinationsstelle 3–7 Wochen. Zu lange Fristen erschweren den freiwilligen Austritt.`, "Fachkonzept 2.4");
  if (Number(e.gvTurnusJahre) > 5) f("fehler", "Die Mitgliederversammlung ist mindestens alle fünf Jahre einzuberufen.", "VerG § 5 Abs. 2");
  if (Number(e.gvTurnusJahre) > 1) f("info", "Eine jährliche Mitgliederversammlung ist für Energiegemeinschaften üblich (Rechnungsabschluss, Tarife, Entlastung).", "Fachkonzept 2.5");
  if (Number(e.einladungsfristTage) < 14) f("warn", "Eine Einladungsfrist unter 14 Tagen ist kurz; virtuelle Teilnahme und Anträge brauchen Vorlauf.", "Musterstatuten (zu bestätigen)");
  if (e.onlineGv) f("info", "Virtuelle bzw. hybride Mitgliederversammlung und Umlaufbeschlüsse sind vorgesehen – das VerG regelt dies nicht ausdrücklich, daher in den Statuten verankert.", "VerG 2002 (zu bestätigen)");
  if (g.rechtsform === "egen") {
    if (!e.geschaeftsanteilEur) f("fehler", "Bitte die Höhe des Geschäftsanteils angeben.", "GenG");
    if (!e.revisionsverband) f("fehler", "Bitte den Revisionsverband angeben – Genossenschaften müssen einem Revisionsverband angehören.", "GenRevG 1997");
  }
  if (dok && g.rechtsform === "verein") {
    const titel = (dok.abschnitte || []).map((a) => String(a.titel).replace(/^§ \d+ /, ""));
    for (const p of VERG_PFLICHTINHALTE) if (!titel.includes(p.abschnitt)) f("fehler", `Pflichtinhalt fehlt: ${p.text}.`, "VerG § 3 Abs. 2");
    if (dok.fehlend?.length) f("warn", `Noch offene Angaben im Entwurf: ${dok.fehlend.join(", ")}.`, "Statuten-Generator");
  }
  f("info", "Muster zur Prüfung: vor der Errichtungsanzeige bzw. Firmenbuchanmeldung von einer befugten Stelle prüfen lassen.", "Fachkonzept 9, Punkt 8");
  return { ok: !b.some((x) => x.stufe === "fehler"), befunde: b };
}
