// GET    /api/admin/geodaten/gemeinden?land=&bundesland=&bezirk=&minPunkte= – Gemeinde-Screening mit Ranking
// PATCH  /api/admin/geodaten/gemeinden { schluessel, name, land, bundesland, bauleitplanung?, kriterienkatalog?, notiz? }
// DELETE /api/admin/geodaten/gemeinden { schluessel } – gepflegte Angaben entfernen (nur Leitung)
import { route } from "@/lib/plattform/server/route";
import { akquise2Backend } from "@/lib/plattform/backend/akquise2";
import { gemeindenScreening } from "@/lib/plattform/geodaten/akquise2";

const RECHT = [{ bereich: "geodaten", stufe: 2 }, { bereich: "akquise", stufe: 2 }];

export const GET = route({ admin: true }, async ({ nutzer, suche }) => ({ ok: true, ...(await gemeindenScreening(nutzer, { land: suche.get("land"), bundesland: suche.get("bundesland"), bezirk: suche.get("bezirk"), minPunkte: suche.get("minPunkte") })) }));
export const PATCH = route({ admin: true, recht: RECHT }, async ({ nutzer, body }) => akquise2Backend().gemeindeSpeichern(nutzer, body.schluessel, body));
export const DELETE = route({ admin: true, recht: RECHT }, async ({ nutzer, body }) => akquise2Backend().gemeindeZuruecksetzen(nutzer, body?.schluessel));
