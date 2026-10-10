// qa/e2e/welle3.e2e.mjs – neue Formulare aus Welle 3 in der Lead-Kette (QM-Abnahme Welle 3)
//
//   node --test --test-concurrency=1 qa/e2e/welle3.e2e.mjs
//   (Dev-Server muss laufen: QA_BASIS_URL, Standard http://localhost:3100)
//
// Es wird NICHTS gesendet: Jeder Nicht-GET-Aufruf der SEITE an /api/** wird abgefangen und mit { ok: true } beantwortet
// (wie qa/e2e/lead.e2e.mjs). Geprüft wird je neuem Formular, was der Browser an die Lead-Kette schickt:
//  - Land der Anfrage (aus der Länderfassung der Seite bzw. fest „AT“ bei der EG-Software),
//  - Typ und Quelle für das Routing,
//  - Einwilligungen: kein Häkchen vorbelegt, ohne Häkchen geht keine Einwilligung als true mit,
//  - Telefon ist ohne Rückrufwunsch kein Pflichtfeld.
// Dass daraus im Backend ein Vorgang mit Land und Einwilligungsprotokoll entsteht, prüfen die Unit-Tests der Kette
// (src/lib/plattform/**, src/lib/bericht/*-dienst.test.mjs, src/lib/newsletter/dienst.test.mjs).

import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { lade, ladePlaywright, neuerKontext, serverErreichbar } from "../browser.mjs";

const ZEIT = { timeout: 360_000 };
const KONTAKT = { vorname: "Erika", nachname: "Welledrei", email: "e2e.welle3@example.com" };
let browser;
let bereit = "";

before(async () => {
  const pw = await ladePlaywright();
  if (!pw) return void (bereit = "Playwright nicht gefunden (PLAYWRIGHT_PFAD setzen, siehe qa/README.md)");
  if (!(await serverErreichbar())) return void (bereit = "Dev-Server nicht erreichbar (npm run dev, Port 3100)");
  browser = await pw.chromium.launch();
});
after(async () => browser?.close());

async function sitzung(breite = 1440) {
  assert.ok(!bereit, bereit);
  const ctx = await neuerKontext(browser, { breite });
  const posts = [];
  await ctx.route("**/api/**", async (route) => {
    const req = route.request();
    if (req.method() === "GET") return route.continue();
    let body = null;
    try {
      body = req.postDataJSON();
    } catch {
      body = req.postData();
    }
    posts.push({ url: new URL(req.url()).pathname, body });
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, id: `E2E-${posts.length}`, hinweis: "E2E" }) });
  });
  const page = await ctx.newPage();
  return { ctx, page, posts };
}

async function hydriert(el) {
  await el.waitFor({ state: "visible", timeout: 120_000 });
  await el.evaluate(
    (f) =>
      new Promise((ok, nein) => {
        const t0 = Date.now();
        const pruefe = () => (Object.keys(f).some((k) => k.startsWith("__reactProps")) ? ok() : Date.now() - t0 > 60_000 ? nein(new Error("nicht hydriert")) : setTimeout(pruefe, 200));
        pruefe();
      })
  );
}

async function warteAufPost(posts, pfad, ms = 20_000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const p = posts.find((x) => x.url === pfad);
    if (p) return p;
    await new Promise((r) => setTimeout(r, 200));
  }
  return null;
}

// Anfrageformulare der neuen Seiten: [Name, Pfad, Bereich (CSS), erwarteter Typ, erwartetes Land, erwartete Quelle]
const ANFRAGEN = [
  ["Preisanfrage EG-Software (B7)", "/at/energiegemeinschaften/software/preise", "#anfrage", "energiegemeinschaft", "AT", "eg-preisblatt"],
  ["White-Label-Anfrage (B7)", "/at/energiegemeinschaften/software/white-label", "#anfrage", "energiegemeinschaft", "AT", "eg-white-label"],
  ["Fristen-Erinnerung im Ausschreibungs-Monitor (B9)", "/at/marktdaten/ausschreibungen", "main", "kontakt", "AT", "marktdaten/ausschreibungen"],
  ["Fremdinserat der Projektbörse (B10)", "/ch/projektboerse/anbieten", "#fremdentwickler", "projekt", "CH", "boerse-fremdinserat"],
];

for (const [name, pfad, bereich, typ, land, quelle] of ANFRAGEN) {
  test(`${name}: Anfrage geht mit Land ${land}, Typ „${typ}“ und ohne vorbelegte Einwilligung in die Lead-Kette`, ZEIT, async () => {
    const { ctx, page, posts } = await sitzung();
    try {
      assert.equal(await lade(page, pfad), 200, pfad);
      const form = page.locator(bereich).locator("form").filter({ has: page.getByLabel(/^Vorname/) }).first();
      await hydriert(form);
      const haken = form.locator('input[type="checkbox"][data-einwilligung]');
      for (const h of await haken.all()) assert.equal(await h.isChecked(), false, "Einwilligung nicht vorbelegt");
      assert.equal(await form.locator('input[name="rueckruf"]').isChecked(), false, "Rückruf nicht vorbelegt");

      await form.getByLabel(/^Vorname/).fill(KONTAKT.vorname);
      await form.getByLabel(/^Nachname/).fill(KONTAKT.nachname);
      await form.getByLabel(/^E-Mail/).fill(KONTAKT.email);
      // Telefon bleibt leer: ohne Rückrufwunsch kein Pflichtfeld
      await form.locator('button[type="submit"]').first().click();
      const post = await warteAufPost(posts, "/api/anfrage");
      assert.ok(post, "kein POST an /api/anfrage abgefangen (Pflichtfeld außer Name und E-Mail?)");
      const b = post.body;
      assert.equal(b.typ, typ, "Typ für das Routing");
      assert.equal(b.kontakt?.land || b.daten?.land, land, "Land der Anfrage");
      assert.equal(b.daten?.quelle, quelle, "Quelle der Anfrage");
      assert.ok(!b.kontakt?.telefon, "ohne Telefon angenommen");
      assert.notEqual(b.rueckruf, true, "kein Rückruf ohne Häkchen");
      for (const [id, wert] of Object.entries(b.einwilligungen || {})) assert.equal(wert, false, `${id}: keine Einwilligung ohne Häkchen`);
    } finally {
      await ctx.close();
    }
  });
}

test("Newsletter (NL): Land aus der Länderfassung, kein Thema vorausgewählt, ohne Thema kein Versand", ZEIT, async (t) => {
  const { ctx, page, posts } = await sitzung();
  try {
    assert.equal(await lade(page, "/at/newsletter"), 200);
    const box = page.locator('[data-newsletter="newsletter"]');
    await box.waitFor({ state: "attached", timeout: 120_000 });
    await page.locator('[data-newsletter="newsletter"]:not([data-newsletter-status="laedt"])').waitFor({ timeout: 60_000 });
    if ((await box.getAttribute("data-newsletter-status")) !== "an") return t.skip("Newsletter nimmt keine Anmeldungen an (nur Demo-Modus)");
    const form = box.locator("form");
    await hydriert(form);
    const themen = form.locator('input[type="checkbox"]');
    assert.ok((await themen.count()) >= 4, "vier Themen zur Wahl");
    for (const h of await themen.all()) assert.equal(await h.isChecked(), false, "kein Thema vorausgewählt");
    assert.equal(await form.locator('input[type="radio"]').count(), 0, "Land kommt aus der Seite (keine Länderwahl auf /at)");

    await form.locator('input[type="email"]').fill(KONTAKT.email);
    await form.locator('button[type="submit"]').click();
    await page.waitForTimeout(800);
    assert.equal(posts.filter((p) => p.url === "/api/newsletter").length, 0, "ohne Thema darf nichts gesendet werden");

    await themen.first().check({ force: true });
    await form.locator('button[type="submit"]').click();
    const post = await warteAufPost(posts, "/api/newsletter");
    assert.ok(post, "kein POST an /api/newsletter abgefangen");
    assert.equal(post.body.land, "AT");
    assert.equal(post.body.sprache, "de");
    assert.equal(post.body.themen.length, 1, "nur das ausdrücklich gewählte Thema");
    assert.deepEqual(Object.keys(post.body).sort(), ["email", "herkunft", "land", "quelle", "sprache", "themen"], "nur E-Mail, Land, Themen, Sprache, Quelle, Herkunft");
  } finally {
    await ctx.close();
  }
});
