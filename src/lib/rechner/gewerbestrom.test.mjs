// Welle 3, Paket B5: Rechnungs-Check Gewerbestrom DE – Rechenlogik, Register, Lastgang, Bericht.
import { test } from "node:test";
import assert from "node:assert/strict";
import { registerPruefen, fakt } from "../fakten/index.js";
import {
  ANNAHMEN_IDS,
  BUNDESLAENDER,
  LASTPROFILE,
  STANDARD,
  annahmenGewerbestrom,
  boerseBase,
  datumLesen,
  gewerbestromCheck,
  kavGruppe,
  lastgangAuswerten,
  lastgangLesen,
  preisradar,
  profilFaktor,
  profilFaktorFuer,
  tagtypen,
  werte,
  zahlLesen,
} from "./gewerbestrom.js";
import { neuRechnen } from "../bericht/neuRechnen.js";
import { annahmenbuchFuer } from "../bericht/annahmenbuch.js";

const HEUTE = "2026-10-09";
const nah = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) <= eps, `${a} ≠ ${b}`);
const check = (e = {}) => gewerbestromCheck(e, { heute: HEUTE });

test("Register: Modul gültig, alle Annahmen vorhanden, amtliche Werte 2026 wie veröffentlicht", () => {
  const r = registerPruefen();
  assert.equal(r.ok, true, r.fehler.join("\n"));
  for (const id of ANNAHMEN_IDS) assert.ok(fakt(id, "DE", { stichtag: HEUTE }), id);
  const w = werte(HEUTE);
  assert.equal(w.kwkg.wert, 0.446);
  assert.equal(w.offshore.wert, 0.941);
  assert.equal(w.aufschlagA.wert, 1.559);
  assert.equal(w.aufschlagB.wert, 0.05);
  assert.equal(w.aufschlagC.wert, 0.025);
  assert.equal(w.stromsteuer.wert, 2.05);
  assert.equal(w.entlastung.wert, 2.0);
  assert.equal(w.sockel.wert, 250);
  assert.equal(w.kavSonder.wert, 0.11);
  assert.deepEqual(
    w.kavTarif.wert.map((s) => s.ct),
    [1.32, 1.59, 1.99, 2.39]
  );
  // Klasse A geprüft mit Primärquelle; Einschätzung bleibt Klasse C „zu prüfen“
  for (const k of ["kwkg", "offshore", "aufschlagA", "stromsteuer", "kavSonder"]) {
    assert.equal(w[k].fakt.klasse, "A");
    assert.equal(w[k].status, "geprueft");
    assert.match(w[k].fakt.quelle.url, /^https:\/\//);
  }
  assert.equal(w.aufschlag.fakt.klasse, "C");
  assert.equal(w.aufschlag.status, "zu_pruefen");
  // Börse: 12 Monate, Profil 12 × 2 × 24, Lizenznennung in der Quelle
  assert.equal(w.monate.wert.length, 12);
  assert.equal(w.profil.wert.length, 12);
  assert.ok(w.profil.wert.every((m) => m.length === 2 && m.every((d) => d.length === 24 && d.every((x) => typeof x === "number"))));
  assert.match(w.monate.fakt.quelle.titel, /SMARD\.de.*CC BY 4\.0/);
});

test("Zerlegung Gesamtpreis: Summe der Zeilen = Rechnung, Energieanteil als Rest", () => {
  const r = check();
  assert.equal(r.land, "DE");
  const summe = r.zeilen.reduce((s, z) => s + z.eur, 0);
  nah(summe, r.rechnung.eur, 0.05);
  const kwh = STANDARD.verbrauchMwh * 1000;
  nah(r.rechnung.eur, (kwh * STANDARD.arbeitspreisCt) / 100 + STANDARD.grundpreisEurMonat * 12, 0.01);
  // amtlich bei 250 MWh, Sondervertrag: 0,446 + 0,941 + 1,559 + 0,11 + 2,05 = 5,106 ct
  nah(r.amtlich.ct, 5.106, 1e-9);
  nah(r.energie.ct, STANDARD.arbeitspreisCt - 5.106 - STANDARD.netzCt + (STANDARD.grundpreisEurMonat * 12 * 100) / kwh, 1e-3);
  assert.deepEqual(
    r.zeilen.map((z) => [z.id, z.stufe]),
    [
      ["kwkg", "amtlich"],
      ["offshore", "amtlich"],
      ["aufschlag", "amtlich"],
      ["kav", "amtlich"],
      ["stromsteuer", "amtlich"],
      ["netz", "angabe"],
      ["energie", "berechnet"],
    ]
  );
});

test("Nur Energie im Arbeitspreis: Energieanteil = Ihre Angabe, Rechnung addiert amtlich und Netz", () => {
  const r = check({ preisArt: "energie", arbeitspreisCt: 12, grundpreisEurMonat: 0, netzCt: 6, netzFixEurJahr: 1200, verbrauchMwh: 100 });
  nah(r.energie.ct, 12, 1e-9);
  assert.equal(r.zeilen.find((z) => z.id === "energie").stufe, "angabe");
  nah(r.rechnung.eur, 100000 * 0.12 + r.amtlich.eur + 100000 * 0.06 + 1200, 0.01);
  // ohne Netz: Urteil trotzdem möglich (Energie steht getrennt), Rechnungssumme unbekannt
  const ohne = check({ preisArt: "energie", arbeitspreisCt: 12, netzModus: "unbekannt" });
  assert.notEqual(ohne.urteil.id, "offen");
  assert.equal(ohne.rechnung, null);
});

test("Gesamtpreis: separat berechnete Netz-Fixkosten (Leistungspreis, Messung) mindern den Energieanteil nicht (Prüfer B5)", () => {
  const ohne = check();
  const mit = check({ netzFixEurJahr: 9000 });
  nah(mit.energie.ct, ohne.energie.ct, 1e-9);
  assert.equal(mit.urteil.id, ohne.urteil.id);
  nah(mit.rechnung.eur, ohne.rechnung.eur + 9000, 0.01);
  nah(mit.zeilen.reduce((s, z) => s + z.eur, 0), mit.rechnung.eur, 0.05);
});

test("Gesamtpreis ohne Netzentgelt: Urteil offen, Rest „Energie, Vertrieb und Netz“", () => {
  const r = check({ netzModus: "unbekannt" });
  assert.equal(r.urteil.id, "offen");
  assert.equal(r.energie, null);
  assert.ok(r.zeilen.some((z) => z.id === "rest" && z.stufe === "berechnet"));
});

test("Staffel Aufschlag besondere Netznutzung über 1 GWh (Gruppe B‘ und C‘)", () => {
  const b = check({ verbrauchMwh: 2000, produzierend: false });
  const zb = b.zeilen.find((z) => z.id === "aufschlag");
  nah(zb.eur, (1e6 * 1.559 + 1e6 * 0.05) / 100, 0.01);
  assert.equal(zb.detail.gruppe, "B");
  const c = check({ verbrauchMwh: 2000, produzierend: true, gruppeC: true });
  const zc = c.zeilen.find((z) => z.id === "aufschlag");
  nah(zc.eur, (1e6 * 1.559 + 1e6 * 0.025) / 100, 0.01);
  // Gruppe C nur mit produzierendem Gewerbe
  const ohneProd = check({ verbrauchMwh: 2000, produzierend: false, gruppeC: true });
  nah(ohneProd.zeilen.find((z) => z.id === "aufschlag").eur, zb.eur, 0.01);
  // bis 1 GWh keine Staffel
  assert.equal(check({ verbrauchMwh: 1000 }).zeilen.find((z) => z.id === "aufschlag").detail, null);
});

test("Konzessionsabgabe nach § 2 Abs. 7 KAV", () => {
  assert.deepEqual(kavGruppe({ kav: "auto", spannung: "ns", verbrauchMwh: 20, leistungKw: 50 }), { gruppe: "tarif", grund: "verbrauch" });
  assert.deepEqual(kavGruppe({ kav: "auto", spannung: "ns", verbrauchMwh: 250, leistungKw: 90 }), { gruppe: "sonder", grund: "leistung" });
  assert.deepEqual(kavGruppe({ kav: "auto", spannung: "ns", verbrauchMwh: 250, leistungKw: 25 }), { gruppe: "tarif", grund: "leistung" });
  assert.deepEqual(kavGruppe({ kav: "auto", spannung: "ns", verbrauchMwh: 250, leistungKw: 0 }), { gruppe: "sonder", grund: "annahme" });
  assert.deepEqual(kavGruppe({ kav: "auto", spannung: "ms", verbrauchMwh: 20, leistungKw: 10 }), { gruppe: "sonder", grund: "mittelspannung" });
  assert.deepEqual(kavGruppe({ kav: "tarif", spannung: "ms", verbrauchMwh: 900 }), { gruppe: "tarif", grund: "gewaehlt" });
  const tarif = check({ verbrauchMwh: 20, leistungKw: 20, gemeinde: "ueber500" });
  assert.equal(tarif.kav.ct, 2.39);
  nah(tarif.zeilen.find((z) => z.id === "kav").eur, 20000 * 0.0239, 0.01);
});

test("Stromsteuer-Entlastung § 9b: 2,0 ct/kWh über dem Sockel von 250 €", () => {
  nah(check({ verbrauchMwh: 100, produzierend: true }).entlastung.eur, 100000 * 0.02 - 250, 0.01);
  assert.equal(check({ verbrauchMwh: 10, produzierend: true }).entlastung.eur, 0);
  assert.equal(check({ verbrauchMwh: 100, produzierend: false }).entlastung.eur, 0);
  // Auf der Rechnung steht der Regelsatz – Zerlegung ändert sich durch die Entlastung nicht
  nah(check({ produzierend: true }).amtlich.ct, check({ produzierend: false }).amtlich.ct, 1e-12);
});

test("Urteil: marktgerecht, günstig, etwas und deutlich über Markt, Eingaben prüfen", () => {
  const basis = check();
  const s = basis.spanne;
  const tol = werte(HEUTE).toleranz.wert;
  // Arbeitspreis so wählen, dass der Energieanteil eine Zielhöhe erreicht
  const fuer = (zielCt) => check({ arbeitspreisCt: basis.eingabe.arbeitspreisCt + (zielCt - basis.energie.ct) });
  assert.equal(fuer(s.mittel).urteil.id, "marktgerecht");
  assert.equal(fuer(s.max - 0.01).urteil.id, "marktgerecht");
  assert.equal(fuer(s.min - 0.5).urteil.id, "guenstig");
  assert.equal(fuer(s.max + tol / 2).urteil.id, "etwas_ueber");
  const deutlich = fuer(s.max + tol + 1);
  assert.equal(deutlich.urteil.id, "deutlich_ueber");
  assert.ok(deutlich.differenz.minEur > 0 && deutlich.differenz.maxEur > deutlich.differenz.minEur);
  nah(deutlich.differenz.minEur, ((deutlich.energie.ct - s.max) * deutlich.kwh) / 100, 0.5);
  assert.equal(fuer(s.mittel).differenz, null);
  assert.equal(check({ arbeitspreisCt: 5 }).urteil.id, "pruefen");
});

test("Börse: Base nach Tagen gewichtet, Profilfaktor gleichmäßig = 1, Profile plausibel", () => {
  const w = werte(HEUTE);
  const b = boerseBase(w.monate.wert);
  const einfach = w.monate.wert.reduce((s, m) => s + m.eurMwh, 0) / 12 / 10;
  assert.ok(Math.abs(b - einfach) < 0.2, `${b} vs ${einfach}`);
  nah(profilFaktor(w.profil.wert, w.monate.wert, () => 1), 1, 1e-12);
  nah(profilFaktorFuer("base", HEUTE), 1, 1e-12);
  for (const p of LASTPROFILE.filter((x) => x.form)) {
    const fk = profilFaktorFuer(p.id, HEUTE);
    assert.ok(fk > 0.7 && fk < 1.3, `${p.id}: ${fk}`);
  }
  assert.deepEqual(tagtypen(2026, 2), [20, 8]);
  const r = check({ lastprofil: "base" });
  nah(r.boerse.ct, r.boerse.baseCt, 1e-3);
  nah(r.spanne.min - r.boerse.ct, w.aufschlag.wert.min, 1e-3);
  // Eigener Lastgang: Profilfaktor kommt aus der Eingabe
  const lg = check({ lastprofil: "lastgang", profilFaktor: 1.2 });
  nah(lg.boerse.ct, lg.boerse.baseCt * 1.2, 2e-3);
});

test("Lastgang lesen: Zahlen, Datum, Trennzeichen, Einheit, Intervall", () => {
  assert.equal(zahlLesen("1.234,5"), 1234.5);
  assert.equal(zahlLesen("1,234.5"), 1234.5);
  assert.equal(zahlLesen("12,5"), 12.5);
  assert.equal(zahlLesen("1.000"), 1000);
  assert.equal(zahlLesen("abc"), null);
  assert.deepEqual(datumLesen("31.12.2025 23:45"), { j: 2025, m: 12, t: 31, h: 23, min: 45 });
  assert.deepEqual(datumLesen("2026-03-01T06:15:00+01:00"), { j: 2026, m: 3, t: 1, h: 6, min: 15 });
  assert.equal(datumLesen("32.01.2026"), null);

  // 14 Tage Viertelstunden, Werktag 10 kWh je 15 min von 7–18 Uhr, sonst 1 kWh; Datum und Zeit getrennt
  const zeilen = ["Datum;Uhrzeit;Wirkarbeit kWh"];
  const start = Date.UTC(2026, 0, 5); // Montag
  for (let i = 0; i < 14 * 96; i++) {
    const d = new Date(start + i * 15 * 60000);
    const werk = d.getUTCDay() >= 1 && d.getUTCDay() <= 5;
    const wert = werk && d.getUTCHours() >= 7 && d.getUTCHours() < 18 ? 10 : 1;
    const dd = `${String(d.getUTCDate()).padStart(2, "0")}.${String(d.getUTCMonth() + 1).padStart(2, "0")}.${d.getUTCFullYear()}`;
    zeilen.push(`${dd};${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")};${String(wert).replace(".", ",")}`);
  }
  const gelesen = lastgangLesen(zeilen.join("\r\n"));
  assert.equal(gelesen.fehler, undefined);
  assert.equal(gelesen.intervallMin, 15);
  assert.equal(gelesen.einheit, "kwh");
  assert.equal(gelesen.punkte.length, 14 * 96);
  const a = lastgangAuswerten(gelesen, HEUTE);
  const erwartet = 10 * (11 * 4 * 10) + 1 * (14 * 96 - 11 * 4 * 10);
  assert.equal(a.kwh, erwartet);
  assert.equal(a.tage, 14);
  assert.equal(a.hochgerechnet, true);
  nah(a.jahresKwh, Math.round((erwartet * 365) / 14), 1);
  assert.equal(a.spitzeKw, 40); // 10 kWh je Viertelstunde = 40 kW
  assert.ok(a.profilFaktor >= 0.5 && a.profilFaktor <= 1.5);

  // Dieselben Werte als Leistung (kW) mit Komma-Trenner und ISO-Datum
  const kw = ["zeit,leistung kW", ...gelesen.punkte.map((p) => `${p.j}-${String(p.m).padStart(2, "0")}-${String(p.t).padStart(2, "0")} ${String(p.h).padStart(2, "0")}:${String(p.min).padStart(2, "0")},${p.kwh * 4}`)];
  const g2 = lastgangLesen(kw.join("\n"));
  assert.equal(g2.einheit, "kw");
  assert.equal(lastgangAuswerten(g2, HEUTE).kwh, erwartet);

  assert.equal(lastgangLesen("").fehler, "leer");
  assert.equal(lastgangLesen("a;b\n1;2").fehler, "zu_wenig");
});

test("Preisradar: amtliche Bestandteile bundesweit gleich, KAV je Gemeindegröße, keine Endpreise", () => {
  assert.equal(BUNDESLAENDER.length, 16);
  const by = preisradar("bayern", HEUTE);
  const hb = preisradar("bremen", HEUTE);
  assert.equal(by.bundesland.label, "Bayern");
  assert.deepEqual(
    by.zeilen.map((z) => [z.id, z.ct]),
    hb.zeilen.map((z) => [z.id, z.ct])
  );
  nah(by.summeSonder, 0.446 + 0.941 + 1.559 + 2.05 + 0.11, 1e-9);
  nah(by.summeTarif.min, 0.446 + 0.941 + 1.559 + 2.05 + 1.32, 1e-9);
  nah(by.summeTarif.max, 0.446 + 0.941 + 1.559 + 2.05 + 2.39, 1e-9);
  assert.equal(by.zeilen.find((z) => z.id === "netz").ct, null);
  assert.equal(preisradar("unbekannt", HEUTE).bundesland, null);
});

test("Umlagen 2027: bis zur Veröffentlichung offen; ab 2027 Vorjahreswert gekennzeichnet und als abgelaufen markiert", () => {
  const r = check();
  assert.equal(r.vorschau2027.offen, true);
  assert.equal(r.vorschau2027.bis, "2026-10-25");
  assert.equal(r.vorjahr, false);
  const spaeter = gewerbestromCheck({}, { heute: "2027-02-01" });
  assert.equal(spaeter.vorjahr, true);
  const w = werte("2027-02-01");
  assert.equal(w.kwkg.vorjahr, true);
  assert.equal(w.kwkg.status, "abgelaufen");
});

test("Bericht: Neuberechnung auf dem Server, nur DE, gleiche Prüf-ID für gleiche Eingaben", () => {
  const eingaben = { ...STANDARD };
  const a = neuRechnen({ rechner: "gewerbestrom", eingaben, land: "DE" });
  const b = neuRechnen({ rechner: "gewerbestrom", eingaben: { ...eingaben }, land: "de" });
  assert.equal(a.pruefId, b.pruefId);
  assert.equal(a.vorgangTyp, "reststrom");
  assert.equal(a.eingaben.regionId, undefined);
  assert.equal(a.eingaben.verbrauchMwh, STANDARD.verbrauchMwh); // Größe für das Lead-Routing (Reststrom)
  assert.ok(a.ergebnis.urteil.titel);
  assert.ok(a.ergebnis.kennzahlen.length >= 3);
  assert.equal(a.ergebnis.tabelle.zeilen.length, a.roh.zeilen.length);
  const status = (fn) => {
    try {
      fn();
    } catch (e) {
      return e.status;
    }
    return 200;
  };
  assert.equal(status(() => neuRechnen({ rechner: "gewerbestrom", eingaben, land: "AT" })), 422);
  assert.equal(status(() => neuRechnen({ rechner: "gewerbestrom", eingaben, land: "CH" })), 422);
  assert.equal(status(() => neuRechnen({ rechner: "gewerbestrom", eingaben: { ...eingaben, lastgang: "…" }, land: "DE" })), 422);
  assert.equal(status(() => neuRechnen({ rechner: "gewerbestrom", eingaben: { ...eingaben, arbeitspreisCt: 999 }, land: "DE" })), 422);
  assert.equal(status(() => neuRechnen({ rechner: "gewerbestrom", eingaben: { ...eingaben, bundesland: "" }, land: "DE" })), 422);
  // Annahmenbuch aus dem Register
  const buch = annahmenbuchFuer("gewerbestrom", a.eingaben);
  assert.equal(buch.eintraege.length, ANNAHMEN_IDS.length);
  assert.ok(buch.eintraege.every((x) => x.herkunft === "register" && x.label && x.label !== x.id));
  assert.equal(annahmenGewerbestrom().land, "DE");
});
