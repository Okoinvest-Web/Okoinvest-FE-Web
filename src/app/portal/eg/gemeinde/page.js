// /portal/eg/gemeinde – Gemeinde-Sicht (WP6): Gemeinde als Mitglied und Initiatorin – Gemeindegebäude-Zählpunkte mit
// Jahreswerten, Sozialquote nach § 68 Abs. 6 ElWG, Bürgerbeteiligung (nur Summen), eigene Gründungsaufträge (WP5).

import Link from "next/link";
import { ArrowRight, Building2, HeartHandshake, Landmark, Users } from "lucide-react";
import { Karte, Leer, PfeilLink, SeitenKopf } from "@/components/Portal/ui";
import { TeilnahmeStatus } from "@/components/Portal/EG/Mitglied/Teile";
import { Beteiligung, GebaeudeTabelle, SozialquoteMonitor } from "@/components/Portal/EG/Gemeinde/GemeindeTeile";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { egBackend } from "@/lib/plattform/backend/eg";

export const metadata = { title: "Gemeinde in der Energiegemeinschaft" };

export default async function GemeindeSicht() {
  const n = await portalNutzer();
  const d = await laden(() => egBackend().ptGemeindeSicht(n));
  return (
    <div className="space-y-6">
      <SeitenKopf eyebrow="Gemeinde" titel="Ihre Gemeinde in der Energiegemeinschaft" text="Alle Gemeindegebäude auf einen Blick, der Nachweis der Sozialquote und wie viele Bürgerinnen und Bürger mitmachen." />
      {!d.gemeinden.length && (
        <Leer icon={Landmark} titel="Ihre Gemeinde ist noch in keiner Energiegemeinschaft" text="Gemeinden können Mitglied werden, Gemeindegebäude einbringen oder selbst eine Gemeinschaft für ihre Bürgerinnen und Bürger gründen." aktion={<div className="flex flex-wrap justify-center gap-3"><PfeilLink href="/portal/eg/beitritt">Gemeinschaft finden</PfeilLink><PfeilLink href="/portal/eg/gruendung">Gemeinschaft gründen</PfeilLink></div>} />
      )}
      {d.gemeinden.map((gm) => (
        <section key={gm.gemeinschaft.id} aria-labelledby={`gm-${gm.gemeinschaft.id}`} className="space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-3 rounded-[2rem] bg-navy-950 p-6 text-white md:p-7">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-ov-300">{gm.gemeinschaft.modellKurz} · {gm.gemeinschaft.statusLabel}</p>
              <h2 id={`gm-${gm.gemeinschaft.id}`} className="mt-1 font-display text-[24px] font-extrabold tracking-tight">{gm.gemeinschaft.name}</h2>
              <p className="mt-1 text-[14px] text-white/70">Mitglied Nr. {gm.mitglied.mitgliedsnummer} · {gm.summe.gebaeude} Zählpunkte, davon {gm.summe.aktiv} aktiv{gm.summe.erzeugungKwp ? ` · ${String(gm.summe.erzeugungKwp).replace(".", ",")} kWp eigene Erzeugung` : ""}</p>
            </div>
            <Link href={`/portal/eg/${gm.gemeinschaft.id}`} className="inline-flex h-10 items-center gap-1.5 rounded-full bg-white px-4 text-[13.5px] font-semibold text-ink-900 hover:bg-ov-50">Dashboard <ArrowRight aria-hidden="true" className="h-4 w-4" /></Link>
          </div>
          <Karte titel="Gemeindegebäude und Anlagen" untertitel={gm.energieVerfuegbar ? "Werte des laufenden Jahres laut Netzbetreiber" : gm.energieHinweis || "Energiedaten folgen"} aktion={<Building2 aria-hidden="true" className="h-5 w-5 text-ov-600" />} innen="p-0">
            <GebaeudeTabelle gebaeude={gm.gebaeude} />
          </Karte>
          {gm.gebaeude.some((t) => t.schritte.aktuell !== "aktiv") && (
            <Karte titel="Noch nicht aktiv">
              <ul className="divide-y divide-ink-100">{gm.gebaeude.filter((t) => t.schritte.aktuell !== "aktiv").map((t) => <li key={t.id} className="py-5 first:pt-0 last:pb-0"><TeilnahmeStatus t={t} gemeinschaftName={gm.gemeinschaft.name} /></li>)}</ul>
            </Karte>
          )}
          <div className="grid gap-6 xl:grid-cols-2">
            <Karte titel="Sozialquote" untertitel={gm.sozialquote.gilt ? "Gilt, weil die Gemeinde selbst erzeugt" : "Gilt erst, wenn die Gemeinde eine eigene Anlage einbringt"} aktion={<HeartHandshake aria-hidden="true" className="h-5 w-5 text-ov-600" />}>
              <SozialquoteMonitor sq={gm.sozialquote} />
            </Karte>
            <Karte titel="Bürgerbeteiligung" untertitel="Summen – keine personenbezogenen Daten" aktion={<Users aria-hidden="true" className="h-5 w-5 text-ov-600" />}>
              <Beteiligung b={gm.beteiligung} tarif={gm.tarif} />
            </Karte>
          </div>
        </section>
      ))}
      <Karte titel="Als Gemeinde gründen" untertitel="Gemeinde als Initiatorin: Machbarkeit, Statuten, Netzbetreiber, Gemeinderatsbeschluss">
        {d.gruendung.auftraege.length ? (
          <ul className="divide-y divide-ink-100">{d.gruendung.auftraege.map((a) => <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-[14px]"><span className="font-semibold text-ink-900">{a.titel || a.name || a.id}</span><PfeilLink href={`/portal/eg/gruendung/${a.id}`}>{a.statusLabel || a.status || "öffnen"}</PfeilLink></li>)}</ul>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="max-w-2xl text-[14px] leading-relaxed text-ink-600">Mit einer eigenen Gemeinschaft versorgen Sie Gemeindegebäude, beteiligen Bürgerinnen und Bürger und sichern schutzbedürftigen Haushalten günstigen Strom. ÖkoInvest begleitet die Gründung – von der Simulation bis zum Netzbetreiber-Vertrag.</p>
            <PfeilLink href="/portal/eg/gruendung">Gründung starten</PfeilLink>
          </div>
        )}
      </Karte>
    </div>
  );
}
