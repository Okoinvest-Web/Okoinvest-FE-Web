// src/lib/plattform/messdaten/auswertung.js
//
// Stammdaten (Backend) + Messdaten (Dienst/Simulator) → Anzeige-Objekte für Portal und APIs. Nur serverseitig.
// Reihenfolge IMMER: erst über das Backend die Anlagen holen, die der Nutzer sehen darf (Rolle + Eigentum),
// dann Messdaten nur für genau diese Anlagen abfragen.
//
// Demo (Simulator): Die Störungsregeln des Ingest-Dienstes (offline, Fehlercode, Minderleistung) werden beim
// Abruf nachgebildet und über backend.stoerungSystem() als Störungsfall angelegt (mit Benachrichtigung).
// Im Betrieb erkennt der Ingest-Dienst Störungen selbst und meldet sie an Frappe.

import { anlagenBackend } from "../backend/anlagen";
import { messdaten, messdatenQuelle } from "./index";
import { CO2_KG_PRO_KWH, GRENZWERTE, STOERUNG_OFFEN, ampelBerechnen, quoten, vertragKosten } from "../anlagen";

const NULL = () => ({ erzeugungKwh: 0, verbrauchKwh: 0, netzbezugKwh: 0, einspeisungKwh: 0, eigenverbrauchKwh: 0, ladenKwh: 0, entladenKwh: 0 });
const addieren = (a, b) => {
  const r = { ...a };
  for (const k of Object.keys(r)) r[k] += Number(b?.[k]) || 0;
  return r;
};

/** Nachgebildete Regeln des Ingest-Dienstes (nur Simulator-Betrieb). Liefert true, wenn eine neue Störung entstand. */
async function regelnNachbilden(b, a, live, erwartetKw) {
  if (messdatenQuelle() !== "simulator" || a.status !== "betrieb" || a.simulation?.keineDaten) return false;
  const tag = new Date().toISOString().slice(0, 10);
  const befunde = [];
  const alterMin = live?.ts ? (Date.now() - new Date(live.ts).getTime()) / 60000 : null;
  if (alterMin != null && alterMin > GRENZWERTE.offlineMinuten) {
    befunde.push({ regel: "offline", titel: "Keine Daten (offline)", text: `Seit über ${GRENZWERTE.offlineMinuten} Minuten keine Nachricht vom Datenlogger.`, schluessel: `${a.id}|offline|${String(live.ts).slice(0, 13)}` });
  } else if (live?.fehlercode) {
    befunde.push({ regel: "fehlercode", titel: "Fehlercode am Wechselrichter", text: String(live.fehlercode), schluessel: `${a.id}|fehlercode|${tag}|${live.fehlercode}` });
  } else if (erwartetKw != null && a.kwp > 0 && erwartetKw >= a.kwp * GRENZWERTE.sonneMinAnteil && Number(live?.pvKw) < erwartetKw * GRENZWERTE.minderleistungQuote) {
    befunde.push({ regel: "minderleistung", titel: "Leistung deutlich unter Erwartung", text: `Ist ${Math.round(live.pvKw)} kW, erwartet rund ${Math.round(erwartetKw)} kW bei Sonne.`, schluessel: `${a.id}|minderleistung|${tag}` });
  }
  let neu = false;
  for (const bf of befunde) {
    const r = await b.stoerungSystem({ anlageId: a.id, ...bf }).catch(() => null);
    if (r?.neu) neu = true;
  }
  return neu;
}

function anreichern(a, daten, md) {
  const live = daten?.aktuell || null;
  const erwartetKw = live?.erwartetKw ?? (md.erwartungKw ? md.erwartungKw(a) : null);
  const ampel = ampelBerechnen({ anlage: a, live, stoerungen: a.offeneStoerungen || [], erwartetKw });
  const heute = daten?.heute || null;
  return {
    ...a,
    live,
    heute,
    monat: daten?.monat || null,
    jahr: daten?.jahr || null,
    erwartetKw,
    ampel,
    veraltet: live?.ts ? (Date.now() - new Date(live.ts).getTime()) / 1000 > GRENZWERTE.veraltetSekunden : true,
    quotenHeute: heute ? quoten(heute) : null,
  };
}

/**
 * Übersicht: sichtbare Anlagen mit Live-Wert, Summen heute/Monat/Jahr, Ampel und Gesamtsummen.
 * Messdaten-Fehler (Dienst nicht erreichbar) lassen die Stammdaten stehen: `messfehler` enthält den Hinweis.
 */
export async function anlagenMitStatus(n, filter = {}) {
  const b = anlagenBackend();
  let liste = await b.anlagen(n, filter);
  let md = null;
  let daten = {};
  let messfehler = null;
  try {
    md = messdaten();
    daten = await md.uebersicht(liste);
  } catch (e) {
    messfehler = e?.message || "Messdaten nicht verfügbar.";
  }
  if (md && !messfehler) {
    let neu = false;
    for (const a of liste) neu = (await regelnNachbilden(b, a, daten[a.id]?.aktuell, daten[a.id]?.aktuell?.erwartetKw ?? null)) || neu;
    if (neu) liste = await b.anlagen(n, filter);
  }
  const anlagen = liste.map((a) => anreichern(a, daten[a.id], md || {}));
  const summe = { heute: NULL(), monat: NULL(), jahr: NULL(), leistungKw: 0, verbrauchKw: 0, kwp: 0, speicherKwh: 0 };
  const ampeln = { laeuft: 0, warnung: 0, stoerung: 0, offline: 0 };
  for (const a of anlagen) {
    ampeln[a.ampel.id]++;
    summe.kwp += Number(a.kwp) || 0;
    summe.speicherKwh += Number(a.speicherKwh) || 0;
    if (a.heute) summe.heute = addieren(summe.heute, a.heute);
    if (a.monat) summe.monat = addieren(summe.monat, a.monat);
    if (a.jahr) summe.jahr = addieren(summe.jahr, a.jahr);
    if (a.live && !a.veraltet) {
      summe.leistungKw += Number(a.live.pvKw) || 0;
      summe.verbrauchKw += Number(a.live.verbrauchKw) || 0;
    }
  }
  return {
    anlagen,
    summe: {
      ...summe,
      quotenHeute: quoten(summe.heute),
      quotenJahr: quoten(summe.jahr),
      co2JahrKg: summe.jahr.erzeugungKwh * CO2_KG_PRO_KWH,
      co2MonatKg: summe.monat.erzeugungKwh * CO2_KG_PRO_KWH,
    },
    ampeln,
    quelle: messdatenQuelle(),
    messfehler,
    stand: new Date().toISOString(),
  };
}

/** Detail einer Anlage (Rechte über backend.anlage) mit Live-Wert, Summen, Ampel und Kosten aus dem Vertrag */
export async function anlageMitStatus(n, id) {
  const b = anlagenBackend();
  let a = await b.anlage(n, id); // 403/404 bei fremden Anlagen – vor jeder Messdaten-Abfrage
  let md = null;
  let daten = null;
  let messfehler = null;
  try {
    md = messdaten();
    daten = (await md.uebersicht([a]))[a.id] || null;
  } catch (e) {
    messfehler = e?.message || "Messdaten nicht verfügbar.";
  }
  if (md && daten && (await regelnNachbilden(b, a, daten.aktuell, daten.aktuell?.erwartetKw ?? null))) a = await b.anlage(n, id);
  a = { ...a, offeneStoerungen: (a.stoerungen || []).filter((s) => STOERUNG_OFFEN.includes(s.status)) };
  const r = anreichern(a, daten, md || {});
  const jetzt = new Date();
  const monateJahr = jetzt.getMonth() + jetzt.getDate() / 31;
  return {
    ...r,
    kosten: a.vertrag
      ? {
          monat: vertragKosten(a.vertrag, { eigenverbrauchKwh: r.monat?.eigenverbrauchKwh || 0, monate: 1 }),
          jahr: vertragKosten(a.vertrag, { eigenverbrauchKwh: r.jahr?.eigenverbrauchKwh || 0, monate: monateJahr }),
        }
      : null,
    quotenMonat: r.monat ? quoten(r.monat) : null,
    quotenJahr: r.jahr ? quoten(r.jahr) : null,
    co2JahrKg: (r.jahr?.erzeugungKwh || 0) * CO2_KG_PRO_KWH,
    quelle: messdatenQuelle(),
    messfehler,
  };
}
