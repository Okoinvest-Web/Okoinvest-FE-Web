// Unbekannte Unterseiten der englischen Fassungen (/en/at/…, /en/de/… und /en/<unbekannt>/…):
// 404 INNERHALB des englischen Root-Layouts (lang="en", englischer Text aus en/not-found.js,
// Links in Sprache und Land der Seite). Explizite Seiten haben Vorrang; diese Route rendert nie
// Inhalt. Ausnahme im Register-Abgleich von scripts/landfassungen.mjs (keine Seite, nur 404).
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function UnbekannteEnglischeSeite() {
  notFound();
}
