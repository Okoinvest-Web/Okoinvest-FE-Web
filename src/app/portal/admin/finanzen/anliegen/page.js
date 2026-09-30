// /portal/admin/finanzen/anliegen – Kundenanliegen der Contracting-Kunden im Backoffice (Bereich „finanzen“):
// Einsprüche gegen Rechnungen (Mahnsperre, Klärfall zur Korrektur), Kündigungen (Fristprüfung), Verlängerungen und
// Übernahmen (Angebot an den Kunden). Lesen ab Stufe 1, Entscheiden nur mit Schreibrecht (Leitung, Buchhaltung).

import Link from "next/link";
import { Inbox } from "lucide-react";
import { Hinweis, Karte, Leer, SeitenKopf } from "@/components/Portal/ui";
import { Wert } from "@/components/Portal/Anlagen/teile";
import { AnliegenKarte } from "@/components/Portal/Kundenenergie/teile";
import { cn } from "@/components/ui/cn";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { kundenenergieBackend } from "@/lib/plattform/backend/kundenenergie";
import { darfSchreiben } from "@/lib/plattform/rechte";
import { ANLIEGEN_ARTEN } from "@/lib/plattform/kundenenergie";

export const metadata = { title: "Kundenanliegen" };

export default async function KundenanliegenBackoffice({ searchParams }) {
  const n = await portalNutzer({ admin: true });
  const sp = (await searchParams) || {};
  const alle = sp.status === "alle";
  const art = ANLIEGEN_ARTEN[sp.art] ? sp.art : "";
  const liste = await laden(() => kundenenergieBackend().kundenAnliegen(n, { status: alle ? "alle" : "offen" }));
  const gefiltert = liste.filter((a) => !art || a.art === art);
  const offen = liste.filter((a) => a.offen);
  const link = (p) => `/portal/admin/finanzen/anliegen?${new URLSearchParams({ ...(alle ? { status: "alle" } : {}), ...(art ? { art } : {}), ...p })}`;
  return (
    <div className="space-y-6">
      <SeitenKopf eyebrow="Backoffice · Finanzen & Abrechnung" titel="Kundenanliegen" text="Einsprüche gegen Contracting-Rechnungen, Kündigungen zum Laufzeitende, Verlängerungs- und Übernahmeanfragen – mit Bearbeitungsziel, Entscheidung an den Kunden und Folgeaktionen." />
      {!darfSchreiben(n, "finanzen") && <Hinweis ton="warn">Ihre Backoffice-Rolle darf hier nur lesen.</Hinweis>}
      <section aria-label="Kennzahlen" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Wert ton="dunkel" label="Offen" wert={String(offen.length)} hinweis={`${offen.filter((a) => a.ueberfaellig).length} über dem Bearbeitungsziel`} />
        <Wert label="Einsprüche offen" wert={String(offen.filter((a) => a.art === "einspruch").length)} hinweis="Rechnungen mit Mahnsperre" />
        <Wert label="Kündigungen offen" wert={String(offen.filter((a) => a.art === "kuendigung").length)} />
        <Wert label="Angebote beim Kunden" wert={String(offen.filter((a) => a.status === "angebot").length)} />
      </section>
      <nav aria-label="Filter" className="flex flex-wrap gap-2">
        {[["", "Alle Arten"], ...Object.entries(ANLIEGEN_ARTEN).map(([k, x]) => [k, x.kurz])].map(([k, l]) => (
          <Link key={k || "alle"} href={link({ art: k })} aria-current={art === k ? "page" : undefined} className={cn("inline-flex h-9 items-center rounded-full px-4 text-[13.5px] font-semibold ring-1 ring-inset", art === k ? "bg-navy-900 text-white ring-navy-900" : "bg-white text-ink-700 ring-ink-200 hover:bg-ink-50")}>{l}</Link>
        ))}
        <Link href={alle ? `/portal/admin/finanzen/anliegen${art ? `?art=${art}` : ""}` : link({ status: "alle" })} className="inline-flex h-9 items-center rounded-full bg-white px-4 text-[13.5px] font-semibold text-ov-700 ring-1 ring-inset ring-ink-200 hover:bg-ink-50">{alle ? "Nur offene" : "Auch abgeschlossene"}</Link>
        <Link href="/portal/admin/finanzen" className="inline-flex h-9 items-center rounded-full px-4 text-[13.5px] font-semibold text-ink-700 hover:bg-ink-50">Zu Finanzen & Abrechnung</Link>
      </nav>
      {gefiltert.length ? (
        <ul className="grid gap-4">{gefiltert.map((a) => <AnliegenKarte key={a.id} a={a} backoffice />)}</ul>
      ) : (
        <Karte><Leer icon={Inbox} titel="Keine Anliegen in dieser Auswahl" text="Neue Anliegen der Kunden erscheinen hier und als Aufgabe für die Buchhaltung." /></Karte>
      )}
    </div>
  );
}
