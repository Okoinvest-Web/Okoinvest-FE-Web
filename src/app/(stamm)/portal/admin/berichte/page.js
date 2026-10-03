import Link from "next/link";
import { BadgeEuro, FileSpreadsheet, Gauge, LandPlot, Sigma, TrendingUp } from "lucide-react";
import DateiLink from "@/components/Portal/DateiLink";
import { Kennzahl, SeitenKopf } from "@/components/Portal/ui";
import { eingabe } from "@/components/Portal/felder";
import { cn } from "@/components/ui/cn";
import BerichtAnsicht from "@/components/Portal/Backoffice/BerichtAnsicht";
import MonatsberichtKnopf from "@/components/Portal/Backoffice/MonatsberichtKnopf";
import { portalNutzer } from "@/lib/plattform/server/seite";
import { backend } from "@/lib/plattform/backend";
import { fmt } from "@/lib/rechner/annahmen";
import { eur, prozent } from "@/lib/plattform/format";

export const metadata = { title: "Berichte & Analysen" };

const tag = (d) => d.toLocaleDateString("sv-SE", { timeZone: "Europe/Vienna" });
function voreinstellungen() {
  const h = new Date();
  const minus = (tage) => tag(new Date(h.getTime() - tage * 86400e3));
  const q = Math.floor(h.getUTCMonth() / 3) * 3;
  return [
    ["30 Tage", minus(30), tag(h)],
    ["Dieses Quartal", `${h.getUTCFullYear()}-${String(q + 1).padStart(2, "0")}-01`, tag(h)],
    ["Dieses Jahr", `${h.getUTCFullYear()}-01-01`, tag(h)],
    ["12 Monate", "", ""],
  ];
}

export default async function AdminBerichte({ searchParams }) {
  const n = await portalNutzer({ admin: true });
  const sp = await searchParams;
  const von = typeof sp?.von === "string" ? sp.von.slice(0, 10) : "";
  const bis = typeof sp?.bis === "string" ? sp.bis.slice(0, 10) : "";
  const b = await backend().bericht(n, { von: von || undefined, bis: bis || undefined });
  const k = b.kennzahlen;
  const qs = `von=${b.zeitraum.von}&bis=${b.zeitraum.bis}`;

  return (
    <div className="space-y-6">
      <SeitenKopf
        eyebrow="Backoffice"
        titel="Berichte & Analysen"
        text={`Trichter, Quellen, Pipeline, Provision, Durchlaufzeiten und Team – ${b.zeitraum.von.split("-").reverse().join(".")} bis ${b.zeitraum.bis.split("-").reverse().join(".")}.`}
        aktionen={
          <>
            <DateiLink href={`/api/admin/berichte/csv?${qs}`} icon={FileSpreadsheet}>CSV</DateiLink>
            <MonatsberichtKnopf />
          </>
        }
      />

      <form method="get" className="flex flex-wrap items-end gap-3 rounded-3xl bg-white p-4 ring-1 ring-ink-200/70">
        <label className="min-w-0">
          <span className="mb-1 block text-[12.5px] font-semibold text-ink-600">Von</span>
          <input type="date" name="von" defaultValue={b.zeitraum.von} className={cn(eingabe, "h-11 w-[10.5rem]")} />
        </label>
        <label className="min-w-0">
          <span className="mb-1 block text-[12.5px] font-semibold text-ink-600">Bis</span>
          <input type="date" name="bis" defaultValue={b.zeitraum.bis} className={cn(eingabe, "h-11 w-[10.5rem]")} />
        </label>
        <button type="submit" className="h-11 rounded-full bg-navy-700 px-5 text-[14.5px] font-semibold text-white hover:bg-navy-800">Anwenden</button>
        <div className="flex flex-wrap gap-1.5">
          {voreinstellungen().map(([l, v, bi]) => (
            <Link key={l} href={v ? `/portal/admin/berichte?von=${v}&bis=${bi}` : "/portal/admin/berichte"} className="rounded-full px-3 py-1.5 text-[13px] font-semibold text-ink-600 ring-1 ring-inset ring-ink-200 hover:bg-ink-50 hover:text-ink-900">
              {l}
            </Link>
          ))}
        </div>
      </form>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kennzahl label="Anfragen im Zeitraum" wert={fmt(k.anfragen)} hinweis={`${prozent(k.qualifiziertQuote, 0)} qualifiziert`} icon={Gauge} />
        <Kennzahl label="Neue Flächen" wert={`${fmt(k.flaechenHa, 0)} ha`} hinweis={`${fmt(k.flaechenNeu)} Flächen · Potenzial gesamt ${fmt(k.flaechenMwp, 0)} MWp`} icon={LandPlot} />
        <Kennzahl label="Pipeline Börse" wert={`${fmt(k.pipelineMwp, 1)} MWp`} hinweis={`${fmt(k.projekteVeroeffentlicht)} veröffentlicht · ${fmt(k.verkaeufe)} verkauft`} icon={TrendingUp} />
        <Kennzahl label="Provision erwartet (gewichtet)" wert={eur(k.provisionErwartet)} hinweis={`realisiert im Zeitraum: ${eur(k.provisionRealisiert)}`} icon={BadgeEuro} ton="dunkel" />
      </div>

      <BerichtAnsicht bericht={b} />

      <p className="flex items-center gap-2 text-[12.5px] text-ink-500">
        <Sigma aria-hidden="true" className="h-4 w-4" /> Berechnet aus Statusverläufen, Herkunftsdaten und Provisionen. Monatsbericht als PDF enthält den Vergleich zum Vormonat; CSV für eigene Auswertungen in Excel.
      </p>
    </div>
  );
}
