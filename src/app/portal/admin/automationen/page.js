import Link from "next/link";
import { Activity, AlertTriangle, Repeat, ShieldCheck, Zap } from "lucide-react";
import { Hinweis, Karte, Kennzahl, SeitenKopf } from "@/components/Portal/ui";
import { cn } from "@/components/ui/cn";
import { FristenPruefen, LaufStatus, NeueRegel, RegelKarte } from "@/components/Portal/Backoffice/Automationen";
import { portalNutzer } from "@/lib/plattform/server/seite";
import { backend } from "@/lib/plattform/backend";
import { AKTIONEN, SCHLEIFE } from "@/lib/plattform/automation";
import { datumZeit } from "@/lib/plattform/format";
import { darfSchreiben } from "@/lib/plattform/rechte";
import { fmt } from "@/lib/rechner/annahmen";

export const metadata = { title: "Automationen" };

export default async function AdminAutomationen({ searchParams }) {
  const n = await portalNutzer({ admin: true });
  const sp = await searchParams;
  const regelId = typeof sp?.regel === "string" && /^R-[0-9A-Z-]{4,40}$/.test(sp.regel) ? sp.regel : "";
  const nurAusgefuehrt = sp?.alle !== "1";
  const d = await backend().automationen(n, { regelId: regelId || undefined, protokollLimit: 300 });
  const schreiben = darfSchreiben(n, "automationen");
  const protokoll = nurAusgefuehrt ? d.protokoll.filter((x) => x.status !== "nicht_erfuellt") : d.protokoll;
  const aktiv = d.regeln.filter((r) => r.aktiv).length;

  return (
    <div className="space-y-6">
      <SeitenKopf eyebrow="Backoffice" titel="Automationen" text="Wenn – Und – Dann ohne Code: Zuständige setzen, Aufgaben anlegen, E-Mails und Nachrichten aus Vorlagen senden, Tags, Priorität und Status (nur erlaubte Übergänge)." aktionen={schreiben ? <FristenPruefen /> : null} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kennzahl label="Regeln aktiv" wert={`${aktiv} / ${d.regeln.length}`} icon={Zap} />
        <Kennzahl label="Ausgeführt (24 h)" wert={fmt(d.statistik.ausgefuehrt24h)} icon={Activity} />
        <Kennzahl label="Mit Fehlern (24 h)" wert={fmt(d.statistik.fehler24h)} icon={AlertTriangle} />
        <Kennzahl label="Schleifen verhindert" wert={fmt(d.statistik.schleifen)} hinweis={`max. Tiefe ${SCHLEIFE.tiefe}, ${SCHLEIFE.proStunde}×/Std. je Objekt`} icon={Repeat} ton="dunkel" />
      </div>

      <Hinweis ton="neutral" icon={ShieldCheck} titel="Sicherheitsnetz">
        Statuswechsel laufen über denselben Zustandsautomaten wie im Portal (als Backoffice, inklusive Pflichtangaben und Nachricht an den Nutzer). Jede Regel feuert je Objekt höchstens einmal pro Ereigniskette; Folgeregeln bis Tiefe {SCHLEIFE.tiefe}. Vor dem Aktivieren: Testlauf.
      </Hinweis>

      <section aria-labelledby="regeln-titel" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="regeln-titel" className="font-display text-[19px] font-bold text-ink-900">Regeln</h2>
          {schreiben && <NeueRegel vorlagen={d.vorlagen} konten={d.konten} />}
        </div>
        <ul className="space-y-3">
          {d.regeln.map((r) => <RegelKarte key={r.id} regel={r} vorlagen={d.vorlagen} konten={d.konten} darfSchreiben={schreiben} />)}
        </ul>
        {!d.regeln.length && <p className="text-[14px] text-ink-500">Noch keine Regeln.</p>}
        <p className="text-[12.5px] text-ink-500">Verfügbare Aktionen: {Object.values(AKTIONEN).map((a) => a.label).join(" · ")}.</p>
      </section>

      <Karte
        titel="Ausführungsprotokoll"
        untertitel={regelId ? `Nur Regel ${d.regeln.find((r) => r.id === regelId)?.name || regelId}` : "Alle Regeln – neueste zuerst"}
        aktion={
          <div className="flex flex-wrap gap-2 text-[13px] font-semibold">
            {regelId && <Link href="/portal/admin/automationen" className="text-ov-700">alle Regeln</Link>}
            <Link href={`/portal/admin/automationen?${new URLSearchParams({ ...(regelId ? { regel: regelId } : {}), ...(nurAusgefuehrt ? { alle: "1" } : {}) })}`} className="text-ov-700">{nurAusgefuehrt ? "auch „nicht erfüllt“ zeigen" : "nur Ausführungen"}</Link>
          </div>
        }
      >
        {protokoll.length ? (
          <ul className="divide-y divide-ink-100">
            {protokoll.slice(0, 60).map((l) => (
              <li key={l.id} className="grid gap-1 py-3 first:pt-0 md:grid-cols-[9.5rem_minmax(0,1fr)]">
                <p className="text-[12.5px] text-ink-500">{datumZeit(l.am)}</p>
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-[14px]">
                    <LaufStatus status={l.status} />
                    <Link href={`/portal/admin/automationen?regel=${l.regelId}`} className="font-semibold text-ink-900 hover:text-ov-700">{l.regelName}</Link>
                    <span className="text-ink-500">→ {l.objektTitel}</span>
                    <span className="font-mono text-[11.5px] text-ink-400">{l.objektId}</span>
                    {l.tiefe > 1 && <span className="rounded-full bg-ink-50 px-2 py-0.5 text-[11px] text-ink-600">Folgeregel · Tiefe {l.tiefe}</span>}
                  </p>
                  {l.text && <p className="mt-0.5 text-[13px] text-ink-600">{l.text}</p>}
                  {l.aktionen?.length > 0 && (
                    <ul className="mt-1 space-y-0.5 text-[13px]">
                      {l.aktionen.map((a, i) => (
                        <li key={i} className={cn(a.ok ? "text-ink-700" : "font-semibold text-red-800")}>
                          {AKTIONEN[a.typ]?.label || a.typ}: {a.text}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[14px] text-ink-500">Noch keine Ausführungen.</p>
        )}
      </Karte>
    </div>
  );
}
