import Link from "next/link";
import { Search } from "lucide-react";
import { Karte, Leer, SeitenKopf, StatusBadge, Tabelle, zelle } from "@/components/Portal/ui";
import { auswahlfeld, eingabe } from "@/components/Portal/felder";
import { cn } from "@/components/ui/cn";
import { portalNutzer } from "@/lib/plattform/server/seite";
import { backend } from "@/lib/plattform/backend";
import { PROZESSE } from "@/lib/plattform/prozesse";
import { VORGANG_TYPEN } from "@/lib/plattform/konstanten";
import { datum, relativ } from "@/lib/plattform/format";

export const metadata = { title: "Vorgänge" };

export default async function AdminVorgaenge({ searchParams }) {
  const n = await portalNutzer({ admin: true });
  const sp = await searchParams;
  const status = PROZESSE.vorgang.status[sp?.status] ? sp.status : "";
  const typ = VORGANG_TYPEN[sp?.typ] ? sp.typ : "";
  const q = typeof sp?.q === "string" ? sp.q.slice(0, 80) : "";
  let liste = await backend().vorgaenge(n, { alle: true, status: status || undefined, typ: typ || undefined, q: q || undefined });
  if (sp?.ohne === "1") liste = liste.filter((v) => !v.zustaendig && !["abgeschlossen", "abgelehnt", "zurueckgezogen"].includes(v.status));

  return (
    <div>
      <SeitenKopf eyebrow="Backoffice" titel="Alle Vorgänge" text="Anfragen aller Zielgruppen. Status ändern, kommentieren, Zuständigen setzen – der Nutzer sieht Änderungen sofort im Portal." />
      <form method="get" className="mb-5 grid gap-3 rounded-3xl bg-white p-4 ring-1 ring-ink-200/70 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
        <label className="relative">
          <span className="sr-only">Suche</span>
          <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-3.5 h-5 w-5 text-ink-400" />
          <input name="q" defaultValue={q} placeholder="Name, E-Mail, Firma, Nummer" className={cn(eingabe, "pl-11")} />
        </label>
        <label>
          <span className="sr-only">Status</span>
          <select name="status" defaultValue={status} className={auswahlfeld}>
            <option value="">Alle Status</option>
            {Object.entries(PROZESSE.vorgang.status).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
          </select>
        </label>
        <label>
          <span className="sr-only">Typ</span>
          <select name="typ" defaultValue={typ} className={auswahlfeld}>
            <option value="">Alle Typen</option>
            {Object.entries(VORGANG_TYPEN).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        <button type="submit" className="h-12 rounded-full bg-navy-700 px-6 text-[15px] font-semibold text-white hover:bg-navy-800">Filtern</button>
      </form>

      {liste.length ? (
        <Karte titel={`${liste.length} Vorgänge`}>
          <Tabelle kopf={["Vorgang", "Kontakt", "Status", "Zuständig", "Aktualisiert"]}>
            {liste.map((v) => (
              <tr key={v.id} className="hover:bg-sand-50">
                <td className={zelle}>
                  <Link href={`/portal/admin/vorgaenge/${v.id}`} className="font-semibold text-ink-900 hover:text-ov-700">{VORGANG_TYPEN[v.typ]}</Link>
                  <p className="ov-num text-[12.5px] text-ink-500">{v.id} · {datum(v.erstelltAm)}</p>
                </td>
                <td className={zelle}>
                  <p className="text-ink-900">{v.kontakt.vorname} {v.kontakt.nachname}</p>
                  <p className="text-[12.5px] text-ink-500">{v.kontakt.firma || v.kontakt.email}{v.nutzerId ? " · Konto" : ""}</p>
                </td>
                <td className={zelle}><StatusBadge art="vorgang" status={v.status} /></td>
                <td className={cn(zelle, "text-ink-700")}>{v.zustaendig ? `${v.zustaendig.vorname} ${v.zustaendig.nachname}` : <span className="text-ink-400">–</span>}</td>
                <td className={cn(zelle, "whitespace-nowrap text-ink-500")}>{relativ(v.geaendertAm)}</td>
              </tr>
            ))}
          </Tabelle>
        </Karte>
      ) : (
        <Leer titel="Keine Vorgänge" text="Mit diesen Filtern gibt es keine Vorgänge." />
      )}
    </div>
  );
}
