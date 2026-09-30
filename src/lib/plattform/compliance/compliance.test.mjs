// Tests der reinen Compliance-Logik (ohne Server):  node --test src/lib/plattform/compliance/compliance.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { VVT, dsFrist, dsFristStatus, dsUebergang, dsAntwortEntwurf, kycSla, plusMonate, plusWerktage, verdachtAufbewahrungBis, verdachtUebergang, vvtCsv, vvtJson, werktage } from "./index.js";

test("Monatsfrist nach VO 1182/71: gleicher Tag bzw. Monatsletzter, Verlängerung +2 Monate, CH 30 Tage", () => {
  assert.equal(plusMonate("2026-09-30", 1), "2026-10-30");
  assert.equal(plusMonate("2026-01-31", 1), "2026-02-28");
  assert.equal(plusMonate("2028-01-31", 1), "2028-02-29");
  assert.equal(plusMonate("2026-12-15", 1), "2027-01-15");
  assert.equal(dsFrist("2026-01-31", { verlaengert: true }), "2026-04-30");
  assert.equal(dsFrist("2026-09-01", { land: "CH" }), "2026-10-01");
});

test("Fristampel und Übergänge (Pflichtfelder, Verlängerung nur einmal und in der ersten Frist)", () => {
  const a = { art: "auskunft", status: "in_bearbeitung", eingangAm: "2026-09-01", land: "AT" };
  assert.equal(dsFristStatus(a, "2026-09-20").ampel, "gruen");
  assert.equal(dsFristStatus(a, "2026-09-26").ampel, "gelb");
  assert.equal(dsFristStatus(a, "2026-10-02").ampel, "rot");
  assert.equal(dsFristStatus({ ...a, status: "verlaengert", verlaengertAm: "2026-09-20" }, "2026-10-02").frist, "2026-12-01");
  assert.equal(dsUebergang(a, "verlaengern", { begruendung: "kurz" }, "2026-09-10").ok, false);
  assert.equal(dsUebergang(a, "verlaengern", { begruendung: "Umfangreiche Datenbestände in drei Systemen" }, "2026-09-10").ok, true);
  assert.equal(dsUebergang(a, "verlaengern", { begruendung: "Umfangreiche Datenbestände in drei Systemen" }, "2026-10-02").ok, false);
  assert.equal(dsUebergang({ ...a, verlaengertAm: "2026-09-05" }, "verlaengern", { begruendung: "Umfangreiche Datenbestände" }, "2026-09-10").ok, false);
  assert.match(dsUebergang(a, "erledigen", { ergebnis: "Auskunft erteilt per Portal" }, "2026-09-10").fehler, /Datenexport/);
  assert.equal(dsUebergang({ ...a, exportAm: "2026-09-10T10:00:00Z" }, "erledigen", { ergebnis: "Auskunft erteilt per Portal" }, "2026-09-10").ok, true);
  assert.match(dsUebergang({ ...a, art: "loeschung" }, "erledigen", { ergebnis: "Konto anonymisiert, Belege gesperrt" }, "2026-09-10").fehler, /Löschergebnis/);
  assert.equal(dsUebergang({ ...a, status: "erledigt" }, "ablehnen", { begruendung: "offenkundig exzessiv" }, "2026-09-10").ok, false);
  assert.match(dsAntwortEntwurf({ ...a, status: "abgelehnt", begruendung: "x" }), /Datenschutzbehörde/);
});

test("Verdachtsfall: Vier-Augen, Pflichtangaben, kein Zukunftsdatum, Aufbewahrung", () => {
  const f = { status: "in_pruefung", erfasstVon: "U-1" };
  assert.match(verdachtUebergang(f, "keine_meldung", { begruendung: "Mittelherkunft durch Kaufvertrag belegt, plausibel" }, { ichId: "U-1" }).fehler, /Vier-Augen/);
  assert.equal(verdachtUebergang(f, "keine_meldung", { begruendung: "Mittelherkunft durch Kaufvertrag belegt, plausibel" }, { ichId: "U-2" }).ok, true);
  assert.equal(verdachtUebergang(f, "keine_meldung", { begruendung: "zu kurz" }, { ichId: "U-2" }).ok, false);
  const m = { status: "meldung_vorbereitet", erfasstVon: "U-1" };
  assert.equal(verdachtUebergang(m, "gemeldet", { aktenzeichen: "", gemeldetAm: "2026-09-30" }, { heute: "2026-09-30" }).ok, false);
  assert.equal(verdachtUebergang(m, "gemeldet", { aktenzeichen: "FIU-2026/123", gemeldetAm: "2026-10-01" }, { heute: "2026-09-30" }).ok, false);
  assert.equal(verdachtUebergang(m, "gemeldet", { aktenzeichen: "FIU-2026/123", gemeldetAm: "2026-09-30" }, { heute: "2026-09-30" }).ok, true);
  assert.equal(verdachtUebergang({ status: "erfasst" }, "gemeldet", {}, {}).ok, false);
  assert.equal(verdachtAufbewahrungBis("2026-09-30", "DE"), "2031-12-31");
  assert.equal(verdachtAufbewahrungBis("2026-09-30", "CH"), "2036-12-31");
});

test("KYC-SLA in Werktagen", () => {
  assert.equal(werktage("2026-09-25", "2026-09-28"), 1); // Fr → Mo
  assert.equal(plusWerktage("2026-09-25", 3), "2026-09-30");
  const s = kycSla({ status: "eingereicht", kontotyp: "person", eingereichtAm: "2026-09-25T10:00:00Z" }, "2026-10-01");
  assert.equal(s.faelligAm, "2026-09-30");
  assert.equal(s.ampel, "rot");
  assert.equal(kycSla({ status: "eingereicht", kontotyp: "unternehmen", eingereichtAm: "2026-09-28" }, "2026-09-29").ampel, "gruen");
  assert.equal(kycSla({ status: "verifiziert" }, "2026-09-29").ampel, "keine");
});

test("VVT: vollständige Pflichtangaben, CSV mit BOM, JSON als Entwurf", () => {
  for (const v of VVT) for (const k of ["titel", "zweck", "rechtsgrundlage", "betroffene", "daten", "empfaenger", "drittland", "loeschung"]) assert.ok(v[k], `${v.id}.${k}`);
  const c = vvtCsv();
  assert.ok(c.startsWith("﻿Verzeichnis"));
  assert.equal(c.trim().split("\r\n").length, VVT.length + 3);
  assert.equal(vvtJson().entwurf, true);
});
