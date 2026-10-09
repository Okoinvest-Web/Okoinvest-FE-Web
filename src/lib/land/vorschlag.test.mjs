// Ländermodell: Cookie „land“ (nur nach aktiver Wahl), keine Navigation je Land mehr nötig
import { test } from "node:test";
import assert from "node:assert/strict";
import { LAND_COOKIE, LAND_COOKIE_MAX_AGE, landAusCookie, landCookieZeile } from "./index.js";

test("Cookie „land“: lesen nur gültiger Werte, Zeile nur für gültige Länder", () => {
  assert.equal(LAND_COOKIE, "land");
  assert.equal(LAND_COOKIE_MAX_AGE, 60 * 60 * 24 * 365);
  assert.equal(landAusCookie("a=1; land=AT; b=2"), "AT");
  assert.equal(landAusCookie("land=ch"), "CH");
  assert.equal(landAusCookie("land=xx"), null);
  assert.equal(landAusCookie("landx=AT"), null);
  assert.equal(landAusCookie("land=%E0%A4%A"), null, "kaputte Kodierung wirft nicht");
  assert.equal(landAusCookie(""), null);
  assert.equal(landAusCookie(undefined), null);
  assert.match(landCookieZeile("ch"), /^land=CH; Path=\/; Max-Age=\d+; SameSite=Lax; Secure$/);
  assert.equal(landCookieZeile("ch", { https: false }).includes("Secure"), false);
  assert.equal(landCookieZeile("<script>"), null);
});
