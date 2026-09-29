import Link from "next/link";
import { Inbox } from "lucide-react";
import Button from "@/components/ui/Button";
import { Karte, Leer, SeitenKopf, StatusBadge, Stepper } from "@/components/Portal/ui";
import { portalNutzer } from "@/lib/plattform/server/seite";
import { backend } from "@/lib/plattform/backend";
import { VORGANG_TYPEN } from "@/lib/plattform/konstanten";
import { statusInfo } from "@/lib/plattform/prozesse";
import { datum } from "@/lib/plattform/format";

export const metadata = { title: "Meine Anfragen" };

export default async function Anfragen() {
  const n = await portalNutzer();
  const vorgaenge = await backend().vorgaenge(n);

  return (
    <div>
      <SeitenKopf
        eyebrow="Anfragen"
        titel="Meine Anfragen"
        text="Alle Anfragen, die Sie über die Website gestellt haben – mit aktuellem Status, Verlauf und Nachrichten."
        aktionen={<Button href="/flaechencheck" variant="secondary" size="sm">Neue Anfrage</Button>}
      />
      {!n.emailBestaetigt && (
        <p className="mb-5 rounded-2xl bg-sun-300/20 px-4 py-3 text-[14px] text-ink-800 ring-1 ring-inset ring-sun-400/40">
          Anfragen mit Ihrer E-Mail-Adresse erscheinen hier automatisch, sobald Sie die Adresse bestätigt haben.
        </p>
      )}
      {vorgaenge.length ? (
        <ul className="grid gap-4 lg:grid-cols-2">
          {vorgaenge.map((v) => (
            <li key={v.id}>
              <Karte innen="p-5 md:p-6" className="relative h-full transition-shadow hover:ring-ov-200">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="ov-num text-[12.5px] text-ink-500">{v.id} · {datum(v.erstelltAm)}</p>
                    <h2 className="mt-1 font-display text-[18px] font-bold text-ink-900">
                      <Link href={`/portal/anfragen/${v.id}`} className="after:absolute after:inset-0 hover:text-ov-700">{VORGANG_TYPEN[v.typ]}</Link>
                    </h2>
                  </div>
                  <StatusBadge art="vorgang" status={v.status} />
                </div>
                <p className="mb-4 mt-2 text-[14px] leading-relaxed text-ink-600">{v.letzterKommentar || statusInfo("vorgang", v.status).text}</p>
                <Stepper art="vorgang" status={v.status} kompakt />
              </Karte>
            </li>
          ))}
        </ul>
      ) : (
        <Leer icon={Inbox} titel="Noch keine Anfragen" text="Sobald Sie über die Website eine Anfrage stellen, sehen Sie hier den Status." aktion={<Button href="/flaechencheck" size="sm" pfeil>Fläche prüfen lassen</Button>} />
      )}
    </div>
  );
}
