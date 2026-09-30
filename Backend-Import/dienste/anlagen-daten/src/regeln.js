// Störungsregeln (reine Funktionen, Tests: test/regeln.test.mjs). Ergebnis sind Befunde, die ingest.js an Frappe
// meldet (anlagen.dienst_stoerung). Frappe fasst offene Störungen derselben Regel an derselben Anlage zusammen und
// benachrichtigt Kunde und Betrieb – `schluessel` verhindert, dass dasselbe Ereignis nach „behoben“ erneut aufgeht.
//
//  offline         Anlage in Betrieb, letzte Nachricht aller Geräte älter als offlineMinuten        (Schwere hoch)
//  fehlercode      Messwert mit fehlercode oder wechselrichter_status „stoerung“                    (hoch)
//  minderleistung  Spezifische Leistung (kW/kWp) < Quote × Median vergleichbarer Anlagen der Region,
//                  nur wenn die Sonne scheint (Median ≥ sonneMinAnteil) und ≥ 3 Vergleichsanlagen    (mittel)
//  zaehler_*       aus plausibel.js                                                                  (mittel)

export const SCHWERE = { offline: "hoch", fehlercode: "hoch", minderleistung: "mittel", zaehler_rueckwaerts: "mittel", zaehler_sprung: "mittel" };
export const TITEL = {
  offline: "Keine Daten (offline)",
  fehlercode: "Fehlercode am Wechselrichter",
  minderleistung: "Leistung deutlich unter Erwartung",
  zaehler_rueckwaerts: "Zählerstand rückwärts",
  zaehler_sprung: "Unplausibler Zählersprung",
};

const tag = (ms) => new Date(ms).toISOString().slice(0, 10);

export function befund(regel, anlageId, geraetId, text, schluesselTeil) {
  return { anlageId, geraetId: geraetId || null, regel, schwere: SCHWERE[regel] || "mittel", titel: TITEL[regel] || regel, text: String(text || "").slice(0, 500), schluessel: `${anlageId}|${regel}|${schluesselTeil}` };
}

/**
 * Offline: anlagen = [{ id, status }], letzte = Map(anlageId → { ts (ISO der letzten Nachricht irgendeines Geräts), statusOffline? })
 */
export function offlinePruefen(anlagen, letzte, { jetzt = Date.now(), offlineMinuten = 15 } = {}) {
  const erg = [];
  for (const a of anlagen) {
    if (a.status !== "betrieb" || !a.geraete) continue; // nur Anlagen mit mindestens einem verbundenen Gerät
    const l = letzte.get(a.id);
    if (!l?.ts) continue; // noch nie gesendet → Assistent zeigt „Warte auf erste Nachricht“, keine Störung
    const alterMin = (jetzt - Date.parse(l.ts)) / 60000;
    if (alterMin > offlineMinuten || l.statusOffline) {
      erg.push(befund("offline", a.id, null, `Seit ${Math.round(alterMin)} Minuten keine Nachricht${l.statusOffline ? " (Last Will „offline“ empfangen)" : ""}.`, l.ts.slice(0, 13)));
    }
  }
  return erg;
}

/** Fehlercode aus einem einzelnen Messwert */
export function fehlercodePruefen(anlageId, geraetId, wert) {
  if (!wert?.fehlercode && wert?.wechselrichterStatus !== "stoerung") return null;
  const code = wert.fehlercode || "Status „stoerung“ ohne Code";
  return befund("fehlercode", anlageId, geraetId, code, `${tag(Date.parse(wert.ts))}|${code}`);
}

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/**
 * Minderleistung im Regionsvergleich.
 * werte = [{ anlageId, regionId, kwp, pvKw, ts }] – aktuelle PV-Leistung je Anlage (frisch, ≤ 10 min alt)
 */
export function minderleistungPruefen(werte, { jetzt = Date.now(), quote = 0.6, sonneMinAnteil = 0.2, minVergleich = 3 } = {}) {
  const frisch = werte.filter((w) => w.kwp > 0 && Number.isFinite(w.pvKw) && jetzt - Date.parse(w.ts) < 10 * 60e3);
  const jeRegion = new Map();
  for (const w of frisch) jeRegion.set(w.regionId, [...(jeRegion.get(w.regionId) || []), w]);
  const erg = [];
  for (const liste of jeRegion.values()) {
    if (liste.length < minVergleich + 1) continue;
    for (const w of liste) {
      const andere = liste.filter((x) => x.anlageId !== w.anlageId).map((x) => x.pvKw / x.kwp);
      const m = median(andere);
      if (m < sonneMinAnteil) continue; // keine Sonne → keine Aussage
      const spez = w.pvKw / w.kwp;
      if (spez < quote * m) {
        erg.push(befund("minderleistung", w.anlageId, null, `Spezifische Leistung ${(spez * 100).toFixed(0)} % der Nennleistung, Vergleichsanlagen der Region im Median ${(m * 100).toFixed(0)} %.`, tag(jetzt)));
      }
    }
  }
  return erg;
}
