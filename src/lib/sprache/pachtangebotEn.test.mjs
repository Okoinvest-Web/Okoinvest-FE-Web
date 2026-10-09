// Englische Texte des Pachtangebot-Checks: jede Klausel aus pruefePachtangebot() bekommt Titel, Wert,
// Text und Frage auf Englisch – für alle Optionen; Zahlen und Ampeln bleiben unverändert.
import { test } from "node:test";
import assert from "node:assert/strict";
import { OPTIONEN, FLAECHENARTEN, MODELLE, INDEXARTEN, pruefePachtangebot } from "../rechner/pachtangebot.js";
import { OPTIONEN_EN, pachtangebotEn } from "./pachtangebotEn.js";

const DEUTSCH = /[äöüß]|\b(und|der|die|das|nicht|Jahre|keine)\b/;

const varianten = [
  {},
  { modell: "umsatz" },
  { modell: "kombi", indexArt: "fest", indexSatz: 0.005 },
  { proHa: 1000, optionsfrist: 0, rueckbau: "keine", kuendigung: "jederzeit", nebenflaechen: "unentgeltlich", nichtbau: "nichts", bewirtschaftung: "nein", dienstbarkeit: "sofortOhne", anwalt: "keine", reservierungProHa: 0 },
  { proHa: 3500, indexArt: "vpi", rueckbau: "buergschaft", rueckbauAb: "spaeter", kuendigung: "befristet", nebenflaechen: "verguetet", nichtbau: "entschaedigung", bewirtschaftung: "mitEntschaedigung", dienstbarkeit: "baubeginn", rangruecktritt: true, anwalt: "voll" },
  { laufzeit: 18, verlaengerungJahre: 0, rueckbau: "ruecklage", optionsfrist: 9, anwalt: "gedeckelt", anwaltBetrag: 250 },
  { laufzeit: 40, verlaengerungJahre: 10, flaechenart: "agri", proHa: 1300, optionsfrist: 6 },
];

test("jede Klausel hat englische Texte, Ampeln und Zahlen bleiben gleich", () => {
  for (const v of varianten) {
    const de = pruefePachtangebot(v);
    const en = pachtangebotEn(de);
    assert.equal(en.klauseln.length, de.klauseln.length);
    en.klauseln.forEach((k, i) => {
      assert.equal(k.ampel, de.klauseln[i].ampel);
      for (const feld of ["titel", "wert", "text", "frage"]) {
        assert.ok(k[feld] && k[feld] !== de.klauseln[i][feld], `${k.id}.${feld} englisch (${JSON.stringify(v)})`);
        assert.doesNotMatch(k[feld], DEUTSCH, `${k.id}.${feld}: ${k[feld]}`);
      }
    });
    assert.equal(en.fragen.length, de.fragen.length);
    assert.equal(en.summe, de.summe);
    assert.notEqual(en.urteil.titel, de.urteil.titel);
  }
});

test("alle Auswahloptionen haben eine englische Beschriftung", () => {
  const gruppen = { ...OPTIONEN, flaechenart: FLAECHENARTEN, modell: MODELLE, indexArt: INDEXARTEN };
  for (const [gruppe, liste] of Object.entries(gruppen)) {
    for (const o of liste) assert.ok(OPTIONEN_EN[gruppe]?.[o.id]?.[0], `${gruppe}.${o.id}`);
  }
});
