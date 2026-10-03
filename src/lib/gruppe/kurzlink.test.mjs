// Welle 2, Paket GRP – Kurzlink /p/[kennung] (src/app/p/[kennung]/route.js): kein offener Redirect, kein Cookie (Abnahme c)
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { GET, HEAD } from "../../app/p/[kennung]/route.js";

const BASIS = "https://www.oekoinvest.com";
const aufruf = (kennung, query = "", fn = GET) => fn(new Request(`${BASIS}/p/${encodeURIComponent(kennung)}${query}`), { params: Promise.resolve({ kennung }) });
const ziel = (res) => new URL(res.headers.get("location"), BASIS);

function pruefeSicher(res, text) {
  assert.equal(res.status, 302, text);
  const loc = res.headers.get("location");
  assert.ok(loc.startsWith("/") && !loc.startsWith("//"), `relativ, intern: ${text} → ${loc}`);
  assert.equal(ziel(res).origin, BASIS, `${text} → ${loc}`);
  assert.equal(res.headers.get("set-cookie"), null, `kein Cookie: ${text}`);
  assert.match(res.headers.get("cache-control") || "", /no-store/);
}

function mitNodeEnv(wert) {
  let vorher;
  before(() => {
    vorher = process.env.NODE_ENV;
    process.env.NODE_ENV = wert;
  });
  after(() => {
    if (vorher === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = vorher;
  });
}

describe("Kurzlink in Entwicklung (Entwürfe greifen)", () => {
  mitNodeEnv("test");

  test("bekannte Kennung → freigegebenes Ziel mit utm_source und utm_medium", async () => {
    const res = await aufruf("beispiel-installateur-de", "?z=dach");
    pruefeSicher(res, "dach");
    const u = ziel(res);
    assert.equal(u.pathname, "/de/dachflaeche-verpachten"); // Länderrouting (Welle 2)
    assert.equal(u.searchParams.get("utm_source"), "beispiel-installateur-de");
    assert.equal(u.searchParams.get("utm_medium"), "partner");
  });
  test("Gruppe → utm_medium=gruppe, Standardziel Einstieg des Landes", async () => {
    const u = ziel(await aufruf("beispiel-gruppe-at"));
    assert.equal(u.pathname, "/at");
    assert.equal(u.searchParams.get("utm_medium"), "gruppe");
  });
  test("nicht freigegebenes Ziel → Startseite des Eintrags (Einstieg seines Landes)", async () => {
    const u = ziel(await aufruf("beispiel-stadtwerk-de", "?z=flaechencheck"));
    assert.equal(u.pathname, "/de");
    assert.equal(u.searchParams.get("utm_source"), "beispiel-stadtwerk-de");
  });
  test("Angriffe auf das Ziel landen nie extern (//evil, https://…)", async () => {
    const angriffe = ["//evil.com", "https://evil.com", "/\\evil.com", "%2F%2Fevil.com", "javascript:alert(1)", "/\t/evil.com", "../../evil", "__proto__", "constructor", "/api/auth/logout"];
    for (const a of angriffe) {
      const res = await aufruf("beispiel-installateur-de", `?z=${encodeURIComponent(a)}&l=${encodeURIComponent(a)}`);
      pruefeSicher(res, a);
      assert.equal(ziel(res).pathname, "/de", a); // Einstieg des Eintragslandes (DE), nie ein fremdes Ziel
    }
  });
  test("Angriffe in der Kennung → Startseite ohne Parameter", async () => {
    for (const k of ["//evil.com", "https://evil.com", "evil.com", "..%2F..", "<script>", "a".repeat(200), "unbekannt-xyz", ""]) {
      const res = await aufruf(k);
      pruefeSicher(res, k);
      assert.equal(res.headers.get("location"), "/", k);
    }
  });
  test("HEAD verhält sich wie GET", async () => {
    pruefeSicher(await aufruf("beispiel-gruppe-de", "", HEAD), "HEAD");
  });
});

describe("Kurzlink im Produktionsmodus", () => {
  mitNodeEnv("production");

  test("Entwurfs-Kennung greift nicht → Startseite ohne Parameter", async () => {
    const res = await aufruf("beispiel-installateur-de", "?z=dach");
    pruefeSicher(res, "prod");
    assert.equal(res.headers.get("location"), "/");
  });
});
