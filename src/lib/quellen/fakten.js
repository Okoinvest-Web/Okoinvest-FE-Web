// src/lib/quellen/fakten.js – Fakten-Suche /quellen (Welle 4, Paket FAKTEN)
//
// Stufe 1 des Fakten-Assistenten (Masterplan: GEO/KI-Suche – Faktenregister → /quellen),
// ausdrücklich OHNE KI: reine Aufbereitung des Faktenregisters (src/lib/fakten) für die
// durchsuchbare Seite /quellen, die Export-Routen /quellen/fakten.csv und /quellen/fakten.json
// und die Tests. Keine eigene Fachlogik, keine neuen Werte – jede Zahl kommt unverändert aus
// dem Register, mit Quelle, Abrufdatum, Prüfer, Klasse und Gültigkeit.
//
//  - quellenEintraege(): ein Eintrag je Fakt (id + land), Entwürfe ausgeschlossen
//    (schema.js: „entwurf = nicht freigegeben, wird nie verwendet“). Mehrere zeitliche
//    Versionen desselben Fakts (gueltigAb) werden zu EINEM Eintrag mit Versionsliste.
//  - Abgelaufene Werte: istAbgelaufen()/anzeigeStatus() aus schema.js (dieselbe Logik wie
//    pruefen.js, Masterplan H7: nie als aktuell zeigen) → Feld `abgelaufen` + HINWEIS_ABGELAUFEN.
//  - Anker: stabile URL je Fakt (#fakt-<land>-<id>) für Zitate durch KI-Suchmaschinen und Presse.
//  - Export: CSV und JSON unter CC BY 4.0 (Lizenzgeber ÖkoInvest GmbH für die Zusammenstellung;
//    jede Zeile nennt ihre Primärquelle).
//
// Reine Funktionen ohne I/O und ohne React – nutzbar in Server-Seite, Client-Baustein,
// Route-Handlern und node:test.

import { HINWEIS_ABGELAUFEN, KLASSEN, alleFakten, anzeigeStatus, istAbgelaufen, isoHeute, pruefeFakten } from "@/lib/fakten";

/** Lizenz der Zusammenstellung (Export): Namensnennung „ÖkoInvest GmbH – Faktenregister“. */
export const LIZENZ = Object.freeze({
  name: "CC BY 4.0",
  url: "https://creativecommons.org/licenses/by/4.0/",
  namensnennung: "ÖkoInvest GmbH – Faktenregister, www.oekoinvest.com/quellen",
});

// Such- und Themen-Helfer (auch für den Client-Baustein, ohne Register-Import): ./filter.js
export { THEMEN, filtere, themaName, themaVon, trifft } from "./filter.js";
import { themaVon } from "./filter.js";

/**
 * Stabiler Anker eines Fakts: #fakt-<land klein>-<id> (id unverändert, Punkte erlaubt).
 * NIE ändern – die Anker sind zitierfähige URLs (#fakt-de-pacht.freiflaecheProHa).
 */
export const ankerFuer = (id, land) => `fakt-${String(land || "").toLowerCase()}-${id}`;

const zahl = (n) => (Number.isFinite(n) ? n.toLocaleString("de-DE", { maximumFractionDigits: 4 }) : String(n));

/**
 * Wert eines Fakts als Text (deutsch, wie im Register – auch in der englischen Oberfläche):
 * Zahlen mit deutschem Tausenderpunkt, Spannen { min, mittel?, max } als „min bis max“,
 * Wahrheitswerte als ja/nein, Tabellen (Arrays) und sonstige Objekte als kompaktes JSON.
 */
export function wertText(wert) {
  if (wert === null || wert === undefined) return "– (Wert offen)";
  if (typeof wert === "number") return zahl(wert);
  if (typeof wert === "boolean") return wert ? "ja" : "nein";
  if (typeof wert === "string") return wert;
  if (Array.isArray(wert)) return `Tabelle mit ${wert.length} Einträgen`;
  if (typeof wert === "object") {
    const { min, mittel, max } = wert;
    if (Number.isFinite(min) && Number.isFinite(max)) {
      return `${zahl(min)} bis ${zahl(max)}${Number.isFinite(mittel) ? ` (Mittel ${zahl(mittel)})` : ""}`;
    }
    return JSON.stringify(wert);
  }
  return String(wert);
}

/** Versionen eines Fakts: aktuelle = spätestes gueltigAb ≤ Stichtag, sonst die früheste. */
function aktuelleVersion(versionen, tag) {
  const inKraft = versionen.filter((f) => !f.gueltigAb || f.gueltigAb <= tag);
  const sortiert = (inKraft.length ? inKraft : versionen).slice().sort((a, b) => String(a.gueltigAb || "").localeCompare(String(b.gueltigAb || "")));
  return inKraft.length ? sortiert[sortiert.length - 1] : sortiert[0];
}

const alsVersion = (f, heute) => ({
  wert: f.wert ?? null,
  wertText: wertText(f.wert),
  gueltigAb: f.gueltigAb ?? null,
  gueltigBis: f.gueltigBis ?? null,
  status: anzeigeStatus(f, heute),
  abruf: f.abruf,
});

/**
 * Einträge der Fakten-Suche: ein Eintrag je Fakt (id + land), ohne Entwürfe,
 * sortiert nach Thema, id, Land. Nur einfache Daten (JSON-fähig) – die Server-Seite
 * reicht das Ergebnis unverändert an den Client-Baustein weiter.
 *
 * @param {{ heute?: Date|string, liste?: object[] }} [optionen] liste = Fakten (Standard: alleFakten())
 */
export function quellenEintraege({ heute = new Date(), liste = alleFakten() } = {}) {
  const tag = isoHeute(heute);
  const gruppen = new Map();
  for (const f of liste) {
    if (!f || f.status === "entwurf") continue;
    const k = `${f.id}|${f.land}`;
    if (!gruppen.has(k)) gruppen.set(k, []);
    gruppen.get(k).push(f);
  }
  const eintraege = [];
  for (const versionen of gruppen.values()) {
    const f = aktuelleVersion(versionen, tag);
    const abgelaufen = istAbgelaufen(f, tag);
    const thema = themaVon(f.id);
    eintraege.push({
      anker: ankerFuer(f.id, f.land),
      id: f.id,
      land: f.land,
      thema,
      klasse: f.klasse,
      klasseText: KLASSEN[f.klasse] || f.klasse,
      status: anzeigeStatus(f, tag),
      abgelaufen,
      hinweis: abgelaufen ? HINWEIS_ABGELAUFEN : null,
      wert: f.wert ?? null,
      wertText: wertText(f.wert),
      einheit: f.einheit,
      quelleTitel: f.quelle?.titel || "",
      quelleUrl: f.quelle?.url || null,
      quelleArt: f.quelle?.art || (f.quelle?.url ? "primaer" : "eigen"),
      abruf: f.abruf,
      gueltigAb: f.gueltigAb ?? null,
      gueltigBis: f.gueltigBis ?? null,
      pruefer: f.pruefer,
      notiz: f.notiz || "",
      herkunft: f.herkunft || "",
      weitereVersionen: versionen
        .filter((v) => v !== f)
        .sort((a, b) => String(a.gueltigAb || "").localeCompare(String(b.gueltigAb || "")))
        .map((v) => alsVersion(v, tag)),
    });
  }
  return eintraege.sort((a, b) => a.thema.localeCompare(b.thema, "de") || a.id.localeCompare(b.id, "de") || a.land.localeCompare(b.land, "de"));
}

/** Zusammenfassung für den Seitenkopf – dieselbe Gate-Logik wie qa/fakten-check.mjs (pruefen.js). */
export function quellenZusammenfassung({ heute = new Date(), liste = alleFakten() } = {}) {
  const ohneEntwuerfe = liste.filter((f) => f?.status !== "entwurf");
  const p = pruefeFakten(ohneEntwuerfe, { heute });
  const abruf = ohneEntwuerfe.map((f) => f?.abruf || "").filter(Boolean).sort();
  return {
    stichtag: p.stichtag,
    urteil: p.urteil,
    fakten: p.zusammenfassung.fakten,
    geprueft: p.zusammenfassung.jeStatus?.geprueft || 0,
    zuPruefen: p.zusammenfassung.zuPruefen,
    abgelaufen: p.zusammenfassung.abgelaufenKlasseA + p.zusammenfassung.abgelaufenKlasseBC,
    jeLand: p.zusammenfassung.jeLand,
    jeKlasse: p.zusammenfassung.jeKlasse,
    letzterAbruf: abruf[abruf.length - 1] || null,
  };
}

// ---------------------------------------------------------------------------
// Export CSV / JSON (CC BY 4.0)
// ---------------------------------------------------------------------------

const CSV_SPALTEN = ["id", "land", "thema", "wert", "einheit", "klasse", "status", "gueltig_ab", "gueltig_bis", "quelle_titel", "quelle_url", "quelle_art", "abruf", "pruefer", "notiz", "anker", "lizenz"];

const csvFeld = (v) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** CSV-Export (Semikolon, UTF-8, RFC-4180-Anführung): eine Zeile je Eintrag. */
export function alsCsv(eintraege) {
  const zeilen = [CSV_SPALTEN.join(";")];
  for (const e of eintraege) {
    const wert = typeof e.wert === "object" && e.wert !== null ? JSON.stringify(e.wert) : e.wert ?? "";
    zeilen.push(
      [e.id, e.land, e.thema, wert, e.einheit, e.klasse, e.status, e.gueltigAb ?? "", e.gueltigBis ?? "", e.quelleTitel, e.quelleUrl ?? "", e.quelleArt, e.abruf, e.pruefer, e.notiz, `#${e.anker}`, `${LIZENZ.name} (${LIZENZ.url}) – ${LIZENZ.namensnennung}`]
        .map(csvFeld)
        .join(";")
    );
  }
  return `${zeilen.join("\r\n")}\r\n`;
}

/** JSON-Export mit Lizenz- und Stand-Angaben. */
export function alsJsonExport(eintraege, { heute = new Date(), basis = "https://www.oekoinvest.com" } = {}) {
  return {
    name: "ÖkoInvest Faktenregister",
    beschreibung: "Markt- und Rechtswerte zu Photovoltaik in Deutschland, Österreich und der Schweiz – je Wert mit Quelle, Abrufdatum, Prüfstand und Gültigkeit. Entwürfe sind nicht enthalten.",
    stand: isoHeute(heute),
    lizenz: { ...LIZENZ },
    hinweis: "Orientierungswerte, kein Angebot und keine Rechts- oder Anlageberatung. Maßgeblich ist die je Eintrag verlinkte Quelle in ihrer aktuellen Fassung. Status „Prüfung ausstehend“ heißt: noch nicht am Original nachgeprüft.",
    seite: `${basis}/quellen`,
    anzahl: eintraege.length,
    fakten: eintraege.map((e) => ({ ...e, url: `${basis}/quellen#${e.anker}` })),
  };
}

/** Dataset-Schema (JSON-LD) für /quellen – Ausgabe über <JsonLd /> (escaped). */
export function datasetSchema({ heute = new Date(), basis = "https://www.oekoinvest.com", anzahl = 0 } = {}) {
  return {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: "ÖkoInvest Faktenregister – Photovoltaik DACH",
    description: `Durchsuchbares Faktenregister mit ${anzahl} Markt- und Rechtswerten zu Photovoltaik in Deutschland, Österreich und der Schweiz – je Wert mit Primärquelle, Abrufdatum, Prüfstand, Qualitätsklasse und Gültigkeit. Jeder Fakt hat eine stabile Zitier-URL (Anker).`,
    url: `${basis}/quellen`,
    inLanguage: "de",
    dateModified: isoHeute(heute),
    license: LIZENZ.url,
    creditText: LIZENZ.namensnennung,
    isAccessibleForFree: true,
    creator: { "@type": "Organization", name: "ÖkoInvest GmbH", url: basis },
    spatialCoverage: ["Deutschland", "Österreich", "Schweiz"],
    distribution: [
      { "@type": "DataDownload", encodingFormat: "text/csv", contentUrl: `${basis}/quellen/fakten.csv` },
      { "@type": "DataDownload", encodingFormat: "application/json", contentUrl: `${basis}/quellen/fakten.json` },
    ],
  };
}
