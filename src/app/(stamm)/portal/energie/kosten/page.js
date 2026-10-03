// /portal/energie/kosten – Energiekostenbericht (Rolle „unternehmen“): Netzbezug × Energiepreis des jeweiligen Stromvertrags
// plus Contracting-Solarstrom aus den Rechnungen (geeichte Zähler), je Monat, mit Mischpreis und Ersparnis; CSV und PDF.

import Link from "next/link";
import { redirect } from "next/navigation";
import { Coins, PlugZap, SunMedium, Zap } from "lucide-react";
import { Karte, SeitenKopf } from "@/components/Portal/ui";
import { Wert } from "@/components/Portal/Anlagen/teile";
import { BalkenChart, FARBEN, Legende } from "@/components/Portal/Energie/Diagramme";
import { Hinweis, Tabelle } from "@/components/Portal/Energie/teile";
import { DokLink, euro, zahl } from "@/components/Portal/Kundenenergie/teile";
import { cn } from "@/components/ui/cn";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { kundenenergieBackend } from "@/lib/plattform/backend/kundenenergie";

export const metadata = { title: "Energiekostenbericht" };

const MON = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

export default async function Kostenbericht({ searchParams }) {
  const n = await portalNutzer({ rollen: ["unternehmen"] });
  if (n.rollen.includes("admin")) redirect("/portal/admin/energie/kunden");
  const sp = (await searchParams) || {};
  const d = await laden(() => kundenenergieBackend().kostenbericht(n, { jahr: sp.jahr }));
  const s = d.summe;
  return (
    <div className="space-y-6">
      <SeitenKopf
        eyebrow="Reststrom-Pool & Contracting"
        titel={`Energiekostenbericht ${d.jahr}`}
        text="Was Ihr Strom je Monat kostet: Netzbezug zum Energiepreis Ihres Liefervertrags und Solarstrom vor Ort aus den Contracting-Rechnungen – mit Mischpreis und Ersparnis."
        aktionen={<><DokLink href={`/api/portal/kundenenergie/kosten?jahr=${d.jahr}&format=pdf`}>PDF</DokLink><DokLink href={`/api/portal/kundenenergie/kosten?jahr=${d.jahr}&format=csv`}>CSV</DokLink></>}
      />
      <nav aria-label="Jahr wählen" className="-mx-4 overflow-x-auto px-4 ov-no-scrollbar md:mx-0 md:px-0">
        <ul className="flex min-w-max gap-1.5 rounded-full bg-white p-1.5 ring-1 ring-ink-200/70 md:inline-flex md:min-w-0">
          {d.jahre.map((j) => (
            <li key={j}><Link href={`/portal/energie/kosten?jahr=${j}`} scroll={false} aria-current={j === d.jahr ? "page" : undefined} className={cn("ov-num inline-flex h-9 items-center rounded-full px-4 text-[14px] font-semibold", j === d.jahr ? "bg-navy-900 text-white" : "text-ink-700 hover:bg-ink-50")}>{j}</Link></li>
          ))}
        </ul>
      </nav>
      <section aria-label="Kennzahlen" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Wert ton="dunkel" icon={Coins} label={`Energiekosten ${d.jahr}`} wert={euro(s.gesamtEur, 0)} hinweis="netto, nur Energie" />
        <Wert icon={Zap} label="Mischpreis" wert={Number.isFinite(s.mischpreisCt) ? `${zahl(s.mischpreisCt, 2)} ct/kWh` : "–"} hinweis={`${zahl(s.gesamtKwh)} kWh gesamt`} />
        <Wert icon={SunMedium} label="Solarstrom-Anteil" wert={Number.isFinite(s.pvAnteil) ? `${zahl(s.pvAnteil * 100, 1)} %` : "–"} hinweis={`${zahl(s.pvKwh)} kWh vor Ort`} />
        <Wert icon={PlugZap} label="Vorteil Solarstrom" wert={euro(s.pvErsparnisEur, 0)} hinweis="ggü. Energiepreis Netz, ohne Netzentgelte" />
      </section>
      <Karte titel="Kosten je Monat" untertitel="Netzbezug und Solarstrom in € (netto)">
        <BalkenChart
          kategorien={MON}
          gestapelt
          reihen={[{ name: "Netzbezug (Energie)", farbe: FARBEN.navy, werte: d.monate.map((m) => m.netzEur || 0) }, { name: "Solarstrom vor Ort", farbe: FARBEN.gruen, werte: d.monate.map((m) => m.pvEur || 0) }]}
          yEinheit="€"
          format={(x) => zahl(x, 0)}
          hoehe={240}
          beschreibung={`Energiekosten je Monat ${d.jahr}, gestapelt nach Netzbezug und Solarstrom`}
        />
        <Legende eintraege={[{ name: "Netzbezug (Energie)", farbe: FARBEN.navy }, { name: "Solarstrom vor Ort", farbe: FARBEN.gruen }]} />
      </Karte>
      <Karte titel="Monatswerte" untertitel={`Netzbezug: ${d.quelleNetz}`} innen="p-0 md:p-2">
        <Tabelle
          kopf={["Monat", "Lieferant", "Netz kWh", "ct/kWh", "Netz €", "Solar kWh", "Solar €", "Gesamt €", "Mischpreis"]}
          rechts={[2, 3, 4, 5, 6, 7, 8]}
          zeilen={[
            ...d.monate.map((m) => [`${MON[Number(m.monat.slice(5)) - 1]} ${m.monat.slice(0, 4)}${m.netzGeschaetzt ? " *" : ""}`, m.lieferant || "–", zahl(m.netzKwh), zahl(m.netzCt, 2), euro(m.netzEur, 0), zahl(m.pvKwh), euro(m.pvEur, 0), euro(m.gesamtEur, 0), Number.isFinite(m.mischpreisCt) ? `${zahl(m.mischpreisCt, 2)} ct` : "–"]),
            [<strong key="s">Summe</strong>, "", <strong key="a">{zahl(s.netzKwh)}</strong>, "", <strong key="b">{euro(s.netzEur, 0)}</strong>, <strong key="c">{zahl(s.pvKwh)}</strong>, <strong key="d">{euro(s.pvEur, 0)}</strong>, <strong key="e">{euro(s.gesamtEur, 0)}</strong>, Number.isFinite(s.mischpreisCt) ? `${zahl(s.mischpreisCt, 2)} ct` : "–"],
          ]}
        />
      </Karte>
      <div className="grid gap-3">
        {d.hinweise.map((h, i) => <Hinweis key={i} ton={i === 0 ? "info" : "warn"}>{h}</Hinweis>)}
        {d.monate.some((m) => m.netzGeschaetzt) && <p className="text-[12.5px] text-ink-500">* geschätzt aus der Jahresmenge des Vertrags. <Link href="/portal/energie" className="font-semibold text-ov-700 hover:text-ov-800">Lastgang hochladen</Link> für genaue Monatswerte.</p>}
        {!d.vertraege.length && <p className="text-[14px] text-ink-600">Noch kein Stromvertrag erfasst – <Link href="/portal/energie/beschaffung" className="font-semibold text-ov-700 hover:text-ov-800">jetzt unter „Energiebeschaffung“ erfassen</Link>.</p>}
      </div>
    </div>
  );
}
