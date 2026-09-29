// src/lib/rechner/reststrom.js
//
// Reststrom-Rechner: Was kann der Pool (Bündelung, Solar-PPA, Flexibilität)
// beim Strom sparen, den ein Unternehmen trotz eigener PV noch aus dem Netz
// bezieht? Reine Funktionen ohne React – im Browser UND in Node testbar:
//
//   node src/lib/rechner/reststrom.js      → Selbsttest
//
// Alle Marktwerte kommen aus src/lib/invest/markt.js (STROM, REGIONEN).
// Ergebnis ist eine Spanne zur Orientierung, kein Angebot.

import { STROM, REGIONEN } from "../invest/markt.js";

/**
 * Lastprofile. `tag` = Anteil des Verbrauchs in den Solarstunden (ca. 8–17 Uhr),
 * `ppa`/`flex` = Faktoren auf die Hebel-Spannen aus STROM.poolHebel,
 * `eigenverbrauch` = typische Eigenverbrauchsquote einer eigenen PV-Anlage.
 * Eigene, vorsichtige Einschätzung auf Basis typischer Gewerbe-Lastgänge.
 */
export const LASTPROFILE = [
  { id: "einschicht", label: "Einschicht", sub: "ca. 6–16 Uhr", tag: 0.62, ppa: 1.0, flex: 0.8, eigenverbrauch: 0.7 },
  { id: "zweischicht", label: "Zweischicht", sub: "ca. 6–22 Uhr", tag: 0.5, ppa: 0.85, flex: 1.0, eigenverbrauch: 0.8 },
  { id: "dreischicht", label: "Dreischicht", sub: "rund um die Uhr", tag: 0.38, ppa: 0.65, flex: 0.75, eigenverbrauch: 0.9 },
  { id: "handel", label: "Handel & Büro", sub: "Laden, Kühlung, Klima", tag: 0.55, ppa: 0.9, flex: 0.9, eigenverbrauch: 0.75 },
];

export const profilById = (id) => LASTPROFILE.find((p) => p.id === id) || LASTPROFILE[0];

/** Mittlerer spezifischer Ertrag einer Gewerbe-PV (Dach, nicht optimal ausgerichtet) – Mittel der DE-Regionen × 0,9 */
const DE_REGIONEN = REGIONEN.filter((r) => r.land === "DE");
export const PV_ERTRAG_KWH_PRO_KWP = Math.round((DE_REGIONEN.reduce((s, r) => s + r.ertrag, 0) / DE_REGIONEN.length) * 0.9);

/** Ab dieser Menge ist ein Pool-Beitritt in der Regel sinnvoll (MWh/Jahr) – vorsichtige Orientierung */
export const SINNVOLL_AB_MWH = 100;

/** Die Beschaffung lässt sich nicht beliebig drücken: max. Anteil der Beschaffungskomponente, der eingespart werden kann */
const MAX_ANTEIL_BESCHAFFUNG = 0.35;

const fixeBestandteile = () => STROM.bestandteile.filter((b) => !b.beeinflussbar);
const stromsteuerRegel = () => STROM.bestandteile.find((b) => b.id === "stromsteuer")?.ct ?? 0;

/**
 * @param {object} e
 * @param {number} e.verbrauchMwh     Jahresverbrauch aus dem Netz heute (MWh)
 * @param {number} e.preisCt          aktueller Arbeitspreis gesamt, netto (ct/kWh)
 * @param {string} e.profil           id aus LASTPROFILE
 * @param {number} e.pvKwp            eigene PV-Leistung (0 = keine)
 * @param {boolean} e.pvBestand       true: PV läuft schon (Verbrauch oben ist bereits Reststrom)
 * @param {boolean} e.produzierend    produzierendes Gewerbe / Land- und Forstwirtschaft
 */
export function berechneReststrom({ verbrauchMwh = 500, preisCt = 20, profil = "einschicht", pvKwp = 0, pvBestand = false, produzierend = false } = {}) {
  const p = profilById(profil);
  const verbrauchKwh = Math.max(0, verbrauchMwh) * 1000;

  // 1) Eigene PV: Eigenverbrauch deckt einen Teil der Tagesstunden
  const pvErtrag = Math.max(0, pvKwp) * PV_ERTRAG_KWH_PRO_KWP;
  const tagesLast = verbrauchKwh * p.tag;
  // Geplante PV: Eigenverbrauch höchstens 90 % der Tageslast
  const eigenverbrauch = pvBestand ? 0 : Math.min(pvErtrag * p.eigenverbrauch, tagesLast * 0.9);
  const reststromKwh = Math.max(0, verbrauchKwh - eigenverbrauch);
  // Wie stark sind die Tagesstunden schon durch eigene PV gedeckt? (bestimmt den PPA-Spielraum)
  const pvDeckungTag = tagesLast > 0 ? Math.min(1, (pvErtrag * p.eigenverbrauch) / tagesLast) : 0;

  // 2) Preiszerlegung heute
  const fix = fixeBestandteile().map((b) => ({ ...b }));
  const fixSumme = fix.reduce((s, b) => s + b.ct, 0);
  const beschaffungVorher = Math.max(0, preisCt - fixSumme);
  const preisUnplausibel = preisCt < fixSumme + 3;

  // 3) Hebel des Pools in ct/kWh Reststrom
  const faktor = {
    buendelung: 1,
    ppa: p.ppa * Math.max(0.25, 1 - pvDeckungTag),
    flex: p.flex * (pvKwp > 0 ? 1.1 : 1),
  };
  let hebel = STROM.poolHebel.map((h) => {
    const f = faktor[h.id] ?? 1;
    return { id: h.id, label: h.label, ctMin: h.ct.min * f, ctMax: h.ct.max * f };
  });

  // Deckel: nie mehr als MAX_ANTEIL_BESCHAFFUNG der heutigen Beschaffungskomponente
  const deckel = beschaffungVorher * MAX_ANTEIL_BESCHAFFUNG;
  const summeMax = hebel.reduce((s, h) => s + h.ctMax, 0);
  if (summeMax > deckel) {
    // proportional kürzen – Verhältnis der Hebel bleibt erhalten
    const k = summeMax > 0 ? deckel / summeMax : 0;
    hebel = hebel.map((h) => ({ ...h, ctMin: h.ctMin * k, ctMax: h.ctMax * k }));
  }
  hebel = hebel.map((h) => ({ ...h, eurMin: (h.ctMin / 100) * reststromKwh, eurMax: (h.ctMax / 100) * reststromKwh }));

  const gesamt = {
    ctMin: hebel.reduce((s, h) => s + h.ctMin, 0),
    ctMax: hebel.reduce((s, h) => s + h.ctMax, 0),
  };
  gesamt.ctMitte = (gesamt.ctMin + gesamt.ctMax) / 2;
  gesamt.eurMin = (gesamt.ctMin / 100) * reststromKwh;
  gesamt.eurMax = (gesamt.ctMax / 100) * reststromKwh;
  gesamt.eurMitte = (gesamt.eurMin + gesamt.eurMax) / 2;

  const kostenVorher = (preisCt / 100) * reststromKwh;
  gesamt.anteilMin = kostenVorher > 0 ? gesamt.eurMin / kostenVorher : 0;
  gesamt.anteilMax = kostenVorher > 0 ? gesamt.eurMax / kostenVorher : 0;

  // 4) Preiszerlegung vorher/nachher (nachher mit Mitte der Spanne)
  const vorher = [{ id: "beschaffung", label: "Beschaffung & Vertrieb", ct: beschaffungVorher, beeinflussbar: true }, ...fix];
  const nachher = [{ id: "beschaffung", label: "Beschaffung & Vertrieb (Pool)", ct: Math.max(0, beschaffungVorher - gesamt.ctMitte), beeinflussbar: true }, ...fix];

  // 5) Stromsteuer-Entlastung (separat, keine Pool-Leistung – Antrag beim Hauptzollamt)
  const steuerDiff = stromsteuerRegel() - STROM.stromsteuerProduzierend;
  const stromsteuer = produzierend
    ? { ctJeKwh: steuerDiff, eur: (steuerDiff / 100) * reststromKwh }
    : null;

  return {
    profil: p,
    verbrauchKwh,
    pvErtrag,
    eigenverbrauch,
    reststromKwh,
    pvDeckungTag,
    fixSumme,
    beschaffungVorher,
    preisUnplausibel,
    kostenVorher,
    hebel,
    gesamt,
    vorher,
    nachher,
    stromsteuer,
    klein: verbrauchMwh < SINNVOLL_AB_MWH,
  };
}

/* ------------------------------------------------------------------ */
/* Selbsttest: node src/lib/rechner/reststrom.js                        */
/* ------------------------------------------------------------------ */

export function selbsttest() {
  const fehler = [];
  const pruefe = (bed, text) => { if (!bed) fehler.push(text); };

  const basis = berechneReststrom({ verbrauchMwh: 1000, preisCt: 20, profil: "einschicht" });
  pruefe(basis.reststromKwh === 1_000_000, "ohne PV ist Reststrom = Verbrauch");
  pruefe(basis.hebel.length === STROM.poolHebel.length, "je Hebel ein Ergebnis");
  pruefe(basis.gesamt.eurMin > 0 && basis.gesamt.eurMax > basis.gesamt.eurMin, "Spanne positiv und geordnet");
  pruefe(basis.gesamt.ctMax <= basis.beschaffungVorher * 0.35 + 1e-9, "Deckel auf Beschaffung eingehalten");
  pruefe(Math.abs(basis.vorher.reduce((s, b) => s + b.ct, 0) - 20) < 1e-9, "Zerlegung vorher summiert auf Eingabepreis");
  pruefe(basis.nachher.reduce((s, b) => s + b.ct, 0) < 20, "nachher günstiger als vorher");
  pruefe(basis.stromsteuer === null, "ohne produzierendes Gewerbe keine Stromsteuer-Entlastung");

  const pv = berechneReststrom({ verbrauchMwh: 1000, preisCt: 20, profil: "einschicht", pvKwp: 500 });
  pruefe(pv.reststromKwh < basis.reststromKwh, "geplante PV senkt den Reststrom");
  const ppaOhne = basis.hebel.find((h) => h.id === "ppa").ctMax;
  const ppaMit = pv.hebel.find((h) => h.id === "ppa").ctMax;
  pruefe(ppaMit < ppaOhne, "eigene PV verkleinert den PPA-Hebel");

  const best = berechneReststrom({ verbrauchMwh: 1000, preisCt: 20, pvKwp: 500, pvBestand: true });
  pruefe(best.reststromKwh === 1_000_000, "bestehende PV: Verbrauch ist bereits Reststrom");

  const drei = berechneReststrom({ verbrauchMwh: 1000, preisCt: 20, profil: "dreischicht" });
  pruefe(drei.hebel.find((h) => h.id === "ppa").ctMax < ppaOhne, "Dreischicht: weniger PPA-Potenzial als Einschicht");

  const prod = berechneReststrom({ verbrauchMwh: 1000, preisCt: 20, produzierend: true });
  pruefe(prod.stromsteuer && Math.abs(prod.stromsteuer.eur - 20000) < 1, "Stromsteuer-Entlastung 2,0 ct × 1 GWh = 20.000 €");

  const billig = berechneReststrom({ verbrauchMwh: 1000, preisCt: 9 });
  pruefe(billig.beschaffungVorher === 0 && billig.gesamt.eurMax === 0, "unplausibel niedriger Preis → keine Ersparnis");
  pruefe(billig.preisUnplausibel, "unplausibel niedriger Preis wird markiert");

  pruefe(berechneReststrom({ verbrauchMwh: 50 }).klein, "unter 100 MWh als klein markiert");
  for (const h of basis.hebel) pruefe(h.ctMin <= h.ctMax, `Hebel ${h.id}: min ≤ max`);

  return fehler;
}

if (typeof process !== "undefined" && process.argv?.[1] && /reststrom\.js$/.test(process.argv[1].replace(/\\/g, "/"))) {
  const f = selbsttest();
  const b = berechneReststrom({ verbrauchMwh: 1000, preisCt: 20 });
  console.log("Beispiel 1.000 MWh, 20 ct:", Math.round(b.gesamt.eurMin), "–", Math.round(b.gesamt.eurMax), "€/Jahr");
  if (f.length) {
    console.error("FEHLER:\n- " + f.join("\n- "));
    process.exit(1);
  }
  console.log("Selbsttest reststrom.js: alle Prüfungen bestanden.");
}
