// Welle 4, Paket NETZ2: Ablauf-Begleiter Netzanschluss (DE/AT/CH).
//   node --import ./test/hilfen/registrieren.mjs --test src/lib/rechner/netzanschlussAblauf.test.mjs

import test from "node:test";
import assert from "node:assert/strict";
import { ABLAUF, ABLAUF_LAENDER, rechneAblauf, schrittIds, selbsttest } from "./netzanschlussAblauf.js";
import { FREIFLAECHE } from "../invest/markt.js";

test("Selbsttest ohne Fehler", () => {
  assert.deepEqual(selbsttest().fehler, []);
});

test("Jedes Land: Schritte mit Dokumenten-Checkliste, Ablehnungsgründe mit Hilfe, zweisprachig", () => {
  for (const land of ABLAUF_LAENDER) {
    const a = ABLAUF[land];
    assert.ok(a.schritte.length >= 5, `${land}: Schritte`);
    for (const s of a.schritte) {
      assert.ok(s.dokumente.length >= 2, `${s.id}: Dokumente`);
      for (const doc of s.dokumente) {
        assert.ok(doc.de.length > 5 && doc.en.length > 5, `${s.id}: Dokument de+en`);
      }
    }
    for (const abl of a.ablehnungen) {
      assert.ok(abl.grund && abl.hilfe && abl.grundEn && abl.hilfeEn, `${land}: Ablehnung vollständig`);
    }
  }
});

test("Fristen: DE nur die belegte Prüffrist (§ 8 Abs. 6 EEG), AT/CH ohne Zahlen mit offenem Hinweis", () => {
  const w = FREIFLAECHE.netz.pruefWochen;
  const deFristen = ABLAUF.de.schritte.filter((s) => s.frist);
  assert.ok(deFristen.some((s) => s.frist.de.includes(`${w} Wochen`)), "DE: Prüffrist aus markt.js");
  // keine anderen Zahlen-Fristen in DE als die belegte Wochenfrist
  for (const s of deFristen) {
    const zahlen = s.frist.de.match(/\d+/g) || [];
    for (const z of zahlen) assert.ok([String(w), "8", "5", "6"].includes(z), `DE ${s.id}: nur belegte Zahlen in der Frist (${z})`);
  }
  for (const land of ["at", "ch"]) {
    assert.ok(ABLAUF[land].schritte.every((s) => !s.frist), `${land}: keine Fristangaben`);
    assert.ok(ABLAUF[land].fristHinweis.length > 40, `${land}: offener Hinweis statt Zahlen`);
    assert.ok(rechneAblauf({ land }).fristHinweis, `${land}: Hinweis im Ergebnis`);
  }
});

test("Statuslogik: aktiv ist der erste offene Schritt, ungültige IDs zählen nicht", () => {
  const ids = schrittIds("de");
  const r = rechneAblauf({ land: "de", erledigt: [ids[0], ids[2], "kaputt", 7] });
  assert.equal(r.anzahlErledigt, 2);
  assert.equal(r.schritte[0].status, "erledigt");
  assert.equal(r.schritte[1].status, "aktiv");
  assert.equal(r.schritte[2].status, "erledigt");
  assert.equal(r.schritte[3].status, "offen");
  assert.equal(r.naechster.id, ids[1]);
  assert.ok(!r.fertig);
  const voll = rechneAblauf({ land: "de", erledigt: ids });
  assert.ok(voll.fertig && voll.fortschritt === 1 && voll.naechster === null);
});

test("Robust gegen kaputte Eingaben", () => {
  assert.equal(rechneAblauf().land, "de");
  assert.equal(rechneAblauf({ land: "xx", erledigt: null }).land, "de");
  assert.equal(rechneAblauf({ land: "at", erledigt: "de-begehren" }).anzahlErledigt, 0);
  assert.equal(rechneAblauf({ land: "at", erledigt: ["de-begehren"] }).anzahlErledigt, 0, "fremdes Land zählt nicht");
});
