// src/lib/plattform/backend/demo/sicherheitWerkzeuge.js
// Interne Helfer aus demo.js für Login, Sicherheit & Teams (teams.js, sicherheit.js).
// demo.js registriert sie über sicherheitWerkzeugeSetzen() – kein Zirkelimport.
export const internSicherheit = {};
export function sicherheitWerkzeugeSetzen(w) {
  Object.assign(internSicherheit, w);
}
