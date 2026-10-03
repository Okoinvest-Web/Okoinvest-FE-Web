// Tests Börsen-Sichtbarkeit (Paket D):  node --test src/lib/boerse/sichtbarkeit.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { boersePill, istDemoAnsicht, istEigenprojekt, istOeffentlichSichtbar, istTestprojekt, sichtbareProjekte } from "./sichtbarkeit.js";

// Titel wie im lokalen Datenbestand (.data/plattform.json, Stand 03.10.2026)
const TEST = [
  { titel: "Zweites Testprojekt 12 MWp muplnwws", region: "Oberbayern (Test)" },
  { titel: "KYC-Testprojekt 6 MWp mupks6x2", region: "Schwaben (Test)" },
  { titel: "BO-Schleife 5 MWp mupixir8", region: "Schwaben (Test)" },
  { titel: "Werkzeugtest A 5 MWp mupj25q6", region: "Schwaben" },
  { titel: "Freiflächen-PV 18 MWp Süddeutschland (KI-Test mupkq4d2)", region: "Schwaben" },
  { titel: "Solarpark", region: "Bayern", test: true },
  { titel: "Solarpark", region: "Bayern", slug: "pf-test-muplb4qy-x1" },
];
const DEMO = { titel: "Freiflächen-PV 24 MWp in Niederbayern", region: "Niederbayern", demo: true };
const ECHT = { titel: "Agri-PV 8,5 MWp in Oberschwaben", region: "Oberschwaben" };

test("Testdatensätze werden erkannt", () => {
  for (const p of TEST) assert.equal(istTestprojekt(p), true, p.titel);
  assert.equal(istTestprojekt(ECHT), false);
  assert.equal(istTestprojekt(DEMO), false);
  assert.equal(istTestprojekt(null), false);
});

test("ohne Demo-Modus: 0 Test- und 0 Demo-Projekte", () => {
  const liste = sichtbareProjekte([...TEST, DEMO, ECHT], { demo: false });
  assert.deepEqual(liste, [ECHT]);
});

test("im Demo-Modus: Demo-Projekte ja, Testprojekte nie", () => {
  const liste = sichtbareProjekte([...TEST, DEMO, ECHT], { demo: true });
  assert.deepEqual(liste, [DEMO, ECHT]);
  assert.equal(istOeffentlichSichtbar(TEST[0], { demo: true }), false);
});

test("„Live“ nur ohne Demo und mit echten Projekten, Zahl aus gefilterter Liste", () => {
  assert.equal(boersePill([...TEST, DEMO], { demo: true }).marke, "Demo");
  assert.equal(boersePill([...TEST], { demo: false }).marke, "DACH");
  const live = boersePill([...TEST, DEMO, ECHT], { demo: false });
  assert.equal(live.marke, "Live");
  assert.match(live.text, /^1 Projekt /);
});

test("Demo-Ansicht: Backend-Name oder Flag aus den Börsendaten", () => {
  assert.equal(istDemoAnsicht({ backendDemo: true }), true);
  assert.equal(istDemoAnsicht({ daten: { demo: true } }), true);
  assert.equal(istDemoAnsicht({ backendDemo: false, daten: { demo: false } }), false);
  assert.equal(istDemoAnsicht(), false);
});

test("Eigenprojekt nur bei ausdrücklichem Flag", () => {
  assert.equal(istEigenprojekt({ eigenprojekt: true }), true);
  assert.equal(istEigenprojekt({ eigenprojekt: "ja" }), false);
  assert.equal(istEigenprojekt(ECHT), false);
});

test("leere oder ungültige Eingaben", () => {
  assert.deepEqual(sichtbareProjekte(undefined), []);
  assert.deepEqual(sichtbareProjekte([null]), []);
});
