// Tests der Rechte-Matrix (Backoffice-Unterrollen):  node --test src/lib/plattform/rechte.test.mjs
// Plattform-Armee, Paket RECHTE: Invarianten (Least Privilege), API-Pfad-Ableitung, Unterrollen-Logik.
// Der Abgleich JS ↔ Python läuft zusätzlich in Backend-Import (werkzeuge/pruefen.py, tests/test_rechte_kern.py).
import test from "node:test";
import assert from "node:assert/strict";
import {
  BACKOFFICE_ROLLEN_IDS,
  BEREICH_IDS,
  RECHTE_MATRIX,
  apiAnforderungen,
  darfLesen,
  darfSchreiben,
  fehlendeRechte,
  seitenBereich,
  stufe,
  unterrollen,
} from "./rechte.js";

const admin = (...backofficeRollen) => ({ rollen: ["admin"], backofficeRollen });

test("Matrix: jeder Bereich hat eine Stufe 0–2 für jede Unterrolle", () => {
  for (const b of BEREICH_IDS) {
    assert.ok(RECHTE_MATRIX[b], `Bereich ${b} fehlt in der Matrix`);
    for (const r of BACKOFFICE_ROLLEN_IDS) {
      assert.ok([0, 1, 2].includes(RECHTE_MATRIX[b][r]), `Stufe ${b}/${r} ungültig: ${RECHTE_MATRIX[b][r]}`);
    }
  }
});

test("Leitung: überall Vollzugriff außer Compliance-Unterlagen (nur Status, Stufe 1)", () => {
  for (const b of BEREICH_IDS) {
    const soll = b === "compliance" ? 1 : 2;
    assert.equal(RECHTE_MATRIX[b].leitung, soll, `leitung/${b}`);
  }
});

test("Least Privilege: „lesen“ schreibt nirgends; Export und Rechte bleiben gesperrt", () => {
  for (const b of BEREICH_IDS) assert.ok(RECHTE_MATRIX[b].lesen <= 1, `lesen/${b} darf nicht schreiben`);
  assert.equal(RECHTE_MATRIX.export.lesen, 0, "lesen: kein CSV-Export");
  assert.equal(RECHTE_MATRIX.rechte.lesen, 0, "lesen: keine Rechteverwaltung");
});

test("Rechteverwaltung: nur die Leitung (keine andere Unterrolle, auch nicht lesend)", () => {
  for (const r of BACKOFFICE_ROLLEN_IDS) {
    if (r !== "leitung") assert.equal(RECHTE_MATRIX.rechte[r], 0, `rechte/${r}`);
  }
});

test("Vertrauliche Bereiche eng: Bonität nur Leitung/Transaktion/Compliance, Geodaten nur Leitung/Akquise", () => {
  for (const r of BACKOFFICE_ROLLEN_IDS) {
    if (!["leitung", "transaktion", "compliance"].includes(r)) assert.equal(RECHTE_MATRIX.bonitaet[r], 0, `bonitaet/${r}`);
    if (!["leitung", "akquise"].includes(r)) assert.equal(RECHTE_MATRIX.geodaten[r], 0, `geodaten/${r}`);
  }
});

test("Compliance-Unterlagen (KYC/KYB) schreibt nur die Unterrolle compliance", () => {
  for (const r of BACKOFFICE_ROLLEN_IDS) {
    if (r !== "compliance") assert.ok(RECHTE_MATRIX.compliance[r] <= 1, `compliance/${r}`);
  }
});

test("unterrollen: ohne Angabe leitung, Unbekanntes wird verworfen, Nicht-Admins leer", () => {
  assert.deepEqual(unterrollen({ rollen: ["admin"] }), ["leitung"]);
  assert.deepEqual(unterrollen(admin("akquise", "quatsch", "akquise")), ["akquise"]);
  assert.deepEqual(unterrollen({ rollen: ["investor"], backofficeRollen: ["leitung"] }), []);
  assert.deepEqual(unterrollen(null), []);
});

test("stufe: Maximum über mehrere Unterrollen, unbekannter Bereich fällt auf sonstiges", () => {
  assert.equal(stufe(admin("lesen", "buchhaltung"), "provisionen"), 2);
  assert.equal(stufe(admin("lesen"), "gibt-es-nicht"), RECHTE_MATRIX.sonstiges.lesen);
  assert.ok(darfLesen(admin("lesen"), "vorgaenge"));
  assert.ok(!darfSchreiben(admin("lesen"), "vorgaenge"));
});

test("apiAnforderungen: Pfad → Bereich, Schreiben braucht Stufe 2", () => {
  assert.deepEqual(apiAnforderungen({ pfad: "/api/admin/vorgaenge", methode: "GET" }), [{ bereich: "vorgaenge", stufe: 1 }]);
  assert.deepEqual(apiAnforderungen({ pfad: "/api/admin/vorgaenge/V-1", methode: "PATCH" }), [{ bereich: "vorgaenge", stufe: 2 }]);
  // Lead-Desk und Kanal-Auswertung (Welle 2) sind gemappt – kein Rückfall auf sonstiges
  assert.deepEqual(apiAnforderungen({ pfad: "/api/admin/leads", methode: "GET" }), [{ bereich: "vorgaenge", stufe: 1 }]);
  assert.deepEqual(apiAnforderungen({ pfad: "/api/admin/kanaele", methode: "GET" }), [{ bereich: "berichte", stufe: 1 }]);
  // Unbekannter Teil → sonstiges (Schreiben damit nur Leitung)
  assert.deepEqual(apiAnforderungen({ pfad: "/api/admin/neu-und-unbekannt", methode: "POST" }), [{ bereich: "sonstiges", stufe: 2 }]);
});

test("apiAnforderungen: Status/Zuweisen nach Objektart, Export braucht export + Objektbereich", () => {
  assert.deepEqual(apiAnforderungen({ pfad: "/api/admin/status", methode: "POST", body: { art: "provision" } }), [{ bereich: "provisionen", stufe: 2 }]);
  assert.deepEqual(apiAnforderungen({ pfad: "/api/admin/export/flaechen", methode: "GET" }), [
    { bereich: "export", stufe: 1 },
    { bereich: "flaechen", stufe: 1 },
  ]);
  // explizites recht überschreibt die Pfad-Ableitung
  assert.deepEqual(apiAnforderungen({ pfad: "/api/admin/leads/absage", methode: "POST", recht: "vorgaenge" }), [{ bereich: "vorgaenge", stufe: 2 }]);
});

test("fehlendeRechte: akquise darf Vorgänge schreiben, aber keine Provisionen sehen", () => {
  const n = admin("akquise");
  assert.deepEqual(fehlendeRechte(n, apiAnforderungen({ pfad: "/api/admin/vorgaenge", methode: "POST" })), []);
  assert.equal(fehlendeRechte(n, apiAnforderungen({ pfad: "/api/admin/provisionen", methode: "GET" })).length, 1);
});

test("seitenBereich: Admin-Seiten → Bereich, Akquise-Karte → geodaten, Portalseiten ohne Prüfung", () => {
  assert.equal(seitenBereich("/portal/admin/rechte"), "rechte");
  assert.equal(seitenBereich("/portal/admin/leads"), "vorgaenge");
  assert.equal(seitenBereich("/portal/admin/akquise/karte"), "geodaten");
  assert.equal(seitenBereich("/portal/admin/akquise"), "akquise");
  assert.equal(seitenBereich("/portal/admin/voellig-neu"), "sonstiges");
  assert.equal(seitenBereich("/portal/flaechen"), null);
});
