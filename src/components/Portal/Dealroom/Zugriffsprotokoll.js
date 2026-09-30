// src/components/Portal/Dealroom/Zugriffsprotokoll.js
//
// Zugriffsprotokoll des Datenraums: wer hat was wann angesehen (je Investor zusammengefasst + Einzelzugriffe).
// Der Anbieter sieht Investoren nur als Pseudonym (bis zur Kontaktfreigabe), das Backoffice mit Namen.

import { Download, Eye, FolderOpen } from "lucide-react";
import { Badge } from "@/components/Portal/ui";
import { datumZeit, relativ } from "@/lib/plattform/format";

const ART = { datenraum: { label: "Datenraum geöffnet", icon: FolderOpen }, ansehen: { label: "Angesehen", icon: Eye }, download: { label: "Heruntergeladen", icon: Download } };

const wer = (v) => (v?.investor ? `${v.pseudonym} · ${v.investor.vorname} ${v.investor.nachname}` : v?.name ? `${v.pseudonym} · ${v.name}` : v?.pseudonym || "Investor");

export default function Zugriffsprotokoll({ zugriffe, kompakt = false }) {
  const { investoren = [], eintraege = [] } = zugriffe || {};
  if (!investoren.length) return <p className="text-[14px] text-ink-500">Noch keine Zugriffe von Investoren.</p>;
  return (
    <div className="space-y-6">
      <ul className="grid gap-3 sm:grid-cols-2">
        {investoren.map((x) => (
          <li key={wer(x)} className="rounded-2xl bg-sand-50 p-4 ring-1 ring-inset ring-ink-200/70">
            <div className="flex items-start justify-between gap-2">
              <p className="min-w-0 font-semibold text-ink-900">{wer(x)}</p>
              {x.kontaktFrei && <Badge ton="ok">Kontakt frei</Badge>}
            </div>
            <p className="ov-num mt-1 text-[13px] text-ink-600">
              {x.dokumente.length} {x.dokumente.length === 1 ? "Dokument" : "Dokumente"} · {x.zugriffe} Zugriffe · {x.besuche} Besuche
            </p>
            <p className="mt-0.5 text-[12.5px] text-ink-500">zuletzt {relativ(x.letzter)} · seit {datumZeit(x.erster)}</p>
            {!kompakt && x.dokumente.length > 0 && <p className="mt-2 line-clamp-2 text-[12.5px] text-ink-600">{x.dokumente.join(" · ")}</p>}
          </li>
        ))}
      </ul>
      {!kompakt && (
        <div className="-mx-5 overflow-x-auto md:-mx-6">
          <table className="w-full min-w-[620px] text-left text-[13.5px]">
            <thead>
              <tr className="border-b border-ink-100 text-[11.5px] font-semibold uppercase tracking-wider text-ink-500">
                <th scope="col" className="px-5 py-2.5 md:px-6">Zeitpunkt</th>
                <th scope="col" className="px-3 py-2.5">Investor</th>
                <th scope="col" className="px-3 py-2.5">Aktion</th>
                <th scope="col" className="px-3 py-2.5">Dokument</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {eintraege.slice(0, 200).map((e, i) => {
                const a = ART[e.art] || ART.ansehen;
                const Icon = a.icon;
                return (
                  <tr key={`${e.am}-${i}`}>
                    <td className="whitespace-nowrap px-5 py-2.5 text-ink-600 md:px-6">{datumZeit(e.am)}</td>
                    <td className="px-3 py-2.5 font-medium text-ink-900">{wer(e.von)}</td>
                    <td className="px-3 py-2.5 text-ink-700"><span className="inline-flex items-center gap-1.5"><Icon aria-hidden="true" className="h-3.5 w-3.5 text-ink-400" />{a.label}</span></td>
                    <td className="px-3 py-2.5 text-ink-700">{e.dokumentName || "–"}{e.ip ? <span className="ml-2 text-[11.5px] text-ink-400">IP {e.ip}</span> : null}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
