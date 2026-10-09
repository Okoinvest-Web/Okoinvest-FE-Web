// src/lib/sprache/termine.js – englische Begriffe der öffentlichen Terminbuchung (/en/termin)
// Gleiche Schlüssel wie TERMIN_ARTEN (src/lib/plattform/termine/index.js). Dauer, Kanal und Regeln
// kommen weiter aus TERMIN_ARTEN – hier stehen nur Texte. Zeiten bleiben in Europe/Vienna (MEZ/MESZ).

import { TZ } from "../plattform/termine/index.js";

export const TERMIN_ARTEN_EN = Object.freeze({
  besichtigung: { label: "Site visit", kurz: "Site visit", text: "A joint appointment on your land: location, access, grid connection options and next steps." },
  beratung_telefon: { label: "Advice by phone", kurz: "Phone", text: "A short conversation about your question – we will call you at the booked time." },
  beratung_video: { label: "Advice by video", kurz: "Video", text: "Video call with screen sharing, e.g. for your land check result, lease model or project valuation." },
  gemeinde: { label: "Municipal meeting", kurz: "Municipality", text: "Meeting with the mayor or the building authority – introduction, participation models, land-use planning." },
  datenraum: { label: "Data room session", kurz: "Data room", text: "Guided review of the data room with questions to the transaction team (after NDA approval)." },
  identifizierung: { label: "Identification by video", kurz: "Identification", text: "Video call with our compliance team to verify your identity – please have your ID ready." },
});

/** Terminart in der Sprache der Seite (Rückfall Deutsch). */
export const terminArt = (art, id, sprache) => (sprache === "en" && TERMIN_ARTEN_EN[id] ? { ...art, ...TERMIN_ARTEN_EN[id] } : art);

/** „Tue, 06/10/2026, 10:00–11:30 (CET)“ – englische Fassung von zeitraumText() */
export function zeitraumTextEn(startIso, endeIso) {
  const s = new Date(startIso);
  const e = new Date(endeIso);
  if (Number.isNaN(s.getTime())) return "–";
  const tag = s.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short", year: "numeric", timeZone: TZ });
  const z = (d) => d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: TZ });
  return `${tag}, ${z(s)}–${Number.isNaN(e.getTime()) ? "" : z(e)} (Vienna/Berlin time)`;
}
