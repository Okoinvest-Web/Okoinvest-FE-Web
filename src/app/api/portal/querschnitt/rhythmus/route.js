// GET /api/portal/querschnitt/rhythmus – { rhythmus, digestZuletzt, vorgemerkt }
// PUT /api/portal/querschnitt/rhythmus – { rhythmus: "sofort" | "taeglich" } E-Mails sofort oder als Tages-Digest
import { route } from "@/lib/plattform/server/route";
import { querschnittBackend } from "@/lib/plattform/backend/querschnitt";

export const GET = route({}, async ({ nutzer }) => ({ ok: true, ...(await querschnittBackend().mailRhythmus(nutzer)) }));
export const PUT = route({}, async ({ nutzer, body }) => ({ ok: true, ...(await querschnittBackend().mailRhythmusSpeichern(nutzer, { rhythmus: String(body?.rhythmus || "") })) }));
