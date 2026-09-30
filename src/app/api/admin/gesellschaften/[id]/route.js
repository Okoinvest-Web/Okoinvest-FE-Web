// GET   /api/admin/gesellschaften/[id] – Gesellschaft mit Checkliste, Dokumentenliste, Fristen, Verlauf
// PATCH /api/admin/gesellschaften/[id] – Stammdaten (Kernangaben nur vor der Beurkundung; danach nur Bilanzstichtag,
//       Steuernummer, Status „aufgeloest“)
import { route } from "@/lib/plattform/server/route";
import { diensteBackend } from "@/lib/plattform/backend/dienste";

export const GET = route({ admin: true }, async ({ nutzer, params }) => ({ ok: true, ...(await diensteBackend().gesellschaft(nutzer, params.id)) }));

export const PATCH = route({ admin: true }, async ({ nutzer, params, body }) => ({ ok: true, ...(await diensteBackend().gesellschaftAendern(nutzer, params.id, body)) }));
