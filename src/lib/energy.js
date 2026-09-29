// src/lib/energy.js
//
// Live-Daten zum deutschen Strommarkt – nur öffentliche, schlüsselfreie Quellen:
//   - Fraunhofer ISE Energy-Charts (CC BY 4.0): Day-Ahead-Preis DE-LU in
//     15-Minuten-Auflösung und öffentliche Nettostromerzeugung je Quelle.
//     https://api.energy-charts.info
//   - aWATTar (Fallback für die Preise): stündlicher Day-Ahead-Preis.
//
// Alle Abrufe laufen serverseitig mit Next-Cache (revalidate), damit Besucher
// nie direkt die Drittanbieter treffen und die Seite schnell bleibt.

const EC = "https://api.energy-charts.info";

// Umsatzsteuer & typische Netzentgelte/Umlagen – für die Einordnung
// "was kostet eine kWh mit dynamischem Tarif ungefähr". Bewusst als
// Orientierung gekennzeichnet.
export const TARIF_ANNAHMEN = {
  aufschlagCt: 19.5, // Netzentgelt, Abgaben, Umlagen, Marge (netto, ct/kWh) – grobe Orientierung 2026
  mwst: 0.19,
  festpreisCt: 36, // durchschnittlicher Haushalts-Festpreis in ct/kWh brutto (Orientierung)
};

async function holeJson(url, revalidate) {
  const res = await fetch(url, {
    next: { revalidate },
    headers: { Accept: "application/json", "User-Agent": "oekovolt.de energy widget" },
  });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.json();
}

/** Tagesbeginn (lokal Europe/Berlin) als ISO-Datum YYYY-MM-DD */
function berlinDatum(offsetTage = 0) {
  const d = new Date(Date.now() + offsetTage * 86400000);
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin" }).format(d);
}

/**
 * Day-Ahead-Preise für heute (und morgen, falls schon veröffentlicht – ab ca. 13 Uhr).
 * Rückgabe: [{ t: ms, eurMwh }]
 */
export async function getSpotPrices() {
  try {
    const start = berlinDatum(0);
    const ende = berlinDatum(2);
    const j = await holeJson(`${EC}/price?bzn=DE-LU&start=${start}&end=${ende}`, 900);
    const punkte = (j.unix_seconds || [])
      .map((s, i) => ({ t: s * 1000, eurMwh: j.price?.[i] }))
      .filter((p) => typeof p.eurMwh === "number");
    if (punkte.length) return { quelle: "Energy-Charts (Fraunhofer ISE)", aufloesungMin: 15, punkte };
  } catch (e) {
    console.error("energy-charts price:", e.message);
  }
  try {
    const j = await holeJson("https://api.awattar.de/v1/marketdata", 900);
    const punkte = (j.data || []).map((p) => ({ t: p.start_timestamp, eurMwh: p.marketprice }));
    return { quelle: "aWATTar", aufloesungMin: 60, punkte };
  } catch (e) {
    console.error("awattar:", e.message);
    return { quelle: null, aufloesungMin: 60, punkte: [] };
  }
}

/**
 * Stromerzeugung nach Quelle (Energy-Charts public_power) ab gestern 0 Uhr bis jetzt.
 * Gestern ist mit dabei, damit Diagramme auch kurz nach Mitternacht einen
 * vollständigen 24-Stunden-Verlauf zeigen können. Die Kennzahlen im Snapshot
 * nutzen weiterhin den jüngsten Wert (idx).
 */
export async function getGeneration() {
  try {
    const j = await holeJson(`${EC}/public_power?country=de&start=${berlinDatum(-1)}&end=${berlinDatum(1)}`, 900);
    const zeiten = (j.unix_seconds || []).map((s) => s * 1000);
    const reihe = (name) => j.production_types?.find((p) => p.name === name)?.data || [];
    const summe = (...namen) =>
      zeiten.map((_, i) => namen.reduce((acc, n) => acc + (Number(reihe(n)[i]) || 0), 0));

    const serien = {
      solar: reihe("Solar"),
      windOnshore: reihe("Wind onshore"),
      windOffshore: reihe("Wind offshore"),
      biomasse: reihe("Biomass"),
      wasser: summe("Hydro Run-of-River", "Hydro water reservoir"),
      braunkohle: reihe("Fossil brown coal / lignite"),
      steinkohle: reihe("Fossil hard coal"),
      gas: reihe("Fossil gas"),
      // Rest der öffentlichen Nettoerzeugung (Müll, Öl, Grubengas, Geothermie, Pumpspeicher, Sonstige)
      sonstige: summe("Waste", "Fossil oil", "Fossil coal-derived gas", "Geothermal", "Others", "Hydro pumped storage"),
      last: reihe("Load"),
      eeAnteil: reihe("Renewable share of load"),
    };

    // Letzter Zeitpunkt mit Solar- UND Lastwert
    let idx = -1;
    for (let i = zeiten.length - 1; i >= 0; i--) {
      if (serien.solar[i] != null && serien.last[i] != null) { idx = i; break; }
    }
    return { quelle: "Energy-Charts (Fraunhofer ISE)", zeiten, serien, idx };
  } catch (e) {
    console.error("energy-charts power:", e.message);
    return { quelle: null, zeiten: [], serien: {}, idx: -1 };
  }
}

/** Kompakte Live-Zusammenfassung für Ticker, Widgets und Dashboard. */
export async function getEnergySnapshot() {
  const [preise, erzeugung] = await Promise.all([getSpotPrices(), getGeneration()]);
  const jetzt = Date.now();
  const schritt = preise.aufloesungMin * 60000;

  const heuteStr = berlinDatum(0);
  const tagVon = (t) => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin" }).format(new Date(t));
  const heute = preise.punkte.filter((p) => tagVon(p.t) === heuteStr);
  const morgen = preise.punkte.filter((p) => tagVon(p.t) === berlinDatum(1));
  const aktuell = preise.punkte.find((p) => p.t <= jetzt && jetzt < p.t + schritt) || null;

  const stat = (arr) => {
    if (!arr.length) return null;
    const werte = arr.map((p) => p.eurMwh);
    const min = arr.reduce((a, b) => (b.eurMwh < a.eurMwh ? b : a));
    const max = arr.reduce((a, b) => (b.eurMwh > a.eurMwh ? b : a));
    return { avg: werte.reduce((a, b) => a + b, 0) / werte.length, min, max, negativ: werte.filter((w) => w < 0).length };
  };

  const { serien, idx, zeiten } = erzeugung;
  const wert = (s) => (idx >= 0 && serien[s] ? Number(serien[s][idx]) || 0 : null);
  const wind = idx >= 0 ? (wert("windOnshore") || 0) + (wert("windOffshore") || 0) : null;

  return {
    stand: new Date().toISOString(),
    preis: {
      quelle: preise.quelle,
      aufloesungMin: preise.aufloesungMin,
      aktuell,
      heute: stat(heute),
      morgen: stat(morgen),
      punkte: preise.punkte,
    },
    erzeugung: {
      quelle: erzeugung.quelle,
      zeitpunkt: idx >= 0 ? zeiten[idx] : null,
      solarMw: wert("solar"),
      windMw: wind,
      lastMw: wert("last"),
      eeAnteil: wert("eeAnteil"),
      solarAnteil: idx >= 0 && wert("last") ? (wert("solar") / wert("last")) * 100 : null,
      zeiten,
      serien,
    },
  };
}

/** €/MWh (Börse, netto) -> ct/kWh */
export const ctKwh = (eurMwh) => eurMwh / 10;

/** Grobe Brutto-Endkundenkosten bei dynamischem Tarif in ct/kWh. */
export const dynamischBrutto = (eurMwh) => (ctKwh(eurMwh) + TARIF_ANNAHMEN.aufschlagCt) * (1 + TARIF_ANNAHMEN.mwst);
