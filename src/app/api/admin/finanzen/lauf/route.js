// POST /api/admin/finanzen/lauf – Abrechnungslauf starten (manuell; im Betrieb zusätzlich täglich per Frappe-Scheduler)
//      { art: pacht|contracting|provision|alle, stichtag?, monat? (JJJJ-MM, Contracting), trockenlauf?, vertragIds?, anlageIds? }
//      → { lauf: { erzeugt[], klaerfaelle[], vorhanden, uebersprungen } }. Idempotent: je Periode höchstens ein Beleg.
import { route } from "@/lib/plattform/server/route";
import { finanzenBackend } from "@/lib/plattform/backend/finanzen";

export const POST = route({ admin: true }, async ({ nutzer, body }) => ({ ok: true, lauf: await finanzenBackend().abrechnungslauf(nutzer, body) }));
