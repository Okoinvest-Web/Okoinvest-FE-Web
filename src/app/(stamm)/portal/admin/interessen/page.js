import { FileSpreadsheet } from "lucide-react";
import DateiLink from "@/components/Portal/DateiLink";
import Link from "next/link";
import { Handshake } from "lucide-react";
import StatusAktionen from "@/components/Portal/StatusAktionen";
import { Angaben, Karte, Leer, SeitenKopf, StatusBadge } from "@/components/Portal/ui";
import { cn } from "@/components/ui/cn";
import { portalNutzer } from "@/lib/plattform/server/seite";
import { backend } from "@/lib/plattform/backend";
import { datumZeit, eur, mwp, relativ } from "@/lib/plattform/format";
import { loiZeilen } from "@/lib/plattform/fach/loi"; // Fachprüfung Kapitalseite: strukturierte LOI

export const metadata = { title: "NDA & LOI" };

const ANSICHTEN = {
  nda: { label: "NDA-Freigaben", status: ["nda_angefragt"] },
  loi: { label: "LOIs", status: ["loi_abgegeben", "loi_angenommen"] },
  aktiv: { label: "Datenräume offen", status: ["nda_freigegeben"] },
  alle: { label: "Alle", status: undefined },
};

export default async function AdminInteressen({ searchParams }) {
  const n = await portalNutzer({ admin: true });
  const sp = await searchParams;
  const ansicht = ANSICHTEN[sp?.ansicht] ? sp.ansicht : "nda";
  const b = backend();
  const [liste, alle] = await Promise.all([b.interessen(n, { alle: true, status: ANSICHTEN[ansicht].status }), b.interessen(n, { alle: true })]);
  const zaehler = Object.fromEntries(Object.entries(ANSICHTEN).map(([k, a]) => [k, a.status ? alle.filter((i) => a.status.includes(i.status)).length : alle.length]));
  const hervor = typeof sp?.id === "string" ? sp.id : "";

  return (
    <div>
      <SeitenKopf eyebrow="Backoffice" titel="NDA-Freigaben & LOIs" text="Klick-NDAs prüfen und Datenräume freischalten, Absichtserklärungen annehmen oder ablehnen. Jede Entscheidung erscheint beim Investor als Nachricht." aktionen={<DateiLink href="/api/admin/export/interessen" icon={FileSpreadsheet}>CSV-Export</DateiLink>} />
      <nav aria-label="Ansicht" className="mb-5 flex flex-wrap gap-2">
        {Object.entries(ANSICHTEN).map(([k, a]) => (
          <Link key={k} href={`/portal/admin/interessen?ansicht=${k}`} aria-current={ansicht === k ? "page" : undefined} className={cn("inline-flex h-10 items-center gap-2 rounded-full px-4 text-[14px] font-semibold ring-1 ring-inset", ansicht === k ? "bg-navy-900 text-white ring-navy-900" : "bg-white text-ink-700 ring-ink-200 hover:ring-ink-300")}>
            {a.label}
            <span className={cn("ov-num rounded-full px-1.5 text-[12px]", ansicht === k ? "bg-white/15" : "bg-ink-100")}>{zaehler[k]}</span>
          </Link>
        ))}
      </nav>
      {liste.length ? (
        <ul className="space-y-4">
          {liste.map((i) => (
            <li key={i.id}>
              <Karte
                className={hervor === i.id ? "ring-2 ring-ov-400" : ""}
                titel={<Link href={`/portal/projekte/${i.projektId}`} className="hover:text-ov-700">{i.projekt?.titel || i.projektId}</Link>}
                untertitel={`${mwp(i.projekt?.mwp)} · Investor: ${i.investor?.vorname} ${i.investor?.nachname}${i.investor?.firma ? ` (${i.investor.firma})` : ""} · ${i.investor?.email}`}
                aktion={<StatusBadge art="interesse" status={i.status} />}
              >
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
                  <Angaben
                    items={[
                      { label: "NDA akzeptiert", wert: i.nda ? `${datumZeit(i.nda.am)} · Fassung ${i.nda.version}${i.nda.ip ? ` · IP ${i.nda.ip}` : ""}` : "" },
                      { label: "Browser", wert: i.nda?.userAgent ? i.nda.userAgent.slice(0, 90) : "" },
                      { label: "LOI", wert: i.loi ? `${datumZeit(i.loi.am)}${i.loi.betrag ? ` · ${eur(i.loi.betrag)}` : ""}` : "" },
                      ...loiZeilen(i.loi).map((z) => ({ ...z, breit: ["Inhalt", "Bedingungen", "Zahlungsstruktur"].includes(z.label) })),
                      { label: "Anbieter", wert: i.anbieter ? `${i.anbieter.firma || `${i.anbieter.vorname} ${i.anbieter.nachname}`}` : "" },
                      { label: "Zuletzt geändert", wert: relativ(i.geaendertAm) },
                    ]}
                  />
                  <div className="rounded-2xl bg-sand-50 p-4 ring-1 ring-ink-200/60">
                    <StatusAktionen art="interesse" id={i.id} status={i.status} als="admin" leerText="Keine Entscheidung offen." />
                    <Link href={`/portal/nachrichten?bezug=interesse:${i.id}`} className="mt-3 inline-block text-[13.5px] font-semibold text-ov-700 hover:text-ov-800">Nachricht an Investor</Link>
                  </div>
                </div>
              </Karte>
            </li>
          ))}
        </ul>
      ) : (
        <Leer icon={Handshake} titel="Nichts offen" text="In dieser Ansicht gibt es derzeit keine Einträge." />
      )}
    </div>
  );
}
