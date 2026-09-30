// DELETE /api/admin/geodaten/sperrliste/[id] { begruendung } – Sperre aufheben (nur Leitung, nur bei Irrtum, protokolliert)
import { route } from "@/lib/plattform/server/route";
import { akquise2Backend } from "@/lib/plattform/backend/akquise2";

const RECHT = [{ bereich: "geodaten", stufe: 2 }, { bereich: "akquise", stufe: 2 }];

export const DELETE = route({ admin: true, recht: RECHT }, async ({ nutzer, params, body }) => akquise2Backend().sperreAufheben(nutzer, params.id, { begruendung: body?.begruendung }));
