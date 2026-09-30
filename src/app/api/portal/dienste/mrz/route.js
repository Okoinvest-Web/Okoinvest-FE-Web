// POST /api/portal/dienste/mrz – automatische MRZ-Vorprüfung (ICAO 9303: Prüfziffern, Ablauf, Abgleich mit dem Konto)
//      { zeilen } → { ergebnis: plausibel|auffaellig|ungueltig, hinweise, mrz, abgleich, kycVerknuepft }
//      Ergebnis wird als Hinweis an den eigenen KYC-Fall gehängt (ersetzt keine Prüfung). Die MRZ selbst wird nicht gespeichert.
import { route } from "@/lib/plattform/server/route";
import { rateLimit } from "@/lib/plattform/server/rateLimit";
import { diensteBackend } from "@/lib/plattform/backend/dienste";

export const POST = route({ maxBytes: 4 * 1024 }, async ({ nutzer, body }) => {
  rateLimit(`mrz:${nutzer.id}`, process.env.NODE_ENV === "production" ? 20 : 200, 60 * 60 * 1000);
  return { ok: true, ...(await diensteBackend().mrzPruefen(nutzer, { zeilen: typeof body.zeilen === "string" ? body.zeilen : "" })) };
});
