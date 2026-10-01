// src/lib/plattform/backend/demo/eg-abrechnung-seed.js
//
// Demo-Daten WP4 (Abrechnung) – alles FIKTIV. Bezug auf die WP1-Demo über `seedSchluessel` („sonnenland“).
//  - Energiedaten kommen von WP3 (enPeriodenwerte, inkl. Aufteilung je Tarif und Zeitfenster). Nur wenn WP3 nicht
//    antwortet, erzeugt `ersatzwerte()` deterministische Monatswerte (Kennzeichen „Ersatzdaten (Demo)“), damit die
//    Abrechnung vorführbar bleibt – maßgeblich sind im Betrieb immer die Netzbetreiber-Werte (ElWG § 71).
//  - Seed: die drei letzten vollständigen Monate – ältester abgeschlossen und bezahlt, mittlerer versendet (teils
//    bezahlt, eine Rechnung überfällig), jüngster offen (Vorschau und Vier-Augen-Freigabe zum Ausprobieren).

import { tarifSegmente } from "../../eg/abrechnung.js";

export const EG_ABRECHNUNG_SEED_VERSION = 1;

/** Einstellungen der Demo-Gemeinschaft (Annahmen ausdrücklich als Demo gekennzeichnet) */
export const DEMO_EINSTELLUNGEN = {
  zahlungszielTage: 14,
  mitgliedsbeitragArt: "unecht",
  beitragMonat: 1,
  netzApCt: 4.8, // Demo-Annahme – Netznutzungs-AP Netz OÖ, NE 7 (zu bestätigen, bitte aus der Netzrechnung übernehmen)
  efbApCt: null,
  referenzLieferantCt: 14, // Demo-Annahme: typischer Energiepreis netto des Lieferanten
  referenzEinspeisungCt: 6.5, // Demo-Annahme: Marktpreis für Überschuss
  aufrechnung: true,
  gruppen: [{ id: "G-GEMEINDE", label: "Gemeindetarif (fremdüblich, Beschluss Demo)", mitgliedIds: [], mitgliedArten: ["gemeinde"], bezugspreisCt: 11.5, einspeisepreisCt: 8.5, grund: "Fremdüblicher Preis (Beihilferecht) – Dokumentation (Demo)" }],
  rabatte: [],
  gutschriftverfahren: {},
  toleranzPct: 0.5,
  toleranzKwh: 0.1,
  mahnwesen: null,
};

const MONATSERTRAG = [28, 48, 82, 110, 128, 135, 140, 122, 92, 62, 32, 22]; // kWh je kWp und Monat (Innviertel, Demo-Profil)
const VERBRAUCH = { privat: 290, landwirt: 520, kmu: 1100, gemeinde: 950, verein: 400, oeffentlich: 700, grossunternehmen: 5000 };
const hash = (s) => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const tageIm = (von, bis) => Math.round((Date.parse(`${bis}T12:00:00Z`) - Date.parse(`${von}T12:00:00Z`)) / 864e5) + 1;

/**
 * Ersatzwerte (nur wenn WP3 nicht verfügbar): je Teilnahme Monatsmengen, dynamische Aufteilung, Zeitfenster-Anteil.
 * Rückgabe im Format von eg/abrechnung.js (werte[]).
 */
export function ersatzwerte({ g, x, von, bis }) {
  const tarife = x.tarife.filter((t) => t.gemeinschaftId === g.id);
  const tns = x.teilnahmen.filter((t) => t.gemeinschaftId === g.id && ["aktiv", "abmeldung_angefragt", "beendet"].includes(t.status) && t.gueltigAb && t.gueltigAb <= bis && (!t.gueltigBis || t.gueltigBis >= von));
  const zp = new Map(x.zaehlpunkte.map((z) => [z.id, z]));
  const mg = new Map(x.mitglieder.map((m) => [m.id, m]));
  const an = new Map(x.anlagen.map((a) => [a.id, a]));
  const aus = [];
  for (const s of tarifSegmente(tarife, von, bis)) {
    const tarif = tarife.find((t) => t.id === s.tarifId);
    const monat = Number(s.von.slice(5, 7));
    const anteil = tageIm(s.von, s.bis) / 30.4;
    const zfAktiv = (tarif?.zeitfenster || []).filter((z) => !z.monate.length || z.monate.includes(monat));
    const zfAnteil = zfAktiv.length ? 0.58 : 0;
    const verbr = [];
    const erz = [];
    for (const t of tns) {
      const z = zp.get(t.zaehlpunktId);
      if (!z || z.qhAktiv === false) continue;
      const f = 0.85 + (hash(z.id) % 30) / 100;
      if (z.richtung === "verbrauch") verbr.push({ t, z, v: (VERBRAUCH[mg.get(t.mitgliedId)?.art] || 300) * f * anteil * (t.teilnahmefaktor / 100) * (monat >= 5 && monat <= 8 ? 0.85 : 1.1) });
      else erz.push({ t, z, e: (an.get(z.anlageId)?.kwp || 10) * MONATSERTRAG[monat - 1] * f * anteil * 0.55 * (t.teilnahmefaktor / 100) });
    }
    const summeV = verbr.reduce((a, b) => a + b.v, 0);
    const summeE = erz.reduce((a, b) => a + b.e, 0);
    const geteilt = Math.min(summeE, summeV * 0.42);
    const r3 = (y) => Math.round(y * 1000) / 1000;
    for (const { t, z, v } of verbr) {
      const ed = summeV ? (geteilt * v) / summeV : 0;
      const zf = zfAktiv.length ? { "": { eigendeckung: r3(ed * (1 - zfAnteil)), verbrauch_gemessen: r3(v * 0.8) }, [zfAktiv[0].id]: { eigendeckung: r3(ed * zfAnteil), verbrauch_gemessen: r3(v * 0.2) } } : null;
      aus.push({ teilnahmeId: t.id, zaehlpunktId: z.id, von: s.von, bis: s.bis, tarifId: s.tarifId, groessen: { verbrauch_gemessen: r3(v / (t.teilnahmefaktor / 100)), verbrauch_tf: r3(v), eigendeckung: zf ? r3(zf[""].eigendeckung + zf[zfAktiv[0].id].eigendeckung) : r3(ed) }, ...(zf ? { jeZeitfenster: zf } : {}), vollstaendig: true, anteilL3: 0, ersatz: true });
    }
    for (const { t, z, e } of erz) {
      const eingebracht = summeE ? (geteilt * e) / summeE : 0;
      const rest = e - eingebracht;
      const zf = zfAktiv.length ? { "": { erzeugung_tf: r3(e * 0.4), restueberschuss: r3(rest * 0.4) }, [zfAktiv[0].id]: { erzeugung_tf: r3(e * 0.6), restueberschuss: r3(rest * 0.6) } } : null;
      aus.push({ teilnahmeId: t.id, zaehlpunktId: z.id, von: s.von, bis: s.bis, tarifId: s.tarifId, groessen: { erzeugung_gemessen: r3(e / (t.teilnahmefaktor / 100)), erzeugung_tf: zf ? r3(zf[""].erzeugung_tf + zf[zfAktiv[0].id].erzeugung_tf) : r3(e), restueberschuss: zf ? r3(zf[""].restueberschuss + zf[zfAktiv[0].id].restueberschuss) : r3(rest) }, ...(zf ? { jeZeitfenster: zf } : {}), vollstaendig: true, anteilL3: 0, ersatz: true });
    }
  }
  return aus;
}

/**
 * Ausgabe von WP3 enPeriodenwerte in werte[] umsetzen: je Zählpunkt und Tarif ein Eintrag mit Aufteilung je Zeitfenster.
 */
export function werteAusWp3(antwort, { tarife = [], von, bis }) {
  const segmente = tarifSegmente(tarife, von, bis);
  const aus = [];
  for (const z of antwort?.zaehlpunkte || []) {
    if (!z.teilnahmeId) continue;
    const jeTarif = z.groessenJeTarif || {};
    const ids = Object.keys(jeTarif);
    if (!ids.length) {
      aus.push({ teilnahmeId: z.teilnahmeId, zaehlpunktId: z.zaehlpunktId, von, bis, groessen: z.groessen || {}, jeZeitfenster: z.groessenJeZeitfenster || null, vollstaendig: z.vollstaendig !== false, anteilL3: Number(z.anteilL3) || 0 });
      continue;
    }
    for (const tid of ids) {
      const seg = segmente.filter((s) => s.tarifId === tid);
      const fenster = jeTarif[tid] || {};
      const groessen = {};
      for (const w of Object.values(fenster)) for (const [gr, kwh] of Object.entries(w)) groessen[gr] = (groessen[gr] || 0) + (Number(kwh) || 0);
      aus.push({ teilnahmeId: z.teilnahmeId, zaehlpunktId: z.zaehlpunktId, von: seg[0]?.von || von, bis: seg[seg.length - 1]?.bis || bis, tarifId: tid, groessen, jeZeitfenster: fenster, vollstaendig: z.vollstaendig !== false, anteilL3: Number(z.anteilL3) || 0 });
    }
  }
  return aus;
}
