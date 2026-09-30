// POST /api/admin/geodaten/kampagnen/[id]/starten – Status aktiv + je Zielfläche Aufgabe „Grundbuchabfrage“ mit Kostenschätzung
import { route } from "@/lib/plattform/server/route";
import { akquise2Backend } from "@/lib/plattform/backend/akquise2";

const RECHT = [{ bereich: "geodaten", stufe: 2 }, { bereich: "akquise", stufe: 2 }];

export const POST = route({ admin: true, recht: RECHT }, async ({ nutzer, params }) => ({ ok: true, ...(await akquise2Backend().kampagneStarten(nutzer, params.id)) }));

