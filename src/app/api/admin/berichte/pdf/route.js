// GET /api/admin/berichte/pdf?monat=JJJJ-MM – Monatsbericht als PDF (mit Vergleich zum Vormonat), Abruf protokolliert
import { route } from "@/lib/plattform/server/route";
import { PlattformFehler } from "@/lib/plattform/fehler";
import { monatsberichtPdf } from "@/lib/plattform/server/monatsbericht";

function monatsGrenzen(m) {
  const [j, mo] = m.split("-").map(Number);
  const ende = new Date(Date.UTC(j, mo, 0)).getUTCDate();
  return { von: `${m}-01`, bis: `${m}-${String(ende).padStart(2, "0")}` };
}

export const GET = route({ admin: true }, async ({ backend, nutzer, suche, ip }) => {
  const heute = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Vienna" }).slice(0, 7);
  const monat = suche.get("monat") || heute;
  if (!/^20\d\d-(0[1-9]|1[0-2])$/.test(monat)) throw new PlattformFehler(422, "Monat im Format JJJJ-MM angeben.");
  const d = new Date(`${monat}-15T12:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() - 1);
  const vormonat = d.toISOString().slice(0, 7);
  const [b, vb] = await Promise.all([backend.bericht(nutzer, monatsGrenzen(monat)), backend.bericht(nutzer, monatsGrenzen(vormonat))]);
  const pdf = monatsberichtPdf({ bericht: b, vormonat: vb, monat, ersteller: [nutzer.vorname, nutzer.nachname].filter(Boolean).join(" ") });
  await backend.protokollEintrag(nutzer, { aktion: "export", objektArt: "export", objektId: "monatsbericht", text: `Monatsbericht ${monat} als PDF`, ip });
  return new Response(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="oekoinvest-monatsbericht-${monat}.pdf"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
});
