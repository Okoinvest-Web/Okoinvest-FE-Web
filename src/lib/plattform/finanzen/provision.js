// src/lib/plattform/finanzen/provision.js
//
// Provisionsrechnung, Zahlungsstatus und Mahnhinweis – reine Funktionen.

import { MAHNSTUFEN } from "./konstanten.js";
import { datumDe, rund, rund2, tageZwischen, zahlDe } from "./basis.js";

/** Positionen der Provisionsrechnung an den Anbieter (Verkäuferprovision bei Abschluss) */
export function provisionPositionen(provision, projektTitel = "") {
  const satz = Number(provision.satz) || 0;
  const kaufpreis = Number(provision.kaufpreis) || 0;
  const betrag = rund2(Number(provision.betrag) || kaufpreis * satz);
  return [
    {
      art: "provision", artikel: "PROVISION",
      text: `Vermittlungsprovision Projektbörse ${rund(satz * 100, 2).toLocaleString("de-DE")} % auf den Kaufpreis von ${zahlDe(kaufpreis, 2)} €${projektTitel ? ` – Projekt „${projektTitel}“` : ""} (${provision.projektId || ""})`,
      menge: 1, einheit: "Pauschale", preis: betrag, betrag,
    },
  ];
}

/** offen | ueberfaellig | angewiesen | bezahlt | storniert */
export function zahlungsstatus(beleg, heute) {
  if (!beleg) return "offen";
  if (beleg.status === "bezahlt" || beleg.status === "storniert" || beleg.status === "angewiesen") return beleg.status;
  if (beleg.faelligAm && heute && beleg.faelligAm < heute) return "ueberfaellig";
  return "offen";
}

/** Mahnhinweis (nur Vorschlag): Stufe nach Tagen über Fälligkeit, null = keiner */
export function mahnhinweis(beleg, heute, stufen = MAHNSTUFEN) {
  if (zahlungsstatus(beleg, heute) !== "ueberfaellig") return null;
  const tage = tageZwischen(beleg.faelligAm, heute);
  const erreicht = stufen.filter((s) => tage >= s.tage).pop();
  const letzte = Math.max(0, ...(beleg.mahnungen || []).map((m) => Number(m.stufe) || 0));
  if (!erreicht) return { tage, stufe: 0, label: "Überfällig – noch keine Mahnstufe", faellig: false };
  return { tage, stufe: erreicht.stufe, label: erreicht.label, faellig: erreicht.stufe > letzte, text: `Seit ${tage} Tagen überfällig (fällig ${datumDe(beleg.faelligAm)}) – empfohlen: ${erreicht.label}` };
}

/** Provisionsstatus aus dem Zahlungsstatus der Rechnung (Plattform Provision: offen → in_rechnung → bezahlt) */
export function provisionStatusAusRechnung(rechnung) {
  if (!rechnung || rechnung.status === "storniert") return "offen";
  if (rechnung.status === "bezahlt") return "bezahlt";
  return "in_rechnung";
}
