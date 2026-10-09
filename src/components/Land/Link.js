"use client";

// Link, der in Sprache und Land der Seite bleibt (Länder- und Sprachmodell):
//   auf /at/…     href="/rechner/pacht" → /at/rechner/pacht
//   auf /en/at/…  href="/rechner/pacht" → /en/at/rechner/pacht
//   auf /en/…     href="/rechner/pacht" → /en/rechner/pacht
//   gemeinsam     href="/rechner/pacht" → /rechner/pacht
// Pfade ohne Länder-/Sprachfassung (Portal, Login …), externe Links und Anker bleiben unverändert.
// Ausdrücklich gesetzte Länderpräfixe ("/at/…") bleiben im Land, bekommen auf englischen Seiten
// aber das Sprachpräfix; ausdrücklich gesetzte Sprachpräfixe ("/en/…") behalten ihre Sprache und
// bekommen nur das Land der Seite, wenn sie keines tragen ("/en" auf /at → /en/at).
// Ersetzt `next/link` in allen öffentlichen Komponenten (gleiche Props, gleiches <a>).

import NextLink from "next/link";
import { forwardRef } from "react";
import { PRAEFIX_MUSTER, SPRACH_MUSTER, landAusPfad, pfad } from "@/lib/land";
import { useSeitenLand } from "./LandKontext";
import { useSprache } from "@/components/Sprache/SpracheKontext";

/** href in Sprache und Land der Seite auflösen (String oder UrlObject). */
export function useLandHref(href) {
  const land = useSeitenLand();
  const sprache = useSprache();
  return landHref(href, land, sprache);
}

function zielPfad(p, land, sprache) {
  // Ausdrückliches Sprachpräfix ohne Land ("/en" im Menü „English“) bleibt im Land der Seite: auf /at → /en/at
  if (SPRACH_MUSTER.test(p)) return land && !landAusPfad(p).land ? pfad(p, land, landAusPfad(p).sprache) : p;
  if (PRAEFIX_MUSTER.test(p)) return sprache === "en" ? pfad(p, landAusPfad(p).land, "en") : p;
  return pfad(p, land, sprache);
}

export function landHref(href, land, sprache = "de") {
  if (typeof href === "string") return zielPfad(href, land, sprache);
  if (href && typeof href === "object" && typeof href.pathname === "string") return { ...href, pathname: zielPfad(href.pathname, land, sprache) };
  return href;
}

const Link = forwardRef(function Link({ href, ...rest }, ref) {
  const ziel = useLandHref(href);
  return <NextLink ref={ref} href={ziel} {...rest} />;
});

export default Link;
