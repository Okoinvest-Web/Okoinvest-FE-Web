// qa/e2e/lead.e2e.mjs – Lead-Kette (Welle 2, Paket B3) mit abgefangenen POSTs
//
//   node --test --test-concurrency=1 qa/e2e/lead.e2e.mjs
//   (Dev-Server muss laufen: QA_BASIS_URL, Standard http://localhost:3100)
//
// Es wird NICHTS gesendet: Jeder Nicht-GET-Aufruf der SEITE an /api/** wird abgefangen und mit { ok: true } beantwortet.
// Einzige Ausnahme: die Demo-Anmeldung des Backoffice-Kontos (über ctx.request, nicht über die Seite) für den Lead-Desk.
// Geprüft wird:
//  1. Formular: drei getrennte, nicht vorbelegte Häkchen; nur ausdrücklich gesetzte Einwilligungen gehen mit (keine
//     mutmaßliche Einwilligung); Rückruf macht Telefon zur Pflicht (bestehende Regel bleibt).
//  2. Lead-Desk /portal/admin/leads: lädt ohne Konsolenfehler, keine E-Mail-Adressen in der Liste, Widerruf-Dialog
//     schickt nur { vorgangId, zweck, kanal } (abgefangen).

import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { BASIS, lade, ladePlaywright, neuerKontext, serverErreichbar } from "../browser.mjs";

const ZEIT = { timeout: 360_000 };
const KONTAKT = { vorname: "Erika", nachname: "Leadtest", email: "e2e.lead@example.com" };
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
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, id: `E2E-${posts.length}` }) });
  });
  const page = await ctx.newPage();
  const fehler = [];
  page.on("pageerror", (e) => fehler.push(String(e)));
  page.on("console", (m) => m.type() === "error" && fehler.push(m.text()));
  return { ctx, page, posts, fehler };
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

const anfrageForm = (page) => page.locator("form").filter({ has: page.getByLabel(/^Vorname/) }).first();

test("Formular: drei getrennte, nicht vorbelegte Häkchen – nur ausdrücklich gesetzte Einwilligung geht mit", ZEIT, async () => {
  const { ctx, page, posts } = await sitzung();
  try {
    assert.equal(await lade(page, "/kontakt"), 200);
    const form = anfrageForm(page);
    await hydriert(form);
    const haken = form.locator('input[type="checkbox"][data-einwilligung]');
    const ids = await haken.evaluateAll((l) => l.map((x) => x.dataset.einwilligung));
    assert.ok(ids.length >= 1, "Einwilligungs-Häkchen vorhanden");
    assert.ok(!ids.includes("partner"), "Partner-Häkchen erst mit benannten Partnern");
    for (const h of await haken.all()) assert.equal(await h.isChecked(), false, "nicht vorbelegt");
    assert.equal(await form.locator('input[name="rueckruf"]').isChecked(), false, "Rückruf nicht vorbelegt");

    await form.getByLabel(/^Vorname/).fill(KONTAKT.vorname);
    await form.getByLabel(/^Nachname/).fill(KONTAKT.nachname);
    await form.getByLabel(/^E-Mail/).fill(KONTAKT.email);
    // Rückruf ohne Telefon → wird nicht gesendet (Telefonregel unverändert)
    await form.locator('input[name="rueckruf"]').check({ force: true });
    await form.locator('button[type="submit"]').first().click();
    await page.waitForTimeout(800);
    assert.equal(posts.filter((p) => p.url === "/api/anfrage").length, 0, "Rückruf ohne Telefon darf nicht senden");

    await form.getByLabel(/^Telefon/).fill("+43 662 000000");
    if (ids.includes("newsletter")) await form.locator('input[data-einwilligung="newsletter"]').check({ force: true }); // nur EIN Häkchen setzen
    await form.locator('button[type="submit"]').first().click();
    const post = await warteAufPost(posts, "/api/anfrage");
    assert.ok(post, "kein POST abgefangen");
    const e = post.body.einwilligungen || {};
    assert.equal(post.body.rueckruf, true);
    for (const id of ids) assert.equal(e[id], id === "newsletter", `${id}: nur ausdrücklich gesetzt = true`);
    assert.ok(!("werbeanruf" in e) || e.werbeanruf === false, "kein Werbeanruf ohne Häkchen (keine mutmaßliche Einwilligung)");
  } finally {
    await ctx.close();
  }
});

for (const breite of [1440, 390]) {
  test(`Lead-Desk ${breite}px: lädt ohne Fehler, keine E-Mail in der Liste, Widerruf nur mit Vorgang/Zweck/Kanal`, ZEIT, async () => {
    const { ctx, page, posts, fehler } = await sitzung(breite);
    try {
      const login = await ctx.request.post(`${BASIS}/api/auth/login`, { headers: { Origin: BASIS, "Content-Type": "application/json" }, data: { email: "admin@example.com", passwort: process.env.PLATTFORM_DEMO_PASSWORT || "Demo-2026!" } });
      assert.equal(login.status(), 200, "Demo-Anmeldung Backoffice");
      assert.equal(await lade(page, "/portal/admin/leads"), 200);
      await page.getByRole("heading", { name: "Lead-Desk", exact: true }).waitFor({ timeout: 60_000 });
      const text = await page.locator("main").innerText();
      assert.ok(!/[\w.+-]+@[\w-]+\.[a-z]{2,}/i.test(text), "keine E-Mail-Adresse im Lead-Desk");
      assert.match(text, /Einwilligungsprotokoll/);
      assert.match(text, /Kette (intakt|gebrochen)/);
      const breiteSeite = await page.evaluate(() => document.documentElement.scrollWidth);
      assert.ok(breiteSeite <= breite, `kein horizontaler Überlauf (${breiteSeite})`);
      const knopf = page.getByRole("button", { name: "Widerruf" }).first();
      if (await knopf.count()) {
        await hydriert(knopf);
        await knopf.click();
        await page.getByRole("button", { name: "Widerruf eintragen" }).click();
        const post = await warteAufPost(posts, "/api/admin/leads/widerruf");
        assert.ok(post, "Widerruf-POST abgefangen");
        assert.deepEqual(Object.keys(post.body).sort(), ["kanal", "vorgangId", "zweck"]);
        assert.match(post.body.vorgangId, /^V-/);
      }
      assert.deepEqual(fehler, [], "Konsolen-/JS-Fehler");
    } finally {
      await ctx.close();
    }
  });
}
