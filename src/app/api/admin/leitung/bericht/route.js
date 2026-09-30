// GET /api/admin/leitung/bericht?monat=JJJJ-MM – Management-Bericht der Leitung als PDF (nur Unterrolle „Leitung“).
// Kennzahlen aller Bereiche (server/leitung.js) + Monatswerte (Operation `bericht`); Abruf im Revisionsprotokoll.
import { route } from "@/lib/plattform/server/route";
import { PlattformFehler } from "@/lib/plattform/fehler";
import { leitungKennzahlen, leitungNoetig } from "@/lib/plattform/server/leitung";
import { managementberichtPdf } from "@/lib/plattform/server/managementbericht";

function monatsGrenzen(m) {
  const [j, mo] = m.split("-").map(Number);
  const ende = new Date(Date.UTC(j, mo, 0)).getUTCDate();
  return { von: `${m}-01`, bis: `${m}-${String(ende).padStart(2, "0")}` };
}

export const GET = route({ admin: true }, async ({ backend, nutzer, suche, ip }) => {
  leitungNoetig(nutzer);
  const heute = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Vienna" }).slice(0, 7);
  const monat = suche.get("monat") || heute;
  if (!/^20\d\d-(0[1-9]|1[0-2])$/.test(monat)) throw new PlattformFehler(422, "Monat im Format JJJJ-MM angeben.");
  const [kennzahlen, monatsbericht] = await Promise.all([
    leitungKennzahlen(nutzer),
    backend.bericht(nutzer, monatsGrenzen(monat)).catch(() => null),
  ]);
  const pdf = managementberichtPdf({ kennzahlen, monat, monatsbericht, ersteller: [nutzer.vorname, nutzer.nachname].filter(Boolean).join(" ") });
  await backend.protokollEintrag(nutzer, { aktion: "export", objektArt: "export", objektId: "managementbericht", text: `Management-Bericht ${monat} als PDF`, ip });
  return new Response(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="oekoinvest-management-bericht-${monat}.pdf"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
});
