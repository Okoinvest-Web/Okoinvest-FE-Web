// /portal/admin/eg/gruendung – Backoffice (Bereich „eg“): Gründungs- und Wechselaufträge mit Kennzahlen, Filter nach Status
// und Paket, überfällige Fristen, neue Anfrage für einen Auftraggeber. WP5. Rechte: grAuftraege (Bereich „eg“ lesen ≥ 1).

import Link from "next/link";
import { AlarmClock, ClipboardList, FileSignature, Repeat, Rocket } from "lucide-react";
import { Badge, Karte, Kennzahl, Leer, SeitenKopf, Tabelle, zelle } from "@/components/Portal/ui";
import { FristBadge, datumDe, eurDe } from "@/components/Portal/EG/Gruendung/teile";
import { auswahlfeld, eingabe } from "@/components/Portal/felder";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { egBackend } from "@/lib/plattform/backend/eg";
import { GR_PAKETE, GR_STATUS } from "@/lib/plattform/eg/gruendung";

export const metadata = { title: "Gründungsaufträge" };

export default async function Seite({ searchParams }) {
  const n = await portalNutzer({ admin: true });
  const sp = (await searchParams) || {};
  const status = GR_STATUS[sp.status] || sp.status === "aktiv" ? sp.status : "";
  const paket = GR_PAKETE[sp.paket] ? sp.paket : "";
  const q = typeof sp.q === "string" ? sp.q.slice(0, 80) : "";
  const d = await laden(() => egBackend().grAuftraege(n, { status, paket, q }));
  const k = d.kennzahlen || {};
  return (
    <div className="space-y-6">
      <SeitenKopf
        eyebrow="Backoffice · Energiegemeinschaften"
        titel="Gründungsaufträge"
        text="Gründung als Dienstleistung und Wechsel bestehender Gemeinschaften: Angebot, Signatur, Fahrplan mit Fristen, Behördenwege, Netzbetreiber, EDA-Start."
        aktionen={d.darfSchreiben ? <Link href="/portal/admin/eg/gruendung/neu" className="inline-flex h-10 items-center rounded-full bg-ov-600 px-4 text-[14px] font-semibold text-white hover:bg-ov-700">Auftrag anlegen</Link> : null}
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kennzahl label="Anfragen" wert={k.anfragen ?? 0} hinweis={`${k.angebote ?? 0} Angebote offen`} icon={ClipboardList} href="/portal/admin/eg/gruendung?status=anfrage" />
        <Kennzahl label="In Arbeit" wert={k.inArbeit ?? 0} hinweis={`${k.betriebsbereit ?? 0} betriebsbereit bzw. übergeben`} icon={Rocket} href="/portal/admin/eg/gruendung?status=aktiv" />
        <Kennzahl label="Fristen überfällig" wert={k.ueberfaellig ?? 0} hinweis="Aufträge mit überfälligem Pflichtschritt" icon={AlarmClock} />
        <Kennzahl label="Wechsel" wert={k.wechsel ?? 0} hinweis="Bestands-EG zu ÖkoInvest" icon={Repeat} href="/portal/admin/eg/gruendung?paket=wechsel" />
      </div>
      <Karte titel="Aufträge" aktion={<FileSignature aria-hidden="true" className="h-5 w-5 text-ov-600" />}>
        <form action="/portal/admin/eg/gruendung" className="mb-4 flex flex-wrap gap-2" role="search">
          <input name="q" defaultValue={q} placeholder="Name, Ort, PLZ, Kennung" aria-label="Suche" className={`${eingabe} h-10 w-full sm:w-64`} />
          <select name="status" defaultValue={status} aria-label="Status" className={`${auswahlfeld} h-10 w-full sm:w-56`}>
            <option value="">Alle Status</option>
            <option value="aktiv">In Arbeit (alle Abschnitte)</option>
            {Object.entries(GR_STATUS).map(([s, x]) => <option key={s} value={s}>{x.label}</option>)}
          </select>
          <select name="paket" defaultValue={paket} aria-label="Paket" className={`${auswahlfeld} h-10 w-full sm:w-56`}>
            <option value="">Alle Pakete</option>
            {Object.entries(GR_PAKETE).map(([p, x]) => <option key={p} value={p}>{x.label}</option>)}
          </select>
          <button type="submit" className="h-10 rounded-full bg-navy-800 px-4 text-[14px] font-semibold text-white hover:bg-navy-900">Filtern</button>
        </form>
        {d.auftraege.length ? (
          <Tabelle kopf={["Auftrag", "Paket", "Status", "Fortschritt", "Nächste Frist"]}>
            {d.auftraege.map((a) => (
              <tr key={a.id}>
                <td className={zelle}>
                  <Link href={`/portal/admin/eg/gruendung/${a.id}`} className="font-semibold text-ink-900 hover:text-ov-800">{a.arbeitsname}</Link>
                  <span className="block text-[12.5px] text-ink-500">{a.auftraggeberName} · {a.plz} {a.ort} · {datumDe(a.erstelltAm)}</span>
                </td>
                <td className={zelle}>{a.paketLabel}<span className="block text-[12.5px] text-ink-500">{a.modellKurz}{a.angebot ? ` · ${eurDe(a.angebot.betragNetto)}` : ""}</span></td>
                <td className={zelle}><Badge ton={a.ton}>{a.statusLabel}</Badge>{a.demo && <Badge className="ml-1">Demo</Badge>}</td>
                <td className={zelle}>{a.auftragAm ? `${a.fortschritt.prozent} %` : "–"}<span className="block text-[12.5px] text-ink-500">{a.fortschritt.erledigt}/{a.fortschritt.pflicht}</span></td>
                <td className={zelle}>{a.fortschritt.naechste[0] ? <><span className="block text-[13px] text-ink-800">{a.fortschritt.naechste[0].label}</span><FristBadge frist={a.fortschritt.naechste[0].frist} ampel={a.fortschritt.naechste[0].ampel} /></> : "–"}</td>
              </tr>
            ))}
          </Tabelle>
        ) : <Leer icon={ClipboardList} titel="Keine Aufträge" text="Für diese Auswahl gibt es keine Gründungs- bzw. Wechselaufträge." />}
      </Karte>
    </div>
  );
}
