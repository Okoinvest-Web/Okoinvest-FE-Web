// POST /api/admin/closing/[id]/aktion – { aktion, … }:
//   signing_punkt { schluessel, erledigt, notiz } · signing { datum? } (KYC beider Seiten + Checkliste + Kontaktfreigabe, sonst 409)
//   cp { schluessel, status: offen|gemeldet|erfuellt|verzichtet, nachweis, frist? } · cp_neu { label, verantwortlich, frist, text }
//   zahlung_eingang { datum, betrag } · closing (alle CPs, Zahlung, KYC → Projekt verkauft, Provision, Provisionsrechnung)
//   uebergabe { schluessel, erledigt, notiz } · abbrechen { grund }
import { route } from "@/lib/plattform/server/route";
import { closingBackend } from "@/lib/plattform/backend/closing";

export const POST = route({ admin: true }, async ({ nutzer, params, body, ip }) => ({ ok: true, closing: await closingBackend().clAktion(nutzer, params.id, { ...body, ip }) }));
