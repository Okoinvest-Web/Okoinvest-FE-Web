// /portal/admin/eg – Backoffice (Bereich „eg“): alle Energiegemeinschaften mit Kennzahlen, Filter nach Status und Modell,
// Hinweise (§ 69, Organisator-Anzeige, Gemeinschafts-ID …), neue Gemeinschaft, Migration aus dem Prototyp. WP1.

import Link from "next/link";
import { Building2, Gauge, PlugZap, Sun, TriangleAlert, Users } from "lucide-react";
import { Badge, Hinweis, Karte, Kennzahl, Leer, SeitenKopf, Tabelle, zelle } from "@/components/Portal/ui";
import { Klappe } from "@/components/Portal/Mitglied/teile";
import { GemeinschaftNeu, MigrationPrototyp } from "@/components/Portal/EG/Stamm/Formulare";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { egBackend } from "@/lib/plattform/backend/eg";
import { EG_MODELLE, GEMEINSCHAFT_STATUS } from "@/lib/plattform/eg/modell";

export const metadata = { title: "Energiegemeinschaften" };
const zahl = (x, s = 0) => Number(x || 0).toLocaleString("de-DE", { maximumFractionDigits: s });

export default async function EgListe({ searchParams }) {
  const n = await portalNutzer({ admin: true });
  const sp = (await searchParams) || {};
  const status = GEMEINSCHAFT_STATUS[sp.status] ? sp.status : "";
  const modell = EG_MODELLE[sp.modell] ? sp.modell : "";
  const q = typeof sp.q === "string" ? sp.q.slice(0, 80) : "";
  const b = egBackend();
  const [d, nb] = await Promise.all([laden(() => b.egGemeinschaften(n, { status, modell, q })), laden(() => b.egNetzbetreiber(n))]);
  const k = d.kennzahlen;
  const link = (p) => {
    const u = new URLSearchParams(Object.entries({ status, modell, q, ...p }).filter(([, v]) => v));
    return `/portal/admin/eg${u.toString() ? `?${u}` : ""}`;
  };
  return (
    <div className="space-y-6">
      <SeitenKopf eyebrow="Backoffice" titel="Energiegemeinschaften" text="EEG, BEG, GEA, P2P und Eigenversorgung nach ElWG: Stammdaten, Organe, Mitglieder, Zählpunkte und Teilnahmen aller betreuten Gemeinschaften." aktionen={<Link href="/portal/admin/eg/netzbetreiber" className="text-[14px] font-semibold text-ov-700 hover:text-ov-800">Netzbetreiber & Netzentgelte</Link>} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kennzahl label="Gemeinschaften" wert={zahl(k.anzahl)} hinweis={`${k.aktiv} aktiv · ${k.inGruendung} in Gründung`} icon={Building2} />
        <Kennzahl label="Aktive Mitglieder" wert={zahl(k.mitgliederAktiv)} icon={Users} />
        <Kennzahl label="Aktive Zählpunkte" wert={zahl(k.zaehlpunkteAktiv)} hinweis={`${k.teilnahmenOffen} Anmeldungen offen`} icon={PlugZap} />
        <Kennzahl label="Erzeugungsleistung" wert={`${zahl(k.erzeugungsleistungKw, 1)} kW`} hinweis={`${k.mitHinweisen} Gemeinschaft(en) mit Handlungsbedarf`} icon={Sun} />
      </div>

      <Karte titel="Übersicht" aktion={<Gauge aria-hidden="true" className="h-5 w-5 text-ov-600" />}>
        <form action="/portal/admin/eg" className="mb-4 flex flex-wrap gap-2" role="search">
          {status && <input type="hidden" name="status" value={status} />}
          {modell && <input type="hidden" name="modell" value={modell} />}
          <label className="min-w-0 flex-1 basis-56"><span className="sr-only">Suchen</span><input name="q" defaultValue={q} placeholder="Name, Gemeinschafts- oder Marktpartner-ID" className="h-10 w-full rounded-full bg-white px-4 text-[14px] ring-1 ring-inset ring-ink-200 focus:outline-none focus:ring-2 focus:ring-ov-500" /></label>
          <button type="submit" className="h-10 rounded-full bg-ov-600 px-4 text-[14px] font-semibold text-white hover:bg-ov-700">Suchen</button>
        </form>
        <div className="mb-4 flex flex-wrap gap-1.5" aria-label="Filter">
          <Link href={link({ modell: "", status: "" })} aria-current={!status && !modell ? "page" : undefined} className={`rounded-full px-3 py-1.5 text-[13px] font-semibold ring-1 ring-inset ${!status && !modell ? "bg-ov-600 text-white ring-ov-600" : "bg-white text-ink-700 ring-ink-200 hover:bg-ov-50"}`}>Alle</Link>
          {Object.entries(EG_MODELLE).map(([key, m]) => <Link key={key} href={link({ modell: modell === key ? "" : key })} aria-current={modell === key ? "page" : undefined} className={`rounded-full px-3 py-1.5 text-[13px] font-semibold ring-1 ring-inset ${modell === key ? "bg-navy-700 text-white ring-navy-700" : "bg-white text-ink-700 ring-ink-200 hover:bg-ov-50"}`}>{m.kurz}</Link>)}
          {["aktiv", "in_gruendung", "aufnahmestopp", "in_aufloesung"].map((s) => <Link key={s} href={link({ status: status === s ? "" : s })} aria-current={status === s ? "page" : undefined} className={`rounded-full px-3 py-1.5 text-[13px] font-semibold ring-1 ring-inset ${status === s ? "bg-navy-700 text-white ring-navy-700" : "bg-white text-ink-700 ring-ink-200 hover:bg-ov-50"}`}>{GEMEINSCHAFT_STATUS[s].label}</Link>)}
        </div>
        {d.gemeinschaften.length ? (
          <>
            <Tabelle kopf={["Gemeinschaft", "Modell / Nahebereich", "Status", "Mitglieder", "Zählpunkte", "Leistung", "Hinweise"]} className="hidden md:block">
              {d.gemeinschaften.map((g) => (
                <tr key={g.id}>
                  <td className={zelle}><Link href={`/portal/admin/eg/${g.id}`} className="font-semibold text-ink-900 hover:text-ov-700">{g.name}</Link><span className="block text-[12.5px] text-ink-500">{g.netzbetreiberNamen.join(", ") || "–"}{g.dienstleistung?.aktiv ? " · Organisator ÖkoInvest" : ""}</span></td>
                  <td className={zelle}>{g.modellKurz}<span className="block text-[12.5px] text-ink-500">Zonelevel {g.zonelevel} · {g.netzentgelt?.text}</span></td>
                  <td className={zelle}><Badge ton={GEMEINSCHAFT_STATUS[g.status]?.ton}>{g.statusLabel}</Badge></td>
                  <td className={`${zelle} ov-num`}>{g.kennzahlen.mitgliederAktiv}{g.kennzahlen.mitgliederOffen ? <span className="block text-[12.5px] text-ink-500">+{g.kennzahlen.mitgliederOffen} offen</span> : null}</td>
                  <td className={`${zelle} ov-num`}>{g.kennzahlen.zaehlpunkteAktiv}{g.kennzahlen.teilnahmenOffen ? <span className="block text-[12.5px] text-ink-500">{g.kennzahlen.teilnahmenOffen} in Anmeldung</span> : null}</td>
                  <td className={`${zelle} ov-num`}>{zahl(g.kennzahlen.erzeugungsleistungKw, 1)} kW</td>
                  <td className={zelle}>{g.hinweise.filter((h) => h.stufe !== "info").length ? <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-ink-800"><TriangleAlert aria-hidden="true" className="h-4 w-4 text-sun-500" />{g.hinweise.filter((h) => h.stufe !== "info").length}</span> : <span className="text-ink-400">–</span>}</td>
                </tr>
              ))}
            </Tabelle>
            <ul className="space-y-2 md:hidden">
              {d.gemeinschaften.map((g) => (
                <li key={g.id}>
                  <Link href={`/portal/admin/eg/${g.id}`} className="block rounded-2xl bg-white p-4 ring-1 ring-ink-200/70">
                    <span className="flex items-start justify-between gap-2"><span className="font-semibold text-ink-900">{g.name}</span><Badge ton={GEMEINSCHAFT_STATUS[g.status]?.ton}>{g.statusLabel}</Badge></span>
                    <span className="mt-1 block text-[13px] text-ink-500">{g.modellKurz} · Zonelevel {g.zonelevel} · {g.kennzahlen.mitgliederAktiv} Mitglieder · {g.kennzahlen.zaehlpunkteAktiv} Zählpunkte</span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <Leer icon={Building2} titel="Keine Gemeinschaft gefunden" text="Filter zurücksetzen oder eine neue Gemeinschaft anlegen." />
        )}
      </Karte>

      {d.gemeinschaften.some((g) => g.hinweise.some((h) => h.stufe === "fehler")) && (
        <Hinweis ton="warn" titel="Handlungsbedarf">
          <ul className="list-disc space-y-1 pl-5">
            {d.gemeinschaften.flatMap((g) => g.hinweise.filter((h) => h.stufe === "fehler").map((h, i) => <li key={`${g.id}-${i}`}><Link href={`/portal/admin/eg/${g.id}`} className="font-semibold underline-offset-2 hover:underline">{g.name}</Link>: {h.text}</li>))}
          </ul>
        </Hinweis>
      )}

      {d.darfSchreiben && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Karte titel="Neue Gemeinschaft"><Klappe titel="Gemeinschaft anlegen"><GemeinschaftNeu netzbetreiber={nb.netzbetreiber} /></Klappe></Karte>
          <Karte titel="Übernahme aus dem bisherigen Modul" untertitel="Österreichische Gemeinschaften aus „Energiegemeinschaften (Prototyp)“ – Deutschland und Schweiz bleiben dort.">
            <MigrationPrototyp />
          </Karte>
        </div>
      )}
    </div>
  );
}
