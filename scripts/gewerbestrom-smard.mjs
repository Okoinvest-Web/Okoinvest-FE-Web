#!/usr/bin/env node
// scripts/gewerbestrom-smard.mjs – Börsenwerte für den Rechnungs-Check Gewerbestrom (Paket B5) aus SMARD ableiten
//
//   node scripts/gewerbestrom-smard.mjs [JJJJ-MM]   letzter Monat des 12-Monats-Fensters (Standard: Vormonat)
//
// Quelle: Bundesnetzagentur | SMARD.de, Großhandelspreis Day-Ahead Deutschland/Luxemburg (Filter 4169),
// Lizenz CC BY 4.0 – Nennung „Bundesnetzagentur | SMARD.de“ an jeder Darstellung.
// Abruf über die öffentliche Datenschnittstelle (https://www.smard.de/app/chart_data/…), nur lesend,
// einmal je Aktualisierung (Monatswerte + Stundenwerte des Fensters, etwa 55 Dateien). Kein Scraping.
//
// Ausgabe (stdout, JSON): { abruf, fenster, monate: [{ monat, eurMwh }], profil: [12][2][24] } –
//   monate  Monatsmittel laut SMARD-Monatsreihe (€/MWh, wie veröffentlicht)
//   profil  mittlerer Preis je Kalendermonat × Tagtyp (0 = Mo–Fr, 1 = Sa/So) × Stunde (Ortszeit), €/MWh,
//           aus der SMARD-Stundenreihe; Feiertage zählen als Werktag (Vereinfachung, dokumentiert).
// Die Werte trägt ein Mensch in src/lib/fakten/daten/gewerbestrom-de.js ein (Abrufdatum, Status, Prüfer).

const BASIS = "https://www.smard.de/app/chart_data/4169/DE";
const TZ = "Europe/Berlin";

async function json(url) {
  const res = await fetch(url, { headers: { Accept: "application/json", "User-Agent": "oekoinvest gewerbestrom-check (Registerpflege)" }, signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.json();
}

const teile = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", weekday: "short", hourCycle: "h23" });
function ortszeit(ms) {
  const p = Object.fromEntries(teile.formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return { jahr: Number(p.year), monat: Number(p.month), stunde: Number(p.hour), wochenende: p.weekday === "Sat" || p.weekday === "Sun" };
}

function fensterBis(arg) {
  if (arg && /^\d{4}-\d{2}$/.test(arg)) return arg;
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() - 1);
  return d.toISOString().slice(0, 7);
}

const bis = fensterBis(process.argv[2]);
const [bj, bm] = bis.split("-").map(Number);
const fenster = Array.from({ length: 12 }, (_, i) => {
  const m = bm - 11 + i;
  const j = bj + Math.floor((m - 1) / 12);
  const mm = ((((m - 1) % 12) + 12) % 12) + 1;
  return `${j}-${String(mm).padStart(2, "0")}`;
});
const imFenster = new Set(fenster);

// Monatsreihe
const monIdx = await json(`${BASIS}/index_month.json`);
const monate = new Map();
for (const ts of monIdx.timestamps) {
  const d = await json(`${BASIS}/4169_DE_month_${ts}.json`);
  for (const [t, v] of d.series) {
    const o = ortszeit(t);
    const k = `${o.jahr}-${String(o.monat).padStart(2, "0")}`;
    if (imFenster.has(k) && typeof v === "number") monate.set(k, v);
  }
}

// Stundenreihe: Wochendateien, die das Fenster berühren
const start = Date.parse(`${fenster[0]}-01T00:00:00Z`) - 8 * 86400000;
const ende = Date.parse(`${bis}-28T00:00:00Z`) + 8 * 86400000;
const stdIdx = await json(`${BASIS}/index_hour.json`);
const summe = Array.from({ length: 12 }, () => Array.from({ length: 2 }, () => Array(24).fill(0)));
const anzahl = Array.from({ length: 12 }, () => Array.from({ length: 2 }, () => Array(24).fill(0)));
for (const ts of stdIdx.timestamps.filter((t) => t >= start && t <= ende)) {
  const d = await json(`${BASIS}/4169_DE_hour_${ts}.json`);
  for (const [t, v] of d.series) {
    if (typeof v !== "number") continue;
    const o = ortszeit(t);
    const k = `${o.jahr}-${String(o.monat).padStart(2, "0")}`;
    if (!imFenster.has(k)) continue;
    const typ = o.wochenende ? 1 : 0;
    summe[o.monat - 1][typ][o.stunde] += v;
    anzahl[o.monat - 1][typ][o.stunde] += 1;
  }
}
const profil = summe.map((m, i) => m.map((tag, j) => tag.map((s, h) => (anzahl[i][j][h] ? Math.round((s / anzahl[i][j][h]) * 10) / 10 : null))));

const fehlend = fenster.filter((k) => !monate.has(k));
console.log(
  JSON.stringify(
    {
      abruf: new Date().toISOString().slice(0, 10),
      fenster: { von: fenster[0], bis },
      fehlendeMonate: fehlend,
      monate: fenster.filter((k) => monate.has(k)).map((k) => ({ monat: k, eurMwh: monate.get(k) })),
      profil,
    },
    null,
    0
  )
);
