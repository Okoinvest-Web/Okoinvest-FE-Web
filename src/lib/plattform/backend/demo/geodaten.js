// src/lib/plattform/backend/demo/geodaten.js
//
// Geodaten & Akquise-Engine im Demo-Backend: Kandidatenfläche als Akquise-Ziel übernehmen (Flächenobjekt in der
// Akquise-Pipeline + Aufgabe „Eigentümer ermitteln (Grundbuchabfrage)“ + Ziel-Eintrag mit Geometrie/Score/UW-Bezug),
// Liste der Ziele und gepflegte Netzkapazitäten (Netzbetreiber-Angaben je Umspannwerk). Daten unter `db.geo`.
//
// Rechte: Backoffice-Bereich „geodaten“ (Unterrollen Leitung/Akquise) UND für die Übernahme „akquise“ schreiben.

import * as v from "../../validierung";
import { konflikt, nichtGefunden } from "../../fehler";
import { flurstueckePruefen } from "../../flaecheFach";
import { jetzt, neueId } from "./hilfen";
import { W, boAendern, boLesen, info, rechtNoetig, tagSetzen } from "./bo-kern";

function geoSicher(db) {
  db.geo = db.geo || { ziele: [], kapazitaeten: {} };
  db.geo.ziele = db.geo.ziele || [];
  db.geo.kapazitaeten = db.geo.kapazitaeten || {};
  return db.geo;
}

const plusTage = (tage) => new Date(Date.now() + tage * 86400e3).toISOString().slice(0, 10);

const NETZ_KATEGORIE = (km) => (km == null ? "unbekannt" : km < 1 ? "lt1" : km <= 3 ? "1-3" : km <= 5 ? "3-5" : km <= 10 ? "5-10" : "gt10");

function zielAusgabe(db, z) {
  const f = db.flaechen.find((x) => x.id === z.flaecheId);
  return { ...z, geometrie: undefined, flaeche: f ? { id: f.id, bezeichnung: f.bezeichnung, status: f.status } : null };
}

/** Übernommene Akquise-Ziele (ohne Geometrie) */
export async function akquiseZiele(n) {
  rechtNoetig(n, "geodaten", 1);
  const db = await boLesen();
  const g = db.geo || { ziele: [] };
  return { ziele: [...(g.ziele || [])].reverse().map((z) => zielAusgabe(db, z)) };
}

/**
 * Kandidatenfläche übernehmen. `kandidat` kommt serverseitig aus dem Geodaten-Adapter (nie vom Browser).
 * Liefert { ziel, flaecheId, aufgabeId }. Doppelte Übernahme desselben Kandidaten → 409.
 */
export async function akquiseZielUebernehmen(n, kandidat, { notiz = "" } = {}) {
  rechtNoetig(n, "geodaten", 2);
  rechtNoetig(n, "akquise", 2);
  if (!kandidat?.id) throw nichtGefunden("Kandidatenfläche nicht gefunden.");
  return boAendern((db) => {
    const geo = geoSicher(db);
    const alt = geo.ziele.find((z) => z.kandidatId === kandidat.id && z.status !== "verworfen");
    if (alt) throw konflikt(`Diese Fläche ist bereits als Akquise-Ziel übernommen (${alt.flaecheId}).`);
    const land = kandidat.land || "AT";
    const { flurstuecke } = flurstueckePruefen(
      (kandidat.parzellen || []).slice(0, 50).map((p) => ({ gemarkung: String(p.kg || "").replace(/^DEMO-KG\s*/, ""), gemarkungNr: p.kgNr, nummer: p.gstNr, m2: Math.round((Number(p.ha) || 0) * 10000) })),
      land
    );
    const trasseKm = kandidat.netz ? Math.round(kandidat.netz.trasseM / 100) / 10 : null;
    const kurz = [
      `Aus der Geodaten-Akquise übernommen (Kandidat ${kandidat.id}, Score ${kandidat.score}${kandidat.demo ? ", DEMO-Daten" : ""}).`,
      kandidat.netz ? `Netz: ${kandidat.netz.knoten.name || kandidat.netz.knoten.art}, geschätzte Trasse ${String(trasseKm).replace(".", ",")} km, Netzanschluss ≈ ${Math.round(kandidat.netz.kosten.min / 1000)}–${Math.round(kandidat.netz.kosten.max / 1000)} T€.` : "Netz: kein geeigneter Knoten im Suchradius.",
      `Widmung: ${kandidat.widmung?.text || "unklar"}`,
      "Eigentümer unbekannt – Grundbuchabfrage über Verrechnungsstelle (Aufgabe).",
      notiz ? `Notiz: ${v.mehrzeilig(notiz, 1000)}` : "",
    ].filter(Boolean).join("\n");
    const f = {
      id: neueId("F"),
      nutzerId: null, // noch kein Eigentümerkonto – Kontakt entsteht erst nach der Grundbuchabfrage (CRM)
      organisationId: null,
      vorgangId: null,
      bezeichnung: v.text(`Akquise-Ziel ${kandidat.gemeinde || ""} · ${String(kandidat.ha).replace(".", ",")} ha`, 120),
      land,
      bundesland: v.text(kandidat.bundesland, 60),
      plz: "",
      ort: v.text(kandidat.gemeinde, 80),
      gemarkung: v.text((kandidat.kg || [])[0]?.replace(/^DEMO-KG\s*/, "") || "", 80),
      flurstuecke,
      ha: Math.round(Number(kandidat.ha) * 100) / 100,
      nutzung: kandidat.merkmale?.hauptnutzung === "gruenland" ? "gruenland" : "acker",
      agri: false,
      eigentum: "eigentum",
      fach: {},
      hinweise: kurz,
      status: "entwurf",
      statusVerlauf: [{ status: "entwurf", am: jetzt(), vonId: n.id, vonRolle: "admin", kommentar: "Aus Geodaten-Akquise übernommen" }],
      pachtangebot: null,
      ablehnGrund: "",
      zustaendigId: n.id,
      herkunft: "geodaten",
      geodaten: { kandidatId: kandidat.id, score: kandidat.score, demo: !!kandidat.demo },
      erstelltAm: jetzt(),
      geaendertAm: jetzt(),
    };
    db.flaechen.push(f);
    const i = info(db, "flaeche", f.id, true);
    i.netz = NETZ_KATEGORIE(trasseKm);
    i.besonderheiten = (kandidat.merkmale?.schutz || []).some((s) => s.anteil > 0.05 || s.abstandM <= 200) ? ["schutzgebiet"] : [];
    if ((kandidat.merkmale?.neigungGrad || 0) > 7) i.besonderheiten.push("hang");
    i.prioritaet = kandidat.prioritaet || null;
    tagSetzen(db, "flaeche", f.id, "Geodaten");
    if (kandidat.demo) tagSetzen(db, "flaeche", f.id, "DEMO");

    db.aufgaben = db.aufgaben || [];
    const a = {
      id: neueId("AF"),
      titel: "Eigentümer ermitteln (Grundbuchabfrage)",
      beschreibung: [
        `Grundbuchauszug je Grundstück über die Verrechnungsstelle abfragen (Suche nach KG + Grundstücksnummer, nicht nach Person).`,
        `Grundstücke: ${flurstuecke.map((x) => `KG ${x.gemarkungNr || ""} Gst. ${x.nummer}`).join(", ") || "siehe Fläche"}.`,
        "Ergebnis als CRM-Kontakt anlegen (Herkunft „Grundbuch“), Erstkontakt nur per Brief mit Datenschutzinformation (Art. 14 DSGVO) und Widerspruchshinweis.",
      ].join("\n"),
      faelligAm: plusTage(5),
      zustaendigId: n.id,
      bezugArt: "flaeche",
      bezugId: f.id,
      status: "offen",
      erstelltVon: n.id,
      erstelltAm: jetzt(),
      erledigtAm: null,
      erledigtVon: null,
      erinnertAm: null,
    };
    db.aufgaben.push(a);

    const ziel = {
      id: neueId("AZ"),
      kandidatId: kandidat.id,
      flaecheId: f.id,
      aufgabeId: a.id,
      status: "offen",
      score: kandidat.score,
      ha: kandidat.ha,
      mwp: kandidat.mwp,
      bundesland: kandidat.bundesland,
      bezirk: kandidat.bezirk,
      gemeinde: kandidat.gemeinde,
      parzellen: (kandidat.parzellen || []).map((p) => ({ id: p.id, kgNr: p.kgNr, gstNr: p.gstNr, ha: p.ha })),
      umspannwerk: kandidat.netz ? { id: kandidat.netz.knoten.id, name: kandidat.netz.knoten.name, art: kandidat.netz.knoten.art, trasseM: kandidat.netz.trasseM, kostenMin: kandidat.netz.kosten.min, kostenMax: kandidat.netz.kosten.max } : null,
      geometrie: kandidat.geometrie, // GeoJSON (WGS84) – im Frappe-Betrieb als Text im DocType „Plattform Akquise Ziel“
      demo: !!kandidat.demo,
      von: n.id,
      am: jetzt(),
    };
    geo.ziele.push(ziel);
    W.protokoll(db, n, "anlegen", "flaeche", f.id, `Akquise-Ziel aus Geodaten übernommen (${kandidat.id}, Score ${kandidat.score}, ${kandidat.ha} ha) + Aufgabe „Eigentümer ermitteln“`);
    return { ziel: zielAusgabe(db, ziel), flaecheId: f.id, aufgabeId: a.id };
  });
}

/** Gepflegte Netzkapazitäten { knotenId: { kapazitaet, freiMw, quelle, stand, von, am } } */
export async function netzkapazitaeten(n) {
  rechtNoetig(n, "geodaten", 1);
  const db = await boLesen();
  return (db.geo && db.geo.kapazitaeten) || {};
}

export async function netzkapazitaetSetzen(n, knotenId, daten = {}) {
  rechtNoetig(n, "geodaten", 2);
  const id = v.text(knotenId, 80);
  v.pflicht(/^[\w.:-]{3,80}$/.test(id), "Ungültiger Netzknoten.");
  const kapazitaet = v.auswahl(daten.kapazitaet, ["frei", "knapp", "unbekannt"], "");
  v.pflicht(kapazitaet, "Kapazität: frei, knapp oder unbekannt.");
  const quelle = v.text(daten.quelle, 200);
  v.pflicht(quelle.length >= 3, "Bitte die Quelle angeben (z. B. Veröffentlichung des Netzbetreibers mit Datum oder Auskunft).");
  const freiMw = daten.freiMw === "" || daten.freiMw == null ? null : v.zahl(daten.freiMw, { min: 0, max: 5000, stellen: 1 });
  const stand = /^\d{4}-\d{2}-\d{2}$/.test(String(daten.stand || "")) ? daten.stand : new Date().toISOString().slice(0, 10);
  return boAendern((db) => {
    const geo = geoSicher(db);
    geo.kapazitaeten[id] = { kapazitaet, freiMw, quelle, stand, von: n.id, am: jetzt() };
    W.protokoll(db, n, "aendern", "netzknoten", id, `Netzkapazität ${kapazitaet}${freiMw != null ? ` (${freiMw} MW frei)` : ""} – Quelle: ${quelle}`);
    return { knotenId: id, ...geo.kapazitaeten[id] };
  });
}
