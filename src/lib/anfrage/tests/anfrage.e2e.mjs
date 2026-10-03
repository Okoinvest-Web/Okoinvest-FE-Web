// Paket C (Welle 1): E2E gegen den laufenden Dev-Server (Demo-Backend).
//
//   node --test --test-concurrency=1 src/lib/anfrage/tests/anfrage.e2e.mjs
//   (Dev-Server muss laufen, QA_BASIS_URL – Standard http://localhost:3100; Playwright wie in qa/README.md)
//
// Zwei Arten von Prüfungen:
//  - ABGEFANGEN: POSTs an /api/** werden im Browser abgefangen und mit { ok: true } beantwortet – geprüft wird,
//    was das Formular senden WÜRDE (PLZ, Land, Häkchen, Rückruf).
//  - DEMO-POST: höchstens drei echte POSTs an das Demo-Backend (Rate-Limit 10/h); danach wird .data/plattform.json
//    gelesen und geprüft, dass Land und Fläche dort richtig ankommen. Es geht keine echte Mail raus (Demo-Postausgang).

import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { WURZEL, lade, ladePlaywright, neuerKontext, serverErreichbar } from "../../../../qa/browser.mjs";
import { pfad } from "../../land/index.js";

const ZEIT = { timeout: 360_000 };
const KONTAKT = { vorname: "Erika", nachname: "Paket-C-Test", email: "paketc.e2e@example.com" };
let browser;
let bereit = "";

before(async () => {
  const pw = await ladePlaywright();
  if (!pw) return void (bereit = "Playwright nicht gefunden");
  if (!(await serverErreichbar())) return void (bereit = "Dev-Server nicht erreichbar");
  browser = await pw.chromium.launch();
});
after(async () => browser?.close());

async function sitzung({ abfangen = true } = {}) {
  assert.ok(!bereit, bereit);
  const ctx = await neuerKontext(browser, { breite: 1440 });
  const posts = [];
  if (abfangen) {
    await ctx.route("**/api/**", async (route) => {
      const req = route.request();
      if (req.method() === "GET") return route.continue();
      posts.push({ url: new URL(req.url()).pathname, body: req.postDataJSON() });
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, id: `E2E-${posts.length}` }) });
    });
  } else {
    // echte POSTs: nur mitschreiben, nicht verändern
    ctx.on("request", (req) => {
      if (req.method() === "POST" && new URL(req.url()).pathname === "/api/anfrage") posts.push({ url: "/api/anfrage", body: req.postDataJSON() });
    });
  }
  const page = await ctx.newPage();
  const fehler = [];
  page.on("pageerror", (e) => fehler.push(String(e)));
  return { ctx, page, posts, fehler };
}

const anfrageForm = (page) => page.locator("form").filter({ has: page.getByLabel(/^Vorname/) }).first();

async function hydriert(el) {
  await el.waitFor({ state: "visible", timeout: 240_000 }); // erster Aufruf kompiliert im Dev-Modus
  await el.evaluate(
    (f) =>
      new Promise((ok, nein) => {
        const t0 = Date.now();
        const pruefe = () => (Object.keys(f).some((k) => k.startsWith("__reactProps")) ? ok() : Date.now() - t0 > 60_000 ? nein(new Error("nicht hydriert")) : setTimeout(pruefe, 200));
        pruefe();
      })
  );
}

async function ausfuellen(form, { land, plz, telefon, rueckruf = false } = {}) {
  await hydriert(form);
  await form.scrollIntoViewIfNeeded();
  await form.getByLabel(/^Vorname/).fill(KONTAKT.vorname);
  await form.getByLabel(/^Nachname/).fill(KONTAKT.nachname);
  await form.getByLabel(/^E-Mail/).fill(KONTAKT.email);
  if (land) await form.locator('select[name="land"]').selectOption(land);
  if (plz) await form.getByLabel(/^PLZ/).fill(plz);
  if (telefon) await form.getByLabel(/^Telefon/).fill(telefon);
  if (rueckruf) await form.locator('input[name="rueckruf"]').check({ force: true });
  const n = form.getByLabel(/Nachricht/).first();
  if (await n.count()) await n.fill("Automatischer Test Paket C – bitte ignorieren.");
}

const absenden = (form) => form.locator('button[type="submit"]').first().click();

async function warteAufPost(posts, ms = 20_000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const p = posts.find((x) => x.url === "/api/anfrage");
    if (p) return p;
    await new Promise((r) => setTimeout(r, 200));
  }
  return null;
}

/** Wartet auf die Erfolgsansicht; bei Fehlermeldung im Formular sofort mit deren Text scheitern */
async function erfolgAbwarten(page, ms = 120_000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (await page.getByText(/Anfrage eingegangen/).first().isVisible().catch(() => false)) return;
    const alarm = (await page.locator('[role="alert"]').allInnerTexts().catch(() => [])).map((t) => t.trim()).filter(Boolean);
    if (alarm.length) assert.fail(`Formular meldet: ${alarm.join(" | ")}`);
    await page.waitForTimeout(500);
  }
  assert.fail("keine Erfolgsansicht");
}

const demoDb = () => JSON.parse(readFileSync(path.join(WURZEL, ".data", "plattform.json"), "utf8"));

// ------------------------------------------------------------------------------------------- abgefangen

for (const [land, plz] of [["AT", "5020"], ["CH", "8001"]]) {
  test(`ABGEFANGEN /de/reststrom: PLZ ${plz} (${land}) wird angenommen, kontakt.land = ${land}`, ZEIT, async () => {
    const { ctx, page, posts, fehler } = await sitzung();
    try {
      await lade(page, pfad("/reststrom"));
      const form = anfrageForm(page);
      await ausfuellen(form, { land, plz });
      await absenden(form);
      const post = await warteAufPost(posts);
      assert.ok(post, `PLZ ${plz} (${land}) wurde nicht abgeschickt`);
      assert.equal(post.body.kontakt.plz, plz);
      assert.equal(post.body.kontakt.land, land);
      assert.equal("einwilligung" in post.body, false, "kein Pflicht-Einwilligungsfeld mehr");
      assert.deepEqual(fehler, []);
    } finally {
      await ctx.close();
    }
  });
}

test("ABGEFANGEN /de/kommunen: Länder-Chip Österreich → PLZ 4-stellig erlaubt, kontakt.land = AT, Rolle kommune", ZEIT, async () => {
  const { ctx, page, posts } = await sitzung();
  try {
    await lade(page, pfad("/kommunen"));
    const gemeinde = page.getByRole("textbox", { name: /^Gemeinde/ }).first();
    await hydriert(gemeinde);
    await page.locator("label", { hasText: /^Österreich$/ }).first().click();
    await gemeinde.fill("Testgemeinde");
    const form = anfrageForm(page);
    await ausfuellen(form, { plz: "5020" });
    await absenden(form);
    const post = await warteAufPost(posts);
    assert.ok(post, "AT-Gemeinde mit PLZ 5020 nicht abgeschickt");
    assert.equal(post.body.kontakt.land, "AT");
    assert.equal(post.body.daten.land, "AT");
    await page.getByText(/Anfrage eingegangen/).first().waitFor({ timeout: 30_000 });
    const href = await page.getByRole("link", { name: /Status im Portal verfolgen/ }).getAttribute("href");
    assert.match(href, /rolle=kommune/);
  } finally {
    await ctx.close();
  }
});

test("ABGEFANGEN: kein vorbelegtes Häkchen; Telefon ohne Rückruf optional, mit Rückruf Pflicht", ZEIT, async () => {
  const { ctx, page, posts } = await sitzung();
  try {
    await lade(page, "/kontakt");
    const form = anfrageForm(page);
    await hydriert(form);
    const haken = await form.locator('input[type="checkbox"]').evaluateAll((els) => els.map((e) => ({ name: e.name, an: e.checked })));
    assert.ok(haken.length >= 2, `Häkchen gefunden: ${JSON.stringify(haken)}`);
    assert.ok(haken.every((h) => !h.an), `vorbelegt: ${JSON.stringify(haken)}`);
    assert.equal(await form.locator('input[name="einwilligung"]').count(), 0, "Pflicht-Einwilligung entfernt");

    // Rückruf gewählt, Telefon leer → nichts wird gesendet, Fehler am Telefonfeld
    await ausfuellen(form, { rueckruf: true });
    await absenden(form);
    await page.waitForTimeout(1000);
    assert.equal(posts.length, 0, "trotz fehlender Telefonnummer bei Rückrufwunsch gesendet");
    assert.equal(await form.getByLabel(/^Telefon/).getAttribute("aria-invalid"), "true");

    // Rückruf wieder abwählen → Telefon optional → wird gesendet, ohne Telefonnummer
    await form.locator('input[name="rueckruf"]').uncheck({ force: true });
    await absenden(form);
    const post = await warteAufPost(posts);
    assert.ok(post, "ohne Rückrufwunsch muss das Formular ohne Telefon absendbar sein");
    assert.equal(post.body.rueckruf, false);
    assert.equal(post.body.kontakt.telefon, undefined);
    assert.deepEqual(post.body.einwilligungen, { werbeanruf: false, newsletter: false });
  } finally {
    await ctx.close();
  }
});

// ------------------------------------------------------------------------------------------- Demo-POSTs

test("DEMO-POST /at/regionen/salzburg: PLZ 5020 angenommen, Land AT und Bundesland Salzburg bleiben im Backend", ZEIT, async () => {
  const { ctx, page, posts, fehler } = await sitzung({ abfangen: false });
  try {
    await lade(page, pfad("/regionen/salzburg"));
    const form = anfrageForm(page);
    assert.equal(await form.locator('select[name="land"]').count(), 0, "Land kommt aus dem Kontext – keine Auswahl nötig");
    await ausfuellen(form, { plz: "5020", telefon: "+43 662 000000", rueckruf: true });
    await absenden(form);
    await erfolgAbwarten(page);
    const id = (await page.getByText(/^Vorgangsnummer/).first().innerText()).replace(/^Vorgangsnummer\s*/, "").trim();
    assert.match(id, /^V-/);
    assert.equal(posts[0]?.body.kontakt.land, "AT");
    const d = demoDb();
    const vg = d.vorgaenge.find((x) => x.id === id);
    assert.ok(vg, `Vorgang ${id} nicht im Demo-Backend`);
    assert.equal(vg.kontakt.land, "AT");
    assert.equal(vg.kontakt.plz, "5020");
    assert.equal(vg.daten.rueckrufGewuenscht, true);
    assert.equal(vg.einwilligung.art, "hinweis");
    const f = d.flaechen.find((x) => x.id === vg.flaecheId);
    assert.equal(f.land, "AT", "Fläche als AT angelegt (vorher DE)");
    assert.equal(f.bundesland, "Salzburg");
    assert.deepEqual(fehler, []);
  } finally {
    await ctx.close();
  }
});

test("DEMO-POST /de/flaechencheck Schweiz, 12 ha: ha = 12, Land CH, plausibler Score, Begriff „Parzelle“", ZEIT, async () => {
  const { ctx, page, fehler } = await sitzung({ abfangen: false });
  try {
    await lade(page, pfad("/flaechencheck"));
    const check = page.locator("#check");
    await hydriert(check);
    await check.locator('input[name="land"][value="CH"]').check({ force: true });
    await check.getByRole("button", { name: /^Weiter/ }).click();
    const ha = check.locator("#fc-ha-genau");
    await ha.fill("12");
    await ha.blur();
    assert.match(await check.innerText(), /Parzellen/, "AT/CH: kein „Flurstück“");
    await check.locator('input[name="nutzung"][value="acker"]').check({ force: true });
    await check.getByRole("button", { name: /^Weiter/ }).click();
    await check.getByRole("button", { name: /^(Nichts davon – weiter|Weiter)/ }).click();
    await check.locator('input[name="netz"][value="1-3"]').check({ force: true });
    await check.locator('input[name="eigentum"][value="allein"]').check({ force: true });
    await check.getByRole("button", { name: /^Ergebnis anzeigen/ }).click();
    await page.getByText(/Ihr Flächencheck/).first().waitFor({ timeout: 30_000 });
    const text = await check.innerText();
    assert.ok(!/Flurstück|flurstück/.test(text), "Ergebnis CH ohne „Flurstück“");
    assert.ok(!/€\/ha/.test(text), "CH: kein €-Pachtwert (Länder-Sperre)");
    const form = anfrageForm(page);
    await ausfuellen(form, { plz: "8001" });
    await absenden(form);
    await erfolgAbwarten(page);
    const id = (await page.getByText(/^Vorgangsnummer/).first().innerText()).replace(/^Vorgangsnummer\s*/, "").trim();
    const d = demoDb();
    const vg = d.vorgaenge.find((x) => x.id === id);
    const f = d.flaechen.find((x) => x.id === vg.flaecheId);
    assert.equal(f.ha, 12, `ha im Backend: ${f.ha}`);
    assert.equal(f.land, "CH");
    assert.equal(f.nutzung, "acker");
    assert.equal(vg.kontakt.land, "CH");
    const punkte = vg.daten.ergebnis?.punkte;
    assert.ok(Number.isFinite(punkte) && punkte >= 40 && punkte <= 100, `Score plausibel (12 ha Acker, Netz 1–3 km, Alleineigentum): ${punkte}`);
    assert.equal(vg.daten.ergebnis.pachtJahrEur, undefined, "CH: keine €-Pacht an den Vertrieb");
    assert.deepEqual(fehler, []);
  } finally {
    await ctx.close();
  }
});
