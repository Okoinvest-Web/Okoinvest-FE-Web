// GET /api/admin/finanzen/abrechnungen?art=&status=&q=&limit=[&format=csv] – alle Belege (offene Posten, Suche, Export).
// CSV: Excel-DE (BOM, Semikolon, Formel-Schutz), zusätzlich Bereich „CSV-Export“ nötig; Export wird protokolliert.
import { route } from "@/lib/plattform/server/route";
import { finanzenBackend } from "@/lib/plattform/backend/finanzen";
import { csv } from "@/lib/plattform/csv";
import { darfLesen } from "@/lib/plattform/rechte";
import { backend } from "@/lib/plattform/backend";
import { PlattformFehler } from "@/lib/plattform/fehler";

const SPALTEN = [
  { label: "Nummer", wert: "nummer" },
  { label: "Art", wert: "artLabel" },
  { label: "Beleg", wert: "beleg" },
  { label: "Empfänger", wert: "empfaenger" },
  { label: "Zeitraum von", wert: (b) => b.zeitraum?.von },
  { label: "Zeitraum bis", wert: (b) => b.zeitraum?.bis },
  { label: "Rechnungsdatum", wert: "rechnungsdatum" },
  { label: "Fällig am", wert: "faelligAm" },
  { label: "Netto (EUR)", wert: "netto" },
  { label: "USt (EUR)", wert: "steuerBetrag" },
  { label: "Brutto (EUR)", wert: "brutto" },
  { label: "Zahlungsstatus", wert: "zahlungsstatusLabel" },
  { label: "Bezahlt am", wert: "bezahltAm" },
  { label: "Bezug", wert: "bezugText" },
  { label: "ERPNext", wert: (b) => (b.erpnext?.name ? `${b.erpnext.doctype} ${b.erpnext.name}` : "") },
];

export const GET = route({ admin: true }, async ({ nutzer, suche, ip }) => {
  const filter = { art: suche.get("art") || "", status: suche.get("status") || "", q: suche.get("q") || "", limit: Number(suche.get("limit")) || 300 };
  const liste = await finanzenBackend().finanzAbrechnungen(nutzer, filter);
  if (suche.get("format") === "csv") {
    if (!darfLesen(nutzer, "export")) throw new PlattformFehler(403, "Ihre Backoffice-Rolle erlaubt im Bereich „CSV-Export“ kein lesen.", "recht");
    await backend().protokollEintrag(nutzer, { aktion: "export", objektArt: "finanzen", objektId: "abrechnungen", text: `CSV-Export Abrechnungen (${liste.length} Zeilen)`, ip }).catch(() => {});
    return new Response(csv(SPALTEN, liste), {
      headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="abrechnungen.csv"', "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" },
    });
  }
  return { ok: true, abrechnungen: liste };
});
