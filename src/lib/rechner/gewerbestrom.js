// src/lib/rechner/gewerbestrom.js – Rechnungs-Check Gewerbestrom Deutschland (Welle 3, Paket B5, Preisradar Schritt 1)
//
// Zerlegt den Strompreis einer Gewerberechnung in
//   amtlich     Umlagen (KWKG, Offshore, Aufschlag für besondere Netznutzung mit Staffel), Stromsteuer, Konzessionsabgabe (KAV)
//   Ihre Angabe Netzentgelt und Messstellenbetrieb (aus der Rechnung – Netzentgelte je Netzbetreiber folgen in Schritt 2)
//   berechnet   Energie & Vertrieb als Rest; Börsenwert Day-Ahead aus SMARD, gewichtet mit Lastprofil oder Lastgang
//   Schätzung   übliche Spanne des Lieferantenaufschlags über dem Börsenwert (Klasse C)
// und vergleicht den eigenen Energieanteil mit der Marktspanne. Ergebnis ehrlich – auch „marktgerecht“.
//
// Alle Werte netto (ohne Umsatzsteuer) aus dem Faktenregister (src/lib/fakten, Modul gewerbestrom-de.js).
// Nur Deutschland: AT (SNE-VO 2027) und CH folgen; die Seite zeigt dort einen Länderhinweis.
// Lastgang-Dateien wertet lastgangLesen()/lastgangAuswerten() aus – im Browser, es wird nichts hochgeladen.
//
// Relative Importe mit Dateiendung (node:test lädt das Modul ohne Bundler).

import { fakt, anzeigeStatus } from "../fakten/index.js";
import { META } from "../../data/regionen/meta.js";

/* ------------------------------------------------------------------ */
/* Auswahllisten                                                       */
/* ------------------------------------------------------------------ */

export const BUNDESLAENDER = Object.freeze(
  META.filter((r) => r.land === "DE")
    .map((r) => ({ id: r.slug, label: r.name, kurz: r.kurz }))
    .sort((a, b) => a.label.localeCompare(b.label, "de"))
);

export const PREISARTEN = Object.freeze([
  { id: "gesamt", label: "Gesamtpreis", text: "Arbeitspreis enthält Netzentgelt, Umlagen, Konzessionsabgabe und Stromsteuer" },
  { id: "energie", label: "Nur Energie", text: "Netzentgelt, Umlagen und Steuern stehen getrennt auf der Rechnung" },
]);

export const NETZ_MODI = Object.freeze([
  { id: "angegeben", label: "Aus meiner Rechnung" },
  { id: "unbekannt", label: "Weiß ich nicht" },
]);

export const SPANNUNGEN = Object.freeze([
  { id: "ns", label: "Niederspannung" },
  { id: "ms", label: "Mittelspannung oder höher" },
]);

export const KAV_GRUPPEN = Object.freeze([
  { id: "auto", label: "Automatisch" },
  { id: "sonder", label: "Sondervertrag" },
  { id: "tarif", label: "Tarifkunde" },
]);

/**
 * Lastprofile: Gewicht je Tagtyp (0 = Mo–Fr, 1 = Sa/So) und Stunde. Grundlast bleibt immer etwas
 * (Kühlung, IT, Beleuchtung). Nur zur Gewichtung des Börsenwerts – keine Aussage über den Verbrauch.
 */
const stunden = (von, bis, an, aus) => Array.from({ length: 24 }, (_, h) => (h >= von && h < bis ? an : aus));
export const LASTPROFILE = Object.freeze([
  { id: "base", label: "Gleichmäßig rund um die Uhr", form: [stunden(0, 24, 1, 1), stunden(0, 24, 1, 1)] },
  { id: "tag", label: "Tagbetrieb Mo–Fr (7–18 Uhr)", form: [stunden(7, 18, 1, 0.15), stunden(0, 24, 0.15, 0.15)] },
  { id: "zweischicht", label: "Zweischicht Mo–Fr (6–22 Uhr)", form: [stunden(6, 22, 1, 0.2), stunden(0, 24, 0.2, 0.2)] },
  { id: "dreischicht", label: "Dreischicht Mo–Fr, Wochenende reduziert", form: [stunden(0, 24, 1, 1), stunden(0, 24, 0.4, 0.4)] },
  { id: "handel", label: "Handel Mo–Sa (8–20 Uhr)", form: [stunden(8, 20, 1, 0.15), stunden(8, 20, 0.55, 0.15)] },
  { id: "lastgang", label: "Eigener Lastgang (Datei)", form: null },
]);

export const STUFEN = Object.freeze({
  amtlich: { label: "amtlich", text: "Wert aus Gesetz bzw. amtlicher Veröffentlichung" },
  berechnet: { label: "berechnet", text: "aus amtlichen bzw. offenen Daten und Ihren Angaben berechnet" },
  schaetzung: { label: "Schätzung", text: "eigene Einschätzung, Orientierung" },
  angabe: { label: "Ihre Angabe", text: "aus Ihrer Rechnung übernommen" },
});

/** Beispielwerte (im Formular als Beispiel gekennzeichnet). */
export const STANDARD = Object.freeze({
  verbrauchMwh: 250,
  leistungKw: 90,
  spannung: "ns",
  preisArt: "gesamt",
  arbeitspreisCt: 24.5,
  grundpreisEurMonat: 15,
  netzModus: "angegeben",
  netzCt: 6.5,
  netzFixEurJahr: 0,
  kav: "auto",
  gemeinde: "bis100",
  produzierend: false,
  gruppeC: false,
  lastprofil: "tag",
  profilFaktor: 1,
  bundesland: "bayern",
});

/* ------------------------------------------------------------------ */
/* Register-Zugriff                                                    */
/* ------------------------------------------------------------------ */

const STAND_UMLAGEN_JAHR = 2026;

/** Fakt mit Wert; fehlt der Wert im laufenden Jahr (2027 noch nicht veröffentlicht), gilt das Vorjahr mit Kennzeichen. */
function wertMitStand(id, heute) {
  const f = fakt(id, "DE", { stichtag: heute });
  if (f && f.wert !== null && f.wert !== undefined) return { wert: f.wert, fakt: f, status: anzeigeStatus(f, heute) };
  const alt = fakt(id, "DE", { stichtag: `${STAND_UMLAGEN_JAHR}-12-31` });
  if (!alt || alt.wert === null) throw new Error(`Faktenregister: ${id} fehlt`);
  return { wert: alt.wert, fakt: alt, status: anzeigeStatus(alt, heute), vorjahr: true };
}

const stand = (x) => ({ abruf: x.fakt.abruf, gueltigBis: x.fakt.gueltigBis ?? null, status: x.status, quelle: x.fakt.quelle, vorjahr: !!x.vorjahr });

/** Alle amtlichen und Börsen-Werte des Checks (für Rechnung, Annahmen und Preisradar). */
export function werte(heute = new Date()) {
  const w = (id) => wertMitStand(id, heute);
  const roh = {
    kwkg: w("umlage.kwkg"),
    offshore: w("umlage.offshoreNetz"),
    aufschlagA: w("umlage.besondereNetznutzung"),
    aufschlagB: w("umlage.besondereNetznutzung.ueber1Gwh"),
    aufschlagC: w("umlage.besondereNetznutzung.ueber1GwhProduzierend"),
    grenzeKwh: w("umlage.besondereNetznutzung.grenzeKwh"),
    stromsteuer: w("steuer.strom.regelsatz"),
    entlastung: w("steuer.strom.entlastung9b"),
    sockel: w("steuer.strom.entlastung9bSockel"),
    kavSonder: w("kav.sondervertrag"),
    kavTarif: w("kav.tarif"),
    kavGrenze: w("kav.tarifGrenze"),
    monate: w("boerse.dayAhead.monate"),
    profil: w("boerse.dayAhead.profil"),
    aufschlag: w("gewerbestrom.lieferantenaufschlag"),
    toleranz: w("gewerbestrom.toleranzUeberMarkt"),
  };
  return roh;
}

/* ------------------------------------------------------------------ */
/* Börse                                                               */
/* ------------------------------------------------------------------ */

const TAGE_IM_MONAT = (jahr, monat) => new Date(Date.UTC(jahr, monat, 0)).getUTCDate();

/** Werktage (Mo–Fr) und Wochenendtage eines Monats. */
export function tagtypen(jahr, monat) {
  let werk = 0;
  const n = TAGE_IM_MONAT(jahr, monat);
  for (let t = 1; t <= n; t++) {
    const wt = new Date(Date.UTC(jahr, monat - 1, t)).getUTCDay();
    if (wt >= 1 && wt <= 5) werk++;
  }
  return [werk, n - werk];
}

/** Börsenmittel (Base) der 12 Monate, nach Tagen gewichtet, in ct/kWh. */
export function boerseBase(monate) {
  let summe = 0;
  let tage = 0;
  for (const { monat, eurMwh } of monate) {
    const [j, m] = monat.split("-").map(Number);
    const n = TAGE_IM_MONAT(j, m);
    summe += eurMwh * n;
    tage += n;
  }
  return tage ? summe / tage / 10 : null;
}

/**
 * Profilfaktor: profilgewichteter Börsenpreis ÷ gleichmäßig gewichteter Börsenpreis, beide aus dem
 * Profil (Monat × Tagtyp × Stunde). gewicht(m, d, h) liefert die Last (Monat 0–11, Tagtyp 0|1, Stunde 0–23).
 */
export function profilFaktor(profil, monate, gewicht) {
  let gewichtet = 0;
  let last = 0;
  let flach = 0;
  let stundenSumme = 0;
  for (const { monat } of monate) {
    const [j, m] = monat.split("-").map(Number);
    const tage = tagtypen(j, m);
    for (let d = 0; d < 2; d++) {
      for (let h = 0; h < 24; h++) {
        const p = profil[m - 1]?.[d]?.[h];
        if (typeof p !== "number") continue;
        const g = Math.max(0, gewicht(m - 1, d, h)) * tage[d];
        gewichtet += g * p;
        last += g;
        flach += tage[d] * p;
        stundenSumme += tage[d];
      }
    }
  }
  if (!last || !stundenSumme || !flach) return 1;
  return gewichtet / last / (flach / stundenSumme);
}

/** Profilfaktor eines vordefinierten Lastprofils. */
export function profilFaktorFuer(lastprofilId, heute = new Date()) {
  const lp = LASTPROFILE.find((p) => p.id === lastprofilId);
  if (!lp?.form) return 1;
  const w = werte(heute);
  return profilFaktor(w.profil.wert, w.monate.wert, (_m, d, h) => lp.form[d][h]);
}

/* ------------------------------------------------------------------ */
/* Konzessionsabgabe                                                   */
/* ------------------------------------------------------------------ */

/** KAV-Gruppe nach § 2 Abs. 7 KAV (auto) oder wie gewählt. */
export function kavGruppe(e, grenze = { kw: 30, kwh: 30000 }) {
  if (e.kav === "sonder" || e.kav === "tarif") return { gruppe: e.kav, grund: "gewaehlt" };
  if (e.spannung === "ms") return { gruppe: "sonder", grund: "mittelspannung" };
  const kwh = e.verbrauchMwh * 1000;
  if (kwh <= grenze.kwh) return { gruppe: "tarif", grund: "verbrauch" };
  if (!(e.leistungKw > 0)) return { gruppe: "sonder", grund: "annahme" };
  return e.leistungKw > grenze.kw ? { gruppe: "sonder", grund: "leistung" } : { gruppe: "tarif", grund: "leistung" };
}

/* ------------------------------------------------------------------ */
/* Rechnung                                                            */
/* ------------------------------------------------------------------ */

const r2 = (x) => Math.round(x * 100) / 100;
const r3 = (x) => Math.round(x * 1000) / 1000;

function eingabenNormal(eingabe = {}) {
  const e = { ...STANDARD, ...eingabe };
  const zahl = (k, min, max) => {
    const v = Number(e[k]);
    if (!Number.isFinite(v)) throw new Error(`Eingabe ${k} ungültig`);
    return Math.min(max, Math.max(min, v));
  };
  e.verbrauchMwh = zahl("verbrauchMwh", 1, 200000);
  e.arbeitspreisCt = zahl("arbeitspreisCt", 0.5, 150);
  e.grundpreisEurMonat = zahl("grundpreisEurMonat", 0, 10000);
  e.netzCt = zahl("netzCt", 0, 50);
  e.netzFixEurJahr = zahl("netzFixEurJahr", 0, 5e6);
  e.leistungKw = zahl("leistungKw", 0, 100000);
  e.profilFaktor = zahl("profilFaktor", 0.5, 1.5);
  if (!PREISARTEN.some((x) => x.id === e.preisArt)) e.preisArt = STANDARD.preisArt;
  if (!NETZ_MODI.some((x) => x.id === e.netzModus)) e.netzModus = STANDARD.netzModus;
  if (!SPANNUNGEN.some((x) => x.id === e.spannung)) e.spannung = STANDARD.spannung;
  if (!KAV_GRUPPEN.some((x) => x.id === e.kav)) e.kav = STANDARD.kav;
  if (!LASTPROFILE.some((x) => x.id === e.lastprofil)) e.lastprofil = STANDARD.lastprofil;
  if (!BUNDESLAENDER.some((x) => x.id === e.bundesland)) e.bundesland = "";
  e.produzierend = e.produzierend === true;
  e.gruppeC = e.gruppeC === true && e.produzierend;
  return e;
}

export const URTEILE = Object.freeze({
  marktgerecht: { titel: "Ihr Vertrag ist marktgerecht", ton: "gut" },
  guenstig: { titel: "Ihr Energiepreis liegt unter der üblichen Spanne", ton: "gut" },
  etwas_ueber: { titel: "Etwas über der Marktspanne", ton: "pruefen" },
  deutlich_ueber: { titel: "Deutlich über der Marktspanne", ton: "kritisch" },
  offen: { titel: "Ohne Netzentgelt kein Urteil möglich", ton: "info" },
  pruefen: { titel: "Bitte Eingaben prüfen", ton: "info" },
});

/**
 * Rechnungs-Check.
 * @param {object} eingabe siehe STANDARD
 * @param {{ heute?: Date|string }} [optionen]
 */
export function gewerbestromCheck(eingabe = {}, { heute = new Date() } = {}) {
  const e = eingabenNormal(eingabe);
  const w = werte(heute);
  const kwh = e.verbrauchMwh * 1000;
  const grenze = w.grenzeKwh.wert;
  const ueber = Math.max(0, kwh - grenze);
  const bis = kwh - ueber;

  // amtlich
  const aufschlagB = e.gruppeC ? w.aufschlagC.wert : w.aufschlagB.wert;
  const kav = kavGruppe(e, w.kavGrenze.wert);
  const kavStufe = w.kavTarif.wert.find((s) => s.id === e.gemeinde) || w.kavTarif.wert[0];
  const kavCt = kav.gruppe === "sonder" ? w.kavSonder.wert : kavStufe.ct;
  const zeilen = [
    { id: "kwkg", label: "KWKG-Umlage", stufe: "amtlich", eur: (kwh * w.kwkg.wert) / 100, quelle: stand(w.kwkg) },
    { id: "offshore", label: "Offshore-Netzumlage", stufe: "amtlich", eur: (kwh * w.offshore.wert) / 100, quelle: stand(w.offshore) },
    {
      id: "aufschlag",
      label: "Aufschlag für besondere Netznutzung",
      stufe: "amtlich",
      eur: (bis * w.aufschlagA.wert + ueber * aufschlagB) / 100,
      detail: ueber > 0 ? { bisKwh: bis, ct: w.aufschlagA.wert, ueberKwh: ueber, ctUeber: aufschlagB, gruppe: e.gruppeC ? "C" : "B" } : null,
      quelle: stand(w.aufschlagA),
    },
    { id: "kav", label: "Konzessionsabgabe", stufe: "amtlich", eur: (kwh * kavCt) / 100, detail: { gruppe: kav.gruppe, grund: kav.grund, ct: kavCt, gemeinde: kav.gruppe === "tarif" ? kavStufe.id : null }, quelle: stand(kav.gruppe === "sonder" ? w.kavSonder : w.kavTarif) },
    { id: "stromsteuer", label: "Stromsteuer (Regelsatz)", stufe: "amtlich", eur: (kwh * w.stromsteuer.wert) / 100, quelle: stand(w.stromsteuer) },
  ];
  const amtlichEur = zeilen.reduce((s, z) => s + z.eur, 0);

  // Netz (Ihre Angabe)
  const netzBekannt = e.netzModus === "angegeben";
  const netzEur = netzBekannt ? (kwh * e.netzCt) / 100 + e.netzFixEurJahr : null;
  if (netzBekannt) zeilen.push({ id: "netz", label: "Netzentgelt und Messstellenbetrieb", stufe: "angabe", eur: netzEur });

  // Rechnung und Energieanteil
  const grundEur = e.grundpreisEurMonat * 12;
  let rechnungEur;
  let energieEur;
  if (e.preisArt === "gesamt") {
    // Leistungspreis, Netz-Grundpreis und Messstellenbetrieb (€/Jahr) stehen auch beim Gesamtpreis als eigene
    // Posten auf der Rechnung (ein Leistungspreis in €/kW kann nicht im Arbeitspreis stecken): sie kommen zur
    // Rechnung hinzu und mindern den Energieanteil nicht. Abgezogen wird nur der Netz-Arbeitspreis.
    rechnungEur = (kwh * e.arbeitspreisCt) / 100 + grundEur + (netzBekannt ? e.netzFixEurJahr : 0);
    energieEur = netzBekannt ? rechnungEur - amtlichEur - netzEur : null;
  } else {
    energieEur = (kwh * e.arbeitspreisCt) / 100 + grundEur;
    rechnungEur = netzBekannt ? energieEur + amtlichEur + netzEur : null;
  }
  const restOhneNetz = e.preisArt === "gesamt" && !netzBekannt ? rechnungEur - amtlichEur : null;
  zeilen.push(
    restOhneNetz !== null
      ? { id: "rest", label: "Energie, Vertrieb und Netzentgelt zusammen", stufe: "berechnet", eur: restOhneNetz }
      : { id: "energie", label: "Energie und Vertrieb (inkl. Grundpreis)", stufe: e.preisArt === "energie" ? "angabe" : "berechnet", eur: energieEur }
  );
  for (const z of zeilen) z.ct = z.eur === null ? null : (z.eur / kwh) * 100;

  // Börse und Marktspanne
  const base = boerseBase(w.monate.wert);
  const faktor = e.lastprofil === "lastgang" ? e.profilFaktor : profilFaktor(w.profil.wert, w.monate.wert, (_m, d, h) => LASTPROFILE.find((p) => p.id === e.lastprofil).form[d][h]);
  const boerseCt = base * faktor;
  const auf = w.aufschlag.wert;
  const spanne = { min: boerseCt + auf.min, mittel: boerseCt + auf.mittel, max: boerseCt + auf.max };
  const energieCt = energieEur === null ? null : (energieEur / kwh) * 100;

  // Urteil
  let urteil;
  if (energieCt === null) urteil = "offen";
  else if (energieCt <= 0) urteil = "pruefen";
  else if (energieCt < spanne.min) urteil = "guenstig";
  else if (energieCt <= spanne.max) urteil = "marktgerecht";
  else if (energieCt <= spanne.max + w.toleranz.wert) urteil = "etwas_ueber";
  else urteil = "deutlich_ueber";

  const differenz =
    energieCt !== null && energieCt > spanne.max
      ? { minEur: ((energieCt - spanne.max) * kwh) / 100, maxEur: ((energieCt - spanne.min) * kwh) / 100, mittelEur: ((energieCt - spanne.mittel) * kwh) / 100 }
      : null;

  // Stromsteuer-Entlastung (Hauptzollamt)
  const entlastungEur = e.produzierend ? Math.max(0, (kwh * w.entlastung.wert) / 100 - w.sockel.wert) : 0;

  const benutzungsstunden = e.leistungKw > 0 ? kwh / e.leistungKw : null;

  return {
    eingabe: e,
    land: "DE",
    kwh,
    zeilen: zeilen.map((z) => ({ ...z, eur: z.eur === null ? null : r2(z.eur), ct: z.ct === null ? null : r3(z.ct) })),
    amtlich: { eur: r2(amtlichEur), ct: r3((amtlichEur / kwh) * 100) },
    netz: netzBekannt ? { eur: r2(netzEur), ct: r3((netzEur / kwh) * 100) } : null,
    rechnung: rechnungEur === null ? null : { eur: r2(rechnungEur), ct: r3((rechnungEur / kwh) * 100) },
    energie: energieCt === null ? null : { eur: r2(energieEur), ct: r3(energieCt) },
    boerse: {
      baseCt: r3(base),
      faktor: Math.round(faktor * 1000) / 1000,
      ct: r3(boerseCt),
      monate: w.monate.wert,
      von: w.monate.wert[0]?.monat,
      bis: w.monate.wert[w.monate.wert.length - 1]?.monat,
      quelle: stand(w.monate),
    },
    spanne: { min: r3(spanne.min), mittel: r3(spanne.mittel), max: r3(spanne.max), aufschlag: auf, quelle: stand(w.aufschlag) },
    urteil: { id: urteil, ...URTEILE[urteil] },
    differenz: differenz && { minEur: r2(differenz.minEur), maxEur: r2(differenz.maxEur), mittelEur: r2(differenz.mittelEur) },
    kav: { ...kav, ct: kavCt },
    entlastung: { eur: r2(entlastungEur), sockelEur: w.sockel.wert, ct: w.entlastung.wert },
    benutzungsstunden: benutzungsstunden === null ? null : Math.round(benutzungsstunden),
    vorjahr: Object.values(w).some((x) => x.vorjahr),
    vorschau2027: vorschau2027(e, kwh),
  };
}

/* ------------------------------------------------------------------ */
/* Umlagen 2027 (sobald veröffentlicht)                                 */
/* ------------------------------------------------------------------ */

/** Umlagen 2027 aus dem Register, falls veröffentlicht – sonst { offen: true, bis } */
export function vorschau2027(e, kwh) {
  const ids = ["umlage.kwkg", "umlage.offshoreNetz", "umlage.besondereNetznutzung"];
  const neu = ids.map((id) => fakt(id, "DE", { stichtag: "2027-01-01" }));
  const termin = fakt("termin.umlagen.veroeffentlichung2027", "DE");
  const bis = termin?.wert?.ende || null;
  if (neu.some((f) => !f || f.wert === null || f.gueltigAb !== "2027-01-01")) return { offen: true, bis };
  const alt = ids.map((id) => fakt(id, "DE", { stichtag: "2026-12-31" }).wert);
  const grenze = fakt("umlage.besondereNetznutzung.grenzeKwh", "DE", { stichtag: "2026-12-31" }).wert;
  const basisKwh = [kwh, kwh, Math.min(kwh, grenze)];
  const delta = neu.reduce((s, f, i) => s + ((f.wert - alt[i]) * basisKwh[i]) / 100, 0);
  return { offen: false, bis, werte: neu.map((f) => ({ id: f.id, ct: f.wert })), deltaEur: r2(delta) };
}

/* ------------------------------------------------------------------ */
/* Preisradar je Bundesland                                            */
/* ------------------------------------------------------------------ */

/**
 * Amtliche Bestandteile für ein Bundesland. Ehrlich: Umlagen und Stromsteuer sind bundesweit gleich,
 * die Konzessionsabgabe hängt von Kundengruppe und Gemeindegröße ab, das Netzentgelt vom Netzbetreiber.
 * Keine Endpreise.
 */
export function preisradar(bundeslandId, heute = new Date()) {
  const w = werte(heute);
  const land = BUNDESLAENDER.find((b) => b.id === bundeslandId) || null;
  const bundesweit = w.kwkg.wert + w.offshore.wert + w.aufschlagA.wert + w.stromsteuer.wert;
  return {
    bundesland: land,
    zeilen: [
      { id: "kwkg", label: "KWKG-Umlage", ct: w.kwkg.wert, stufe: "amtlich", gilt: "bundesweit" },
      { id: "offshore", label: "Offshore-Netzumlage", ct: w.offshore.wert, stufe: "amtlich", gilt: "bundesweit" },
      { id: "aufschlag", label: "Aufschlag für besondere Netznutzung (erste GWh)", ct: w.aufschlagA.wert, stufe: "amtlich", gilt: "bundesweit", zusatz: { ueber: w.aufschlagB.wert, produzierend: w.aufschlagC.wert } },
      { id: "stromsteuer", label: "Stromsteuer (Regelsatz)", ct: w.stromsteuer.wert, stufe: "amtlich", gilt: "bundesweit" },
      { id: "kavSonder", label: "Konzessionsabgabe Sondervertrag", ct: w.kavSonder.wert, stufe: "amtlich", gilt: "bundesweit" },
      { id: "kavTarif", label: "Konzessionsabgabe Tarifkunde", stufen: w.kavTarif.wert, stufe: "amtlich", gilt: "gemeinde" },
      { id: "netz", label: "Netzentgelt und Messstellenbetrieb", ct: null, stufe: "angabe", gilt: "netzbetreiber" },
    ],
    summeSonder: r3(bundesweit + w.kavSonder.wert),
    summeTarif: { min: r3(bundesweit + Math.min(...w.kavTarif.wert.map((s) => s.ct))), max: r3(bundesweit + Math.max(...w.kavTarif.wert.map((s) => s.ct))) },
    stand: stand(w.kwkg),
    vorjahr: [w.kwkg, w.offshore, w.aufschlagA].some((x) => x.vorjahr),
  };
}

/* ------------------------------------------------------------------ */
/* Lastgang (läuft im Browser – keine Übertragung)                     */
/* ------------------------------------------------------------------ */

const DATUM = [
  // 31.12.2025 23:45[:00]
  { re: /^(\d{1,2})\.(\d{1,2})\.(\d{2,4})(?:[ T,;]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/, teile: (m) => [m[3], m[2], m[1], m[4], m[5]] },
  // 2025-12-31[T ]23:45[:00][Z|+01:00]
  { re: /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)?$/, teile: (m) => [m[1], m[2], m[3], m[4], m[5]] },
  // 31/12/2025 23:45
  { re: /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/, teile: (m) => [m[3], m[2], m[1], m[4], m[5]] },
];

/** Datum/Zeit eines Feldes als { j, m, t, h, min } (Ortszeit, ohne Zeitzonenumrechnung) oder null. */
export function datumLesen(text) {
  const s = String(text ?? "").trim().replace(/^"|"$/g, "");
  for (const { re, teile } of DATUM) {
    const m = re.exec(s);
    if (!m) continue;
    let [j, mo, t, h, min] = teile(m).map((x) => (x === undefined ? 0 : Number(x)));
    if (j < 100) j += 2000;
    if (mo < 1 || mo > 12 || t < 1 || t > 31 || h > 24 || min > 59) return null;
    return { j, m: mo, t, h, min };
  }
  return null;
}

/** Zahl im deutschen oder englischen Format („1.234,5“, „1234.5“, „12,5“) oder null. */
export function zahlLesen(text) {
  let s = String(text ?? "").trim().replace(/^"|"$/g, "").replace(/\s/g, "");
  if (!s || !/^-?[\d.,]+$/.test(s)) return null;
  if (s.includes(",") && s.includes(".")) s = s.lastIndexOf(",") > s.lastIndexOf(".") ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  else if (s.includes(",")) s = s.replace(",", ".");
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export const LASTGANG_GRENZEN = Object.freeze({ maxZeilen: 200000, minPunkte: 96 * 7 });

/**
 * Lastgang (CSV/Text) lesen. Erkennt Trennzeichen, Datums- und Wertspalte, Einheit (kWh je Intervall
 * oder kW Mittelleistung) aus Kopfzeile und Intervall. einheit "auto" | "kwh" | "kw".
 * @returns {{ punkte: Array<{ j, m, t, h, min, kwh }>, intervallMin, einheit, zeilen, verworfen, fehler? }}
 */
export function lastgangLesen(text, { einheit = "auto" } = {}) {
  const zeilen = String(text ?? "").split(/\r?\n/).filter((z) => z.trim());
  if (zeilen.length > LASTGANG_GRENZEN.maxZeilen) return { fehler: "zu_gross", punkte: [] };
  if (!zeilen.length) return { fehler: "leer", punkte: [] };
  const trenner = [";", "\t", ","].map((t) => [t, zeilen.slice(0, 50).reduce((s, z) => s + (z.split(t).length - 1), 0)]).sort((a, b) => b[1] - a[1])[0][0];
  const kopf = zeilen.slice(0, 15).join(" ").toLowerCase();
  const roh = [];
  let verworfen = 0;
  for (const z of zeilen) {
    const felder = z.split(trenner).map((f) => f.trim());
    let d = null;
    let wert = null;
    for (let i = 0; i < felder.length && !d; i++) {
      d = datumLesen(felder[i]);
      // Datum und Uhrzeit in getrennten Spalten
      if (d && /^\d{1,2}:\d{2}(:\d{2})?$/.test(felder[i + 1] || "") && d.h === 0 && d.min === 0) {
        const [hh, mm] = felder[i + 1].split(":").map(Number);
        d = { ...d, h: hh, min: mm };
        felder[i + 1] = "";
      }
      if (d) {
        // Wert: letzte Zahl in der Zeile hinter dem Datum, die keine Uhrzeit ist (Zeitstempel „bis“ überspringen)
        for (let k = felder.length - 1; k > i; k--) {
          if (datumLesen(felder[k])) continue;
          const n = zahlLesen(felder[k]);
          if (n !== null) {
            wert = n;
            break;
          }
        }
      }
    }
    if (d && wert !== null && wert >= 0) roh.push({ ...d, wert });
    else verworfen++;
  }
  if (roh.length < LASTGANG_GRENZEN.minPunkte) return { fehler: "zu_wenig", punkte: [], zeilen: zeilen.length, verworfen };

  // Intervall: häufigster Abstand der ersten 500 Punkte in Minuten
  const ms = (p) => Date.UTC(p.j, p.m - 1, p.t, p.h, p.min);
  const abst = new Map();
  for (let i = 1; i < Math.min(roh.length, 500); i++) {
    const a = Math.round((ms(roh[i]) - ms(roh[i - 1])) / 60000);
    if (a > 0) abst.set(a, (abst.get(a) || 0) + 1);
  }
  const intervallMin = [...abst.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 15;
  if (![15, 30, 60].includes(intervallMin)) return { fehler: "intervall", punkte: [], zeilen: zeilen.length, verworfen, intervallMin };

  let art = einheit;
  if (art === "auto") art = /kwh|wirkarbeit|energie|menge/.test(kopf) ? "kwh" : /\bkw\b|leistung|wirkleistung/.test(kopf) ? "kw" : "kwh";
  const proStunde = 60 / intervallMin;
  const punkte = roh.map((p) => ({ j: p.j, m: p.m, t: p.t, h: p.h === 24 ? 23 : p.h, min: p.min, kwh: art === "kw" ? p.wert / proStunde : p.wert }));
  return { punkte, intervallMin, einheit: art, zeilen: zeilen.length, verworfen };
}

/**
 * Lastgang auswerten (Verbrauch, Spitze, Benutzungsstunden, Profilfaktor gegen das Börsenprofil).
 * Hochrechnung auf ein Jahr, wenn weniger als 365 Tage vorliegen (gekennzeichnet).
 */
export function lastgangAuswerten(gelesen, heute = new Date()) {
  const punkte = gelesen?.punkte || [];
  if (!punkte.length) return null;
  const w = werte(heute);
  const intervallMin = gelesen.intervallMin || 15;
  const proStunde = 60 / intervallMin;
  const tage = new Set();
  const last = Array.from({ length: 12 }, () => Array.from({ length: 2 }, () => Array(24).fill(0)));
  const tageJe = Array.from({ length: 12 }, () => [new Set(), new Set()]);
  let summe = 0;
  let spitzeKw = 0;
  for (const p of punkte) {
    const tagKey = `${p.j}-${p.m}-${p.t}`;
    tage.add(tagKey);
    const wt = new Date(Date.UTC(p.j, p.m - 1, p.t)).getUTCDay();
    const d = wt === 0 || wt === 6 ? 1 : 0;
    last[p.m - 1][d][p.h] += p.kwh;
    tageJe[p.m - 1][d].add(tagKey);
    summe += p.kwh;
    spitzeKw = Math.max(spitzeKw, p.kwh * proStunde);
  }
  const anzahlTage = tage.size;
  const faktorJahr = anzahlTage < 365 ? 365 / anzahlTage : 1;
  // Mittlere Last je (Monat, Tagtyp, Stunde) pro Tag – Monate ohne Daten zählen mit dem Mittel der vorhandenen
  const mittel = last.map((m, i) => m.map((tag, d) => tag.map((s) => (tageJe[i][d].size ? s / tageJe[i][d].size : null))));
  const vorhanden = mittel.flat(2).filter((x) => x !== null);
  const ersatz = Array.from({ length: 2 }, (_, d) =>
    Array.from({ length: 24 }, (_, h) => {
      const werteH = mittel.map((m) => m[d][h]).filter((x) => x !== null);
      return werteH.length ? werteH.reduce((s, x) => s + x, 0) / werteH.length : vorhanden.length ? vorhanden.reduce((s, x) => s + x, 0) / vorhanden.length : 0;
    })
  );
  const faktor = profilFaktor(w.profil.wert, w.monate.wert, (m, d, h) => mittel[m][d][h] ?? ersatz[d][h]);
  const jahresKwh = summe * faktorJahr;
  return {
    tage: anzahlTage,
    hochgerechnet: faktorJahr > 1,
    kwh: Math.round(summe),
    jahresKwh: Math.round(jahresKwh),
    verbrauchMwh: Math.round(jahresKwh / 100) / 10,
    spitzeKw: Math.round(spitzeKw * 10) / 10,
    benutzungsstunden: spitzeKw > 0 ? Math.round(jahresKwh / spitzeKw) : null,
    profilFaktor: Math.round(Math.min(1.5, Math.max(0.5, faktor)) * 1000) / 1000,
    intervallMin,
    einheit: gelesen.einheit,
  };
}

/* ------------------------------------------------------------------ */
/* Annahmenbuch (Bericht)                                              */
/* ------------------------------------------------------------------ */

export const ANNAHMEN_IDS = Object.freeze([
  "umlage.kwkg",
  "umlage.offshoreNetz",
  "umlage.besondereNetznutzung",
  "umlage.besondereNetznutzung.ueber1Gwh",
  "umlage.besondereNetznutzung.ueber1GwhProduzierend",
  "steuer.strom.regelsatz",
  "steuer.strom.entlastung9b",
  "steuer.strom.entlastung9bSockel",
  "kav.sondervertrag",
  "kav.tarif",
  "kav.tarifGrenze",
  "boerse.dayAhead.monate",
  "boerse.dayAhead.profil",
  "gewerbestrom.lieferantenaufschlag",
  "gewerbestrom.toleranzUeberMarkt",
]);

/** Annahmenbuch im Format von marktFuer.annahmenbuch() – für src/lib/bericht/annahmenbuch.js. */
export function annahmenGewerbestrom(_eingabe = {}, heute = new Date()) {
  const eintraege = ANNAHMEN_IDS.map((id) => {
    let x;
    try {
      x = wertMitStand(id, heute);
    } catch {
      return { id, land: "DE", fehlt: true };
    }
    const f = x.fakt;
    return { id: f.id, land: f.land, wert: f.wert, einheit: f.einheit, quelle: { ...f.quelle }, abruf: f.abruf, gueltigBis: f.gueltigBis ?? null, status: x.status, klasse: f.klasse, pruefer: f.pruefer };
  });
  return { land: "DE", rechenbasis: "DE", waehrung: "EUR", eintraege };
}
