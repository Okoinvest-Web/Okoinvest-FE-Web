// Grundbuch-Status an einer Fläche bzw. Anlage (Server-Komponente, lädt selbst). Zeigt nur Akten, die der Nutzer sehen
// darf (Backoffice mit Bereich „grundbuch“ bzw. Eigentümer der Akte); ohne Akte oder bei Fehler nichts.

import { closingBackend } from "@/lib/plattform/backend/closing";
import { GrundbuchKurz } from "./GrundbuchAnzeige";

export default async function GrundbuchAmObjekt({ nutzer, bezugArt, bezugId }) {
  let akten = [];
  try {
    akten = (await closingBackend().gbZuBezug(nutzer, { bezugArt, bezugId })).akten || [];
  } catch {
    return null;
  }
  if (!akten.length) return null;
  return <GrundbuchKurz akten={akten} admin={akten[0]?.meineRolle === "backoffice"} />;
}
