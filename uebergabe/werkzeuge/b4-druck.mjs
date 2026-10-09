// Druckansicht (print media) als Bild + PDF – Paket B4
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
const [url, out] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 794, height: 1123 } });
const fehler = [];
p.on("pageerror", (e) => fehler.push(String(e)));
await p.goto(url, { waitUntil: "networkidle", timeout: 120000 });
await p.emulateMedia({ media: "print" });
await p.waitForTimeout(500);
await p.screenshot({ path: `${out}/druck-full.png`, fullPage: true });
await p.pdf({ path: `${out}/bericht.pdf`, format: "A4", printBackground: true });
const sichtbar = await p.evaluate(() => [...document.querySelectorAll("nav, footer:not(#ov-bericht footer), header:not(#ov-bericht header)")].filter((e) => getComputedStyle(e).visibility !== "hidden" && e.getBoundingClientRect().height > 0).length);
const links = await p.evaluate(() => getComputedStyle(document.querySelector("#ov-bericht a.ov-bericht-link[href^='http']"), "::after").content);
console.log(`sichtbare Navigation/Fuß außerhalb des Berichts: ${sichtbar}; Link-Ausschreibung: ${links.slice(0, 80)}; Fehler: ${fehler.length}`);
await b.close();
