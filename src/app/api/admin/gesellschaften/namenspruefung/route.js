// POST /api/admin/gesellschaften/namenspruefung – Firmennamen-Vorprüfung { rechtsform, name } (Registersuche im Sitzland +
//      eigene Gesellschaften, Rechtsformzusatz, irreführende Begriffe) – ändert nichts, daher genügt Leserecht
import { route } from "@/lib/plattform/server/route";
import { diensteBackend } from "@/lib/plattform/backend/dienste";

export const POST = route({ admin: true, recht: [{ bereich: "gesellschaften", stufe: 1 }] }, async ({ nutzer, body }) => ({ ok: true, ...(await diensteBackend().gesellschaftNamenPruefen(nutzer, { rechtsform: body.rechtsform, name: body.name })) }));
