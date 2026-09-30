import Link from "next/link";
import { ArrowUpRight, MessagesSquare, PenSquare } from "lucide-react";
import NachrichtenThread from "@/components/Portal/NachrichtenThread";
import { Badge, Karte, Leer, SeitenKopf } from "@/components/Portal/ui";
import { cn } from "@/components/ui/cn";
import { portalNutzer, laden, istAdmin } from "@/lib/plattform/server/seite";
import { backend } from "@/lib/plattform/backend";
import { BEZUG_ARTEN, BEZUG_LABEL } from "@/lib/plattform/konstanten";
import { relativ } from "@/lib/plattform/format";

export const metadata = { title: "Nachrichten" };

export default async function Nachrichten({ searchParams }) {
  const n = await portalNutzer();
  const sp = await searchParams;
  const b = backend();
  const admin = istAdmin(n);
  const filter = sp?.filter === "ungelesen" ? "ungelesen" : "alle";

  let [art, id] = typeof sp?.bezug === "string" ? sp.bezug.split(":") : [];
  if (!BEZUG_ARTEN.includes(art)) [art, id] = [];

  // Thread zuerst laden (markiert als gelesen), dann die Liste mit aktuellen Zählern
  const thread = art ? await laden(() => b.nachrichten(n, art, id)) : null;
  let threads = await b.nachrichtenThreads(n);
  if (filter === "ungelesen") threads = threads.filter((t) => t.ungelesen || (art && t.bezugArt === art && t.bezugId === id));
  // Querschnitt: Suche über Titel, Gegenüber und letzte Nachricht
  const q = typeof sp?.q === "string" ? sp.q.trim().slice(0, 80) : "";
  if (q) threads = threads.filter((t) => [t.titel, t.gegenueber, t.letzte?.text, BEZUG_LABEL[t.bezugArt]].join(" ").toLowerCase().includes(q.toLowerCase()));
  const qs = q ? `&q=${encodeURIComponent(q)}` : "";
  const aktiv = thread || (!admin ? await b.nachrichten(n, "nutzer", n.id) : null);
  const aktivArt = thread ? art : "nutzer";
  const aktivId = thread ? id : n.id;

  return (
    <div>
      <SeitenKopf
        eyebrow="Nachrichten"
        titel={admin ? "Nachrichten & Postfach" : "Nachrichten"}
        text={admin ? "Alle Unterhaltungen mit Nutzern – Antworten erscheinen sofort in deren Portal." : "Ihr direkter Draht zum Backoffice – zu jeder Anfrage, Fläche und jedem Projekt."}
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        <Karte innen="p-2" className="self-start">
          <form method="get" action="/portal/nachrichten" role="search" className="px-2 pb-2 pt-1">
            <label htmlFor="nachrichten-suche" className="sr-only">Unterhaltungen durchsuchen</label>
            <input id="nachrichten-suche" type="search" name="q" defaultValue={q} placeholder="Unterhaltungen durchsuchen …" className="h-10 w-full rounded-full bg-sand-50 px-4 text-[14px] text-ink-900 ring-1 ring-inset ring-ink-200 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-ov-500" />
            {filter === "ungelesen" && <input type="hidden" name="filter" value="ungelesen" />}
          </form>
          <div className="flex gap-1.5 px-2 pb-2 pt-1">
            {[["alle", "Alle"], ["ungelesen", "Ungelesen"]].map(([k, v]) => (
              <Link key={k} href={`/portal/nachrichten?filter=${k}${art ? `&bezug=${art}:${id}` : ""}${qs}`} aria-current={filter === k ? "page" : undefined} className={cn("rounded-full px-3 py-1.5 text-[13px] font-semibold", filter === k ? "bg-navy-900 text-white" : "text-ink-600 hover:bg-ink-100")}>
                {v}
              </Link>
            ))}
          </div>
          <ul className="max-h-[70vh] space-y-0.5 overflow-y-auto">
            {!admin && (
              <li>
                <Link href={`/portal/nachrichten?bezug=nutzer:${n.id}`} className={cn("flex items-center gap-3 rounded-2xl p-3", aktivArt === "nutzer" && aktivId === n.id ? "bg-ov-50 ring-1 ring-ov-200" : "hover:bg-sand-50")}>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ov-600 text-white"><PenSquare aria-hidden="true" className="h-4 w-4" /></span>
                  <span className="min-w-0">
                    <span className="block text-[14px] font-semibold text-ink-900">Allgemeine Nachricht</span>
                    <span className="block text-[12.5px] text-ink-500">Frage ohne Bezug an das Backoffice</span>
                  </span>
                </Link>
              </li>
            )}
            {threads
              .filter((t) => admin || !(t.bezugArt === "nutzer" && t.bezugId === n.id))
              .map((t) => {
                const ist = t.bezugArt === aktivArt && t.bezugId === aktivId;
                return (
                  <li key={`${t.bezugArt}:${t.bezugId}`}>
                    <Link href={`/portal/nachrichten?bezug=${t.bezugArt}:${t.bezugId}${filter === "ungelesen" ? "&filter=ungelesen" : ""}${qs}`} aria-current={ist ? "true" : undefined} className={cn("block rounded-2xl p-3", ist ? "bg-ov-50 ring-1 ring-ov-200" : "hover:bg-sand-50")}>
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-[11.5px] font-semibold uppercase tracking-wider text-ink-400">{BEZUG_LABEL[t.bezugArt]}{admin && t.gegenueber ? ` · ${t.gegenueber}` : ""}</span>
                        <span className="shrink-0 text-[11.5px] text-ink-400">{relativ(t.letzte.am)}</span>
                      </span>
                      <span className="mt-0.5 flex items-center gap-2">
                        <span className={cn("min-w-0 flex-1 truncate text-[14px]", t.ungelesen ? "font-bold text-ink-900" : "font-semibold text-ink-800")}>{t.titel}</span>
                        {t.ungelesen > 0 && <Badge ton="ok" className="px-2 py-0.5">{t.ungelesen}</Badge>}
                      </span>
                      <span className="mt-0.5 line-clamp-2 block text-[13px] leading-snug text-ink-500">{t.letzte.text}</span>
                    </Link>
                  </li>
                );
              })}
            {threads.length === 0 && (admin || q) && <li className="p-4 text-[14px] text-ink-500">{q ? `Keine Unterhaltung zu „${q}“.` : "Keine Unterhaltungen."}</li>}
          </ul>
        </Karte>

        {aktiv ? (
          <Karte
            titel={aktiv.titel}
            untertitel={aktivArt === "nutzer" && !admin ? "Wir antworten in der Regel innerhalb von zwei Werktagen." : aktiv.gegenueber && admin ? `Gesprächspartner: ${aktiv.gegenueber}` : undefined}
            aktion={aktiv.link && aktivArt !== "nutzer" ? <Link href={aktiv.link} className="inline-flex items-center gap-1 text-[13.5px] font-semibold text-ov-700 hover:text-ov-800">Zum Vorgang <ArrowUpRight aria-hidden="true" className="h-4 w-4" /></Link> : null}
          >
            <NachrichtenThread bezugArt={aktivArt} bezugId={aktivId} nachrichten={aktiv.nachrichten} hoehe="max-h-[56vh]" />
          </Karte>
        ) : (
          <Leer icon={MessagesSquare} titel="Unterhaltung auswählen" text="Wählen Sie links eine Unterhaltung. Neue Nachrichten an einzelne Nutzer schreiben Sie über „Nutzer & Protokoll“." />
        )}
      </div>
    </div>
  );
}
