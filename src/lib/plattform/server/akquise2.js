// src/lib/plattform/server/akquise2.js – Rate-Limits der Akquise-Kampagnen (eigene Tabelle, gleiche Lockerung im Dev-Betrieb
// wie server/rateLimit.js → grenze(); GRENZEN dort bleibt unverändert).

import { rateLimit } from "./rateLimit";

const GRENZEN_AKQ = {
  angebotLesen: [60, 60 * 60e3], // Aufrufe der Angebotsseite je IP (erschwert das Durchprobieren von Codes)
  angebotSchreiben: [10, 60 * 60e3], // Anfrage/Widerspruch je IP
  serienbrief: [30, 60 * 60e3], // PDF/Versandliste je Konto (personenbezogen, protokolliert)
};

export function akqLimit(name, schluessel) {
  const [max, fenster] = GRENZEN_AKQ[name];
  const faktor = process.env.NODE_ENV !== "production" ? Number(process.env.PLATTFORM_RATE_FAKTOR) || 10 : 1;
  rateLimit(`akq:${name}:${schluessel || "ohne"}`, Math.max(1, Math.round(max * faktor)), fenster);
}
