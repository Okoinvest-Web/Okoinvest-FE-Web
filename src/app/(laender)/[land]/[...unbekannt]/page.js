// Unbekannte Unterseiten der Länderfassungen (/de/…, /at/…, /ch/…): 404 INNERHALB des Länder-
// Root-Layouts, damit <html lang> (de-DE/de-AT/de-CH) und die Land-Links der 404-Seite stimmen
// (not-found.js daneben). Ohne diese Route zeigte Next.js für tiefere Pfade die globale 404
// (lang="de", gemeinsame Links). Explizite Seiten haben Vorrang; diese Route rendert nie Inhalt.
// Ausnahme im Register-Abgleich von scripts/landfassungen.mjs (keine Seite, nur 404).
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function UnbekannteLandSeite() {
  notFound();
}
