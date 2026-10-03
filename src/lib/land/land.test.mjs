// Tests src/lib/land (Welle 2, Länderrouting) – Abnahme (a)
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  EINSTIEG, LAENDER, LAND_CODES, OHNE_PRAEFIX, OHNE_PRAEFIX_ERGAENZT, SEITEN, STAMM, STUFEN,
  alleSchluessel, alternates, einstiegPfad, entsprechung, freigegeben, hreflang, landAusPfad, landCode,
  laenderFrei, pfad, seitenDesLandes, stufe, ziel, zoneFuer,
} from "./index.js";
import { abs } from "../../data/site.js";

const URL_ZU_SEITE = (url) => landAusPfad(new URL(url).pathname);

test("Länder: Präfix, Sprache, Währung aus B1, Namen aus site.js", () => {
  assert.deepEqual(LAND_CODES, ["DE", "AT", "CH"]);
  assert.equal(LAENDER.DE.lang, "de-DE");
  assert.equal(LAENDER.AT.lang, "de-AT");
  assert.equal(LAENDER.CH.lang, "de-CH");
  assert.equal(LAENDER.CH.waehrung, "CHF");
  assert.equal(LAENDER.AT.waehrung, "EUR");
  assert.equal(LAENDER.AT.name, "Österreich");
  assert.equal(LAENDER.AT.postfach, null, "Postfächer je Land: TODO-Inhaber");
  assert.equal(einstiegPfad("ch"), "/ch");
  assert.equal(landCode(" at "), "AT");
  assert.equal(landCode("xx"), null);
});

test("Zonen: Stamm ist die geschlossene Liste aus dem Masterplan", () => {
  const plan = readFileSync(new URL("../../../docs/MASTERPLAN-DACH.md", import.meta.url), "utf8");
  const zeile = plan.split("\n").find((z) => z.includes("**Neutraler Stamm (geschlossene Liste):**"));
  assert.ok(zeile, "Zeile zum neutralen Stamm im Masterplan gefunden");
  const ausPlan = [...zeile.matchAll(/`([^`]+)`/g)].map((m) => m[1]);
  assert.deepEqual([...STAMM].sort(), [...ausPlan].sort());
  for (const p of ["/en", "/portal", "/login", "/einladung", "/api"]) assert.ok(OHNE_PRAEFIX.includes(p), p);
});

test("Stamm und präfixlose Bereiche bekommen nie ein Präfix – in keinem Land", () => {
  const beispiele = [
    ...STAMM, "/projektboerse/karte", "/projektboerse/x-y", "/wissen/lexikon", "/wissen/ratgeber/a",
    ...OHNE_PRAEFIX, "/portal/admin/leads", "/api/anfrage", "/en/investors", "/p/abc", "/bericht/xyz",
    ...OHNE_PRAEFIX_ERGAENZT.map((e) => e.pfad),
  ];
  for (const p of beispiele) {
    for (const l of LAND_CODES) {
      const z = ziel(p, l);
      assert.equal(z.href, p, `${p} in ${l}`);
      assert.equal(z.art, "stamm");
    }
    assert.notEqual(zoneFuer(p), "land", p);
  }
  // Query und Anker bleiben erhalten
  assert.equal(pfad("/kontakt?thema=fläche#form", "AT"), "/kontakt?thema=fläche#form");
  // Stamm-Alternates: canonical ohne Präfix, nie ein Länder-Cluster
  assert.deepEqual(alternates("/kontakt", "AT"), { canonical: abs("/kontakt") });
});

test("pfad(): alle Schlüssel in allen Ländern", () => {
  for (const k of alleSchluessel()) {
    for (const l of LAND_CODES) {
      const z = ziel(k === EINSTIEG ? "/" : k, l);
      if (k === EINSTIEG) continue; // Einstieg über einstiegPfad()
      assert.match(z.href, /^\/(de|at|ch)(\/|$)/, `${k} in ${l} → ${z.href}`);
      if (stufe(k, l)) {
        assert.equal(z.href, `/${l.toLowerCase()}${k}`);
        assert.equal(z.art, "land");
      } else {
        assert.notEqual(z.art, "land", `${k} in ${l} darf nicht als Länderseite erscheinen`);
        assert.ok(z.giltFuer, `${k} in ${l}: Hinweis „gilt für …“ fehlt`);
      }
    }
  }
  assert.equal(pfad("/rechner/pacht"), "/de/rechner/pacht");
  assert.equal(pfad("/rechner/pacht", "AT"), "/de/rechner/pacht");
  assert.equal(ziel("/rechner/pacht", "AT").giltFuer, "für Deutschland");
  assert.equal(pfad("/flaechencheck", "AT"), "/at/flaechencheck");
  assert.equal(pfad("/regionen/tirol"), "/at/regionen/tirol");
  assert.equal(pfad("/regionen/bayern", "AT"), "/de/regionen/bayern");
  assert.equal(pfad("/regionen/schweiz"), "/ch", "CH-Region im gestuften Start nicht freigegeben → Einstieg CH");
  assert.equal(pfad("/energiegemeinschaften/software"), "/at/energiegemeinschaften/software");
  assert.equal(ziel("/energiegemeinschaften/software", "DE").giltFuer, "für Österreich");
  assert.equal(pfad("/ratgeber"), "/wissen/ratgeber");
  assert.equal(pfad("/ratgeber/moor-pv#a"), "/wissen/ratgeber/moor-pv#a");
  // idempotent
  assert.equal(pfad(pfad("/rechner/pacht")), "/de/rechner/pacht");
  assert.equal(pfad("/de/rechner/pacht", "CH"), "/de/rechner/pacht");
  // unbekannt bleibt unverändert und ist erkennbar
  assert.equal(ziel("/gibt-es-nicht").art, "unbekannt");
});

test("hreflang bidirektional inkl. x-default für jede freigegebene Seite", () => {
  let cluster = 0;
  for (const k of alleSchluessel()) {
    for (const l of LAND_CODES) {
      if (!freigegeben(k, l)) continue;
      const a = alternates(k, l);
      const eigene = abs(`/${l.toLowerCase()}${k}`);
      assert.equal(a.canonical, eigene);
      const tab = a.languages;
      assert.equal(tab[LAENDER[l].lang], eigene, `${k}/${l}: Selbstverweis fehlt`);
      assert.ok(tab["x-default"], `${k}/${l}: x-default fehlt`);
      // jede Alternative verweist mit derselben Tabelle zurück
      for (const [code, url] of Object.entries(tab)) {
        const ziel = URL_ZU_SEITE(url);
        assert.ok(freigegeben(ziel.schluessel, ziel.land), `${k}/${l}: ${code} → ${url} ist nicht freigegeben`);
        assert.deepEqual(alternates(ziel.schluessel, ziel.land).languages, tab, `${url} verweist nicht zurück`);
      }
      // jedes freigegebene Land steht im Cluster, sonst nichts
      assert.deepEqual(
        Object.keys(tab).filter((c) => c !== "x-default").sort(),
        laenderFrei(k).map((x) => LAENDER[x].lang).sort(),
      );
      if (Object.keys(tab).length > 2) cluster++;
    }
  }
  assert.ok(cluster >= 4, "mindestens die DE/AT-Paare (Flächencheck, Energiegemeinschaften, Regionen) bilden Cluster");
  assert.deepEqual(hreflang("/flaechencheck"), {
    "de-DE": abs("/de/flaechencheck"),
    "de-AT": abs("/at/flaechencheck"),
    "x-default": abs("/de/flaechencheck"),
  });
  assert.equal(hreflang("/energiegemeinschaften/rechner")["x-default"], abs("/at/energiegemeinschaften/rechner"));
});

test("„in Vorbereitung“: nur canonical, kein Cluster", () => {
  assert.equal(stufe("/marktzugang-check", "CH"), "vorbereitung");
  assert.deepEqual(alternates("/marktzugang-check", "CH"), { canonical: abs("/ch/marktzugang-check") });
  assert.deepEqual(hreflang("/marktzugang-check"), {});
});

test("Gestufter Start: DE vollständig, AT/CH Positivliste mit Fachfreigabe-Vermerk TODO-E6", () => {
  for (const k of Object.keys(SEITEN)) {
    const muster = k;
    if (SEITEN[k].laender.includes("DE") && !SEITEN[k].dynamisch) assert.equal(stufe(k, "DE"), "frei", k);
    void muster;
  }
  for (const l of ["AT", "CH"]) {
    assert.equal(STUFEN[l].modus, "positivliste");
    for (const [k, v] of Object.entries(STUFEN[l].seiten)) {
      assert.ok(Object.hasOwn(SEITEN, k), `${l}: ${k} fehlt in SEITEN`);
      assert.ok(SEITEN[k].laender.includes(l), `${l}: ${k} hat keinen eigenen Inhalt für ${l} (kein Klonen)`);
      assert.equal(v.pruefer, "TODO-E6");
      assert.match(v.stand, /^\d{4}-\d{2}-\d{2}$/);
      assert.ok(v.grundlage);
    }
  }
  // Masterplan: AT nur Regionen AT, Energiegemeinschaften, Flächencheck AT (+ Einstieg)
  const at = seitenDesLandes("AT").map((x) => x.schluessel);
  assert.ok(at.includes("/flaechencheck") && at.includes("/energiegemeinschaften") && at.includes("/regionen/tirol"));
  assert.ok(!at.includes("/regionen/bayern") && !at.includes("/rechner/pacht"));
  // CH nur Einstieg, Marktzugang-Check, Parzellen-Vorprüfung
  assert.deepEqual(seitenDesLandes("CH").map((x) => x.schluessel).sort(), ["", "/marktzugang-check", "/parzellen-vorpruefung"]);
  assert.equal(stufe("/regionen/schweiz", "CH"), null);
});

test("Länderwechsler: Entsprechung, sonst Einstieg; Stamm → Einstieg", () => {
  assert.deepEqual(entsprechung("/de/flaechencheck", "AT"), { href: "/at/flaechencheck", art: "entsprechung" });
  assert.deepEqual(entsprechung("/at/flaechencheck?x=1", "DE"), { href: "/de/flaechencheck", art: "entsprechung" });
  assert.deepEqual(entsprechung("/de/rechner/pacht", "CH"), { href: "/ch", art: "einstieg" });
  assert.deepEqual(entsprechung("/de/regionen/bayern", "AT"), { href: "/at", art: "einstieg" });
  assert.deepEqual(entsprechung("/kontakt", "AT"), { href: "/at", art: "einstieg" });
  assert.deepEqual(entsprechung("/ch", "DE"), { href: "/de", art: "entsprechung" });
  assert.deepEqual(landAusPfad("/at/regionen/tirol"), { land: "AT", schluessel: "/regionen/tirol", zone: "land" });
  assert.deepEqual(landAusPfad("/kontakt"), { land: null, schluessel: "/kontakt", zone: "stamm" });
});
