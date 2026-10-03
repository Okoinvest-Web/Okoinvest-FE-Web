// Welle 2, Paket B3: Routing-Matrix Land × Typ × Größe und Lead-Score.
//   node --import ./test/hilfen/registrieren.mjs --test src/lib/anfrage/routing.test.mjs

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ABSAGE_CODES, GROESSEN, GROESSEN_KLASSEN, LEAD_DESKS, LEAD_LAENDER, LEAD_TYP_IDS, ROUTING_MATRIX } from "../../data/lead-routing.js";
import { groesseErmitteln, leadTyp, matrixZeile, routen } from "./routing.js";
import { scoreBerechnen } from "./score.js";
import { SLA_KLASSEN_IDS, slaKlasse } from "./sla.js";

// Beispielwerte, die je Typ jede Größenklasse erzeugen
const DATEN_FUER = {
  flaeche: { klein: { ha: 2 }, mittel: { ha: 12 }, gross: { ha: 25 } },
  agri: { klein: { ha: 3 }, mittel: { ha: 8 }, gross: { eingaben: { flaecheHa: 40 } } },
  dach: { klein: { art: "dach", dachflaeche: 400 }, mittel: { art: "dach", dachflaeche: 2500 }, gross: { art: "dach", dachflaeche: 8000 } },
  carport: { klein: { stellplaetze: 20 }, mittel: { stellplaetze: 100 }, gross: { stellplaetze: 600 } },
  speicher: { klein: { groesse: "bis10" }, mittel: { groesse: "10-50" }, gross: { mw: 80 } },
  reststrom: { klein: { verbrauchMwh: "80" }, mittel: { verbrauchMwh: "500" }, gross: { verbrauchMwh: "1.200" } },
  investor: { klein: { ticket: "bis5" }, mittel: { ticket: "5-20" }, gross: { ticket: "ueber50" } },
  projekt: { klein: { mwp: 1 }, mittel: { mwp: 10 }, gross: { mwp: 30 } },
};
const vorgangTyp = (t) => (t === "dach" ? "flaeche" : t);
const GEBIET = { mitarbeiterId: "U-GEBIET", name: "Testgebiet", grund: "Land" };

test("Matrix ist vollständig: jede Kombination Land × Typ × Größe genau einmal, mit Desk und SLA-Klasse", () => {
  assert.equal(ROUTING_MATRIX.length, LEAD_LAENDER.length * LEAD_TYP_IDS.length * GROESSEN_KLASSEN.length);
  const schluessel = new Set(ROUTING_MATRIX.map((z) => `${z.land}|${z.typ}|${z.groesse}`));
  assert.equal(schluessel.size, ROUTING_MATRIX.length);
  for (const z of ROUTING_MATRIX) {
    assert.ok(LEAD_DESKS[z.desk], `Desk ${z.desk} existiert`);
    assert.equal(LEAD_DESKS[z.desk].land, z.land, "Desk gehört zum Land (strikte Ländertrennung)");
    assert.ok(SLA_KLASSEN_IDS.includes(z.slaKlasse));
  }
});

test("Masterplan 5.5: SLA-Basis je Typ und Größe", () => {
  for (const land of LEAD_LAENDER) {
    for (const g of GROESSEN_KLASSEN) {
      for (const t of ["speicher", "investor", "kommune"]) assert.equal(matrixZeile(land, t, g).slaKlasse, "h4", `${land} ${t} ${g}`);
      for (const t of ["flaeche", "agri"]) assert.equal(matrixZeile(land, t, g).slaKlasse, g === "gross" ? "taggleich" : "wt2", `${land} ${t} ${g}`);
      for (const t of ["dach", "carport", "reststrom", "projekt", "energiegemeinschaft", "genossenschaft", "kontakt"]) assert.equal(matrixZeile(land, t, g).slaKlasse, "wt2");
    }
  }
  assert.equal(slaKlasse({ basis: "wt2", score: "A", rueckruf: true }), "h1", "A-Lead mit Rückruf");
  assert.equal(slaKlasse({ basis: "h4", score: "A", rueckruf: false }), "h4");
  assert.equal(slaKlasse({ basis: "taggleich", score: "B", rueckruf: true }), "taggleich");
  assert.equal(slaKlasse({ basis: "quatsch" }), "wt2");
});

test("Größenklassen: Grenzen (20 ha = gross), Auswahlwerte der Formulare, unbekannt", () => {
  assert.equal(groesseErmitteln("flaeche", { ha: 19.99 }).klasse, "mittel");
  assert.equal(groesseErmitteln("flaeche", { ha: 20 }).klasse, "gross");
  assert.equal(groesseErmitteln("flaeche", { ha: "20,5" }).klasse, "gross");
  assert.equal(groesseErmitteln("flaeche", {}).klasse, "unbekannt");
  assert.equal(groesseErmitteln("speicher", { groesse: "10-50" }).klasse, "mittel");
  assert.equal(groesseErmitteln("investor", { ticket: "20-50" }).klasse, "gross");
  assert.equal(groesseErmitteln("kommune", { ha: 50 }).klasse, "unbekannt", "Kommune ohne Größenklasse");
  assert.equal(leadTyp("flaeche", { art: "dach" }), "dach");
  assert.equal(leadTyp("erfunden", {}), "kontakt");
  for (const [typ, klassen] of Object.entries(DATEN_FUER)) {
    assert.ok(GROESSEN[typ], typ);
    for (const [k, d] of Object.entries(klassen)) assert.equal(groesseErmitteln(typ, d).klasse, k, `${typ} ${k}`);
  }
});

test("(d) 100 %: jede Test-Anfrage DE/AT/CH/unbekannt × Typ × Größe hat Land und Zuständigkeit oder „ohne Zuständigkeit“", () => {
  let n = 0;
  const aktivNur = (id) => id === "U-GEBIET";
  for (const land of ["DE", "AT", "CH", "", "FR"]) {
    for (const typ of LEAD_TYP_IDS) {
      for (const g of GROESSEN_KLASSEN) {
        const daten = DATEN_FUER[typ]?.[g] || (typ === "dach" ? { art: "dach" } : {});
        for (const gebiet of [null, GEBIET, { ...GEBIET, mitarbeiterId: "U-INAKTIV" }]) {
          const r = routen({ typ: vorgangTyp(typ), daten, land, gebiet, aktiv: aktivNur });
          n++;
          assert.ok(LEAD_LAENDER.includes(r.land), "Land ist DE/AT/CH/unbekannt");
          assert.equal(r.land, ["DE", "AT", "CH"].includes(land) ? land : "unbekannt");
          assert.ok(r.zustaendigId || r.ohneZustaendigkeit === true, "zuständig oder sichtbar ohne Zuständigkeit");
          assert.equal(r.ohneZustaendigkeit, !r.zustaendigId);
          assert.equal(r.typ, typ);
          assert.equal(r.groesse.klasse, DATEN_FUER[typ] ? g : "unbekannt");
          assert.ok(r.desk.id && r.desk.label, "Desk immer gesetzt");
          assert.ok(r.gruende.length > 0, "Begründung");
          if (r.land === "unbekannt") assert.equal(r.zustaendigId, null, "Land unbekannt → Clearing, kein Gebiet");
          else if (gebiet?.mitarbeiterId === "U-GEBIET") assert.equal(r.zustaendigId, "U-GEBIET", "Fallback Gebiets-Routing");
          else assert.equal(r.zustaendigId, null, "inaktiv oder kein Gebiet → ohne Zuständigkeit");
        }
      }
    }
  }
  assert.equal(n, 5 * LEAD_TYP_IDS.length * GROESSEN_KLASSEN.length * 3);
});

test("Desk-Person geht vor Gebiet; Vertretung nur, wenn aktiv und nicht dieselbe Person", () => {
  const desks = { ...LEAD_DESKS, "at-flaeche": { ...LEAD_DESKS["at-flaeche"], person: "U-DESK", vertretung: "U-VERTR" } };
  const r = routen({ typ: "flaeche", daten: { ha: 3 }, land: "AT", gebiet: GEBIET, aktiv: () => true, desks });
  assert.equal(r.zustaendigId, "U-DESK");
  assert.equal(r.zustaendigQuelle, "desk");
  assert.equal(r.vertretungId, "U-VERTR");
  const r2 = routen({ typ: "flaeche", daten: { ha: 3 }, land: "AT", gebiet: GEBIET, aktiv: (id) => id !== "U-DESK", desks });
  assert.equal(r2.zustaendigId, "U-GEBIET", "Desk-Person inaktiv → Gebiet");
  const wirft = routen({ typ: "kontakt", land: "DE", gebiet: GEBIET, aktiv: () => { throw new Error("x"); } });
  assert.equal(wirft.ohneZustaendigkeit, true, "Fehler in aktiv() → ohne Zuständigkeit statt Absturz");
});

test("TODO Inhaber: Desks ohne Personen/Postfächer, keine echten Adressen in der Routing-Datei", () => {
  for (const d of Object.values(LEAD_DESKS)) {
    assert.equal(d.person, null);
    assert.equal(d.vertretung, null);
    assert.equal(d.postfach, null);
    assert.match(d.todo, /^TODO Inhaber/);
  }
  const quelle = readFileSync(new URL("../../data/lead-routing.js", import.meta.url), "utf8");
  assert.ok(!/[\w.+-]+@[\w-]+\.[\w.]+/.test(quelle), "keine E-Mail-Adresse");
  for (const a of Object.values(ABSAGE_CODES)) assert.ok(!/\d+\s*(Werktag|Tag|Stunde)/.test(a.text), "keine Zeitzusage im Absagetext");
});

test("(f) Score liefert immer Klasse und Begründung – über alle Typen, Größen, Länder und Angaben", () => {
  const kontakte = [{}, { firma: "X GmbH", plz: "5020", telefon: "+43 1 234567" }];
  for (const typ of LEAD_TYP_IDS) {
    for (const klasse of GROESSEN_KLASSEN) {
      for (const landBekannt of [true, false]) {
        for (const rueckruf of [true, false]) {
          for (const kontakt of kontakte) {
            const s = scoreBerechnen({ typ, groesse: { klasse }, landBekannt, rueckruf, kontakt, daten: { nachricht: "Hallo" } });
            assert.ok(["A", "B", "C"].includes(s.klasse));
            assert.ok(s.begruendung.startsWith(`${s.klasse} (`) && s.begruendung.length > 20);
            assert.ok(s.gruende.length >= 4);
            assert.ok(s.punkte >= 0 && s.punkte <= 100);
            assert.equal(s.punkte, s.gruende.reduce((a, g) => a + g.punkte, 0));
          }
        }
      }
    }
  }
  assert.equal(scoreBerechnen().klasse, "C", "auch ohne Eingabe");
  assert.match(scoreBerechnen().begruendung, /Land unbekannt/);
  const a = scoreBerechnen({ typ: "flaeche", groesse: { klasse: "gross", wert: 25, einheit: "ha" }, landBekannt: true, rueckruf: true, kontakt: { telefon: "+49 1" }, daten: {} });
  assert.equal(a.klasse, "A");
  assert.match(a.begruendung, /große Größenklasse \(25 ha\)/);
  assert.equal(scoreBerechnen({ typ: "flaeche", groesse: { klasse: "klein" }, landBekannt: true, rueckruf: false }).klasse, "C");
  assert.equal(scoreBerechnen({ typ: "kommune", groesse: { klasse: "unbekannt" }, landBekannt: true, rueckruf: false, kontakt: { firma: "Gemeinde" } }).klasse, "B");
});
