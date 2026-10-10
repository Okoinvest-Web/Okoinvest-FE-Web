// Welle 3, Paket B8: Kommunal-Rechner 2.0 – Landesregeln zur Gemeindebeteiligung (DE), Widmungskit (AT).
//   node --import ./test/hilfen/registrieren.mjs --test src/lib/rechner/kommunePflichten.test.mjs

import test from "node:test";
import assert from "node:assert/strict";
import { BUNDESLAENDER, LANDESREGELN, landesregelFuer, landesregelTexte, rechneKommunal2 } from "./kommunePflichten.js";
import { rechneKommune } from "./kommune.js";
import { fakt, faktWert } from "../fakten/index.js";
import { widmungskitAlle, widmungskitFuer } from "../kommune/widmung.js";

test("Landesregeln decken genau die Länder aus dem Register ab (kommune.laenderMitBeteiligungsgesetz)", () => {
  const liste = faktWert("kommune.laenderMitBeteiligungsgesetz", "DE");
  const kuerzel = Object.keys(LANDESREGELN).map((slug) => BUNDESLAENDER.DE.find((b) => b.slug === slug)?.kurz);
  assert.deepEqual([...kuerzel].sort(), [...liste].sort());
});

test("jede Landesregel stützt sich auf Register-Fakten mit Quelle (https) und Status „zu prüfen“", () => {
  for (const [slug, regel] of Object.entries(LANDESREGELN)) {
    assert.ok(regel.fakten.length > 0, slug);
    for (const id of regel.fakten) {
      const f = fakt(id, "DE");
      assert.ok(f, `${id} fehlt im Register`);
      assert.match(f.quelle.url, /^https:\/\//, id);
      assert.equal(f.status, "zu_pruefen", id);
      assert.equal(f.klasse, "A", id);
    }
    for (const s of ["de", "en"]) {
      assert.ok(regel.texte[s].kern.length > 40, `${slug} ${s}`);
      assert.ok(regel.texte[s].formel, `${slug} ${s}`);
    }
  }
});

test("Beträge nach Landesrecht: Formel, Schwelle, Rundung", () => {
  assert.equal(landesregelFuer("brandenburg", { mwp: 20, erzeugungKwh: 2e7 }).betrag, 40000);
  assert.equal(landesregelFuer("brandenburg", { mwp: 1, erzeugungKwh: 1e6 }).gilt, false, "Brandenburg erst über 1 MW");
  assert.equal(landesregelFuer("bayern", { mwp: 5, erzeugungKwh: 5.5e6 }).gilt, false, "Bayern erst über 5 MW");
  assert.equal(landesregelFuer("bayern", { mwp: 6, erzeugungKwh: 6e6 }).betrag, 12000);
  assert.equal(landesregelFuer("niedersachsen", { mwp: 10, erzeugungKwh: 1e7 }).betrag, 20000);
  const mv = landesregelFuer("mecklenburg-vorpommern", { mwp: 12.7, erzeugungKwh: 1.2e7 });
  assert.equal(mv.betrag, 12000, "1.000 € je VOLLES Megawatt");
  assert.equal(mv.einwohner, 12000);
  assert.equal(mv.art, "angebot");
  const st = landesregelFuer("sachsen-anhalt", { mwp: 10, erzeugungKwh: 5e6 });
  assert.equal(st.betrag, 25000, "Mindestbetrag 2,50 €/kWp greift, wenn höher als 0,3 ct/kWh");
  assert.equal(landesregelFuer("sachsen-anhalt", { mwp: 10, erzeugungKwh: 1.1e7 }).betrag, 33000);
  assert.equal(landesregelFuer("saarland", { mwp: 10, erzeugungKwh: 1e7 }).art, "ersatz");
  const sn = landesregelFuer("sachsen", { mwp: 10, erzeugungKwh: 1e7 });
  assert.equal(sn.betrag, null, "Sachsen: Wert nach Novelle nicht belegt → kein Betrag");
  assert.equal(sn.hatGesetz, true);
});

test("Länder ohne Gesetz: kein Betrag, Hinweis auf § 6 EEG", () => {
  const he = landesregelFuer("hessen", { mwp: 20, erzeugungKwh: 2e7 });
  assert.equal(he.hatGesetz, false);
  assert.equal(he.betrag, null);
  assert.match(landesregelTexte("hessen", "de").kern, /§ 6 EEG/);
  assert.match(landesregelTexte("hessen", "en").kern, /§ 6 EEG/);
  assert.equal(landesregelFuer("tirol", {}), null, "nur deutsche Bundesländer");
});

test("Kommunal-Rechner 2.0 ändert die Rechnung des Kommunal-Rechners nicht (Region aus dem Bundesland)", () => {
  const e = { mwp: 15, hebesatz: 3.8, paragraph6: true, gemeindeflaeche: true, anteilGemeinde: 0.5, pachtHa: 2500, sitzInGemeinde: false, preisCt: 5.2 };
  const neu = rechneKommunal2({ ...e, bundesland: "brandenburg" });
  const alt = rechneKommune({ ...e, regionId: "de-ost" });
  assert.equal(neu.kommune.gesamt.summe, alt.gesamt.summe);
  assert.equal(neu.kommune.gesamtLaufzeit.summe, alt.gesamtLaufzeit.summe);
  assert.equal(neu.bundesland.markt, "de-ost");
  assert.equal(neu.landesregel.betrag, 15 * 2000);
  assert.equal(neu.erzeugungKwh, alt.jahre[0].erzeugung);
});

test("Widmungskit: alle neun Bundesländer, Prüfpunkte nur mit Quelle, ohne Fristenkästen, DE und EN", () => {
  for (const s of ["de", "en"]) {
    const alle = widmungskitAlle(s);
    assert.equal(alle.length, 9, s);
    for (const k of alle) {
      assert.ok(k.ablauf.length > 80, `${k.slug} ${s}: Ablauf`);
      assert.ok(k.stellen.length >= 3, `${k.slug} ${s}: Stellen`);
      assert.ok(k.pruefpunkte.length >= 3, `${k.slug} ${s}: Prüfpunkte`);
      for (const p of k.pruefpunkte) {
        assert.match(p.quelle.url, /^https:\/\//);
        assert.doesNotMatch(p.titel, /^(Frist|Deadline)/);
        assert.doesNotMatch(p.text, /\*\*/);
      }
    }
  }
  assert.equal(widmungskitFuer("bayern"), null, "nur Österreich");
  assert.equal(widmungskitFuer("tirol", "en").name, "Tyrol");
});
