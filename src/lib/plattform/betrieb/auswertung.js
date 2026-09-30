// src/lib/plattform/betrieb/auswertung.js
//
// Betriebsführung – Auswertung mit Messdaten (nur serverseitig). Verbindet Stammdaten/Prozesse (backend/anlagen.js,
// backend/betrieb.js) mit den Zeitreihen (messdaten/*: Ingest-Dienst bzw. Simulator):
//   stoerungKontext      – Prognose, Arbeitspreis und Eigenverbrauchsquote für die Ertragsausfall-Berechnung
//   kennzahlenMonate     – Ist (geeichte Monatswerte, sonst Monitoring), Soll, Einstrahlung → PR, Ist/Soll, Verfügbarkeit
//   plausibilisierung    – Zählerstand-Monatswerte gegen Monitoring, Prognose und Eichfrist (vor der Abrechnung)
//   berichtDaten         – Monats-/Jahresbericht je Anlage (PDF: betrieb/pdf.js)
// Reihenfolge wie überall: ZUERST über das Backend prüfen, ob der Nutzer die Anlage sehen darf, dann Messdaten holen.

import { anlagenBackend } from "../backend/anlagen";
import { betriebBackend } from "../backend/betrieb";
import { messdaten } from "../messdaten";
import { prognoseJahrKwh, prognoseMonatKwh, quoten } from "../anlagen";
import { ausfallJeMonat, berichtZeitraum, kennzahlen, plausibilisieren } from "./kern";

const monatKey = (ms) => {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
};
const monatBeginn = (m) => Date.UTC(Number(m.slice(0, 4)), Number(m.slice(5)) - 1, 1);

/** Kontext der Ertragsausfall-Berechnung (serverseitig aus Stammdaten und Monitoring) */
export async function stoerungKontext(n, anlageId) {
  const a = await anlagenBackend().anlage(n, anlageId);
  const jahresKwh = prognoseJahrKwh(a);
  const arbeitspreisCt = a.vertrag && a.vertrag.status !== "beendet" && Number.isFinite(Number(a.vertrag.strompreisCt)) ? Number(a.vertrag.strompreisCt) : null;
  let eigenverbrauchQuote = null;
  if (arbeitspreisCt !== null) {
    try {
      const bis = Date.now();
      const s = await messdaten().summen(a, { von: bis - 365 * 86400e3, bis });
      eigenverbrauchQuote = quoten(s).eigenverbrauchsquote;
    } catch {
      eigenverbrauchQuote = null;
    }
  }
  return { jahresKwh, arbeitspreisCt, eigenverbrauchQuote };
}

/** Monitoring-Summen je Monat (Erzeugung, Netzbezug, Einspeisung) für die Monate `monate` (JJJJ-MM) */
async function monitoringMonate(a, monate) {
  if (!monate.length) return { werte: {}, fehler: null };
  try {
    const von = monatBeginn(monate[0]);
    const letzter = monate[monate.length - 1];
    const bis = Date.UTC(Number(letzter.slice(0, 4)), Number(letzter.slice(5)), 1);
    const r = await messdaten().reihe(a, { von, bis: Math.min(bis, Date.now()), aufloesung: "1mon" });
    const werte = {};
    for (const p of r.punkte || []) werte[monatKey(Date.parse(p.ts))] = p;
    return { werte, fehler: null };
  } catch (e) {
    return { werte: {}, fehler: e?.message || "Messdaten nicht verfügbar." };
  }
}

/**
 * Kennzahlen je Monat. Ist-Erzeugung vorrangig aus geprüften Monatswerten des geeichten Erzeugungszählers
 * (Register 2.8.0), sonst Monitoring (gekennzeichnet). Ausfallenergie aus den Tickets (erfasster Ertragsausfall).
 */
export async function kennzahlenMonate(n, anlageId, { monate: liste = null, anzahl = 12, betrieb = null } = {}) {
  const a = await anlagenBackend().anlage(n, anlageId);
  const b = betrieb || (await betriebBackend().betriebAnlage(n, anlageId));
  const jetzt = new Date();
  const monate = liste || Array.from({ length: anzahl }, (_, i) => monatKey(Date.UTC(jetzt.getUTCFullYear(), jetzt.getUTCMonth() - (anzahl - 1 - i), 1)));
  const [zaehler, mon] = await Promise.all([anlagenBackend().zaehlerMonatswerte(n, anlageId).catch(() => []), monitoringMonate(a, monate)]);
  const erzeugungMp = new Set((a.messpunkte || []).filter((m) => m.abrechnungsrelevant && m.art === "erzeugung").map((m) => m.id));
  const ausfall = ausfallJeMonat(b.tickets || []);
  const zeilen = monate.map((m) => {
    const z = zaehler.find((x) => x.monat === m && erzeugungMp.has(x.messpunktId) && x.register === "2.8.0" && x.menge !== null && x.menge !== undefined);
    const monitoring = mon.werte[m]?.erzeugungKwh ?? null;
    const ist = z ? Number(z.menge) : monitoring;
    const soll = prognoseMonatKwh(a, Number(m.slice(5)) - 1, Number(m.slice(0, 4)));
    const e = (b.einstrahlung || []).find((x) => x.monat === m);
    const laufend = m >= monatKey(Date.now()); // laufender bzw. künftiger Monat: noch kein Soll-Ist-Vergleich
    return { monat: m, laufend, istQuelle: z ? (z.geprueft ? "zaehler_geprueft" : "zaehler") : monitoring !== null ? "monitoring" : null, einstrahlungQuelle: e?.quelle || "", einstrahlungKwhM2: e?.kwhM2 ?? null, ...kennzahlen({ kwp: a.kwp, istKwh: ist, sollKwh: laufend ? null : soll, einstrahlungKwhM2: e?.kwhM2 ?? null, ausfallKwh: ausfall[m] || 0 }), sollMonatKwh: soll };
  });
  const voll = zeilen.filter((z) => !z.laufend && z.istKwh !== null);
  const summe = (k) => voll.reduce((s, z) => s + (Number(z[k]) || 0), 0);
  const mitH = voll.filter((z) => z.einstrahlungKwhM2 > 0);
  const gesamt = kennzahlen({ kwp: a.kwp, istKwh: summe("istKwh"), sollKwh: voll.reduce((s, z) => s + z.sollMonatKwh, 0), ausfallKwh: summe("ausfallKwh") });
  gesamt.pr = mitH.length ? mitH.reduce((s, z) => s + z.istKwh, 0) / (Number(a.kwp) * mitH.reduce((s, z) => s + z.einstrahlungKwhM2, 0)) : null;
  gesamt.prMonate = mitH.length;
  return { anlage: a, zeilen, gesamt, messfehler: mon.fehler };
}

/** Plausibilisierung aller Zählerstand-Monatswerte der abrechnungsrelevanten Messpunkte (letzte 13 Monate) */
export async function plausibilisierung(n, anlageId) {
  const a = await anlagenBackend().anlage(n, anlageId);
  const zeilen = await anlagenBackend().zaehlerMonatswerte(n, anlageId);
  const monate = [...new Set(zeilen.map((z) => z.monat))].sort();
  const mon = await monitoringMonate(a, monate);
  const mps = Object.fromEntries((a.messpunkte || []).map((m) => [m.id, m]));
  return {
    messfehler: mon.fehler,
    zeilen: zeilen.map((z) => {
      const mp = mps[z.messpunktId] || {};
      const feld = mp.art === "erzeugung" ? "erzeugungKwh" : mp.art === "zweirichtung" ? (z.register === "1.8.0" ? "netzbezugKwh" : "einspeisungKwh") : null;
      const monitoringKwh = feld ? mon.werte[z.monat]?.[feld] ?? null : null;
      const istErzeugung = mp.art === "erzeugung" && z.register === "2.8.0";
      const sollKwh = istErzeugung ? prognoseMonatKwh(a, Number(z.monat.slice(5)) - 1, Number(z.monat.slice(0, 4))) : null;
      const befund = plausibilisieren({ monat: z.monat, menge: z.menge, monitoringKwh, sollKwh, eichgueltigBis: mp.eichgueltigBis || "", istErzeugung });
      return { ...z, eichgueltigBis: mp.eichgueltigBis || "", monitoringKwh, sollKwh, befund };
    }),
  };
}

/** Daten für den Monats- bzw. Jahresbericht einer Anlage (zeitraum: JJJJ-MM | JJJJ) */
export async function berichtDaten(n, anlageId, zeitraum) {
  const z = berichtZeitraum(zeitraum);
  const b = betriebBackend();
  const basis = await b.betriebBerichtDaten(n, anlageId, { von: z.von, bis: z.bisVoll });
  const betriebAnlage = await b.betriebAnlage(n, anlageId);
  const k = await kennzahlenMonate(n, anlageId, { monate: z.monate, betrieb: { tickets: basis.tickets, einstrahlung: basis.einstrahlung || betriebAnlage.einstrahlung } });
  let summen = null;
  try {
    summen = await messdaten().summen(k.anlage, { von: Date.parse(z.von), bis: Math.min(Date.parse(z.bis), Date.now()) });
  } catch {
    summen = null;
  }
  const ausfall = basis.tickets.reduce((s, t) => ({ kwh: s.kwh + (t.ertragsausfall?.ausfallKwh || 0), eur: s.eur + (t.ertragsausfall?.ausfallEur || 0) }), { kwh: 0, eur: 0 });
  return { zeitraum: z, ...basis, kennzahlen: k, summen, quoten: summen ? quoten(summen) : null, ausfall, stand: new Date().toISOString() };
}
