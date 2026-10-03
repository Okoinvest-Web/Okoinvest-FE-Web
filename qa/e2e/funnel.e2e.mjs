// qa/e2e/funnel.e2e.mjs – Funnel-E2E mit abgefangenen POSTs (Paket F)
//
//   node --test --test-concurrency=1 qa/e2e/funnel.e2e.mjs
//   (Dev-Server muss laufen: QA_BASIS_URL, Standard http://localhost:3100)
//
// Es wird NICHTS gesendet: Jeder Nicht-GET-Aufruf an /api/** wird im Browser abgefangen,
// protokolliert und mit { ok: true, id: "E2E-…" } beantwortet. Externe Hosts sind gesperrt.
// Geprüft wird, was das Frontend an /api/anfrage schicken WÜRDE, und dass die Erfolgsansicht kommt.
//
// Tests mit { todo: "Paket …" } sind Abnahmekriterien anderer Pakete aus Welle 1. Sie laufen mit,
// brechen verify aber nicht (Status „todo“), bis das Paket fertig ist – dann „todo“ entfernen.

import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { lade, ladePlaywright, neuerKontext, serverErreichbar } from "../browser.mjs";

const TEST_KONTAKT = { vorname: "Erika", nachname: "Funneltest", email: "e2e.funnel@example.com" };
const ZEIT = { timeout: 360_000 };

let browser;
let bereit = "";

before(async () => {
  const pw = await ladePlaywright();
  if (!pw) return void (bereit = "Playwright nicht gefunden (PLAYWRIGHT_PFAD setzen, siehe qa/README.md)");
  if (!(await serverErreichbar())) return void (bereit = "Dev-Server nicht erreichbar (npm run dev, Port 3100)");
  browser = await pw.chromium.launch();
});
after(async () => browser?.close());

/** Neuer Kontext mit POST-Falle. Liefert page und die Liste abgefangener Aufrufe. */
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
    posts.push({ url: new URL(req.url()).pathname, methode: req.method(), body });
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, id: `E2E-${posts.length}` }) });
  });
  const page = await ctx.newPage();
  const fehler = [];
  page.on("pageerror", (e) => fehler.push(String(e)));
  return { ctx, page, posts, fehler };
}

/** Seite laden; bei HTTP-Fehler sofort abbrechen statt auf Formulare zu warten (Budget < 10 min). */
async function ladeOk(page, pfad) {
  const status = await lade(page, pfad);
  assert.equal(status, 200, `${pfad} liefert HTTP ${status}`);
}

/** Wartet, bis React das Formular übernommen hat (sonst würde ein Klick nativ per GET absenden). */
async function hydriert(form) {
  await form.waitFor({ state: "visible", timeout: 120_000 });
  await form.evaluate(
    (f) =>
      new Promise((ok, nein) => {
        const t0 = Date.now();
        const pruefe = () => (Object.keys(f).some((k) => k.startsWith("__reactProps")) ? ok() : Date.now() - t0 > 60_000 ? nein(new Error("Formular nicht hydriert")) : setTimeout(pruefe, 200));
        pruefe();
      })
  );
}

/** Das Anfrageformular (erkennbar am Feld „Vorname“). */
const anfrageForm = (page) => page.locator("form").filter({ has: page.getByLabel(/^Vorname/) }).first();

async function fuelleUndSende(form, { plz, land, nachricht = "Automatischer Funnel-Test – bitte ignorieren." } = {}) {
  await hydriert(form);
  await form.scrollIntoViewIfNeeded();
  await form.getByLabel(/^Vorname/).fill(TEST_KONTAKT.vorname);
  await form.getByLabel(/^Nachname/).fill(TEST_KONTAKT.nachname);
  await form.getByLabel(/^E-Mail/).fill(TEST_KONTAKT.email);
  if (land) {
    const sel = form.locator('select[name="land"], select[data-feld="land"]').first();
    if (await sel.count()) await sel.selectOption(land);
    else {
      const l = form.getByLabel(/^Land/).first();
      if (await l.count()) await l.selectOption(land);
    }
  }
  if (plz) await form.getByLabel(/^PLZ/).fill(plz);
  const n = form.getByLabel(/Nachricht/).first();
  if (await n.count()) await n.fill(nachricht);
  // Pflicht-Häkchen setzen, falls (noch) vorhanden – Paket C ersetzt die Pflicht-Einwilligung durch einen Hinweis
  const einw = form.locator('input[type="checkbox"][name="einwilligung"]');
  if (await einw.count()) {
    assert.equal(await einw.isChecked(), false, "Einwilligung darf nicht vorbelegt sein");
    await einw.check({ force: true });
  }
  await form.locator('button[type="submit"]').first().click();
}

async function warteAufPost(posts, pfad = "/api/anfrage", ms = 30_000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const p = posts.find((x) => x.url === pfad);
    if (p) return p;
    await new Promise((r) => setTimeout(r, 200));
  }
  return null;
}

const erfolg = (page) => page.getByText(/Anfrage eingegangen/).first().waitFor({ state: "visible", timeout: 30_000 });

function pruefeGrunddaten(post, typ) {
  assert.ok(post, "kein POST an /api/anfrage abgefangen");
  const b = post.body;
  assert.equal(typeof b, "object", "Body ist kein JSON");
  if (typ) assert.equal(b.typ, typ, `typ: erwartet ${typ}, war ${b.typ}`);
  assert.equal(b.kontakt?.email, TEST_KONTAKT.email);
  assert.equal(b.kontakt?.vorname, TEST_KONTAKT.vorname);
  assert.ok(!("website" in (b.kontakt || {})) && !("website" in b), "Honeypot-Feld darf nicht mitgesendet werden");
}

// ---------------------------------------------------------------------------------

test("Kontakt: Anfrage wird gesendet, Erfolgsansicht erscheint", ZEIT, async () => {
  const { ctx, page, posts, fehler } = await sitzung();
  try {
    await ladeOk(page, "/kontakt");
    await fuelleUndSende(anfrageForm(page));
    const post = await warteAufPost(posts);
    pruefeGrunddaten(post);
    await erfolg(page);
    assert.deepEqual(fehler, [], "JS-Fehler auf der Seite");
  } finally {
    await ctx.close();
  }
});

test("Kontakt: leeres Absenden sendet nichts", ZEIT, async () => {
  const { ctx, page, posts } = await sitzung(390);
  try {
    await ladeOk(page, "/kontakt");
    const form = anfrageForm(page);
    await hydriert(form);
    await form.locator('button[type="submit"]').first().click();
    await page.waitForTimeout(800);
    assert.equal(posts.filter((p) => p.url === "/api/anfrage").length, 0, "trotz leerer Pflichtfelder gesendet");
    const fokus = await page.evaluate(() => document.activeElement?.tagName);
    assert.ok(["INPUT", "TEXTAREA", "SELECT"].includes(fokus), `Fokus nach Fehler nicht auf einem Feld (${fokus})`);
  } finally {
    await ctx.close();
  }
});

test("Kommunen: Anfrage mit deutscher PLZ", ZEIT, async () => {
  const { ctx, page, posts } = await sitzung();
  try {
    await ladeOk(page, "/de/kommunen");
    // Kontaktfelder sind gesperrt, bis die Gemeinde angegeben ist
    const gemeinde = page.getByRole("textbox", { name: /^Gemeinde/ }).first();
    await hydriert(gemeinde);
    await gemeinde.fill("Funneltest-Gemeinde");
    await fuelleUndSende(anfrageForm(page), { plz: "87719" });
    const post = await warteAufPost(posts);
    pruefeGrunddaten(post, "kommune");
    assert.equal(post.body.kontakt?.plz, "87719");
    await erfolg(page);
  } finally {
    await ctx.close();
  }
});

test("Reststrom: Anfrage aus Deutschland", ZEIT, async () => {
  const { ctx, page, posts } = await sitzung();
  try {
    await ladeOk(page, "/de/reststrom");
    await fuelleUndSende(anfrageForm(page), { land: "DE", plz: "80331" });
    const post = await warteAufPost(posts);
    pruefeGrunddaten(post);
    assert.equal(post.body.kontakt?.plz, "80331");
    await erfolg(page);
  } finally {
    await ctx.close();
  }
});

for (const [land, plz] of [["AT", "5020"], ["CH", "8001"]]) {
  test(`Reststrom: PLZ ${plz} (${land}) wird angenommen, Land bleibt ${land}`, ZEIT, async () => {
    const { ctx, page, posts } = await sitzung();
    try {
      await ladeOk(page, "/de/reststrom");
      await fuelleUndSende(anfrageForm(page), { land, plz });
      const post = await warteAufPost(posts, "/api/anfrage", 8_000);
      assert.ok(post, `Formular hat PLZ ${plz} (${land}) nicht abgeschickt`);
      assert.equal(post.body.kontakt?.plz, plz);
      assert.equal(post.body.kontakt?.land, land);
    } finally {
      await ctx.close();
    }
  });
}

test("Flächencheck: Assistent bis zum Ergebnis, Anfrage enthält die Eingaben (12 ha)", ZEIT, async () => {
  const { ctx, page, posts, fehler } = await sitzung();
  try {
    await ladeOk(page, "/de/flaechencheck");
    const check = page.locator("#check");
    await check.waitFor({ state: "visible", timeout: 120_000 });
    await hydriert(check);
    const weiter = check.getByRole("button", { name: /^(Weiter|Nichts davon – weiter|Ergebnis anzeigen)/ });
    for (let schritt = 0; schritt < 4; schritt++) {
      // je Radiogruppe ohne Auswahl die erste Option wählen (mehrfach: Auswahl kann neue Gruppen einblenden, z. B. Land → Region)
      for (let runde = 0; runde < 3; runde++) {
        const gruppen = await check.locator('input[type="radio"]').evaluateAll((els) => [...new Set(els.map((e) => e.name))]);
        let neu = 0;
        for (const g of gruppen) {
          if (await check.locator(`input[type="radio"][name="${g}"]:checked`).count()) continue;
          await check.locator(`input[type="radio"][name="${g}"]`).first().check({ force: true });
          neu++;
        }
        if (!neu) break;
        await page.waitForTimeout(400);
      }
      const ha = check.locator("#fc-ha-genau");
      if (await ha.count()) {
        await ha.fill("12");
        await ha.blur();
      }
      await weiter.first().click();
      await page.waitForTimeout(500);
    }
    await page.getByText(/Ihr Ergebnis/).first().waitFor({ timeout: 30_000 });
    await fuelleUndSende(anfrageForm(page), { plz: "87719" });
    const post = await warteAufPost(posts);
    pruefeGrunddaten(post, "flaeche");
    const e = post.body.daten?.eingaben;
    assert.ok(e, "daten.eingaben fehlt im POST");
    assert.equal(Number(e.flaecheHa), 12, `flaecheHa im POST: ${e.flaecheHa}`);
    await erfolg(page);
    assert.deepEqual(fehler, [], "JS-Fehler auf der Seite");
  } finally {
    await ctx.close();
  }
});
