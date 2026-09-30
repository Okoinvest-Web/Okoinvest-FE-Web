// src/lib/plattform/geodaten/dienst.js
//
// Client des Geodaten-Dienstes (Backend-Import/dienste/geodaten, FastAPI). Nur serverseitig: GEODATEN_URL und
// GEODATEN_TOKEN (= DIENST_TOKEN des Dienstes) verlassen nie den Server. Timeout, ein Wiederholungsversuch bei
// Netzfehlern/5xx, Konto-ID als X-Plattform-Nutzer für das Zugriffsprotokoll des Dienstes.

import { PlattformFehler } from "../fehler";

const TIMEOUT_MS = 20000;

export const dienstKonfiguriert = () => !!(process.env.GEODATEN_URL && process.env.GEODATEN_TOKEN);

async function abruf(pfad, { methode = "GET", body, nutzer } = {}) {
  const basis = String(process.env.GEODATEN_URL || "").replace(/\/$/, "");
  let letzter;
  for (let versuch = 1; versuch <= 2; versuch++) {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(basis + pfad, {
        method: methode,
        headers: { Authorization: `Bearer ${process.env.GEODATEN_TOKEN}`, Accept: "application/json", ...(body ? { "Content-Type": "application/json" } : {}), ...(nutzer?.id ? { "X-Plattform-Nutzer": nutzer.id } : {}) },
        body: body ? JSON.stringify(body) : undefined,
        cache: "no-store",
        signal: ac.signal,
      });
      if (res.status === 404) return null;
      if (res.status >= 500 && versuch < 2) {
        letzter = new Error(`Dienst ${res.status}`);
        continue;
      }
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new PlattformFehler(res.status === 401 ? 502 : res.status, res.status === 401 ? "Geodaten-Dienst: Zugang abgelehnt (Token prüfen)." : `Geodaten-Dienst: ${j.detail || res.status}`);
      }
      return await res.json();
    } catch (e) {
      if (e instanceof PlattformFehler) throw e;
      letzter = e;
    } finally {
      clearTimeout(t);
    }
  }
  console.error("[geodaten] Dienst nicht erreichbar:", letzter?.message);
  throw new PlattformFehler(503, "Der Geodaten-Dienst ist gerade nicht erreichbar. Bitte später erneut versuchen.");
}

const qs = (o) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(o)) if (v !== undefined && v !== null && v !== "" && v !== 0 && v !== false) p.set(k, Array.isArray(v) ? v.join(",") : String(v));
  const s = p.toString();
  return s ? `?${s}` : "";
};

export async function uebersicht({ nutzer } = {}) {
  const [q, u] = await Promise.all([abruf("/v1/quellen", { nutzer }), abruf("/v1/uebersicht", { nutzer })]);
  const basemap = q?.basemap ? [{ id: "basemap", titel: q.basemap.titel, lizenz: q.basemap.lizenz, attribution: q.basemap.attribution, url: q.basemap.url, stand: null }] : [];
  return {
    modus: "dienst",
    version: u?.version,
    quellen: [...(q?.quellen || []), ...basemap],
    kennzahlen: u?.kennzahlen || { kandidaten: 0, ha: 0, mwp: 0, gruen: 0, prioA: 0 },
    gebiete: u?.gebiete || { bundeslaender: [], bezirke: [], gemeinden: [] },
    start: { mitte: [13.19, 48.17], zoom: 9 },
    // Sprungziele der Karte (A1b) – je Land, sofern im Dienst Kandidaten vorhanden sind
    regionen: [
      { id: "at", land: "AT", label: "Österreich", mitte: [13.3, 47.7], zoom: 8 },
      { id: "de", land: "DE", label: "Deutschland (Süd)", mitte: [10.6, 48.3], zoom: 8 },
      { id: "ch", land: "CH", label: "Schweiz", mitte: [8.2, 46.9], zoom: 8 },
    ].filter((r) => !u?.gebiete?.laender || u.gebiete.laender.some((x) => x.name === r.land)),
  };
}

export const kandidaten = (filter = {}, { nutzer } = {}) => abruf(`/v1/kandidaten${qs({ ...filter, bbox: filter.bbox?.join(",") })}`, { nutzer });
export const kandidat = async (id, { nutzer } = {}) => (await abruf(`/v1/kandidaten/${encodeURIComponent(id)}`, { nutzer }))?.kandidat || null;
export async function umkreis(knotenId, km, { nutzer } = {}) {
  const r = await abruf(`/v1/umkreis${qs({ knoten: knotenId, km })}`, { nutzer });
  return r ? { knotenId, km, ...r } : null;
}
export const netzknoten = ({ bbox, arten } = {}, { nutzer } = {}) => abruf(`/v1/netzknoten${qs({ bbox: bbox?.join(","), arten })}`, { nutzer });
export const ebene = (name, { bbox } = {}, { nutzer } = {}) => abruf(`/v1/ebenen/${encodeURIComponent(name)}${qs({ bbox: bbox?.join(",") })}`, { nutzer });
export const suche = (q, { nutzer } = {}) => abruf(`/v1/suche${qs({ q })}`, { nutzer });
export const kapazitaetMelden = (knotenId, daten, { nutzer } = {}) => abruf(`/v1/netzkapazitaet/${encodeURIComponent(knotenId)}`, { methode: "PUT", body: { ...daten, gepflegtVon: nutzer?.id || "" }, nutzer });
