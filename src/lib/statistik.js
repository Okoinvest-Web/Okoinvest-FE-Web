// src/lib/statistik.js – Altpfad, bleibt für bestehende Importe erhalten.
// Die Messung liegt jetzt in src/lib/ereignis (Ereigniskatalog, Positivliste, nur mit Einwilligung).
// Neue Aufrufe bitte direkt über `@/lib/ereignis` (Hook useEreignis) anbinden.

export { ereignis } from "./ereignis/senden.js";
