// src/lib/bericht/parkplatz.js – Bericht-Baustein für den Parkplatz-Schnell-Check (Welle 4, Parkplatz-Hub)
//
// Feldregeln (Positivliste der Eingaben), Normalisierung und Zusammenfassung für die Berichtsseite.
// Eingebunden in src/lib/bericht/neuRechnen.js (RECHNER.parkplatz). Rechnet nicht selbst – nur
// parkplatzCheck() aus src/lib/rechner/parkplatz.js. Keine Geldwerte, in keinem Land; AT/CH liefern
// ehrlich „unklar“ (keine erfundenen Regeln), DE die Landesregel mit Quelle.

import { PlattformFehler } from "@/lib/plattform/fehler";
import { fmt } from "@/lib/rechner/annahmen";
import {
  BETREIBER,
  BUNDESLAND_SLUGS,
  GRENZEN_PARKPLATZ,
  PARKPLATZ_VERSION,
  PFLICHT_REGELN,
  PFLICHT_STAND,
  SITUATIONEN,
  parkplatzCheck,
} from "@/lib/rechner/parkplatz";
import { CARPORT } from "@/lib/invest/markt";

const LAND_NAME = { DE: "Deutschland", AT: "Österreich", CH: "Schweiz" };

const SITUATION_TEXT = {
  neubau: "Neubau eines Parkplatzes",
  erweiterung: "Erweiterung eines bestehenden Parkplatzes",
  sanierung: "Grundlegende Sanierung / Erneuerung",
  bestand: "Bestand ohne Baumaßnahme",
};
const BETREIBER_TEXT = { gewerblich: "gewerblich (Unternehmen, Handel, Logistik)", oeffentlich: "öffentlich (Kommune, öffentliche Hand)" };

/** Ergebnistexte je Code – ehrlich, mit Rechtsgrundlage */
export function pflichtText(p) {
  const r = p.regel;
  const s = r?.art === "ab" ? `ab ${r.schwelle}` : r ? `mehr als ${r.schwelle}` : "";
  switch (p.code) {
    case "at":
      return "Für Österreich ist uns nach aktuellem Stand keine flächendeckende Solarpflicht für Parkplätze bekannt; die Bundesländer regeln Solarpflichten in ihren Bau- und Energiegesetzen unterschiedlich. Wir prüfen die Lage für Ihren Standort im Einzelfall.";
    case "ch":
      return "Für die Schweiz ist uns nach aktuellem Stand keine allgemeine Solarpflicht für Parkplätze bekannt; viele Kantone verlangen bei Neubauten Eigenstromerzeugung am Gebäude. Wir prüfen die Lage für Ihren Standort im Einzelfall.";
    case "keine-pflicht":
      return `${r.name} kennt nach aktuellem Stand keine Solarpflicht für Parkplätze (${r.grundlage}).`;
    case "aufgehoben":
      return `In Brandenburg wurde die Parkplatzpflicht wieder aufgehoben (${r.grundlage}).`;
    case "bestand":
      return `Für Bestandsparkplätze ohne Baumaßnahme gilt in ${r.name} keine Solarpflicht – die Pflicht (${r.grundlage}) knüpft an neue Parkplätze${r.sanierung === "ja" ? ` bzw. an ${r.sanierungText}` : ""} an.`;
    case "sanierung-keine":
      return `Die Pflicht in ${r.name} (${r.grundlage}) stellt auf neue Parkplätze ab; eine Sanierung allein löst sie nach aktuellem Stand nicht aus.`;
    case "unter-schwelle":
      return `Ihr Parkplatz liegt mit ${"stellplaetze" in p ? p.stellplaetze : "den angegebenen"} Stellplätzen unter der Schwelle von ${s} Stellplätzen (${r.grundlage}) – die Solarpflicht greift voraussichtlich nicht.`;
    case "erweiterung-unklar":
      return `Die Pflicht in ${r.name} (${r.grundlage}) stellt auf neue Parkplätze ab; ob eine Erweiterung erfasst ist, hängt vom Einzelfall ab – das klären wir mit Ihnen.`;
    case "erweiterung":
      return `Die Erweiterung ist in ${r.name} ausdrücklich erfasst: Solarpflicht ab ${s} Stellplätzen (${r.grundlage}), Umfang: ${r.umfang}.`;
    case "sanierung":
      return `In ${r.name} greift die Pflicht ${r.sanierungText} – ab ${s} Stellplätzen (${r.grundlage}).`;
    case "ueber-schwelle":
      return `In ${r.name} gilt die Solarpflicht für neue Parkplätze ab ${s}${r.oeffentlichOhneSchwelle ? " gewerblich genutzten" : ""} Stellplätzen${r.oeffentlichOhneSchwelle ? " bzw. für öffentliche Parkplätze unabhängig von der Schwelle" : ""} (${r.grundlage}). Umfang: ${r.umfang}.${r.hinweis ? ` ${r.hinweis}` : ""}`;
    default:
      return "Bitte Bundesland und Stellplätze angeben.";
  }
}

const STATUS_TITEL = { ja: "Solarpflicht greift voraussichtlich", nein: "Keine Solarpflicht nach aktuellem Stand", unklar: "Solarpflicht im Einzelfall zu prüfen" };

/** Feldregeln im Format von neuRechnen.js */
export function regelnParkplatz({ zahl, wahl }) {
  return {
    stellplaetze: zahl(GRENZEN_PARKPLATZ.stellplaetzeMin, GRENZEN_PARKPLATZ.stellplaetzeMax, { ganz: true }),
    region: wahl([...BUNDESLAND_SLUGS]),
    situation: wahl([...SITUATIONEN]),
    betreiber: wahl([...BETREIBER]),
  };
}

/** Deutschland braucht ein Bundesland; AT/CH kennen keins (keine erfundenen Regionen) */
export function landPruefenParkplatz(e, land) {
  if (land === "DE" && !e.region) throw new PlattformFehler(422, "Bitte ein Bundesland angeben.", "eingabe");
  if (land !== "DE" && e.region) throw new PlattformFehler(422, "Region und Land passen nicht zusammen.", "eingabe");
  if (e.stellplaetze === undefined) throw new PlattformFehler(422, "Bitte die Zahl der Stellplätze angeben.", "eingabe");
}

/** Normalisierte Eingaben (Grundlage für Prüf-ID, Vorgang und Bericht) */
export function normalisierenParkplatz(e, land) {
  return { land, stellplaetze: e.stellplaetze, situation: e.situation || "neubau", betreiber: e.betreiber || "gewerblich", ...(land === "DE" ? { region: e.region } : {}) };
}

export const rechneParkplatz = (e, land) => parkplatzCheck({ ...e, land });

const kz = (label, wert, zusatz = "") => ({ label, wert, zusatz });

/** Zusammenfassung für die Berichtsseite (nur Formatierung) */
export function zusammenfassungParkplatz(r, e, land) {
  const p = r.pflicht;
  const regelName = p.regel?.name || LAND_NAME[land];
  const quelle = p.quelle;
  return {
    urteil: {
      titel: STATUS_TITEL[p.status],
      text: pflichtText({ ...p, stellplaetze: e.stellplaetze }),
      stufe: p.status === "ja" ? "pruefen" : p.status === "nein" ? "gut" : "pruefen",
    },
    kennzahlen: [
      kz("Solarpflicht", p.status === "ja" ? "ja, voraussichtlich" : p.status === "nein" ? "nein, nach aktuellem Stand" : "unklar, Einzelfall", regelName),
      kz("Stellplätze", fmt(e.stellplaetze), SITUATION_TEXT[e.situation]),
      kz("PV-Potenzial bei voller Überdachung", `≈ ${fmt(r.potenzial.kwp)} kWp`, `${fmt(r.potenzial.kwpProStellplatz, 1)} kWp je Stellplatz (Annahme)`),
      ...(r.potenzial.mindestKwp ? [kz("Pflichtumfang (grobe Orientierung)", `≈ ${fmt(r.potenzial.mindestKwp)} kWp`, `${fmt((p.regel.umfangAnteil || 0) * 100)} % der geeigneten Fläche – maßgeblich ist die Fläche, nicht die Leistung`)] : []),
      ...(r.geig?.greift
        ? [kz("Ladepunkte nach GEIG", r.geig.leitungJe ? `Leitung für jeden ${r.geig.leitungJe}. Stellplatz` : "mindestens 1 Ladepunkt", `${r.geig.paragraph}${r.geig.leitungJe ? ` · mindestens ${fmt(r.geig.ladepunkteMin)} Ladepunkt` : " (Bestand seit 01.01.2025)"}`)]
        : []),
    ],
    eingabenText: [
      ["Land", LAND_NAME[land]],
      ...(e.region ? [["Bundesland", regelName]] : []),
      ["Stellplätze", fmt(e.stellplaetze)],
      ["Situation", SITUATION_TEXT[e.situation]],
      ["Betreiber", BETREIBER_TEXT[e.betreiber]],
    ],
    rechenweg: [
      land === "DE"
        ? `Solarpflicht: Abgleich Ihrer Angaben mit der Landesregel ${p.regel?.grundlage || ""} (Übersicht Stand ${PFLICHT_STAND}).${quelle ? ` Quelle: ${quelle.titel}${quelle.url && quelle.url.startsWith("http") ? ` (${quelle.url})` : ""}.` : ""}`
        : "Solarpflicht: Für Österreich und die Schweiz nennt der Check bewusst keine Regel – uns ist keine flächendeckende Parkplatzpflicht bekannt; Länder bzw. Kantone regeln unterschiedlich.",
      `Potenzial: ${fmt(e.stellplaetze)} Stellplätze × ${fmt(r.potenzial.kwpProStellplatz, 1)} kWp je Stellplatz = ≈ ${fmt(r.potenzial.kwp)} kWp (Annahme: Stellplatz 2,5 × 5 m vollständig überdacht, Module ≈ 225 Wp/m²; Rechenlogik ÖkoInvest).`,
      ...(r.geig ? [`Ladepunkte: Prüfung nach GEIG – Neubau mit mehr als 6 Stellplätzen (§ 7), größere Renovierung mit mehr als 10 (§ 8), Bestand mit mehr als 20 (§ 10, seit 01.01.2025).`] : []),
    ],
    tabelle: null,
    listen: [
      ...(r.gmodg2030
        ? [{ titel: "Ausblick 2030", art: "pruefliste", eintraege: [{ titel: "§ 106 GModG", stufe: "info", text: `${r.gmodg2030.text} Quelle: ${r.gmodg2030.quelle.titel} (${r.gmodg2030.quelle.url})` }] }]
        : []),
      {
        titel: "Nächste Schritte",
        art: "schritte",
        eintraege: [
          { text: "Lageplan und Stellplatzzahl bestätigen – maßgeblich ist der Gesetzestext zum Zeitpunkt des Bauantrags." },
          { text: "Geeignete Fläche bestimmen: Fahrgassen, Bäume, Zufahrten und Feuerwehrflächen mindern die Pflichtfläche; alle Länder kennen Ausnahmen (Unzumutbarkeit, fehlender Netzanschluss)." },
          { text: "Ladebedarf und Netzanschluss klären – Solarcarport und Ladepunkte zusammen planen spart Tiefbau." },
          { text: `Wirtschaftlichkeit rechnen: Kauf oder Contracting über ${CARPORT.contractingJahre} Jahre – siehe Solarcarport-Rechner.` },
        ],
      },
    ],
    hinweise: [
      "Erste Orientierung aus Ihren Angaben – keine Rechtsberatung, kein Angebot. Landesrecht ändert sich häufig; lassen Sie konkrete Vorhaben von Architekt oder Fachanwalt prüfen.",
      "Der Schnell-Check nennt bewusst keine Kosten- oder Erlöswerte; die Wirtschaftlichkeit rechnet der Solarcarport-Rechner.",
      `Parkplatz-Check Version ${PARKPLATZ_VERSION}, Pflicht-Übersicht Stand ${PFLICHT_STAND}.`,
    ],
  };
}

/** Annahmenbuch: keine Register-Fakten, die Annahmen stehen als Rechenlogik-Zeilen (annahmenbuch.js) */
export const annahmenParkplatz = ({ land = "DE" } = {}) => ({ land, rechenbasis: "DE", waehrung: "EUR", eintraege: [] });
