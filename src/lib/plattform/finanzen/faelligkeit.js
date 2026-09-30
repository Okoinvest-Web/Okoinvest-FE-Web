// src/lib/plattform/finanzen/faelligkeit.js
//
// Abrechnungsperioden und Fälligkeiten eines Pachtvertrags – reine Funktionen.
//
// Perioden sind kalendergebunden (Jahr, Halbjahr, Quartal, Monat). Beginnt oder endet der Vertrag innerhalb einer
// Periode, wird taggenau anteilig gerechnet (`anteil` = Vertragstage / Periodentage).
//
// Phasen:
//   reservierung  vom Vertragsdatum bis zum Tag vor dem Pachtbeginn (Baubeginn/Inbetriebnahme). Ist der Beginn noch
//                 offen, laufen die Perioden bis zum Stichtag. Die Reservierungsprämie wird IMMER nachschüssig
//                 abgerechnet – so entsteht beim späteren Pachtbeginn keine Rückforderung.
//   pacht         vom Pachtbeginn bis zum Laufzeitende (Beginn + Laufzeit − 1 Tag), Zahlweise laut Vertrag.
//
// Fällig: vorschüssig am ersten Tag der Periode + Zahlungsziel, nachschüssig am Tag nach Periodenende + Zahlungsziel.
// Abgerechnet (Gutschrift erzeugt) wird eine Periode, sobald der Erstellungstag erreicht ist:
//   vorschüssig   `vorlaufTage` vor der Fälligkeit (Eigentümer erhält die Gutschrift rechtzeitig)
//   nachschüssig  nach Ablauf der Periode

import { RHYTHMEN } from "./konstanten.js";
import { istDatum, jahrVon, monatVon, monatsAnfang, monatsEnde, plusTage, tageZwischen } from "./basis.js";

/** Kalenderperiode, die den Tag `datum` enthält */
export function periodeVon(datum, rhythmus) {
  const monate = RHYTHMEN[rhythmus]?.monate || 12;
  const j = jahrVon(datum);
  const startMonat = Math.floor((monatVon(datum) - 1) / monate) * monate + 1;
  return { von: monatsAnfang(j, startMonat), bis: monatsEnde(j, startMonat + monate - 1) };
}

/** Perioden zwischen ab und bis (beide inklusive, bis optional = offen, dann bis `stopp`) */
export function perioden({ ab, bis = null, rhythmus = "jaehrlich", stopp }) {
  if (!istDatum(ab)) return [];
  const ende = bis && istDatum(bis) ? bis : stopp;
  if (!ende || ende < ab) return [];
  const liste = [];
  let p = periodeVon(ab, rhythmus);
  for (let i = 0; i < 1200 && p.von <= ende; i++) {
    const von = ab > p.von ? ab : p.von;
    const bisTag = bis && bis < p.bis ? bis : p.bis;
    const tageVoll = tageZwischen(p.von, p.bis) + 1;
    const tage = tageZwischen(von, bisTag) + 1;
    liste.push({ periodeVon: p.von, periodeBis: p.bis, von, bis: bisTag, tage, tageVoll, anteil: tage / tageVoll, monate: RHYTHMEN[rhythmus]?.monate || 12 });
    p = periodeVon(plusTage(p.bis, 1), rhythmus);
  }
  return liste;
}

/** Laufzeitende = Beginn + Laufzeit (Jahre) − 1 Tag */
export function laufzeitEnde(beginn, laufzeitJahre) {
  if (!istDatum(beginn) || !(Number(laufzeitJahre) > 0)) return null;
  const j = jahrVon(beginn) + Number(laufzeitJahre);
  const ziel = `${j}${String(beginn).slice(4)}`;
  // Beginn 29.02.: im Schaltjahr endet die Laufzeit am 28.02., sonst am Monatsende (28.02.) – nie am 27.02.
  return istDatum(ziel) ? plusTage(ziel, -1) : `${j}-02-28`;
}

/**
 * Alle Fälligkeiten eines Vertrags bis `stichtag` (inkl. künftiger Perioden bis `ausblickBis` für „nächste Zahlung“).
 * vertrag: { id, vertragsdatum, beginn, laufzeitJahre, faelligkeit, zahlweise, zahlungszielTage, reservierungJahr, vorlaufTage }
 * Rückgabe: [{ schluessel, phase, von, bis, anteil, faktorJahr, faelligAm, erstellbarAb, zahlweise }]
 */
export function faelligkeiten(vertrag, { stichtag, ausblickBis = null } = {}) {
  const rhythmus = RHYTHMEN[vertrag.faelligkeit] ? vertrag.faelligkeit : "jaehrlich";
  const ziel = Math.max(0, Number(vertrag.zahlungszielTage ?? 14));
  const vorlauf = Math.max(0, Number(vertrag.vorlaufTage ?? 14));
  const stopp = ausblickBis && ausblickBis > stichtag ? ausblickBis : stichtag;
  const ergebnis = [];
  const eintrag = (phase, p, zahlweise) => {
    const faelligAm = zahlweise === "vorschuessig" ? plusTage(p.von, ziel) : plusTage(p.bis, 1 + ziel);
    const erstellbarAb = zahlweise === "vorschuessig" ? plusTage(faelligAm, -vorlauf - ziel) : plusTage(p.bis, 1);
    ergebnis.push({
      schluessel: `${vertrag.id}:${phase}:${p.von}`,
      phase, von: p.von, bis: p.bis, anteil: p.anteil, tage: p.tage, tageVoll: p.tageVoll,
      // Anteil eines Jahresbetrags: Periodenlänge in Monaten / 12 × taggenauer Anteil
      faktorJahr: (p.monate / 12) * p.anteil,
      faelligAm, erstellbarAb, zahlweise,
    });
  };
  // Reservierungsprämie bis zum Pachtbeginn (nachschüssig)
  if (Number(vertrag.reservierungJahr) > 0 && istDatum(vertrag.vertragsdatum)) {
    const resBis = istDatum(vertrag.beginn) ? plusTage(vertrag.beginn, -1) : null;
    if (!resBis || resBis >= vertrag.vertragsdatum) {
      // offener Beginn: Perioden werden fortgeschrieben; abgerechnet wird erst nach Periodenende (nachschüssig)
      for (const p of perioden({ ab: vertrag.vertragsdatum, bis: resBis, rhythmus, stopp })) eintrag("reservierung", p, "nachschuessig");
    }
  }
  if (istDatum(vertrag.beginn)) {
    const ende = laufzeitEnde(vertrag.beginn, vertrag.laufzeitJahre);
    for (const p of perioden({ ab: vertrag.beginn, bis: ende, rhythmus, stopp })) eintrag("pacht", p, vertrag.zahlweise === "vorschuessig" ? "vorschuessig" : "nachschuessig");
  }
  return ergebnis;
}

/** Fällige (abzurechnende) Perioden zum Stichtag */
export const abzurechnen = (vertrag, stichtag) => faelligkeiten(vertrag, { stichtag }).filter((f) => f.erstellbarAb <= stichtag);

/** Nächste künftige Zahlung ab Stichtag (für „nächste Zahlung“ im Portal) */
export function naechsteFaelligkeit(vertrag, stichtag) {
  const bis = plusTage(stichtag, 800);
  return faelligkeiten(vertrag, { stichtag, ausblickBis: bis }).find((f) => f.faelligAm >= stichtag) || null;
}
