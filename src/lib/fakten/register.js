// src/lib/fakten/register.js
//
// Faktenregister (Welle 2, Paket B1) – Zugriff auf alle Fakten (Vertrag: schema.js).
// Die Datenmodule unter daten/*.js werden NUR in index.js eingebunden; alle anderen
// Dateien greifen über index.js zu (Abnahme f: keine Importe aus daten/* außerhalb
// src/lib/fakten).
//
// Ein Datenmodul ist entweder ein Array von Fakten oder ein Objekt
//   { name, fakten: Fakt[], quellen?: { [gruppe]: { titel, url }[] } }.
// Zeitliche Versionen (z. B. Umlagen 2026 und 2027) sind derselbe id + land mit
// unterschiedlichem gueltigAb; fakt() wählt die am Stichtag geltende Version.

import { faktValidieren, isoHeute, LAENDER } from "./schema.js";

const normLand = (land) => {
  const l = String(land || "DE").toUpperCase();
  return LAENDER.includes(l) ? l : "DE";
};

const kopie = (v) => (v !== null && typeof v === "object" ? structuredClone(v) : v);

/**
 * Baut ein Register aus Datenmodulen (index.js nutzt es für die echten Daten,
 * Tests für eigene Testfakten).
 */
export function erstelleRegister(module = []) {
  const liste = [];
  const quellen = {};
  for (const m of module) {
    const name = Array.isArray(m) ? "(ohne Name)" : m?.name || "(ohne Name)";
    const fakten = Array.isArray(m) ? m : m?.fakten || [];
    for (const f of fakten) liste.push(Object.freeze({ ...f, herkunft: name }));
    if (!Array.isArray(m) && m?.quellen) {
      for (const [gruppe, eintraege] of Object.entries(m.quellen)) {
        const schluessel = `${m.land || "DACH"}:${gruppe}`;
        quellen[schluessel] = [...(quellen[schluessel] || []), ...eintraege];
      }
    }
  }

  /** Alle Versionen eines Fakts für genau dieses Land (ohne Entwürfe, außer mitEntwurf) */
  const versionen = (id, land, mitEntwurf) =>
    liste.filter((f) => f.id === id && f.land === land && (mitEntwurf || f.status !== "entwurf"));

  /** Am Stichtag geltende Version: spätestes gueltigAb ≤ Stichtag; sonst die früheste */
  const waehle = (kandidaten, stichtag) => {
    if (!kandidaten.length) return null;
    const tag = isoHeute(stichtag);
    const inKraft = kandidaten.filter((f) => !f.gueltigAb || f.gueltigAb <= tag);
    const sortiert = (inKraft.length ? inKraft : kandidaten).slice().sort((a, b) => String(a.gueltigAb || "").localeCompare(String(b.gueltigAb || "")));
    return inKraft.length ? sortiert[sortiert.length - 1] : sortiert[0];
  };

  /**
   * Ein Fakt für ein Land. Fehlt er für das Land, gilt ein DACH-Fakt derselben id.
   * @param {string} id
   * @param {"DE"|"AT"|"CH"|"DACH"} [land="DE"]
   * @param {{ stichtag?: Date|string, mitEntwurf?: boolean }} [optionen]
   * @returns {object|null} eingefrorenes Fakt-Objekt (wert ggf. tief kopieren: faktWert)
   */
  function fakt(id, land = "DE", { stichtag = new Date(), mitEntwurf = false } = {}) {
    const l = normLand(land);
    return waehle(versionen(id, l, mitEntwurf), stichtag) || (l !== "DACH" ? waehle(versionen(id, "DACH", mitEntwurf), stichtag) : null);
  }

  /** Nur der Wert (tiefe Kopie – Aufrufer dürfen ihn verändern, ohne das Register zu ändern); undefined, wenn es den Fakt nicht gibt */
  function faktWert(id, land = "DE", optionen) {
    const f = fakt(id, land, optionen);
    return f ? kopie(f.wert) : undefined;
  }

  /**
   * Gefilterte Liste. land: genau dieses Land plus DACH-Fakten (mitDach=false schaltet das ab);
   * klasse: "A"|"B"|"C"; praefix: id-Anfang (z. B. "pacht."); status: ein Status.
   */
  function fakten({ land, klasse, praefix, status, mitDach = true } = {}) {
    const l = land ? normLand(land) : null;
    return liste.filter(
      (f) =>
        (!l || f.land === l || (mitDach && l !== "DACH" && f.land === "DACH")) &&
        (!klasse || f.klasse === klasse) &&
        (!praefix || f.id.startsWith(praefix)) &&
        (!status || f.status === status)
    );
  }

  /** Alle Fakten aller Module */
  const alleFakten = () => liste.slice();

  /** Quellenverzeichnis einer Gruppe (z. B. "allgemein", "dach") für ein Land, als Kopie */
  const quellenListe = (land, gruppe = "allgemein") => kopie(quellen[`${normLand(land)}:${gruppe}`] || []);

  /** Vertragsprüfung aller Fakten plus Dubletten (id + land + gueltigAb) */
  function pruefen() {
    const fehler = [];
    const warnungen = [];
    const gesehen = new Map();
    for (const f of liste) {
      const v = faktValidieren(f);
      fehler.push(...v.fehler.map((t) => `[${f.herkunft}] ${t}`));
      warnungen.push(...v.warnungen.map((t) => `[${f.herkunft}] ${t}`));
      const k = `${f.id}|${f.land}|${f.gueltigAb || ""}`;
      if (gesehen.has(k)) fehler.push(`[${f.herkunft}] Dublette ${f.id} (${f.land}, gueltigAb ${f.gueltigAb || "–"}) – schon in ${gesehen.get(k)}`);
      else gesehen.set(k, f.herkunft);
    }
    return { ok: fehler.length === 0, fehler, warnungen, anzahl: liste.length };
  }

  return { fakt, faktWert, fakten, alleFakten, quellenListe, pruefen };
}
