// Tests Welle 2, Paket B1 – Länder-Engine marktFuer(land) und Fassade markt.js
import { test } from "node:test";
import assert from "node:assert/strict";
import * as markt from "../invest/markt.js";
import { marktFuer, rechenbasisFuer, annahmenbuch, erloesmodellFuer, alleRegionen, normLand } from "../invest/laender/marktFuer.js";

const BEREICHE = ["FREIFLAECHE", "ZUSCHLAEGE", "ERLOESE", "PACHT", "KOMMUNE", "DACH"];

test("Fassade: markt.js exportiert genau die Werte von marktFuer(\"DE\")", () => {
  const de = marktFuer("DE");
  for (const b of BEREICHE) assert.deepEqual(markt[b], de[b], b);
  assert.deepEqual(markt.QUELLEN, de.QUELLEN);
  assert.deepEqual(markt.REGIONEN, alleRegionen());
  assert.equal(markt.REGIONEN[3].id, "de-sued", "REGIONEN[3] bleibt die Standardregion");
  assert.equal(markt.KOMMUNE.laenderGesetzeStand, "17.07.2026");
  assert.equal(markt.ZUSCHLAEGE.freiflaeche[0].termin, "1. März 2025");
  assert.deepEqual(markt.ERLOESE.zuschlagsHistorie, [
    { termin: "1. März 2025", ct: 4.66 },
    { termin: "1. Juli 2025", ct: 4.84 },
    { termin: "1. Dezember 2025", ct: 5.0 },
  ]);
  assert.equal(markt.AGRI.eagAbschlagAt, 0.25);
});

test("marktFuer(\"DE\"): Euro, keine Sperre, keine Lücken, Erlösmodell EEG", () => {
  const de = marktFuer("DE");
  assert.equal(de.land, "DE");
  assert.equal(de.waehrung, "EUR");
  assert.equal(de.sperre, null);
  assert.deepEqual(de.luecken, []);
  assert.equal(de.erloesmodell.id, "eeg-marktpraemie");
  assert.equal(de.erloesmodell.werte.foerderJahre, 20);
  assert.equal(de.erloesmodell.werte.anteilNegativ, 0.234);
  assert.equal(de.stand, "2026-10-03");
  assert.ok(de.fakten.every((f) => f.land === "DE" || f.land === "DACH"));
});

test("marktFuer(\"AT\"): Euro, gesperrt, eigene Werte, nichts aus Deutschland übernommen", () => {
  const at = marktFuer("AT");
  assert.equal(at.waehrung, "EUR");
  assert.equal(at.sperre?.land, "AT");
  assert.deepEqual(at.PACHT.freiflaecheProHa, { min: 3000, max: 5000 }, "AT-Angebotsspanne (LK Steiermark), nicht die DE-Spanne");
  assert.equal(at.PACHT.ackerProHa, null, "Destatis-Ackerpacht gilt nicht für AT");
  assert.equal(at.FREIFLAECHE.capexProKwp, null);
  assert.equal(at.FREIFLAECHE.haProMwp, 1.1, "Technikwert DACH");
  assert.equal(at.KOMMUNE.beteiligungCt, null, "§ 6 EEG gilt nicht in AT");
  assert.deepEqual(at.ZUSCHLAEGE.freiflaeche, []);
  assert.ok(at.luecken.includes("pacht.ackerProHa"));
  assert.ok(at.fakten.every((f) => f.land === "AT" || f.land === "DACH"), "nur AT- oder DACH-Fakten");
  assert.equal(at.erloesmodell.id, "eag-marktpraemie");
  assert.equal(at.erloesmodell.werte.abschlagLandwirtschaft, 0.25);
  assert.ok(at.erloesmodell.luecken.includes("recht.eag.foerderdauerJahre"), "Förderdauer AT nicht erfunden");
  assert.equal(at.freigabe.bereit, false);
  assert.deepEqual(at.REGIONEN.map((r) => r.id), ["at"]);
});

test("marktFuer(\"CH\"): CHF/Rp., gesperrt, kein CHF-Pachtwert erfunden", () => {
  const ch = marktFuer("CH");
  assert.equal(ch.waehrung, "CHF");
  assert.equal(ch.waehrungInfo.klein, "Rp.");
  assert.equal(ch.sperre?.land, "CH");
  for (const [k, v] of Object.entries(ch.PACHT)) assert.equal(v, null, `PACHT.${k} darf für CH nicht aus DE kommen`);
  assert.ok(ch.fakten.every((f) => f.land === "CH" || f.land === "DACH"));
  assert.equal(ch.erloesmodell.id, "heiv-gmp");
  assert.equal(ch.erloesmodell.werte.gmpHoechstgebotRp, 10);
  assert.equal(ch.erloesmodell.werte.heivHoechstgebotChfKw, 620);
  assert.equal(ch.REGIONEN[0].ertrag, 1130);
  assert.equal(ch.freigabe.bereit, false);
});

test("normLand und Cache", () => {
  assert.equal(marktFuer("ch"), marktFuer("CH"));
  assert.equal(normLand("xx"), "DE");
  assert.equal(marktFuer("xx").land, "DE");
});

test("rechenbasisFuer: Land aus Eingabe, gesperrte Länder rechnen mit DE-Basis und melden die Sperre", () => {
  assert.deepEqual(
    (({ land, rechenbasis, sperre }) => ({ land, rechenbasis, sperre }))(rechenbasisFuer({ regionId: "de-ost" })),
    { land: "DE", rechenbasis: "DE", sperre: null }
  );
  const ch = rechenbasisFuer({ regionId: "ch" });
  assert.equal(ch.land, "CH");
  assert.equal(ch.rechenbasis, "DE");
  assert.equal(ch.sperre.land, "CH");
  assert.equal(ch.markt, marktFuer("DE"));
  assert.equal(ch.landMarkt.waehrung, "CHF");
  assert.equal(rechenbasisFuer({ land: "at", regionId: "de-sued" }).land, "AT", "Land hat Vorrang vor der Region");
  assert.equal(rechenbasisFuer().land, "DE");
});

test("annahmenbuch: je Fakt Wert, Quelle, Stand, Status – abgelaufen nie als aktuell", () => {
  const b = annahmenbuch(["pacht.ackerProHa", "recht.ch.gmp.hoechstgebotRp", "gibt.es.nicht"], { land: "DE" });
  assert.equal(b.waehrung, "EUR");
  assert.equal(b.eintraege[0].wert, 407);
  assert.equal(b.eintraege[0].status, "geprueft");
  assert.ok(b.eintraege[0].quelle.url.startsWith("https://"));
  assert.equal(b.eintraege[1].fehlt, true, "CH-Fakt gehört nicht ins DE-Annahmenbuch");
  assert.equal(b.eintraege[2].fehlt, true);
  const spaeter = annahmenbuch(["recht.ch.gmp.hoechstgebotRp"], "CH", { heute: "2027-01-05" });
  assert.equal(spaeter.rechenbasis, "DE", "CH gesperrt → DE-Basis");
  const chFakt = annahmenbuch(["recht.ch.gmp.hoechstgebotRp"], "DE");
  assert.equal(chFakt.eintraege[0].fehlt, true);
});

test("erloesmodellFuer: Felder aus dem Register, Lücken offen benannt", () => {
  const de = erloesmodellFuer("DE");
  assert.match(de.werte.beschreibung, /anzulegende Wert auf null/);
  assert.deepEqual(de.luecken, []);
  const ch = erloesmodellFuer("CH", { stichtag: "2027-01-05" });
  assert.ok(ch.luecken.includes("recht.ch.gmp.foerderdauerJahre"));
  assert.equal(ch.freigabeBereit, false);
});
