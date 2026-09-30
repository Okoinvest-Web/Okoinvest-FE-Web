import Link from "next/link";
import { Building2, Copy, Search, UserRound } from "lucide-react";
import { Hinweis, Karte, SeitenKopf } from "@/components/Portal/ui";
import { auswahlfeld, eingabe } from "@/components/Portal/felder";
import { cn } from "@/components/ui/cn";
import { KontaktListe, NeueOrganisation } from "@/components/Portal/Backoffice/Crm";
import { portalNutzer } from "@/lib/plattform/server/seite";
import { backend } from "@/lib/plattform/backend";
import { KONTAKT_ROLLEN, ORG_ARTEN } from "@/lib/plattform/crm";
import { darfSchreiben } from "@/lib/plattform/rechte";

export const metadata = { title: "CRM" };

const QUELLEN = { anfrage: "Aus Anfrage", konto: "Portal-Konto", manuell: "Manuell" };

export default async function AdminCrm({ searchParams }) {
  const n = await portalNutzer({ admin: true });
  const sp = await searchParams;
  const ansicht = sp?.ansicht === "organisationen" ? "organisationen" : "kontakte";
  const q = typeof sp?.q === "string" ? sp.q.slice(0, 80) : "";
  const rolle = KONTAKT_ROLLEN[sp?.rolle] ? sp.rolle : "";
  const art = ORG_ARTEN[sp?.art] ? sp.art : "";
  const quelle = QUELLEN[sp?.quelle] ? sp.quelle : "";
  const tag = typeof sp?.tag === "string" ? sp.tag.slice(0, 40) : "";
  const b = backend();
  const [liste, organisationen, konten] = await Promise.all([
    b.crmKontakte(n, { q: ansicht === "kontakte" ? q || undefined : undefined, rolle: rolle || undefined, quelle: quelle || undefined, tag: tag || undefined, nurDubletten: sp?.dubletten === "1" }),
    b.crmOrganisationen(n, { q: ansicht === "organisationen" ? q || undefined : undefined, art: art || undefined }),
    b.adminKonten(n),
  ]);
  const schreiben = darfSchreiben(n, "crm");
  const tab = (id, label, Icon, anzahl) => (
    <Link href={`/portal/admin/crm${id === "kontakte" ? "" : "?ansicht=organisationen"}`} aria-current={ansicht === id ? "page" : undefined} className={cn("inline-flex items-center gap-2 rounded-full px-4 py-2 text-[14px] font-semibold", ansicht === id ? "bg-navy-900 text-white" : "bg-white text-ink-700 ring-1 ring-inset ring-ink-200 hover:bg-ink-50")}>
      <Icon aria-hidden="true" className="h-4 w-4" /> {label} <span className="ov-num text-[12px] opacity-75">{anzahl}</span>
    </Link>
  );

  return (
    <div className="space-y-5">
      <SeitenKopf eyebrow="Backoffice" titel="CRM" text="Kontakte und Organisationen – auch ohne Portal-Konto: Gemeinden, Netzbetreiber, Gutachter, Banken. Leads aus Website-Anfragen landen automatisch hier." />
      <div className="flex flex-wrap gap-2">
        {tab("kontakte", "Kontakte", UserRound, liste.gesamt)}
        {tab("organisationen", "Organisationen", Building2, organisationen.length)}
        <Link href="/portal/admin/crm/dubletten" className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-[14px] font-semibold text-ink-700 ring-1 ring-inset ring-ink-200 hover:bg-ink-50">
          <Copy aria-hidden="true" className="h-4 w-4" /> Dubletten <span className="ov-num text-[12px] opacity-75">{liste.dubletten}</span>
        </Link>
      </div>

      {ansicht === "kontakte" && liste.dubletten > 0 && sp?.dubletten !== "1" && (
        <Hinweis ton="warn" icon={Copy} titel={`${liste.dubletten} Kontakte sind mögliche Dubletten`}>
          Gleiche E-Mail, gleicher Name mit PLZ oder Organisation – <Link href="/portal/admin/crm/dubletten" className="font-semibold underline">prüfen und zusammenführen</Link>.
        </Hinweis>
      )}

      <form method="get" className="grid gap-3 rounded-3xl bg-white p-4 ring-1 ring-ink-200/70 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
        {ansicht === "organisationen" && <input type="hidden" name="ansicht" value="organisationen" />}
        <label className="relative">
          <span className="sr-only">Suche</span>
          <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-3.5 h-5 w-5 text-ink-400" />
          <input id="crm-suche" name="q" defaultValue={q} placeholder={ansicht === "kontakte" ? "Name, E-Mail, Ort, PLZ, Telefon, Tag" : "Name, Ort, PLZ"} className={cn(eingabe, "pl-11")} />
        </label>
        {ansicht === "kontakte" ? (
          <>
            <label>
              <span className="sr-only">Rolle</span>
              <select name="rolle" defaultValue={rolle} className={auswahlfeld}>
                <option value="">Alle Rollen</option>
                {Object.entries(KONTAKT_ROLLEN).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </label>
            <label>
              <span className="sr-only">Quelle</span>
              <select name="quelle" defaultValue={quelle} className={auswahlfeld}>
                <option value="">Alle Quellen</option>
                {Object.entries(QUELLEN).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </label>
          </>
        ) : (
          <label className="md:col-span-2">
            <span className="sr-only">Art</span>
            <select name="art" defaultValue={art} className={auswahlfeld}>
              <option value="">Alle Arten</option>
              {Object.entries(ORG_ARTEN).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </label>
        )}
        <button type="submit" className="h-12 rounded-full bg-navy-700 px-6 text-[15px] font-semibold text-white hover:bg-navy-800">Filtern</button>
      </form>

      {ansicht === "kontakte" ? (
        <>
          {liste.tags.length > 0 && (
            <p className="flex flex-wrap gap-1.5 text-[12.5px]">
              <span className="self-center text-ink-500">Tags:</span>
              {liste.tags.slice(0, 24).map((t) => (
                <Link key={t} href={`/portal/admin/crm?tag=${encodeURIComponent(t)}`} className={cn("rounded-full px-2.5 py-1 font-medium ring-1 ring-inset", tag === t ? "bg-ov-600 text-white ring-ov-600" : "bg-white text-ink-700 ring-ink-200 hover:bg-ink-50")}>#{t}</Link>
              ))}
              {tag && <Link href="/portal/admin/crm" className="self-center px-1 font-semibold text-ov-700">Filter zurücksetzen</Link>}
            </p>
          )}
          {schreiben ? (
            <KontaktListe kontakte={liste.kontakte} konten={konten} organisationen={organisationen} />
          ) : (
            <Karte titel={`${liste.gesamt} Kontakte`} untertitel="Nur lesen">
              <ul className="divide-y divide-ink-100">
                {liste.kontakte.map((k) => (
                  <li key={k.id} className="py-2.5"><Link href={`/portal/admin/crm/${k.id}`} className="font-semibold text-ink-900 hover:text-ov-700">{[k.vorname, k.nachname].filter(Boolean).join(" ") || k.firma}</Link> <span className="text-[13px] text-ink-500">{[k.organisation || k.firma, k.ort].filter(Boolean).join(" · ")}</span></li>
                ))}
              </ul>
            </Karte>
          )}
        </>
      ) : (
        <div className="space-y-4">
          {schreiben && <NeueOrganisation />}
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {organisationen.map((o) => (
              <Link key={o.id} href={`/portal/admin/crm/organisation/${o.id}`} className="block rounded-3xl bg-white p-5 ring-1 ring-ink-200/70 transition-shadow hover:shadow-[0_12px_32px_-18px_rgba(3,18,43,0.35)] hover:ring-ov-200">
                <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-ov-700">{ORG_ARTEN[o.art] || o.art}</p>
                <p className="mt-1 font-display text-[17px] font-bold text-ink-900">{o.name}</p>
                <p className="mt-1 text-[13px] text-ink-600">{[o.plz, o.ort].filter(Boolean).join(" ")}{o.bundesland ? ` · ${o.bundesland}` : ""} · {o.land}</p>
                <p className="mt-3 text-[12.5px] text-ink-500">{o.kontakte} Kontakt(e) · {o.aktivitaeten} Aktivität(en)</p>
                {o.tags?.length > 0 && <p className="mt-2 flex flex-wrap gap-1">{o.tags.map((t) => <span key={t} className="rounded-full bg-ink-100 px-2 py-0.5 text-[11px] text-ink-700">#{t}</span>)}</p>}
              </Link>
            ))}
          </div>
          {!organisationen.length && <p className="text-[14px] text-ink-500">Keine Organisationen mit diesen Filtern.</p>}
        </div>
      )}
    </div>
  );
}
