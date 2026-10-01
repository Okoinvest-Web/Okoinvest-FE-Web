// src/lib/plattform/eg/empfehlung.js
//
// WP6 „Portale“ – „Grüne Stunden“ und Teilnahmefaktor-Vorschlag für das Mitglied (Fachkonzept 4.8, 4.9). Die Prognose und
// den Optimierer rechnet WP3 (enPrognose, enOptimierung); hier wird deren Ergebnis nur für die Anzeige vereinheitlicht.
// Ohne Prognose: typische Sonnenfenster je Monat (als „typisch“ gekennzeichnet, keine Vorhersage).
// Reine Funktionen. Python-Spiegel (typische Fenster, Zeitformat): plattform/eg_portal_kern.py.

const hhmm = (v) => {
  const s = String(v ?? "").trim();
  if (!s) return "";
  const m = /(\d{1,2}):(\d{2})/.exec(s);
  if (m) return `${m[1].padStart(2, "0")}:${m[2]}`;
  const h = Number(s);
  return Number.isInteger(h) && h >= 0 && h <= 24 ? `${String(h).padStart(2, "0")}:00` : "";
};
const tag = (v) => String(v || "").slice(0, 10);

/** Typische Fenster mit viel PV-Erzeugung je Monat (1–12) – eigene Näherung aus Monatsprofilen (PVGIS-typisch) */
export const TYPISCHE_FENSTER = {
  sommer: { monate: [4, 5, 6, 7, 8, 9], von: "10:30", bis: "15:30", staerke: "hoch" },
  uebergang: { monate: [3, 10], von: "11:00", bis: "14:30", staerke: "mittel" },
  winter: { monate: [11, 12, 1, 2], von: "11:30", bis: "13:30", staerke: "gering" },
};

export function typischesFenster(datum) {
  const m = Number(tag(datum).slice(5, 7)) || 6;
  const f = Object.values(TYPISCHE_FENSTER).find((x) => x.monate.includes(m)) || TYPISCHE_FENSTER.sommer;
  return { von: f.von, bis: f.bis, staerke: f.staerke };
}

/** Zusammenhängende Stunden mit Überschuss zu Fenstern verbinden */
function ausStunden(liste) {
  const h = liste
    .map((x) => ({ s: x.stunde ?? x.h ?? (hhmm(x.beginn ?? x.von) ? Number(hhmm(x.beginn ?? x.von).slice(0, 2)) : null), w: Number(x.ueberschussKwh ?? x.ueberschuss ?? x.wert ?? x.kwh ?? (x.e !== undefined && x.e !== null ? Number(x.e) - (Number(x.v) || 0) : 0)) }))
    .filter((x) => Number.isInteger(x.s) && x.w > 0)
    .sort((a, b) => a.s - b.s);
  const max = Math.max(0, ...h.map((x) => x.w));
  const aus = [];
  for (const x of h) {
    const letzt = aus[aus.length - 1];
    if (letzt && letzt.bisH === x.s) { letzt.bisH = x.s + 1; letzt.summe += x.w; }
    else aus.push({ vonH: x.s, bisH: x.s + 1, summe: x.w });
  }
  return aus.map((f) => ({ von: `${String(f.vonH).padStart(2, "0")}:00`, bis: `${String(f.bisH).padStart(2, "0")}:00`, staerke: max && f.summe / (f.bisH - f.vonH) >= max * 0.6 ? "hoch" : "mittel" }));
}

/**
 * Grüne Stunden aus der WP3-Prognose (tolerant gegenüber der Form) oder typische Fenster.
 * @returns {{quelle:"prognose"|"typisch", tage:{datum:string, fenster:{von:string,bis:string,staerke:string}[]}[]}}
 */
export function grueneStunden(prognose, { heute = "" } = {}) {
  const tage = [];
  const p = prognose && typeof prognose === "object" ? prognose : null;
  const roh = p ? (Array.isArray(p) ? p : p.tage || p.gruen || p.grueneStunden || p.stunden || p.fenster || null) : null;
  if (Array.isArray(roh) && roh.length) {
    const istTag = roh.some((x) => x && (Array.isArray(x.fenster) || Array.isArray(x.gruenFenster) || Array.isArray(x.stunden)));
    if (istTag) {
      for (const t of roh) {
        const liste = Array.isArray(t.fenster) ? t.fenster : Array.isArray(t.gruenFenster) && t.gruenFenster.length ? t.gruenFenster : null;
        const f = liste ? liste.map((x) => ({ von: hhmm(x.von ?? x.beginn), bis: hhmm(x.bis ?? x.ende), staerke: x.staerke || "hoch" })).filter((x) => x.von && x.bis) : ausStunden(t.stunden || []);
        const quote = Number(t.quote);
        if (f.length) tage.push({ datum: tag(t.datum || t.tag || heute), fenster: f, ...(Number.isFinite(quote) && t.quote !== null && t.quote !== undefined ? { quotePct: Math.round(quote * 1000) / 10 } : {}) });
      }
    } else if (roh.some((x) => x && (x.von || x.beginn) && (x.bis || x.ende))) {
      const nachTag = {};
      for (const x of roh) {
        const d = tag(x.datum || (String(x.beginn || x.von).length > 8 ? x.beginn || x.von : heute));
        (nachTag[d] ||= []).push({ von: hhmm(x.von ?? x.beginn), bis: hhmm(x.bis ?? x.ende), staerke: x.staerke || "hoch" });
      }
      for (const [d, f] of Object.entries(nachTag)) tage.push({ datum: d, fenster: f.filter((x) => x.von && x.bis) });
    } else {
      const f = ausStunden(roh);
      if (f.length) tage.push({ datum: tag(heute), fenster: f });
    }
  }
  if (tage.length) return { quelle: "prognose", tage: tage.sort((a, b) => a.datum.localeCompare(b.datum)).slice(0, 3) };
  return { quelle: "typisch", tage: [{ datum: tag(heute), fenster: [typischesFenster(heute)] }] };
}

export const fensterText = (f) => (f ? `${f.von.replace(":00", "")}–${f.bis.replace(":00", "")} Uhr` : "");

/** TF-Vorschlag des WP3-Optimierers vereinheitlichen → null, wenn nichts Verwertbares */
export function tfEmpfehlung(opt) {
  if (!opt || typeof opt !== "object") return null;
  const liste = opt.vorschlaege || opt.vorschlag || opt.aufteilung || opt.empfehlung || null;
  if (!Array.isArray(liste) || !liste.length) return null;
  const v = liste.map((x) => ({ gemeinschaftId: String(x.gemeinschaftId || ""), teilnahmeId: String(x.teilnahmeId || ""), label: String(x.label || ""), aktuellTf: x.aktuellTf === undefined || x.aktuellTf === null ? null : Math.round(Number(x.aktuellTf) || 0), teilnahmefaktor: Math.round(Number(x.empfohlenTf ?? x.teilnahmefaktor ?? x.tf) || 0) })).filter((x) => x.teilnahmefaktor >= 0 && (x.gemeinschaftId || x.teilnahmeId));
  if (!v.length) return null;
  const mehr = Number(opt.mehrwertEur ?? opt.verbesserungEur ?? opt.vorteilEur ?? opt.zusatzEur);
  return { vorschlaege: v, mehrwertEur: Number.isFinite(mehr) ? Math.round(mehr * 100) / 100 : null, text: String(opt.text || opt.begruendung || "") };
}
