// src/lib/anfrage/score.js
//
// Regelbasierter Lead-Score A/B/C mit Begründung (Welle 2, Paket B3; Masterplan 5.4: kein Machine Learning vor
// ca. 300 Abschlüssen je Segment). Reine Funktion, Client + Server. Frappe-Spiegel: plattform/api/einwilligung.py (score).
//
// Der Score PRIORISIERT nur die Bearbeitung. Er entscheidet nichts über die Person (keine Absage, kein Ausschluss) –
// eine ausschließlich automatisierte Entscheidung nach Art. 22 DSGVO / Art. 21 revDSG findet nicht statt.
// TODO Rechtsabteilung: Logik in der Datenschutzerklärung beschreiben.
//
// Punkte (max. 100):  Größe gross 40 · mittel 25 · klein 10 · Typ ohne Größenklasse 20 · unbekannt 0
//                     Land bekannt 20 · Rückrufwunsch 20 · Vollständigkeit bis 20 (je 5: Firma, PLZ, Telefon, Nachricht)
// Klasse: A ab 70, B ab 40, sonst C. Schwellen sind interne Arbeitswerte (TODO Vertrieb: nach 4 Wochen kalibrieren).

import { GROESSEN } from "../../data/lead-routing.js";

export const SCORE_SCHWELLEN = Object.freeze({ A: 70, B: 40 });
const GROESSE_PUNKTE = { gross: 40, mittel: 25, klein: 10, unbekannt: 0 };
const GROESSE_TEXT = { gross: "große Größenklasse", mittel: "mittlere Größenklasse", klein: "kleine Größenklasse", unbekannt: "Größe unbekannt" };
const gefuellt = (x) => (typeof x === "string" ? x.trim().length > 0 : typeof x === "number" && Number.isFinite(x));

/**
 * eingabe: { typ (Lead-Typ), groesse: { klasse, wert?, einheit? }, landBekannt, rueckruf, kontakt, daten }
 * Liefert immer { klasse: "A"|"B"|"C", punkte, gruende: [{ text, punkte }], begruendung }.
 */
export function scoreBerechnen({ typ, groesse, landBekannt, rueckruf, kontakt, daten } = {}) {
  const gruende = [];
  const k = kontakt && typeof kontakt === "object" ? kontakt : {};
  const d = daten && typeof daten === "object" ? daten : {};

  const hatGroesse = Object.hasOwn(GROESSEN, typ);
  if (hatGroesse) {
    const kl = GROESSE_PUNKTE[groesse?.klasse] !== undefined ? groesse.klasse : "unbekannt";
    const wert = groesse?.wert != null ? ` (${[String(groesse.wert).replace(".", ","), groesse.einheit].filter(Boolean).join(" ")})` : "";
    gruende.push({ text: `${GROESSE_TEXT[kl]}${wert}`, punkte: GROESSE_PUNKTE[kl] });
  } else {
    gruende.push({ text: "Anfragetyp ohne Größenklasse", punkte: 20 });
  }
  gruende.push(landBekannt ? { text: "Land bekannt", punkte: 20 } : { text: "Land unbekannt", punkte: 0 });
  gruende.push(rueckruf ? { text: "Rückruf gewünscht", punkte: 20 } : { text: "kein Rückrufwunsch", punkte: 0 });

  const felder = [["Firma", k.firma], ["PLZ", k.plz], ["Telefon", k.telefon], ["Nachricht", d.nachricht]];
  const da = felder.filter(([, w]) => gefuellt(w)).map(([n]) => n);
  gruende.push({ text: da.length ? `Angaben vollständig: ${da.join(", ")} (${da.length} von 4)` : "keine Zusatzangaben", punkte: da.length * 5 });

  const punkte = Math.min(100, gruende.reduce((s, g) => s + g.punkte, 0));
  const klasse = punkte >= SCORE_SCHWELLEN.A ? "A" : punkte >= SCORE_SCHWELLEN.B ? "B" : "C";
  return { klasse, punkte, gruende, begruendung: `${klasse} (${punkte} Punkte): ${gruende.map((g) => `${g.text} +${g.punkte}`).join(" · ")}` };
}
