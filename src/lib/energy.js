// src/lib/energy.js
//
// Live-Daten zum Strommarkt (DE, AT, CH) – nur öffentliche, schlüsselfreie Quellen:
//   - Fraunhofer ISE Energy-Charts (CC BY 4.0): Day-Ahead-Preis je Gebotszone
//     (DE-LU in 15-Minuten-Auflösung, AT 15 Minuten, CH stündlich) und öffentliche
//     Nettostromerzeugung je Quelle und Land. https://api.energy-charts.info
//   - aWATTar (Fallback für die Preise): stündlicher Day-Ahead-Preis,
//     api.awattar.de (DE) bzw. api.awattar.at (AT). Für die Schweiz gibt es
//     keinen schlüsselfreien Fallback – fällt Energy-Charts aus, bleibt die
//     Preisreihe leer und die Seite zeigt ihren ehrlichen Fehlzustand.
//
// Alle Abrufe laufen serverseitig mit Next-Cache (revalidate), damit Besucher
// nie direkt die Drittanbieter treffen und die Seite schnell bleibt. Der Cache
// ist je Land getrennt, weil die Zone bzw. das Land in der URL steht.

const EC = "https://api.energy-charts.info";

// Gebotszone (Preis) und Land (Erzeugung) je Länderwahl. Parameter am 11.10.2026
// per Probeabruf an der API verifiziert: /price?bzn=AT (96 Viertelstundenwerte,
// EUR/MWh), /price?bzn=CH (24 Stundenwerte, EUR/MWh – die Schweizer Auktion
// notiert in Euro), /public_power?country=at bzw. =ch liefern u. a. Solar,
// Wind onshore, Load und Renewable share of load; CH zusätzlich Nuclear.
export const MARKT_ZONEN = {
  DE: { bzn: "DE-LU", country: "de", awattar: "https://api.awattar.de/v1/marketdata" },
  AT: { bzn: "AT", country: "at", awattar: "https://api.awattar.at/v1/marketdata" },
  CH: { bzn: "CH", country: "ch", awattar: null },
};

/** "DE" | "AT" | "CH" (alles andere, auch null = gemeinsame Seite, fällt auf DE zurück) */
export function marktLand(land) {
  const l = typeof land === "string" ? land.toUpperCase() : null;
  return MARKT_ZONEN[l] ? l : "DE";
}

// Umsatzsteuer & typische Netzentgelte/Umlagen – für die Einordnung
// "was kostet eine kWh mit dynamischem Tarif ungefähr". Bewusst als
// Orientierung gekennzeichnet. Deutsche Orientierungswerte: nur für DE
// verwenden, AT/CH ohne diese Einordnung (bzw. mit LandHinweis).
export const TARIF_ANNAHMEN = {
  aufschlagCt: 19.5, // Netzentgelt, Abgaben, Umlagen, Marge (netto, ct/kWh) – grobe Orientierung 2026
  mwst: 0.19,
  festpreisCt: 36, // durchschnittlicher Haushalts-Festpreis in ct/kWh brutto (Orientierung)
};

// Abrufschutz (Masterplan S0 Nr. 8): Ein hängender Drittanbieter darf Render-/ISR-Worker von
// Startseite, /energie-live und /api/energie/live nicht blockieren. Je Versuch höchstens
// TIMEOUT_MS, insgesamt VERSUCHE Versuche mit wachsender Pause; 4xx wird nicht wiederholt.
// Schlimmster Fall je Quelle: 2 × 6 s + 0,4 s ≈ 12,4 s, danach greift der Fallback des Aufrufers.
const TIMEOUT_MS = 6000;
const VERSUCHE = 2;
const PAUSE_MS = 400;

const warte = (ms) => new Promise((r) => setTimeout(r, ms));

async function holeJson(url, revalidate) {
  let letzterFehler;
  for (let versuch = 1; versuch <= VERSUCHE; versuch++) {
    try {
      const res = await fetch(url, {
        next: { revalidate },
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { Accept: "application/json", "User-Agent": "oekoinvest energy widget" },
      });
      if (res.ok) return await res.json();
      letzterFehler = new Error(`${url} -> ${res.status}`);
      // Client-Fehler (außer 408/429) ändern sich durch Wiederholen nicht
      if (res.status < 500 && res.status !== 408 && res.status !== 429) break;
    } catch (e) {
      letzterFehler = e?.name === "TimeoutError" ? new Error(`${url} -> Timeout nach ${TIMEOUT_MS} ms`) : e;
    }
    if (versuch < VERSUCHE) await warte(PAUSE_MS * versuch);
  }
  throw letzterFehler;
}

/** Tagesbeginn (lokal Europe/Berlin) als ISO-Datum YYYY-MM-DD */
function berlinDatum(offsetTage = 0) {
  const d = new Date(Date.now() + offsetTage * 86400000);
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin" }).format(d);
}

/**
 * Day-Ahead-Preise für heute (und morgen, falls schon veröffentlicht – ab ca. 13 Uhr)
 * für die Gebotszone des Landes ("DE" → DE-LU, "AT", "CH").
 * Rückgabe: { quelle, zone, aufloesungMin, punkte: [{ t: ms, eurMwh }] }
 */
export async function getSpotPrices(land = "DE") {
  const z = MARKT_ZONEN[marktLand(land)];
  try {
    const start = berlinDatum(0);
    const ende = berlinDatum(2);
    const j = await holeJson(`${EC}/price?bzn=${z.bzn}&start=${start}&end=${ende}`, 900);
    const punkte = (j.unix_seconds || [])
      .map((s, i) => ({ t: s * 1000, eurMwh: j.price?.[i] }))
      .filter((p) => typeof p.eurMwh === "number");
    if (punkte.length) {
      // Auflösung aus den Zeitstempeln: DE-LU/AT 15 Minuten, CH stündlich
      const aufloesungMin = punkte.length > 1 ? Math.max(1, Math.round((punkte[1].t - punkte[0].t) / 60000)) : 60;
      return { quelle: "Energy-Charts (Fraunhofer ISE)", zone: z.bzn, aufloesungMin, punkte };
    }
  } catch (e) {
    console.error(`energy-charts price ${z.bzn}:`, e.message);
  }
  if (z.awattar) {
    try {
      const j = await holeJson(z.awattar, 900);
      const punkte = (j.data || []).map((p) => ({ t: p.start_timestamp, eurMwh: p.marketprice }));
      return { quelle: "aWATTar", zone: z.bzn, aufloesungMin: 60, punkte };
    } catch (e) {
      console.error("awattar:", e.message);
    }
  }
  // Kein Fallback (CH) oder beide Quellen gestört: ehrlicher Leerzustand
  return { quelle: null, zone: z.bzn, aufloesungMin: 60, punkte: [] };
}

/**
 * Stromerzeugung nach Quelle (Energy-Charts public_power) ab gestern 0 Uhr bis jetzt
 * für das Land ("DE" | "AT" | "CH"). Gestern ist mit dabei, damit Diagramme auch kurz
 * nach Mitternacht einen vollständigen 24-Stunden-Verlauf zeigen können. Die
 * Kennzahlen im Snapshot nutzen weiterhin den jüngsten Wert (idx).
 */
export async function getGeneration(land = "DE") {
  const z = MARKT_ZONEN[marktLand(land)];
  try {
    const j = await holeJson(`${EC}/public_power?country=${z.country}&start=${berlinDatum(-1)}&end=${berlinDatum(1)}`, 900);
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
      kernkraft: reihe("Nuclear"), // nur CH (DE/AT liefern die Reihe nicht)
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
    return { quelle: "Energy-Charts (Fraunhofer ISE)", land: marktLand(land), zeiten, serien, idx };
  } catch (e) {
    console.error(`energy-charts power ${z.country}:`, e.message);
    return { quelle: null, land: marktLand(land), zeiten: [], serien: {}, idx: -1 };
  }
}

/** Kompakte Live-Zusammenfassung für Ticker, Widgets und Dashboard – je Land. */
export async function getEnergySnapshot(land = "DE") {
  const l = marktLand(land);
  const [preise, erzeugung] = await Promise.all([getSpotPrices(l), getGeneration(l)]);
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
    land: l,
    preis: {
      quelle: preise.quelle,
      zone: preise.zone,
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

/** Grobe Brutto-Endkundenkosten bei dynamischem Tarif in ct/kWh (deutsche Orientierungswerte, nur DE). */
export const dynamischBrutto = (eurMwh) => (ctKwh(eurMwh) + TARIF_ANNAHMEN.aufschlagCt) * (1 + TARIF_ANNAHMEN.mwst);
