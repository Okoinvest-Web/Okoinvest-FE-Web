// src/lib/rechner/ppa.js
//
// PPA-Rechner für Unternehmen: Was bringt ein Stromliefervertrag (Power
// Purchase Agreement) aus einem Solarpark gegenüber der heutigen Beschaffung –
// bei fallenden, gleichbleibenden oder steigenden Börsenpreisen?
// Reine Funktionen ohne React:
//
//   node src/lib/rechner/ppa.js      → Selbsttest
//
// Methodik (bewusst einfach, offen gelegt):
//  - Heutiger Energiepreis (Beschaffung + Vertrieb, ohne Netz/Umlagen/Steuern)
//    folgt dem Marktpreis-Szenario: linear über 4 Jahre zum Zielniveau, dann konstant.
//  - Pay-as-produced: Die PPA-Menge fällt im Solarprofil an. Nur der Teil, der
//    gleichzeitig verbraucht wird, ersetzt Strombezug; Überschüsse werden zum
//    Solar-Marktwert (Capture Rate × Base) abzüglich Abschlag weiterverkauft.
//    Der Reststrom (Abend, Nacht, Winter) wird dadurch etwas teurer je kWh.
//  - Baseload/strukturiert: Der Lieferant formt die PPA-Menge in Ihr Lastprofil,
//    dafür fällt ein Strukturierungsaufschlag an; keine Überschüsse.
//  - Netzentgelte, Umlagen und Stromsteuer bleiben in beiden Fällen gleich und
//    sind deshalb nicht Teil des Vergleichs.

import { STROM, ALLGEMEIN } from "../invest/markt.js";
import { LASTPROFILE, profilById } from "./reststrom.js";

export { LASTPROFILE };

const P = STROM.ppa;

export const STRUKTUREN = [
  { id: "pap", label: "Pay-as-produced", sub: "Solarprofil, wie erzeugt" },
  { id: "base", label: "Baseload/Profil", sub: "geformt, mit Aufschlag" },
];

/** Marktpreis-Szenarien: Zielniveau relativ zu heute, erreicht nach `jahre` Jahren */
export const SZENARIEN = [
  { id: "fall", label: "Preisverfall", sub: "−30 % in 4 Jahren", ziel: 0.7 },
  { id: "seit", label: "Seitwärts", sub: "Niveau hält", ziel: 1.0 },
  { id: "anstieg", label: "Anstieg", sub: "+30 % in 4 Jahren", ziel: 1.3 },
];
const UEBERGANG_JAHRE = 4;

/** Anteil der Tageslast, den Solarstrom im Jahresverlauf gleichzeitig decken kann (Sommer-Überschuss, Winter-Lücke) – eigene Näherung */
export const GLEICHZEITIG = 0.8;

export const STANDARD = {
  verbrauchMwh: 2000,
  profil: "einschicht",
  preisCt: STROM.bestandteile.find((b) => b.id === "beschaffung").ct,
  ppaCt: P.pppCt.mittel,
  laufzeit: 10,
  anteil: 0.3,
  struktur: "pap",
  strukturCt: P.strukturierungCt.mittel,
};

export function indexImJahr(szenario, t) {
  const s = SZENARIEN.find((x) => x.id === szenario) || SZENARIEN[1];
  const f = Math.min(1, t / UEBERGANG_JAHRE);
  return 1 + (s.ziel - 1) * f;
}

/** Jahreskosten der Energie mit und ohne PPA bei gegebenem Marktindex */
export function jahresKosten(e, idx) {
  const p = profilById(e.profil);
  const V = e.verbrauchMwh * 1000; // kWh
  const ohne = V * (e.preisCt / 100) * idx;
  const vPpa = V * e.anteil;
  if (e.struktur === "base") {
    const rest = V - vPpa;
    const kostenPpa = vPpa * ((e.ppaCt + e.strukturCt) / 100);
    const kostenRest = rest * (e.preisCt / 100) * idx;
    return { ohne, mit: kostenPpa + kostenRest, vPpa, direkt: vPpa, ueberschuss: 0, rest, kostenPpa, kostenRest, erloesUeberschuss: 0 };
  }
  const tagesLast = V * p.tag;
  const direkt = Math.min(vPpa, tagesLast * GLEICHZEITIG);
  const ueberschuss = vPpa - direkt;
  const rest = V - direkt;
  const kostenPpa = vPpa * ((e.ppaCt + P.bilanzierungCt) / 100);
  const wertUeberschussCt = P.captureRate * P.baseTerminCt * idx * (1 - P.vermarktungsAbschlag);
  const erloesUeberschuss = ueberschuss * (wertUeberschussCt / 100);
  // Der verdrängte Solarstunden-Bezug war etwas günstiger als der Durchschnitt → Reststrom-Profil wird teurer
  const kostenRest = (rest + direkt * P.residualAufschlag) * (e.preisCt / 100) * idx;
  return { ohne, mit: kostenPpa + kostenRest - erloesUeberschuss, vPpa, direkt, ueberschuss, rest, kostenPpa, kostenRest, erloesUeberschuss, wertUeberschussCt };
}

export function rechnePpa(eingabe = {}) {
  const e = { ...STANDARD, ...eingabe };
  const szen = SZENARIEN.map((s) => {
    const jahre = [];
    let kum = 0;
    for (let t = 1; t <= e.laufzeit; t++) {
      const idx = indexImJahr(s.id, t);
      const k = jahresKosten(e, idx);
      const ersparnis = k.ohne - k.mit;
      kum += ersparnis;
      jahre.push({ jahr: t, idx, ohne: k.ohne, mit: k.mit, ersparnis, kum });
    }
    const summeOhne = jahre.reduce((a, j) => a + j.ohne, 0);
    const summeMit = jahre.reduce((a, j) => a + j.mit, 0);
    return { ...s, jahre, summe: kum, summeOhne, summeMit, anteil: summeOhne > 0 ? kum / summeOhne : 0 };
  });

  const heute = jahresKosten(e, 1);
  // Break-even: Ersparnis(idx) = (ohne − mit) ist linear in idx → Nullstelle
  const k0 = jahresKosten(e, 0);
  const k1 = heute;
  const s0 = k0.ohne - k0.mit;
  const s1 = k1.ohne - k1.mit;
  const breakEvenIdx = s1 - s0 !== 0 ? -s0 / (s1 - s0) : null;

  // Preisabsicherung: Bandbreite der Energiekosten zwischen Verfall und Anstieg
  const kFall = jahresKosten(e, SZENARIEN[0].ziel);
  const kHoch = jahresKosten(e, SZENARIEN[2].ziel);
  const bandOhne = kHoch.ohne - kFall.ohne;
  const bandMit = kHoch.mit - kFall.mit;

  const effektivCt = heute.direkt > 0 ? ((heute.kostenPpa - heute.erloesUeberschuss) / heute.direkt) * 100 : null; // ct je direkt genutzter kWh
  const co2T = (heute.vPpa * ALLGEMEIN.co2KgProKwh) / 1000;

  return {
    eingabe: e,
    profil: profilById(e.profil),
    heute,
    ersparnisJahr1: heute.ohne - heute.mit,
    szenarien: szen,
    breakEvenCt: breakEvenIdx != null ? breakEvenIdx * e.preisCt : null,
    breakEvenIdx,
    bandOhne,
    bandMit,
    absicherung: bandOhne > 0 ? 1 - bandMit / bandOhne : 0,
    effektivCt,
    co2T,
    ueberschussAnteil: heute.vPpa > 0 ? heute.ueberschuss / heute.vPpa : 0,
    negativRisikoKwh: e.struktur === "pap" ? heute.vPpa * P.negativAnteilSolar : 0,
  };
}

/* ------------------------------------------------------------------ */
/* Selbsttest: node src/lib/rechner/ppa.js                             */
/* ------------------------------------------------------------------ */

export function selbsttest() {
  const fehler = [];
  const pruefe = (ok, t) => ok || fehler.push(t);

  const base = rechnePpa({ verbrauchMwh: 1000, preisCt: 10, ppaCt: 8, strukturCt: 0, struktur: "base", anteil: 0.5, laufzeit: 10 });
  pruefe(Math.abs(base.ersparnisJahr1 - 1000 * 1000 * 0.5 * 0.02) < 1, "Baseload: 50 % × 1 GWh × 2 ct Differenz = 10.000 €");
  pruefe(Math.abs(base.breakEvenCt - 8) < 1e-6, "Baseload: Break-even beim PPA-Preis");
  pruefe(Math.abs(base.absicherung - 0.5) < 1e-9, "Baseload 50 %: halbe Preisbandbreite abgesichert");

  const s = base.szenarien;
  pruefe(s[0].summe < s[1].summe && s[1].summe < s[2].summe, "Ersparnis steigt mit dem Marktpreis");
  pruefe(Math.abs(indexImJahr("fall", 4) - 0.7) < 1e-9 && Math.abs(indexImJahr("fall", 8) - 0.7) < 1e-9, "Szenario erreicht Ziel nach 4 Jahren");

  const pap = rechnePpa({ verbrauchMwh: 1000, anteil: 0.3, struktur: "pap", profil: "einschicht" });
  pruefe(pap.heute.ueberschuss === 0, "30 % bei Einschicht passt vollständig in die Tageslast");
  const papGross = rechnePpa({ verbrauchMwh: 1000, anteil: 0.8, struktur: "pap", profil: "dreischicht" });
  pruefe(papGross.heute.ueberschuss > 0, "80 % Solar bei Dreischicht erzeugt Überschuss");
  pruefe(papGross.absicherung < 0.8, "Überschüsse schwanken mit dem Markt → weniger Absicherung als die Menge");
  pruefe(pap.co2T > 0, "CO₂-Vermeidung positiv");
  pruefe(Math.abs(pap.effektivCt - (pap.eingabe.ppaCt + 0.3)) < 1e-6, "ohne Überschuss: effektiver Preis = PPA + Bilanzierung");

  const ohne = rechnePpa({ anteil: 0 });
  pruefe(Math.abs(ohne.ersparnisJahr1) < 1e-6, "ohne PPA-Menge keine Ersparnis");
  return { fehler, beispiel: rechnePpa() };
}

if (typeof process !== "undefined" && process.argv?.[1] && /ppa\.js$/.test(process.argv[1].replace(/\\/g, "/"))) {
  const { fehler, beispiel: r } = selbsttest();
  console.log(
    `Beispiel 2 GWh, 30 % PaP à ${r.eingabe.ppaCt} ct: Ersparnis Jahr 1 ${Math.round(r.ersparnisJahr1)} €, Szenarien ${r.szenarien.map((s) => Math.round(s.summe)).join(" / ")} €, ` +
      `Break-even ${r.breakEvenCt?.toFixed(2)} ct, Absicherung ${(r.absicherung * 100).toFixed(0)} %`
  );
  if (fehler.length) {
    console.error("FEHLER:\n- " + fehler.join("\n- "));
    process.exit(1);
  }
  console.log("Selbsttest ppa.js: alle Prüfungen bestanden.");
}
