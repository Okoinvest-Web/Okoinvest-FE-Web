// Welle 2, Paket B3: Feiertage DE/AT/CH, SLA in Geschäftsstunden je Land, Median/P90.
//   node --import ./test/hilfen/registrieren.mjs --test src/lib/anfrage/sla.test.mjs

import test from "node:test";
import assert from "node:assert/strict";
import { feiertage, istFeiertag, osterSonntag } from "./feiertage.js";
import { fristBerechnen, geschaeftsMinuten, istGeschaeftstag, kennzahlen, slaAuswerten, slaAuswertung } from "./sla.js";

test("Ostersonntag (bekannte Daten)", () => {
  assert.equal(osterSonntag(2024), "2024-03-31");
  assert.equal(osterSonntag(2025), "2025-04-20");
  assert.equal(osterSonntag(2026), "2026-04-05");
  assert.equal(osterSonntag(2027), "2027-03-28");
  assert.equal(osterSonntag(2038), "2038-04-25");
});

test("Landesweite Feiertage 2026: DE 9, AT 13 (ohne Karfreitag), CH Bundesfeier + zu prüfende", () => {
  const de = feiertage("DE", 2026).map((f) => f.datum);
  assert.deepEqual(de, ["2026-01-01", "2026-04-03", "2026-04-06", "2026-05-01", "2026-05-14", "2026-05-25", "2026-10-03", "2026-12-25", "2026-12-26"]);
  const at = feiertage("AT", 2026);
  assert.equal(at.length, 13);
  assert.ok(at.some((f) => f.datum === "2026-06-04" && f.name === "Fronleichnam"));
  assert.ok(at.some((f) => f.datum === "2026-10-26"));
  assert.ok(!istFeiertag("AT", "2026-04-03"), "Karfreitag in AT kein allgemeiner Feiertag");
  assert.ok(istFeiertag("DE", "2026-04-03"));
  assert.ok(!istFeiertag("DE", "2026-06-04"), "Fronleichnam in DE nur regional (TODO)");
  const ch = feiertage("CH", 2026);
  assert.ok(ch.some((f) => f.datum === "2026-08-01" && f.geltung === "landesweit"));
  assert.ok(ch.filter((f) => f.geltung === "zu_pruefen").length === 3, "kantonal bedingte Tage als zu prüfen markiert");
  assert.deepEqual(feiertage("FR", 2026), []);
});

const z = (iso) => new Date(iso).toISOString();

test("(e) DE: Ostern – Eingang Do 16:30, A-Lead 1 h → Karfreitag, Wochenende, Ostermontag übersprungen → Di 08:30", () => {
  // 2026-04-02 16:30 Europe/Berlin (MESZ, UTC+2) = 14:30Z
  assert.equal(fristBerechnen("2026-04-02T14:30:00Z", "h1", "DE"), z("2026-04-07T06:30:00Z"));
});

test("(e) AT: gleicher Eingang → Karfreitag ist Geschäftstag → Fr 08:30", () => {
  assert.equal(fristBerechnen("2026-04-02T14:30:00Z", "h1", "AT"), z("2026-04-03T06:30:00Z"));
  assert.ok(istGeschaeftstag("AT", "2026-04-03"));
  assert.ok(!istGeschaeftstag("DE", "2026-04-03"));
});

test("(e) CH: Bundesfeier Fr 1.8.2025 – Investor 4 h ab Do 16:00 → Mo 11:00", () => {
  // 2025-07-31 16:00 Europe/Zurich = 14:00Z; 1 h am Do, Fr Feiertag, Sa/So, Mo 08:00 + 3 h = 11:00 = 09:00Z
  assert.equal(fristBerechnen("2025-07-31T14:00:00Z", "h4", "CH"), z("2025-08-04T09:00:00Z"));
  assert.equal(fristBerechnen("2025-07-31T14:00:00Z", "h4", "DE"), z("2025-08-01T09:00:00Z"), "in DE ist der 1.8. ein Werktag");
});

test("(e) Wochenende: 2 Werktage ab Fr 10:00 → Di 10:00 (DE, 3.10.2026 ist ein Samstag)", () => {
  assert.equal(fristBerechnen("2026-10-02T08:00:00Z", "wt2", "DE"), z("2026-10-06T08:00:00Z"));
});

test("(e) AT: Nationalfeiertag Mo 26.10.2026 + Zeitumstellung → 2 Werktage ab Fr 10:00 → Mi 10:00 MEZ", () => {
  // Fr 23.10. 10:00 MESZ = 08:00Z; Mo Feiertag; Di voll; Mi 10:00 MEZ = 09:00Z
  assert.equal(fristBerechnen("2026-10-23T08:00:00Z", "wt2", "AT"), z("2026-10-28T09:00:00Z"));
});

test("(e) Fläche ab 20 ha: am selben Geschäftstag; Eingang in der letzten Stunde, abends, am Wochenende", () => {
  assert.equal(fristBerechnen("2026-10-05T07:00:00Z", "taggleich", "DE"), z("2026-10-05T15:00:00Z"), "Mo 09:00 → Mo 17:00");
  assert.equal(fristBerechnen("2026-10-05T14:30:00Z", "taggleich", "DE"), z("2026-10-06T15:00:00Z"), "Mo 16:30 → Di 17:00");
  assert.equal(fristBerechnen("2026-10-05T19:00:00Z", "taggleich", "DE"), z("2026-10-06T15:00:00Z"), "Mo 21:00 → Di 17:00");
  assert.equal(fristBerechnen("2026-10-10T10:00:00Z", "taggleich", "CH"), z("2026-10-12T15:00:00Z"), "Sa → Mo 17:00");
});

test("Geschäftsminuten zählen nur Geschäftszeit (Wochenende, Feiertag, Nacht)", () => {
  assert.equal(geschaeftsMinuten("2026-10-02T13:00:00Z", "2026-10-05T07:00:00Z", "DE"), 120 + 60, "Fr 15–17 + Mo 8–9");
  assert.equal(geschaeftsMinuten("2026-04-02T14:30:00Z", "2026-04-07T06:45:00Z", "DE"), 30 + 45);
  assert.equal(geschaeftsMinuten("2026-04-02T14:30:00Z", "2026-04-07T06:45:00Z", "AT"), 30 + 540 + 45, "AT: Karfreitag zählt, Ostermontag nicht");
  assert.equal(geschaeftsMinuten("2026-10-05T10:00:00Z", "2026-10-05T09:00:00Z", "DE"), 0);
});

test("slaAuswerten: erledigt, verspätet, offen, fällig, überfällig, unbekannt", () => {
  const eingang = "2026-10-05T07:00:00Z"; // Mo 09:00 Berlin
  const e = slaAuswerten({ eingang, erstkontaktAm: "2026-10-05T07:40:00Z", klasse: "h1", land: "DE" });
  assert.equal(e.status, "erledigt");
  assert.equal(e.geschaeftsMin, 40);
  assert.equal(e.kalenderMin, 40);
  assert.equal(slaAuswerten({ eingang, erstkontaktAm: "2026-10-05T09:00:00Z", klasse: "h1", land: "DE" }).status, "verspaetet");
  assert.equal(slaAuswerten({ eingang, klasse: "h4", land: "DE", jetzt: "2026-10-05T07:30:00Z" }).status, "offen");
  assert.equal(slaAuswerten({ eingang, klasse: "h4", land: "DE", jetzt: "2026-10-05T10:30:00Z" }).status, "faellig");
  const u = slaAuswerten({ eingang, klasse: "h4", land: "DE", jetzt: "2026-10-05T12:00:00Z" });
  assert.equal(u.status, "ueberfaellig");
  assert.equal(u.ueberfaellig, true);
  assert.equal(u.ampel, "rot");
  assert.equal(slaAuswerten({ eingang: "kaputt" }).status, "unbekannt");
});

test("(e) Median und P90 (Nearest-Rank)", () => {
  assert.deepEqual(kennzahlen([]), { anzahl: 0, median: null, p90: null });
  assert.deepEqual(kennzahlen([5]), { anzahl: 1, median: 5, p90: 5 });
  assert.deepEqual(kennzahlen([40, 10, 30, 20]), { anzahl: 4, median: 25, p90: 40 });
  assert.deepEqual(kennzahlen([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]), { anzahl: 10, median: 5.5, p90: 9 });
  assert.deepEqual(kennzahlen([3, null, "x", 1, 2, NaN]), { anzahl: 3, median: 2, p90: 3 });
  const werte = Array.from({ length: 100 }, (_, i) => i + 1);
  assert.equal(kennzahlen(werte).p90, 90);
});

test("(e) Auswertung je Land und Typ", () => {
  const eingang = "2026-10-05T07:00:00Z";
  const leads = [
    { land: "DE", typ: "flaeche", eingang, erstkontaktAm: "2026-10-05T07:30:00Z", klasse: "wt2" },
    { land: "DE", typ: "flaeche", eingang, erstkontaktAm: "2026-10-05T08:30:00Z", klasse: "wt2" },
    { land: "DE", typ: "investor", eingang, erstkontaktAm: "2026-10-05T13:00:00Z", klasse: "h4" },
    { land: "AT", typ: "flaeche", eingang, erstkontaktAm: null, klasse: "h1", ohneZustaendigkeit: true },
  ];
  const r = slaAuswertung(leads, { jetzt: "2026-10-09T12:00:00Z" });
  assert.equal(r.gesamt.anzahl, 4);
  assert.equal(r.jeLand.DE.mitErstkontakt, 3);
  assert.deepEqual([r.jeLand.DE.geschaeftsMin.median, r.jeLand.DE.geschaeftsMin.p90], [90, 360]);
  assert.equal(r.jeLand.DE.inFrist, 2, "Investor nach 6 h > 4 h → verspätet");
  assert.equal(r.jeLand.AT.ueberfaellig, 1);
  assert.equal(r.jeLand.AT.ohneZustaendigkeit, 1);
  assert.equal(r.jeTyp.flaeche.anzahl, 3);
  assert.deepEqual(r.jeLandTyp.map((x) => `${x.land}|${x.typ}`), ["AT|flaeche", "DE|flaeche", "DE|investor"]);
});
