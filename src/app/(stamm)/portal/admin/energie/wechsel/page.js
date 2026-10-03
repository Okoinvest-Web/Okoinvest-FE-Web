// /portal/admin/energie/wechsel – Lieferantenwechsel nach Zuschlag (Bereich „energie“): Schritte je Kunde mit Fristen,
// überfällige Kündigungen/Anmeldungen, Bestätigung stellvertretend für Kunde oder Versorger (Schreibrecht Energie).

import { ArrowLeftRight } from "lucide-react";
import { Hinweis, Karte, Leer, SeitenKopf } from "@/components/Portal/ui";
import { Wert } from "@/components/Portal/Anlagen/teile";
import { DeskNavigation } from "@/components/Portal/Energie/teile";
import { WechselKarte } from "@/components/Portal/Kundenenergie/teile";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { kundenenergieBackend } from "@/lib/plattform/backend/kundenenergie";
import { darfSchreiben } from "@/lib/plattform/rechte";
import { RECHTSHINWEISE } from "@/lib/plattform/energie/texte";

export const metadata = { title: "Lieferantenwechsel" };

export default async function WechselBackoffice() {
  const n = await portalNutzer({ admin: true });
  const liste = await laden(() => kundenenergieBackend().lieferantenwechsel(n, {}));
  const laufend = liste.filter((w) => !w.stand.abgeschlossen);
  return (
    <div className="space-y-6">
      <SeitenKopf eyebrow="Backoffice · Energiebeschaffung" titel="Lieferantenwechsel" text="Nach dem Zuschlag: Liefervertrag, Kündigung des bisherigen Vertrags, Anmeldung beim Netzbetreiber und Lieferbeginn – je Kunde mit Fristen. Kunde und Versorger bestätigen ihre Schritte im Portal." />
      <DeskNavigation aktiv="wechsel" />
      {!darfSchreiben(n, "energie") && <Hinweis ton="warn">Ihre Backoffice-Rolle darf hier nur lesen.</Hinweis>}
      <section aria-label="Kennzahlen" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Wert ton="dunkel" label="Laufende Wechsel" wert={String(laufend.length)} />
        <Wert label="Kritisch" wert={String(laufend.filter((w) => w.stand.ampel === "rot").length)} hinweis="Kündigung bzw. Anmeldung überfällig" />
        <Wert label="Frist überschritten" wert={String(laufend.filter((w) => w.stand.ampel === "gelb").length)} />
        <Wert label="Abgeschlossen" wert={String(liste.length - laufend.length)} />
      </section>
      {liste.length ? (
        <div className="grid gap-5">
          {liste.map((w) => (
            <Karte key={w.id} titel={w.kunde?.firma || w.kunde?.name || w.id} untertitel={`${w.titel} · ${w.id}`}>
              <WechselKarte w={w} basisUrl="/api/admin/energie/wechsel" />
              {w.verlauf?.length > 0 && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-[13.5px] font-semibold text-ov-700">Verlauf ({w.verlauf.length})</summary>
                  <ol className="mt-2 space-y-1 border-l-2 border-ink-100 pl-4 text-[13px] text-ink-700">{w.verlauf.map((x, i) => <li key={i}><span className="text-ink-500">{new Date(x.am).toLocaleDateString("de-DE")}</span> · {x.text}</li>)}</ol>
                </details>
              )}
            </Karte>
          ))}
        </div>
      ) : (
        <Karte><Leer icon={ArrowLeftRight} titel="Noch kein Lieferantenwechsel" text="Ein Wechsel entsteht automatisch, sobald alle Kunden einer Ausschreibung den Zuschlag freigegeben haben." /></Karte>
      )}
      <Hinweis ton="neutral">{RECHTSHINWEISE.wechselDe} {RECHTSHINWEISE.wechselAt}</Hinweis>
    </div>
  );
}
