// src/lib/plattform/onboarding/pfade/index.js
//
// Register aller Onboarding-Pfade + Zuordnung Rolle → Pfad, Untertyp-Vorschlag aus echten Daten und Tour-Hinweise.
// Reine Daten/Funktionen (Server, Browser, Export nach Frappe über scripts/onboarding-pfade-export.mjs).

import { investor } from "./investor";
import { verkaeufer } from "./verkaeufer";
import { flaeche } from "./flaeche";
import { kunde } from "./kunde";
import { kommune } from "./kommune";
import { bank, gutachter, lieferant, mitglied } from "./weitere";
import { backoffice } from "./backoffice";
import { unterrollen } from "../../rechte";

/** Reihenfolge = Priorität für den Standardpfad eines Kontos mit mehreren Rollen */
export const PFADE = [backoffice, kommune, flaeche, verkaeufer, investor, kunde, gutachter, lieferant, bank, mitglied];
export const PFAD_NACH_ID = Object.fromEntries(PFADE.map((p) => [p.id, p]));
export const PFAD_IDS = PFADE.map((p) => p.id);

/** Pfade, die ein Konto mit diesen Rollen nutzen darf */
export function pfadeFuer(rollen = []) {
  return PFADE.filter((p) => p.rollen.some((r) => rollen.includes(r)));
}

/** Darf das Konto diesen Untertyp wählen? (Backoffice: nur eigene Unterrollen) */
export function untertypErlaubt(nutzer, pfad, untertyp) {
  if (!pfad.untertypen?.[untertyp]) return false;
  if (pfad.untertypAus === "unterrolle") return unterrollen(nutzer).includes(untertyp);
  return true;
}

const INVESTOR_TYP_ZU_UNTERTYP = { family_office: "family_office", fonds: "fonds", versicherung: "fonds", stadtwerk: "stadtwerk", evu: "stadtwerk", ipp: "ipp", unternehmen: "ipp", privat: "privat", genossenschaft: "privat" };
/** Rückweg für das Suchprofil: gewählter Untertyp → Investorentyp (fach/suchprofil.js INVESTOR_TYPEN) */
export const UNTERTYP_ZU_INVESTOR_TYP = { family_office: "family_office", fonds: "fonds", stadtwerk: "stadtwerk", ipp: "ipp", privat: "privat" };

/** Untertyp-Vorschlag aus echten Daten (wenn nichts gewählt wurde) */
export function untertypVorschlag(pfadId, { nutzer = {}, fakten = {} } = {}) {
  const rollen = nutzer.rollen || [];
  switch (pfadId) {
    case "backoffice": {
      const r = unterrollen(nutzer);
      return r[0] || null;
    }
    case "investor":
      return INVESTOR_TYP_ZU_UNTERTYP[nutzer.suchprofil?.investorTyp] || null;
    case "verkaeufer":
      return fakten.projekteBestand > 0 ? "bestand" : fakten.projekte > 0 ? "projektentwickler" : null;
    case "flaeche":
      return fakten.flaechenDach > 0 && !fakten.flaechenLand ? "dach" : rollen.includes("landwirt") ? "landwirt" : fakten.flaechen > 0 ? "eigentuemer" : null;
    case "kunde":
      return fakten.anlagen > 0 ? "contracting" : fakten.abnahmestellen > 0 || fakten.energieVertrag > 0 ? "reststrom" : null;
    default:
      return null;
  }
}

/**
 * Tour-Hinweise an den wichtigsten Stellen (leicht, abschaltbar). Schlüssel = ID (für „gesehen“).
 * pfad: Portalpfad (Präfix, `exakt` für genau diese Seite), rollen: nur für diese Rollen.
 */
export const TOUREN = {
  uebersicht: { pfad: "/portal", exakt: true, titel: "Ihre Übersicht", text: "Oben die Checkliste „Erste Schritte“, darunter Kennzahlen und Neuigkeiten. Die Glocke oben rechts sammelt alle Benachrichtigungen." },
  boerse: { pfad: "/portal/boerse", exakt: true, rollen: ["investor"], titel: "Projektbörse", text: "Filter oben, Sortierung nach Passung zu Ihrem Suchprofil. Mit dem Herz merken, bis zu vier Projekte vergleichen, Umschalter Karte/Tabelle." },
  boerse_detail: { pfad: "/portal/boerse", rollen: ["investor"], titel: "Exposé und Datenraum", text: "Vertrauliche Angaben öffnen sich nach Klick-NDA. Das Bewertungswerkzeug rechnet Kaufpreis und Rendite direkt mit den Projektdaten." },
  projekte: { pfad: "/portal/projekte", rollen: ["anbieter"], titel: "Ihre Projekte", text: "Das Datenblatt prüft Ihre Angaben schon beim Ausfüllen. Die Checkliste zeigt je Phase die erwarteten Unterlagen – Upload direkt am Punkt." },
  flaechen: { pfad: "/portal/flaechen", rollen: ["flaeche", "landwirt"], titel: "Ihre Flächen", text: "Die Pipeline zeigt, wo Ihre Fläche steht und was als Nächstes passiert. Das „?“ an Fachbegriffen erklärt sie in einem Satz." },
  energie: { pfad: "/portal/energie", rollen: ["unternehmen"], titel: "Energie & Lastgang", text: "Erst Abnahmestellen mit Marktlokation bzw. Zählpunkt anlegen, dann den Lastgang hochladen – die Analyse zeigt Spitzenlast, Benutzungsstunden und PV-Deckung." },
  anlagen: { pfad: "/portal/anlagen", rollen: ["unternehmen"], titel: "Mein Solarstrom", text: "Vertrag, Monatswerte je Zähler und Rechnungen. Auffälligkeiten melden Sie über den Support." },
  kommune: { pfad: "/portal/kommune", rollen: ["kommune"], titel: "Gemeinde-Sicht", text: "Projekte im Gemeindegebiet ab Planungsphase – vereinfacht, ohne Eigentümer- und Pachtdaten. Die § 6-Schätzung ist eine Orientierung." },
  verifizierung: { pfad: "/portal/verifizierung", titel: "Verifizierung", text: "Angaben abschnittsweise speichern, Unterlagen hochladen, am Ende einreichen. Den Status sehen Sie jederzeit hier." },
  admin: { pfad: "/portal/admin", exakt: true, rollen: ["admin"], titel: "Cockpit", text: "„Meine Aufgaben“ zuerst, dann überfällige Vorgänge. Strg + K sucht über alles; „g t“ springt zu den Aufgaben." },
  admin_vorgaenge: { pfad: "/portal/admin/vorgaenge", rollen: ["admin"], titel: "Vorgänge", text: "Mehrfachauswahl für Massen-Zuweisung, Filter-Chips und gespeicherte Ansichten. Statuswechsel verlangen eine Begründung – sie geht als Nachricht an den Kunden." },
  admin_akquise: { pfad: "/portal/admin/akquise", rollen: ["admin"], titel: "Akquise", text: "j/k blättern, a/b/c setzt die Priorität. Die SLA-Ampel zeigt, wo der Erstkontakt überfällig ist." },
};
