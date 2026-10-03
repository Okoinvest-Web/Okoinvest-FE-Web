// src/lib/land/navigation.js – Navigation und Footer je Land (Welle 2)
//
// src/data/navigation.js führt nur Schlüssel (Pfade ohne Länderpräfix). Hier werden sie für das
// Land der Seite aufgelöst. Fehlt eine Seite im Land, führt der Link in das Land, für das sie gilt,
// und trägt `giltFuer` („für Deutschland“) – Navbar und Footer zeigen das sichtbar an.

import { NAVIGATION } from "../../data/navigation.js";
import { ziel } from "./pfad.js";

/** Ein Link im Kontext eines Landes: { href, giltFuer } */
export function navLink(href, land) {
  const z = ziel(href, land);
  return { href: z.href, giltFuer: z.art === "anderesLand" || z.art === "einstieg" ? z.giltFuer : null };
}

/** Navigation mit aufgelösten Links für ein Land (DE | AT | CH). */
export function navigationFuer(land = "DE") {
  return NAVIGATION.map((n) => ({
    ...n,
    groups: n.groups.map((g) => ({ ...g, items: g.items.map((it) => ({ ...it, ...navLink(it.href, land) })) })),
    ...(n.feature ? { feature: { ...n.feature, ...navLink(n.feature.href, land) } } : {}),
  }));
}
