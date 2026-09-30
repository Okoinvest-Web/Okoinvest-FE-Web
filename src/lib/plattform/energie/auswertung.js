// src/lib/plattform/energie/auswertung.js
//
// Auswertungen für die Seiten des Handelsdesks und der Kundenanalyse – reine Funktionen, liefern KOMPAKTE Ergebnisse
// (keine Rohzeitreihen an die Seite; wichtig für die Seitengröße und den Dev-Modus von React 19).

import { ortszeit, jahresKennzahlen, kennzahlen, monatsKennzahlen, negativeStunden, stundenform, stundenpreiskurve, tageswerte, tagesprofil, terminPreisZeitraum, volatilitaet, aktuelleKurve, monatsBeginnMs, naechsterMonat } from "./markt.js";
import { kundenReihe, profilKennzahlen, strukturVergleich, vertragEnergiepreisCt } from "./beschaffung.js";

const H = 3600000;

/** Kompakte Spot-Auswertung einer Zone: Kennzahlen (365 Tage), Jahre, Monate (13), Tage (120), letzte 48 h, Tagesprofil */
export function spotAuswertung(spot) {
  const stunden = spot?.stunden || [];
  const ende = stunden.length ? stunden[stunden.length - 1].t : Date.now();
  const jahr = stunden.filter((s) => s.t > ende - 365 * 86400e3);
  const monate = monatsKennzahlen(stunden, spot?.zone).slice(-13);
  return {
    zone: spot?.zone,
    quelle: spot?.quelle,
    quelleLabel: spot?.quelleLabel,
    lizenz: spot?.lizenz,
    aufloesungMin: spot?.aufloesungMin,
    fehler: spot?.fehler || null,
    stand: spot?.stand,
    gesamt: kennzahlen(jahr, spot?.zone),
    jahre: jahresKennzahlen(stunden, spot?.zone),
    monate,
    tage: tageswerte(stunden).slice(-120),
    aktuell: (spot?.aktuell || []).map((p) => ({ t: p.t, eurMwh: Math.round(p.eurMwh * 100) / 100 })),
    profil: tagesprofil(jahr),
    volatilitaet: volatilitaet(jahr),
    negativ: negativeStunden(jahr),
  };
}

/**
 * Kundenanalyse: Profilkennzahlen und Kosten nach Beschaffungsstruktur rückwirkend (letzte 12 volle Monate der
 * Spot-Historie) und prognostisch (Folgezeitraum nach Vertragsende, Stundenpreiskurve aus Terminkurve + Stundenform),
 * PV/Speicher-Einfluss (geplante Anlage aus dem Vertrag).
 * @param {object} k      Ergebnis energieKunde()
 * @param {object} spot   Ergebnis energieSpot() der Zone des Kunden
 * @param {object[]} kurveEintraege  aktuelle Terminkurve (energieTermin().kurve)
 */
export function kundenAuswertung(k, spot, kurveEintraege = []) {
  const vt = k.vertraege.find((x) => ["aktiv", "gekuendigt"].includes(x.status) && x.quelle !== "zuschlag") || k.vertraege[0] || null;
  const zone = vt?.zone === "AT" ? "AT" : "DE";
  const e = k.einstellungen || {};
  const los = k.los || {};
  const jahresKwh = vt?.jahresKwh || los.jahresKwh || 0;
  const profilId = los.analyse ? los.profilId : vt?.lastprofil || los.profilId || "einschicht";
  const kurve = aktuelleKurve(kurveEintraege);
  const stunden = spot?.stunden || [];
  if (!jahresKwh || !stunden.length) return { fehlt: !jahresKwh ? "Jahresmenge fehlt (Vertrag, Abnahmestelle oder Lastgang pflegen)." : "Keine Spotdaten verfügbar." };

  // Rückwirkend: letzte 12 vollständige Monate
  const letzteT = stunden[stunden.length - 1].t;
  const o = ortszeit(letzteT - 86400e3 * 2);
  let bisM = `${o.jahr}-${String(o.monat + 1).padStart(2, "0")}`;
  const [bj, bm] = bisM.split("-").map(Number);
  bisM = bm === 1 ? `${bj - 1}-12` : `${bj}-${String(bm - 1).padStart(2, "0")}`; // Vormonat (vollständig)
  let vonM = bisM;
  for (let i = 0; i < 11; i++) {
    const [j, m] = vonM.split("-").map(Number);
    vonM = m === 1 ? `${j - 1}-12` : `${j}-${String(m - 1).padStart(2, "0")}`;
  }
  const basis = { jahresKwh, profilId, analyse: los.analyse, zone };
  const reiheHist = kundenReihe({ ...basis, von: vonM, bis: bisM });
  const vonMs = monatsBeginnMs(vonM);
  const bisMs = monatsBeginnMs(naechsterMonat(bisM));
  const hist = stunden.filter((s) => s.t >= vonMs && s.t < bisMs);
  const histBase = hist.length ? hist.reduce((a, s) => a + s.eurMwh, 0) / hist.length : null;
  const vertragCt = vertragEnergiepreisCt(vt);
  const tranchenHist = histBase ? [histBase * 1.04, histBase * 0.98, histBase * 1.07, histBase * 1.01] : [];
  const rueck = strukturVergleich(reiheHist, hist, { fixCt: vertragCt ?? undefined, spotAufschlagCt: 0.5, tranchenPreise: tranchenHist, tranchenAnteil: 0.8, tranchenAufschlagCt: 0.6 });

  // Prognose: Folgezeitraum nach Vertragsende (12 Monate)
  const ende = vt?.vertragEnde;
  let pVon = ende ? naechsterMonat(ende.slice(0, 7)) : `${new Date().getUTCFullYear() + 1}-01`;
  if (pVon <= new Date().toISOString().slice(0, 7)) pVon = naechsterMonat(new Date().toISOString().slice(0, 7));
  let pBis = pVon;
  for (let i = 0; i < 11; i++) pBis = naechsterMonat(pBis);
  const form = stundenform(stunden.slice(-8784));
  const hpfc = stundenpreiskurve({ kurve, zone, von: pVon, bis: pBis, form });
  const reiheProg = kundenReihe({ ...basis, von: pVon, bis: pBis });
  const fwdBase = terminPreisZeitraum(kurve, zone, pVon, pBis, "base");
  const marktFixCt = fwdBase ? (profilKennzahlen(reiheProg, hpfc).lastgewichteterPreis || fwdBase) / 10 + (e.lieferantAufschlagCt ?? 1.2) : null;
  const prog = strukturVergleich(reiheProg, hpfc, { fixCt: marktFixCt ?? undefined, spotAufschlagCt: 0.5, tranchenPreise: fwdBase ? [fwdBase] : [], tranchenAnteil: 0.8, tranchenAufschlagCt: 0.6 });

  // PV/Speicher-Einfluss (geplante Anlage aus dem Vertrag, sonst Beispiel 30 % der Spitze in kWp)
  const kennHist = profilKennzahlen(reiheHist, hist);
  const pvKwp = vt?.pvKwpGeplant || Math.round((kennHist.spitzeKw * 0.8) / 10) * 10;
  const speicherKwh = vt?.speicherKwhGeplant || 0;
  const reihePv = kundenReihe({ ...basis, von: pVon, bis: pBis, pvKwp, speicherKwh });
  const pvSpot = strukturVergleich(reihePv, hpfc, { spotAufschlagCt: 0.5 }).liste.find((x) => x.id === "spot");
  const ohneSpot = prog.liste.find((x) => x.id === "spot");
  const kennPv = profilKennzahlen(reihePv, hpfc);

  // Monatsmengen und Wochenprofil (für Diagramme)
  const monate = [];
  for (let i = 0; i < reiheProg.werte.length; i++) {
    const oz = ortszeit(reiheProg.startMs + i * H);
    const key = `${oz.jahr}-${String(oz.monat + 1).padStart(2, "0")}`;
    const m = monate.find((x) => x.monat === key) || (monate.push({ monat: key, kwh: 0, pvKwh: 0 }), monate[monate.length - 1]);
    m.kwh += reiheProg.werte[i];
    m.pvKwh += reihePv.werte[i];
  }
  const woche = Array.from({ length: 7 }, () => new Array(24).fill(0));
  const n = Array.from({ length: 7 }, () => new Array(24).fill(0));
  for (let i = 0; i < reiheProg.werte.length; i++) {
    const oz = ortszeit(reiheProg.startMs + i * H);
    woche[oz.wochentag][oz.stunde] += reiheProg.werte[i];
    n[oz.wochentag][oz.stunde]++;
  }
  return {
    zone,
    profilQuelle: reiheProg.quelle,
    kennzahlen: kennHist,
    rueckwirkend: { von: vonM, bis: bisM, spotQuelle: spot?.quelle, basePreis: histBase ? Math.round(histBase * 100) / 100 : null, ...rueck },
    prognose: { von: pVon, bis: pBis, forwardBase: fwdBase, fehlend: hpfc.fehlend, marktFixCt: marktFixCt ? Math.round(marktFixCt * 1000) / 1000 : null, kennzahlen: profilKennzahlen(reiheProg, hpfc), ...prog },
    pv: { kwp: pvKwp, speicherKwh, beispiel: !vt?.pvKwpGeplant, eigenverbrauchKwh: reihePv.pv.eigenverbrauchKwh, erzeugtKwh: reihePv.pv.erzeugtKwh, restKwh: reihePv.jahresKwh, spotOhne: ohneSpot?.eur ?? null, spotMit: pvSpot?.eur ?? null, ctOhne: ohneSpot?.ctKwh ?? null, ctMit: pvSpot?.ctKwh ?? null, profilfaktorMit: kennPv.profilfaktor, profilfaktorOhne: prog.liste && profilKennzahlen(reiheProg, hpfc).profilfaktor },
    monate: monate.map((m) => ({ monat: m.monat, mwh: Math.round(m.kwh / 100) / 10, pvMwh: Math.round(m.pvKwh / 100) / 10 })),
    wochenprofil: woche.map((r, t) => r.map((s, h) => (n[t][h] ? Math.round((s / n[t][h]) * 10) / 10 : 0))),
  };
}
