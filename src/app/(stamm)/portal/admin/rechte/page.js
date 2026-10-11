import { Check, Eye, KeyRound, Minus } from "lucide-react";
import { Karte, SeitenKopf } from "@/components/Portal/ui";
import { cn } from "@/components/ui/cn";
import { RollenSetzen } from "@/components/Portal/Backoffice/Rechte";
import { portalNutzer } from "@/lib/plattform/server/seite";
import { backend } from "@/lib/plattform/backend";
import { darfSchreiben } from "@/lib/plattform/rechte";

export const metadata = { title: "Rechte" };

function Stufe({ s }) {
  if (s === 2) return <span className="inline-flex items-center gap-1 rounded-full bg-ov-600 px-2 py-0.5 text-[11.5px] font-semibold text-white"><Check aria-hidden="true" className="h-3 w-3" strokeWidth={3} /> schreiben</span>;
  if (s === 1) return <span className="inline-flex items-center gap-1 rounded-full bg-navy-50 px-2 py-0.5 text-[11.5px] font-semibold text-navy-700 ring-1 ring-inset ring-navy-100"><Eye aria-hidden="true" className="h-3 w-3" /> lesen</span>;
  return <span className="inline-flex items-center text-ink-300"><Minus aria-hidden="true" className="h-4 w-4" /><span className="sr-only">kein Zugriff</span></span>;
}

export default async function AdminRechte() {
  const n = await portalNutzer({ admin: true });
  const r = await backend().backofficeRechte(n);
  const rollen = Object.keys(r.rollen);
  const schreiben = darfSchreiben(n, "rechte");
  return (
    <div className="min-w-0 space-y-6">
      <SeitenKopf eyebrow="Backoffice" titel="Rechte & Unterrollen" text="Backoffice-Konten erhalten Unterrollen: Leitung, Akquise, Transaktion, Buchhaltung oder nur Lesen. Durchgesetzt in allen Admin-APIs und Admin-Seiten; ohne Unterrolle gilt Leitung." />

      <Karte titel="Backoffice-Konten" untertitel="Mehrere Unterrollen je Konto möglich – es gilt jeweils das höchste Recht">
        <ul className="divide-y divide-ink-100">
          {r.konten.map((k) => (
            <li key={k.id} className="grid gap-3 py-4 first:pt-0 last:pb-0 lg:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]">
              <div className="min-w-0">
                <p className="font-semibold text-ink-900">{k.name || k.email}</p>
                <p className="truncate text-[12.5px] text-ink-500">{k.email}{!k.aktiv ? " · gesperrt" : ""}{!k.ausdruecklich ? " · ohne Unterrolle (Leitung)" : ""}</p>
              </div>
              <RollenSetzen konto={k} rollen={r.rollen} eigenes={k.id === n.id} darfSchreiben={schreiben} />
            </li>
          ))}
        </ul>
      </Karte>

      <Karte className="overflow-hidden" titel="Rechte-Matrix" untertitel="Welche Unterrolle darf was?" aktion={<KeyRound aria-hidden="true" className="h-5 w-5 text-ov-600" />}>
        <div tabIndex={0} role="region" aria-label="Rechte-Matrix, horizontal scrollbar" className="relative -mx-5 overflow-x-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ov-500 md:-mx-6"><div className="w-0 min-w-full">
          <table className="w-full min-w-[720px] text-left text-[13.5px]">
            <thead>
              <tr className="border-b border-ink-100 text-[12px] font-semibold uppercase tracking-wider text-ink-500">
                <th scope="col" className="px-5 py-3 md:px-6">Bereich</th>
                {rollen.map((ro) => <th key={ro} scope="col" className="px-3 py-3">{r.rollen[ro].label}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {Object.entries(r.matrix).filter(([b]) => b !== "sonstiges").map(([b, zeile]) => (
                <tr key={b} className="hover:bg-sand-50">
                  <th scope="row" className="px-5 py-2.5 font-semibold text-ink-800 md:px-6">{r.bereiche[b]}</th>
                  {rollen.map((ro) => <td key={ro} className={cn("px-3 py-2.5")}><Stufe s={zeile[ro]} /></td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div></div>
        <ul className="mt-4 grid gap-2 text-[13px] text-ink-600 md:grid-cols-2">
          {rollen.map((ro) => <li key={ro}><span className="font-semibold text-ink-900">{r.rollen[ro].label}:</span> {r.rollen[ro].text}</li>)}
        </ul>
      </Karte>
    </div>
  );
}
