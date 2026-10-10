// Welle 3, Paket B7: EG-Software Österreich – Preisblatt (keine erfundenen Preise), Wechsel-Check, Faktenregister.
import { test } from "node:test";
import assert from "node:assert/strict";
import { FREIGABE, PAKETE, POSTEN, PREISE, hatOeffentlichePreise, jahresKosten, postenAnzeige, preisblatt } from "./preisblatt.js";
import { FRAGEN, GEWICHT, normalisieren, wechselCheck } from "./wechselCheck.js";
import { fakt, registerPruefen } from "../fakten/index.js";
import { anzeigeStatus } from "../fakten/schema.js";

// ---------------------------------------------------------------- Preisblatt

test("Preisblatt: ohne Freigabe des Inhabers steht kein Betrag im Register (keine erfundenen Preise)", () => {
  if (FREIGABE.freigegeben) return; // nach der Freigabe gilt der nächste Test
  for (const paket of PAKETE) for (const { id } of POSTEN) assert.ok(PREISE[paket][id] === null || PREISE[paket][id] === "entfaellt", `${paket}.${id} hat einen Betrag ohne Freigabe`);
  assert.equal(FREIGABE.stand, null);
});

test("Preisblatt: freigegeben nur mit Stand und Freigabe-Vermerk", () => {
  if (!FREIGABE.freigegeben) return;
  assert.match(String(FREIGABE.stand), /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(String(FREIGABE.freigabeDurch || "").trim());
});

test("Preisblatt: Struktur je Paket mit Einrichtung, Grundgebühr und Betrag je Zählpunkt", () => {
  const tab = preisblatt();
  assert.deepEqual(tab.map((z) => z.paket), ["software", "betrieb", "gruendung"]);
  for (const z of tab) assert.deepEqual(z.posten.map((p) => p.id), ["einrichtung", "grundgebuehr", "zaehlpunkt"]);
  // Gründung ist einmalig – laufende Posten entfallen
  const g = tab.find((z) => z.paket === "gruendung");
  assert.equal(g.posten[1].status, "entfaellt");
  assert.equal(g.posten[2].status, "entfaellt");
});

test("Preisblatt: ohne Freigabe überall „auf Anfrage“, auch wenn ein Betrag eingetragen wäre", () => {
  const preise = { ...PREISE, software: { einrichtung: 99, grundgebuehr: 10, zaehlpunkt: 2 } };
  const ohne = { freigabe: { ...FREIGABE, freigegeben: false }, preise };
  assert.equal(postenAnzeige("software", "zaehlpunkt", ohne).status, "anfrage");
  assert.equal(hatOeffentlichePreise(ohne), false);
  assert.equal(jahresKosten("software", 50, ohne), null);
  assert.equal(hatOeffentlichePreise(), FREIGABE.freigegeben && hatOeffentlichePreise());
});

test("Preisblatt: mit Freigabe netto und brutto (20 % USt) und Jahreskosten je Zählpunkt", () => {
  const mit = { freigabe: { ...FREIGABE, freigegeben: true, stand: "2026-10-09", freigabeDurch: "Test" }, preise: { ...PREISE, software: { einrichtung: 100, grundgebuehr: 10, zaehlpunkt: 2.5 } } };
  assert.deepEqual(postenAnzeige("software", "zaehlpunkt", mit), { status: "betrag", netto: 2.5, brutto: 3 });
  assert.equal(jahresKosten("software", 40, mit), (10 + 2.5 * 40) * 12);
  assert.equal(jahresKosten("software", -1, mit), null);
  // Betriebsführung ohne Beträge bleibt „auf Anfrage“
  assert.equal(postenAnzeige("betrieb", "grundgebuehr", mit).status, "anfrage");
  assert.equal(jahresKosten("betrieb", 40, mit), null);
  assert.equal(jahresKosten("gruendung", 40, mit), null);
});

// ---------------------------------------------------------------- Wechsel-Check

test("Wechsel-Check: unbekannte Eingaben werden bereinigt", () => {
  const e = normalisieren({ modell: "xyz", probleme: ["aufwand", "aufwand", "boese"], vorhaben: "netzgebiet" });
  assert.equal(e.modell, "unbekannt");
  assert.deepEqual(e.probleme, ["aufwand"]);
  assert.deepEqual(e.vorhaben, []);
  for (const p of FRAGEN.probleme) assert.ok(GEWICHT[p] > 0, `Gewicht für ${p}`);
});

test("Wechsel-Check: zufriedene Gemeinschaft bekommt ehrlich „eher nicht“", () => {
  const r = wechselCheck({ modell: "eeg_lokal", verwaltung: "software_selbst", probleme: [], vertrag: "kurzfristig", eda: "gemeinschaft" });
  assert.equal(r.sinnvoll.stufe, "gering");
  assert.ok(r.sinnvoll.gruende.includes("zufrieden"));
  assert.equal(r.moeglich.stufe, "jetzt");
  assert.ok(r.hinweise.includes("ohne_neuanmeldung"));
});

test("Wechsel-Check: nur der Preis ist selten ein guter Grund", () => {
  const r = wechselCheck({ probleme: ["kosten"], vertrag: "kurzfristig", eda: "gemeinschaft", modell: "beg" });
  assert.equal(r.sinnvoll.stufe, "gering");
  assert.ok(r.sinnvoll.gruende.includes("nur_kosten"));
});

test("Wechsel-Check: überlastetes Ehrenamt mit Tabellen → sinnvoll, Betriebsführung als Anliegen", () => {
  const r = wechselCheck({ modell: "eeg_regional", zaehlpunkte: "bis500", verwaltung: "tabellen", probleme: ["aufwand", "abrechnung"], vertrag: "keiner", eda: "gemeinschaft" });
  assert.equal(r.sinnvoll.stufe, "hoch");
  assert.equal(r.sinnvoll.gruende[0], "aufwand");
  assert.ok(r.sinnvoll.gruende.includes("tabellen_gross"));
  assert.equal(r.anliegen, "betrieb");
  assert.equal(r.moeglich.stufe, "jetzt");
});

test("Wechsel-Check: Vertrag mit Laufzeit und EDA-Zugang beim Anbieter → vorbereiten", () => {
  const r = wechselCheck({ modell: "eeg_lokal", probleme: ["abrechnung", "elwg"], vertrag: "laufzeit", eda: "anbieter" });
  assert.equal(r.moeglich.stufe, "vorbereiten");
  assert.deepEqual(r.moeglich.schritte, ["vertrag_laufzeit", "eda_anbieter"]);
  assert.ok(r.hinweise.includes("elwg_vertraege"));
  assert.equal(r.anliegen, "wechsel");
});

test("Wechsel-Check: Mitglieder aus anderen Netzgebieten → Hinweis auf die Netzbetreiber-Einschränkung", () => {
  const r = wechselCheck({ probleme: ["aufwand"], vorhaben: ["netzgebiet"] });
  assert.ok(r.hinweise.includes("netzgebiet"));
  const ohne = wechselCheck({ probleme: ["aufwand"] });
  assert.ok(!ohne.hinweise.includes("netzgebiet"));
});

test("Wechsel-Check: Modellwechsel → Neuanmeldung, getrennt vom Anbieterwechsel planen", () => {
  const r = wechselCheck({ probleme: ["support"], vorhaben: ["modellwechsel"] });
  assert.ok(r.hinweise.includes("modellwechsel"));
  assert.ok(!r.hinweise.includes("ohne_neuanmeldung"));
  assert.equal(r.ablauf.at(-1), "modellwechsel_danach");
});

// ---------------------------------------------------------------- Faktenregister (Modul eg-at)

test("Faktenregister: ElWG-Fakten für die EG-Software vorhanden und vertragsgemäß", () => {
  const p = registerPruefen();
  assert.deepEqual(p.fehler.filter((f) => f.startsWith("[eg-at]")), []);
  const e = fakt("recht.elwg.netzbetreiberEinschraenkung", "AT", { stichtag: "2026-10-09" });
  assert.ok(e, "Netzbetreiber-Einschränkung fehlt");
  assert.match(e.wert, /April 2027/);
  assert.equal(e.quelle.url, "https://energiegemeinschaften.gv.at/faqs-zum-elwg/");
  assert.equal(anzeigeStatus(e, "2026-10-09"), "zu_pruefen");
  // Nach Ablauf nie als aktuell zeigen (Masterplan H7)
  assert.equal(anzeigeStatus(e, "2027-05-01"), "abgelaufen");
  for (const id of ["recht.elwg.gemeinschaftenAb", "prozess.eda.anbieterwechselOhneNeuanmeldung", "prozess.eda.modellwechselNeuanmeldung"]) {
    assert.ok(fakt(id, "AT"), `${id} fehlt`);
    assert.equal(fakt(id, "DE"), null, `${id} darf nicht für DE gelten`);
  }
});

test("EG-Fakten: Anzeige mit Quelle, Stand und Status; abgelaufen nie als aktuell", async () => {
  const { egFakt, egFakten } = await import("./fakten.js");
  const alle = egFakten({ stichtag: "2026-10-09" });
  for (const [k, v] of Object.entries(alle)) {
    assert.ok(v, `${k} fehlt`);
    assert.ok(v.text && v.quelle && v.stand, `${k} ohne Text/Quelle/Stand`);
  }
  assert.equal(alle.netzgebiet.stand, "01.10.2026");
  assert.match(egFakt("netzgebiet", { sprache: "en", stichtag: "2026-10-09" }).text, /April 2027/);
  const spaet = egFakt("netzgebiet", { stichtag: "2027-06-01" });
  assert.equal(spaet.abgelaufen, true);
  assert.doesNotMatch(spaet.text, /April 2027/);
});
