// Tests der Verkaufs-Pipeline (ohne Server):  node --test src/lib/plattform/transaktion/pipeline.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { dealBerichtCsv, dealKarte, erwarteterPreis, overridePruefen, phaseVon, pipelineAuswerten, preisGesamt } from "./pipeline.js";

const p = (x = {}) => ({ id: "P-1", titel: "PV 10 MWp", status: "veroeffentlicht", mwp: 10, preisProKwp: 80, provisionSatz: 0.025, erstelltAm: "2026-08-01T00:00:00Z", geaendertAm: "2026-09-25T00:00:00Z", ...x });

test("Phase aus Projekt, Interessen, Bieterverfahren und Closing", () => {
  assert.equal(phaseVon(p({ status: "entwurf" })), null);
  assert.equal(phaseVon(p({ status: "pruefung" })), "pruefung");
  assert.equal(phaseVon(p()), "vermarktung");
  assert.equal(phaseVon(p(), { interessen: [{ status: "nda_freigegeben" }] }), "datenraum");
  assert.equal(phaseVon(p(), { verfahren: { status: "laufend" } }), "angebote");
  assert.equal(phaseVon(p({ status: "reserviert" })), "exklusiv");
  assert.equal(phaseVon(p({ status: "reserviert" }), { closing: { status: "signing" } }), "closing");
  assert.equal(phaseVon(p(), { closing: { status: "abgebrochen" } }), "vermarktung");
  assert.equal(phaseVon(p({ status: "verkauft" })), "verkauft");
});

test("Preis: Closing > Zuschlag > LOI > Gebot > Preisvorstellung", () => {
  assert.equal(preisGesamt({ preisProKwp: 71 }, 24), 1704000);
  assert.equal(erwarteterPreis(p()).preis, 800000);
  assert.equal(erwarteterPreis(p(), { gebote: [{ preisProKwp: 90, status: "abgegeben" }, { preis: 950000, status: "abgegeben" }] }).preis, 950000);
  assert.equal(erwarteterPreis(p(), { interessen: [{ status: "loi_abgegeben", loi: { betrag: 700000 } }, { status: "loi_angenommen", loi: { betrag: 650000 } }] }).preis, 650000);
  assert.equal(erwarteterPreis(p(), { closing: { kaufpreis: 777000 } }).quelle, "Closing-Raum (Kaufpreis)");
  assert.equal(erwarteterPreis(p({ preisProKwp: null })).preis, null);
});

test("Karte: gewichtete Provision, Override, Signing 90 %, stockend", () => {
  const k = dealKarte(p(), {}, null, "2026-09-30");
  assert.equal(k.provision, 20000);
  assert.equal(k.provisionGewichtet, 2000);
  assert.equal(k.closingErwartet, "2027-06");
  assert.equal(k.stockt, false);
  const o = dealKarte(p(), {}, { wahrscheinlichkeit: 40, closingErwartet: "2026-12", notiz: "Investor A signalisiert Signing im Dezember" }, "2026-09-30");
  assert.equal(o.wahrscheinlichkeit, 0.4);
  assert.equal(o.quartal, "2026-Q4");
  assert.equal(o.manuell, true);
  assert.equal(dealKarte(p({ status: "reserviert" }), { closing: { status: "signing", kaufpreis: 1000000 } }, null, "2026-09-30").wahrscheinlichkeit, 0.9);
  assert.equal(dealKarte(p({ geaendertAm: "2026-08-01T00:00:00Z" }), {}, null, "2026-09-30").stockt, true);
  assert.equal(dealKarte(p({ provisionSatz: null }), {}, null, "2026-09-30").provisionSatzAnnahme, true);
});

test("Auswertung, Override-Prüfung und CSV", () => {
  const karten = [dealKarte(p(), {}, null, "2026-09-30"), dealKarte(p({ id: "P-2", status: "verkauft" }), { closing: { status: "vollzogen", kaufpreis: 1000000, geaendertAm: "2026-09-10" } }, null, "2026-09-30")];
  const a = pipelineAuswerten(karten);
  assert.equal(a.summen.deals, 1);
  assert.equal(a.summen.provisionVerkauft, 25000);
  assert.equal(a.spalten.find((s) => s.id === "vermarktung").anzahl, 1);
  assert.equal(a.prognose.length, 1);
  assert.throws(() => overridePruefen({ wahrscheinlichkeit: 120 }), /zwischen/);
  assert.throws(() => overridePruefen({ wahrscheinlichkeit: 50, notiz: "kurz" }), /begründen/);
  assert.equal(overridePruefen({ closingErwartet: "2027-01" }).wahrscheinlichkeit, null);
  const csv = dealBerichtCsv(karten);
  assert.ok(csv.startsWith("﻿Projekt;"));
  assert.equal(csv.trim().split("\r\n").length, 3);
});
