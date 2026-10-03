import Link from "next/link";
import { AlarmClock, CalendarClock, ListTodo, UserCheck } from "lucide-react";
import { AufgabeFormular, AufgabenListe } from "@/components/Portal/Aufgaben";
import { Karte, Kennzahl, SeitenKopf } from "@/components/Portal/ui";
import { cn } from "@/components/ui/cn";
import { portalNutzer } from "@/lib/plattform/server/seite";
import { backend } from "@/lib/plattform/backend";
import { fmt } from "@/lib/rechner/annahmen";

export const metadata = { title: "Aufgaben & Wiedervorlagen" };

const ANSICHTEN = [
  ["meine", "Meine offenen"],
  ["offen", "Alle offenen"],
  ["ueberfaellig", "Überfällig"],
  ["erledigt", "Erledigt"],
  ["alle", "Alle"],
];

export default async function AdminAufgaben({ searchParams }) {
  const n = await portalNutzer({ admin: true });
  const sp = await searchParams;
  const ansicht = ANSICHTEN.some(([k]) => k === sp?.ansicht) ? sp.ansicht : "meine";
  const b = backend();
  const filter = {
    meine: { zustaendigId: n.id, status: "offen" },
    offen: { status: "offen" },
    ueberfaellig: { nurUeberfaellig: true },
    erledigt: { status: "erledigt" },
    alle: {},
  }[ansicht];
  const [aufgaben, uebersicht, konten] = await Promise.all([b.aufgaben(n, filter), b.adminUebersicht(n), b.adminKonten(n)]);
  const k = uebersicht.aufgaben || {};

  return (
    <div className="space-y-6">
      <SeitenKopf eyebrow="Backoffice" titel="Aufgaben & Wiedervorlagen" text="Aufgaben mit Fälligkeit und Zuständigem – allgemein oder an Vorgang, Fläche, Projekt und Interesse. Fällige Wiedervorlagen erscheinen in der Glocke." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kennzahl label="Meine offenen Aufgaben" wert={fmt(k.meineOffen || 0)} icon={UserCheck} href="/portal/admin/aufgaben?ansicht=meine" />
        <Kennzahl label="Davon überfällig" wert={fmt(k.meineUeberfaellig || 0)} icon={AlarmClock} href="/portal/admin/aufgaben?ansicht=ueberfaellig" />
        <Kennzahl label="Heute fällig (alle)" wert={fmt(k.heute || 0)} icon={CalendarClock} href="/portal/admin/aufgaben?ansicht=offen" />
        <Kennzahl label="Offen im Team" wert={fmt(k.offen || 0)} hinweis={`${fmt(k.ueberfaellig || 0)} überfällig`} icon={ListTodo} href="/portal/admin/aufgaben?ansicht=offen" ton="dunkel" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Karte
          titel={ANSICHTEN.find(([x]) => x === ansicht)[1]}
          untertitel={`${aufgaben.length} ${aufgaben.length === 1 ? "Aufgabe" : "Aufgaben"}`}
          aktion={
            <nav aria-label="Ansicht" className="flex flex-wrap gap-1.5">
              {ANSICHTEN.map(([x, label]) => (
                <Link
                  key={x}
                  href={`/portal/admin/aufgaben?ansicht=${x}`}
                  aria-current={x === ansicht ? "page" : undefined}
                  className={cn("inline-flex h-8 items-center rounded-full px-3 text-[12.5px] font-semibold ring-1 ring-inset", x === ansicht ? "bg-navy-900 text-white ring-navy-900" : "bg-white text-ink-700 ring-ink-200 hover:ring-ink-300")}
                >
                  {label}
                </Link>
              ))}
            </nav>
          }
        >
          <AufgabenListe aufgaben={aufgaben} leerText={ansicht === "meine" ? "Keine offenen Aufgaben – gut gemacht." : "Keine Aufgaben in dieser Ansicht."} />
        </Karte>
        <Karte titel="Neue Aufgabe" untertitel="Allgemein – Aufgaben an Objekten legen Sie direkt im Vorgang, der Fläche oder dem Projekt an." className="self-start">
          <AufgabeFormular konten={konten} nutzerId={n.id} />
        </Karte>
      </div>
    </div>
  );
}
