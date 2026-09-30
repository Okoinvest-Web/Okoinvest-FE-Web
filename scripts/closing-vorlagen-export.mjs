// Erzeugt Backend-Import/.../plattform/closing_vorlagen.json aus den JS-Regeln (nach Änderungen an closing/*.js ausführen):
//   node scripts/closing-vorlagen-export.mjs
import { writeFileSync } from "node:fs";
const W = new URL("../src/lib/plattform/closing/", import.meta.url).href;
const G = await import(W + "grundbuch.js");
const C = await import(W + "closing.js");
const form = {};
for (const s of ["asset", "share"]) for (const l of ["DE", "AT", "CH"]) form[`${s}:${l}`] = C.formHinweise(s, l);
const daten = {
  _hinweis: "GENERIERT aus src/lib/plattform/closing/grundbuch.js und closing.js – nicht von Hand ändern (Generator: node scripts/closing-vorlagen-export.mjs)",
  stand: G.GB_STAND,
  GB_LAENDER: G.GB_LAENDER, GB_OBJEKTARTEN: G.GB_OBJEKTARTEN, GB_RECHTE: G.GB_RECHTE, GB_SCHRITT_STATUS: G.GB_SCHRITT_STATUS, GB_STATUS: G.GB_STATUS,
  GB_OFFEN: G.GB_OFFEN, GB_SCHRITTE: G.GB_SCHRITTE, GB_VORLAGEN: G.GB_VORLAGEN, GB_HINWEIS: G.GB_HINWEIS, GB_PORTAL_EINLEITUNG: G.GB_PORTAL_EINLEITUNG, GB_LOESCHUNG: G.GB_LOESCHUNG,
  CL_STRUKTUREN: C.CL_STRUKTUREN, CL_STATUS: C.CL_STATUS, CL_OFFEN: C.CL_OFFEN, CL_VERANTWORTLICH: C.CL_VERANTWORTLICH, CP_STATUS: C.CP_STATUS, SIGNING_PUNKTE: C.SIGNING_PUNKTE,
  CP_STANDARD: C.CP_STANDARD, CP_AUS_LOI: C.CP_AUS_LOI, UEBERGABE_PUNKTE: C.UEBERGABE_PUNKTE, CL_HINWEIS: C.CL_HINWEIS, TREUHAND_HINWEIS: C.TREUHAND_HINWEIS, FORM_HINWEISE: form,
};
writeFileSync(new URL("../Backend-Import/oekoinvest_app/oekoinvest_app/plattform/closing_vorlagen.json", import.meta.url), JSON.stringify(daten, null, 1) + "\n", "utf8");
console.log("ok", Object.keys(daten).length);
