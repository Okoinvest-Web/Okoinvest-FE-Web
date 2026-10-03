import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals"),
  {
    // Welle 2, Länderrouting: Die Regel ist für das Pages-Verzeichnis gebaut. Mit dem dynamischen Segment
    // src/app/(laender)/[land] hält sie JEDEN Pfad ohne Punkt für eine Seite und meldet auch Datei-Downloads
    // (/api/…/export) und Portal-Links als Fehler. Interne Links prüfen der Link-Codemod (verify Schritt 7)
    // und qa/link-pruefung.mjs.
    rules: { "@next/next/no-html-link-for-pages": "off" },
  },
];

export default eslintConfig;
