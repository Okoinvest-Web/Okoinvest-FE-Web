// Tests Paket FRI (Welle 2): Termine 2026, Umlagen 2027, Netzentgelte 2027 und die Anzeige-Bausteine.
//   node --import ./test/hilfen/registrieren.mjs --test src/lib/fakten/daten/termine.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import TERMINE_2026 from "./termine-2026.js";
import UMLAGEN_2027 from "./umlagen-2027.js";
import NETZENTGELTE_2027 from "./netzentgelte-2027.js";
import { faktValidieren, alleFakten, fakt, pruefeFakten, istIsoDatum } from "../index.js";
import FristenListe, { fristenFuer, terminText } from "../../../components/Fakten/FristenListe.js";
import BestandteileTabelle, { bestandteileFuer, TEXT_OFFEN, erwarteteVeroeffentlichung } from "../../../components/Fakten/BestandteileTabelle.js";

const NEU = [...TERMINE_2026, ...UMLAGEN_2027, ...NETZENTGELTE_2027];
const TERMINE = NEU.filter((f) => f.id.startsWith("termin."));
const BESTANDTEILE = NEU.filter((f) => f.id.startsWith("umlage.") || f.id.startsWith("netzentgelt."));
const HEUTE = "2026-10-03";
const render = (Komponente, props) => renderToStaticMarkup(createElement(Komponente, props));

// ---- (a) Vertrag ---------------------------------------------------------------------------
test("(a) alle neuen Einträge bestehen faktValidieren() ohne Fehler", () => {
  assert.ok(NEU.length >= 12, `nur ${NEU.length} Einträge`);
  for (const f of NEU) {
    const v = faktValidieren(f);
    assert.deepEqual(v.fehler, [], `${f.id}: ${v.fehler.join("; ")}`);
  }
});

test("(a) 0 Einträge ohne Quelle (Titel und https-URL) oder Abrufdatum", () => {
  const ohne = NEU.filter((f) => !f.quelle?.titel?.trim() || !/^https:\/\//.test(f.quelle?.url || "") || !istIsoDatum(f.abruf));
  assert.deepEqual(ohne.map((f) => f.id), []);
});

test("(a) alle Einträge sind im Register und das Register ist heute grün", () => {
  const imRegister = new Set(alleFakten().map((f) => `${f.id}|${f.land}|${f.gueltigAb || ""}`));
  for (const f of NEU) assert.ok(imRegister.has(`${f.id}|${f.land}|${f.gueltigAb || ""}`), `${f.id} fehlt im Register`);
  const bericht = pruefeFakten(alleFakten(), { heute: HEUTE });
  assert.equal(bericht.urteil, "GRÜN", JSON.stringify(bericht.abgelaufenA));
});

test("(a) Termine: Klasse A, einheit Termin, gueltigBis = Ende, Pflichtangaben im Wert", () => {
  assert.ok(TERMINE.length >= 8);
  for (const f of TERMINE) {
    assert.equal(f.klasse, "A", f.id);
    assert.equal(f.einheit, "Termin", f.id);
    assert.ok(istIsoDatum(f.gueltigBis), `${f.id}: gueltigBis fehlt`);
    assert.equal(f.gueltigBis, f.wert.ende, `${f.id}: gueltigBis ≠ wert.ende`);
    assert.ok(["zeitraum", "stichtag", "erwartet"].includes(f.wert.art), f.id);
    if (f.wert.art === "zeitraum") assert.ok(istIsoDatum(f.wert.beginn) && f.wert.beginn <= f.wert.ende, f.id);
    assert.ok(f.wert.titel && f.wert.text, `${f.id}: titel/text fehlt`);
    if (f.wert.endeZeitpunkt) {
      const t = Date.parse(f.wert.endeZeitpunkt);
      assert.ok(Number.isFinite(t), f.id);
      // Ende-Zeitpunkt = Beginn des Folgetags in Ortszeit → liegt nach dem letzten Tag
      assert.ok(t > Date.parse(`${f.wert.ende}T00:00:00Z`), f.id);
    }
  }
});

test("(a) die im Auftrag genannten Termine sind mit den Originaldaten erfasst", () => {
  const w = (id, land) => fakt(id, land)?.wert;
  assert.deepEqual([w("termin.eag.investitionszuschussCall3", "AT").beginn, w("termin.eag.investitionszuschussCall3", "AT").ende], ["2026-10-08", "2026-10-22"]);
  assert.deepEqual([w("termin.pronovo.auktionRunde4", "CH").beginn, w("termin.pronovo.auktionRunde4", "CH").ende], ["2026-10-18", "2026-11-01"]);
  assert.equal(w("termin.ch.marktzugangMitteilung", "CH").ende, "2026-10-31");
  assert.equal(w("termin.umlagen.veroeffentlichung2027", "DE").ende, "2026-10-25");
  assert.equal(w("termin.netzentgelte.de.vorlaeufig2027", "DE").ende, "2026-10-15");
  assert.equal(w("termin.eeg.gebotsterminSolar1", "DE").ende, "2026-12-01");
});

test("(a) CH-Einträge ohne ß (CH-Schreibung)", () => {
  for (const f of NEU.filter((x) => x.land === "CH")) assert.doesNotMatch(JSON.stringify(f), /ß/, f.id);
});

test("(a) geprueft nur mit Prüfer und Primärquelle; offene Zweitprüfung als TODO-E6 benannt", () => {
  for (const f of NEU) {
    assert.match(f.pruefer, /TODO-E6/, `${f.id}: Zweitprüfung nicht als TODO-E6 markiert`);
    if (f.status === "geprueft") assert.ok(f.quelle.url && f.quelle.art !== "eigen", f.id);
  }
});

// ---- (d) Umlagen und Netzentgelte ----------------------------------------------------------
test("(d) kein Umlagen- oder Netzentgeltwert ohne Primärquelle", () => {
  for (const f of BESTANDTEILE) {
    assert.match(f.quelle.url || "", /^https:\/\//, `${f.id}: keine URL`);
    assert.notEqual(f.quelle.art, "eigen", `${f.id}: eigene Einschätzung`);
    assert.notEqual(f.quelle.art, "sekundaer", `${f.id}: Sekundärquelle`);
  }
});

test("(d) offene Werte: wert null, status zu_pruefen, Hinweis „Veröffentlichung erwartet bis TT.MM.JJJJ“", () => {
  const offen = BESTANDTEILE.filter((f) => f.wert === null);
  assert.ok(offen.length >= 4, "Umlagen 2027 und SNE 2027 müssen offen sein");
  for (const f of offen) {
    assert.equal(f.status, "zu_pruefen", f.id);
    assert.ok(erwarteteVeroeffentlichung(f), `${f.id}: Hinweis fehlt`);
  }
  // Umlagen 2027: noch keine Werte veröffentlicht (Stand 03.10.2026) → alle drei offen, Termin laut Quelle 25.10.
  for (const id of ["umlage.kwkg", "umlage.offshoreNetz", "umlage.besondereNetznutzung"]) {
    const f = UMLAGEN_2027.find((x) => x.id === id);
    assert.equal(f.wert, null, id);
    assert.equal(f.gueltigAb, "2027-01-01", id);
    assert.equal(erwarteteVeroeffentlichung(f), "25.10.2026", id);
  }
});

test("(d) Zahlenwerte bei Umlagen/Netzentgelten nur mit status geprueft oder zu_pruefen und Prüfer", () => {
  for (const f of BESTANDTEILE.filter((x) => typeof x.wert === "number")) {
    assert.ok(["geprueft", "zu_pruefen"].includes(f.status), f.id);
    assert.ok(f.pruefer.trim(), f.id);
  }
});

test("(d) Stop-Liste: keine VNB-Preisblätter DE, kein AT-Wert, CH nur Verweis", () => {
  assert.equal(BESTANDTEILE.filter((f) => f.land === "DE" && f.id.startsWith("netzentgelt.") && typeof f.wert === "number").length, 0);
  assert.equal(BESTANDTEILE.find((f) => f.id === "netzentgelt.at.sne2027").wert, null);
  const ch = BESTANDTEILE.filter((f) => f.land === "CH");
  assert.ok(ch.every((f) => typeof f.wert === "string" && f.status === "zu_pruefen"));
});

// ---- (c) FristenListe ----------------------------------------------------------------------
const testTermin = (id, ende, extra = {}) => ({
  id,
  wert: { art: "stichtag", beginn: null, ende, titel: `Titel ${id}`, text: `Text **${id}**` },
  einheit: "Termin",
  land: "DE",
  quelle: { titel: `Quelle ${id}`, url: "https://example.org/quelle" },
  abruf: "2026-10-01",
  gueltigAb: null,
  gueltigBis: ende,
  status: "geprueft",
  pruefer: "Test · Zweitprüfung TODO-E6",
  klasse: "A",
  ...extra,
});

test("(c) ein Eintrag mit gueltigBis in der Vergangenheit wird von FristenListe nicht ausgegeben", () => {
  const liste = [testTermin("termin.test.abgelaufen", "2026-09-30"), testTermin("termin.test.offen", "2026-12-01")];
  const html = render(FristenListe, { land: "DE", heute: HEUTE, liste });
  assert.doesNotMatch(html, /termin\.test\.abgelaufen/);
  assert.match(html, /termin\.test\.offen/);
  assert.deepEqual(fristenFuer("DE", { heute: HEUTE, liste }).map((f) => f.id), ["termin.test.offen"]);
  // nur noch abgelaufene → Leerzustand, kein abgelaufener Inhalt
  const leer = render(FristenListe, { land: "DE", heute: "2026-12-02", liste });
  assert.match(leer, /data-fristen-leer/);
  assert.doesNotMatch(leer, /Titel termin\.test/);
});

test("(c) am letzten Tag erscheint der Eintrag noch, am Folgetag nicht mehr (echtes Register)", () => {
  const am = fristenFuer("AT", { heute: "2026-10-22" }).map((f) => f.id);
  const nach = fristenFuer("AT", { heute: "2026-10-23" }).map((f) => f.id);
  assert.ok(am.includes("termin.eag.investitionszuschussCall3"));
  assert.ok(!nach.includes("termin.eag.investitionszuschussCall3"));
});

test("FristenListe: Entwürfe und fremde Länder erscheinen nicht, DACH schon; sortiert nach Datum", () => {
  const liste = [
    testTermin("termin.test.spaet", "2026-12-24"),
    testTermin("termin.test.frueh", "2026-11-01"),
    testTermin("termin.test.entwurf", "2026-11-15", { status: "entwurf" }),
    testTermin("termin.test.at", "2026-11-15", { land: "AT" }),
    testTermin("termin.test.dach", "2026-11-20", { land: "DACH" }),
  ];
  assert.deepEqual(fristenFuer("DE", { heute: HEUTE, liste }).map((f) => f.id), ["termin.test.frueh", "termin.test.dach", "termin.test.spaet"]);
});

test("FristenListe zeigt Stand, Quelle mit Abrufdatum und Ablauf – ohne Countdown", () => {
  const html = render(FristenListe, { land: "CH", heute: HEUTE });
  assert.match(html, /Stand 03\.10\.2026/);
  assert.match(html, /abgerufen 03\.10\.2026/);
  assert.match(html, /Eintrag gilt bis 01\.11\.2026/);
  assert.match(html, /href="https:\/\/pronovo\.ch\//);
  assert.match(html, /18\. Oktober bis 1\. November 2026/);
  assert.doesNotMatch(html, /noch \d+ Tag|Tage? übrig|nur noch|Countdown|läuft ab in/i);
  assert.doesNotMatch(html, /ß/);
});

test("terminText: Zeitraum, Stichtag, erwartet", () => {
  assert.equal(terminText({ art: "zeitraum", beginn: "2026-10-08", ende: "2026-10-22" }), "8. bis 22. Oktober 2026");
  assert.equal(terminText({ art: "zeitraum", beginn: "2026-10-18", ende: "2026-11-01" }), "18. Oktober bis 1. November 2026");
  assert.equal(terminText({ art: "zeitraum", beginn: "2026-12-18", ende: "2027-01-08" }), "18. Dezember 2026 bis 8. Januar 2027");
  assert.equal(terminText({ art: "stichtag", ende: "2026-12-01" }), "1. Dezember 2026");
  assert.equal(terminText({ art: "erwartet", ende: "2026-12-31" }), "erwartet bis 31. Dezember 2026");
});

// ---- BestandteileTabelle -------------------------------------------------------------------
test("BestandteileTabelle: offener Wert erscheint als „noch nicht veröffentlicht“ mit erwartetem Termin", () => {
  const html = render(BestandteileTabelle, { land: "DE", heute: HEUTE });
  assert.match(html, /KWKG-Umlage/);
  assert.match(html, new RegExp(TEXT_OFFEN));
  assert.match(html, /Veröffentlichung erwartet bis 25\.10\.2026/);
  assert.match(html, /01\.01\.2027 bis 31\.12\.2027/);
  // Offene Zeilen (2027) ohne Zahl; die geprüften Werte 2026 (Paket B5, gültig bis 31.12.2026) stehen daneben mit Wert
  const offen = html.split("<tr").filter((z) => z.includes("data-fakt-offen"));
  assert.ok(offen.length >= 3);
  for (const z of offen) assert.doesNotMatch(z, /\d+,\d+\s*ct\/kWh/, "kein Schätzwert für offene Umlagen");
});

test("BestandteileTabelle: abgelaufene Einträge erscheinen nicht; Länder getrennt", () => {
  const liste = [
    { ...UMLAGEN_2027[0], id: "umlage.test.alt", gueltigAb: "2025-01-01", gueltigBis: "2025-12-31" },
    { ...UMLAGEN_2027[0], id: "umlage.test.neu" },
  ];
  assert.deepEqual(bestandteileFuer("DE", { heute: HEUTE, liste }).map((f) => f.id), ["umlage.test.neu"]);
  assert.deepEqual(bestandteileFuer("AT", { heute: HEUTE, liste }), []);
  const ch = render(BestandteileTabelle, { land: "CH", heute: HEUTE });
  assert.match(ch, /strompreis\.elcom\.admin\.ch/);
  assert.doesNotMatch(ch, /KWKG/);
});
