// POST /api/admin/compliance/fristen – Fristen-Lauf (Frappe: täglicher Scheduler): Ausweis-Ablauf, Wiederholungsprüfung,
//      Neuabgleich bei neuem Listenstand, Löschung nach Aufbewahrungsfrist. { fallId? } nur ein Fall; { stichtag?: "JJJJ-MM-TT" } nur außerhalb der Produktion.
import { route } from "@/lib/plattform/server/route";
import { kycBackend } from "@/lib/plattform/backend/kyc";

export const POST = route({ admin: true }, async ({ nutzer, body }) => kycBackend().kycFristen(nutzer, { stichtag: process.env.NODE_ENV === "production" ? null : body.stichtag || null, fallId: typeof body.fallId === "string" ? body.fallId.slice(0, 20) : null }));
