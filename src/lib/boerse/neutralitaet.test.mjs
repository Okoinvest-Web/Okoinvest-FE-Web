// Tests: Neutralität der Projektbörse (Welle 3, Paket B10) – Badges nur nach Kriterium, Recht je Land getrennt.
import { test } from "node:test";
import assert from "node:assert/strict";
import { BADGES, BADGE_REIHENFOLGE, RECHTSRAHMEN, anteilFremdinserate, badgeText, badgesFuer, rechtsrahmenFuer } from "./neutralitaet.js";

test("ohne ausdrückliche Angaben gibt es keine Badges", () => {
  assert.deepEqual(badgesFuer({ titel: "Solarpark", typ: "freiflaeche" }), []);
  assert.deepEqual(badgesFuer(null), []);
  assert.deepEqual(badgesFuer("x"), []);
  // Wahrheitsähnliche Werte zählen nicht – nur echte Booleans
  assert.deepEqual(badgesFuer({ eigenprojekt: "true", unterlagenVorgeprueft: 1 }), []);
  assert.deepEqual(badgesFuer({ eigenprojekt: 0 }), []);
});

test("Gruppenprojekt und Fremdinserat schließen sich aus", () => {
  assert.deepEqual(badgesFuer({ eigenprojekt: true }), ["gruppenprojekt"]);
  assert.deepEqual(badgesFuer({ eigenprojekt: false }), ["fremdinserat"]);
});

test("„Gruppe interessiert“ nur bei Fremdinseraten", () => {
  assert.deepEqual(badgesFuer({ eigenprojekt: false, gruppeBeteiligt: true }), ["fremdinserat", "gruppeBeteiligt"]);
  assert.deepEqual(badgesFuer({ eigenprojekt: true, gruppeBeteiligt: true }), ["gruppenprojekt"]);
  assert.deepEqual(badgesFuer({ gruppeBeteiligt: true }), []);
});

test("Unterlagen vorgeprüft nur mit Backoffice-Flag, Reihenfolge fest", () => {
  assert.deepEqual(badgesFuer({ unterlagenVorgeprueft: true }), ["vorgeprueft"]);
  assert.deepEqual(badgesFuer({ unterlagenVorgeprueft: true, eigenprojekt: false, gruppeBeteiligt: true }), ["fremdinserat", "gruppeBeteiligt", "vorgeprueft"]);
});

test("jedes Badge hat Text und Kriterium in DE und EN; kein „geprüft“ ohne „vor“", () => {
  for (const id of BADGE_REIHENFOLGE) {
    for (const s of ["de", "en"]) {
      const t = badgeText(id, s);
      assert.ok(t.label && t.kriterium, `${id} ${s}`);
    }
    // § 5 UWG: Das Backoffice prüft nur Vollständigkeit/Plausibilität – nie bloß „geprüft“
    assert.doesNotMatch(BADGES[id].de.label, /(^|\s)geprüft/i, id);
  }
  assert.match(BADGES.vorgeprueft.de.kriterium, /keine Due Diligence/);
  assert.equal(badgeText("unbekannt"), null);
});

test("Anteil Fremdinserate nur über Projekte mit Anbieterangabe", () => {
  assert.equal(anteilFremdinserate([]), null);
  assert.equal(anteilFremdinserate([{ titel: "a" }]), null);
  assert.equal(anteilFremdinserate([{ eigenprojekt: false }, { eigenprojekt: true }, { titel: "ohne" }]), 0.5);
});

test("Rechtsrahmen: Länderfassung zeigt nur ihr Land, gemeinsam alle drei", () => {
  assert.deepEqual(rechtsrahmenFuer("AT").map((r) => r.code), ["AT"]);
  assert.deepEqual(rechtsrahmenFuer("CH", "en").map((r) => r.code), ["CH"]);
  assert.deepEqual(rechtsrahmenFuer(null).map((r) => r.code), ["DE", "AT", "CH"]);
  assert.deepEqual(rechtsrahmenFuer("XX").map((r) => r.code), ["DE", "AT", "CH"]);
});

test("Rechtsrahmen: jedes Land nennt nur sein eigenes Gesetz", () => {
  const gesetz = { DE: /BörsG\b/, AT: /BörseG 2018/, CH: /FinfraG/ };
  for (const code of ["DE", "AT", "CH"]) {
    for (const s of ["de", "en"]) {
      const text = [RECHTSRAHMEN[code][s].gesetz, ...RECHTSRAHMEN[code][s].punkte].join(" ");
      assert.match(text, gesetz[code], `${code} ${s}`);
      for (const andere of Object.keys(gesetz).filter((x) => x !== code)) assert.doesNotMatch(text, gesetz[andere], `${code} ${s} nennt ${andere}`);
    }
  }
  // Schweiz ohne „ß“
  assert.doesNotMatch(JSON.stringify(RECHTSRAHMEN.CH.de), /ß/);
});
