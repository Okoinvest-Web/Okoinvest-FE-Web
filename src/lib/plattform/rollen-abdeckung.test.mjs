// Tests der Rollen-Abdeckung (Plattform-Armee, Paket ROLLEN):  node --test src/lib/plattform/rollen-abdeckung.test.mjs
// Sichert ab, dass jede Rolle (auch die nur per Einladung vergebenen: gutachter, lieferant, bank)
// ein Label hat und jeder Anfragetyp zu einer gültigen Rolle führt – Grundlage der Portal-Übersicht je Rolle.
import test from "node:test";
import assert from "node:assert/strict";
import {
  ROLLEN,
  ROLLEN_IDS,
  ROLLE_GUTACHTER,
  ROLLE_LIEFERANT,
  ROLLE_BANK,
  ROLLE_FUER_TYP,
  VORGANG_TYP_IDS,
  rolleLabel,
} from "./konstanten.js";

const EXTERNE = [ROLLE_GUTACHTER.id, ROLLE_LIEFERANT.id, ROLLE_BANK.id];

test("Jede wählbare Rolle hat Label, Kurzform und Beschreibung", () => {
  for (const r of ROLLEN) {
    assert.ok(r.label && r.kurz && r.text, `Rolle ${r.id} unvollständig`);
  }
});

test("rolleLabel liefert für jede Rolle (inkl. extern und admin) einen sprechenden Namen", () => {
  for (const id of [...ROLLEN_IDS, ...EXTERNE, "admin"]) {
    const label = rolleLabel(id);
    assert.ok(label && label !== id, `rolleLabel(${id}) fehlt – die Rolle erschiene im Portal nur als Kennung`);
  }
});

test("Jeder Anfragetyp führt zu einer gültigen, wählbaren Rolle (Registrierung nach Anfrage)", () => {
  for (const typ of VORGANG_TYP_IDS) {
    const rolle = ROLLE_FUER_TYP[typ];
    assert.ok(rolle, `Anfragetyp ${typ} ohne Rollen-Zuordnung`);
    assert.ok(ROLLEN_IDS.includes(rolle), `Anfragetyp ${typ} zeigt auf unbekannte Rolle ${rolle}`);
  }
});

test("Externe Rollen sind nicht selbst wählbar (nicht in ROLLEN)", () => {
  for (const id of EXTERNE) {
    assert.ok(!ROLLEN_IDS.includes(id), `${id} darf nicht frei wählbar sein (nur per Einladung)`);
  }
});
