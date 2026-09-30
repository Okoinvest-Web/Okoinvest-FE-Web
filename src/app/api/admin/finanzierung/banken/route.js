// POST /api/admin/finanzierung/banken – Bank anlegen bzw. ändern (mit id) { name, land, art, ansprechpartner, email, telefon?, schwerpunkt?, notiz? }
import { route } from "@/lib/plattform/server/route";
import { finanzierungBackend } from "@/lib/plattform/backend/finanzierung";

export const POST = route({ admin: true }, async ({ nutzer, body }) => ({ ok: true, bank: await finanzierungBackend().fzBankSpeichern(nutzer, body) }));
