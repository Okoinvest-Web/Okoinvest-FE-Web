// Tests für die befristeten Hinweise (Fristenkästen W0-2): node --test src/data/regionen/fristen.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { fristenAT, fristenCH, EAG_CALL_AT } from "./fristen.js";

const VOR_EAG = Date.parse("2026-10-03T12:00:00+02:00");
const LETZTER_EAG_TAG = Date.parse("2026-10-22T23:59:00+02:00");
const NACH_EAG = Date.parse("2026-10-23T00:00:00+02:00");

test("EAG-Call erscheint bis einschließlich 22.10.2026 und danach nicht mehr", () => {
  assert.equal(fristenAT(VOR_EAG).length, 1);
  assert.equal(fristenAT(LETZTER_EAG_TAG).length, 1);
  assert.deepEqual(fristenAT(NACH_EAG), []);
});

test("Pronovo-Runde 4/2026 erscheint bis einschließlich 01.11.2026 und danach nicht mehr", () => {
  assert.equal(fristenCH(Date.parse("2026-11-01T23:59:00+01:00")).length, 1);
  assert.deepEqual(fristenCH(Date.parse("2026-11-02T00:00:00+01:00")), []);
});

test("Einträge haben das Format von recht[] mit Quelle (https)", () => {
  for (const e of [...fristenAT(VOR_EAG), ...fristenCH(VOR_EAG)]) {
    assert.equal(typeof e.titel, "string");
    assert.equal(typeof e.text, "string");
    assert.match(e.quelle.url, /^https:\/\//);
    assert.ok(e.quelle.titel.length > 0);
  }
});

test("Daten im Text stimmen mit den geprüften Originalangaben überein", () => {
  const [eag] = fristenAT(VOR_EAG);
  assert.match(eag.text, /8\. Oktober 2026/);
  assert.match(eag.text, /22\. Oktober 2026/);
  assert.equal(EAG_CALL_AT.ende, NACH_EAG);
  const [pronovo] = fristenCH(VOR_EAG);
  assert.match(pronovo.text, /18\. Oktober bis und mit 1\. November 2026/);
  assert.match(pronovo.text, /CHF 620\/kW/);
});

test("CH-Text ohne ß", () => {
  for (const e of fristenCH(VOR_EAG)) assert.doesNotMatch(`${e.titel} ${e.text}`, /ß/);
});

// ---- Welle 2 (Paket FRI): fristen.js ist Fassade über das Faktenregister ---------------------
// Vergleich mit dem Stand VOR der Umstellung (Literal aus Welle 0, wörtlich übernommen):
// Exporte und Ausgaben müssen bis zum jeweiligen Ablauf identisch sein.
import { MARKTZUGANG_CH } from "./fristen.js";

const ALT_EAG_CALL_AT = {
  ende: Date.parse("2026-10-23T00:00:00+02:00"),
  eintrag: {
    titel: "Frist: 3. EAG-Fördercall 2026 (8. bis 22. Oktober)",
    text: "Der 3. Fördercall 2026 für Investitionszuschüsse zu PV-Anlagen startet am **8. Oktober 2026 um 17 Uhr** mit der Ticketziehung; eingereicht wird vom 9. Oktober (8 Uhr) bis **22. Oktober 2026**. Ein Ticket allein ist noch kein Förderantrag. Das EAG-Portal ist vom 7. Oktober (17 Uhr) bis 9. Oktober (8 Uhr) wegen Wartung nicht erreichbar.",
    quelle: {
      titel: "EAG-Abwicklungsstelle – 3. Fördercall für Photovoltaikanlagen läuft von 8. bis 22. Oktober 2026 (18.09.2026)",
      url: "https://www.eag-abwicklungsstelle.at/artikel/3-foerdercall-fuer-photovoltaikanlagen-laeuft-von-8-bis-22-oktober-2026/",
    },
  },
};
const ALT_PRONOVO = {
  ende: Date.parse("2026-11-02T00:00:00+01:00"),
  eintrag: {
    titel: "Frist: Pronovo-Auktionsrunde 4/2026 (18. Oktober bis 1. November)",
    text: "Gebote für die vierte PV-Auktionsrunde 2026 können vom **18. Oktober bis und mit 1. November 2026** eingereicht werden. Ausgeschrieben sind 50 MW für die hohe Einmalvergütung (HEIV, Höchstgebot CHF 620/kW) und 10 MW für die gleitende Marktprämie (Höchstgebot 10 Rp./kWh). Gebote lassen sich vorab im Pronovo-Kundenportal erfassen; die Teilnahmegebühr beträgt CHF 300 je Gebot.",
    quelle: { titel: "Pronovo – PV-Auktionen (Runde 4/2026)", url: "https://pronovo.ch/de/foerderung/photovoltaik/auktionen/" },
  },
};
const altGueltig = (liste, jetzt) => liste.filter((f) => jetzt < f.ende).map((f) => f.eintrag);
const altAT = (jetzt) => altGueltig([ALT_EAG_CALL_AT], jetzt);
const altCH = (jetzt) => altGueltig([ALT_PRONOVO], jetzt);

test("FRI: EAG_CALL_AT ist identisch zum Stand vor der Umstellung", () => {
  assert.deepEqual(EAG_CALL_AT, ALT_EAG_CALL_AT);
});

test("FRI: fristenAT/fristenCH liefern bis zum Ablauf und danach dasselbe wie vorher (stündlich geprüft)", () => {
  const start = Date.parse("2026-10-01T00:00:00+02:00");
  const stopp = Date.parse("2026-11-03T00:00:00+01:00");
  let geprueft = 0;
  for (let t = start; t <= stopp; t += 3600 * 1000) {
    assert.deepEqual(fristenAT(t), altAT(t), `fristenAT bei ${new Date(t).toISOString()}`);
    assert.deepEqual(fristenCH(t), altCH(t), `fristenCH bei ${new Date(t).toISOString()}`);
    geprueft++;
  }
  assert.ok(geprueft > 700);
  // genau an den Grenzen
  for (const t of [ALT_EAG_CALL_AT.ende - 1, ALT_EAG_CALL_AT.ende, ALT_PRONOVO.ende - 1, ALT_PRONOVO.ende]) {
    assert.deepEqual(fristenAT(t), altAT(t));
    assert.deepEqual(fristenCH(t), altCH(t));
  }
});

test("FRI: Standardaufruf ohne Datum entspricht dem Stand vorher", () => {
  const jetzt = Date.now();
  assert.deepEqual(fristenAT(), altAT(jetzt));
  assert.deepEqual(fristenCH(), altCH(jetzt));
});

test("FRI: Marktzugang CH (neu) hat das Fassadenformat, endet nach dem 31.10.2026 und ist ohne ß", () => {
  assert.equal(MARKTZUGANG_CH.ende, Date.parse("2026-11-01T00:00:00+01:00"));
  assert.match(MARKTZUGANG_CH.eintrag.text, /31\. Oktober 2026/);
  assert.match(MARKTZUGANG_CH.eintrag.quelle.url, /^https:\/\/www\.fedlex\.admin\.ch\//);
  assert.doesNotMatch(`${MARKTZUGANG_CH.eintrag.titel} ${MARKTZUGANG_CH.eintrag.text}`, /ß/);
});
