// Tests Paket B: PII-Schwärzung vor dem KI-Aufruf und KI-Triage-Schalter (src/lib/plattform/ki/kontext.js).
// Prüft den tatsächlichen Anfragekörper an die Claude API (fetch abgefangen, kein Netzverkehr).
//   node --import ./src/lib/ereignis/tests/registrieren.mjs --test src/lib/ereignis/tests/
import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

import { kontextTriage, kontextNachricht, kontextFlaeche, schwaerzen, kiTriageFreigegeben } from "../../plattform/ki/kontext.js";
import * as P from "../../plattform/ki/prompts.js";
import { erstellen } from "../../plattform/ki/client.js";

const MAIL = "max.mustermann@beispiel-hof.at";
const TEL1 = "+43 664 1234567";
const TEL2 = "0171/2345678";
const TEL3 = "Tel. 664 123 4567";
const IBAN = "AT61 1904 3002 3457 3201";
const FREITEXT = `Bitte rufen Sie mich an: ${TEL1} oder ${TEL2}, ${TEL3}. Mail: ${MAIL}. Konto ${IBAN}. Fläche 12,5 ha, seit 01.10.2026 frei, PLZ 4020.`;

const admin = { id: "U-admin", rollen: ["admin"], vorname: "Ada", nachname: "Admin" };
const backend = {
  vorgang: async () => ({
    id: "V-1",
    typ: "flaeche",
    status: "eingegangen",
    erstelltAm: "2026-10-01T08:00:00Z",
    kontakt: { vorname: "Max", nachname: "Mustermann", email: MAIL, telefon: TEL1, plz: "4020", ort: "Linz", land: "AT" },
    daten: { hinweise: FREITEXT, ha: 12.5, email: MAIL, telefon: TEL1 },
  }),
  nachrichten: async () => ({ titel: `Rückfrage ${MAIL}`, nachrichten: [{ am: "2026-10-02T08:00:00Z", text: FREITEXT, vonAdmin: false }] }),
  flaeche: async () => ({ id: "F-1", status: "abgelehnt", land: "AT", ha: 3, bezeichnung: `Acker ${TEL2}`, ablehnGrund: `Rückfragen an ${MAIL}`, statusVerlauf: [{ status: "eingegangen", am: "2026-10-01", kommentar: FREITEXT }], checkliste: { punkte: [] } }),
};

function enthaeltPii(s) {
  return [MAIL, "1234567", "2345678", "123 4567", "3457 3201", "1904"].filter((x) => s.includes(x));
}

describe("schwaerzen()", () => {
  test("entfernt E-Mail, Telefon, IBAN – lässt Datum, Fläche und PLZ stehen", () => {
    const s = schwaerzen(FREITEXT);
    assert.deepEqual(enthaeltPii(s), [], s);
    assert.match(s, /\[E-Mail entfernt\]/);
    assert.match(s, /\[Telefon entfernt\]/);
    assert.match(s, /\[IBAN entfernt\]/);
    assert.match(s, /12,5 ha/);
    assert.match(s, /01\.10\.2026/);
    assert.match(s, /PLZ 4020/);
  });
});

describe("KI-Aufruf erhält nur geschwärzte Texte", () => {
  const env = { ...process.env };
  const fetchVorher = globalThis.fetch;
  let koerper;
  beforeEach(() => {
    koerper = [];
    process.env.ANTHROPIC_API_KEY = "test-schluessel-ohne-wirkung";
    delete process.env.KI_AUS;
    globalThis.fetch = async (_url, init) => {
      koerper.push(init.body);
      return new Response(JSON.stringify({ content: [{ type: "text", text: "{}" }], stop_reason: "end_turn", usage: {} }), { status: 200, headers: { "content-type": "application/json" } });
    };
  });
  afterEach(() => {
    process.env = { ...env };
    globalThis.fetch = fetchVorher;
  });

  test("Triage ist im KI-Modus standardmäßig gesperrt (Schalter aus)", async () => {
    delete process.env.KI_TRIAGE;
    assert.equal(kiTriageFreigegeben(), false);
    await assert.rejects(() => kontextTriage(backend, admin, { vorgangId: "V-1" }), (e) => e.status === 403 && /abgeschaltet/.test(e.message));
    assert.equal(koerper.length, 0);
  });

  test("Triage ohne KI-Dienst (Regelmodus) bleibt nutzbar", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.KI_TRIAGE;
    const k = await kontextTriage(backend, admin, { vorgangId: "V-1" });
    assert.equal(k.objektId, "V-1");
  });

  test("QM Welle 1: Triage mit KI-Dienst, Schalter aus – Kontext nur für den Regelvorschlag (nurRegel), kein KI-Aufruf", async () => {
    delete process.env.KI_TRIAGE;
    const k = await kontextTriage(backend, admin, { vorgangId: "V-1" }, { nurRegel: true });
    assert.equal(k.objektId, "V-1");
    assert.equal(koerper.length, 0);
  });

  test("Triage mit KI_TRIAGE=an: Anfragekörper an die API enthält keine E-Mail/Telefon/IBAN", async () => {
    process.env.KI_TRIAGE = "an";
    const k = await kontextTriage(backend, admin, { vorgangId: "V-1" });
    await erstellen({ system: [P.BASIS, P.TRIAGE], nachricht: P.nachrichtTriage(k.daten), schema: P.TRIAGE_SCHEMA, effort: "low", maxTokens: 4000 });
    assert.equal(koerper.length, 1);
    assert.deepEqual(enthaeltPii(koerper[0]), [], koerper[0].slice(0, 2000));
    assert.match(koerper[0], /E-Mail entfernt/);
    assert.match(koerper[0], /Telefon entfernt/);
  });

  test("Nachrichten-Entwurf und Flächen-Assistent: ebenfalls geschwärzt", async () => {
    const kn = await kontextNachricht(backend, admin, { bezugArt: "vorgang", bezugId: "V-1" });
    await erstellen({ system: [P.BASIS, P.NACHRICHT], nachricht: P.nachrichtEntwurf(kn.daten, "kurz antworten"), effort: "low", maxTokens: 2000 });
    const kf = await kontextFlaeche(backend, admin, { flaecheId: "F-1" });
    await erstellen({ system: [P.BASIS, P.FLAECHE], nachricht: P.nachrichtFlaeche(kf.daten, ""), effort: "low", maxTokens: 2000 });
    assert.equal(koerper.length, 2);
    for (const b of koerper) assert.deepEqual(enthaeltPii(b), [], b.slice(0, 2000));
  });
});
