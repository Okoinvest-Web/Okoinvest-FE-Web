// /portal/grundbuch – Eigentümer bzw. Dachgeber: eigene Grundbuch-Akten (Eintragung der Dienstbarkeit für die Anlage)
import Link from "next/link";
import { ScrollText } from "lucide-react";
import { Hinweis, Karte, Leer, SeitenKopf } from "@/components/Portal/ui";
import { StatusBadgeGb } from "@/components/Portal/Closing/GrundbuchAnzeige";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { closingBackend } from "@/lib/plattform/backend/closing";

export const metadata = { title: "Grundbuch & Dienstbarkeit" };

export default async function MeineGrundbuchSeite() {
  const n = await portalNutzer();
  const { akten } = await laden(() => closingBackend().gbMeine(n));
  return (
    <>
      <SeitenKopf eyebrow="Mein Portal" titel="Grundbuch & Dienstbarkeit" text="Damit die Anlage auf Ihrer Fläche bzw. Ihrem Dach dauerhaft gesichert ist, wird das Nutzungsrecht im Grundbuch eingetragen. Hier sehen Sie jeden Schritt – und was er für Sie bedeutet." />
      {akten.length ? (
        <Karte titel="Ihre Grundbuch-Akten" innen="p-0">
          <ul className="divide-y divide-ink-100">
            {akten.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 md:px-6">
                <div className="min-w-0">
                  <Link href={`/portal/grundbuch/${a.id}`} className="font-semibold text-ink-900 hover:text-ov-700">{a.titel}</Link>
                  <p className="text-[12.5px] text-ink-500">{a.landLabel} · {a.fortschritt.erledigt} von {a.fortschritt.gesamt} Schritten{a.naechster ? ` · als Nächstes: ${a.naechster.label}` : ""}</p>
                </div>
                <StatusBadgeGb status={a.status} label={a.statusLabel} />
              </li>
            ))}
          </ul>
        </Karte>
      ) : (
        <Leer icon={ScrollText} titel="Noch keine Grundbuch-Akte" text="Sobald für Ihre Fläche oder Ihr Dach ein Vertrag vorbereitet wird, erscheint hier der Ablauf bis zur Eintragung im Grundbuch." />
      )}
      <Hinweis ton="neutral" className="mt-6">Die Informationen erklären den üblichen Ablauf und ersetzen keine Rechtsberatung. Bei Fragen schreiben Sie uns über „Nachrichten“ – vor der Unterschrift empfehlen wir eine eigene rechtliche Beratung.</Hinweis>
    </>
  );
}
