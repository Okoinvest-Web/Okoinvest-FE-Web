// test/hilfen/registrieren.mjs – Modulauflösung wie Next.js für node:test (Paket F)
//   node --import ./test/hilfen/registrieren.mjs --test …
// Löst „@/…“ (jsconfig paths) und Importe ohne Dateiendung auf – nur für Dateien des Projekts,
// node_modules bleiben unberührt.
import { register } from "node:module";

register("./aufloesen.mjs", import.meta.url);
