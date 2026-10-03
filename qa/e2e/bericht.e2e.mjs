// qa/e2e/bericht.e2e.mjs – Bericht-Baustein Stufe 1 (Welle 2, Paket B4)
//
//   node --test --test-concurrency=1 qa/e2e/bericht.e2e.mjs
//   (Dev-Server muss laufen: QA_BASIS_URL, Standard http://localhost:3100)
//
// Läuft NUR im Demo-Modus (GET /api/rechner/bericht → modus "demo"): Die Bestätigungs-Mail landet im Demo-Postausgang,
// es geht nichts raus. In jedem anderen Modus werden die Tests übersprungen (kein Versand, keine Daten).
// Ablauf: Rechner → „Bericht anfordern“ → Postausgang (Demo-Anmeldung Backoffice) → Bestätigungsseite (Knopf, POST)
// → Bericht mit Kennzahlen, Rechenweg, Annahmenbuch, Prüf-ID. Dazu: alle vier Rechner zeigen den Baustein,
// das Ergebnis bleibt ohne Angaben sichtbar; die API lehnt fremde Rechner mit 422 ab.

import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { BASIS, lade, ladePlaywright, neuerKontext, serverErreichbar } from "../browser.mjs";

const ZEIT = { timeout: 420_000 };
const EMAIL = `e2e.bericht.${Date.now().toString(36)}@example.com`;
let browser;
let bereit = "";
let demo = false;

before(async () => {
  const pw = await ladePlaywright();
  if (!pw) return void (bereit = "Playwright nicht gefunden (PLAYWRIGHT_PFAD setzen, siehe qa/README.md)");
  if (!(await serverErreichbar())) return void (bereit = "Dev-Server nicht erreichbar (npm run dev, Port 3100)");
  const s = await fetch(`${BASIS}/api/rechner/bericht`).then((r) => r.json()).catch(() => ({}));
  demo = s?.modus === "demo";
  browser = await pw.chromium.launch();
});
after(async () => browser?.close());

async function sitzung(breite = 1440) {
  assert.ok(!bereit, bereit);
  const ctx = await neuerKontext(browser, { breite });
  const page = await ctx.newPage();
  const fehler = [];
  page.on("pageerror", (e) => fehler.push(String(e)));
  page.on("console", (m) => m.type() === "error" && !/status of 4(04|10)/.test(m.text()) && fehler.push(m.text()));
  return { ctx, page, fehler };
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

// Flächencheck: Ergebnis-Schritt über den gespeicherten Zwischenstand öffnen (wie nach Schritt 4)
const FC_STAND = { schritt: 4, land: "DE", regionId: "de-sued", ha: 14, nutzung: "acker", besonderheiten: [], netz: "1-3", eigentum: "allein" };
const SEITEN = [
  ["pacht", "/de/rechner/pacht"],
  ["pachtangebot", "/de/rechner/pachtangebot-check"],
  ["kommune", "/de/rechner/kommune"],
  ["flaechencheck", "/de/flaechencheck"],
];

for (const breite of [1440, 390]) {
  test(`${breite}px: alle vier Rechner zeigen den Bericht-Baustein, Ergebnis bleibt frei, kein Überlauf`, ZEIT, async (t) => {
    if (!demo) return t.skip("nur im Demo-Modus");
    const { ctx, page, fehler } = await sitzung(breite);
    try {
      await ctx.addInitScript((s) => window.sessionStorage.setItem("ov-flaechencheck", JSON.stringify(s)), FC_STAND);
      for (const [rechner, pfad] of SEITEN) {
        assert.equal(await lade(page, pfad), 200, pfad);
        const box = page.locator(`[data-bericht-anfordern="${rechner}"]`);
        await box.waitFor({ state: "attached", timeout: 120_000 });
        await page.locator(`[data-bericht-anfordern="${rechner}"][data-bericht-status="an"]`).waitFor({ timeout: 60_000 });
        await box.scrollIntoViewIfNeeded();
        assert.ok(await box.getByRole("button", { name: "Bericht anfordern" }).isVisible(), `${rechner}: Knopf`);
        assert.equal(await box.locator("input").count(), 0, `${rechner}: Formular erst nach Klick (ruhiger Zusatz)`);
        const breiteSeite = await page.evaluate(() => document.documentElement.scrollWidth);
        assert.ok(breiteSeite <= breite, `${rechner}: kein horizontaler Überlauf (${breiteSeite})`);
      }
      assert.deepEqual(fehler, [], "Konsolen-/JS-Fehler");
    } finally {
      await ctx.close();
    }
  });
}

test("Anfordern → Postausgang → Bestätigen → Bericht (Demo-Modus)", ZEIT, async (t) => {
  if (!demo) return t.skip("nur im Demo-Modus");
  const { ctx, page, fehler } = await sitzung(1440);
  try {
    assert.equal(await lade(page, "/de/rechner/pacht"), 200);
    const box = page.locator('[data-bericht-anfordern="pacht"][data-bericht-status="an"]');
    const knopf = box.getByRole("button", { name: "Bericht anfordern" });
    await hydriert(knopf);
    await knopf.click();
    const form = box.locator("form");
    await form.getByLabel(/^Vorname/).fill("Erika");
    await form.getByLabel(/^Nachname/).fill("Berichttest");
    await form.getByLabel(/^E-Mail/).fill(EMAIL);
    // Telefon bleibt leer (freiwillig); kein Häkchen vorbelegt
    for (const h of await form.locator('input[type="checkbox"]').all()) assert.equal(await h.isChecked(), false, "nicht vorbelegt");
    const antwort = page.waitForResponse((r) => r.url().endsWith("/api/rechner/bericht") && r.request().method() === "POST");
    await form.locator('button[type="submit"]').click();
    const res = await antwort;
    assert.equal(res.status(), 200);
    const gesendet = res.request().postDataJSON();
    const erlaubt = ["einwilligungen", "eingaben", "herkunft", "kontakt", "land", "rechner"];
    assert.deepEqual(Object.keys(gesendet).filter((k) => !erlaubt.includes(k)), [], "nur Eingaben, Kontakt, Land, Häkchen");
    assert.equal(gesendet.ergebnis, undefined, "kein Ergebnis vom Browser");
    assert.equal(gesendet.kontakt.telefon, undefined, "ohne Telefon angenommen");
    await box.getByRole("heading", { name: /Bitte bestätigen Sie/ }).waitFor({ timeout: 30_000 });

    // Postausgang (Demo): Bestätigungslink holen
    const login = await ctx.request.post(`${BASIS}/api/auth/login`, { headers: { Origin: BASIS, "Content-Type": "application/json" }, data: { email: "admin@example.com", passwort: process.env.PLATTFORM_DEMO_PASSWORT || "Demo-2026!" } });
    assert.equal(login.status(), 200, "Demo-Anmeldung Backoffice");
    const pa = await (await ctx.request.get(`${BASIS}/api/admin/postausgang?limit=50`)).json();
    const mail = pa.mails.find((m) => m.an === EMAIL && m.art === "bericht_doi");
    assert.ok(mail, "Bestätigungs-Mail im Postausgang");
    const pfad = new URL(mail.link).pathname;
    assert.match(pfad, /^\/bericht\/[A-Za-z0-9_-]{43}$/);
    const token = pfad.split("/").pop();
    await ctx.clearCookies(); // Bestätigung ohne Anmeldung, wie ein normaler Empfänger

    // Bestätigungsseite: GET bestätigt nicht
    assert.equal(await lade(page, pfad), 200);
    await page.getByRole("heading", { name: "Bericht bestätigen" }).waitFor({ timeout: 60_000 });
    const stand = await (await ctx.request.get(`${BASIS}/api/rechner/bericht/bestaetigen?token=${token}`)).json();
    assert.equal(stand.zustand, "offen", "Seitenaufruf allein bestätigt nicht");
    const bestaetigen = page.locator("[data-bericht-bestaetigen]");
    await hydriert(bestaetigen);
    await bestaetigen.click();

    // Bericht
    await page.locator("#ov-bericht").waitFor({ timeout: 90_000 });
    await page.getByRole("heading", { level: 1, name: "Pachtrechner Solarpark" }).waitFor();
    const text = await page.locator("#ov-bericht").innerText();
    assert.match(text, /Prüf-ID\s*\n?\s*[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}/);
    assert.match(text, /Annahmenbuch/);
    assert.match(text, /Prüfung ausstehend/, "zu prüfende Werte sichtbar markiert");
    assert.match(text, /Prüfung Rechtsabteilung/);
    assert.match(text, /Rechenweg/);
    assert.ok(!text.includes(EMAIL) && !/Berichttest/.test(text), "keine Personendaten im Bericht");
    const robots = await page.locator('meta[name="robots"]').evaluateAll((l) => l.map((m) => m.content));
    assert.ok(robots.length && robots.every((r) => /noindex/.test(r)), `noindex: ${robots}`);
    assert.deepEqual(fehler, [], "Konsolen-/JS-Fehler");
  } finally {
    await ctx.close();
  }
});

test("API: fremder Rechner 422, unbekanntes Token 404", ZEIT, async (t) => {
  if (!demo) return t.skip("nur im Demo-Modus");
  const r = await fetch(`${BASIS}/api/rechner/bericht`, {
    method: "POST",
    headers: { Origin: BASIS, "Content-Type": "application/json" },
    body: JSON.stringify({ rechner: "solarpark", land: "DE", eingaben: {}, kontakt: { vorname: "A", nachname: "B", email: EMAIL } }),
  });
  assert.equal(r.status, 422);
  const u = await fetch(`${BASIS}/api/rechner/bericht/bestaetigen?token=${"A".repeat(43)}`);
  assert.equal(u.status, 404);
});
