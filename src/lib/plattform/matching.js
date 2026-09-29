// src/lib/plattform/matching.js
//
// Passung Projekt ↔ Suchprofil eines Investors (0–100 Punkte).
// Gewichte: Typ 25, Phase 25, Land 20, Größe 20, Ticket 10.
// Leere Kriterien im Profil zählen als „egal“ (volle Punkte).

import { preisGesamt } from "./format";
import { PHASEN } from "@/lib/invest/markt";
import { LAENDER, PROJEKT_TYPEN } from "./konstanten";

export function matching(projekt, profil) {
  if (!projekt) return { score: 0, gruende: [] };
  const p = profil || {};
  const gruende = [];
  let score = 0;

  // Typ
  if (!p.typen?.length || p.typen.includes(projekt.typ)) {
    score += 25;
    if (p.typen?.length) gruende.push(PROJEKT_TYPEN[projekt.typ] || projekt.typ);
  }

  // Phase – benachbarte Phase gibt halbe Punkte
  if (!p.phasen?.length) score += 25;
  else if (p.phasen.includes(projekt.phase)) {
    score += 25;
    gruende.push(PHASEN.find((x) => x.id === projekt.phase)?.kurz || projekt.phase);
  } else {
    const idx = PHASEN.findIndex((x) => x.id === projekt.phase);
    const nah = p.phasen.some((ph) => Math.abs(PHASEN.findIndex((x) => x.id === ph) - idx) === 1);
    if (nah) score += 12;
  }

  // Land
  if (!p.laender?.length || p.laender.includes(projekt.land)) {
    score += 20;
    if (p.laender?.length) gruende.push(LAENDER[projekt.land] || projekt.land);
  }

  // Größe – bis 25 % außerhalb der Spanne halbe Punkte
  const m = Number(projekt.mwp) || 0;
  const min = Number(p.mwpMin) || 0;
  const max = Number(p.mwpMax) || Infinity;
  if (m >= min && m <= max) {
    score += 20;
    if (p.mwpMin || p.mwpMax) gruende.push("Größe passt");
  } else if (m >= min * 0.75 && m <= max * 1.25) score += 10;

  // Ticket
  const preis = preisGesamt(projekt);
  const tMin = Number(p.ticketMin) || 0;
  const tMax = Number(p.ticketMax) || Infinity;
  if (!p.ticketMin && !p.ticketMax) score += 10;
  else if (preis === null) score += 5; // auf Anfrage – offen
  else if (preis >= tMin && preis <= tMax) {
    score += 10;
    gruende.push("Ticket passt");
  }

  return { score: Math.round(score), gruende };
}
