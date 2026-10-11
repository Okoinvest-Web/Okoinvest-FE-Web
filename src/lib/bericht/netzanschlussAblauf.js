// src/lib/bericht/netzanschlussAblauf.js – Bericht-Baustein für den Ablauf-Begleiter Netzanschluss
// (Welle 4, Paket NETZ2). Eingebunden in src/lib/bericht/neuRechnen.js (RECHNER.netzanschluss).
//
// Der Bericht enthält den Schritt-für-Schritt-Ablauf des gewählten Landes mit Dokumenten-Checkliste,
// Status (erledigt / als Nächstes / offen), den belegten Fristen (nur DE, § 8 EEG) und den typischen
// Ablehnungsgründen samt Gegenmitteln. KEINE Geldwerte in keinem Land: Für Kostenspannen des
// Netzanschlusses liegt kein geprüfter Wert im Faktenregister – der Rechner auf der Seite bleibt
// eine eigene, als grobe Orientierung gekennzeichnete Schätzung und wird hier nicht wiederholt.

import { ABLAUF_LAENDER, rechneAblauf, schrittIds } from "@/lib/rechner/netzanschlussAblauf";
import { PlattformFehler } from "@/lib/plattform/fehler";

const LAND_NAME = { DE: "Deutschland", AT: "Österreich", CH: "Schweiz" };
const ALLE_SCHRITTE = schrittIds();

/** Feldregeln im Format von neuRechnen.js */
export function regelnNetzanschlussAblauf({ mehrfach }) {
  return { erledigt: mehrfach(ALLE_SCHRITTE) };
}

/** Erledigte Schritte müssen zum Land gehören (sonst 422) */
export function landPruefenNetzanschlussAblauf(e, land) {
  const l = String(land || "").toLowerCase();
  if (!ABLAUF_LAENDER.includes(l)) throw new PlattformFehler(422, "Bitte ein Land angeben (DE, AT oder CH).", "land");
  const gueltig = new Set(schrittIds(l));
  for (const id of e.erledigt || []) {
    if (!gueltig.has(id)) throw new PlattformFehler(422, "Schritt und Land passen nicht zusammen.", "eingabe");
  }
}

/** Normalisierte Eingaben: erledigt in Ablauf-Reihenfolge (Grundlage der Prüf-ID) */
export function normalisierenNetzanschlussAblauf(e, land) {
  const reihenfolge = schrittIds(String(land).toLowerCase());
  const gesetzt = new Set(e.erledigt || []);
  return { erledigt: reihenfolge.filter((id) => gesetzt.has(id)) };
}

export function rechneNetzanschlussAblauf(e, land) {
  return rechneAblauf({ land: String(land).toLowerCase(), erledigt: e.erledigt || [] });
}

const kz = (label, wert, zusatz = "") => ({ label, wert, zusatz });
const STATUS_TEXT = { erledigt: "erledigt", aktiv: "als Nächstes", offen: "offen" };
const STATUS_STUFE = { erledigt: "gut", aktiv: "pruefen", offen: "info" };

/** Zusammenfassung für die Berichtsseite (nur Formatierung) */
export function zusammenfassungNetzanschlussAblauf(r, e, land) {
  const offeneDokumente = r.schritte.filter((s) => s.status !== "erledigt").reduce((n, s) => n + s.dokumente.length, 0);
  return {
    kennzahlen: [
      kz("Verfahren", r.verfahren, LAND_NAME[land]),
      kz("Stand", `${r.anzahlErledigt} von ${r.anzahl} Schritten`, r.fertig ? "alle Schritte abgehakt" : `als Nächstes: ${r.naechster.titel}`),
      kz("Offene Unterlagen", String(offeneDokumente), "Dokumente der noch offenen Schritte"),
      ...(land === "DE"
        ? [kz("Gesetzliche Fristen", "§ 8 Abs. 5 und 6 EEG", r.schritte.find((s) => s.frist && s.id === "de-pruefung")?.frist.de || "")]
        : [kz("Fristen", "beim Netzbetreiber erfragen", "kein geprüfter Wert – siehe Hinweis")]),
    ],
    eingabenText: [
      ["Land", LAND_NAME[land]],
      ["Abgehakte Schritte", r.anzahlErledigt ? r.schritte.filter((s) => s.status === "erledigt").map((s) => s.titel).join("; ") : "noch keine"],
    ],
    rechenweg: [
      "Der Begleiter hakt die Schritte des Verfahrens in Ihrem Land ab; der erste nicht erledigte Schritt ist „als Nächstes“ markiert.",
      land === "DE"
        ? "Fristen: Nach § 8 Abs. 5 EEG muss der Netzbetreiber unverzüglich einen Zeitplan übermitteln; das Ergebnis der Netzverträglichkeitsprüfung samt Kostenvoranschlag folgt nach § 8 Abs. 6 EEG innerhalb der gesetzlichen Frist ab vollständigem Begehren."
        : r.fristHinweis,
      "Kosten nennt dieser Bericht bewusst nicht: Für belegte Kostenspannen des Netzanschlusses liegt kein geprüfter Wert im Faktenregister. Der Rechner auf der Seite liefert eine eigene, als grobe Orientierung gekennzeichnete Schätzung.",
    ],
    tabelle: null,
    listen: [
      {
        titel: "Ablauf mit Dokumenten-Checkliste",
        art: "schritte",
        eintraege: r.schritte.map((s) => ({
          titel: `Schritt ${s.nummer}: ${s.titel}`,
          stufe: STATUS_STUFE[s.status],
          stufeText: STATUS_TEXT[s.status],
          text: `${s.text}${s.frist ? ` Frist: ${s.frist.de}` : ""} Unterlagen: ${s.dokumente.map((x) => x.de).join("; ")}.`,
        })),
      },
      {
        titel: "Typische Ablehnungsgründe – und was dann hilft",
        art: "ablehnungen",
        eintraege: r.ablehnungen.map((a) => ({ titel: a.grund, text: a.hilfe })),
      },
    ],
    hinweise: [
      "Fachliche Orientierung, keine Rechtsberatung. Verbindlich sind die Auskünfte und Bedingungen des zuständigen Netzbetreibers.",
      ...(r.fristHinweis ? [r.fristHinweis] : []),
    ],
  };
}
